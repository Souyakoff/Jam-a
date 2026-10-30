import { app } from 'electron';
import { autoUpdater } from 'electron-updater';

// Mises à jour automatiques : Jam<a regarde la dernière Release GitHub (fichier latest.yml),
// télécharge la nouvelle version en arrière-plan, puis propose de redémarrer pour l'installer.
// Sans redémarrage, elle s'installe toute seule à la fermeture.

export interface UpdateStatus {
  state: 'disabled' | 'idle' | 'checking' | 'downloading' | 'ready' | 'up-to-date' | 'error';
  current: string;
  version?: string;
  progress?: number;
}

const CHECK_EVERY = 4 * 60 * 60 * 1000;
const FIRST_CHECK_DELAY = 10 * 1000;

let status: UpdateStatus = { state: 'disabled', current: app.getVersion() };
let notify: () => void = () => {};

function set(update: Partial<UpdateStatus>) {
  status = { ...status, ...update };
  notify();
}

export function setupUpdater(onChange: () => void) {
  notify = onChange;
  // En développement (npm start), pas de mise à jour, sauf pour les tests avec un serveur local
  const testUrl = process.env.JAMA_UPDATE_URL;
  if (!app.isPackaged && !testUrl) return;
  if (testUrl) autoUpdater.setFeedURL({ provider: 'generic', url: testUrl });

  autoUpdater.disableWebInstaller = true;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('checking-for-update', () => set({ state: 'checking' }));
  autoUpdater.on('update-not-available', () => set({ state: 'up-to-date' }));
  autoUpdater.on('update-available', (info) => set({ state: 'downloading', version: info.version, progress: 0 }));
  autoUpdater.on('download-progress', (p) => set({ state: 'downloading', progress: p.percent / 100 }));
  autoUpdater.on('update-downloaded', (info) => set({ state: 'ready', version: info.version }));
  autoUpdater.on('error', (error) => {
    console.error('Mise à jour impossible :', error.message);
    // Une mise à jour déjà téléchargée reste installable même si une vérification suivante échoue
    if (status.state !== 'ready') set({ state: 'error' });
  });

  set({ state: 'idle' });
  setTimeout(checkForUpdates, FIRST_CHECK_DELAY);
  setInterval(checkForUpdates, CHECK_EVERY);
}

export function checkForUpdates() {
  if (status.state === 'disabled' || status.state === 'downloading' || status.state === 'ready') return;
  autoUpdater.checkForUpdates().catch(() => {
    // L'erreur est déjà signalée par l'événement « error »
  });
}

export function installUpdate() {
  if (status.state === 'ready') autoUpdater.quitAndInstall(false, true);
}

export function getUpdateStatus() {
  return status;
}
