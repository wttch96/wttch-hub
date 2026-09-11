<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { CircleStop, Eraser, Play, Send } from 'lucide-vue-next';
import {
  bytesToHex,
  defaultYunyaoHeader,
  sendProtocols,
  wrapYunyao,
  type YunyaoHeaderConfig,
} from './protocols';
import { networkConfig } from './store';

type LogEntry = {
  id: number;
  direction: 'recv' | 'send' | 'system';
  time: string;
  text: string;
  hex: string;
  parsed?: string;
  peer?: string;
};

const isOpen = ref(false);
const error = ref('');
const outgoing = ref('48656C6C6F2C206E6574776F726B21');
const selectedProtocol = ref('raw');
const showProtocolConfig = ref(false);
const headerConfig = ref<YunyaoHeaderConfig>({ ...defaultYunyaoHeader });
const sendAsHex = ref(true);
const autoNewline = ref(true);
const showTime = ref(true);
const showHex = ref(true);
const showYunyaoDebugPackets = ref(false);
const autoScroll = ref(true);
const bytesPerLine = ref(16);
const logs = ref<LogEntry[]>([]);
const systemLogs = computed(() => logs.value.filter(item => item.direction === 'system'));
const dataLogs = computed(() =>
  logs.value.filter(item => item.direction === 'recv' || item.direction === 'send'),
);
const dataRows = computed(() => {
  return dataLogs.value.flatMap(item => {
    const bytes = item.hex ? item.hex.split(' ') : [];
    const lineCount = Math.max(1, Math.ceil(bytes.length / bytesPerLine.value));
    return Array.from({ length: lineCount }, (_, index) => {
      const line = bytes.slice(
        index * bytesPerLine.value,
        index * bytesPerLine.value + bytesPerLine.value,
      );
      const start = index * bytesPerLine.value;
      return {
        id: `${item.id}-${index}`,
        start,
        end: line.length ? start + line.length - 1 : start,
        hex: line.join(' '),
        protocol: item.parsed,
        lineCount,
        first: index === 0,
      };
    });
  });
});
const connectedClients = ref<Array<{ id: string; host: string; port: number }>>([]);
const selectedClientId = ref('');
const eventScroll = ref<HTMLElement>();
const dataScroll = ref<HTMLElement>();
let nextId = 1;
let unsubscribeMessage: (() => void) | undefined;
let unsubscribeState: (() => void) | undefined;
let unsubscribeClients: (() => void) | undefined;
let knownClientIds = new Set<string>();
let dataResizeObserver: ResizeObserver | undefined;

const activeProtocol = computed(
  () => sendProtocols.find(protocol => protocol.id === selectedProtocol.value) ?? sendProtocols[0],
);
const decoder = new TextDecoder('utf-8', { fatal: false });
const isTcpServer = computed(
  () => networkConfig.connectionType === 'tcp' && networkConfig.tcpMode === 'server',
);
const canOpen = computed(
  () =>
    Number.isInteger(networkConfig.localPort) &&
    networkConfig.localPort >= 0 &&
    networkConfig.localPort <= 65535 &&
    Boolean(networkConfig.localHost) &&
    (isTcpServer.value ||
      (Number.isInteger(networkConfig.remotePort) &&
        networkConfig.remotePort > 0 &&
        networkConfig.remotePort <= 65535 &&
        Boolean(networkConfig.remoteHost))),
);
const hexInputError = computed(() => {
  if (!sendAsHex.value) return '';
  if (!outgoing.value) return '请输入十六进制数据。';
  if (!/^[0-9a-fA-F]+$/.test(outgoing.value))
    return '十六进制仅允许 0–9、A–F，不能包含空格或其他字符。';
  if (outgoing.value.length % 2) return '十六进制字符数必须为偶数，每两个字符表示一个字节。';
  return '';
});
const canSend = computed(
  () =>
    isOpen.value &&
    !hexInputError.value &&
    !(selectedProtocol.value === 'yy-tm' && yunyaoConfigError.value) &&
    (!isTcpServer.value || Boolean(selectedClientId.value)),
);
const yunyaoFields: Array<{ key: keyof YunyaoHeaderConfig; label: string; length: number }> = [
  { key: 'version', label: '版本号', length: 2 },
  { key: 'satelliteCode', label: '卫星代号', length: 4 },
  { key: 'sourceId', label: '信源标识', length: 8 },
  { key: 'destinationId', label: '信宿标识', length: 8 },
  { key: 'dataId', label: '数据标识', length: 8 },
  { key: 'packetSequence', label: '包序号', length: 8 },
  { key: 'reserved8', label: '保留（8 位）', length: 2 },
  { key: 'reserved32', label: '保留（32 位）', length: 8 },
  { key: 'statusCode', label: '状态码', length: 2 },
];
const yunyaoConfigError = computed(() =>
  yunyaoFields.find(
    field => !new RegExp(`^[0-9a-fA-F]{${field.length}}$`).test(headerConfig.value[field.key]),
  ),
);
const saveHeaderConfig = () =>
  localStorage.setItem('network-debug:yunyao-header:v1', JSON.stringify(headerConfig.value));

const toBase64 = (bytes: Uint8Array) => {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  return btoa(binary);
};
const fromBase64 = (value: string) => Uint8Array.from(atob(value), char => char.charCodeAt(0));
const yunyaoDebugHeartbeatPrefix = Uint8Array.from([
  0x80, 0xff, 0xff, 0x07, 0x00, 0x00, 0xff, 0x00, 0x00, 0x08, 0x00, 0x01, 0x10, 0x00, 0x00,
]);
const isYunyaoDebugHeartbeat = (bytes: Uint8Array) =>
  bytes.length >= yunyaoDebugHeartbeatPrefix.length &&
  yunyaoDebugHeartbeatPrefix.every((byte, index) => bytes[index] === byte);
const parseReceived = (bytes: Uint8Array) => {
  if (bytes.length >= 4 && bytes[0] === 0xaa && bytes[1] === 0x55) {
    const length = (bytes[2] << 8) | bytes[3];
    return `识别为长度帧：声明数据长度 ${length} 字节${length === bytes.length - 4 ? '' : '（与实际长度不一致）'}`;
  }
  if (bytes.length >= 4 && bytes[0] === 0x7e && bytes.at(-2) === 0x0d && bytes.at(-1) === 0x0a)
    return '识别为校验帧：当前仅展示原始内容，后续可在协议接口中补充解析。';
  return '未识别协议：展示原始内容。';
};
const addLog = (entry: Omit<LogEntry, 'id' | 'time'>) => {
  logs.value.push({
    ...entry,
    id: nextId++,
    time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
  });
  if (logs.value.length > 500) logs.value.shift();
};
watch(
  () => logs.value.length,
  async () => {
    if (!autoScroll.value) return;
    await nextTick();
    for (const element of [eventScroll.value, dataScroll.value])
      if (element) element.scrollTop = element.scrollHeight;
  },
);

async function toggleConnection() {
  error.value = '';
  if (isOpen.value) {
    await window.networkDebugHost?.close();
    isOpen.value = false;
    return;
  }
  if (!canOpen.value) {
    error.value = '请填写有效的本机与目标地址、端口。';
    return;
  }
  if (!window.networkDebugHost) {
    error.value = '网络功能仅能在桌面应用中使用。';
    return;
  }
  const result = await window.networkDebugHost.open({
    type: networkConfig.connectionType,
    tcpMode: networkConfig.tcpMode,
    localHost: networkConfig.localHost,
    localPort: Number(networkConfig.localPort),
    remoteHost: networkConfig.remoteHost,
    remotePort: Number(networkConfig.remotePort),
  });
  const connectionType = networkConfig.connectionType;
  const localHost = networkConfig.localHost;
  const localPort = Number(networkConfig.localPort);
  const remoteHost = networkConfig.remoteHost;
  const remotePort = Number(networkConfig.remotePort);
  isOpen.value = result.ok;
  error.value = result.error ?? '';
  if (result.ok)
    addLog({
      direction: 'system',
      text: `${connectionType.toUpperCase()} ${isTcpServer.value ? 'Server 已开始监听' : '已打开'}`,
      hex: '',
      peer: isTcpServer.value
        ? `${localHost}:${localPort}`
        : `${localHost}:${localPort} → ${remoteHost}:${remotePort}`,
    });
  if (result.ok && isTcpServer.value) updateClients(await window.networkDebugHost.clients());
}
async function send() {
  error.value = '';
  if (!isOpen.value || !window.networkDebugHost) {
    error.value = '请先打开连接。';
    return;
  }
  try {
    if (hexInputError.value) {
      error.value = hexInputError.value;
      return;
    }
    if (selectedProtocol.value === 'yy-tm' && yunyaoConfigError.value) {
      error.value = `${yunyaoConfigError.value.label}配置无效。`;
      return;
    }
    const inputBytes = sendAsHex.value
      ? Uint8Array.from(outgoing.value.match(/../g) ?? [], pair => parseInt(pair, 16))
      : undefined;
    const body = inputBytes ?? new TextEncoder().encode(outgoing.value);
    const result =
      selectedProtocol.value === 'yy-tm'
        ? wrapYunyao(body, headerConfig.value)
        : inputBytes
          ? activeProtocol.value.wrapBytes(inputBytes)
          : activeProtocol.value.wrap(outgoing.value);
    if (isTcpServer.value && !selectedClientId.value) {
      error.value = '请先选择要发送到的客户端。';
      return;
    }
    const sent = await window.networkDebugHost.send(
      toBase64(result.payload),
      isTcpServer.value ? selectedClientId.value : undefined,
    );
    if (!sent.ok) {
      error.value = sent.error ?? '发送失败。';
      return;
    }

    const remoteHost = networkConfig.remoteHost;
    const remotePort = Number(networkConfig.remotePort);

    addLog({
      direction: 'send',
      text: outgoing.value,
      hex: bytesToHex(result.payload),
      parsed: `${activeProtocol.value.name}：${result.summary}`,
      peer: `${remoteHost}:${remotePort}`,
    });
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '发送内容处理失败。';
  }
}
async function disconnectClient(clientId: string) {
  await window.networkDebugHost?.disconnectClient(clientId);
}

onMounted(() => {
  try {
    const saved = JSON.parse(
      localStorage.getItem('network-debug:yunyao-header:v1') ?? '{}',
    ) as Partial<YunyaoHeaderConfig>;
    headerConfig.value = { ...defaultYunyaoHeader, ...saved };
  } catch {
    /* Use the example header when the persisted config is invalid. */
  }
  unsubscribeMessage = window.networkDebugHost?.onMessage(message => {
    const bytes = fromBase64(message.dataBase64);
    if (!showYunyaoDebugPackets.value && isYunyaoDebugHeartbeat(bytes)) return;
    addLog({
      direction: 'recv',
      text: decoder.decode(bytes),
      hex: bytesToHex(bytes),
      parsed: parseReceived(bytes),
      peer: `${message.remoteHost}:${message.remotePort}`,
    });
  });
  unsubscribeState = window.networkDebugHost?.onState(state => {
    isOpen.value = state.open;
    if (state.error) error.value = state.error;
  });
  unsubscribeClients = window.networkDebugHost?.onClients(clients => {
    updateClients(clients);
  });
  const updateBytesPerLine = () => {
    const width = dataScroll.value?.clientWidth ?? 0;
    const dataWidth = Math.max(160, width - 250);
    bytesPerLine.value = Math.max(8, Math.floor(dataWidth / 185) * 8);
  };
  updateBytesPerLine();
  if (dataScroll.value && typeof ResizeObserver !== 'undefined') {
    dataResizeObserver = new ResizeObserver(updateBytesPerLine);
    dataResizeObserver.observe(dataScroll.value);
  }
});
function updateClients(clients: Array<{ id: string; host: string; port: number }>) {
  const nextIds = new Set(clients.map(client => client.id));
  clients
    .filter(client => !knownClientIds.has(client.id))
    .forEach(client =>
      addLog({
        direction: 'system',
        text: 'TCP 客户端已接入',
        hex: '',
        peer: `${client.host}:${client.port}`,
      }),
    );
  connectedClients.value
    .filter(client => !nextIds.has(client.id))
    .forEach(client =>
      addLog({
        direction: 'system',
        text: 'TCP 客户端已断开',
        hex: '',
        peer: `${client.host}:${client.port}`,
      }),
    );
  knownClientIds = nextIds;
  connectedClients.value = clients;
  if (!clients.some(client => client.id === selectedClientId.value))
    selectedClientId.value = clients[0]?.id ?? '';
}
onBeforeUnmount(() => {
  dataResizeObserver?.disconnect();
  unsubscribeMessage?.();
  unsubscribeState?.();
  unsubscribeClients?.();
  void window.networkDebugHost?.close();
});
</script>

<template>
  <main class="network-debugger">
    <aside class="settings-panel">
      <section>
        <p class="eyebrow">NETWORK DEBUGGER</p>
        <h1>网络调试助手</h1>
      </section>
      <section class="setting-group">
        <h2>网络设置</h2>
        <div class="segmented">
          <button
            :class="{ active: networkConfig.connectionType === 'udp' }"
            @click="networkConfig.connectionType = 'udp'"
          >
            UDP</button
          ><button
            :class="{ active: networkConfig.connectionType === 'tcp' }"
            @click="networkConfig.connectionType = 'tcp'"
          >
            TCP
          </button>
        </div>
        <div v-if="networkConfig.connectionType === 'tcp'" class="segmented tcp-mode">
          <button
            :class="{ active: networkConfig.tcpMode === 'client' }"
            :disabled="isOpen"
            @click="networkConfig.tcpMode = 'client'"
          >
            Client</button
          ><button
            :class="{ active: networkConfig.tcpMode === 'server' }"
            :disabled="isOpen"
            @click="networkConfig.tcpMode = 'server'"
          >
            Server
          </button>
        </div>
        <label
          >本机主机地址<input
            v-model.trim="networkConfig.localHost"
            placeholder="0.0.0.0"
            :disabled="isOpen"
        /></label>
        <label
          >本地端口<input
            v-model.number="networkConfig.localPort"
            type="number"
            min="0"
            max="65535"
            :disabled="isOpen"
        /></label>
      </section>
      <section v-if="!isTcpServer" class="setting-group">
        <h2>发送目标</h2>
        <label
          >目标主机地址<input
            v-model.trim="networkConfig.remoteHost"
            placeholder="127.0.0.1"
            :disabled="isOpen"
        /></label>
        <label
          >目标端口<input
            v-model.number="networkConfig.remotePort"
            type="number"
            min="1"
            max="65535"
            :disabled="isOpen"
        /></label>
      </section>
      <button
        class="connection-button"
        :class="{ close: isOpen }"
        :disabled="!isOpen && !canOpen"
        @click="toggleConnection"
      >
        <CircleStop v-if="isOpen" :size="16" /><Play v-else :size="16" />{{
          isOpen ? '关闭连接' : '打开连接'
        }}
      </button>
      <section v-if="isTcpServer" class="connected-clients">
        <h2>接入客户端（{{ connectedClients.length }}）</h2>
        <p v-if="!connectedClients.length">等待客户端接入…</p>
        <button
          v-for="client in connectedClients"
          :key="client.id"
          :class="{ selected: selectedClientId === client.id }"
          @click="selectedClientId = client.id"
        >
          <span>{{ client.host }}:{{ client.port }}</span
          ><small>{{ selectedClientId === client.id ? '已选择' : '点击选择' }}</small>
        </button>
        <button
          v-if="selectedClientId"
          class="disconnect-client"
          @click="disconnectClient(selectedClientId)"
        >
          断开所选客户端
        </button>
      </section>
      <p v-if="error" class="error">
        {{ error }}
      </p>
    </aside>

    <section class="workbench">
      <section class="receiver panel">
        <header class="panel-header">
          <div>
            <h2>接收区</h2>
            <span>{{ isOpen ? '正在监听 / 接收' : '连接未打开' }}</span>
          </div>
          <div class="receive-options">
            <label><input v-model="autoNewline" type="checkbox" />自动换行</label
            ><label><input v-model="showTime" type="checkbox" />显示时间</label
            ><label><input v-model="showHex" type="checkbox" />十六进制</label
            ><label
              ><input v-model="showYunyaoDebugPackets" type="checkbox" />显示云遥心跳调试包</label
            ><label><input v-model="autoScroll" type="checkbox" />自动滚动到底</label
            ><button title="清空接收记录" @click="logs = []">
              <Eraser :size="15" />
            </button>
          </div>
        </header>
        <div class="log-column-head"><span>事件</span><span>数据域</span></div>
        <div class="data-table-head">
          <span>事件</span>
          <div><span /><span>数据域</span><span /><span /></div>
        </div>
        <div class="log-list">
          <p v-if="!logs.length" class="empty">打开 UDP 或 TCP 连接后，收到的数据会显示在这里。</p>
          <section ref="eventScroll" class="event-stream">
            <article
              v-for="item in systemLogs"
              :key="item.id"
              class="event-entry"
              :class="item.direction"
            >
              <b>{{
                item.direction === 'recv' ? '接收' : item.direction === 'send' ? '发送' : '状态'
              }}</b
              ><span v-if="showTime">{{ item.time }}</span
              ><span v-if="item.peer">{{ item.peer }}</span>
            </article>
          </section>
          <section ref="dataScroll" class="data-stream">
            <table class="data-table">
              <thead>
                <tr>
                  <th />
                  <th>数据域</th>
                  <th />
                  <th>协议</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in dataRows" :key="row.id">
                  <td class="position-cell">
                    {{ row.start }}
                  </td>
                  <td class="data-cell">
                    {{ row.hex }}
                  </td>
                  <td class="position-cell">
                    {{ row.end }}
                  </td>
                  <td v-if="row.first" class="protocol-cell" :rowspan="row.lineCount">
                    {{ row.protocol }}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>
      </section>
      <section class="sender panel">
        <header class="panel-header">
          <div>
            <h2>发送区</h2>
            <span>{{ activeProtocol.description }}</span>
          </div>
          <label class="protocol-select"
            >协议<select v-model="selectedProtocol">
              <option v-for="protocol in sendProtocols" :key="protocol.id" :value="protocol.id">
                {{ protocol.name }}
              </option>
            </select></label
          >
          <button
            v-if="selectedProtocol === 'yy-tm'"
            class="protocol-config-button"
            @click="showProtocolConfig = true"
          >
            协议配置
          </button>
        </header>
        <textarea
          v-model="outgoing"
          :class="{ invalid: hexInputError }"
          aria-label="发送内容"
          placeholder="输入要发送的内容…"
          @keydown.ctrl.enter.prevent="send"
        />
        <footer>
          <label class="hex-toggle"
            ><input v-model="sendAsHex" type="checkbox" />按十六进制输入</label
          >
          <label v-if="isTcpServer" class="client-select">
            接入客户端
            <select v-model="selectedClientId">
              <option disabled value="">暂无可选客户端</option>
              <option v-for="client in connectedClients" :key="client.id" :value="client.id">
                {{ client.host }}:{{ client.port }}
              </option>
            </select>
          </label>
          <span v-else>Ctrl + Enter 发送</span
          ><button class="send-button" :disabled="!canSend" @click="send">
            <Send :size="16" />按所选协议发送
          </button>
        </footer>
      </section>
    </section>
    <div v-if="showProtocolConfig" class="config-overlay">
      <section class="protocol-config-page">
        <header>
          <div>
            <p>云遥-运控中心通信协议</p>
            <h2>协议头配置</h2>
            <span>字段为固定长度十六进制源码；日期和两个时标会在发送时按当前 UTC 自动生成。</span
            ><strong class="little-endian-note"
              >大端填写、小端发送：所有多字节字段均按小端序写入帧。</strong
            >
          </div>
          <button @click="showProtocolConfig = false">关闭</button>
        </header>
        <div class="header-fields">
          <label v-for="field in yunyaoFields" :key="field.key">
            {{ field.label }} <small>{{ field.length / 2 }} 字节 / {{ field.length }} 位</small>
            <input
              v-model.trim="headerConfig[field.key]"
              :maxlength="field.length"
              spellcheck="false"
              @input="headerConfig[field.key] = headerConfig[field.key].toUpperCase()"
            />
          </label>
        </div>
        <p v-if="yunyaoConfigError" class="config-error">
          {{ yunyaoConfigError.label }}必须是 {{ yunyaoConfigError.length }} 位十六进制字符。
        </p>
        <footer>
          <button @click="headerConfig = { ...defaultYunyaoHeader }">恢复样例预制</button
          ><button
            class="save-config"
            :disabled="Boolean(yunyaoConfigError)"
            @click="
              saveHeaderConfig();
              showProtocolConfig = false;
            "
          >
            保存预制
          </button>
        </footer>
      </section>
    </div>
  </main>
</template>

<style scoped>
.network-debugger {
  position: relative;
  height: 100%;
  display: grid;
  grid-template-columns: 274px minmax(0, 1fr);
  background: #f5f7fb;
  color: #172033;
}
.settings-panel {
  padding: 24px 18px;
  border-right: 1px solid #e0e5ee;
  background: #fff;
  overflow-y: auto;
}
.eyebrow {
  margin: 0 0 5px;
  font-size: 10px;
  letter-spacing: 0.12em;
  font-weight: 800;
  color: #007aff;
}
.settings-panel h1 {
  margin: 0 0 26px;
  font-size: 20px;
}
.setting-group {
  margin-top: 22px;
}
.setting-group h2,
.panel h2 {
  margin: 0 0 12px;
  font-size: 13px;
}
.setting-group label {
  display: grid;
  gap: 6px;
  margin: 12px 0;
  font-size: 12px;
  color: #5b6475;
}
.setting-group input,
select {
  height: 34px;
  box-sizing: border-box;
  border: 1px solid #d7deea;
  border-radius: 7px;
  background: #fff;
  padding: 0 9px;
  color: #172033;
  outline: none;
}
.setting-group input:focus,
select:focus,
textarea:focus {
  border-color: #007aff;
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
}
.segmented {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 3px;
  border-radius: 8px;
  background: #eef1f6;
}
.tcp-mode {
  margin-top: 10px;
}
.segmented button {
  border: 0;
  padding: 7px;
  border-radius: 6px;
  background: transparent;
  color: #667085;
  cursor: pointer;
  font-weight: 700;
}
.segmented button.active {
  background: #fff;
  color: #007aff;
  box-shadow: 0 1px 2px #dce1ea;
}
.connection-button,
.send-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 0;
  border-radius: 8px;
  background: #007aff;
  color: #fff;
  cursor: pointer;
  font-weight: 700;
}
.connection-button {
  width: 100%;
  margin-top: 25px;
  padding: 10px;
}
.connection-button.close {
  background: #e5484d;
}
.connection-button:disabled,
.send-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.error {
  margin: 11px 0 0;
  color: #d92d20;
  font-size: 12px;
  line-height: 1.45;
}
.connected-clients {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #edf0f4;
}
.connected-clients h2 {
  margin: 0 0 8px;
  font-size: 12px;
}
.connected-clients p {
  margin: 0;
  color: #8a94a6;
  font-size: 12px;
}
.connected-clients button {
  display: grid;
  width: 100%;
  gap: 2px;
  margin-top: 7px;
  padding: 8px;
  border: 1px solid #d7deea;
  border-radius: 7px;
  background: #fff;
  color: #344054;
  text-align: left;
  cursor: pointer;
  font:
    12px ui-monospace,
    SFMono-Regular,
    Consolas,
    monospace;
}
.connected-clients button.selected {
  border-color: #007aff;
  background: #eef6ff;
}
.connected-clients small {
  color: #7a8497;
  font: 11px sans-serif;
}
.workbench {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: grid;
  grid-template-rows: minmax(180px, 1fr) 230px;
  gap: 12px;
  padding: 14px;
}
.panel {
  min-height: 0;
  border: 1px solid #e0e5ee;
  border-radius: 11px;
  background: #fff;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid #edf0f4;
}
.panel-header h2 {
  margin-bottom: 3px;
}
.panel-header span,
footer span {
  color: #7a8497;
  font-size: 12px;
}
.receive-options {
  display: flex;
  align-items: center;
  gap: 11px;
  white-space: nowrap;
}
.receive-options label {
  font-size: 12px;
  color: #5b6475;
}
.receive-options button {
  display: grid;
  place-items: center;
  border: 0;
  background: transparent;
  color: #667085;
  cursor: pointer;
}
.log-column-head {
  display: grid;
  grid-template-columns: 170px minmax(0, 1fr);
  gap: 12px;
  padding: 7px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--accent-weak);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 700;
}
.log-list {
  flex: 1;
  display: grid;
  grid-template-columns: 170px minmax(0, 1fr);
  gap: 12px;
  overflow: auto;
  padding: 12px 16px;
  background: #fbfcfe;
}
.empty {
  grid-column: 1 / -1;
  color: #8a94a6;
  text-align: center;
  padding: 40px 0;
  font-size: 13px;
}
.event-stream,
.data-stream {
  min-width: 0;
}
.event-entry,
.data-entry {
  min-height: 39px;
  margin-bottom: 7px;
  padding: 8px 9px;
  border-left: 3px solid var(--border);
  border-radius: 0 7px 7px 0;
  background: var(--panel);
}
.event-entry {
  display: flex;
  flex-direction: column;
  gap: 3px;
  color: var(--text-secondary);
  font-size: 11px;
}
.event-entry b {
  color: var(--text);
}
.event-entry.recv,
.data-entry.recv {
  border-color: var(--success);
}
.event-entry.send,
.data-entry.send {
  border-color: var(--accent);
}
.data-entry pre {
  min-width: 0;
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
  font:
    12px/1.55 ui-monospace,
    SFMono-Regular,
    Consolas,
    monospace;
}
.data-entry small {
  display: block;
  margin-top: 5px;
  color: var(--text-secondary);
  font-size: 11px;
}
.sender textarea {
  flex: 1;
  resize: none;
  border: 0;
  padding: 13px 16px;
  outline: none;
  font:
    13px/1.6 ui-monospace,
    SFMono-Regular,
    Consolas,
    monospace;
}
.sender textarea.invalid {
  background: #fff5f5;
}
.sender footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-top: 1px solid #edf0f4;
}
.send-button {
  padding: 8px 13px;
}
.protocol-select,
.client-select,
.hex-toggle {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #667085;
  font-size: 12px;
}
.protocol-select select,
.client-select select {
  min-width: 116px;
}
.protocol-config-button {
  border: 1px solid #d7deea;
  background: #fff;
  color: #007aff;
  border-radius: 7px;
  padding: 6px 9px;
  cursor: pointer;
  font-size: 12px;
}
.config-overlay {
  position: absolute;
  z-index: 10;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(19, 30, 48, 0.42);
}
.protocol-config-page {
  width: min(740px, 100%);
  max-height: 92%;
  overflow: auto;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 18px 48px rgba(17, 31, 51, 0.28);
}
.protocol-config-page header {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  padding: 20px 22px;
  border-bottom: 1px solid #edf0f4;
}
.protocol-config-page header p,
.protocol-config-page header h2 {
  margin: 0 0 4px;
}
.protocol-config-page header p {
  color: #007aff;
  font-size: 12px;
  font-weight: 700;
}
.protocol-config-page header span {
  color: #667085;
  font-size: 12px;
}
.protocol-config-page header button,
.protocol-config-page footer button {
  border: 1px solid #d7deea;
  border-radius: 7px;
  background: #fff;
  padding: 7px 11px;
  cursor: pointer;
}
.header-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 13px;
  padding: 20px 22px;
}
.header-fields label {
  display: grid;
  gap: 5px;
  color: #4d5a70;
  font-size: 12px;
}
.header-fields small {
  color: #8a94a6;
}
.header-fields input {
  height: 34px;
  border: 1px solid #d7deea;
  border-radius: 7px;
  padding: 0 9px;
  font:
    13px ui-monospace,
    SFMono-Regular,
    Consolas,
    monospace;
  text-transform: uppercase;
}
.config-error {
  margin: 0 22px;
  color: #d92d20;
  font-size: 12px;
}
.protocol-config-page footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 18px 22px;
}
.protocol-config-page footer .save-config {
  border-color: #007aff;
  background: #007aff;
  color: #fff;
}
.protocol-config-page footer button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.little-endian-note {
  display: block;
  margin-top: 6px;
  color: #d92d20;
  font-size: 12px;
  font-weight: 600;
}
/* Consume the host theme contract so this plugin changes with Theme Studio. */
.network-debugger {
  background: var(--content-bg);
  color: var(--text);
}
.settings-panel,
.panel,
.connected-clients button,
.protocol-config-page {
  background: var(--panel);
  border-color: var(--border);
}
.settings-panel {
  border-color: var(--border);
}
.eyebrow,
.segmented button.active,
.protocol-config-button,
.protocol-config-page header p {
  color: var(--accent);
}
.setting-group label,
.receive-options label,
.protocol-select,
.client-select,
.hex-toggle,
.header-fields label,
.log-meta,
.protocol-config-page header span {
  color: var(--text-secondary);
}
.setting-group input,
select,
.header-fields input,
.protocol-config-button,
.protocol-config-page header button,
.protocol-config-page footer button {
  border-color: var(--border);
  background: var(--panel);
  color: var(--text);
}
.setting-group input:focus,
select:focus,
textarea:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-weak);
}
.segmented {
  background: var(--accent-weak);
}
.segmented button.active {
  background: var(--panel);
}
.connection-button,
.send-button,
.protocol-config-page footer .save-config {
  background: var(--accent);
  border-color: var(--accent);
}
.connection-button.close {
  background: var(--danger);
}
.error,
.config-error,
.little-endian-note {
  color: var(--danger);
}
.connected-clients button {
  color: var(--text);
}
.connected-clients button.selected {
  border-color: var(--accent);
  background: var(--accent-weak);
}
.log-list {
  background: var(--content-bg);
}
.log-entry {
  background: var(--panel);
  border-left-color: var(--border);
}
.log-entry.recv {
  border-color: var(--success);
}
.log-entry.send {
  border-color: var(--accent);
}
.log-meta b {
  color: var(--text);
}
.log-entry small,
.connected-clients small,
.empty {
  color: var(--text-secondary);
}
.sender textarea.invalid {
  background: color-mix(in srgb, var(--danger) 10%, var(--panel));
}
.config-overlay {
  background: color-mix(in srgb, var(--text) 35%, transparent);
}

/* Event and data use independent scroll views. The data side is a plain two-column table. */
.log-column-head {
  grid-template-columns: 170px minmax(0, 1fr);
}
.log-column-head span:nth-child(2) {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(150px, 1fr);
  font-size: 0;
}
.log-column-head span:nth-child(2)::before {
  content: '数据域';
  font-size: 11px;
}
.log-column-head span:nth-child(2)::after {
  content: '协议';
  font-size: 11px;
}
.log-list {
  grid-template-columns: 170px minmax(0, 1fr);
  overflow: hidden;
}
.event-stream,
.data-stream {
  overflow-y: auto;
  min-height: 0;
}
.event-entry {
  border-left: 0;
  border-radius: 0;
  background: transparent;
  border-bottom: 1px solid var(--border);
}
.data-entry {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(150px, 1fr);
  column-gap: 12px;
  min-height: 0;
  margin: 0;
  padding: 7px 0;
  border: 0;
  border-bottom: 1px solid var(--border);
  border-radius: 0;
  background: transparent;
}
.data-entry pre {
  grid-column: 1;
}
.data-entry small {
  grid-column: 2;
  margin: 0;
  padding-top: 1px;
}
.data-entry.recv,
.data-entry.send {
  border-left: 0;
}
.log-column-head span:nth-child(2) {
  grid-template-columns: 46px minmax(0, 2fr) 46px minmax(130px, 1fr);
}
.log-column-head span:nth-child(2)::before {
  grid-column: 1 / 3;
  content: '起始地址  数据域';
  white-space: pre;
}
.log-column-head span:nth-child(2)::after {
  grid-column: 3 / 5;
  content: '结束地址  协议';
  white-space: pre;
}
.data-entry {
  grid-template-columns: 46px minmax(0, 2fr) 46px minmax(130px, 1fr);
  column-gap: 8px;
}
.data-entry .address-start {
  grid-column: 1;
}
.data-entry pre {
  grid-column: 2;
}
.data-entry .address-end {
  grid-column: 3;
}
.data-entry .protocol-cell {
  grid-column: 4;
  font-size: 10px;
}
.data-entry .address-start,
.data-entry .address-end {
  padding-top: 2px;
  color: var(--text-secondary);
  font:
    10px ui-monospace,
    SFMono-Regular,
    Consolas,
    monospace;
}
.disconnect-client {
  width: 100%;
  margin-top: 8px;
  border: 1px solid var(--danger);
  border-radius: 7px;
  background: transparent;
  color: var(--danger);
  padding: 7px;
  cursor: pointer;
  font-size: 12px;
}
.data-entry {
  border-bottom: 0;
}
.log-column-head {
  position: relative;
  display: grid;
  grid-template-columns: 170px minmax(0, 1fr);
  column-gap: 12px;
}
.log-column-head span:nth-child(2) {
  display: block;
  font-size: 0;
}
.log-column-head span:nth-child(2)::before {
  position: absolute;
  left: calc(16px + 170px + 12px);
  content: '起始地址';
  font-size: 11px;
}
.log-column-head span:nth-child(2)::after {
  position: absolute;
  left: calc(16px + 170px + 12px + 46px + 8px);
  content: '数据域';
  font-size: 11px;
}
.log-column-head::before {
  position: absolute;
  right: calc(16px + 130px + 8px);
  width: 46px;
  content: '结束地址';
  font-size: 11px;
}
.log-column-head::after {
  position: absolute;
  right: 16px;
  width: 130px;
  content: '协议';
  font-size: 11px;
}
.data-entry {
  grid-template-columns: 40px minmax(0, 1fr) 40px 92px;
  column-gap: 5px;
  padding: 3px 0;
}
.data-entry pre {
  font-size: 11px;
  line-height: 1.35;
  letter-spacing: -0.015em;
}
.data-entry .address-start,
.data-entry .address-end {
  font-size: 9px;
}
.data-entry .protocol-cell {
  align-self: start;
  padding-top: 1px;
  font-size: 9px;
  line-height: 1.25;
}
.log-column-head span:nth-child(2)::after {
  left: calc(16px + 170px + 12px + 40px + 5px);
}
.log-column-head::before {
  right: calc(16px + 92px + 5px);
  width: 40px;
}
.log-column-head::after {
  right: 16px;
  width: 92px;
}
.log-column-head span:nth-child(2)::before,
.log-column-head::before,
.log-column-head::after {
  content: none;
}
.log-column-head span:nth-child(2)::after {
  content: '数据域';
}
.data-entry {
  grid-template-columns: minmax(0, 1fr) 92px;
}
.data-entry pre {
  grid-column: 1;
}
.data-entry .protocol-cell {
  grid-column: 2;
}
.data-entry .byte-chunk {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) 40px;
  column-gap: 5px;
  white-space: nowrap;
}
.data-entry .byte-chunk small {
  display: block;
  margin: 0;
  padding-top: 1px;
  color: var(--text-secondary);
  font:
    9px ui-monospace,
    SFMono-Regular,
    Consolas,
    monospace;
}
.data-entry .byte-chunk b {
  font: inherit;
  font-weight: 400;
}
.data-entry pre {
  width: 100%;
}
.data-entry .byte-chunk {
  width: 100%;
}
.data-entry .byte-chunk > :nth-child(2) {
  min-width: 0;
}
.log-column-head,
.data-table-head {
  display: none;
}
.log-list {
  grid-template-columns: 170px minmax(0, 1fr);
  overflow: hidden;
  padding: 0 16px 12px;
}
.event-stream,
.data-stream {
  overflow: auto;
  min-height: 0;
}
.event-stream::before {
  content: '事件';
  position: sticky;
  top: 0;
  z-index: 1;
  display: block;
  padding: 7px 0;
  background: var(--content-bg);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 700;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font:
    11px/1.35 ui-monospace,
    SFMono-Regular,
    Consolas,
    monospace;
}
.data-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 7px 5px;
  background: var(--accent-weak);
  color: var(--text-secondary);
  font: 700 11px sans-serif;
  text-align: left;
}
.data-table th:nth-child(1),
.data-table th:nth-child(3) {
  width: 40px;
}
.data-table th:nth-child(4) {
  width: 92px;
}
.data-table td {
  padding: 3px 5px;
  vertical-align: top;
  border: 0;
}
.data-table .position-cell {
  color: var(--text-secondary);
  font-size: 9px;
}
.data-table .data-cell {
  white-space: nowrap;
  letter-spacing: -0.015em;
}
.data-table .protocol-cell {
  color: var(--text-secondary);
  font: 9px/1.25 sans-serif;
}
@media (max-width: 760px) {
  .network-debugger {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0, 1fr);
  }
  .settings-panel {
    border-right: 0;
    border-bottom: 1px solid #e0e5ee;
    padding: 16px;
  }
  .setting-group {
    display: inline-block;
    vertical-align: top;
    width: calc(50% - 9px);
    margin-right: 14px;
  }
  .connection-button {
    margin-top: 12px;
  }
  .workbench {
    grid-template-rows: minmax(0, 1fr) 220px;
  }
  .receive-options {
    flex-wrap: wrap;
    justify-content: flex-end;
  }
}
</style>
