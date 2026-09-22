# -*- coding: utf-8 -*-
"""
Les coupes topographiques — fabrique js/coupes-data.js : pour chaque projet,
un profil réel passant par le site, relevé dans le Copernicus DEM GLO-30
(le même que le relief, voir tools/relief-data.py), avec la position du site
et le point bas de la vallée traversée.
L'axe et la longueur sont choisis par site, pour que la coupe montre la
situation réelle : est-ouest à travers la vallée de la Meuse pour Herstal et
Haccourt, nord-sud vers la Loue pour Arc-et-Senans, est-ouest sur le plateau
hesbignon entaillé par le Geer pour Waremme.
Usage :  python tools/coupes.py       (réseau requis la première fois ;
                                       les tuiles lues sont mises en cache)
"""
import io, json, math, os, re
import numpy as np
import rasterio

os.chdir(os.path.join(os.path.dirname(__file__), '..'))
CACHE = os.path.join('tools', 'cache'); os.makedirs(CACHE, exist_ok=True)

# les quatre sites : (lon, lat), axe et longueur de la coupe, vallée traversée
SITES = {
    'palimpseste': dict(lon=5.632,  lat=50.664,  span=4000, axis='EW', eau='la Meuse', riv='meuse', lieu='Herstal'),
    'morpho':      dict(lon=5.7768, lat=47.0324, span=4000, axis='NS', eau='la Loue',  riv='loue',  lieu='Arc-et-Senans'),
    'confluant':   dict(lon=5.2553, lat=50.6972, span=4000, axis='EW', eau='le Geer',  riv='geer',  lieu='Waremme'),
    'haccourt':    dict(lon=5.678,  lat=50.733,  span=4000, axis='EW', eau='la Meuse', riv='meuse', lieu='Haccourt'),
}
N = 160  # points par coupe

# --- où le cours d'eau croise la coupe : on le lit dans les tracés OSM déjà
#     préparés par tools/relief-data.py (js/relief-data.js), en coordonnées
#     carte, qu'on reconvertit en lon/lat.
MAIN = dict(lon0=5.05, lat0=50.90, kx=1762.5, ky=2775.0)
SUD  = dict(lonc=5.7768, latc=47.0324, xc=2080.0, yc=1760.0,
            kx=111.32 * math.cos(math.radians(47.03)) * 25, ky=2775.0)

def river_lonlat(river_id):
    """les points d'un cours d'eau de js/relief-data.js, en (lon, lat)"""
    src = io.open('js/relief-data.js', encoding='utf-8').read()
    data = json.loads(src[src.index('{'):src.rindex('}') + 1])
    for r in data.get('rivers', []):
        if r['id'] != river_id: continue
        out = []
        for sub in r['d'].split('M ')[1:]:
            pts = [tuple(map(float, q.split())) for q in sub.strip().split(' L ') if q.strip()]
            if river_id == 'loue':
                out.append([(SUD['lonc'] + (x - SUD['xc']) / SUD['kx'], SUD['latc'] - (y - SUD['yc']) / SUD['ky']) for x, y in pts])
            else:
                out.append([(MAIN['lon0'] + x / MAIN['kx'], MAIN['lat0'] - y / MAIN['ky']) for x, y in pts])
        return out
    return []

def crossing(river_id, lon, lat, span, axis):
    """fraction [0..1] le long de la coupe où le cours d'eau la croise (ou None)"""
    parts = river_lonlat(river_id)
    if not parts: return None
    kx = 111.32 * math.cos(math.radians(lat))
    half_lon = (span / 1000) / 2 / kx
    half_lat = (span / 1000) / 2 / 111.32
    best = None
    for pts in parts:
        for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
            if axis == 'EW':
                # le segment coupe-t-il la latitude de la coupe ?
                if (y1 - lat) * (y2 - lat) > 0: continue
                t = (lat - y1) / ((y2 - y1) or 1e-12)
                xc = x1 + t * (x2 - x1)
                f = (xc - (lon - half_lon)) / (2 * half_lon)
            else:
                if (x1 - lon) * (x2 - lon) > 0: continue
                t = (lon - x1) / ((x2 - x1) or 1e-12)
                yc = y1 + t * (y2 - y1)
                f = ((lat + half_lat) - yc) / (2 * half_lat)
            if 0 <= f <= 1 and (best is None or abs(f - 0.5) < abs(best - 0.5)):
                best = f
    return best

def dem_url(lat, lon):
    la, lo = int(math.floor(lat)), int(math.floor(lon))
    name = f"Copernicus_DSM_COG_10_N{la:02d}_00_E{lo:03d}_00_DEM"
    return f"https://copernicus-dem-30m.s3.amazonaws.com/{name}/{name}.tif"

def profile(lon, lat, span, axis='EW', n=N):
    """altitudes le long d'un segment de `span` mètres centré sur le site
    (est->ouest, ou nord->sud : la lecture va toujours de gauche à droite)"""
    if axis == 'EW':
        half = (span / 1000) / 2 / (111.32 * math.cos(math.radians(lat)))
        lons = np.linspace(lon - half, lon + half, n); lats = np.full(n, lat)
    else:
        half = (span / 1000) / 2 / 111.32
        lats = np.linspace(lat + half, lat - half, n); lons = np.full(n, lon)
    with rasterio.open(dem_url(lat, lon)) as ds:
        vals = np.array([v[0] for v in ds.sample(np.column_stack([lons, lats]))], dtype='float32')
    vals[vals < -100] = 0
    # lissage léger (5 points) : le profil doit rester lisible, pas bruité
    k = np.array([1, 4, 6, 4, 1], dtype='float32'); k /= k.sum()
    return np.convolve(np.pad(vals, 2, mode='edge'), k, mode='valid')

if __name__ == '__main__':
    out = {}
    for key, s in SITES.items():
        cache = os.path.join(CACHE, f'coupe-{key}.npy')
        if os.path.exists(cache):
            z = np.load(cache)
        else:
            z = profile(s['lon'], s['lat'], s['span'], s['axis'])
            np.save(cache, z)
        lo, hi = float(z.min()), float(z.max())
        # là où le cours d'eau croise vraiment la coupe (tracé OSM) ; à défaut,
        # le point bas du profil
        f = crossing(s['riv'], s['lon'], s['lat'], s['span'], s['axis'])
        i_eau = int(round(f * (N - 1))) if f is not None else int(np.argmin(z))
        out[key] = {
            'span': s['span'], 'axis': s['axis'], 'lieu': s['lieu'], 'eau': s['eau'],
            'min': round(lo), 'max': round(hi),
            'site': round(float(z[N // 2])),
            'eauX': round(i_eau / (N - 1), 4),
            'eauZ': round(float(z[i_eau])),
            'z': [round(v, 1) for v in z.tolist()],
        }
        print(f"{key:12s} {s['lieu']:14s} {s['axis']} {s['span']/1000:.0f} km   {lo:5.0f}–{hi:5.0f} m   site {z[N//2]:5.0f} m   {s['eau']} à {i_eau/(N-1)*100:4.0f} %")
    js = ('/* Généré par tools/coupes.py — ne pas éditer à la main.\n'
          '   Profils relevés dans le Copernicus DEM GLO-30 (ESA). */\n'
          'window.CoupesData = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
    io.open('js/coupes-data.js', 'w', encoding='utf-8', newline='\n').write(js)
    print(f"js/coupes-data.js écrit ({len(js) // 1024} Ko)")
