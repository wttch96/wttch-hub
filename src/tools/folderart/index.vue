<!--
  文件说明：组合文件夹图标工具的模板选择、参数控制、图标搜索、实时预览和下载区域。
-->

<script setup lang="ts">
// FolderArt tool page — the icon generator, self-contained.
import { onUnmounted } from 'vue'
import { useSiteFooter } from '@/composables/useSiteFooter'
import TemplatePicker from './components/TemplatePicker.vue'
import LivePreview from './components/LivePreview.vue'
import IconSearch from './components/IconSearch.vue'
import ControlsPanel from './components/ControlsPanel.vue'
import DownloadBar from './components/DownloadBar.vue'

// 向全局 footer 插入本工具的内容（离开本页自动移除）
const unregisterFooter = useSiteFooter({
  title: '灵感参考',
  links: [
    { text: 'folderart.christianvm.dev', href: 'https://folderart.christianvm.dev' },
    { text: 'folderify', href: 'https://github.com/lgarron/folderify' },
  ],
  text: '本站为个人学习用途，非商业项目。图标版权归 iconfont.cn 各上传者所有，硬盘/服务器类模板源自 macOS 系统图标，请遵守各来源的使用条款。',
})

onUnmounted(unregisterFooter)
</script>

<template>
  <div class="app-shell">
    <TemplatePicker />
    <main>
      <LivePreview />
      <DownloadBar />
    </main>
    <div class="side-col">
      <IconSearch />
      <ControlsPanel />
    </div>
  </div>
</template>

<style scoped>
/* 填充 .content 内容区，让全局 footer 固定在视口底部 */
.app-shell {
  height: 100%;
}

main {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.side-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
  overflow-y: auto;
}

.side-col > .panel {
  flex: 1;
  overflow-y: auto;
}
</style>
