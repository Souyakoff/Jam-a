import { clipboard, Menu, MenuItemConstructorOptions } from 'electron';

// Menu du clic droit dans les pages : il s'adapte à ce qui est sous la souris
// (lien, image, texte sélectionné, champ de saisie) et propose toujours « Inspecter ».

export interface ContextActions {
  openInNewTab(url: string): void;
  search(text: string): void;
  goBack(): void;
  goForward(): void;
  canGoBack(): boolean;
  canGoForward(): boolean;
}

const MAX_SEARCH_LABEL = 30;

export function showContextMenu(wc: Electron.WebContents, params: Electron.ContextMenuParams, actions: ContextActions) {
  Menu.buildFromTemplate(buildContextMenu(wc, params, actions)).popup();
}

export function buildContextMenu(wc: Electron.WebContents, params: Electron.ContextMenuParams, actions: ContextActions) {
  const items: MenuItemConstructorOptions[] = [];
  const section = (...entries: MenuItemConstructorOptions[]) => {
    if (items.length) items.push({ type: 'separator' });
    items.push(...entries);
  };
  const isWebUrl = (url: string) => /^(https?|file):/i.test(url);

  if (params.linkURL && isWebUrl(params.linkURL)) {
    section(
      { label: 'Ouvrir le lien dans un nouvel onglet', click: () => actions.openInNewTab(params.linkURL) },
      { label: 'Copier l’adresse du lien', click: () => clipboard.writeText(params.linkURL) },
    );
  }

  if (params.mediaType === 'image' && params.srcURL) {
    section(
      { label: 'Ouvrir l’image dans un nouvel onglet', click: () => actions.openInNewTab(params.srcURL) },
      { label: 'Copier l’image', click: () => wc.copyImageAt(params.x, params.y) },
      { label: 'Copier l’adresse de l’image', click: () => clipboard.writeText(params.srcURL) },
    );
  }

  if (params.isEditable) {
    const { editFlags } = params;
    section(
      { label: 'Annuler', role: 'undo', enabled: editFlags.canUndo },
      { label: 'Rétablir', role: 'redo', enabled: editFlags.canRedo },
      { type: 'separator' },
      { label: 'Couper', role: 'cut', enabled: editFlags.canCut },
      { label: 'Copier', role: 'copy', enabled: editFlags.canCopy },
      { label: 'Coller', role: 'paste', enabled: editFlags.canPaste },
      { label: 'Tout sélectionner', role: 'selectAll' },
    );
  } else if (params.selectionText.trim()) {
    const text = params.selectionText.trim().replace(/\s+/g, ' ');
    const label = text.length > MAX_SEARCH_LABEL ? `${text.slice(0, MAX_SEARCH_LABEL)}…` : text;
    section(
      { label: 'Copier', role: 'copy' },
      { label: `Rechercher « ${label} » sur le web`, click: () => actions.search(text) },
    );
  }

  // Rien de particulier sous la souris : actions sur la page
  if (!items.length) {
    section(
      { label: 'Précédent', enabled: actions.canGoBack(), click: actions.goBack },
      { label: 'Suivant', enabled: actions.canGoForward(), click: actions.goForward },
      { label: 'Recharger', click: () => wc.reload() },
    );
    if (isWebUrl(params.pageURL)) {
      section({ label: 'Voir le code source', click: () => actions.openInNewTab(`view-source:${params.pageURL}`) });
    }
  }

  section({ label: 'Inspecter', click: () => wc.inspectElement(params.x, params.y) });
  return items;
}

// Menu simple pour la barre d'adresse de l'interface
export function showEditMenu(params: Electron.ContextMenuParams) {
  if (!params.isEditable) return;
  const { editFlags } = params;
  Menu.buildFromTemplate([
    { label: 'Annuler', role: 'undo', enabled: editFlags.canUndo },
    { label: 'Rétablir', role: 'redo', enabled: editFlags.canRedo },
    { type: 'separator' },
    { label: 'Couper', role: 'cut', enabled: editFlags.canCut },
    { label: 'Copier', role: 'copy', enabled: editFlags.canCopy },
    { label: 'Coller', role: 'paste', enabled: editFlags.canPaste },
    { label: 'Tout sélectionner', role: 'selectAll' },
  ]).popup();
}
