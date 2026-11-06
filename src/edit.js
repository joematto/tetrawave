// TetraWave Edit tool: move pictures and text boxes with the mouse, and resize pictures by their handles,
// the way the Wix editor does. Opened by the header's "Edit" link (or #edit in the address).
//
//  · Drag anything on the page to move it. It snaps to the page centre and to the edges and centres of
//    other items (a magenta line shows the match); hold Alt (Option) while dragging to turn snapping off.
//  · Corner handles resize a picture keeping its shape; hold Shift to re-proportion it freely.
//    Side handles re-proportion it (the picture is cropped to fill its new frame). Text boxes have side
//    handles only, to change their width.
//  · Arrow keys nudge the selected item 1px (Shift = 10px). Cmd/Ctrl+Z undoes. Esc deselects.
//  · Changes are kept in this browser and shown on every visit until they are built into the site.
//    "Save" downloads tetrawave-edits.json (to Downloads); hand that file to Claude to make them permanent.
(() => {
  const KEY = document.body.dataset.key || '';
  const STORE = 'tw-edits-v1';
  const canvas = document.querySelector('.canvas');
  const load = () => { try { return JSON.parse(localStorage.getItem(STORE) || '{}'); } catch (e) { return {}; } };
  const save = (all) => { try { localStorage.setItem(STORE, JSON.stringify(all)); } catch (e) { /* storage unavailable */ } };
  const relayout = () => { try { if (typeof layoutCanvas === 'function') layoutCanvas(); } catch (e) { /* not on this page */ } };

  // ---- elements and their original (built) positions ----
  const els = canvas ? [...canvas.querySelectorAll(':scope > .el[data-eid]')].filter((e) => !/calc/.test(e.style.left)) : [];
  const byId = new Map(els.map((e) => [e.dataset.eid, e]));
  const isText = (e) => e.hasAttribute('data-text');
  const isPic = (e) => e.matches('figure.el-I');
  const cur = (e) => ({ x: parseFloat(e.style.left) || 0, y: +e.dataset.y || 0, w: parseFloat(e.style.width) || e.offsetWidth, h: +e.dataset.h || e.offsetHeight });
  const orig = new Map(els.map((e) => {
    const img = isPic(e) ? e.querySelector('img') : null;
    return [e.dataset.eid, { ...cur(e), imgStyle: img ? img.getAttribute('style') : null }];
  }));
  const same = (a, b) => ['x', 'y', 'w', 'h'].every((k) => Math.abs(a[k] - b[k]) < 0.6) && (a.fit || '') === (b.fit || '');

  function apply(e, v) {
    e.style.left = v.x + 'px';
    e.dataset.y = v.y;
    e.style.width = v.w + 'px';
    if (!isText(e)) { e.style.height = v.h + 'px'; e.dataset.h = v.h; e.style.setProperty('--ar', v.w + '/' + Math.max(1, v.h)); }
    const img = isPic(e) ? e.querySelector('img') : null;
    if (img) {
      if (v.fit === 'cover') img.setAttribute('style', 'left:0;top:0;width:100%;height:100%;object-fit:cover');
      else img.setAttribute('style', orig.get(e.dataset.eid).imgStyle || '');
    }
  }

  // pending edits for this page: drop those already built in, apply the rest
  let all = load();
  const page = () => (all[KEY] = all[KEY] || {});
  if (canvas && all[KEY]) {
    for (const [id, v] of Object.entries(all[KEY])) {
      const e = byId.get(id), o = orig.get(id);
      if (!e || same(v, o)) delete all[KEY][id]; else apply(e, v);
    }
    if (!Object.keys(all[KEY]).length) delete all[KEY];
    save(all); relayout();
  }
  const count = () => Object.values(all).reduce((n, p) => n + Object.keys(p).length, 0);

  // ---- edit mode ----
  const css = `
.tw-editing .canvas [data-anim] { opacity: 1 !important; transition: none !important; animation: none !important; }
.tw-editing .canvas > .el[data-eid] { cursor: move; }
.tw-editing .canvas > .el[data-eid]:hover { outline: 1px dashed rgba(90,170,255,.75); outline-offset: 0; }
.tw-editing .canvas > .el[data-eid] * { user-select: none; -webkit-user-select: none; }
.tw-editing .canvas img { -webkit-user-drag: none; }
#tw-sel { position: absolute; z-index: 2147480000; pointer-events: none; outline: 1.5px solid #3aa0ff; box-shadow: 0 0 0 .5px rgba(0,0,0,.5); }
#tw-sel i { position: absolute; width: var(--hs); height: var(--hs); margin: calc(var(--hs) / -2) 0 0 calc(var(--hs) / -2); background: #fff; border: 1px solid #2a86e0; pointer-events: auto; box-sizing: border-box; }
#tw-sel i[data-h=nw] { left: 0; top: 0; cursor: nwse-resize; } #tw-sel i[data-h=n] { left: 50%; top: 0; cursor: ns-resize; }
#tw-sel i[data-h=ne] { left: 100%; top: 0; cursor: nesw-resize; } #tw-sel i[data-h=e] { left: 100%; top: 50%; cursor: ew-resize; }
#tw-sel i[data-h=se] { left: 100%; top: 100%; cursor: nwse-resize; } #tw-sel i[data-h=s] { left: 50%; top: 100%; cursor: ns-resize; }
#tw-sel i[data-h=sw] { left: 0; top: 100%; cursor: nesw-resize; } #tw-sel i[data-h=w] { left: 0; top: 50%; cursor: ew-resize; }
.tw-snap { position: absolute; z-index: 2147480001; pointer-events: none; background: #ff2fd0; }
#tw-edit { position: fixed; right: 14px; bottom: 14px; z-index: 2147483200; width: 300px; padding: 10px 12px 11px; border-radius: 6px;
  background: rgba(14,18,30,.94); color: #e9eef7; box-shadow: 0 6px 24px rgba(0,0,0,.5); font: 400 12px/1.45 system-ui, -apple-system, sans-serif; }
#tw-edit b { font-weight: 600; letter-spacing: .04em; }
#tw-edit .e-sel { margin: 6px 0 8px; font: 500 11px/1.4 ui-monospace, Menlo, monospace; color: #9fd0ff; min-height: 2.8em; word-break: break-all; }
#tw-edit .e-tip { color: #a9b3c4; font-size: 11px; margin: 0 0 8px; }
#tw-edit .e-row { display: flex; gap: 6px; flex-wrap: wrap; }
#tw-edit button { font: 500 11px/1 system-ui, sans-serif; padding: 6px 9px; border-radius: 4px; border: 1px solid rgba(255,255,255,.28); background: rgba(255,255,255,.06); color: #fff; cursor: pointer; }
#tw-edit button:hover { background: rgba(255,255,255,.16); }
#tw-edit button[data-a=save] { background: #2a86e0; border-color: #2a86e0; }
#tw-edit button:disabled { opacity: .4; cursor: default; }`;
  let on = false, panel = null, sel = null, box = null;
  const undo = [];

  const scale = () => canvas.getBoundingClientRect().width / 980 || 1;
  const rectOf = (e) => {   // an element's rendered box on the 980px page
    const r = e.getBoundingClientRect(), c = canvas.getBoundingClientRect(), s = scale();
    return { x: (r.left - c.left) / s, y: (r.top - c.top) / s, w: r.width / s, h: r.height / s };
  };
  function label() {
    if (!panel) return;
    const n = count();
    panel.querySelector('[data-a=save]').textContent = 'Save' + (n ? ' (' + n + ')' : '');
    panel.querySelector('[data-a=save]').disabled = !n;
    panel.querySelector('[data-a=undo]').disabled = !undo.length;
    panel.querySelector('[data-a=reset]').disabled = !(all[KEY] && Object.keys(all[KEY]).length);
    const t = panel.querySelector('.e-sel');
    if (!sel) { t.textContent = 'Click an item to select it.'; return; }
    const v = cur(sel), kind = isPic(sel) ? 'picture' : isText(sel) ? 'text box' : 'item';
    const name = isPic(sel) ? (sel.dataset.file || '').split('/').pop() : '';
    t.textContent = `${kind}${name ? ' · ' + name : ''}\nx ${Math.round(v.x)}  y ${Math.round(v.y)}  w ${Math.round(v.w)}  h ${Math.round(isText(sel) ? sel.offsetHeight : v.h)}` +
      (all[KEY] && all[KEY][sel.dataset.eid] ? '  · moved' : '');
    t.style.whiteSpace = 'pre-line';
  }
  function place() {
    if (!box) return;
    if (!sel) { box.style.display = 'none'; return; }
    const r = rectOf(sel), s = scale();
    Object.assign(box.style, { display: '', left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
    box.style.setProperty('--hs', (9 / s) + 'px');
    box.querySelectorAll('i').forEach((h) => { h.style.display = isText(sel) && !/^[ew]$/.test(h.dataset.h) ? 'none' : ''; });
  }
  function select(e) { sel = e; place(); label(); }
  function commit(e, v, prev) {
    const id = e.dataset.eid, o = orig.get(id);
    undo.push({ id, prev: prev ? { ...prev } : null });
    if (same(v, o)) { if (all[KEY]) delete all[KEY][id]; } else page()[id] = { x: v.x, y: v.y, w: v.w, h: v.h, ...(v.fit ? { fit: v.fit } : {}) };
    if (all[KEY] && !Object.keys(all[KEY]).length) delete all[KEY];
    save(all); label();
  }
  const stateOf = (e) => ({ ...cur(e), ...(all[KEY] && all[KEY][e.dataset.eid] && all[KEY][e.dataset.eid].fit ? { fit: all[KEY][e.dataset.eid].fit } : {}) });

  // ---- snapping ----
  let guides = [];
  const clearGuides = () => { guides.forEach((g) => g.remove()); guides = []; };
  function guide(axis, at) {
    const g = document.createElement('div'); g.className = 'tw-snap';
    const s = scale(), t = 1 / s;
    if (axis === 'x') Object.assign(g.style, { left: (at - t / 2) + 'px', top: '0', width: t + 'px', height: canvas.offsetHeight + 'px' });
    else Object.assign(g.style, { top: (at - t / 2) + 'px', left: 'calc(490px - 50vw)', width: '100vw', height: t + 'px' });
    canvas.appendChild(g); guides.push(g);
  }
  function snapTargets(except) {
    const xs = [490, 0, 980], ys = [];
    for (const e of els) {
      if (e === except || e.offsetParent === null) continue;
      const r = rectOf(e);
      xs.push(r.x, r.x + r.w / 2, r.x + r.w); ys.push(r.y, r.y + r.h / 2, r.y + r.h);
    }
    return { xs, ys };
  }
  const best = (vals, targets, tol) => {   // vals: candidate positions of the moving item; returns [delta, target]
    let d = null, at = null;
    for (const v of vals) for (const t of targets) { const k = t - v; if (Math.abs(k) <= tol && (d === null || Math.abs(k) < Math.abs(d))) { d = k; at = t; } }
    return [d, at];
  };

  // ---- dragging and resizing ----
  function onDown(ev) {
    if (!on || ev.button !== 0 || innerWidth < 700) return;
    if (ev.target.closest('#tw-edit')) return;
    const handle = ev.target.closest('#tw-sel i');
    const e = handle ? sel : ev.target.closest('.canvas > .el[data-eid]');
    if (!e || !byId.has(e.dataset.eid)) { if (ev.target.closest('.canvas')) select(null); return; }
    ev.preventDefault(); ev.stopPropagation();
    if (e !== sel) select(e);
    const s = scale(), p0 = { x: ev.clientX, y: ev.clientY }, start = stateOf(e), r0 = rectOf(e);
    const shiftY = r0.y - start.y;                 // how far text above has pushed it down
    const tg = snapTargets(e), tol = 6 / s;
    const h = handle ? handle.dataset.h : null, ar = start.w / Math.max(1, start.h);
    let moved = false, v = { ...start };
    const mv = (m) => {
      const dx = (m.clientX - p0.x) / s, dy = (m.clientY - p0.y) / s;
      if (!moved && Math.hypot(dx, dy) * s < 2) return;
      moved = true; clearGuides();
      const snap = !m.altKey;
      v = { ...start };
      if (!h) {   // move
        v.x = start.x + dx; v.y = start.y + dy;
        if (snap) {
          const [kx, ax] = best([v.x, v.x + r0.w / 2, v.x + r0.w], tg.xs, tol); if (kx !== null) { v.x += kx; guide('x', ax); }
          const top = v.y + shiftY, [ky, ay] = best([top, top + r0.h / 2, top + r0.h], tg.ys, tol); if (ky !== null) { v.y += ky; guide('y', ay); }
        }
      } else {    // resize from a handle, the opposite side staying put
        let L = start.x, T = start.y, R = start.x + start.w, B = start.y + start.h;
        if (h.includes('w')) L += dx; if (h.includes('e')) R += dx;
        if (h.includes('n')) T += dy; if (h.includes('s')) B += dy;
        if (snap) {
          if (/[we]/.test(h)) { const xx = h.includes('w') ? L : R, [k, a] = best([xx], tg.xs, tol); if (k !== null) { if (h.includes('w')) L += k; else R += k; guide('x', a); } }
          if (/[ns]/.test(h) && !isText(e)) { const yy = (h.includes('n') ? T : B) + shiftY, [k, a] = best([yy], tg.ys, tol); if (k !== null) { if (h.includes('n')) T += k; else B += k; guide('y', a); } }
        }
        let w = Math.max(12, R - L), hh = Math.max(12, B - T);
        const corner = h.length === 2;
        if (corner && !m.shiftKey) {   // keep the shape: follow whichever side moved further
          if (Math.abs(w / start.w - 1) >= Math.abs(hh / start.h - 1)) hh = w / ar; else w = hh * ar;
        }
        v.w = w; v.h = isText(e) ? start.h : hh;
        v.x = h.includes('w') ? start.x + start.w - w : start.x;
        v.y = h.includes('n') && !isText(e) ? start.y + start.h - v.h : start.y;
        if (isPic(e) && Math.abs(v.w / v.h - (orig.get(e.dataset.eid).w / orig.get(e.dataset.eid).h)) > 0.01 && (!corner || m.shiftKey || start.fit)) v.fit = 'cover';
      }
      v.x = Math.round(v.x * 2) / 2; v.y = Math.round(v.y * 2) / 2; v.w = Math.round(v.w * 2) / 2; v.h = Math.round(v.h * 2) / 2;
      apply(e, v); relayout(); place(); label();
    };
    const up = () => {
      removeEventListener('pointermove', mv); removeEventListener('pointerup', up); clearGuides();
      if (moved) { commit(e, v, start); place(); }
    };
    addEventListener('pointermove', mv); addEventListener('pointerup', up);
  }
  function onKey(ev) {
    if (!on) return;
    if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'z') { ev.preventDefault(); doUndo(); return; }
    if (ev.key === 'Escape') { select(null); return; }
    if (!sel || !/^Arrow/.test(ev.key) || /input|textarea/i.test(ev.target.tagName)) return;
    ev.preventDefault();
    const d = ev.shiftKey ? 10 : 1, start = stateOf(sel), v = { ...start };
    if (ev.key === 'ArrowLeft') v.x -= d; if (ev.key === 'ArrowRight') v.x += d;
    if (ev.key === 'ArrowUp') v.y -= d; if (ev.key === 'ArrowDown') v.y += d;
    apply(sel, v); relayout(); commit(sel, v, start); place();
  }
  function doUndo() {
    const u = undo.pop(); if (!u) return;
    const e = byId.get(u.id), o = orig.get(u.id), v = u.prev || o;
    apply(e, v);
    if (same(v, o)) { if (all[KEY]) delete all[KEY][u.id]; } else page()[u.id] = { x: v.x, y: v.y, w: v.w, h: v.h, ...(v.fit ? { fit: v.fit } : {}) };
    if (all[KEY] && !Object.keys(all[KEY]).length) delete all[KEY];
    save(all); relayout(); place(); label();
  }
  function resetPage() {
    if (!all[KEY]) return;
    for (const id of Object.keys(all[KEY])) { const e = byId.get(id); if (e) apply(e, orig.get(id)); }
    delete all[KEY]; save(all); undo.length = 0; relayout(); place(); label();
  }
  function download() {
    all = load();
    const data = { saved: new Date().toISOString(), note: 'TetraWave page edits: page key -> element id -> x, y, w, h on the 980px page', pages: all };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }));
    a.download = 'tetrawave-edits.json'; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    panel.querySelector('.e-tip').textContent = 'Saved tetrawave-edits.json to your Downloads. Tell Claude to build it in.';
  }
  const blockClick = (ev) => { if (on && ev.target.closest('.canvas') && !ev.target.closest('.sl-prev,.sl-next')) { ev.preventDefault(); ev.stopPropagation(); } };

  function open() {
    if (on || !canvas) { if (!canvas) alert('This page has no movable layout.'); return; }
    on = true;
    if (!document.getElementById('tw-edit-css')) { const st = document.createElement('style'); st.id = 'tw-edit-css'; st.textContent = css; document.head.appendChild(st); }
    document.body.classList.add('tw-editing');
    box = document.createElement('div'); box.id = 'tw-sel';
    box.innerHTML = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map((h) => `<i data-h="${h}"></i>`).join('');
    canvas.appendChild(box);
    panel = document.createElement('div'); panel.id = 'tw-edit';
    panel.innerHTML = `<b>EDIT</b> · ${KEY}<div class="e-sel"></div>
      <p class="e-tip">Drag to move · corners resize (Shift = free shape) · sides re-proportion · arrows nudge · Alt = no snap</p>
      <div class="e-row"><button type="button" data-a="undo">Undo</button><button type="button" data-a="reset">Reset page</button>
      <button type="button" data-a="save">Save</button><button type="button" data-a="close">Done</button></div>`;
    document.body.appendChild(panel);
    panel.addEventListener('click', (e) => {
      const a = e.target.closest('button'); if (!a) return;
      ({ undo: doUndo, reset: resetPage, save: download, close: hide })[a.dataset.a]();
    });
    if (innerWidth < 700) panel.querySelector('.e-tip').textContent = 'Widen the window to edit (the page stacks on phones).';
    addEventListener('pointerdown', onDown, true); addEventListener('keydown', onKey); addEventListener('click', blockClick, true);
    addEventListener('resize', place); addEventListener('scroll', place, { passive: true });
    select(null);
  }
  function hide() {
    if (!on) return;
    on = false; sel = null; clearGuides();
    document.body.classList.remove('tw-editing');
    box && box.remove(); panel && panel.remove(); box = panel = null;
    removeEventListener('pointerdown', onDown, true); removeEventListener('keydown', onKey); removeEventListener('click', blockClick, true);
    removeEventListener('resize', place); removeEventListener('scroll', place);
    if (location.hash === '#edit') history.replaceState(null, '', location.pathname + location.search);
  }
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-edit-toggle]');
    if (t) { e.preventDefault(); on ? hide() : open(); }
  });
  if (location.hash === '#edit') open();
})();
