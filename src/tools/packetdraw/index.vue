<!--
  文件说明：实现位协议图编辑器，解析协议文本、计算字段布局并展示和导出 SVG 图形。
-->

<script setup lang="ts">
// Bit 协议绘制器：左侧编辑 packet 定义（DSL），右侧实时渲染类 Mermaid packet 的位图。
// 语法以 packet.g4 为准：位置 `NUMBER[expr]`（[expr] 角标标签不求值）、渲染长度
// `[+n]`、相对偏移 `+N`、嵌套字段；注释 %%，字符串仅双引号。
import { onMounted, ref, watch } from 'vue'
import { parsePacket } from './lib/parser'
import { resolvePacket } from './lib/layout'
import { renderDiagram } from './lib/svg'
import type { LayoutNode } from './lib/layout'
import type { Diagram } from './lib/svg'
import { PRESETS, DEFAULT_PRESET } from './lib/presets'

const LS_TEXT = 'wttch:packetdraw:text'

// 旧语法（${...}）的已存文本与新语法不兼容，检测到即回退默认预设。
const storedText = localStorage.getItem(LS_TEXT)
const text = ref<string>(storedText && !storedText.includes('${') ? storedText : DEFAULT_PRESET.text)
const diagram = ref<Diagram | null>(null)
const layoutNodes = ref<LayoutNode[]>([])
const error = ref('')
const status = ref('')
const presetId = ref(DEFAULT_PRESET.id)
const flashMsg = ref('')

function persist() {
  try {
    localStorage.setItem(LS_TEXT, text.value)
  } catch {
    /* 存储不可用时静默忽略 */
  }
}

let timer: ReturnType<typeof setTimeout> | null = null
function scheduleRender() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(render, 120)
}

function render() {
  const res = parsePacket(text.value)
  const errors = [...res.errors]
  const layout = resolvePacket(res.fields)
  errors.push(...layout.errors)
  layoutNodes.value = layout.nodes

  error.value = Array.from(new Set(errors)).join('\n')
  diagram.value = layout.nodes.length > 0 ? renderDiagram(layout.nodes) : null
  status.value = diagram.value ? `共 ${diagram.value.bits} bit` : ''
  persist()
}

watch(text, scheduleRender)
onMounted(render)

function loadPreset(id: string) {
  const p = PRESETS.find((x) => x.id === id) ?? DEFAULT_PRESET
  text.value = p.text
  presetId.value = p.id
  scheduleRender()
}

function clearAll() {
  text.value = ''
  scheduleRender()
}

function download(blob: Blob, name: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

function flash(msg: string) {
  flashMsg.value = msg
  setTimeout(() => {
    if (flashMsg.value === msg) flashMsg.value = ''
  }, 1800)
}

async function copyText() {
  try {
    await navigator.clipboard.writeText(text.value)
    flash('已复制定义文本')
  } catch {
    flash('复制失败，请手动选择复制')
  }
}

function exportSvg() {
  const d = renderDiagram(layoutNodes.value, { export: true })
  if (!d) return
  download(new Blob([d.svg], { type: 'image/svg+xml;charset=utf-8' }), 'packet-diagram.svg')
}

function exportPng() {
  const d = renderDiagram(layoutNodes.value, { export: true })
  if (!d) return
  const url = URL.createObjectURL(new Blob([d.svg], { type: 'image/svg+xml;charset=utf-8' }))
  const img = new Image()
  img.onload = () => {
    const scale = 2
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(d.width * scale)
    canvas.height = Math.ceil(d.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      URL.revokeObjectURL(url)
      flash('导出失败')
      return
    }
    ctx.scale(scale, scale)
    ctx.drawImage(img, 0, 0)
    URL.revokeObjectURL(url)
    canvas.toBlob((b) => {
      if (b) download(b, 'packet-diagram.png')
      else flash('PNG 导出失败')
    }, 'image/png')
  }
  img.onerror = () => {
    URL.revokeObjectURL(url)
    flash('PNG 导出失败')
  }
  img.src = url
}
</script>

<template>
  <div class="pd-page">
    <header class="pd-header">
      <h1>Bit 协议绘制器</h1>
      <span class="pd-sub">Packet Diagram · 32 位一行 · 左侧编辑实时渲染，可导出 SVG / PNG</span>
    </header>

    <div class="pd-toolbar">
      <select v-model="presetId" class="pd-select" title="示例模板" @change="loadPreset(presetId)">
        <option v-for="p in PRESETS" :key="p.id" :value="p.id">{{ p.name }}</option>
      </select>
      <button class="pd-btn pd-btn--ghost" @click="clearAll">清空</button>
      <span class="pd-spacer"></span>
      <button class="pd-btn pd-btn--ghost" @click="copyText">复制定义</button>
      <button class="pd-btn pd-btn--ghost" @click="exportSvg">导出 SVG</button>
      <button class="pd-btn pd-btn--primary" @click="exportPng">保存 PNG</button>
    </div>
    <div v-if="flashMsg" class="pd-flash">{{ flashMsg }}</div>

    <div class="pd-split">
      <section class="pd-pane pd-editor">
        <div class="pd-pane-hd">
          <span class="pd-pane-title">编辑</span><span class="pd-pane-sub">packet 定义 · 每行一个字段</span>
        </div>
        <textarea
          v-model="text"
          class="pd-textarea"
          spellcheck="false"
          placeholder="0-15: &quot;Field Name&quot;&#10;16-31: &quot;Next&quot; {&#10;    0-15: &quot;Child&quot;&#10;}&#10;+16[+64]: &quot;Tail&quot;"
        ></textarea>

        <details class="pd-help">
          <summary>语法说明</summary>
          <pre class="pd-help-code">0-15: "字段名"                    %% 位区间 start-end，两端角标显示数字
16:   "单 bit"                    %% 仅起始位 = 1 bit
16-175: "IPv4 Header" {           %% 嵌套子字段（子字段位区间相对父块起始）
    0-3: "Version (4)"
}
16-31[Ver]: "字段"                %% [expr] 角标：用文本替换该端数字（不计算）
32[+16]: "字段"                   %% 渲染长度 [+n]：从起始位起画 n bit
+4: "字段"                        %% +N：起始位 = 上一同级字段结束位 + N
%% 注释从 %% 到行尾；字符串仅双引号，无转义</pre>
          <p class="pd-help-note">
            位置单位是 <b>bit</b>，子字段位区间相对父块起始位。位区间只用于<b>展示</b>：
            方框左上/右上角标出 <code>[expr]</code> 角标标签（无标签则显示数字），每行上方
            两侧标出整行位范围，方框内部不显示位范围；几何由渲染长度 <code>[+n]</code> 决定，
            无渲染长度时按位区间绘制。容器字段（有子字段）不画色块，改为在它跨的每一行
            正下方画一条<b>容器色的下划线</b>（覆盖其所有子字段），首段下方标注容器名与范围。
            <b>按 32 位一行分页</b>，跨行字段自动拆段，续段角标显示该段
            的绝对位范围。<code>[expr]</code> 必须本身是合法算术表达式（如 <code>[IHL*32]</code>）；
            <code>+N</code> 无显式结束位，需配 <code>[+n]</code> 画宽度。
          </p>
        </details>
      </section>

      <section class="pd-pane pd-preview">
        <div class="pd-pane-hd">
          <span class="pd-pane-title">渲染</span><span class="pd-pane-sub">{{ status || '实时' }}</span>
        </div>
        <div class="pd-stage">
          <div v-if="error" class="pd-error"><pre>{{ error }}</pre></div>
          <div v-if="diagram" class="pd-scroll">
            <div class="pd-svg-frame" :style="{ minWidth: diagram.width + 'px' }">
              <!-- eslint-disable-next-line vue/no-v-html -->
              <div v-html="diagram.svg"></div>
            </div>
          </div>
          <div v-else-if="!error" class="pd-empty">
            在左侧输入 packet 定义，右侧实时渲染。<br />试试右上角示例模板。
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.pd-page {
  max-width: 1440px;
  margin: 0 auto;
  padding: 20px 20px 48px;
}

.pd-header {
  text-align: center;
  margin-bottom: 16px;
}
.pd-header h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  color: var(--text);
}
.pd-sub {
  font-size: 13px;
  color: var(--muted);
  display: block;
  margin-top: 4px;
}

/* toolbar */
.pd-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.pd-select {
  height: 34px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--panel);
  color: var(--text);
  padding: 0 10px;
  font-size: 13px;
  outline: none;
  cursor: pointer;
}
.pd-select:focus {
  border-color: var(--accent);
}
.pd-btn {
  height: 34px;
  padding: 0 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid var(--border);
  background: var(--panel);
  color: var(--text);
  transition: border-color 0.15s, background 0.15s, color 0.15s;
  white-space: nowrap;
}
.pd-btn:hover {
  border-color: #b6c4e4;
}
.pd-btn--primary {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
.pd-btn--primary:hover {
  filter: brightness(1.08);
}
.pd-spacer {
  flex: 1;
}
.pd-flash {
  text-align: right;
  font-size: 12px;
  color: var(--accent);
  margin: -4px 4px 8px;
  height: 16px;
}

/* split panes */
.pd-split {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  gap: 16px;
  align-items: stretch;
}
.pd-pane {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.pd-pane-hd {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 10px;
}
.pd-pane-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
}
.pd-pane-sub {
  font-size: 12px;
  color: var(--muted);
}

/* editor */
.pd-textarea {
  flex: 1;
  min-height: 360px;
  width: 100%;
  resize: vertical;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px;
  font-family: 'SF Mono', ui-monospace, Menlo, Consolas, monospace;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text);
  background: #fafbfc;
  outline: none;
}
.pd-textarea:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-weak);
}

.pd-help {
  margin-top: 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #fafbfc;
}
.pd-help summary {
  cursor: pointer;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
}
.pd-help-code {
  margin: 0;
  padding: 0 12px 8px;
  font-family: 'SF Mono', ui-monospace, Menlo, monospace;
  font-size: 12px;
  line-height: 1.55;
  color: var(--text);
  overflow-x: auto;
}
.pd-help-note {
  margin: 0;
  padding: 0 12px 10px;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.6;
}

/* preview */
.pd-preview {
  min-height: 560px;
}
.pd-stage {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.pd-scroll {
  overflow: auto;
  padding: 8px;
  border: 1px dashed var(--border);
  border-radius: 10px;
  /* 纯色背景：避免径向渐变从间隙透出"不明颜色" */
  background: var(--panel);
}
.pd-svg-frame {
  display: inline-block;
  min-width: 100%;
}
.pd-svg-frame :deep(svg) {
  display: block;
  width: 100%;
  height: auto;
}
.pd-error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 10px;
  font-size: 12px;
  white-space: pre-wrap;
}
.pd-error pre {
  margin: 0;
  font-family: 'SF Mono', ui-monospace, Menlo, monospace;
  white-space: pre-wrap;
}
.pd-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--muted);
  font-size: 14px;
  line-height: 2;
  border: 1px dashed var(--border);
  border-radius: 10px;
  padding: 40px;
}

@media (max-width: 960px) {
  .pd-split {
    grid-template-columns: 1fr;
  }
  .pd-textarea {
    min-height: 260px;
  }
  .pd-preview {
    min-height: 420px;
  }
}
</style>
