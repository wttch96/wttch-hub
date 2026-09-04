import { definePluginPackage } from '@wttch-hub/plugin-api';

export default definePluginPackage({
  apiVersion: 1,
  id: 'theme',
  version: '1.0.0',
  name: '主题配置',
  entry: 'index.ts',
  capabilities: ['theme', 'settings'],
});
