import { app, dialog, shell, BrowserWindow } from 'electron';
import { existsSync, promises as fs, readFileSync, writeFileSync } from 'fs';
import path from 'path';

// Téléchargements : enregistrés directement dans le dossier Téléchargements (sans fenêtre « Enregistrer sous »),
// avec la progression en direct et un historique gardé dans downloads.json.

export type DownloadState = 'progressing' | 'paused' | 'completed' | 'cancelled' | 'interrupted';

export interface DownloadEntry {
  id: number;
  url: string;
  filename: string;
  path: string;
  state: DownloadState;
  received: number;
  total: number;
  time: number;
}

const MAX_ENTRIES = 200;
// Fichiers qui peuvent modifier l'ordinateur : on prévient avant de les ouvrir
const RISKY_EXTENSIONS = /\.(exe|msi|bat|cmd|ps1|vbs|js|jse|scr|com|lnk|reg|hta|jar)$/i;

let entries: DownloadEntry[] = [];
let nextId = Date.now();
const items = new Map<number, Electron.DownloadItem>();
let dataFile = '';
let saveTimer: NodeJS.Timeout | null = null;
let notifyTimer: NodeJS.Timeout | null = null;
let onChange: () => void = () => {};

export function setupDownloads(session: Electron.Session, dataDir: string, listener: () => void) {
  dataFile = path.join(dataDir, 'downloads.json');
  onChange = listener;
  try {
    const data = JSON.parse(readFileSync(dataFile, 'utf8'));
    entries = Array.isArray(data) ? data : [];
  } catch {
    entries = [];
  }
  // Un téléchargement en cours quand Jam<a a été fermé ne peut pas reprendre
  for (const entry of entries) {
    if (entry.state === 'progressing' || entry.state === 'paused') entry.state = 'interrupted';
  }

  session.on('will-download', (_event, item) => {
    const filePath = uniquePath(app.getPath('downloads'), item.getFilename());
    item.setSavePath(filePath);

    const entry: DownloadEntry = {
      id: nextId++,
      url: item.getURL(),
      filename: path.basename(filePath),
      path: filePath,
      state: 'progressing',
      received: 0,
      total: item.getTotalBytes(),
      time: Date.now(),
    };
    entries.unshift(entry);
    if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
    items.set(entry.id, item);
    changed(true);

    item.on('updated', (_e, state) => {
      entry.received = item.getReceivedBytes();
      entry.total = item.getTotalBytes();
      entry.state = state === 'interrupted' ? 'interrupted' : item.isPaused() ? 'paused' : 'progressing';
      changed();
    });
    item.once('done', (_e, state) => {
      entry.received = item.getReceivedBytes();
      entry.state = state === 'completed' ? 'completed' : state === 'cancelled' ? 'cancelled' : 'interrupted';
      items.delete(entry.id);
      changed(true);
    });
  });
}

// « rapport.pdf » existe déjà → « rapport (1).pdf », comme les autres navigateurs
function uniquePath(dir: string, filename: string) {
  const safeName = filename.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') || 'telechargement';
  const ext = path.extname(safeName);
  const base = path.basename(safeName, ext);
  let candidate = path.join(dir, safeName);
  for (let n = 1; existsSync(candidate); n++) candidate = path.join(dir, `${base} (${n})${ext}`);
  return candidate;
}

export function getDownloads() {
  return entries;
}

// Résumé pour le bouton de la barre d'outils
export function downloadSummary() {
  const active = entries.filter((e) => e.state === 'progressing' || e.state === 'paused');
  const total = active.reduce((sum, e) => sum + e.total, 0);
  const received = active.reduce((sum, e) => sum + e.received, 0);
  return { active: active.length, progress: total > 0 ? received / total : null };
}

const find = (id: number) => entries.find((e) => e.id === id);

export async function openDownload(id: number, win: BrowserWindow) {
  const entry = find(id);
  if (!entry || entry.state !== 'completed') return;
  if (!existsSync(entry.path)) {
    entry.state = 'interrupted';
    changed(true);
    return;
  }
  if (RISKY_EXTENSIONS.test(entry.path)) {
    const { response } = await dialog.showMessageBox(win, {
      type: 'warning',
      title: 'Ouvrir ce fichier ?',
      message: `« ${entry.filename} » est un programme ou un script.`,
      detail: 'Il peut modifier ton ordinateur. Ne l’ouvre que si tu connais et fais confiance à sa source.\n\n' + entry.url,
      buttons: ['Annuler', 'Ouvrir quand même'],
      defaultId: 0,
      cancelId: 0,
    });
    if (response !== 1) return;
  }
  await shell.openPath(entry.path);
}

export function showDownloadInFolder(id: number) {
  const entry = find(id);
  if (entry && existsSync(entry.path)) shell.showItemInFolder(entry.path);
  else shell.openPath(app.getPath('downloads'));
}

export function cancelDownload(id: number) {
  items.get(id)?.cancel();
}

export function togglePauseDownload(id: number) {
  const item = items.get(id);
  if (!item) return;
  if (item.isPaused()) item.resume();
  else item.pause();
  const entry = find(id);
  if (entry) entry.state = item.isPaused() ? 'paused' : 'progressing';
  changed(true);
}

// Retire de la liste (le fichier reste sur le disque)
export function removeDownload(id: number) {
  if (items.has(id)) return;
  entries = entries.filter((e) => e.id !== id);
  changed(true);
}

export function clearFinishedDownloads() {
  entries = entries.filter((e) => items.has(e.id));
  changed(true);
}

export function flushDownloads() {
  if (saveTimer) clearTimeout(saveTimer);
  if (dataFile) writeFileSync(dataFile, JSON.stringify(entries));
}

// La progression change très souvent : on prévient l'interface au plus toutes les 200 ms
function changed(immediate = false) {
  if (!saveTimer) {
    saveTimer = setTimeout(() => {
      saveTimer = null;
      fs.writeFile(dataFile, JSON.stringify(entries)).catch((error) =>
        console.error('Impossible d’enregistrer downloads.json :', error));
    }, 1000);
  }
  if (immediate) {
    if (notifyTimer) clearTimeout(notifyTimer);
    notifyTimer = null;
    onChange();
  } else {
    notifyTimer ??= setTimeout(() => {
      notifyTimer = null;
      onChange();
    }, 200);
  }
}
