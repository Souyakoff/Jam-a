// Interface du navigateur (barre d'onglets + barre d'outils).
// Les pages web elles-mêmes sont gérées par main.ts, ce fichier ne fait que l'affichage.

interface TabState {
  id: number;
  title: string;
  url: string;
  favicon: string | null;
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  blocked: number;
}

interface BrowserState {
  activeId: number | null;
  responsive: boolean;
  adblock: boolean;
  tabs: TabState[];
}

declare const lumen: {
  newTab(): void;
  closeTab(id: number): void;
  activateTab(id: number): void;
  go(input: string): void;
  back(): void;
  forward(): void;
  reload(): void;
  stop(): void;
  home(): void;
  toggleDevTools(): void;
  toggleResponsive(): void;
  clearSiteData(): void;
  onState(callback: (state: BrowserState) => void): void;
  onFocusAddress(callback: () => void): void;
};

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const tabsEl = $('tabs');
const address = $<HTMLInputElement>('address');
const backBtn = $<HTMLButtonElement>('back');
const forwardBtn = $<HTMLButtonElement>('forward');
const reloadBtn = $<HTMLButtonElement>('reload');
let current: TabState | undefined;

function render(state: BrowserState) {
  tabsEl.replaceChildren(...state.tabs.map((tab) => renderTab(tab, tab.id === state.activeId)));

  current = state.tabs.find((t) => t.id === state.activeId);
  if (!current) return;
  // Ne pas écraser ce que l'utilisateur est en train de taper
  if (document.activeElement !== address) address.value = current.url;
  backBtn.disabled = !current.canGoBack;
  forwardBtn.disabled = !current.canGoForward;
  reloadBtn.textContent = current.loading ? '✕' : '↻';
  reloadBtn.title = current.loading ? 'Arrêter' : 'Recharger (Ctrl+R)';

  $('blocked').textContent = String(current.blocked);
  $('shield').classList.toggle('off', !state.adblock);
  $('responsive').classList.toggle('active', state.responsive);
}

function renderTab(tab: TabState, active: boolean) {
  const el = document.createElement('div');
  el.className = 'tab' + (active ? ' active' : '');
  el.title = tab.title;
  el.onclick = () => lumen.activateTab(tab.id);
  // Clic molette = fermer l'onglet
  el.onauxclick = (e) => e.button === 1 && lumen.closeTab(tab.id);

  if (tab.loading) {
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    el.append(spinner);
  } else if (tab.favicon) {
    const img = document.createElement('img');
    img.src = tab.favicon;
    img.onerror = () => img.remove();
    el.append(img);
  }

  const title = document.createElement('span');
  title.className = 'title';
  title.textContent = tab.title;

  const close = document.createElement('button');
  close.className = 'close';
  close.textContent = '×';
  close.title = 'Fermer (Ctrl+W)';
  close.onclick = (e) => {
    e.stopPropagation();
    lumen.closeTab(tab.id);
  };

  el.append(title, close);
  return el;
}

$('new-tab').onclick = () => lumen.newTab();
backBtn.onclick = () => lumen.back();
forwardBtn.onclick = () => lumen.forward();
reloadBtn.onclick = () => (current?.loading ? lumen.stop() : lumen.reload());
$('home').onclick = () => lumen.home();
$('devtools').onclick = () => lumen.toggleDevTools();
$('responsive').onclick = () => lumen.toggleResponsive();
$('clear').onclick = () => lumen.clearSiteData();

$('address-form').onsubmit = (e) => {
  e.preventDefault();
  lumen.go(address.value);
  address.blur();
};
address.onfocus = () => address.select();
address.onkeydown = (e) => {
  if (e.key === 'Escape') {
    address.value = current?.url ?? '';
    address.blur();
  }
};

lumen.onState(render);
lumen.onFocusAddress(() => address.focus());
