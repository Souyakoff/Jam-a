# Jam&lt;a

Un navigateur web **open source**, **sans pub** et **sans télémétrie**, pensé pour les développeurs et les débutants.

Jam&lt;a utilise [Electron](https://www.electronjs.org/) (donc le moteur Chromium) et construit sa propre interface par-dessus.

## Fonctionnalités

- Onglets, barre d'adresse intelligente (adresse, `localhost:3000` ou recherche DuckDuckGo)
- Bloqueur de pubs et de traqueurs intégré (EasyList + EasyPrivacy), avec compteur par onglet
- Favoris (étoile dans la barre d'adresse) et historique avec recherche, stockés uniquement sur ton ordinateur
- Visionneuse JSON : les API et fichiers `.json` s'affichent en arbre coloré et dépliable
- Erreurs expliquées : les erreurs de la console (JavaScript, 404, CORS…) traduites en français simple, avec une
  piste pour corriger et un lien vers la doc MDN (`Ctrl+Shift+E`)
- Menu clic droit : ouvrir un lien dans un nouvel onglet, copier, rechercher la sélection, voir le code source,
  inspecter l'élément
- Recherche dans la page (`Ctrl+F`) et zoom (`Ctrl +` / `Ctrl -` / `Ctrl+molette`) avec indicateur
- Outils de développement en un clic (`F12`)
- Mode mobile pour tester le responsive (`Ctrl+Shift+M`)
- Bouton pour vider le cache et les cookies du site ouvert
- Page d'accueil avec des conseils pour débuter

## Installer (Windows)

Télécharge `Jam-a-Setup-x.y.z.exe` depuis la page
[Releases](https://github.com/Souyakoff/Jam-a/releases) et lance-le. L'installeur crée un raccourci sur le bureau et
dans le menu Démarrer.

> L'installeur n'est pas encore signé numériquement : Windows peut afficher « Windows a protégé votre ordinateur ».
> Clique sur « Informations complémentaires » puis « Exécuter quand même ».

## Lancer le projet (développement)

Il faut [Node.js](https://nodejs.org/) installé.

```bash
git clone https://github.com/Souyakoff/Jam-a.git
cd Jam-a
```

```bash
npm install
npm start
```

Pour tester sans toucher à tes favoris et à ton historique, utilise un profil séparé (PowerShell) :

```powershell
$env:JAMA_PROFILE = ".profil-test"; npm start
```

Pour fabriquer l'installeur Windows (il apparaît dans `release/`) :

```bash
npm run dist
```

Le logo se trouve dans `build/icon.svg`. Après l'avoir modifié, régénère les PNG avec `npm run icon`.

## Raccourcis

| Raccourci | Action |
|---|---|
| `Ctrl+T` / `Ctrl+W` | Nouvel onglet / fermer l'onglet |
| `Ctrl+L` | Aller dans la barre d'adresse |
| `Ctrl+Tab` / `Ctrl+Shift+Tab` | Onglet suivant / précédent |
| `Ctrl+R` ou `F5` | Recharger |
| `Alt+←` / `Alt+→` | Précédent / suivant |
| `Ctrl+F` | Rechercher dans la page (`Entrée` / `F3` : suivant, `Maj+Entrée` : précédent) |
| `Ctrl +` / `Ctrl -` / `Ctrl+0` | Zoomer / dézoomer / taille normale |
| `Ctrl+D` | Ajouter / retirer des favoris |
| `Ctrl+H` / `Ctrl+Shift+O` | Historique / favoris |
| `F12` | Outils de développement |
| `Ctrl+Shift+M` | Mode mobile |
| `Ctrl+Shift+E` | Panneau des erreurs expliquées |

## Comment c'est organisé

```
src/
  main.ts              Processus principal : fenêtre, onglets, raccourcis
  adblock.ts           Bloqueur de pubs et de traqueurs
  json-viewer.ts       Visionneuse JSON injectée dans les pages JSON
  library.ts           Favoris et historique (fichiers JSON dans le dossier de l'utilisateur)
  explain.ts           Explications des erreurs de console (ajoute tes règles ici !)
  icons.ts             Icônes SVG partagées par toute l'interface
  context-menu.ts      Menu du clic droit
  preload.ts           Pont sécurisé entre l'interface et main.ts
  internal-preload.ts  Pont réservé aux pages internes (accueil, bibliothèque)
  renderer.ts          Logique de l'interface (onglets, barre d'outils)
  pages/               Scripts des pages internes
public/
  index.html           Interface du navigateur
  style.css            Styles de l'interface
  start.html           Page d'accueil des nouveaux onglets
  library.html         Bibliothèque : favoris et historique (jama://favoris, jama://historique)
  pages.css            Styles des pages internes
```

Chaque page web tourne dans sa propre vue isolée (`WebContentsView`, en sandbox). L'interface ne peut parler au
processus principal que via les fonctions exposées dans `preload.ts`.

Les pages internes ont une vue à part, avec `internal-preload.ts`, qui leur donne accès aux favoris et à l'historique.
Quand tu passes d'une page interne à un site web (ou l'inverse), l'onglet change de vue : un site ne peut donc
jamais lire tes données.

## Contribuer

Toutes les contributions sont les bienvenues, même petites ! Ouvre une issue pour proposer une idée ou signaler un bug.

Une bonne première contribution : expliquer une nouvelle erreur. Ajoute une règle dans `RULES` de
[`src/explain.ts`](src/explain.ts), avec le motif du message, un titre, une explication simple et une piste pour corriger.

## Licence

[MIT](LICENSE). Les icônes s'inspirent du style de [Lucide](https://lucide.dev) (licence ISC).
