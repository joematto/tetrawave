// TetraWave alignment guide: a thin vertical line the full height of the window, to check that things line up.
// Shown by the header's "Guide" link (or #guide in the address). Drag it sideways; arrow keys nudge it 1px
// (Shift = 10px). The label gives its position from the window's left edge and on the 980px page.
(() => {
  const css = `
#tw-guide { position: fixed; top: 0; bottom: 0; width: 15px; margin-left: -7px; z-index: 2147483100; cursor: ew-resize; touch-action: none; }
#tw-guide::before { content: ""; position: absolute; top: 0; bottom: 0; left: 7px; width: 1px; background: #ff3b3b; box-shadow: 0 0 0 .5px rgba(0,0,0,.35); }
#tw-guide:focus { outline: none; }
#tw-guide:focus::before { background: #ff6262; }
#tw-guide .g-read { position: absolute; top: 78px; left: 12px; white-space: nowrap; padding: 2px 5px; cursor: default;
  font: 600 10px/1.2 ui-monospace, Menlo, monospace; color: #fff; background: rgba(160,20,20,.85); border-radius: 2px; }
#tw-guide .g-read button { margin-left: 6px; font: inherit; color: #fff; background: none; border: 1px solid rgba(255,255,255,.6); padding: 0 4px; cursor: pointer; }`;
  let el = null, x = Math.round(innerWidth / 2);
  const place = () => {
    el.style.left = x + 'px';
    const c = document.querySelector('.canvas');
    let page = '';
    if (c) { const r = c.getBoundingClientRect(), s = r.width / 980 || 1; page = ' · page ' + ((x - r.left) / s).toFixed(1); }
    el.querySelector('.g-txt').textContent = 'x ' + x + ' px' + page;
    const rd = el.querySelector('.g-read'); rd.style.left = x > innerWidth - 220 ? 'auto' : '12px'; rd.style.right = x > innerWidth - 220 ? '12px' : 'auto';
  };
  function open() {
    if (el) return;
    const st = document.createElement('style'); st.id = 'tw-guide-css'; st.textContent = css; document.head.appendChild(st);
    el = document.createElement('div'); el.id = 'tw-guide'; el.tabIndex = 0;
    el.innerHTML = '<span class="g-read"><span class="g-txt"></span><button type="button" data-a="close">Close</button></span>';
    document.body.appendChild(el); place(); el.focus({ preventScroll: true });
    el.addEventListener('click', (e) => { if (e.target.closest('[data-a="close"]')) hide(); });
    el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.g-read')) return;
      e.preventDefault();
      const mv = (m) => { x = Math.round(m.clientX); place(); };
      const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); };
      addEventListener('pointermove', mv); addEventListener('pointerup', up);
    });
    el.addEventListener('keydown', (e) => {
      const d = e.shiftKey ? 10 : 1;
      if (e.key === 'ArrowLeft') { e.preventDefault(); x -= d; place(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); x += d; place(); }
    });
    addEventListener('resize', onResize); addEventListener('scroll', onResize, { passive: true });
  }
  const onResize = () => { if (el) place(); };
  function close() {
    if (el) { el.remove(); el = null; }
    const s = document.getElementById('tw-guide-css'); if (s) s.remove();
    removeEventListener('resize', onResize); removeEventListener('scroll', onResize);
  }
  function hide() { if (location.hash === '#guide') history.replaceState(null, '', location.pathname + location.search); close(); }
  addEventListener('hashchange', () => { if (location.hash === '#guide') open(); });
  if (location.hash === '#guide') open();
  document.querySelectorAll('[data-guide-toggle]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    const toc = document.getElementById('toc'); if (toc) toc.hidden = true;
    if (el) hide(); else { history.replaceState(null, '', '#guide'); open(); }
  }));
})();
