/**
 * 文件说明：构建本地插件目录的清单快照并校验每个插件 npm 入口，供工作台启动和打包前自动执行。
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import type { PluginPackageDefinition } from '../src/types/plugin';

// 允许从根目录或任意插件自己的 package.json 调用，不依赖 npm 的当前目录。
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.join(root, 'plugin-src');
const outputRoot = path.join(sourceRoot, '.generated');

/** 插件构建阶段只读取可审查的 package.ts，不执行页面组件或 Electron 代码。 */
const build = async () => {
  if (!existsSync(sourceRoot)) throw new Error('找不到插件源码目录：plugin-src');
  const plugins: PluginPackageDefinition[] = [];
  const ids = readdirSync(sourceRoot).sort()
    .filter((name) => name !== 'examples' && name !== '.generated')
    .filter((name) => statSync(path.join(sourceRoot, name)).isDirectory());
  console.log(`[plugins:build] discovered ${ids.length} plugin source directories: ${ids.join(', ') || '(none)'}`);
  for (const id of ids) {
    const directory = path.join(sourceRoot, id);
    const manifestPath = path.join(directory, 'package.ts');
    const entryPath = path.join(directory, 'index.ts');
    const npmPackagePath = path.join(directory, 'package.json');
    if (!existsSync(manifestPath) || !existsSync(entryPath) || !existsSync(npmPackagePath)) {
      throw new Error(`${id}: 必须同时提供 package.ts、index.ts 和 package.json。`);
    }
    const npmPackage = JSON.parse(readFileSync(npmPackagePath, 'utf8')) as { scripts?: Record<string, string> };
    if (!npmPackage.scripts?.build || !npmPackage.scripts.test) throw new Error(`${id}: package.json 必须提供 build 和 test 脚本。`);
    const definition = (await import(pathToFileURL(manifestPath).href)).default as PluginPackageDefinition;
    if (definition.id !== id || definition.apiVersion !== 1 || definition.entry !== 'index.ts') {
      throw new Error(`${id}: package.ts 的 id、apiVersion 或 entry 不符合宿主协议。`);
    }
    plugins.push(definition);
    console.log(`[plugins:build] ✓ ${id} v${definition.version} (${definition.name})`);
  }
  mkdirSync(outputRoot, { recursive: true });
  const manifest = path.join(outputRoot, 'plugins.json');
  writeFileSync(manifest, `${JSON.stringify({ apiVersion: 1, plugins }, null, 2)}\n`);
  console.log(`[plugins:build] wrote manifest: ${path.relative(root, manifest)} (${plugins.length} plugins)`);
  console.log(`已构建 ${plugins.length} 个插件清单；Vue/TypeScript 页面将由工作台 Vite 构建一并编译。`);
};

void build();
