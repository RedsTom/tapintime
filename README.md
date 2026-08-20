# TapInTime

Jeu de rythme web pour apprendre à taper au clavier sur n'importe quelle disposition (AZERTY, QWERTY, Bépo, Colemak, Dvorak, Ergo-L).

## Concept

Apprentissage progressif de la frappe par le rythme. Les notes défilent vers une zone de frappe, le joueur tape le bon caractère au bon moment. L'accuracy par doigt et par touche guide la progression.

## Stack technique

- **Framework** : SvelteKit + adapter-static (PWA 100% côté client, aucun backend)
- **Rendu WebGL** : PixiJS v8+ (gameplay, notes, animations)
- **Audio** : Web Audio API (synchronisation via AudioContext.currentTime)
- **Style** : TailwindCSS (DOM/UI)
- **Validation** : Zod (schemas .titm / .titl)
- **Compression** : JSZip (lecture fichiers .titm)
- **Stockage** : localForage / IndexedDB (progression, stats)

## Formats propriétaires

### .titm (TapInTime Map)

Fichier zip contenant :
- `audio.mp3` ou `audio.ogg` — piste audio
- `bg.jpg` (optionnel) — image de fond
- `manifest.json` — métadonnées et hit objects

```json
{
  "title": "Map Name",
  "artist": "Artist",
  "bpm": 120,
  "audioOffset": 0,
  "difficulty": "easy",
  "hitObjects": [
    { "time": 12450, "char": "a", "type": "normal" }
  ]
}
```

### .titl (TapInTime Layout)

Fichier JSON modélisant un clavier physique et logique. Supporte les géométries complexes (staggered, ortholinéaire, columnar, split).

```json
{
  "name": "AZERTY",
  "layers": [
    {
      "name": "Base",
      "keys": [
        {
          "keyCode": "KeyA",
          "char": "q",
          "finger": "L_PINKY",
          "x": 0,
          "y": 0
        }
      ]
    }
  ],
  "thumbKeys": []
}
```

Les layers (couches) sont indispensables pour Ergo-L — le format définit des couches (Base, Layer 1, Sym) et des touches pouces pour basculer entre elles.
