<script setup lang="ts">
import { config } from '@/tools/folderart/composables/useConfig'
import { useDownload } from '@/tools/folderart/composables/useDownload'

const { downloading, downloadPng, downloadIcns } = useDownload(config)
</script>

<template>
  <div class="download-row">
    <button class="btn btn-primary" :disabled="!!downloading" @click="downloadPng">
      {{ downloading === 'png' ? '生成中…' : '下载 PNG' }}
    </button>
    <button class="btn btn-ghost" :disabled="!!downloading" @click="downloadIcns">
      {{ downloading === 'icns' ? '生成中…' : '下载 ICNS' }}
    </button>
  </div>
</template>
