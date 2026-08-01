# Quest Log

Crée une application web mobile moderne de suivi de tâches gamifiée appelée temporairement "Task Battle".

L'objectif de l'application est de transformer la réalisation des objectifs quotidiens en un défi entre amis.

L'application doit être pensée comme un mélange entre une application de productivité et un jeu de compétition amicale.

## Objectif principal

Chaque utilisateur doit pouvoir :

- créer ses propres tâches quotidiennes

- définir des objectifs à réaliser dans la journée

- gagner des points lorsqu'il termine ses tâches

- comparer ses résultats avec ses amis grâce à un classement

L'application doit être simple, motivante et agréable à utiliser quotidiennement.

# Fonctionnalités V1 obligatoires

## 1. Création du profil utilisateur

Créer un profil avec :

- pseudo

- avatar

- niveau

- nombre total de points accumulés

Afficher une interface type profil de jeu vidéo.

## 2. Système de tâches quotidiennes

Chaque jour, l'utilisateur peut créer maximum 3 tâches.

Pour chaque tâche :

- titre de la tâche

- description courte

- difficulté (facile, moyenne, difficile)

- nombre de points attribués automatiquement selon la difficulté

Exemple :

Facile : 10 points

Moyenne : 20 points

Difficile : 30 points

L'utilisateur peut voir :

- ses tâches du jour

- ses tâches terminées

- ses points potentiels

## 3. Validation quotidienne

Créer un système de validation des tâches.

L'utilisateur peut cliquer sur :

"Terminer la tâche"

Une fois validée :

- la tâche passe en statut terminé

- les points sont ajoutés au score

- une animation de réussite apparaît

Chaque soir à 19h, afficher un rappel :

"Il est temps de faire ton bilan quotidien."

## 4. Groupes d'amis

Créer un système de groupe.

Fonctions :

- créer un groupe

- rejoindre un groupe avec un code

- voir les membres du groupe

- voir leur progression

## 5. Classement

Créer un classement entre amis.

Afficher :

Classement du jour :

🥇 1er

🥈 2ème

🥉 3ème

Afficher également :

- classement de la semaine

- classement du mois

À la fin du mois, le classement mensuel est remis à zéro.

## 6. Système de progression

Ajouter une logique de jeu :

- niveau utilisateur

- barre d'expérience

- badges de réussite

Exemples :

"Première semaine réussie"

"7 jours consécutifs"

"100 tâches terminées"

# Design et expérience utilisateur

Créer un design très moderne et attrayant.

Style recherché :

- inspiration applications mobiles de sport et jeux vidéo

- interface dynamique

- sensation de progression

- design premium

Utiliser :

- cartes modernes

- animations fluides

- boutons avec effets interactifs

- icônes adaptées

- graphiques simples pour la progression

L'application doit donner envie de revenir tous les jours.

# Pages nécessaires

Créer les pages suivantes :

1. Page d'accueil

- résumé du jour

- nombre de points

- progression actuelle

- bouton "Créer mes tâches"

2. Page Mes tâches

- liste des 3 tâches

- validation des tâches

- progression de la journée

3. Page Classement

- classement des amis

- scores

- niveaux

4. Page Groupe

- membres

- invitation

- statistiques

5. Page Profil

- avatar

- niveau

- badges

- historique

# Expérience utilisateur

L'application doit être pensée mobile-first.

Elle doit être :

- rapide

- intuitive

- motivante

- simple pour un utilisateur qui découvre l'application

Créer une première version fonctionnelle avec des données fictives pour tester l'expérience avant connexion à une vraie base de données.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://xp-wars.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/56f0caf6-2927-4c33-9487-c9728acf4c60).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
