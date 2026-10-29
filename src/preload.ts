import { contextBridge, ipcRenderer } from 'electron';

// API exposée à l'interface (public/index.html). Rien d'autre de Node n'est accessible.
contextBridge.exposeInMainWorld('lumen', {
  newTab: () => ipcRenderer.send('tab:new'),
  closeTab: (id: number) => ipcRenderer.send('tab:close', id),
  activateTab: (id: number) => ipcRenderer.send('tab:activate', id),
  go: (input: string) => ipcRenderer.send('nav:go', input),
  back: () => ipcRenderer.send('nav:back'),
  forward: () => ipcRenderer.send('nav:forward'),
  reload: () => ipcRenderer.send('nav:reload'),
  stop: () => ipcRenderer.send('nav:stop'),
  home: () => ipcRenderer.send('nav:home'),
  toggleDevTools: () => ipcRenderer.send('dev:devtools'),
  toggleResponsive: () => ipcRenderer.send('dev:responsive'),
  clearSiteData: () => ipcRenderer.send('dev:clear-site-data'),
  onState: (callback: (state: unknown) => void) =>
    ipcRenderer.on('state', (_e, state) => callback(state)),
  onFocusAddress: (callback: () => void) => ipcRenderer.on('focus-address', () => callback()),
});
