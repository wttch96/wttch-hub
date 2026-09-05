/**
 * 文件说明：为插件提供固定命名空间的服务发布接口，检查声明与启用状态，避免插件直接指定微信接收人。
 */

import type { PluginServicesApi, ToolPlugin } from '../types/plugin';
import type { ServiceBridge } from './contracts';
/** 发布主题固定属于当前插件；禁用或未声明服务时，即使持有旧引用也不能调用。 */
export function createPluginServicesApi(plugin: ToolPlugin, enabled: () => boolean, bridge: () => ServiceBridge | undefined): PluginServicesApi {
  const allowed = (id: string) => enabled() && plugin.capabilities?.services && plugin.services?.some(service => service.id === id);
  return {
    async publish(id, output) {
      if (!allowed(id)) return { accepted: false, sent: 0, failed: 0, skipped: 0, error: '插件未声明该服务或已禁用' };
      try {
        const host = bridge();
        if (!host) throw new Error();
        return await host.publish(`${plugin.id}/${id}`, output);
      } catch { return { accepted: false, sent: 0, failed: 0, skipped: 0, error: '服务分发仅支持桌面主工作台' }; }
    },
    async getStatus(id) {
      if (!allowed(id)) return { configured: false, subscribed: 0 };
      try { return await bridge()?.status(`${plugin.id}/${id}`) ?? { configured: false, subscribed: 0 }; }
      catch { return { configured: false, subscribed: 0 }; }
    },
  };
}
