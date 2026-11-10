// TetraWave — entrance effects, contents menu, and the "#files" image-label mode.
document.documentElement.classList.add('js');

// Fade In / Spin In when an element scrolls into view (like Wix's animations)
const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}, { rootMargin: '0px 0px -8% 0px' }) : null;
document.querySelectorAll('[data-anim]:not([data-seq])').forEach((el) => io ? io.observe(el) : el.classList.add('in'));

// Chained fades (data-seq="1", "2", …): each fades in 2 s after the one before has finished fading in,
// and not before it has come into view (then it waits 2 s from there).
{
  const seq = [...document.querySelectorAll('[data-seq]')].sort((a, b) => a.dataset.seq - b.dataset.seq);
  const GAP = 2000, dur = (el) => parseFloat(getComputedStyle(el).getPropertyValue('--dur')) || 1550;
  let prevEnd = performance.now();
  const seen = new Map();
  const run = (i) => {
    if (i >= seq.length) return;
    const el = seq[i];
    const go = (visibleAt) => {
      const start = Math.max(prevEnd, visibleAt) + GAP;
      prevEnd = start + dur(el);
      setTimeout(() => { el.style.setProperty('--d', '0ms'); el.classList.add('in'); }, Math.max(0, start - performance.now()));
      setTimeout(() => run(i + 1), Math.max(0, prevEnd - performance.now()));
    };
    if (seen.has(el)) go(seen.get(el));
    else {
      const o = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { o.disconnect(); go(performance.now()); } }, { rootMargin: '0px 0px -8% 0px' });
      o.observe(el);
    }
  };
  run(0);
}

// Contents menu
const toc = document.getElementById('toc');
document.querySelectorAll('.toc-open').forEach((b) => b.addEventListener('click', () => { toc.hidden = false; toc.querySelector('.toc-close').focus(); }));
toc.querySelector('.toc-close').addEventListener('click', () => { toc.hidden = true; });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toc.hidden = true; });

// Add #files to the address to label each image with its file path
const files = () => document.body.classList.toggle('show-files', location.hash === '#files');
window.addEventListener('hashchange', files); files();

// Sound button in the top line (plays the "White Winds" track)
const snd = document.getElementById('sound'), sbtn = document.querySelector('.sound-btn');
if (snd && sbtn) {
  sbtn.addEventListener('click', () => { if (snd.paused) snd.play().catch(() => {}); else snd.pause(); });
  snd.addEventListener('play', () => sbtn.setAttribute('aria-pressed', 'true'));
  snd.addEventListener('pause', () => sbtn.setAttribute('aria-pressed', 'false'));
}

// Home: the top line moves down by 2/5 of the free space above the title text; the text block is
// then sits 18px plus 3% of the window height below the top line. The Spinor itself does not move.
const heroText = document.getElementById('heroText'), topline = document.querySelector('.home .topline');
const spinor = document.getElementById('mark');
const spread = () => {
  if (!heroText || !topline || !spinor) return;
  const root = document.documentElement.style;
  root.setProperty('--up', '0px'); root.setProperty('--down', '0px');
  // the top line's drop is measured with the Spinor at its original size, so shrinking it doesn't move the line
  document.body.classList.add('measure-original');
  const extra = Math.max(0, heroText.getBoundingClientRect().top - topline.getBoundingClientRect().bottom - 18);
  document.body.classList.remove('measure-original');
  root.setProperty('--down', (extra * 0.4).toFixed(1) + 'px');
  const t0 = heroText.getBoundingClientRect();
  const lineBottom = topline.getBoundingClientRect().bottom, spinTop = spinor.offsetTop - scrollY;
  const want = lineBottom + 18 + 0.03 * innerHeight;   // title text sits just under the top line, dropped 3% of the window height
  root.setProperty('--up', Math.max(0, t0.top - want).toFixed(1) + 'px');
  // Raise the Spinor and Enter by 8% of the window height, keeping at least 14px below your name.
  root.setProperty('--lift', '0px');
  const room = spinor.getBoundingClientRect().top - heroText.getBoundingClientRect().bottom - 14;
  root.setProperty('--lift', Math.max(0, Math.min(0.08 * innerHeight, room)).toFixed(1) + 'px');
};
spread(); addEventListener('resize', spread);
if (document.fonts) document.fonts.ready.then(spread);

// Home: keep the galaxy's core centred behind the spinning symbol, on any screen size.
// The core sits at 50.8% across and 47.8% down the 1920x1080 video (measured from the frames).
// (On About Me the email address carries data-galaxy-center, so the galaxy sits behind it instead.)
const mark = document.querySelector('[data-galaxy-center]') || document.getElementById('mark'), bg = document.querySelector('.bg');
if (mark && bg) {
  const VW = 1920, VH = 1080, CX = 0.508 * VW, CY = 0.478 * VH;
  const place = () => {
    // centre of the symbol in the window (offset* ignores the spin's rotation)
    let x = mark.offsetWidth / 2, y = mark.offsetHeight / 2, el = mark;
    while (el) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; }
    y -= window.scrollY; x -= window.scrollX;
    const w = innerWidth, h = innerHeight;
    // smallest zoom that puts the core under the symbol and still covers the whole window
    const s = Math.max(w / VW, h / VH, x / CX, (w - x) / (VW - CX), y / CY, (h - y) / (VH - CY));
    Object.assign(bg.style, { width: VW * s + 'px', height: VH * s + 'px', left: x - CX * s + 'px', top: y - CY * s + 'px' });
  };
  addEventListener('resize', place); addEventListener('scroll', place, { passive: true });
  addEventListener('load', place); place();
}

// Home: the galaxy plays at half speed, then slows smoothly and stops at the same moment the Spinor comes to rest.
// (The Spinor's turn lasts 9 s; the galaxy eases down over its last 3 s and holds that frame — no restart.)
const homeVid = document.body.classList.contains('home') ? document.querySelector('.bg') : null;
if (homeVid) {
  homeVid.loop = false;
  const HALF = 0.5, EASE = 3000, AFTER = 0, SPIN = 9000;
  const setRate = (r) => { try { homeVid.playbackRate = r; } catch (e) {} };
  homeVid.defaultPlaybackRate = HALF; setRate(HALF);
  homeVid.addEventListener('loadedmetadata', () => setRate(HALF));
  let stopAt = null;
  const tick = (now) => {
    if (stopAt === null) return;
    const left = stopAt - now;
    if (left <= 0) { homeVid.pause(); galaxyStopped(); return; }
    if (left < EASE) setRate(Math.max(0.0625, HALF * (left / EASE)));
    requestAnimationFrame(tick);
  };
  const start = () => { if (stopAt === null) { stopAt = performance.now() + SPIN + AFTER; requestAnimationFrame(tick); } };
  const sp = document.getElementById('mark');
  if (sp) {
    sp.addEventListener('animationstart', start);
    // stop exactly when the Spinor's turn ends
    sp.addEventListener('animationend', (e) => { if (e.animationName === 'spinor-turn') { stopAt = 0; homeVid.pause(); galaxyStopped(); } });
  }
  setTimeout(start, 1500);   // fallback if the Spinor's start isn't reported
}

// Home: the soundtrack ("White Winds") starts (1 s into the track) as the site opens and stops abruptly (no fade) 9.0 s
// into the track, just before the drum roll begins (9.1 s), i.e. about 8 s after the page opens. Browsers only allow
// sound once the visitor has interacted with the page, so if starting at once is refused it starts at the first
// click, tap or key press instead (and still stops at the same point in the music). Using the Sound button cancels
// the automatic stop.
let galaxyHasStopped = false;
function galaxyStopped() {
  if (galaxyHasStopped) return;
  galaxyHasStopped = true;
  document.dispatchEvent(new Event('tw:galaxy-stopped'));
}
if (homeVid && snd) {
  const SKIP = 1, STOP_AT = 9.0;   // seconds of the track (the drum roll starts at 9.1 s)
  let auto = true;   // false once the visitor uses the Sound button themselves
  if (sbtn) sbtn.addEventListener('click', () => { auto = false; }, true);
  const skip = () => { if (snd.currentTime < SKIP) try { snd.currentTime = SKIP; } catch (e) { /* not seekable yet */ } };
  if (snd.readyState >= 1) skip(); else snd.addEventListener('loadedmetadata', skip, { once: true });
  let done = false;   // the automatic play has stopped
  const watch = () => {
    if (!auto || snd.paused) return;
    if (snd.currentTime >= STOP_AT) { done = true; snd.pause(); return; }
    requestAnimationFrame(watch);
  };
  snd.addEventListener('play', () => { if (auto) requestAnimationFrame(watch); });
  const begin = () => { if (!auto || done || galaxyHasStopped) return; skip(); return snd.play(); };
  const firstTouch = (e) => {
    if (e.target && e.target.closest && e.target.closest('.sound-btn')) return;   // the Sound button does its own thing
    ['pointerdown', 'keydown', 'touchstart'].forEach((t) => removeEventListener(t, firstTouch, true));
    if (snd.paused) begin();
  };
  const p = begin();
  if (p && p.catch) p.catch(() => ['pointerdown', 'keydown', 'touchstart'].forEach((t) => addEventListener(t, firstTouch, true)));
}


// Wix-exact page layout: scale the 980px page to the window, and push elements down when text runs
// taller than its Wix box (as Wix does). On phones the elements stack instead (handled in CSS).
const canvases = [...document.querySelectorAll('.canvas')];
const layoutCanvas = () => {
  requestAnimationFrame(() => { if (typeof alignAxis === 'function') alignAxis(); if (typeof alignStar === 'function') alignStar(); });
  for (const c of canvases) {
    const wrap = c.parentElement, phone = innerWidth < 700;
    const els = [...c.children].filter((e) => e.hasAttribute('data-y'));   // skip the Edit tool's overlays
    if (phone) { c.style.transform = ''; wrap.style.height = ''; continue; }
    const order = els.map((e) => ({ e, y: +e.dataset.y, h: +e.dataset.h })).sort((a, b) => a.y - b.y);
    const grow = [];   // [wix bottom, extra height]
    let bottom = 0;
    for (const o of order) {
      let shift = 0;
      for (const [b, g] of grow) if (b <= o.y + 4) shift += g;
      o.e.style.top = (o.y + shift) + 'px';
      const real = o.e.offsetHeight;
      if (o.e.hasAttribute('data-text') && real > o.h + 2) grow.push([o.y + o.h, real - o.h]);
      bottom = Math.max(bottom, o.y + shift + Math.max(real, o.h));
    }
    const pad = 40 + (+c.dataset.pad || 0);   // space under the lowest item (data-pad: extra on some pages)
    c.style.height = bottom + pad + 'px';
    const avail = wrap.getBoundingClientRect().width, s = Math.min(1, avail / 980);
    c.style.transform = s < 1 ? `scale(${s})` : '';
    wrap.style.height = (bottom + pad) * s + 'px';
  }
};
// Keep page items marked --axis centred under a word of the page title (e.g. the StarCoil poem under "StarCoil"),
// at every window size. --axis is the item's centre line on the 980px page.
const axisWord = document.querySelector('.axis-word');
const alignAxis = () => {
  if (!axisWord) return;
  const els = [...document.querySelectorAll('.canvas > [style*="--axis"]')];
  if (!els.length) return;
  const c = els[0].parentElement, phone = innerWidth < 700;
  els.forEach((e) => { e.style.translate = ''; });
  if (phone) return;
  const s = c.getBoundingClientRect().width / 980 || 1;
  const w = axisWord.getBoundingClientRect(), want = ((w.left + w.right) / 2 - c.getBoundingClientRect().left) / s;
  for (const e of els) e.style.translate = (want - parseFloat(getComputedStyle(e).getPropertyValue('--axis'))).toFixed(2) + 'px 0';
};
// StarCoil: move the Egyptian adept up or down so the star sits exactly on the line from the adept's eyes to
// the galaxy's core, as the page first opens (the galaxy stays put while the page scrolls).
// Star and eyes are measured on the picture: star at 18.5% across / 11.6% down, eyes at 71.7% / 24.8%.
const adept = document.querySelector('.canvas > [style*="--align-star"]');
const alignStar = () => {
  if (!adept) return;
  adept.style.translate = '';
  if (innerWidth < 700) return;
  const img = adept.querySelector('img').getBoundingClientRect(), y0 = scrollY;
  const S = [img.left + 0.185 * img.width, img.top + y0 + 0.116 * img.height];
  const E = [img.left + 0.717 * img.width, img.top + y0 + 0.248 * img.height];
  const w = innerWidth, h = innerHeight, k = Math.max(w / 1920, h / 1080);          // the background video fills the window
  const C = [(w - 1920 * k) / 2 + 0.508 * 1920 * k, (h - 1080 * k) / 2 + 0.478 * 1080 * k];
  // move by t so that S + t lies on the line from E + t to C
  const t = C[1] - E[1] - (S[1] - E[1]) * (C[0] - E[0]) / (S[0] - E[0]);
  const scale = adept.parentElement.getBoundingClientRect().width / 980 || 1;
  adept.style.translate = '0 ' + (t / scale).toFixed(1) + 'px';
  // the PDF button (icon and caption) is centred on that same line of sight, where it already sits across the page
  const pdf = adept.parentElement.querySelector('.el-D');
  if (pdf) {
    pdf.style.translate = '';
    const r = pdf.getBoundingClientRect(), x = (r.left + r.right) / 2, y = (r.top + r.bottom) / 2 + y0;
    const slope = (S[1] - E[1]) / (S[0] - E[0]);
    const want = C[1] + (x - C[0]) * slope;
    pdf.style.translate = '0 ' + ((want - y) / scale).toFixed(1) + 'px';
  }
};
if (canvases.length) {
  addEventListener('resize', alignStar); addEventListener('load', alignStar);
  addEventListener('resize', alignAxis); addEventListener('load', alignAxis);
  if (document.fonts) { document.fonts.ready.then(alignAxis); document.fonts.addEventListener('loadingdone', alignAxis); }
  layoutCanvas(); addEventListener('resize', layoutCanvas); addEventListener('load', layoutCanvas);
  if (document.fonts) document.fonts.ready.then(layoutCanvas);
}

// Image index numbers (pages marked data-image-numbers): a small boxed number in the top-left corner of each
// picture, counted from the top of the page down, and left to right for pictures side by side (tops within 40px).
if (document.body.hasAttribute('data-image-numbers')) {
  const units = [...document.querySelectorAll('.canvas > figure.el, .canvas > .el[data-gallery], .canvas > .el[data-slides]')]
    .map((f) => ({ f, y: +f.dataset.y, x: parseFloat(f.style.left) }));
  units.sort((a, b) => a.y - b.y);
  const rows = [];
  for (const o of units) {
    const row = rows[rows.length - 1];
    if (row && o.y - row[0].y <= 40) row.push(o); else rows.push([o]);
  }
  let n = 0;
  const tag = (host, file) => {
    const t = document.createElement('span');
    t.className = 'img-no'; t.textContent = ++n; t.title = 'Picture ' + n + ' · ' + (file || '');
    host.appendChild(t);
  };
  for (const row of rows) for (const o of row.sort((a, b) => a.x - b.x)) {
    if (o.f.hasAttribute('data-slides')) {
      for (const s of o.f.querySelectorAll('.slide')) tag(s, s.dataset.file);   // each slide carries its own number
    } else if (o.f.hasAttribute('data-gallery')) {
      // a sideways-scrolling strip: number each picture in it, left to right
      for (const img of o.f.querySelectorAll('.strip img')) {
        const w = document.createElement('span'); w.className = 'img-no-wrap';
        img.replaceWith(w); w.appendChild(img); tag(w, img.dataset.file);
      }
    } else tag(o.f, o.f.dataset.file);
  }
}

// Slideshow galleries: arrows (and left/right keys when the pointer is over it) step through the pictures
for (const g of document.querySelectorAll('[data-slides]')) {
  const slides = [...g.querySelectorAll('.slide')], count = g.querySelector('.sl-count');
  let i = 0;
  const show = (k) => { slides[i].classList.remove('on'); i = (k + slides.length) % slides.length; slides[i].classList.add('on'); count.textContent = (i + 1) + ' / ' + slides.length; };
  g.querySelector('.sl-prev').addEventListener('click', () => show(i - 1));
  g.querySelector('.sl-next').addEventListener('click', () => show(i + 1));
  let over = false; g.addEventListener('mouseenter', () => { over = true; }); g.addEventListener('mouseleave', () => { over = false; });
  addEventListener('keydown', (e) => { if (!over) return; if (e.key === 'ArrowLeft') show(i - 1); if (e.key === 'ArrowRight') show(i + 1); });
}

// Items marked data-fadeout="fade" or "stay,fade" (milliseconds) are there as the page opens, stay that long and
// then fade away (e.g. "Words from No-where !!??" on StarCoil). They stay visible while editing.
for (const el of document.querySelectorAll('[data-fadeout]')) {
  const [a, b] = el.dataset.fadeout.split(',').map(Number), stay = b === undefined ? 0 : a, fade = b === undefined ? a : b;
  if (el.animate && !document.body.classList.contains('tw-editing'))
    el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: fade || 1200, delay: stay, easing: stay ? 'cubic-bezier(.25,.1,.5,1)' : 'ease-in', fill: 'forwards' });
}

// StarCoil: the explosion of words from the "Star Coil" picture, set as real text (so nothing behind it but the
// galaxy). Positions and sizes are measured on the 672 x 660 picture. The words burst out of the galaxy's core
// (in the background video) and settle in the space between the page title and the bottom of the window,
// centred across the galaxy.
const BURST_WORDS = [   // [text (HTML), centre x, centre y, size] on the picture
  ['structure', 539, 34, 44], ['induces', 540, 78, 27], ['fractal <b>reactance</b>', 440, 123, 27],
  ['Transmission remission', 465, 170, 23], ['re(a)<i>ssembles</i> dilation', 498, 206, 21],
  ['Telemetry', 370, 266, 29], ['traction', 338, 297, 17], ['counters', 223, 301, 21], ['rarefaction', 224, 331, 21],
  ['sinus reminds us', 125, 360, 19], ['Sculpture', 521, 305, 23], ['formation', 540, 335, 21],
  ['positions in', 438, 365, 26], ['time us', 438, 401, 24], ['of forces', 290, 436, 29], ['mid', 290, 477, 28],
  ['immense', 290, 518, 29], ['motion', 467, 586, 25], ['compression', 107, 122, 21], ['bi-lateral', 56, 48, 19]];
function wordBurst(IN, HOLD, OUT) {
  const w = innerWidth, h = innerHeight, k = Math.max(w / 1920, h / 1080);
  const core = [(w - 1920 * k) / 2 + 0.508 * 1920 * k, (h - 1080 * k) / 2 + 0.478 * 1080 * k];   // the galaxy's core
  const box = [8, 12, 635, 600], cx = (box[0] + box[2]) / 2, cy = (box[1] + box[3]) / 2;
  const t = document.querySelector('.page-title'), top = Math.max(80, (t ? t.getBoundingClientRect().bottom : 150) + 24), bottom = h - 24;
  const s = Math.min((bottom - top) / (box[3] - box[1]) * 0.94, 0.9 * w / (box[2] - box[0]));
  const at = [core[0], (top + bottom) / 2];   // where the middle of the cloud of words settles
  const layer = document.createElement('div');
  layer.className = 'word-burst'; layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);
  // Random and chaotic: every visit each word gets its own size (on average 20% smaller than the picture, from
  // about half to one and a third of that), a tilt, a nudge off its place and its own moment of leaving the core.
  // At their brightest the words are 60% transparent.
  const PEAK = 0.4, rnd = (a, b) => a + Math.random() * (b - a);
  BURST_WORDS.forEach(([t, x, y, size]) => {
    const e = document.createElement('span');
    e.innerHTML = t;
    const px = at[0] + (x - cx) * s + rnd(-28, 28) * s, py = at[1] + (y - cy) * s + rnd(-16, 16) * s;
    Object.assign(e.style, { left: px + 'px', top: py + 'px', fontSize: (size * s * 0.8 * rnd(0.55, 1.35)) + 'px' });
    layer.appendChild(e);
    const dx = core[0] - px, dy = core[1] - py, lag = rnd(0, 600), tilt = rnd(-14, 14);
    const start = `translate(-50%, -50%) translate(${dx}px, ${dy}px) rotate(${rnd(-90, 90)}deg) scale(.2)`;
    const home = `translate(-50%, -50%) rotate(${tilt}deg)`;
    const away = `translate(-50%, -50%) translate(${-dx * rnd(0.05, 0.14)}px, ${-dy * rnd(0.05, 0.14)}px) rotate(${tilt + rnd(-6, 6)}deg) scale(${rnd(1, 1.08)})`;
    e.animate([{ opacity: 0, transform: start }, { opacity: PEAK, transform: home }], { duration: IN - lag, delay: lag, easing: 'cubic-bezier(.25,.55,.45,1)', fill: 'both' });   // still moving until it lands at 2 s
    e.animate([{ opacity: PEAK, transform: home }, { opacity: 0, transform: away }], { duration: OUT, delay: IN + HOLD, easing: 'cubic-bezier(.35,.15,.6,1)', fill: 'forwards' });   // a slow, gentle start
  });
  setTimeout(() => layer.remove(), IN + HOLD + OUT + 200);
}

// StarCoil poem: revealed line by line, top to bottom, over about 2 seconds — the title, then each row of the two
// columns together, then "Motion", then the initials (timing below).
{
  const part = (p) => document.querySelector(`[data-poem="${p}"]`);
  const title = part('title');
  if (title) {
    const L = [...(part('L')?.querySelectorAll('p') || [])], R = [...(part('R')?.querySelectorAll('p') || [])];
    const steps = [[title]];
    for (let i = 0; i < Math.max(L.length, R.length); i++) steps.push([L[i], R[i]].filter(Boolean));
    if (part('motion')) steps.push([part('motion')]);
    if (part('sig')) steps.push([part('sig')]);
    // First the explosion of words (wordBurst, below): they burst out of the galaxy's core and fade in (2 s), and the
    // moment they land begin slowly fading out (6.5 s, so they are still fading while the poem rolls down). "Star Coil" fades in from 3.5 s to
    // 5.5 s, stays 1 s on its own, and the lines roll down from 6.5 s (about 3 s). Without the burst (phones, reduced motion): title after 0.5 s as before.
    const burst = innerWidth >= 700 && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    const B_IN = 2000, B_HOLD = 0, B_OUT = 6500, ROLL_AT = 5500;   // the fade-out begins the moment they land and lasts 6.5 s; the lines roll from 5.5 s
    const TITLE = 2000, WAIT = burst ? ROLL_AT - TITLE : 500, PAUSE = burst ? 1000 : 0, ROLL = 3000, EACH = 675, gap = (ROLL - EACH) / Math.max(1, steps.length - 2);
    steps.flat().forEach((el) => el.classList.add('poem-line'));          // hidden until the reveal starts
    // the page title ("First "Download" Transmission") waits until 10 s after the words have all exploded (12 s),
    // then fades in
    const pageTitle = document.querySelector('.page-title'), TITLE_IN = 3000;
    if (burst && pageTitle && pageTitle.animate) pageTitle.animate([{ opacity: 0 }, { opacity: 1 }], { duration: TITLE_IN, delay: B_IN + 10000, easing: 'ease-in-out', fill: 'backwards' });
    // 8 s after the roll-down is complete, the right-hand column of the poem fades to half strength (over 2 s)
    const ROLL_END = WAIT + TITLE + PAUSE + Math.max(0, steps.length - 2) * gap + EACH, RIGHT_DIM = 0.5, DIM_AFTER = 8000, DIM_FOR = 2000;
    const dimRight = () => { const r = part('R'); if (r && r.animate) r.animate([{ opacity: 1 }, { opacity: RIGHT_DIM }], { duration: DIM_FOR, delay: ROLL_END + DIM_AFTER, easing: 'ease-in-out', fill: 'forwards' }); };
    // once the right-hand column has faded, the subtitle ("A Message within a Message?") fades in quickly (0.8 s)
    const SUB_IN = 800, sub = document.querySelector('.page-title .subtitle');
    const showSub = () => { if (sub && sub.animate) sub.animate([{ opacity: 0 }, { opacity: 1 }], { duration: SUB_IN, delay: ROLL_END + DIM_AFTER + DIM_FOR, easing: 'ease-out', fill: 'backwards' }); };
    // the right-hand column rolls down in the same white as the left, then slowly turns to its own grey (over 6 s, from
    // 2 s after the roll-down), arriving just as it starts to fade to half strength
    const GREY_AFTER = 2000, GREY_FOR = DIM_AFTER - GREY_AFTER;
    const whiteToGrey = () => { const r = part('R'); if (!r) return; r.querySelectorAll('p').forEach((p) => {
      if (!p.animate) return;
      const grey = getComputedStyle(p).color;
      p.animate([{ color: '#ffffff' }, { color: grey }], { duration: GREY_FOR, delay: ROLL_END + GREY_AFTER, easing: 'ease-in-out', fill: 'backwards' });
    }); };
    const go = () => { if (burst) wordBurst(B_IN, B_HOLD, B_OUT); reveal(); whiteToGrey(); dimRight(); showSub(); };
    const reveal = () => steps.forEach((s, i) => s.forEach((el) => {
      el.classList.remove('poem-line');
      if (!el.animate) return;
      if (i === 0) el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: TITLE, delay: WAIT, easing: 'ease-in-out', fill: 'backwards' });
      else el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: EACH, delay: WAIT + TITLE + PAUSE + (i - 1) * gap, easing: 'ease', fill: 'backwards' });
    }));
    if ('IntersectionObserver' in window) {
      const o = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { o.disconnect(); go(); } }, { rootMargin: '0px 0px -8% 0px' });
      o.observe(title);
    } else go();
  }
}

// Inner pages: the galaxy plays through once and then holds its last frame (no restart).
// (The Giza page's own background video is not affected; the home page has its own timing above.)
{
  const v = document.body.classList.contains('home') ? null : document.querySelector('video.bg');
  if (v && /background\.mp4/.test(v.querySelector('source')?.getAttribute('src') || '')) {
    v.loop = false; v.removeAttribute('loop');
    const hold = () => { v.pause(); if (v.duration) v.currentTime = Math.max(0, v.duration - 0.05); };
    v.addEventListener('ended', hold);
    v.addEventListener('timeupdate', () => { if (v.duration && v.currentTime >= v.duration - 0.08) hold(); });
  }
}
