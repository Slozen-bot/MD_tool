/**
 * 将 highlight.js (CommonJS) 包装为浏览器可用的 IIFE 格式
 * 运行: node scripts/build-hljs.js
 * 输出: src/renderer/hljs.bundle.js
 */
const fs = require('fs')
const path = require('path')

// 读取 highlight.js 核心源码
const coreSource = fs.readFileSync(
  path.join(__dirname, '../node_modules/highlight.js/lib/core.js'),
  'utf8'
)

// 要打包的语言列表（常用的）
const languages = [
  'javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'csharp',
  'go', 'rust', 'swift', 'kotlin', 'ruby', 'php', 'bash',
  'sql', 'xml', 'css', 'json', 'yaml', 'markdown', 'diff'
]

// 生成 IIFE 包装
let output = `;(function (root) {\n`
output += `// ===== highlight.js core =====\n`

// 模拟 CommonJS 环境，将 module.exports 导出为 hljs
output += `var _hljsModule = {};\n`
output += `(function(module, exports) {\n`
output += coreSource
output += `\n})(_hljsModule, _hljsModule.exports || (_hljsModule.exports = {}));\n`
output += `var hljs = _hljsModule.exports || _hljsModule;\n\n`

// 加载每个语言
for (const lang of languages) {
  const langFile = path.join(
    __dirname,
    `../node_modules/highlight.js/lib/languages/${lang}.js`
  )
  if (!fs.existsSync(langFile)) {
    console.warn(`跳过不存在的语言: ${lang}`)
    continue
  }
  const langSource = fs.readFileSync(langFile, 'utf8')
  output += `// ===== language: ${lang} =====\n`
  output += `;(function() {\n`
  output += `var _langModule = {};\n`
  output += `(function(module, exports) {\n`
  output += langSource
  output += `\n})(_langModule, _langModule.exports || (_langModule.exports = {}));\n`
  output += `var langFn = _langModule.exports || _langModule;\n`
  output += `if (typeof langFn === 'function') hljs.registerLanguage('${lang}', langFn);\n`
  output += `})();\n\n`
}

output += `// 暴露到全局\n`
output += `root.hljs = hljs;\n`
output += `})(typeof window !== 'undefined' ? window : this);\n`

const outputPath = path.join(__dirname, '../src/renderer/hljs.bundle.js')
fs.writeFileSync(outputPath, output, 'utf8')
console.log(`已生成: ${outputPath} (${Math.round(output.length / 1024)}KB)`)
