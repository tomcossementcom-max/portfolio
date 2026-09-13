/* ==========================================================================
   LA CARTE DU REGARD (regard.html)
   Les photos posées là où elles ont été prises, sur une carte de l'Europe
   de l'Ouest et du Maroc (côtes et fleuves Natural Earth, js/regard-data.js ;
   1 unité = 1 km). Une photo rejoint la carte quand sa <figure class="photo">
   porte data-place="amsterdam|porto|rovinj|essaouira|…" — un lieu connu de
   RegardData.places. Cliquer une vignette ouvre la photo en plein écran
   (la visionneuse de js/lightbox.js). Liège, d'où tout part, est marqué.
   Sans script : la grille de photos, simplement.
   ========================================================================== */
(() => {
  const host = document.querySelector('.regard-map');
  const data = window.RegardData;
  if (!host || !data) return;
  const NS = 'http://www.w3.org/2000/svg';
  const NAMES = { liege: 'Liège', amsterdam: 'Amsterdam', porto: 'Porto', rovinj: 'Rovinj', essaouira: 'Essaouira', 'arc-et-senans': 'Arc-et-Senans' };

  /* la carte : côtes et fleuves */
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'regard-svg');
  svg.setAttribute('viewBox', `0 0 ${data.w} ${data.h}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('aria-hidden', 'true');
  const mk = (cls, d) => { const p = document.createElementNS(NS, 'path'); p.setAttribute('class', cls); p.setAttribute('d', d); p.setAttribute('vector-effect', 'non-scaling-stroke'); return p; };
  svg.append(mk('regard-coast', data.coast), mk('regard-river', data.rivers));
  host.prepend(svg);
  host.style.aspectRatio = `${data.w} / ${data.h}`;

  const pct = key => {
    const p = data.places[key]; if (!p) return null;
    return { x: (p[0] / data.w * 100).toFixed(2), y: (p[1] / data.h * 100).toFixed(2) };
  };

  /* Liège : le point de départ */
  const home = pct('liege');
  if (home) {
    const el = document.createElement('span');
    el.className = 'regard-home';
    el.style.setProperty('--x', home.x + '%'); el.style.setProperty('--y', home.y + '%');
    el.innerHTML = '<i></i><b>Liège</b>';
    host.append(el);
  }

  /* les photos, groupées par lieu */
  const groups = new Map();
  document.querySelectorAll('.photo[data-place]').forEach(fig => {
    const key = fig.dataset.place;
    if (!data.places[key]) return;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(fig);
  });
  groups.forEach((figs, key) => {
    const pos = pct(key);
    const g = document.createElement('div');
    g.className = 'regard-lieu';
    g.style.setProperty('--x', pos.x + '%'); g.style.setProperty('--y', pos.y + '%');
    const dot = document.createElement('i'); g.append(dot);
    figs.forEach((fig, i) => {
      const a = document.createElement('a');
      a.className = 'regard-pin';
      a.href = '#';
      a.style.setProperty('--i', i);
      const img = fig.querySelector('img');
      const pic = (fig.querySelector('picture') || img).cloneNode(true);
      const im = pic.matches('img') ? pic : pic.querySelector('img');
      pic.querySelectorAll('source').forEach(s => s.setAttribute('sizes', '96px'));
      im.setAttribute('sizes', '96px');
      ['tabindex', 'role', 'aria-label', 'style', 'class'].forEach(at => im.removeAttribute(at));
      a.setAttribute('aria-label', `Voir la photo : ${img.alt}`);
      a.append(pic);
      a.addEventListener('click', e => { e.preventDefault(); img.click(); });
      g.append(a);
    });
    const label = document.createElement('b');
    label.textContent = `${NAMES[key] || key} · ${figs.length}`;
    g.append(label);
    host.append(g);
  });
})();
