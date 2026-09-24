# -*- coding: utf-8 -*-
"""
Le vrai relief — fabrique js/relief-data.js à partir de données ouvertes :
  - altitudes : Copernicus DEM GLO-30 (30 m), tuiles publiques sur AWS
    (https://registry.opendata.aws/copernicus-dem/), lues à distance avec
    rasterio ;
  - rivières : OpenStreetMap via l'API Overpass (Meuse, Ourthe, Geer/Jeker ;
    la Loue à Arc-et-Senans).
Repère de la carte (voir js/relief.js) : projection équirectangulaire locale,
1 km ≈ 25 unités ; coin haut-gauche à 5,05° E / 50,90° N. Arc-et-Senans est
posé dans un second repère, « loin au sud », centré sur (2080, 1760).
Usage :  python tools/relief-data.py      (réseau requis ; ~30 Mo téléchargés)
"""
import base64, io, json, math, os, sys, time, urllib.request, urllib.parse
import numpy as np
import rasterio
from rasterio.windows import from_bounds

os.chdir(os.path.join(os.path.dirname(__file__), '..'))

# ---------- repères ----------
MAIN = dict(lon0=5.05, lat0=50.90, kx=1762.5, ky=2775.0)              # x = (lon-lon0)*kx ; y = (lat0-lat)*ky
SUD  = dict(lonc=5.7768, latc=47.0324, xc=2080.0, yc=1760.0,          # Saline royale d'Arc-et-Senans
            kx=111.32 * math.cos(math.radians(47.03)) * 25, ky=2775.0)

EU   = dict(lon0=4.10, lat0=51.10, x0=3000.0, kx=111.32 * math.cos(math.radians(50.8)) * 8, ky=111.32 * 8)  # carte des visites, 1 km = 8 unités

def eu_xy(lon, lat):    return EU['x0'] + (lon - EU['lon0']) * EU['kx'], (EU['lat0'] - lat) * EU['ky']
def eu_ll(x, y):        return EU['lon0'] + (x - EU['x0']) / EU['kx'], EU['lat0'] - y / EU['ky']
def main_xy(lon, lat):  return (lon - MAIN['lon0']) * MAIN['kx'], (MAIN['lat0'] - lat) * MAIN['ky']
def main_ll(x, y):      return MAIN['lon0'] + x / MAIN['kx'], MAIN['lat0'] - y / MAIN['ky']
def sud_xy(lon, lat):   return SUD['xc'] + (lon - SUD['lonc']) * SUD['kx'], SUD['yc'] - (lat - SUD['latc']) * SUD['ky']
def sud_ll(x, y):       return SUD['lonc'] + (x - SUD['xc']) / SUD['kx'], SUD['latc'] - (y - SUD['yc']) / SUD['ky']

# ---------- altitudes ----------
def dem_tile(lat, lon):
    la, lo = int(math.floor(lat)), int(math.floor(lon))
    name = f"Copernicus_DSM_COG_10_N{la:02d}_00_E{lo:03d}_00_DEM"
    return f"https://copernicus-dem-30m.s3.amazonaws.com/{name}/{name}.tif"

def sample_grid(x0, y0, x1, y1, step, to_ll, smooth=2):
    """altitudes (m) sur la grille [x0..x1] x [y0..y1] (pas `step`) ; les tuiles DEM
    nécessaires (1° x 1°) sont lues une à une, sur la fenêtre utile seulement.
    Le résultat est gardé dans tools/cache/ (relancer le script ne retélécharge rien)."""
    xs = np.arange(x0, x1 + 0.001, step); ys = np.arange(y0, y1 + 0.001, step)
    cache = os.path.join('tools', 'cache', f'dem-{x0}-{y0}-{x1}-{y1}-{step}.npy')
    if os.path.exists(cache):
        return xs, ys, np.load(cache)
    lons = np.empty((len(ys), len(xs))); lats = np.empty_like(lons)
    for j, y in enumerate(ys):
        for i, x in enumerate(xs):
            lons[j, i], lats[j, i] = to_ll(x, y)
    elev = np.zeros_like(lons)
    tiles = sorted({(int(math.floor(la)), int(math.floor(lo))) for la, lo in zip(lats.ravel(), lons.ravel())})
    for la, lo in tiles:
        url = dem_tile(la, lo)
        mask = (np.floor(lats) == la) & (np.floor(lons) == lo)
        if not mask.any(): continue
        print(f"  DEM {url.split('/')[-1]}  lon {lons[mask].min():.3f}..{lons[mask].max():.3f}  lat {lats[mask].min():.3f}..{lats[mask].max():.3f}")
        with rasterio.open(url) as ds:
            win = from_bounds(max(lo, lons[mask].min() - 0.01), max(la, lats[mask].min() - 0.01),
                              min(lo + 1, lons[mask].max() + 0.01), min(la + 1, lats[mask].max() + 0.01), ds.transform)
            data = ds.read(1, window=win).astype('float32')
            tr = ds.window_transform(win)
            rows, cols = rasterio.transform.rowcol(tr, lons[mask], lats[mask])
            rows = np.clip(np.asarray(rows), 0, data.shape[0] - 1); cols = np.clip(np.asarray(cols), 0, data.shape[1] - 1)
            vals = data[rows, cols]
            vals[vals < -100] = 0  # nodata (-32767) : ramené au niveau de la mer
            elev[mask] = vals
    # léger lissage (les courbes doivent rester lisibles à 1 px par unité)
    k = np.array([1, 4, 6, 4, 1], dtype='float32'); k = np.outer(k, k); k /= k.sum()
    pad = np.pad(elev, 2, mode='edge')
    sm = np.zeros_like(elev)
    for dj in range(5):
        for di in range(5):
            sm += k[dj, di] * pad[dj:dj + elev.shape[0], di:di + elev.shape[1]]
    np.save(cache, sm)
    return xs, ys, sm

def encode(elev, emin=0.0, scale=2.0):
    q = np.clip(np.round((elev - emin) / scale), 0, 255).astype('uint8')
    return base64.b64encode(q.tobytes()).decode('ascii')

# ---------- rivières (OSM / Overpass) ----------
MIRRORS = ["https://overpass-api.de/api/interpreter", "https://lz4.overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]

def overpass(query):
    """POST à l'API Overpass — via curl (magasin de certificats du système), en
    tournant sur les miroirs ; les réponses sont gardées dans tools/cache/"""
    import subprocess, hashlib
    cache = os.path.join('tools', 'cache', hashlib.sha1(query.encode()).hexdigest()[:12] + '.json')
    if os.path.exists(cache):
        return json.load(io.open(cache, encoding='utf-8'))
    for attempt in range(6):
        url = MIRRORS[attempt % len(MIRRORS)]
        try:
            r = subprocess.run(['curl', '-s', '--max-time', '180', '-A', 'portfolio-relief/1.0', '--data-urlencode', 'data=' + query, url],
                               capture_output=True, text=True, encoding='utf-8')
            if r.returncode == 0 and r.stdout.strip().startswith('{'):
                data = json.loads(r.stdout)
                io.open(cache, 'w', encoding='utf-8').write(json.dumps(data))
                time.sleep(2)  # politesse envers l'API
                return data
            print('  overpass réponse inattendue :', (r.stdout or r.stderr)[:120].replace(chr(10), ' '))
        except Exception as e:
            print('  overpass retry', attempt, e)
        time.sleep(5 * (attempt + 1))
    print('  Overpass indisponible pour cette requête : rivière ignorée')
    return {'elements': []}

def river_ways(name_regex, bbox, relations=True):
    s, w, n, e = bbox
    bb = f'({s},{w},{n},{e})'
    if relations:
        # les grands cours d'eau ont souvent leur nom sur une relation, pas sur chaque tronçon
        q = (f'[out:json][timeout:180];'
             f'( way["waterway"="river"]["name"~"{name_regex}"]{bb};'
             f'  relation["waterway"="river"]["name"~"{name_regex}"]{bb}; );'
             f'( ._; way(r)["waterway"="river"]{bb}; );'
             f'out geom;')
    else:
        q = f'[out:json][timeout:180];way["waterway"="river"]["name"~"{name_regex}"]{bb};out geom;'
    data = overpass(q)
    ways = []
    for el in data.get('elements', []):
        if el.get('type') == 'way' and 'geometry' in el:
            ways.append([(p['lon'], p['lat']) for p in el['geometry']])
    return ways

def chain(ways):
    """assemble des tronçons en la plus longue polyligne continue possible"""
    ways = [w for w in ways if len(w) > 1]
    if not ways: return []
    def close(a, b): return abs(a[0] - b[0]) < 1e-4 and abs(a[1] - b[1]) < 1e-4
    best = []
    for start in range(len(ways)):
        line = list(ways[start]); used = {start}; grown = True
        while grown:
            grown = False
            for i, w in enumerate(ways):
                if i in used: continue
                if close(line[-1], w[0]):  line += w[1:]; used.add(i); grown = True
                elif close(line[-1], w[-1]): line += w[-2::-1]; used.add(i); grown = True
                elif close(line[0], w[-1]): line = w[:-1] + line; used.add(i); grown = True
                elif close(line[0], w[0]):  line = w[::-1][:-1] + line; used.add(i); grown = True
        if len(line) > len(best): best = line
    return best

def simplify(pts, tol):
    """Douglas-Peucker"""
    if len(pts) < 3: return pts
    (x0, y0), (x1, y1) = pts[0], pts[-1]
    dx, dy = x1 - x0, y1 - y0; L2 = dx * dx + dy * dy or 1e-9
    dmax, idx = 0, 0
    for i in range(1, len(pts) - 1):
        px, py = pts[i]
        t = max(0, min(1, ((px - x0) * dx + (py - y0) * dy) / L2))
        d = math.hypot(px - (x0 + t * dx), py - (y0 + t * dy))
        if d > dmax: dmax, idx = d, i
    if dmax > tol:
        return simplify(pts[:idx + 1], tol)[:-1] + simplify(pts[idx:], tol)
    return [pts[0], pts[-1]]

def to_path(pts):
    return 'M ' + ' L '.join(f"{x:.1f} {y:.1f}" for x, y in pts)

def river(name_regex, bbox, to_xy, clip, tol=2.5, relations=True):
    """tous les tronçons du cours d'eau (bras et îles compris), chacun simplifié ;
    le plus long en premier — rendus comme sous-chemins d'un même <path>"""
    ways = river_ways(name_regex, bbox, relations)
    x0, y0, x1, y1 = clip
    parts = []
    for w in ways:
        pts = [to_xy(lon, lat) for lon, lat in w]
        pts = [(x, y) for x, y in pts if x0 - 200 <= x <= x1 + 200 and y0 - 200 <= y <= y1 + 200]
        if len(pts) < 2: continue
        pts = simplify(pts, tol)
        if len(pts) >= 2: parts.append(pts)
    parts.sort(key=lambda p: -len(p))
    n = sum(len(p) for p in parts)
    print(f"  {name_regex}: {len(ways)} tronçons OSM -> {len(parts)} gardés, {n} points")
    return parts

def to_path_multi(parts):
    return ' '.join(to_path(p) for p in parts)

def cours(name_regex, bbox, to_xy, clip, tol=2.5, relations=True):
    """le cours principal, d'un seul tenant, orienté de l'amont vers l'aval :
    les tronçons OSM sont chaînés, puis le sens est donné par l'altitude des
    deux extrémités (l'eau part du point haut). C'est ce tracé que la carte
    de l'accueil fait « couler » au fil du scroll."""
    line = chain(river_ways(name_regex, bbox, relations))
    if len(line) < 2: return []
    # altitude aux deux bouts (Copernicus DEM)
    ends = [line[0], line[-1]]
    with rasterio.open(dem_tile(ends[0][1], ends[0][0])) as ds:
        z = [v[0] for v in ds.sample(ends)]
    if z[0] < z[1]:
        line = line[::-1]
    pts = [to_xy(lon, lat) for lon, lat in line]
    x0, y0, x1, y1 = clip
    pts = [(x, y) for x, y in pts if x0 - 200 <= x <= x1 + 200 and y0 - 200 <= y <= y1 + 200]
    pts = simplify(pts, tol)
    print(f"  cours de {name_regex}: {len(line)} points -> {len(pts)}, de {max(z):.0f} m vers {min(z):.0f} m")
    return pts

if __name__ == '__main__':
    print('Altitudes (Copernicus DEM)…')
    xs, ys, main_elev = sample_grid(0, 0, 1400, 1000, 5, main_ll)
    print(f"  bassin de la Meuse : {main_elev.min():.0f}–{main_elev.max():.0f} m")
    xs2, ys2, sud_elev = sample_grid(1860, 1580, 2300, 1940, 5, sud_ll)
    print(f"  Arc-et-Senans : {sud_elev.min():.0f}–{sud_elev.max():.0f} m")
    xs3, ys3, eu_elev = sample_grid(3000, 0, 4744, 536, 6, eu_ll)
    print(f"  Euregio (visites) : {eu_elev.min():.0f}–{eu_elev.max():.0f} m")
    # repères de la carte des visites, dans ce repère (pour le HTML)
    for name, lon, lat in [('Bruxelles', 4.3517, 50.8466), ('Liège', 5.5797, 50.6326), ('Maastricht', 5.6910, 50.8514),
                           ('Aix-la-Chapelle', 6.0839, 50.7753), ('Cologne', 6.9603, 50.9375),
                           ('Herstal', 5.632, 50.664), ('Waremme', 5.2553, 50.6972), ('Haccourt', 5.678, 50.733)]:
        x, y = eu_xy(lon, lat); print(f"    {name:16s} x={x:.0f} y={y:.0f}  ({(x-3000)/1744*100:.1f}%, {y/536*100:.1f}%)")

    print('Rivières (OpenStreetMap)…')
    bbox_main = (50.50, 4.95, 50.95, 5.95)
    rivers = {
        'meuse':  river('^(La )?Meuse$', bbox_main, main_xy, (0, 0, 1400, 1000)),
        'ourthe': river('^Ourthe$', bbox_main, main_xy, (0, 0, 1400, 1000)),
        'geer':   river('^(Geer|Jeker)$', bbox_main, main_xy, (0, 0, 1400, 1000)),
        'loue':   river('^(La )?Loue$', (46.95, 5.60, 47.12, 5.95), sud_xy, (1860, 1580, 2300, 1940)),
        # carte des visites (repère Euregio) : la Meuse jusqu'aux Pays-Bas, le Rhin à Cologne
        'meuse-eu': river('^(La )?Meuse$|^Maas$', (50.45, 4.60, 51.15, 5.95), eu_xy, (3000, 0, 4744, 536), tol=1.5, relations=False),
        'rhein':    river('^Rhein$', (50.75, 6.75, 51.15, 7.25), eu_xy, (3000, 0, 4744, 536), tol=1.5, relations=False),
    }
    # les cours principaux, orientés amont -> aval (pour l'écoulement)
    print("Cours principaux (amont -> aval)…")
    flows = {
        'meuse':  cours('^(La )?Meuse$', bbox_main, main_xy, (0, 0, 1400, 1000)),
        'ourthe': cours('^Ourthe$', bbox_main, main_xy, (0, 0, 1400, 1000)),
        'geer':   cours('^(Geer|Jeker)$', bbox_main, main_xy, (0, 0, 1400, 1000)),
    }
    data = {
        'main': {'x0': 0, 'y0': 0, 'step': 5, 'nx': len(xs), 'ny': len(ys), 'emin': 0, 'scale': 2, 'b64': encode(main_elev)},
        'sud':  {'x0': 1860, 'y0': 1580, 'step': 5, 'nx': len(xs2), 'ny': len(ys2), 'emin': 0, 'scale': 2, 'b64': encode(sud_elev)},
        'eu':   {'x0': 3000, 'y0': 0, 'step': 6, 'nx': len(xs3), 'ny': len(ys3), 'emin': 0, 'scale': 2, 'b64': encode(eu_elev)},
        'rivers': [{'id': k, 'd': to_path_multi(v)} for k, v in rivers.items() if v],
        'flows': [{'id': k, 'd': to_path(v)} for k, v in flows.items() if len(v) > 1],
        'source': 'Altitudes : Copernicus DEM GLO-30 (ESA, 2021). Rivières : OpenStreetMap (ODbL).',
    }
    js = ('/* Généré par tools/relief-data.py — ne pas éditer à la main.\n'
          '   ' + data['source'] + ' */\n'
          'window.ReliefData = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
    io.open('js/relief-data.js', 'w', encoding='utf-8', newline='\n').write(js)
    print(f"js/relief-data.js écrit ({len(js) // 1024} Ko)")
