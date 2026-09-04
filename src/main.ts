import { app, BrowserWindow, dialog, ipcMain, net } from 'electron';
import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import started from 'electron-squirrel-startup';
import si from 'systeminformation';
import { strFromU8, unzipSync } from 'fflate';

type PluginPackageInfo = {
  apiVersion: number;
  id: string;
  version: string;
  name: string;
  entry: string;
  file: string;
  capabilities?: string[];
  removable?: boolean;
  source?: 'managed' | 'workspace';
};
type PluginBundle = { apiVersion: number; plugins: Omit<PluginPackageInfo, 'file'>[] };

const pluginDirectories = () => [
  { directory: path.join(app.getPath('userData'), 'plugins'), source: 'managed' as const, removable: true },
  { directory: path.join(process.cwd(), 'plugins'), source: 'workspace' as const, removable: false },
];
const isSafePluginEntry = (entry: string) => {
  const normalized = path.posix.normalize(entry.replaceAll('\\', '/'));
  return normalized !== '.' && normalized !== '..' && !normalized.startsWith('../') && !path.posix.isAbsolute(normalized);
};
const readPluginPackage = (archivePath: string, meta: { source: 'managed' | 'workspace'; removable: boolean }): PluginPackageInfo[] => {
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
        console.warn(`[plugins] ignored ${file}: ${error instanceof Error ? error.message : String(error)}`);
        return [];
      }
    });
});

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

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
// The renderer child process fails to launch in this restricted/remote session
// too ("render-process-gone launch-failed, exitCode 18"): the Windows sandbox
// cannot set up its restricted child tokens here. Disable it. Do NOT ship this
// switch to normal user machines.
app.commandLine.appendSwitch('no-sandbox');

// ---------------------------------------------------------------------------
// Platform / window styling
// ---------------------------------------------------------------------------
// On Windows we drop the native frame and draw a full macOS-style title bar
// inside the renderer. macOS uses the native traffic lights over a renderer
// title bar so the whole top area shares the same translucent material.
const CUSTOM_CHROME = process.platform === 'win32';
const MACOS_CHROME = process.platform === 'darwin';

// Renderer <-> main messages for the custom window controls.
const IPC = {
  minimize: 'win:minimize',
  toggleMaximize: 'win:toggle-maximize',
  close: 'win:close',
  toggleDevTools: 'win:toggle-devtools',
  maximizedChanged: 'win:maximized-changed',
  systemStats: 'system:stats',
  pluginPackages: 'plugins:list',
  pluginInstall: 'plugins:install',
  pluginRemove: 'plugins:remove',
} as const;

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
  return { installed: readPluginPackage(destination, { source: 'managed', removable: true }) };
});
ipcMain.handle(IPC.pluginRemove, (_event, file: string) => {
  const managedDirectory = pluginDirectories()[0].directory;
  const target = path.join(managedDirectory, path.basename(file));
  if (path.dirname(target) !== managedDirectory || !target.endsWith('.zip')) throw new Error('无效的插件包路径');
  if (fs.existsSync(target)) fs.unlinkSync(target);
  return loadPluginPackages();
});

ipcMain.handle(IPC.systemStats, async () => {
  const [load, memory, io, networkInterface] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.disksIO(),
    si.networkInterfaceDefault(),
  ]);
  const graphics = await si.graphics();
  const network = networkInterface ? await si.networkStats(networkInterface) : [];
  const networkStats = network[0];
  return {
    cpu: load.currentLoad,
    gpu: graphics.controllers.reduce((total, controller) => total + (controller.utilizationGpu ?? 0), 0) /
      Math.max(1, graphics.controllers.length),
    memory: memory.used / memory.total * 100,
    readBytes: io.rIO_sec,
    writeBytes: io.wIO_sec,
    downloadBytes: networkStats?.rx_sec ?? 0,
    uploadBytes: networkStats?.tx_sec ?? 0,
  };
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

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 960,
    height: 640,
    minWidth: 600,
    minHeight: 420,
    frame: !CUSTOM_CHROME,
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
    },
  });

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

  // Wait for first paint before showing so there is no white / blank flash.
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open DevTools automatically during development (detached, so it does not
  // reshape the custom window); in packaged builds use the status bar button.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
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
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
