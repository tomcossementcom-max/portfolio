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
      document.querySelectorAll('main [data-reveal]').forEach(el => {
        gsap.from(el, {
          opacity: 0,
          y: 36,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            toggleActions: 'play none none reverse'
          }
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

      /* Les planches se révèlent par balayage, de haut en bas (comme le
         fil d'eau), avec un très léger recul de l'image — plutôt que le
         même fondu que le texte. Cartes de l'index et de la sélection :
         balayage seul, leur zoom au survol est géré en CSS. */
      gsap.utils.toArray('main .case-figure, main .case-plan, main .case-pair figure').forEach(fig => {
        const media = fig.querySelector('img, video');
        const tl = gsap.timeline({ scrollTrigger: { trigger: fig, start: 'top 88%' } });
        tl.fromTo(fig, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1.1, ease: 'power3.out' }, 0);
        if (media) tl.fromTo(media, { scale: 1.05 }, { scale: 1, duration: 1.5, ease: 'power2.out', clearProps: 'transform' }, 0);
      });
      gsap.utils.toArray('main .pcard-media, main .feat-media').forEach(fig => {
        gsap.fromTo(fig, { clipPath: 'inset(0 0 100% 0)' }, {
          clipPath: 'inset(0 0 0% 0)', duration: 1.1, ease: 'power3.out',
          scrollTrigger: { trigger: fig, start: 'top 88%' }
        });
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

  /* ------------------------------------------------------------ */
  /* CONTACT FORM — client-side only placeholder                   */
  /* Ce site statique n'a pas de backend. Pour un envoi réel,       */
  /* branche ce formulaire sur Formspree / Netlify Forms / EmailJS  */
  /* et remplace le bloc ci-dessous par l'envoi réseau approprié.   */
  /* ------------------------------------------------------------ */
  const form = document.getElementById('contactForm');
  const formNote = document.getElementById('formNote');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      formNote.textContent = 'Merci — ce formulaire est un gabarit statique : connecte-le à Formspree / Netlify Forms / EmailJS pour recevoir de vrais messages.';
      form.reset();
    });
  }

});
