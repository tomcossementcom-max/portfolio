"""
Génère les variantes AVIF + WebP (800 / 1200 / 1600 px + pleine taille)
de chaque image JPG/PNG de assets/images qui n'en a pas encore.

    python tools/optimise-images.py            # ne traite que les nouvelles images
    python tools/optimise-images.py --force    # régénère tout

Ensuite, dans le HTML, utilise le gabarit <picture> (voir n'importe quelle
page projet) : deux <source> (avif puis webp, avec srcset + sizes) et le
<img src="…jpg"> d'origine en repli, avec width/height.

Dépendance : Pillow (pip install pillow) — l'AVIF est inclus dans les
versions récentes de Pillow.
"""
import glob
import os
import sys

from PIL import Image

WIDTHS = (800, 1200, 1600)
FORCE = "--force" in sys.argv
ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "images")

for path in sorted(glob.glob(os.path.join(ROOT, "*.jpg")) + glob.glob(os.path.join(ROOT, "*.png"))):
    base, _ = os.path.splitext(path)
    if os.path.exists(base + ".avif") and not FORCE:
        continue
    im = Image.open(path).convert("RGB")
    im.save(base + ".avif", "AVIF", quality=55, speed=6)
    im.save(base + ".webp", "WEBP", quality=82, method=6)
    for w in WIDTHS:
        if im.width > w * 1.15:  # pas de variante quasi identique à l'original
            r = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
            r.save(f"{base}-{w}.avif", "AVIF", quality=55, speed=6)
            r.save(f"{base}-{w}.webp", "WEBP", quality=82, method=6)
    print(f"{os.path.basename(path):48s} {os.path.getsize(path) // 1024:5d} KB -> avif {os.path.getsize(base + '.avif') // 1024:4d} KB")
