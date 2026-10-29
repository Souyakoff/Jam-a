import { ElectronBlocker } from '@ghostery/adblocker-electron';
import { promises as fs } from 'fs';
import path from 'path';

// Nombre de requêtes bloquées par onglet (clé = id du webContents)
const counts = new Map<number, number>();
let ready = false;

export async function enableAdblock(session: Electron.Session, dataDir: string, onChange: () => void) {
  try {
    // Listes EasyList + EasyPrivacy, mises en cache sur le disque pour un démarrage rapide
    const blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch, {
      path: path.join(dataDir, 'adblock-cache.bin'),
      read: (p) => fs.readFile(p),
      write: (p, buffer) => fs.writeFile(p, buffer),
    });
    blocker.enableBlockingInSession(session);
    blocker.on('request-blocked', ({ tabId }) => {
      counts.set(tabId, (counts.get(tabId) ?? 0) + 1);
      onChange();
    });
    ready = true;
    onChange();
  } catch (error) {
    // Sans connexion au premier lancement, le navigateur fonctionne quand même
    console.error('Bloqueur de pubs indisponible :', error);
  }
}

export function blockedCount(webContentsId: number) {
  return counts.get(webContentsId) ?? 0;
}

export function isAdblockReady() {
  return ready;
}
