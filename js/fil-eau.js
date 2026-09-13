/* ==========================================================================
   LA RIVIÈRE — la signature du site
   Chaque page est traversée par une rivière : le même ruban bleu que sur la
   carte de l'accueil, qui naît en filet en haut de page et s'élargit en
   descendant, jusqu'à se jeter dans le pied de page (teinté eau, l'estuaire).
   - elle SUIT LA MISE EN PAGE : dans la marge par défaut, elle passe entre
     les cartes de l'index, entre l'image et le texte de la sélection, le
     long des blocs décalés et des citations des pages projet (ancres
     data-fil="left|right" dans le HTML : la berge passe à 22 px du bord
     indiqué ; ignorées quand le bloc prend toute la largeur, sur mobile) ;
   - elle AVANCE AVEC LA LECTURE : révélée jusqu'à un peu au-delà du milieu
     de l'écran, elle atteint le bas de <main> quand on arrive au bout ;
   - elle COULE : des filets de courant dérivent lentement dans le lit
     (animation CSS) et accompagnent le scroll — proportionnellement à la
     distance parcourue, jamais à la vitesse, donc pas de frétillement à la
     molette ; le curseur qui la traverse y fait des ondes ; de temps en
     temps une goutte tombe et fait une onde là où elle touche l'eau.
   Purement décoratif : SVG aria-hidden injecté ici, sous le contenu
   (z-index négatif, voir .fil-eau dans le CSS). Sans script, il n'existe
   pas. Sous prefers-reduced-motion : rivière complète, fixe, sans courant
   animé ni goutte. Désactivé par <body data-fil="off"> (page Approche).
   ========================================================================== */
(() => {
  const main = document.querySelector('main');
  if (!main || document.body.dataset.fil === 'off') return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer  = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const NS = 'http://www.w3.org/2000/svg';
  const el = (name, cls) => { const n = document.createElementNS(NS, name); if (cls) n.setAttribute('class', cls); return n; };
  const svg   = el('svg', 'fil-eau');
  const defs  = el('defs');
  const clip  = el('clipPath');
  const clipR = el('rect');
  const clipC = el('circle');
  const bed   = el('path', 'fil-bed');
  const water = el('path', 'fil-water');
  const deep  = el('path', 'fil-deep');
  const cur1  = el('path', 'fil-current fil-current--1');
  const cur2  = el('path', 'fil-current fil-current--2');
  const body  = el('g');
  const fx    = el('g', 'fil-fx');
  svg.setAttribute('aria-hidden', 'true');
  clip.setAttribute('id', 'fil-clip');
  clip.append(clipR, clipC);
  defs.append(clip);
  body.setAttribute('clip-path', 'url(#fil-clip)');
  body.append(bed, water, deep, cur1, cur2);
  svg.append(defs, body, fx);
  main.prepend(svg);

  const STEP   = 10;   // pas d'échantillonnage vertical (px)
  const PERIOD = 720;  // longueur d'onde du méandre (px)
  const LEAD   = 300;  // longueur des transitions marge <-> ancre (px)
  const mobile = () => window.innerWidth < 720;

  let W = 0, H = 0, marginX = 0, contentLeft = 0;
  let segs = [];                   // ligne de base x(y), par morceaux (smoothstep)
  let xs = [], ws = [];            // centre et largeur, échantillonnés tous les STEP px
  let tip = 0, tipTarget = 0;      // front de la rivière (y, coordonnées <main>)
  let running = false, lastT = 0, lastRipple = 0;
  const drops = [];

  const mainTop = () => main.getBoundingClientRect().top + window.scrollY;
  const smooth  = t => t * t * (3 - 2 * t);
  // largeur de la rivière à la hauteur y : un filet en haut, une nappe en bas
  const widthAt = y => {
    const t = Math.min(1, Math.max(0, y / Math.max(1, H)));
    return mobile() ? 4 + 8 * t : 7 + 19 * Math.pow(t, 0.9);
  };

  /* ---------- ligne de base : la marge, puis les ancres ---------- */
  const buildBase = () => {
    W = main.clientWidth;
    H = main.offsetHeight;
    const header = document.querySelector('.site-header');
    const gutter = header ? parseFloat(getComputedStyle(header).paddingLeft) || 24 : 24;
    const container = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--container')) || 1440;
    contentLeft = Math.max(0, (W - container) / 2) + gutter;
    marginX = mobile() ? 6 : Math.max(0, (W - container) / 2) + gutter * 0.6;

    const top0 = mainTop();
    const anchors = [];
    main.querySelectorAll('[data-fil]').forEach(node => {
      const r = node.getBoundingClientRect();
      if (r.height < 40) return;
      const y0 = r.top + window.scrollY - top0, y1 = r.bottom + window.scrollY - top0;
      const w = widthAt((y0 + y1) / 2), half = w / 2;
      const clear = 22 + 4 + w * 0.22; // 22 px + l'amplitude du méandre (voir regen)
      const x = node.dataset.fil === 'left' ? r.left - clear - half : r.right + clear + half;
      if (x - half < 8 || x + half > W - 8) return; // déborderait de l'écran : reste en marge
      anchors.push({ x, y0, y1 });
    });
    anchors.sort((a, b) => a.y0 - b.y0);

    segs = [];
    let curX = null, curY = 0; // null : en marge (position résolue selon la largeur, voir marginAt)
    anchors.forEach((a, i) => {
      if (a.y0 <= curY) return;
      const lead = Math.min(LEAD, a.y0 - curY);
      if (a.y0 - lead > curY) segs.push({ y0: curY, y1: a.y0 - lead, x0: curX, x1: curX });
      segs.push({ y0: a.y0 - lead, y1: a.y0, x0: curX, x1: a.x });
      segs.push({ y0: a.y0, y1: a.y1, x0: a.x, x1: a.x });
      curX = a.x; curY = a.y1;
      // retour en marge, sauf si l'ancre suivante est proche (on y va directement)
      const next = anchors[i + 1];
      const room = (next ? next.y0 : H) - curY;
      if (room > LEAD * 2 || !next) {
        const len = Math.min(LEAD, room);
        segs.push({ y0: curY, y1: curY + len, x0: curX, x1: null });
        curX = null; curY += len;
      }
    });
    if (curY < H) segs.push({ y0: curY, y1: H, x0: curX, x1: null });
  };

  // en marge : la rive droite ne mord jamais plus de 24 px sous le contenu ;
  // quand la rivière s'élargit, c'est vers la gauche qu'elle prend sa place
  const marginAt = y => Math.min(marginX, contentLeft + 24 - widthAt(y) / 2);
  const baseX = y => {
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      if (y <= s.y1 || i === segs.length - 1) {
        const x0 = s.x0 === null ? marginAt(y) : s.x0;
        const x1 = s.x1 === null ? marginAt(y) : s.x1;
        if (x0 === x1 || s.y1 === s.y0) return x1;
        const t = Math.min(1, Math.max(0, (y - s.y0) / (s.y1 - s.y0)));
        return x0 + (x1 - x0) * smooth(t);
      }
    }
    return marginAt(y);
  };

  /* ---------- le tracé : lit, nappe, courant ---------- */
  const regen = () => {
    const n = Math.floor(H / STEP);
    xs = new Array(n + 1); ws = new Array(n + 1);
    for (let i = 0; i <= n; i++) {
      const y = Math.min(i * STEP, H);
      const w = widthAt(y);
      const amp = 4 + w * 0.22;                         // la nappe large méandre plus
      const taper = Math.min(1, y / 120, (H - y) / 120); // départ et arrivée nets
      xs[i] = baseX(y) + amp * Math.sin((y / PERIOD) * Math.PI * 2) * taper;
      ws[i] = w;
    }
    const band = k => {
      let left = '', right = '';
      for (let i = 0; i <= n; i++) {
        const y = Math.min(i * STEP, H), h = ws[i] * k / 2;
        left  += `${i ? ' L' : 'M'} ${(xs[i] - h).toFixed(1)} ${y}`;
        right  = ` L ${(xs[i] + h).toFixed(1)} ${y}` + right;
      }
      return left + right + ' Z';
    };
    const line = k => {
      let d = '';
      for (let i = 0; i <= n; i++) d += `${i ? ' L' : 'M'} ${(xs[i] + ws[i] * k).toFixed(1)} ${Math.min(i * STEP, H)}`;
      return d;
    };
    bed.setAttribute('d', band(2.4)); // le halo, comme sur la carte
    water.setAttribute('d', band(1));
    deep.setAttribute('d', band(0.42));
    cur1.setAttribute('d', line(-0.22));
    cur2.setAttribute('d', line(0.18));
  };

  const xAt = y => {
    const i = Math.min(xs.length - 2, Math.max(0, Math.floor(y / STEP)));
    const t = Math.min(1, Math.max(0, (y - i * STEP) / STEP));
    return xs[i] + (xs[i + 1] - xs[i]) * t;
  };
  const wAt = y => widthAt(y);

  /* ---------- le front : un peu en avance sur la lecture ---------- */
  const computeTip = () => {
    if (reduceMotion) return H;
    const top = main.getBoundingClientRect().top;
    let t = window.innerHeight * 0.6 - top;
    // en fin de document, le front accélère pour atteindre le bas de <main>
    // exactement quand le scroll s'arrête
    const remaining = Math.max(0, document.documentElement.scrollHeight - window.innerHeight - window.scrollY);
    const closing = Math.max(0, 1 - remaining / (window.innerHeight * 0.5));
    t += closing * Math.max(0, H - t);
    return Math.min(H, Math.max(0, t));
  };
  const paint = () => {
    const y = Math.min(H, Math.max(0, tip));
    clipR.setAttribute('height', y.toFixed(1));
    clipC.setAttribute('cx', xAt(y).toFixed(1));
    clipC.setAttribute('cy', y.toFixed(1));
    clipC.setAttribute('r', (wAt(y) * 0.85).toFixed(1)); // front arrondi, comme une nappe qui avance
    svg.classList.toggle('is-complete', y >= H - 1);
  };

  /* ---------- boucle d'animation, seulement quand quelque chose bouge ---------- */
  const frame = now => {
    const dt = Math.min(0.05, (now - lastT) / 1000) || 0.016;
    lastT = now;
    tip += (tipTarget - tip) * Math.min(1, dt * 6);
    paint();
    for (let i = drops.length - 1; i >= 0; i--) {
      const dr = drops[i];
      dr.v += 1500 * dt;
      dr.y += dr.v * dt;
      if (dr.y >= dr.yEnd) {
        ripple(xAt(dr.yEnd) + dr.dx, dr.yEnd, 1);
        dr.el.remove();
        drops.splice(i, 1);
      } else {
        dr.el.setAttribute('cx', (xAt(dr.y) + dr.dx).toFixed(1));
        dr.el.setAttribute('cy', dr.y.toFixed(1));
      }
    }
    if (Math.abs(tipTarget - tip) > 0.4 || drops.length) requestAnimationFrame(frame); else running = false;
  };
  const wake = () => {
    if (running) return;
    running = true;
    lastT = performance.now();
    requestAnimationFrame(frame);
  };

  /* ---------- ondes et gouttes ---------- */
  const ripple = (x, y, scale) => {
    for (let k = 0; k < 2; k++) {
      const c = el('circle', 'fil-ripple');
      c.setAttribute('cx', x.toFixed(1)); c.setAttribute('cy', y.toFixed(1));
      c.setAttribute('r', ((14 + k * 9) * scale).toFixed(1));
      c.style.animationDelay = `${k * 0.16}s`;
      fx.append(c);
      c.addEventListener('animationend', () => c.remove(), { once: true });
    }
  };
  const spawnDrop = () => {
    if (document.hidden || !xs.length) return;
    const yStart = window.scrollY - mainTop() + 6;
    const yEnd = Math.min(tip, H - 6, yStart + window.innerHeight * 0.55);
    if (yEnd - yStart < 200 || yStart < 0) return;
    const c = el('circle', 'fil-drop');
    c.setAttribute('r', '3');
    fx.append(c);
    drops.push({ el: c, y: yStart, yEnd, v: 80, dx: (Math.random() - 0.5) * wAt(yEnd) * 0.6 });
    wake();
  };
  const scheduleDrop = () => setTimeout(() => { spawnDrop(); scheduleDrop(); }, 8000 + Math.random() * 8000);

  /* ---------- construction, événements ---------- */
  const build = () => {
    buildBase();
    if (!H) return;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    clipR.setAttribute('x', 0); clipR.setAttribute('y', 0); clipR.setAttribute('width', W);
    regen();
    tipTarget = computeTip();
    if (reduceMotion || !running) tip = tipTarget;
    paint();
  };

  if ('ResizeObserver' in window) {
    new ResizeObserver(build).observe(main); // appelé une première fois à l'observation
  } else {
    build();
    window.addEventListener('resize', build);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);

  if (reduceMotion) return;

  // le courant accompagne le scroll : proportionnel à la distance, pas à la vitesse
  let flow = 0, lastScroll = window.scrollY;
  window.addEventListener('scroll', () => {
    flow += (window.scrollY - lastScroll) * 0.35;
    lastScroll = window.scrollY;
    svg.style.setProperty('--fil-scroll', flow.toFixed(1));
    tipTarget = computeTip();
    wake();
  }, { passive: true });

  // le curseur qui traverse l'eau y fait des ondes (au plus une tous les 140 ms)
  if (finePointer) {
    document.addEventListener('mousemove', e => {
      if (!xs.length) return;
      const now = performance.now();
      if (now - lastRipple < 140) return;
      const y = e.clientY - main.getBoundingClientRect().top;
      if (y < 0 || y > tip) return;
      const dx = e.clientX - xAt(y);
      if (Math.abs(dx) > wAt(y) / 2 + 6) return;
      lastRipple = now;
      ripple(e.clientX, y, 0.7);
    }, { passive: true });
  }

  scheduleDrop();
})();
