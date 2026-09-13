/* ==========================================================================
   LA CARTE DE L'ACCUEIL — affiche topographique (index.html)
   1. Le relief : des courbes de niveau calculées ici, à partir d'un relief
      plausible du bassin de la Meuse — un plateau (Hesbaye ~170 m au NW,
      Herve/Ardenne ~280 m au SE, Limbourg ~100 m au NE) creusé par les
      vallées (Meuse, Ourthe, Geer), plus un léger bruit. Isolignes tous
      les 10 m (marching squares), les multiples de 50 un peu plus marqués.
   2. Les sites : leurs coordonnées sont celles du viewBox (data-x/y) ;
      converties en pixels pour rester exactement sur la carte, que celle-ci
      remplisse l'écran (paysage, « slice ») ou tienne dedans (portrait).
   3. La séquence au scroll (GSAP ScrollTrigger, scrub) : la carte reste
      fixe pendant qu'on descend et se découvre — le nom, le relief, l'eau
      qui se dessine, les projets un à un, le manifeste.
   4. Le clic sur un projet : la carte zoome sur le site, puis la page
      s'ouvre (et, quand le navigateur le permet, le numéro devient celui
      de la couverture — View Transitions, voir le CSS).
   Sans script : la carte est là, complète, les sites en place (repli en %).
   Sous prefers-reduced-motion : tout est visible d'emblée, sans séquence.
   ========================================================================== */
(() => {
  const stage = document.querySelector('.carte-stage');
  if (!stage) return;
  const svg  = stage.querySelector('.carte-svg');
  const zoom = stage.querySelector('.carte-zoom');
  const sites = [...stage.querySelectorAll('.site')];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';

  /* ---------- 1. le relief ---------- */
  const contours = () => {
    const g = svg.querySelector('.carte-contours');
    const rivers = ['r-meuse', 'r-ourthe', 'r-geer'].map(id => {
      const p = svg.querySelector('#' + id), pts = [], L = p.getTotalLength();
      for (let s = 0; s <= L; s += 8) { const q = p.getPointAtLength(s); pts.push(q.x, q.y); }
      return pts;
    });
    const depth = [160, 90, 70], width = [120, 70, 60];
    const cell = 8, nx = Math.floor(1400 / cell) + 1, ny = Math.floor(1000 / cell) + 1;
    const E = new Float32Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const x = i * cell, y = j * cell, u = x / 1400, v = y / 1000;
      let e = 170 * (1 - u) * (1 - v) + 100 * u * (1 - v) + 200 * (1 - u) * v + 280 * u * v
            + 12 * Math.sin(x / 140) * Math.cos(y / 110) + 8 * Math.sin(x / 70 + y / 90) + 5 * Math.cos(x / 45 - y / 60);
      for (let r = 0; r < 3; r++) {
        const pts = rivers[r]; let d2 = Infinity;
        for (let k = 0; k < pts.length; k += 2) { const dx = pts[k] - x, dy = pts[k + 1] - y, q = dx * dx + dy * dy; if (q < d2) d2 = q; }
        e -= depth[r] * Math.exp(-d2 / (width[r] * width[r]));
      }
      E[j * nx + i] = e;
    }
    const lerp = (a, b, va, vb, L) => a + (b - a) * ((L - va) / (vb - va || 1));
    const frag = document.createDocumentFragment();
    for (let L = 50; L <= 300; L += 10) {
      let d = '';
      for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
        const a = E[j * nx + i], b = E[j * nx + i + 1], c = E[(j + 1) * nx + i + 1], dd = E[(j + 1) * nx + i];
        const code = (a >= L ? 8 : 0) | (b >= L ? 4 : 0) | (c >= L ? 2 : 0) | (dd >= L ? 1 : 0);
        if (code === 0 || code === 15) continue;
        const x0 = i * cell, y0 = j * cell;
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
      if (!d) continue;
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', d);
      if (L % 50 === 0) path.setAttribute('class', 'index');
      frag.append(path);
    }
    g.replaceChildren(frag);
  };
  contours();

  /* ---------- 2. les sites, en pixels ---------- */
  const place = () => {
    const W = stage.clientWidth, H = stage.clientHeight;
    if (!W || !H) return;
    const portrait = H > W * 0.95;
    // en portrait, la carte tient dans l'écran (meet) sur un cadrage resserré
    // autour des sites ; en paysage, elle remplit l'écran (slice)
    const vb = portrait ? [250, 60, 1150, 940] : [0, 0, 1400, 1000];
    svg.setAttribute('viewBox', vb.join(' '));
    svg.setAttribute('preserveAspectRatio', portrait ? 'xMidYMid meet' : 'xMidYMid slice');
    const k = portrait ? Math.min(W / vb[2], H / vb[3]) : Math.max(W / vb[2], H / vb[3]);
    const ox = (W - vb[2] * k) / 2, oy = (H - vb[3] * k) / 2;
    sites.forEach(s => {
      s.style.left = `${(ox + (s.dataset.x - vb[0]) * k).toFixed(1)}px`;
      s.style.top  = `${(oy + (s.dataset.y - vb[1]) * k).toFixed(1)}px`;
    });
  };
  place();
  if ('ResizeObserver' in window) new ResizeObserver(place).observe(stage);
  else window.addEventListener('resize', place);

  /* ---------- 3. la séquence au scroll ---------- */
  const title = stage.querySelector('.carte-title');
  const foot  = stage.querySelector('.carte-foot');
  const hint  = stage.querySelector('.carte-hint');
  if (window.gsap && window.ScrollTrigger && !reduceMotion) {
    gsap.registerPlugin(ScrollTrigger);
    const mains = [...svg.querySelectorAll('.river-main')];
    const lengths = mains.map(u => svg.querySelector(u.getAttribute('href')).getTotalLength());
    const order = ['.site--01', '.site--03', '.site--04', '.site--02'].map(sel => stage.querySelector(sel));
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: '.carte', start: 'top top', end: 'bottom bottom', scrub: 0.5 }
    });
    tl.fromTo(svg.querySelector('.carte-contours'), { opacity: 0.35 }, { opacity: 1, duration: 0.3 }, 0)
      .fromTo(title, { opacity: 1, y: 0 }, { opacity: 0, y: -24, duration: 0.14, ease: 'power1.in' }, 0.06)
      .fromTo(hint, { opacity: 1 }, { opacity: 0, duration: 0.06 }, 0)
      .fromTo(svg.querySelector('.carte-rivers'), { opacity: 0 }, { opacity: 1, duration: 0.06 }, 0.08);
    mains.forEach((u, i) => {
      tl.fromTo(u, { strokeDasharray: lengths[i], strokeDashoffset: lengths[i] },
                   { strokeDashoffset: 0, duration: 0.34 }, 0.10 + i * 0.03);
    });
    tl.fromTo(svg.querySelector('.carte-city'), { opacity: 0 }, { opacity: 1, duration: 0.08 }, 0.30);
    order.forEach((s, i) => {
      // l'opacité sur le lien, l'échelle sur la pastille seule : le lien garde
      // son transform CSS (c'est lui qui centre la pastille sur le lieu)
      tl.fromTo(s, { opacity: 0 }, { opacity: 1, duration: 0.09 }, 0.42 + i * 0.1)
        .fromTo(s.querySelector('.site-dot'), { scale: 0.6 }, { scale: 1, duration: 0.09, ease: 'power2.out' }, 0.42 + i * 0.1);
    });
    tl.fromTo(foot, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.12, ease: 'power1.out' }, 0.84)
      .fromTo(svg, { scale: 1.06 }, { scale: 1, duration: 1 }, 0);
  } else {
    // sans séquence : tout est en place, le nom laisse la place au manifeste
    if (title) title.style.display = 'none';
    if (hint) hint.style.display = 'none';
  }

  /* ---------- 4. le zoom au clic ---------- */
  sites.forEach(s => {
    s.addEventListener('click', e => {
      if (reduceMotion || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      const dot = s.querySelector('.site-dot').getBoundingClientRect();
      const box = zoom.getBoundingClientRect();
      zoom.style.setProperty('--zx', `${dot.left + dot.width / 2 - box.left}px`);
      zoom.style.setProperty('--zy', `${dot.top + dot.height / 2 - box.top}px`);
      stage.classList.add('is-zooming');
      s.classList.add('is-target');
      setTimeout(() => { location.href = s.href; }, 620);
    });
  });
})();
