import { app, BrowserWindow, shell } from "electron";
import { fork } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const isDev = process.env.NODE_ENV === "development";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
let mainWindow = null;
let backendProcess = null;
let isQuitting = false;

const startBackend = () => {
  if (backendProcess) {
    return;
  }

  const backendDir = app.isPackaged
    ? path.join(process.resourcesPath, "app-backend", "api-server")
    : path.join(__dirname, "..", "api-server");

  const backendEntry = path.join(backendDir, "src", "server.js");

  backendProcess = fork(backendEntry, {
    cwd: backendDir,
    env: {
      ...process.env,
      NODE_ENV: app.isPackaged ? "production" : (process.env.NODE_ENV || "development")
    },
    stdio: "inherit"
  });

  backendProcess.on("exit", (code, signal) => {
    console.warn(`[backend] exited (code=${code ?? "null"}, signal=${signal ?? "null"})`);
    backendProcess = null;
    if (!isQuitting) {
      // Surface backend crash to renderer so user sees an error
      mainWindow?.webContents.send("app:progress-update", {
        type: "backend-exit",
        code,
        signal
      });
    }
  });
};

const stopBackend = () => {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
};

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1200,
    minHeight: 720,
    backgroundColor: "#0f172a",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    const indexHtml = path.join(__dirname, "../dist/index.html");
    mainWindow.loadFile(indexHtml);
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(() => {
  startBackend();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  isQuitting = true;
  stopBackend();
});
