// TetraWave symmetry guides: three vertical lines the full height of the window — a centre line and two
// side lines always the same distance either side of it. Shown by the header's "Symmetry" link (or #symmetry).
// Drag the centre line to move all three together; drag either side line to widen or narrow the pair.
// Keys (click a line first): left/right arrows move the group, up/down arrows widen/narrow it; Shift = 10px.
(() => {
  const css = `
#tw-sym { position: fixed; inset: 0; z-index: 2147483090; pointer-events: none; }
#tw-sym .s-line { position: absolute; top: 0; bottom: 0; width: 15px; margin-left: -7px; pointer-events: auto; cursor: ew-resize; touch-action: none; }
#tw-sym .s-line::before { content: ""; position: absolute; top: 0; bottom: 0; left: 7px; width: 1px; background: #2fd3ff; box-shadow: 0 0 0 .5px rgba(0,0,0,.35); }
#tw-sym .s-mid::before { background: #2fd3ff; width: 1px; border-left: 1px dashed transparent; background: repeating-linear-gradient(#2fd3ff 0 8px, transparent 8px 13px); }
#tw-sym .s-line:focus { outline: none; }
#tw-sym .s-read { position: absolute; top: 100px; white-space: nowrap; padding: 2px 5px; pointer-events: auto; transform: translateX(-50%);
  font: 600 10px/1.2 ui-monospace, Menlo, monospace; color: #fff; background: rgba(10,90,120,.9); border-radius: 2px; }
#tw-sym .s-read button { margin-left: 6px; font: inherit; color: #fff; background: none; border: 1px solid rgba(255,255,255,.6); padding: 0 4px; cursor: pointer; }`;
  let el = null, cx = Math.round(innerWidth / 2), d = 200;
  const place = () => {
    d = Math.max(0, d);
    el.querySelector('.s-mid').style.left = cx + 'px';
    el.querySelector('.s-l').style.left = (cx - d) + 'px';
    el.querySelector('.s-r').style.left = (cx + d) + 'px';
    const c = document.querySelector('.canvas');
    let page = '';
    if (c) { const r = c.getBoundingClientRect(), s = r.width / 980 || 1; page = ' · page centre ' + ((cx - r.left) / s).toFixed(1); }
    el.querySelector('.s-txt').textContent = 'centre ' + cx + ' px · each side ' + d + ' px (span ' + 2 * d + ')' + page;
    el.querySelector('.s-read').style.left = cx + 'px';
  };
  const drag = (e, fn) => {
    e.preventDefault();
    const mv = (m) => { fn(m); place(); };
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); };
    addEventListener('pointermove', mv); addEventListener('pointerup', up);
  };
  function open() {
    if (el) return;
    const st = document.createElement('style'); st.id = 'tw-sym-css'; st.textContent = css; document.head.appendChild(st);
    el = document.createElement('div'); el.id = 'tw-sym';
    el.innerHTML = '<div class="s-line s-l" tabindex="0"></div><div class="s-line s-mid" tabindex="0"></div><div class="s-line s-r" tabindex="0"></div>' +
      '<span class="s-read"><span class="s-txt"></span><button type="button" data-a="close">Close</button></span>';
    document.body.appendChild(el); place();
    el.querySelector('.s-mid').focus({ preventScroll: true });
    el.addEventListener('click', (e) => { if (e.target.closest('[data-a="close"]')) hide(); });
    el.querySelector('.s-mid').addEventListener('pointerdown', (e) => { const off = e.clientX - cx; drag(e, (m) => { cx = Math.round(m.clientX - off); }); });
    el.querySelector('.s-l').addEventListener('pointerdown', (e) => drag(e, (m) => { d = Math.round(cx - m.clientX); }));
    el.querySelector('.s-r').addEventListener('pointerdown', (e) => drag(e, (m) => { d = Math.round(m.clientX - cx); }));
    el.addEventListener('keydown', (e) => {
      const k = e.shiftKey ? 10 : 1;
      if (e.key === 'ArrowLeft') cx -= k; else if (e.key === 'ArrowRight') cx += k;
      else if (e.key === 'ArrowUp') d += k; else if (e.key === 'ArrowDown') d -= k; else return;
      e.preventDefault(); place();
    });
    addEventListener('resize', onMove); addEventListener('scroll', onMove, { passive: true });
  }
  const onMove = () => { if (el) place(); };
  function close() {
    if (el) { el.remove(); el = null; }
    const s = document.getElementById('tw-sym-css'); if (s) s.remove();
    removeEventListener('resize', onMove); removeEventListener('scroll', onMove);
  }
  function hide() { if (location.hash === '#symmetry') history.replaceState(null, '', location.pathname + location.search); close(); }
  addEventListener('hashchange', () => { if (location.hash === '#symmetry') open(); });
  if (location.hash === '#symmetry') open();
  document.querySelectorAll('[data-sym-toggle]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    const toc = document.getElementById('toc'); if (toc) toc.hidden = true;
    if (el) hide(); else { history.replaceState(null, '', '#symmetry'); open(); }
  }));
})();
