/**
 * 文件说明：使用模拟微信响应验证协议、登录配对、取消竞态、订阅分发、去重与插件发布权限。
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createWechatService, emptyWechat, parseWechatStored, type WechatStored } from '../src/services/wechatService';
import { createWechatRequest, officialBase, WECHAT_BASE, type WechatRequest } from '../src/services/wechatClient';
import { createPluginServicesApi } from '../src/services/pluginApi';
import type { ToolPlugin } from '../src/types/plugin';

const connected = (): WechatStored => ({ ...emptyWechat(), enabled: true,
  account: { id: 'bot', token: 'secret-bot-token', base: WECHAT_BASE },
  peers: { peer: { context: 'secret-context', seenAt: '2026-09-05' } },
  rules: [{ id: 'r1', topic: 'alarm/triggered', peerId: 'peer', enabled: true }],
});
const declaration = [{ topic: 'alarm/triggered', name: '闹钟提醒', description: '', enabled: true }];
const output = { id: 'event1', title: '闹钟', text: '开会提醒' };
const create = (request: WechatRequest, initial = connected()) => {
  const saved: WechatStored[] = [];
  const service = createWechatService({ initial, request, qr: async () => 'data:image/png;base64,qr', save: value => { saved.push(value); }, changed: (): void => undefined });
  service.register(declaration);
  return { service, saved };
};
test('微信协议：只接受官方 HTTPS 地址，发送认证与正文正确，错误不泄漏原文', async () => {
  assert.throws(() => officialBase('https://weixin.qq.com.attacker.test'));
  assert.throws(() => officialBase('http://ilinkai.weixin.qq.com'));
  assert.throws(() => officialBase('https://user:pass@ilinkai.weixin.qq.com'));
  let body = '', auth = '';
  const request = createWechatRequest(async (url, options) => {
    assert.equal(String(url), `${WECHAT_BASE}/ilink/bot/sendmessage`);
    assert.equal(options?.redirect, 'error');
    auth = (options?.headers as Record<string, string>).Authorization;
    body = String(options?.body);
    return new Response('{"ret":0}');
  });
  await request(WECHAT_BASE, 'sendmessage', { msg: { text: 'hello' } }, 'token');
  assert.equal(auth, 'Bearer token'); assert.equal(JSON.parse(body).base_info.bot_agent, 'wttch-hub/1.0.0');
  const bad = createWechatRequest(async () => new Response('{"ret":-14,"errmsg":"secret-bot-token"}'));
  await assert.rejects(bad(WECHAT_BASE, 'getupdates', {}), error => error instanceof Error && error.message.includes('登录已失效') && !error.message.includes('secret'));
});
test('按订阅分发、重复事件去重、状态中不泄漏凭据与会话 token', async () => {
  const requests: Record<string, unknown>[] = [];
  const { service } = create(async (_base, endpoint, body, token) => { assert.equal(endpoint, 'sendmessage'); assert.equal(token, 'secret-bot-token'); requests.push(body!); return { ret: 0 }; });
  assert.deepEqual(await service.publish('alarm/triggered', output), { accepted: true, sent: 1, failed: 0, skipped: 0 });
  assert.equal((requests[0].msg as Record<string, unknown>).context_token, 'secret-context');
  assert.equal((await service.publish('alarm/triggered', output)).skipped, 1);
  assert.equal(requests.length, 1);
  const status = JSON.stringify(service.status());
  assert.ok(!status.includes('secret')); assert.ok(!status.includes('开会提醒'));
  assert.equal(service.status().deliveries[0].state, 'sent');
  service.dispose();
});
test('没有订阅、暂停或未声明服务时不发送', async () => {
  let requests = 0;
  const initial = connected(); initial.rules = [];
  const { service } = create(async () => { requests++; return {}; }, initial);
  assert.equal((await service.publish('alarm/triggered', output)).sent, 0);
  service.saveRules(connected().rules);
  service.setEnabled(false);
  assert.equal((await service.publish('alarm/triggered', output)).accepted, false);
  assert.equal((await service.publish('other/result', output)).accepted, false);
  assert.equal(requests, 0); service.dispose();
});
test('排队期间撤销订阅，不再发送后续结果；失败不自动重发', async () => {
  let finish!: () => void;
  const wait = new Promise<void>(resolve => { finish = resolve; });
  let requests = 0;
  const { service } = create(async () => { requests++; await wait; throw new Error('发送超时'); });
  const first = service.publish('alarm/triggered', output);
  await Promise.resolve();
  const second = service.publish('alarm/triggered', { ...output, id: 'event2' });
  service.saveRules([]); finish();
  assert.equal((await first).failed, 1);
  assert.equal((await second).skipped, 1);
  assert.equal(requests, 1); service.dispose();
});
test('扫码配对流程：需要配对码才提交，确认后加密存储层收到凭据，新账号清空旧订阅', async () => {
  let statusPolls = 0;
  const { service, saved } = create(async (_base, endpoint) => {
    if (endpoint.startsWith('get_bot_qrcode')) return { qrcode: 'qr-secret', qrcode_img_content: 'https://weixin.qq.com/qr' };
    if (endpoint.startsWith('get_qrcode_status')) {
      statusPolls++;
      if (statusPolls === 1) return { status: 'need_verifycode' };
      assert.ok(endpoint.includes('verify_code=123456'));
      return { status: 'confirmed', ilink_bot_id: 'new-bot', bot_token: 'new-token', baseurl: WECHAT_BASE };
    }
    return new Promise(() => { /* 模拟等待入站消息，不访问微信。 */ });
  }, emptyWechat());
  await service.login(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(service.status().login?.status, 'need_verifycode');
  service.verify('123456'); await new Promise(resolve => setImmediate(resolve));
  assert.equal(service.status().configured, true);
  assert.equal(saved.at(-1)?.account?.token, 'new-token');
  assert.deepEqual(service.status().rules, []);
  assert.ok(!JSON.stringify(service.status()).includes('new-token'));
  service.dispose();
});
test('登录取消后，迟到的确认响应不会恢复账号', async () => {
  let finish!: (value: { status: string; bot_token: string; ilink_bot_id: string }) => void;
  const pending = new Promise<{ status: string; bot_token: string; ilink_bot_id: string }>(resolve => { finish = resolve; });
  const { service } = create(async (_base, endpoint) => endpoint.startsWith('get_bot_qrcode') ? { qrcode: 'qr', qrcode_img_content: 'url' } : pending, emptyWechat());
  await service.login(); service.cancelLogin(); finish({ status: 'confirmed', bot_token: 'late', ilink_bot_id: 'late' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(service.status().configured, false); service.dispose();
});
test('插件服务 API 固定发布命名空间并拒绝禁用插件', async () => {
  let enabled = true;
  const calls: string[] = [];
  const api = createPluginServicesApi({ id: 'alarm', capabilities: { services: true }, services: [{ id: 'triggered', name: '闹钟' }] } as ToolPlugin, () => enabled,
    () => ({ register: async (): Promise<void> => undefined, status: async () => ({ configured: true, subscribed: 1 }), publish: async topic => { calls.push(topic); return { accepted: true, sent: 1, failed: 0, skipped: 0 }; } }));
  assert.equal((await api.publish('triggered', output)).sent, 1);
  assert.equal((await api.publish('other', output)).accepted, false);
  enabled = false;
  assert.equal((await api.publish('triggered', output)).accepted, false);
  assert.deepEqual(calls, ['alarm/triggered']);
  assert.throws(() => parseWechatStored({ ...connected(), peers: { bad: [] } }));
});
