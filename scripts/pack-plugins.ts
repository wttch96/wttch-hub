/**
 * 将可编译的插件源码打成宿主可识别的集合 ZIP。
 *
 * ZIP 内保留 <plugin-id>/... 源码目录，并在根部写入纯 JSON 清单；因此
 * 它既能被桌面插件仓库安全识别，也能由 install-plugins.ts 恢复到
 * src/plugins 后参与 Vite 编译。
 */
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { strToU8, zipSync } from 'fflate';
import type { PluginBundleDefinition, PluginPackageDefinition } from '../src/types/plugin';

const root = process.cwd();
const sourceRoot = path.join(root, 'src', 'plugins');
const outputRoot = path.join(root, 'plugins');
const pluginIds = ['system-monitor', 'theme'];

const collectFiles = (directory: string, prefix: string, output: Record<string, Uint8Array>) => {
  for (const name of readdirSync(directory).sort()) {
    const absolute = path.join(directory, name);
    const entry = path.posix.join(prefix, name);
    if (statSync(absolute).isDirectory()) collectFiles(absolute, entry, output);
    else output[entry] = new Uint8Array(readFileSync(absolute));
  }
};

const main = async () => {
  const plugins: PluginPackageDefinition[] = [];
  const archive: Record<string, Uint8Array> = {};
  for (const id of pluginIds) {
    const packageModule = await import(path.join(sourceRoot, id, 'package.ts')) as { default: PluginPackageDefinition };
    if (packageModule.default.id !== id) throw new Error(`${id}/package.ts 的插件 ID 不匹配`);
    plugins.push(packageModule.default);
    collectFiles(path.join(sourceRoot, id), id, archive);
  }

  const version = plugins.length === 1 ? plugins[0].version : '1.0.0';
  const bundle: PluginBundleDefinition = {
    apiVersion: 1,
    id: 'wttch-hub-plugins',
    version,
    name: plugins.length === 1 ? `${plugins[0].name}插件包` : 'wttch-hub 插件集合',
    plugins,
  };
  archive['package.json'] = strToU8(`${JSON.stringify(bundle, null, 2)}\n`);
  archive['plugin-api.d.ts'] = new Uint8Array(readFileSync(path.join(root, 'src', 'types', 'plugin.ts')));

  mkdirSync(outputRoot, { recursive: true });
  const output = path.join(outputRoot, `wttch-hub@plugins-${version}.zip`);
  // 固定 ZIP 时间戳，保证相同源码生成逐字节一致的分发包。
  writeFileSync(output, zipSync(archive, { level: 9, mtime: new Date('1980-01-01T00:00:00.000Z') }));
  console.log(`已生成 ${path.relative(root, output)}（${plugins.map((plugin) => plugin.id).join(', ')}）`);
};

void main();
