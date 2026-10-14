/**
 * @jest-environment jsdom
 *
 * FileTree 单元测试
 * 由于 renderer.js 运行在 Tauri Chromium 沙箱中，依赖大量全局对象，
 * 本测试文件重新定义了 FileTree 逻辑，并对纯 JS 行为进行验证。
 */

// ==============================
// 全局依赖模拟
// ==============================

global.invoke = jest.fn()
global.TabManager = {
  findTabByPath: jest.fn(),
  createTab: jest.fn(() => 'tab-1'),
  activateTab: jest.fn()
}
global.showToast = jest.fn()

// ==============================
// FileTree 实现（与 renderer.js 保持一致）
// ==============================

const FileTree = {
  rootPath: null,

  async load(path) {
    this.rootPath = path
    try {
      const nodes = await invoke('get_folder_tree', { path })
      const container = document.getElementById('file-tree')
      container.innerHTML = ''
      this.render(nodes, container)
    } catch (e) {
      showToast('加载文件夹失败: ' + e.message, 'error')
    }
  },

  render(nodes, container) {
    if (!nodes || nodes.length === 0) return
    const ul = document.createElement('ul')
    ul.className = 'file-tree-list'
    nodes.forEach(node => {
      const li = document.createElement('li')
      li.className = 'file-tree-node' + (node.isDirectory ? ' file-tree-folder' : ' file-tree-file')

      if (node.isDirectory) {
        const arrow = document.createElement('span')
        arrow.className = 'file-tree-arrow'
        arrow.textContent = '▶'
        li.appendChild(arrow)
        li.addEventListener('click', (e) => {
          e.stopPropagation()
          this.toggleFolder(li)
        })
      } else {
        const spacer = document.createElement('span')
        spacer.className = 'file-tree-arrow'
        spacer.style.visibility = 'hidden'
        li.appendChild(spacer)
        li.addEventListener('click', (e) => {
          e.stopPropagation()
          this.openFile(node.path)
        })
      }

      const name = document.createElement('span')
      name.textContent = node.name
      li.appendChild(name)

      if (node.isDirectory && node.children) {
        const childrenContainer = document.createElement('div')
        childrenContainer.className = 'file-tree-children file-tree-collapsed'
        this.render(node.children, childrenContainer)
        li.appendChild(childrenContainer)
      }

      ul.appendChild(li)
    })
    container.appendChild(ul)
  },

  toggleFolder(nodeEl) {
    const children = nodeEl.querySelector(':scope > .file-tree-children')
    const arrow = nodeEl.querySelector(':scope > .file-tree-arrow')
    if (children) {
      children.classList.toggle('file-tree-collapsed')
      if (arrow) {
        arrow.style.transform = children.classList.contains('file-tree-collapsed') ? '' : 'rotate(90deg)'
      }
    }
  },

  async openFile(path) {
    try {
      const existingTab = TabManager.findTabByPath(path)
      if (existingTab) {
        TabManager.activateTab(existingTab.id)
        return
      }
      const content = await invoke('read_file_text', { path })
      const newId = TabManager.createTab(path, content)
      TabManager.activateTab(newId)
    } catch (e) {
      showToast('打开文件失败: ' + e.message, 'error')
    }
  }
}

// ==============================
// 测试套件
// ==============================

describe('FileTree.render', () => {
  let container

  beforeEach(() => {
    container = document.createElement('div')
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('空数组不生成任何内容', () => {
    FileTree.render([], container)
    expect(container.innerHTML).toBe('')
  })

  test('null 不生成任何内容', () => {
    FileTree.render(null, container)
    expect(container.innerHTML).toBe('')
  })

  test('生成单个文件节点', () => {
    const nodes = [{ name: 'readme.md', path: '/project/readme.md', isDirectory: false }]
    FileTree.render(nodes, container)

    const ul = container.querySelector('ul.file-tree-list')
    expect(ul).not.toBeNull()

    const li = ul.querySelector('li')
    expect(li.classList.contains('file-tree-file')).toBe(true)
    expect(li.querySelector('span:last-child').textContent).toBe('readme.md')

    const arrow = li.querySelector('.file-tree-arrow')
    expect(arrow.style.visibility).toBe('hidden')
  })

  test('生成单个文件夹节点', () => {
    const nodes = [{ name: 'src', path: '/project/src', isDirectory: true, children: [] }]
    FileTree.render(nodes, container)

    const li = container.querySelector('li')
    expect(li.classList.contains('file-tree-folder')).toBe(true)

    const arrow = li.querySelector('.file-tree-arrow')
    expect(arrow.textContent).toBe('▶')
    expect(arrow.style.visibility).not.toBe('hidden')
  })

  test('文件夹节点包含可折叠的子容器', () => {
    const nodes = [{
      name: 'src',
      path: '/project/src',
      isDirectory: true,
      children: [{ name: 'main.js', path: '/project/src/main.js', isDirectory: false }]
    }]
    FileTree.render(nodes, container)

    const li = container.querySelector('li.file-tree-folder')
    const childrenContainer = li.querySelector(':scope > .file-tree-children')
    expect(childrenContainer).not.toBeNull()
    expect(childrenContainer.classList.contains('file-tree-collapsed')).toBe(true)
  })

  test('递归渲染嵌套子节点', () => {
    const nodes = [{
      name: 'root',
      path: '/root',
      isDirectory: true,
      children: [
        { name: 'child.md', path: '/root/child.md', isDirectory: false }
      ]
    }]
    FileTree.render(nodes, container)

    const nestedLi = container.querySelector('.file-tree-children li')
    expect(nestedLi).not.toBeNull()
    expect(nestedLi.classList.contains('file-tree-file')).toBe(true)
    expect(nestedLi.textContent).toContain('child.md')
  })

  test('混合文件和文件夹顺序保持', () => {
    const nodes = [
      { name: 'a.md', path: '/a.md', isDirectory: false },
      { name: 'b', path: '/b', isDirectory: true, children: [] }
    ]
    FileTree.render(nodes, container)

    const items = container.querySelectorAll('li')
    expect(items.length).toBe(2)
    expect(items[0].textContent).toContain('a.md')
    expect(items[1].textContent).toContain('b')
  })
})

describe('FileTree.toggleFolder', () => {
  test('切换展开/折叠状态', () => {
    const nodeEl = document.createElement('li')
    nodeEl.className = 'file-tree-node file-tree-folder'

    const arrow = document.createElement('span')
    arrow.className = 'file-tree-arrow'
    nodeEl.appendChild(arrow)

    const children = document.createElement('div')
    children.className = 'file-tree-children file-tree-collapsed'
    nodeEl.appendChild(children)

    // 初始折叠
    expect(children.classList.contains('file-tree-collapsed')).toBe(true)
    expect(arrow.style.transform).toBe('')

    FileTree.toggleFolder(nodeEl)
    expect(children.classList.contains('file-tree-collapsed')).toBe(false)
    expect(arrow.style.transform).toBe('rotate(90deg)')

    FileTree.toggleFolder(nodeEl)
    expect(children.classList.contains('file-tree-collapsed')).toBe(true)
    expect(arrow.style.transform).toBe('')
  })

  test('无子元素时不报错', () => {
    const nodeEl = document.createElement('li')
    expect(() => FileTree.toggleFolder(nodeEl)).not.toThrow()
  })
})

describe('FileTree.openFile', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('已打开的文件直接激活标签，不重复调用 invoke', async () => {
    TabManager.findTabByPath.mockReturnValue({ id: 'tab-existing', filePath: '/file.md' })

    await FileTree.openFile('/file.md')

    expect(TabManager.findTabByPath).toHaveBeenCalledWith('/file.md')
    expect(TabManager.activateTab).toHaveBeenCalledWith('tab-existing')
    expect(invoke).not.toHaveBeenCalled()
    expect(TabManager.createTab).not.toHaveBeenCalled()
  })

  test('未打开的文件调用 read_file_text 并创建标签', async () => {
    TabManager.findTabByPath.mockReturnValue(null)
    invoke.mockResolvedValue('file content')

    await FileTree.openFile('/new-file.md')

    expect(TabManager.findTabByPath).toHaveBeenCalledWith('/new-file.md')
    expect(invoke).toHaveBeenCalledWith('read_file_text', { path: '/new-file.md' })
    expect(TabManager.createTab).toHaveBeenCalledWith('/new-file.md', 'file content')
    expect(TabManager.activateTab).toHaveBeenCalledWith('tab-1')
  })

  test('invoke 失败时显示 toast 错误', async () => {
    TabManager.findTabByPath.mockReturnValue(null)
    invoke.mockRejectedValue(new Error('Permission denied'))

    await FileTree.openFile('/protected.md')

    expect(showToast).toHaveBeenCalledWith('打开文件失败: Permission denied', 'error')
  })
})

describe('FileTree.load', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    document.body.innerHTML = '<div id="file-tree"></div>'
  })

  test('成功加载并渲染文件夹树', async () => {
    const mockNodes = [{ name: 'test.md', path: '/test.md', isDirectory: false }]
    invoke.mockResolvedValue(mockNodes)

    await FileTree.load('/project')

    expect(invoke).toHaveBeenCalledWith('get_folder_tree', { path: '/project' })
    expect(FileTree.rootPath).toBe('/project')

    const container = document.getElementById('file-tree')
    expect(container.querySelector('li')).not.toBeNull()
  })

  test('invoke 失败时显示 toast 错误', async () => {
    invoke.mockRejectedValue(new Error('Path not found'))

    await FileTree.load('/missing')

    expect(showToast).toHaveBeenCalledWith('加载文件夹失败: Path not found', 'error')
  })
})
