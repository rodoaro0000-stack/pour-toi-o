/* ============================================================
   💌 CARTE D'ANNIVERSAIRE ROMANTIQUE KAWAII — script.js
   ------------------------------------------------------------
   Rôles :
     1.  Créer le décor d'arrière-plan (étoiles, sparkles, cœurs)
     2.  Gérer la séquence cinématique au clic sur l'enveloppe
     3.  Sortir le petit personnage + le gros cœur
     4.  Faire apparaître le message d'anniversaire
     5.  Écrire la lettre progressivement (machine à écrire douce)
     6.  Lancer la finale (cœurs montants + dernier message)
     7.  Gérer le bouton "Rejouer la surprise"

   Aucune dépendance externe. JavaScript vanilla uniquement.
   ============================================================ */
(function () {
  'use strict';

  /* ----------------------------------------------------------
     0. UTILITAIRES
     ---------------------------------------------------------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const rand = (min, max) => Math.random() * (max - min) + min;
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  /* Mouvement réduit : on respecte la préférence système */
  const mqReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const isReduced = () => mqReduced.matches;

  /* ----------------------------------------------------------
     1. ÉLÉMENTS DU DOM
     ---------------------------------------------------------- */
  const body = document.body;
  const envelope = $('#envelope');
  const replayBtn = $('#replay');
  const bgMusic = $('#bgMusic');
  const musicToggle = $('#musicToggle');
  const letterCard = $('#letterCard');
  const letterBody = $('#letterBody');
  const letterHint = $('#letterHint');
  const fxLayer = $('#fxLayer');
  const msgBurst = $('#msgBurst');
  const sceneMessage = $('#sceneMessage');
  const sceneLetter = $('#sceneLetter');
  const sceneFinale = $('#sceneFinale');

  const STATES = ['state-idle', 'state-open', 'state-reveal', 'state-letter', 'state-finale'];
  const HINT_DEFAUT = "✨ La lettre s'écrit pour toi… (clique pour tout afficher)";

  /* ----------------------------------------------------------
     2. GESTION DU TEMPS (timers, promesses, runId)
     ---------------------------------------------------------- */
  let runId = 0;              // incrémenté à chaque (re)lance : annule tout ce qui est en vol
  let timers = [];            // identifiants setTimeout en cours
  let pending = [];           // résolutions des promesses "wait" en attente
  let risingTimer = null;     // timer des cœurs montants de la finale
  let skipTyping = false;     // true = afficher la lettre instantanément
  let musicStarted = false;   // la musique démarre après l'action utilisateur

  /** Attente pilotable et annulable. */
  function wait(ms) {
    if (skipTyping || ms <= 0) return Promise.resolve();
    return new Promise((resolve) => {
      const t = setTimeout(() => {
        pending = pending.filter((fn) => fn !== resolve);
        resolve();
      }, ms);
      timers.push(t);
      pending.push(resolve);
    });
  }

  /** Programme une étape de la séquence, annulable. */
  function schedule(ms, fn, id) {
    const t = setTimeout(() => {
      if (id === runId) fn();
    }, Math.max(0, ms));
    timers.push(t);
  }

  /** Nettoie tous les timers + réveille les promesses en attente. */
  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
    const resolvers = pending;
    pending = [];
    resolvers.forEach((r) => r());
  }

  /** Change l'état global de la page (les CSS réagissent aux classes). */
  function setState(name) {
    STATES.forEach((s) => body.classList.toggle(s, s === name));
  }

  /* ----------------------------------------------------------
     2bis. MUSIQUE
     ---------------------------------------------------------- */
  async function startMusic(restart = false) {
    if (!bgMusic) return;

    if (restart) bgMusic.currentTime = 0;
    bgMusic.volume = 0.55;

    try {
      await bgMusic.play();
      musicStarted = true;
      musicToggle?.classList.add('is-visible');
      musicToggle?.classList.remove('is-muted');
      musicToggle?.setAttribute('aria-pressed', 'true');
      musicToggle?.setAttribute('aria-label', 'Mettre la musique en pause');
      if (musicToggle) musicToggle.querySelector('.music-label').textContent = 'Pause';
    } catch (error) {
      // Si le navigateur refuse la lecture, l'animation continue normalement.
      musicStarted = false;
    }
  }

  function toggleMusic() {
    if (!bgMusic) return;

    if (bgMusic.paused) {
      startMusic(false);
    } else {
      bgMusic.pause();
      musicToggle?.classList.add('is-muted');
      musicToggle?.setAttribute('aria-pressed', 'false');
      musicToggle?.setAttribute('aria-label', 'Reprendre la musique');
      if (musicToggle) musicToggle.querySelector('.music-label').textContent = 'Musique';
    }
  }


  /* ----------------------------------------------------------
     3. DÉCOR D'ARRIÈRE-PLAN
     ---------------------------------------------------------- */
  function createBackground() {
    const stars = $('#starsLayer');
    const sparks = $('#sparkLayer');
    const floats = $('#floatLayer');

    // --- Étoiles scintillantes ---
    const fragStars = document.createDocumentFragment();
    for (let i = 0; i < 48; i++) {
      const s = document.createElement('i');
      s.className = 'star' + (i % 3 === 0 ? ' star--diamond' : '');
      s.style.left = rand(0, 100).toFixed(2) + '%';
      s.style.top = rand(0, 100).toFixed(2) + '%';
      s.style.setProperty('--w', randInt(2, 5) + 'px');
      s.style.setProperty('--dur', rand(2.6, 6.5).toFixed(2) + 's');
      s.style.setProperty('--del', rand(0, 6).toFixed(2) + 's');
      fragStars.appendChild(s);
    }
    stars.appendChild(fragStars);

    // --- Sparkles / particules lumineuses ---
    const fragSparks = document.createDocumentFragment();
    for (let i = 0; i < 28; i++) {
      const s = document.createElement('i');
      s.className = 'spark';
      s.style.left = rand(0, 100).toFixed(2) + '%';
      s.style.top = rand(0, 100).toFixed(2) + '%';
      s.style.width = s.style.height = randInt(4, 10) + 'px';
      s.style.setProperty('--dur', rand(4, 9).toFixed(2) + 's');
      s.style.setProperty('--del', rand(0, 8).toFixed(2) + 's');
      fragSparks.appendChild(s);
    }
    sparks.appendChild(fragSparks);

    // --- Petits cœurs flottants ---
    const hearts = ['💕', '💗', '🤍', '❤️', '💖'];
    const fragFloats = document.createDocumentFragment();
    for (let i = 0; i < 12; i++) {
      const h = document.createElement('span');
      h.className = 'bg-heart';
      h.textContent = pick(hearts);
      h.style.left = rand(0, 96).toFixed(2) + '%';
      h.style.setProperty('--fs', randInt(13, 28) + 'px');
      h.style.setProperty('--dur', rand(15, 28).toFixed(1) + 's');
      h.style.setProperty('--del', -rand(0, 24).toFixed(1) + 's'); // négatif = déjà en cours
      h.style.setProperty('--dx', randInt(-60, 60) + 'px');
      h.style.setProperty('--rot', randInt(-35, 35) + 'deg');
      fragFloats.appendChild(h);
    }
    floats.appendChild(fragFloats);
  }

  /* ----------------------------------------------------------
     4. EFFETS PARTICULES (calque .fx)
     ---------------------------------------------------------- */

  /** Explose une gerbe de cœurs / étincelles à l'écran. */
  function burstAt(x, y, opts) {
    opts = opts || {};
    const count = isReduced() ? Math.min(opts.count || 12, 5) : (opts.count || 12);
    const emojis = opts.emojis || ['💕', '❤️', '💗', '✨', '💖'];
    const spreadX = opts.spreadX || 170;
    const upMin = opts.upMin || 120;
    const upMax = opts.upMax || 300;

    for (let i = 0; i < count; i++) {
      const el = document.createElement('span');
      const isDot = opts.dots && Math.random() < 0.5;
      el.className = 'fx-item' + (isDot ? ' fx-dot' : '');
      if (!isDot) el.textContent = pick(emojis);
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.setProperty('--dx', randInt(-spreadX, spreadX) + 'px');
      el.style.setProperty('--dy', -randInt(upMin, upMax) + 'px');
      el.style.setProperty('--rot', randInt(-70, 70) + 'deg');
      el.style.setProperty('--sc', rand(0.7, 1.5).toFixed(2));
      el.style.setProperty('--dur', rand(1.8, 3.4).toFixed(2) + 's');
      el.style.setProperty('--del', rand(0, 0.4).toFixed(2) + 's');
      el.style.setProperty('--fs', randInt(14, 30) + 'px');
      el.addEventListener('animationend', () => el.remove(), { once: true });
      fxLayer.appendChild(el);
    }
  }

  /** Gerbe au niveau de l'enveloppe. */
  function burstFromEnvelope(emojis) {
    const r = envelope.getBoundingClientRect();
    burstAt(r.left + r.width / 2, r.top + r.height * 0.4, {
      count: 16,
      emojis: emojis,
      dots: true,
      spreadX: 190,
      upMin: 130,
      upMax: 340
    });
  }

  /** Pendant la finale : des cœurs montent en continu. */
  function startRisingHearts() {
    stopRisingHearts();
    const one = () => {
      const el = document.createElement('span');
      el.className = 'fx-item fx-rise';
      el.textContent = pick(['💕', '❤️', '💗', '✨', '💖', '⭐']);
      el.style.left = '50%';
      el.style.top = '50%';
      el.style.setProperty('--x', randInt(-44, 44) + 'vw');
      el.style.setProperty('--wob', randInt(-45, 45) + 'px');
      el.style.setProperty('--rot', randInt(-40, 40) + 'deg');
      el.style.setProperty('--dur', rand(6, 10).toFixed(1) + 's');
      el.style.setProperty('--fs', randInt(16, 32) + 'px');
      el.addEventListener('animationend', () => el.remove(), { once: true });
      fxLayer.appendChild(el);
    };
    one();
    one();
    risingTimer = setInterval(one, 1500);
  }
  function stopRisingHearts() {
    if (risingTimer) { clearInterval(risingTimer); risingTimer = null; }
  }

  /** Petites particules autour du message d'anniversaire. */
  function fillMsgBurst() {
    msgBurst.innerHTML = '';
    const emojis = ['💕', '✨', '💗', '⭐', '❤️'];
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 16; i++) {
      const el = document.createElement('span');
      el.className = 'msg-p';
      el.textContent = pick(emojis);
      el.style.left = rand(2, 96).toFixed(1) + '%';
      el.style.top = rand(4, 94).toFixed(1) + '%';
      el.style.setProperty('--fs', randInt(12, 24) + 'px');
      el.style.setProperty('--dur', rand(4, 8).toFixed(1) + 's');
      el.style.setProperty('--del', rand(0, 4).toFixed(1) + 's');
      frag.appendChild(el);
    }
    msgBurst.appendChild(frag);
  }

  /* ----------------------------------------------------------
     5. LE TEXTE DE LA LETTRE
     ---------------------------------------------------------- */
  const LETTER = [
    { cls: 'salute', parts: [{ t: 'Mon Bubu ❤️' }] },
    { parts: [{ t: "Aujourd'hui est un jour un peu plus spécial que les autres, parce que c'est le jour où une personne merveilleuse est née." }] },
    { parts: [{ t: "Je voulais simplement te rappeler à quel point tu comptes pour moi. Ta présence apporte quelque chose de doux et de précieux à mes journées, et chaque petit moment partagé avec toi a une place particulière dans mon cœur." }] },
    { parts: [
      { t: "Je ne sais pas toujours trouver les mots parfaits pour te dire tout ce que je ressens, mais je veux que tu saches une chose : " },
      { t: "je t'aime profondément.", b: true }
    ] },
    { parts: [{ t: "J'aime ton sourire, ta façon d'être, tes petites habitudes, tes petites manies et même ces petits détails que tu ne remarques probablement pas toi-même." }] },
    { parts: [{ t: 'Tu es une personne qui mérite énormément de bonheur, de douceur et de belles choses.' }] },
    { parts: [{ t: 'Alors pour ton anniversaire, je veux simplement te souhaiter une année remplie de sourires, de beaux souvenirs, de rêves qui se réalisent et de moments qui te rendent vraiment heureux/heureuse.' }] },
    { parts: [{ t: "Et surtout, j'espère pouvoir continuer à partager encore beaucoup de ces moments avec toi." }] },
    { cls: 'closing', parts: [{ t: 'Joyeux anniversaire mon Bubu. ❤️' }] },
    { cls: 'closing', parts: [{ t: 'Je t\'aime. Aujourd\'hui, demain et encore longtemps. 💕' }] }
  ];

  /** Délai (ms) avant d'afficher le caractère suivant — doux mais vivant. */
  function delayFor(ch) {
    if (skipTyping) return 0;
    let d = rand(7, 15);
    if ('.,;:!?…'.indexOf(ch) !== -1) d += 75;       // temps de respiration
    else if (ch === ' ') d += rand(0, 8);
    return d;
  }

  /** Vide tout le texte immédiatement (utilisé en mouvement réduit). */
  function renderLetterInstantly() {
    letterBody.innerHTML = '';
    LETTER.forEach((block) => {
      const p = document.createElement('p');
      p.className = 'letter-p ' + (block.cls || '');
      block.parts.forEach((part) => {
        const host = part.b ? document.createElement('strong') : p;
        if (part.b) p.appendChild(host);
        host.appendChild(document.createTextNode(part.t));
      });
      letterBody.appendChild(p);
    });
    letterBody.scrollTop = letterBody.scrollHeight;
  }

  /**
   * Écrit la lettre caractère par caractère.
   * Renvvoie true si l'écriture est allée jusqu'au bout (sinon false = annulée).
   */
  async function typeLetter(id) {
    skipTyping = false;
    letterBody.innerHTML = '';
    letterHint.textContent = HINT_DEFAUT;
    letterHint.classList.remove('is-hidden');

    /* Mouvement réduit : tout est affiché d'un coup. */
    if (isReduced()) {
      renderLetterInstantly();
      letterHint.classList.add('is-hidden');
      return true;
    }

    for (let b = 0; b < LETTER.length; b++) {
      if (id !== runId) return false;
      const block = LETTER[b];

      const p = document.createElement('p');
      p.className = 'letter-p ' + (block.cls || '');
      letterBody.appendChild(p);

      const caret = document.createElement('span');
      caret.className = 'caret';

      for (let k = 0; k < block.parts.length; k++) {
        const part = block.parts[k];
        const host = part.b ? document.createElement('strong') : p;
        if (part.b) p.appendChild(host);
        host.appendChild(caret);

        for (const ch of part.t) {
          if (id !== runId) return false;
          caret.parentNode.insertBefore(document.createTextNode(ch), caret);
          if (!skipTyping) letterBody.scrollTop = letterBody.scrollHeight;
          await wait(delayFor(ch));
        }
      }

      p.appendChild(caret); // le curseur reste à la fin du paragraphe
      await wait(320);      // petite pause entre les paragraphes
    }

    if (id !== runId) return false;
    caretSafeRemove();
    letterHint.classList.add('is-hidden');
    return true;
  }

  function caretSafeRemove() {
    const c = letterBody.querySelector('.caret');
    if (c) c.remove();
  }

  /* ----------------------------------------------------------
     6. DÉFILEMENT CINÉMATIQUE (amener le bon élément à l'écran)
     ---------------------------------------------------------- */
  function scrollToY(y) {
    window.scrollTo({
      top: Math.max(0, y),
      behavior: isReduced() ? 'auto' : 'smooth'
    });
  }
  function topOf(el, ratio) {
    return el.getBoundingClientRect().top + window.scrollY - window.innerHeight * ratio;
  }

  /* ----------------------------------------------------------
     7. LA SÉQUENCE CINÉMATIQUE
     ---------------------------------------------------------- */
  function play() {
    const id = ++runId;
    clearTimers();
    startMusic(!musicStarted);
    skipTyping = false;
    stopRisingHearts();
    setState('state-open');

    /* En mouvement réduit, tout est accéléré : les CSS font le reste. */
    const S = isReduced() ? 0.06 : 1;

    // Séquence 1 — ouverture (rebond, rabat 3D, lumière, particules)
    schedule(700 * S, () => burstFromEnvelope(['✨', '💫', '⭐', '🌟']), id);
    schedule(1250 * S, () => burstFromEnvelope(['💕', '💗', '❤️', '💖']), id);

    // Séquence 2 — le personnage sort + message d'anniversaire
    schedule(2200 * S, () => {
      setState('state-reveal');
      fillMsgBurst();
      scrollToY(topOf(sceneMessage, 0.66));
      burstAt(window.innerWidth / 2, window.innerHeight * 0.4, {
        count: 10, emojis: ['✨', '💕', '⭐'], spreadX: 240, upMin: 60, upMax: 200
      });
    }, id);

    // Séquence 3 — la lettre romantique se déploie
    schedule(4600 * S, () => {
      setState('state-letter');
      scrollToY(topOf(sceneLetter, 0.12));
    }, id);

    // Séquence 4 — écriture progressive
    schedule(5700 * S, async () => {
      if (id !== runId) return;
      const finished = await typeLetter(id);
      if (finished && id === runId) finale(id);
    }, id);
  }

  /* ----------------------------------------------------------
     8. FINALE
     ---------------------------------------------------------- */
  function finale(id) {
    if (id !== runId) return;
    setState('state-finale');
    startRisingHearts();
    setTimeout(() => {
      if (id !== runId) return;
      scrollToY(topOf(sceneFinale, 0.55));
      burstAt(window.innerWidth / 2, window.innerHeight * 0.5, {
        count: 20,
        emojis: ['💕', '❤️', '💗', '💖', '✨'],
        dots: true,
        spreadX: Math.max(200, window.innerWidth * 0.4),
        upMin: 80,
        upMax: 260
      });
    }, isReduced() ? 0 : 700);
  }

  /* ----------------------------------------------------------
     9. REMISE À ZÉRO (bouton Rejouer)
     ---------------------------------------------------------- */
  function reset() {
    runId++;                 // annule immédiatement toute étape en cours
    clearTimers();

    if (bgMusic) {
      bgMusic.pause();
      bgMusic.currentTime = 0;
    }
    musicStarted = false;
    musicToggle?.classList.remove('is-visible');
    musicToggle?.classList.remove('is-muted');
    musicToggle?.setAttribute('aria-pressed', 'true');
    musicToggle?.setAttribute('aria-label', 'Mettre la musique en pause');
    if (musicToggle) musicToggle.querySelector('.music-label').textContent = 'Musique';
    skipTyping = false;
    stopRisingHearts();

    fxLayer.innerHTML = '';
    msgBurst.innerHTML = '';
    letterBody.innerHTML = '';
    caretSafeRemove();
    letterHint.textContent = HINT_DEFAUT;
    letterHint.classList.remove('is-hidden');

    setState('state-idle');
    window.scrollTo({ top: 0, behavior: isReduced() ? 'auto' : 'smooth' });
  }

  /* ----------------------------------------------------------
     10. ÉVÉNEMENTS
     ---------------------------------------------------------- */
  envelope.addEventListener('click', () => {
    if (body.classList.contains('state-idle')) play();
  });

  envelope.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      if (body.classList.contains('state-idle')) play();
    }
  });

  // Clic sur la lettre = afficher tout de suite la suite du texte
  letterCard.addEventListener('click', () => {
    if (body.classList.contains('state-letter') || body.classList.contains('state-reveal')) {
      skipTyping = true;
      renderLetterInstantly();
      caretSafeRemove();
      letterHint.classList.add('is-hidden');
    }
  });

  replayBtn.addEventListener('click', reset);
  musicToggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMusic();
  });

  /* ----------------------------------------------------------
     11. DÉMARRAGE
     ---------------------------------------------------------- */
  createBackground();
})();