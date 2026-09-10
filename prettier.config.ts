import type { Config } from 'prettier';

const config: Config = {
  printWidth: 100, // 每行最大字符数
  tabWidth: 2, // 缩进空格数
  useTabs: false, // 使用空格缩进
  semi: true, // 语句末尾加分号
  singleQuote: true, // 使用单引号
  trailingComma: 'all', // 多行时末尾加逗号（ES5+）
  bracketSpacing: true, // 对象括号内加空格：{ foo: bar }
  arrowParens: 'avoid', // 箭头函数单参数省略括号
  endOfLine: 'auto', // 自动处理换行符（跨平台）
  proseWrap: 'preserve', // 保持 Markdown 文本换行
  htmlWhitespaceSensitivity: 'css', // HTML 空格处理
  vueIndentScriptAndStyle: false, // Vue 文件中是否缩进 <script>/<style>
};

export default config;
