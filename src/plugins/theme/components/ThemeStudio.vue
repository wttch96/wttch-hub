<script setup lang="ts">
import { computed } from 'vue';
import { Check, Moon, Palette, Sun } from 'lucide-vue-next';
import { customThemeDefaults, themePresets, type ThemePalette } from '../theme';

const props = withDefaults(defineProps<{
  preset?: string; scheme?: string; accentColor?: string; backgroundColor?: string;
  surfaceColor?: string; sidebarColor?: string; textColor?: string; mutedColor?: string;
  borderColor?: string; successColor?: string; warningColor?: string; dangerColor?: string;
}>(), {
  preset: 'ocean', scheme: 'light', accentColor: customThemeDefaults.accent,
  backgroundColor: customThemeDefaults.background, surfaceColor: customThemeDefaults.surface,
  sidebarColor: customThemeDefaults.sidebar, textColor: customThemeDefaults.text,
  mutedColor: customThemeDefaults.muted, borderColor: customThemeDefaults.border,
  successColor: customThemeDefaults.success, warningColor: customThemeDefaults.warning,
  dangerColor: customThemeDefaults.danger,
});
const emit = defineEmits<{ 'update-setting': [key: string, value: string] }>();
const presetEntries = Object.entries(themePresets);
const palette = computed<ThemePalette>(() => props.preset !== 'custom' && themePresets[props.preset]
  ? themePresets[props.preset]
  : { name: '自定义', scheme: props.scheme === 'dark' ? 'dark' : 'light', accent: props.accentColor,
      background: props.backgroundColor, surface: props.surfaceColor, sidebar: props.sidebarColor,
      text: props.textColor, muted: props.mutedColor, border: props.borderColor,
      success: props.successColor, warning: props.warningColor, danger: props.dangerColor });
const colorControls = computed(() => [
  ['accentColor', '主题色', props.accentColor], ['backgroundColor', '窗口背景', props.backgroundColor],
  ['surfaceColor', '卡片与面板', props.surfaceColor], ['sidebarColor', '侧边栏', props.sidebarColor],
  ['textColor', '主要文字', props.textColor], ['mutedColor', '次要文字', props.mutedColor],
  ['borderColor', '边框', props.borderColor], ['successColor', '成功', props.successColor],
  ['warningColor', '警告', props.warningColor], ['dangerColor', '危险', props.dangerColor],
]);
const updateColor = (key: string, event: Event) => emit('update-setting', key, (event.target as HTMLInputElement).value);
</script>

<template>
  <section class="theme-studio">
    <header class="theme-head">
      <div><span>APPEARANCE</span><h2>主题工作室</h2><p>主题 token 会同时作用于宿主、工具页面和插件 UI。</p></div>
      <Palette :size="24" />
    </header>

    <div class="preset-grid">
      <button
        v-for="([id, item]) in presetEntries"
        :key="id"
        type="button"
        class="preset"
        :class="{ active: preset === id }"
        :style="{ '--preview-accent': item.accent, '--preview-bg': item.background, '--preview-surface': item.surface, '--preview-text': item.text }"
        @click="emit('update-setting', 'preset', id)"
      >
        <span class="mini-window"><i /><i /><i /></span>
        <strong>{{ item.name }}</strong>
        <Check v-if="preset === id" :size="15" />
      </button>
    </div>

    <div class="theme-section">
      <div class="section-heading"><div><h3>自定义颜色</h3><p>修改任一颜色后自动切换到自定义主题。</p></div><span class="scheme"><Sun v-if="palette.scheme === 'light'" :size="14" /><Moon v-else :size="14" />{{ palette.scheme === 'light' ? '浅色' : '深色' }}</span></div>
      <div class="color-grid">
        <label v-for="([key, label, value]) in colorControls" :key="key">
          <input type="color" :value="value" @input="updateColor(key, $event)">
          <span><strong>{{ label }}</strong><code>{{ value.toUpperCase() }}</code></span>
        </label>
      </div>
    </div>

    <div class="theme-section">
      <div class="section-heading"><div><h3>实时预览</h3><p>覆盖文字、表面、边框和语义状态。</p></div></div>
      <div class="preview" :style="{ background: palette.background, color: palette.text, borderColor: palette.border }">
        <aside :style="{ background: palette.sidebar }"><i :style="{ background: palette.accent }" /><i /><i /></aside>
        <main><h4>示例面板</h4><p :style="{ color: palette.muted }">这是一段次要说明文字</p><button :style="{ background: palette.accent }">主要操作</button><div class="states"><span :style="{ color: palette.success }">成功</span><span :style="{ color: palette.warning }">警告</span><span :style="{ color: palette.danger }">危险</span></div></main>
      </div>
    </div>
  </section>
</template>

<style scoped>
.theme-studio { max-width: 920px; margin: 0 auto; padding: 24px 26px 60px; color: var(--text); }
.theme-head, .section-heading { display: flex; align-items: flex-start; justify-content: space-between; }
.theme-head { margin-bottom: 20px; color: var(--accent); }
.theme-head span { color: var(--text-secondary); font-size: 9px; font-weight: 700; letter-spacing: .12em; }
.theme-head h2 { margin: 3px 0 0; color: var(--text); font-size: 24px; }
.theme-head p, .section-heading p { margin: 5px 0 0; color: var(--text-secondary); font-size: 12px; }
.preset-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
.preset { position: relative; display: flex; flex-direction: column; gap: 8px; padding: 9px; border: 1px solid var(--border); border-radius: 11px; background: var(--panel); color: var(--text); text-align: left; cursor: pointer; }
.preset.active { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-weak); }
.preset > svg { position: absolute; right: 8px; bottom: 9px; color: var(--accent); }
.preset strong { font-size: 11px; }
.mini-window { display: flex; align-items: center; gap: 4px; width: 100%; height: 45px; padding: 8px; border-radius: 7px; background: var(--preview-bg); }
.mini-window i { width: 8px; height: 26px; border-radius: 3px; background: var(--preview-surface); }
.mini-window i:first-child { width: 28%; background: var(--preview-accent); }
.theme-section { margin-top: 18px; padding: 16px; border: 1px solid var(--border); border-radius: 12px; background: var(--panel); }
.section-heading h3 { margin: 0; font-size: 14px; }
.scheme { display: inline-flex; align-items: center; gap: 5px; color: var(--text-secondary); font-size: 11px; }
.color-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-top: 13px; }
.color-grid label { display: flex; align-items: center; gap: 7px; min-width: 0; padding: 7px; border: 1px solid var(--border); border-radius: 8px; cursor: pointer; }
.color-grid input { flex: 0 0 auto; width: 27px; height: 27px; padding: 0; overflow: hidden; border: 0; border-radius: 6px; background: transparent; cursor: pointer; }
.color-grid span { display: flex; flex-direction: column; min-width: 0; }
.color-grid strong { font-size: 10px; white-space: nowrap; }
.color-grid code { color: var(--text-secondary); font-size: 8px; }
.preview { display: grid; grid-template-columns: 74px 1fr; min-height: 150px; margin-top: 13px; overflow: hidden; border: 1px solid; border-radius: 10px; }
.preview aside { display: flex; flex-direction: column; gap: 8px; padding: 12px; }
.preview aside i { width: 100%; height: 16px; border-radius: 4px; background: rgba(127, 127, 127, .2); }
.preview main { padding: 18px; }
.preview h4 { margin: 0; font-size: 14px; }
.preview p { margin: 6px 0 14px; font-size: 11px; }
.preview button { padding: 6px 10px; border: 0; border-radius: 6px; color: #fff; font-size: 11px; }
.states { display: flex; gap: 12px; margin-top: 15px; font-size: 10px; font-weight: 700; }
@media (max-width: 720px) { .preset-grid { grid-template-columns: repeat(2, 1fr); } .color-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
