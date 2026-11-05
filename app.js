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
  const lenis = new Lenis({ duration: 1.25, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
  lenis.stop();
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => { const id = a.getAttribute('href'); const t = id === '#top' ? 0 : $(id); if (t === null) return; e.preventDefault(); closeMenu(); lenis.scrollTo(t, { duration: 1.8 }); }));

  // ---------- header / progress / menu ----------
  const body = document.body;
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: s => { gsap.set('#progress', { scaleX: s.progress }); body.classList.toggle('scrolled', s.scroll() > 40); } });
  const closeMenu = () => { body.classList.remove('menu-open'); if (!body.classList.contains('is-gated')) lenis.start(); };
  $('#menuBtn').addEventListener('click', () => { const o = body.classList.toggle('menu-open'); o ? lenis.stop() : lenis.start(); });
  addEventListener('keydown', e => e.key === 'Escape' && closeMenu());

  // ---------- hero film: intro clip once, then scroll-scrubbed frame sequence ----------
  const heroTitle = splitLines($('.hero-title'));
  gsap.set(heroTitle, { yPercent: 110 }); gsap.set('.hero-sub', { opacity: 0, y: 20 });
  const hero = $('.hero'), vid = $('.hero-intro'), cv = $('.hero-canvas'), ctx = cv.getContext('2d'), tiltEl = $('.hero-tilt');
  const small = innerWidth < 1024;
  const FRAMES = 121, dir = small ? 'video/scroll-m/' : 'video/scroll-d/';
  vid.src = small ? 'video/intro-m.mp4' : 'video/intro-d.mp4';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const imgs = [];
  for (let i = 0; i < FRAMES; i++) { const im = new Image(); im.decoding = 'async'; im.src = `${dir}${String(i + 1).padStart(3, '0')}.webp`; imgs[i] = im; }
  let curFrame = -1;
  const sizeCanvas = () => { const d = Math.min(devicePixelRatio || 1, 2); cv.width = Math.round(cv.clientWidth * d); cv.height = Math.round(cv.clientHeight * d); curFrame = -1; draw(lastWanted); };
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
  imgs[0].onload = () => draw(lastWanted);
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
    if (reduced) { finishIntro(); playText(.2); return; }
    vid.currentTime = 0; const p = vid.play(); if (p && p.catch) p.catch(finishIntro);
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
  ht.to('.hero-title', { opacity: 0, y: -80, filter: 'blur(8px)', duration: D * .35 }, 0)
    .to('.hero-sub', { opacity: 0, duration: D * .2 }, 0)
    .to('.hero-vignette', { opacity: 1, duration: D }, 0)
    .to('.hero-media', { opacity: 0, duration: .1, ease: 'power1.in' }, D)
    .fromTo(stChars, { opacity: 0, filter: 'blur(6px)' }, { opacity: 1, filter: 'blur(0px)', stagger: .004, duration: .05, ease: 'none' }, D + .07)
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
  const hl = splitChars($('[data-highlight]'));
  gsap.to(hl, { keyframes: { color: ['rgba(242,241,237,.18)', '#c0392b', '#F2F1ED'] }, stagger: .02, ease: 'none',
    scrollTrigger: { trigger: '.svc-intro', start: 'top 70%', end: 'center 40%', scrub: true } });
  gsap.fromTo('.svc-intro-media img', { yPercent: -10 }, { yPercent: 10, ease: 'none', scrollTrigger: { trigger: '.svc-intro-media', scrub: true } });
  gsap.from('.svc-intro-media', { clipPath: 'inset(100% 0 0 0)', duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: '.svc-intro-media', start: 'top 85%' } });

  // ---------- services split screen ----------
  const svcImgs = $$('.svc-media-sticky img');
  $$('.svc').forEach((s, i) => {
    gsap.from(s.children, { y: 50, opacity: 0, stagger: .08, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: s, start: 'top 60%' } });
    if (desktop && i > 0) gsap.fromTo(svcImgs[i], { clipPath: 'inset(100% 0 0 0)', scale: 1.2 }, { clipPath: 'inset(0% 0 0 0)', scale: 1, ease: 'none', scrollTrigger: { trigger: s, start: 'top bottom', end: 'top top', scrub: true } });
  });

  // ---------- "standard stops here" ----------
  const et = gsap.timeline({ scrollTrigger: { trigger: '.ends', start: 'top top', end: 'bottom bottom', scrub: true } });
  et.fromTo('.ends-img', { width: desktop ? '46vw' : '84vw', height: desktop ? '56vh' : '46vh' }, { width: '100vw', height: '100vh', ease: 'power1.inOut', duration: .5 }, 0)
    .fromTo('.ends-img img', { scale: 1.2 }, { scale: 1, duration: .5 }, 0)
    .to('.ends-word', { opacity: 0, scale: .9, duration: .2 }, .45)
    .to('.ends-img img', { filter: 'brightness(.35)', duration: .2 }, .5)
    .fromTo('.ends-copy', { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: .25 }, .6)
    .to({}, { duration: .2 });

  // ---------- features / cta ----------
  $$('.feature').forEach(f => {
    gsap.fromTo($('.feature-img', f), { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: f, scrub: true } });
    const w = splitLines($('h2', f));
    gsap.from(w, { yPercent: 110, stagger: .06, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: f, start: 'top 55%' } });
    gsap.from([$('p', f), $('.btn', f)], { opacity: 0, y: 30, stagger: .1, duration: 1.2, ease: 'expo.out', delay: .2, scrollTrigger: { trigger: f, start: 'top 55%' } });
  });
  const cw = splitLines($('.cta h2'));
  gsap.from(cw, { yPercent: 110, stagger: .08, duration: 1.5, ease: 'expo.out', scrollTrigger: { trigger: '.cta', start: 'top 55%' } });
  gsap.fromTo('.cta-bg img', { scale: 1.5 }, { scale: 1.2, ease: 'none', scrollTrigger: { trigger: '.cta', scrub: true } });
  gsap.from('.ftr-nav a', { yPercent: 60, opacity: 0, stagger: .08, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.ftr', start: 'top 80%' } });

  addEventListener('load', () => ScrollTrigger.refresh());
})();
