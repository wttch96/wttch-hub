/**
 * 文件说明：将位协议布局绘制为按行排布的 SVG，处理字段拆分、角标和容器范围标记。
 */

// 类 Mermaid packet 的位协议图渲染器，按 32 位一行分页绘制。
//
// 位区间只做【展示】：
// - 每行上方有角标带：0/31 行边缘 + 每个字段边界标出 `[expr]` 标签或绝对位号；
// - 字段（叶子）是纯色块，无色描边，间隙纯白；
// - 容器（包）不画色块，用盒子最后一行正下方的下划线标记，横线 + 名字/范围文字；
// 几何由 [+n]（自字段起始位起 n bit）决定，无 RenderLength 时按位区间绘制。
// 跨行字段自动拆段。行间距（ROW_GAP）为下划线预留空间。

import type { LayoutNode } from './layout.ts'

const PAD = 12
const PAD_TOP = 26
const ROW_BITS = 32
const ROW_H = 34
const PX_PER_BIT = 18
const FIELD_GAP = 5
const END_PS = 8
const LINE_GAP = 16 // 同行多条容器下划线纵向错开
const UL_BASE = 6 // 下划线距容器盒子底部
const UL_LABEL = 18 // 下划线下方文字高度

// 浅色系色板（与 Mermaid packet 接近的观感，深色文字保证双主题可读）。
const PALETTE = [
  '#a8ccf7',
  '#b9e6c3',
  '#fde79a',
  '#d6c4f3',
  '#f6c6de',
  '#a9e0ee',
  '#f6c5c5',
  '#c9d9f2',
  '#d6efb8',
  '#f9d9b0',
]

const TEXT = '#24303f'
const RANGE = '#5a6b7f'

export interface Diagram {
  svg: string
  width: number
  height: number
  bits: number
}

export interface RenderOptions {
  /** 导出用：加白色背景 + 显式尺寸。 */
  export?: boolean
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fitText(s: string, maxW: number, fontSize: number): string {
  const maxChars = Math.floor((maxW - 2) / (fontSize * 0.6))
  if (maxChars <= 0) return ''
  if (s.length <= maxChars) return s
  return s.slice(0, Math.max(1, maxChars - 1)) + '…'
}

function truncateChars(s: string, maxChars: number): string {
  if (maxChars <= 0) return ''
  if (s.length <= maxChars) return s
  return s.slice(0, Math.max(1, maxChars - 1)) + '…'
}

function text(s: string, x: number, y: number, anchor: string, size: number, fill: string, weight?: string): string {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="central" font-size="${size}"${weight ? ` font-weight="${weight}"` : ''} fill="${fill}">${esc(s)}</text>`
}

/** 一个字段在某一行内的可见片段。 */
interface Slice {
  id: string
  label: string
  row: number
  col: number
  span: number
  first: boolean
  last: boolean
  depth: number
  /** true: 容器（有子字段）——不画色块，用下划线标记。 */
  isContainer: boolean
  /** 该段绝对几何起始位（= 字段起始位，首段时）。 */
  rStart: number
  /** 该段绝对几何结束位（= 字段结束位，末段时）。 */
  rEnd: number
  /** 声明标注区间（绝对），用于 tooltip。 */
  start: number
  end: number
  /** [expr] 起始/结束角标标签；null = 顶部角标带显示位号。 */
  startTag: string | null
  endTag: string | null
  colorIndex: number
}

/** DFS：先推入字段自身的所有行切片，再递归子字段。 */
function sliceNode(n: LayoutNode, out: Slice[]): void {
  if (n.rBits <= 0) return
  const rEnd = n.rStart + n.rBits - 1
  const rowFirst = Math.floor(n.rStart / ROW_BITS)
  const rowLast = Math.floor(rEnd / ROW_BITS)
  for (let row = rowFirst; row <= rowLast; row++) {
    const cStart = Math.max(n.rStart, row * ROW_BITS)
    const cEnd = Math.min(rEnd, row * ROW_BITS + ROW_BITS - 1)
    out.push({
      id: n.id,
      label: n.label,
      row,
      col: cStart - row * ROW_BITS,
      span: cEnd - cStart + 1,
      first: row === rowFirst,
      last: row === rowLast,
      depth: n.depth,
      isContainer: n.children.length > 0,
      rStart: cStart,
      rEnd: cEnd,
      start: n.start,
      end: n.end,
      startTag: n.startTag,
      endTag: n.endTag,
      colorIndex: n.colorIndex,
    })
  }
  for (const c of n.children) sliceNode(c, out)
}

function drawSlice(s: Slice, x: number, y: number, w: number, out: string[]): void {
  const cx = x + w / 2
  // 字段名（方框中部；位号角标已移到行的顶部角标带）
  if (w >= 44) {
    const ly = y + ROW_H / 2 + 2
    out.push(text(fitText(s.label, w - 6, 12), cx, ly, 'middle', 12, TEXT, '600'))
  } else if (w >= 12) {
    const cy = y + ROW_H / 2 + 1
    // 竖排字段名：9px 字体，行高 34px 可容纳 3 个字符（URG/ACK/SYN 等）
    const maxChars = Math.max(1, Math.floor((ROW_H - 4) / 9))
    out.push(
      `<text transform="rotate(-90 ${cx} ${cy})" x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="9" fill="${TEXT}">${esc(truncateChars(s.label, maxChars))}</text>`
    )
  }
}

const FONT_FAMILY =
  "-apple-system,BlinkMacSystemFont,'PingFang SC','Segoe UI','Microsoft YaHei',sans-serif"

/** 容器下划线段：容器跨的每一行在其正下方画一段线，覆盖容器所有字段。 */
interface ULine {
  label: string
  depth: number
  row: number
  x1: number
  x2: number
  s: number
  e: number
  first: boolean
  colorIndex: number
}

/** 加深十六进制颜色（f=0 不变，1 变黑），用于下划线等需要对比度的线。 */
function darken(hex: string, f = 0.4): string {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.round(((n >> 16) & 255) * (1 - f))
  const g = Math.round(((n >> 8) & 255) * (1 - f))
  const b = Math.round((n & 255) * (1 - f))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

function collectULines(nodes: LayoutNode[], lineX: number, out: ULine[]): void {
  for (const n of nodes) {
    if (n.children.length > 0 && n.rBits > 0) {
      const rEnd = n.rStart + n.rBits - 1
      const rowFirst = Math.floor(n.rStart / ROW_BITS)
      const rowLast = Math.floor(rEnd / ROW_BITS)
      for (let row = rowFirst; row <= rowLast; row++) {
        const cStart = Math.max(n.rStart, row * ROW_BITS) - row * ROW_BITS
        const cEnd = Math.min(rEnd, row * ROW_BITS + ROW_BITS - 1) - row * ROW_BITS
        out.push({
          label: n.label,
          depth: n.depth,
          row,
          x1: lineX + cStart * PX_PER_BIT,
          x2: lineX + (cEnd + 1) * PX_PER_BIT,
          s: n.start,
          e: n.end,
          first: row === rowFirst,
          colorIndex: n.colorIndex,
        })
      }
    }
    collectULines(n.children, lineX, out)
  }
}

export function renderDiagram(nodes: LayoutNode[], opts?: RenderOptions): Diagram | null {
  const vis = nodes.filter((n) => n.rBits > 0)
  if (vis.length === 0) return null

  let totalBits = 0
  for (const n of vis) totalBits = Math.max(totalBits, n.rStart + n.rBits)
  const rows = Math.max(1, Math.ceil(totalBits / ROW_BITS))
  const lineW = ROW_BITS * PX_PER_BIT
  const lineX = PAD
  const gridW = PAD + lineW + PAD

  const width = gridW

  const slices: Slice[] = []
  for (const n of vis) sliceNode(n, slices)

  // 容器下划线：位于容器盒子最后一行的正下方；同行多条按深度降序（内层在上）。
  // 行间距按同行最大下划线层数放宽，保证下划线 + 下方文字不压到下一行。
  const uLines: ULine[] = []
  collectULines(vis, lineX, uLines)
  const byRowU: ULine[][] = Array.from({ length: rows }, () => [])
  for (const l of uLines) byRowU[l.row].push(l)
  let maxStack = 1
  for (let r = 0; r < rows; r++) {
    // 按水平重叠算实际堆叠层数（不重叠的段共用一个 y 层级）
    const group = byRowU[r].slice().sort((a, b) => b.depth - a.depth)
    const levels: { x1: number; x2: number; y: number }[] = []
    for (const l of group) {
      let k = 0
      for (;;) {
        if (!levels.some((p) => p.y === k && l.x1 < p.x2 && l.x2 > p.x1)) break
        k++
      }
      levels.push({ x1: l.x1, x2: l.x2, y: k })
      if (k + 1 > maxStack) maxStack = k + 1
    }
  }
  const ROW_GAP = Math.max(26, UL_BASE + (maxStack - 1) * LINE_GAP + UL_LABEL)
  const rowY = (r: number) => PAD_TOP + r * (ROW_H + ROW_GAP)
  const gridBottom = rowY(rows - 1) + ROW_H

  const body: string[] = []

  // 字段切片：按 (行, 深度) 排序绘制，深覆盖浅、父先于子（stable sort 保持声明顺序）。
  const byRow: Slice[][] = Array.from({ length: rows }, () => [])
  for (const s of slices) byRow[s.row].push(s)
  for (let r = 0; r < rows; r++) {
    byRow[r].sort((a, b) => a.depth - b.depth)
  }
  for (let r = 0; r < rows; r++) {
    const y = rowY(r)
    for (const s of byRow[r]) {
      if (s.isContainer) continue // 容器不画色块，用下划线标记
      const x = lineX + s.col * PX_PER_BIT
      // 最小 15px：保证 1bit 字段也可见并显示竖排字段名
      const w = Math.max(15, s.span * PX_PER_BIT - FIELD_GAP)
      const color = PALETTE[s.colorIndex % PALETTE.length]
      body.push(`<title>${esc(`${s.label}\nbits ${s.start}-${s.end}`)}</title>`)
      // 无色块描边，间隙纯白
      body.push(`<rect x="${x}" y="${y}" width="${w}" height="${ROW_H}" rx="2" fill="${color}"/>`)
      drawSlice(s, x, y, w, body)
    }
  }

  // 顶部角标带：与每行 0/31 标签同一行，把每个字段的起/止角标（[expr] 标签或绝对位号）
  // 移到行上方：起始角标靠边界右侧，结束角标靠边界左侧；行边缘 0/31 常显，有标签则替换。
  for (let r = 0; r < rows; r++) {
    interface Cand {
      x: number
      text: string
      anchor: 'start' | 'end' | 'middle'
      pri: number // 0=标签（优先） 1=数字
    }
    const cands: Cand[] = [
      { x: lineX, text: String(r * ROW_BITS), anchor: 'start', pri: 1 },
      { x: lineX + lineW, text: String(r * ROW_BITS + ROW_BITS - 1), anchor: 'end', pri: 1 },
    ]
    for (const s of byRow[r]) {
      const sx = lineX + s.col * PX_PER_BIT
      const ex = lineX + (s.col + s.span) * PX_PER_BIT
      if (s.first) cands.push({ x: sx + 2, text: s.startTag ?? String(s.rStart), anchor: 'start', pri: s.startTag ? 0 : 1 })
      else cands.push({ x: sx + 2, text: String(s.rStart), anchor: 'start', pri: 1 })
      if (s.last) cands.push({ x: ex - 2, text: s.endTag ?? String(s.rEnd), anchor: 'end', pri: s.endTag ? 0 : 1 })
      else cands.push({ x: ex - 2, text: String(s.rEnd), anchor: 'end', pri: 1 })
    }
    cands.sort((a, b) => a.x - b.x || a.pri - b.pri)
    const y = rowY(r) - 8
    const placed: { lo: number; hi: number; pri: number; c: Cand }[] = []
    for (const c of cands) {
      const w = c.text.length * 4.8 + 2
      const lo = c.anchor === 'start' ? c.x : c.anchor === 'end' ? c.x - w : c.x - w / 2
      const hi = lo + w
      const clash = placed.find((p) => lo < p.hi - 2 && hi > p.lo + 2)
      if (clash) {
        // 标签（pri 0）替换数字（pri 1），如行边缘 0/31 处的字段标签
        if (c.pri >= clash.pri) continue
        placed.splice(placed.indexOf(clash), 1)
      }
      placed.push({ lo, hi, pri: c.pri, c })
    }
    for (const p of placed) {
      body.push(text(p.c.text, p.c.x, y, p.c.anchor, END_PS, RANGE))
    }
  }

  // 容器下划线：同行按深度降序放置（内层在上），水平重叠则向下错开；线下方标名字/范围
  const ulineY = new Map<ULine, number>()
  for (let r = 0; r < rows; r++) {
    const group = byRowU[r].slice().sort((a, b) => b.depth - a.depth)
    const placed: { x1: number; x2: number; y: number }[] = []
    for (const l of group) {
      let y = rowY(r) + ROW_H + UL_BASE
      for (;;) {
        if (!placed.some((p) => p.y === y && l.x1 < p.x2 && l.x2 > p.x1)) break
        y += LINE_GAP
      }
      placed.push({ x1: l.x1, x2: l.x2, y })
      ulineY.set(l, y)
    }
  }
  for (const l of uLines) {
    const y = ulineY.get(l) ?? 0
    const uc = darken(PALETTE[l.colorIndex % PALETTE.length])
    body.push(`<line x1="${l.x1}" y1="${y}" x2="${l.x2}" y2="${y}" stroke="${uc}" stroke-width="1.6"/>`)
    body.push(`<line x1="${l.x1}" y1="${y - 4}" x2="${l.x1}" y2="${y + 4}" stroke="${uc}" stroke-width="1.4"/>`)
    body.push(`<line x1="${l.x2}" y1="${y - 4}" x2="${l.x2}" y2="${y + 4}" stroke="${uc}" stroke-width="1.4"/>`)
    if (l.first && l.x2 - l.x1 >= 46) {
      body.push(text(`${l.label}  ${l.s}-${l.e}`, l.x1, y + 10, 'start', 9, uc))
    }
  }

  let maxUY = 0
  for (const l of uLines) {
    const y = ulineY.get(l) ?? 0
    if (y + 14 > maxUY) maxUY = y + 14
  }
  const height = Math.max(gridBottom, maxUY) + PAD

  const bg = opts?.export ? `<rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff"/>` : ''
  const sizeAttrs = opts?.export ? ` width="${width}" height="${height}"` : ''
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"${sizeAttrs} font-family="${FONT_FAMILY}">` +
    bg +
    body.join('') +
    '</svg>'

  return { svg, width, height, bits: totalBits }
}
