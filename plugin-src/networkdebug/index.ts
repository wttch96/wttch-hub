import { Radio } from 'lucide-vue-next';
import { defineToolPlugin } from '@wttch-hub/plugin-api';

export default defineToolPlugin({
  apiVersion: 1,
  id: 'networkdebug',
  path: 'networkdebug',
  navigation: { order: 10 },
  name: '网络调试助手',
  icon: Radio,
  desc: '用于 UDP / TCP 的本地收发调试；发送内容可按协议包装，接收内容保留原文并预留解析入口。',
  tags: ['UDP', 'TCP', '协议包装'],
  tint: ['var(--accent)', 'var(--accent-weak)'],
  component: () => import('./NetworkDebugTool.vue'),
});
