/**
 * 文件说明：基于插件自身存储创建数据管理 API，提供键列表、字节用量、独立快照导出、恢复和清空。
 */

import type { PluginDataApi, PluginDataSnapshot } from '../types/plugin';
import { isRecord, validateJson } from './backup';

/** 数据 API 与 storage 共用同一个插件命名空间；导出使用深拷贝，调用方无法间接修改宿主状态。 */
export function createPluginDataApi(pluginId: string, read: () => Record<string, unknown>, replace: (data: Record<string, unknown>) => void): PluginDataApi {
  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
  return {
    keys: () => Object.keys(read()),
    getUsage: () => ({ keys: Object.keys(read()).length, bytes: new TextEncoder().encode(JSON.stringify(read())).length }),
    export: () => ({ format: 'wttch-hub-plugin-data', version: 1, pluginId, data: clone(read()) }),
    import(snapshot: PluginDataSnapshot) {
      if (!isRecord(snapshot) || snapshot.format !== 'wttch-hub-plugin-data' || snapshot.version !== 1
        || snapshot.pluginId !== pluginId || !isRecord(snapshot.data)) throw new Error('插件数据快照不兼容或属于其他插件');
      const next = clone(snapshot.data);
      validateJson(next);
      if (new TextEncoder().encode(JSON.stringify(next)).length > 4 * 1024 * 1024) throw new Error('插件数据超过 4 MB 限制');
      replace(next);
    },
    clear: () => replace({}),
  };
}
