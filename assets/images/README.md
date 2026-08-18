# Images

## Déjà en place (récupérées depuis ton dossier source `Dossier Portfolio Vertical v2/Links`)

| Fichier | Usage | Source |
|---|---|---|
| `projet-01-palimpseste-aquarelle.jpg` | Palimpseste — média principal | `Perspective 1.png` |
| `projet-02-morpho-ambiance-lumiere.jpg` | Effet Morpho — média principal | `Image(11)_upscale01.png` |
| `projet-02-morpho-plan-masse.jpg` | Effet Morpho — planche plan | `Sans titre-5.1.png` |
| `projet-02-morpho-coupe-zone1.jpg` | Effet Morpho — planche coupe 1 | `coupe 2.1png.png` |
| `projet-02-morpho-coupe-zone2.jpg` | Effet Morpho — planche coupe 2 | `coupe 2 arc et senan.png` |
| `projet-03-confluant-axe-retrouve.jpg` | Confluant — média principal | `perspective 2.png` |
| `projet-03-confluant-seuil-mobile.jpg` | Confluant — planche | `perspective 1_1.png` |
| `projet-03-confluant-trame-mobilites.jpg` | Confluant — planche | `mobilités.png` |
| `projet-03-confluant-trame-eau.jpg` | Confluant — planche | `gestion de l'eau.png` |
| `projet-03-confluant-rue-commercante.jpg` | Confluant — planche | `perspective 3.png` (dossier `Links`) |
| `projet-02-morpho-ambiance-nocturne.jpg` | Effet Morpho — planche | `Image(9).png` (dossier `Links`) |
| `approche-analyse-macro-site.jpg` | Section Approche — carte d'analyse macro | `master plan complété.png` (en fait la carte satellite "15 min." de la page méthodologie, pas le plan de composition de Confluant — corrigé après une première erreur de tri) |
| `projet-03-confluant-plan-masse.jpg` | Confluant — plan de masse légendé (en vedette) | `plan de composition.pdf`, retrouvé dans ton dossier OneDrive (`Waremme/rendu final/fin fin/Thomas Cossement`) |
| `projet-03-confluant-coupe-facades.jpg` | Confluant — planche | `Coupe 1.png` (même dossier OneDrive) |
| `projet-03-confluant-coupe-hall.jpg` | Confluant — planche | `coupe 2.png` (même dossier OneDrive) |

## Encore à déposer

| Fichier attendu | Usage | Format conseillé |
|---|---|---|
| `hero-poster.jpg` | image de secours si tu remplaces la vidéo hero par une balise `<video>` | 2400px+, 16:9 |
| `portrait-thomas-cossement.jpg` | Section À propos | 1600px+, 4:5 — **un candidat existe déjà dans ce dossier** (voir note ci-dessous) mais n'est pas branché dans `index.html` |
| Vue aérienne + coupes techniques de gestion des eaux | Palimpseste — planches secondaires (optionnel) | pas de fichier autonome retrouvé, à exporter depuis Vectorworks/InDesign si tu veux les ajouter |
| `projet-03-confluant-3d.mp4` (ou lien YouTube) | Confluant — vidéo 3D (un QR code y renvoyait dans le PDF original, lien non retrouvé) | — |
| `approche-script-parametrique.jpg`, `approche-plan-technique.jpg`, `approche-ambiance-materiaux.jpg` | Page Approche — étapes 2, 3, 4 de la timeline | voir `approche.html`, ratio 4:3, 2000px+ |

Ton dossier OneDrive `Waremme/rendu final/fin fin/Thomas Cossement` contient aussi
`schéma d'intention.pdf` (diagramme de trame territoriale, basse résolution native ~490×535pt)
et plusieurs planches jury complètes en PDF — pas encore utilisés, dis-le-moi si tu veux que je
les exploite pour l'une des étapes de la page Approche.

## ⚠️ Portrait — à confirmer avant usage

`portrait-thomas-cossement.jpg` dans ce dossier a été généré depuis
`Gemini_Generated_Image_lzn9gclzn9gclzn9.png` de ton dossier source : un portrait noir & blanc,
mais qui porte un filigrane "généré par Gemini" en bas à droite — donc probablement une photo
retouchée/stylisée par IA plutôt qu'un cliché brut. Il n'est **pas encore utilisé** dans
`index.html` (le placeholder y est resté volontairement) : regarde le fichier, et si c'est bien
toi et que le style te plaît, remplace le `<div class="media-placeholder...">` de la section
"À propos" par `<img src="assets/images/portrait-thomas-cossement.jpg" alt="Thomas Cossement">`.
Sinon, dépose directement la photo de ton choix sous ce même nom.

## Palette végétale (Confluant)

Les 24 espèces de la planche originale sont affichées en texte (noms latins) plutôt qu'en photos :
les images de référence de ton dossier source sont des photos de pépinière portant une mention
"copyright" dans leur nom de fichier — à ne pas republier telles quelles sur un site public.
Si tu as les droits ou tes propres photos, tu peux les ajouter dans `.palette-vegetale`
(section Confluant de `index.html`).
