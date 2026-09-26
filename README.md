# Kaury Tâches

Une liste de tâches pour iPhone, avec son widget, en un seul fichier. Par [Kaury Studio](https://kaury.studio).

**[Page de présentation et téléchargement →](https://kaury.studio/outils/taches-iphone/)**

<p>
  <img src="docs/app-clair.png" width="260" alt="L'app en thème clair">
  <img src="docs/app-sombre.png" width="260" alt="L'app en thème sombre">
</p>

Elle tourne dans [Scriptable](https://apps.apple.com/app/scriptable/id1405459188), une app gratuite qui exécute du JavaScript sur iPhone. Pas de compte, pas de serveur, pas d'abonnement : tes tâches restent dans un fichier à toi, dans iCloud Drive.

## Ce qu'elle fait

- **Quotidien** : les habitudes de chaque jour. On coche, et elles reviennent décochées le lendemain. La section se replie quand tout est fait.
- **Aujourd'hui, Demain, Plus tard** : une tâche prévue pour demain passe toute seule dans Aujourd'hui le lendemain. Si elle n'est pas faite, elle y reste, marquée « Prévu hier ».
- **À faire** : ce qui n'a pas de date.
- **Fait** : ce qui a été coché. On peut le remettre à sa place ou le supprimer.
- **Glisser-déposer** : un appui long sur une tâche, puis on la glisse dans une autre section ou on change l'ordre.
- **« + Ajouter » dans chaque section**, avec un champ qui reste ouvert pour en taper plusieurs à la suite.
- **Un widget** pour l'écran d'accueil (petit, moyen, grand) et pour l'écran verrouillé. Il affiche les tâches sans rien ouvrir, et un toucher ouvre l'app.
- Clair ou sombre, comme l'iPhone.

## Installer (5 minutes)

1. Installe **Scriptable** depuis l'App Store, puis ouvre-la une fois.
2. Télécharge [`Kaury Taches.js`](Kaury%20Taches.js) et range-le dans **iCloud Drive → Scriptable**.
   - Depuis l'iPhone : ouvre le fichier, puis **Partager → Enregistrer dans Fichiers → iCloud Drive → Scriptable**.
   - Depuis un ordinateur : sur icloud.com, dans **Drive → Scriptable**.
   - À défaut : copie tout le code, et dans Scriptable touche **+**, colle, puis renomme le script **Kaury Taches**.
3. Dans Scriptable, touche **Kaury Taches**. Au premier lancement, il faut du réseau pour récupérer les polices.
4. Pour le widget : appui long sur l'écran d'accueil → **Modifier → Ajouter un widget → Scriptable**. Ensuite, appui long sur le widget → **Modifier le widget** :
   - **Script** : Kaury Taches
   - **When Interacting** : Run Script
5. Pour avoir une icône d'app : dans Scriptable, ouvre les réglages du script → **Add to Home Screen**.

**Mettre à jour** : remplace le fichier par la nouvelle version. Les tâches ne sont pas touchées.

## Limites

- **Le widget ne coche pas.** Scriptable ne gère pas les widgets interactifs d'iOS : un toucher ouvre l'app.
- **iOS décide quand rafraîchir le widget**, en général toutes les 15 à 30 minutes. L'app, elle, est toujours à jour.
- L'interface est en français.

## Les données

Un fichier JSON lisible : `iCloud Drive/Scriptable/kaury-taches.json`.

```json
{ "id": "t1", "texte": "Appeler le garage", "section": "jour", "date": "2026-09-27" }
```

`section` vaut `quotidien`, `jour` (avec une `date`), `afaire` ou `fait`. On ne stocke jamais « Aujourd'hui » ni « Demain » : c'est calculé à partir de la date, et c'est pour ça qu'une tâche change de section toute seule à minuit. Une quotidienne est cochée quand son `faitLe` vaut la date du jour. Supprimer le fichier remet la liste d'exemple.

## Développer

Le script tourne aussi sur ordinateur, avec de faux objets Scriptable :

```bash
node test/simulateur.mjs app              # écrit test/apercu.html, à ouvrir dans un navigateur
node test/simulateur.mjs widget-medium    # affiche le contenu du widget
```

Dans l'aperçu, le glisser-déposer fonctionne aussi à la souris.

## Licence

MIT © Théo Blondel, [Kaury Studio](https://kaury.studio)
