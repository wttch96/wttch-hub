/**
 * 文件说明：定义插件服务清单、微信订阅规则、连接状态和发送记录，以及渲染进程使用的桥接接口。
 */

import type { Disposable, ServicePublishResult, ServiceOutput } from '@wttch-hub/plugin-api';
export type ServiceDescriptor = { topic: string; name: string; description: string; enabled: boolean };
export type WechatRule = { id: string; topic: string; peerId: string; enabled: boolean };
export type WechatStatus = {
  configured: boolean; enabled: boolean; connection: 'disconnected' | 'connecting' | 'connected' | 'error';
  accountId?: string; error?: string;
  login?: { status: string; qrImage?: string; message: string };
  peers: { id: string; seenAt: string }[];
  rules: WechatRule[];
  services: ServiceDescriptor[];
  deliveries: { id: string; topic: string; peerId: string; at: string; state: 'sent' | 'failed'; error?: string }[];
};
export interface ServiceBridge {
  register(services: ServiceDescriptor[]): Promise<void>;
  publish(topic: string, output: ServiceOutput): Promise<ServicePublishResult>;
  status(topic: string): Promise<{ configured: boolean; subscribed: number }>;
}
export interface WechatBridge {
  status(): Promise<WechatStatus>;
  login(): Promise<void>;
  verify(code: string): Promise<void>;
  cancelLogin(): Promise<void>;
  logout(): Promise<void>;
  setEnabled(enabled: boolean): Promise<void>;
  saveRules(rules: WechatRule[]): Promise<void>;
  onDidChange(callback: (status: WechatStatus) => void): Disposable;
}
