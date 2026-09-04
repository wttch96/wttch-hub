import type { PluginSettingsApi } from '@wttch-hub/plugin-api';

export type ThemePalette = {
  name: string;
  scheme: 'light' | 'dark';
  accent: string;
  background: string;
  surface: string;
  sidebar: string;
  text: string;
  muted: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
};

export const themePresets: Record<string, ThemePalette> = {
  ocean: { name: '海洋蓝', scheme: 'light', accent: '#0A84FF', background: '#F2F2F3', surface: '#FFFFFF', sidebar: '#E7E7EA', text: '#1D1D1F', muted: '#6E6E73', border: '#D7D7DB', success: '#34C759', warning: '#FF9F0A', danger: '#FF375F' },
  violet: { name: '星云紫', scheme: 'light', accent: '#7C3AED', background: '#F5F3FF', surface: '#FFFFFF', sidebar: '#EDE9FE', text: '#211A2D', muted: '#746B80', border: '#DDD6FE', success: '#22A65A', warning: '#E88909', danger: '#E43D5C' },
  forest: { name: '森林绿', scheme: 'light', accent: '#168A45', background: '#F0F7F2', surface: '#FFFFFF', sidebar: '#DDEFE3', text: '#18251C', muted: '#617067', border: '#C9DED0', success: '#168A45', warning: '#D88700', danger: '#D63C4A' },
  sunset: { name: '日落橙', scheme: 'light', accent: '#EA580C', background: '#FFF5ED', surface: '#FFFFFF', sidebar: '#FFE7D5', text: '#2D1D16', muted: '#7D685D', border: '#F3D1BC', success: '#2E9D55', warning: '#EA8A00', danger: '#DC3545' },
  midnight: { name: '午夜黑', scheme: 'dark', accent: '#64A8FF', background: '#17181B', surface: '#25272C', sidebar: '#202227', text: '#F5F5F7', muted: '#A4A5AB', border: '#3B3D44', success: '#45D06F', warning: '#FFB340', danger: '#FF667A' },
};

export const customThemeDefaults = themePresets.ocean;

const rgba = (hex: string, alpha: number) => {
  const value = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return hex;
  const number = Number.parseInt(value, 16);
  return `rgba(${number >> 16}, ${(number >> 8) & 255}, ${number & 255}, ${alpha})`;
};

export const paletteFromSettings = (settings: PluginSettingsApi): ThemePalette => {
  const preset = settings.get<string>('preset', 'ocean') ?? 'ocean';
  if (preset !== 'custom' && themePresets[preset]) return themePresets[preset];
  return {
    name: '自定义',
    scheme: settings.get<string>('scheme', 'light') === 'dark' ? 'dark' : 'light',
    accent: settings.get<string>('accentColor', customThemeDefaults.accent)!,
    background: settings.get<string>('backgroundColor', customThemeDefaults.background)!,
    surface: settings.get<string>('surfaceColor', customThemeDefaults.surface)!,
    sidebar: settings.get<string>('sidebarColor', customThemeDefaults.sidebar)!,
    text: settings.get<string>('textColor', customThemeDefaults.text)!,
    muted: settings.get<string>('mutedColor', customThemeDefaults.muted)!,
    border: settings.get<string>('borderColor', customThemeDefaults.border)!,
    success: settings.get<string>('successColor', customThemeDefaults.success)!,
    warning: settings.get<string>('warningColor', customThemeDefaults.warning)!,
    danger: settings.get<string>('dangerColor', customThemeDefaults.danger)!,
  };
};

export const applyTheme = (palette: ThemePalette) => {
  const root = document.documentElement;
  const tokens: Record<string, string> = {
    '--theme-accent': palette.accent,
    '--theme-accent-weak': rgba(palette.accent, .12),
    '--theme-window-bg': rgba(palette.background, .9),
    '--theme-content-bg': rgba(palette.background, .78),
    '--theme-sidebar-bg': rgba(palette.sidebar, .72),
    '--theme-card-bg': rgba(palette.surface, .76),
    '--theme-panel': palette.surface,
    '--theme-border': palette.border,
    '--theme-hairline': rgba(palette.border, .65),
    '--theme-text': palette.text,
    '--theme-muted': palette.muted,
    '--theme-success': palette.success,
    '--theme-warning': palette.warning,
    '--theme-danger': palette.danger,
    '--theme-titlebar-bg': rgba(palette.background, .68),
  };
  for (const [key, value] of Object.entries(tokens)) root.style.setProperty(key, value);
  root.style.colorScheme = palette.scheme;
  root.dataset.theme = palette.name;
};

export const resetTheme = () => {
  const root = document.documentElement;
  for (const key of Array.from(root.style)) if (key.startsWith('--theme-')) root.style.removeProperty(key);
  root.style.removeProperty('color-scheme');
  delete root.dataset.theme;
};
