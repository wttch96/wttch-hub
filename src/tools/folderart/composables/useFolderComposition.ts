// Canvas composition: draw the template + icon (with print-mode effects) +
// optional centered text, at 1024×1024. Re-renders (rAF-debounced) whenever
// the config changes. Exposes the canvas element and helpers for download.
import { onUnmounted, ref, watch, type Ref } from 'vue'
import { loadImage, svgStringToImg } from '@/lib/svg'
import { binarizePixels, embossPixels, recolorPixels } from '@/lib/color'
import manifest from '@/tools/folderart/config/template-manifest.json'
import type {
  ConfigState,
  FaceConstraints,
  IconSource,
  PrintMode,
  TemplateStyleDef,
} from '@/types'

const SIZE = 1024

// Toggle for the face/icon debug overlay (see drawDebugFace).
export const DEBUG_FACE = false

const styles = (manifest as unknown as { styles: TemplateStyleDef[] }).styles

export function getStyles(): TemplateStyleDef[] {
  return styles
}

export function getStyle(id: string): TemplateStyleDef {
  return styles.find((s) => s.id === id)!
}

export function getVariant(styleId: string, variantId: string) {
  return getStyle(styleId).variants.find((v) => v.id === variantId)!
}

export function getConstraints(styleId: string): FaceConstraints {
  return getStyle(styleId).constraints
}

const cache = new Map<string, Promise<HTMLImageElement>>()
function cachedImage(url: string): Promise<HTMLImageElement> {
  if (!cache.has(url)) cache.set(url, loadImage(url))
  return cache.get(url)!
}

/**
 * Build the 1024×1024 composition on a fresh offscreen canvas. Pure function so
 * the download path can re-render at will.
 */
export async function renderComposition(config: ConfigState): Promise<HTMLCanvasElement> {
  const style = getStyle(config.style)
  const variant = getVariant(config.style, config.variantId)
  const constraints = style.constraints
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.clearRect(0, 0, SIZE, SIZE)

  // 1. Template (relative base so it resolves under both the dev server and a
  // packaged file:// load)
  const folder = await cachedImage(`./templates/${config.style}/${config.variantId}.png`)
  ctx.drawImage(folder, 0, 0, SIZE, SIZE)

  // 2. Icon
  const iconImg = config.icon ? await iconSourceToImg(config.icon) : null
  if (iconImg) {
    const nw = iconImg.naturalWidth || 1024
    const nh = iconImg.naturalHeight || 1024
    const { w, h } = fitIcon(nw, nh, constraints, config.scaleFactor)
    const x = (SIZE - w) / 2
    const y = constraints.startY + (constraints.faceHeight - h) / 2

    // Print modes transform the icon onto a temp canvas first.
    let drawSource: CanvasImageSource = iconImg
    const needsPixelPass =
      config.printMode === 'recolor' || config.printMode === 'bw' || config.printMode === 'emboss'
    if (needsPixelPass) {
      const temp = document.createElement('canvas')
      temp.width = Math.round(w)
      temp.height = Math.round(h)
      const tctx = temp.getContext('2d', { willReadFrequently: true })!
      tctx.drawImage(iconImg, 0, 0, temp.width, temp.height)
      applyPrintMode(temp, config.printMode, variant.bodyColor)
      drawSource = temp
    }

    ctx.save()

    if (constraints.shadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.35)'
      ctx.shadowBlur = 3
      ctx.shadowOffsetY = 3
    }

    // Drives tilt the icon plane back (-10°) for a wrapped look. Approximate
    // by scaling Y after a 3D-ish transform: skew + vertical squash. The
    // transform moves origin to the icon center, so the draw uses (0,0).
    if (style.kind === 'drive' && style.tilt) {
      const tilt = (style.tilt * Math.PI) / 180
      ctx.translate(x + w / 2, y + h / 2)
      ctx.transform(1, 0, -Math.tan(tilt) * 0.35, Math.cos(tilt), 0, 0)
      ctx.translate(-w / 2, -h / 2)
      ctx.drawImage(drawSource, 0, 0, w, h)
    } else {
      ctx.drawImage(drawSource, x, y, w, h)
    }

    ctx.restore()

    if (DEBUG_FACE) drawDebugFace(ctx, constraints, { x, y, w, h })
  }

  // 3. Text
  drawCenteredText(ctx, config.text, constraints)

  return canvas
}

/** Apply a print mode (recolor / bw / emboss) to a sized icon canvas. */
function applyPrintMode(canvas: HTMLCanvasElement, mode: PrintMode, bodyColor: string): void {
  switch (mode) {
    case 'recolor':
      recolorPixels(canvas, bodyColor)
      break
    case 'bw':
      binarizePixels(canvas)
      break
    case 'emboss':
      embossPixels(canvas, bodyColor)
      break
    default:
      break
  }
}

async function iconSourceToImg(source: IconSource): Promise<HTMLImageElement> {
  if (source.kind === 'preset' || source.kind === 'svg') {
    return svgStringToImg(source.svg)
  }
  return loadImage(source.url)
}

/** Fit an icon of natural (nw, nh) inside the face constraints, honoring the
 * aspect ratio. Returns final draw size in canvas px. */
function fitIcon(
  nw: number,
  nh: number,
  c: FaceConstraints,
  scaleFactor = 1
): { w: number; h: number } {
  const aspect = nw / nh
  let w: number
  let h: number
  if (aspect >= 1) {
    w = Math.min(c.maxWidth, c.preferredSize)
    h = w / aspect
  } else {
    h = Math.min(c.maxHeight, c.preferredSize)
    w = h * aspect
  }
  if (w > c.maxWidth) {
    w = c.maxWidth
    h = w / aspect
  }
  if (h > c.maxHeight) {
    h = c.maxHeight
    w = h * aspect
  }
  // Apply zoom, clamped to the face bounds.
  w = Math.min(c.maxWidth, w * scaleFactor)
  h = w / aspect
  if (h > c.maxHeight) {
    h = c.maxHeight
    w = h * aspect
  }
  return { w, h }
}

function drawCenteredText(
  ctx: CanvasRenderingContext2D,
  text: string,
  c: FaceConstraints
): void {
  const label = text.trim()
  if (!label) return
  let fontSize = 300
  ctx.font = `${fontSize}px Arial`
  while (ctx.measureText(label).width > c.textMaxWidth && fontSize > 24) {
    fontSize -= 4
    ctx.font = `${fontSize}px Arial`
  }
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ffffff'
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.5)'
  ctx.shadowBlur = 8
  ctx.shadowOffsetY = 2
  ctx.fillText(label, SIZE / 2, c.labelBaselineY)
  ctx.restore()
  ctx.textAlign = 'start'
}

function drawDebugFace(
  ctx: CanvasRenderingContext2D,
  c: FaceConstraints,
  icon: { x: number; y: number; w: number; h: number }
): void {
  ctx.save()
  ctx.strokeStyle = 'rgba(255,0,0,0.8)'
  ctx.lineWidth = 4
  ctx.strokeRect(0, c.startY, SIZE, c.faceHeight)
  ctx.strokeStyle = 'rgba(0,255,0,0.8)'
  ctx.strokeRect(icon.x, icon.y, icon.w, icon.h)
  ctx.restore()
}

/** Composable used by LivePreview: takes the visible <canvas> ref and
 * re-renders it (rAF-debounced) whenever the config changes. */
export function useFolderComposition(
  canvasRef: Ref<HTMLCanvasElement | null>,
  config: Ref<ConfigState>
) {
  const rendering = ref(false)
  let rafHandle = 0
  let disposed = false

  async function renderNow() {
    if (!canvasRef.value) return
    rendering.value = true
    try {
      const composed = await renderComposition(config.value)
      const visible = canvasRef.value
      if (!visible || disposed) return
      visible.width = SIZE
      visible.height = SIZE
      const ctx = visible.getContext('2d')
      ctx?.drawImage(composed, 0, 0)
    } finally {
      rendering.value = false
    }
  }

  function schedule() {
    cancelAnimationFrame(rafHandle)
    rafHandle = requestAnimationFrame(() => {
      renderNow()
    })
  }

  watch(config, schedule, { deep: true })
  const stopInit = watch(canvasRef, (el) => {
    if (el) {
      schedule()
      stopInit()
    }
  })

  onUnmounted(() => {
    disposed = true
    cancelAnimationFrame(rafHandle)
  })

  return { canvasRef, rendering, renderNow }
}
