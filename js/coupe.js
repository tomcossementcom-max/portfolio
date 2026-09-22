/* ==========================================================================
   LA COUPE — le profil réel du terrain, en bas de chaque page projet
   Le dessin que tout paysagiste fait en premier : une coupe de 3 à 4 km
   passant par le site, relevée dans le Copernicus DEM GLO-30 (données
   préparées par tools/coupes.py -> js/coupes-data.js). La vallée, le
   plateau, la rivière à son point bas, et le site marqué d'un trait
   vertical — « vous êtes ici ». Les altitudes sont vraies ; l'exagération
   verticale est indiquée, comme sur une planche.
   Le tracé se dessine au fil du défilement (GSAP), de gauche à droite.
   Sans script : rien (le HTML ne porte qu'un conteneur vide).
   ========================================================================== */
(() => {
  const host = document.querySelector('[data-coupe]');
  const data = window.CoupesData;
  if (!host || !data) return;
  const c = data[host.dataset.coupe];
  if (!c) return;

  const NS = 'http://www.w3.org/2000/svg';
  const W = 1200, H = 210;                 // repère du dessin
  const PAD = { l: 0, r: 0, t: 26, b: 34 };
  const n = c.z.length;
  // l'échelle verticale : on occupe la hauteur utile, avec un peu d'air
  const lo = Math.floor((c.min - 6) / 10) * 10;
  const hi = Math.ceil((c.max + 10) / 10) * 10;
  const X = i => PAD.l + (i / (n - 1)) * (W - PAD.l - PAD.r);
  const Y = z => H - PAD.b - ((z - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  // exagération verticale = (échelle verticale) / (échelle horizontale)
  const exag = ((H - PAD.t - PAD.b) / (hi - lo)) / ((W - PAD.l - PAD.r) / c.span);

  const el = (name, attrs = {}, cls) => {
    const node = document.createElementNS(NS, name);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    if (cls) node.setAttribute('class', cls);
    return node;
  };

  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none', role: 'img' }, 'coupe-svg');
  svg.setAttribute('aria-label', `Coupe topographique de ${(c.span / 1000).toFixed(0)} km passant par le site — de ${c.min} à ${c.max} m d'altitude, ${c.eau} au point bas.`);

  // le terrain : la ligne, et le plein sous la ligne
  let d = '';
  c.z.forEach((z, i) => { d += `${i ? 'L' : 'M'} ${X(i).toFixed(1)} ${Y(z).toFixed(1)} `; });
  svg.append(el('path', { d: `${d}L ${X(n - 1)} ${H - PAD.b} L ${X(0)} ${H - PAD.b} Z` }, 'coupe-fill'));
  const line = el('path', { d }, 'coupe-line');
  svg.append(line);

  // la rivière : le trait d'eau là où elle croise vraiment la coupe (tracé OSM)
  const xe = PAD.l + c.eauX * (W - PAD.l - PAD.r), ye = Y(c.eauZ);
  const half = 30;
  svg.append(el('path', { d: `M ${(xe - half).toFixed(1)} ${ye.toFixed(1)} L ${(xe + half).toFixed(1)} ${ye.toFixed(1)}` }, 'coupe-eau'));
  // le site : la pastille sur le terrain, et un trait qui monte vers son nom
  const xs = X((n - 1) / 2), ys = Y(c.site);
  svg.append(el('path', { d: `M ${xs} ${ys - 6} L ${xs} ${PAD.t + 4}` }, 'coupe-site-line'));
  svg.append(el('circle', { cx: xs, cy: ys, r: 4 }, 'coupe-site-dot'));
  // le sol : un filet au pied du dessin
  svg.append(el('path', { d: `M 0 ${H - PAD.b} L ${W} ${H - PAD.b}` }, 'coupe-base'));
  host.append(svg);

  // les mentions, en HTML : elles gardent leur taille quel que soit l'étirement
  const mark = document.createElement('span');
  mark.className = 'coupe-site-mark';
  mark.style.left = `${(xs / W * 100).toFixed(2)}%`;
  mark.style.top = `${(PAD.t / H * 100).toFixed(2)}%`;
  mark.innerHTML = `<b>${host.dataset.coupeSite || 'le site'}</b><span>${c.site} m</span>`;
  host.append(mark);

  const eauLabel = document.createElement('span');
  eauLabel.className = 'coupe-eau-label';
  eauLabel.style.left = `${Math.min(92, Math.max(8, xe / W * 100)).toFixed(2)}%`;
  eauLabel.style.top = `${(ye / H * 100).toFixed(2)}%`;
  eauLabel.innerHTML = `<b>${c.eau}</b><span>${c.eauZ} m</span>`;
  host.append(eauLabel);

  const axes = document.createElement('div');
  axes.className = 'coupe-axes';
  axes.innerHTML = `<span>${hi} m</span><span>${lo} m</span>`;
  host.append(axes);

  const foot = document.createElement('p');
  foot.className = 'coupe-note';
  foot.innerHTML = `<span>Coupe ${c.axis === 'EW' ? 'est-ouest' : 'nord-sud'} de ${(c.span / 1000).toFixed(0)} km par ${c.lieu} — terrain réel (Copernicus DEM, 30 m)</span><span>Exagération verticale ×${exag.toFixed(0)}</span>`;
  host.parentElement.append(foot);

  /* le tracé se dessine au fil du défilement */
  if (window.gsap && window.ScrollTrigger && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const L = line.getTotalLength();
    gsap.fromTo(line, { strokeDasharray: L, strokeDashoffset: L }, {
      strokeDashoffset: 0, ease: 'none',
      scrollTrigger: { trigger: host, start: 'top 92%', end: 'bottom 62%', scrub: 0.4 }
    });
    gsap.utils.toArray([svg.querySelector('.coupe-fill'), svg.querySelector('.coupe-eau'), eauLabel, svg.querySelector('.coupe-site-line'), svg.querySelector('.coupe-site-dot'), mark]).forEach(n2 => {
      gsap.fromTo(n2, { opacity: 0 }, {
        opacity: 1, ease: 'none',
        scrollTrigger: { trigger: host, start: 'top 80%', end: 'bottom 70%', scrub: 0.4 }
      });
    });
  }
})();
