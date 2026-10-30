import { contextBridge, ipcRenderer } from 'electron';

// API exposée à l'interface (public/index.html). Rien d'autre de Node n'est accessible.
contextBridge.exposeInMainWorld('jama', {
  newTab: () => ipcRenderer.send('tab:new'),
  closeTab: (id: number) => ipcRenderer.send('tab:close', id),
  activateTab: (id: number) => ipcRenderer.send('tab:activate', id),
  go: (input: string) => ipcRenderer.send('nav:go', input),
  back: () => ipcRenderer.send('nav:back'),
  forward: () => ipcRenderer.send('nav:forward'),
  reload: () => ipcRenderer.send('nav:reload'),
  stop: () => ipcRenderer.send('nav:stop'),
  home: () => ipcRenderer.send('nav:home'),
  toggleBookmark: () => ipcRenderer.send('bookmark:toggle'),
  showLibrary: () => ipcRenderer.send('library:show'),
  showDownloads: () => ipcRenderer.send('downloads:show'),
  toggleDevTools: () => ipcRenderer.send('dev:devtools'),
  toggleResponsive: () => ipcRenderer.send('dev:responsive'),
  clearSiteData: () => ipcRenderer.send('dev:clear-site-data'),
  togglePanel: () => ipcRenderer.send('dev:panel'),
  clearIssues: () => ipcRenderer.send('dev:clear-issues'),
  openUrl: (url: string) => ipcRenderer.send('tab:open-url', url),
  openFind: () => ipcRenderer.send('find:open'),
  closeFind: () => ipcRenderer.send('find:close'),
  find: (text: string, forward: boolean, findNext: boolean) => ipcRenderer.send('find:query', text, forward, findNext),
  zoomIn: () => ipcRenderer.send('zoom:in'),
  zoomOut: () => ipcRenderer.send('zoom:out'),
  resetZoom: () => ipcRenderer.send('zoom:reset'),
  onFindResult: (callback: (result: { active: number; total: number }) => void) =>
    ipcRenderer.on('find-result', (_e, result) => callback(result)),
  onFocusFind: (callback: () => void) => ipcRenderer.on('focus-find', () => callback()),
  onState: (callback: (state: unknown) => void) =>
    ipcRenderer.on('state', (_e, state) => callback(state)),
  onFocusAddress: (callback: () => void) => ipcRenderer.on('focus-address', () => callback()),
});
