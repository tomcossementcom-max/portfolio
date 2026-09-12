/* ==========================================================================
   PLANCHES — visionneuse plein écran + planche contact
   Sur une page projet, chaque image (figures pleine largeur, plans, paires)
   s'ouvre en plein écran d'un clic ; un second clic zoome à la taille réelle
   (utile pour lire un plan), flèches pour passer d'une planche à l'autre,
   Échap pour fermer. En fin de page, une « planche contact » rassemble
   toutes les images du projet en vignettes, construite ici à partir des
   figures déjà présentes (rien à dupliquer dans le HTML).
   Sans script : les images restent simplement affichées dans la page.
   ========================================================================== */
(() => {
  const main = document.querySelector('main');
  if (!main) return;
  const figures = [...main.querySelectorAll('.case-figure, .case-plan, .case-pair figure')]
    .filter(f => f.querySelector('img'));
  if (figures.length < 2) return;

  /* ---------- la visionneuse ---------- */
  const dialog = document.createElement('dialog');
  dialog.className = 'lb';
  dialog.setAttribute('aria-label', 'Planche en plein écran');
  dialog.innerHTML = `
    <button class="lb-btn lb-close" type="button" aria-label="Fermer">×</button>
    <button class="lb-btn lb-prev" type="button" aria-label="Planche précédente">←</button>
    <button class="lb-btn lb-next" type="button" aria-label="Planche suivante">→</button>
    <div class="lb-stage" title="Cliquer pour zoomer"></div>
    <div class="lb-bar"><p class="lb-caption"></p><p class="lb-count"></p></div>`;
  document.body.append(dialog);
  const stage   = dialog.querySelector('.lb-stage');
  const caption = dialog.querySelector('.lb-caption');
  const count   = dialog.querySelector('.lb-count');
  let index = 0;

  const show = i => {
    index = (i + figures.length) % figures.length;
    const fig = figures[index];
    const pic = fig.querySelector('picture') || fig.querySelector('img');
    const clone = pic.cloneNode(true);
    clone.querySelectorAll('source').forEach(s => s.setAttribute('sizes', '100vw'));
    const img = clone.matches('img') ? clone : clone.querySelector('img');
    img.removeAttribute('loading');
    img.setAttribute('sizes', '100vw');
    // le clone hérite du rôle « bouton » posé sur l'image de la page : pas ici
    img.classList.remove('lb-trigger');
    ['tabindex', 'role', 'aria-label', 'style'].forEach(a => img.removeAttribute(a)); // style : transform du balayage GSAP
    stage.replaceChildren(clone);
    dialog.classList.remove('is-zoomed');
    const cap = fig.querySelector('figcaption');
    caption.textContent = cap ? cap.textContent.trim() : (img.alt || '');
    count.textContent = `${index + 1} / ${figures.length}`;
  };
  const open = i => {
    show(i);
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
    document.body.classList.add('lb-open');
  };
  const close = () => { dialog.close(); };
  dialog.addEventListener('close', () => document.body.classList.remove('lb-open'));

  dialog.querySelector('.lb-close').addEventListener('click', close);
  dialog.querySelector('.lb-prev').addEventListener('click', () => show(index - 1));
  dialog.querySelector('.lb-next').addEventListener('click', () => show(index + 1));
  dialog.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  { e.preventDefault(); show(index - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1); }
  });
  // clic sur le fond (hors image et boutons) : fermer
  dialog.addEventListener('click', e => { if (e.target === dialog || e.target === stage) close(); });

  // zoom à la taille réelle, centré sur le point cliqué
  stage.addEventListener('click', e => {
    const img = stage.querySelector('img');
    if (!img || e.target !== img) return;
    const zoomed = dialog.classList.toggle('is-zoomed');
    if (zoomed) {
      const r = img.getBoundingClientRect();
      const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
      requestAnimationFrame(() => {
        stage.scrollLeft = fx * img.clientWidth  - stage.clientWidth  / 2;
        stage.scrollTop  = fy * img.clientHeight - stage.clientHeight / 2;
      });
    }
  });

  /* ---------- les images de la page ouvrent la visionneuse ---------- */
  figures.forEach((fig, i) => {
    const img = fig.querySelector('img');
    img.classList.add('lb-trigger');
    img.setAttribute('tabindex', '0');
    img.setAttribute('role', 'button');
    img.setAttribute('aria-label', `Voir en plein écran : ${img.alt || 'planche'}`);
    img.addEventListener('click', () => open(i));
    img.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); } });
  });

  /* ---------- la planche contact, en fin de page ---------- */
  const nav = main.querySelector('.case-nav');
  if (!nav) return;
  const sheet = document.createElement('section');
  sheet.className = 'case-sheet';
  sheet.setAttribute('aria-label', 'Toutes les planches du projet');
  sheet.innerHTML = `<div class="case-sheet-head"><h2>Toutes les planches</h2><span>${figures.length} images — cliquer pour agrandir</span></div><div class="case-sheet-grid"></div>`;
  const grid = sheet.querySelector('.case-sheet-grid');
  figures.forEach((fig, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sheet-item';
    const pic = (fig.querySelector('picture') || fig.querySelector('img')).cloneNode(true);
    pic.querySelectorAll('source').forEach(s => s.setAttribute('sizes', '(max-width: 720px) 46vw, 22vw'));
    const img = pic.matches('img') ? pic : pic.querySelector('img');
    img.classList.remove('lb-trigger');
    ['tabindex', 'role', 'aria-label', 'style'].forEach(a => img.removeAttribute(a));
    img.setAttribute('loading', 'lazy');
    img.setAttribute('sizes', '(max-width: 720px) 46vw, 22vw');
    const cap = fig.querySelector('figcaption');
    btn.setAttribute('aria-label', `Agrandir : ${cap ? cap.textContent.trim() : img.alt}`);
    btn.append(pic);
    const label = document.createElement('span');
    label.className = 'sheet-num';
    label.textContent = String(i + 1).padStart(2, '0');
    btn.append(label);
    btn.addEventListener('click', () => open(i));
    grid.append(btn);
  });
  nav.before(sheet);
})();
