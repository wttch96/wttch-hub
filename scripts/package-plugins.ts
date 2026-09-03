/**
 * 插件包构建脚本，职责类似 VS Code 扩展的 VSIX 打包阶段。
 *
 * 每个插件源码目录 `src/plugins/<plugin-id>` 都必须提供 package.ts。
 * package.ts 是插件包定义的唯一 TypeScript 来源，由 definePluginPackage
 * 提供类型检查。脚本在构建阶段加载它，再把定义快照写成 ZIP 根目录的
 * package.json。运行时主进程只读取 package.json，不会执行 ZIP 中的 TS。
 *
 * 这样做有三个目的：
 * 1. 插件作者使用 TypeScript，能在开发期得到 API 和字段类型提示。
 * 2. 分发包使用普通 JSON，Electron 主进程可以安全、快速地解析。
 * 3. 将来增加签名、哈希、平台条件或编译后的 entry.js 时，不必改变包入口。
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { strToU8, zipSync } from 'fflate';
import type { PluginPackageDefinition } from '../src/types/plugin';

/** package.ts 导出的 JSON-safe 定义；函数和 Vue Component 不允许放入其中。 */
type PluginPackage = PluginPackageDefinition;

/**
 * package-plugins 的中间定义。
 * 把路径、包定义和归档文件集中在一起，方便未来增加签名文件、哈希值
 * 或者按平台过滤文件，而不用把处理逻辑继续堆在主循环里。
 */
type PackagePluginDefinition = {
  id: string;
  sourceDir: string;
  packagePath: string;
  package: PluginPackage;
  outputPath: string;
  files: Record<string, Uint8Array>;
};

const API_VERSION = 1;
const root = process.cwd();
// 源码和产物分开：src/plugins 只放可编辑源码，plugins 只放 ZIP 产物。
const sourceRoot = path.join(root, 'src', 'plugins');
const outputRoot = path.join(root, 'plugins');

/** ZIP 内统一使用相对路径和正斜杠，避免泄露开发机路径或跨平台失效。 */
const toArchivePath = (prefix: string, name: string) =>
  path.join(prefix, name).replaceAll(path.sep, '/');

/**
 * 动态加载 TypeScript 包定义。
 * 使用 file URL 是为了兼容 macOS、Windows 和 ESM 动态 import；package.ts
 * 只应包含 JSON 数据和类型导入，不应在打包阶段启动窗口或执行副作用。
 */
const loadPackage = async (pluginId: string, packagePath: string): Promise<PluginPackage> => {
  if (!existsSync(packagePath)) throw new Error(`[${pluginId}] 缺少 package.ts`);

  try {
    const module = await import(pathToFileURL(packagePath).href) as { default?: PluginPackage };
    if (!module.default) throw new Error('必须默认导出 definePluginPackage(...) 的结果');
    return module.default;
  } catch (error) {
    throw new Error(`[${pluginId}] package.ts 加载失败：${String(error)}`);
  }
};

/**
 * 校验包定义。
 * 校验发生在压缩之前，错误会立即终止构建，而不是生成一个稍后才被
 * 宿主忽略的坏包。entry 的路径检查也为未来的运行时入口加载器保留边界。
 */
const validatePackage = (pluginId: string, definition: PluginPackage) => {
  if (definition.apiVersion !== API_VERSION) {
    throw new Error(`[${pluginId}] 不支持的 apiVersion：${definition.apiVersion}`);
  }
  if (definition.id !== pluginId) throw new Error(`[${pluginId}] package.id 必须与目录名一致`);
  if (!definition.version || !definition.name || !definition.entry) {
    throw new Error(`[${pluginId}] package 必须包含 version、name 和 entry`);
  }
  if (path.isAbsolute(definition.entry) || definition.entry.includes('..')) {
    throw new Error(`[${pluginId}] package.entry 必须是安全的相对路径`);
  }
};

/**
 * 递归收集插件文件，并按名称排序。
 * 排序让输入稳定，便于将来计算插件包哈希；node_modules 和旧 ZIP 属于
 * 开发缓存或递归输入，不应该进入最终包。package.json 快照稍后会覆盖
 * 源码目录中的同名文件（如果存在），确保包定义只有一个可信来源。
 */
const collectFiles = (directory: string, files: Record<string, Uint8Array>, prefix = '') => {
  for (const name of readdirSync(directory).sort()) {
    if (name === 'node_modules' || name.endsWith('.zip')) continue;
    const fullPath = path.join(directory, name);
    const relativePath = toArchivePath(prefix, name);
    if (statSync(fullPath).isDirectory()) collectFiles(fullPath, files, relativePath);
    else files[relativePath] = new Uint8Array(readFileSync(fullPath));
  }
};

/** 建立一个完整的 package-plugins 定义，隔离发现、校验和写入三个阶段。 */
const definePackagePlugin = async (pluginId: string): Promise<PackagePluginDefinition> => {
  const sourceDir = path.join(sourceRoot, pluginId);
  const packagePath = path.join(sourceDir, 'package.ts');
  const definition = await loadPackage(pluginId, packagePath);
  validatePackage(pluginId, definition);

  const files: Record<string, Uint8Array> = {};
  collectFiles(sourceDir, files);
  // ZIP 给宿主读取的是数据快照，而不是需要运行的 TypeScript 文件。
  files['package.json'] = strToU8(`${JSON.stringify(definition, null, 2)}\n`);

  return {
    id: pluginId,
    sourceDir,
    packagePath,
    package: definition,
    outputPath: path.join(outputRoot, `${definition.id}-${definition.version}.zip`),
    files,
  };
};

if (!existsSync(sourceRoot)) throw new Error('找不到插件源码目录：src/plugins');
if (!existsSync(outputRoot)) throw new Error('找不到插件输出目录：plugins');

// 一级目录即一个插件；排序让多插件构建结果稳定、日志容易比较。
const pluginIds = readdirSync(sourceRoot)
  .filter((id) => statSync(path.join(sourceRoot, id)).isDirectory())
  .sort();

const main = async () => {
  for (const pluginId of pluginIds) {
    const definition = await definePackagePlugin(pluginId);
    writeFileSync(definition.outputPath, zipSync(definition.files, { level: 6 }));
    console.log(
      `已打包插件：${path.relative(root, definition.outputPath)} ` +
        `（${Object.keys(definition.files).length} 个文件，API v${definition.package.apiVersion}）`,
    );
  }
};

main().catch((error: unknown) => {
  // 统一在脚本边界输出错误并返回失败码，让 npm package 能正确中止。
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
