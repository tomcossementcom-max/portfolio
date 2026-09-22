/* ==========================================================================
   THOMAS COSSEMENT — PORTFOLIO
   Interactions & animations GSAP / ScrollTrigger — site multi-pages
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  const navToggle = document.getElementById('navToggle');
  const mainNav   = document.getElementById('mainNav');
  const yearEl    = document.getElementById('year');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ------------------------------------------------------------ */
  /* TRANSITIONS DE PAGE — fondu de sortie avant de quitter la page */
  /* vers un lien interne, pour un parcours plus continu. La page   */
  /* reste visible par défaut (voir commentaire CSS) : aucun risque */
  /* d'écran vide si ce script est lent ou ne s'exécute pas.        */
  /* Se désactive sous prefers-reduced-motion, et là où le           */
  /* navigateur anime lui-même la navigation (View Transitions API, */
  /* voir le CSS) : le fondu JS viderait la page avant la capture.  */
  /* ------------------------------------------------------------ */
  const nativeTransitions = 'onpageswap' in window;
  if (!reduceMotion && !nativeTransitions) {
    const FADE_MS = 350;
    document.addEventListener('click', e => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = e.target.closest('a[href]');
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return;

      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin) return; // liens externes : comportement natif
      if (url.pathname === location.pathname && url.hash) return; // ancre sur la même page : géré par le smooth-scroll ci-dessous

      e.preventDefault();
      document.body.classList.add('is-leaving');
      setTimeout(() => { location.href = link.href; }, FADE_MS);
    });
  }

  /* ------------------------------------------------------------ */
  /* RETOUR À LA CARTE — la pastille d'une couverture de projet     */
  /* mémorise son site : la carte de l'accueil arrive alors zoomée  */
  /* dessus et s'éloigne (voir js/carte.js).                        */
  /* ------------------------------------------------------------ */
  document.querySelectorAll('[data-carte-site]').forEach(a => {
    a.addEventListener('click', () => {
      try { sessionStorage.setItem('carte-site', a.dataset.carteSite); sessionStorage.setItem('carte-via', 'pin'); } catch (_) {}
    });
  });

  /* ------------------------------------------------------------ */
  /* CARTE DES VISITES — survoler un lieu éclaire les fiches qui    */
  /* s'y rapportent (et inversement), via data-place.               */
  /* ------------------------------------------------------------ */
  const lieux = [...document.querySelectorAll('.lieu[data-place]')];
  const fiches = [...document.querySelectorAll('.visit-item[data-place]')];
  if (lieux.length && fiches.length) {
    const places = el => el.dataset.place.split(/\s+/);
    const light = (keys, on) => {
      lieux.forEach(l => l.classList.toggle('is-lit', on && places(l).some(k => keys.includes(k))));
      fiches.forEach(f => f.classList.toggle('is-lit', on && places(f).some(k => keys.includes(k))));
    };
    [...lieux, ...fiches].forEach(el => {
      el.addEventListener('mouseenter', () => light(places(el), true));
      el.addEventListener('mouseleave', () => light([], false));
      el.addEventListener('focusin', () => light(places(el), true));
      el.addEventListener('focusout', () => light([], false));
    });
  }

  /* ------------------------------------------------------------ */
  /* CURRENT-PAGE NAV HIGHLIGHT                                    */
  /* ------------------------------------------------------------ */
  const currentPath = location.pathname.split('/').pop() || 'index.html';
  // les pages projet (body.page-xxx) relèvent de l'entrée "Projets"
  const isProjectPage = /(^|\s)page-(palimpseste|morpho|confluant|haccourt)(\s|$)/.test(document.body.className);
  document.querySelectorAll('.nav-link').forEach(link => {
    const linkPath = link.getAttribute('href').split('#')[0] || 'index.html';
    if (linkPath === currentPath || (isProjectPage && linkPath === 'projets.html')) link.classList.add('is-current');
  });

  /* ------------------------------------------------------------ */
  /* MOBILE NAV                                                    */
  /* ------------------------------------------------------------ */
  /* la carte du territoire dans le menu, dessinée à la première ouverture
     (relief + rivières par js/relief.js, les quatre projets en pastilles) */
  const SITES = [
    ['01', 'palimpseste.html', 1026, 655, 'Le Jardin du Palimpseste', 'palimpseste', true],
    ['02', 'morpho.html', 1235, 845, 'Effet Morpho — Arc-et-Senans, hors carte', 'morpho', true],
    ['03', 'confluant.html', 361, 563, 'Confluant', 'confluant', false],
    ['04', 'haccourt.html', 1107, 463, 'Place bioclimatique', 'haccourt', true],
  ];
  const buildNavCarte = () => {
    if (!mainNav || mainNav.querySelector('.nav-carte') || !window.Relief) return;
    const base = document.body.dataset.root || '';
    const wrap = document.createElement('div');
    wrap.className = 'nav-carte';
    const map = document.createElement('div');
    map.className = 'nav-carte-map';
    wrap.append(map);
    Relief.mount(map, { x: 0, y: 0, w: 1400, h: 1000, cell: 10, riverScale: 0.5 });
    SITES.forEach(([num, href, x, y, title, ink, left]) => {
      const a = document.createElement('a');
      a.className = 'menu-site' + (left ? ' menu-site--left' : '');
      a.href = base + href;
      a.setAttribute('data-title', title);
      a.setAttribute('aria-label', `${num} — ${title}`);
      a.style.setProperty('--x', `${(x / 14).toFixed(1)}%`);
      a.style.setProperty('--y', `${(y / 10).toFixed(1)}%`);
      a.style.setProperty('--ink', `var(--accent-${ink})`);
      a.textContent = num;
      map.append(a);
    });
    const foot = document.createElement('div');
    foot.className = 'nav-carte-foot';
    foot.innerHTML = `<span>Les quatre projets, sur le territoire</span><a href="${base}index.html">Ouvrir la carte →</a>`;
    wrap.append(foot);
    mainNav.append(wrap);
  };

  if (navToggle && mainNav) {
    navToggle.addEventListener('click', () => {
      const isOpen = mainNav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', isOpen);
      navToggle.setAttribute('aria-label', isOpen ? 'Fermer le menu' : 'Ouvrir le menu');
      document.body.classList.toggle('menu-open', isOpen);
      if (isOpen) buildNavCarte();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && mainNav.classList.contains('is-open')) navToggle.click();
    });
    mainNav.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        mainNav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ------------------------------------------------------------ */
  /* GSAP ANIMATIONS                                               */
  /* ------------------------------------------------------------ */
  if (window.gsap) {
    gsap.registerPlugin(ScrollTrigger);

    if (!reduceMotion) {
      /* Generic fade-in-up reveal for every [data-reveal] element */
      /* le texte aussi suit le défilement : il se lève et apparaît à mesure
         qu'il entre dans l'écran (du bas jusqu'à 72 %), sans à-coup */
      document.querySelectorAll('main [data-reveal]').forEach(el => {
        gsap.fromTo(el, { opacity: 0, y: 30 }, {
          opacity: 1, y: 0, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top 97%', end: 'top 72%', scrub: 0.3 }
        });
      });

      /* Staggered reveal for grouped items (tags) — pas les cartes de la
         grille de projets : elles ont chacune leur data-reveal, et deux
         tweens "from" sur le même élément se disputent l'opacité. */
      gsap.utils.toArray('.project-tags').forEach(list => {
        gsap.from(list.children, {
          opacity: 0,
          y: 16,
          duration: 0.6,
          stagger: 0.08,
          ease: 'power2.out',
          scrollTrigger: { trigger: list, start: 'top 88%' }
        });
      });

      /* Le grand numéro de couverture dérive plus lentement que le scroll
         et se dissout quand l'image arrive : un peu de profondeur, et la
         couverture cède la place au projet lui-même. */
      const coverNum = document.querySelector('.case-cover-num');
      if (coverNum) {
        gsap.to(coverNum, {
          yPercent: 28,
          opacity: 0,
          ease: 'none',
          scrollTrigger: { trigger: '.case-cover', start: 'top top', end: 'bottom top', scrub: 0.4 }
        });
      }

      /* Les planches se révèlent par balayage, de haut en bas (comme la
         rivière), LIÉ AU DÉFILEMENT : la planche se découvre à mesure qu'elle
         monte dans l'écran, du bas jusqu'au milieu — le même tempo que la
         carte de l'accueil. Léger recul de l'image pendant le balayage. */
      gsap.utils.toArray('main .case-figure, main .case-plan, main .case-pair figure, main .pcard-media, main .photo').forEach(fig => {
        const media = fig.querySelector('img, video');
        const tl = gsap.timeline({
          scrollTrigger: { trigger: fig, start: 'top 96%', end: 'top 55%', scrub: 0.4 }
        });
        tl.fromTo(fig, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', ease: 'none' }, 0);
        if (media && !fig.classList.contains('pcard-media')) {
          tl.fromTo(media, { scale: 1.05 }, { scale: 1, ease: 'none' }, 0);
        }
      });

      /* LES CALQUES ([data-strates]) : la scène est collée, les calques se
         succèdent en fondu au fil du défilement, la liste suit. */
      document.querySelectorAll('[data-strates]').forEach(section => {
        const layers = [...section.querySelectorAll('.strate')];
        const items = [...section.querySelectorAll('.strates-list li')];
        if (layers.length < 2) return;
        const n = layers.length;
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: section, start: 'top top', end: 'bottom bottom', scrub: 0.5,
            onUpdate: st => {
              const i = Math.min(n - 1, Math.floor(st.progress * n * 0.999));
              items.forEach((li, k) => li.classList.toggle('is-active', k === i));
            }
          }
        });
        // chaque calque arrive en fondu sur le précédent, sur une fraction de la course
        for (let i = 1; i < n; i++) {
          const at = (i / n) - 0.06;
          tl.fromTo(layers[i], { opacity: 0 }, { opacity: 1, duration: 0.12 }, at);
          tl.to(layers[i - 1], { opacity: 0, duration: 0.12 }, at + 0.06);
        }
        if (items[0]) items[0].classList.add('is-active');
      });
    } else {
      document.querySelectorAll('[data-reveal]').forEach(el => {
        el.style.opacity = 1;
        el.style.transform = 'none';
      });
    }
  }

  /* Le fil d'eau (trait bleu vivant) vit dans js/fil-eau.js. */

  /* ------------------------------------------------------------ */
  /* CONTACT OBFUSQUÉ — décode l'e-mail/tél (base64) et construit   */
  /* un vrai lien mailto:/tel: fonctionnel. Voir le commentaire     */
  /* dans about.html pour le pourquoi (limiter le moissonnage).     */
  /* ------------------------------------------------------------ */
  document.querySelectorAll('.js-obfuscated-link').forEach(link => {
    try {
      const value = atob(link.dataset.encoded);
      if (link.dataset.type === 'email') {
        link.href = `mailto:${value}`;
        link.textContent = value;
      } else if (link.dataset.type === 'tel') {
        const displayValue = link.dataset.displayEncoded ? atob(link.dataset.displayEncoded) : value;
        link.href = `tel:${value}`;
        link.textContent = displayValue;
      }
      link.classList.remove('js-obfuscated-link');
    } catch (err) {
      // décodage impossible : le lien reste tel quel plutôt que de planter le script
    }
  });

  /* ------------------------------------------------------------ */
  /* SMOOTH SCROLL for in-page anchors                              */
  /* ------------------------------------------------------------ */
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const targetId = link.getAttribute('href');
      if (targetId.length < 2) return;
      const target = document.querySelector(targetId);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

});
