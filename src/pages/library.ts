// Page « Bibliothèque » : favoris, historique et téléchargements, avec recherche.
{
  const list = document.getElementById('list')!;
  const search = document.getElementById('search') as HTMLInputElement;
  const clearButton = document.getElementById('clear-list')!;
  const clearLabel = document.getElementById('clear-label')!;
  const sectionButtons = document.querySelectorAll<HTMLButtonElement>('[data-section]');

  const SECTIONS = ['favoris', 'historique', 'telechargements'];
  const section = () => (SECTIONS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'favoris');
  const timeFormat = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const dayFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  function dayLabel(time: number) {
    const day = new Date(time).toDateString();
    if (day === new Date().toDateString()) return "Aujourd'hui";
    if (day === new Date(Date.now() - 86400000).toDateString()) return 'Hier';
    const label = dayFormat.format(time);
    return label[0].toUpperCase() + label.slice(1);
  }

  function empty(text: string) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = text;
    return p;
  }

  // Regroupe des éléments par jour, avec un titre « Aujourd'hui », « Hier »…
  function groupByDay<T extends { time: number }>(items: T[], row: (item: T) => HTMLElement) {
    const nodes: HTMLElement[] = [];
    let lastDay = '';
    for (const item of items) {
      const day = dayLabel(item.time);
      if (day !== lastDay) {
        const heading = document.createElement('h2');
        heading.textContent = day;
        nodes.push(heading);
        lastDay = day;
      }
      nodes.push(row(item));
    }
    return nodes;
  }

  async function render() {
    const current = section();
    const query = search.value.trim().toLowerCase();
    const matches = (text: string) => !query || text.toLowerCase().includes(query);
    for (const b of sectionButtons) b.classList.toggle('active', b.dataset.section === current);

    if (current === 'telechargements') {
      const downloads = await jamaDownloads.get();
      const items = downloads.filter((d) => matches(`${d.filename} ${d.url}`));
      clearButton.hidden = !downloads.some((d) => d.state !== 'progressing' && d.state !== 'paused');
      clearLabel.textContent = 'Vider la liste';
      list.replaceChildren(...groupByDay(items, downloadRow));
      if (!items.length) list.append(empty(query
        ? 'Aucun téléchargement ne correspond à ta recherche.'
        : 'Aucun téléchargement. Les fichiers que tu télécharges sont enregistrés dans ton dossier Téléchargements.'));
      return;
    }

    const { bookmarks, history } = await jamaLibrary.get();
    const matchesEntry = (e: LibraryEntry) => matches(`${e.title} ${e.url}`);
    clearButton.hidden = current !== 'historique' || history.length === 0;
    clearLabel.textContent = 'Effacer l’historique';

    if (current === 'favoris') {
      const items = bookmarks.filter(matchesEntry);
      list.replaceChildren(...items.map((b) =>
        entryRow(b, dayLabel(b.time), () => jamaLibrary.removeBookmark(b.url))));
      if (!items.length) list.append(empty(query
        ? 'Aucun favori ne correspond à ta recherche.'
        : 'Pas encore de favoris. Clique sur l’étoile dans la barre d’adresse (ou Ctrl+D) pour en ajouter un.'));
      return;
    }

    // Historique groupé par jour (limité pour rester rapide, la recherche couvre tout)
    const items = history.filter(matchesEntry).slice(0, 500);
    list.replaceChildren(...groupByDay(items, (visit) =>
      entryRow(visit, timeFormat.format(visit.time), () => jamaLibrary.removeVisit(visit.time))));
    if (!items.length) list.append(empty(query
      ? 'Aucune page visitée ne correspond à ta recherche.'
      : 'Ton historique est vide. Les pages que tu visites apparaîtront ici.'));
  }

  for (const button of sectionButtons) {
    button.onclick = () => {
      location.hash = button.dataset.section!;
    };
  }
  clearButton.onclick = () => {
    if (section() === 'telechargements') jamaDownloads.clear();
    else if (confirm('Effacer tout l’historique ? Cette action est définitive.')) jamaLibrary.clearHistory();
  };
  search.oninput = render;
  window.addEventListener('hashchange', render);
  jamaLibrary.onChange(render);
  jamaDownloads.onChange(() => section() === 'telechargements' && render());
  render();
}
