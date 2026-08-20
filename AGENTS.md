# AGENTS.md — Guide itérations TapInTime

## Outils obligatoires

- **context7** : Documentation live (SvelteKit, PixiJS, Zod, etc.). Toujours requérir avant d'implémenter une API.
- **caveman** : Mode d'exécution pour commandes terminal et interaction système de fichiers.

## Architecture

### Principes de Code (SOLID & Clean Architecture)
- **Single Responsibility Principle (SRP)** : Un fichier = une responsabilité.
- **Fichiers courts** : Extraire la logique dès qu'un fichier devient trop long.
- **Architecture Irréprochable** : Le code doit être intuitif pour un nouvel arrivant. Séparez clairement la logique métier, l'affichage (DOM) et le rendu (Canvas).

### Parité des Composants (DOM & Canvas)

Plutôt que des composants polymorphes, l'application maintient **deux versions distinctes** pour chaque élément d'interface réutilisable :

1. **Version DOM (Svelte)** : Composant Svelte classique stylisé via Tailwind pour les menus et l'UI.
2. **Version Canvas (PixiJS)** : Classe TypeScript pure générant des objets `PIXI.Container` / `Graphics`.

## Direction Artistique

Mélange osu!lazer x AMFIS Neo-brutalism :

| Element | Valeur |
|---------|--------|
| Fond | `#0a0510` (violet très profond / noir) |
| Primaire | `#FFD500` (jaune vif) |
| Secondaire | `#1a0033` (violet sombre) |
| Accent | `#FF3366` (rose) |
| Border width | 4px |
| Box shadow | `6px 6px 0px #1a0033` (pas de flou) |
| Border radius | 8px |
| Font weight | font-black (uppercase) |

Parallaxe légère en arrière-plan, transitions fluides.
