/* ==========================================================================
   THOMAS COSSEMENT — PORTFOLIO
   Interactions & animations GSAP / ScrollTrigger — site multi-pages
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  const header    = document.getElementById('siteHeader');
  const navToggle = document.getElementById('navToggle');
  const mainNav   = document.getElementById('mainNav');
  const yearEl    = document.getElementById('year');
  const hero      = document.querySelector('.hero');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ------------------------------------------------------------ */
  /* TRANSITIONS DE PAGE — fondu de sortie avant de quitter la page */
  /* vers un lien interne, pour un parcours plus continu. La page   */
  /* reste visible par défaut (voir commentaire CSS) : aucun risque */
  /* d'écran vide si ce script est lent ou ne s'exécute pas.        */
  /* Se désactive complètement sous prefers-reduced-motion.         */
  /* ------------------------------------------------------------ */
  if (!reduceMotion) {
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
  /* HEADER — transparent/light text while over the hero video     */
  /* (accueil uniquement) ; solid + dark text everywhere else       */
  /* ------------------------------------------------------------ */
  const toggleHeaderState = () => {
    if (!hero) return; // pages without a hero keep the default solid header
    const heroHeight = hero.offsetHeight;
    header.classList.toggle('on-hero', window.scrollY < heroHeight - 80);
  };
  if (hero) {
    toggleHeaderState();
    window.addEventListener('scroll', toggleHeaderState, { passive: true });
  }

  /* ------------------------------------------------------------ */
  /* CURRENT-PAGE NAV HIGHLIGHT                                    */
  /* ------------------------------------------------------------ */
  const currentPath = location.pathname.split('/').pop() || 'index.html';
  // les pages projet (body.page-xxx) relèvent de l'entrée "Projets"
  const isProjectPage = /(^|\s)page-\w+(\s|$)/.test(document.body.className);
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
      /* Hero intro — fade + rise, staggered lines (only on pages with a hero) */
      if (hero) {
        gsap.timeline({ defaults: { ease: 'power3.out' } })
          .from('.hero-eyebrow', { opacity: 0, y: 24, duration: 0.9, delay: 0.3 })
          .from('.hero-title .line', { opacity: 0, y: 40, duration: 1, stagger: 0.12 }, '-=0.5')
          .from('.hero-subtitle', { opacity: 0, y: 24, duration: 0.9 }, '-=0.5')
          .from('.hero-footer', { opacity: 0, y: 24, duration: 0.9 }, '-=0.4');
      }

      /* Generic fade-in-up reveal for every [data-reveal] element below the fold */
      document.querySelectorAll('main [data-reveal]').forEach(el => {
        if (el.closest('.hero')) return; // hero handled by the intro timeline above
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
    } else {
      document.querySelectorAll('[data-reveal]').forEach(el => {
        el.style.opacity = 1;
        el.style.transform = 'none';
      });
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
