# AGENTS.md — 项目规范说明

本文件记录本项目的关键规范与非显而易见的约束，供 AI 助手了解项目规则。

---

## 1. 项目概述

**技术栈**：Tauri 2 + Rust + JavaScript，Markdown 编辑器桌面应用。

**目录结构**：

```
MD_tool/
├── package.json
├── src/
│   └── renderer/            # 前端渲染进程（无构建工具，纯 HTML/JS/CSS）
│       ├── index.html       # 入口页面
│       ├── renderer.js      # 渲染进程逻辑
│       ├── style.css        # 样式（亮/暗双主题，CSS 变量设计系统）
│       ├── marked.min.js    # Markdown 解析（v9+）
│       ├── purify.min.js    # DOMPurify HTML 消毒
│       ├── hljs.bundle.js   # 代码高亮（由 scripts/build-hljs.js 生成）
│       └── tauri-api.bundle.js # Tauri API 包装（由 scripts/build-tauri-api.js 生成）
├── src-tauri/               # Tauri 后端 (Rust)
│   ├── tauri.conf.json      # Tauri 配置（withGlobalTauri: false）
│   ├── Cargo.toml           # Rust 依赖（tauri 2, serde, tauri-plugin-dialog, tauri-plugin-fs）
│   └── src/
│       ├── lib.rs           # Rust 命令实现（文件读写、对话框、目录树遍历）
│       └── main.rs          # Rust 入口
├── scripts/
│   ├── build-hljs.js        # 打包 highlight.js 为浏览器 IIFE 格式
│   └── build-tauri-api.js   # 打包 @tauri-apps/api 为 IIFE 格式（esbuild）
├── __tests__/               # Jest 测试目录
│   └── fileTree.test.js     # FileTree 单元测试（jsdom 环境）
├── dist/                    # Tauri 构建输出
└── .roo/                    # ⚠️ 遗留规则目录（原 Electron 项目，内容已过时，仅供参考）
```

> **注意**：
> - 前端无构建工具（Webpack/Vite 等），依赖通过 `<script>` 标签直接加载。
> - Tauri 配置 `withGlobalTauri: false`，因此标准 `window.__TAURI__` 不可用。改用通过 `scripts/build-tauri-api.js` 打包的自定义 `window.__TAURI_API__`。

---

## 2. 构建与测试命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Tauri 开发模式 |
| `npm run build` | 构建 Tauri 发布版本（生产部署用） |
| `npm start` | 等同于 `npm run dev` |
| `npm test` | 运行 Jest 测试套件（带 `--experimental-vm-modules`） |
| `npm test -- --testNamePattern="FileTree.render"` | 运行匹配名称的测试 |
| `npm run build:tauri-api` | 用 esbuild 打包 `tauri-api.bundle.js` |
| `node scripts/build-hljs.js` | 重新生成 `hljs.bundle.js` |

> `npm test` 内部使用 `node --experimental-vm-modules node_modules/jest/bin/jest.js`，必须携带此标志才能正常运行 ES 模块测试。测试文件使用 `@jest-environment jsdom`，放在 `__tests__/` 中或以 `.test.js` 命名。

---

## 3. 代码风格指南

### 3.1 JavaScript/前端代码

**命名约定**：
- 变量/函数：`camelCase`（`isSplitMode`, `getCurrentMarkdown`, `toggleFocusMode`）
- 对象字面量（作为命名空间）：`PascalCase`（`TabManager`, `FileTree`）
- "私有"方法：下划线前缀（`_renderTabDOM`, `_nextId`, `_reorderTabDOMs`）
- DOM ID：`kebab-case`（`wysiwyg-editor`, `raw-textarea`, `toc-panel`）
- CSS 类名：`kebab-case`（`tab-item`, `wysiwyg-block`, `file-tree-node`）
- 事件回调函数：使用 `on` 前缀（`onBlockClick`, `onRawInput`）

**导入与全局 API**：
```js
// ✅ Tauri IPC（自定义 API bundle）
const { invoke } = window.__TAURI_API__
const result = await invoke('open_file')

// ✅ 窗口控制
window.__TAURI_API__.getCurrentWindow().minimize()

// ❌ 不使用 require() - 渲染进程运行在 Chromium 沙箱中
// ❌ 不使用 window.__TAURI__.core - 因 withGlobalTauri: false 不可用
```

**代码组织**：使用 `/* ====== 区块标题 ====== */` 风格的分隔注释划分功能块。

**错误处理 - async/await + try/catch 模式**：
```js
async function saveFile() {
  try {
    const result = await invoke('save_file', { filePath, content })
    if (result.success) {
      showToast('文件已保存', 'success')
    } else {
      showToast('保存失败: ' + result.error, 'error')
    }
  } catch (e) {
    showToast('错误: ' + e.message, 'error')
  }
}
```

**Toast 通知系统**：`showToast(message, type, duration)`，type 支持 `success`/`error`/`info`。

### 3.2 Rust 代码

**命名约定**：
- 函数：`snake_case`（`open_file`, `save_file`, `read_dir_recursive`）
- 结构体：`PascalCase`（`OpenFileResult`, `SaveResult`, `FileTreeNode`）
- 字段：`snake_case`，序列化时使用 `#[serde(rename = "camelCase")]`

**错误处理**：
```rust
#[tauri::command]
async fn open_file(app: tauri::AppHandle) -> Result<OpenFileResult, String> {
    match some_operation() {
        Ok(result) => Ok(result),
        Err(e) => Err(sanitize_error(&e)), // 脱敏错误信息
    }
}
```

**序列化**：
```rust
#[derive(Serialize)]
pub struct FileTreeNode {
    pub name: String,
    pub path: String,
    #[serde(rename = "isDirectory")]
    pub is_directory: bool,
    pub children: Option<Vec<FileTreeNode>>,
}
```

### 3.3 安全实践

- **路径白名单**：所有文件读写操作通过 `ApprovedPaths`（`Mutex<Vec<PathBuf>>`）校验，只允许操作已授权的目录。
- **错误信息脱敏**：`sanitize_error()` 函数将底层 I/O 错误转换为通用中文消息，不泄漏文件系统路径。
- **DOMPurify**：`renderMarkdown()` 使用 DOMPurify 清洗 marked 输出的 HTML，限制 `style`/`form`/`input` 等标签和事件属性。

---

## 4. Tauri IPC 通信约束

- **渲染进程无法直接调用 Rust**，所有系统能力必须通过 `invoke()` 调用。
- **所有 Rust 命令**在 `lib.rs` 中用 `#[tauri::command]` 暴露，在 `run()` 中注册。
- **不要引入新 crate 时忘记在 `main.rs` 和 `Cargo.toml` 同步**。

### 已注册的 Rust 命令

| 命令 | 说明 |
|------|------|
| `open_file` | 打开文件对话框并读取 Markdown 文件 |
| `save_file` | 保存内容到指定路径（需路径在白名单中） |
| `save_file_dialog` | 另存为对话框 |
| `export_html` | 导出 HTML 文件（无路径校验） |
| `open_folder` | 打开文件夹对话框，将路径加入白名单 |
| `get_folder_tree` | 递归获取文件夹树（最多 10 层深度） |
| `read_file_text` | 读取文件内容（需路径在白名单中） |

---

## 5. marked + DOMPurify 配置

`marked.setOptions` 在 renderer.js 中初始化，使用 **实际引入的 DOMPurify** 对渲染结果消毒：

```js
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

function renderMarkdown(source) {
  const rawHtml = marked.parse(source)
  return DOMPurify.sanitize(rawHtml, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling'],
    FORBID_TAGS: ['style', 'form', 'input', 'textarea', 'button'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
  })
}
```

> 禁止使用已废弃的 `sanitize: true` 选项（marked v9+ 已移除）。

---

## 6. TOC 锚点生成规则

TOC 由 `renderer.js` 的 `buildToc()` 函数生成。id 生成规则（`toId` 内联实现）：

```js
heading.id = text
  .replace(/[^\w\u4e00-\u9fff\s]/g, '')  // 仅保留字母、数字、中文、空格
  .trim()
  .replace(/\s+/g, '-')                     // 空格转连字符
  .toLowerCase()
```

**重要约束**：TOC 链接 `href="#{id}"` 必须与 heading 元素的 `id` 完全一致。中文标题保留中文字符，不做 URL 编码。

---

## 7. 其他注意事项

- **当前无 lint/format 工具**（无 ESLint、Prettier、TypeScript）。
- **PDF 导出功能暂未实现**，菜单项已灰显（`disabled-item`）。
- **主题状态**通过 `localStorage` 持久化，键名为 `theme`。
- **专注模式**：按 `F11` 进入/退出，隐藏 TOC 面板。
- **全局快捷键**：`Ctrl+S` 保存，`Ctrl+N` 新建，`Ctrl+O` 打开，`Ctrl+Shift+S` 另存为，`Ctrl+B` 粗体，`Ctrl+I` 斜体，`Ctrl+O` 打开，`F11` 专注模式，`Esc` 退出专注模式/关闭菜单。
- **标签页拖拽排序**：基于 mouse 事件实现，`TabManager._reorderTabDOMs()` 重排。
- **WYSIWYG 编辑模式**：点击段落块进入 textarea 编辑，blur 时渲染回 HTML。
- **分屏模式**：`isSplitMode` 标志控制，使用 `_rawSyncTimer`（200ms debounce）同步。
