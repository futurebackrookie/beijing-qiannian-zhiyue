/* ==========================================================================
   北京 · 千年之约 — 交互
   顺序：工具 → 渲染各区块 DOM → 全局（Lenis / 鼠标 / 目录 / BGM / 粒子 / 图片）
         → 各区块动画 → 加载遮罩与开场
   ========================================================================== */
(function () {
  'use strict';

  const D = window.BJ_DATA;
  const U = window.BJ_UTILS;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const isNarrow = () => window.matchMedia('(max-width: 768px)').matches;
  const isTouch = () => window.matchMedia('(hover: none)').matches;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CN_NUM = ['壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];

  gsap.registerPlugin(ScrollTrigger);

  /* 图片地址：本地 sd/hd，远程作为后备 */
  /* 图片扩展名。源码默认 .jpg；scripts/build-deploy.sh 生成精简发布版时会
     把它替换成 .webp（体积约为 JPEG 的 40%，画质更好），两种构建共用同一份源码。 */
  const IMG_EXT = 'webp';
  /* 是否存在 images/hd/ 大图目录。精简发布版会由构建脚本改为 false，
     避免在 ≥2560px 屏幕上请求并不存在的大图。 */
  const HAS_HD = false;
  const IMG = (key) => ({
    sd: `images/sd/${key}.${IMG_EXT}`,
    hd: `images/hd/${key}.${IMG_EXT}`,
    remote: D.images[key],
  });

  /* ------------------------------------------------------------------------
     渲染：从 data.js 生成各区块内容
     ------------------------------------------------------------------------ */
  function pic(key, alt, extra = '') {
    const s = IMG(key);
    return `<div class="pic ${extra}"><img alt="${alt}" data-sd="${s.sd}" data-hd="${s.hd}" data-remote="${s.remote}" loading="lazy" decoding="async"><div class="pic-fallback">${alt}</div></div>`;
  }

  function renderSeasons() {
    const wrap = $('.seasons-slides');
    wrap.innerHTML = D.seasons.map((s, i) => `
      <div class="season-slide" data-idx="${i}" data-particle="${s.particle}">
        <div class="season-img" data-bg="${s.imageKey}"></div>
        <div class="season-char">${s.name}</div>
        <div class="season-text">
          <span class="season-en">${s.en}</span>
          <h3>${s.title}</h3>
          <p>${s.text}</p>
        </div>
      </div>`).join('');
    $('.seasons-indicator').innerHTML = D.seasons.map((s, i) => `<span data-idx="${i}">${s.name}</span>`).join('');
  }

  function renderHistory() {
    const track = $('.timeline-track');
    track.insertAdjacentHTML('beforeend', D.timeline.map((t) => `
      <article class="era-card">
        <i class="era-dot"></i>
        <div class="era-year">${t.year}</div>
        <span class="era-tag">${t.era}</span>
        <h3>${t.title}</h3>
        <p>${t.story}</p>
        <div class="seal seal-sm era-seal"><span>${t.seal}</span></div>
      </article>`).join(''));
  }

  function renderAxis() {
    $('.axis-items').innerHTML = D.axis.map((a, i) => `
      <div class="axis-item">
        <i class="axis-dot"></i>
        ${pic(a.imageKey, a.name)}
        <div class="axis-text">
          <span class="axis-num">${CN_NUM[i]} · ${String(i + 1).padStart(2, '0')}</span>
          <h3>${a.name}</h3>
          <span class="axis-en">${a.en}</span>
          <p class="axis-note">${a.note}</p>
        </div>
      </div>`).join('');
  }

  function renderScenes() {
    $('.scene-grid').innerHTML = D.scenes.map((s, i) => `
      <div class="card" tabindex="0" role="button" aria-label="${s.name}">
        <div class="card-inner">
          <div class="card-face card-front">
            ${pic(s.imageKey, s.name)}
            <span class="card-idx">${CN_NUM[i]}景</span>
            <div class="card-name">${s.name}</div>
            <div class="card-en">${s.en}</div>
          </div>
          <div class="card-face card-back">
            <h3>${s.name}</h3>
            <span class="card-en">${s.en}</span>
            <p>${s.story}</p>
            <div class="card-meta">
              <div><b>门票</b>${s.ticket}</div>
              <div><b>最佳</b>${s.best}</div>
            </div>
            <div class="seal seal-sm"><span>京</span></div>
          </div>
        </div>
      </div>`).join('');
  }

  function renderDay() {
    $('.day-steps').innerHTML = D.day.map((d) => `
      <div class="day-step" data-tone="${d.bg}" data-ink="${d.ink}">
        ${pic(d.imageKey, d.title, 'day-pic')}
        <div class="day-info">
          <div class="day-time" data-time="${d.time}">00:00</div>
          <h3>${d.title}</h3>
          <p>${d.text}</p>
        </div>
      </div>`).join('');
  }

  function renderCredits() {
    $('.credits-list').innerHTML = D.credits.map((c) => `
      <li><a href="${c.page}" target="_blank" rel="noopener">${c.title}</a> <span>— ${c.author || '佚名'} · ${c.license}</span></li>`).join('');
    const btn = $('.credits-toggle'), list = $('.credits-list');
    btn.addEventListener('click', () => {
      const open = list.hidden;
      list.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? '收起' : '图片来源与署名';
      setTimeout(() => ScrollTrigger.refresh(), 50);
    });
  }

  /* ------------------------------------------------------------------------
     图片：进入视口前 1 屏开始加载，sd 先显示，hd 加载完无缝替换
     ------------------------------------------------------------------------ */
  const shouldLoadHD = () => {
    if (!HAS_HD) return false;
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    return innerWidth >= 2560 && !connection?.saveData && !/2g/.test(connection?.effectiveType || '');
  };

  function scheduleHD(task) {
    if (!shouldLoadHD()) return;
    const run = () => { if (!document.hidden) task(); };
    if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 2500 });
    else setTimeout(run, 900);
  }

  function loadInto(img, sd, hd, remote, onFirst) {
    let first = true;
    const done = () => { img.classList.add('loaded'); if (first) { first = false; onFirst && onFirst(); } };
    const tryHd = () => scheduleHD(() => {
      const pre = new Image();
      pre.onload = () => { img.src = hd; };
      pre.src = hd;
    });
    U.loadImageCandidates([sd, remote]).then(({ source }) => {
      img.onload = () => {
        img.onload = null;
        img.onerror = null;
        done();
        tryHd();
      };
      img.onerror = () => { img.closest('.pic')?.classList.add('failed'); };
      img.src = source;
    }).catch(() => { img.closest('.pic')?.classList.add('failed'); });
  }

  function initPics() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        io.unobserve(el);
        if (el.tagName === 'IMG') {
          loadInto(el, el.dataset.sd, el.dataset.hd, el.dataset.remote);
        } else {
          const s = IMG(el.dataset.bg);
          U.loadImageCandidates([s.sd, s.remote]).then(({ source }) => {
            el.style.backgroundImage = `url("${source}")`;
            el.classList.add('loaded');
            scheduleHD(() => {
              const hd = new Image();
              hd.onload = () => { el.style.backgroundImage = `url("${s.hd}")`; };
              hd.src = s.hd;
            });
          }).catch(() => el.classList.add('image-failed'));
        }
      });
    }, { rootMargin: '50% 0px' });
    $$('.pic img[data-sd]').forEach((img) => io.observe(img));
    $$('[data-bg]').forEach((el) => { if (!el.classList.contains('hero-bg')) io.observe(el); });
  }

  /* ------------------------------------------------------------------------
     Lenis 平滑滚动 + ScrollTrigger 同步
     ------------------------------------------------------------------------ */
  let lenis;
  function initLenis() {
    lenis = new Lenis({ lerp: 0.14, smoothWheel: !reduced, wheelMultiplier: 1 });
    window.lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    lenis.stop();
  }

  /* ------------------------------------------------------------------------
     自定义鼠标：朱砂点 + 拖尾圆环，悬停可点击元素变印章
     ------------------------------------------------------------------------ */
  function initCursor() {
    if (isTouch() || reduced) return;
    document.body.classList.add('has-cursor');
    const dot = $('#cursor'), ring = $('#cursor-ring');
    const dx = gsap.quickTo(dot, 'x', { duration: .04, ease: 'power2.out' });
    const dy = gsap.quickTo(dot, 'y', { duration: .04, ease: 'power2.out' });
    const rx = gsap.quickTo(ring, 'x', { duration: .16, ease: 'power2.out' });
    const ry = gsap.quickTo(ring, 'y', { duration: .16, ease: 'power2.out' });
    gsap.set([dot, ring], { x: innerWidth / 2, y: innerHeight / 2, opacity: 0 });
    let shown = false;
    const move = U.rafThrottle((x, y) => {
      if (!shown) { shown = true; gsap.to([dot, ring], { opacity: 1, duration: .4 }); }
      dx(x); dy(y); rx(x); ry(y);
    });
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      move(e.clientX, e.clientY);
    }, { passive: true });
    document.addEventListener('mouseleave', () => gsap.to([dot, ring], { opacity: 0, duration: .3 }));
    document.addEventListener('mouseenter', () => gsap.to([dot, ring], { opacity: 1, duration: .3 }));
    document.addEventListener('mouseover', (e) => {
      const t = e.target;
      if (t.closest('.seasons-stage')) { ring.classList.add('is-drag'); ring.classList.remove('is-seal'); return; }
      ring.classList.remove('is-drag');
      ring.classList.toggle('is-seal', !!t.closest('a, button, .card, .era-card, [role="button"]'));
    });
  }

  /* ------------------------------------------------------------------------
     卷轴目录 + 深色区块判断
     ------------------------------------------------------------------------ */
  function initNav() {
    const links = $$('[data-nav]');
    links.forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      const target = $(a.getAttribute('href'));
      if (!target) return;
      lenis.start();
      lenis.scrollTo(target, { duration: 1.8, easing: (t) => 1 - Math.pow(1 - t, 4) });
    }));
    $$('main > section').forEach((sec) => {
      ScrollTrigger.create({
        trigger: sec, start: 'top 50%', end: 'bottom 50%',
        onToggle: (self) => {
          if (!self.isActive) return;
          $$('.scroll-nav a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + sec.id));
          document.body.classList.toggle('on-dark', ['hero', 'seasons', 'food', 'terms', 'ending'].includes(sec.id));
        },
      });
    });
  }

  /* ------------------------------------------------------------------------
     BGM：优先播放本地《游京》，缺失时回退到 Web Audio 古琴
     ------------------------------------------------------------------------ */
  function initBGM() {
    const btn = $('#bgm-toggle');
    const audio = $('#bgm-audio');
    const label = $('.bgm-label', btn);
    const status = $('#bgm-status');
    let ctx, master, wet, noiseGain, timer = null, nextTime = 0, degree = 7;
    const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24]; // 两个八度的宫商角徵羽
    const BASE = 146.83; // D3

    function setup() {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0;
      master.connect(ctx.destination);
      // 延时混响
      const delay = ctx.createDelay(2); delay.delayTime.value = .34;
      const fb = ctx.createGain(); fb.gain.value = .42;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1600;
      wet = ctx.createGain(); wet.gain.value = .55;
      delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(wet); wet.connect(master);
      master._delay = delay;
      // 微风底噪
      const buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * .5;
      const noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = .6;
      const lfo = ctx.createOscillator(); lfo.frequency.value = .07;
      const lfoGain = ctx.createGain(); lfoGain.gain.value = 260;
      lfo.connect(lfoGain); lfoGain.connect(bp.frequency); lfo.start();
      noiseGain = ctx.createGain(); noiseGain.gain.value = .018;
      noise.connect(bp); bp.connect(noiseGain); noiseGain.connect(master); noise.start();
    }

    function pluck(freq, t, vel) {
      const o1 = ctx.createOscillator(); o1.type = 'triangle'; o1.frequency.value = freq;
      const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq * 2.01;
      const o3 = ctx.createOscillator(); o3.type = 'sine'; o3.frequency.value = freq * 3;
      const g2 = ctx.createGain(); g2.gain.value = .35;
      const g3 = ctx.createGain(); g3.gain.value = .12;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass';
      f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(500, t + 1.8);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(vel, t + .006);
      env.gain.exponentialRampToValueAtTime(vel * .35, t + .35);
      env.gain.exponentialRampToValueAtTime(.0001, t + 3.2);
      o1.connect(f); o2.connect(g2); g2.connect(f); o3.connect(g3); g3.connect(f);
      f.connect(env); env.connect(master); env.connect(master._delay);
      [o1, o2, o3].forEach((o) => { o.start(t); o.stop(t + 3.4); });
    }

    function schedule() {
      while (nextTime < ctx.currentTime + 1.2) {
        const r = Math.random();
        if (r < .22) { nextTime += .9 + Math.random() * 1.4; continue; } // 留白
        const step = [-2, -1, -1, 1, 1, 2, 3, -3][Math.floor(Math.random() * 8)];
        degree = Math.max(0, Math.min(SCALE.length - 1, degree + step));
        const freq = BASE * Math.pow(2, SCALE[degree] / 12);
        const vel = .16 + Math.random() * .12;
        pluck(freq, nextTime, vel);
        if (Math.random() < .28) { // 倚音 / 双音
          const d2 = Math.max(0, degree - 2 - Math.floor(Math.random() * 2));
          pluck(BASE * Math.pow(2, SCALE[d2] / 12), nextTime + .07, vel * .6);
        }
        nextTime += [.5, .75, 1, 1, 1.5, 2][Math.floor(Math.random() * 6)];
      }
    }

    async function startSynth() {
      if (!ctx) setup();
      if (ctx.state === 'suspended') await ctx.resume();
      nextTime = ctx.currentTime + .1;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(.9, ctx.currentTime, .6);
      schedule();
      clearInterval(timer);
      timer = setInterval(schedule, 400);
    }

    function stopSynth() {
      clearInterval(timer);
      timer = null;
      if (ctx && master) master.gain.setTargetAtTime(0, ctx.currentTime, .4);
    }

    const controller = U.createAudioToggle({
      audio,
      fallback: { start: startSynth, stop: stopSynth },
      onState: ({ playing, mode }) => {
        const usingTrack = mode === 'track';
        btn.setAttribute('aria-pressed', String(playing));
        label.textContent = usingTrack ? '游京' : '古琴';
        if (playing && usingTrack) {
          btn.title = '';
          btn.setAttribute('aria-label', '暂停《游京》');
          status.textContent = '正在播放《游京》';
        } else if (playing) {
          btn.setAttribute('aria-label', '暂停合成古琴');
          btn.title = '未找到网页可播放的《游京》音频，已使用合成古琴';
          status.textContent = '《游京》音频不可播放，已改用合成古琴';
        } else {
          btn.setAttribute('aria-label', usingTrack ? '播放《游京》' : '播放合成古琴');
          status.textContent = '背景音乐已暂停';
        }
      },
    });

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      status.textContent = '正在准备背景音乐';
      try {
        await controller.toggle();
      } catch (error) {
        btn.setAttribute('aria-pressed', 'false');
        label.textContent = '音乐';
        status.textContent = '背景音乐暂时无法播放';
      } finally {
        btn.disabled = false;
      }
    });
  }

  /* ------------------------------------------------------------------------
     粒子：花瓣 / 荷风光点 / 银杏 / 雪 / 星
     ------------------------------------------------------------------------ */
  const Particles = (() => {
    const canvas = $('#particles');
    const ctx = canvas.getContext('2d');
    const clock = U.createFrameClock(30);
    let W = 0, H = 0, dpr = 1, kind = 'none', list = [], raf = null;
    const KINDS = {
      petal:  { n: 34, color: [242, 184, 198], vy: [.35, .9], vx: [-.25, .25], size: [5, 9], spin: .03, dir: 1 },
      lotus:  { n: 26, color: [236, 224, 170], vy: [-.25, -.08], vx: [-.15, .15], size: [1.5, 3.5], spin: 0, dir: -1, glow: true },
      ginkgo: { n: 32, color: [232, 185, 35], vy: [.5, 1.2], vx: [-.4, .4], size: [7, 13], spin: .04, dir: 1 },
      snow:   { n: 64, color: [255, 255, 255], vy: [.4, 1.3], vx: [-.2, .2], size: [1.2, 3.6], spin: 0, dir: 1 },
      star:   { n: 56, color: [255, 245, 210], vy: [0, 0], vx: [0, 0], size: [.6, 1.8], spin: 0, dir: 0, twinkle: true },
    };
    const rnd = (a, b) => a + Math.random() * (b - a);

    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = innerWidth; H = innerHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function spawn(k, anywhere) {
      const c = KINDS[k];
      const p = {
        k, x: rnd(0, W), size: rnd(...c.size), vx: rnd(...c.vx), vy: rnd(...c.vy),
        rot: rnd(0, Math.PI * 2), spin: rnd(-c.spin, c.spin), sway: rnd(0, Math.PI * 2), swayV: rnd(.008, .02),
        a: 0, target: rnd(.5, .95), dying: false, tw: rnd(0, Math.PI * 2),
      };
      if (c.dir === 0 || anywhere) p.y = rnd(0, H);
      else p.y = c.dir > 0 ? -20 : H + 20;
      return p;
    }
    function draw(p) {
      const c = KINDS[p.k];
      const [r, g, b] = c.color;
      let alpha = p.a;
      if (c.twinkle) alpha *= .55 + .45 * Math.sin(p.tw);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      if (c.glow) { ctx.shadowColor = `rgba(${r},${g},${b},.9)`; ctx.shadowBlur = 10; }
      ctx.beginPath();
      if (p.k === 'petal') {
        ctx.ellipse(0, 0, p.size, p.size * .62, 0, 0, Math.PI * 2);
      } else if (p.k === 'ginkgo') {
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, p.size, Math.PI * .62, Math.PI * 1.38, false);
        ctx.closePath();
      } else {
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.restore();
    }
    function tick(now) {
      if (document.hidden) { raf = null; return; }
      const step = clock.step(now);
      if (!step) { raf = requestAnimationFrame(tick); return; }
      ctx.clearRect(0, 0, W, H);
      const want = kind === 'none' ? 0 : Math.round(KINDS[kind].n * (isNarrow() ? .5 : 1));
      let alive = 0;
      for (const p of list) if (!p.dying) alive++;
      if (alive < want && Math.random() < 1 - Math.pow(.65, step)) list.push(spawn(kind, false));
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        const c = KINDS[p.k];
        if (p.dying) p.a -= .012 * step; else if (p.a < p.target) p.a += .01 * step;
        p.sway += p.swayV * step; p.tw += .04 * step;
        p.x += (p.vx + Math.sin(p.sway) * .5 * (c.dir ? 1 : 0)) * step;
        p.y += p.vy * step; p.rot += p.spin * step;
        if (p.a <= 0 || p.y > H + 30 || p.y < -30 || p.x < -30 || p.x > W + 30) { list.splice(i, 1); continue; }
        draw(p);
      }
      if (list.length || kind !== 'none') raf = requestAnimationFrame(tick);
      else { raf = null; clock.reset(); }
    }
    function start() {
      if (!raf && !document.hidden && (list.length || kind !== 'none')) {
        clock.reset();
        raf = requestAnimationFrame(tick);
      }
    }
    function set(k) {
      if (reduced) return;
      if (k === kind) return;
      kind = k;
      list.forEach((p) => { p.dying = true; });
      if (kind !== 'none') {
        const c = KINDS[kind];
        const n = Math.round(c.n * (isNarrow() ? .5 : 1) * .6);
        for (let i = 0; i < n; i++) list.push(spawn(kind, true));
      }
      start();
    }
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && raf) {
        cancelAnimationFrame(raf);
        raf = null;
        clock.reset();
      } else start();
    });
    resize();
    return { set };
  })();
  function initParticles(kind) { Particles.set(kind); }

  /* ------------------------------------------------------------------------
     ① 开场卷轴
     ------------------------------------------------------------------------ */
  function initHero() {
    const stage = $('.hero-stage'), bg = $('.hero-bg');
    // 鼠标视差
    if (!isTouch() && !reduced) {
      const m1x = gsap.quickTo('.mist-1', 'x', { duration: 1.2, ease: 'power2' });
      const m1y = gsap.quickTo('.mist-1', 'y', { duration: 1.2, ease: 'power2' });
      const m2x = gsap.quickTo('.mist-2', 'x', { duration: 1.6, ease: 'power2' });
      const m2y = gsap.quickTo('.mist-2', 'y', { duration: 1.6, ease: 'power2' });
      const bx = gsap.quickTo(bg, 'x', { duration: 2, ease: 'power2' });
      const by = gsap.quickTo(bg, 'y', { duration: 2, ease: 'power2' });
      const parallax = U.rafThrottle((x, y) => {
        const nx = (x / innerWidth - .5), ny = (y / innerHeight - .5);
        m1x(nx * 60); m1y(ny * 40); m2x(-nx * 80); m2y(-ny * 50); bx(-nx * 16); by(-ny * 10);
      });
      stage.addEventListener('pointermove', (e) => {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        parallax(e.clientX, e.clientY);
      }, { passive: true });
    }
    // 滚动：背景推近变暗，文字上浮淡出
    gsap.timeline({ scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom bottom', scrub: true } })
      .to(bg, { scale: 1.24, ease: 'none' }, 0)
      .to('.hero-content', { y: -80, ease: 'none' }, 0)
      .to('.hero-content, .scroll-hint', { opacity: 0, ease: 'none', duration: .45 }, .3)
      .to('.hero-dim', { opacity: .78, ease: 'none', duration: .6 }, .4)
      .to('.mist, .hero-wash', { opacity: 0, ease: 'none', duration: .5 }, .4);
  }

  function heroIntro() {
    const tl = gsap.timeline({ defaults: { ease: 'power3.inOut' } });
    const half = innerWidth / 2;
    tl.to('.hero-cover.left', { scaleX: 0, duration: 2 }, 0)
      .to('.hero-cover.right', { scaleX: 0, duration: 2 }, 0)
      .to('.hero-roller.left', { x: -half + 8, duration: 2 }, 0)
      .to('.hero-roller.right', { x: half - 8, duration: 2 }, 0)
      .to('.mist', { opacity: 1, duration: 2, ease: 'power2.out' }, .8)
      .to('.hero-char', { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.1, stagger: .28, ease: 'power3.out' }, 1.2)
      .to('.hero-seal', { opacity: 1, scale: 1, duration: .55, ease: 'power4.in' }, 2.2)
      .to('.hero-seal', { rotate: -3, duration: .12, yoyo: true, repeat: 1, ease: 'power1.inOut' }, 2.75)
      .to('.hero-sub', { opacity: 1, duration: 1, ease: 'power2.out' }, 2.5)
      .to('.hero-en', { opacity: 1, duration: 1, ease: 'power2.out' }, 2.8)
      .to('.scroll-hint', { opacity: 1, duration: 1, ease: 'power2.out' }, 3.2)
      .add(() => lenis.start(), 1.6);
    return tl;
  }

  /* ------------------------------------------------------------------------
     ② 四季北京
     ------------------------------------------------------------------------ */
  function initSeasons() {
    const slides = $$('.season-slide');
    const ind = $$('.seasons-indicator span');
    const HOLD = 1, TRANS = .7;
    const tl = gsap.timeline({ defaults: { ease: 'none' } });
    const holdStart = [];
    let t = 0;
    slides.forEach((s, i) => {
      const img = $('.season-img', s), ch = $('.season-char', s), tx = $('.season-text', s);
      if (i === 0) {
        gsap.set([ch, tx], { opacity: 1 });
        tl.fromTo(img, { scale: 1.12 }, { scale: 1.0, duration: HOLD + TRANS }, 0);
        holdStart.push(0);
        t = HOLD;
        return;
      }
      const prev = slides[i - 1];
      tl.fromTo(s, { xPercent: 105 }, { xPercent: 0, force3D: true, duration: TRANS }, t)
        .fromTo(img, { scale: 1.14 }, { scale: 1.0, duration: TRANS + HOLD }, t)
        .to([$('.season-char', prev), $('.season-text', prev)], { opacity: 0, y: -30, duration: TRANS * .5 }, t)
        .fromTo(ch, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: TRANS * .6 }, t + TRANS * .4)
        .fromTo(tx, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: TRANS * .6 }, t + TRANS * .5);
      t += TRANS;
      holdStart.push(t);
      t += HOLD;
    });
    const total = tl.duration();
    let current = -1;
    const st = ScrollTrigger.create({
      trigger: '#seasons', start: 'top top', end: 'bottom bottom', scrub: .4, animation: tl,
      onUpdate: (self) => {
        if (!self.isActive) return;
        const time = self.progress * total;
        let idx = 0;
        holdStart.forEach((h, i) => { if (time >= h - TRANS * .5) idx = i; });
        if (idx !== current) {
          current = idx;
          ind.forEach((el, i) => el.classList.toggle('active', i === idx));
          initParticles(slides[idx].dataset.particle);
        }
      },
      onLeave: () => initParticles('none'),
      onLeaveBack: () => initParticles('none'),
      onEnter: () => { current = -1; },
      onEnterBack: () => { current = -1; },
    });
    // 指示器点击 & 横向拖动切换
    const goTo = (i) => {
      const p = (holdStart[i] + HOLD * .5) / total;
      lenis.scrollTo(st.start + p * (st.end - st.start), { duration: 1.4 });
    };
    ind.forEach((el, i) => el.addEventListener('click', () => goTo(i)));
    const stage = $('.seasons-stage');
    let x0 = null;
    stage.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
    stage.addEventListener('pointerup', (e) => {
      if (x0 === null) return;
      const dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) < 80) return;
      goTo(Math.max(0, Math.min(slides.length - 1, current + (dx < 0 ? 1 : -1))));
    });
  }

  /* ------------------------------------------------------------------------
     ③ 八百年建都史（横向长河）
     ------------------------------------------------------------------------ */
  function initHistory() {
    const track = $('.timeline-track'), cards = $$('.era-card');
    const eraBg = $('.history-era-bg'), lineFill = $('.timeline-line i'), progress = $('.history-progress i');
    let active = -1, pendingCh = null, fading = false;
    let timelineDistance = 0, cardCenters = [];
    const showEra = (ch) => {
      pendingCh = ch;
      if (fading || eraBg.textContent === ch) return;
      fading = true;
      gsap.to(eraBg, { opacity: 0, duration: .25, onComplete: () => {
        eraBg.textContent = pendingCh;
        gsap.to(eraBg, { opacity: 1, duration: .5, onComplete: () => { fading = false; if (pendingCh !== eraBg.textContent) showEra(pendingCh); } });
      } });
    };
    const setActive = (i) => {
      if (i === active) return;
      active = i;
      cards.forEach((c, j) => c.classList.toggle('active', j === i));
      showEra(D.timeline[i].era.replace(/\s*·\s*/g, '')[0]);
    };
    const measureHistory = () => {
      timelineDistance = Math.max(0, track.scrollWidth - innerWidth);
      cardCenters = cards.map((card) => card.offsetLeft + card.offsetWidth / 2);
    };
    const pickActiveDesktop = (p) => {
      const target = innerWidth * .55 + timelineDistance * p;
      setActive(U.nearestIndex(cardCenters, target));
    };
    const pickActiveMobile = () => {
      let best = 0, bd = Infinity;
      cards.forEach((c, i) => {
        const r = c.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - innerHeight / 2);
        if (d < bd) { bd = d; best = i; }
      });
      setActive(best);
    };
    ScrollTrigger.matchMedia({
      '(min-width: 769px)': () => {
        measureHistory();
        gsap.to(track, {
          x: () => -timelineDistance, ease: 'none',
          onUpdate: function () {
            const p = this.progress();
            lineFill.style.transform = `scaleX(${p})`;
            progress.style.transform = `scaleX(${p})`;
            pickActiveDesktop(p);
          },
          scrollTrigger: {
            trigger: '#history', start: 'top top', end: 'bottom bottom', scrub: .5,
            invalidateOnRefresh: true, onRefresh: measureHistory,
          },
        });
      },
      '(max-width: 768px)': () => {
        cards.forEach((c) => c.classList.add('reveal'));
        ScrollTrigger.create({ trigger: '#history', start: 'top bottom', end: 'bottom top', onUpdate: pickActiveMobile });
      },
    });
    setActive(0);
  }

  /* ------------------------------------------------------------------------
     ④ 中轴线
     ------------------------------------------------------------------------ */
  function initAxis() {
    gsap.to('.axis-line i', {
      scaleY: 1, ease: 'none',
      scrollTrigger: { trigger: '.axis-wrap', start: 'top 60%', end: 'bottom 60%', scrub: .3 },
    });
    $$('.axis-item').forEach((item) => {
      ScrollTrigger.create({
        trigger: item, start: 'top 62%',
        onEnter: () => item.classList.add('lit'),
        onLeaveBack: () => item.classList.remove('lit'),
      });
    });
  }

  /* ------------------------------------------------------------------------
     ⑤ 京城七景：进场 + 悬停翻面 + 鼠标倾斜
     ------------------------------------------------------------------------ */
  function initScenes() {
    const cards = $$('.card');
    ScrollTrigger.batch(cards, {
      start: 'top 88%',
      onEnter: (batch) => batch.forEach((c, i) => setTimeout(() => c.classList.add('in'), i * 110)),
    });
    cards.forEach((card) => {
      if (isTouch()) {
        card.addEventListener('click', () => card.classList.toggle('flipped'));
        return;
      }
      let rect = null;
      const tilt = U.rafThrottle((x, y) => {
        if (!rect) return;
        const px = (x - rect.left) / rect.width - .5, py = (y - rect.top) / rect.height - .5;
        card.classList.add('is-tilting');
        card.style.setProperty('--ry', (px * 14) + 'deg');
        card.style.setProperty('--rx', (-py * 14) + 'deg');
      });
      card.addEventListener('pointerenter', () => { rect = card.getBoundingClientRect(); }, { passive: true });
      card.addEventListener('pointermove', (e) => {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        tilt(e.clientX, e.clientY);
      }, { passive: true });
      card.addEventListener('pointerleave', () => {
        rect = null;
        card.classList.remove('is-tilting');
        card.style.setProperty('--ry', '0deg');
        card.style.setProperty('--rx', '0deg');
      });
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.classList.toggle('flipped'); } });
    });
  }

  /* ------------------------------------------------------------------------
     ⑥ 老北京的一天：背景色温随滚动由晨到夜
     ------------------------------------------------------------------------ */
  function initDay() {
    const day = $('#day');
    const steps = $$('.day-step');
    const apply = (step) => {
      gsap.to(day, { backgroundColor: step.dataset.tone, color: step.dataset.ink, duration: 1.2, ease: 'power2.out' });
      const night = step.dataset.tone === '#0b0f1a';
      document.body.classList.toggle('on-dark', night);
      initParticles(night ? 'star' : 'none');
    };
    const scramble = (el) => {
      const target = el.dataset.time; if (el.dataset.done) return; el.dataset.done = '1';
      let n = 0;
      const iv = setInterval(() => {
        n++;
        el.textContent = target.split('').map((c, i) => (c === ':' ? ':' : (n > 10 + i * 2 ? c : String(Math.floor(Math.random() * 10))))).join('');
        if (n > 20) { clearInterval(iv); el.textContent = target; }
      }, 45);
    };
    steps.forEach((step) => {
      const img = $('img', step), info = $('.day-info', step);
      gsap.set(info, { opacity: 0, y: 40 });
      ScrollTrigger.create({
        trigger: step, start: 'top 55%', end: 'bottom 45%',
        onEnter: () => { apply(step); gsap.to(info, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }); scramble($('.day-time', step)); },
        onEnterBack: () => apply(step),
      });
      gsap.fromTo(img, { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: step, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    // 向上离开本区块时恢复（向下进入结尾时由结尾接管星空）
    ScrollTrigger.create({
      trigger: day, start: 'top bottom', end: 'bottom top',
      onLeaveBack: () => { initParticles('none'); document.body.classList.remove('on-dark'); },
    });
  }

  /* ------------------------------------------------------------------------
     ⑦ 结尾：逐字浮现 + 印章落下
     ------------------------------------------------------------------------ */
  function initEnding() {
    const title = $('.ending-title');
    title.innerHTML = title.textContent.split('').map((c) => `<span>${c === ' ' ? '&nbsp;' : c}</span>` + (c === '，' ? '<i class="br"></i>' : '')).join('');
    const flash = document.createElement('div'); flash.className = 'ending-flash';
    $('#ending').prepend(flash);
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
    tl.to('.ending-title span', { opacity: 1, y: 0, filter: 'blur(0px)', duration: .9, stagger: .07 }, 0)
      .to('.ending-seal', { opacity: 1, scale: 1, duration: .5, ease: 'power4.in' }, .9)
      .to(flash, { opacity: .18, duration: .08 }, 1.38)
      .to(flash, { opacity: 0, duration: .8 }, 1.46)
      .to('.ending-seal', { rotate: -3, duration: .1, yoyo: true, repeat: 1 }, 1.4)
      .to('.ending-sub', { opacity: 1, duration: 1 }, 1.7);
    ScrollTrigger.create({ trigger: '#ending', start: 'top 55%', onEnter: () => tl.play(), onLeaveBack: () => tl.reverse() });
    ScrollTrigger.create({ trigger: '#ending', start: 'top 80%', onEnter: () => initParticles('star'), onLeaveBack: () => initParticles('star') });
    gsap.fromTo('.ending-mountains .m1', { y: 60 }, { y: 0, ease: 'none', scrollTrigger: { trigger: '#ending', start: 'top bottom', end: 'bottom bottom', scrub: true } });
    gsap.fromTo('.ending-mountains .m2', { y: 30 }, { y: 0, ease: 'none', scrollTrigger: { trigger: '#ending', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  }


  /* ------------------------------------------------------------------------
     ⑥ 京味儿 · 美食：筛选 / 弹窗 / 盖章 / 点单
     ------------------------------------------------------------------------ */
  const CAT_NAME = { main: '硬菜', snack: '小吃', sweet: '甜点', drink: '饮品' };
  const courageHtml = (n) => `<span class="food-courage">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 私密模式等 */ } },
  };

  function renderFood() {
    $('.food-grid').innerHTML = D.foods.map((f) => `
      <button class="food-card" type="button" data-key="${f.key}" data-cat="${f.cat}" aria-label="${f.name}">
        ${pic(f.key, f.name)}
        <div class="food-stamp-mark seal seal-sm"><span>尝</span></div>
        <div class="food-card-body">
          <div class="food-card-name">${f.name}</div>
          <span class="food-card-en">${f.en}</span>
          <div class="food-card-meta">${courageHtml(f.courage)}<span class="food-when">${f.when}</span></div>
        </div>
      </button>`).join('');
    $('.food-stamps-grid').innerHTML = D.foods.map((f) => `<div class="food-stamp" data-key="${f.key}" title="${f.name}"><div class="seal seal-sm"><span>${f.name[0]}</span></div></div>`).join('');
    const names = D.foodMore.map((n) => `<span>${n}</span>`).join('');
    $('.food-marquee-track').innerHTML = names + names;
  }

  function initFood() {
    const tasted = new Set(store.get('bj_tasted', []));
    const cards = $$('.food-card');
    const countEl = $('.food-stamps-count b');
    const master = $('.food-master');
    const REACT = {
      5: ['……您先缓缓。这味儿，北京人管它叫「地道」。', '第一口皱眉，第三口上瘾——这是豆汁儿的规矩。'],
      4: ['够劲儿！这口下去，算半个北京人了。', '有人爱到不行，有人绕道走。您是哪一种？'],
      3: ['有点儿冲，但越吃越香，对吧？', '老北京的味道，就是要有点儿性格。'],
      2: ['地道！这才是北京的味儿。', '再配一碗小米粥，齐活儿。'],
      1: ['好吃！再来一份也不过分。', '得嘞，这道菜您算是尝对了。'],
    };
    const syncStamps = () => {
      cards.forEach((c) => c.classList.toggle('tasted', tasted.has(c.dataset.key)));
      $$('.food-stamp').forEach((st) => st.classList.toggle('on', tasted.has(st.dataset.key)));
      countEl.textContent = tasted.size;
      master.classList.toggle('on', tasted.size >= 10);
    };
    syncStamps();
    // 进场
    ScrollTrigger.batch(cards, { start: 'top 90%', onEnter: (b) => b.forEach((c, i) => setTimeout(() => c.classList.add('in'), i * 70)) });
    // 筛选
    $$('.food-tab').forEach((tab) => tab.addEventListener('click', () => {
      $$('.food-tab').forEach((t) => t.classList.toggle('active', t === tab));
      const cat = tab.dataset.cat;
      cards.forEach((c) => { const show = cat === 'all' || c.dataset.cat === cat; c.classList.toggle('hide', !show); if (show) c.classList.add('in'); });
      ScrollTrigger.refresh();
    }));
    // 弹窗
    const modal = $('.food-modal'), picWrap = $('.food-modal-pic'), tasteBtn = $('.food-taste'), reaction = $('.food-reaction');
    let current = null;
    const open = (f) => {
      current = f;
      const s = IMG(f.key);
      picWrap.innerHTML = `<img alt="${f.name}" decoding="async"><div class="pic-fallback">${f.name}</div>`;
      picWrap.classList.remove('failed');
      loadInto($('img', picWrap), s.sd, s.hd, s.remote);
      $('.food-modal-cat').textContent = CAT_NAME[f.cat];
      $('.food-modal-name').textContent = f.name;
      $('.food-modal-en').textContent = f.en;
      $('.food-modal-meta').innerHTML = `${courageHtml(f.courage)}<span class="food-when">${f.when}</span>`;
      $('.food-modal-story').textContent = f.story;
      $('.food-modal-where').textContent = f.where;
      reaction.textContent = '';
      const done = tasted.has(f.key);
      tasteBtn.disabled = done; tasteBtn.textContent = done ? '已盖章' : '尝一口';
      modal.hidden = false;
      document.body.classList.add('modal-open');
      lenis.stop();
      gsap.fromTo('.food-modal-card', { y: 40, opacity: 0, scale: .98 }, { y: 0, opacity: 1, scale: 1, duration: .6, ease: 'power3.out' });
      gsap.fromTo('.food-modal-backdrop', { opacity: 0 }, { opacity: 1, duration: .4 });
    };
    const close = () => {
      gsap.to('.food-modal-card', { y: 30, opacity: 0, duration: .3, ease: 'power2.in' });
      gsap.to('.food-modal-backdrop', { opacity: 0, duration: .3, onComplete: () => { modal.hidden = true; document.body.classList.remove('modal-open'); lenis.start(); } });
    };
    cards.forEach((c) => c.addEventListener('click', () => open(D.foods.find((f) => f.key === c.dataset.key))));
    $('.food-modal-close').addEventListener('click', close);
    $('.food-modal-backdrop').addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) close(); });
    tasteBtn.addEventListener('click', () => {
      if (!current || tasted.has(current.key)) return;
      tasted.add(current.key); store.set('bj_tasted', [...tasted]);
      const list = REACT[current.courage] || REACT[1];
      reaction.textContent = list[Math.floor(Math.random() * list.length)];
      tasteBtn.disabled = true; tasteBtn.textContent = '已盖章';
      gsap.fromTo(reaction, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .5 });
      syncStamps();
      if (tasted.size === 10) gsap.fromTo(master, { rotate: -20 }, { rotate: -8, duration: .6, ease: 'elastic.out(1, .4)' });
    });
    // 帮我点单
    const menu = $('.food-menu'), list = $('.food-menu-list');
    const pick = (fn) => { const pool = D.foods.filter(fn); return pool[Math.floor(Math.random() * pool.length)]; };
    const order = () => {
      const picks = [
        ['早饭', pick((f) => f.when.includes('早') && f.cat !== 'drink')],
        ['午饭', pick((f) => f.when.includes('午') && (f.cat === 'main' || f.cat === 'snack'))],
        ['晚饭', pick((f) => f.when.includes('晚') && f.cat === 'main')],
        ['零嘴', pick((f) => f.cat === 'sweet')],
        ['一口', pick((f) => f.cat === 'drink')],
      ];
      list.innerHTML = picks.map(([slot, f]) => `<li><b>${slot}</b><span>${f.name}</span><em>${f.where.split(' · ')[0]}</em></li>`).join('');
      menu.hidden = false;
      gsap.fromTo('.food-menu-paper', { opacity: 0, y: -20, rotate: -4 }, { opacity: 1, y: 0, rotate: -1.2, duration: .7, ease: 'power3.out' });
      gsap.fromTo('.food-menu-list li', { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: .5, stagger: .15, delay: .2 });
      ScrollTrigger.refresh();
    };
    $('.food-order').addEventListener('click', order);
    $('.food-menu-again').addEventListener('click', order);
  }

  /* ------------------------------------------------------------------------
     ⑦ 京剧脸谱：换色 + 眨眼「点睛」
     ------------------------------------------------------------------------ */
  function initOpera() {
    const svg = $('.opera-mask');
    const EMBLEM = { red: 'beard', black: 'beard emblem-moon', white: '', blue: 'emblem-cloud', yellow: 'emblem-fire', gold: 'emblem-eye' };
    $('.opera-swatches').innerHTML = D.masks.map((m) => `<button class="opera-swatch" type="button" data-key="${m.key}"><i style="background:${m.color}"></i>${m.name} · ${m.role}</button>`).join('');
    const btns = $$('.opera-swatch');
    let currentKey = null;
    const show = (key, animate = true) => {
      if (key === currentKey) return;
      currentKey = key;
      const m = D.masks.find((x) => x.key === key);
      btns.forEach((b) => b.classList.toggle('active', b.dataset.key === key));
      svg.style.setProperty('--m1', m.color);
      svg.style.setProperty('--m2', m.accent);
      svg.setAttribute('class', 'opera-mask ' + EMBLEM[key]);
      $('.opera-color-name').textContent = `${m.name} · ${m.trait.split(' · ')[0]}`;
      $('.opera-role').textContent = m.role;
      $('.opera-trait').textContent = m.trait;
      $('.opera-story').textContent = m.story;
      if (!animate) return;
      gsap.fromTo(svg, { scale: .96, rotate: -2 }, { scale: 1, rotate: 0, duration: .7, ease: 'elastic.out(1, .5)' });
      gsap.fromTo('.m-pupil', { scaleY: 1 }, { scaleY: .1, duration: .12, yoyo: true, repeat: 1, transformOrigin: '50% 50%', delay: .25 });
      gsap.fromTo('.opera-info > *', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .6, stagger: .08, ease: 'power3.out' });
    };
    btns.forEach((b) => b.addEventListener('click', () => show(b.dataset.key)));
    show('red', false);
    ScrollTrigger.create({ trigger: '#opera', start: 'top 60%', once: true, onEnter: () => {
      gsap.fromTo(svg, { opacity: 0, y: 40, scale: .9 }, { opacity: 1, y: 0, scale: 1, duration: 1.2, ease: 'power3.out' });
      gsap.fromTo('.m-pupil', { scaleY: .1 }, { scaleY: 1, duration: .3, transformOrigin: '50% 50%', delay: 1 });
    } });
  }

  /* ------------------------------------------------------------------------
     ⑧ 北京话考试
     ------------------------------------------------------------------------ */
  function initDialect() {
    const LET = ['甲', '乙', '丙', '丁'];
    const qWrap = $('.exam-q'), start = $('.exam-start'), result = $('.exam-result');
    const progress = $('.exam-progress b'), bar = $('.exam-bar i');
    let idx = 0, score = 0;
    const showQ = () => {
      const q = D.quiz[idx];
      progress.textContent = idx + 1;
      bar.style.width = ((idx) / D.quiz.length * 100) + '%';
      $('.exam-question').textContent = q.q;
      $('.exam-options').innerHTML = q.a.map((a, i) => `<button class="exam-opt" type="button" data-i="${i}"><b>${LET[i]}</b>${a}</button>`).join('');
      $('.exam-explain').hidden = true; $('.exam-next').hidden = true;
      gsap.fromTo('.exam-question, .exam-opt', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .5, stagger: .06, ease: 'power3.out' });
      $$('.exam-opt').forEach((btn) => btn.addEventListener('click', () => {
        const i = +btn.dataset.i;
        $$('.exam-opt').forEach((b) => { b.disabled = true; if (+b.dataset.i === q.c) b.classList.add('right'); });
        if (i === q.c) score++; else btn.classList.add('wrong');
        const ex = $('.exam-explain'); ex.hidden = false; ex.textContent = (i === q.c ? '答对了。' : '答错了。') + q.e;
        gsap.fromTo(ex, { opacity: 0 }, { opacity: 1, duration: .4 });
        const next = $('.exam-next'); next.hidden = false; next.textContent = idx === D.quiz.length - 1 ? '看成绩' : '下一题';
      }));
    };
    const finish = () => {
      qWrap.hidden = true; result.hidden = false;
      bar.style.width = '100%';
      $('.exam-score b').textContent = score;
      const grade = $('.exam-grade');
      let g, c;
      if (score >= 9) { g = '地道<br>北京人'; c = '您内，一听就是胡同儿里长大的。'; }
      else if (score >= 6) { g = '半个<br>北京人'; c = '差不离儿了，再喝两碗豆汁儿就齐了。'; }
      else { g = '外地<br>朋友'; c = '没关系，北京欢迎您——来了就是北京人。'; }
      $('span', grade).innerHTML = g;
      $('.exam-comment').textContent = c;
      grade.classList.remove('on');
      gsap.fromTo('.exam-score', { scale: .6, opacity: 0 }, { scale: 1, opacity: 1, duration: .6, ease: 'back.out(1.6)' });
      setTimeout(() => grade.classList.add('on'), 500);
      ScrollTrigger.refresh();
    };
    $('.exam-begin').addEventListener('click', () => { idx = 0; score = 0; start.hidden = true; result.hidden = true; qWrap.hidden = false; showQ(); ScrollTrigger.refresh(); });
    $('.exam-next').addEventListener('click', () => { idx++; if (idx >= D.quiz.length) finish(); else showQ(); });
    $('.exam-again').addEventListener('click', () => { idx = 0; score = 0; result.hidden = true; qWrap.hidden = false; showQ(); });
  }

  /* ------------------------------------------------------------------------
     ⑨ 二十四节气：可拖动的转盘
     ------------------------------------------------------------------------ */
  function initTerms() {
    const svg = $('.terms-wheel'), wrap = $('.terms-wheel-wrap');
    const N = D.terms.length, STEP = 360 / N, R = 300, C = 300;
    const pol = (r, deg) => { const a = (deg - 90) * Math.PI / 180; return [C + r * Math.cos(a), C + r * Math.sin(a)]; };
    let html = `<circle class="ring ring-outer" cx="${C}" cy="${C}" r="${R - 6}"/><circle class="ring" cx="${C}" cy="${C}" r="${R - 70}"/><circle class="ring" cx="${C}" cy="${C}" r="${R - 150}"/>`;
    D.terms.forEach((t, i) => {
      const deg = i * STEP;
      const [x1, y1] = pol(R - 6, deg), [x2, y2] = pol(R - (i % 6 === 0 ? 30 : 18), deg);
      html += `<line class="tick ${i % 6 === 0 ? 'major' : ''}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
      const [tx, ty] = pol(R - 48, deg);
      html += `<text data-i="${i}" x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="middle" transform="rotate(${deg} ${tx} ${ty})">${t.name}</text>`;
      for (let k = 1; k < 3; k++) { const [a1, b1] = pol(R - 6, deg + k * STEP / 3), [a2, b2] = pol(R - 11, deg + k * STEP / 3); html += `<line class="tick" x1="${a1}" y1="${b1}" x2="${a2}" y2="${b2}" opacity=".5"/>`; }
    });
    ['春', '夏', '秋', '冬'].forEach((sName, i) => { const [x, y] = pol(R - 110, i * 90 + 45); html += `<text class="season-label" x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle">${sName}</text>`; });
    svg.innerHTML = html;
    const labels = $$('text[data-i]', svg);
    // 今日节气
    const now = new Date(), y = now.getFullYear();
    let todayIdx = 0;
    D.terms.forEach((t, i) => { const dt = new Date(y, t.m - 1, t.d); if (t.m === 1) dt.setFullYear(y + (now.getMonth() === 0 ? 0 : 1)); });
    const order = D.terms.map((t, i) => ({ i, when: new Date(y, t.m - 1, t.d) })).sort((a, b) => a.when - b.when);
    let found = order[order.length - 1].i;
    for (const o of order) if (o.when <= now) found = o.i;
    todayIdx = found;
    let idx = todayIdx, angle = -idx * STEP;
    const apply = (i, animate = true) => {
      idx = ((i % N) + N) % N;
      const target = -idx * STEP;
      // 走最短路径
      const diff = ((target - angle + 540) % 360) - 180;
      angle += diff;
      gsap.to(svg, { rotate: angle, duration: animate ? .8 : 0, ease: 'power3.out', transformOrigin: '50% 50%' });
      labels.forEach((l) => l.classList.toggle('active', +l.dataset.i === idx));
      const t = D.terms[idx];
      $('.terms-name').textContent = t.name;
      $('.terms-date').textContent = `${String(t.m).padStart(2, '0')} / ${String(t.d).padStart(2, '0')} 前后`;
      $('.terms-today').textContent = idx === todayIdx ? '当前节气' : '';
      const cu = $('.terms-custom'); cu.textContent = t.custom;
      if (animate) gsap.fromTo(cu, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .5 });
    };
    apply(idx, false);
    $('.terms-prev').addEventListener('click', () => apply(idx - 1));
    $('.terms-next').addEventListener('click', () => apply(idx + 1));
    // 拖动
    let dragging = false, startA = 0, startAngle = 0;
    const angleOf = (e) => { const r = wrap.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI; };
    wrap.addEventListener('pointerdown', (e) => { dragging = true; startA = angleOf(e); startAngle = angle; wrap.setPointerCapture(e.pointerId); });
    wrap.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const a = startAngle + (angleOf(e) - startA);
      gsap.set(svg, { rotate: a, transformOrigin: '50% 50%' });
      const live = ((Math.round(-a / STEP) % N) + N) % N;
      labels.forEach((l) => l.classList.toggle('active', +l.dataset.i === live));
    });
    const endDrag = (e) => { if (!dragging) return; dragging = false; const a = startAngle + (angleOf(e) - startA); angle = a; apply(Math.round(-a / STEP)); };
    wrap.addEventListener('pointerup', endDrag); wrap.addEventListener('pointercancel', endDrag);
    ScrollTrigger.create({ trigger: '#terms', start: 'top 60%', once: true, onEnter: () => {
      gsap.fromTo(svg, { rotate: angle - 90, opacity: 0 }, { rotate: angle, opacity: 1, duration: 1.6, ease: 'power3.out', transformOrigin: '50% 50%' });
    } });
  }

  /* ------------------------------------------------------------------------
     ⑪ 行程规划器
     ------------------------------------------------------------------------ */
  function initPlanner() {
    const P = D.planner;
    $('.planner-interests').innerHTML = P.interests.map((it, i) => `<button class="planner-interest ${i < 2 ? 'active' : ''}" type="button" data-key="${it.key}"><i>${it.icon}</i>${it.name}</button>`).join('');
    $$('.planner-interest').forEach((b) => b.addEventListener('click', () => b.classList.toggle('active')));
    $$('.planner-day').forEach((b) => b.addEventListener('click', () => $$('.planner-day').forEach((x) => x.classList.toggle('active', x === b))));
    const out = $('.planner-days-out'), result = $('.planner-result');
    let lastPlan = [];
    const build = (shuffle) => {
      const days = +$('.planner-day.active').dataset.days;
      const wants = $$('.planner-interest.active').map((b) => b.dataset.key);
      const scored = P.templates.map((t) => ({ t, s: t.base + t.tags.filter((x) => wants.includes(x)).length * 2 + (shuffle ? Math.random() * 3 : 0) }))
        .sort((a, b) => b.s - a.s).map((x) => x.t);
      lastPlan = scored.slice(0, days);
      out.innerHTML = lastPlan.map((t, i) => `
        <div class="plan-day">
          <div class="plan-day-head"><span class="plan-day-num">第${['一', '二', '三'][i]}天</span><span class="plan-day-name">${t.name}</span></div>
          <ol class="plan-steps">${t.steps.map((st) => `<li class="plan-step tag-${st.tag}"><span class="plan-time">${st.t}</span><div><div class="plan-place">${st.place}</div><div class="plan-note">${st.note}</div></div></li>`).join('')}</ol>
        </div>`).join('');
      result.hidden = false;
      ScrollTrigger.refresh();
      $$('.plan-day').forEach((d, i) => setTimeout(() => d.classList.add('in'), 80 + i * 160));
      lenis.scrollTo(result, { offset: -80, duration: 1.2 });
    };
    $('.planner-go').addEventListener('click', () => build(false));
    $('.planner-shuffle').addEventListener('click', () => build(true));
    $('.planner-copy').addEventListener('click', async () => {
      const text = lastPlan.map((t, i) => `第${['一', '二', '三'][i]}天 · ${t.name}\n` + t.steps.map((s) => `  ${s.t}  ${s.place} —— ${s.note}`).join('\n')).join('\n\n');
      const btn = $('.planner-copy');
      try { await navigator.clipboard.writeText('北京行程\n\n' + text); btn.textContent = '已复制'; } catch (e) { btn.textContent = '复制失败'; }
      setTimeout(() => { btn.textContent = '复制行程'; }, 1600);
    });
  }

  /* ------------------------------------------------------------------------
     通用 .reveal 进场
     ------------------------------------------------------------------------ */
  function initReveal() {
    $$('.sec-head:not(.seasons-head):not(.history-head)').forEach((el) => el.classList.add('reveal'));
    ScrollTrigger.batch('.reveal', { start: 'top 85%', onEnter: (b) => b.forEach((el) => el.classList.add('in')) });
  }

  /* ------------------------------------------------------------------------
     加载遮罩：水墨「京」→ 等首图 → 卷轴展开
     ------------------------------------------------------------------------ */
  function initLoader() {
    const loader = $('#loader');
    const heroBg = $('.hero-bg');
    const s = IMG('hero');
    const minWait = new Promise((r) => setTimeout(r, 1500));
    const imgWait = Promise.race([
      U.loadImageCandidates([s.sd, s.remote]).then(({ source }) => {
        heroBg.style.backgroundImage = `url("${source}")`;
      }).catch(() => heroBg.classList.add('image-failed')),
      new Promise((resolve) => setTimeout(resolve, 6000)),
    ]);
    gsap.timeline()
      .to('.loader-ink', { scale: 1, opacity: 1, duration: 1.3, ease: 'power2.out' }, 0)
      .to('.loader-char', { clipPath: 'inset(0 0 0% 0)', duration: 1.1, ease: 'power2.inOut' }, .15)
      .to('.loader-line i', { width: '100%', duration: 1.4, ease: 'power1.inOut' }, 0);

    Promise.all([minWait, imgWait]).then(() => {
      gsap.timeline()
        .to('.loader-char, .loader-line, .loader-tip', { opacity: 0, duration: .4 })
        .to(loader, { opacity: 0, duration: .9, ease: 'power2.inOut' }, .2)
        .set(loader, { display: 'none' })
        .add(() => {
          heroIntro();
          // 大屏空闲时才升级到 4K，避免首屏与滚动抢占解码资源。
          scheduleHD(() => {
            const hd = new Image();
            hd.onload = () => { heroBg.style.backgroundImage = `url("${s.hd}")`; };
            hd.src = s.hd;
          });
        }, .5);
    });
  }

  /* ------------------------------------------------------------------------
     启动
     ------------------------------------------------------------------------ */
  function boot() {
    renderSeasons(); renderHistory(); renderAxis(); renderScenes(); renderFood(); renderDay(); renderCredits();
    initLenis();
    initCursor();
    initBGM();
    initPics();
    initHero();
    initSeasons();
    initHistory();
    initAxis();
    initScenes();
    initFood();
    initOpera();
    initDialect();
    initTerms();
    initDay();
    initPlanner();
    initEnding();
    initReveal();
    initNav();
    initLoader();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
    window.addEventListener('load', () => ScrollTrigger.refresh());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
