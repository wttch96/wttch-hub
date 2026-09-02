// SVG helpers: normalize an iconfont SVG (no natural size) so it can be drawn
// onto a canvas at a known size without depending on naturalWidth.

const viewBoxRe = /viewBox\s*=\s*["']([-+]?[\d.]+)[,\s]+([-+]?[\d.]+)[,\s]+([-+]?[\d.]+)[,\s]+([-+]?[\d.]+)["']/

export interface SvgDimensions {
  width: number
  height: number
}

/**
 * Parse the viewBox of an SVG string. Returns null if absent.
 */
export function parseViewBox(svg: string): SvgDimensions | null {
  const m = svg.match(viewBoxRe)
  if (!m) return null
  const [, , , w, h] = m.map(Number)
  return { width: w, height: h }
}

/**
 * Return an SVG string with explicit width/height (in px) injected, so that
 * loading it as an <img> yields a correct natural size. Replaces any existing
 * width/height attributes/style so 1em sizing can't leak in.
 */
export function normalizeSvgSize(svg: string, width: number, height: number): string {
  let out = svg.replace(/\swidth\s*=\s*["'][^"']*["']/gi, '')
  out = out.replace(/\sheight\s*=\s*["'][^"']*["']/gi, '')
  // Drop width/height from a style attribute entirely (iconfont uses style="width:1em;...").
  out = out.replace(/\sstyle\s*=\s*["'][^"']*["']/gi, '')
  // Keep the viewBox — anchor at its origin.
  out = out.replace(/<svg([^>]*)>/, `<svg$1 width="${width}" height="${height}">`)
  return out
}

/**
 * Convert an SVG string to an HTMLImageElement ready for drawImage.
 * Resolves with a fresh Image whose natural size matches the SVG viewBox.
 */
export function svgStringToImg(svg: string, targetWidth = 1024): Promise<HTMLImageElement> {
  const dim = parseViewBox(svg)
  const w = dim?.width ?? targetWidth
  const h = dim?.height ?? targetWidth
  const normalized = normalizeSvgSize(svg, w, h)
  const blob = new Blob([normalized], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('SVG 解析失败'))
    }
    img.src = url
  })
}

/**
 * Load any image URL (data/blob/http) into an HTMLImageElement.
 */
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`图片加载失败: ${url.slice(0, 40)}`))
    img.src = url
  })
}
