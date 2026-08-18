const { contextBridge, ipcRenderer, webUtils } = require('electron')

contextBridge.exposeInMainWorld('api', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (s) => ipcRenderer.invoke('settings:save', s),
  getAppInfo: () => ipcRenderer.invoke('app:info'),
  getProviders: () => ipcRenderer.invoke('providers:list'),
  reloadProviders: () => ipcRenderer.invoke('providers:reload'),
  testProvider: (id) => ipcRenderer.invoke('providers:test', id),
  sendChat: (req) => ipcRenderer.invoke('chat:send', req),
  stopChat: (id) => ipcRenderer.invoke('chat:stop', id),
  generateTitle: (req) => ipcRenderer.invoke('chat:title', req),
  listHistory: () => ipcRenderer.invoke('history:list'),
  getHistory: (id) => ipcRenderer.invoke('history:get', id),
  saveHistory: (c) => ipcRenderer.invoke('history:save', c),
  deleteHistory: (id) => ipcRenderer.invoke('history:delete', id),
  webSearch: (q) => ipcRenderer.invoke('websearch:query', q),
  extractFile: (file) => ipcRenderer.invoke('file:extract', webUtils.getPathForFile(file)),
  exportText: (defaultName, content) => ipcRenderer.invoke('export:text', { defaultName, content }),
  transcribe: (payload) => ipcRenderer.invoke('stt:transcribe', payload),
  onChatEvent: (cb) => {
    const listener = (_e, ev) => cb(ev)
    ipcRenderer.on('chat:event', listener)
    return () => ipcRenderer.removeListener('chat:event', listener)
  },
  sendAgent: (req) => ipcRenderer.invoke('agent:send', req),
  stopAgent: (id) => ipcRenderer.invoke('agent:stop', id),
  pickWorkspace: () => ipcRenderer.invoke('agent:pickWorkspace'),
  onAgentEvent: (cb) => {
    const listener = (_e, ev) => cb(ev)
    ipcRenderer.on('agent:event', listener)
    return () => ipcRenderer.removeListener('agent:event', listener)
  },
  getSkills: () => ipcRenderer.invoke('skills:list'),
  startLocalServer: (providerId) => ipcRenderer.invoke('local:start', providerId),
  killAgentTool: (toolId) => ipcRenderer.invoke('agent:killTool', toolId),
  listAgentHistory: () => ipcRenderer.invoke('agent:history:list'),
  getAgentHistory: (id) => ipcRenderer.invoke('agent:history:get', id),
  deleteAgentHistory: (id) => ipcRenderer.invoke('agent:history:delete', id),
  saveAgentHistory: (c) => ipcRenderer.invoke('agent:history:save', c),
  listDir: (workspace, rel) => ipcRenderer.invoke('fs:listDir', { workspace, rel }),
  openPath: (workspace, rel, target) => ipcRenderer.invoke('shell:open', { workspace, rel, target }),
  getMemory: () => ipcRenderer.invoke('memory:list'),
  addMemory: (text, category) => ipcRenderer.invoke('memory:add', text, category),
  deleteMemory: (id) => ipcRenderer.invoke('memory:delete', id),
  exportBackup: () => ipcRenderer.invoke('backup:export'),
  importBackup: () => ipcRenderer.invoke('backup:import'),
  setAlwaysOnTop: () => ipcRenderer.invoke('win:alwaysOnTop'),
  checkUpdates: () => ipcRenderer.invoke('updates:check'),
  ignoreUpdate: (v) => ipcRenderer.invoke('updates:ignore', v),
  onUpdateInfo: (cb) => {
    const listener = (_e, info) => cb(info)
    ipcRenderer.on('update:info', listener)
    return () => ipcRenderer.removeListener('update:info', listener)
  }
})