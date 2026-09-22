/* ==========================================================================
   LE RELIEF — le motif qui unit toutes les pages
   Un seul territoire, dessiné en courbes de niveau : le bassin de la Meuse
   autour de Liège, en plein sur l'accueil (js/carte.js), et par fragments
   partout ailleurs — un fenêtrage serré autour du site de chaque projet
   derrière sa couverture, un fragment derrière les titres des autres
   pages, la carte entière, très pâle, sous le pied de page.
   Le relief est le vrai (Copernicus DEM, 30 m) et les rivières celles
   d'OpenStreetMap quand js/relief-data.js est chargé — sinon un relief
   plausible (plateau creusé par les vallées) prend le relais. Isolignes
   tous les 10 m (marching squares), les multiples de 50 m plus marquées. Les coordonnées sont celles de la carte (viewBox
   1400 x 1000 ; 1 km ≈ 25 unités).
   Usage : Relief.mount(element, { x, y, w, h }) dessine le fragment
   [x, y, w, h] de la carte dans un <svg> plein cadre inséré en premier
   enfant de l'élément (qui doit être position: relative).
   Décoratif : sans script, rien.
   ========================================================================== */
window.Relief = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const RIVERS = [
    { id: 'meuse',  depth: 160, width: 120, d: 'M 300 1060 C 470 940, 690 870, 793 832 S 890 785, 925 741 C 960 700, 995 678, 1026 655 C 1058 630, 1064 585, 1058 555 C 1052 520, 1085 490, 1107 463 C 1125 440, 1136 420, 1134 390 C 1130 360, 1128 330, 1128 305 C 1127 250, 1128 190, 1128 136 L 1130 -60' },
    { id: 'ourthe', depth: 90,  width: 70,  d: 'M 943 1060 C 950 985, 940 950, 943 930 C 950 880, 975 840, 969 805 C 962 780, 942 760, 925 745' },
    { id: 'geer',   depth: 70,  width: 60,  d: 'M 212 652 C 265 620, 320 580, 361 563 C 430 540, 490 520, 529 508 C 600 480, 680 400, 730 333 C 790 255, 940 190, 1128 136' },
  ];
  // la Loue, pour Arc-et-Senans (hors carte) : un territoire à part, dans le
  // même repère, loin au sud — x 1900-2300, y 1600-1900
  const LOUE = { id: 'loue', depth: 110, width: 80, d: 'M 1880 1830 C 1960 1800, 2010 1740, 2080 1735 C 2150 1730, 2200 1690, 2240 1640 C 2270 1600, 2300 1580, 2340 1560' };

  /* ---------- le vrai relief, s'il est là (js/relief-data.js) ----------
     Altitudes Copernicus DEM (30 m) échantillonnées tous les 5 unités, en
     deux grilles (le bassin de la Meuse ; Arc-et-Senans, loin au sud),
     et les rivières d'OpenStreetMap. Sans ce fichier : le relief plausible
     ci-dessous. */
  const DATA = window.ReliefData || null;
  const grids = DATA ? ['main', 'sud', 'eu'].map(k => {
    const g = DATA[k]; if (!g) return null;
    const bin = atob(g.b64), v = new Float32Array(bin.length);
    for (let i = 0; i < bin.length; i++) v[i] = g.emin + bin.charCodeAt(i) * g.scale;
    return { ...g, v, x1: g.x0 + (g.nx - 1) * g.step, y1: g.y0 + (g.ny - 1) * g.step };
  }).filter(Boolean) : [];
  const gridAt = (x, y) => grids.find(g => x >= g.x0 && x <= g.x1 && y >= g.y0 && y <= g.y1);
  const sampled = (g, x, y) => {
    const fx = (x - g.x0) / g.step, fy = (y - g.y0) / g.step;
    const i = Math.min(g.nx - 2, Math.floor(fx)), j = Math.min(g.ny - 2, Math.floor(fy));
    const tx = fx - i, ty = fy - j, v = g.v, n = g.nx;
    const a = v[j * n + i], b = v[j * n + i + 1], c = v[(j + 1) * n + i], d = v[(j + 1) * n + i + 1];
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
  };
  const EXTRA = []; // rivières présentes dans les données mais pas dans le repli (ex. le Rhin)
  if (DATA && DATA.rivers) DATA.rivers.forEach(r => {
    const known = [...RIVERS, LOUE].find(k => k.id === r.id);
    if (known) known.d = r.d; else EXTRA.push({ id: r.id, depth: 0, width: 1, d: r.d });
  });

  let cache = null;
  // échantillonne les rivières en points (tous les 8 unités), une seule fois
  const samples = () => {
    if (cache) return cache;
    const hidden = document.createElementNS(NS, 'svg');
    hidden.setAttribute('width', 0); hidden.setAttribute('height', 0);
    hidden.style.position = 'absolute';
    document.body.append(hidden);
    cache = [...RIVERS, LOUE, ...EXTRA].map(r => {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', r.d);
      hidden.append(p);
      const pts = [], L = p.getTotalLength();
      for (let s = 0; s <= L; s += 8) { const q = p.getPointAtLength(s); pts.push(q.x, q.y); }
      return { ...r, pts };
    });
    hidden.remove();
    return cache;
  };

  const elevation = (x, y, rivers) => {
    const g = gridAt(x, y);
    if (g) return sampled(g, x, y);
    const u = Math.min(1, Math.max(0, x / 1400)), v = Math.min(1, Math.max(0, y / 1000));
    let e = 170 * (1 - u) * (1 - v) + 100 * u * (1 - v) + 200 * (1 - u) * v + 280 * u * v
          + 12 * Math.sin(x / 140) * Math.cos(y / 110) + 8 * Math.sin(x / 70 + y / 90) + 5 * Math.cos(x / 45 - y / 60);
    for (const r of rivers) {
      const pts = r.pts; let d2 = Infinity;
      for (let k = 0; k < pts.length; k += 2) { const dx = pts[k] - x, dy = pts[k + 1] - y, q = dx * dx + dy * dy; if (q < d2) d2 = q; }
      e -= r.depth * Math.exp(-d2 / (r.width * r.width));
    }
    return e;
  };

  /* courbes de niveau du fragment [x, y, w, h], en chemins SVG (coordonnées carte) */
  const contours = ({ x, y, w, h, cell }) => {
    const all = samples();
    // seules les rivières qui passent à portée du fragment comptent (vite)
    const rivers = all.filter(r => {
      for (let k = 0; k < r.pts.length; k += 2) {
        if (r.pts[k] > x - 300 && r.pts[k] < x + w + 300 && r.pts[k + 1] > y - 300 && r.pts[k + 1] < y + h + 300) return true;
      }
      return false;
    });
    const nx = Math.floor(w / cell) + 2, ny = Math.floor(h / cell) + 2;
    const E = new Float32Array(nx * ny);
    let lo = Infinity, hi = -Infinity;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const e = elevation(x + i * cell, y + j * cell, rivers);
      E[j * nx + i] = e; if (e < lo) lo = e; if (e > hi) hi = e;
    }
    const lerp = (a, b, va, vb, L) => a + (b - a) * ((L - va) / (vb - va || 1));
    const paths = [];
    // équidistance 10 m ; 20 m quand le fragment est très accidenté (Jura)
    const stepL = hi - lo > 320 ? 20 : 10;
    const L0 = Math.ceil(lo / stepL) * stepL, L1 = Math.floor(hi / stepL) * stepL;
    for (let L = L0; L <= L1; L += stepL) {
      let d = '';
      for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
        const a = E[j * nx + i], b = E[j * nx + i + 1], c = E[(j + 1) * nx + i + 1], dd = E[(j + 1) * nx + i];
        const code = (a >= L ? 8 : 0) | (b >= L ? 4 : 0) | (c >= L ? 2 : 0) | (dd >= L ? 1 : 0);
        if (code === 0 || code === 15) continue;
        const x0 = x + i * cell, y0 = y + j * cell;
        const top = [lerp(x0, x0 + cell, a, b, L), y0], right = [x0 + cell, lerp(y0, y0 + cell, b, c, L)];
        const bottom = [lerp(x0, x0 + cell, dd, c, L), y0 + cell], left = [x0, lerp(y0, y0 + cell, a, dd, L)];
        const seg = (p, q) => { d += `M${p[0].toFixed(1)} ${p[1].toFixed(1)}L${q[0].toFixed(1)} ${q[1].toFixed(1)}`; };
        switch (code) {
          case 1: case 14: seg(left, bottom); break;
          case 2: case 13: seg(bottom, right); break;
          case 3: case 12: seg(left, right); break;
          case 4: case 11: seg(top, right); break;
          case 5: seg(top, left); seg(bottom, right); break;
          case 6: case 9: seg(top, bottom); break;
          case 7: case 8: seg(top, left); break;
          case 10: seg(top, right); seg(left, bottom); break;
        }
      }
      if (d) paths.push({ d, index: L % (stepL * 5) === 0 });
    }
    return { paths, rivers };
  };

  /* remplit un <g> avec les courbes */
  const fill = (g, paths) => {
    const frag = document.createDocumentFragment();
    paths.forEach(p => {
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', p.d);
      if (p.index) path.setAttribute('class', 'index');
      frag.append(path);
    });
    g.replaceChildren(frag);
  };

  /* l'ombrage solaire d'un fragment (voir js/lumiere.js) : un canvas posé
     sous les courbes, dessiné une fois, à l'heure du visiteur */
  const ombre = (el, { x, y, w, h }) => {
    if (!window.Lumiere) return;
    const cv = document.createElement('canvas');
    cv.className = 'relief-ombre';
    cv.setAttribute('aria-hidden', 'true');
    const r = el.getBoundingClientRect();
    const ratio = r.width && r.height ? r.width / r.height : w / h;
    // une grille grossière suffit : l'ombrage est un lavis, pas un dessin
    const cw = 150, chh = Math.max(40, Math.round(cw / ratio));
    cv.width = cw; cv.height = chh;
    // le fragment est affiché en « slice » : on ombre la partie réellement vue
    const vis = ratio > w / h ? { w, h: w / ratio } : { w: h * ratio, h };
    const ok = Lumiere.ombrer(cv, { x: x + (w - vis.w) / 2, y: y + (h - vis.h) / 2, w: vis.w, h: vis.h, sun: Lumiere.soleil() });
    if (ok) el.prepend(cv);
  };

  /* insère dans `el` un fragment de carte : courbes + rivières en rubans */
  const mount = (el, { x, y, w, h, cell, rivers: withRivers = true, cls = '', riverScale = 1 }) => {
    if (!el) return null;
    cell = cell || Math.max(1.5, w / 160);
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', `relief ${cls}`.trim());
    svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    svg.setAttribute('aria-hidden', 'true');
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'relief-contours');
    svg.append(g);
    const { paths, rivers } = contours({ x, y, w, h, cell });
    fill(g, paths);
    if (withRivers) {
      const gr = document.createElementNS(NS, 'g');
      gr.setAttribute('class', 'relief-rivers');
      rivers.forEach(r => {
        const width = ({ meuse: 22, ourthe: 12, geer: 9, loue: 14, 'meuse-eu': 9, rhein: 12 }[r.id] || 10) * riverScale;
        for (const [k, c] of [[2.4, 'river river-halo'], [1, 'river river-main']]) {
          const p = document.createElementNS(NS, 'path');
          p.setAttribute('d', r.d);
          p.setAttribute('class', c);
          // largeur en pixels d'écran quel que soit le fenêtrage : le ruban a la
          // même épaisseur sur la carte entière et sur un fragment très zoomé
          p.setAttribute('vector-effect', 'non-scaling-stroke');
          p.style.strokeWidth = `${(width * k).toFixed(1)}px`;
          gr.append(p);
        }
      });
      svg.append(gr);
    }
    el.prepend(svg);
    ombre(el, { x, y, w, h });
    return svg;
  };

  return { RIVERS, LOUE, contours, fill, mount, elevation, ombre };
})();

/* Montage automatique : tout élément [data-relief="x,y,w,h"] reçoit son
   fragment (les couvertures de projet, les en-têtes des autres pages, le
   pied de page). Ce qui est dans le premier écran est dessiné tout de
   suite ; le reste après le premier rendu, pour ne pas le retarder. */
(() => {
  const els = [...document.querySelectorAll('[data-relief]')];
  // les repères posés sur un fragment ([data-map-x][data-map-y], en coordonnées
  // carte) sont placés en pixels, exactement — le fragment est en « slice »
  const placeMarks = el => {
    const marks = el.querySelectorAll('[data-map-x]');
    if (!marks.length) return;
    const [x, y, w, h] = el.dataset.relief.split(',').map(Number);
    const W = el.clientWidth, H = el.clientHeight;
    if (!W || !H) return;
    const k = Math.max(W / w, H / h);
    const ox = (W - w * k) / 2, oy = (H - h * k) / 2;
    marks.forEach(m => {
      m.style.left = `${(ox + (m.dataset.mapX - x) * k).toFixed(1)}px`;
      m.style.top  = `${(oy + (m.dataset.mapY - y) * k).toFixed(1)}px`;
    });
  };
  const mountEl = el => {
    const [x, y, w, h] = el.dataset.relief.split(',').map(Number);
    Relief.mount(el, { x, y, w, h, rivers: el.dataset.reliefRivers !== 'off', cls: el.dataset.reliefClass || '', riverScale: +(el.dataset.reliefRiverScale || 1) });
    placeMarks(el);
    if (el.querySelector('[data-map-x]') && 'ResizeObserver' in window) new ResizeObserver(() => placeMarks(el)).observe(el);
  };
  const later = [];
  els.forEach(el => { if (el.getBoundingClientRect().top < window.innerHeight) mountEl(el); else later.push(el); });
  if (later.length) setTimeout(() => later.forEach(mountEl), 80); // après le premier rendu
})();
