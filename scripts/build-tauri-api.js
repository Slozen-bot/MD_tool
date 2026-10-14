/**
 * 将 @tauri-apps/api 的 core 和 window 模块打包为浏览器可用的 IIFE 格式
 * 运行: node scripts/build-tauri-api.js
 * 输出: src/renderer/tauri-api.bundle.js
 *
 * 在全局暴露 window.__TAURI_API__ 对象（仅包含 invoke 和 getCurrentWindow）
 */
const fs = require('fs')
const path = require('path')

// 检查 esbuild 是否可用
let esbuild
try {
  esbuild = require('esbuild')
} catch (e) {
  console.error('错误：需要安装 esbuild。请运行: npm install -D esbuild')
  process.exit(1)
}

const outputPath = path.join(__dirname, '../src/renderer/tauri-api.bundle.js')

// 创建临时入口文件
const entryContent = `
// 导出 Tauri API 子集
const { invoke } = require('@tauri-apps/api/core')
const { getCurrentWindow } = require('@tauri-apps/api/window')

window.__TAURI_API__ = { invoke, getCurrentWindow }
`

const entryPath = path.join(__dirname, '_tauri-api-entry.tmp.mjs')
fs.writeFileSync(entryPath, entryContent, 'utf8')

try {
  // 使用 esbuild 打包
  esbuild.buildSync({
    entryPoints: [entryPath],
    bundle: true,
    format: 'iife',
    target: ['chrome100'],
    outfile: outputPath,
    // 不压缩，保持可读性
    minify: false,
    // 排除 node 内置模块
    platform: 'browser',
    define: {
      'process.env.NODE_ENV': '"production"'
    }
  })

  const stats = fs.statSync(outputPath)
  console.log(`已生成: ${outputPath} (${Math.round(stats.size / 1024)}KB)`)
} finally {
  // 清理临时文件
  if (fs.existsSync(entryPath)) {
    fs.unlinkSync(entryPath)
  }
}
