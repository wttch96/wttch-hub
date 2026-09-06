/**
 * 文件说明：校验本地插件开发目录的最小结构，防止构建阶段才发现入口或包声明缺失。
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const developmentRoot = path.join(root, 'plugin-src');
const registryFile = path.join(root, 'plugin-registry', 'plugins.json');

/** 校验声明中的 ID 与源码路径，确保未来拆出的声明仓库仍可被宿主稳定消费。 */
const checkRegistry = () => {
  const registry = JSON.parse(readFileSync(registryFile, 'utf8')) as {
    schemaVersion?: number;
    plugins?: Array<{ id?: string; apiVersion?: number; source?: string }>;
  };
  if (registry.schemaVersion !== 1 || !Array.isArray(registry.plugins)) throw new Error('插件声明文件格式无效。');
  const ids = new Set<string>();
  for (const plugin of registry.plugins) {
    if (!plugin.id || !/^[a-z0-9][a-z0-9-]*$/.test(plugin.id) || plugin.apiVersion !== 1 || !plugin.source) {
      throw new Error('插件声明包含无效的 ID、API 版本或源码路径。');
    }
    if (ids.has(plugin.id)) throw new Error(`${plugin.id}: 插件声明 ID 重复。`);
    ids.add(plugin.id);
    if (!existsSync(path.resolve(path.dirname(registryFile), plugin.source))) throw new Error(`${plugin.id}: 声明的源码路径不存在。`);
  }
};

checkRegistry();

if (!existsSync(developmentRoot)) {
  console.log('未创建插件源码目录，跳过检查。');
  process.exit(0);
}

const pluginDirectories = readdirSync(developmentRoot)
  .filter((name) => name !== 'examples' && name !== '.generated')
  .filter((name) => statSync(path.join(developmentRoot, name)).isDirectory());

for (const id of pluginDirectories) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new Error(`${id}: 目录名必须是小写字母、数字和连字符。`);
  for (const file of ['index.ts', 'package.ts', 'package.json']) {
    if (!existsSync(path.join(developmentRoot, id, file))) throw new Error(`${id}: 缺少 ${file}。`);
  }
}

console.log(`本地开发插件目录检查通过（${pluginDirectories.length} 个插件）。`);
