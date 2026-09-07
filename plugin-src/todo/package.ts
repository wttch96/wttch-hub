/**
 * 文件说明：定义待办清单插件的分发清单，包括标识、版本、入口与所需能力，供插件打包和安装工具读取。
 */

import { definePluginPackage } from '@wttch-hub/plugin-api';

export default definePluginPackage({
  apiVersion: 1,
  id: 'todo',
  version: '1.2.0',
  name: 'Todo 泳道看板',
  entry: 'index.ts',
  capabilities: ['widget', 'statusbar', 'storage'],
});
