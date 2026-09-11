import { definePluginPackage } from '@wttch-hub/plugin-api';

export default definePluginPackage({
  apiVersion: 1,
  id: 'networkdebug',
  version: '1.0.0',
  name: '网络调试助手',
  entry: 'index.ts',
});
