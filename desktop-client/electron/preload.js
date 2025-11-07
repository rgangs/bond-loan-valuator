import { contextBridge, ipcRenderer } from "electron";

const channels = ["app:progress-update"];

contextBridge.exposeInMainWorld("electron", {
  onProgressUpdate: (callback) => {
    ipcRenderer.removeAllListeners("app:progress-update");
    ipcRenderer.on("app:progress-update", (_event, payload) => {
      callback(payload);
    });
  },
  send: (channel, data) => {
    if (channels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  }
});
