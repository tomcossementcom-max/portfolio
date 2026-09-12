/* ==========================================================================
   LE FIL D'EAU — la signature vivante du site
   Un seul trait bleu descend chaque page. Il n'est pas décoratif au sens
   d'un motif : il se comporte comme de l'eau.
   - il SUIT LA MISE EN PAGE : dans la marge par défaut, il se glisse entre
     les cartes de l'index, entre l'image et le texte de la sélection, le
     long des blocs de texte décalés des pages projet (ancres data-fil="left|right"
     posées dans le HTML : le trait passe à 22 px du bord indiqué) ;
   - il SE DESSINE AU RYTHME DU SCROLL, sa pointe un peu en avance sur la
     lecture (~58 % de l'écran), et rejoint le bas de <main> quand on arrive
     au bout ;
   - il RÉAGIT : ses ondulations s'amplifient et se déplacent quand on scrolle
     vite, puis se calment ; sous un curseur, il se courbe pour l'éviter et
     revient en place ; de temps en temps une goutte descend le long du
     trait jusqu'à sa pointe, où elle fait une onde.
   Purement décoratif : SVG aria-hidden injecté ici, sous le contenu
   (z-index négatif, voir .fil-eau dans le CSS). Sans script, il n'existe
   pas. Sous prefers-reduced-motion : trait complet, fixe, sans gouttes.
   Désactivé par <body data-fil="off"> (page Approche, qui a sa timeline).
   ========================================================================== */
(() => {
  const main = document.querySelector('main');
  if (!main || document.body.dataset.fil === 'off') return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer  = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const NS   = 'http://www.w3.org/2000/svg';
  const svg  = document.createElementNS(NS, 'svg');
  const path = document.createElementNS(NS, 'path');
  const end  = document.createElementNS(NS, 'circle');
  const fx   = document.createElementNS(NS, 'g');
  svg.setAttribute('class', 'fil-eau');
  svg.setAttribute('aria-hidden', 'true');
  end.setAttribute('class', 'fil-eau-end');
  end.setAttribute('r', '3.5');
  svg.append(path, end, fx);
  main.prepend(svg);

  const STEP   = 10;   // pas d'échantillonnage vertical (px)
  const PERIOD = 640;  // longueur d'onde du méandre (px)
  const LEAD   = 260;  // longueur des transitions marge <-> ancre (px)

  let W = 0, H = 0, marginX = 0, amp = 9;
  let segs = [];                   // ligne de base : x(y) par morceaux (smoothstep)
  let xs = [], cum = [], total = 0; // points échantillonnés, longueurs cumulées
  let tip = 0, tipTarget = 0;       // pointe du trait (y, coordonnées <main>)
  let phase = 0, wobble = 0;        // méandre : décalage de phase, sur-amplitude
  const mouse = { x: -1e9, y: -1e9, a: 0, aTarget: 0 }; // fléchissement sous le curseur
  const drops = [];
  let running = false, lastT = 0, lastScroll = window.scrollY, lastScrollT = performance.now();

  const mainTop = () => main.getBoundingClientRect().top + window.scrollY;
  const smooth  = t => t * t * (3 - 2 * t);

  /* ---------- ligne de base : la marge, puis les ancres ---------- */
  const buildBase = () => {
    W = main.clientWidth;
    H = main.offsetHeight;
    const header = document.querySelector('.site-header');
    const gutter = header ? parseFloat(getComputedStyle(header).paddingLeft) || 24 : 24;
    const container = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--container')) || 1440;
    marginX = Math.max(0, (W - container) / 2) + gutter / 2;
    amp = W < 720 ? 5 : 9;

    const top0 = mainTop();
    const anchors = [];
    main.querySelectorAll('[data-fil]').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.height < 40) return;
      const x = el.dataset.fil === 'left' ? r.left - 22 : r.right + 22;
      if (x < 16 || x > W - 16) return; // hors écran (mobile) : le trait reste en marge
      anchors.push({ x, y0: r.top + window.scrollY - top0, y1: r.bottom + window.scrollY - top0 });
    });
    anchors.sort((a, b) => a.y0 - b.y0);

    segs = [];
    let curX = marginX, curY = 0;
    anchors.forEach((a, i) => {
      if (a.y0 <= curY) return; // chevauchement : ignoré
      const lead = Math.min(LEAD, a.y0 - curY);
      if (a.y0 - lead > curY) segs.push({ y0: curY, y1: a.y0 - lead, x0: curX, x1: curX });
      segs.push({ y0: a.y0 - lead, y1: a.y0, x0: curX, x1: a.x });
      segs.push({ y0: a.y0, y1: a.y1, x0: a.x, x1: a.x });
      curX = a.x; curY = a.y1;
      // retour en marge, sauf si l'ancre suivante est trop proche (on y va directement)
      const next = anchors[i + 1];
      const room = (next ? next.y0 : H) - curY;
      if (room > LEAD * 2 || !next) {
        const len = Math.min(LEAD, room);
        segs.push({ y0: curY, y1: curY + len, x0: curX, x1: marginX });
        curX = marginX; curY += len;
      }
    });
    if (curY < H) segs.push({ y0: curY, y1: H, x0: curX, x1: marginX });
  };

  const baseX = y => {
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      if (y <= s.y1 || i === segs.length - 1) {
        if (s.x0 === s.x1 || s.y1 === s.y0) return s.x1;
        const t = Math.min(1, Math.max(0, (y - s.y0) / (s.y1 - s.y0)));
        return s.x0 + (s.x1 - s.x0) * smooth(t);
      }
    }
    return marginX;
  };

  /* ---------- points du tracé : base + méandre + réactions ---------- */
  const regen = () => {
    const n = Math.floor(H / STEP) + 1;
    xs = new Array(n + 1); cum = new Array(n + 1);
    const A = amp + wobble;
    const sigma = 90; // largeur du fléchissement sous le curseur
    let d = '', px = 0, py = 0;
    total = 0;
    for (let i = 0; i <= n; i++) {
      const y = Math.min(i * STEP, H);
      const taper = Math.min(1, y / 80, (H - y) / 80); // départ et arrivée nets
      let x = baseX(y) + A * Math.sin((y / PERIOD) * Math.PI * 2 + phase) * taper;
      if (mouse.a) {
        const dy = y - mouse.y;
        if (Math.abs(dy) < sigma * 3) x += mouse.a * Math.exp(-(dy * dy) / (2 * sigma * sigma));
      }
      xs[i] = x;
      if (i === 0) { d = `M ${x.toFixed(1)} ${y}`; cum[0] = 0; }
      else {
        total += Math.hypot(x - px, y - py);
        cum[i] = total;
        d += ` L ${x.toFixed(1)} ${y}`;
      }
      px = x; py = y;
    }
    path.setAttribute('d', d);
    end.setAttribute('cx', xs[n].toFixed(1));
    end.setAttribute('cy', H - 4);
  };

  const xAt = y => {
    const i = Math.min(xs.length - 2, Math.max(0, Math.floor(y / STEP)));
    const t = (y - i * STEP) / STEP;
    return xs[i] + (xs[i + 1] - xs[i]) * Math.min(1, Math.max(0, t));
  };
  const lengthAt = y => {
    const i = Math.min(cum.length - 2, Math.max(0, Math.floor(y / STEP)));
    const t = (y - i * STEP) / STEP;
    return cum[i] + (cum[i + 1] - cum[i]) * Math.min(1, Math.max(0, t));
  };

  const paint = () => {
    const y = Math.min(H, Math.max(0, tip));
    path.style.strokeDasharray = `${total} ${total}`;
    path.style.strokeDashoffset = `${Math.max(0, total - lengthAt(y))}`;
    svg.classList.toggle('is-complete', y >= H - 1);
  };

  /* ---------- la pointe : un peu en avance sur la lecture ---------- */
  const computeTip = () => {
    if (reduceMotion) return H;
    const top = main.getBoundingClientRect().top;
    let t = window.innerHeight * 0.58 - top;
    // en fin de document, la pointe accélère pour atteindre le bas de <main>
    // exactement quand le scroll s'arrête (sinon elle resterait à 58 % de l'écran)
    const remaining = Math.max(0, document.documentElement.scrollHeight - window.innerHeight - window.scrollY);
    const closing = Math.max(0, 1 - remaining / (window.innerHeight * 0.5));
    t += closing * Math.max(0, H - t);
    return Math.min(H, Math.max(0, t));
  };

  /* ---------- boucle d'animation, seulement quand quelque chose bouge ---------- */
  const frame = now => {
    const dt = Math.min(0.05, (now - lastT) / 1000) || 0.016;
    lastT = now;
    tip += (tipTarget - tip) * Math.min(1, dt * 9);
    wobble *= Math.exp(-dt * 2.4);
    mouse.a += (mouse.aTarget - mouse.a) * Math.min(1, dt * 7);

    regen();
    paint();

    for (let i = drops.length - 1; i >= 0; i--) {
      const dr = drops[i];
      dr.v += 1400 * dt;
      dr.y += dr.v * dt;
      const yEnd = Math.min(tip, H - 4);
      if (dr.y >= yEnd) {
        ripple(xAt(yEnd), yEnd);
        dr.el.remove();
        drops.splice(i, 1);
      } else {
        dr.el.setAttribute('cx', xAt(dr.y).toFixed(1));
        dr.el.setAttribute('cy', dr.y.toFixed(1));
      }
    }

    const active = Math.abs(tipTarget - tip) > 0.4 || wobble > 0.2 || Math.abs(mouse.a) > 0.2 || Math.abs(mouse.aTarget) > 0.2 || drops.length;
    if (active) requestAnimationFrame(frame); else running = false;
  };
  const wake = () => {
    if (running) return;
    running = true;
    lastT = performance.now();
    requestAnimationFrame(frame);
  };

  /* ---------- gouttes et ondes ---------- */
  const ripple = (x, y) => {
    for (let k = 0; k < 2; k++) {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('class', 'fil-eau-ripple');
      c.setAttribute('cx', x.toFixed(1)); c.setAttribute('cy', y.toFixed(1)); c.setAttribute('r', 16 + k * 10);
      c.style.animationDelay = `${k * 0.18}s`;
      fx.append(c);
      c.addEventListener('animationend', () => c.remove(), { once: true });
    }
  };
  const spawnDrop = () => {
    if (document.hidden) return;
    const yStart = window.scrollY - mainTop() + 6;
    if (tip - yStart < 220 || yStart < 0) return;
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('class', 'fil-eau-drop');
    c.setAttribute('r', '3');
    fx.append(c);
    drops.push({ el: c, y: yStart, v: 90 });
    wake();
  };
  const scheduleDrop = () => {
    setTimeout(() => { spawnDrop(); scheduleDrop(); }, 9000 + Math.random() * 7000);
  };

  /* ---------- construction, événements ---------- */
  const build = () => {
    buildBase();
    if (!H) return;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    tipTarget = computeTip();
    if (reduceMotion || !running) tip = tipTarget;
    regen();
    paint();
  };

  if ('ResizeObserver' in window) {
    new ResizeObserver(build).observe(main); // appelé une première fois à l'observation
  } else {
    build();
    window.addEventListener('resize', build);
  }
  // les polices web changent la hauteur des blocs après le premier rendu
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);

  if (reduceMotion) return;

  window.addEventListener('scroll', () => {
    const now = performance.now();
    const dt = Math.max(0.008, (now - lastScrollT) / 1000);
    const v = (window.scrollY - lastScroll) / dt; // px/s, signé
    lastScroll = window.scrollY; lastScrollT = now;
    wobble = Math.max(wobble, Math.min(14, Math.abs(v) / 120));
    phase += v * 0.0012; // les ondulations se déplacent dans le sens du scroll
    tipTarget = computeTip();
    wake();
  }, { passive: true });

  if (finePointer) {
    document.addEventListener('mousemove', e => {
      if (!xs.length) return;
      mouse.x = e.clientX;
      mouse.y = e.clientY - main.getBoundingClientRect().top;
      const dx = xAt(mouse.y) - mouse.x;
      const reach = 200;
      mouse.aTarget = Math.abs(dx) < reach ? Math.sign(dx || 1) * 30 * (1 - Math.abs(dx) / reach) : 0;
      wake();
    }, { passive: true });
    document.addEventListener('mouseleave', () => { mouse.aTarget = 0; wake(); });
  }

  scheduleDrop();
})();
