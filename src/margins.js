// TetraWave margins guide: a centre line on the centre of the galaxy in the background, and a light-blue
// dotted line 450px to either side of it, the full height of the window. Shown by the header's "Margins"
// link (or #margins). The lines follow the galaxy when the window is resized. Drag either side line (or use
// the up/down arrow keys after clicking it; Shift = 10px) to try another margin; "450" puts them back.
(() => {
  const SIDE = 450;
  const css = `
#tw-mar { position: fixed; inset: 0; z-index: 2147483080; pointer-events: none; }
#tw-mar .m-line { position: absolute; top: 0; bottom: 0; width: 15px; margin-left: -7px; }
#tw-mar .m-line::before { content: ""; position: absolute; top: 0; bottom: 0; left: 7px; width: 1px; }
#tw-mar .m-mid::before { background: #bfe6ff; box-shadow: 0 0 0 .5px rgba(0,0,0,.35); }
#tw-mar .m-side { pointer-events: auto; cursor: ew-resize; touch-action: none; }
#tw-mar .m-side::before { width: 2px; left: 6.5px; background: repeating-linear-gradient(#8fd0ff 0 2px, transparent 2px 6px); }
#tw-mar .m-side:focus { outline: none; }
#tw-mar .m-read { position: absolute; top: 124px; white-space: nowrap; padding: 2px 5px; pointer-events: auto; transform: translateX(-50%);
  font: 600 10px/1.2 ui-monospace, Menlo, monospace; color: #fff; background: rgba(40,110,170,.9); border-radius: 2px; }
#tw-mar .m-read button { margin-left: 6px; font: inherit; color: #fff; background: none; border: 1px solid rgba(255,255,255,.6); padding: 0 4px; cursor: pointer; }`;
  let el = null, d = SIDE;
  // the background video fills the window (cover); the galaxy's core sits 50.8% across the 1920px frame
  const galaxyX = () => { const w = innerWidth, h = innerHeight, k = Math.max(w / 1920, h / 1080); return (w - 1920 * k) / 2 + 0.508 * 1920 * k; };
  const place = () => {
    d = Math.max(0, d);
    const cx = galaxyX();
    el.querySelector('.m-mid').style.left = cx + 'px';
    el.querySelector('.m-l').style.left = (cx - d) + 'px';
    el.querySelector('.m-r').style.left = (cx + d) + 'px';
    const c = document.querySelector('.canvas');
    let page = '';
    if (c) { const r = c.getBoundingClientRect(), s = r.width / 980 || 1; page = ' · on the page ' + ((cx - d - r.left) / s).toFixed(0) + ' – ' + ((cx - r.left) / s).toFixed(1) + ' – ' + ((cx + d - r.left) / s).toFixed(0); }
    el.querySelector('.m-txt').textContent = 'galaxy centre ' + cx.toFixed(1) + ' px · margins ' + d + ' px each side' + page;
    el.querySelector('.m-read').style.left = cx + 'px';
  };
  const drag = (e, fn) => {
    e.preventDefault();
    const mv = (m) => { fn(m); place(); };
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); };
    addEventListener('pointermove', mv); addEventListener('pointerup', up);
  };
  function open() {
    if (el) return;
    const st = document.createElement('style'); st.id = 'tw-mar-css'; st.textContent = css; document.head.appendChild(st);
    el = document.createElement('div'); el.id = 'tw-mar';
    el.innerHTML = '<div class="m-line m-side m-l" tabindex="0"></div><div class="m-line m-mid"></div><div class="m-line m-side m-r" tabindex="0"></div>' +
      '<span class="m-read"><span class="m-txt"></span><button type="button" data-a="reset">450</button><button type="button" data-a="close">Close</button></span>';
    document.body.appendChild(el); place();
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-a="close"]')) hide();
      if (e.target.closest('[data-a="reset"]')) { d = SIDE; place(); }
    });
    el.querySelector('.m-l').addEventListener('pointerdown', (e) => drag(e, (m) => { d = Math.round(galaxyX() - m.clientX); }));
    el.querySelector('.m-r').addEventListener('pointerdown', (e) => drag(e, (m) => { d = Math.round(m.clientX - galaxyX()); }));
    el.addEventListener('keydown', (e) => {
      const k = e.shiftKey ? 10 : 1;
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') d += k; else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') d -= k; else return;
      e.preventDefault(); place();
    });
    addEventListener('resize', onMove); addEventListener('scroll', onMove, { passive: true });
  }
  const onMove = () => { if (el) place(); };
  function close() {
    if (el) { el.remove(); el = null; }
    const s = document.getElementById('tw-mar-css'); if (s) s.remove();
    removeEventListener('resize', onMove); removeEventListener('scroll', onMove);
  }
  function hide() { if (location.hash === '#margins') history.replaceState(null, '', location.pathname + location.search); close(); }
  addEventListener('hashchange', () => { if (location.hash === '#margins') open(); });
  if (location.hash === '#margins') open();
  document.querySelectorAll('[data-margins-toggle]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    const toc = document.getElementById('toc'); if (toc) toc.hidden = true;
    if (el) hide(); else { history.replaceState(null, '', '#margins'); open(); }
  }));
})();
