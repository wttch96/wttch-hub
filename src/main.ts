/**
 * 文件说明：Electron 主进程入口，负责单实例、窗口与托盘生命周期，并注册插件、AI、数据管理和微信分发的主进程接口。
 */

import { app, BrowserWindow, dialog, ipcMain, net, Notification, screen } from 'electron';
import 'dotenv/config';
import path from 'node:path';
import dgram from 'node:dgram';
import tcp from 'node:net';
import { pathToFileURL } from 'node:url';
import { registerAiIpc } from '@module/ai/main';
import { registerWechatIpc } from './services/main';
import { registerDataIpc } from './data/main';
import { createPreferences, shouldHideOnClose } from './desktop/preferences';
import { createSystemTray, getApplicationIconPath } from './desktop/tray';
import fs from 'node:fs';
import started from 'electron-squirrel-startup';
import si from 'systeminformation';
import { strFromU8, unzipSync } from 'fflate';
import { macGpuUtilization, macMemoryUsage } from './system/macosStats';
import { debugError, debugLog, initializeDebugLogger } from './desktop/logger';

type PluginPackageInfo = {
  apiVersion: number;
  id: string;
  version: string;
  name: string;
  entry: string;
  file: string;
  capabilities?: string[];
  removable?: boolean;
  source?: 'managed' | 'sandbox' | 'workspace';
};
type PluginBundle = {
  apiVersion: number;
  plugins: Omit<PluginPackageInfo, 'file'>[]
};
type FloatingWidgetOptions = {
  id?: string;
  width?: number;
  height?: number;
  alwaysOnTop?: boolean;
  locked?: boolean
};

const pluginDirectories = () => [
  { directory: path.join(app.getPath('userData'), 'plugins'), source: 'managed' as const, removable: true },
  // 开发期构建的插件包固定进入项目沙盒，避免把可再生的 ZIP 混入源码或用户正式仓库。
  { directory: path.join(process.cwd(), 'sandbox', 'plugins'), source: 'sandbox' as const, removable: true },
  { directory: path.join(process.cwd(), 'plugins'), source: 'workspace' as const, removable: false },
];
const isSafePluginEntry = (entry: string) => {
  const normalized = path.posix.normalize(entry.replaceAll('\\', '/'));
  return normalized !== '.' && normalized !== '..' && !normalized.startsWith('../') && !path.posix.isAbsolute(normalized);
};
const readPluginPackage = (archivePath: string, meta: { source: 'managed' | 'sandbox' | 'workspace'; removable: boolean }): PluginPackageInfo[] => {
  const file = path.basename(archivePath);
  try {
    if (fs.statSync(archivePath).size > 50 * 1024 * 1024) throw new Error('插件包超过 50 MB 限制');
    const archive = unzipSync(new Uint8Array(fs.readFileSync(archivePath)));
    if (Object.values(archive).reduce((total, bytes) => total + bytes.byteLength, 0) > 100 * 1024 * 1024) {
      throw new Error('插件包解压后超过 100 MB 限制');
    }
    const packageFile = archive['package.json'];
    if (!packageFile) throw new Error('ZIP 根目录缺少 package.json');
    const bundle = JSON.parse(strFromU8(packageFile)) as PluginBundle;
    if (bundle.apiVersion !== 1 || !Array.isArray(bundle.plugins)) throw new Error('插件 API 版本不兼容');
    const plugins = bundle.plugins;
    if (!plugins.length || !plugins.every((plugin) => plugin.apiVersion === 1
      && /^[a-z0-9][a-z0-9-]*$/.test(plugin.id)
      && Boolean(plugin.version && plugin.name && plugin.entry)
      && isSafePluginEntry(plugin.entry))) throw new Error('包中包含无效插件定义');
    if (new Set(plugins.map((plugin) => plugin.id)).size !== plugins.length) throw new Error('包中存在重复插件 ID');
    return plugins.map((plugin) => ({ ...plugin, file, ...meta }));
  } catch (error) {
    throw new Error(`${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
};
const loadPluginPackages = (): PluginPackageInfo[] => pluginDirectories().flatMap(({ directory, ...meta }) => {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory)
    .filter((file) => file.endsWith('.zip'))
    .flatMap((file) => {
      try {
        return readPluginPackage(path.join(directory, file), meta);
      } catch (error) {
        debugError('plugins', 'package ignored', error, { file, source: meta.source });
        console.warn(`[plugins] ignored ${file}: ${error instanceof Error ? error.message : String(error)}`);
        return [];
      }
    });
});

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// 安装器事件不获取锁；第二次启动立即退出，已有进程负责恢复窗口。
const primaryInstance = !started && app.requestSingleInstanceLock();
if (!primaryInstance) app.quit();
let quitting = false;
app.on('before-quit', () => { quitting = true; });
let preferences: ReturnType<typeof createPreferences>;

// 渲染进程的 console 默认只在 DevTools 可见。将 warning/error 转发到主进程，
// 使从终端启动 Electron 时也能直接看到插件与页面异常。
app.on('web-contents-created', (_event, contents) => {
  contents.on('console-message', (_consoleEvent, level, message, line, sourceId) => {
    if (level < 2) return;
    console.error(`[renderer:${level}] ${message} (${sourceId}:${line})`);
  });
});

// Keep hardware acceleration on for normal desktop use. It is needed for
// smooth macOS vibrancy and translucent-window resizing; disable it only for
// restricted or virtualised environments via .env.
const disableHardwareAcceleration =
  process.env.WTTCH_DISABLE_HARDWARE_ACCELERATION === '1';
if (disableHardwareAcceleration) {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('in-process-gpu');
}
// 默认保留 Chromium 沙箱。仅允许开发环境为受限虚拟机显式关闭，
// 防止本地诊断用的启动参数随安装包进入普通用户环境。
if (!app.isPackaged && process.env.WTTCH_DISABLE_SANDBOX === '1') {
  app.commandLine.appendSwitch('no-sandbox');
}

// ---------------------------------------------------------------------------
// Platform / window styling
// ---------------------------------------------------------------------------
// On Windows we drop the native frame and draw a full macOS-style title bar
// inside the renderer. macOS uses the native traffic lights over a renderer
// title bar so the whole top area shares the same translucent material.
const CUSTOM_CHROME = process.platform === 'win32';
const MACOS_CHROME = process.platform === 'darwin';
// Forge's Vite plugin injects this global while serving the dev renderer. A
// stale build environment can leave that URL embedded in a package, so never
// trust it once this executable is packaged.
const devServerUrl = app.isPackaged
  ? undefined
  // Vite can bind to IPv6 `::1` while Electron resolves `localhost` to IPv4
  // on Windows. Always use the IPv4 loopback address for the desktop client.
  : MAIN_WINDOW_VITE_DEV_SERVER_URL?.replace('://localhost:', '://127.0.0.1:');

// Renderer <-> main messages for the custom window controls.
const IPC = {
  minimize: 'win:minimize',
  toggleMaximize: 'win:toggle-maximize',
  close: 'win:close',
  toggleDevTools: 'win:toggle-devtools',
  maximizedChanged: 'win:maximized-changed',
  systemStats: 'system:stats',
  showNotification: 'notifications:show',
  floatingOpen: 'floating-widget:open',
  floatingUpdate: 'floating-widget:update',
  floatingClose: 'floating-widget:close',
  showWorkbench: 'workbench:show',
  pluginPackages: 'plugins:list',
  pluginInstall: 'plugins:install',
  pluginRemove: 'plugins:remove',
  pluginDebugLog: 'plugins:debug-log',
  pluginStorageRead: 'plugin-storage:read',
  pluginStorageWrite: 'plugin-storage:write',
} as const;

type NetworkDebugInput = {
  type: 'udp' | 'tcp'; tcpMode?: 'client' | 'server'; localHost: string; localPort: number; remoteHost: string; remotePort: number;
};
type NetworkDebugClient = { id: string; socket: tcp.Socket; host: string; port: number };
type NetworkDebugSession = { udp?: dgram.Socket; tcp?: tcp.Socket; server?: tcp.Server; clients?: Map<string, NetworkDebugClient>; input: NetworkDebugInput };
const networkDebugSessions = new Map<number, NetworkDebugSession>();
const isNetworkDebugInput = (value: unknown): value is NetworkDebugInput => {
  if (!value || typeof value !== 'object') return false;
  const input = value as Record<string, unknown>;
  const validPort = (port: unknown) => typeof port === 'number' && Number.isInteger(port) && port >= 0 && port <= 65535;
  const isTcpServer = input.type === 'tcp' && input.tcpMode === 'server';
  return (input.type === 'udp' || input.type === 'tcp')
    && (input.tcpMode === undefined || input.tcpMode === 'client' || input.tcpMode === 'server')
    && typeof input.localHost === 'string' && input.localHost.length <= 255
    && validPort(input.localPort)
    && (isTcpServer || (typeof input.remoteHost === 'string' && input.remoteHost.length <= 255 && validPort(input.remotePort) && (input.remotePort as number) > 0));
};
const closeNetworkDebugSession = (webContentsId: number) => {
  const session = networkDebugSessions.get(webContentsId);
  if (!session) return;
  networkDebugSessions.delete(webContentsId);
  session.udp?.close();
  session.tcp?.destroy();
  session.clients?.forEach(client => client.socket.destroy());
  session.server?.close();
};
const sendNetworkDebugState = (webContents: Electron.WebContents, state: { open: boolean; error?: string }) => {
  if (!webContents.isDestroyed()) webContents.send('network-debug:state', state);
};
const sendNetworkDebugClients = (webContents: Electron.WebContents, clients: Map<string, NetworkDebugClient>) => {
  if (!webContents.isDestroyed()) webContents.send('network-debug:clients', [...clients.values()].map(({ id, host, port }) => ({ id, host, port })));
};

ipcMain.handle('network-debug:open', async (event, input: unknown) => {
  if (!isNetworkDebugInput(input)) return { ok: false, error: '网络参数无效，请检查地址和端口。' };
  closeNetworkDebugSession(event.sender.id);
  const emitMessage = (data: Buffer, remoteHost: string, remotePort: number) => {
    if (!event.sender.isDestroyed()) event.sender.send('network-debug:message', {
      dataBase64: data.toString('base64'), remoteHost, remotePort, timestamp: new Date().toISOString(),
    });
  };
  try {
    if (input.type === 'udp') {
      const socket = dgram.createSocket('udp4');
      await new Promise<void>((resolve, reject) => {
        socket.once('error', reject);
        socket.bind(input.localPort, input.localHost, () => { socket.off('error', reject); resolve(); });
      });
      socket.on('message', (data, remote) => emitMessage(data, remote.address, remote.port));
      socket.on('error', error => sendNetworkDebugState(event.sender, { open: false, error: error.message }));
      networkDebugSessions.set(event.sender.id, { udp: socket, input });
    } else if (input.tcpMode !== 'server') {
      const socket = new tcp.Socket();
      await new Promise<void>((resolve, reject) => {
        const fail = (error: Error) => { socket.destroy(); reject(error); };
        socket.once('error', fail);
        socket.connect({ host: input.remoteHost, port: input.remotePort, localAddress: input.localHost, localPort: input.localPort }, () => {
          socket.off('error', fail); resolve();
        });
      });
      socket.on('data', data => emitMessage(Buffer.isBuffer(data) ? data : Buffer.from(data), input.remoteHost, input.remotePort));
      socket.on('close', () => {
        if (networkDebugSessions.get(event.sender.id)?.tcp === socket) {
          networkDebugSessions.delete(event.sender.id); sendNetworkDebugState(event.sender, { open: false });
        }
      });
      socket.on('error', error => sendNetworkDebugState(event.sender, { open: false, error: error.message }));
      networkDebugSessions.set(event.sender.id, { tcp: socket, input });
    } else {
      const clients = new Map<string, NetworkDebugClient>();
      const server = tcp.createServer(socket => {
        const peer = `${socket.remoteAddress ?? 'unknown'}`;
        const peerPort = socket.remotePort ?? 0;
        const id = `${peer}:${peerPort}`;
        clients.set(id, { id, socket, host: peer, port: peerPort });
        sendNetworkDebugClients(event.sender, clients);
        socket.on('data', data => emitMessage(Buffer.isBuffer(data) ? data : Buffer.from(data), peer, peerPort));
        const removeClient = () => { clients.delete(id); sendNetworkDebugClients(event.sender, clients); };
        socket.on('close', removeClient);
        socket.on('error', removeClient);
      });
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(input.localPort, input.localHost, () => { server.off('error', reject); resolve(); });
      });
      server.on('error', error => sendNetworkDebugState(event.sender, { open: false, error: error.message }));
      networkDebugSessions.set(event.sender.id, { server, clients, input });
    }
    sendNetworkDebugState(event.sender, { open: true });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    sendNetworkDebugState(event.sender, { open: false, error: message });
    return { ok: false, error: message };
  }
});
ipcMain.handle('network-debug:close', (event) => { closeNetworkDebugSession(event.sender.id); sendNetworkDebugState(event.sender, { open: false }); return true; });
ipcMain.handle('network-debug:clients', (event) => {
  const clients = networkDebugSessions.get(event.sender.id)?.clients;
  return clients ? [...clients.values()].map(({ id, host, port }) => ({ id, host, port })) : [];
});
ipcMain.handle('network-debug:disconnect-client', (event, clientId: unknown) => {
  if (typeof clientId !== 'string') return false;
  const client = networkDebugSessions.get(event.sender.id)?.clients?.get(clientId);
  if (!client) return false;
  client.socket.destroy();
  return true;
});
ipcMain.handle('network-debug:send', async (event, dataBase64: unknown, clientId?: unknown) => {
  if (typeof dataBase64 !== 'string' || dataBase64.length > 2_800_000 || !/^[A-Za-z0-9+/]*={0,2}$/.test(dataBase64)) return { ok: false, error: '发送数据无效或过大。' };
  const session = networkDebugSessions.get(event.sender.id);
  if (!session) return { ok: false, error: '请先打开连接。' };
  const data = Buffer.from(dataBase64, 'base64');
  try {
    if (session.udp) await new Promise<void>((resolve, reject) => session.udp?.send(data, session.input.remotePort, session.input.remoteHost, error => error ? reject(error) : resolve()));
    else if (session.tcp) await new Promise<void>((resolve, reject) => session.tcp?.write(data, error => error ? reject(error) : resolve()));
    else if (session.clients) {
      if (typeof clientId !== 'string') return { ok: false, error: '请先选择一个 TCP 客户端。' };
      const client = session.clients.get(clientId);
      if (!client || client.socket.destroyed) return { ok: false, error: '所选 TCP 客户端已断开。' };
      await new Promise<void>((resolve, reject) => client.socket.write(data, error => error ? reject(error) : resolve()));
    }
    return { ok: true };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : String(error) }; }
});

const floatingWidgets = new Map<string, BrowserWindow>();
const safeFloatingPluginId = (value: unknown): value is string => typeof value === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(value);
const safeFloatingWindowId = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(value);
const floatingWindowKey = (pluginId: string, id = 'default') => `${pluginId}:${id}`;
const floatingSize = (value: unknown, fallback: number, min: number, max: number) => typeof value === 'number' && Number.isFinite(value)
  ? Math.round(Math.max(min, Math.min(max, value)))
  : fallback;
const setFloatingVisibleOnAllWorkspaces = (window: BrowserWindow, visible: boolean) => {
  try {
    window.setVisibleOnAllWorkspaces(visible, { visibleOnFullScreen: true });
  } catch (error) {
    // Linux window managers and some virtual desktop environments do not
    // implement this API. The widget can still work as a normal always-on-top
    // window, so do not make opening it fail for this optional behavior.
    console.warn('[floating-widget] visible-on-all-workspaces is unavailable:', error);
  }
};
const applyFloatingOptions = (window: BrowserWindow, options: FloatingWidgetOptions = {}) => {
  if (options.width !== undefined || options.height !== undefined) {
    const [currentWidth, currentHeight] = window.getSize();
    window.setSize(
      floatingSize(options.width, currentWidth, 180, 900),
      floatingSize(options.height, currentHeight, 100, 700),
      true,
    );
  }
  if (options.alwaysOnTop !== undefined) {
    window.setAlwaysOnTop(options.alwaysOnTop, 'floating');
    setFloatingVisibleOnAllWorkspaces(window, options.alwaysOnTop);
  }
  if (options.locked !== undefined) {
    window.setMovable(!options.locked);
    window.setResizable(!options.locked);
  }
};

ipcMain.handle(IPC.floatingOpen, async (_event, pluginId: unknown, options: FloatingWidgetOptions = {}) => {
  if (!safeFloatingPluginId(pluginId)) throw new Error('无效的浮动 Widget 插件 ID');
  const windowId = options.id ?? 'default';
  if (!safeFloatingWindowId(windowId)) throw new Error('无效的浮动窗口 ID');
  const key = floatingWindowKey(pluginId, windowId);
  const existing = floatingWidgets.get(key);
  if (existing && !existing.isDestroyed()) {
    debugLog('floating-widget', 'reusing widget window', { pluginId, windowId });
    applyFloatingOptions(existing, options);
    existing.show(); existing.focus();
    return true;
  }
  const width = floatingSize(options.width, 320, 180, 900);
  const height = floatingSize(options.height, 190, 100, 700);
  const workArea = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
  const floatingWindow = new BrowserWindow({
    width, height,
    x: workArea.x + workArea.width - width - 24,
    y: workArea.y + 24,
    minWidth: 180,
    minHeight: 100,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    skipTaskbar: true,
    show: false,
    resizable: options.locked !== true,
    movable: options.locked !== true,
    alwaysOnTop: options.alwaysOnTop !== false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), backgroundThrottling: false },
  });
  floatingWidgets.set(key, floatingWindow);
  debugLog('floating-widget', 'creating widget window', { pluginId, windowId, width, height });
  setFloatingVisibleOnAllWorkspaces(floatingWindow, options.alwaysOnTop !== false);
  floatingWindow.on('closed', () => floatingWidgets.delete(key));
  const hash = `/floating/${pluginId}`;
  try {
    // `ready-to-show` is not guaranteed for every transparent frameless
    // window. Waiting for the document and explicitly showing the window makes
    // the IPC result match what the user actually sees.
    if (devServerUrl) await floatingWindow.loadURL(`${devServerUrl}#${hash}`);
    else await floatingWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`), { hash });
    if (floatingWindow.isDestroyed()) return false;
    floatingWindow.show();
    floatingWindow.focus();
    return floatingWindow.isVisible();
  } catch (error) {
    debugError('floating-widget', 'failed to open', error, { pluginId, windowId });
    floatingWidgets.delete(key);
    if (!floatingWindow.isDestroyed()) floatingWindow.destroy();
    console.error(`[floating-widget] failed to open ${pluginId}:`, error);
    throw error;
  }
});
ipcMain.handle(IPC.floatingUpdate, (event, pluginId: unknown, options: FloatingWidgetOptions = {}) => {
  if (!safeFloatingPluginId(pluginId)) return false;
  const id = options.id ?? 'default';
  if (!safeFloatingWindowId(id)) return false;
  const ownWindow = BrowserWindow.fromWebContents(event.sender);
  const floatingWindow = ownWindow && [...floatingWidgets.entries()].some(([key, value]) => key.startsWith(`${pluginId}:`) && value === ownWindow)
    ? ownWindow
    : floatingWidgets.get(floatingWindowKey(pluginId, id));
  if (!floatingWindow || floatingWindow.isDestroyed()) return false;
  applyFloatingOptions(floatingWindow, options);
  return true;
});
ipcMain.handle(IPC.floatingClose, (event, pluginId: unknown, id?: unknown) => {
  if (!safeFloatingPluginId(pluginId)) return false;
  // 浮动窗内部调用 close 时，以 sender 为准，确保非默认实例关闭自身。
  const ownWindow = BrowserWindow.fromWebContents(event.sender);
  const floatingWindow = ownWindow && [...floatingWidgets.entries()].some(([key, value]) => key.startsWith(`${pluginId}:`) && value === ownWindow)
    ? ownWindow
    : floatingWidgets.get(floatingWindowKey(pluginId, typeof id === 'string' ? id : 'default'));
  if (!floatingWindow || floatingWindow.isDestroyed()) return false;
  floatingWindow.close();
  return true;
});

ipcMain.handle(IPC.showNotification, (_event, input: { title?: unknown; body?: unknown; silent?: unknown }) => {
  const title = typeof input?.title === 'string' ? input.title.trim().slice(0, 120) : '';
  const body = typeof input?.body === 'string' ? input.body.trim().slice(0, 500) : '';
  if (!title || !Notification.isSupported()) return false;
  new Notification({ title, body, silent: input.silent === true }).show();
  return true;
});

ipcMain.handle(IPC.pluginPackages, () => loadPluginPackages());
ipcMain.handle(IPC.pluginInstall, async () => {
  const result = await dialog.showOpenDialog({
    title: '加载 wttch-hub 插件包',
    properties: ['openFile'],
    filters: [{ name: 'wttch-hub 插件包', extensions: ['zip'] }],
  });
  if (result.canceled || !result.filePaths[0]) return { installed: [], cancelled: true };
  const source = result.filePaths[0];
  // 全量解析校验成功后才复制，避免半安装状态；同名包视为更新。
  readPluginPackage(source, { source: 'managed', removable: true });
  const managedDirectory = pluginDirectories()[0].directory;
  fs.mkdirSync(managedDirectory, { recursive: true });
  const destination = path.join(managedDirectory, path.basename(source));
  if (path.resolve(source) !== path.resolve(destination)) fs.copyFileSync(source, destination);
  debugLog('plugins', 'package installed', { file: path.basename(destination) });
  return { installed: readPluginPackage(destination, { source: 'managed', removable: true }) };
});
ipcMain.handle(IPC.pluginRemove, (_event, input: { file?: unknown; source?: unknown }) => {
  const file = typeof input?.file === 'string' ? input.file : '';
  const source = input?.source;
  if (source !== 'managed' && source !== 'sandbox') throw new Error('该插件包来源不可删除');
  const location = pluginDirectories().find((item) => item.source === source && item.removable);
  if (!location) throw new Error('找不到可删除的插件包目录');
  const target = path.join(location.directory, path.basename(file));
  if (path.dirname(target) !== location.directory || !target.endsWith('.zip')) throw new Error('无效的插件包路径');
  if (fs.existsSync(target)) fs.unlinkSync(target);
  debugLog('plugins', 'package removed', { file: path.basename(target), source });
  return loadPluginPackages();
});

/** 插件私有数据按插件 ID 分目录保存，便于后续替换为 OSS 同步适配器。 */
const pluginStorageFile = (pluginId: string) => path.join(app.getPath('userData'), 'plugin-data', pluginId, 'data.json');
const readPluginStorage = (pluginId: unknown): Record<string, unknown> => {
  if (!safeFloatingPluginId(pluginId)) return {};
  try {
    const value = JSON.parse(fs.readFileSync(pluginStorageFile(pluginId), 'utf8'));
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  } catch { return {}; }
};
ipcMain.on(IPC.pluginStorageRead, (event, pluginId: unknown) => { event.returnValue = readPluginStorage(pluginId); });
ipcMain.handle(IPC.pluginStorageWrite, (_event, pluginId: unknown, value: unknown) => {
  if (!safeFloatingPluginId(pluginId) || !value || typeof value !== 'object' || Array.isArray(value)) return false;
  const file = pluginStorageFile(pluginId);
  try { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8'); return true; }
  catch (error) { console.error(`[plugin-storage] failed to save ${pluginId}:`, error); return false; }
});

/** 悬浮提醒点击后恢复被隐藏或最小化的工作台。 */
ipcMain.handle(IPC.showWorkbench, () => {
  const window = createWindow();
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
  return window.isVisible();
});

/** 受控的单向插件调试日志：只接受当前 Electron 窗口，避免暴露通用 IPC 给插件。 */
ipcMain.on(IPC.pluginDebugLog, (event, input: unknown) => {
  if (!BrowserWindow.fromWebContents(event.sender)) return;
  if (!input || typeof input !== 'object') return;
  const entry = input as { pluginId?: unknown; level?: unknown; message?: unknown; data?: unknown; timestamp?: unknown };
  if (!safeFloatingPluginId(entry.pluginId)) return;
  if (!['debug', 'info', 'warn', 'error'].includes(String(entry.level))) return;
  const message = typeof entry.message === 'string' ? entry.message.trim().slice(0, 2_000) : '';
  if (!message) return;
  let data = '';
  if (entry.data !== undefined) {
    try { data = ` ${JSON.stringify(entry.data).slice(0, 10_000)}`; } catch { data = ' [unserializable data]'; }
  }
  const level = entry.level as 'debug' | 'info' | 'warn' | 'error';
  const scope = `plugin:${entry.pluginId}`;
  if (level === 'error') debugError(scope, message, data || new Error(message));
  else debugLog(scope, `${level}: ${message}`, data ? { data } : {});
});

type SystemStatsSnapshot = {
  cpu: number;
  gpu: number;
  memory: number;
  readBytes: number;
  writeBytes: number;
  downloadBytes: number;
  uploadBytes: number;
};
let systemStatsCache: { value: SystemStatsSnapshot; capturedAt: number } | undefined;
let systemStatsRefresh: Promise<SystemStatsSnapshot> | undefined;
const collectSystemStats = async (): Promise<SystemStatsSnapshot> => {
  // On software-rendered/restricted Windows hosts, disk and network counter
  // enumeration is both slow and unreliable. Keep the lightweight CPU/memory
  // figures, but do not let optional telemetry stall page navigation.
  const lightweightSampling = disableHardwareAcceleration;
  const [load, memory, io, networkInterface] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    lightweightSampling ? Promise.resolve(undefined) : si.disksIO(),
    lightweightSampling ? Promise.resolve(undefined) : si.networkInterfaceDefault(),
  ]);
  // systeminformation 在 macOS 将文件缓存并入 used，Apple Silicon 也通常
  // 不填 utilizationGpu；分别使用可用内存和 IORegistry 的设备利用率。
  const macGpu = process.platform === 'darwin' && !disableHardwareAcceleration
    ? await macGpuUtilization()
    : undefined;
  // `si.graphics()` is comparatively expensive on software-rendered Windows.
  const graphics = disableHardwareAcceleration || process.platform === 'darwin'
    ? undefined
    : await si.graphics();
  const network = networkInterface ? await si.networkStats(networkInterface) : [];
  const networkStats = network[0];
  return {
    cpu: load.currentLoad,
    gpu: macGpu ?? (graphics
      ? graphics.controllers.reduce((total, controller) => total + (controller.utilizationGpu ?? 0), 0) /
        Math.max(1, graphics.controllers.length)
      : 0),
    memory: process.platform === 'darwin'
      ? macMemoryUsage(memory)
      : memory.used / memory.total * 100,
    readBytes: io?.rIO_sec ?? 0,
    writeBytes: io?.wIO_sec ?? 0,
    downloadBytes: networkStats?.rx_sec ?? 0,
    uploadBytes: networkStats?.tx_sec ?? 0,
  };
};
ipcMain.handle(IPC.systemStats, async () => {
  const now = Date.now();
  if (systemStatsCache && now - systemStatsCache.capturedAt < 1500) return systemStatsCache.value;
  if (!systemStatsRefresh) {
    debugLog('system', 'refreshing system statistics');
    systemStatsRefresh = collectSystemStats()
      .then((value) => {
        systemStatsCache = { value, capturedAt: Date.now() };
        return value;
      })
      .finally(() => { systemStatsRefresh = undefined; });
  }
  return systemStatsRefresh;
});

if (CUSTOM_CHROME || MACOS_CHROME) {
  ipcMain.on(IPC.minimize, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });
  ipcMain.on(IPC.toggleMaximize, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  });
  ipcMain.on(IPC.close, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });
}

// DevTools toggle works on every platform: the status bar's debug button opens
// it detached so the custom window keeps its shape.
ipcMain.on(IPC.toggleDevTools, (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  if (win.webContents.isDevToolsOpened()) {
    win.webContents.closeDevTools();
  } else {
    win.webContents.openDevTools({ mode: 'detach' });
  }
});

// ---------------------------------------------------------------------------
// folderart online icon-font search
// ---------------------------------------------------------------------------
// wttch-labs proxied /iconfont-api -> https://www.iconfont.cn/api in its dev
// server and pinned Referer/User-Agent, because iconfont.cn sends no CORS
// headers. In the desktop app the renderer is served from file:// too, so a
// dev-server proxy is not enough: forward the same request from the main
// process with Electron's net.fetch (works in dev and packaged alike).
// ICONFONT_COOKIE (optional) authenticates as EGG_SESS_ICONFONT for the full
// result set; anonymous searches still return the public icons.
const ICONFONT_UPSTREAM = 'https://www.iconfont.cn/api/icon/search.json';
ipcMain.handle('iconfont:search', async (_event, body: string) => {
  try {
    const res = await net.fetch(ICONFONT_UPSTREAM, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: 'https://www.iconfont.cn/',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json',
        ...(process.env.ICONFONT_COOKIE
          ? { Cookie: `EGG_SESS_ICONFONT=${process.env.ICONFONT_COOKIE}` }
          : {}),
      },
      body,
    });
    const text = await res.text();
    return { status: res.status, text };
  } catch (err) {
    return {
      status: 0,
      text: '',
      error: err instanceof Error ? err.message : String(err),
    };
  }
});

// 主窗口单独记录，浮动 Widget 不能被误认为工作台，也不应阻止工作台重新打开。
let workbenchWindow: BrowserWindow | undefined;
// 保持托盘的强引用，避免垃圾回收使系统图标消失。
let systemTray: ReturnType<typeof createSystemTray> | undefined;

const createWindow = () => {
  if (workbenchWindow && !workbenchWindow.isDestroyed()) return workbenchWindow;
  const mainWindow = new BrowserWindow({
    icon: getApplicationIconPath(),
    width: 960,
    height: 640,
    minWidth: 600,
    minHeight: 420,
    frame: !CUSTOM_CHROME,
    // Windows and macOS draw the custom rounded shell over a transparent
    // native surface. Software-rendering mode still removes costly blur and
    // animation inside the renderer.
    transparent: CUSTOM_CHROME || MACOS_CHROME,
    backgroundColor: CUSTOM_CHROME ? '#00000000' : undefined,
    ...(process.platform === 'darwin'
      ? {
        titleBarStyle: 'hiddenInset' as const,
        vibrancy: 'titlebar' as const,
        visualEffectState: 'active' as const,
        backgroundColor: '#00000000',
      }
      : {}),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // Alarm plugins keep their load-lifecycle scheduler active while the
      // window is minimized or fully covered.
      backgroundThrottling: false,
    },
  });

  workbenchWindow = mainWindow;
  // Windows 注销/关机不一定先触发 before-quit，允许系统正常结束会话。
  mainWindow.on('query-session-end', () => { quitting = true; });
  mainWindow.on('close', (event) => {
    if (quitting) return;
    event.preventDefault();
    if (shouldHideOnClose(preferences.get(), quitting, Boolean(systemTray))) mainWindow.hide();
    else app.quit();
  });
  mainWindow.on('closed', () => {
    if (workbenchWindow === mainWindow) workbenchWindow = undefined;
    systemTray?.refresh();
  });
  mainWindow.on('show', () => systemTray?.refresh());
  mainWindow.on('hide', () => systemTray?.refresh());

  if (CUSTOM_CHROME) {
    // Keep the custom title bar in sync with the real maximized state so the
    // zoom button (and the window's rounded corners) can change accordingly.
    const reportMaximized = () => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send(IPC.maximizedChanged, mainWindow.isMaximized());
      }
    };
    mainWindow.on('maximize', reportMaximized);
    mainWindow.on('unmaximize', reportMaximized);
  }

  // `ready-to-show` may never arrive for a transparent frameless window on
  // some Windows GPU/compositor combinations. Do not let that leave a fully
  // running app (including tray and taskbar entries) permanently invisible:
  // loading completion is a reliable fallback.
  let shownInitially = false;
  const showInitially = () => {
    if (shownInitially || mainWindow.isDestroyed()) return;
    shownInitially = true;
    mainWindow.show();
  };
  mainWindow.once('ready-to-show', showInitially);

  // and load the index.html of the app.
  const loadMainPage = () => devServerUrl
    ? mainWindow.loadURL(devServerUrl)
    : mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  const loadWithRetry = async (attempt = 0): Promise<void> => {
    try {
      await loadMainPage();
      showInitially();
    } catch (error) {
      // Forge starts the Vite child process during debugging. On Windows the
      // Electron process can occasionally race it by a few hundred ms.
      if (devServerUrl && attempt < 20) {
        setTimeout(() => { void loadWithRetry(attempt + 1); }, 250);
        return;
      }
      console.error('[window] failed to load main page:', error);
      // Keep the native error page reachable instead of a forever-hidden app.
      showInitially();
    }
  };
  void loadWithRetry();

  // Open DevTools automatically during development (detached, so it does not
  // reshape the custom window); in packaged builds use the status bar button.
  if (devServerUrl) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  if (process.env.WTTCH_DIAG === '1') {
    // Diagnostic harness (set WTTCH_DIAG=1 to enable): forward renderer
    // console output and dump the DOM state after load, so we can see why
    // a blank window happens instead of the Vue app.
    mainWindow.webContents.on('console-message', (_e: unknown, ...rest: unknown[]) => {
      console.log('[renderer]', ...rest.map((v) => {
        if (typeof v === 'object') {
          try { return JSON.stringify(v); } catch { return String(v); }
        }
        return v;
      }));
    });
    mainWindow.webContents.on('did-fail-load', (_e, errorCode, errorDescription) => {
      console.error('[diag] did-fail-load', errorCode, errorDescription);
    });
    mainWindow.webContents.on('render-process-gone', (_e, details) => {
      console.error('[diag] render-process-gone', JSON.stringify(details));
    });
    mainWindow.webContents.on('did-finish-load', async () => {
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
      const snap = async () => {
        try {
          return await mainWindow.webContents.executeJavaScript(`({
            href: location.href,
            title: document.title,
            bodyText: document.body.innerText.slice(0, 90),
            toolCards: document.querySelectorAll('.tool-card').length,
            appShell: !!document.querySelector('.app-shell'),
            activeLabel: document.querySelector('.nav-item.router-link-active .nav-label')?.textContent?.trim(),
          })`);
        } catch (err) {
          return { evalFailed: String(err) };
        }
      };
      // Route tour: drive the hash router through every view and capture a
      // screenshot so layout regressions are visible from the outside.
      const tour: { name: string; hash: string; wait: number }[] = [
        { name: '01-home', hash: '#/home', wait: 1200 },
        { name: '02-tools', hash: '#/tools', wait: 1000 },
        { name: '03-folderart', hash: '#/tools/folderart', wait: 1800 },
        { name: '04-packetdraw', hash: '#/tools/packetdraw', wait: 1600 },
        { name: '05-radixconv', hash: '#/tools/radixconv', wait: 1200 },
        { name: '06-bitparser', hash: '#/tools/bitparser', wait: 1400 },
      ];
      for (const stop of tour) {
        try {
          await mainWindow.webContents.executeJavaScript(
            `location.hash = ${JSON.stringify(stop.hash)}; 'ok'`,
          );
          await sleep(stop.wait);
          const state = await snap();
          console.log(`[diag] view ${stop.name}`, JSON.stringify(state));
          if (!process.env.WTTCH_DIAG_NO_SHOT) {
            const img = await mainWindow.webContents.capturePage();
            fs.mkdirSync('.diag', { recursive: true });
            fs.writeFileSync(path.join('.diag', `${stop.name}.png`), img.toPNG());
            console.log(`[diag] shot ${stop.name}`);
          }
        } catch (err) {
          console.error(`[diag] tour stop failed ${stop.name}`, err);
        }
      }

      // folderart's icon-font search goes renderer -> preload -> main (net.fetch
      // to iconfont.cn). Probe it once so a regression shows up in the diag log
      // rather than as a silent "search failed" inside the tool.
      try {
        const probe = await mainWindow.webContents.executeJavaScript(`(async () => {
          if (!window.iconFontSearch) return { skipped: true };
          var params = new URLSearchParams({ q: 'edit', sortType: 'updated_at', page: '1', pageSize: '5', fromCollection: '-1', fills: '', t: String(Date.now()) }).toString();
          var res = await window.iconFontSearch(params);
          var out = { status: res.status, error: res.error || null };
          try { var j = JSON.parse(res.text); out.code = j.code; out.icons = (j.data && j.data.icons ? j.data.icons.length : 0); } catch (e) { out.parseError = String(e); }
          return out;
        })()`);
        console.log('[diag] iconfont probe', JSON.stringify(probe));
      } catch (err) {
        console.error('[diag] iconfont probe failed', err);
      }
    });
  }
  return mainWindow;
};

/** 托盘、Dock 共用恢复入口：最小化先还原，隐藏则显示，关闭后重新创建。 */
const showWorkbench = () => {
  const window = createWindow();

  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  if (!primaryInstance || quitting) return;
  preferences = createPreferences(app.getPath('userData'));
  initializeDebugLogger(app.getPath('userData'), preferences.getDebugLoggingEnabled());
  debugLog('app', 'ready', { packaged: app.isPackaged, platform: process.platform });
  // 只允许本应用文档访问 AI；开发时匹配 Vite origin 与入口路径，打包时匹配精确文件 URL。
  const rendererUrl = devServerUrl
    || pathToFileURL(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)).href;
  const isAppUrl = (input: string) => {
    try {
      const actual = new URL(input);
      const expected = new URL(rendererUrl);
      return actual.protocol === expected.protocol && actual.host === expected.host && actual.pathname === expected.pathname;
    } catch { return false; }
  };
  registerAiIpc(isAppUrl, (event, error, context) => debugError('ai', event, error, context));
  registerWechatIpc(isAppUrl);
  registerDataIpc(isAppUrl, preferences, () => Boolean(systemTray), () => {
    for (const window of floatingWidgets.values()) window.destroy();
    floatingWidgets.clear();
  });
  // 开发进程也展示同一应用图标；发行版 Dock/Finder 图标由 ICNS 打包配置提供。
  if (process.platform === 'darwin') app.dock?.setIcon(getApplicationIconPath());
  try {
    systemTray = createSystemTray({
      show: showWorkbench,
      hide: () => workbenchWindow?.hide(),
      isVisible: () => Boolean(workbenchWindow && !workbenchWindow.isDestroyed() && workbenchWindow.isVisible()),
      quit: () => app.quit(),
    });
  } catch (error) {
    // 少数桌面环境没有托盘服务；保留工作台可用性，不让可选入口阻止应用启动。
    console.error('[tray] 初始化失败：', error);
  }
  createWindow();
});

app.on('will-quit', () => {
  debugLog('app', 'will quit');
  for (const webContentsId of networkDebugSessions.keys()) closeNetworkDebugSession(webContentsId);
  systemTray?.destroy(); systemTray = undefined;
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 即使浮动窗口仍然存在，点击 Dock 也应恢复主工作台。
app.on('activate', () => { if (primaryInstance && app.isReady() && !quitting) showWorkbench(); });
// 事件可能早于 ready：此时由 ready 正常创建窗口，不提前调用 BrowserWindow。
app.on('second-instance', () => { if (app.isReady() && !quitting) showWorkbench(); });
