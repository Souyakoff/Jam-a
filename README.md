# Jam&lt;a

Un navigateur web **open source**, **sans pub** et **sans télémétrie**, pensé pour les développeurs et les débutants.

Jam&lt;a utilise [Electron](https://www.electronjs.org/) (donc le moteur Chromium) et construit sa propre interface par-dessus.

## Fonctionnalités

- Onglets, barre d'adresse intelligente (adresse, `localhost:3000` ou recherche DuckDuckGo)
- Bloqueur de pubs et de traqueurs intégré (EasyList + EasyPrivacy), avec compteur par onglet
- Favoris (☆ dans la barre d'adresse) et historique avec recherche, stockés uniquement sur ton ordinateur
- Visionneuse JSON : les API et fichiers `.json` s'affichent en arbre coloré et dépliable
- Outils de développement en un clic (`F12`)
- Mode mobile pour tester le responsive (`Ctrl+Shift+M`)
- Bouton pour vider le cache et les cookies du site ouvert
- Page d'accueil avec des conseils pour débuter

## Lancer le projet

Il faut [Node.js](https://nodejs.org/) installé.

```bash
git clone https://github.com/Souyakoff/Jam-a.git
cd Jam-a
```

```bash
npm install
npm start
```

## Raccourcis

| Raccourci | Action |
|---|---|
| `Ctrl+T` / `Ctrl+W` | Nouvel onglet / fermer l'onglet |
| `Ctrl+L` | Aller dans la barre d'adresse |
| `Ctrl+Tab` / `Ctrl+Shift+Tab` | Onglet suivant / précédent |
| `Ctrl+R` ou `F5` | Recharger |
| `Alt+←` / `Alt+→` | Précédent / suivant |
| `Ctrl+D` | Ajouter / retirer des favoris |
| `Ctrl+H` / `Ctrl+Shift+O` | Historique / favoris |
| `F12` | Outils de développement |
| `Ctrl+Shift+M` | Mode mobile |

## Comment c'est organisé

```
src/
  main.ts              Processus principal : fenêtre, onglets, raccourcis
  adblock.ts           Bloqueur de pubs et de traqueurs
  json-viewer.ts       Visionneuse JSON injectée dans les pages JSON
  library.ts           Favoris et historique (fichiers JSON dans le dossier de l'utilisateur)
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

## Licence

[MIT](LICENSE)
