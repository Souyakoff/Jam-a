// Page d'accueil : tuiles des favoris et dernières pages visitées.
{
  const MAX_TILES = 12;
  const MAX_RECENT = 5;
  const timeFormat = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

  function tile(entry: LibraryEntry) {
    const link = document.createElement('a');
    link.className = 'tile';
    link.href = safeHref(entry.url);
    link.title = `${entry.title}\n${entry.url}`;
    const label = document.createElement('span');
    label.textContent = entry.title;
    link.append(entryIcon(entry), label);
    return link;
  }

  async function render() {
    const { bookmarks, history } = await jamaLibrary.get();
    const tiles = bookmarks.slice(0, MAX_TILES);
    document.getElementById('bookmarks')!.replaceChildren(...tiles.map(tile));
    document.getElementById('bookmarks-title')!.hidden = tiles.length === 0;

    const recent = history.slice(0, MAX_RECENT);
    document.getElementById('recent-list')!.replaceChildren(...recent.map((visit) =>
      entryRow(visit, timeFormat.format(visit.time), () => jamaLibrary.removeVisit(visit.time))));
    document.getElementById('recent')!.hidden = recent.length === 0;
  }

  // Pied de page : version de Jam<a et état des mises à jour
  async function renderVersion() {
    const status = await jamaUpdate.status();
    const text = document.getElementById('version-text')!;
    const action = document.getElementById('version-action') as HTMLButtonElement;
    const messages: Record<UpdateStatus['state'], string> = {
      disabled: 'version de développement',
      idle: '',
      checking: 'recherche de mises à jour…',
      downloading: `téléchargement de la ${status.version} (${Math.round((status.progress ?? 0) * 100)} %)…`,
      ready: `la ${status.version} est prête`,
      'up-to-date': 'à jour',
      error: 'impossible de vérifier les mises à jour',
    };
    const message = messages[status.state];
    text.textContent = `Jam<a ${status.current}${message ? ` · ${message}` : ''}`;

    action.hidden = !['idle', 'up-to-date', 'error', 'ready'].includes(status.state);
    action.textContent = status.state === 'ready' ? 'Redémarrer pour installer' : 'Rechercher des mises à jour';
    action.onclick = () => (status.state === 'ready' ? jamaUpdate.install() : jamaUpdate.check());
    document.getElementById('version')!.hidden = false;
  }

  // Si la page est ouverte hors de Jam<a (ex. dans un autre navigateur), l'API n'existe pas
  if (typeof jamaLibrary !== 'undefined') {
    jamaLibrary.onChange(render);
    render();
    jamaUpdate.onChange(renderVersion);
    renderVersion();
  }
}
