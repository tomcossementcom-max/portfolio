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
  document.querySelectorAll('.nav-link').forEach(link => {
    const linkPath = link.getAttribute('href').split('#')[0] || 'index.html';
    if (linkPath === currentPath) link.classList.add('is-current');
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
  /* CUSTOM CURSOR (desktop only)                                  */
  /* ------------------------------------------------------------ */
  const cursor = document.querySelector('.cursor-dot');
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && cursor) {
    window.addEventListener('mousemove', e => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
    });
    document.querySelectorAll('a, button, .carousel-card, .media-placeholder').forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('is-active'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('is-active'));
    });
  }

  /* ------------------------------------------------------------ */
  /* CAROUSEL — index des projets (accueil) : flèches + glisser    */
  /* + indicateur "01 / 03" et points de progression, tenus à jour  */
  /* selon la carte la plus proche du bord gauche du carrousel.     */
  /* Le scroll par flèche/point respecte prefers-reduced-motion :   */
  /* saut instantané plutôt qu'animé quand la préférence est active.*/
  /* ------------------------------------------------------------ */
  const track = document.querySelector('.carousel-track');
  if (track) {
    const cards = [...track.querySelectorAll('.carousel-card')];
    const prevBtn = document.querySelector('.carousel-arrow.prev');
    const nextBtn = document.querySelector('.carousel-arrow.next');
    const scrollBehavior = reduceMotion ? 'auto' : 'smooth';

    const scrollByCard = dir => {
      const card = track.querySelector('.carousel-card');
      const gap = parseFloat(getComputedStyle(track).columnGap || 0);
      const distance = card ? card.offsetWidth + gap : track.clientWidth * 0.8;
      track.scrollBy({ left: dir * distance, behavior: scrollBehavior });
    };
    if (prevBtn) prevBtn.addEventListener('click', () => scrollByCard(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => scrollByCard(1));

    // pointer drag-to-slide for desktop mouse users (le scroll tactile natif
    // sur mobile continue de fonctionner indépendamment de ce code : on ne
    // fait qu'ajouter la capacité de glisser à la souris, sans preventDefault)
    let isDown = false, startX = 0, startScroll = 0, moved = false;
    track.addEventListener('pointerdown', e => {
      isDown = true; moved = false;
      startX = e.clientX;
      startScroll = track.scrollLeft;
      track.classList.add('is-dragging');
    });
    window.addEventListener('pointermove', e => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      track.scrollLeft = startScroll - dx;
    });
    window.addEventListener('pointerup', () => {
      isDown = false;
      track.classList.remove('is-dragging');
    });
    // prevent the click-through to a card link right after a drag
    track.addEventListener('click', e => {
      if (moved) { e.preventDefault(); e.stopPropagation(); }
    }, true);

    // Navigation clavier : quand une carte du carrousel a le focus (les cartes
    // sont de vrais <a>, donc déjà atteignables au Tab), les flèches gauche/
    // droite déplacent à la fois le scroll et le focus vers la carte
    // voisine — pas besoin de sortir du carrousel pour le parcourir au clavier.
    const scrollToCard = index => {
      const target = cards[Math.max(0, Math.min(cards.length - 1, index))];
      track.scrollTo({ left: target.offsetLeft - track.offsetLeft, behavior: scrollBehavior });
      return target;
    };
    track.addEventListener('keydown', e => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      const fromIndex = Math.max(0, cards.indexOf(document.activeElement));
      scrollToCard(fromIndex + dir).focus();
    });

    // indicateur de progression "01 / 03" + points + annonce aux lecteurs
    // d'écran (aria-live) à chaque changement de diapositive.
    const countEl = document.getElementById('carouselCount');
    const dotsEl = document.getElementById('carouselDots');
    const announceEl = document.getElementById('carouselAnnounce');
    if (countEl && dotsEl && cards.length) {
      const pad = n => String(n).padStart(2, '0');
      const dots = cards.map((card, i) => {
        const dot = document.createElement('button');
        dot.className = 'carousel-dot';
        dot.type = 'button';
        dot.setAttribute('aria-label', `Aller au projet ${i + 1} sur ${cards.length}`);
        dot.addEventListener('click', () => scrollToCard(i));
        dotsEl.appendChild(dot);
        return dot;
      });

      let activeIndex = -1;
      const updateActive = () => {
        let closest = 0, closestDist = Infinity;
        cards.forEach((card, i) => {
          const dist = Math.abs(card.offsetLeft - track.offsetLeft - track.scrollLeft);
          if (dist < closestDist) { closestDist = dist; closest = i; }
        });
        if (closest === activeIndex) return;
        activeIndex = closest;
        dots.forEach((d, i) => d.classList.toggle('is-active', i === activeIndex));
        countEl.textContent = `${pad(activeIndex + 1)} / ${pad(cards.length)}`;
        if (announceEl) {
          const title = cards[activeIndex].querySelector('h3');
          announceEl.textContent = `Projet ${activeIndex + 1} sur ${cards.length} : ${title ? title.textContent : ''}`;
        }
      };

      track.addEventListener('scroll', updateActive, { passive: true });
      window.addEventListener('resize', updateActive);
      updateActive();
    }
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

      /* Staggered reveal for grouped items (tags, carousel cards) */
      gsap.utils.toArray('.project-tags, .carousel-track').forEach(list => {
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
