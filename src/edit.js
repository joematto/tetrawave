// TetraWave Edit tool: move pictures and text boxes with the mouse, and resize pictures by their handles,
// the way the Wix editor does. Opened by the header's "Edit" link (or #edit in the address).
//
//  · Drag anything on the page to move it. It snaps to the page centre and to the edges and centres of
//    other items (a magenta line shows the match); hold Alt (Option) while dragging to turn snapping off.
//  · Corner handles resize a picture keeping its shape; hold Shift to re-proportion it freely.
//    Side handles re-proportion it (the picture is cropped to fill its new frame). Text boxes have side
//    handles only, to change their width.
//  · Arrow keys nudge the selected item 1px (Shift = 10px). Cmd/Ctrl+Z undoes. Esc deselects.
//  · Double-click a text box to type in it. A bar at the top sets the font, size, colour, bold / italic /
//    underline, alignment and line spacing of the selected words (or of the paragraph the cursor is in).
//    Click outside the box (or press Esc) to finish.
//  · Drag a picture (JPG, PNG, GIF, WebP) or a PDF from the desktop onto the page to add it there (a PDF
//    shows its first page). It can then be moved and resized like any other picture. Delete (or Backspace)
//    removes the selected item from the page.
//  · Copy and paste: click a text box, then Cmd+C copies it and Cmd+V pastes a copy (on this page or any
//    other), which can be moved and edited like the rest; Cmd+X cuts. Text copied from anywhere else pastes as
//    a new text box. While typing in a box, pasted text takes the style of the paragraph it goes into.
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
    const img = isPic(e) ? e.querySelector('img') : null, txt = isText(e) ? e.querySelector('.txt') : null;
    return [e.dataset.eid, { ...cur(e), imgStyle: img ? img.getAttribute('style') : null, html: txt ? txt.innerHTML : undefined }];
  }));
  const same = (a, b) => !b.isNew && ['x', 'y', 'w', 'h'].every((k) => Math.abs(a[k] - b[k]) < 0.6) && (a.fit || '') === (b.fit || '')
    && (a.html === undefined || a.html === b.html) && !a.hide === !b.hide;
  const entry = (e, v) => {   // what is stored for an item: its position, plus crop / edited text when changed
    const o = orig.get(e.dataset.eid), r = { x: v.x, y: v.y, w: v.w, h: v.h };
    if (v.fit) r.fit = v.fit;
    if (v.html !== undefined && v.html !== o.html) r.html = v.html;
    if (v.hide) r.hide = true;
    if (o.isNew && o.isText) Object.assign(r, { new: 'text', html: v.html !== undefined ? v.html : o.html });
    else if (o.isNew) Object.assign(r, { new: true, name: o.name, pw: o.pw, ph: o.ph });
    r.t = Date.now();   // when it was made: once a saved file containing it has been built in, the browser forgets it
    return r;
  };

  function apply(e, v) {
    e.style.display = v.hide ? 'none' : '';
    e.style.left = v.x + 'px';
    e.dataset.y = v.y;
    e.style.width = v.w + 'px';
    if (!isText(e)) { e.style.height = v.h + 'px'; e.dataset.h = v.h; e.style.setProperty('--ar', v.w + '/' + Math.max(1, v.h)); }
    const txt = isText(e) ? e.querySelector('.txt') : null, o = orig.get(e.dataset.eid);
    if (txt && txt.innerHTML !== (v.html !== undefined ? v.html : o.html)) txt.innerHTML = v.html !== undefined ? v.html : o.html;
    const img = isPic(e) ? e.querySelector('img') : null;
    if (img) {
      if (v.fit === 'cover') img.setAttribute('style', 'left:0;top:0;width:100%;height:100%;object-fit:cover');
      else img.setAttribute('style', orig.get(e.dataset.eid).imgStyle || '');
    }
  }

  // ---- pictures dropped onto the page: kept in the browser (IndexedDB) until they are built in ----
  const mem = new Map();
  let dbp = null;
  const db = () => dbp || (dbp = new Promise((res, rej) => {
    try { const r = indexedDB.open('tw-edit-media', 1); r.onupgradeneeded = () => r.result.createObjectStore('files'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }
    catch (err) { rej(err); }
  }));
  const tx = (mode, fn) => db().then((d) => new Promise((res, rej) => { const t = d.transaction('files', mode), q = fn(t.objectStore('files')); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }));
  const mediaPut = (id, m) => { mem.set(id, m); return tx('readwrite', (st) => st.put(m, id)).catch(() => { panelTip('Note: this browser cannot keep dropped pictures after a reload. Save before leaving the page.'); }); };
  const mediaGet = (id) => mem.has(id) ? Promise.resolve(mem.get(id)) : tx('readonly', (st) => st.get(id)).catch(() => null);
  const mediaDel = (id) => { mem.delete(id); tx('readwrite', (st) => st.delete(id)).catch(() => {}); };
  const COVER = 'left:0;top:0;width:100%;height:100%;object-fit:cover';
  function makeNew(id, v, m) {
    const f = document.createElement('figure');
    f.className = 'el el-I'; f.dataset.eid = id; f.dataset.file = '(new) ' + m.name;
    const img = document.createElement('img'); img.alt = ''; img.setAttribute('style', COVER); img.src = m.data;
    f.appendChild(img); f.style.zIndex = 900; canvas.appendChild(f);
    orig.set(id, { x: NaN, y: NaN, w: NaN, h: NaN, isNew: true, name: m.name, pw: m.w, ph: m.h, imgStyle: COVER });
    els.push(f); byId.set(id, f); apply(f, v);
    return f;
  }
  function makeNewText(id, v) {   // a text box added by pasting
    const d = document.createElement('div');
    d.className = 'el el-T'; d.dataset.eid = id; d.setAttribute('data-text', '');
    const t = document.createElement('div'); t.className = 'txt'; t.innerHTML = v.html || '<p></p>';
    d.appendChild(t); d.style.zIndex = 950; canvas.appendChild(d);
    orig.set(id, { x: NaN, y: NaN, w: NaN, h: NaN, isNew: true, isText: true, html: '' });
    els.push(d); byId.set(id, d); apply(d, v);
    return d;
  }
  function restoreNew(id, v) {
    if (v.new === 'text') { makeNewText(id, v); relayout(); return; }
    mediaGet(id).then((m) => {
      if (m) { makeNew(id, v, m); relayout(); return; }
      delete all[KEY][id]; if (!Object.keys(all[KEY]).length) delete all[KEY]; save(all);
    });
  }
  const panelTip = (t) => { const p = document.querySelector('#tw-edit .e-tip'); if (p) p.textContent = t; };
  const readURL = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(file); });
  const imgSize = (url) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res([i.naturalWidth, i.naturalHeight, i]); i.onerror = rej; i.src = url; });
  let pdfjs = null;
  const loadPdfjs = () => pdfjs || (pdfjs = new Promise((res, rej) => {
    const sc = document.createElement('script');
    sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    sc.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; res(window.pdfjsLib); };
    sc.onerror = () => rej(new Error('pdf.js unavailable')); document.head.appendChild(sc);
  }));
  async function pdfPreview(url) {   // the first page as a picture (the build makes a sharper one from the PDF itself)
    try {
      const lib = await loadPdfjs();
      const doc = await lib.getDocument({ data: atob(url.split(',')[1]) }).promise, pg = await doc.getPage(1);
      const vp0 = pg.getViewport({ scale: 1 }), vp = pg.getViewport({ scale: Math.min(3, 1600 / vp0.width) });
      const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
      await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
      return c.toDataURL('image/jpeg', 0.9);
    } catch (err) {   // offline: a plain stand-in, still built from the real PDF later
      const c = document.createElement('canvas'); c.width = 850; c.height = 1100; const g = c.getContext('2d');
      g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, 850, 1100); g.fillStyle = '#a3322a'; g.font = 'bold 120px sans-serif'; g.textAlign = 'center'; g.fillText('PDF', 425, 560);
      return c.toDataURL('image/jpeg', 0.9);
    }
  }
  async function addFiles(files, clientX, clientY) {
    const ok = [...files].filter((f) => /^image\/(jpeg|png|gif|webp)$/.test(f.type) || f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
    if (!ok.length) { panelTip('Only pictures (JPG, PNG, GIF, WebP) and PDFs can be added.'); return; }
    const c = canvas.getBoundingClientRect(), s = scale();
    let k = 0;
    for (const file of ok) {
      panelTip('Adding ' + file.name + ' …');
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      let url = await readURL(file), pdf = null;
      if (isPdf) { pdf = url; url = await pdfPreview(pdf); }
      let [w, h, im] = await imgSize(url);
      if (!isPdf && Math.max(w, h) > 3000) {   // very large photos are scaled to 3000px on their long side
        const r = 3000 / Math.max(w, h), cv = document.createElement('canvas'); cv.width = Math.round(w * r); cv.height = Math.round(h * r);
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); url = cv.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.92); w = cv.width; h = cv.height;
      }
      const id = 'N:' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const m = { name: file.name, w, h, data: url, pdf };
      const W = Math.min(300, w), H = Math.round(W * h / w);
      const cx = (clientX - c.left) / s + k * 24, cy = (clientY - c.top) / s + k * 24;
      const v = { x: Math.round(cx - W / 2), y: Math.round(cy - H / 2), w: W, h: H };
      await mediaPut(id, m);
      const f = makeNew(id, v, m);
      commit(f, v, null);
      relayout(); select(f); k++;
    }
    panelTip(TIP);
  }

  // pending edits for this page: drop those already built in, apply the rest
  let all = load();
  const page = () => (all[KEY] = all[KEY] || {});
  // edits made before the last saved file that has been built into the site are already part of the page
  const builtUpTo = Date.parse(document.body.dataset.editsSaved || '') || 0;
  if (builtUpTo) for (const [k, p] of Object.entries(all)) {
    // only edits stamped with a time no later than that save (so certainly in the file) are dropped; never anything else
    for (const [id, v] of Object.entries(p)) if (v.t && v.t <= builtUpTo) { delete p[id]; if (v.new) mediaDel(id); }
    if (!Object.keys(p).length) delete all[k];
  }
  if (builtUpTo) save(all);
  if (canvas && all[KEY]) {
    for (const [id, v] of Object.entries(all[KEY])) {
      const e = byId.get(id), o = orig.get(id);
      if (!e && v.new) { restoreNew(id, v); continue; }       // a dropped picture not yet built in
      if (!e || same(v, o)) { delete all[KEY][id]; if (v.new) mediaDel(id); } else apply(e, v);
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
.tw-editing .canvas > .el.tw-selected:hover, .tw-editing .canvas > .el.tw-selected { outline: none; }
.tw-editing .canvas > .el[data-eid] * { user-select: none; -webkit-user-select: none; }
.tw-editing .canvas img { -webkit-user-drag: none; }
#tw-sel { position: absolute; z-index: 2147480000; pointer-events: none; outline: var(--px, 1px) solid #3aa0ff; }   /* a hairline at any page scale */
#tw-sel i { position: absolute; width: var(--hs); height: var(--hs); margin: calc(var(--hs) / -2) 0 0 calc(var(--hs) / -2); background: #fff; border: 1px solid #2a86e0; pointer-events: auto; box-sizing: border-box; }
#tw-sel i[data-h=nw] { left: 0; top: 0; cursor: nwse-resize; } #tw-sel i[data-h=n] { left: 50%; top: 0; cursor: ns-resize; }
#tw-sel i[data-h=ne] { left: 100%; top: 0; cursor: nesw-resize; } #tw-sel i[data-h=e] { left: 100%; top: 50%; cursor: ew-resize; }
#tw-sel i[data-h=se] { left: 100%; top: 100%; cursor: nwse-resize; } #tw-sel i[data-h=s] { left: 50%; top: 100%; cursor: ns-resize; }
#tw-sel i[data-h=sw] { left: 0; top: 100%; cursor: nesw-resize; } #tw-sel i[data-h=w] { left: 0; top: 50%; cursor: ew-resize; }
/* the side handles run the whole length of each edge, so a tall box can be stretched from anywhere along its side */
/* the side handles are invisible grab strips along the whole edge (the edge itself stays a hairline) */
#tw-sel i[data-h=e], #tw-sel i[data-h=w] { top: 0; height: 100%; margin-top: 0; width: var(--hs); background: transparent; border: 0; }
#tw-sel i[data-h=n], #tw-sel i[data-h=s] { left: 0; width: 100%; margin-left: 0; height: var(--hs); background: transparent; border: 0; }
#tw-sel i[data-h=nw], #tw-sel i[data-h=ne], #tw-sel i[data-h=se], #tw-sel i[data-h=sw] { z-index: 1; }
.tw-snap { position: absolute; z-index: 2147480001; pointer-events: none; background: #ff2fd0; }
#tw-tbar { position: fixed; left: 50%; top: 86px; transform: translateX(-50%); z-index: 2147483300; display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
  max-width: calc(100vw - 24px); padding: 7px 9px; border-radius: 6px; background: rgba(14,18,30,.96); box-shadow: 0 6px 24px rgba(0,0,0,.55); font: 500 12px/1 system-ui, sans-serif; color: #fff; }
#tw-tbar .tb-g { display: inline-flex; gap: 3px; align-items: center; padding: 0 4px; border-left: 1px solid rgba(255,255,255,.15); }
#tw-tbar button, #tw-tbar select, #tw-tbar input { font: 500 12px/1 system-ui, sans-serif; height: 26px; border-radius: 4px; border: 1px solid rgba(255,255,255,.25); background: rgba(255,255,255,.07); color: #fff; cursor: pointer; }
#tw-tbar button { min-width: 26px; padding: 0 6px; } #tw-tbar button:hover { background: rgba(255,255,255,.18); }
#tw-tbar select { padding: 0 4px; } #tw-tbar select option { color: #000; }
#tw-tbar input[type=number] { width: 52px; padding: 0 4px; cursor: text; }
#tw-tbar input[type=color] { width: 30px; padding: 1px 2px; }
#tw-tbar .sw { min-width: 18px !important; width: 18px; height: 18px !important; padding: 0 !important; border-radius: 50%; border: 1px solid rgba(255,255,255,.5); }
#tw-tbar .tb-done { background: #2a86e0; border-color: #2a86e0; }
.tw-editing .canvas > .el.tw-typing { cursor: text; outline: 1px solid #ffb43a !important; }
#tw-sel.typing { outline: none; }   /* only the orange line while typing */
.tw-editing .canvas > .el.tw-typing * { user-select: text; -webkit-user-select: text; cursor: text; }
.tw-editing .canvas > .el.tw-typing .txt:focus { outline: none; }
#tw-drop { position: fixed; inset: 10px; z-index: 2147483400; pointer-events: none; border: 3px dashed #3aa0ff; border-radius: 10px;
  background: rgba(40,120,220,.12); display: flex; align-items: center; justify-content: center; font: 600 22px/1 system-ui, sans-serif; color: #cfe6ff; text-shadow: 0 1px 3px #000; }
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
    const v = cur(sel); let kind = isPic(sel) ? 'picture' : isText(sel) ? 'text box' : 'item';
    const name = isPic(sel) ? (sel.dataset.file || '').split('/').pop() : '';
    if (orig.get(sel.dataset.eid) && orig.get(sel.dataset.eid).isNew) kind = isText(sel) ? 'new text box' : 'new picture';
    t.textContent = `${kind}${name ? ' · ' + name : ''}\nx ${Math.round(v.x)}  y ${Math.round(v.y)}  w ${Math.round(v.w)}  h ${Math.round(isText(sel) ? sel.offsetHeight : v.h)}` +
      (all[KEY] && all[KEY][sel.dataset.eid] ? '  · changed' : '');
    t.style.whiteSpace = 'pre-line';
  }
  function place() {
    if (!box) return;
    if (!sel) { box.style.display = 'none'; return; }
    const r = rectOf(sel), s = scale();
    Object.assign(box.style, { display: '', left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
    box.style.setProperty('--hs', (9 / s) + 'px'); box.style.setProperty('--px', (1 / s) + 'px');
    box.querySelectorAll('i').forEach((h) => { h.style.display = isText(sel) && !/^[ew]$/.test(h.dataset.h) ? 'none' : ''; });
  }
  function select(e) {
    if (sel && sel !== e) sel.classList.remove('tw-selected');
    sel = e; if (e) e.classList.add('tw-selected');
    place(); label();
  }
  function commit(e, v, prev) {
    const id = e.dataset.eid, o = orig.get(id);
    undo.push({ id, prev: prev ? { ...prev } : null });
    const r = entry(e, v);
    if (same({ ...r, html: r.html !== undefined ? r.html : o.html }, o)) { if (all[KEY]) delete all[KEY][id]; } else page()[id] = r;
    if (all[KEY] && !Object.keys(all[KEY]).length) delete all[KEY];
    save(all); label();
  }
  const stateOf = (e) => {
    const st = all[KEY] && all[KEY][e.dataset.eid], txt = isText(e) ? e.querySelector('.txt') : null;
    return { ...cur(e), ...(st && st.fit ? { fit: st.fit } : {}), ...(st && st.hide ? { hide: true } : {}), ...(txt ? { html: txt.innerHTML } : {}) };
  };

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
    if (ev.target.closest('#tw-edit,#tw-tbar')) return;
    if (editing && inEdit(ev.target)) return;
    if (editing) endText();
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
  // ---- copy, cut and paste ----
  const CLIP = 'tw-clip-v1', MARK = 'application/x-tetrawave';
  const plainOf = (html) => { const d = document.createElement('div'); d.innerHTML = html; d.querySelectorAll('p,div,h1,h2,h3,h4,h5,h6,li,br,.yr').forEach((n) => n.after('\n')); return d.textContent.replace(/\n{3,}/g, '\n\n').trim(); };
  const paras = (text) => text.replace(/\r/g, '').split(/\n\s*\n|\n/).map((l) => l.trim()).filter(Boolean)
    .map((l) => '<p>' + l.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</p>').join('');
  function onCopy(ev, cut) {
    if (!on || editing || !sel || !isText(sel) || /input|textarea|select/i.test((document.activeElement || {}).tagName)) return;
    const html = txtOf(sel).innerHTML, v = cur(sel);
    const clip = { kind: 'text', html, w: v.w, x: v.x, y: v.y, page: KEY, t: Date.now() };
    ev.preventDefault();
    ev.clipboardData.setData('text/plain', plainOf(html));
    ev.clipboardData.setData('text/html', html);
    try { ev.clipboardData.setData(MARK, JSON.stringify(clip)); } catch (err) { /* custom types not allowed here */ }
    try { localStorage.setItem(CLIP, JSON.stringify(clip)); } catch (err) { /* storage unavailable */ }
    panelTip(cut ? 'Cut. Cmd+V pastes it back, here or on another page.' : 'Copied. Cmd+V pastes a copy, here or on another page.');
    if (cut) { const start = stateOf(sel), nv = { ...start, hide: true }, e = sel; select(null); apply(e, nv); relayout(); commit(e, nv, start); }
  }
  function onPaste(ev) {
    if (!on || !canvas || innerWidth < 700) return;
    const dt = ev.clipboardData;
    if (editing) {   // typing: plain text in the style of the paragraph, or a copied TetraWave box as it was
      ev.preventDefault();
      let mark = null; try { mark = JSON.parse(dt.getData(MARK) || 'null'); } catch (err) { /* none */ }
      if (mark && mark.html) document.execCommand('insertHTML', false, mark.html);
      else document.execCommand('insertText', false, dt.getData('text/plain'));
      changed(); return;
    }
    if (/input|textarea|select/i.test((document.activeElement || {}).tagName)) return;
    ev.preventDefault();
    let clip = null; try { clip = JSON.parse(dt.getData(MARK) || 'null'); } catch (err) { /* none */ }
    const text = dt.getData('text/plain');
    if (!clip) {   // the browser may drop our own type: use the remembered copy if it matches what is being pasted
      try { const c = JSON.parse(localStorage.getItem(CLIP) || 'null'); if (c && plainOf(c.html) === text.trim()) clip = c; } catch (err) { /* none */ }
    }
    if (dt.files && dt.files.length) { const r = canvas.getBoundingClientRect(); addFiles(dt.files, r.left + r.width / 2, innerHeight / 2); return; }
    if (!clip && !text.trim()) return;
    const html = clip ? clip.html : paras(text), w = clip ? clip.w : 445;
    const c = canvas.getBoundingClientRect(), s = scale();
    let x, y;
    if (clip && clip.page === KEY && byId.size) { x = clip.x + 20; y = clip.y + 20; }   // a copy just below and right of the original
    else { x = Math.round(((innerWidth / 2) - c.left) / s - w / 2); y = Math.round((innerHeight / 2 - c.top) / s - 40); }   // middle of the view
    const id = 'NT:' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const v = { x, y, w, h: 60, html };
    const d = makeNewText(id, v);
    commit(d, { ...v, html: txtOf(d).innerHTML }, null);
    if (clip) { clip.x = x; clip.y = y; clip.page = KEY; try { localStorage.setItem(CLIP, JSON.stringify(clip)); } catch (err) { /* none */ } }
    relayout(); select(d);
    panelTip('Pasted as a new text box. Drag it into place; double-click to edit it.');
  }
  const onCopyEv = (e) => onCopy(e, false), onCutEv = (e) => onCopy(e, true);

  function onKey(ev) {
    if (!on) return;
    if (editing) { if (ev.key === 'Escape') { ev.preventDefault(); endText(); } return; }
    if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'z') { ev.preventDefault(); doUndo(); return; }
    if (ev.key === 'Escape') { select(null); return; }
    if (sel && (ev.key === 'Delete' || ev.key === 'Backspace') && !/input|textarea|select/i.test(ev.target.tagName)) {
      ev.preventDefault();
      const start = stateOf(sel), v = { ...start, hide: true }, e = sel;
      select(null); apply(e, v); relayout(); commit(e, v, start); return;
    }
    if (!sel || !/^Arrow/.test(ev.key) || /input|textarea/i.test(ev.target.tagName)) return;
    ev.preventDefault();
    const d = ev.shiftKey ? 10 : 1, start = stateOf(sel), v = { ...start };
    if (ev.key === 'ArrowLeft') v.x -= d; if (ev.key === 'ArrowRight') v.x += d;
    if (ev.key === 'ArrowUp') v.y -= d; if (ev.key === 'ArrowDown') v.y += d;
    apply(sel, v); relayout(); commit(sel, v, start); place();
  }
  function doUndo() {
    const u = undo.pop(); if (!u) return;
    const e = byId.get(u.id), o = orig.get(u.id), v = u.prev || (o.isNew ? { ...cur(e), hide: true } : o);
    apply(e, v);
    const r = entry(e, v);
    if (same({ ...r, html: r.html !== undefined ? r.html : o.html }, o)) { if (all[KEY]) delete all[KEY][u.id]; } else page()[u.id] = r;
    if (all[KEY] && !Object.keys(all[KEY]).length) delete all[KEY];
    save(all); relayout(); place(); label();
  }
  function resetPage() {
    if (!all[KEY]) return;
    for (const [id, v] of Object.entries(all[KEY])) {
      const e = byId.get(id), o = orig.get(id);
      if (e && o && o.isNew) { e.remove(); byId.delete(id); els.splice(els.indexOf(e), 1); orig.delete(id); mediaDel(id); }
      else if (e) apply(e, o);
    }
    if (sel && !sel.isConnected) sel = null;
    delete all[KEY]; save(all); undo.length = 0; relayout(); place(); label();
  }
  async function download() {
    all = load();
    const pages = JSON.parse(JSON.stringify(all));
    for (const p of Object.values(pages)) for (const [id, v] of Object.entries(p)) {
      if (!v.new || v.hide) continue;
      const m = await mediaGet(id);
      if (m) { if (m.pdf) v.pdf = m.pdf; else v.data = m.data; }
    }
    const data = { saved: new Date().toISOString(), note: 'TetraWave page edits: page key -> element id -> x, y, w, h on the 980px page', pages };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }));
    a.download = 'tetrawave-edits.json'; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    panel.querySelector('.e-tip').textContent = 'Saved tetrawave-edits.json to your Downloads. Tell Claude to build it in.';
  }
  const blockClick = (ev) => { if (on && ev.target.closest('.canvas') && !ev.target.closest('.sl-prev,.sl-next')) { ev.preventDefault(); if (!(editing && inEdit(ev.target))) ev.stopPropagation(); } };
  const onDbl = (ev) => {
    if (!on || innerWidth < 700) return;
    const e = ev.target.closest('.canvas > .el[data-text][data-eid]');
    if (e && byId.has(e.dataset.eid)) { ev.preventDefault(); startText(e); }
  };
  const TIP = 'Drag to move · corners resize (Shift = free shape) · sides re-proportion · arrows nudge · Alt = no snap · double-click text to edit it · drop pictures or PDFs from the desktop to add them · Delete removes';


  // ---- text editing ----
  const FONTS = [['', 'Font…'], ['var(--display)', 'Cinzel (titles)'], ['var(--body)', 'Source Sans 3 (body)'],
    ['Georgia, serif', 'Georgia'], ['"Times New Roman", Times, serif', 'Times New Roman'], ['Palatino, "Palatino Linotype", serif', 'Palatino'],
    ['"Helvetica Neue", Helvetica, Arial, sans-serif', 'Helvetica / Arial'], ['"Courier New", Courier, monospace', 'Courier']];
  const SWATCH = [['#f5ca97', 'gold'], ['#f9e2ba', 'pale gold'], ['#dcdcdc', 'body text'], ['#ffffff', 'white'], ['#8f8b98', 'grey'], ['#d2d2d2', 'light grey']];
  const BLOCK = 'p,h1,h2,h3,h4,h5,h6,li,div.txt > div';
  let editing = null, bar = null, saved = null, before = null;
  const txtOf = (e) => e.querySelector('.txt');
  const inEdit = (n) => editing && n && txtOf(editing).contains(n.nodeType === 1 ? n : n.parentNode);
  document.addEventListener('selectionchange', () => {
    const sl = getSelection();
    if (editing && sl.rangeCount && inEdit(sl.getRangeAt(0).commonAncestorContainer)) { saved = sl.getRangeAt(0).cloneRange(); syncBar(); }
  });
  const restore = () => { if (!saved) return null; const sl = getSelection(); sl.removeAllRanges(); sl.addRange(saved); return saved; };
  function blocksIn(r) {   // the paragraphs the range touches (or the one holding the cursor)
    const root = txtOf(editing), all = [...root.querySelectorAll(BLOCK)].filter((b) => !b.querySelector(BLOCK));
    const hit = all.filter((b) => r.intersectsNode(b));
    if (hit.length) return hit;
    const n = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentNode;
    return [n.closest(BLOCK) || root];
  }
  function styleText(prop, val) {
    const r = restore(); if (!r) return;
    const blocks = blocksIn(r), whole = r.collapsed || blocks.length > 1;
    if (whole) {   // no words selected, or several paragraphs: style the paragraph(s) themselves
      for (const b of blocks) { b.style[prop] = val; b.querySelectorAll('[style]').forEach((d) => { d.style[prop] = ''; if (!d.getAttribute('style')) d.removeAttribute('style'); }); }
    } else {
      // the selection is exactly an existing styled run: restyle it instead of nesting another one
      let n = r.commonAncestorContainer; if (n.nodeType !== 1) n = n.parentNode;
      const txt = r.toString(), root = txtOf(editing);
      let run = null;
      while (n && n !== root && /^(SPAN|B|I|U|STRONG|EM|FONT)$/.test(n.tagName) && n.textContent === txt) { if (n.tagName === 'SPAN') run = n; n = n.parentNode; }
      if (run) {
        run.style[prop] = val;
        run.querySelectorAll('[style]').forEach((d) => { d.style[prop] = ''; if (!d.getAttribute('style')) d.removeAttribute('style'); });
        changed(); return;
      }
      const span = document.createElement('span'); span.style[prop] = val;
      span.appendChild(r.extractContents());
      span.querySelectorAll('[style]').forEach((d) => { d.style[prop] = ''; if (!d.getAttribute('style')) d.removeAttribute('style'); });
      r.insertNode(span);
      const nr = document.createRange(); nr.selectNodeContents(span); saved = nr; restore();
    }
    changed();
  }
  function cmd(c) { restore(); document.execCommand(c, false, null); changed(); }
  function alignText(v) { const r = restore(); if (!r) return; for (const b of blocksIn(r)) b.style.textAlign = v; changed(); }
  function clearText() {
    const r = restore(); if (!r) return;
    for (const b of blocksIn(r)) {
      b.querySelectorAll('span,font,b,i,u,strong,em').forEach((d) => { if (d.closest('a') === d) return; d.replaceWith(...d.childNodes); });
      const keep = b.style.textAlign; b.removeAttribute('style'); if (keep) b.style.textAlign = keep;
    }
    changed();
  }
  const changed = () => { relayout(); place(); syncBar(); };
  const rgbHex = (c) => { const m = c.match(/\d+(\.\d+)?/g); return m ? '#' + m.slice(0, 3).map((n) => (+n).toString(16).padStart(2, '0')).join('') : '#dcdcdc'; };
  function syncBar() {   // show the size / colour / font at the cursor
    if (!bar || !saved) return;
    let n = saved.startContainer; if (n.nodeType !== 1) n = n.parentNode;
    const cs = getComputedStyle(n);
    const sz = bar.querySelector('[data-k=size]'); if (document.activeElement !== sz) sz.value = Math.round(parseFloat(cs.fontSize) * 10) / 10;
    const col = bar.querySelector('[data-k=color]'); if (document.activeElement !== col) col.value = rgbHex(cs.color);
    const lh = bar.querySelector('[data-k=lh]'); if (document.activeElement !== lh) lh.value = '';
    const fam = cs.fontFamily.toLowerCase(), f = bar.querySelector('[data-k=font]');
    if (document.activeElement !== f) f.value = fam.includes('cinzel') ? 'var(--display)' : fam.includes('source sans') ? 'var(--body)' : '';
  }
  function makeBar() {
    bar = document.createElement('div'); bar.id = 'tw-tbar';
    bar.innerHTML = `<select data-k="font" title="Font">${FONTS.map(([v, t]) => `<option value='${v}'>${t}</option>`).join('')}</select>
      <span class="tb-g"><button data-c="smaller" title="Smaller">A−</button><input data-k="size" type="number" step="0.5" min="6" max="200" title="Size (px)"><button data-c="bigger" title="Larger">A+</button></span>
      <span class="tb-g"><input data-k="color" type="color" title="Colour">${SWATCH.map(([c, t]) => `<button class="sw" data-sw="${c}" title="${t}" style="background:${c}"></button>`).join('')}</span>
      <span class="tb-g"><button data-c="bold" title="Bold"><b>B</b></button><button data-c="italic" title="Italic"><i>I</i></button><button data-c="underline" title="Underline"><u>U</u></button></span>
      <span class="tb-g"><button data-al="left" title="Align left">⟸</button><button data-al="center" title="Centre">≡</button><button data-al="right" title="Align right">⟹</button><button data-al="justify" title="Justify">☰</button></span>
      <select data-k="lh" title="Line spacing"><option value="">Spacing…</option>${[1, 1.15, 1.3, 1.45, 1.6, 1.8, 2].map((v) => `<option>${v}</option>`).join('')}</select>
      <button data-c="clear" title="Remove formatting from the selection">Clear</button><button data-c="done" class="tb-done">Done</button>`;
    document.body.appendChild(bar);
    bar.addEventListener('mousedown', (e) => { if (!e.target.closest('select,input')) e.preventDefault(); });   // keep the text selection
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.sw) return styleText('color', b.dataset.sw);
      if (b.dataset.al) return alignText(b.dataset.al);
      const c = b.dataset.c, sz = bar.querySelector('[data-k=size]');
      if (c === 'bigger' || c === 'smaller') { const v = Math.max(6, (+sz.value || 16) + (c === 'bigger' ? 1 : -1)); sz.value = v; return styleText('fontSize', v + 'px'); }
      if (c === 'clear') return clearText();
      if (c === 'done') return endText();
      cmd(c);
    });
    bar.querySelector('[data-k=font]').addEventListener('change', (e) => { if (e.target.value) styleText('fontFamily', e.target.value); });
    bar.querySelector('[data-k=size]').addEventListener('change', (e) => { if (+e.target.value) styleText('fontSize', +e.target.value + 'px'); });
    bar.querySelector('[data-k=color]').addEventListener('input', (e) => styleText('color', e.target.value));
    bar.querySelector('[data-k=lh]').addEventListener('change', (e) => { if (e.target.value) { const r = restore(); if (r) { for (const b of blocksIn(r)) b.style.lineHeight = e.target.value; changed(); } } });
  }
  function startText(e) {
    if (editing === e) return;
    endText();
    editing = e; select(e);
    before = stateOf(e);
    const t = txtOf(e);
    t.contentEditable = 'true'; t.spellcheck = true; e.classList.add('tw-typing'); if (box) box.classList.add('typing');
    t.focus();
    if (!bar) makeBar();
    bar.style.display = '';
    const sl = getSelection(); if (sl.rangeCount && inEdit(sl.getRangeAt(0).commonAncestorContainer)) saved = sl.getRangeAt(0).cloneRange();
    syncBar();
    panel.querySelector('.e-tip').textContent = 'Typing in a text box. Select words to style them, or put the cursor in a paragraph. Click outside or press Esc to finish.';
  }
  function endText() {
    if (!editing) return;
    const e = editing, t = txtOf(e);
    t.removeAttribute('contenteditable'); t.removeAttribute('spellcheck'); e.classList.remove('tw-typing'); if (box) box.classList.remove('typing');
    t.querySelectorAll('span[style=""]').forEach((d) => d.replaceWith(...d.childNodes));   // tidy wrappers left empty by restyling
    editing = null; saved = null;
    if (bar) bar.style.display = 'none';
    const v = stateOf(e);
    if (v.html !== before.html) commit(e, v, before);
    relayout(); place(); label();
    if (panel) panel.querySelector('.e-tip').textContent = TIP;
  }

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
      <p class="e-tip">${TIP}</p>
      <div class="e-row"><button type="button" data-a="undo">Undo</button><button type="button" data-a="reset">Reset page</button>
      <button type="button" data-a="save">Save</button><button type="button" data-a="close">Done</button></div>`;
    document.body.appendChild(panel);
    panel.addEventListener('click', (e) => {
      const a = e.target.closest('button'); if (!a) return;
      ({ undo: doUndo, reset: resetPage, save: download, close: hide })[a.dataset.a]();
    });
    if (innerWidth < 700) panel.querySelector('.e-tip').textContent = 'Widen the window to edit (the page stacks on phones).';
    addEventListener('pointerdown', onDown, true); addEventListener('keydown', onKey); addEventListener('click', blockClick, true); addEventListener('dblclick', onDbl, true);
    addEventListener('resize', place); addEventListener('scroll', place, { passive: true });
    document.addEventListener('copy', onCopyEv); document.addEventListener('cut', onCutEv); document.addEventListener('paste', onPaste);
    select(null);
  }
  function hide() {
    if (!on) return;
    endText(); if (bar) { bar.remove(); bar = null; }
    if (sel) sel.classList.remove('tw-selected');
    on = false; sel = null; clearGuides();
    document.body.classList.remove('tw-editing');
    box && box.remove(); panel && panel.remove(); box = panel = null;
    removeEventListener('pointerdown', onDown, true); removeEventListener('keydown', onKey); removeEventListener('click', blockClick, true); removeEventListener('dblclick', onDbl, true);
    document.removeEventListener('copy', onCopyEv); document.removeEventListener('cut', onCutEv); document.removeEventListener('paste', onPaste);
    removeEventListener('resize', place); removeEventListener('scroll', place);
    if (location.hash === '#edit') history.replaceState(null, '', location.pathname + location.search);
  }
  const hasFiles = (e) => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
  let dropHint = null;
  addEventListener('dragover', (e) => {
    if (!canvas || !hasFiles(e) || innerWidth < 700) return;
    e.preventDefault(); e.dataTransfer.dropEffect = 'copy';
    if (!dropHint) { dropHint = document.createElement('div'); dropHint.id = 'tw-drop'; dropHint.textContent = 'Drop to add to this page'; document.body.appendChild(dropHint); }
  });
  const unhint = () => { if (dropHint) { dropHint.remove(); dropHint = null; } };
  addEventListener('dragleave', (e) => { if (!e.relatedTarget) unhint(); });
  addEventListener('drop', (e) => {
    if (!canvas || !hasFiles(e) || innerWidth < 700) return;
    e.preventDefault(); unhint();
    if (!on) open();
    addFiles(e.dataTransfer.files, e.clientX, e.clientY);
  });
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-edit-toggle]');
    if (t) { e.preventDefault(); on ? hide() : open(); }
  });
  if (location.hash === '#edit') open();
})();
