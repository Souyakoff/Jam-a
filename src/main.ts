import { app, BrowserWindow, WebContentsView, ipcMain, session, shell, Input } from 'electron';
import path from 'path';
import { pathToFileURL } from 'url';
import { enableAdblock, blockedCount, isAdblockReady } from './adblock';
import { setupJsonViewer } from './json-viewer';
import * as library from './library';

// Hauteur de la barre d'onglets + barre d'outils (doit correspondre à style.css)
const TOOLBAR_HEIGHT = 84;
const RESPONSIVE_WIDTH = 390;
const SEARCH_URL = 'https://duckduckgo.com/?q=';
const START_PAGE = pathToFileURL(path.join(__dirname, '../public/start.html')).toString();
const LIBRARY_PAGE = pathToFileURL(path.join(__dirname, '../public/library.html')).toString();
// Nombre de vues gardées en mémoire par onglet pour le bouton retour (voir Tab)
const MAX_SEGMENTS = 6;

// Raccourcis tapables dans la barre d'adresse pour les pages internes
const INTERNAL_ALIASES: Record<string, string> = {
  'jama://bibliotheque': LIBRARY_PAGE,
  'jama://favoris': `${LIBRARY_PAGE}#favoris`,
  'jama://historique': `${LIBRARY_PAGE}#historique`,
};

// Les pages internes (accueil, bibliothèque) ont accès aux favoris et à l'historique,
// les sites web non : chaque type a sa propre vue, avec ou sans preload.
interface Segment {
  view: WebContentsView;
  internal: boolean;
  favicon: string | null;
}

// Quand un onglet passe d'une page interne à un site (ou l'inverse), il change de vue.
// On garde les vues précédentes : ← et → passent de l'une à l'autre quand l'historique
// de la vue affichée est épuisé.
interface Tab {
  id: number;
  segments: Segment[];
  index: number;
  // Vrai pendant un retour/avance lancé par nous, pour ne pas effacer les segments suivants
  historyNav: boolean;
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
  // Boutons « précédent / suivant » de la souris
  win.on('app-command', (_e, command) => {
    const tab = activeTab();
    if (tab && command === 'browser-backward') goBack(tab);
    if (tab && command === 'browser-forward') goForward(tab);
  });
  win.webContents.once('did-finish-load', () => createTab());
}

function isInternal(url: string) {
  const page = url.split('#')[0];
  return page === START_PAGE || page === LIBRARY_PAGE;
}

// Ce qu'on affiche dans la barre d'adresse
function displayUrl(url: string) {
  if (url.split('#')[0] === START_PAGE) return '';
  const alias = Object.keys(INTERNAL_ALIASES).find((k) => INTERNAL_ALIASES[k] === url);
  return alias ?? (url.startsWith(LIBRARY_PAGE) ? 'jama://bibliotheque' : url);
}

// ---------- Onglets ----------

const current = (tab: Tab) => tab.segments[tab.index];
const viewOf = (tab: Tab) => current(tab).view;

function createTab(url: string = START_PAGE) {
  const tab: Tab = { id: nextId++, segments: [], index: 0, historyNav: false };
  tabs.set(tab.id, tab);
  tab.segments.push(createSegment(tab, isInternal(url)));
  viewOf(tab).webContents.loadURL(url);
  win.contentView.addChildView(viewOf(tab));
  activateTab(tab.id);
  return tab;
}

function createSegment(tab: Tab, internal: boolean): Segment {
  const view = new WebContentsView({
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      preload: internal ? path.join(__dirname, 'internal-preload.js') : undefined,
    },
  });
  const segment: Segment = { view, internal, favicon: null };
  const wc = view.webContents;

  // Une navigation qui n'est pas un retour/avance crée une nouvelle branche :
  // les segments suivants ne sont plus atteignables avec →
  const newNavigation = () => {
    if (tab.historyNav) tab.historyNav = false;
    else if (current(tab) === segment) dropForwardSegments(tab);
  };

  const refresh = () => sendState();
  wc.on('did-start-loading', refresh);
  wc.on('did-stop-loading', refresh);
  wc.on('did-navigate-in-page', (_e, _url, isMainFrame) => {
    if (isMainFrame) newNavigation();
    sendState();
  });
  wc.on('did-navigate', (_e, url) => {
    newNavigation();
    if (!internal) library.addVisit(url, wc.getTitle(), null);
    sendState();
  });
  wc.on('page-title-updated', (_e, title) => {
    if (!internal) library.updateVisit(wc.getURL(), { title });
    sendState();
  });
  wc.on('page-favicon-updated', (_e, favicons) => {
    segment.favicon = favicons[0] ?? null;
    if (!internal && segment.favicon) library.updateVisit(wc.getURL(), { favicon: segment.favicon });
    sendState();
  });
  wc.on('before-input-event', handleShortcut);
  // Un lien vers un site depuis une page interne (ou l'inverse) change de type de vue
  wc.on('will-navigate', (event) => {
    if (isInternal(event.url) !== internal) {
      event.preventDefault();
      navigate(tab, event.url);
    }
  });
  // Les liens target="_blank" s'ouvrent dans un nouvel onglet
  wc.setWindowOpenHandler(({ url }) => {
    createTab(url);
    return { action: 'deny' };
  });
  if (!internal) setupJsonViewer(wc);
  return segment;
}

function navigate(tab: Tab, url: string) {
  const internal = isInternal(url);
  if (internal === current(tab).internal) {
    viewOf(tab).webContents.loadURL(url);
    return;
  }
  // Nouvelle vue du bon type, ajoutée après la vue actuelle (qu'on garde pour ←)
  const previous = viewOf(tab);
  dropForwardSegments(tab);
  const segment = createSegment(tab, internal);
  tab.segments.push(segment);
  if (tab.segments.length > MAX_SEGMENTS) tab.segments.shift()!.view.webContents.close();
  segment.view.webContents.loadURL(url);
  showSegment(tab, tab.segments.length - 1, previous);
}

function dropForwardSegments(tab: Tab) {
  for (const segment of tab.segments.splice(tab.index + 1)) segment.view.webContents.close();
}

// Affiche un autre segment de l'onglet à la place de celui en cours
function showSegment(tab: Tab, index: number, previous = viewOf(tab)) {
  win.contentView.removeChildView(previous);
  tab.index = index;
  win.contentView.addChildView(viewOf(tab));
  viewOf(tab).setVisible(tab.id === activeId);
  layout();
  sendState();
}

function canGoBack(tab: Tab) {
  return viewOf(tab).webContents.navigationHistory.canGoBack() || tab.index > 0;
}

function canGoForward(tab: Tab) {
  return viewOf(tab).webContents.navigationHistory.canGoForward() || tab.index < tab.segments.length - 1;
}

function goBack(tab: Tab) {
  const history = viewOf(tab).webContents.navigationHistory;
  if (history.canGoBack()) {
    tab.historyNav = true;
    history.goBack();
  } else if (tab.index > 0) {
    showSegment(tab, tab.index - 1);
  }
}

function goForward(tab: Tab) {
  const history = viewOf(tab).webContents.navigationHistory;
  if (history.canGoForward()) {
    tab.historyNav = true;
    history.goForward();
  } else if (tab.index < tab.segments.length - 1) {
    showSegment(tab, tab.index + 1);
  }
}

function activateTab(id: number) {
  const tab = tabs.get(id);
  if (!tab) return;
  activeId = id;
  for (const t of tabs.values()) viewOf(t).setVisible(t.id === id);
  layout();
  sendState();
}

function closeTab(id: number) {
  const tab = tabs.get(id);
  if (!tab) return;
  win.contentView.removeChildView(viewOf(tab));
  for (const segment of tab.segments) segment.view.webContents.close();
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
    viewOf(tab).setBounds({ x, y: TOOLBAR_HEIGHT, width: RESPONSIVE_WIDTH, height: viewHeight });
  } else {
    viewOf(tab).setBounds({ x: 0, y: TOOLBAR_HEIGHT, width, height: viewHeight });
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
      const { view, internal, favicon } = current(t);
      const wc = view.webContents;
      const url = wc.getURL();
      return {
        id: t.id,
        title: wc.getTitle() || 'Nouvel onglet',
        url: displayUrl(url),
        favicon,
        loading: wc.isLoading(),
        canGoBack: canGoBack(t),
        canGoForward: canGoForward(t),
        blocked: blockedCount(wc.id),
        canBookmark: !internal && url !== '',
        bookmarked: !internal && library.isBookmarked(url),
      };
    }),
  };
  win.webContents.send('state', state);
  const active = activeTab();
  win.setTitle(active ? `${viewOf(active).webContents.getTitle() || 'Nouvel onglet'} — Jam<a` : 'Jam<a');
}

// Transforme ce que tape l'utilisateur en URL : adresse, localhost ou recherche
function toUrl(input: string): string {
  const text = input.trim();
  if (!text) return START_PAGE;
  if (INTERNAL_ALIASES[text.toLowerCase()]) return INTERNAL_ALIASES[text.toLowerCase()];
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text) || text.startsWith('about:')) return text;
  if (/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/.*)?$/i.test(text)) return `http://${text}`;
  if (/^[^\s]+\.[a-z]{2,}(:\d+)?(\/.*)?$/i.test(text)) return `https://${text}`;
  return SEARCH_URL + encodeURIComponent(text);
}

function toggleActiveBookmark() {
  const tab = activeTab();
  if (!tab || current(tab).internal) return;
  const wc = viewOf(tab).webContents;
  library.toggleBookmark(wc.getURL(), wc.getTitle(), current(tab).favicon);
}

// ---------- Raccourcis clavier ----------

function handleShortcut(event: Electron.Event, input: Input) {
  if (input.type !== 'keyDown') return;
  const ctrl = input.control || input.meta;
  const key = input.key.toLowerCase();
  const tab = activeTab();
  const wc = tab && viewOf(tab).webContents;
  let handled = true;

  if (ctrl && key === 't') createTab();
  else if (ctrl && key === 'w') activeId !== null && closeTab(activeId);
  else if (ctrl && key === 'l') { win.webContents.focus(); win.webContents.send('focus-address'); }
  else if (ctrl && key === 'tab') cycleTab(input.shift ? -1 : 1);
  else if ((ctrl && key === 'r') || key === 'f5') wc?.reload();
  else if (key === 'f12' || (ctrl && input.shift && key === 'i')) wc?.toggleDevTools();
  else if (ctrl && input.shift && key === 'm') toggleResponsive();
  else if (ctrl && key === 'd') toggleActiveBookmark();
  else if (ctrl && key === 'h') createTab(INTERNAL_ALIASES['jama://historique']);
  else if (ctrl && input.shift && key === 'o') createTab(INTERNAL_ALIASES['jama://favoris']);
  else if (input.alt && key === 'arrowleft') tab && goBack(tab);
  else if (input.alt && key === 'arrowright') tab && goForward(tab);
  else handled = false;

  if (handled) event.preventDefault();
}

function toggleResponsive() {
  responsive = !responsive;
  layout();
  sendState();
}

// ---------- Communication avec l'interface ----------

const activeWc = () => {
  const tab = activeTab();
  return tab && viewOf(tab).webContents;
};
const goTo = (input: string) => {
  const tab = activeTab();
  if (tab) navigate(tab, toUrl(input));
};

ipcMain.on('tab:new', () => createTab());
ipcMain.on('tab:close', (_e, id: number) => closeTab(id));
ipcMain.on('tab:activate', (_e, id: number) => activateTab(id));
ipcMain.on('nav:go', (_e, input: string) => goTo(input));
ipcMain.on('nav:back', () => { const tab = activeTab(); if (tab) goBack(tab); });
ipcMain.on('nav:forward', () => { const tab = activeTab(); if (tab) goForward(tab); });
ipcMain.on('nav:reload', () => activeWc()?.reload());
ipcMain.on('nav:stop', () => activeWc()?.stop());
ipcMain.on('nav:home', () => goTo(''));
ipcMain.on('bookmark:toggle', toggleActiveBookmark);
ipcMain.on('library:show', () => createTab(INTERNAL_ALIASES['jama://favoris']));
ipcMain.on('dev:devtools', () => activeWc()?.toggleDevTools());
ipcMain.on('dev:responsive', toggleResponsive);
ipcMain.on('dev:clear-site-data', async () => {
  const url = activeWc()?.getURL();
  if (!url?.startsWith('http')) return;
  await session.defaultSession.clearStorageData({ origin: new URL(url).origin });
  await session.defaultSession.clearCache();
  activeWc()?.reloadIgnoringCache();
});
ipcMain.on('open-external', (_e, url: string) => {
  if (/^https?:\/\//.test(url)) shell.openExternal(url);
});

// ---------- Communication avec les pages internes ----------

// Seules les pages internes peuvent lire ou modifier les favoris et l'historique
const fromInternal = (e: Electron.IpcMainEvent | Electron.IpcMainInvokeEvent) => isInternal(e.sender.getURL());

ipcMain.handle('library:get', (e) => (fromInternal(e) ? library.getLibrary() : null));
ipcMain.on('library:remove-bookmark', (e, url: string) => fromInternal(e) && library.removeBookmark(url));
ipcMain.on('library:remove-visit', (e, time: number) => fromInternal(e) && library.removeVisit(time));
ipcMain.on('library:clear-history', (e) => fromInternal(e) && library.clearHistory());

library.onLibraryChange(() => {
  for (const tab of tabs.values()) {
    for (const segment of tab.segments) {
      if (segment.internal) segment.view.webContents.send('library:changed');
    }
  }
  sendState();
});

// ---------- Démarrage ----------

app.whenReady().then(async () => {
  library.loadLibrary(app.getPath('userData'));
  createWindow();
  await enableAdblock(session.defaultSession, app.getPath('userData'), sendState);
});

app.on('before-quit', () => library.flushLibrary());
app.on('window-all-closed', () => app.quit());
