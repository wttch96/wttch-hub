/**
 * 安装或更新 wttch-hub 插件集合包。
 *
 * 扫描 plugins/wttch-hub@plugins-<version>.zip，校验根 package.json 后，
 * 将其中的 <plugin-id>/... 整体恢复到 src/plugins/<plugin-id>/。这是源码
 * 安装命令，完成后 Vite 可以直接发现这些插件并继续开发。
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { strFromU8, unzipSync } from 'fflate';
import type { PluginBundleDefinition } from '../src/types/plugin';

const root = process.cwd();
const packageRoot = path.join(root, 'plugins');
const sourceRoot = path.join(root, 'src', 'plugins');

/** 只允许 ZIP 内相对路径，防止解压路径逃逸到项目目录之外。 */
const isSafePath = (entry: string) => {
  const normalized = path.posix.normalize(entry.replaceAll('\\', '/'));
  return normalized !== '.' && normalized !== '..' && !normalized.startsWith('../') && !path.posix.isAbsolute(normalized);
};

/** 校验集合包定义，确保宿主只安装当前支持的包协议。 */
const readBundle = (bytes: Uint8Array, fileName: string): PluginBundleDefinition => {
  let bundle: PluginBundleDefinition;
  try {
    bundle = JSON.parse(strFromU8(bytes)) as PluginBundleDefinition;
  } catch (error) {
    throw new Error(`${fileName}: package.json 不是合法 JSON：${String(error)}`);
  }
  if (bundle.apiVersion !== 1 || bundle.id !== 'wttch-hub-plugins' || !bundle.version || !Array.isArray(bundle.plugins)) {
    throw new Error(`${fileName}: 不是兼容的 wttch-hub 插件集合包`);
  }
  if (!bundle.plugins.every((plugin) => plugin.apiVersion === 1 && /^[a-z0-9][a-z0-9-]*$/.test(plugin.id))) {
    throw new Error(`${fileName}: 包含无效插件定义`);
  }
  return bundle;
};

const installBundle = (fileName: string) => {
  const archive = unzipSync(new Uint8Array(readFileSync(path.join(packageRoot, fileName))));
  const packageFile = archive['package.json'];
  if (!packageFile) throw new Error(`${fileName}: ZIP 根目录缺少 package.json`);
  const bundle = readBundle(packageFile, fileName);
  const entries = Object.keys(archive);
  if (entries.some((entry) => !isSafePath(entry))) throw new Error(`${fileName}: ZIP 包含不安全路径`);

  // 先通过所有包级校验，再替换插件源码，避免坏包覆盖当前开发环境。
  const pluginIds = new Set(bundle.plugins.map((plugin) => plugin.id));
  for (const pluginId of pluginIds) rmSync(path.join(sourceRoot, pluginId), { recursive: true, force: true });
  for (const entry of entries) {
    if (entry === 'package.json') continue;
    const parts = entry.split('/');
    // 集合包根部允许放共享开发文件，例如 plugin-api.d.ts；其他根部
    // 文件不属于插件源码，忽略它们以保持安装目录结构稳定。
    if (parts.length === 1) {
      if (!entry.endsWith('.d.ts')) continue;
    } else if (!pluginIds.has(parts[0])) {
      continue;
    }
    const destination = path.join(sourceRoot, entry);
    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(destination, archive[entry]);
  }
  console.log(`已安装插件集合：${bundle.name} (${bundle.plugins.length} 个插件，v${bundle.version})`);
};

if (!existsSync(packageRoot)) throw new Error('找不到插件包目录：plugins');
if (!existsSync(sourceRoot)) mkdirSync(sourceRoot, { recursive: true });
const bundles = readdirSync(packageRoot)
  .filter((file) => file.startsWith('wttch-hub@plugins-') && file.endsWith('.zip'))
  .filter((file) => statSync(path.join(packageRoot, file)).isFile())
  .sort();
if (!bundles.length) console.log('plugins 目录中没有找到 wttch-hub@plugins-*.zip 插件集合包');
else installBundle(bundles.at(-1)!);
