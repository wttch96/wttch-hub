<!--
  文件说明：提供在线图标搜索、风格筛选和结果浏览界面，将选中的图标交给合成配置。
-->

<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import { config, setIcon, setIconType } from '@/tools/folderart/composables/useConfig'
import { useIconFont, ICON_TYPE_OPTIONS } from '@/tools/folderart/composables/useIconFont'
import IconResultCard from './IconResultCard.vue'
import type { IconSearchResult } from '@/types'

const { state, search, loadMore } = useIconFont()

const query = ref('')
const selectedId = ref<string | null>(null)
let debounceHandle = 0

function doSearch() {
  const q = query.value.trim()
  if (!q) {
    state.results = []
    state.total = 0
    state.error = null
    return
  }
  search(q, config.iconType)
}

function onInput() {
  clearTimeout(debounceHandle)
  debounceHandle = window.setTimeout(doSearch, 350)
}

function onTypeChange(value: string) {
  setIconType(value)
  if (query.value.trim()) doSearch()
}

function onSelect(icon: IconSearchResult) {
  selectedId.value = icon.id
  setIcon({ kind: 'preset', iconId: icon.id, name: icon.name, svg: icon.showSvg })
}

onUnmounted(() => clearTimeout(debounceHandle))
</script>

<template>
  <aside class="panel">
    <h2>图标库 · iconfont</h2>

    <input
      v-model="query"
      class="search-box"
      type="text"
      placeholder="搜索图标，如 star / 文件夹 / react …"
      @input="onInput"
      @keyup.enter="doSearch"
    />

    <div class="type-chips">
      <button
        v-for="opt in ICON_TYPE_OPTIONS"
        :key="opt.value"
        class="chip"
        :class="{ active: config.iconType === opt.value }"
        @click="onTypeChange(opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>

    <div v-if="state.error" class="error-banner">{{ state.error }}</div>

    <div v-if="state.loading && state.results.length === 0" class="empty-hint">加载中…</div>

    <template v-else>
      <div v-if="state.results.length" class="results-grid">
        <IconResultCard
          v-for="icon in state.results"
          :key="icon.id"
          :icon="icon"
          :selected="selectedId === icon.id"
          @select="onSelect"
        />
      </div>
      <p v-else class="empty-hint">
        输入关键词开始搜索，或在上传区直接上传 / 粘贴图标 SVG。
      </p>

      <button
        v-if="state.results.length < state.total"
        class="load-more"
        :disabled="state.loadingMore"
        @click="loadMore(query.trim(), config.iconType)"
      >
        {{ state.loadingMore ? '加载中…' : `加载更多（${state.results.length}/${state.total}）` }}
      </button>
    </template>
  </aside>
</template>
