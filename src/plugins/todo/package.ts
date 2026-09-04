import { definePluginPackage } from '@wttch-hub/plugin-api';

export default definePluginPackage({
  apiVersion: 1,
  id: 'todo',
  version: '1.1.0',
  name: 'Todo 泳道看板',
  entry: 'index.ts',
  capabilities: ['widget', 'statusbar', 'storage'],
});
