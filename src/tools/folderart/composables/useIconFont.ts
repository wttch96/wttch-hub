/**
 * 文件说明：封装 iconfont 图标搜索与分页状态，通过宿主或代理接口获取并规范化图标结果。
 */

// iconfont.cn search via the same-origin proxy (/iconfont-api → iconfont.cn/api).
// The search endpoint returns complete inline SVGs (show_svg) — no login needed.
import { reactive } from 'vue'
import type { IconSearchResponse, IconSearchResult } from '@/types'

const API_BASE = '/iconfont-api/icon/search.json'
const PAGE_SIZE = 54

export interface IconTypeOption {
  value: string
  label: string
}

// iconfont style filters. Values match the API's form fields (empty = all).
export const ICON_TYPE_OPTIONS: IconTypeOption[] = [
  { value: '', label: '全部' },
  { value: 'line', label: '线性' },
  { value: 'fill', label: '填充' },
  { value: 'flat', label: '扁平' },
  { value: 'hand', label: '手绘' },
  { value: 'simple', label: '简约' },
  { value: 'complex', label: '复杂' },
]

interface State {
  results: IconSearchResult[]
  total: number
  page: number
  loading: boolean
  loadingMore: boolean
  error: string | null
}

const state = reactive<State>({
  results: [],
  total: 0,
  page: 0,
  loading: false,
  loadingMore: false,
  error: null,
})

// Response shape is not strictly typed; fields are picked defensively below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapIcon(raw: any): IconSearchResult {
  const id = String(raw.id ?? raw.icon_id ?? '')
  const preview = raw.preview_image
  return {
    id,
    name: raw.name ?? '',
    showSvg: raw.show_svg ?? raw.svg ?? '',
    previewUrl: preview ? (preview.startsWith('//') ? `https:${preview}` : preview) : null,
    isPrivate: !!raw.is_private,
    unicode: raw.unicode ?? '',
  }
}

async function request(
  q: string,
  iconType: string,
  page: number
): Promise<IconSearchResponse> {
  const params = new URLSearchParams({
    q,
    sortType: 'updated_at',
    page: String(page),
    pageSize: String(PAGE_SIZE),
    fromCollection: '-1',
    fills: '',
    t: String(Date.now()),
  })
  if (iconType) params.append(iconType, '1')

  // Inside Electron the POST is forwarded by the main process
  // (window.iconFontSearch): iconfont.cn sends no CORS headers, and a file://
  // page cannot reach a same-origin proxy. In a plain browser we fall back to
  // the relative fetch (wttch-labs' dev proxy layout).
  const bridge = window.iconFontSearch
  const raw: IconfontSearchResponse = bridge
    ? await bridge(params.toString())
    : await (async () => {
        const r = await fetch(API_BASE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        })
        return { status: r.status, text: await r.text() }
      })()
  if (!raw.text) throw new Error(raw.error || `HTTP ${raw.status}`)
  const data = JSON.parse(raw.text)
  if (data.code !== 200) throw new Error(data.message || 'iconfont 请求失败')
  const icons = (data.data?.icons ?? []).map(mapIcon)
  return {
    total: data.data?.total ?? icons.length,
    page,
    pageSize: PAGE_SIZE,
    icons,
  }
}

/** Perform a fresh search (resets pagination). */
async function search(query: string, iconType: string): Promise<void> {
  state.loading = true
  state.error = null
  try {
    const resp = await request(query, iconType, 1)
    state.results = resp.icons
    state.total = resp.total
    state.page = 1
  } catch (err) {
    state.error = err instanceof Error ? err.message : '搜索失败'
    state.results = []
    state.total = 0
    state.page = 0
  } finally {
    state.loading = false
  }
}

/** Append the next page to the current results. */
async function loadMore(query: string, iconType: string): Promise<void> {
  if (state.loading || state.loadingMore || state.results.length >= state.total) return
  state.loadingMore = true
  try {
    const resp = await request(query, iconType, state.page + 1)
    state.results = [...state.results, ...resp.icons]
    state.page += 1
  } catch (err) {
    state.error = err instanceof Error ? err.message : '加载更多失败'
  } finally {
    state.loadingMore = false
  }
}

export function useIconFont() {
  return { state, search, loadMore }
}
