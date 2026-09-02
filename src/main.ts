import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import started from 'electron-squirrel-startup';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Chromium's GPU process can fail to launch in headless / remote / virtualised
// environments (e.g. Windows reports "GPU process launch failed, error_code=18")
// and Electron then aborts on startup. Fall back to software rendering and do
// not rely on a separate GPU child process at all.
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('in-process-gpu');
// The renderer child process fails to launch in this restricted/remote session
// too ("render-process-gone launch-failed, exitCode 18"): the Windows sandbox
// cannot set up its restricted child tokens here. Disable it. Do NOT ship this
// switch to normal user machines.
app.commandLine.appendSwitch('no-sandbox');

// ---------------------------------------------------------------------------
// Platform / window styling
// ---------------------------------------------------------------------------
// On Windows we drop the native frame and draw a full macOS-style title bar
// (rounded window + draggable bar with traffic lights on the left) inside the
// renderer, so it feels like a native macOS window. macOS/Linux keep the
// platform's real window frame.
const CUSTOM_CHROME = process.platform === 'win32';

// Renderer <-> main messages for the custom window controls.
const IPC = {
  minimize: 'win:minimize',
  toggleMaximize: 'win:toggle-maximize',
  close: 'win:close',
  maximizedChanged: 'win:maximized-changed',
} as const;

if (CUSTOM_CHROME) {
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

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 960,
    height: 640,
    minWidth: 600,
    minHeight: 420,
    frame: !CUSTOM_CHROME,
    transparent: CUSTOM_CHROME,
    backgroundColor: CUSTOM_CHROME ? '#00000000' : undefined,
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
  mainWindow.once('ready-to-show',