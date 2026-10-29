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
  canBookmark: boolean;
  bookmarked: boolean;
  errors: number;
  canInspect: boolean;
}

// Une erreur de console, déjà expliquée par explain.ts
interface Issue {
  level: 'error' | 'warning';
  message: string;
  source: string;
  line: number;
  count: number;
  title: string;
  explanation: string;
  fix: string;
  link?: string;
  harmless?: boolean;
}

interface BrowserState {
  activeId: number | null;
  responsive: boolean;
  adblock: boolean;
  panelOpen: boolean;
  issues: Issue[];
  tabs: TabState[];
}

declare const jama: {
  newTab(): void;
  closeTab(id: number): void;
  activateTab(id: number): void;
  go(input: string): void;
  back(): void;
  forward(): void;
  reload(): void;
  stop(): void;
  home(): void;
  toggleBookmark(): void;
  showLibrary(): void;
  toggleDevTools(): void;
  toggleResponsive(): void;
  clearSiteData(): void;
  togglePanel(): void;
  clearIssues(): void;
  openUrl(url: string): void;
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

  const star = $<HTMLButtonElement>('bookmark');
  star.hidden = !current.canBookmark;
  star.textContent = current.bookmarked ? '★' : '☆';
  star.classList.toggle('on', current.bookmarked);
  star.title = current.bookmarked ? 'Retirer des favoris (Ctrl+D)' : 'Ajouter aux favoris (Ctrl+D)';

  $('blocked').textContent = String(current.blocked);
  $('shield').classList.toggle('off', !state.adblock);
  $('responsive').classList.toggle('active', state.responsive);

  const issuesBtn = $<HTMLButtonElement>('issues');
  issuesBtn.hidden = !current.canInspect;
  issuesBtn.classList.toggle('has-errors', current.errors > 0);
  issuesBtn.classList.toggle('active', state.panelOpen);
  $('issue-count').textContent = String(current.errors);
  $('panel').hidden = !state.panelOpen;
  if (state.panelOpen) renderIssues(state.issues, current.canInspect);
}

// ---------- Panneau des erreurs ----------

let lastIssues = '';

function renderIssues(issues: Issue[], canInspect: boolean) {
  // Ne pas reconstruire la liste (et perdre les détails ouverts) si rien n'a changé
  const key = JSON.stringify(issues) + canInspect;
  if (key === lastIssues) return;
  lastIssues = key;

  const list = $('issue-list');
  if (!canInspect) {
    list.replaceChildren(panelMessage('Les pages internes de Jam<a ne sont pas analysées. Ouvre un site pour voir ses erreurs.'));
    return;
  }
  if (!issues.length) {
    list.replaceChildren(panelMessage('Aucune erreur sur cette page 🎉\nSi quelque chose ne marche pas, recharge la page : les erreurs apparaîtront ici.'));
    return;
  }
  // Les vraies erreurs d'abord, puis les avertissements, puis ce qui est sans gravité
  const rank = (i: Issue) => (i.harmless ? 2 : i.level === 'error' ? 0 : 1);
  list.replaceChildren(...[...issues].sort((a, b) => rank(a) - rank(b)).map(renderIssue));
}

function panelMessage(text: string) {
  const p = document.createElement('p');
  p.className = 'panel-empty';
  p.innerText = text;
  return p;
}

function renderIssue(issue: Issue) {
  const card = document.createElement('div');
  card.className = `issue ${issue.level}${issue.harmless ? ' harmless' : ''}`;

  const title = document.createElement('h3');
  title.textContent = `${issue.harmless ? 'ℹ️' : issue.level === 'error' ? '❌' : '⚠️'} ${issue.title}`;
  if (issue.count > 1) {
    const count = document.createElement('span');
    count.className = 'count';
    count.textContent = `×${issue.count}`;
    title.append(count);
  }

  const explanation = document.createElement('p');
  explanation.textContent = issue.explanation;
  const fix = document.createElement('p');
  fix.className = 'fix';
  fix.textContent = `💡 ${issue.fix}`;

  const details = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = 'Message original';
  const raw = document.createElement('pre');
  const where = issue.source ? `\n\n${issue.source}${issue.line ? `, ligne ${issue.line}` : ''}` : '';
  raw.textContent = issue.message + where;
  details.append(summary, raw);

  card.append(title, explanation, fix);
  if (issue.link) {
    const doc = document.createElement('button');
    doc.className = 'doc';
    doc.textContent = '📖 En savoir plus';
    doc.onclick = () => jama.openUrl(issue.link!);
    card.append(doc);
  }
  card.append(details);
  return card;
}

function renderTab(tab: TabState, active: boolean) {
  const el = document.createElement('div');
  el.className = 'tab' + (active ? ' active' : '');
  el.title = tab.title;
  el.onclick = () => jama.activateTab(tab.id);
  // Clic molette = fermer l'onglet
  el.onauxclick = (e) => e.button === 1 && jama.closeTab(tab.id);

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
    jama.closeTab(tab.id);
  };

  el.append(title, close);
  return el;
}

$('new-tab').onclick = () => jama.newTab();
backBtn.onclick = () => jama.back();
forwardBtn.onclick = () => jama.forward();
reloadBtn.onclick = () => (current?.loading ? jama.stop() : jama.reload());
$('home').onclick = () => jama.home();
$('bookmark').onclick = () => jama.toggleBookmark();
$('library').onclick = () => jama.showLibrary();
$('devtools').onclick = () => jama.toggleDevTools();
$('responsive').onclick = () => jama.toggleResponsive();
$('clear').onclick = () => jama.clearSiteData();
$('issues').onclick = () => jama.togglePanel();
$('panel-close').onclick = () => jama.togglePanel();
$('panel-console').onclick = () => jama.toggleDevTools();
$('panel-clear').onclick = () => jama.clearIssues();

$('address-form').onsubmit = (e) => {
  e.preventDefault();
  jama.go(address.value);
  address.blur();
};
address.onfocus = () => address.select();
address.onkeydown = (e) => {
  if (e.key === 'Escape') {
    address.value = current?.url ?? '';
    address.blur();
  }
};

jama.onState(render);
jama.onFocusAddress(() => address.focus());
