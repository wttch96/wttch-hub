import { definePluginPackage } from '@wttch-hub/plugin-api';

export default definePluginPackage({
  apiVersion: 1,
  id: 'alarm',
  version: '1.0.0',
  name: '闹钟提醒',
  entry: 'index.ts',
  capabilities: ['notifications', 'widget', 'floatingWidget', 'statusbar', 'storage'],
});
