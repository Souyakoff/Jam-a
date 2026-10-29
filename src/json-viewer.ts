// Visionneuse JSON : quand une page est du JSON (API, fichier .json), on remplace le texte brut
// par un arbre coloré et dépliable. Le CSS passe par insertCSS pour ne pas être bloqué par la CSP du site.

import { readFileSync } from 'fs';
import path from 'path';

// Le jeu d'icônes de l'interface (icons.ts compilé), injecté dans la page avec la visionneuse
const ICONS_SCRIPT = readFileSync(path.join(__dirname, 'icons.js'), 'utf8');

export function setupJsonViewer(wc: Electron.WebContents) {
  wc.on('dom-ready', async () => {
    try {
      const isJson = await wc.executeJavaScript(`/json/i.test(document.contentType)`);
      if (!isJson) return;
      await wc.insertCSS(VIEWER_CSS);
      // Tout reste dans une fonction pour ne rien ajouter aux variables globales de la page
      await wc.executeJavaScript(`(() => {\n${ICONS_SCRIPT}\n;(${renderJsonViewer.toString()})(icon);\n})()`);
    } catch {
      // La page a changé entre-temps : rien à faire
    }
  });
}

// Exécutée DANS la page : elle doit rester autonome (pas de variables extérieures).
function renderJsonViewer(makeIcon: (name: string, size?: number) => SVGSVGElement) {
  const root = document.documentElement;
  if (root.dataset.jamaJson) return;
  const raw = (document.querySelector('body > pre') ?? document.body).textContent ?? '';
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return; // Pas du JSON valide : on laisse la page telle quelle
  }
  root.dataset.jamaJson = '1';

  const el = (tag: string, className = '', text = '') => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;

  function keyLabel(key: string | number | null) {
    if (key === null) return [];
    const label = el('span', typeof key === 'number' ? 'jama-index' : 'jama-key', typeof key === 'number' ? String(key) : `"${key}"`);
    return [label, el('span', 'jama-colon', ': ')];
  }

  function primitive(value: unknown) {
    if (value === null) return el('span', 'jama-null', 'null');
    if (typeof value === 'string') {
      if (/^https?:\/\/\S+$/.test(value)) {
        const link = el('a', 'jama-string', `"${value}"`) as HTMLAnchorElement;
        link.href = value;
        return link;
      }
      return el('span', 'jama-string', JSON.stringify(value));
    }
    return el('span', `jama-${typeof value}`, String(value));
  }

  // Les noeuds fermés ne sont construits qu'à l'ouverture, pour rester rapide sur les gros fichiers
  function node(value: unknown, key: string | number | null, depth: number, openDepth: number): HTMLElement {
    if (value === null || typeof value !== 'object') {
      const row = el('div', 'jama-row');
      row.append(...keyLabel(key), primitive(value));
      return row;
    }
    const isArray = Array.isArray(value);
    const entries: [string | number, unknown][] = isArray
      ? (value as unknown[]).map((v, i) => [i, v])
      : Object.entries(value as object);

    const details = el('details', 'jama-node') as HTMLDetailsElement;
    const summary = el('summary');
    const preview = isArray ? `[ ${plural(entries.length, 'élément')} ]` : `{ ${plural(entries.length, 'clé')} }`;
    summary.append(...keyLabel(key), el('span', 'jama-preview', preview));
    details.append(summary);

    let built = false;
    const build = () => {
      if (built) return;
      built = true;
      const children = el('div', 'jama-children');
      for (const [k, v] of entries) children.append(node(v, k, depth + 1, openDepth));
      details.append(children);
    };
    details.addEventListener('toggle', () => details.open && build());
    if (depth < openDepth) {
      details.open = true;
      build();
    }
    return details;
  }

  const tree = el('div', 'jama-tree');
  const rawView = el('pre', 'jama-raw', JSON.stringify(data, null, 2));
  const showTree = (openDepth: number) => {
    tree.replaceChildren(node(data, null, 0, openDepth));
    tree.hidden = false;
    rawView.hidden = true;
  };

  const toolbar = el('div', 'jama-toolbar');
  const setLabel = (b: HTMLElement, iconName: string, label: string) => b.replaceChildren(makeIcon(iconName, 14), label);
  const button = (iconName: string, label: string, onClick: () => void) => {
    const b = el('button');
    setLabel(b, iconName, label);
    b.onclick = onClick;
    toolbar.append(b);
    return b;
  };
  button('tree', 'Arbre', () => showTree(2));
  button('file-text', 'Brut', () => {
    tree.hidden = true;
    rawView.hidden = false;
  });
  button('expand', 'Tout déplier', () => showTree(Infinity));
  button('collapse', 'Tout replier', () => showTree(1));
  const copy = button('copy', 'Copier', async () => {
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setLabel(copy, 'check', 'Copié');
    setTimeout(() => setLabel(copy, 'copy', 'Copier'), 1500);
  });
  const size = raw.length > 1024 ? `${(raw.length / 1024).toFixed(1)} Ko` : `${raw.length} octets`;
  toolbar.append(el('span', 'jama-size', size));

  const tip = el('div', 'jama-tip');
  tip.append(makeIcon('info', 16), el('span', '',
    'Ceci est du JSON, un format que les programmes utilisent pour échanger des données. ' +
    'Clique sur la flèche à gauche d’un objet { } ou d’une liste [ ] pour le déplier.'));

  document.body.replaceChildren(toolbar, tip, tree, rawView);
  document.body.className = 'jama-json';
  showTree(2);
}

const VIEWER_CSS = `
  body.jama-json {
    margin: 0; background: #1e1f24; color: #e6e6eb;
    font: 13px/1.6 Consolas, "Cascadia Code", monospace;
  }
  .jama-toolbar {
    position: sticky; top: 0; display: flex; align-items: center; gap: 6px;
    padding: 8px 12px; background: #2a2c33; border-bottom: 1px solid #383b45;
    font-family: system-ui, "Segoe UI", sans-serif;
  }
  .jama-toolbar button {
    display: inline-flex; align-items: center; gap: 6px;
    border: none; border-radius: 6px; padding: 5px 10px; cursor: pointer;
    background: #383b45; color: #e6e6eb; font: inherit;
  }
  .jama-toolbar button:hover { background: #4a4e5a; }
  .jama-size { margin-left: auto; color: #9a9ca8; }
  .jama-tip {
    display: flex; align-items: center; gap: 10px;
    margin: 12px; padding: 8px 12px; border-radius: 8px; background: #2a2c33; color: #9a9ca8;
    font-family: system-ui, "Segoe UI", sans-serif;
  }
  .jama-tip svg { flex-shrink: 0; color: #7c9cff; }
  .jama-tree, .jama-raw { padding: 4px 16px 24px; margin: 0; }
  .jama-children { padding-left: 20px; border-left: 1px solid #383b45; margin-left: 5px; }
  .jama-node > summary { cursor: pointer; list-style: none; }
  .jama-node > summary::before {
    content: ""; display: inline-block; width: 5px; height: 5px; margin: 0 8px 2px 1px;
    border-right: 1.5px solid #9a9ca8; border-bottom: 1.5px solid #9a9ca8;
    transform: rotate(-45deg); transition: transform 0.1s;
  }
  .jama-node[open] > summary::before { transform: rotate(45deg); }
  .jama-node > summary:hover { background: #2a2c33; }
  .jama-row { padding-left: 14px; }
  .jama-key { color: #7c9cff; }
  .jama-index { color: #9a9ca8; }
  .jama-colon, .jama-preview { color: #9a9ca8; }
  .jama-string { color: #9ece6a; }
  a.jama-string { text-decoration: none; }
  a.jama-string:hover { text-decoration: underline; }
  .jama-number { color: #ff9e64; }
  .jama-boolean { color: #bb9af7; }
  .jama-null { color: #f7768e; font-style: italic; }
  [hidden] { display: none !important; }
`;
