import { contextBridge, ipcRenderer } from 'electron';

// API des pages internes (accueil, bibliothèque) pour lire les favoris et l'historique.
// Par sécurité, elle n'est exposée que si la page est bien une page interne de Jam<a.
const internalPage = location.protocol === 'file:' && /\/public\/(start|library)\.html$/.test(location.pathname);

if (internalPage) {
  contextBridge.exposeInMainWorld('jamaLibrary', {
    get: () => ipcRenderer.invoke('library:get'),
    removeBookmark: (url: string) => ipcRenderer.send('library:remove-bookmark', url),
    removeVisit: (time: number) => ipcRenderer.send('library:remove-visit', time),
    clearHistory: () => ipcRenderer.send('library:clear-history'),
    onChange: (callback: () => void) => ipcRenderer.on('library:changed', () => callback()),
  });
}
