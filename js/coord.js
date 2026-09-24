/* ==========================================================================
   OÙ ME TROUVER — la carte qui plonge (about.html)
   Le même territoire que la page d'accueil, et l'on descend dedans : au fil
   du scroll la carte passe du bassin de la Meuse (Liège, Waremme, Hannut)
   jusqu'à Cras-Avernas, rue du Rivage. On comprend d'abord où c'est, puis
   exactement où.
   Comment : un seul SVG dont le viewBox est interpolé au fil du défilement
   (zoom net à toutes les échelles, traits d'épaisseur constante grâce à
   vector-effect). Deux niveaux de détail — le relief large et le relief
   serré, en courbes et en ombrage — se relaient à mi-course. Une échelle
   graphique suit le zoom, les noms de lieux apparaissent et s'effacent.
   Sans script ou sous prefers-reduced-motion : la vue serrée, fixe.
   ========================================================================== */
(() => {
  const host = document.querySelector('.coord-map');
  if (!host || !window.Relief) return;
  const NS = 'http://www.w3.org/2000/svg';
  const M_PER_UNIT = 40;                       // 1 unité de carte ≈ 40 m
  const HOME = { x: 235.5, y: 600.5 };         // Cras-Avernas
  const WIDE = { x: 0, y: 0, w: 1400, h: 1000 };
  const NEAR = { x: HOME.x - 80, y: HOME.y - 57, w: 160, h: 114 };   // ~6,4 x 4,5 km
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const el = (name, attrs = {}, cls) => {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (cls) n.setAttribute('class', cls);
    return n;
  };
  const group = (win, cell, cls, step) => {
    const g = el('g', {}, cls);
    const { paths } = Relief.contours({ ...win, cell, step });
    paths.forEach(p => {
      const path = el('path', { d: p.d, 'vector-effect': 'non-scaling-stroke' });
      if (p.index) path.setAttribute('class', 'index');
      g.append(path);
    });
    return g;
  };
  /* l'ombrage solaire d'une fenêtre, en image posée dans le repère de la carte */
  const ombre = (win, px) => {
    if (!window.Lumiere) return null;
    const cv = document.createElement('canvas');
    cv.width = px; cv.height = Math.round(px * win.h / win.w);
    if (!Lumiere.ombrer(cv, { ...win, sun: Lumiere.soleil() })) return null;
    return el('image', {
      href: cv.toDataURL('image/png'), x: win.x, y: win.y, width: win.w, height: win.h,
      preserveAspectRatio: 'none'
    }, 'coord-ombre');
  };

  const svg = el('svg', { preserveAspectRatio: 'xMidYMid slice', role: 'img' }, 'coord-svg');
  svg.setAttribute('aria-label', "Carte du territoire, de Liège jusqu'à Cras-Avernas.");
  const gWide = el('g', {}, 'coord-niveau coord-niveau--large');
  const gNear = el('g', {}, 'coord-niveau coord-niveau--serre');
  const oWide = ombre(WIDE, 150), oNear = ombre(NEAR, 300);
  if (oWide) gWide.append(oWide);
  if (oNear) gNear.append(oNear);
  gWide.append(group(WIDE, 8, 'coord-contours'));
  // en gros plan, l'équidistance passe à 5 m : sur le plateau hesbignon,
  // presque plat, c'est ce qui donne un dessin à lire
  gNear.append(group(NEAR, 1, 'coord-contours', 5));

  // les cours d'eau : les mêmes tracés que partout (OpenStreetMap)
  const gEau = el('g', {}, 'coord-eaux');
  [...Relief.RIVERS].forEach(r => {
    const w = { meuse: 22, ourthe: 12, geer: 9 }[r.id] || 8;
    [['river river-halo', w * 2.4], ['river river-main', w]].forEach(([cls, k]) => {
      const p = el('path', { d: r.d, 'vector-effect': 'non-scaling-stroke' }, cls);
      p.style.strokeWidth = `${k * 0.55}px`;
      gEau.append(p);
    });
  });
  svg.append(gWide, gNear, gEau);
  host.append(svg);

  /* les lieux : posés en HTML, replacés à chaque image */
  const LIEUX = [
    { x: 933.6, y: 742,   nom: 'Liège',   de: 0, a: 0.45, sous: '' },
    { x: 361.8, y: 562.8, nom: 'Waremme', de: 0, a: 0.66, sous: '' },
    { x: HOME.x, y: HOME.y, nom: 'Cras-Avernas', de: 0, a: 1, sous: 'Rue du Rivage 13', chezmoi: true },
  ];
  LIEUX.forEach(l => {
    l.node = document.createElement('span');
    l.node.className = 'coord-lieu' + (l.chezmoi ? ' coord-lieu--moi' : '');
    l.node.innerHTML = `<i></i><span><em>${l.nom}</em>${l.sous ? `<span class="coord-lieu-adresse">${l.sous}</span>` : ''}</span>`;
    host.append(l.node);
    l.adresse = l.node.querySelector('.coord-lieu-adresse');
  });

  const echelle = document.createElement('div');
  echelle.className = 'coord-echelle';
  echelle.innerHTML = '<span class="coord-echelle-barre"></span><span class="coord-echelle-texte"></span>';
  host.append(echelle);
  const barre = echelle.querySelector('.coord-echelle-barre');
  const texte = echelle.querySelector('.coord-echelle-texte');

  /* le cadrage à un avancement p (0 = le territoire, 1 = la rue) */
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t * t * (3 - 2 * t);
  let vb = null;
  const cadrer = p => {
    const r = host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const ar = r.width / r.height;
    const t = ease(Math.max(0, Math.min(1, p)));
    // le zoom est géométrique : chaque pas de scroll rapproche d'autant
    const hwWide = WIDE.w / 2, hwNear = 52;                 // ~4 km de large à l'arrivée
    const hw = hwWide * Math.pow(hwNear / hwWide, t);
    // la visée arrive plus vite que le zoom : sinon, à mi-course, la carte est
    // déjà très rapprochée mais encore centrée trop à l'est — le village sort
    // du cadre avant qu'on l'atteigne
    const tc = ease(Math.min(1, t / 0.5));
    const cx = lerp(WIDE.x + WIDE.w / 2, HOME.x, tc);
    const cy = lerp(WIDE.y + WIDE.h / 2, HOME.y, tc);
    const hh = hw / ar;
    vb = [cx - hw, cy - hh, hw * 2, hh * 2];
    svg.setAttribute('viewBox', vb.join(' '));

    // les niveaux de détail se relaient à mi-course
    const f = Math.max(0, Math.min(1, (t - 0.42) / 0.22));
    gWide.style.opacity = (1 - f).toFixed(3);
    gNear.style.opacity = f.toFixed(3);
    // l'ombrage est un lavis basse résolution : il s'efface quand on entre
    // dans le détail, où il n'aurait plus rien à dire
    const fondu = 1 - Math.max(0, Math.min(1, (t - 0.72) / 0.2));
    if (oWide) oWide.style.opacity = fondu.toFixed(3);
    if (oNear) oNear.style.opacity = fondu.toFixed(3);

    // les lieux suivent le cadrage
    LIEUX.forEach(l => {
      const lx = (l.x - vb[0]) / vb[2] * 100, ly = (l.y - vb[1]) / vb[3] * 100;
      l.node.style.left = `${lx.toFixed(2)}%`;
      l.node.style.top = `${ly.toFixed(2)}%`;
      // près du bord droit, le nom passe à gauche du point
      l.node.classList.toggle('coord-lieu--gauche', lx > 66);
      const dedans = lx > -2 && lx < 102 && ly > -8 && ly < 108;
      const visible = dedans && t >= l.de && t <= l.a + 0.001;
      // apparition et disparition en fondu, sur une petite plage
      const fin = l.a >= 1 ? 1 : Math.max(0, Math.min(1, (l.a - t) / 0.12));
      const deb = l.de <= 0 ? 1 : Math.max(0, Math.min(1, (t - l.de) / 0.12));
      l.node.style.opacity = visible ? Math.min(deb, fin).toFixed(3) : '0';
      // l'adresse n'apparaît qu'à l'arrivée, quand la rue est là
      if (l.adresse) l.adresse.style.opacity = Math.max(0, Math.min(1, (t - 0.72) / 0.18)).toFixed(3);
    });

    // l'échelle : une barre ronde (1 km, 500 m, 200 m…) mesurée sur la carte
    const mParPx = vb[2] / r.width * M_PER_UNIT;
    const cible = 110 * mParPx;                              // ~110 px
    const pas = [100, 200, 500, 1000, 2000, 5000, 10000, 20000].reduce((a, b) => Math.abs(b - cible) < Math.abs(a - cible) ? b : a);
    barre.style.width = `${(pas / mParPx).toFixed(1)}px`;
    texte.textContent = pas >= 1000 ? `${pas / 1000} km` : `${pas} m`;
  };

  /* le scroll : la descente dans la carte */
  let prog = reduce ? 1 : 0;
  cadrer(prog);
  if ('ResizeObserver' in window) new ResizeObserver(() => cadrer(prog)).observe(host);

  const section = host.closest('.coord-scroll');
  if (!reduce && window.gsap && window.ScrollTrigger && section) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.create({
      trigger: section, start: 'top top', end: 'bottom bottom', scrub: 0.4,
      onUpdate: st => { prog = st.progress; cadrer(prog); }
    });
  } else {
    prog = 1; cadrer(1);
  }
})();
