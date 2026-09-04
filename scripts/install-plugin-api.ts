/**
 * 安装插件 API。
 *
 * 将宿主公开的插件 API 制作成 npm package `@wttch-hub/plugin-api`，并安装
 * 到 node_modules。每次执行都会先卸载旧包，再从系统临时目录打包并安装新包；
 * 仓库和插件源码目录都不会留下这个生成包。
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = process.cwd();
// 类型源文件是唯一真源。node_modules 中的 package 只是每次命令生成的
// 安装结果，因此不会在仓库中维护另一份容易过期的类型文件。
const source = path.join(root, 'src', 'types', 'plugin.ts');
if (!existsSync(source)) throw new Error('找不到宿主插件类型：src/types/plugin.ts');

// 临时目录只承担 npm 的打包输入，不属于项目源码，也不会被提交。
const packageDir = mkdtempSync(path.join(tmpdir(), 'wttch-hub-plugin-api-'));
try {
	// 这里生成一个最小 npm package：index.d.ts 提供编辑器类型，index.js
	// 提供 package.ts 和插件入口需要的轻量定义函数。
	writeFileSync(path.join(packageDir, 'package.json'), JSON.stringify({
		name: '@wttch-hub/plugin-api',
		version: '1.0.0',
		main: 'index.js',
		types: 'index.d.ts',
	}, null, 2) + '\n');
	writeFileSync(path.join(packageDir, 'index.js'), [
		'const definePluginPackage = (definition) => definition;',
		'const defineToolPlugin = (plugin) => plugin;',
		'const PLUGIN_API_VERSION = 1;',
		"const PLUGIN_COMPONENT_API_KEY = 'wttch-hub:plugin-api';",
		'module.exports = { PLUGIN_API_VERSION, PLUGIN_COMPONENT_API_KEY, definePluginPackage, defineToolPlugin };',
		'',
	].join('\n'));
	writeFileSync(path.join(packageDir, 'index.d.ts'), `${readFileSync(source, 'utf8')}\n`);

	// 先生成 tarball。直接 npm install 临时目录可能创建 symlink；临时目录
	// 清理后 symlink 会失效，所以必须安装 tarball，让 node_modules 保存实体包。
	const packedName = execFileSync('npm', ['pack', packageDir, '--pack-destination', packageDir], {
		cwd: root,
		encoding: 'utf8',
	}).trim().split(/\r?\n/).at(-1);
	if (!packedName) throw new Error('插件 API package 打包失败');
	const packedPath = path.join(packageDir, packedName);

	// 明确先卸载再安装，避免 npm 对旧的本地 package 使用缓存内容。
	// --no-save 表示该开发包不写入宿主 package.json；需要更新时再次运行
	// 本脚本即可，插件开发者不需要手动维护一个 file: 依赖。
	execFileSync('npm', ['uninstall', '--no-save', '--ignore-scripts', '--no-audit', '--no-fund', '@wttch-hub/plugin-api'], { cwd: root, stdio: 'inherit' });
	execFileSync('npm', ['install', '--no-save', '--ignore-scripts', '--no-audit', '--no-fund', packedPath], { cwd: root, stdio: 'inherit' });
	console.log('已更新并安装插件 API package：node_modules/@wttch-hub/plugin-api');
} finally {
	rmSync(packageDir, { recursive: true, force: true });
}
