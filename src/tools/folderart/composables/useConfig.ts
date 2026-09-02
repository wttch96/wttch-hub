// Reactive app configuration + localStorage persistence.
import { reactive, toRaw } from 'vue'
import { getStyle } from '@/tools/folderart/composables/useFolderComposition'
import type { ConfigState, IconSource, PrintMode } from '@/types'

const STORAGE_KEY = 'folderart-config-v2'

export const DEFAULTS: ConfigState = {
  style: 'folder-bigsur',
  variantId: 'blue',
  iconType: '',
  icon: null,
  text: '',
  printMode: 'recolor',
  scaleFactor: 1,
}

function loadPersisted(): Partial<ConfigState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return {
      style: parsed.style,
      variantId: parsed.variantId,
      text: typeof parsed.text === 'string' ? parsed.text : '',
      printMode: parsed.printMode as PrintMode | undefined,
      scaleFactor: typeof parsed.scaleFactor === 'number' ? parsed.scaleFactor : 1,
    }
  } catch {
    return {}
  }
}

const persisted = loadPersisted()

export const config = reactive<ConfigState>({
  ...DEFAULTS,
  ...persisted,
})

export function setStyle(style: string) {
  config.style = style
  const s = getStyle(style)
  if (!s.variants.some((v) => v.id === config.variantId)) {
    config.variantId = s.variants[0]?.id ?? 'blue'
  }
  persist()
}

export function setVariant(variantId: string) {
  config.variantId = variantId
  persist()
}

export function setIcon(icon: IconSource | null) {
  config.icon = icon
  persist()
}

export function setText(text: string) {
  config.text = text
  persist()
}

export function setPrintMode(mode: PrintMode) {
  config.printMode = mode
  persist()
}

export function setScaleFactor(v: number) {
  config.scaleFactor = v
  persist()
}

export function setIconType(iconType: string) {
  config.iconType = iconType
}

export function persist() {
  try {
    const { icon, iconType, ...rest } = toRaw(config)
    void icon
    void iconType
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rest))
  } catch {
    /* storage may be unavailable */
  }
}

export function resetConfig() {
  Object.assign(config, DEFAULTS)
  persist()
}
