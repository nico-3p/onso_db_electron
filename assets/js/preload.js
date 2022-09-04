const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    analyzeTest: (data) => ipcRenderer.invoke('analyze:test', data),
})