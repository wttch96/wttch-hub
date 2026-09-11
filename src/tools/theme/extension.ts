/** 文件说明：主题插件对其他插件开放的颜色 token 注册与读取扩展。 */

import type { Disposable, PluginSettingsApi, PluginStorageApi, PluginThemeApi, ThemeColor } from '@wttch-hub/plugin-api';

type ThemeExtensionController = PluginThemeApi & {
  registerThemeColor(key: string, settingKey: string, description: string): Disposable;
};

const storageKey = 'theme:registered-colors';
const validKey = (key: string) => /^[a-z][a-z0-9.-]{1,63}$/.test(key);
const validColor = (color: string) => /^#[0-9a-fA-F]{6}$/.test(color);

export const createThemeExtension = (
  storage: PluginStorageApi,
  settings: PluginSettingsApi,
): ThemeExtensionController => {
  const colors = new Map<string, Omit<ThemeColor, 'value'> & { settingKey?: string }>();
  const listeners = new Set<() => void>();
  const values = () => storage.get<Record<string, string>>(storageKey, {}) ?? {};
  const emit = () => listeners.forEach(listener => listener());
  return {
    registerColor(key, defaultValue, description) {
      if (!validKey(key))
        throw new Error('主题颜色 key 必须是 2–64 位的小写字母、数字、点或连字符。');
      if (!validColor(defaultValue)) throw new Error('主题颜色默认值必须是 #RRGGBB。');
      if (colors.has(key)) throw new Error(`主题颜色 ${key} 已注册。`);
      colors.set(key, { key, defaultValue, description });
      emit();
      return {
        dispose: () => {
          if (colors.delete(key)) emit();
        },
      };
    },
    getColor: key => {
      const color = colors.get(key);
      return color
        ? color.settingKey
          ? settings.get<string>(color.settingKey, color.defaultValue)
          : (values()[key] ?? color.defaultValue)
        : undefined;
    },
    setColor(key, value) {
      if (!colors.has(key)) throw new Error(`主题颜色 ${key} 尚未注册。`);
      if (!validColor(value)) throw new Error('主题颜色必须是 #RRGGBB。');
      const color = colors.get(key)!;
      if (color.settingKey) settings.update(color.settingKey, value.toUpperCase());
      else storage.update(storageKey, { ...values(), [key]: value.toUpperCase() });
      emit();
    },
    getColors: () =>
      [...colors.values()].map(color => ({
        key: color.key,
        defaultValue: color.defaultValue,
        description: color.description,
        value: color.settingKey
          ? settings.get<string>(color.settingKey, color.defaultValue)!
          : (values()[color.key] ?? color.defaultValue),
      })),
    onDidChange(listener) {
      listeners.add(listener);
      return { dispose: () => listeners.delete(listener) };
    },
    registerThemeColor(key, settingKey, description) {
      const defaultValue = settings.get<string>(settingKey);
      if (!defaultValue || !validColor(defaultValue))
        throw new Error(`主题设置 ${settingKey} 不是有效颜色。`);
      if (colors.has(key)) throw new Error(`主题颜色 ${key} 已注册。`);
      colors.set(key, { key, defaultValue, description, settingKey });
      emit();
      return {
        dispose: () => {
          if (colors.delete(key)) emit();
        },
      };
    },
  };
};
