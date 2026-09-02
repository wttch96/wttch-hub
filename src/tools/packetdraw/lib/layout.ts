// 将解析后的字段树解析为布局节点。
//
// 约定：
// - 位区间（start/end）只做【展示】：方框两端标注其显示文本（[expr] 角标标签或数字），
//   容器下划线横跨它，不直接决定绘制几何；
// - 几何（rStart/rBits）由渲染长度决定：
//     * [+n]：从位区间起始位起，绘制宽度 n bit；
//     * 无渲染长度：按位区间本身绘制；
// - 子字段的位置相对父块起始位；容器自动扩展到覆盖子字段的几何区间；
// - +N 形式（startRel）：起始位 = 上一同级字段结束位 + N（即 absStart = prevEnd + N）。

import type { RawField } from './parser.ts'

export interface LayoutNode {
  id: string
  label: string
  /** 标注起始位（绝对，相对包起点 0）。 */
  start: number
  /** 标注结束位（绝对；可能 < start，表示空字段）。 */
  end: number
  /** [expr] 起始角标标签；null = 顶部角标带显示位号。 */
  startTag: string | null
  /** [expr] 结束角标标签；null = 顶部角标带显示位号。 */
  endTag: string | null
  /** 几何起始位（绝对），决定方框绘制位置。 */
  rStart: number
  /** 几何宽度（bit 数），决定方框绘制长度。 */
  rBits: number
  depth: number
  children: LayoutNode[]
  colorIndex: number
}

export interface ResolveResult {
  nodes: LayoutNode[]
  errors: string[]
}

function resolveNode(
  raw: RawField,
  parentOffset: number,
  depth: number,
  colorIndex: number,
  prevEnd: number | null, // 上一同级字段的绝对结束位（用于 +N）；null = 无
  errors: string[]
): LayoutNode | null {
  let relStart: number
  if (raw.startRel) {
    if (prevEnd === null) {
      errors.push(`字段 "${raw.label}"："+${raw.start}" 前面没有同级字段，无法确定起始位`)
      return null
    }
    relStart = prevEnd - parentOffset + raw.start
  } else {
    relStart = raw.start
  }
  const absStart = parentOffset + relStart
  const relEnd = raw.end

  const children: LayoutNode[] = []
  let childPrevEnd: number | null = null
  for (let i = 0; i < raw.children.length; i++) {
    const c = resolveNode(raw.children[i], absStart, depth + 1, i, childPrevEnd, errors)
    if (c) {
      children.push(c)
      childPrevEnd = c.end
    }
  }

  // 标注区间（绝对）：仅用于两端标注与容器下划线。
  let absEnd: number
  if (relEnd !== null) absEnd = parentOffset + relEnd
  else if (children.length > 0) {
    absEnd = absStart - 1
    for (const c of children) if (c.end > absEnd) absEnd = c.end
  } else {
    absEnd = absStart // 单 bit 字段
  }

  // 几何区间：渲染长度决定位置与宽度，位区间只做标注。
  let rStart = absStart
  let rBits: number
  if (raw.renderRel !== null) {
    rBits = raw.renderRel
  } else {
    rBits = Math.max(0, absEnd - absStart + 1)
  }

  // 容器扩展到覆盖子字段的几何区间
  if (children.length > 0) {
    let maxEnd = rStart + rBits - 1
    let minStart = rStart
    for (const c of children) {
      const ce = c.rStart + c.rBits - 1
      if (ce > maxEnd) maxEnd = ce
      if (c.rStart < minStart) minStart = c.rStart
    }
    rBits = Math.max(1, maxEnd - minStart + 1)
    rStart = minStart
  }

  return {
    id: raw.id,
    label: raw.label,
    start: absStart,
    end: absEnd,
    startTag: raw.startLabel,
    endTag: raw.endLabel,
    rStart,
    rBits,
    depth,
    children,
    colorIndex,
  }
}

export function resolvePacket(fields: RawField[]): ResolveResult {
  const errors: string[] = []
  const nodes: LayoutNode[] = []
  let prevEnd: number | null = null
  for (let i = 0; i < fields.length; i++) {
    const n = resolveNode(fields[i], 0, 0, i, prevEnd, errors)
    if (n) {
      nodes.push(n)
      prevEnd = n.end
    }
  }
  return { nodes, errors }
}
