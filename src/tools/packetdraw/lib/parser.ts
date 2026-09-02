// packet 定义 DSL 解析器（ANTLR 生成，语法见 packet.g4）。
//
// 语法要点：
//   <Field> ::= [<renderLen>] <Range> [<renderLen>] ":" <String> [ "{" ... "}" ]
//   <Range> ::= <NUMBER> ["[" <expr> "]"]                  （单 bit 起点）
//             | "+" <NUMBER> ["[" <expr> "]"]              （相对上一同级字段结束位）
//             | <NUMBER> ["[" <expr> "]"] "-" <NUMBER> ["[" <expr> "]"]  （位区间）
//   <renderLen> ::= "[" "+" <NUMBER> "]"
//
// 注释 %%；字符串仅双引号。${...} / # / // / 单引号已移除。[expr] 只作角标文本，
// 不求值——NUMBER 才是实际渲染位位置（见 lib/layout.ts 约定）。

import { BaseErrorListener, CharStream, CommonTokenStream } from 'antlr4ng'
import type { ATNSimulator, RecognitionException, Recognizer, TerminalNode, Token } from 'antlr4ng'

import { packetLexer } from '../antlr/packetLexer.ts'
import { packetParser } from '../antlr/packetParser.ts'
import type {
  BitRangeContext,
  BlockContext,
  DefinitionContext,
  FieldDefContext,
  PlusNumerContext,
  PosLabelContext,
  RangeDefContext,
  StartPosContext,
} from '../antlr/packetParser.ts'

export interface RawField {
  id: string
  label: string
  /** 起始位（+N 形式下为相对上一同级字段结束位的偏移）。 */
  start: number
  /** true: +N 形式，start 为相对上一同级字段结束位的偏移。 */
  startRel: boolean
  /** [expr] 角标文本；null = 显示数字。 */
  startLabel: string | null
  /** 结束位；null = 单 bit 字段。 */
  end: number | null
  /** [expr] 角标文本；null = 显示数字。 */
  endLabel: string | null
  /** 渲染长度 [+n]；null = 按位区间绘制。 */
  renderRel: number | null
  children: RawField[]
}

export interface ParseResult {
  fields: RawField[]
  errors: string[]
}

/** 收集 lexer/parser 错误，格式化为 `第 N 行：...`。 */
class CollectErrors extends BaseErrorListener {
  readonly errors: string[] = []
  override syntaxError<S extends Token, T extends ATNSimulator>(
    _recognizer: Recognizer<T>,
    _offendingSymbol: S | null,
    line: number,
    _column: number,
    msg: string,
    _e: RecognitionException | null,
  ): void {
    this.errors.push(`第 ${line} 行：${msg}`)
  }
}

function intOf(t: TerminalNode | null): number {
  if (!t) return 0
  const v = parseInt(t.getText(), 10)
  return Number.isFinite(v) ? v : 0
}

function tagText(p: PosLabelContext | null): string | null {
  return p ? p.expr().getText() : null
}

function extractRange(
  range: RangeDefContext,
): Pick<RawField, 'start' | 'startRel' | 'end' | 'startLabel' | 'endLabel'> | null {
  const sp: StartPosContext | null = range.startPos()
  if (sp) {
    return { start: intOf(sp.NUMBER()), startRel: false, end: null, startLabel: tagText(sp.posLabel()), endLabel: null }
  }
  const pn: PlusNumerContext | null = range.plusNumer()
  if (pn) {
    return { start: intOf(pn.NUMBER()), startRel: true, end: null, startLabel: tagText(pn.posLabel()), endLabel: null }
  }
  const br: BitRangeContext | null = range.bitRange()
  if (br) {
    const nums = br.NUMBER() // TerminalNode[]（索引重载返回 TerminalNode | null）
    if (nums.length < 2) return null // 错误恢复后缺结束位（如 `16-:`），跳过
    const labels = br.posLabel() // PosLabelContext[]
    return {
      start: intOf(nums[0]),
      startRel: false,
      end: intOf(nums[1]),
      startLabel: tagText(labels[0] ?? null),
      endLabel: tagText(labels[1] ?? null),
    }
  }
  return null
}

/** 递归把 definition 上下文转成 RawField 树，点分 id 计数与原解析器一致。 */
function buildFields(defs: DefinitionContext[], counter: number[], out: RawField[]): void {
  for (const def of defs) {
    const fd: FieldDefContext | null = def.fieldDef()
    const range = fd?.rangeDef()
    const sTok = fd?.STRING()
    // 错误恢复后的残缺节点，跳过
    if (!fd || !range || !sTok) continue
    const id = counter.join('.')
    counter[counter.length - 1]++
    const rangePart = extractRange(range)
    if (!rangePart) continue // 错误恢复后的残缺位区间，跳过
    const rls = fd.renderLen() // RenderLenContext[]：前缀+后缀；取最后一个生效
    const field: RawField = {
      id,
      label: sTok.getText().slice(1, -1),
      ...rangePart,
      renderRel: rls.length > 0 ? parseInt(rls[rls.length - 1].NUMBER().getText(), 10) : null,
      children: [],
    }
    out.push(field)
    const blk: BlockContext | null = def.block()
    if (blk) {
      counter.push(0)
      buildFields(blk.definition(), counter, field.children)
      counter.pop()
    }
  }
}

export function parsePacket(text: string): ParseResult {
  const listener = new CollectErrors()
  const lexer = new packetLexer(CharStream.fromString(text))
  lexer.removeErrorListeners()
  lexer.addErrorListener(listener)
  const parser = new packetParser(new CommonTokenStream(lexer))
  parser.removeErrorListeners()
  parser.addErrorListener(listener)
  const tree = parser.program()
  const fields: RawField[] = []
  buildFields(tree.definition(), [0], fields)
  return { fields, errors: listener.errors }
}
