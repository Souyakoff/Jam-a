// Publie la version actuelle (package.json) sur GitHub Releases, avec les fichiers des mises à jour automatiques.
// Usage : npm run dist, puis npm run release -- notes.md
// Il faut l'outil gh (GitHub CLI), connecté au compte qui possède le dépôt.
const { execFileSync } = require('child_process');
const { existsSync } = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const { version, build } = require(path.join(root, 'package.json'));
const repo = `${build.publish.owner}/${build.publish.repo}`;
const installer = `release/Jam-a-Setup-${version}.exe`;
// latest.yml dit aux Jam<a installés quelle est la nouvelle version ; le .blockmap permet
// de ne télécharger que les morceaux qui ont changé
const files = [installer, `${installer}.blockmap`, 'release/latest.yml'];

for (const file of files) {
  if (!existsSync(path.join(root, file))) {
    console.error(`Fichier manquant : ${file}. Lance d'abord « npm run dist ».`);
    process.exit(1);
  }
}

const notes = process.argv[2];
execFileSync('gh', [
  'release', 'create', `v${version}`, ...files,
  '--repo', repo,
  '--target', 'main',
  '--title', `Jam<a ${version}`,
  ...(notes ? ['--notes-file', notes] : ['--generate-notes']),
], { cwd: root, stdio: 'inherit' });
