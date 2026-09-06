/**
 * 文件说明：读取并校验插件集合 ZIP，将已编译插件包安装到项目沙盒目录，供开发态工作台扫描。
 */

/**
 * 安装或更新 wttch-hub 插件集合包。
 *
 * 扫描 plugins/wttch-hub@plugins-<version>.zip，校验根 package.json 后，
 * 将校验通过的 ZIP 放进 sandbox/plugins。源码始终保留在 plugin-src；
 * 沙盒只保存可再生的安装包，开发态 Electron 会将其作为插件仓库扫描。
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { strFromU8, unzipSync } from 'fflate';
import type { PluginBundleDefinition } from '../src/types/plugin';

const root = process.cwd();
const packageRoot = path.join(root, 'plugins');
const sandboxRoot = path.join(root, 'sandbox', 'plugins');

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
  if (Object.keys(archive).some((entry) => !isSafePath(entry))) throw new Error(`${fileName}: ZIP 包含不安全路径`);
  mkdirSync(sandboxRoot, { recursive: true });
  copyFileSync(path.join(packageRoot, fileName), path.join(sandboxRoot, fileName));
  console.log(`已安装插件集合到沙盒：${bundle.name} (${bundle.plugins.length} 个插件，v${bundle.version})`);
};

if (!existsSync(packageRoot)) throw new Error('找不到插件包目录：plugins');
const bundles = readdirSync(packageRoot)
  .filter((file) => file.startsWith('wttch-hub@plugins-') && file.endsWith('.zip'))
  .filter((file) => statSync(path.join(packageRoot, file)).isFile())
  .sort();
if (!bundles.length) console.log('plugins 目录中没有找到 wttch-hub@plugins-*.zip 插件集合包');
else installBundle(bundles.at(-1)!);
