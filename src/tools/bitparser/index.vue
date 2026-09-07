<!--
  文件说明：实现十六进制数值解析工具，展示不同数值类型与字节解释方式下的解析结果。
-->

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

type TargetType = 'INTEGER' | 'FLOAT'
type IntegerEncoding = 'UNSIGNED' | 'SIGN_MAGNITUDE' | 'TWOS_COMPLEMENT'

const hexInput = ref('A0B1C2D3')
const endian = ref<'BIG' | 'LITTLE'>('BIG')
const targetType = ref<TargetType>('INTEGER')
const integerEncoding = ref<IntegerEncoding>('TWOS_COMPLEMENT')
const error = ref('')
const showResult = ref(false)
const normalizedHexInput = computed(() => hexInput.value.trim().replace(/^0x/i, ''))
const inputBitLength = computed(() => /^[0-9a-fA-F]+$/.test(normalizedHexInput.value) ? normalizedHexInput.value.length * 4 : 0)
const supportsIeeeFloat = computed(() => inputBitLength.value === 32 || inputBitLength.value === 64)
const types = computed<Array<{ value: TargetType; label: string }>>(() => [
  { value: 'INTEGER', label: '16 → 10 整数转换' },
  ...(inputBitLength.value === 32 ? [{ value: 'FLOAT' as const, label: 'IEEE 754 binary32（float）' }] : []),
  ...(inputBitLength.value === 64 ? [{ value: 'FLOAT' as const, label: 'IEEE 754 binary64（double）' }] : []),
])
watch(supportsIeeeFloat, (supported) => {
  if (!supported && targetType.value === 'FLOAT') targetType.value = 'INTEGER'
})
const integerEncodings: Array<{ value: IntegerEncoding; label: string; shortLabel: string }> = [
  { value: 'UNSIGNED', label: '无符号整数', shortLabel: '无符号' },
  { value: 'SIGN_MAGNITUDE', label: '有符号 · 原码（符号位）', shortLabel: '原码' },
  { value: 'TWOS_COMPLEMENT', label: '有符号 · 二进制补码', shortLabel: '补码' },
]

// ─── helpers ───
function h2bs(hex: string): string {
  // hex → full bit string (no spaces). hex left = bit 0.
  let bits = ''
  for (const ch of hex) bits += parseInt(ch, 16).toString(2).padStart(4, '0')
  return bits
}
function uintFromBits(bits: string): bigint {
  let a = 0n
  for (const c of bits) a = (a << 1n) | BigInt(c === '1' ? 1 : 0)
  return a
}
function formatNumber(value: number): string {
  if (Number.isNaN(value)) return 'NaN'
  if (value === Infinity) return '+Infinity'
  if (value === -Infinity) return '-Infinity'
  if (Object.is(value, -0)) return '-0'
  return Number.isInteger(value) ? value.toString() : value.toPrecision(15).replace(/(?:\.0+|(?<=\..*?)0+)$/, '')
}

// ─── parse state ───
interface Step {
  label: string; hex: string; note: string; color: string
}
const steps = ref<Step[]>([])
const finalVal = ref('')
const finalType = ref('')
interface IntegerDetail { mode: IntegerEncoding; label: string; value: string; formula: string }
interface FloatDetail {
  name: string; signBit: string; exponentBits: string; mantissaBits: string
  exponentRaw: bigint; mantissaRaw: bigint; bias: bigint; classification: string
  exponentValue: string; significand: string; formula: string; value: string
}
const integerDetails = ref<IntegerDetail[]>([])
const selectedIntegerDetail = computed(() => integerDetails.value.find((item) => item.mode === integerEncoding.value))
const selectedIntegerNegative = computed(() => selectedIntegerDetail.value?.value.startsWith('-') ?? false)
const floatDetail = ref<FloatDetail | null>(null)
const interpretedBits = ref('')

function integerTypeName(bitLength: number, encoding: IntegerEncoding): string {
  const names: Record<IntegerEncoding, string> = {
    UNSIGNED: '无符号整数',
    SIGN_MAGNITUDE: '有符号原码',
    TWOS_COMPLEMENT: '有符号二进制补码',
  }
  return `${bitLength} bit · ${names[encoding]}`
}

function buildIntegerDetails(bits: string): IntegerDetail[] {
  const width = bits.length
  const unsigned = uintFromBits(bits)
  const sign = bits[0] === '1' ? 1n : 0n
  const magnitude = uintFromBits(bits.slice(1))
  const signMagnitude = sign ? -magnitude : magnitude
  const twos = sign ? unsigned - (1n << BigInt(width)) : unsigned
  return [
    { mode: 'UNSIGNED', label: '无符号', value: unsigned.toString(), formula: `Σ(bᵢ × 2^(n-1-i)) = ${unsigned}` },
    { mode: 'SIGN_MAGNITUDE', label: '有符号原码', value: signMagnitude.toString(), formula: `S=${sign}，M=${magnitude}，(-1)^S × M = ${signMagnitude}` },
    { mode: 'TWOS_COMPLEMENT', label: '二进制补码', value: twos.toString(), formula: sign ? `U - 2^${width} = ${unsigned} - ${1n << BigInt(width)} = ${twos}` : `符号位为 0，结果 = U = ${unsigned}` },
  ]
}

function buildFloatDetail(bits: string): FloatDetail | null {
  const width = bits.length
  if (width !== 32 && width !== 64) return null
  const exponentWidth = width === 32 ? 8 : 11
  const mantissaWidth = width - exponentWidth - 1
  if (exponentWidth < 2 || mantissaWidth < 1) return null
  const signBit = bits[0]
  const exponentBits = bits.slice(1, 1 + exponentWidth)
  const mantissaBits = bits.slice(1 + exponentWidth)
  const exponentRaw = uintFromBits(exponentBits)
  const mantissaRaw = uintFromBits(mantissaBits)
  const bias = (1n << BigInt(exponentWidth - 1)) - 1n
  const exponentMax = (1n << BigInt(exponentWidth)) - 1n
  const sign = signBit === '1' ? -1 : 1
  const fraction = Number(mantissaRaw) / 2 ** mantissaWidth
  let classification = '规格化数'
  let exponentValue = (exponentRaw - bias).toString()
  let significand = (1 + fraction).toString()
  let value: number
  let formula: string
  if (exponentRaw === 0n && mantissaRaw === 0n) {
    classification = '零'; exponentValue = (1n - bias).toString(); significand = '0'
    value = sign < 0 ? -0 : 0; formula = `(-1)^${signBit} × 0 = ${formatNumber(value)}`
  } else if (exponentRaw === 0n) {
    classification = '非规格化数'; exponentValue = (1n - bias).toString(); significand = fraction.toString()
    value = sign * fraction * 2 ** Number(1n - bias)
    formula = `(-1)^${signBit} × (0 + M/2^${mantissaWidth}) × 2^(1-Bias) = ${formatNumber(value)}`
  } else if (exponentRaw === exponentMax) {
    classification = mantissaRaw === 0n ? '无穷大' : 'NaN'; exponentValue = '全 1（特殊值）'; significand = mantissaRaw === 0n ? '0' : '非 0'
    value = mantissaRaw === 0n ? sign * Infinity : NaN
    formula = mantissaRaw === 0n ? `E 全 1 且 M=0 → ${formatNumber(value)}` : 'E 全 1 且 M≠0 → NaN'
  } else {
    value = sign * (1 + fraction) * 2 ** Number(exponentRaw - bias)
    formula = `(-1)^${signBit} × (1 + ${mantissaRaw}/2^${mantissaWidth}) × 2^(${exponentRaw}-${bias}) = ${formatNumber(value)}`
  }
  const name = width === 32 ? 'IEEE 754 binary32（float）' : 'IEEE 754 binary64（double）'
  return { name, signBit, exponentBits, mantissaBits, exponentRaw, mantissaRaw, bias, classification, exponentValue, significand, formula, value: formatNumber(value) }
}

function parse() {
  error.value = ''; showResult.value = false; steps.value = []; integerDetails.value = []; floatDetail.value = null

  let h = hexInput.value.trim().toUpperCase()
  if (!h) { error.value = '请输入十六进制字符串'; return }
  if (!/^[0-9A-F]+$/.test(h)) { error.value = '包含非法字符'; return }

  // 整个十六进制输入作为一个数值，不截取、不扩展位宽。
  const fbs = h2bs(h)
  if (endian.value === 'LITTLE' && h.length % 2 !== 0) {
    error.value = '小端解析要求十六进制数值由完整字节组成（每字节 2 个 HEX 字符）'
    return
  }
  const doFlip = endian.value === 'LITTLE' && h.length > 2
  const orderedHexValue = doFlip ? h.match(/.{2}/g)!.reverse().join('') : h
  const ordered = doFlip ? h2bs(orderedHexValue) : fbs
  const orderedHex = '0x' + orderedHexValue
  interpretedBits.value = ordered

  steps.value = [{
    label: doFlip ? '小端字节重排' : '数值字节序',
    hex: orderedHex,
    note: doFlip ? `按字节反转：${h.match(/.{2}/g)?.join(' ')} → ${orderedHexValue.match(/.{2}/g)?.join(' ')}` : '按大端数值直接进行十进制解释',
    color: '#db2777',
  }]

  // ── ⑥ final value ──
  if (targetType.value === 'INTEGER') {
    integerDetails.value = buildIntegerDetails(ordered)
    const selected = integerDetails.value.find((item) => item.mode === integerEncoding.value)!
    finalType.value = integerTypeName(ordered.length, integerEncoding.value)
    finalVal.value = selected.value
  } else {
    const detail = buildFloatDetail(ordered)
    if (!detail) { error.value = '浮点布局至少需要 1 个符号位、2 个指数位和 1 个尾数位'; return }
    floatDetail.value = detail; finalType.value = detail.name; finalVal.value = detail.value
  }

  showResult.value = true
  setTimeout(() => document.querySelector('.bp-results')?.scrollIntoView({ behavior: 'smooth' }), 100)
}

const presets = [
  { label: 'int32 补码 -1', hex: 'FFFFFFFF', endian: 'BIG', type: 'INTEGER', encoding: 'TWOS_COMPLEMENT' },
  { label: 'IEEE float π', hex: '40490FDB', endian: 'BIG', type: 'FLOAT', encoding: 'TWOS_COMPLEMENT' },
  { label: 'IEEE double π', hex: '400921FB54442D18', endian: 'BIG', type: 'FLOAT', encoding: 'TWOS_COMPLEMENT' },
  { label: '24 位自定义整数', hex: '80ABCD', endian: 'BIG', type: 'INTEGER', encoding: 'UNSIGNED' },
] as const

function applyPreset(p: typeof presets[number]) {
  hexInput.value = p.hex
  endian.value = p.endian; targetType.value = p.type; integerEncoding.value = p.encoding
  parse()
}
</script>

<template>
  <div class="bp-layout">
    <header class="bp-header"><h1>16 进制数值解析</h1><span class="bp-sub">Hex Value Parser · 整数与 IEEE 754 浮点解析</span></header>

    <!-- Input -->
    <div class="bp-card">
      <div class="bp-row">
        <div class="bp-f bp-f--hex"><label class="bp-field-label"><span>十六进制数值</span><strong :class="{ invalid: !inputBitLength }">{{ inputBitLength || '—' }} bit<span v-if="inputBitLength"> · {{ Math.ceil(inputBitLength / 8) }} byte</span></strong></label><div class="bp-prefix-wrap"><span class="bp-pfx">0x</span><input v-model="hexInput" spellcheck="false" @keyup.enter="parse" /></div></div>
      </div>
      <div class="bp-row bp-row--selectors">
        <div class="bp-f bp-f--endian">
          <label>字节序</label>
          <div class="bp-segmented" role="group" aria-label="字节序">
            <button type="button" :class="{ active: endian === 'BIG' }" :aria-pressed="endian === 'BIG'" @click="endian = 'BIG'">大端</button>
            <button type="button" :class="{ active: endian === 'LITTLE' }" :aria-pressed="endian === 'LITTLE'" @click="endian = 'LITTLE'">小端</button>
          </div>
        </div>
        <div v-if="targetType === 'INTEGER'" class="bp-f bp-f--encoding">
          <label>整数解释</label>
          <div class="bp-segmented bp-segmented--encoding" role="group" aria-label="整数解释">
            <button v-for="item in integerEncodings" :key="item.value" type="button" :class="{ active: integerEncoding === item.value }" :aria-label="item.label" :aria-pressed="integerEncoding === item.value" :title="item.label" @click="integerEncoding = item.value">{{ item.shortLabel }}</button>
          </div>
        </div>
        <div class="bp-f bp-f--target">
          <label>目标类型</label>
          <div class="bp-segmented" role="group" aria-label="目标类型">
            <button v-for="item in types" :key="item.value" type="button" :class="{ active: targetType === item.value }" :aria-pressed="targetType === item.value" @click="targetType = item.value">{{ item.label }}</button>
          </div>
        </div>
        <div class="bp-f bp-f--btn"><label>&nbsp;</label><button class="bp-btn" @click="parse">解析</button></div>
      </div>
      <div class="bp-chips"><span class="bp-chips-label">示例：</span><button v-for="p in presets" :key="p.label" class="bp-chip" @click="applyPreset(p)">{{ p.label }}</button></div>
    </div>

    <div v-if="error" class="bp-err">{{ error }}</div>

    <template v-if="showResult">
      <!-- ① Raw input -->
      <div class="bp-step"><div class="bp-step-hd"><span class="bp-num">①</span> 原始输入</div><div class="bp-step-bd">
        <div class="bp-kv"><span>十六进制</span><code>0x{{ hexInput.trim().toUpperCase() }}</code></div>
        <div class="bp-kv"><span>数值位宽</span><code>{{ inputBitLength }} bit</code> / <b>{{ Math.ceil(inputBitLength / 8) }} 字节</b></div>
        <div class="bp-kv"><span>字节序</span><code>{{ endian === 'BIG' ? '大端' : '小端（按字节重排）' }}</code></div>
        <div class="bp-kv"><span>目标类型</span><code>{{ targetType === 'INTEGER' ? integerEncoding : targetType }}</code></div>
      </div></div>

      <!-- ② Byte order -->
      <div class="bp-steps">
        <div v-for="(s, idx) in steps" :key="idx" class="bp-step" :style="{ borderLeftColor: s.color }">
          <div class="bp-step-hd">
            <span class="bp-num" :style="{ background: s.color }">{{ idx + 2 }}</span>
            {{ s.label }}
          </div>
          <div class="bp-step-bd">
            <div class="bp-kv"><span>HEX</span><code>{{ s.hex }}</code></div>
            <div class="bp-note">{{ s.note }}</div>
          </div>
        </div>
      </div>

      <!-- ③ Type-specific interpretation -->
      <div v-if="targetType === 'INTEGER'" class="bp-step bp-step--interpret">
        <div class="bp-step-hd"><span class="bp-num bg-orange">③</span> HEX → DEC 整数解释</div>
        <div class="bp-step-bd">
          <div class="bp-kv bp-kv--bits">
            <span>有效位模式</span>
            <div v-if="integerEncoding !== 'UNSIGNED'" class="bp-signed-bits">
              <strong class="bp-sign-bit" :class="{ negative: interpretedBits[0] === '1' }">{{ interpretedBits[0] }}</strong>
              <code>{{ interpretedBits.slice(1) }}</code>
              <em :class="{ negative: interpretedBits[0] === '1' }">S={{ interpretedBits[0] }} · {{ interpretedBits[0] === '1' ? '负号 −' : '正号 +' }}</em>
            </div>
            <code v-else>{{ interpretedBits }}</code>
          </div>
          <div class="bp-kv"><span>整数类型</span><code>{{ finalType }}</code></div>
          <div v-if="selectedIntegerDetail" class="bp-interpret-grid bp-interpret-grid--single">
            <article class="selected">
              <header>{{ selectedIntegerDetail.label }}<span>当前选择</span></header>
              <div class="bp-number-with-sign">
                <span v-if="integerEncoding !== 'UNSIGNED'" :class="{ negative: selectedIntegerNegative }">{{ selectedIntegerNegative ? '− 负数' : '+ 正数' }}</span>
                <strong>{{ selectedIntegerDetail.value }}</strong>
              </div>
              <code>{{ selectedIntegerDetail.formula }}</code>
            </article>
          </div>
        </div>
      </div>

      <div v-else-if="targetType === 'FLOAT' && floatDetail" class="bp-step bp-step--interpret">
        <div class="bp-step-hd"><span class="bp-num bg-orange">③</span> IEEE 754 浮点解析</div>
        <div class="bp-step-bd">
          <div class="bp-float-name">{{ floatDetail.name }}</div>
          <div class="bp-float-layout">
            <span class="bp-float-s"><small>S · 符号</small>{{ floatDetail.signBit }}</span>
            <span class="bp-float-e"><small>E · 指数（{{ floatDetail.exponentBits.length }} 位）</small>{{ floatDetail.exponentBits }}</span>
            <span class="bp-float-m"><small>M · 尾数（{{ floatDetail.mantissaBits.length }} 位）</small>{{ floatDetail.mantissaBits }}</span>
          </div>
          <div class="bp-calc-grid">
            <div><span>分类</span><strong>{{ floatDetail.classification }}</strong></div>
            <div><span>原始指数 E</span><strong>{{ floatDetail.exponentRaw }}</strong></div>
            <div><span>Bias</span><strong>2^({{ floatDetail.exponentBits.length }}-1)-1 = {{ floatDetail.bias }}</strong></div>
            <div><span>实际指数</span><strong>{{ floatDetail.exponentValue }}</strong></div>
            <div><span>尾数整数 M</span><strong>{{ floatDetail.mantissaRaw }}</strong></div>
            <div><span>有效数字</span><strong>{{ floatDetail.significand }}</strong></div>
          </div>
          <div class="bp-formula"><span>计算</span><code>{{ floatDetail.formula }}</code></div>
        </div>
      </div>

      <!-- ④ Final -->
      <div class="bp-step bp-step--fin"><div class="bp-step-hd"><span class="bp-num bg-purple">④</span> 十进制结果</div><div class="bp-step-bd">
        <div class="bp-final-type">{{ finalType }}</div>
        <div class="bp-final-val">{{ finalVal }}</div>
      </div></div>
    </template>

    <div v-if="!showResult && !error" class="bp-empty">输入完整十六进制数值，点击「解析」查看计算过程</div>
  </div>
</template>

<style scoped>
/* layout */
.bp-layout { max-width: 900px; margin: 0 auto; padding: 24px 20px 60px; }
.bp-header { text-align: center; margin-bottom: 24px; }
.bp-header h1 { margin: 0; font-size: 26px; font-weight: 700; color: var(--text); }
.bp-sub { font-size: 13px; color: var(--muted); display: block; margin-top: 4px; }

/* input card */
.bp-card { background: var(--panel); border: 1px solid var(--border); border-radius: 14px; padding: 18px 20px; margin-bottom: 16px; }
.bp-row { display: flex; gap: 10px; margin-bottom: 10px; align-items: flex-end; }
.bp-f { display: flex; flex-direction: column; gap: 4px; }
.bp-f--hex { flex: 3; }
.bp-f--num { flex: 1; min-width: 0; }
.bp-f--btn { flex: 0 0 auto; }
.bp-f--wide { flex: 1; }
.bp-f--endian { flex: .7; min-width: 112px; }
.bp-f--encoding { flex: 1.25; min-width: 190px; }
.bp-f--target { flex: 1.4; min-width: 210px; }
.bp-f--hint { min-width: 110px; }
.bp-f--hint code { display: flex; align-items: center; height: 38px; padding: 0 10px; border: 1px solid var(--border); border-radius: 8px; background: var(--accent-weak); color: var(--accent); }
.bp-row--options { padding-top: 2px; }
.bp-f label { font-size: 13px; font-weight: 600; color: var(--text); }
.bp-field-label { display: flex; align-items: center; justify-content: space-between; }
.bp-field-label strong { padding: 2px 7px; border-radius: 5px; background: var(--accent-weak); color: var(--accent); font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 11px; font-weight: 600; }
.bp-field-label strong.invalid { color: var(--muted); }
.bp-f label em { font-style: normal; font-weight: 400; color: var(--muted); font-size: 11px; }
.bp-prefix-wrap { display: flex; height: 38px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
.bp-pfx { background: var(--accent-weak); color: var(--accent); font-family: monospace; font-size: 14px; font-weight: 600; padding: 0 10px; line-height: 38px; border-right: 1px solid var(--border); }
.bp-prefix-wrap input { flex: 1; border: none; padding: 0 10px; font-size: 15px; font-family: monospace; outline: none; background: transparent; color: var(--text); }
.bp-f--num input { height: 38px; border: 1px solid var(--border); border-radius: 8px; padding: 0 10px; font-size: 14px; font-family: monospace; outline: none; background: var(--panel); color: var(--text); }
.bp-prefix-wrap:focus-within, .bp-f--num input:focus { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-weak); }
.bp-segmented { display: flex; min-height: 38px; padding: 3px; border: 1px solid var(--border); border-radius: 9px; background: rgba(0, 0, 0, .045); }
.bp-segmented button { flex: 1; min-width: max-content; padding: 5px 12px; border: 0; border-radius: 6px; background: transparent; color: var(--muted); font-size: 12px; font-weight: 600; cursor: pointer; transition: background .14s, color .14s, box-shadow .14s; }
.bp-segmented button:hover { color: var(--text); }
.bp-segmented button.active { background: var(--panel); box-shadow: 0 1px 4px rgba(0, 0, 0, .12); color: var(--accent); }
.bp-segmented--encoding button { min-width: 0; white-space: nowrap; }
.bp-btn { height: 38px; padding: 0 22px; border: none; border-radius: 8px; background: var(--accent); color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; white-space: nowrap; }
.bp-btn:hover { filter: brightness(1.1); }
.bp-chips { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.bp-chips-label { font-size: 12px; color: var(--muted); }
.bp-chip { border: 1px solid var(--border); background: #fff; border-radius: 999px; padding: 3px 10px; font-size: 12px; font-family: monospace; cursor: pointer; color: var(--text); }
.bp-chip:hover { border-color: var(--accent); color: var(--accent); }

/* error */
.bp-err { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; border-radius: 10px; padding: 12px 16px; margin-bottom: 16px; font-size: 14px; font-weight: 500; }

/* steps */
.bp-step { background: var(--panel); border: 1px solid var(--border); border-left: 4px solid var(--accent); border-radius: 12px; margin-bottom: 12px; overflow: hidden; }
.bp-step--fin { border-left-color: #7c3aed; background: linear-gradient(135deg, #faf5ff, var(--panel) 40%); }
.bp-step-hd { font-size: 14px; font-weight: 700; padding: 12px 16px 0; }
.bp-num { display: inline-block; width: 22px; height: 22px; line-height: 22px; text-align: center; background: var(--accent); color: #fff; border-radius: 5px; font-size: 12px; margin-right: 6px; }
.bg-purple { background: #7c3aed; }
.bg-orange { background: #ea580c; }
.bp-step-bd { padding: 10px 16px 14px; }

.bp-kv { display: flex; gap: 10px; align-items: baseline; margin-bottom: 4px; }
.bp-kv span { font-size: 13px; color: var(--muted); min-width: 80px; flex-shrink: 0; }
.bp-kv code { font-family: monospace; font-size: 14px; background: var(--accent-weak); padding: 1px 6px; border-radius: 3px; }
.bp-kv b { font-size: 14px; }
.bp-kv--bits { align-items: center; }
.bp-signed-bits { display: flex; flex-wrap: wrap; align-items: center; gap: 0; min-width: 0; }
.bp-signed-bits .bp-sign-bit { padding: 2px 7px; border: 1px solid #34c759; border-radius: 4px 0 0 4px; background: rgba(52, 199, 89, .12); color: #248a3d; font-family: monospace; font-size: 14px; }
.bp-signed-bits .bp-sign-bit.negative { border-color: #ff375f; background: rgba(255, 55, 95, .12); color: #d70015; }
.bp-signed-bits code { border-radius: 0 3px 3px 0; }
.bp-signed-bits em { margin-left: 8px; color: #248a3d; font-size: 12px; font-style: normal; font-weight: 700; white-space: nowrap; }
.bp-signed-bits em.negative { color: #d70015; }

.bp-note { font-size: 12px; color: var(--muted); margin-top: 6px; }

/* ② binary view */
.bp-bin-full { font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 14px; color: var(--text); letter-spacing: 0.05em; word-break: break-all; margin-bottom: 12px; line-height: 1.6; }
.bp-bit-map { overflow-x: auto; padding-bottom: 4px; }
.bp-bit-r { display: flex; font-family: monospace; font-size: 12px; line-height: 2; }
.bp-bit-rl { color: var(--muted); font-size: 10px; min-width: 36px; text-align: right; padding-right: 8px; flex-shrink: 0; font-weight: 600; }
.bp-bit-r--pos .bp-bit-c { width: 22px; text-align: center; color: #9ca3af; font-size: 9px; }
.bp-bit-r--bin .bp-bit-c { width: 22px; text-align: center; color: var(--text); font-weight: 500; font-size: 13px; }
.bp-bit-r--mk .bp-bit-c { width: 22px; text-align: center; color: #d1d5db; font-size: 11px; }
.bp-bit-c.hl { color: var(--accent); font-weight: 700; }
.bp-bit-c.mk { color: #7c3aed; font-weight: 700; }
.bp-mark-label { margin-top: 8px; font-size: 12px; color: #7c3aed; font-weight: 600; font-family: monospace; }

/* ③④⑤ bit blocks */
.bp-steps { display: flex; flex-direction: column; gap: 12px; }
.bp-bitblock { font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 18px; font-weight: 700; letter-spacing: 0.08em; word-break: break-all; padding: 10px 14px; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 8px; line-height: 1.5; }
.bp-bit-pad { color: #9ca3af; font-weight: 400; }

/* ⑥ integer / floating-point interpretation */
.bp-step--interpret { border-left-color: #ea580c; }
.bp-interpret-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 12px; }
.bp-interpret-grid--single { grid-template-columns: minmax(0, 1fr); }
.bp-interpret-grid article { display: flex; flex-direction: column; gap: 8px; min-width: 0; padding: 12px; border: 1px solid var(--border); border-radius: 9px; background: rgba(255, 255, 255, .45); }
.bp-interpret-grid article.selected { border-color: #ea580c; background: rgba(234, 88, 12, .07); box-shadow: 0 0 0 1px rgba(234, 88, 12, .12); }
.bp-interpret-grid header { display: flex; align-items: center; justify-content: space-between; color: var(--muted); font-size: 12px; }
.bp-interpret-grid header span { padding: 2px 5px; border-radius: 4px; background: #ea580c; color: #fff; font-size: 9px; }
.bp-interpret-grid strong { color: var(--text); font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 20px; word-break: break-all; }
.bp-number-with-sign { display: flex; align-items: center; gap: 9px; }
.bp-number-with-sign > span { flex: 0 0 auto; padding: 4px 8px; border-radius: 6px; background: rgba(52, 199, 89, .12); color: #248a3d; font-size: 11px; font-weight: 800; }
.bp-number-with-sign > span.negative { background: rgba(255, 55, 95, .12); color: #d70015; }
.bp-interpret-grid code { color: var(--muted); font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 11px; line-height: 1.45; white-space: normal; word-break: break-all; }
.bp-float-name { margin-bottom: 12px; color: #ea580c; font-size: 14px; font-weight: 700; }
.bp-float-layout { display: flex; overflow-x: auto; margin-bottom: 14px; font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 16px; font-weight: 700; }
.bp-float-layout > span { display: flex; flex-direction: column; gap: 5px; min-width: max-content; padding: 9px 11px; border: 1px solid var(--border); word-break: break-all; }
.bp-float-layout > span:first-child { border-radius: 8px 0 0 8px; }
.bp-float-layout > span:last-child { flex: 1; border-radius: 0 8px 8px 0; }
.bp-float-layout small { font-family: inherit; font-size: 10px; font-weight: 500; }
.bp-float-s { background: rgba(219, 39, 119, .08); color: #db2777; }
.bp-float-e { background: rgba(124, 58, 237, .08); color: #7c3aed; }
.bp-float-m { background: rgba(22, 163, 74, .08); color: #16a34a; }
.bp-calc-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.bp-calc-grid > div { display: flex; flex-direction: column; gap: 4px; padding: 9px 10px; border-radius: 7px; background: var(--accent-weak); }
.bp-calc-grid span, .bp-formula span { color: var(--muted); font-size: 10px; }
.bp-calc-grid strong { font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 12px; word-break: break-all; }
.bp-formula { display: flex; flex-direction: column; gap: 5px; margin-top: 10px; padding: 11px; border: 1px solid rgba(234, 88, 12, .2); border-radius: 8px; background: rgba(234, 88, 12, .06); }
.bp-formula code { color: var(--text); font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 13px; line-height: 1.55; white-space: normal; word-break: break-all; }

/* ⑥ */
.bp-final-type { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; }
.bp-final-val { font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 30px; font-weight: 800; color: #7c3aed; word-break: break-all; }

.bp-empty { text-align: center; color: var(--muted); padding: 60px 0; font-size: 15px; }

@media (max-width: 680px) {
  .bp-row { flex-wrap: wrap; }
  .bp-f--hex, .bp-f--num { flex: 1 1 100%; }
  .bp-f--wide { flex: 1 1 100%; }
  .bp-f--endian, .bp-f--encoding, .bp-f--target { flex: 1 1 100%; min-width: 0; }
  .bp-segmented { overflow-x: auto; }
  .bp-bit-r { font-size: 9px; }
  .bp-bit-r .bp-bit-c { width: 16px; }
  .bp-bitblock { font-size: 14px; }
  .bp-final-val { font-size: 22px; }
  .bp-interpret-grid, .bp-calc-grid { grid-template-columns: 1fr; }
}
</style>
