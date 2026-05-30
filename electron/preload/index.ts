import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('file:open'),
  openRecentFile: (filePath: string) => ipcRenderer.invoke('file:openRecent', filePath),
  saveFile: (filePath: string, content: string) => ipcRenderer.invoke('file:save', filePath, content),
  saveFileAs: (content: string) => ipcRenderer.invoke('file:saveAs', content),
  listRecentFiles: () => ipcRenderer.invoke('file:listRecent'),
  loadAiSettings: () => ipcRenderer.invoke('ai:loadSettings'),
  saveAiSettings: (settings: unknown) => ipcRenderer.invoke('ai:saveSettings', settings),
  testAiConnection: (settings: unknown) => ipcRenderer.invoke('ai:testConnection', settings),
  runAiEdit: (payload: unknown) => ipcRenderer.invoke('ai:editHtml', payload)
})
