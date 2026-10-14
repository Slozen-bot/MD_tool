/* ==============================
   MD Tool — Renderer 渲染进程
   ============================== */

// Tauri API
const { invoke } = window.__TAURI_API__

// ==============================
// TabManager — 多标签页状态管理
// ==============================

// tabId 格式校验：仅允许 tab-{数字} 格式，防止 CSS 选择器注入
function isValidTabId(id) {
  return typeof id === 'string' && /^tab-\d+$/.test(id)
}

// 安全获取标签页 DOM 元素（避免将动态值拼入 CSS 选择器）
function getTabElement(tabId) {
  if (!isValidTabId(tabId)) return null
  return document.querySelector(`.tab-item[data-tab-id="${tabId}"]`)
}

const TabManager = {
  tabs: [],
  activeTabId: null,
  _nextId: 1,

  get activeTab() {
    return this.tabs.find(t => t.id === this.activeTabId) || null
  },

  createTab(filePath, content) {
    const id = 'tab-' + (this._nextId++)
    const tab = { id, filePath, markdownContent: content || '', isModified: false, scrollTop: 0 }
    this.tabs.push(tab)
    this._renderTabDOM(tab)
    return id
  },

  _renderTabDOM(tab) {
    const container = document.getElementById('tabs-container')
    const el = document.createElement('div')
    el.className = 'tab-item'
    el.dataset.tabId = tab.id

    const modifiedDot = document.createElement('span')
    modifiedDot.className = 'tab-modified'
    modifiedDot.textContent = '●'
    modifiedDot.style.display = 'none'

    const title = document.createElement('span')
    title.className = 'tab-title'
    title.textContent = tab.filePath ? tab.filePath.split(/[\\/]/).pop() : '未命名'

    const closeBtn = document.createElement('button')
    closeBtn.className = 'tab-close'
    closeBtn.textContent = '×'
    closeBtn.title = '关闭标签'
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      this.closeTab(tab.id)
    })

    el.appendChild(modifiedDot)
    el.appendChild(title)
    el.appendChild(closeBtn)

    el.addEventListener('click', () => {
      this.activateTab(tab.id)
    })

    container.appendChild(el)
  },

  activateTab(tabId) {
    const prevTab = this.activeTab
    if (prevTab) {
      prevTab.markdownContent = getCurrentMarkdown()
      if (isSplitMode) {
        prevTab.scrollTop = document.getElementById('wysiwyg-editor').scrollTop
      }
    }

    this.activeTabId = tabId
    const tab = this.activeTab
    if (!tab) return

    document.querySelectorAll('.tab-item').forEach(el => {
      el.classList.toggle('active', el.dataset.tabId === tabId)
    })

    renderAll(tab.markdownContent)

    const filePathEl = document.getElementById('file-path')
    filePathEl.textContent = tab.filePath ? tab.filePath.split(/[\\/]/).pop() : '未命名'
    const fileName = tab.filePath ? tab.filePath.split(/[\\/]/).pop() : null
    document.title = fileName ? fileName + ' — MD Tool' : 'MD Tool'

    if (tab.isModified) {
      filePathEl.classList.add('modified')
    } else {
      filePathEl.classList.remove('modified')
    }

    if (isSplitMode) {
      document.getElementById('raw-textarea').value = tab.markdownContent
    }
  },

  async closeTab(tabId) {
    const tab = this.tabs.find(t => t.id === tabId)
    if (!tab) return

    if (tab.isModified) {
      const confirmed = confirm(`文件"${tab.filePath ? tab.filePath.split(/[\\/]/).pop() : '未命名'}"有未保存的修改，直接关闭将丢失更改。\n\n确定要关闭吗？`)
      if (!confirmed) return
    }

    const el = getTabElement(tabId)
    if (el) el.remove()

    const idx = this.tabs.findIndex(t => t.id === tabId)
    this.tabs.splice(idx, 1)

    if (this.activeTabId === tabId) {
      if (this.tabs.length === 0) {
        const newId = this.createTab(null, '')
        this.activeTabId = null
        this.activateTab(newId)
      } else {
        const newActive = this.tabs[Math.min(idx, this.tabs.length - 1)]
        this.activeTabId = null
        this.activateTab(newActive.id)
      }
    }
  },

  _reorderTabDOMs() {
    const container = document.getElementById('tabs-container')
    container.innerHTML = ''
    this.tabs.forEach(tab => this._renderTabDOM(tab))
    // 重排后恢复 active 状态
    document.querySelectorAll('.tab-item').forEach(el => {
      el.classList.toggle('active', el.dataset.tabId === this.activeTabId)
    })
  },

  markTabModified(tabId) {
    const tab = this.tabs.find(t => t.id === tabId)
    if (!tab) return
    tab.isModified = true
    const el = getTabElement(tabId)
    if (el) {
      const dot = el.querySelector('.tab-modified')
      if (dot) dot.style.display = ''
    }
  },

  clearTabModified(tabId) {
    const tab = this.tabs.find(t => t.id === tabId)
    if (!tab) return
    tab.isModified = false
    const el = getTabElement(tabId)
    if (el) {
      const dot = el.querySelector('.tab-modified')
      if (dot) dot.style.display = 'none'
    }
  },

  findTabByPath(filePath) {
    return this.tabs.find(t => t.filePath === filePath) || null
  },

  updateTabTitle(tabId, filePath) {
    const tab = this.tabs.find(t => t.id === tabId)
    if (!tab) return
    tab.filePath = filePath
    const el = getTabElement(tabId)
    if (el) {
      const titleEl = el.querySelector('.tab-title')
      if (titleEl) titleEl.textContent = filePath ? filePath.split(/[\\/]/).pop() : '未命名'
    }
  },

}

const FileTree = {
  rootPath: null,
  selectedPath: null,

  async load(path) {
    this.rootPath = path
    this.selectedPath = null
    const container = document.getElementById('file-tree')
    container.innerHTML = '<div class="file-tree-status">正在加载文件夹...</div>'
    try {
      const nodes = await invoke('get_folder_tree', { path })
      container.innerHTML = ''
      this.renderRoot(path, nodes, container)
      showToast('已打开文件夹', 'success')
    } catch (e) {
      container.innerHTML = '<div class="file-tree-status">无法加载文件夹</div>'
      showToast('加载文件夹失败: ' + e.message, 'error')
    }
  },

  renderRoot(path, nodes, container) {
    const root = document.createElement('div')
    root.className = 'file-tree-root'

    const rootName = document.createElement('div')
    rootName.className = 'file-tree-root-name'
    rootName.title = path
    rootName.textContent = path.split(/[\\/]/).filter(Boolean).pop() || path
    root.appendChild(rootName)

    if (!nodes || nodes.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'file-tree-empty'
      empty.textContent = '此文件夹为空'
      root.appendChild(empty)
    } else {
      this.render(nodes, root)
    }
    container.appendChild(root)
  },

  render(nodes, container) {
    const ul = document.createElement('ul')
    ul.className = 'file-tree-list'
    nodes.forEach(node => {
      const li = document.createElement('li')
      li.className = 'file-tree-node' + (node.isDirectory ? ' file-tree-folder' : ' file-tree-file')
      li.dataset.path = node.path

      const row = document.createElement('div')
      row.className = 'file-tree-row'

      const arrow = document.createElement('span')
      arrow.className = 'file-tree-arrow'
      arrow.textContent = node.isDirectory ? '›' : ''
      row.appendChild(arrow)

      const icon = document.createElement('span')
      icon.className = 'file-tree-icon'
      icon.textContent = node.isDirectory ? '📁' : '📄'
      row.appendChild(icon)

      const name = document.createElement('span')
      name.className = 'file-tree-name'
      name.textContent = node.name
      name.title = node.name
      row.appendChild(name)

      row.addEventListener('click', (e) => {
        e.stopPropagation()
        if (node.isDirectory) {
          this.toggleFolder(li, node.path)
        } else {
          this.selectFile(node.path)
          this.openFile(node.path)
        }
      })

      li.appendChild(row)
      ul.appendChild(li)
    })
    container.appendChild(ul)
  },

  async toggleFolder(nodeEl, path) {
    const row = nodeEl.querySelector(':scope > .file-tree-row')
    const arrow = row.querySelector('.file-tree-arrow')
    let children = nodeEl.querySelector(':scope > .file-tree-children')
    if (children) {
      const isCollapsed = children.classList.toggle('file-tree-collapsed')
      row.classList.toggle('expanded', !isCollapsed)
      return
    }

    children = document.createElement('div')
    children.className = 'file-tree-children'
    children.innerHTML = '<div class="file-tree-loading">正在加载...</div>'
    nodeEl.appendChild(children)
    row.classList.add('expanded')
    arrow.classList.add('loading')

    try {
      const nodes = await invoke('get_folder_tree', { path })
      children.innerHTML = ''
      if (nodes.length === 0) {
        children.innerHTML = '<div class="file-tree-empty file-tree-empty-nested">此文件夹为空</div>'
      } else {
        this.render(nodes, children)
      }
    } catch (e) {
      children.innerHTML = '<div class="file-tree-status">无法读取此文件夹</div>'
      showToast('加载子文件夹失败: ' + e.message, 'error')
    } finally {
      arrow.classList.remove('loading')
    }
  },

  selectFile(path) {
    this.selectedPath = path
    document.querySelectorAll('.file-tree-row.selected').forEach(row => row.classList.remove('selected'))
    const selected = Array.from(document.querySelectorAll('.file-tree-node')).find(node => node.dataset.path === path)
    selected?.querySelector(':scope > .file-tree-row')?.classList.add('selected')
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

// 兼容访问器（从 TabManager 读取）
Object.defineProperty(window, 'currentFilePath', {
  get: () => TabManager.activeTab ? TabManager.activeTab.filePath : null,
  set: (v) => { if (TabManager.activeTab) TabManager.activeTab.filePath = v }
})

Object.defineProperty(window, 'markdownContent', {
  get: () => TabManager.activeTab ? TabManager.activeTab.markdownContent : '',
  set: (v) => { if (TabManager.activeTab) TabManager.activeTab.markdownContent = v }
})
let isSplitMode = false
let isTocVisible = true
let isFocusMode = false
let _rawSyncTimer = null

// ==============================
// marked 初始化
// ==============================

marked.setOptions({
  highlight: function (code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value
    }
    return hljs.highlightAuto(code).value
  },
  breaks: true,
  gfm: true
})

// 安全渲染 Markdown 为 HTML（经 DOMPurify 消毒）
function renderMarkdown(source) {
  const rawHtml = marked.parse(source)
  return DOMPurify.sanitize(rawHtml, {
    ADD_TAGS: ['iframe'],  // 如需支持嵌入
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling'],
    FORBID_TAGS: ['style', 'form', 'input', 'textarea', 'button'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
  })
}

// ==============================
// Toast 通知系统
// ==============================

function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container')
  const toast = document.createElement('div')
  toast.className = `toast toast-${type}`
  toast.style.position = 'relative'
  // 供屏幕阅读器实时播报（配合容器 aria-live="polite"）
  toast.setAttribute('role', 'status')

  const iconSpan = document.createElement('span')
  iconSpan.className = 'toast-icon'

  const msgSpan = document.createElement('span')
  msgSpan.className = 'toast-msg'
  msgSpan.textContent = message  // 使用 textContent 避免 XSS

  const barDiv = document.createElement('div')
  barDiv.className = 'toast-bar'

  toast.appendChild(iconSpan)
  toast.appendChild(msgSpan)
  toast.appendChild(barDiv)
  container.appendChild(toast)

  setTimeout(() => {
    toast.classList.add('toast-out')
    toast.addEventListener('animationend', () => toast.remove(), { once: true })
  }, duration)
}

// ==============================
// 段落拆分
// ==============================

function splitParagraphs(markdown) {
  const lines = markdown.split('\n')
  const paragraphs = []
  let current = []
  let inCodeBlock = false

  for (const line of lines) {
    if (line.trimStart().startsWith('```')) {
      inCodeBlock = !inCodeBlock
    }
    if (!inCodeBlock && line.trim() === '' && current.length > 0) {
      paragraphs.push(current.join('\n'))
      current = []
    } else {
      current.push(line)
    }
  }
  if (current.length > 0) {
    paragraphs.push(current.join('\n'))
  }
  return paragraphs.filter(p => p.trim() !== '')
}

// ==============================
// 渲染所有内容
// ==============================

function renderAll(markdown) {
  if (TabManager.activeTab) {
    TabManager.activeTab.markdownContent = markdown
  }
  const container = document.getElementById('wysiwyg-editor')
  const paragraphs = splitParagraphs(markdown)
  container.innerHTML = ''

  if (paragraphs.length === 0) {
    const emptyBlock = document.createElement('div')
    emptyBlock.className = 'wysiwyg-block wysiwyg-empty'
    emptyBlock.setAttribute('data-source', '')
    emptyBlock.setAttribute('data-index', '0')
    emptyBlock.textContent = '开始输入 Markdown...'
    emptyBlock.addEventListener('click', onBlockClick)
    container.appendChild(emptyBlock)
    buildToc()
    updateStatusBar()
    return
  }

  paragraphs.forEach((para, index) => {
    const block = document.createElement('div')
    block.className = 'wysiwyg-block'
    block.setAttribute('data-source', para)
    block.setAttribute('data-index', index)
    block.innerHTML = renderMarkdown(para)

    // 为代码块添加 data-lang
    const pre = block.querySelector('pre')
    if (pre) {
      const code = pre.querySelector('code')
      if (code) {
        const lang = Array.from(code.classList)
          .find(c => c.startsWith('language-'))
          ?.replace('language-', '') || ''
        if (lang) pre.setAttribute('data-lang', lang)
        else pre.setAttribute('data-lang', 'code')
      }
    }

    block.addEventListener('click', onBlockClick)
    container.appendChild(block)
  })

  buildToc()
  hljs.highlightAll()
  decorateCodeBlocks(container)
  updateStatusBar()
  updateTocActive()

  // 同步分屏 textarea
  if (isSplitMode) {
    document.getElementById('raw-textarea').value = markdown
  }
}

// ==============================
// 块点击进入编辑
// ==============================

function onBlockClick(e) {
  if (isSplitMode) return

  const activeTextarea = document.querySelector('.wysiwyg-edit')
  if (activeTextarea) {
    activeTextarea.dispatchEvent(new Event('blur'))
  }

  const block = e.currentTarget
  const source = block.getAttribute('data-source')
  const index = block.getAttribute('data-index')

  const textarea = document.createElement('textarea')
  textarea.className = 'wysiwyg-edit'
  textarea.value = source
  textarea.setAttribute('data-index', index)
  textarea.style.height = 'auto'

  block.replaceWith(textarea)
  textarea.style.height = textarea.scrollHeight + 'px'

  setStatusMode('编辑模式')

  textarea.addEventListener('input', () => {
    textarea.style.height = 'auto'
    textarea.style.height = textarea.scrollHeight + 'px'
    updateStatusBar()
  })

  textarea.addEventListener('blur', () => {
    const newSource = textarea.value
    const idx = parseInt(textarea.getAttribute('data-index'))
    const paragraphs = splitParagraphs(markdownContent)
    paragraphs[idx] = newSource
    markdownContent = paragraphs.join('\n\n')

    const newBlock = document.createElement('div')
    newBlock.className = 'wysiwyg-block'
    newBlock.setAttribute('data-source', newSource)
    newBlock.setAttribute('data-index', idx)
    newBlock.innerHTML = renderMarkdown(newSource)

    // 为代码块添加 data-lang
    const pre = newBlock.querySelector('pre')
    if (pre) {
      const code = pre.querySelector('code')
      if (code) {
        const lang = Array.from(code.classList)
          .find(c => c.startsWith('language-'))
          ?.replace('language-', '') || ''
        pre.setAttribute('data-lang', lang || 'code')
      }
    }

    newBlock.addEventListener('click', onBlockClick)
    textarea.replaceWith(newBlock)

    hljs.highlightAll()
    decorateCodeBlocks(newBlock)
    buildToc()
    updateStatusBar()
    updateTocActive()
    setStatusMode('预览模式')
  })

  // Tab 键插入空格
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      textarea.value = textarea.value.slice(0, start) + '  ' + textarea.value.slice(end)
      textarea.selectionStart = textarea.selectionEnd = start + 2
    }
  })

  textarea.focus()
}

// ==============================
// 获取当前 Markdown 文本
// ==============================

function getCurrentMarkdown() {
  if (isSplitMode) {
    return document.getElementById('raw-textarea').value
  }

  const container = document.getElementById('wysiwyg-editor')
  const blocks = container.querySelectorAll('.wysiwyg-block')
  const activeTextarea = container.querySelector('.wysiwyg-edit')

  const parts = []
  const blockList = Array.from(blocks)

  if (activeTextarea) {
    const activeIndex = parseInt(activeTextarea.getAttribute('data-index'))
    blockList.forEach((block) => {
      const idx = parseInt(block.getAttribute('data-index'))
      if (idx === activeIndex) {
        parts.push(activeTextarea.value)
      } else {
        parts.push(block.getAttribute('data-source'))
      }
    })
    if (!blockList.some(b => parseInt(b.getAttribute('data-index')) === activeIndex)) {
      parts.push(activeTextarea.value)
    }
  } else {
    blockList.forEach((block) => {
      parts.push(block.getAttribute('data-source'))
    })
  }

  return parts.join('\n\n')
}

// ==============================
// TOC 目录生成
// ==============================

function buildToc() {
  const tocContainer = document.getElementById('toc')
  const headings = document.getElementById('wysiwyg-editor').querySelectorAll('h1, h2, h3, h4, h5, h6')

  if (headings.length === 0) {
    tocContainer.innerHTML = '<div class="toc-empty">暂无标题</div>'
    return
  }

  const rootUl = document.createElement('ul')
  const stack = [{ level: 0, ul: rootUl }]

  headings.forEach((heading) => {
    const level = parseInt(heading.tagName.charAt(1))
    const text = heading.textContent
    const id = text
      .replace(/[^a-zA-Z0-9\u4e00-\u9fa5\s]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .toLowerCase()
    heading.id = id

    while (stack.length > 1 && stack[stack.length - 1].level >= level) {
      stack.pop()
    }

    const parentUl = stack[stack.length - 1].ul

    const li = document.createElement('li')
    const a = document.createElement('a')
    a.href = '#' + id
    a.textContent = text
    li.appendChild(a)
    parentUl.appendChild(li)

    const childUl = document.createElement('ul')
    li.appendChild(childUl)
    stack.push({ level, ul: childUl })
  })

  tocContainer.innerHTML = ''
  tocContainer.appendChild(rootUl)
}

// ==============================
// TOC 平滑滚动 + 滚动位置高亮（scroll-spy）
// ==============================

let _tocSpyTimer = null

function scrollTocToHeading(href) {
  const id = decodeURIComponent(String(href).replace(/^#/, ''))
  if (!id) return
  const heading = document.getElementById(id)
  if (!heading) return
  // 使用 scrollIntoView 确保在嵌套滚动容器（#wysiwyg-editor）内正确滚动
  heading.scrollIntoView({ behavior: 'smooth', block: 'start' })
  heading.classList.add('flash-highlight')
  setTimeout(() => heading.classList.remove('flash-highlight'), 1200)
}

function updateTocActive() {
  const container = document.getElementById('wysiwyg-editor')
  if (!container) return
  const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6'))
  if (headings.length === 0) return
  const scrollTop = container.scrollTop
  const probe = scrollTop + 24
  let currentId = null
  for (const h of headings) {
    if (h.offsetTop <= probe) currentId = h.id
    else break
  }
  document.querySelectorAll('#toc a').forEach(a => {
    a.classList.toggle('active', currentId !== null && a.getAttribute('href') === '#' + currentId)
  })
}

// ==============================
// 代码块一键复制
// ==============================

function decorateCodeBlocks(container) {
  if (!container) return
  container.querySelectorAll('pre').forEach(pre => {
    if (pre.querySelector('.code-copy-btn')) return
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'code-copy-btn'
    btn.textContent = '复制'
    btn.setAttribute('aria-label', '复制代码块')
    pre.appendChild(btn)
  })
}

function flashCopied(btn) {
  btn.textContent = '已复制'
  btn.classList.add('copied')
  setTimeout(() => {
    btn.textContent = '复制'
    btn.classList.remove('copied')
  }, 1500)
}

async function copyCodeBlock(btn) {
  const pre = btn.closest('pre')
  const codeEl = pre && pre.querySelector('code')
  if (!codeEl) return
  const text = codeEl.textContent || ''
  if (!text) return

  const useClipboardApi =
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    navigator.clipboard.writeText &&
    window.isSecureContext !== false

  if (useClipboardApi) {
    try {
      await navigator.clipboard.writeText(text)
      flashCopied(btn)
      return
    } catch (e) { /* 落入回退方案 */ }
  }

  // 回退：隐藏 textarea + execCommand('copy')
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0'
  document.body.appendChild(ta)
  ta.select()
  let copied = false
  try { copied = document.execCommand('copy') } catch (e) { copied = false }
  ta.remove()
  if (copied) flashCopied(btn)
  else showToast('复制失败，请手动选择复制', 'error')
}

// ==============================
// 状态栏更新
// ==============================

function updateStatusBar() {
  const text = getCurrentMarkdown()
  const chars = text.length
  const lines = text.split('\n').length
  // 字数统计：中文每字 1，英文以单词算
  const cnChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  const enWords = (text.replace(/[\u4e00-\u9fa5]/g, ' ').match(/\b\w+\b/g) || []).length
  const wordCount = cnChars + enWords

  document.getElementById('status-word-count').textContent = `${wordCount} 字`
  document.getElementById('status-line-count').textContent = `${lines} 行`
  document.getElementById('status-char-count').textContent = `${chars} 字符`
}

function setStatusMode(mode) {
  document.getElementById('status-mode').textContent = mode
  // 编辑/分屏为活跃状态：状态点呼吸提示；预览模式保持静态，避免常驻动画
  const dot = document.querySelector('.status-dot')
  if (dot) dot.classList.toggle('active', mode !== '预览模式')
}

// ==============================
// 文件路径显示
// ==============================

function updateFilePath(filePath) {
  if (TabManager.activeTab) {
    TabManager.activeTab.filePath = filePath
    TabManager.updateTabTitle(TabManager.activeTabId, filePath)
  }
  document.getElementById('file-path').textContent = filePath ? filePath.split(/[\\/]/).pop() : '未命名'
  const fileName = filePath ? filePath.split(/[\\/]/).pop() : null
  document.title = filePath ? fileName + ' — MD Tool' : 'MD Tool'
  document.getElementById('file-path').classList.remove('modified')
  if (TabManager.activeTab) TabManager.activeTab.isModified = false
}

function markModified() {
  document.getElementById('file-path').classList.add('modified')
  if (TabManager.activeTabId) {
    TabManager.markTabModified(TabManager.activeTabId)
  }
}

// ==============================
// 最大化按钮状态
// ==============================

async function updateMaximizeBtn() {
  const isMax = await window.__TAURI_API__.getCurrentWindow().isMaximized()
  document.getElementById('btn-maximize').textContent = isMax ? '❐' : '□'
}

// ==============================
// 保存文件
// ==============================

async function saveFile() {
  const content = getCurrentMarkdown()
  if (currentFilePath) {
    const result = await invoke('save_file', { filePath: currentFilePath, content })
    if (result.success) {
      showToast('文件已保存', 'success')
      document.getElementById('file-path').classList.remove('modified')
      TabManager.clearTabModified(TabManager.activeTabId)
    } else {
      showToast('保存失败: ' + result.error, 'error')
    }
  } else {
    const result = await invoke('save_file_dialog', { content })
    if (result.success && result.filePath) {
      updateFilePath(result.filePath)
      TabManager.clearTabModified(TabManager.activeTabId)
      showToast('文件已保存', 'success')
    } else if (!result.success && result.error) {
      showToast('保存失败: ' + result.error, 'error')
    }
  }
}

// ==============================
// 新建文件
// ==============================

function newFile() {
  const newId = TabManager.createTab(null, '')
  TabManager.activateTab(newId)
  if (!isSplitMode) {
    document.querySelector('.wysiwyg-empty')?.click()
  }
  showToast('已新建文件', 'info')
}

// ==============================
// 分屏模式
// ==============================

function toggleSplitMode() {
  const rawEditor = document.getElementById('raw-editor')
  const btn = document.getElementById('btn-split-view')

  if (!isSplitMode) {
    // 先获取当前内容（此时 isSplitMode 还是 false，会正确读取 WYSIWYG 编辑器内容）
    const currentMd = getCurrentMarkdown()
    isSplitMode = true
    rawEditor.classList.add('visible')
    btn.classList.add('active')
    btn.textContent = '⊟ 分屏'
    document.getElementById('raw-textarea').value = currentMd
    setStatusMode('分屏模式')

    document.getElementById('raw-textarea').addEventListener('input', onRawInput)
  } else {
    isSplitMode = false
    rawEditor.classList.remove('visible')
    btn.classList.remove('active')
    btn.textContent = '⊟ 分屏'

    // 从原始编辑器同步内容
    const md = document.getElementById('raw-textarea').value
    renderAll(md)
    document.getElementById('raw-textarea').removeEventListener('input', onRawInput)
    setStatusMode('预览模式')
  }
}

function onRawInput() {
  clearTimeout(_rawSyncTimer)
  _rawSyncTimer = setTimeout(() => {
    const md = document.getElementById('raw-textarea').value
    markdownContent = md
    const container = document.getElementById('wysiwyg-editor')
    const paragraphs = splitParagraphs(md)
    container.innerHTML = ''
    paragraphs.forEach((para, index) => {
      const block = document.createElement('div')
      block.className = 'wysiwyg-block'
      block.setAttribute('data-source', para)
      block.setAttribute('data-index', index)
      block.innerHTML = renderMarkdown(para)

      const pre = block.querySelector('pre')
      if (pre) {
        const code = pre.querySelector('code')
        if (code) {
          const lang = Array.from(code.classList)
            .find(c => c.startsWith('language-'))
            ?.replace('language-', '') || ''
          pre.setAttribute('data-lang', lang || 'code')
        }
      }

      block.addEventListener('click', onBlockClick)
      container.appendChild(block)
    })
    buildToc()
    hljs.highlightAll()
    decorateCodeBlocks(container)
    updateStatusBar()
    updateTocActive()
    markModified()
  }, 200)
}

// ==============================
// TOC 面板切换
// ==============================

function toggleTocPanel() {
  isTocVisible = !isTocVisible
  const panel = document.getElementById('toc-panel')
  panel.classList.toggle('panel-collapsed', !isTocVisible)
}

function toggleExplorerPanel() {
  const panel = document.getElementById('file-tree-panel')
  const collapsed = panel.classList.toggle('panel-collapsed')
  showToast(collapsed ? '已隐藏资源管理器' : '已显示资源管理器', 'info')
}

// ==============================
// 专注模式
// ==============================

function toggleFocusMode() {
  isFocusMode = !isFocusMode
  document.body.classList.toggle('focus-mode', isFocusMode)
  const tocPanel = document.getElementById('toc-panel')
  if (isFocusMode) {
    isTocVisible = false
    tocPanel.classList.add('panel-collapsed')
    showToast('已进入专注模式（按 F11 退出）', 'info')
  } else {
    isTocVisible = true
    tocPanel.classList.remove('panel-collapsed')
    showToast('已退出专注模式', 'info')
  }
}

// ==============================
// 格式化工具栏 — 在当前编辑 textarea 中插入
// ==============================

function insertFormat(before, after = '') {
  const textarea = document.querySelector('.wysiwyg-edit')
  if (!textarea) {
    showToast('请先点击一个段落进行编辑', 'info')
    return
  }

  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selected = textarea.value.slice(start, end)
  const replacement = before + selected + after
  textarea.value = textarea.value.slice(0, start) + replacement + textarea.value.slice(end)

  // 选中插入的内容
  textarea.selectionStart = start + before.length
  textarea.selectionEnd = start + before.length + selected.length
  textarea.focus()

  // 触发高度调整
  textarea.dispatchEvent(new Event('input'))
}

function insertLine(prefix) {
  const textarea = document.querySelector('.wysiwyg-edit')
  if (!textarea) {
    showToast('请先点击一个段落进行编辑', 'info')
    return
  }

  const start = textarea.selectionStart
  const lineStart = textarea.value.lastIndexOf('\n', start - 1) + 1
  textarea.value =
    textarea.value.slice(0, lineStart) +
    prefix +
    textarea.value.slice(lineStart)
  textarea.selectionStart = textarea.selectionEnd = start + prefix.length
  textarea.focus()
  textarea.dispatchEvent(new Event('input'))
}

// ==============================
// 工具栏事件绑定
// ==============================

document.getElementById('tb-bold').addEventListener('click', () => insertFormat('**', '**'))
document.getElementById('tb-italic').addEventListener('click', () => insertFormat('*', '*'))
document.getElementById('tb-strike').addEventListener('click', () => insertFormat('~~', '~~'))
document.getElementById('tb-h1').addEventListener('click', () => insertLine('# '))
document.getElementById('tb-h2').addEventListener('click', () => insertLine('## '))
document.getElementById('tb-h3').addEventListener('click', () => insertLine('### '))
document.getElementById('tb-ul').addEventListener('click', () => insertLine('- '))
document.getElementById('tb-ol').addEventListener('click', () => insertLine('1. '))
document.getElementById('tb-task').addEventListener('click', () => insertLine('- [ ] '))
document.getElementById('tb-code').addEventListener('click', () => insertFormat('`', '`'))
document.getElementById('tb-codeblock').addEventListener('click', () => insertFormat('```\n', '\n```'))
document.getElementById('tb-quote').addEventListener('click', () => insertLine('> '))
document.getElementById('tb-link').addEventListener('click', () => insertFormat('[', '](url)'))
document.getElementById('tb-table').addEventListener('click', () => {
  const textarea = document.querySelector('.wysiwyg-edit')
  if (!textarea) { showToast('请先点击一个段落进行编辑', 'info'); return }
  const table = '\n| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |\n'
  const start = textarea.selectionStart
  textarea.value = textarea.value.slice(0, start) + table + textarea.value.slice(start)
  textarea.selectionStart = textarea.selectionEnd = start + table.length
  textarea.focus()
  textarea.dispatchEvent(new Event('input'))
})
document.getElementById('tb-hr').addEventListener('click', () => {
  const textarea = document.querySelector('.wysiwyg-edit')
  if (!textarea) { showToast('请先点击一个段落进行编辑', 'info'); return }
  const start = textarea.selectionStart
  const hr = '\n---\n'
  textarea.value = textarea.value.slice(0, start) + hr + textarea.value.slice(start)
  textarea.selectionStart = textarea.selectionEnd = start + hr.length
  textarea.focus()
  textarea.dispatchEvent(new Event('input'))
})

document.getElementById('btn-split-view').addEventListener('click', toggleSplitMode)

// ==============================
// 编辑器区事件委托（代码复制 / TOC 跳转）
// ==============================

document.getElementById('wysiwyg-editor').addEventListener('click', (e) => {
  // 捕获阶段拦截：复制按钮 / 站内锚点点击不应触发段落编辑态（onBlockClick 冒泡监听）
  const copyBtn = e.target.closest('.code-copy-btn')
  if (copyBtn) {
    e.stopPropagation()
    copyCodeBlock(copyBtn)
    return
  }
  const anchor = e.target.closest('a[href^="#"]')
  if (anchor && anchor.closest('.wysiwyg-block')) {
    e.preventDefault()
    e.stopPropagation()
    // WYSIWYG 内容中的站内锚点：平滑滚动（默认 hash 跳转对嵌套滚动容器不可靠）
    scrollTocToHeading(anchor.getAttribute('href'))
  }
}, true)

document.getElementById('toc').addEventListener('click', (e) => {
  const anchor = e.target.closest('a[href^="#"]')
  if (!anchor) return
  e.preventDefault()
  scrollTocToHeading(anchor.getAttribute('href'))
})

// 滚动位置跟踪：当前阅读标题在 TOC 中高亮
const _wysiwygScroller = document.getElementById('wysiwyg-editor')
_wysiwygScroller.addEventListener('scroll', () => {
  clearTimeout(_tocSpyTimer)
  _tocSpyTimer = setTimeout(updateTocActive, 80)
}, { passive: true })

// ==============================
// 窗口控制
// ==============================

document.getElementById('btn-minimize').addEventListener('click', () => {
  window.__TAURI_API__.getCurrentWindow().minimize()
})

document.getElementById('btn-maximize').addEventListener('click', async () => {
  await window.__TAURI_API__.getCurrentWindow().toggleMaximize()
  updateMaximizeBtn()
})

document.getElementById('btn-close').addEventListener('click', () => {
  window.__TAURI_API__.getCurrentWindow().close()
})

document.getElementById('btn-new-tab').addEventListener('click', () => {
  newFile()
})

// ==============================
// 菜单栏下拉交互
// ==============================

function setupMenuToggle(menuId) {
  const menu = document.getElementById(menuId)
  menu.addEventListener('click', (e) => {
    e.stopPropagation()
    // 点击展开的下拉项：菜单项处理器已执行动作，此处仅确保菜单关闭，
    // 避免冒泡后 toggle 又把菜单重新打开（原实现缺陷）
    if (e.target.closest('.dropdown')) {
      document.querySelectorAll('.menu-item.open').forEach(m => m.classList.remove('open'))
      return
    }
    // 点击菜单标题：关闭其他菜单并切换本菜单
    document.querySelectorAll('.menu-item.open').forEach(m => {
      if (m !== menu) m.classList.remove('open')
    })
    menu.classList.toggle('open')
  })
}

setupMenuToggle('menu-file')
setupMenuToggle('menu-view')

document.addEventListener('click', () => {
  document.querySelectorAll('.menu-item.open').forEach(m => m.classList.remove('open'))
})

// ==============================
// 菜单项操作
// ==============================

document.getElementById('menu-new-file').addEventListener('click', () => {
  document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('open'))
  newFile()
})

document.getElementById('menu-open-file').addEventListener('click', async () => {
  document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('open'))
  const result = await invoke('open_file')
  if (!result.canceled) {
    const existingTab = TabManager.findTabByPath(result.filePath)
    if (existingTab) {
      TabManager.activateTab(existingTab.id)
    } else {
      const newId = TabManager.createTab(result.filePath, result.content)
      TabManager.activateTab(newId)
    }
    showToast('文件已打开', 'success')
  }
})

document.getElementById('menu-save-file').addEventListener('click', async () => {
  document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('open'))
  await saveFile()
})

document.getElementById('menu-save-as').addEventListener('click', async () => {
  document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('open'))
  const result = await invoke('save_file_dialog', { content: getCurrentMarkdown() })
  if (result.success && result.filePath) {
    updateFilePath(result.filePath)
    TabManager.clearTabModified(TabManager.activeTabId)
    showToast('文件已另存为', 'success')
  } else if (!result.success && result.error) {
    showToast('保存失败: ' + result.error, 'error')
  }
})

document.getElementById('menu-export-html').addEventListener('click', async () => {
  document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('open'))
  const previewContent = document.getElementById('wysiwyg-editor').innerHTML
  const safeContent = DOMPurify.sanitize(previewContent, {
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
  })
  const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>导出文档</title>
  <style>
    body { max-width: 900px; margin: 60px auto; padding: 0 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.8; color: #1a1a1a; }
    pre { background: #f6f8fa; border-radius: 8px; padding: 16px; overflow-x: auto; }
    code { font-family: 'Consolas', monospace; }
    h1, h2 { border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
    blockquote { border-left: 3px solid #2563eb; padding: 12px 18px; background: #f8fafc; margin: 0 0 16px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #e5e7eb; padding: 10px 14px; }
    th { background: #f9fafb; }
  </style>
</head>
<body>
${safeContent}
</body>
</html>`
  const result = await invoke('export_html', { content: htmlContent })
  if (result.success) {
    showToast('HTML 导出成功！', 'success')
  } else if (result.error) {
    showToast('导出失败: ' + result.error, 'error')
  }
})

document.getElementById('menu-export-pdf').addEventListener('click', () => {
  document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('open'))
  showToast('PDF 导出功能暂不支持', 'info')
})

document.getElementById('menu-toggle-toc').addEventListener('click', () => {
  document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('open'))
  toggleTocPanel()
})

document.getElementById('menu-toggle-split').addEventListener('click', () => {
  document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('open'))
  toggleSplitMode()
})

document.getElementById('menu-focus-mode').addEventListener('click', () => {
  document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('open'))
  toggleFocusMode()
})

// ==============================
// 全局键盘快捷键
// ==============================

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    saveFile()
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault()
    newFile()
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
    e.preventDefault()
    document.getElementById('menu-open-file').click()
  }
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
    e.preventDefault()
    document.getElementById('menu-save-as').click()
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
    e.preventDefault()
    insertFormat('**', '**')
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
    e.preventDefault()
    insertFormat('*', '*')
  }
  if (e.key === 'F11') {
    e.preventDefault()
    toggleFocusMode()
  }
  if (e.key === 'Escape') {
    if (isFocusMode) {
      toggleFocusMode()
    }
    // 关闭下拉菜单
    document.querySelectorAll('.menu-item.open').forEach(m => m.classList.remove('open'))
  }
})

// ==============================
// 主题切换
// ==============================

function initTheme() {
  const saved = localStorage.getItem('theme') || 'dark'
  applyTheme(saved)
}

function applyTheme(theme) {
  document.body.dataset.theme = theme
  if (theme === 'dark') {
    document.getElementById('btn-theme').textContent = '☀️'
  } else {
    document.getElementById('btn-theme').textContent = '🌙'
  }
  localStorage.setItem('theme', theme)
}

document.getElementById('btn-theme').addEventListener('click', () => {
  const isDark = document.body.dataset.theme === 'dark'
  applyTheme(isDark ? 'light' : 'dark')
})

// ==============================
// 监听内容变更（标记未保存）
// ==============================

document.getElementById('wysiwyg-editor').addEventListener('input', () => {
  markModified()
  updateStatusBar()
}, true)

// ==============================
// 初始化
// ==============================

const initialMarkdown = `# 欢迎使用 MD Tool ✨

这是一个基于 **Tauri** 的现代化 Markdown 编辑器。

## 🚀 功能特性

- **所见即所得**：点击段落即可直接编辑
- **实时预览**：分屏模式下同步渲染
- **代码高亮**：支持多种编程语言语法高亮
- **自动目录**：根据标题自动生成导航目录
- **导出支持**：支持导出 HTML
- **快捷键**：\`Ctrl+S\` 保存，\`Ctrl+B\` 粗体，\`F11\` 专注模式

## 📝 代码示例

\`\`\`js
// 欢迎使用 MD Tool
const greet = (name) => {
  return \`Hello, \${name}! 🎉\`;
};

console.log(greet('World'));
\`\`\`

## 📊 表格示例

| 功能 | 状态 | 说明 |
| --- | --- | --- |
| WYSIWYG 编辑 | ✅ | 点击即编辑 |
| 分屏模式 | ✅ | 同步渲染 |
| 主题切换 | ✅ | 亮/暗模式 |
| 专注模式 | ✅ | F11 触发 |

## 💡 快速上手

> 点击上方 **工具栏** 中的按钮，或先点击一个段落进入编辑状态，再使用快捷键进行格式化。

---

*开始你的 Markdown 创作之旅吧！*
`

initTheme()

// 打开文件夹对话框 → 加载文件树（供菜单与文件树空态按钮复用）
async function openFolderFromDialog() {
  document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('open'))
  try {
    const result = await invoke('open_folder')
    if (result) {
      await FileTree.load(result)
    }
  } catch (e) {
    showToast('打开文件夹失败: ' + e.message, 'error')
  }
}

document.getElementById('menu-open-folder').addEventListener('click', openFolderFromDialog)

// 视图菜单：切换资源管理器面板
document.getElementById('menu-toggle-explorer').addEventListener('click', () => {
  document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('open'))
  toggleExplorerPanel()
})

// 资源管理器空态“打开文件夹…”按钮
const fileTreeEmptyHint = document.getElementById('file-tree-empty-hint')
if (fileTreeEmptyHint) {
  fileTreeEmptyHint.addEventListener('click', (e) => {
    if (e.target.closest('#btn-open-folder-from-tree')) {
      openFolderFromDialog()
    }
  })
}

document.getElementById('btn-refresh-tree').addEventListener('click', async () => {
  if (FileTree.rootPath) {
    await FileTree.load(FileTree.rootPath)
  }
})

// ==============================
// 标签页拖拽排序（基于 mouse 事件）
// ==============================
;(function () {
  let dragSrcId = null      // 正在拖拽的 tab id
  let isDragging = false    // 是否已进入拖拽状态
  let startX = 0            // mousedown 时的 X 坐标
  let ghost = null          // 跟随鼠标的幽灵元素

  const DRAG_THRESHOLD = 5  // 触发拖拽的最小移动距离（px）

  // 清理所有拖拽状态
  function cleanupDrag() {
    isDragging = false
    dragSrcId = null
    if (ghost) { ghost.remove(); ghost = null }
    document.querySelectorAll('.tab-item').forEach(el => {
      el.classList.remove('dragging', 'insert-before', 'insert-after')
    })
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
  }

  // 根据当前鼠标 X 坐标，找到应插入的位置
  // 返回 { tabId, before: true/false }
  function getInsertTarget(clientX) {
    const items = Array.from(document.querySelectorAll('.tab-item'))
    for (const el of items) {
      const rect = el.getBoundingClientRect()
      if (clientX >= rect.left && clientX <= rect.right) {
        const mid = rect.left + rect.width / 2
        return { tabId: el.dataset.tabId, before: clientX < mid }
      }
    }
    // 超出所有 tab 右侧 → 插到最后
    if (items.length > 0) {
      const last = items[items.length - 1]
      const lastRect = last.getBoundingClientRect()
      if (clientX > lastRect.right) {
        return { tabId: last.dataset.tabId, before: false }
      }
      // 超出所有 tab 左侧 → 插到最前
      const first = items[0]
      const firstRect = first.getBoundingClientRect()
      if (clientX < firstRect.left) {
        return { tabId: first.dataset.tabId, before: true }
      }
    }
    return null
  }

  // 更新插入位置指示线
  function updateIndicator(insertTarget) {
    document.querySelectorAll('.tab-item').forEach(el => {
      el.classList.remove('insert-before', 'insert-after')
    })
    if (!insertTarget) return
    const el = getTabElement(insertTarget.tabId)
    if (el) el.classList.add(insertTarget.before ? 'insert-before' : 'insert-after')
  }

  // 监听 tabs-container 的 mousedown，捕获拖拽起点
  document.getElementById('tabs-container').addEventListener('mousedown', (e) => {
    const tabEl = e.target.closest('.tab-item')
    // 点到关闭按钮不触发拖拽
    if (!tabEl || e.target.closest('.tab-close')) return
    dragSrcId = tabEl.dataset.tabId
    startX = e.clientX
    isDragging = false
  })

  document.addEventListener('mousemove', (e) => {
    if (!dragSrcId) return

    // 超过阈值才开始拖拽
    if (!isDragging) {
      if (Math.abs(e.clientX - startX) < DRAG_THRESHOLD) return
      isDragging = true

      // 创建幽灵元素
      const srcEl = getTabElement(dragSrcId)
      if (!srcEl) { cleanupDrag(); return }
      ghost = srcEl.cloneNode(true)
      ghost.id = 'tab-ghost'
      ghost.style.cssText = `
        position: fixed;
        pointer-events: none;
        z-index: 9999;
        opacity: 0.75;
        transform: scale(1.05);
        box-shadow: var(--shadow-md);
        transition: none;
      `
      document.body.appendChild(ghost)
      srcEl.classList.add('dragging')
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'grabbing'
    }

    // 移动幽灵
    if (ghost) {
      ghost.style.left = (e.clientX + 12) + 'px'
      ghost.style.top  = (e.clientY - 14) + 'px'
    }

    // 更新插入位置指示线
    const target = getInsertTarget(e.clientX)
    if (target && target.tabId !== dragSrcId) {
      updateIndicator(target)
    } else {
      updateIndicator(null)
    }
  })

  document.addEventListener('mouseup', (e) => {
    if (!dragSrcId || !isDragging) {
      dragSrcId = null
      return
    }

    const target = getInsertTarget(e.clientX)
    if (target && target.tabId !== dragSrcId) {
      // 执行排序
      const srcIdx = TabManager.tabs.findIndex(t => t.id === dragSrcId)
      if (srcIdx !== -1) {
        const [moved] = TabManager.tabs.splice(srcIdx, 1)
        let dstIdx = TabManager.tabs.findIndex(t => t.id === target.tabId)
        if (dstIdx !== -1) {
          if (target.before) {
            TabManager.tabs.splice(dstIdx, 0, moved)
          } else {
            TabManager.tabs.splice(dstIdx + 1, 0, moved)
          }
          TabManager._reorderTabDOMs()
        } else {
          // 找不到目标，回滚
          TabManager.tabs.splice(srcIdx, 0, moved)
        }
      }
    }

    cleanupDrag()
  })
})()

const _initTabId = TabManager.createTab(null, initialMarkdown)
TabManager.activateTab(_initTabId)
updateStatusBar()
