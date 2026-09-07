/**
 * 文件说明：提供 @wttch-hub/plugin-api 必需的极小运行时值；所有 API 类型声明位于同目录 index.d.ts。
 */

/** 运行时只保留插件清单和入口所需常量与原样定义函数，不引入宿主或 Electron。 */
export const PLUGIN_API_VERSION = 1;
export const PLUGIN_COMPONENT_API_KEY = 'wttch-hub:plugin-api';
export const definePluginPackage = (definition) => definition;
export const defineToolPlugin = (plugin) => plugin;
