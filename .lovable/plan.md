# Conflits d'équipement, console super admin et regroupement par catégorie

## 1. Un objet réservé un jour donné est bloqué partout

Aujourd'hui, un objet déjà choisi pour une journée peut être choisi dans une autre journée / un autre projet à la même date.

Nouveau comportement :

- Pour une date donnée, si un objet est déjà rattaché à une autre journée de tournage, il reste **visible** dans la liste « Disponible » mais en **rouge**, marqué « Indisponible », avec le nom du projet et de la journée qui l'utilise.
- Le bouton d'ajout est désactivé pour cet objet.
- Une protection côté base empêche aussi l'ajout en double (même objet, même date, deux journées).

Point technique : les conflits peuvent venir d'un projet d'une autre entreprise que l'utilisateur ne peut pas lire. Une fonction base de données sécurisée renverra, pour une liste d'objets et une date, l'identifiant de l'objet + le nom du projet/journée en conflit, sans exposer d'autres données.

## 2. Indisponibilité globale d'un membre (calendrier)

Dans l'onglet Inventaire, ajout d'un bloc « Indisponibilité du membre » avec calendrier multi-dates : les dates choisies rendent **tout** l'inventaire de ce profil indisponible pour ces journées (utilisable pour soi-même et pour les profils hors ligne gérés).

Technique : nouvelle table `member_unavailability` (profil, date, motif) avec les mêmes règles d'accès que `equipment_unavailability` (propriétaire, gestionnaire du profil hors ligne, super admin). Les journées de tournage la prennent en compte au même titre que l'indisponibilité par objet.

## 3. Onglet Super administrateur

Nouvel onglet visible uniquement pour le super admin (`/super-admin`) :

- Arborescence complète : Entreprises → Projets → Journées, tous utilisateurs confondus.
- Liste de tous les membres et profils, avec leur inventaire.
- Renommer / modifier et supprimer n'importe quel élément (entreprise, projet, journée, membre, objet d'inventaire), avec confirmation avant suppression.
- Compteurs globaux en haut (entreprises, projets, journées, membres, objets).

Les règles d'accès actuelles donnent déjà au super admin la lecture et l'écriture sur ces tables ; aucun changement de sécurité n'est requis, hormis pour la nouvelle table.

## 4. Classement par catégorie

Dans l'onglet Inventaire et dans la journée de tournage (colonnes « Disponible » et « Choisi »), l'équipement est regroupé par catégorie dans l'ordre du référentiel (Caméra, Optiques, Éclairage, Son, …), avec un en-tête de catégorie coloré et le compte d'objets. Dans la journée, le groupement par membre reste, avec les catégories à l'intérieur de chaque membre.

## 5. Bouton « Récapitulatif » de la journée

Bouton dans l'en-tête de la journée ouvrant une vue claire :

- En-tête : entreprise, projet, date, lieu, heure d'appel.
- Une section par membre présent : ce qu'il doit apporter, groupé par catégorie, avec quantités et numéros de série.
- Section équipement manquant / demandes spéciales et notes de la journée.
- Boutons Imprimer / PDF (impression navigateur) et Copier le texte.

## 6. Couleurs moins roses

Rééquilibrage de la palette dans `src/styles.css` : la teinte principale passe du violet/magenta à un indigo-bleu plus sobre, les dégradés vont vers le cyan/teal, et les teintes de catégorie roses/magenta sont remplacées par bleu, teal, ambre, vert et orange. Modes clair et sombre mis à jour.

## Détails techniques

- Migration : table `member_unavailability` (+ GRANT, RLS, politiques), index unique sur `shoot_day_equipment(equipment_id)` par date via fonction/déclencheur de validation, fonction `equipment_conflicts_on(date, uuid[])` en SECURITY DEFINER.
- Fichiers touchés : `src/styles.css`, `src/lib/equipment-categories.ts` (helper de regroupement), `src/routes/_authenticated/equipement.tsx`, `src/routes/_authenticated/days.$dayId.tsx`, `src/components/AppShell.tsx` (onglet conditionnel), nouveau `src/routes/_authenticated/super-admin.tsx`, nouveau composant récapitulatif.
- Textes ajoutés au dictionnaire FR/EN de `src/lib/settings.tsx`.
