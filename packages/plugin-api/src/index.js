/**
 * 文件说明：提供 @wttch-hub/plugin-api 必需的极小运行时值；所有 API 类型声明位于同目录 index.d.ts。
 */

/** 运行时只保留插件清单和入口所需常量与原样定义函数，不引入宿主或 Electron。 */
/** 宿主与插件的兼容性标识；不兼容变更必须提升版本。 */
export const PLUGIN_API_VERSION = 1;
/** Vue provide/inject 使用的稳定键，插件不得自行构造其他宿主上下文。 */
export const PLUGIN_COMPONENT_API_KEY = 'wttch-hub:plugin-api';
/** 仅为类型推导和可读性服务，运行时不改写插件包清单。 */
export const definePluginPackage = (definition) => definition;
/** 仅为类型推导和可读性服务，运行时不改写工具插件定义。 */
export const defineToolPlugin = (plugin) => plugin;
