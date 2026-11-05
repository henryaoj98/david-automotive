(() => {
  const $ = (s, c = document) => c.querySelector(s), $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const desktop = matchMedia('(min-width:1024px)').matches;
  gsap.registerPlugin(ScrollTrigger);

  // ---------- text splitting ----------
  const splitChars = el => {
    const walk = n => [...n.childNodes].forEach(c => {
      if (c.nodeType === 3) {
        const f = document.createDocumentFragment();
        c.textContent.split(/(\s+)/).forEach(w => {
          if (!w) return; if (/^\s+$/.test(w)) { f.append(' '); return; }
          const ws = document.createElement('span'); ws.className = 'word';
          [...w].forEach(ch => { const s = document.createElement('span'); s.className = 'char'; s.textContent = ch; ws.append(s); });
          f.append(ws);
        });
        c.replaceWith(f);
      } else if (c.nodeType === 1 && c.tagName !== 'BR') walk(c);
    });
    walk(el); return $$('.char', el);
  };
  const splitLines = el => { // word masks, good enough for line reveals
    const chars = splitChars(el); $$('.word', el).forEach(w => { const m = document.createElement('span'); m.className = 'line-mask'; m.style.display = 'inline-block'; w.replaceWith(m); m.append(w); });
    return $$('.word', el);
  };
  // button letter roll
  $$('[data-btn]').forEach(b => { const t = b.textContent.trim(); b.innerHTML = '<span class="chs">' + [...t].map((c, i) => `<span class="ch" style="transition-delay:${i * .02}s">${c === ' ' ? ' ' : c}</span>`).join('') + '</span>'; });

  // ---------- smooth scroll ----------
  // mobile-lite: touch / narrow screens get native scroll and cheaper effects
  const lite = matchMedia('(pointer:coarse)').matches || innerWidth <= 820;
  document.documentElement.classList.toggle('lite', lite);
  ScrollTrigger.config({ ignoreMobileResize: true });
  let lenis;
  if (!lite) {
    lenis = new Lenis({ duration: 1.25, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
  } else {
    // native scroll shim with the same small API
    const root = document.documentElement; let tw = 0;
    lenis = { stop() { root.style.overflow = 'hidden'; }, start() { root.style.overflow = ''; },
      scrollTo(t, o = {}) { const y1 = typeof t === 'number' ? t : t.getBoundingClientRect().top + scrollY, y0 = scrollY, d = (o.duration || 1) * 1000, e = o.easing || (k => 1 - Math.pow(1 - k, 3)), t0 = performance.now(), id = ++tw;
        const f = n => { if (id !== tw) return; const k = Math.min(1, (n - t0) / d); scrollTo(0, y0 + (y1 - y0) * e(k)); k < 1 ? requestAnimationFrame(f) : o.onComplete && o.onComplete(); }; requestAnimationFrame(f);
        const cancel = () => { tw++; removeEventListener('touchstart', cancel); }; addEventListener('touchstart', cancel, { passive: true }); } };
  }
  lenis.stop();
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => { const id = a.getAttribute('href'); const t = id === '#top' ? 0 : $(id); if (t === null) return; e.preventDefault(); closeMenu(); lenis.scrollTo(t, { duration: 1.8 }); }));

  // ---------- header / progress / menu ----------
  const body = document.body;
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: s => { gsap.set('#progress', { scaleX: s.progress }); body.classList.toggle('scrolled', s.scroll() > 40); } });
  const menuBtn = $('#menuBtn'), menuEl = $('#menu');
  const setMenu = o => {
    body.classList.toggle('menu-open', o); menuBtn.setAttribute('aria-expanded', o); menuEl && menuEl.setAttribute('aria-hidden', !o);
    if (menuEl) menuEl.inert = !o;
    if (o) { lenis.stop(); setTimeout(() => { const a = $('a', menuEl); a && a.focus(); }, 300); }
    else if (!body.classList.contains('is-gated')) lenis.start();
  };
  const closeMenu = () => { if (!body.classList.contains('menu-open')) return; setMenu(false); menuBtn.focus({ preventScroll: true }); };
  if (menuEl) menuEl.inert = true;
  menuBtn.addEventListener('click', () => setMenu(!body.classList.contains('menu-open')));
  addEventListener('keydown', e => {
    if (!body.classList.contains('menu-open')) return;
    if (e.key === 'Escape') closeMenu();
    if (e.key === 'Tab') { const f = [menuBtn, ...$$('a', menuEl)], i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
  });

  // ---------- hero film: intro clip once, then scroll-scrubbed frame sequence ----------
  const heroTitle = splitLines($('.hero-title'));
  gsap.set(heroTitle, { yPercent: 110 }); gsap.set('.hero-sub', { opacity: 0, y: 20 });
  const hero = $('.hero'), vid = $('.hero-intro'), cv = $('.hero-canvas'), ctx = cv.getContext('2d'), tiltEl = $('.hero-tilt');
  const small = innerWidth < 1024;
  const FRAMES = lite ? 61 : 121, STEP = lite ? 2 : 1, dir = small ? 'video/scroll-m/' : 'video/scroll-d/';
  vid.src = small ? 'video/intro-m.mp4' : 'video/intro-d.mp4';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const imgs = [];
  const frameSrc = i => `${dir}${String(i * STEP + 1).padStart(3, '0')}.webp`;
  if (!lite) for (let i = 0; i < FRAMES; i++) { const im = new Image(); im.decoding = 'async'; im.src = frameSrc(i); imgs[i] = im; }
  else {
    // lite: frames load a few at a time and are decoded off the main thread before use
    for (let i = 0; i < FRAMES; i++) imgs[i] = { complete: false, naturalWidth: 0 };
    let next = 0; const order = [0]; for (let gap = 32; gap >= 1; gap >>= 1) for (let i = gap; i < FRAMES; i += gap) if (!order.includes(i)) order.push(i);
    const pump = () => { if (next >= order.length) return; const i = order[next++], im = new Image(); im.src = frameSrc(i);
      im.decode().then(() => (window.createImageBitmap ? createImageBitmap(im) : im)).then(bm => { bm.complete = true; bm.naturalWidth = bm.naturalWidth || bm.width; bm.naturalHeight = bm.naturalHeight || bm.height; imgs[i] = bm; if (i === 0 || Math.abs(i - lastWanted) < 3) { curFrame = -1; draw(lastWanted); } }).catch(() => {}).finally(pump); };
    const startPump = () => { for (let k = 0; k < 3; k++) pump(); };
    window.__startFrames = startPump;
  }
  let curFrame = -1;
  const sizeCanvas = () => { const d = Math.min(devicePixelRatio || 1, lite ? 1.5 : 2); cv.width = Math.round(cv.clientWidth * d); cv.height = Math.round(cv.clientHeight * d); curFrame = -1; draw(lastWanted); };
  const drawCover = im => { const cw = cv.width, ch = cv.height, portrait = ch > cw;
    const s = portrait ? cw * 1.7 / im.naturalWidth : Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
    if (portrait) ctx.clearRect(0, 0, cw, ch);
    const w = im.naturalWidth * s, hh = im.naturalHeight * s; ctx.drawImage(im, (cw - w) / 2, (ch - hh) / 2, w, hh); };
  let lastWanted = 0;
  function draw(i) {
    lastWanted = i;
    // nearest loaded frame so scrubbing never blanks
    let k = i; while (k > 0 && !(imgs[k].complete && imgs[k].naturalWidth)) k--;
    const im = imgs[k]; if (!im.complete || !im.naturalWidth || k === curFrame) return;
    curFrame = k; drawCover(im);
  }
  if (!lite) imgs[0].onload = () => draw(lastWanted);
  addEventListener('resize', sizeCanvas); sizeCanvas();

  let introDone = false;
  const finishIntro = () => { if (introDone) return; introDone = true; draw(lastWanted); hero.classList.add('film-ready'); };
  vid.addEventListener('ended', finishIntro);
  const playText = d => {
    gsap.to(heroTitle, { yPercent: 0, duration: 1.6, ease: 'expo.out', stagger: .06, delay: d });
    gsap.to('.hero-sub', { opacity: 1, y: 0, duration: 1.4, ease: 'expo.out', delay: d + .8 });
  };
  const enter = () => {
    $('#gate').classList.add('out'); body.classList.remove('is-gated'); lenis.start(); scrollTo(0, 0);
    if (reduced) { finishIntro(); playText(.2); lite && window.__startFrames(); return; }
    vid.currentTime = 0; const p = vid.play(); if (p && p.catch) p.catch(finishIntro);
    if (lite) { let st = false; const go = () => { if (st) return; st = true; window.__startFrames(); }; vid.addEventListener('ended', go); setTimeout(go, 2500); addEventListener('scroll', go, { once: true, passive: true }); }
    playText(1.4);
  };
  window.__heroVid = vid;
  $$('[data-enter]').forEach(b => b.addEventListener('click', enter));

  // ---------- hero: pinned sticky track (3 viewports: 2 drive-in, .6 statement, .4 outro) ----------
  const D = 2 / 3;
  let introSeg = 0;
  const stChars = splitChars($('.hero-statement'));
  const ht = gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom bottom', scrub: true,
    onUpdate: s => {
      introSeg = Math.min(1, s.progress / D);
      if (s.progress > 0.002 && !introDone) { vid.pause(); finishIntro(); }
      draw(Math.round(introSeg * (FRAMES - 1)));
      armSnap(s);
    } } });
  ht.to('.hero-title', lite ? { opacity: 0, y: -80, duration: D * .35 } : { opacity: 0, y: -80, filter: 'blur(8px)', duration: D * .35 }, 0)
    .to('.hero-sub', { opacity: 0, duration: D * .2 }, 0)
    .to('.hero-vignette', { opacity: 1, duration: D }, 0)
    .to('.hero-media', { opacity: 0, duration: .1, ease: 'power1.in' }, D)
    .fromTo(stChars, lite ? { opacity: 0 } : { opacity: 0, filter: 'blur(6px)' }, lite ? { opacity: 1, stagger: .004, duration: .05, ease: 'none' } : { opacity: 1, filter: 'blur(0px)', stagger: .004, duration: .05, ease: 'none' }, D + .07)
    .to('.hero-statement', { opacity: 0, y: -60, duration: .1 }, .9);

  // snap forward: stop past 60% of the drive-in and it glides to the end of the clip (2s)
  let snapT = 0, snapping = false;
  function armSnap(s) {
    clearTimeout(snapT); if (snapping) return;
    snapT = setTimeout(() => {
      if (s.direction > 0 && introSeg > .6 && introSeg < .995) {
        snapping = true;
        lenis.scrollTo(s.start + (s.end - s.start) * D, { duration: 2, easing: t => 1 - Math.pow(1 - t, 3), onComplete: () => snapping = false });
        setTimeout(() => snapping = false, 2100);
      }
    }, 160);
  }

  // ---------- hero: pointer tilt (desktop, fine pointer) ----------
  if (matchMedia('(hover:hover) and (pointer:fine)').matches) {
    gsap.set(tiltEl, { transformPerspective: 1200, transformOrigin: '50% 50%' });
    const q = p => gsap.quickTo(tiltEl, p, { duration: .7, ease: 'power3.out' });
    const T = { xPercent: q('xPercent'), yPercent: q('yPercent'), rotationY: q('rotationY'), rotationX: q('rotationX'), scale: q('scale') };
    const smooth = t => t * t * (3 - 2 * t);
    let px = 0, py = 0, active = false;
    const apply = () => {
      const s = active ? 1 - smooth(Math.min(1, introSeg / .12)) : 0;
      const x = px * s, y = py * s;
      T.xPercent(.6 * x); T.yPercent(.6 * y); T.rotationY(-(.5 * x)); T.rotationX(.5 * y); T.scale(1 + .025 * s);
    };
    addEventListener('pointermove', e => { px = e.clientX / innerWidth * 2 - 1; py = e.clientY / innerHeight * 2 - 1; active = true; apply(); }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => { active = false; apply(); });
    addEventListener('blur', () => { active = false; apply(); });
    ScrollTrigger.create({ trigger: hero, start: 'top top', end: 'bottom bottom', onUpdate: apply });
  }

  // ---------- approach card expand ----------
  if (desktop) {
    const at = gsap.timeline({ scrollTrigger: { trigger: '.approach', start: 'top bottom', end: 'bottom bottom', scrub: true } });
    at.fromTo('.approach-card', { clipPath: 'inset(18% 14% 18% 14%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', duration: .55 }, 0)
      .fromTo('.approach-card>img', { scale: 1.3 }, { scale: 1, ease: 'none', duration: .9 }, 0)
      .fromTo('.approach-title span', { xPercent: -40, opacity: 0 }, { xPercent: 0, opacity: 1, stagger: .06, duration: .4 }, .2)
      .fromTo('.approach-tags li', { opacity: 0, y: 20 }, { opacity: 1, y: 0, stagger: .05, duration: .2 }, .5)
      .fromTo('.approach-copy', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: .25 }, .6);
  } else {
    gsap.from('.approach-title span', { xPercent: -30, opacity: 0, stagger: .1, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.approach-card', start: 'top 75%' } });
  }

  // ---------- pillars ----------
  if (desktop) {
    const media = $$('.pillars-media img'), bgs = $$('.pillars-bg img'), arts = $$('.pillars-text article');
    const pt = gsap.timeline({ scrollTrigger: { trigger: '.pillars', start: 'top top', end: 'bottom bottom', scrub: true } });
    gsap.from(['.pillars-media', arts[0]], { y: 60, opacity: 0, stagger: .1, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.pillars', start: 'top 60%' } });
    [1, 2].forEach(i => {
      const t = i * 1;
      pt.to(arts[i - 1], { autoAlpha: 0, y: -40, duration: .3 }, t)
        .fromTo(media[i], { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: .6, ease: 'power2.inOut' }, t)
        .fromTo(media[i - 1], { scale: 1 }, { scale: 1.15, duration: .6 }, t)
        .to(bgs[i], { opacity: 1, duration: .6 }, t)
        .fromTo(arts[i], { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: .3 }, t + .3);
    });
    pt.to({}, { duration: .5 });
  }

  // ---------- service intro highlight ----------
  let hl = splitChars($('[data-highlight]'));
  if (lite) hl = $$('[data-highlight] .word');
  gsap.to(hl, { keyframes: { color: ['rgba(242,241,237,.18)', '#c0392b', '#F2F1ED'] }, stagger: .02, ease: 'none',
    scrollTrigger: { trigger: '.svc-intro', start: 'top 70%', end: 'center 40%', scrub: true } });
  if (!lite) gsap.fromTo('.svc-intro-media img', { yPercent: -10 }, { yPercent: 10, ease: 'none', scrollTrigger: { trigger: '.svc-intro-media', scrub: true } });
  gsap.from('.svc-intro-media', { clipPath: 'inset(100% 0 0 0)', duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: '.svc-intro-media', start: 'top 85%' } });

  // ---------- services split screen ----------
  const svcImgs = $$('.svc-media-sticky img');
  $$('.svc').forEach((s, i) => {
    gsap.from(s.children, { y: 50, opacity: 0, stagger: .08, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: s, start: 'top 60%' } });
    if (desktop && i > 0) gsap.fromTo(svcImgs[i], { clipPath: 'inset(100% 0 0 0)', scale: 1.2 }, { clipPath: 'inset(0% 0 0 0)', scale: 1, ease: 'none', scrollTrigger: { trigger: s, start: 'top bottom', end: 'top top', scrub: true } });
  });

  // ---------- "standard stops here" ----------
  const et = gsap.timeline({ scrollTrigger: { trigger: '.ends', start: 'top top', end: 'bottom bottom', scrub: lite ? .3 : true } });
  if (lite) { // compositor-friendly: full-size image revealed by clip-path, darkened by an overlay's opacity
    const dim = document.createElement('i'); dim.className = 'ends-dim'; $('.ends-img').append(dim);
    et.fromTo('.ends-img', { clipPath: 'inset(27% 8% 27% 8%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power1.inOut', duration: .5 }, 0)
      .fromTo('.ends-img img', { scale: 1.2 }, { scale: 1, duration: .5 }, 0)
      .to('.ends-word', { opacity: 0, scale: .9, duration: .2 }, .45)
      .fromTo(dim, { opacity: .3 }, { opacity: .65, duration: .2 }, .5)
      .fromTo('.ends-copy', { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: .25 }, .6)
      .to({}, { duration: .2 });
  } else et.fromTo('.ends-img', { width: desktop ? '46vw' : '84vw', height: desktop ? '56vh' : '46vh' }, { width: '100vw', height: '100vh', ease: 'power1.inOut', duration: .5 }, 0)
    .fromTo('.ends-img img', { scale: 1.2 }, { scale: 1, duration: .5 }, 0)
    .to('.ends-word', { opacity: 0, scale: .9, duration: .2 }, .45)
    .to('.ends-img img', { filter: 'brightness(.35)', duration: .2 }, .5)
    .fromTo('.ends-copy', { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: .25 }, .6)
    .to({}, { duration: .2 });

  // ---------- features / cta ----------
  $$('.feature').forEach(f => {
    if (!lite) gsap.fromTo($('.feature-img', f), { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: f, scrub: true } });
    const w = splitLines($('h2', f));
    gsap.from(w, { yPercent: 110, stagger: .06, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: f, start: 'top 55%' } });
    gsap.from([$('p', f), $('.btn', f)], { opacity: 0, y: 30, stagger: .1, duration: 1.2, ease: 'expo.out', delay: .2, scrollTrigger: { trigger: f, start: 'top 55%' } });
  });
  const cw = splitLines($('.cta h2'));
  gsap.from(cw, { yPercent: 110, stagger: .08, duration: 1.5, ease: 'expo.out', scrollTrigger: { trigger: '.cta', start: 'top 55%' } });
  if (!lite) gsap.fromTo('.cta-bg img', { scale: 1.5 }, { scale: 1.2, ease: 'none', scrollTrigger: { trigger: '.cta', scrub: true } });
  gsap.from('.ftr-nav a', { yPercent: 60, opacity: 0, stagger: .08, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.ftr', start: 'top 80%' } });

  // =================== v4 ===================
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  // section heading reveals
  $$('.process h2,.spec h2,.transform h2,.anatomy h2,.gallery h2,.enquire h2').forEach(h => {
    const w = splitLines(h); if (reduced) return;
    gsap.from(w, { yPercent: 110, stagger: .06, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 85%' } });
  });

  // ---------- process: line draws, steps light up ----------
  const steps = $$('.pstep'), pline = $('.process-line i');
  if (steps.length) {
    ScrollTrigger.create({ trigger: '.process-list', start: desktop ? 'top 75%' : 'top 70%', end: desktop ? 'bottom 45%' : 'bottom 55%', scrub: !reduced,
      onUpdate: s => { const p = reduced ? 1 : s.progress; gsap.set(pline, desktop ? { scaleX: p } : { scaleY: p });
        steps.forEach((st, i) => st.classList.toggle('on', p >= i / steps.length + .02)); } });
    if (!reduced) gsap.from(steps, { y: 40, opacity: 0, stagger: .12, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.process-list', start: 'top 80%' } });
  }

  // ---------- before / after ----------
  $$('[data-ba]').forEach(ba => {
    const h = $('.ba-handle', ba); let pos = 50, drag = false;
    const set = v => { pos = Math.max(0, Math.min(100, v)); ba.style.setProperty('--pos', pos + '%');
      h.setAttribute('aria-valuenow', Math.round(pos)); h.setAttribute('aria-valuetext', Math.round(pos) + '% factory'); };
    const fromEv = e => { const r = ba.getBoundingClientRect(); set((e.clientX - r.left) / r.width * 100); };
    ba.addEventListener('pointerdown', e => { drag = true; ba.classList.add('drag'); ba.setPointerCapture(e.pointerId); fromEv(e); });
    ba.addEventListener('pointermove', e => drag && fromEv(e));
    const end = () => { drag = false; ba.classList.remove('drag'); };
    ba.addEventListener('pointerup', end); ba.addEventListener('pointercancel', end);
    h.addEventListener('keydown', e => { const k = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5, PageDown: -20, PageUp: 20 }[e.key];
      if (k) { e.preventDefault(); set(pos + k); } else if (e.key === 'Home') { e.preventDefault(); set(0); } else if (e.key === 'End') { e.preventDefault(); set(100); } });
    if (!reduced) { const o = { v: 82 }; ScrollTrigger.create({ trigger: ba, start: 'top 65%', once: true,
      onEnter: () => gsap.fromTo(o, { v: 82 }, { v: 50, duration: 1.8, ease: 'expo.inOut', onUpdate: () => !drag && set(o.v) }) }); set(82); }
  });

  // ---------- hotspots ----------
  const hsBtns = $$('.hs');
  const closeHs = except => hsBtns.forEach(b => { if (b === except) return; b.setAttribute('aria-expanded', 'false'); $('#' + b.getAttribute('aria-controls')).hidden = true; });
  hsBtns.forEach(b => b.addEventListener('click', e => { e.stopPropagation();
    const card = $('#' + b.getAttribute('aria-controls')), open = b.getAttribute('aria-expanded') !== 'true';
    closeHs(b); b.setAttribute('aria-expanded', open); card.hidden = !open;
    if (open && desktop) { card.classList.remove('flip'); const r = card.getBoundingClientRect(), st = card.parentNode.getBoundingClientRect(); if (r.right > st.right - 10) card.classList.add('flip'); } }));
  document.addEventListener('click', e => { if (!e.target.closest('.hs-card')) closeHs(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && hsBtns.some(b => b.getAttribute('aria-expanded') === 'true')) { const b = hsBtns.find(b => b.getAttribute('aria-expanded') === 'true'); closeHs(); b.focus(); } });
  if (!reduced && hsBtns.length) gsap.from(hsBtns, { scale: 0, opacity: 0, stagger: .12, duration: .8, ease: 'back.out(2)', scrollTrigger: { trigger: '.hs-stage', start: 'top 60%' } });

  // ---------- configurator ----------
  const specForm = $('.spec-ctrl'), scv = $('.spec-canvas');
  if (specForm && scv) {
    const sctx = scv.getContext('2d', { willReadFrequently: false }), stage = $('.spec-stage');
    const sfx = innerWidth < 1024 ? '-m' : '', cache = {};
    let cur = null, col = [0, 0, 0, 0], tw = null;
    const parseC = el => { const v = el.dataset.rgb; return v === '0' ? null : v.split(',').map(Number); };
    const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    const load = async t => {
      if (cache[t]) return cache[t];
      const [im, mk] = await Promise.all([loadImg(`assets/v4/cfg/${t}${sfx}.webp`), loadImg(`assets/v4/cfg/${t}${sfx}-mask.png`)]);
      const W = im.naturalWidth, H = im.naturalHeight, c = document.createElement('canvas'); c.width = W; c.height = H;
      const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0); const base = x.getImageData(0, 0, W, H);
      x.clearRect(0, 0, W, H); x.drawImage(mk, 0, 0); const md = x.getImageData(0, 0, W, H).data;
      const n = W * H, idx = new Int32Array(n), m = new Float32Array(n), L = new Float32Array(n), bd = base.data; let cnt = 0;
      // chunked so building the paint mask never blocks a scroll frame for long
      for (let p0 = 0; p0 < n; p0 += 65536) {
        for (let p = p0, e = Math.min(n, p0 + 65536); p < e; p++) { const a = md[p * 4]; if (a > 2) { const q = p * 4; idx[cnt] = p; m[cnt] = a / 255; L[cnt] = (bd[q] + bd[q + 1] + bd[q + 2]) / 765; cnt++; } }
        await new Promise(r => setTimeout(r, 0));
      }
      return cache[t] = { W, H, base, idx: idx.subarray(0, cnt), m: m.subarray(0, cnt), L: L.subarray(0, cnt), out: new ImageData(new Uint8ClampedArray(bd), W, H) };
    };
    const render = () => {
      if (!cur) return; const { idx, m, L, base, out } = cur, b = base.data, o = out.data, [r, g, bl, k] = col;
      for (let j = 0; j < idx.length; j++) { const q = idx[j] * 4, l = L[j], a = m[j] * k, hi = l > .7 ? (l - .7) * 2 : 0, s = .2 + 1.9 * l;
        o[q] = b[q] * (1 - a) + Math.min(1, r * s + hi) * 255 * a; o[q + 1] = b[q + 1] * (1 - a) + Math.min(1, g * s + hi) * 255 * a; o[q + 2] = b[q + 2] * (1 - a) + Math.min(1, bl * s + hi) * 255 * a; }
      if (scv.width !== cur.W) { scv.width = cur.W; scv.height = cur.H; }
      sctx.putImageData(out, 0, 0);
    };
    const tweenTo = c => { const tgt = c ? [...c, 1] : [col[0], col[1], col[2], 0];
      if (col[3] === 0 && c) col = [...c, 0];
      tw && tw.kill(); if (reduced) { col = tgt; render(); return; }
      const o = { r: col[0], g: col[1], b: col[2], k: col[3] };
      tw = gsap.to(o, { r: tgt[0], g: tgt[1], b: tgt[2], k: tgt[3], duration: .7, ease: 'power2.inOut', onUpdate: () => { col = [o.r, o.g, o.b, o.k]; render(); } }); };
    const val = n => specForm.elements[n].value;
    const label = n => { const i = $(`input[name=${n}]:checked`, specForm); return i ? $('span', i.parentNode).textContent.trim() : ''; };
    const summary = () => `${label('body')} in ${val('finish')}, ${val('wheels')} wheels, ${val('interior')} interior`;
    const update = () => { $('.spec-sum-text').textContent = summary() + '.'; $('.spec-caption').textContent = `${label('body')} · ${val('finish')}`; };
    let started = false, bodyNow = null;
    const showBody = async t => { bodyNow = t; stage.classList.add('loading');
      try { const d = await load(t); if (bodyNow !== t) return; cur = d; render(); } catch (e) { $('.spec-loading').textContent = 'Preview unavailable'; }
      stage.classList.remove('loading'); };
    const start = () => { if (started) return; started = true; col = [...(parseC($('input[name=finish]:checked', specForm)) || [0, 0, 0]), parseC($('input[name=finish]:checked', specForm)) ? 1 : 0]; showBody(val('body')); };
    specForm.addEventListener('change', e => { update(); if (!started) return start();
      if (e.target.name === 'body') { if (!reduced) gsap.fromTo(scv, { opacity: .2, x: 30 }, { opacity: 1, x: 0, duration: .8, ease: 'expo.out' }); showBody(e.target.value); }
      if (e.target.name === 'finish') tweenTo(parseC(e.target)); });
    update();
    ScrollTrigger.create({ trigger: '.spec', start: 'top 150%', once: true, onEnter: () => (window.requestIdleCallback || setTimeout)(start) });
    $('[data-spec-send]').addEventListener('click', () => { const f = $('.enq-form'); if (!f) return;
      f.elements.spec.value = summary(); const t = { suv: 'SUV', coupe: 'Coupé', saloon: 'Saloon' }[val('body')]; f.elements.type.value = t; });
  }

  // ---------- gallery filter + lightbox ----------
  const gItems = $$('.g-item');
  $$('.g-f').forEach(f => f.addEventListener('click', () => {
    $$('.g-f').forEach(x => { x.classList.toggle('is-on', x === f); x.setAttribute('aria-pressed', x === f); });
    const c = f.dataset.f, show = gItems.filter(i => c === 'all' || i.dataset.cat === c);
    gItems.forEach(i => i.classList.toggle('out', !show.includes(i)));
    if (!reduced) gsap.fromTo(show, { opacity: 0, y: 24 }, { opacity: 1, y: 0, stagger: .04, duration: .7, ease: 'expo.out' });
    ScrollTrigger.refresh();
  }));
  if (!reduced) gItems.forEach(i => gsap.from(i, { y: 60, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: i, start: 'top 92%' } }));
  if (gItems.length) {
    const ico = d => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
    const lb = document.createElement('div'); lb.className = 'lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Image viewer'); lb.inert = true;
    lb.innerHTML = `<figure><img alt=""><figcaption><b></b><span class="label"></span></figcaption></figure>
      <button class="lb-x" aria-label="Close">${ico('M5 5l14 14M19 5 5 19')}</button><button class="lb-p" aria-label="Previous image">${ico('M15 5l-7 7 7 7')}</button><button class="lb-n" aria-label="Next image">${ico('M9 5l7 7-7 7')}</button>`;
    document.body.append(lb);
    const lim = $('img', lb); let li = 0, opener = null;
    const vis = () => gItems.filter(i => !i.classList.contains('out')).map(i => $('.g-btn', i));
    const show = i => { const v = vis(); li = (i + v.length) % v.length; const b = v[li];
      lim.classList.add('ld'); const n = new Image(); n.onload = () => { lim.src = n.src; lim.alt = $('img', b).alt; lim.classList.remove('ld'); }; n.src = b.dataset.full;
      $('figcaption b', lb).textContent = b.dataset.cap; $('figcaption span', lb).textContent = `${li + 1} / ${v.length}`; };
    const open = b => { opener = b; show(vis().indexOf(b)); lb.inert = false; lb.classList.add('open'); lenis.stop(); requestAnimationFrame(() => $('.lb-x', lb).focus()); };
    const close = () => { lb.classList.remove('open'); lb.inert = true; lenis.start(); opener && opener.focus({ preventScroll: true }); };
    $$('.g-btn').forEach(b => b.addEventListener('click', () => open(b)));
    $('.lb-x', lb).onclick = close; $('.lb-p', lb).onclick = () => show(li - 1); $('.lb-n', lb).onclick = () => show(li + 1);
    lb.addEventListener('click', e => e.target === lb && close());
    addEventListener('keydown', e => { if (!lb.classList.contains('open')) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') show(li - 1); if (e.key === 'ArrowRight') show(li + 1);
      if (e.key === 'Tab') { const f = $$('button', lb), k = f.indexOf(document.activeElement); if (e.shiftKey && k <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && k === f.length - 1) { e.preventDefault(); f[0].focus(); } } });
    let sx = null; lb.addEventListener('touchstart', e => sx = e.touches[0].clientX, { passive: true });
    lb.addEventListener('touchend', e => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) show(li + (dx < 0 ? 1 : -1)); sx = null; });
  }

  // ---------- enquiry (preview only: no network send) ----------
  const ef = $('.enq-form');
  if (ef) {
    const stepsEl = $$('.enq-step', ef), dots = $$('.enq-steps li'), back = $('.enq-back', ef), next = $('.enq-next', ef), status = $('.enq-status', ef);
    let st = 0;
    const go = n => { stepsEl[st].hidden = true; stepsEl[st].classList.remove('is-on'); st = n; stepsEl[st].hidden = false; stepsEl[st].classList.add('is-on');
      dots.forEach((d, i) => d.classList.toggle('is-on', i <= st)); $('.enq-bar i', ef).style.width = ((st + 1) / 3 * 100) + '%';
      back.hidden = st === 0; next.textContent = st === 2 ? 'Prepare Enquiry' : 'Continue'; status.textContent = '';
      const f = $('input,select,textarea', stepsEl[st]); f && f.focus({ preventScroll: true }); };
    const msgFor = el => el.validity.valueMissing ? 'Required' : el.validity.typeMismatch ? 'Enter a valid email' : el.validity.tooShort ? `At least ${el.minLength} characters` : '';
    const check = () => { let first = null;
      $$('input,select,textarea', stepsEl[st]).forEach(el => { const fld = el.closest('.fld'); let er = fld && $('.err', fld);
        const bad = !el.checkValidity(); el.setAttribute('aria-invalid', bad);
        if (bad) { if (!er) { er = document.createElement('span'); er.className = 'err'; er.id = 'err-' + el.name; fld.append(er); } er.textContent = msgFor(el); el.setAttribute('aria-describedby', er.id); first = first || el; }
        else if (er) { er.remove(); el.removeAttribute('aria-describedby'); } });
      if (first) { status.textContent = 'Please check the highlighted fields.'; first.focus(); return false; } return true; };
    $$('input,textarea', ef).forEach(el => el.addEventListener('input', () => { if (el.getAttribute('aria-invalid') === 'true' && el.checkValidity()) { el.setAttribute('aria-invalid', 'false'); const er = $('.err', el.closest('.fld')); er && er.remove(); } }));
    back.addEventListener('click', () => go(st - 1));
    ef.addEventListener('submit', e => { e.preventDefault(); if (!check()) return; if (st < 2) return go(st + 1);
      const d = new FormData(ef), svc = d.getAll('svc').join(', ');
      const bodyTxt = `Name: ${d.get('name')}\nEmail: ${d.get('email')}\nPhone: ${d.get('phone') || '-'}\nCar: ${d.get('car')}\nBody type: ${d.get('type') || '-'}\nTimeline: ${d.get('when') || '-'}\nInterested in: ${svc || '-'}\nSpec: ${d.get('spec') || '-'}\n\n${d.get('msg')}`;
      $('[data-mailto]', ef).href = 'mailto:hello@example.com?subject=' + encodeURIComponent('Build enquiry: ' + d.get('car')) + '&body=' + encodeURIComponent(bodyTxt);
      stepsEl[st].hidden = true; ef.classList.add('done'); $('.enq-bar i', ef).style.width = '100%'; const done = $('.enq-done', ef); done.hidden = false; done.focus();
      // TODO(David Automotive): POST FormData to the real endpoint here.
    });
  }

  // ---------- magnetic buttons (desktop fine pointer) ----------
  if (fine && !reduced) $$('.btn,.g-f').forEach(b => {
    const mx = gsap.quickTo(b, 'x', { duration: .6, ease: 'power3.out' }), my = gsap.quickTo(b, 'y', { duration: .6, ease: 'power3.out' });
    b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); mx((e.clientX - r.left - r.width / 2) * .22); my((e.clientY - r.top - r.height / 2) * .3); });
    b.addEventListener('pointerleave', () => { mx(0); my(0); });
  });
  addEventListener('load', () => ScrollTrigger.refresh());
})();
