/** Validate and copy each independently packaged plugin ZIP into the dev sandbox. */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { strFromU8, unzipSync } from 'fflate';
import type { PluginBundleDefinition } from '../src/types/plugin';

const root = process.cwd();
const packageRoot = path.join(root, 'plugins');
const sandboxRoot = path.join(root, 'sandbox', 'plugins');

const isSafePath = (entry: string) => {
  const normalized = path.posix.normalize(entry.replaceAll('\\', '/'));
  return normalized !== '.' && normalized !== '..' && !normalized.startsWith('../') && !path.posix.isAbsolute(normalized);
};

const readPackage = (fileName: string): PluginBundleDefinition => {
  const archive = unzipSync(new Uint8Array(readFileSync(path.join(packageRoot, fileName))));
  const packageFile = archive['package.json'];
  if (!packageFile) throw new Error(`${fileName}: missing package.json.`);
  if (Object.keys(archive).some((entry) => !isSafePath(entry))) throw new Error(`${fileName}: unsafe archive path.`);
  const bundle = JSON.parse(strFromU8(packageFile)) as PluginBundleDefinition;
  if (bundle.apiVersion !== 1 || !/^wttch-hub-plugin-[a-z0-9][a-z0-9-]*$/.test(bundle.id)
    || !bundle.version || !Array.isArray(bundle.plugins) || bundle.plugins.length !== 1) {
    throw new Error(`${fileName}: not a compatible single-plugin package.`);
  }
  const plugin = bundle.plugins[0];
  if (plugin.apiVersion !== 1 || !/^[a-z0-9][a-z0-9-]*$/.test(plugin.id) || bundle.id !== `wttch-hub-plugin-${plugin.id}`) {
    throw new Error(`${fileName}: invalid plugin definition.`);
  }
  return bundle;
};

if (!existsSync(packageRoot)) throw new Error('plugins directory does not exist.');
const archives = readdirSync(packageRoot).filter((file) => file.endsWith('.zip'))
  .filter((file) => statSync(path.join(packageRoot, file)).isFile()).sort();
if (!archives.length) throw new Error('no plugin ZIP archives found in plugins/.');

mkdirSync(sandboxRoot, { recursive: true });
const oldArchives = readdirSync(sandboxRoot).filter((file) => file.endsWith('.zip'))
  .filter((file) => statSync(path.join(sandboxRoot, file)).isFile());
console.log(`[plugins:install] clearing ${oldArchives.length} ZIP archive(s) from sandbox/plugins/`);
for (const file of oldArchives) {
  rmSync(path.join(sandboxRoot, file));
  console.log(`[plugins:install] - removed sandbox/plugins/${file}`);
}

console.log(`[plugins:install] validating and copying ${archives.length} plugin package(s)`);
for (const file of archives) {
  const bundle = readPackage(file);
  copyFileSync(path.join(packageRoot, file), path.join(sandboxRoot, file));
  console.log(`[plugins:install] ✓ ${bundle.plugins[0].id} v${bundle.version} -> sandbox/plugins/${file}`);
}
