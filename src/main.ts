import { app, BrowserWindow } from 'electron';
import path from 'node:path';
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
// The renderer (and previously the GPU) child process fails to launch in this
// restricted/remote Windows session ("render-process-gone launch-failed,
// exitCode 18"). The sandbox cannot set up its restricted tokens here, so
// disable it. Do NOT ship this to normal user machines.
app.commandLine.appendSwitch('no-sandbox');

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();

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
      try {
        const state = await mainWindow.webContents.executeJavaScript(`({
          href: location.href,
          title: document.title,
          appHtmlLen: (document.getElementById('app')?.innerHTML ?? '').length,
          appChildren: document.getElementById('app')?.childElementCount,
          scriptCount: document.scripts.length,
          bodyText: document.body.innerText.slice(0, 300),
        })`);
        console.log('[diag] state', JSON.stringify(state, null, 2));
      } catch (err) {
        console.error('[diag] eval failed', err);
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
