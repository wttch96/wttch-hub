// Color helpers used by the composer: icon print modes.
import { hexToRgb } from '@/types'

function getCanvas2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  return canvas.getContext('2d', { willReadFrequently: true })
}

/**
 * Recolor every opaque-ish pixel to `color`, forcing alpha to 255.
 * Used by the "跟随模板颜色" print mode.
 */
export function recolorPixels(canvas: HTMLCanvasElement, colorHex: string): void {
  const ctx = getCanvas2d(canvas)
  if (!ctx) return
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const d = img.data
  const { r, g, b } = hexToRgb(colorHex)
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] > 100) {
      d[i] = r
      d[i + 1] = g
      d[i + 2] = b
      d[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
}

/**
 * Convert the icon to black & white: opaque pixels become pure black with
 * full alpha. Used by the "黑白" print mode.
 */
export function binarizePixels(canvas: HTMLCanvasElement): void {
  const ctx = getCanvas2d(canvas)
  if (!ctx) return
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] > 100) {
      d[i] = 0
      d[i + 1] = 0
      d[i + 2] = 0
      d[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
}

/**
 * "钢印" (deboss) mode: an imprint that reads as pressed INTO the surface with
 * a real 3D recess. Distance-to-edge fields drive vertical bevel lighting —
 * the inner wall along the top edge falls into shadow, the inner bottom wall
 * catches light — so the icon looks carved in rather than printed on. The
 * interior wash keeps a hint of the template's hue blended with gray, and the
 * mask comes from the solid core so the boundary stays clean.
 */
export function embossPixels(canvas: HTMLCanvasElement, colorHex: string): void {
  const ctx = getCanvas2d(canvas)
  if (!ctx) return
  const w = canvas.width
  const h = canvas.height
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  const { r, g, b } = hexToRgb(colorHex)

  // Interior ink = the template's darkened hue blended with a neutral gray —
  // keeps a hint of the base color without going flat gray.
  const grayBase = 150
  const blend = 0.4
  const shade = 0.7
  const ir = Math.round(r * shade * blend + grayBase * (1 - blend))
  const ig = Math.round(g * shade * blend + grayBase * (1 - blend))
  const ib = Math.round(b * shade * blend + grayBase * (1 - blend))
  const recessAlpha = 0.32

  // Bevel width (px) and lighting strength for the carved-in look: the inner
  // top wall falls into shadow, the inner bottom wall catches light.
  const BEVEL = 5
  const topShadow = -45
  const bottomLight = 24

  // Solid-core silhouette — ignore faint anti-aliased fringe.
  const mask = new Uint8Array(w * h)
  for (let i = 0; i < d.length; i += 4) {
    mask[i >> 2] = d[i + 3] > 128 ? 1 : 0
  }

  // dUp = distance to the nearest background pixel above (or the image top),
  // dDown = the same below. Two-pass Chamfer with diagonals, capped at BEVEL,
  // so the bevel follows curved edges instead of stair-stepping.
  const dUp = new Int32Array(w * h)
  const dDown = new Int32Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x
      if (!mask[idx]) {
        dUp[idx] = 0
        continue
      }
      if (y === 0) {
        dUp[idx] = 1
        continue
      }
      let m = BEVEL
      if (x > 0) m = Math.min(m, dUp[idx - w - 1])
      m = Math.min(m, dUp[idx - w])
      if (x < w - 1) m = Math.min(m, dUp[idx - w + 1])
      dUp[idx] = Math.min(m, BEVEL - 1) + 1
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const idx = y * w + x
      if (!mask[idx]) {
        dDown[idx] = 0
        continue
      }
      if (y === h - 1) {
        dDown[idx] = 1
        continue
      }
      let m = BEVEL
      if (x > 0) m = Math.min(m, dDown[idx + w - 1])
      m = Math.min(m, dDown[idx + w])
      if (x < w - 1) m = Math.min(m, dDown[idx + w + 1])
      dDown[idx] = Math.min(m, BEVEL - 1) + 1
    }
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x
      if (!mask[idx]) continue
      const i = idx * 4
      // Vertical bevel: fade=1 at the rim, 0 at BEVEL px inward.
      const upFade = 1 - dUp[idx] / BEVEL
      const downFade = 1 - dDown[idx] / BEVEL
      const o = Math.round(topShadow * upFade + bottomLight * downFade)
      d[i] = Math.max(0, Math.min(255, ir + o))
      d[i + 1] = Math.max(0, Math.min(255, ig + o))
      d[i + 2] = Math.max(0, Math.min(255, ib + o))
      d[i + 3] = Math.round(255 * recessAlpha)
    }
  }

  ctx.putImageData(img, 0, 0)
}
