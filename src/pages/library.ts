// Page « Bibliothèque » : favoris et historique, avec recherche.
{
  const list = document.getElementById('list')!;
  const search = document.getElementById('search') as HTMLInputElement;
  const clearButton = document.getElementById('clear-history')!;
  const sectionButtons = document.querySelectorAll<HTMLButtonElement>('[data-section]');

  const section = () => (location.hash === '#historique' ? 'historique' : 'favoris');
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

  async function render() {
    const { bookmarks, history } = await jamaLibrary.get();
    const current = section();
    const query = search.value.trim().toLowerCase();
    const matches = (e: LibraryEntry) => !query || `${e.title} ${e.url}`.toLowerCase().includes(query);

    for (const b of sectionButtons) b.classList.toggle('active', b.dataset.section === current);
    clearButton.hidden = current !== 'historique' || history.length === 0;

    if (current === 'favoris') {
      const items = bookmarks.filter(matches);
      list.replaceChildren(...items.map((b) =>
        entryRow(b, dayLabel(b.time), () => jamaLibrary.removeBookmark(b.url))));
      if (!items.length) list.append(empty(query
        ? 'Aucun favori ne correspond à ta recherche.'
        : 'Pas encore de favoris. Clique sur ☆ dans la barre d’adresse (ou Ctrl+D) pour en ajouter un.'));
      return;
    }

    // Historique groupé par jour (limité pour rester rapide, la recherche couvre tout)
    const items = history.filter(matches).slice(0, 500);
    const nodes: HTMLElement[] = [];
    let lastDay = '';
    for (const visit of items) {
      const day = dayLabel(visit.time);
      if (day !== lastDay) {
        const heading = document.createElement('h2');
        heading.textContent = day;
        nodes.push(heading);
        lastDay = day;
      }
      nodes.push(entryRow(visit, timeFormat.format(visit.time), () => jamaLibrary.removeVisit(visit.time)));
    }
    list.replaceChildren(...nodes);
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
    if (confirm('Effacer tout l’historique ? Cette action est définitive.')) jamaLibrary.clearHistory();
  };
  search.oninput = render;
  window.addEventListener('hashchange', render);
  jamaLibrary.onChange(render);
  render();
}
