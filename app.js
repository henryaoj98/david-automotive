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

  // ---------- gate ----------
  const heroTitle = splitLines($('.hero-title'));
  gsap.set(heroTitle, { yPercent: 110 }); gsap.set('.hero-sub', { opacity: 0, y: 20 });
  const enter = () => {
    $('#gate').classList.add('out'); body.classList.remove('is-gated'); lenis.start(); scrollTo(0, 0);
    gsap.to(heroTitle, { yPercent: 0, duration: 1.6, ease: 'expo.out', stagger: .06, delay: .35 });
    gsap.to('.hero-sub', { opacity: 1, y: 0, duration: 1.4, ease: 'expo.out', delay: .9 });
  };
  $$('[data-enter]').forEach(b => b.addEventListener('click', enter));

  // ---------- hero → statement ----------
  const stChars = splitChars($('.hero-statement'));
  const ht = gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom bottom', scrub: true } });
  ht.to('.hero-title', { opacity: 0, y: -80, filter: 'blur(8px)', duration: .25 }, 0)
    .to('.hero-sub', { opacity: 0, duration: .15 }, 0)
    .fromTo(stChars, { opacity: 0, filter:'blur(6px)' }, { opacity: 1, filter:'blur(0px)', stagger: .008, duration: .08, ease: 'none' }, .2)
    .to('.hero-statement', { opacity: 0, y: -60, duration: .15 }, .85);

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
