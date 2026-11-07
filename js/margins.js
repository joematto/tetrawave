// TetraWave margins guide: fixed lines on the 980px page — a centre line at page x 493.0 and a light-blue
// dotted line 400px to either side of it (page x 93 and 893, a span of 800), the full height of the window.
// Shown from the ToolBox (or #margins). The lines are fixed to the page: they cannot be dragged, and they stay
// on the same page positions when the window is resized (scaled with the page on narrower windows).
(() => {
  const CENTRE = 493.0, SIDE = 400;   // on the 980px page
  const css = `
#tw-mar { position: fixed; inset: 0; z-index: 2147483080; pointer-events: none; }
#tw-mar .m-line { position: absolute; top: 0; bottom: 0; width: 15px; margin-left: -7px; }
#tw-mar .m-line::before { content: ""; position: absolute; top: 0; bottom: 0; left: 7px; width: 1px; }
#tw-mar .m-mid::before { background: repeating-linear-gradient(rgba(205,236,255,.55) 0 2px, transparent 2px 6px); }   /* dotted, lighter than the margins */
#tw-mar .m-side::before { width: 2px; left: 6.5px; background: repeating-linear-gradient(#8fd0ff 0 2px, transparent 2px 6px); }
#tw-mar .m-read { position: absolute; top: 124px; white-space: nowrap; padding: 2px 5px; pointer-events: auto; transform: translateX(-50%);
  font: 600 10px/1.2 ui-monospace, Menlo, monospace; color: #fff; background: rgba(40,110,170,.9); border-radius: 2px; }
#tw-mar .m-read button { margin-left: 6px; font: inherit; color: #fff; background: none; border: 1px solid rgba(255,255,255,.6); padding: 0 4px; cursor: pointer; }`;
  let el = null;
  // the 980px page on screen: the page layout if there is one, otherwise the centred page column
  const pageBox = () => {
    const c = document.querySelector('.canvas');
    if (c) { const r = c.getBoundingClientRect(); return { left: r.left, s: r.width / 980 || 1 }; }
    const w = document.documentElement.clientWidth, s = Math.min(1, w / 980);
    return { left: (w - 980 * s) / 2, s };
  };
  const place = () => {
    const { left, s } = pageBox(), cx = left + CENTRE * s, d = SIDE * s;
    el.querySelector('.m-mid').style.left = cx + 'px';
    el.querySelector('.m-l').style.left = (cx - d) + 'px';
    el.querySelector('.m-r').style.left = (cx + d) + 'px';
    el.querySelector('.m-txt').textContent = 'page centre ' + CENTRE.toFixed(1) + ' · margins ' + SIDE + ' each side (span ' + 2 * SIDE + ') · page ' +
      (CENTRE - SIDE) + ' – ' + (CENTRE + SIDE) + (s < 1 ? ' · shown at ' + Math.round(s * 100) + '%' : '');
    el.querySelector('.m-read').style.left = cx + 'px';
  };
  function open() {
    if (el) return;
    const st = document.createElement('style'); st.id = 'tw-mar-css'; st.textContent = css; document.head.appendChild(st);
    el = document.createElement('div'); el.id = 'tw-mar';
    el.innerHTML = '<div class="m-line m-side m-l"></div><div class="m-line m-mid"></div><div class="m-line m-side m-r"></div>' +
      '<span class="m-read"><span class="m-txt"></span><button type="button" data-a="close">Close</button></span>';
    document.body.appendChild(el); place();
    el.addEventListener('click', (e) => { if (e.target.closest('[data-a="close"]')) hide(); });
    addEventListener('resize', onMove); addEventListener('scroll', onMove, { passive: true });
    if (document.fonts) document.fonts.ready.then(onMove);
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
