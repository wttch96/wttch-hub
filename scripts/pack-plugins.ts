/** Build one distributable ZIP for every plugin source directory. */
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { strToU8, zipSync } from 'fflate';
import type { PluginBundleDefinition, PluginPackageDefinition } from '../src/types/plugin';

const root = process.cwd();
const sourceRoot = path.join(root, 'plugin-src');
const outputRoot = path.join(root, 'plugins');
const pluginIds = readdirSync(sourceRoot).sort()
  .filter((name) => name !== 'examples' && name !== '.generated')
  .filter((name) => statSync(path.join(sourceRoot, name)).isDirectory());

const collectFiles = (directory: string, prefix: string, output: Record<string, Uint8Array>) => {
  for (const name of readdirSync(directory).sort()) {
    const absolute = path.join(directory, name);
    const entry = path.posix.join(prefix, name);
    if (statSync(absolute).isDirectory()) collectFiles(absolute, entry, output);
    else output[entry] = new Uint8Array(readFileSync(absolute));
  }
};

const main = async () => {
  if (!pluginIds.length) throw new Error('plugin-src contains no packable plugins.');
  mkdirSync(outputRoot, { recursive: true });
  const oldArchives = readdirSync(outputRoot).filter((file) => file.endsWith('.zip'));
  console.log(`[plugins:pack] clearing ${oldArchives.length} ZIP archive(s) from plugins/`);
  for (const file of oldArchives) {
    rmSync(path.join(outputRoot, file));
    console.log(`[plugins:pack] - removed plugins/${file}`);
  }

  for (const id of pluginIds) {
    const plugin = (await import(pathToFileURL(path.join(sourceRoot, id, 'package.ts')).href)).default as PluginPackageDefinition;
    if (plugin.id !== id || plugin.apiVersion !== 1) throw new Error(`${id}: invalid package.ts definition.`);
    const archive: Record<string, Uint8Array> = {};
    collectFiles(path.join(sourceRoot, id), id, archive);
    const bundle: PluginBundleDefinition = {
      apiVersion: 1,
      id: `wttch-hub-plugin-${id}`,
      version: plugin.version,
      name: plugin.name,
      plugins: [plugin],
    };
    archive['package.json'] = strToU8(`${JSON.stringify(bundle, null, 2)}\n`);
    archive['plugin-api.d.ts'] = new Uint8Array(readFileSync(path.join(root, 'packages', 'plugin-api', 'src', 'index.d.ts')));
    const output = path.join(outputRoot, `${id}-${plugin.version}.zip`);
    const bytes = zipSync(archive, { level: 9, mtime: new Date('1980-01-01T00:00:00.000Z') });
    writeFileSync(output, bytes);
    console.log(`[plugins:pack] ✓ ${id} v${plugin.version} -> plugins/${path.basename(output)} (${bytes.byteLength} bytes)`);
  }
  console.log(`[plugins:pack] complete: ${pluginIds.length} independent ZIP plugin package(s)`);
};

void main();
