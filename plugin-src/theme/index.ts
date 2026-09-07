/**
 * 文件说明：声明主题配置插件的页面入口、能力、生命周期及设置，将插件实现接入工作台运行时。
 */

import { Palette } from 'lucide-vue-next';
import { defineToolPlugin, type PluginSettingsApi } from '@wttch-hub/plugin-api';
import { applyTheme, paletteFromSettings, resetTheme, themePresets } from './theme';
import { createThemeExtension } from './extension';

const colorFields = [
  ['accentColor', '主题色', '#0A84FF'],
  ['backgroundColor', '窗口背景', '#F2F2F3'],
  ['surfaceColor', '卡片与面板', '#FFFFFF'],
  ['sidebarColor', '侧边栏背景', '#E7E7EA'],
  ['textColor', '主要文字', '#1D1D1F'],
  ['mutedColor', '次要文字', '#6E6E73'],
  ['borderColor', '边框', '#D7D7DB'],
  ['successColor', '成功状态', '#34C759'],
  ['warningColor', '警告状态', '#FF9F0A'],
  ['dangerColor', '危险状态', '#FF375F'],
] as const;
const render = (settings: PluginSettingsApi) => applyTheme(paletteFromSettings(settings));
const paletteSettingKeys = {
  accentColor: 'accent',
  backgroundColor: 'background',
  surfaceColor: 'surface',
  sidebarColor: 'sidebar',
  textColor: 'text',
  mutedColor: 'muted',
  borderColor: 'border',
  successColor: 'success',
  warningColor: 'warning',
  dangerColor: 'danger',
} as const;
const defaultThemeColors = [
  ['theme.accent', 'accentColor', '应用主要强调色'],
  ['theme.background', 'backgroundColor', '窗口背景色'],
  ['theme.surface', 'surfaceColor', '卡片与面板色'],
  ['theme.sidebar', 'sidebarColor', '侧边栏背景色'],
  ['theme.text', 'textColor', '主要文字色'],
  ['theme.muted', 'mutedColor', '次要文字色'],
  ['theme.border', 'borderColor', '边框色'],
  ['theme.success', 'successColor', '成功语义色'],
  ['theme.warning', 'warningColor', '警告语义色'],
  ['theme.danger', 'dangerColor', '危险语义色'],
] as const;
let applyingPreset = false;

export default defineToolPlugin({
  apiVersion: 1,
  id: 'theme',
  path: 'theme',
  navigation: false,
  name: '主题配置',
  icon: Palette,
  desc: '统一配置应用主题色、背景层级、文字、边框与语义状态颜色。',
  tags: ['主题', '颜色'],
  tint: ['#7c3aed', 'rgba(124, 58, 237, 0.12)'],
  component: () => import('./components/ThemeStudio.vue'),
  capabilities: { toast: true },
  statusbar: { label: '主题配置', color: '#7c3aed' },
  settings: {
    description: '选择预设主题，或调整任意颜色自动切换到自定义主题。',
    fields: [
      { key: 'preset', label: '主题预设', type: 'select', defaultValue: 'ocean', options: [
        { label: '海洋蓝', value: 'ocean' }, { label: '星云紫', value: 'violet' },
        { label: '森林绿', value: 'forest' }, { label: '日落橙', value: 'sunset' },
        { label: '午夜黑', value: 'midnight' }, { label: '自定义', value: 'custom' },
      ] },
      { key: 'scheme', label: '界面明暗', type: 'select', defaultValue: 'light', options: [{ label: '浅色', value: 'light' }, { label: '深色', value: 'dark' }] },
      ...colorFields.map(([key, label, defaultValue]) => ({ key, label, type: 'color' as const, defaultValue })),
    ],
  },
  events: {
    load(context) {
      render(context.settings);
      const extension = createThemeExtension(context.storage, context.settings);
      const defaultRegistrations = defaultThemeColors.map(([key, settingKey, description]) => extension.registerThemeColor(key, settingKey, description));
      const registration = context.extensions.registerExtension(extension);
      return () => { defaultRegistrations.forEach(item => item.dispose()); registration.dispose(); resetTheme(); };
    },
    settingsChanged(context, key) {
      if (key === 'preset') {
        const preset = context.settings.get<string>('preset');
        const palette = preset ? themePresets[preset] : undefined;
        if (palette) {
          applyingPreset = true;
          try {
            context.settings.update('scheme', palette.scheme);
            for (const [settingKey, paletteKey] of Object.entries(paletteSettingKeys)) {
              context.settings.update(settingKey, palette[paletteKey as keyof typeof palette]);
            }
          } finally {
            applyingPreset = false;
          }
        }
      } else if (!applyingPreset && context.settings.get('preset') !== 'custom') {
        context.settings.update('preset', 'custom');
      }
      render(context.settings);
    },
  },
});
