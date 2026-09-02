<script setup lang="ts">
import { ref } from 'vue'
import { config } from '@/tools/folderart/composables/useConfig'
import { useFolderComposition } from '@/tools/folderart/composables/useFolderComposition'

const canvasEl = ref<HTMLCanvasElement | null>(null)
const { rendering } = useFolderComposition(canvasEl, ref(config))
</script>

<template>
  <div class="preview-stage">
    <canvas ref="canvasEl" width="1024" height="1024" />
    <p class="preview-hint">
      {{ rendering ? '渲染中…' : '实时预览 · 点击「下载 PNG / ICNS」保存' }}
    </p>
  </div>
</template>
