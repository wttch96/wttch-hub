/** 文件说明：提供最小插件包声明模板，供开发者复制后修改插件标识、版本和所需能力。 */

import { definePluginPackage } from '@wttch-hub/plugin-api';

export default definePluginPackage({
  apiVersion: 1,
  id: 'hello-plugin',
  version: '0.1.0',
  name: '示例插件',
  entry: 'index.ts',
  capabilities: ['storage', 'toast'],
});
