# -*- coding: utf-8 -*-
"""
La carte du Regard — fabrique js/regard-data.js : les côtes et les grands
fleuves d'Europe de l'Ouest et du Maroc (Natural Earth, 1:50 m, domaine
public), dans un repère où 1 unité = 1 km (équirectangulaire, latitude de
référence 42° N). Les photos sont posées dessus par regard.html.
Usage :  python tools/regard-map.py   (télécharge deux GeoJSON dans tools/cache/)
"""
import io, json, math, os, subprocess

os.chdir(os.path.join(os.path.dirname(__file__), '..'))
CACHE = os.path.join('tools', 'cache')
os.makedirs(CACHE, exist_ok=True)

LON0, LON1, LAT0, LAT1 = -12.0, 20.0, 30.0, 56.5   # cadre : de l'Atlantique à l'Adriatique, du Maroc aux Pays-Bas
KX = 111.32 * math.cos(math.radians(42.0))          # km par degré de longitude
KY = 111.32
W, H = (LON1 - LON0) * KX, (LAT1 - LAT0) * KY

def xy(lon, lat):
    return (lon - LON0) * KX, (LAT1 - lat) * KY

def fetch(name):
    path = os.path.join(CACHE, name + '.geojson')
    if not os.path.exists(path):
        url = f'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/{name}.geojson'
        subprocess.run(['curl', '-sL', '--max-time', '180', '-o', path, url], check=True)
    return json.load(io.open(path, encoding='utf-8'))

def lines(geom):
    if geom['type'] == 'LineString': return [geom['coordinates']]
    if geom['type'] == 'MultiLineString': return geom['coordinates']
    return []

def simplify(pts, tol):
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

def to_paths(features, tol, keep=lambda f: True):
    out = []
    for f in features:
        if not keep(f): continue
        for line in lines(f['geometry']):
            pts = [xy(lon, lat) for lon, lat in line if LON0 - 1 <= lon <= LON1 + 1 and LAT0 - 1 <= lat <= LAT1 + 1]
            if len(pts) < 2: continue
            pts = simplify(pts, tol)
            if len(pts) >= 2: out.append('M ' + ' L '.join(f'{x:.0f} {y:.0f}' for x, y in pts))
    return ' '.join(out)

coast = fetch('ne_50m_coastline')['features']
rivers = fetch('ne_50m_rivers_lake_centerlines')['features']
coast_d = to_paths(coast, tol=3)
rivers_d = to_paths(rivers, tol=4, keep=lambda f: (f['properties'].get('scalerank') or 99) <= 6 and f['properties'].get('featurecla') == 'River')

PLACES = {  # lieu -> (lon, lat)
    'liege': (5.5797, 50.6326), 'amsterdam': (4.8952, 52.3702), 'porto': (-8.6291, 41.1579),
    'rovinj': (13.6398, 45.0811), 'essaouira': (-9.7595, 31.5085), 'arc-et-senans': (5.7768, 47.0324),
}
data = {
    'w': round(W), 'h': round(H),
    'coast': coast_d, 'rivers': rivers_d,
    'places': {k: [round(v, 1) for v in xy(*ll)] for k, ll in PLACES.items()},
    'source': 'Côtes et fleuves : Natural Earth 1:50m (domaine public).',
}
js = ('/* Généré par tools/regard-map.py — ne pas éditer à la main.\n   ' + data['source'] + ' */\n'
      'window.RegardData = ' + json.dumps(data, separators=(',', ':')) + ';\n')
io.open('js/regard-data.js', 'w', encoding='utf-8', newline='\n').write(js)
print(f"cadre {round(W)} x {round(H)} km ; côtes {len(coast_d)//1024} Ko, fleuves {len(rivers_d)//1024} Ko -> js/regard-data.js ({len(js)//1024} Ko)")
for k, v in data['places'].items(): print(f"  {k:14s} x={v[0]:.0f} y={v[1]:.0f}  ({v[0]/W*100:.1f}%, {v[1]/H*100:.1f}%)")
