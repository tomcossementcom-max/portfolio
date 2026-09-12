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
  if (navToggle && mainNav) {
    navToggle.addEventListener('click', () => {
      const isOpen = mainNav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', isOpen);
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

  /* ------------------------------------------------------------ */
  /* FIL D'EAU — un trait bleu qui descend la marge gauche de la    */
  /* page en méandre et se dessine au fil du scroll, sa pointe un   */
  /* peu en avance sur la lecture (~58 % de l'écran). Purement      */
  /* décoratif : injecté ici, aria-hidden, sous le contenu (voir    */
  /* .fil-eau dans le CSS). Le tracé est régénéré quand la hauteur  */
  /* de la page change (images lazy, redimensionnement). Sous       */
  /* prefers-reduced-motion, le trait est dessiné en entier, fixe.  */
  /* Désactivé par <body data-fil="off"> (page Approche).           */
  /* ------------------------------------------------------------ */
  const main = document.querySelector('main');
  if (main && document.body.dataset.fil !== 'off') {
    const NS = 'http://www.w3.org/2000/svg';
    const svg  = document.createElementNS(NS, 'svg');
    const path = document.createElementNS(NS, 'path');
    const dot  = document.createElementNS(NS, 'circle');
    svg.setAttribute('class', 'fil-eau');
    svg.setAttribute('aria-hidden', 'true');
    dot.setAttribute('r', '3.5');
    svg.append(path, dot);
    main.prepend(svg);

    const W = 24, CX = W / 2;
    let length = 0, height = 0;

    const draw = () => {
      if (!length) return;
      if (reduceMotion) {
        path.style.strokeDashoffset = '0';
        svg.classList.add('is-complete');
        return;
      }
      const top = main.getBoundingClientRect().top;
      let tip = window.innerHeight * 0.58 - top;
      // en approchant de la fin du document, la pointe accélère pour
      // atteindre le bas de <main> exactement quand le scroll s'arrête
      // (sinon elle s'arrêterait à 58 % de l'écran, au-dessus du footer)
      const remaining = Math.max(0, document.documentElement.scrollHeight - window.innerHeight - window.scrollY);
      const closing = Math.max(0, 1 - remaining / (window.innerHeight * 0.5));
      tip += closing * Math.max(0, height - tip);
      const ratio = Math.min(1, Math.max(0, tip / height));
      path.style.strokeDashoffset = `${length * (1 - ratio)}`;
      svg.classList.toggle('is-complete', ratio > 0.995);
    };

    // méandre doux : une suite de courbes en S, ±amp px autour de l'axe,
    // qui revient au centre en bas de page pour finir sur le point
    const build = () => {
      height = main.offsetHeight;
      if (!height) return;
      const amp  = window.innerWidth < 720 ? 5 : 9;
      const half = 300; // demi-longueur d'onde (px)
      let d = `M ${CX} 0`, x = CX, y = 0, side = 1;
      while (y < height) {
        const y2 = Math.min(y + half, height);
        const x2 = y2 === height ? CX : CX + side * amp;
        const ym = ((y + y2) / 2).toFixed(1);
        d += ` C ${x} ${ym}, ${x2} ${ym}, ${x2} ${y2.toFixed(1)}`;
        x = x2; y = y2; side = -side;
      }
      svg.setAttribute('viewBox', `0 0 ${W} ${height}`);
      svg.setAttribute('width', W);
      svg.setAttribute('height', height);
      path.setAttribute('d', d);
      dot.setAttribute('cx', CX);
      dot.setAttribute('cy', height - 4);
      length = path.getTotalLength();
      path.style.strokeDasharray = `${length}`;
      draw();
    };

    if ('ResizeObserver' in window) {
      new ResizeObserver(build).observe(main); // appelé une première fois à l'observation
    } else {
      build();
      window.addEventListener('resize', build);
    }
    if (!reduceMotion) {
      let ticking = false;
      window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => { draw(); ticking = false; });
      }, { passive: true });
    }
  }

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
