<!--
  文件说明：展示可用文件夹或磁盘模板及颜色变体，供用户切换图标底板样式。
-->

<script setup lang="ts">
import { config, setStyle, setVariant } from '@/tools/folderart/composables/useConfig'
import { getStyles } from '@/tools/folderart/composables/useFolderComposition'

const styles = getStyles()

function templateUrl(styleId: string, variantId: string) {
  // Relative to the document base so it works both under the dev server (/)
  // and when the packaged app loads from file:// (./ → alongside index.html).
  return `./templates/${styleId}/${variantId}.png`
}

function selectVariant(styleId: string, variantId: string) {
  if (config.style !== styleId) setStyle(styleId)
  setVariant(variantId)
}
</script>

<template>
  <aside class="panel">
    <h2>底模板</h2>

    <!-- Step 1: style -->
    <p class="field-label">样式</p>
    <div class="style-list">
      <button
        v-for="s in styles"
        :key="s.id"
        class="style-btn"
        :class="{ active: config.style === s.id }"
        @click="setStyle(s.id)"
      >
        <img
          :src="templateUrl(s.id, s.variants[0].id)"
          :alt="s.label"
          class="style-thumb"
          loading="lazy"
        />
        <span>{{ s.label }}</span>
      </button>
    </div>

    <!-- Step 2: color for the selected style -->
    <p class="field-label" style="margin-top: 14px">颜色</p>
    <div v-for="s in styles" :key="s.id">
      <div v-if="config.style === s.id" class="variant-grid">
        <div
          v-for="variant in s.variants"
          :key="variant.id"
          class="variant-swatch"
          :class="{ selected: config.variantId === variant.id }"
          @click="selectVariant(s.id, variant.id)"
        >
          <img :src="templateUrl(s.id, variant.id)" :alt="variant.label" loading="lazy" />
          <div class="v-label">{{ variant.label }}</div>
        </div>
      </div>
    </div>
  </aside>
</template>
