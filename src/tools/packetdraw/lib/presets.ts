/**
 * 文件说明：提供协议编辑器的内置示例文本与模板清单，帮助用户了解字段、位区间和嵌套语法。
 */

// 内置示例模板。
//
// 语法以 packet.g4 为准：位位置是数字，可选 `[expr]` 角标标签（文本替换方框角标，
// 不求值）；`[+n]` 是渲染长度（从起始位起画 n bit）；`+N` 是相对上一同级字段结束位
// 的偏移；注释用 %%；字符串仅双引号。

export interface Preset {
  id: string
  name: string
  text: string
}

export const PRESET_DEFAULT_TEXT = `%% Bit 协议定义 · IPv4 + TCP 示例
%% 行注释 %%；字符串仅双引号
0-15: "EtherType (0x0800)"

%% IPv4 头部：固定 20 字节 = 160 bit
16-175: "IPv4 Header" {
    0-3:    "Version (4)"
    4-7:    "IHL"
    8-15:   "Type of Service"
    16-31:  "Total Length"
    32-47:  "Identification"
    48-55:  "Flags"
    56-63:  "Fragment Offset"
    64-71:  "TTL"
    72-79:  "Protocol"
    80-95:  "Checksum"
    96-127: "Source IP"
    128-159: "Destination IP"
}

%% TCP 头部：固定 20 字节 = 160 bit
176-335: "TCP Header" {
    0-15:   "Source Port"
    16-31:  "Destination Port"
    32-63:  "Sequence Number"
    64-95:  "Acknowledgment Number"
    96-99:  "Data Offset"
    100-105: "Reserved"
    106:     "URG"
    107:     "ACK"
    108:     "PSH"
    109:     "RST"
    110:     "SYN"
    111:     "FIN"
    112-127: "Window Size"
    128-143: "Checksum"
    144-159: "Urgent Pointer"
    %% 位区间标注 160-175；[+16] 决定几何：从相对 160 起画 16 bit
    160-175[+16]: "TCP Options"
}

%% 数据：位区间 336（两端角标 336），[+512] 画 512 bit
336[+512]: "HTTP/1.1 Payload"
`

export const PRESET_SIMPLE_TEXT = `%% 简单的 32 位包头示例
%% [expr] 角标：用文本替换方框该端数字（不计算）
0-7[Proto]:  "Protocol ID"
8-11[Ver]:   "Version (4)"
12-15:       "Header Length"
16-23:       "Sequence Number"
24-31:       "Flags"

%% +1：起始位 = 上一字段结束位(31) + 1 = 32；[+8] 画 8 bit
+1[+8]:      "Trailer"
`

export const PRESETS: Preset[] = [
  {
    id: 'ipv4-tcp',
    name: 'IPv4 + TCP',
    text: PRESET_DEFAULT_TEXT,
  },
  {
    id: 'simple32',
    name: '32-bit 包头',
    text: PRESET_SIMPLE_TEXT,
  },
]

export const DEFAULT_PRESET = PRESETS[0]
