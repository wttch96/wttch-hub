<script setup lang="ts">
import { ref, computed } from 'vue'

type Radix = 2 | 8 | 10 | 16

const input = ref('255')
const fromRadix = ref<Radix>(10)

const radices: { r: Radix; label: string }[] = [
  { r: 2, label: 'BIN' },
  { r: 8, label: 'OCT' },
  { r: 10, label: 'DEC' },
  { r: 16, label: 'HEX' },
]

function isValidForRadix(s: string, radix: Radix): boolean {
  if (s === '') return true
  const patterns: Record<Radix, RegExp> = {
    2: /^[01]+$/,
    8: /^[0-7]+$/,
    10: /^\d+$/,
    16: /^[0-9a-fA-F]+$/,
  }
  return patterns[radix].test(s)
}

const inputError = computed(() => {
  if (input.value === '') return ''
  if (!isValidForRadix(input.value, fromRadix.value)) {
    const labels: Record<Radix, string> = { 2: '0-1', 8: '0-7', 10: '0-9', 16: '0-9, A-F' }
    return `"${input.value}" 不是有效的${fromRadix.value}进制数（应为 ${labels[fromRadix.value]}）`
  }
  return ''
})

function safeParse(s: string, radix: Radix): bigint | null {
  if (s === '' || !isValidForRadix(s, radix)) return null
  try {
    if (radix === 16) return BigInt('0x' + s)
    if (radix === 10) return BigInt(s)
    if (radix === 8) {
      let acc = 0n
      for (const ch of s) acc = acc * 8n + BigInt(parseInt(ch, 8))
      return acc
    }
    if (radix === 2) {
      let acc = 0n
      for (const ch of s) acc = acc * 2n + BigInt(parseInt(ch, 2))
      return acc
    }
  } catch {
    return null
  }
  return null
}

const decimalValue = computed(() => safeParse(input.value, fromRadix.value))

const outputs = computed(() => {
  const val = decimalValue.value
  if (val === null) return { bin: '', oct: '', dec: '', hex: '' }
  return {
    bin: val.toString(2),
    oct: val.toString(8),
    dec: val.toString(10),
    hex: val.toString(16).toUpperCase(),
  }
})

// prettier-ignore
const grouped = computed(() => {
  const o = outputs.value
  if (!o.bin) return { bin: [] as string[], oct: [] as string[], dec: [] as string[], hex: [] as string[] }

  function groupFromRight(s: string, n: number): string[] {
    const parts: string[] = []
    let i = s.length
    while (i > 0) {
      const start = Math.max(0, i - n)
      parts.unshift(s.slice(start, i))
      i = start
    }
    return parts
  }

  // HEX: groups of 2 chars = 8 bits  → 1 hex byte
  // BIN: groups of 8 bits             → 1 hex byte
  // OCT: groups of 3 digits           → 1 digit ≈ 3 bits (no direct hex byte mapping, keep per-digit)
  // DEC: no grouping
  return {
    bin:  groupFromRight(o.bin, 8),
    oct:  groupFromRight(o.oct, 1),
    dec:  groupFromRight(o.dec, 3),
    hex:  groupFromRight(o.hex, 2),
  }
})

// color palette — consistent across bases: same position → same color
const groupColors = ['#2563eb', '#7c3aed', '#db2777', '#16a34a', '#ea580c', '#0891b2']
function groupColor(idx: number, total: number): string {
  // align from right: reverse index so corresponding groups share color across bases
  return groupColors[(total - 1 - idx) % groupColors.length]
}

// locale-formatted decimal with grouping
const localeDecimal = computed(() => {
  const val = decimalValue.value
  if (val === null) return ''
  // BigInt to locale string with 3-digit grouping
  const s = val.toString(10)
  const parts = grouped.value.dec
  if (parts.length < 2) return s
  return parts.join(',')
})

// bit count info
const bitInfo = computed(() => {
  const val = decimalValue.value
  if (val === null) return null
  const bin = val.toString(2)
  const leadingZeros = bin.length - bin.replace(/^0+/, '').length
  return {
    bits: bin.length,
    // exclude leading zeros for "significant bits"
    sigBits: bin.length - leadingZeros || 1,
    hexDigits: Math.ceil(bin.length / 4),
  }
})

function setInput(newInput: string, radix: Radix) {
  fromRadix.value = radix
  input.value = newInput
}

function quickPad(targetLength: number) {
  const val = decimalValue.value
  if (val === null) return
  const bin = val.toString(2)
  if (bin.length < targetLength) {
    input.value = bin.padStart(targetLength, '0')
    fromRadix.value = 2
  }
}

const showBitOps = ref(false)
const bitMask = ref(0n)
const bitResult = computed(() => {
  const val = decimalValue.value
  if (val === null) return null
  return { and: val & bitMask.value, or: val | bitMask.value, xor: val ^ bitMask.value }
})
</script>

<template>
  <div class="rc-layout">
    <header class="rc-header">
      <h1>进制转换</h1>
      <span class="rc-sub">Radix Converter</span>
    </header>

    <!-- Input area -->
    <div class="rc-input-row">
      <div class="rc-input-group" v-for="{ r, label } in radices" :key="r">
        <button
          class="rc-radix-btn"
          :class="{ active: fromRadix === r }"
          @click="fromRadix = r"
        >{{ label }}</button>
      </div>
    </div>

    <div class="rc-input-row">
      <input
        v-model="input"
        class="rc-input"
        :class="{ error: inputError }"
        :placeholder="`输入 ${fromRadix} 进制数…`"
        autofocus
        spellcheck="false"
      />
    </div>

    <p v-if="inputError" class="rc-error">{{ inputError }}</p>

    <!-- Quick examples -->
    <div class="rc-quick-row">
      <span class="rc-quick-label">示例：</span>
      <button class="rc-chip" @click="setInput('255', 10)">255</button>
      <button class="rc-chip" @click="setInput('FF', 16)">FF</button>
      <button class="rc-chip" @click="setInput('11111111', 2)">11111111</button>
      <button class="rc-chip" @click="setInput('377', 8)">377</button>
      <button class="rc-chip" @click="setInput('65535', 10)">65535</button>
      <button class="rc-chip" @click="setInput('deadbeef', 16)">DEADBEEF</button>
    </div>

    <!-- Results -->
    <div v-if="decimalValue !== null" class="rc-results">
      <!-- Decimal (primary) -->
      <div class="rc-row rc-row--dec">
        <div class="rc-name">
          <span class="rc-radix-badge badge-dec">DEC</span> 十进制
        </div>
        <div class="rc-groups">
          <span
            v-for="(part, i) in grouped.dec"
            :key="i"
            class="rc-group"
            :style="{ color: groupColor(i, grouped.dec.length) }"
          >{{ part }}</span>
        </div>
        <div class="rc-extra">科学计数：{{ localeDecimal }}</div>
      </div>

      <!-- Hex -->
      <div class="rc-row rc-row--hex">
        <div class="rc-name">
          <span class="rc-radix-badge badge-hex">HEX</span> 十六进制
        </div>
        <div class="rc-groups">
          <span
            v-for="(part, i) in grouped.hex"
            :key="i"
            class="rc-group"
            :style="{ color: groupColor(i, grouped.dec.length) }"
          >{{ part }}</span>
        </div>
        <div class="rc-extra">
          前缀：<code>0x{{ outputs.hex }}</code> &nbsp;|&nbsp;
          CSS 颜色：<code>#{{ outputs.hex.padStart(6, '0').slice(-6) }}</code>
        </div>
      </div>

      <!-- Binary -->
      <div class="rc-row rc-row--bin">
        <div class="rc-name">
          <span class="rc-radix-badge badge-bin">BIN</span> 二进制
        </div>
        <div class="rc-groups rc-groups--bin">
          <span
            v-for="(part, i) in grouped.bin"
            :key="i"
            class="rc-group"
            :style="{ color: groupColor(i, grouped.dec.length) }"
          >{{ part }}</span>
        </div>
        <div class="rc-extra" v-if="bitInfo">
          {{ bitInfo.sigBits }} 有效位 / {{ bitInfo.bits }} 总位
          <span v-if="bitInfo.bits > bitInfo.sigBits">（前导 0）</span>
          &nbsp;|&nbsp;
          <button class="rc-link-btn" @click="quickPad(8)">8位</button>
          <button class="rc-link-btn" @click="quickPad(16)">16位</button>
          <button class="rc-link-btn" @click="quickPad(32)">32位</button>
          <button class="rc-link-btn" @click="quickPad(64)">64位</button>
        </div>
      </div>

      <!-- Octal -->
      <div class="rc-row rc-row--oct">
        <div class="rc-name">
          <span class="rc-radix-badge badge-oct">OCT</span> 八进制
        </div>
        <div class="rc-groups">
          <span
            v-for="(part, i) in grouped.oct"
            :key="i"
            class="rc-group"
            :style="{ color: groupColor(i, grouped.dec.length) }"
          >{{ part }}</span>
        </div>
        <div class="rc-extra">C 字面量前缀：<code>0o{{ outputs.oct }}</code></div>
      </div>
    </div>

    <div v-else class="rc-empty">
      输入数字开始转换
    </div>

    <!-- Bit operations -->
    <details class="rc-bitops" :open="showBitOps" @toggle="showBitOps = ($event.target as HTMLDetailsElement).open">
      <summary>位运算 BitOps</summary>
      <div v-if="decimalValue !== null" class="rc-bitops-body">
        <div class="rc-field">
          <label>掩码 (HEX)</label>
          <input
            v-model="bitMask"
            type="text"
            class="rc-field-input"
            placeholder="0xFF"
            @change="(e: Event) => { try { bitMask = BigInt('0x' + (e.target as HTMLInputElement).value) } catch { bitMask = 0n } }"
          />
        </div>
        <div v-if="bitResult" class="rc-bitops-grid">
          <div class="rc-bitop-cell">
            <div class="rc-bitop-label">AND &amp;</div>
            <div class="rc-bitop-val">{{ bitResult.and.toString(16).toUpperCase() }}</div>
          </div>
          <div class="rc-bitop-cell">
            <div class="rc-bitop-label">OR |</div>
            <div class="rc-bitop-val">{{ bitResult.or.toString(16).toUpperCase() }}</div>
          </div>
          <div class="rc-bitop-cell">
            <div class="rc-bitop-label">XOR ^</div>
            <div class="rc-bitop-val">{{ bitResult.xor.toString(16).toUpperCase() }}</div>
          </div>
        </div>
      </div>
    </details>
  </div>
</template>

<style scoped>
.rc-layout {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 24px 60px;
}

.rc-header {
  text-align: center;
  margin-bottom: 32px;
}

.rc-header h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: var(--text);
}

.rc-sub {
  font-size: 13px;
  color: var(--muted);
  margin-top: 4px;
  display: block;
}

/* Input */
.rc-input-row {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.rc-input-group {
  flex: 1;
}

.rc-radix-btn {
  width: 100%;
  padding: 10px 0;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: var(--muted);
  transition: all 0.15s;
}

.rc-radix-btn:hover { border-color: #b6c4e4; }

.rc-radix-btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.rc-input {
  width: 100%;
  height: 48px;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0 16px;
  font-size: 20px;
  font-family: ui-monospace, SF Mono, Menlo, Consolas, monospace;
  outline: none;
  letter-spacing: 0.02em;
}

.rc-input:focus { border-color: var(--accent); }
.rc-input.error { border-color: #dc2626; background: #fef2f2; }

.rc-error {
  color: #dc2626;
  font-size: 13px;
  margin: 4px 0 0;
}

/* Quick chips */
.rc-quick-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 32px;
}

.rc-quick-label {
  font-size: 12px;
  color: var(--muted);
}

.rc-chip {
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 12px;
  font-family: ui-monospace, SF Mono, Menlo, monospace;
  cursor: pointer;
  color: var(--text);
  transition: border-color 0.12s;
}

.rc-chip:hover { border-color: var(--accent); color: var(--accent); }

/* Results */
.rc-results {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rc-row {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 20px;
}

.rc-row--dec { border-left: 4px solid #2563eb; }
.rc-row--hex { border-left: 4px solid #7c3aed; }
.rc-row--bin { border-left: 4px solid #16a34a; }
.rc-row--oct { border-left: 4px solid #ea580c; }

.rc-name {
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.rc-radix-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.04em;
}

.badge-dec { background: #2563eb; }
.badge-hex { background: #7c3aed; }
.badge-bin { background: #16a34a; }
.badge-oct { background: #ea580c; }

.rc-groups {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 28px;
  font-family: ui-monospace, SF Mono, Menlo, Consolas, monospace;
  font-weight: 600;
  letter-spacing: 0.03em;
  line-height: 1.4;
  word-break: break-all;
}

.rc-groups--bin {
  font-size: 18px;
}

.rc-group {
  /* color applied via :style */
}

.rc-extra {
  margin-top: 10px;
  font-size: 12px;
  color: var(--muted);
  font-family: ui-monospace, SF Mono, Menlo, monospace;
}

.rc-extra code {
  background: var(--accent-weak);
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 12px;
}

.rc-link-btn {
  border: none;
  background: none;
  color: var(--accent);
  cursor: pointer;
  font-size: 12px;
  font-family: ui-monospace, SF Mono, Menlo, monospace;
  padding: 0 2px;
}

.rc-link-btn:hover { text-decoration: underline; }

.rc-empty {
  text-align: center;
  color: var(--muted);
  padding: 60px 0;
  font-size: 15px;
}

/* Bit ops */
.rc-bitops {
  margin-top: 24px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 16px 20px;
}

.rc-bitops summary {
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  color: var(--text);
}

.rc-bitops-body {
  margin-top: 16px;
}

.rc-field {
  margin-bottom: 12px;
}

.rc-field label {
  display: block;
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 6px;
}

.rc-field-input {
  width: 100%;
  height: 36px;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0 12px;
  font-size: 14px;
  font-family: ui-monospace, SF Mono, Menlo, monospace;
  outline: none;
}

.rc-field-input:focus { border-color: var(--accent); }

.rc-bitops-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.rc-bitop-cell {
  background: var(--accent-weak);
  border-radius: 10px;
  padding: 12px;
  text-align: center;
}

.rc-bitop-label {
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 4px;
}

.rc-bitop-val {
  font-size: 18px;
  font-weight: 600;
  font-family: ui-monospace, SF Mono, Menlo, monospace;
  color: var(--text);
}

@media (max-width: 640px) {
  .rc-groups { font-size: 20px; }
  .rc-groups--bin { font-size: 14px; }
  .rc-layout { padding: 20px 12px 40px; }
}
</style>
