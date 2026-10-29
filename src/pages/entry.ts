// Affichage d'un favori ou d'une visite, partagé par l'accueil et la bibliothèque.
// Les titres viennent des sites : on passe toujours par textContent, jamais par innerHTML.

function safeHref(url: string) {
  return /^(https?|file):/i.test(url) ? url : '#';
}

// Icône du site, ou sa première lettre s'il n'en a pas
function entryIcon(entry: LibraryEntry) {
  const letter = document.createElement('span');
  letter.className = 'favicon letter';
  try {
    letter.textContent = new URL(entry.url).hostname.replace(/^www\./, '')[0]?.toUpperCase() ?? '•';
  } catch {
    letter.textContent = '•';
  }
  if (!entry.favicon || !/^(https?|data):/i.test(entry.favicon)) return letter;

  const icon = document.createElement('img');
  icon.className = 'favicon';
  icon.alt = '';
  icon.src = entry.favicon;
  icon.onerror = () => icon.replaceWith(letter);
  return icon;
}

function entryRow(entry: LibraryEntry, meta: string, onRemove: () => void) {
  const row = document.createElement('div');
  row.className = 'entry';

  const link = document.createElement('a');
  link.href = safeHref(entry.url);
  const title = document.createElement('span');
  title.className = 'entry-title';
  title.textContent = entry.title;
  const url = document.createElement('span');
  url.className = 'entry-url';
  url.textContent = entry.url;
  link.append(entryIcon(entry), title, url);

  const info = document.createElement('span');
  info.className = 'entry-meta';
  info.textContent = meta;

  const remove = document.createElement('button');
  remove.className = 'entry-remove';
  remove.append(icon('x', 14));
  remove.title = 'Supprimer';
  remove.onclick = onRemove;

  row.append(link, info, remove);
  return row;
}
