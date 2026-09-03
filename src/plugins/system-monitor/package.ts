import { definePluginPackage } from '@wttch-hub/plugin-api';

/**
 * 系统监控插件的可分发包定义。
 * 这是插件包的类型安全来源；插件集合由独立的打包流程处理。
 */
export default definePluginPackage({
  apiVersion: 1,
  id: 'system-monitor',
  version: '1.0.0',
  name: '系统监控',
  entry: 'index.ts',
  capabilities: ['systemStats', 'widget', 'statusbar'],
});