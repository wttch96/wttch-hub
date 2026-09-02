import { app, BrowserWindow, ipcMain, net } from 'electron';
import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import started from 'electron-squirrel-startup';

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
} as const;

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
