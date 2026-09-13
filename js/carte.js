/* ==========================================================================
   LA CARTE DE L'ACCUEIL — affiche topographique (index.html)
   1. Le relief : les courbes de niveau du bassin de la Meuse, calculées
      par js/relief.js (le même relief que sur toutes les autres pages).
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
  const svg  = stage.querySelector('.carte-svg:not(.carte-relief)');
  const relief = stage.querySelector('.carte-relief');
  const zoom = stage.querySelector('.carte-zoom');
  const sites = [...stage.querySelectorAll('.site')];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';

  /* ---------- 1. le relief (voir js/relief.js) ---------- */
  // les rivières réelles (OpenStreetMap), si les données sont là
  if (window.ReliefData && ReliefData.rivers) ReliefData.rivers.forEach(r => {
    const p = svg.querySelector('#r-' + r.id); if (p) p.setAttribute('d', r.d);
  });
  if (window.Relief) {
    const { paths } = Relief.contours({ x: 0, y: 0, w: 1400, h: 1000, cell: 8 });
    Relief.fill(relief.querySelector('.carte-contours'), paths);
  }

  /* ---------- 1b. le relief rasterisé ----------
     Les courbes font des dizaines de milliers de segments : les faire
     grossir (zoom au clic) ou varier en opacité (séquence) coûte cher en
     vecteur. On les dessine une fois dans un <canvas> à la résolution de
     l'écran ; le SVG vectoriel ne sert plus qu'à ce dessin. Le canvas est un
     simple bitmap pour le compositeur : zoom et fondu restent fluides. */
  const canvas = document.createElement('canvas');
  canvas.className = 'carte-relief-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  relief.after(canvas);
  let rasterTimer = 0;
  const rasterize = () => {
    const W = stage.clientWidth, H = stage.clientHeight;
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

  /* ---------- 2. le cadrage et les sites, en pixels ----------
     Paysage : la carte remplit l'écran en largeur, et la fenêtre verticale
     est centrée sur les sites (y ≈ 640) plutôt que sur le milieu de la carte
     — un écran 16/9 ou plus large montre ainsi toujours les quatre projets.
     Portrait : la carte tient dans l'écran sur un cadrage resserré. */
  const place = () => {
    const W = stage.clientWidth, H = stage.clientHeight;
    if (!W || !H) return;
    const portrait = H > W * 0.95;
    let vb;
    if (portrait) {
      vb = [250, 60, 1150, 940];
    } else {
      const k = W / 1400, vh = Math.min(1000, H / k);
      const vy = Math.max(0, Math.min(1000 - vh, 640 - vh / 2));
      vb = [0, Math.round(vy), 1400, Math.round(vh)];
    }
    const par = portrait ? 'xMidYMid meet' : 'xMidYMid slice';
    [svg, relief].forEach(s => { s.setAttribute('viewBox', vb.join(' ')); s.setAttribute('preserveAspectRatio', par); });
    const k = portrait ? Math.min(W / vb[2], H / vb[3]) : Math.max(W / vb[2], H / vb[3]);
    const ox = (W - vb[2] * k) / 2, oy = (H - vb[3] * k) / 2;
    sites.forEach(s => {
      s.style.left = `${(ox + (s.dataset.x - vb[0]) * k).toFixed(1)}px`;
      s.style.top  = `${(oy + (s.dataset.y - vb[1]) * k).toFixed(1)}px`;
    });
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
  if (window.gsap && window.ScrollTrigger && !reduceMotion) {
    gsap.registerPlugin(ScrollTrigger);
    const mains = [...svg.querySelectorAll('.river-main')];
    const lengths = mains.map(u => svg.querySelector(u.getAttribute('href')).getTotalLength());
    const order = ['.site--01', '.site--03', '.site--04', '.site--02'].map(sel => stage.querySelector(sel));
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: '.carte', start: 'top top', end: 'bottom bottom', scrub: 0.5 }
    });
    tl.fromTo([relief, canvas], { opacity: 0.35 }, { opacity: 1, duration: 0.3 }, 0)
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
      .fromTo([svg, relief, canvas], { scale: 1.06 }, { scale: 1, duration: 1 }, 0);
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
     La couverture du projet a un lien « voir sur la carte » (et le bouton
     Précédent du navigateur) : la carte arrive zoomée sur ce site et
     s'éloigne jusqu'à la vue entière — l'inverse du clic. */
  let back = null, via = null;
  try {
    back = sessionStorage.getItem('carte-site'); via = sessionStorage.getItem('carte-via');
    sessionStorage.removeItem('carte-site'); sessionStorage.removeItem('carte-via');
  } catch (_) {}
  // on ne « revient » que depuis la pastille d'une couverture (via = pin) ou par
  // le bouton Précédent ; arriver par le logo ou le menu rejoue la séquence
  const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
  const isBack = nav && nav.type === 'back_forward';
  const from = back && (via === 'pin' || isBack) && stage.querySelector(`.site--${back}`);
  if (from && !reduceMotion) {
    const dot = from.querySelector('.site-dot').getBoundingClientRect();
    const box = zoom.getBoundingClientRect();
    zoom.style.setProperty('--zx', `${dot.left + dot.width / 2 - box.left}px`);
    zoom.style.setProperty('--zy', `${dot.top + dot.height / 2 - box.top}px`);
    stage.classList.add('is-returning');
    // la séquence est déjà « jouée » quand on revient : on se place à la fin
    // de la section, carte entière découverte
    const section = document.querySelector('.carte');
    if (section) window.scrollTo({ top: section.offsetTop + section.offsetHeight - window.innerHeight, behavior: 'instant' });
    if (window.ScrollTrigger) ScrollTrigger.refresh();
    const release = () => {
      stage.classList.add('is-returning-out');
      setTimeout(() => stage.classList.remove('is-returning', 'is-returning-out'), 950);
    };
    const go = () => setTimeout(release, 60);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go();
  }
})();
