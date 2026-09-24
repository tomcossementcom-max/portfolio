/* ==========================================================================
   LA LUMIÈRE — le relief prend l'heure
   La même carte n'est jamais tout à fait la même : les courbes de niveau
   reçoivent un ombrage qui suit le vrai soleil de Liège (50,63° N / 5,58° E),
   à l'heure du visiteur. Le matin il vient de l'est, le soir de l'ouest,
   à midi la carte s'aplatit ; la nuit, le lavis passe au bleu et le papier
   se fonce légèrement.
   Le calcul : position du soleil (déclinaison + angle horaire, formules
   d'astronomie de position usuelles), puis un ombrage de relief classique
   (hillshade) calculé sur la grille d'altitudes déjà chargée (ReliefData),
   dessiné une fois dans un canvas posé sous les courbes.
   Purement graphique : sans ce script, la carte reste telle quelle.
   ========================================================================== */
window.Lumiere = (() => {
  const LAT = 50.6326, LON = 5.5797;           // Liège
  const rad = Math.PI / 180;

  /* --- position du soleil : azimut (0 = nord, sens horaire) et hauteur --- */
  const soleil = (date = new Date()) => {
    const d = (date - Date.UTC(2000, 0, 1, 12)) / 86400000;      // jours depuis J2000
    const M = (357.5291 + 0.98560028 * d) * rad;                  // anomalie moyenne
    const C = (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M)) * rad;
    const L = M + C + Math.PI + 102.9372 * rad;                   // longitude écliptique
    const e = 23.4397 * rad;                                      // obliquité
    const dec = Math.asin(Math.sin(e) * Math.sin(L));             // déclinaison
    const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
    const theta = (280.16 + 360.9856235 * d) * rad - LON * rad;   // temps sidéral
    const Hh = theta - ra;                                        // angle horaire
    const phi = LAT * rad;
    const alt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(Hh));
    const az = Math.atan2(Math.sin(Hh), Math.cos(Hh) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi)); // 0 = sud
    return { alt: alt / rad, az: (az / rad + 180 + 360) % 360, dec: dec / rad };
  };

  /* --- l'ombrage d'un fragment de carte, dans un canvas --- */
  const ombrer = (canvas, { x, y, w, h, sun, force = 1 }) => {
    const data = window.ReliefData;
    if (!data || !window.Relief) return false;
    const cw = canvas.width, ch = canvas.height;
    if (!cw || !ch) return false;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(cw, ch);
    const px = img.data;
    // le soleil : azimut carte (le nord est en haut), hauteur ; sous l'horizon,
    // on garde une lumière rasante venant du nord-ouest (clair de lune)
    const night = sun.alt <= 0;
    const azm = (night ? 315 : sun.az) * rad;
    const alt = (night ? 12 : Math.max(4, sun.alt)) * rad;
    const sx = -Math.sin(azm) * Math.cos(alt);   // x vers l'est
    const sy =  Math.cos(azm) * Math.cos(alt);   // y vers le nord (écran : vers le haut)
    const sz =  Math.sin(alt);
    // l'exagération : un relief de 300 m sur 40 km ne se voit pas sans elle
    const EXAG = 11;
    const stepX = w / cw, stepY = h / ch;
    const z = (px2, py2) => Relief.elevation(x + px2 * stepX, y + py2 * stepY, []);
    for (let j = 0; j < ch; j++) {
      for (let i = 0; i < cw; i++) {
        const dzdx = (z(i + 1, j) - z(i - 1, j)) / (2 * stepX * 40) * EXAG; // 1 unité ≈ 40 m
        const dzdy = (z(i, j + 1) - z(i, j - 1)) / (2 * stepY * 40) * EXAG;
        // normale (−dz/dx, dz/dy, 1) — y de l'écran va vers le sud
        const nx = -dzdx, ny = dzdy, nz = 1;
        const len = Math.hypot(nx, ny, nz) || 1;
        // l'écart au terrain plat : plat = neutre (transparent), versant au
        // soleil = clair, versant à l'ombre = sombre
        let l = ((nx * sx + ny * sy + nz * sz) / len - sz) * 2.4;
        l = Math.max(-1, Math.min(1, l));
        const o = (j * cw + i) * 4;
        if (l >= 0) {                                    // versant éclairé
          px[o] = 255; px[o + 1] = 253; px[o + 2] = 246;
          px[o + 3] = Math.round(l * 0.62 * 255 * force);
        } else {                                         // versant à l'ombre
          px[o] = night ? 58 : 62; px[o + 1] = night ? 70 : 64; px[o + 2] = night ? 96 : 56;
          px[o + 3] = Math.round(-l * 0.5 * 255 * force);
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    return true;
  };

  /* --- l'ambiance : la page prend la couleur de l'heure --- */
  const ambiance = (sun) => {
    const root = document.documentElement;
    const a = sun.alt;
    let etat = 'jour', chaud = 0, nuit = 0;
    if (a <= -6) { etat = 'nuit'; nuit = 1; }
    else if (a <= 2) { etat = 'crepuscule'; chaud = 1; nuit = 0.45; }
    else if (a < 12) { etat = 'rasante'; chaud = 1 - (a - 2) / 10; }
    root.dataset.lumiere = etat;
    root.style.setProperty('--lum-chaud', chaud.toFixed(3));
    root.style.setProperty('--lum-nuit', nuit.toFixed(3));
    return etat;
  };

  return { soleil, ombrer, ambiance };
})();

/* l'ambiance s'applique tout de suite, sur toutes les pages : le papier et
   l'encre prennent l'heure, pas seulement la carte de l'accueil */
Lumiere.ambiance(Lumiere.soleil());
