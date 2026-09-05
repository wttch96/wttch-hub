<!--
  文件说明：展示图标合成的文字、尺寸和印刷效果等参数，更新图标生成器共享配置。
-->

<script setup lang="ts">
import { ref } from 'vue'
import {
  config,
  resetConfig,
  setIcon,
  setPrintMode,
  setScaleFactor,
  setText,
} from '@/tools/folderart/composables/useConfig'
import type { PrintMode } from '@/types'

const fileInput = ref<HTMLInputElement | null>(null)
const pasteText = ref('')
const pasteError = ref('')

const PRINT_OPTIONS: { value: PrintMode; label: string; hint: string }[] = [
  { value: 'original', label: '原色', hint: '保留图标原始颜色' },
  { value: 'recolor', label: '跟随模板色', hint: '图标着色为当前底模板颜色' },
  { value: 'bw', label: '黑白', hint: '纯黑剪影' },
  { value: 'emboss', label: '钢印', hint: '半透明灰色压印，透出底模板颜色' },
]

function openFilePicker() {
  fileInput.value?.click()
}

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (file.name.toLowerCase().endsWith('.svg')) {
    const text = await file.text()
    setIcon({ kind: 'svg', name: file.name, svg: text })
  } else {
    const url = URL.createObjectURL(file)
    setIcon({ kind: 'file', name: file.name, url })
  }
}

function applyPaste() {
  const svg = pasteText.value.trim()
  pasteError.value = ''
  if (!svg.startsWith('<svg')) {
    pasteError.value = '请输入以 <svg 开头的 SVG 内容'
    return
  }
  setIcon({ kind: 'svg', name: 'pasted-svg', svg })
  pasteText.value = ''
}
</script>

<template>
  <aside class="panel">
    <h2>配置</h2>

    <div class="field">
      <label for="text">文字标签（可选）</label>
      <input
        id="text"
        type="text"
        :value="config.text"
        maxlength="15"
        placeholder="例如：工作 / 照片 / Docs"
        @input="setText(($event.target as HTMLInputElement).value)"
      />
    </div>

    <div class="field">
      <label>图标来源</label>
      <div v-if="config.icon" class="icon-src-badge">
        <span>{{ config.icon.name }}</span>
        <button title="移除图标" @click="setIcon(null)">×</button>
      </div>
      <button class="upload-btn" @click="openFilePicker">
        上传图片（PNG / JPG / SVG）
      </button>
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        style="display: none"
        @change="onFileChange"
      />
      <p class="empty-hint" style="padding: 8px 0 4px">或直接粘贴图标 SVG：</p>
      <textarea v-model="pasteText" class="paste-area" placeholder="<svg viewBox=…>…</svg>" />
      <button class="upload-btn" style="margin-top: 6px" @click="applyPaste">使用粘贴的 SVG</button>
      <p v-if="pasteError" class="error-banner">{{ pasteError }}</p>
    </div>

    <div class="field">
      <label>印制方式</label>
      <div class="print-options">
        <button
          v-for="opt in PRINT_OPTIONS"
          :key="opt.value"
          class="print-btn"
          :class="{ active: config.printMode === opt.value }"
          :title="opt.hint"
          @click="setPrintMode(opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <div class="field">
      <label>图标缩放</label>
      <div class="range-row">
        <input
          type="range"
          min="0.5"
          max="2.5"
          step="0.01"
          :value="config.scaleFactor"
          @input="setScaleFactor(Number(($event.target as HTMLInputElement).value))"
        />
        <span class="range-value">{{ Math.round(config.scaleFactor * 100) }}%</span>
      </div>
    </div>

    <div class="download-row">
      <button class="btn btn-ghost-warn" @click="resetConfig">重置</button>
    </div>
  </aside>
</template>
