# MD Tool — Markdown 编辑器

基于 **Tauri 2 + Rust + 原生 JavaScript** 的现代化 Markdown 桌面编辑器（Windows）。

轻量、离线、安全的 Markdown 写作工具，支持所见即所得（WYSIWYG）段落编辑、多标签页、文件树工作区、自动目录、代码高亮、亮/暗双主题等特性。

## 📚 文档导航

| 文档 | 说明 |
|------|------|
| [docs/README.md](docs/README.md) | **项目综合说明文档**：技术栈、目录结构、项目演进历史、架构设计、构建/测试、安全模型、代码规范（整合了 `.cospec/` 与 `.roo/` 中所有历史说明） |
| [docs/FEATURES.md](docs/FEATURES.md) | **详细功能说明文档**：逐项介绍全部功能、操作方式、实现位置与快捷键 |
| [AGENTS.md](AGENTS.md) | AI 助手项目规范（面向开发协作的非显性约束记录） |

## 快速开始

```bash
# 前置要求：Node.js 18+、Rust stable、Visual Studio Build Tools（含 C++ 桌面开发）、WebView2 Runtime（Win10 1803+ 内置）

npm install      # 安装前端依赖
npm run dev      # 启动 Tauri 开发模式（等价 npm start）
npm test         # 运行 Jest 测试
npm run build    # 打包发布版本（NSIS 安装包）
```

## 核心特性一览

- ✍️ **WYSIWYG 段落编辑**：点击段落直接编辑，失焦自动渲染
- 📑 **多标签页**：多文件同时编辑，支持拖拽排序、未保存标记
- 📁 **文件树工作区**：打开文件夹，侧边栏浏览/打开任意文本文件
- ☰ **自动目录（TOC）**：按标题层级生成嵌套目录，点击跳转
- 🌐 **代码高亮**：内置 21 种语言语法高亮
- 🌗 **亮/暗双主题**：CSS 变量设计系统，一键切换并持久化
- 🖥️ **自定义标题栏**：无边框窗口，拖拽移动 + 窗口控制按钮
- 🛡️ **安全加固**：严格 CSP、DOMPurify 消毒、Rust 路径白名单、错误脱敏

> 状态：v1.0.0 可用版本。PDF 导出尚未实现（菜单项已灰显）。
