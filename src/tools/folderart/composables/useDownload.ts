/**
 * 文件说明：将当前图标配置渲染为画布，生成 PNG 或多尺寸 ICNS，并管理文件名与下载状态。
 */

// Download helpers: PNG (1024) and ICNS (multi-size).
import { ref } from 'vue'
import { renderComposition } from '@/tools/folderart/composables/useFolderComposition'
import { downloadBlob, packIcns } from '@/lib/icns'
import type { ConfigState } from '@/types'

const downloading = ref<'png' | 'icns' | null>(null)

function safeName(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[\\/:*?"<>|]/g, '_')
    .slice(0, 40)
  return cleaned || 'folder'
}

export function useDownload(config: ConfigState) {
  async function downloadPng() {
    if (downloading.value) return
    downloading.value = 'png'
    try {
      const canvas = await renderComposition(config)
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG 编码失败'))), 'image/png')
      )
      downloadBlob(blob, `${safeName(config.text)}.png`)
    } finally {
      downloading.value = null
    }
  }

  async function downloadIcns() {
    if (downloading.value) return
    downloading.value = 'icns'
    try {
      const canvas = await renderComposition(config)
      const blob = await packIcns(canvas)
      downloadBlob(blob, `${safeName(config.text)}.icns`)
    } finally {
      downloading.value = null
    }
  }

  return { downloading, downloadPng, downloadIcns }
}
