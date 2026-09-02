<script setup lang="ts">
import { ref } from 'vue'

const hexInput = ref('A0B1C2D3')
const startBit = ref(4)
const endBit = ref(19)
const endian = ref<'BIG' | 'LITTLE'>('LITTLE')
const targetType = ref<'INT' | 'BOOL' | 'LONG' | 'FLOAT' | 'DOUBLE'>('INT')
const error = ref('')
const showResult = ref(false)
const types = ['INT', 'BOOL', 'LONG', 'FLOAT', 'DOUBLE'] as const

// ─── helpers ───
function h2bs(hex: string): string {
  // hex → full bit string (no spaces). hex left = bit 0.
  let bits = ''
  for (const ch of hex) bits += parseInt(ch, 16).toString(2).padStart(4, '0')
  return bits
}
function bs2hex(bits: string): string {
  let s = bits
  const rem = s.length % 4
  if (rem) s = '0'.repeat(4 - rem) + s
  let h = ''
  for (let i = 0; i < s.length; i += 4) h += parseInt(s.slice(i, i + 4), 2).toString(16)
  return h.toUpperCase()
}
function spaced8(bits: string): string {
  const s = bits.length % 8 === 0 ? bits : bits.padStart(Math.ceil(bits.length / 8) * 8, '0')
  const p: string[] = []
  for (let i = 0; i < s.length; i += 8) p.push(s.slice(i, i + 8))
  return p.join(' ')
}
function uintFromBits(bits: string): bigint {
  let a = 0n
  for (const c of bits) a = (a << 1n) | BigInt(c === '1' ? 1 : 0)
  return a
}
function signedFromBits(bits: string): bigint {
  const u = uintFromBits(bits)
  if (bits.length && bits[0] === '1') return u - (1n << BigInt(bits.length))
  return u
}
function float32(bits: string): number {
  const b = bits.padStart(32, '0'), v = uintFromBits(b)
  const buf = new ArrayBuffer(4); new DataView(buf).setUint32(0, Number(v), false)
  return new DataView(buf).getFloat32(0, false)
}
function float64(bits: string): number {
  const b = bits.padStart(64, '0'), v = uintFromBits(b)
  const buf = new ArrayBuffer(8); new DataView(buf).setBigUint64(0, v, false)
  return new DataView(buf).getFloat64(0, false)
}

// ─── parse state ───
interface Step {
  label: string; rawBits: string; hex: string; note: string; color: string
  padCount: number   // how many leading chars are padding (0 = none)
}
const steps = ref<Step[]>([])
const viewBits = ref('')       // step ②: spaced-8 of full binary
const fullBitsStr = ref('')    // full bit string (no spaces)
const positions = ref<number[]>([])
const posBits = ref<string[]>([])
const posMarkers = ref<string[]>([])
const coverFrom = ref(0)
const coverTo = ref(0)
const extracted = ref('')       // step ④ raw
const extractedHex = ref('')
const finalVal = ref('')
const finalType = ref('')

function parse() {
  error.value = ''; showResult.value = false; steps.value = []

  let h = hexInput.value.trim().toUpperCase()
  if (!h) { error.value = '请输入十六进制字符串'; return }
  if (!/^[0-9A-F]+$/.test(h)) { error.value = '包含非法字符'; return }

  const st = startBit.value, ed = endBit.value
  if (st < 0 || ed < 0) { error.value = '起止位不能为负数'; return }
  if (st > ed) { error.value = '起始位不能大于结束位'; return }
  const totalBits = h.length * 4
  if (ed >= totalBits) { error.value = `结束位 ${ed} 超出范围 (0-${totalBits - 1})`; return }

  // ── ① full binary string (bit 0 = leftmost) ──
  const fbs = h2bs(h)
  fullBitsStr.value = fbs
  viewBits.value = spaced8(fbs)

  // ── ② extract raw bits directly ──
  const rawBits = fbs.slice(st, ed + 1)
  extracted.value = rawBits
  extractedHex.value = '0x' + bs2hex(rawBits)

  // ── ③ build visual mapping for covered bits ──
  const covFrom = Math.floor(st / 8) * 8
  const covTo = Math.min(Math.ceil((ed + 1) / 8) * 8, totalBits) - 1
  coverFrom.value = covFrom; coverTo.value = covTo
  const pl: number[] = [], pb: string[] = [], pm: string[] = []
  for (let i = covFrom; i <= covTo; i++) {
    pl.push(i)
    pb.push(fbs[i])
    if (i === st) pm.push('[')
    else if (i === ed) pm.push(']')
    else if (i > st && i < ed) pm.push('=')
    else pm.push(' ')
  }
  positions.value = pl; posBits.value = pb; posMarkers.value = pm

  // ── ④ endian flip FIRST (on raw extracted bits) ──
  const doFlip = endian.value === 'LITTLE'
  const flipped = doFlip ? rawBits.split('').reverse().join('') : rawBits
  const flippedHex = '0x' + bs2hex(flipped)

  // ── ⑤ THEN pad to whole bytes after flip ──
  const padLen = flipped.length % 8 === 0 ? 0 : 8 - (flipped.length % 8)
  const padded = '0'.repeat(padLen) + flipped
  const paddedHex = '0x' + bs2hex(padded)

  // build step cards for ③ ④ ⑤
  const newSteps: Step[] = []

  // ③ raw extract
  newSteps.push({
    label: '③ 按位提取',
    rawBits,
    hex: '0x' + bs2hex(rawBits),
    note: `从原始位串 [${st}, ${ed}] 截取 ${rawBits.length} 位`,
    color: '#2563eb',
    padCount: 0,
  })

  // ④ after endian flip (if applicable)
  if (doFlip) {
    newSteps.push({
      label: '④ 大小端翻转',
      rawBits: flipped,
      hex: flippedHex,
      note: '小端模式：将整个位串反转（位 0 ↔ 位 N-1）',
      color: '#db2777',
      padCount: 0,
    })
  } else {
    newSteps.push({
      label: '④ 大小端 跳过',
      rawBits: flipped,
      hex: flippedHex,
      note: '大端模式：位串保持原序',
      color: '#7c3aed',
      padCount: 0,
    })
  }

  // ⑤ pad to byte
  if (padLen > 0) {
    newSteps.push({
      label: '⑤ 补齐整字节',
      rawBits: padded,
      hex: paddedHex,
      note: `MSB 补 ${padLen} 个 0 到整字节（${padded.length} 位 = ${padded.length / 8} 字节）`,
      color: '#16a34a',
      padCount: padLen,
    })
  } else {
    newSteps.push({
      label: '⑤ 补齐 跳过',
      rawBits: padded,
      hex: paddedHex,
      note: `已是整字节（${padded.length} 位 = ${padded.length / 8} 字节），无需补齐`,
      color: '#16a34a',
      padCount: 0,
    })
  }

  steps.value = newSteps

  // ── ⑥ final value ──
  finalType.value = targetType.value
  const u = uintFromBits(padded)
  if (targetType.value === 'BOOL') finalVal.value = u !== 0n ? 'True' : 'False'
  else if (targetType.value === 'INT') finalVal.value = signedFromBits(padded).toString()
  else if (targetType.value === 'LONG') finalVal.value = u.toString()
  else if (targetType.value === 'FLOAT') finalVal.value = float32(padded).toFixed(6)
  else if (targetType.value === 'DOUBLE') finalVal.value = float64(padded).toFixed(6)

  showResult.value = true
  setTimeout(() => document.querySelector('.bp-results')?.scrollIntoView({ behavior: 'smooth' }), 100)
}

const presets = [
  { label: 'INT 测试', hex: 'A0B1C2D3', start: 4, end: 19, endian: 'LITTLE', type: 'INT' },
  { label: 'PI FLOAT', hex: '40490FDB', start: 0, end: 31, endian: 'BIG', type: 'FLOAT' },
  { label: 'BOOL', hex: '80', start: 7, end: 7, endian: 'BIG', type: 'BOOL' },
  { label: 'HEX 高位', hex: 'DEADBEEF', start: 16, end: 31, endian: 'BIG', type: 'INT' },
] as const

function applyPreset(p: typeof presets[number]) {
  hexInput.value = p.hex; startBit.value = p.start; endBit.value = p.end
  endian.value = p.endian; targetType.value = p.type
  parse()
}
</script>

<template>
  <div class="bp-layout">
    <header class="bp-header"><h1>位段解析器</h1><span class="bp-sub">Bit-field Parser · 逐步骤可视化</span></header>

    <!-- Input -->
    <div class="bp-card">
      <div class="bp-row">
        <div class="bp-f bp-f--hex"><label>十六进制</label><div class="bp-prefix-wrap"><span class="bp-pfx">0x</span><input v-model="hexInput" spellcheck="false" @keyup.enter="parse" /></div></div>
        <div class="bp-f bp-f--num"><label>起始位 <em>(0=最左)</em></label><input v-model.number="startBit" type="number" min="0" @keyup.enter="parse" /></div>
        <div class="bp-f bp-f--num"><label>结束位 <em>(含)</em></label><input v-model.number="endBit" type="number" min="0" @keyup.enter="parse" /></div>
      </div>
      <div class="bp-row">
        <div class="bp-f"><label>字节序</label><select v-model="endian"><option value="BIG">大端 Big-Endian</option><option value="LITTLE">小端 Little-Endian</option></select></div>
        <div class="bp-f"><label>目标类型</label><select v-model="targetType"><option v-for="t in types" :key="t" :value="t">{{ t }}</option></select></div>
        <div class="bp-f bp-f--btn"><label>&nbsp;</label><button class="bp-btn" @click="parse">解析</button></div>
      </div>
      <div class="bp-chips"><span class="bp-chips-label">示例：</span><button v-for="p in presets" :key="p.label" class="bp-chip" @click="applyPreset(p)">{{ p.label }}</button></div>
    </div>

    <div v-if="error" class="bp-err">{{ error }}</div>

    <template v-if="showResult">
      <!-- ① Raw input -->
      <div class="bp-step"><div class="bp-step-hd"><span class="bp-num">①</span> 原始输入</div><div class="bp-step-bd">
        <div class="bp-kv"><span>十六进制</span><code>0x{{ hexInput.trim().toUpperCase() }}</code></div>
        <div class="bp-kv"><span>位段范围</span><code>[{{ startBit }}, {{ endBit }}]</code> 共 <b>{{ endBit - startBit + 1 }}</b> 位</div>
        <div class="bp-kv"><span>字节序</span><code>{{ endian === 'BIG' ? '大端' : '小端 (位串反转)' }}</code></div>
        <div class="bp-kv"><span>目标类型</span><code>{{ targetType }}</code></div>
      </div></div>

      <!-- ② Full binary view with bit markers -->
      <div class="bp-step"><div class="bp-step-hd"><span class="bp-num">②</span> 原始二进制展开（bit 0 = 最左）</div><div class="bp-step-bd">
        <div class="bp-bin-full">{{ viewBits }}</div>
        <div class="bp-bit-map">
          <div class="bp-bit-r bp-bit-r--pos"><span class="bp-bit-rl">位序</span><span v-for="(p, i) in positions" :key="i" class="bp-bit-c" :class="{ hl: p >= startBit && p <= endBit }">{{ p }}</span></div>
          <div class="bp-bit-r bp-bit-r--bin"><span class="bp-bit-rl">位</span><span v-for="(b, i) in posBits" :key="i" class="bp-bit-c" :class="{ hl: posMarkers[i] !== ' ' }">{{ b }}</span></div>
          <div class="bp-bit-r bp-bit-r--mk"><span class="bp-bit-rl">标记</span><span v-for="(m, i) in posMarkers" :key="i" class="bp-bit-c" :class="{ mk: m !== ' ' }">{{ m === '[' ? '┌' : m === ']' ? '┘' : m === '=' ? '─' : ' ' }}</span></div>
        </div>
        <div class="bp-mark-label">位段 [{{ startBit }}, {{ endBit }}] · {{ endBit - startBit + 1 }} 位</div>
      </div></div>

      <!-- Steps ③④⑤ displayed in horizontal flow -->
      <div class="bp-steps">
        <div v-for="(s, idx) in steps" :key="idx" class="bp-step" :style="{ borderLeftColor: s.color }">
          <div class="bp-step-hd">
            <span class="bp-num" :style="{ background: s.color }">{{ idx + 3 }}</span>
            {{ s.label }}
          </div>
          <div class="bp-step-bd">
            <div class="bp-bitblock" :style="{ borderColor: s.color }">
              <template v-if="s.padCount > 0">
                <span class="bp-bit-pad">{{ s.rawBits.slice(0, s.padCount) }}</span><span class="bp-bit-body">{{ s.rawBits.slice(s.padCount) }}</span>
              </template>
              <template v-else>{{ s.rawBits }}</template>
            </div>
            <div class="bp-kv"><span>HEX</span><code>{{ s.hex }}</code></div>
            <div class="bp-note">{{ s.note }}</div>
          </div>
        </div>
      </div>

      <!-- ⑥ Final -->
      <div class="bp-step bp-step--fin"><div class="bp-step-hd"><span class="bp-num bg-purple">⑥</span> 最终结果</div><div class="bp-step-bd">
        <div class="bp-final-type">{{ finalType }}</div>
        <div class="bp-final-val">{{ finalVal }}</div>
      </div></div>
    </template>

    <div v-if="!showResult && !error" class="bp-empty">输入十六进制值，点击「解析」查看逐步骤解析过程</div>
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
.bp-f label { font-size: 13px; font-weight: 600; color: var(--text); }
.bp-f label em { font-style: normal; font-weight: 400; color: var(--muted); font-size: 11px; }
.bp-prefix-wrap { display: flex; height: 38px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
.bp-pfx { background: var(--accent-weak); color: var(--accent); font-family: monospace; font-size: 14px; font-weight: 600; padding: 0 10px; line-height: 38px; border-right: 1px solid var(--border); }
.bp-prefix-wrap input { flex: 1; border: none; padding: 0 10px; font-size: 15px; font-family: monospace; outline: none; background: transparent; color: var(--text); }
.bp-f--num input, .bp-f select { height: 38px; border: 1px solid var(--border); border-radius: 8px; padding: 0 10px; font-size: 14px; font-family: monospace; outline: none; background: var(--panel); color: var(--text); }
.bp-prefix-wrap:focus-within, .bp-f--num input:focus, .bp-f select:focus { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-weak); }
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
.bp-step-bd { padding: 10px 16px 14px; }

.bp-kv { display: flex; gap: 10px; align-items: baseline; margin-bottom: 4px; }
.bp-kv span { font-size: 13px; color: var(--muted); min-width: 80px; flex-shrink: 0; }
.bp-kv code { font-family: monospace; font-size: 14px; background: var(--accent-weak); padding: 1px 6px; border-radius: 3px; }
.bp-kv b { font-size: 14px; }

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

/* ⑥ */
.bp-final-type { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; }
.bp-final-val { font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 30px; font-weight: 800; color: #7c3aed; word-break: break-all; }

.bp-empty { text-align: center; color: var(--muted); padding: 60px 0; font-size: 15px; }

@media (max-width: 680px) {
  .bp-row { flex-wrap: wrap; }
  .bp-f--hex, .bp-f--num { flex: 1 1 100%; }
  .bp-bit-r { font-size: 9px; }
  .bp-bit-r .bp-bit-c { width: 16px; }
  .bp-bitblock { font-size: 14px; }
  .bp-final-val { font-size: 22px; }
}
</style>
