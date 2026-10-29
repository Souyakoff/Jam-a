# Lumen

Un navigateur web **open source**, **sans pub** et **sans télémétrie**, pensé pour les développeurs et les débutants.

Lumen utilise [Electron](https://www.electronjs.org/) (donc le moteur Chromium) et construit sa propre interface par-dessus.

## Fonctionnalités

- Onglets, barre d'adresse intelligente (adresse, `localhost:3000` ou recherche DuckDuckGo)
- Bloqueur de pubs et de traqueurs intégré (EasyList + EasyPrivacy), avec compteur par onglet
- Outils de développement en un clic (`F12`)
- Mode mobile pour tester le responsive (`Ctrl+Shift+M`)
- Bouton pour vider le cache et les cookies du site ouvert
- Page d'accueil avec des conseils pour débuter

## Lancer le projet

Il faut [Node.js](https://nodejs.org/) installé.

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
| `F12` | Outils de développement |
| `Ctrl+Shift+M` | Mode mobile |

## Comment c'est organisé

```
src/
  main.ts      Processus principal : fenêtre, onglets, raccourcis
  adblock.ts   Bloqueur de pubs et de traqueurs
  preload.ts   Pont sécurisé entre l'interface et main.ts
  renderer.ts  Logique de l'interface (onglets, barre d'outils)
public/
  index.html   Interface du navigateur
  style.css    Styles de l'interface
  start.html   Page d'accueil des nouveaux onglets
```

Chaque page web tourne dans sa propre vue isolée (`WebContentsView`, en sandbox). L'interface ne peut parler au
processus principal que via les fonctions exposées dans `preload.ts`.

## Contribuer

Toutes les contributions sont les bienvenues, même petites ! Ouvre une issue pour proposer une idée ou signaler un bug.

## Licence

[MIT](LICENSE)
