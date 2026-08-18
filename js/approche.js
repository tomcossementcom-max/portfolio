/* ==========================================================================
   PAGE APPROCHE — scrollytelling en Vanilla JS pur (Intersection Observer).
   Aucune dépendance externe : ce fichier ne charge rien d'autre que lui-même.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------ */
  /* TIMELINE — chaque étape apparaît (fade + slide) à son tour    */
  /* ------------------------------------------------------------ */
  const steps = document.querySelectorAll('.timeline-step');

  if (reduceMotion) {
    steps.forEach(step => step.classList.add('is-visible'));
  } else if ('IntersectionObserver' in window) {
    const stepObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          stepObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3, rootMargin: '0px 0px -10% 0px' });

    steps.forEach(step => stepObserver.observe(step));
  } else {
    steps.forEach(step => step.classList.add('is-visible')); // très vieux navigateurs
  }

  /* ------------------------------------------------------------ */
  /* LIGNE DE TIMELINE — se remplit selon la progression du scroll */
  /* ------------------------------------------------------------ */
  const timeline = document.getElementById('timeline');
  const fill = document.getElementById('timelineFill');

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
      ticking = false;
    };

    const requestTick = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateFill);
        ticking = true;
      }
    };

    window.addEventListener('scroll', requestTick, { passive: true });
    window.addEventListener('resize', requestTick);
    updateFill();
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
