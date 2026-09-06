/**
 * 文件说明：定义闹钟提醒插件的分发清单，包括标识、版本、入口与所需能力，供插件打包和安装工具读取。
 */

import { definePluginPackage } from '@wttch-hub/plugin-api';

export default definePluginPackage({
  apiVersion: 1,
  id: 'alarm',
  version: '1.0.0',
  name: '闹钟提醒',
  entry: 'index.ts',
  capabilities: ['services', 'notifications', 'widget', 'floatingWidget', 'statusbar', 'storage'],
});
