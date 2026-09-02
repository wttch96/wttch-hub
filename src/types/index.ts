// Shared type definitions for the folder-art composer.

/** How the icon is printed onto the template face. */
export type PrintMode = 'original' | 'recolor' | 'bw' | 'emboss'

/** An iconfont search result item (mapped from the raw API response). */
export interface IconSearchResult {
  id: string
  name: string
  showSvg: string
  previewUrl: string | null
  isPrivate: boolean
  unicode: string
}

export interface IconSearchResponse {
  total: number
  page: number
  pageSize: number
  icons: IconSearchResult[]
}

/** The source of the icon drawn onto the folder face. */
export type IconSource =
  | { kind: 'preset'; iconId: string; name: string; svg: string }
  | { kind: 'file'; name: string; url: string }
  | { kind: 'svg'; name: string; svg: string }

export type StyleKind = 'folder' | 'drive'

/** Per-template canvas-placement constraints. */
export interface FaceConstraints {
  /** Maximum icon width in px (1024 canvas). */
  maxWidth: number
  /** Maximum icon height in px. */
  maxHeight: number
  /** Preferred icon size for square icons. */
  preferredSize: number
  /** Height of the face/disk (icon placement region). */
  faceHeight: number
  /** Top y of the face/disk region. */
  startY: number
  /** Baseline y for centered text. */
  labelBaselineY: number
  /** Max text width (text shrinks until it fits). */
  textMaxWidth: number
  /** Whether to draw a drop shadow under the icon. */
  shadow: boolean
}

export interface TemplateVariant {
  id: string
  label: string
  /** Body color used for icon recoloring, hex. */
  bodyColor: string
  /** Direct base PNG URL for this variant (pre-colored); generator skips
   * hue rotation when every variant has one. */
  base?: string
}

export interface TemplateStyleDef {
  id: string
  label: string
  kind: StyleKind
  /** Degrees the icon plane is tilted for drive faces (else absent). */
  tilt?: number
  constraints: FaceConstraints
  variants: TemplateVariant[]
}

export interface ConfigState {
  /** Selected style id (matches manifest styles). */
  style: string
  /** Selected variant (color) id within the style. */
  variantId: string
  /** iconfont style filter for search. */
  iconType: string
  icon: IconSource | null
  text: string
  /** Icon print mode. */
  printMode: PrintMode
  scaleFactor: number
}

export type RGB = { r: number; g: number; b: number }

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff }
}
