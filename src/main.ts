import { app, BrowserWindow, WebContentsView, ipcMain, session, shell, Input } from 'electron';
import path from 'path';
import { pathToFileURL } from 'url';
import { enableAdblock, blockedCount, isAdblockReady } from './adblock';
import { setupJsonViewer } from './json-viewer';

// Hauteur de la barre d'onglets + barre d'outils (doit correspondre à style.css)
const TOOLBAR_HEIGHT = 84;
const RESPONSIVE_WIDTH = 390;
const SEARCH_URL = 'https://duckduckgo.com/?q=';
const START_PAGE = pathToFileURL(path.join(__dirname, '../public/start.html')).toString();

interface Tab {
  id: number;
  view: WebContentsView;
  favicon: string | null;
}

let win: BrowserWindow;
const tabs = new Map<number, Tab>();
let activeId: number | null = null;
let nextId = 1;
let responsive = false;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 600,
    minHeight: 400,
    title: 'Jam<a',
    backgroundColor: '#1e1f24',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  win.setMenu(null);
  win.loadFile(path.join(__dirname, '../public/index.html'));
  win.webContents.on('before-input-event', handleShortcut);
  win.on('resize', layout);
  win.webContents.once('did-finish-load', () => createTab());
}

// ---------- Onglets ----------

function createTab(url: string = START_PAGE) {
  const view = new WebContentsView({
    webPreferences: { sandbox: true, contextIsolation: true },
  });
  const tab: Tab = { id: nextId++, view, favicon: null };
  tabs.set(tab.id, tab);

  const wc = view.webContents;
  const refresh = () => sendState();
  wc.on('page-title-updated', refresh);
  wc.on('did-start-loading', refresh);
  wc.on('did-stop-loading', refresh);
  wc.on('did-navigate', refresh);
  wc.on('did-navigate-in-page', refresh);
  wc.on('page-favicon-updated', (_e, favicons) => {
    tab.favicon = favicons[0] ?? null;
    sendState();
  });
  wc.on('before-input-event', handleShortcut);
  setupJsonViewer(wc);
  // Les liens target="_blank" s'ouvrent dans un nouvel onglet
  wc.setWindowOpenHandler(({ url }) => {
    createTab(url);
    return { action: 'deny' };
  });

  wc.loadURL(url);
  win.contentView.addChildView(view);
  activateTab(tab.id);
  return tab;
}

function activateTab(id: number) {
  const tab = tabs.get(id);
  if (!tab) return;
  activeId = id;
  for (const t of tabs.values()) t.view.setVisible(t.id === id);
  layout();
  sendState();
}

function closeTab(id: number) {
  const tab = tabs.get(id);
  if (!tab) return;
  win.contentView.removeChildView(tab.view);
  tab.view.webContents.close();
  tabs.delete(id);

  if (tabs.size === 0) {
    createTab();
    return;
  }
  if (activeId === id) activateTab([...tabs.keys()].pop()!);
  else sendState();
}

function cycleTab(direction: 1 | -1) {
  const ids = [...tabs.keys()];
  const index = ids.indexOf(activeId!);
  activateTab(ids[(index + direction + ids.length) % ids.length]);
}

function activeTab() {
  return activeId === null ? undefined : tabs.get(activeId);
}

// Place l'onglet actif sous la barre d'outils (centré et étroit en mode responsive)
function layout() {
  const tab = activeTab();
  if (!tab) return;
  const { width, height } = win.getContentBounds();
  const viewHeight = Math.max(0, height - TOOLBAR_HEIGHT);
  if (responsive && width > RESPONSIVE_WIDTH) {
    const x = Math.round((width - RESPONSIVE_WIDTH) / 2);
    tab.view.setBounds({ x, y: TOOLBAR_HEIGHT, width: RESPONSIVE_WIDTH, height: viewHeight });
  } else {
    tab.view.setBounds({ x: 0, y: TOOLBAR_HEIGHT, width, height: viewHeight });
  }
}

// Envoie l'état de tous les onglets à l'interface
function sendState() {
  if (win.isDestroyed()) return;
  const state = {
    activeId,
    responsive,
    adblock: isAdblockReady(),
    tabs: [...tabs.values()].map((t) => {
      const wc = t.view.webContents;
      const url = wc.getURL();
      return {
        id: t.id,
        title: wc.getTitle() || 'Nouvel onglet',
        url: url === START_PAGE ? '' : url,
        favicon: t.favicon,
        loading: wc.isLoading(),
        canGoBack: wc.navigationHistory.canGoBack(),
        canGoForward: wc.navigationHistory.canGoForward(),
        blocked: blockedCount(wc.id),
      };
    }),
  };
  win.webContents.send('state', state);
  const active = activeTab();
  win.setTitle(active ? `${active.view.webContents.getTitle() || 'Nouvel onglet'} — Jam<a` : 'Jam<a');
}

// Transforme ce que tape l'utilisateur en URL : adresse, localhost ou recherche
function toUrl(input: string): string {
  const text = input.trim();
  if (!text) return START_PAGE;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text) || text.startsWith('about:')) return text;
  if (/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/.*)?$/i.test(text)) return `http://${text}`;
  if (/^[^\s]+\.[a-z]{2,}(:\d+)?(\/.*)?$/i.test(text)) return `https://${text}`;
  return SEARCH_URL + encodeURIComponent(text);
}

// ---------- Raccourcis clavier ----------

function handleShortcut(event: Electron.Event, input: Input) {
  if (input.type !== 'keyDown') return;
  const ctrl = input.control || input.meta;
  const key = input.key.toLowerCase();
  const wc = activeTab()?.view.webContents;
  let handled = true;

  if (ctrl && key === 't') createTab();
  else if (ctrl && key === 'w') activeId !== null && closeTab(activeId);
  else if (ctrl && key === 'l') { win.webContents.focus(); win.webContents.send('focus-address'); }
  else if (ctrl && key === 'tab') cycleTab(input.shift ? -1 : 1);
  else if ((ctrl && key === 'r') || key === 'f5') wc?.reload();
  else if (key === 'f12' || (ctrl && input.shift && key === 'i')) wc?.toggleDevTools();
  else if (ctrl && input.shift && key === 'm') toggleResponsive();
  else if (input.alt && key === 'arrowleft') wc?.navigationHistory.goBack();
  else if (input.alt && key === 'arrowright') wc?.navigationHistory.goForward();
  else handled = false;

  if (handled) event.preventDefault();
}

function toggleResponsive() {
  responsive = !responsive;
  layout();
  sendState();
}

// ---------- Communication avec l'interface ----------

ipcMain.on('tab:new', () => createTab());
ipcMain.on('tab:close', (_e, id: number) => closeTab(id));
ipcMain.on('tab:activate', (_e, id: number) => activateTab(id));
ipcMain.on('nav:go', (_e, input: string) => activeTab()?.view.webContents.loadURL(toUrl(input)));
ipcMain.on('nav:back', () => activeTab()?.view.webContents.navigationHistory.goBack());
ipcMain.on('nav:forward', () => activeTab()?.view.webContents.navigationHistory.goForward());
ipcMain.on('nav:reload', () => activeTab()?.view.webContents.reload());
ipcMain.on('nav:stop', () => activeTab()?.view.webContents.stop());
ipcMain.on('nav:home', () => activeTab()?.view.webContents.loadURL(START_PAGE));
ipcMain.on('dev:devtools', () => activeTab()?.view.webContents.toggleDevTools());
ipcMain.on('dev:responsive', toggleResponsive);
ipcMain.on('dev:clear-site-data', async () => {
  const url = activeTab()?.view.webContents.getURL();
  if (!url?.startsWith('http')) return;
  await session.defaultSession.clearStorageData({ origin: new URL(url).origin });
  await session.defaultSession.clearCache();
  activeTab()?.view.webContents.reloadIgnoringCache();
});
ipcMain.on('open-external', (_e, url: string) => {
  if (/^https?:\/\//.test(url)) shell.openExternal(url);
});

// ---------- Démarrage ----------

app.whenReady().then(async () => {
  createWindow();
  await enableAdblock(session.defaultSession, app.getPath('userData'), sendState);
});

app.on('window-all-closed', () => app.quit());
