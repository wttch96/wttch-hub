export type ProtocolResult = { payload: Uint8Array; summary: string };

/** A small, intentionally simple contract for adding new send-side protocols. */
export interface SendProtocol {
  id: string;
  name: string;
  description: string;
  wrap(input: string): ProtocolResult;
  wrapBytes(input: Uint8Array): ProtocolResult;
}

const encoder = new TextEncoder();

const xorChecksum = (bytes: Uint8Array) => bytes.reduce((value, byte) => value ^ byte, 0);

/** 云遥运控帧头共 37 字节；所有多字节字段均按小端序，数据域长度包含状态码与时标的 5 字节。 */
export type YunyaoHeaderConfig = {
  version: string; satelliteCode: string; sourceId: string; destinationId: string; dataId: string;
  packetSequence: string; reserved8: string; reserved32: string; sentDate: string; sentTime: string;
  statusCode: string; timestamp: string;
};
export const defaultYunyaoHeader: YunyaoHeaderConfig = {
  version: '80', satelliteCode: 'D400', sourceId: '08316704', destinationId: '070000FF', dataId: '01101000',
  packetSequence: '359FC001', reserved8: '00', reserved32: '00000000', sentDate: '1526', sentTime: '320AD912',
  statusCode: '01', timestamp: 'DAB9D612',
};
const hexValue = (value: string) => Number.parseInt(value, 16);
/** 与 DateUtils.utcBytesToTime("2000-01-01", fsrq === 0 ? 0 : fsrq - 1) 对应的发送侧编码。 */
const utcDateCode = (now: Date) => {
  const epoch = Date.UTC(2000, 0, 1);
  const currentDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const days = Math.floor((currentDay - epoch) / 86_400_000);
  return days === 0 ? 0 : days + 1;
};
/** 与 DateUtils.utcBytesTosSecond(fssb / 10000) 对应：UTC 当天秒数乘以 10000。 */
const utcSecondCode = (now: Date) => (((now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds()) * 10_000) + now.getUTCMilliseconds() * 10);

export const wrapYunyao = (body: Uint8Array, header: YunyaoHeaderConfig = defaultYunyaoHeader, now = new Date()): ProtocolResult => {
  const dataLength = body.length + 5;
  if (dataLength > 0xffff) throw new Error('云遥运控协议的数据域不能超过 65530 字节');
  const payload = new Uint8Array(37 + body.length);
  const view = new DataView(payload.buffer);
  payload[0] = hexValue(header.version);
  view.setUint16(1, hexValue(header.satelliteCode), true);
  view.setUint32(3, hexValue(header.sourceId), true);
  view.setUint32(7, hexValue(header.destinationId), true);
  view.setUint32(11, hexValue(header.dataId), true);
  view.setUint32(15, hexValue(header.packetSequence), true);
  payload[19] = hexValue(header.reserved8);
  view.setUint32(20, hexValue(header.reserved32), true);
  view.setUint16(24, utcDateCode(now), true);
  view.setUint32(26, utcSecondCode(now), true);
  view.setUint16(30, dataLength, true);
  payload[32] = hexValue(header.statusCode);
  view.setUint32(33, utcSecondCode(now), true);
  payload.set(body, 37);
  return { payload, summary: `云遥运控帧：37 字节头 + ${body.length} 字节数据（数据域长度 ${dataLength}）` };
};

export const sendProtocols: SendProtocol[] = [
  {
    id: 'raw',
    name: '原始文本',
    description: '不做任何包装，直接发送输入内容。',
    wrap: input => ({ payload: encoder.encode(input), summary: '原始 UTF-8 文本' }),
    wrapBytes: input => ({ payload: input, summary: '原始字节' }),
  },
  {
    id: 'yy-tm',
    name: '云遥-运控中心通信协议',
    description: '在帧内容前包裹协议头',
    wrap: input => wrapYunyao(encoder.encode(input)),
    wrapBytes: input => wrapYunyao(input),
  },
  {
    id: 'length-frame',
    name: '长度帧示例',
    description: '格式：AA 55 + 2 字节大端长度 + UTF-8 数据。',
    wrap: input => {
      const body = encoder.encode(input);
      if (body.length > 0xffff) throw new Error('长度帧的内容不能超过 65535 字节');
      const payload = new Uint8Array(body.length + 4);
      payload.set([0xaa, 0x55, body.length >> 8, body.length & 0xff]);
      payload.set(body, 4);
      return { payload, summary: `AA 55 | 长度 ${body.length} | 数据` };
    },
    wrapBytes: body => {
      if (body.length > 0xffff) throw new Error('长度帧的内容不能超过 65535 字节');
      const payload = new Uint8Array(body.length + 4);
      payload.set([0xaa, 0x55, body.length >> 8, body.length & 0xff]);
      payload.set(body, 4);
      return { payload, summary: `AA 55 | 长度 ${body.length} | 数据` };
    },
  },
  {
    id: 'checksum-frame',
    name: '校验帧示例',
    description: '格式：7E + UTF-8 数据 + XOR 校验和 + 0D 0A。',
    wrap: input => {
      const body = encoder.encode(input);
      const payload = new Uint8Array(body.length + 4);
      payload[0] = 0x7e;
      payload.set(body, 1);
      payload[body.length + 1] = xorChecksum(body);
      payload.set([0x0d, 0x0a], body.length + 2);
      return { payload, summary: `7E | 数据 ${body.length} 字节 | XOR 校验 | 0D 0A` };
    },
    wrapBytes: body => {
      const payload = new Uint8Array(body.length + 4);
      payload[0] = 0x7e;
      payload.set(body, 1);
      payload[body.length + 1] = xorChecksum(body);
      payload.set([0x0d, 0x0a], body.length + 2);
      return { payload, summary: `7E | 数据 ${body.length} 字节 | XOR 校验 | 0D 0A` };
    },
  },
];

export const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes, byte => byte.toString(16).padStart(2, '0').toUpperCase()).join(' ');
