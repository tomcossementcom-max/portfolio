# Images

## Formats et variantes — comment ça marche

Chaque image existe en JPG (l'original, servi en repli) **et** en AVIF + WebP,
en quatre largeurs : 800, 1200, 1600 px et pleine taille. Le navigateur choisit
la plus petite qui suffit à l'écran (`srcset` + `sizes`) : un téléphone charge
~50 Ko par image au lieu de 500–1100 Ko.

Pour ajouter une image :

1. dépose le JPG (2000 px de large ou plus) dans ce dossier ;
2. lance `python tools/optimise-images.py` — il génère les variantes manquantes ;
3. dans le HTML, copie un bloc `<picture>` existant (deux `<source>` avif/webp,
   puis `<img src="…jpg" width height>`), en adaptant les noms et le `sizes`.

Ne dépose pas de variante à la main : le script les nomme `nom-800.avif`, etc.

## Déjà en place (récupérées depuis ton dossier source `Dossier Portfolio Vertical v2/Links`)

| Fichier | Usage | Source |
|---|---|---|
| `portrait-thomas-cossement.jpg` | À propos + teaser de l'accueil — la photo fournie par Thomas | — |
| `projet-04-haccourt-plan-avp001.jpg`, `-avp002.jpg` | Haccourt — planches AVP, recadrées sans cartouche (voir haccourt.html) | PDF Atelier CUP |
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
| Vue aérienne + coupes techniques de gestion des eaux | Palimpseste — planches secondaires (optionnel) | pas de fichier autonome retrouvé, à exporter depuis Vectorworks/InDesign si tu veux les ajouter |
| `projet-03-confluant-3d.mp4` (ou lien YouTube) | Confluant — vidéo 3D (un QR code y renvoyait dans le PDF original, lien non retrouvé) | — |
| `approche-script-parametrique.jpg`, `approche-plan-technique.jpg`, `approche-ambiance-materiaux.jpg` | Page Approche — étapes 2, 3, 4 de la timeline | voir `approche.html`, ratio 4:3, 2000px+ |

Ton dossier OneDrive `Waremme/rendu final/fin fin/Thomas Cossement` contient aussi
`schéma d'intention.pdf` (diagramme de trame territoriale, basse résolution native ~490×535pt)
et plusieurs planches jury complètes en PDF — pas encore utilisés, dis-le-moi si tu veux que je
les exploite pour l'une des étapes de la page Approche.
