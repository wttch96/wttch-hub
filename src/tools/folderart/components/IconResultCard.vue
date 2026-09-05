<!--
  文件说明：渲染单个图标搜索结果的预览和名称，并响应用户的图标选择操作。
-->

<script setup lang="ts">
import { computed } from 'vue'
import { normalizeSvgSize, parseViewBox } from '@/lib/svg'
import type { IconSearchResult } from '@/types'

const props = defineProps<{ icon: IconSearchResult; selected: boolean }>()
const emit = defineEmits<{ (e: 'select', icon: IconSearchResult): void }>()

// Render the inline SVG as a data URL (never cross-origin, so canvas-safe).
const thumbUrl = computed(() => {
  if (!props.icon.showSvg) return props.icon.previewUrl ?? undefined
  const dim = parseViewBox(props.icon.showSvg)
  const size = dim ? Math.max(dim.width, dim.height) : 48
  const normalized = normalizeSvgSize(props.icon.showSvg, size, size)
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(normalized)}`
})
</script>

<template>
  <div
    class="icon-cell"
    :class="{ selected }"
    :title="icon.name"
    @click="emit('select', icon)"
  >
    <img :src="thumbUrl" :alt="icon.name" loading="lazy" />
  </div>
</template>
