<div align="center">

<img src="docs/banniere.png" alt="Kaury Tâches — la liste de tâches et le widget pour iPhone" width="100%">

<br>

[![Tests](https://github.com/theoblondel/kaury-taches/actions/workflows/tests.yml/badge.svg)](https://github.com/theoblondel/kaury-taches/actions/workflows/tests.yml)
[![Version](https://img.shields.io/github/v/release/theoblondel/kaury-taches?color=F56E2E&label=version)](https://github.com/theoblondel/kaury-taches/releases/latest)
[![Licence MIT](https://img.shields.io/badge/licence-MIT-1C1A1A)](LICENSE)
[![iOS](https://img.shields.io/badge/iOS-Scriptable-3D5C3D)](https://apps.apple.com/app/scriptable/id1405459188)

**[Télécharger](https://github.com/theoblondel/kaury-taches/releases/latest)** ·
**[Installer](#installation)** ·
**[Page officielle](https://kaury.studio/outils/taches-iphone/)** ·
**[In English](#in-english)**

</div>

---

**Kaury Tâches** est une liste de tâches pour iPhone, avec son widget d'écran d'accueil. Elle fait peu de choses, mais elle les fait bien : les habitudes se décochent chaque matin, ce qui est prévu pour demain devient « aujourd'hui » tout seul, et chaque tâche se range en la glissant du doigt.

Un seul fichier, exécuté par [Scriptable](https://apps.apple.com/app/scriptable/id1405459188). Pas de compte, pas de serveur, pas d'abonnement : vos tâches restent dans votre iCloud.

<div align="center">
  <img src="docs/app-clair.png" width="300" alt="Kaury Tâches, thème clair">
  &nbsp;&nbsp;
  <img src="docs/app-sombre.png" width="300" alt="Kaury Tâches, thème sombre">
</div>

## Fonctionnalités

| | |
|---|---|
| **Quotidien** | Les habitudes du jour. Cochées, elles reviennent décochées le lendemain. La section se replie quand tout est fait. |
| **Aujourd'hui · Demain · Plus tard** | La date décide de la section. À minuit, « Demain » devient « Aujourd'hui », sans rien toucher. Une tâche oubliée reste en vue, marquée « Prévu hier ». |
| **À faire** | Ce qui n'a pas encore de date. |
| **Fait** | L'historique de ce qui a été coché. On peut le remettre à sa place, ou faire le ménage. |
| **Glisser-déposer** | Un appui long sur une tâche, puis on la glisse dans une autre section, ou plus haut dans la liste. |
| **Saisie sur place** | « + Ajouter » au bas de chaque section. Le champ reste ouvert pour en taper plusieurs à la suite. |
| **Annuler** | Chaque action importante peut être annulée pendant quatre secondes. |
| **Widget** | Petit, moyen, grand, et trois formats pour l'écran verrouillé. Il montre d'abord ce qui presse. |
| **Clair et sombre** | L'app suit le réglage de l'iPhone. |

## Installation

> Cinq minutes, une seule fois. Il faut un iPhone sous iOS 16 ou plus récent.

1. **Installer Scriptable** depuis l'[App Store](https://apps.apple.com/app/scriptable/id1405459188) (gratuit), puis l'ouvrir une fois.
2. **Télécharger `Kaury Taches.js`** depuis la [dernière version](https://github.com/theoblondel/kaury-taches/releases/latest), puis sur l'iPhone : **Partager → Enregistrer dans Fichiers → iCloud Drive → Scriptable**.
3. **Lancer le script** : dans Scriptable, toucher **Kaury Taches**. Le premier lancement demande du réseau pour récupérer les polices.
4. **Ajouter le widget** : appui long sur l'écran d'accueil → **Modifier → Ajouter un widget → Scriptable**. Puis appui long sur le widget → **Modifier le widget** :

   | Réglage | Valeur |
   |---|---|
   | Script | `Kaury Taches` |
   | When Interacting | `Run Script` |

5. **Facultatif, une icône d'app** : dans Scriptable, réglages du script → **Add to Home Screen**.

<details>
<summary><b>Pas de dossier Scriptable dans Fichiers ?</b></summary>
<br>
Ouvrez le fichier, copiez tout le code, puis dans Scriptable touchez <b>+</b>, collez, et renommez le script <b>Kaury Taches</b> en touchant son titre.
</details>

**Mettre à jour** : remplacer le fichier par la nouvelle version. Les tâches, rangées dans un fichier à part, ne sont pas touchées.

## Utilisation

| Geste | Effet |
|---|---|
| Toucher le rond | Cocher. Une quotidienne revient demain, les autres partent dans **Fait**. |
| Toucher le texte | Ouvrir la fiche : renommer, déplacer, dater, remonter en tête, supprimer. |
| Appui long, puis glisser | Changer de section ou d'ordre. |
| « + Ajouter » | Nouvelle tâche dans cette section. |
| Toucher le widget | Ouvrir l'app. |

## Données et confidentialité

Kaury Tâches ne communique avec aucun serveur, à une exception près : au premier lancement, il télécharge les polices de [kaury.studio](https://kaury.studio), puis les garde sur l'iPhone.

Les tâches vivent dans un fichier JSON lisible, dans **iCloud Drive → Scriptable → `kaury-taches.json`**. On peut l'ouvrir, le sauvegarder ou le modifier depuis n'importe quel ordinateur.

```json
{ "id": "t1", "texte": "Appeler le garage", "section": "jour", "date": "2026-09-27" }
```

`section` vaut `quotidien`, `jour` (avec une `date`), `afaire` ou `fait`. « Aujourd'hui » et « Demain » ne sont jamais stockés : ils sont déduits de la date, et c'est ce qui fait changer une tâche de section à minuit. Supprimer le fichier remet la liste d'exemple.

## Limites

- **Le widget ne coche pas.** Scriptable ne gère pas les widgets interactifs d'iOS : un toucher ouvre l'app.
- **iOS décide du rafraîchissement du widget**, en général toutes les 15 à 30 minutes. L'app, elle, est toujours à jour.
- **L'interface est en français.**

## Développement

Le script tourne aussi sur ordinateur, avec un simulateur de Scriptable. Node 18 ou plus récent, aucune dépendance.

```bash
node test/simulateur.mjs app              # écrit test/apercu.html, à ouvrir dans un navigateur
node test/simulateur.mjs widget-medium    # affiche le contenu du widget
```

Dans l'aperçu, le glisser-déposer fonctionne à la souris. Les mêmes commandes tournent à chaque envoi, dans [GitHub Actions](https://github.com/theoblondel/kaury-taches/actions).

| Fichier | Rôle |
|---|---|
| `Kaury Taches.js` | L'app entière : données, widget et interface. |
| `test/simulateur.mjs` | Faux objets Scriptable, pour tester hors de l'iPhone. |
| `docs/` | Captures et bannière. |

Les suggestions et les signalements de bugs sont bienvenus dans les [issues](https://github.com/theoblondel/kaury-taches/issues).

## In English

**Kaury Tâches** is a to-do list and home-screen widget for iPhone, in a single file run by the free [Scriptable](https://apps.apple.com/app/scriptable/id1405459188) app. Daily habits reset every morning, tasks planned for tomorrow move to today on their own, and everything can be rearranged by drag and drop. No account, no server, no subscription: tasks live in a readable JSON file in your iCloud Drive. The interface is in French.

## Licence

[MIT](LICENSE) © 2026 Théo Blondel

<br>

<div align="center">
  <a href="https://kaury.studio"><b>Kaury Studio</b></a><br>
  <sub>Web, branding, vidéo et réseaux sociaux · Suisse romande</sub>
</div>
