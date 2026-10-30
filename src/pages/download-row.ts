// Ligne d'un téléchargement dans la bibliothèque : nom, progression et actions.

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  const units = ['Ko', 'Mo', 'Go'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toLocaleString('fr-FR', { maximumFractionDigits: value < 10 ? 1 : 0 })} ${units[unit]}`;
}

function downloadStatus(d: DownloadEntry) {
  const size = d.total > 0 ? `${formatSize(d.received)} sur ${formatSize(d.total)}` : formatSize(d.received);
  const percent = d.total > 0 ? ` · ${Math.floor((d.received / d.total) * 100)} %` : '';
  switch (d.state) {
    case 'progressing': return `${size}${percent}`;
    case 'paused': return `En pause · ${size}${percent}`;
    case 'completed': return `Terminé · ${formatSize(d.total || d.received)}`;
    case 'cancelled': return 'Annulé';
    case 'interrupted': return 'Échec ou fichier introuvable';
  }
}

function actionButton(iconName: string, label: string, onClick: () => void) {
  const button = document.createElement('button');
  button.className = 'download-action';
  button.title = label;
  button.append(icon(iconName, 16));
  button.onclick = onClick;
  return button;
}

function downloadRow(d: DownloadEntry) {
  const row = document.createElement('div');
  row.className = `download ${d.state}`;

  const fileIcon = icon('file', 22);
  fileIcon.classList.add('download-icon');

  const info = document.createElement('div');
  info.className = 'download-info';
  const name = document.createElement(d.state === 'completed' ? 'button' : 'span');
  name.className = 'download-name';
  name.textContent = d.filename;
  if (d.state === 'completed') {
    name.title = 'Ouvrir le fichier';
    name.onclick = () => jamaDownloads.open(d.id);
  }
  const status = document.createElement('span');
  status.className = 'download-status';
  status.textContent = downloadStatus(d);
  const source = document.createElement('span');
  source.className = 'download-source';
  source.textContent = d.url;
  info.append(name, status);

  if (d.state === 'progressing' || d.state === 'paused') {
    const bar = document.createElement('div');
    bar.className = 'download-bar';
    const fill = document.createElement('span');
    fill.style.width = d.total > 0 ? `${(d.received / d.total) * 100}%` : '30%';
    bar.append(fill);
    info.append(bar);
  }
  info.append(source);

  const actions = document.createElement('div');
  actions.className = 'download-actions';
  if (d.state === 'progressing' || d.state === 'paused') {
    actions.append(
      actionButton(d.state === 'paused' ? 'play' : 'pause', d.state === 'paused' ? 'Reprendre' : 'Mettre en pause',
        () => jamaDownloads.togglePause(d.id)),
      actionButton('x', 'Annuler', () => jamaDownloads.cancel(d.id)),
    );
  } else {
    if (d.state === 'completed') {
      actions.append(
        actionButton('external-link', 'Ouvrir', () => jamaDownloads.open(d.id)),
        actionButton('folder', 'Afficher dans le dossier', () => jamaDownloads.showInFolder(d.id)),
      );
    }
    actions.append(actionButton('trash', 'Retirer de la liste (le fichier reste sur le disque)', () => jamaDownloads.remove(d.id)));
  }

  row.append(fileIcon, info, actions);
  return row;
}
