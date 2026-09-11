import { Radio } from 'lucide-vue-next';
import { defineToolPlugin, type PluginLifecycleContext } from '@wttch-hub/plugin-api';
import { instance, networkConfig } from './store';
import { watch } from 'vue';

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
  events: {
    activate: context => {
      instance.context = context;
      const savedConfig = context.storage.get('network-config');
      console.log('默认网络配置:', networkConfig);
      if (savedConfig) {
        console.log('存储的网络配置:', savedConfig);
        Object.assign(networkConfig, savedConfig);
      }
      // 监听变化
      const stop = watch(networkConfig, newConfig => {
        if (!newConfig) {
          return;
        }
        if (!instance.context) {
          console.debug('上下文已卸载, 无法保存网络配置.');
          return;
        }
        context.storage.update('network-config', newConfig);
        console.debug('网络配置已持久化.');
      });
      return {
        dispose() {
          // 清理关联
          instance.context = undefined;
          stop.stop();
        },
      };
    },
  },
});
