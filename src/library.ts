import { promises as fs, readFileSync, writeFileSync } from 'fs';
import path from 'path';

// Favoris et historique, enregistrés en JSON dans le dossier de données de l'utilisateur.

export interface Entry {
  url: string;
  title: string;
  favicon: string | null;
  time: number;
}

const MAX_HISTORY = 5000;
let bookmarks: Entry[] = [];
let history: Entry[] = [];
let dataDir = '';
const saveTimers = new Map<string, NodeJS.Timeout>();
const listeners: (() => void)[] = [];

export function loadLibrary(dir: string) {
  dataDir = dir;
  bookmarks = readJson('bookmarks.json');
  history = readJson('history.json');
}

export function onLibraryChange(listener: () => void) {
  listeners.push(listener);
}

export function getLibrary() {
  return { bookmarks, history };
}

// ---------- Favoris ----------

export function isBookmarked(url: string) {
  return bookmarks.some((b) => b.url === url);
}

export function toggleBookmark(url: string, title: string, favicon: string | null) {
  if (isBookmarked(url)) removeBookmark(url);
  else {
    bookmarks.unshift({ url, title: title || url, favicon, time: Date.now() });
    changed('bookmarks.json', bookmarks);
  }
}

export function removeBookmark(url: string) {
  bookmarks = bookmarks.filter((b) => b.url !== url);
  changed('bookmarks.json', bookmarks);
}

// ---------- Historique ----------

export function addVisit(url: string, title: string, favicon: string | null) {
  // Recharger la même page ne crée pas de doublon
  if (history[0]?.url === url) history[0].time = Date.now();
  else history.unshift({ url, title: title || url, favicon, time: Date.now() });
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  changed('history.json', history);
}

// Le titre et l'icône arrivent souvent après la navigation : on complète la dernière visite
export function updateVisit(url: string, update: Partial<Pick<Entry, 'title' | 'favicon'>>) {
  const visit = history.find((h) => h.url === url);
  if (!visit) return;
  Object.assign(visit, update);
  for (const b of bookmarks) if (b.url === url && update.favicon) b.favicon = update.favicon;
  changed('history.json', history);
}

export function removeVisit(time: number) {
  history = history.filter((h) => h.time !== time);
  changed('history.json', history);
}

export function clearHistory() {
  history = [];
  changed('history.json', history);
}

// ---------- Disque ----------

// À la fermeture, on écrit tout de suite ce qui était en attente
export function flushLibrary() {
  for (const timer of saveTimers.values()) clearTimeout(timer);
  saveTimers.clear();
  writeFileSync(path.join(dataDir, 'bookmarks.json'), JSON.stringify(bookmarks));
  writeFileSync(path.join(dataDir, 'history.json'), JSON.stringify(history));
}

function readJson(file: string): Entry[] {
  try {
    const data = JSON.parse(readFileSync(path.join(dataDir, file), 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return []; // Premier lancement ou fichier abîmé
  }
}

// On attend un peu avant d'écrire pour regrouper les changements rapides
function changed(file: string, data: Entry[]) {
  for (const listener of listeners) listener();
  clearTimeout(saveTimers.get(file));
  saveTimers.set(file, setTimeout(() => {
    fs.writeFile(path.join(dataDir, file), JSON.stringify(data)).catch((error) =>
      console.error(`Impossible d'enregistrer ${file} :`, error));
  }, 500));
}
