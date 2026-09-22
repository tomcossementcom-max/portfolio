/* ==========================================================================
   LA CARTE DE L'ACCUEIL — affiche topographique (index.html)
   1. Le relief : les courbes de niveau du bassin de la Meuse, calculées
      par js/relief.js (le même relief que sur toutes les autres pages),
      puis rasterisées une fois dans un <canvas> : zoom et fondus restent
      fluides, même sur un portable.
   2. Le cadrage :
      - paysage : la carte remplit l'écran en largeur, fenêtre verticale
        centrée sur les sites — les quatre projets sont toujours visibles ;
      - portrait (tablette, téléphone) : la carte remplit l'écran en hauteur
        et la CAMÉRA VOYAGE au fil du scroll, de site en site (Waremme,
        Haccourt, Herstal, Arc-et-Senans), avant de reculer pour montrer
        le territoire entier — impossible de faire tenir 40 km de large sur
        un téléphone sans ce voyage.
   3. La séquence au scroll (GSAP ScrollTrigger, scrub) : la carte reste
      fixe pendant qu'on descend et se découvre — le nom, le relief, l'eau
      qui se dessine, les projets un à un, le manifeste.
   4. Le clic sur un projet : la carte zoome sur le site, puis la page
      s'ouvre (le numéro devient celui de la couverture — View Transitions).
   5. Le retour depuis une couverture : l'inverse.
   Sans script : la carte est là, complète, les sites en place (repli en %).
   Sous prefers-reduced-motion : tout est visible d'emblée, sans séquence.
   ========================================================================== */
(() => {
  const stage = document.querySelector('.carte-stage');
  if (!stage) return;
  const zoom   = stage.querySelector('.carte-zoom');
  const pan    = stage.querySelector('.carte-pan');
  const svg    = stage.querySelector('.carte-svg:not(.carte-relief)');
  const relief = stage.querySelector('.carte-relief');
  const sites  = [...stage.querySelectorAll('.site')];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MAP_W = 1400, MAP_H = 1000;

  /* ---------- 1. le relief (voir js/relief.js) ---------- */
  if (window.ReliefData && ReliefData.rivers) ReliefData.rivers.forEach(r => {
    const p = svg.querySelector('#r-' + r.id); if (p) p.setAttribute('d', r.d);
  });
  if (window.Relief) {
    const { paths } = Relief.contours({ x: 0, y: 0, w: MAP_W, h: MAP_H, cell: 8 });
    Relief.fill(relief.querySelector('.carte-contours'), paths);
  }

  /* l'ombrage solaire : la carte prend l'heure (voir js/lumiere.js) */
  const ombre = document.createElement('canvas');
  ombre.className = 'carte-ombre';
  ombre.setAttribute('aria-hidden', 'true');
  relief.before(ombre);
  const sun = window.Lumiere ? Lumiere.soleil() : null;
  if (sun) {
    Lumiere.ambiance(sun);
    ombre.width = 260; ombre.height = Math.round(260 * MAP_H / MAP_W);
    Lumiere.ombrer(ombre, { x: 0, y: 0, w: MAP_W, h: MAP_H, sun });
    // la mention d'heure, sous le manifeste
    const heure = stage.querySelector('.carte-heure');
    if (heure) {
      const now = new Date();
      const hh = now.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' });
      const etat = document.documentElement.dataset.lumiere;
      const dit = { jour: 'en plein jour', rasante: 'en lumière rasante', crepuscule: 'au crépuscule', nuit: 'de nuit' }[etat] || '';
      heure.textContent = `Le relief est éclairé par le soleil de Liège, ${dit} — ${hh}`;
    }
  }

  /* le relief rasterisé : un bitmap à la résolution de l'écran */
  const canvas = document.createElement('canvas');
  canvas.className = 'carte-relief-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  relief.after(canvas);
  let rasterTimer = 0;
  const rasterize = () => {
    const W = layout.svgW, H = layout.svgH;
    if (!W || !H) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const vb = relief.getAttribute('viewBox');
    const par = relief.getAttribute('preserveAspectRatio');
    const [, , vw, vh] = vb.split(' ').map(Number);
    const k = par.includes('slice') ? Math.max(W / vw, H / vh) : Math.min(W / vw, H / vh);
    const ink = getComputedStyle(document.body).color || '#2c2d2a';
    // le SVG rendu en image ne voit pas la feuille de style : tout en attributs
    const paths = [...relief.querySelectorAll('path')].map(pth => {
      const index = pth.classList.contains('index');
      return `<path d="${pth.getAttribute('d')}" fill="none" stroke="${ink}" stroke-opacity="${index ? 0.32 : 0.16}" stroke-width="${((index ? 0.9 : 0.7) / k).toFixed(3)}"/>`;
    }).join('');
    const src = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" preserveAspectRatio="${par}" width="${W}" height="${H}">${paths}</svg>`;
    const img = new Image();
    img.onload = () => {
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      ctx.drawImage(img, 0, 0, W, H);
      relief.hidden = true;
      canvas.hidden = false;
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src);
  };

  /* ---------- 2. le cadrage et les sites, en pixels ---------- */
  const layout = { W: 0, H: 0, portrait: false, k: 1, svgW: 0, svgH: 0 };
  // la caméra (portrait) : centre visé (coordonnées carte) et échelle
  const cam = { x: 925, y: 640, s: 1 };
  const applyCam = () => {
    if (!layout.portrait) { pan.style.transform = ''; pan.style.removeProperty('--pin-k'); return; }
    const { W, H, k } = layout;
    const mw = MAP_W * k * cam.s, mh = MAP_H * k * cam.s;
    let tx = W / 2 - cam.x * k * cam.s;
    tx = mw >= W ? Math.min(0, Math.max(W - mw, tx)) : (W - mw) / 2;
    let ty = H / 2 - cam.y * k * cam.s;
    ty = mh >= H ? Math.min(0, Math.max(H - mh, ty)) : (H - mh) / 2 - H * 0.05;
    pan.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${cam.s.toFixed(4)})`;
    // les pastilles gardent leur taille quand la carte recule
    pan.style.setProperty('--pin-k', (1 / cam.s).toFixed(3));
  };
  const place = () => {
    const W = stage.clientWidth, H = stage.clientHeight;
    if (!W || !H) return;
    const portrait = H > W * 0.95;
    Object.assign(layout, { W, H, portrait });
    if (portrait) {
      // la carte entière, à l'échelle où elle remplit l'écran en hauteur
      const k = Math.max(W / MAP_W, H / MAP_H);
      const mw = MAP_W * k, mh = MAP_H * k;
      Object.assign(layout, { k, svgW: mw, svgH: mh });
      [svg, relief, canvas, ombre].forEach(s => { s.style.width = mw + 'px'; s.style.height = mh + 'px'; });
      pan.style.width = mw + 'px'; pan.style.height = mh + 'px';
      [svg, relief].forEach(s => { s.setAttribute('viewBox', `0 0 ${MAP_W} ${MAP_H}`); s.setAttribute('preserveAspectRatio', 'xMidYMid meet'); });
      sites.forEach(s => {
        s.style.left = `${(s.dataset.x * k).toFixed(1)}px`;
        s.style.top  = `${(s.dataset.y * k).toFixed(1)}px`;
      });
    } else {
      // pleine largeur, fenêtre verticale centrée sur les sites (y ≈ 640)
      const kx = W / MAP_W, vh = Math.min(MAP_H, H / kx);
      const vy = Math.max(0, Math.min(MAP_H - vh, 640 - vh / 2));
      const vb = [0, Math.round(vy), MAP_W, Math.round(vh)];
      [svg, relief, canvas, ombre].forEach(s => { s.style.width = ''; s.style.height = ''; });
      pan.style.width = ''; pan.style.height = '';
      [svg, relief].forEach(s => { s.setAttribute('viewBox', vb.join(' ')); s.setAttribute('preserveAspectRatio', 'xMidYMid slice'); });
      const k = Math.max(W / vb[2], H / vb[3]);
      const ox = (W - vb[2] * k) / 2, oy = (H - vb[3] * k) / 2;
      Object.assign(layout, { k, svgW: W, svgH: H });
      sites.forEach(s => {
        s.style.left = `${(ox + (s.dataset.x - vb[0]) * k).toFixed(1)}px`;
        s.style.top  = `${(oy + (s.dataset.y - vb[1]) * k).toFixed(1)}px`;
      });
    }
    applyCam();
    // l'ombrage suit le cadrage (il couvre la même fenêtre que les courbes)
    if (sun) {
      const vb = relief.getAttribute('viewBox').split(' ').map(Number);
      const par = relief.getAttribute('preserveAspectRatio');
      const ratio = layout.svgW / layout.svgH;
      const vis = par.includes('slice')
        ? (ratio > vb[2] / vb[3] ? { w: vb[2], h: vb[2] / ratio } : { w: vb[3] * ratio, h: vb[3] })
        : { w: vb[2], h: vb[3] };
      ombre.height = Math.max(40, Math.round(260 / ratio));
      ombre.width = 260;
      Lumiere.ombrer(ombre, { x: vb[0] + (vb[2] - vis.w) / 2, y: vb[1] + (vb[3] - vis.h) / 2, w: vis.w, h: vis.h, sun });
    }
    // le bitmap du relief suit (après la rafale de redimensionnements)
    canvas.hidden = true; relief.hidden = false;
    clearTimeout(rasterTimer);
    rasterTimer = setTimeout(rasterize, 120);
  };
  place();
  if ('ResizeObserver' in window) new ResizeObserver(place).observe(stage);
  else window.addEventListener('resize', place);

  /* ---------- 3. la séquence au scroll ---------- */
  const title = stage.querySelector('.carte-title');
  const foot  = stage.querySelector('.carte-foot');
  const hint  = stage.querySelector('.carte-hint');
  let tl = null;
  if (window.gsap && window.ScrollTrigger && !reduceMotion) {
    gsap.registerPlugin(ScrollTrigger);
    const mains = [...svg.querySelectorAll('.river-main')];
    const lengths = mains.map(u => svg.querySelector(u.getAttribute('href')).getTotalLength());
    const order = ['.site--03', '.site--04', '.site--01', '.site--02'].map(sel => stage.querySelector(sel));
    tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: '.carte', start: 'top top', end: 'bottom bottom', scrub: 0.5 }
    });
    // l'ombrage garde son opacité de feuille de style (un lavis discret) :
    // il monte vers elle, pas vers 1
    const ombreOp = parseFloat(getComputedStyle(ombre).opacity) || 0.26;
    tl.fromTo(ombre, { opacity: ombreOp * 0.35 }, { opacity: ombreOp, duration: 0.3 }, 0)
      .fromTo([relief, canvas], { opacity: 0.35 }, { opacity: 1, duration: 0.3 }, 0)
      .fromTo(title, { opacity: 1, y: 0 }, { opacity: 0, y: -24, duration: 0.14, ease: 'power1.in' }, 0.06)
      .fromTo(hint, { opacity: 1 }, { opacity: 0, duration: 0.06 }, 0)
      .fromTo(svg.querySelector('.carte-rivers'), { opacity: 0 }, { opacity: 1, duration: 0.06 }, 0.08);
    mains.forEach((u, i) => {
      tl.fromTo(u, { strokeDasharray: lengths[i], strokeDashoffset: lengths[i] },
                   { strokeDashoffset: 0, duration: 0.34 }, 0.10 + i * 0.03);
    });
    tl.fromTo(svg.querySelector('.carte-city'), { opacity: 0 }, { opacity: 1, duration: 0.08 }, 0.30);

    if (layout.portrait) {
      // le voyage : la caméra va de site en site, le projet apparaît à l'arrivée,
      // puis recule jusqu'à la vue d'ensemble (les quatre projets, en petit)
      const stops = [[925, 640], [361, 563], [1107, 463], [1026, 655], [1235, 845]];
      const at = [0.36, 0.50, 0.62, 0.72];
      for (let i = 1; i < stops.length; i++) {
        const [x0, y0] = stops[i - 1], [x, y] = stops[i];
        tl.fromTo(cam, { x: x0, y: y0 }, { x, y, duration: 0.09, ease: 'power1.inOut', onUpdate: applyCam }, at[i - 1]);
        tl.fromTo(order[i - 1], { opacity: 0 }, { opacity: 1, duration: 0.05 }, at[i - 1] + 0.07);
      }
      tl.fromTo(cam, { x: 1235, y: 845, s: 1 }, {
        x: 798, y: 640,
        s: () => Math.min(1, (layout.W - 32) / (994 * layout.k)),
        duration: 0.12, ease: 'power2.inOut', onUpdate: applyCam
      }, 0.84);
    } else {
      order.forEach((s, i) => {
        // l'opacité sur le lien, l'échelle sur la pastille seule : le lien garde
        // son transform CSS (c'est lui qui centre la pastille sur le lieu)
        tl.fromTo(s, { opacity: 0 }, { opacity: 1, duration: 0.09 }, 0.42 + i * 0.1)
          .fromTo(s.querySelector('.site-dot'), { scale: 0.6 }, { scale: 1, duration: 0.09, ease: 'power2.out' }, 0.42 + i * 0.1);
      });
      tl.fromTo([svg, relief, canvas, ombre], { scale: 1.06 }, { scale: 1, duration: 1 }, 0);
    }
    tl.fromTo(foot, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.12, ease: 'power1.out' }, 0.86);
  } else {
    // sans séquence : tout est en place, le nom laisse la place au manifeste
    if (title) title.style.display = 'none';
    if (hint) hint.style.display = 'none';
    if (layout.portrait) { cam.x = 798; cam.s = Math.min(1, (layout.W - 32) / (994 * layout.k)); applyCam(); }
  }

  /* ---------- 4. le zoom au clic ---------- */
  const originAt = s => {
    const dot = s.querySelector('.site-dot').getBoundingClientRect();
    const box = zoom.getBoundingClientRect();
    zoom.style.setProperty('--zx', `${dot.left + dot.width / 2 - box.left}px`);
    zoom.style.setProperty('--zy', `${dot.top + dot.height / 2 - box.top}px`);
  };
  sites.forEach(s => {
    s.addEventListener('click', e => {
      if (reduceMotion || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      originAt(s);
      stage.classList.add('is-zooming');
      s.classList.add('is-target');
      try {
        sessionStorage.setItem('carte-site', s.className.match(/site--(\d\d)/)[1]);
        sessionStorage.setItem('carte-via', 'zoom');
      } catch (_) {}
      setTimeout(() => { location.href = s.href; }, 700);
    });
  });

  /* ---------- 4b. retour par le cache du navigateur (bfcache) ----------
     Si le navigateur restaure la page telle qu'on l'a quittée (bouton
     Précédent), elle est encore zoomée sur le site : on rejoue le retour. */
  window.addEventListener('pageshow', e => {
    if (!e.persisted || !stage.classList.contains('is-zooming')) return;
    stage.classList.remove('is-zooming');
    sites.forEach(s => s.classList.remove('is-target'));
    stage.classList.add('is-returning');
    setTimeout(() => {
      stage.classList.add('is-returning-out');
      setTimeout(() => stage.classList.remove('is-returning', 'is-returning-out'), 950);
    }, 60);
  });

  /* ---------- 5. le retour : on revient d'un projet, la carte se ré-ouvre ----------
     Depuis la pastille d'une couverture (ou le bouton Précédent) : la carte
     arrive zoomée sur ce site, entière et découverte, et s'éloigne jusqu'à la
     vue d'ensemble — l'inverse du clic. Arriver par le logo ou le menu rejoue
     la séquence. */
  let back = null, via = null;
  try {
    back = sessionStorage.getItem('carte-site'); via = sessionStorage.getItem('carte-via');
    sessionStorage.removeItem('carte-site'); sessionStorage.removeItem('carte-via');
  } catch (_) {}
  const navEntry = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
  const isBack = navEntry && navEntry.type === 'back_forward';
  const from = back && (via === 'pin' || isBack) && stage.querySelector(`.site--${back}`);
  if (from && !reduceMotion) {
    // la séquence est déjà « jouée » quand on revient : on se place à la fin
    // de la section, carte entière découverte, AVANT de viser le site
    const section = document.querySelector('.carte');
    if (section) window.scrollTo({ top: section.offsetTop + section.offsetHeight - window.innerHeight, behavior: 'instant' });
    if (tl) { tl.scrollTrigger.refresh(); tl.progress(1); }
    originAt(from);
    stage.classList.add('is-returning');
    const release = () => {
      stage.classList.add('is-returning-out');
      setTimeout(() => stage.classList.remove('is-returning', 'is-returning-out'), 950);
    };
    const go = () => setTimeout(release, 60);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go();
  }
})();
