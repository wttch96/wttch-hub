import { definePluginPackage } from '../../types/plugin';

/**
 * 系统监控插件的可分发包定义。
 * 这是插件包的类型安全来源；package-plugins 会读取它并生成 ZIP。
 */
export default definePluginPackage({
  apiVersion: 1,
  id: 'system-monitor',
  version: '1.0.0',
  name: '系统监控',
  entry: 'index.ts',
  capabilities: ['systemStats', 'widget', 'statusbar'],
});