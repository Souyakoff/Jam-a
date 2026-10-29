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

  // Si la page est ouverte hors de Jam<a (ex. dans un autre navigateur), l'API n'existe pas
  if (typeof jamaLibrary !== 'undefined') {
    jamaLibrary.onChange(render);
    render();
  }
}
