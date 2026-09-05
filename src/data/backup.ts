/**
 * 文件说明：定义业务数据备份白名单与格式，校验备份内容，捕获本地存储快照并在恢复写入失败时回滚。
 */

/** 只备份明确登记的业务数据，绝不扫描整个 userData 或复制 AI 密钥、Cookie、缓存。 */
export const DATA_KEYS = ['wttch-hub:plugin-runtime:v1', 'wttch-hub:plugin-settings', 'wttch-hub:navigation:v1', 'wttch-hub:home-widgets', 'folderart-config-v2', 'wttch:packetdraw:text'] as const;
export type CloseBehavior = 'quit' | 'tray';
export type Backup = { format: 'wttch-hub-backup'; version: 1; createdAt: string; closeBehavior: CloseBehavior; entries: Record<string, string> };
export const MAX_BACKUP_BYTES = 10 * 1024 * 1024;
export const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
/** 拒绝危险属性名，避免导入的数据进入响应式对象后污染对象原型。 */
export function validateJson(value: unknown): void {
  if (Array.isArray(value)) { value.forEach(validateJson); return; }
  if (isRecord(value)) for (const [key, item] of Object.entries(value)) {
    if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('数据包含不支持的属性名');
    validateJson(item);
  }
}
export function validateBackup(input: unknown): Backup {
  if (!isRecord(input) || input.format !== 'wttch-hub-backup' || input.version !== 1 || typeof input.createdAt !== 'string'
    || !['quit', 'tray'].includes(String(input.closeBehavior)) || !isRecord(input.entries)) throw new Error('不是受支持的工作台备份');
  if (new TextEncoder().encode(JSON.stringify(input)).length > MAX_BACKUP_BYTES) throw new Error('备份超过 10 MB 限制');
  for (const [key, raw] of Object.entries(input.entries)) {
    if (!(DATA_KEYS as readonly string[]).includes(key) || typeof raw !== 'string') throw new Error('备份含有未登记的数据项');
    if (key === 'wttch:packetdraw:text') continue;
    const value: unknown = JSON.parse(raw);
    validateJson(value);
    if (key === 'wttch-hub:home-widgets') {
      if (!Array.isArray(value)) throw new Error('Widget 布局格式无效');
    } else if (!isRecord(value)) throw new Error('配置格式无效');
    if (key === DATA_KEYS[0] || key === DATA_KEYS[1]) {
      const runtime = value as Record<string, unknown>;
      for (const field of ['enabled', 'values', 'storage']) {
        if (runtime[field] !== undefined && !isRecord(runtime[field])) throw new Error('插件数据格式无效');
      }
      for (const flag of Object.values(runtime.enabled ?? {})) if (typeof flag !== 'boolean') throw new Error('插件启用状态无效');
      for (const item of Object.values(runtime.storage ?? {})) if (!isRecord(item)) throw new Error('插件存储格式无效');
      for (const item of Object.values(runtime.values ?? {})) {
        if (!isRecord(item) || Object.values(item).some(v => !['boolean', 'number', 'string'].includes(typeof v))) throw new Error('插件设置格式无效');
      }
    }
  }
  return { format: 'wttch-hub-backup', version: 1, createdAt: input.createdAt, closeBehavior: input.closeBehavior as CloseBehavior, entries: { ...input.entries } as Record<string, string> };
}
export function captureEntries(storage: Pick<Storage, 'getItem'>): Record<string, string> {
  return Object.fromEntries(DATA_KEYS.flatMap(key => { const value = storage.getItem(key); return value === null ? [] : [[key, value]]; }));
}
/** 同步应用快照：发生配额等错误时恢复原值，禁止留下半份导入数据。 */
export function restoreEntries(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>, entries: Record<string, string>) {
  const previous = captureEntries(storage);
  const apply = (snapshot: Record<string, string>) => {
    DATA_KEYS.forEach(key => storage.removeItem(key));
    Object.entries(snapshot).forEach(([key, value]) => storage.setItem(key, value));
  };
  try { apply(entries); } catch (error) { apply(previous); throw error; }
}
