/* ==========================================================================
   LE RELIEF — le motif qui unit toutes les pages
   Un seul territoire, dessiné en courbes de niveau : le bassin de la Meuse
   autour de Liège, en plein sur l'accueil (js/carte.js), et par fragments
   partout ailleurs — un fenêtrage serré autour du site de chaque projet
   derrière sa couverture, un fragment derrière les titres des autres
   pages, la carte entière, très pâle, sous le pied de page.
   Le relief est plausible, pas relevé : un plateau (Hesbaye ~170 m au NW,
   Herve/Ardenne ~280 m au SE, Limbourg ~100 m au NE) creusé par les
   vallées de la Meuse, de l'Ourthe et du Geer, plus un léger bruit ;
   isolignes tous les 10 m (marching squares), les multiples de 50 m un
   peu plus marquées. Les coordonnées sont celles de la carte (viewBox
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

  let cache = null;
  // échantillonne les rivières en points (tous les 8 unités), une seule fois
  const samples = () => {
    if (cache) return cache;
    const hidden = document.createElementNS(NS, 'svg');
    hidden.setAttribute('width', 0); hidden.setAttribute('height', 0);
    hidden.style.position = 'absolute';
    document.body.append(hidden);
    cache = [...RIVERS, LOUE].map(r => {
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
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) E[j * nx + i] = elevation(x + i * cell, y + j * cell, rivers);
    const lerp = (a, b, va, vb, L) => a + (b - a) * ((L - va) / (vb - va || 1));
    const paths = [];
    for (let L = 50; L <= 300; L += 10) {
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
      if (d) paths.push({ d, index: L % 50 === 0 });
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

  /* insère dans `el` un fragment de carte : courbes + rivières en rubans */
  const mount = (el, { x, y, w, h, cell, rivers: withRivers = true, cls = '' }) => {
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
        const width = { meuse: 22, ourthe: 12, geer: 9, loue: 14 }[r.id] || 10;
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
    return svg;
  };

  return { RIVERS, LOUE, contours, fill, mount, elevation };
})();

/* Montage automatique : tout élément [data-relief="x,y,w,h"] reçoit son
   fragment (les couvertures de projet, les en-têtes des autres pages, le
   pied de page). Ce qui est dans le premier écran est dessiné tout de
   suite ; le reste après le premier rendu, pour ne pas le retarder. */
(() => {
  const els = [...document.querySelectorAll('[data-relief]')];
  const mountEl = el => {
    const [x, y, w, h] = el.dataset.relief.split(',').map(Number);
    Relief.mount(el, { x, y, w, h, rivers: el.dataset.reliefRivers !== 'off', cls: el.dataset.reliefClass || '' });
  };
  const later = [];
  els.forEach(el => { if (el.getBoundingClientRect().top < window.innerHeight) mountEl(el); else later.push(el); });
  if (later.length) setTimeout(() => later.forEach(mountEl), 80); // après le premier rendu
})();
