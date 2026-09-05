/**
 * 文件说明：管理微信扫码登录、会话上下文和订阅分发队列，处理事件去重、账号切换和发送状态。
 */

import { randomUUID } from 'node:crypto';
import { isRecord, validateJson } from '../data/backup';
import type { ServiceOutput, ServicePublishResult } from '../types/plugin';
import type { ServiceDescriptor, WechatRule, WechatStatus } from './contracts';
import { officialBase, WECHAT_BASE, WechatError, type WechatRequest } from './wechatClient';

export type WechatStored = {
  enabled: boolean; account?: { id: string; token: string; base: string };
  peers: Record<string, { context: string; seenAt: string }>; cursor: string; rules: WechatRule[];
};
export const emptyWechat = (): WechatStored => ({ enabled: false, peers: {}, cursor: '', rules: [] });
const safeId = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 256 && !['__proto__', 'constructor', 'prototype'].includes(value);
export const validTopic = (value: unknown): value is string => typeof value === 'string' && /^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/.test(value) && value.length <= 160;
export function parseWechatStored(value: unknown): WechatStored {
  if (!isRecord(value) || typeof value.enabled !== 'boolean' || !isRecord(value.peers) || !Array.isArray(value.rules) || typeof value.cursor !== 'string') throw new Error('微信本地配置格式错误');
  validateJson(value);
  if (value.account && (!isRecord(value.account) || !safeId(value.account.id) || typeof value.account.token !== 'string' || !value.account.token || typeof value.account.base !== 'string')) throw new Error('微信凭据格式错误');
  if (value.account) officialBase((value.account as WechatStored['account']).base);
  for (const [id, peer] of Object.entries(value.peers)) if (!safeId(id) || !isRecord(peer) || typeof peer.context !== 'string' || typeof peer.seenAt !== 'string') throw new Error('微信会话格式错误');
  for (const rule of value.rules) if (!isRecord(rule) || !safeId(rule.id) || !validTopic(rule.topic) || !safeId(rule.peerId) || typeof rule.enabled !== 'boolean') throw new Error('微信订阅格式错误');
  return value as WechatStored;
}

/**
 * 主进程拥有微信凭据和会话上下文。登录、收取会话、发送队列分别可取消，
 * 每次退出登录或切换账号递增 generation，过期请求不能把旧账号状态写回。
 */
export function createWechatService(deps: {
  initial: WechatStored; request: WechatRequest; save(value: WechatStored): void;
  qr(text: string): Promise<string>; changed(): void;
}) {
  let stored = deps.initial;
  let connection: WechatStatus['connection'] = 'disconnected';
  let error = '';
  let login: WechatStatus['login'];
  let loginSession: { code: string; base: string; started: number; verify?: string } | undefined;
  let generation = 0;
  let loginController: AbortController | undefined;
  let updateController: AbortController | undefined;
  let sendController = new AbortController();
  let loginTimer: ReturnType<typeof setTimeout> | undefined;
  let updateTimer: ReturnType<typeof setTimeout> | undefined;
  let services: ServiceDescriptor[] = [];
  const deliveries: WechatStatus['deliveries'] = [];
  const seen = new Set<string>();
  let tail = Promise.resolve();
  let queued = 0;
  const notify = () => deps.changed();
  const commit = (next: WechatStored) => { deps.save(next); stored = next; };
  const fail = (reason: unknown) => { error = reason instanceof Error ? reason.message : '微信操作失败'; connection = 'error'; notify(); };
  const stopLogin = () => { clearTimeout(loginTimer); loginController?.abort(); loginController = undefined; loginSession = undefined; login = undefined; };
  const stopUpdates = () => { clearTimeout(updateTimer); updateController?.abort(); updateController = undefined; };
  const cancelSends = () => { sendController.abort(); sendController = new AbortController(); generation++; };
  const status = (): WechatStatus => ({
    configured: Boolean(stored.account), enabled: stored.enabled, connection,
    accountId: stored.account?.id, ...(error ? { error } : {}), login: login ? { ...login } : undefined,
    peers: Object.entries(stored.peers).map(([id, peer]) => ({ id, seenAt: peer.seenAt })),
    rules: stored.rules.map(rule => ({ ...rule })), services: services.map(service => ({ ...service })),
    deliveries: deliveries.map(delivery => ({ ...delivery })),
  });
  const receive = async () => {
    if (!stored.account || !stored.enabled) return;
    const revision = generation;
    const account = stored.account;
    const controller = new AbortController(); updateController = controller;
    let delay = 1000;
    try {
      const response = await deps.request(account.base, 'getupdates', { get_updates_buf: stored.cursor }, account.token, controller.signal);
      if (revision !== generation || controller.signal.aborted) return;
      const peers = { ...stored.peers };
      for (const message of response.msgs ?? []) {
        if (message.message_type !== 1 || !safeId(message.from_user_id) || typeof message.context_token !== 'string' || !message.context_token) continue;
        if (!(message.from_user_id in peers) && Object.keys(peers).length >= 100) continue;
        // 只保存投递必需的会话 token，不保存入站消息正文，也不把入站文本交给 AI 执行。
        peers[message.from_user_id] = { context: message.context_token, seenAt: new Date().toISOString() };
      }
      const next = { ...stored, peers, cursor: typeof response.get_updates_buf === 'string' ? response.get_updates_buf : stored.cursor };
      if (JSON.stringify(next) !== JSON.stringify(stored)) commit(next);
      connection = 'connected'; error = ''; notify();
    } catch (reason) {
      if (revision !== generation || controller.signal.aborted) return;
      fail(reason); delay = 10000;
      if (reason instanceof WechatError && reason.code === -14) return; // 登录失效不循环轰炸服务端。
    } finally {
      if (updateController === controller) updateController = undefined;
    }
    if (revision === generation && stored.enabled) updateTimer = setTimeout(() => { void receive(); }, delay);
  };
  const startReceive = () => { stopUpdates(); if (stored.account && stored.enabled) { connection = 'connecting'; void receive(); } };
  const pollLogin = async () => {
    const session = loginSession;
    if (!session) return;
    if (Date.now() - session.started > 5 * 60_000) { stopLogin(); login = { status: 'expired', message: '二维码已过期，请重新扫码' }; notify(); return; }
    const controller = new AbortController(); loginController = controller;
    try {
      const response = await deps.request(session.base, `get_qrcode_status?qrcode=${encodeURIComponent(session.code)}${session.verify ? `&verify_code=${encodeURIComponent(session.verify)}` : ''}`, undefined, undefined, controller.signal);
      if (loginSession !== session || controller.signal.aborted) return;
      const messages: Record<string, string> = { wait: '请用手机微信扫码', scaned: '已扫码，请在手机确认', need_verifycode: '请输入手机微信显示的配对数字', expired: '二维码已过期，请重新生成', verify_code_blocked: '配对码错误次数过多，请重新扫码', binded_redirect: '已绑定；如仍未连接，请在手机解除旧绑定后重试' };
      if (response.status === 'confirmed') {
        if (!safeId(response.ilink_bot_id) || !response.bot_token) throw new Error('微信未返回完整登录凭据');
        const next = { ...emptyWechat(), enabled: true, account: { id: response.ilink_bot_id, token: response.bot_token, base: officialBase(response.baseurl || WECHAT_BASE) } };
        // 新账号不继承旧账号的接收人或订阅，防止意外向另一个微信账号投递。
        commit(next); cancelSends(); stopLogin(); error = ''; startReceive(); notify(); return;
      }
      if (response.status === 'scaned_but_redirect') {
        if (!response.redirect_host) throw new Error('微信登录跳转地址缺失');
        session.base = officialBase(`https://${response.redirect_host}`);
      }
      login = { ...login, status: response.status || 'wait', message: messages[response.status || 'wait'] || '正在连接微信' };
      if (response.status === 'scaned') session.verify = undefined;
      notify();
      if (['need_verifycode', 'expired', 'verify_code_blocked', 'binded_redirect'].includes(response.status || '')) return;
    } catch (reason) {
      if (loginSession !== session || controller.signal.aborted) return;
      login = { ...login, status: 'error', message: reason instanceof Error ? reason.message : '登录失败' }; notify(); return;
    } finally { if (loginController === controller) loginController = undefined; }
    if (loginSession === session) loginTimer = setTimeout(() => { void pollLogin(); }, 1000);
  };
  return {
    status,
    start: startReceive,
    dispose() { stopLogin(); stopUpdates(); cancelSends(); },
    async login() {
      if (stored.account) throw new Error('请先退出当前微信登录，再绑定账号');
      stopLogin();
      const controller = new AbortController(); loginController = controller;
      login = { status: 'loading', message: '正在生成二维码' }; notify();
      try {
        const response = await deps.request(WECHAT_BASE, 'get_bot_qrcode?bot_type=3', { local_token_list: [] }, undefined, controller.signal);
        if (controller.signal.aborted || loginController !== controller) return;
        if (!response.qrcode || !response.qrcode_img_content) throw new Error('微信未返回二维码');
        const image = await deps.qr(response.qrcode_img_content);
        if (controller.signal.aborted || loginController !== controller) return;
        loginSession = { code: response.qrcode, base: WECHAT_BASE, started: Date.now() };
        login = { status: 'wait', qrImage: image, message: '请用手机微信扫码并确认连接' };
        notify(); void pollLogin();
      } catch (reason) { if (!controller.signal.aborted) { login = { status: 'error', message: reason instanceof Error ? reason.message : '登录失败' }; notify(); } }
    },
    verify(code: unknown) {
      if (!loginSession || login?.status !== 'need_verifycode' || typeof code !== 'string' || !/^\d{1,12}$/.test(code)) throw new Error('请填写手机显示的配对数字');
      loginSession.verify = code; login = { ...login, status: 'checking', message: '正在验证配对码' }; notify(); void pollLogin();
    },
    cancelLogin() { stopLogin(); notify(); },
    logout() { commit(emptyWechat()); stopLogin(); stopUpdates(); cancelSends(); seen.clear(); deliveries.length = 0; connection = 'disconnected'; error = ''; notify(); },
    setEnabled(enabled: unknown) {
      if (typeof enabled !== 'boolean') throw new Error('无效的微信开关');
      if (enabled && !stored.account) throw new Error('请先扫码登录');
      commit({ ...stored, enabled }); stopUpdates(); cancelSends();
      if (enabled) startReceive(); else connection = 'disconnected';
      notify();
    },
    register(input: unknown) {
      if (!Array.isArray(input) || input.length > 200) throw new Error('服务清单格式无效');
      const next: ServiceDescriptor[] = input.map(item => {
        if (!isRecord(item) || !validTopic(item.topic) || typeof item.name !== 'string' || typeof item.description !== 'string' || typeof item.enabled !== 'boolean') throw new Error('服务声明格式无效');
        return { topic: item.topic, name: item.name.slice(0, 80), description: item.description.slice(0, 300), enabled: item.enabled };
      });
      if (new Set(next.map(item => item.topic)).size !== next.length) throw new Error('服务 ID 重复');
      services = next; notify();
    },
    saveRules(input: unknown) {
      if (!stored.account || !Array.isArray(input) || input.length > 100) throw new Error('请登录微信后配置订阅（最多 100 条）');
      const rules = input.map(item => {
        if (!isRecord(item) || !safeId(item.id) || !validTopic(item.topic) || !safeId(item.peerId) || typeof item.enabled !== 'boolean') throw new Error('订阅格式无效');
        if (!services.some(service => service.topic === item.topic) || !Object.hasOwn(stored.peers, item.peerId)) throw new Error('请选择已登记服务和收到消息的微信会话');
        return { id: item.id, topic: item.topic, peerId: item.peerId, enabled: item.enabled };
      });
      if (new Set(rules.map(rule => rule.id)).size !== rules.length || new Set(rules.map(rule => `${rule.topic}:${rule.peerId}`)).size !== rules.length) throw new Error('同一服务与接收人不能重复订阅');
      commit({ ...stored, rules }); notify();
    },
    topicStatus(topic: unknown) { return { configured: Boolean(stored.account && stored.enabled), subscribed: stored.rules.filter(rule => rule.enabled && rule.topic === topic).length }; },
    async publish(topic: unknown, input: unknown): Promise<ServicePublishResult> {
      const rejected = (message: string): ServicePublishResult => ({ accepted: false, sent: 0, failed: 0, skipped: 0, error: message });
      if (!validTopic(topic) || !services.some(service => service.topic === topic && service.enabled)) return rejected('服务未声明或插件已禁用');
      if (!isRecord(input) || !safeId(input.id) || typeof input.title !== 'string' || typeof input.text !== 'string' || !input.text.trim()
        || input.title.length > 120 || input.text.length > 3500) return rejected('结果须包含事件 ID、标题及 1–3500 字文本');
      const output = input as ServiceOutput;
      const rules = stored.rules.filter(rule => rule.enabled && rule.topic === topic);
      if (!rules.length) return { accepted: true, sent: 0, failed: 0, skipped: 0 };
      if (!stored.account || !stored.enabled) return rejected('微信未连接或分发已暂停');
      const eventKey = `${topic}:${output.id}`;
      if (seen.has(eventKey)) return { accepted: true, sent: 0, failed: 0, skipped: rules.length };
      if (queued >= 50) return rejected('发送队列已满，请稍后再发布');
      seen.add(eventKey); if (seen.size > 500) seen.delete(seen.values().next().value!);
      const revision = generation; queued++;
      const task = tail.then(async () => {
        const result: ServicePublishResult = { accepted: true, sent: 0, failed: 0, skipped: 0 };
        for (const rule of rules) {
          // 等待队列期间用户可撤销订阅、禁用插件或退出账号，发送前必须再次检查。
          if (revision !== generation || !stored.enabled || !stored.account || !services.some(service => service.topic === topic && service.enabled)
            || !stored.rules.some(current => current.id === rule.id && current.enabled && current.peerId === rule.peerId && current.topic === topic)) { result.skipped++; continue; }
          const peer = stored.peers[rule.peerId];
          const record: WechatStatus['deliveries'][number] = { id: randomUUID(), topic, peerId: rule.peerId, at: new Date().toISOString(), state: 'failed' };
          try {
            if (!peer?.context) throw new Error('缺少会话上下文，请先向 ClawBot 发一条消息');
            await deps.request(stored.account.base, 'sendmessage', { msg: {
              from_user_id: '', to_user_id: rule.peerId, client_id: `hub-${randomUUID()}`, message_type: 2, message_state: 2,
              context_token: peer.context, item_list: [{ type: 1, text_item: { text: output.title ? `${output.title}\n${output.text}` : output.text } }],
            } }, stored.account.token, sendController.signal);
            record.state = 'sent'; result.sent++;
          } catch (reason) { record.error = reason instanceof Error ? reason.message : '发送失败'; result.failed++; }
          // 失败（包括结果不确定的超时）不自动重发，以免同一结果在微信出现多次。
          if (revision === generation) { deliveries.unshift(record); deliveries.splice(50); notify(); }
        }
        return result;
      });
      tail = task.then(() => undefined, () => undefined);
      try { return await task; } finally { queued--; }
    },
  };
}
