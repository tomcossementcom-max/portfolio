/* ==========================================================================
   PAGE APPROCHE — scrollytelling en Vanilla JS pur (Intersection Observer).
   Aucune dépendance externe : ce fichier ne charge rien d'autre que lui-même.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const steps = document.querySelectorAll('.timeline-step');

  // Optimisation : une fois qu'une étape est révélée, elle sort de cette
  // liste — le filet de sécurité plus bas (updateRevealFallback) peut alors
  // sauter entièrement son test de position dès que la liste est vide,
  // au lieu de recalculer un getBoundingClientRect() pour chaque étape à
  // chaque frame de scroll (les 4 étapes sont normalement toutes révélées
  // tôt dans le défilement de la page).
  let remainingSteps = Array.from(steps);
  const revealStep = (step) => {
    step.classList.add('is-visible');
    const idx = remainingSteps.indexOf(step);
    if (idx !== -1) remainingSteps.splice(idx, 1);
  };

  if (reduceMotion) {
    steps.forEach(revealStep);
  } else {
    /* ------------------------------------------------------------ */
    /* TIMELINE — chaque étape apparaît (fade + slide) à son tour,   */
    /* déclenchée par IntersectionObserver.                          */
    /* Filet de sécurité : certains contextes (anciens navigateurs,  */
    /* webviews, onglets d'arrière-plan qui ne composent jamais de   */
    /* frame) ne déclenchent jamais l'observer — on vérifie donc      */
    /* aussi, dans la même boucle de scroll qui pilote déjà la ligne  */
    /* et la parallaxe plus bas, la position réelle de chaque étape   */
    /* et on la révèle nous-mêmes si besoin. Ainsi le contenu n'est   */
    /* jamais bloqué en opacité 0 quel que soit le navigateur.        */
    /* ------------------------------------------------------------ */
    if ('IntersectionObserver' in window) {
      const stepObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            revealStep(entry.target);
            stepObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.3, rootMargin: '0px 0px -10% 0px' });

      steps.forEach(step => stepObserver.observe(step));
    } else {
      steps.forEach(revealStep); // pas d'IntersectionObserver du tout : on affiche direct
    }
  }

  /* ------------------------------------------------------------ */
  /* LIGNE DE TIMELINE — se remplit selon la progression du scroll */
  /* + PARALLAXE — chaque colonne image dérive légèrement à une     */
  /* vitesse différente du texte pendant le scroll (data-parallax). */
  /* + FILET DE SÉCURITÉ pour la révélation des étapes (voir plus   */
  /* haut). Les trois effets partagent la même boucle rAF.          */
  /* ------------------------------------------------------------ */
  const timeline = document.getElementById('timeline');
  const fill = document.getElementById('timelineFill');
  const parallaxEls = document.querySelectorAll('.timeline-media[data-parallax]');
  const PARALLAX_FACTOR = 0.08; // "légèrement différente" : effet volontairement discret
  const PARALLAX_MAX = 26; // px

  if (timeline && fill && !reduceMotion) {
    let ticking = false;

    const updateFill = () => {
      const rect = timeline.getBoundingClientRect();
      const viewportH = window.innerHeight;
      // La ligne commence à se remplir quand le haut de la timeline atteint
      // le tiers supérieur de l'écran, et termine quand son bas l'atteint.
      const start = viewportH * 0.35;
      const total = rect.height + viewportH * 0.3;
      const progressed = start - rect.top;
      const progress = Math.max(0, Math.min(1, progressed / total));
      fill.style.height = (progress * 100) + '%';
    };

    const updateParallax = () => {
      if (window.innerWidth <= 860) return; // colonne unique sur mobile : pas de parallaxe
      const viewportCenter = window.innerHeight / 2;
      parallaxEls.forEach(el => {
        const inner = el.querySelector('.timeline-media-inner');
        if (!inner) return;
        const rect = el.getBoundingClientRect();
        const elCenter = rect.top + rect.height / 2;
        const offset = Math.max(-PARALLAX_MAX, Math.min(PARALLAX_MAX, (viewportCenter - elCenter) * PARALLAX_FACTOR));
        // .timeline-media-inner est positionné à top:-30px (voir CSS) : on part de
        // là et on ajoute le décalage de parallaxe par-dessus.
        inner.style.transform = `translateY(${offset.toFixed(1)}px)`;
      });
    };

    const updateRevealFallback = () => {
      if (!remainingSteps.length) return; // tout est déjà révélé : rien à mesurer
      const viewportH = window.innerHeight;
      remainingSteps.slice().forEach(step => {
        const rect = step.getBoundingClientRect();
        if (rect.top < viewportH * 0.85 && rect.bottom > 0) revealStep(step);
      });
    };

    const update = () => {
      updateFill();
      updateParallax();
      updateRevealFallback();
      ticking = false;
    };

    const requestTick = () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };

    window.addEventListener('scroll', requestTick, { passive: true });
    window.addEventListener('resize', requestTick);
    update();
  } else if (fill) {
    fill.style.height = '100%';
  }

  /* ------------------------------------------------------------ */
  /* FLÈCHE DE SCROLL — défilement doux vers le processus          */
  /* ------------------------------------------------------------ */
  const scrollCue = document.querySelector('.manifesto-scroll');
  if (scrollCue) {
    scrollCue.addEventListener('click', e => {
      const target = document.querySelector(scrollCue.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });
  }

});
