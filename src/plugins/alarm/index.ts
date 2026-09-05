/**
 * 文件说明：声明闹钟提醒插件的页面入口、能力、生命周期及设置，将插件实现接入工作台运行时。
 */

import { AlarmClock } from 'lucide-vue-next';
import { defineToolPlugin, type PluginComponentApi } from '@wttch-hub/plugin-api';
import { startAlarmScheduler } from './store';

export default defineToolPlugin({
  apiVersion: 1,
  id: 'alarm',
  path: 'alarm',
  navigation: { order: 20 },
  name: '闹钟提醒',
  icon: AlarmClock,
  desc: '创建一次、每天或工作日重复的时间提醒。',
  tags: ['闹钟', '提醒', '时间'],
  tint: ['#ff9f0a', 'rgba(255, 159, 10, 0.13)'],
  component: () => import('./components/AlarmPage.vue'),
  services: [{ id: 'triggered', name: '闹钟触发', description: '闹钟到期时发布提醒标题和时间，可订阅分发到微信。' }],
  capabilities: { services: true, notifications: true, floatingWidget: true, toast: true },
  events: {
    load(context) { return startAlarmScheduler(context as PluginComponentApi, context.reason !== 'floating-widget'); },
    activate() { return { dispose() { /* 调度器属于 load 生命周期。 */ } }; },
    deactivate() { /* 页面关闭不应停止提醒。 */ },
    unload() { /* load 返回的清理函数会停止定时器。 */ },
    settingsChanged() { /* 调度器每次 tick 读取最新设置。 */ },
  },
  statusbar: { label: '闹钟提醒', color: '#ff9f0a' },
  settings: {
    description: '配置系统通知声音和一次性提醒的补偿窗口。',
    fields: [
      { key: 'silent', label: '静音通知', type: 'boolean', defaultValue: false },
      { key: 'graceMinutes', label: '错过后补提醒（分钟）', type: 'number', defaultValue: 10, min: 0, max: 120, step: 1 },
      { key: 'widgetLimit', label: 'Widget 显示数量', type: 'number', defaultValue: 3, min: 1, max: 6, step: 1 },
      { key: 'clock24Hour', label: '使用 24 小时制', type: 'boolean', defaultValue: true },
      { key: 'showSeconds', label: '显示秒钟', type: 'boolean', defaultValue: true },
      { key: 'floatingAlwaysOnTop', label: '浮动时钟始终置顶', type: 'boolean', defaultValue: true },
      { key: 'floatingLocked', label: '浮动时钟锁定位置', type: 'boolean', defaultValue: false },
    ],
  },
  widget: {
    component: () => import('./components/AlarmWidget.vue'),
    defaultWidth: 6,
    defaultHeight: 2,
    minWidth: 4,
    minHeight: 2,
    refreshIntervalMs: 1000,
  },
  floatingWidget: {
    component: () => import('./components/FloatingClock.vue'),
    defaultWidth: 320,
    defaultHeight: 190,
    minWidth: 240,
    minHeight: 140,
  },
});
