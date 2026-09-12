# Vidéos

| Fichier | Usage | Encodage |
|---|---|---|
| `hero-loop-morpho.mp4` | Accueil et couverture de `morpho.html` — boucle muette (extrait 13–38 s de `effet morpho.mp4`, sans le carton de titre). | 1280×720, H.264, ~1,5 Mbit/s, sans piste audio, `faststart` — 4,6 Mo |
| `projet-02-morpho-full.mp4` | `morpho.html`, « Vidéo complète du projet » — chargée uniquement au clic (`preload="none"`). | 1280×720, H.264 CRF 29, AAC 112 kbit/s — 34 Mo |

## Pour remplacer ou ajouter une vidéo

Réencode avec ffmpeg avant de la déposer (une vidéo d'écran 3D se compresse mal :
vise 1280×720 et 1,5–2 Mbit/s pour une boucle muette) :

```
ffmpeg -i source.mp4 -an -vf scale=1280:-2 -c:v libx264 -preset slow -b:v 1500k -maxrate 2000k -bufsize 3000k -pix_fmt yuv420p -movflags +faststart boucle.mp4
```

Le poster (`poster="…"`) pointe vers la variante WebP 1200 px de l'image
correspondante (voir `assets/images/README.md`).

Encore à retrouver : `projet-03-confluant-3d.mp4` — la vidéo 3D de Confluant
(un QR code y renvoyait dans le portfolio PDF original, lien non retrouvé).
