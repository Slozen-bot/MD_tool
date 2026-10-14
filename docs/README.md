# MD Tool — 项目综合说明文档

> 本文档整合了项目内所有历史说明文档（`.cospec/plan/changes/` 下的 11 个变更提案与 `.roo/rules-*/` 规则文件），并结合当前代码现状，形成一份与代码同步的最新说明。
>
> 更新日期：2026-02（对应代码现状 v1.0.0）

---

## 目录

1. [项目简介](#1-项目简介)
2. [技术栈](#2-技术栈)
3. [目录结构](#3-目录结构)
4. [项目演进历史](#4-项目演进历史)
5. [构建与运行](#5-构建与运行)
6. [架构设计](#6-架构设计)
7. [Rust 命令清单（IPC 接口）](#7-rust-命令清单ipc-接口)
8. [安全设计](#8-安全设计)
9. [代码规范](#9-代码规范)
10. [测试](#10-测试)
11. [已知限制与后续规划](#11-已知限制与后续规划)
12. [常见问题 FAQ](#12-常见问题-faq)

---

## 1. 项目简介

**MD Tool** 是一款面向 Windows 的轻量级 Markdown 桌面编辑器，采用 **Tauri 2 + Rust + 原生 JavaScript（无前端构建工具）** 架构。

设计目标：

- **轻量**：使用系统 WebView2 替代内嵌 Chromium，安装包体积从 Electron 时代的 160MB+ 压缩到 10MB 级别
- **离线**：所有依赖（marked、highlight.js、DOMPurify）均已本地化，不依赖网络
- **安全**：严格的 CSP、HTML 消毒、Rust 端路径白名单、错误信息脱敏
- **好用**：Typora 风格 WYSIWYG 段落编辑、多标签页、文件树工作区、自动目录、双主题

---

## 2. 技术栈

| 层 | 技术 | 版本 | 说明 |
|----|------|------|------|
| 应用框架 | Tauri | 2.x | 桌面应用框架（Rust 后端 + 系统 WebView） |
| 后端语言 | Rust | 2021 Edition | 文件系统、对话框、目录树遍历 |
| 前端 | 原生 HTML/CSS/JS | — | 无 Webpack/Vite，`<script>` 标签直接加载 |
| Markdown 解析 | marked | 9.x | `gfm: true, breaks: true` |
| HTML 消毒 | DOMPurify | 3.x | 消毒 marked 输出（本地 `purify.min.js`） |
| 代码高亮 | highlight.js | 11.x | 21 种语言，IIFE 打包（本地 `hljs.bundle.js`） |
| Tauri API | @tauri-apps/api | 2.x | 仅 `core` 与 `window` 模块，esbuild 打包为 IIFE |
| 测试 | Jest + jsdom | 29.x / 30.x | `node --experimental-vm-modules` 运行 |
| 打包 | @tauri-apps/cli + NSIS | 2.x | Windows 安装包（`bundle.targets: "nsis"`） |

**关键约束**：

- `withGlobalTauri: false` —— 标准 `window.__TAURI__` 不可用，改用自定义打包的 `window.__TAURI_API__`（仅含 `invoke` 与 `getCurrentWindow`）
- 渲染进程运行在 WebView 沙箱中，**不能使用 `require()` / Node.js API**，所有系统能力必须通过 `invoke()` 调用 Rust 命令
- marked v9+ 已移除 `sanitize` 选项，消毒统一走 DOMPurify

---

## 3. 目录结构

```
MD_tool/
├── README.md                  # 项目入口文档（本文档的导航）
├── AGENTS.md                  # AI 助手项目规范（面向开发协作）
├── package.json               # npm 配置：tauri dev/build、jest、构建脚本
├── package-lock.json
├── src/
│   └── renderer/              # 前端渲染进程（无构建工具，纯 HTML/JS/CSS）
│       ├── index.html         # 入口页面（标题栏/标签栏/菜单栏/工具栏/主内容区/状态栏）
│       ├── renderer.js        # 渲染进程全部逻辑（约 1300 行，按区块注释组织）
│       ├── style.css          # 样式（CSS 变量设计系统，亮/暗双主题）
│       ├── icon.svg           # 应用内嵌 SVG 图标
│       ├── marked.min.js      # marked v9+（本地化）
│       ├── purify.min.js      # DOMPurify（本地化）
│       ├── hljs.bundle.js     # highlight.js IIFE 打包（scripts/build-hljs.js 生成）
│       └── tauri-api.bundle.js # Tauri API IIFE 打包（scripts/build-tauri-api.js 生成）
├── src-tauri/                 # Tauri 后端（Rust）
│   ├── tauri.conf.json        # Tauri 配置（窗口、CSP、打包、withGlobalTauri: false）
│   ├── Cargo.toml             # Rust 依赖（tauri 2, serde, dialog/fs 插件）
│   ├── build.rs               # tauri_build::build()
│   ├── capabilities/
│   │   └── default.json       # Tauri v2 权限配置（core:default + 窗口/对话框权限）
│   ├── icons/                 # 打包图标（icon.png）
│   └── src/
│       ├── lib.rs             # Rust 命令实现（7 个 command + 路径白名单 + 错误脱敏）
│       └── main.rs            # Rust 入口（调用 md_tool_lib::run()）
├── scripts/
│   ├── build-hljs.js          # 打包 highlight.js 核心 + 21 语言为浏览器 IIFE
│   └── build-tauri-api.js     # esbuild 打包 @tauri-apps/api 为 window.__TAURI_API__
├── __tests__/
│   └── fileTree.test.js       # FileTree 单元测试（jsdom，14 个用例）
├── assets/                    # 图标素材（icon.png / icon.svg）
├── .cospec/                   # 历史变更记录（提案/任务/规格，见 §4）
├── .roo/                      # ⚠️ 遗留规则目录（原 Electron 项目规则，内容已过时，仅供参考）
├── dist/                      # Tauri 构建输出（忽略）
└── node_modules/              # 依赖（忽略）
```

---

## 4. 项目演进历史

> 以下内容整合自 `.cospec/plan/changes/` 下的变更文档，按时间顺序记录了项目从 Electron 骨架到当前 Tauri 版本的完整演进。

### 4.1 初始化（init-md-tool-project）— Electron 时代

- 搭建 **Electron + Node.js/JavaScript** 项目骨架：`main.js`（主进程）、`preload.js`（contextBridge）、`src/renderer/`（渲染层）
- 实现 Markdown 实时预览（marked）、代码高亮（highlight.js）、自动目录（TOC）、导出 HTML / PDF（`webContents.printToPDF`）
- 创建根目录 `AGENTS.md` 与 `.roo/rules-*/AGENTS.md` 模式专用规范
- 技术决策：`contextIsolation: true` + `nodeIntegration: false`；PDF 用 Electron 内置 API 而非 puppeteer（体积 200MB+ 不可接受）

### 4.2 UI 升级（enhance-editor-ui）

- 无边框窗口 + **自定义标题栏**（图标、文件路径、最小化/最大化/关闭按钮），拖拽用 `-webkit-app-region: drag`
- 顶部**菜单栏**（文件菜单：打开/保存/另存为/导出 HTML/导出 PDF）
- 编辑区从左右分栏重构为 **Typora 风格 WYSIWYG 单区域**：段落点击进编辑态（textarea 显示原始 Markdown）、失焦渲染回 HTML；段落分割需识别代码围栏（```）内空行
- **GitHub 风格预览主题**：标题、表格、代码块、引用块、行内代码样式

### 4.3 修复与打磨（fix-titlebar-and-toc / fix-save-titlebar-and-ui）

- 内嵌 **SVG 图标**（修复空 src 无法显示）
- 标题栏显示**完整文件路径**，`document.title` 同步更新
- TOC 重构为**嵌套 `<ul>/<li>` 层级**（维护层级栈），条目单行省略（`overflow: hidden; text-overflow: ellipsis; white-space: nowrap`）
- 保存逻辑修正：`Ctrl+S` / "保存"直接覆写原文件；仅"另存为"弹对话框
- 引入 **CSS 变量设计系统**与**亮/暗双主题**（`localStorage` 键名 `theme`）

### 4.4 多标签页（add-multi-tab-editor）

- 标题栏与菜单栏之间新增 `#tab-bar` 标签行：文件名、未保存 `●` 标记、`+` 新建按钮
- `TabManager` 管理 `tabs[]`（`{id, filePath, markdownContent, isModified, scrollTop}`）、`activeTabId`
- 关闭有修改的标签弹确认；重复打开同一文件激活已有标签；标题栏路径实时跟随激活标签

### 4.5 文件树工作区（add-open-folder-workspace）

- Rust 新增 `open_folder`、`get_folder_tree`（递归遍历、不过滤文件类型）、`read_file_text`
- 前端新增左侧**资源管理器面板**（`#file-tree-panel`），文件夹可展开/折叠，点击文件以文本方式在新标签打开
- 菜单栏"文件"新增"打开文件夹"

### 4.6 标签拖拽排序（add-tab-drag-reorder）

- 最初按 HTML5 DnD（`draggable` + dragstart/dragover/drop）实现
- **当前实现已改为基于 mouse 事件**：`mousedown` 记录起点，移动超过 5px 阈值进入拖拽，生成幽灵元素跟随鼠标，插入位置指示线（`insert-before`/`insert-after`），`mouseup` 时重排 `TabManager.tabs` 并调用 `_reorderTabDOMs()` 重渲染

### 4.7 迁移到 Tauri（migrate-to-tauri）— 框架换代 🔄

- **原因**：Electron 打包体积 160MB+（捆绑完整 Chromium），Tauri 使用系统 WebView 可压缩至 3~10MB
- 移除 `electron` / `electron-builder` / `main.js` / `preload.js`
- 新增 `src-tauri/`（Cargo.toml、tauri.conf.json、capabilities、lib.rs 命令实现）
- 前端代码最大程度复用，IPC 调用层替换为 `invoke()` + Rust commands
- **移除 PDF 导出**：Tauri 无 `printToPDF` API，菜单项保留但灰显"暂不支持"（后续可经 `window.print()` 或 wkhtmltopdf 实现）
- 环境要求：Node.js、Rust（rustup stable）、Windows MSVC Build Tools、WebView2 Runtime（Win10 1803+ 内置）

### 4.8 安全加固（fix-security-vulnerabilities）🛡️

安全审查发现 15 个漏洞（XSS → 任意文件读写的完整攻击链），按以下 12 类修复措施全部落地（对应任务 1.1–1.17）：

| # | 修复项 | 实现 |
|---|--------|------|
| 1 | 引入 DOMPurify | `purify.min.js` 本地化，`renderMarkdown()` 统一消毒 |
| 2 | `showToast` XSS | innerHTML 模板改 DOM API + `textContent` |
| 3 | 导出 HTML 注入 | 导出前 `DOMPurify.sanitize`（禁 script/iframe/object/embed/form） |
| 4 | CSP 禁用 | `tauri.conf.json` 启用严格 CSP（`script-src 'self'`，禁内联脚本） |
| 5 | Rust 无路径验证 | `ApprovedPaths`（Mutex 状态）+ `is_path_allowed()` 白名单校验 |
| 6 | 错误信息泄露路径 | `sanitize_error()` 转为通用中文消息 |
| 7 | 目录遍历 DoS | `read_dir_recursive` 最大深度 10 层 |
| 8 | 全局 API 暴露 | `withGlobalTauri: false`，改用 `scripts/build-tauri-api.js` 打包的 `window.__TAURI_API__` |
| 9 | fs 插件权限过宽 | capabilities 移除直接 fs 权限，仅保留 dialog 权限（自定义命令自带校验） |
| 10 | querySelector 拼接注入 | `isValidTabId()`（`^tab-\d+$`）校验后查询 |
| 11 | 标题栏路径泄露 | `#file-path` 仅显示文件名（`split(/[\\/]/).pop()`） |
| 12 | 生产 DevTools | 窗口配置 `"devtools": false` |

### 4.9 主题切换优化（optimize-theme-switching）

- hljs 主题 CSS 从外部 `<link href>` 切换改为**内联到 style.css**（亮/暗两套），消除切换延迟
- 新增主题 CSS 变量（`--border-titlebar`、`--text-toast`、`--text-tab-close-hover` 等），修复硬编码颜色残留
- `transition: all` 改为仅过渡 `background-color/border-color/color/opacity`，提升响应速度
- 拖拽幽灵阴影改用 `var(--shadow-md)`

### 4.10 构建环境（rebuild-rust-target）

- 记录 Rust + Tauri 环境安装指引（rustup / VS Build Tools / Cargo 镜像加速），用于重建 `src-tauri/target/`

### 4.11 测试计划（test-plans/test-plan-filetree）

- FileTree 模块单元测试计划，落地为 `__tests__/fileTree.test.js`（14 个用例，全部通过）

---

## 5. 构建与运行

### 5.1 环境要求（Windows）

| 依赖 | 要求 | 说明 |
|------|------|------|
| Node.js | 18+ | 前端构建与测试 |
| Rust | stable（2021 edition） | `rustup` 安装，目标 `x86_64-pc-windows-msvc` |
| Visual Studio Build Tools | 含"C++ 桌面开发"工作负载 | MSVC 编译器（Tauri 必需） |
| WebView2 Runtime | Win10 1803+ / Win11 内置 | 系统 WebView |

> Rust 安装参考（详见 `.cospec/plan/changes/rebuild-rust-target/proposal.md`）：下载 [rustup-init.exe](https://win.rustup.rs/x86_64) 或 `winget install Rustlang.Rust.MSVC`；国内网络可配置 Cargo 镜像（USTC sparse 源）。

### 5.2 命令清单

| 命令 | 说明 |
|------|------|
| `npm install` | 安装前端依赖（node_modules） |
| `npm run dev`（= `npm start`） | 启动 Tauri 开发模式（自动 cargo build + 打开窗口） |
| `npm run build` | 构建发布版（NSIS 安装包，输出于 `src-tauri/target/release/bundle/`） |
| `npm test` | 运行 Jest 测试（内部为 `node --experimental-vm-modules node_modules/jest/bin/jest.js`，**必须携带该标志**） |
| `npm test -- --testNamePattern="FileTree.render"` | 按名称过滤测试 |
| `npm run build:tauri-api` | 用 esbuild 重新打包 `tauri-api.bundle.js`（依赖变更后需重跑） |
| `node scripts/build-hljs.js` | 重新生成 `hljs.bundle.js`（语言列表变更后需重跑） |
| `cd src-tauri && cargo build` | 仅编译 Rust 后端（重建 target） |
| `cd src-tauri && cargo check` | 快速检查 Rust 编译错误 |

### 5.3 注意事项

- **前端无构建工具**：修改 `renderer.js` / `style.css` / `index.html` 后刷新窗口即可生效；修改 `@tauri-apps/api` 用法后需重跑 `npm run build:tauri-api`
- 首次 `cargo build` 较慢（5~15 分钟），后续增量编译快
- 应用启动时加载 `# 欢迎使用 MD Tool` 示例文档

---

## 6. 架构设计

### 6.1 进程模型

```
┌─────────────────────────────────────────────────────────┐
│  Tauri 应用（Windows）                                    │
│                                                         │
│  ┌──────────────────────┐      invoke('command')        │
│  │ 渲染进程 (WebView2)   │ ────────────────────────────┐ │
│  │  src/renderer/*      │   window.__TAURI_API__.invoke│ │
│  │  纯 HTML/JS/CSS      │ ◀────────────────────────────┘ │
│  └──────────────────────┘       返回 JSON                │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Rust 后端 (src-tauri/src/lib.rs)                   │  │
│  │  #[tauri::command] open_file / save_file / ...    │  │
│  │  ApprovedPaths 白名单 + sanitize_error 脱敏        │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Tauri 插件：dialog（原生对话框）fs（文件系统）      │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

- 渲染进程**无法直接访问文件系统**，所有系统能力通过 `invoke()` 走 Rust 命令
- 前端通过 `scripts/build-tauri-api.js` 打包的 `window.__TAURI_API__`（`{ invoke, getCurrentWindow }`）访问 Tauri API；标准 `window.__TAURI__` 因 `withGlobalTauri: false` 不可用

### 6.2 前端模块划分（renderer.js）

按 `/* ====== 区块标题 ====== */` 分隔注释组织，主要模块：

| 模块 | 职责 | 关键函数/对象 |
|------|------|--------------|
| TabManager | 多标签页状态管理 | `createTab` / `activateTab` / `closeTab` / `_reorderTabDOMs` / `markTabModified` / `findTabByPath` |
| FileTree | 文件树渲染与交互 | `load` / `render` / `toggleFolder` / `openFile` |
| 渲染管线 | Markdown → 安全 HTML → 段落块 | `renderMarkdown`（DOMPurify）/ `splitParagraphs`（识别代码围栏）/ `renderAll` |
| WYSIWYG | 段落点击编辑/失焦渲染 | `onBlockClick` / `getCurrentMarkdown` |
| TOC | 自动目录 | `buildToc`（嵌套列表 + 锚点 id） |
| 状态栏 | 字数/行数/字符数 | `updateStatusBar` / `setStatusMode` |
| 文件操作 | 新建/打开/保存/另存为/导出 HTML | `newFile` / `saveFile` / `updateFilePath` |
| 视图模式 | 分屏 / TOC 面板 / 专注模式 | `toggleSplitMode`（200ms debounce）/ `toggleTocPanel` / `toggleFocusMode` |
| 工具栏 | 格式化插入 | `insertFormat`（包裹）/ `insertLine`（行首前缀） |
| 主题 | 亮/暗切换 | `initTheme` / `applyTheme`（localStorage `theme`） |
| 拖拽排序 | 标签页 mouse 拖拽 | 自执行 IIFE（5px 阈值、幽灵元素、插入指示线） |
| 全局事件 | 快捷键 / 菜单 / 窗口控制 | document keydown 等 |

### 6.3 兼容访问器

为兼容历史调用，`renderer.js` 通过 `Object.defineProperty` 暴露全局访问器：

```js
window.currentFilePath  // 读写 TabManager.activeTab.filePath
window.markdownContent  // 读写 TabManager.activeTab.markdownContent
```

### 6.4 Tauri 配置要点（tauri.conf.json）

- `withGlobalTauri: false`；窗口 `1200×800`、`decorations: false`（无边框）、`devtools: false`（生产禁用）
- CSP：`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'`
- `frontendDist: "../src/renderer"`（无构建工具直接托管静态目录）
- 打包目标 `nsis`，图标 `icons/icon.png`

---

## 7. Rust 命令清单（IPC 接口）

所有命令在 `src-tauri/src/lib.rs` 中定义，在 `run()` 的 `tauri::generate_handler![...]` 注册；渲染进程通过 `invoke('<command>', args)` 调用。

| 命令 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `open_file` | — | `OpenFileResult { canceled, filePath, content }` | 打开文件对话框（过滤 .md/.markdown），读取内容；成功后**记录批准路径**（父目录加入白名单） |
| `save_file` | `filePath, content` | `SaveResult { success, filePath, error }` | 写入指定路径；**需路径在白名单内**，否则返回错误 |
| `save_file_dialog` | `content` | `SaveResult` | 另存为对话框；成功后记录批准路径 |
| `export_html` | `content` | `SaveResult` | 保存对话框（.html）写出内容（**无路径白名单校验**，内容需前端已消毒） |
| `open_folder` | — | `Option<String>` | 打开文件夹对话框；成功后记录批准路径 |
| `get_folder_tree` | `path` | `Vec<FileTreeNode>` | 递归获取目录树（**最大深度 10 层**）；需路径在白名单内 |
| `read_file_text` | `path` | `String` | 读取任意文本文件；需路径在白名单内 |

**数据结构**（serde 序列化，字段 camelCase）：

```rust
struct OpenFileResult { canceled: bool, file_path: Option<String> /* filePath */, content: Option<String> }
struct SaveResult     { success: bool, file_path: Option<String> /* filePath */, error: Option<String> }
struct FileTreeNode   { name, path, is_directory /* isDirectory */, children: Option<Vec<FileTreeNode>> }
```

**新增命令的步骤**：

1. `lib.rs` 中定义 `#[tauri::command]` 函数
2. `run()` 的 `tauri::generate_handler![...]` 中注册
3. 若使用新插件（crate），同步修改 `Cargo.toml` 并在 Builder 中 `.plugin(...)` 初始化
4. 前端 `renderer.js` 中 `invoke('command', {...})` 调用

---

## 8. 安全设计

项目经历过完整的安全审查并修复 15 个漏洞（见 §4.8），当前安全模型为**多层防御**：

### 8.1 前端（渲染进程）

- **严格 CSP**：`script-src 'self'` 禁止内联脚本 / eval；`style-src 'unsafe-inline'` 允许动态样式
- **HTML 消毒**：`renderMarkdown()` 用 DOMPurify 消毒 marked 输出，`FORBID_TAGS: ['style','form','input','textarea','button']`、`FORBID_ATTR: ['onerror','onload','onclick','onmouseover']`；导出 HTML 前二次消毒（额外禁 script/iframe/object/embed/form）
- **Toast 用 textContent** 而非 innerHTML
- **tabId 格式校验**：`isValidTabId()`（`^tab-\d+$`）防止动态值拼入 CSS 选择器
- **最小 API 面**：`withGlobalTauri: false`，仅暴露 `invoke` + `getCurrentWindow`

### 8.2 后端（Rust）

- **路径白名单 `ApprovedPaths`**：只有通过系统对话框（打开文件/保存/打开文件夹）确认过的目录才能读写；`is_path_allowed()` 做 `canonicalize` 规范化 + `starts_with` 前缀匹配，防 `..` 目录穿越
- **错误脱敏 `sanitize_error()`**：I/O 错误映射为通用中文（"文件不存在"/"权限不足"/"文件已存在"/"操作失败"），不泄露系统路径
- **递归深度限制**：目录树最大 10 层，防 DoS
- **capabilities 最小权限**：仅 `core:default` + 窗口控制 + 对话框权限，无直接 fs 插件权限
- **生产禁用 DevTools**

### 8.3 已知低危项（已评估）

- localStorage 仅存主题偏好（无敏感数据）
- 本地脚本无 SRI —— CSP `script-src 'self'` 已等效提供完整性保护

---

## 9. 代码规范

> 详见根目录 `AGENTS.md`（AI 助手规范）与 `.roo/rules-*/AGENTS.md`（**遗留 Electron 规则，已过时，仅供参考**）。

### 9.1 JavaScript / 前端

- 命名：变量/函数 `camelCase`（`isSplitMode`）、对象字面量命名空间 `PascalCase`（`TabManager`）、"私有"方法 `_` 前缀（`_renderTabDOM`）、DOM id/CSS 类 `kebab-case`、事件回调 `on` 前缀（`onBlockClick`）
- 区块分隔注释：`/* ====== 区块标题 ====== */`
- 错误处理：`async/await + try/catch`，UI 提示走 `showToast(message, type, duration)`（type: success/error/info）
- 渲染进程禁止 `require()`；Tauri API 统一从 `window.__TAURI_API__` 取

### 9.2 Rust

- 命名：函数 `snake_case`、结构体 `PascalCase`、字段 `snake_case` + `#[serde(rename = "camelCase")]`
- 错误返回 `Result<T, String>`，内部错误经 `sanitize_error` 脱敏
- 文件读写先做白名单校验

### 9.3 marked + DOMPurify 配置

```js
marked.setOptions({
  highlight: function (code, lang) {
    if (lang && hljs.getLanguage(lang)) return hljs.highlight(code, { language: lang }).value
    return hljs.highlightAuto(code).value
  },
  breaks: true,
  gfm: true
})
```

> 禁止使用已废弃的 `sanitize: true` 选项。

### 9.4 TOC 锚点生成规则

`buildToc()` 中生成 heading `id` 的规则（**必须与 `href="#{id}"` 完全一致**）：

```js
heading.id = text
  .replace(/[^a-zA-Z0-9\u4e00-\u9fa5\s]/g, '')  // 仅保留字母、数字、中文、空格
  .trim()
  .replace(/\s+/g, '-')                          // 空格转连字符
  .toLowerCase()
```

中文标题保留中文字符，不做 URL 编码。

---

## 10. 测试

- 框架：Jest + `@jest-environment jsdom`
- 运行：`npm test`（必须带 `--experimental-vm-modules`，已在 package.json scripts 中配置）
- 现状：`__tests__/fileTree.test.js` 覆盖 FileTree 的 `render` / `toggleFolder` / `openFile` / `load`，共 **14 个用例全部通过**
- 说明：测试文件内**重新定义**了 FileTree 逻辑（renderer.js 依赖 Tauri 全局对象无法直接导入），并在 `beforeEach` 中模拟 `invoke` / `TabManager` / `showToast`
- 新增测试：放在 `__tests__/` 下或以 `.test.js` 命名，使用 `@jest-environment jsdom` 注释

---

## 11. 已知限制与后续规划

| 项 | 状态 | 说明 / 规划 |
|----|------|------------|
| PDF 导出 | ❌ 未实现 | 菜单项灰显（`disabled-item`）；Tauri 无 `printToPDF`，可经 `window.print()` 或 wkhtmltopdf 实现 |
| 云同步 / 插件系统 / 移动端 | ❌ 未规划 | 原 Electron 时代明确列为非目标 |
| lint / format 工具 | ❌ 无 | ESLint / Prettier / TypeScript 均未引入 |
| .roo 规则目录 | ⚠️ 过时 | 原 Electron 项目规则，内容与当前 Tauri 架构不符，仅作历史参考 |
| git 仓库 | ⚠️ 无提交 | 当前分支 main 尚无任何 commit，文件均未跟踪 |
| 文件树 | ℹ️ 说明 | 不过滤文件类型，二进制文件打开会报错（toast 提示） |
| 目录遍历 | ℹ️ 说明 | 最多 10 层，超深目录被截断 |

---

## 12. 常见问题 FAQ

**Q1：为什么渲染进程不能直接用 fs / require？**

渲染进程运行在 WebView2 沙箱中（等同浏览器），且 `withGlobalTauri: false`。所有系统能力必须通过 `invoke('<command>')` 调用 Rust 侧 `#[tauri::command]`。这是安全设计，防止恶意 Markdown 内容访问用户文件系统。

**Q2：如何新增一个功能？（决策树）**

```
需要新功能？
├─ 需要文件系统访问 / 原生对话框
│   → lib.rs 添加 #[tauri::command] → generate_handler! 注册
│   → renderer.js 中 invoke() 调用
├─ 需要 UI 交互（按钮、输入、显示）
│   → 直接在 src/renderer/renderer.js 实现，样式写 style.css
├─ 需要 Markdown 渲染相关
│   → renderer.js 中使用 marked + highlight.js（已全局引入）
└─ 需要新的 Tauri 插件
    → Cargo.toml 添加 crate → Builder .plugin() 初始化 → capabilities 配权限
```

**Q3：改了 renderer.js 为什么不生效？**

前端无构建工具，保存后刷新 WebView 窗口即可；若改动涉及 `@tauri-apps/api` 的用法，需重跑 `npm run build:tauri-api` 重新打包 `tauri-api.bundle.js`。

**Q4：首次运行很慢 / cargo 报错？**

首次 `cargo build` 需编译全部依赖（5~15 分钟属正常）；报 MSVC 错误请安装 Visual Studio Build Tools（勾选"C++ 桌面开发"）；下载慢可配置 Cargo 镜像（见 §5.1）。

**Q5：保存报"保存路径不在允许的目录范围内"？**

Rust 端路径白名单（`ApprovedPaths`）只允许通过对话框确认过的目录。请用"打开文件"/"打开文件夹"重新打开目标文件所在目录后即可保存。

**Q6：主题切换后代码高亮颜色残留？**

hljs 高亮样式已内联到 `style.css`（`:root` 亮色 / `[data-theme="dark"]` 暗色两套），理论上无残留。若发现硬编码颜色，应替换为 CSS 变量（参考 `optimize-theme-switching` 变更）。

**Q7：如何打开 DevTools 调试？**

生产配置 `"devtools": false` 已禁用；开发模式（`npm run dev`）下可通过 WebView2 的调试能力或临时修改配置开启（注意生产必须保持关闭）。
