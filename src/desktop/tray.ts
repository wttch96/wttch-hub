/**
 * 文件说明：定位各平台图标资源并创建系统托盘菜单，提供显示、隐藏工作台和退出应用的入口。
 */

import { app, Menu, nativeImage, Tray } from 'electron';
import path from 'node:path';

/** 开发时读取源码资产，发行包读取 Forge extraResource 复制到 Resources/icons 的文件。 */
export const getIconDirectory = () => app.isPackaged
  ? path.join(process.resourcesPath, 'icons')
  : path.join(app.getAppPath(), 'assets', 'icons');
export const getApplicationIconPath = () => path.join(getIconDirectory(), process.platform === 'win32' ? 'hub.ico' : 'hub.png');

export type TrayActions = {
  show(): void;
  hide(): void;
  isVisible(): boolean;
  quit(): void;
};

/**
 * macOS 使用黑色透明 Template，系统按菜单栏明暗自动着色并选用 @2x 资源。
 * Windows 直接传入 ICO 文件，让系统为当前 DPI 选择 16/24/32/48 等尺寸。
 * 不把托盘图标塞进 Vite 的资源哈希流程，否则 Template/@2x 文件名匹配会失效。
 */
export const createSystemTray = (actions: TrayActions) => {
  const mac = process.platform === 'darwin';
  const imagePath = path.join(getIconDirectory(), mac ? 'hubTemplate.png' : process.platform === 'win32' ? 'hub.ico' : 'hub.png');
  const image = nativeImage.createFromPath(imagePath);
  if (image.isEmpty()) throw new Error(`无法读取托盘图标：${imagePath}`);
  if (mac) image.setTemplateImage(true);
  const tray = new Tray(process.platform === 'win32' ? imagePath : mac ? image : image.resize({ width: 24, height: 24 }));
  tray.setToolTip('wttch-hub · 工作台');
  const menu = () => Menu.buildFromTemplate([
    { label: '显示工作台', click: actions.show },
    { label: '隐藏工作台', enabled: actions.isVisible(), click: actions.hide },
    { type: 'separator' },
    { label: '退出 wttch-hub', click: actions.quit },
  ]);
  const refresh = () => {
    if (!tray.isDestroyed()) tray.setContextMenu(menu());
  };
  // macOS 由系统处理已绑定菜单的点击，避免手动弹出导致菜单重复打开。
  // Windows 右键使用原生上下文菜单，左键补充弹出同一菜单；显示窗口只能通过菜单操作。
  if (mac) {
    tray.setIgnoreDoubleClickEvents(true);
  } else {
    tray.on('click', () => tray.popUpContextMenu(menu()));
  }
  refresh();
  return {
    refresh,
    destroy() { if (!tray.isDestroyed()) tray.destroy(); },
  };
};
