// TetraWave on-screen ruler. Open any page with  #ruler  at the end of its address.
// Drag the ruler to move it. Buttons: Rotate (horizontal/vertical), − / + (calibrate), Close.
// Calibrate once: hold a real ruler to the screen and press − / + until the 1-inch marks match.
// The setting is remembered in this browser.
(() => {
  const KEY = 'tw-ruler-ppi';
  let ppi = 96;
  try { ppi = parseFloat(localStorage.getItem(KEY)) || 96; } catch (e) {}
  let vertical = false, x = 120, y = 160, el = null;
  const INCHES = 12;

  const css = `
  #tw-ruler { position: fixed; z-index: 9999; left: 0; top: 0; touch-action: none; user-select: none; cursor: grab;
    font: 11px/1 ui-monospace, Menlo, monospace; color: #15191e; transform-origin: 0 0; }
  #tw-ruler.drag { cursor: grabbing; }
  #tw-ruler canvas { display: block; box-shadow: 0 2px 14px rgba(0,0,0,.6); border-radius: 2px; }
  #tw-ruler .tw-ctl { position: absolute; left: 6px; bottom: 6px; display: flex; gap: 6px; align-items: center; }
  #tw-ruler button { font: 600 11px/1 ui-monospace, Menlo, monospace; padding: 5px 7px; border: 1px solid #5d656e; border-radius: 2px;
    background: linear-gradient(#fdfdfe, #cfd4da); color: #15191e; cursor: pointer; }
  #tw-ruler .read { background: rgba(250,251,252,.85); padding: 4px 6px; border-radius: 2px; white-space: nowrap; }`;

  function draw(c) {
    const len = Math.round(INCHES * ppi), H = 96, dpr = devicePixelRatio || 1;
    c.width = len * dpr; c.height = H * dpr; c.style.width = len + 'px'; c.style.height = H + 'px';
    const g = c.getContext('2d'); g.scale(dpr, dpr);
    // brushed stainless steel
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#f4f6f8'); grad.addColorStop(0.18, '#c9ced4'); grad.addColorStop(0.5, '#e3e6ea');
    grad.addColorStop(0.82, '#b4bac1'); grad.addColorStop(1, '#8e959d');
    g.fillStyle = grad; g.fillRect(0, 0, len, H);
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 260; i++) {   // fine horizontal brush lines
      g.strokeStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.22)' : 'rgba(70,78,88,0.10)';
      const yy = rnd() * H, x0 = rnd() * len, w = 40 + rnd() * len * 0.5;
      g.beginPath(); g.moveTo(x0, yy + 0.5); g.lineTo(x0 + w, yy + 0.5); g.stroke();
    }
    g.strokeStyle = 'rgba(40,46,54,0.55)'; g.strokeRect(0.5, 0.5, len - 1, H - 1);
    g.strokeStyle = '#15191e'; g.fillStyle = '#15191e'; g.lineWidth = 1;
    // inches along the top edge, down to 1/16"
    for (let i = 0; i <= INCHES * 16; i++) {
      const px = Math.round(i * ppi / 16) + 0.5;
      const h = i % 16 === 0 ? 26 : i % 8 === 0 ? 18 : i % 4 === 0 ? 13 : i % 2 === 0 ? 9 : 6;
      g.beginPath(); g.moveTo(px, 0); g.lineTo(px, h); g.stroke();
      if (i % 16 === 0 && i) { g.font = '600 12px ui-monospace, Menlo, monospace'; g.fillText(String(i / 16) + '"', px + 3, 38); }
    }
    // screen pixels along the bottom edge
    for (let p = 0; p <= len; p += 10) {
      const h = p % 100 === 0 ? 16 : p % 50 === 0 ? 11 : 6;
      g.beginPath(); g.moveTo(p + 0.5, H); g.lineTo(p + 0.5, H - h); g.stroke();
      if (p % 100 === 0 && p) { g.font = '10px ui-monospace, Menlo, monospace'; g.fillText(p + ' px', p + 3, H - 18); }
    }
  }

  function place() {
    el.style.transform = vertical ? `translate(${x + 96}px, ${y}px) rotate(90deg)` : `translate(${x}px, ${y}px)`;
    el.querySelector('.read').textContent =
      `${ppi.toFixed(1)} px per inch · 10 px = ${(10 / ppi).toFixed(3)}" · zero at ${Math.round(x)}, ${Math.round(y + scrollY)} px`;
  }

  function open() {
    if (el) return;
    const st = document.createElement('style'); st.id = 'tw-ruler-css'; st.textContent = css; document.head.appendChild(st);
    el = document.createElement('div'); el.id = 'tw-ruler';
    el.innerHTML = '<canvas></canvas><div class="tw-ctl"><button data-a="rot" type="button">Rotate</button>' +
      '<button data-a="minus" type="button" title="Shrink the inch marks">−</button><button data-a="plus" type="button" title="Stretch the inch marks">+</button>' +
      '<span class="read"></span><button data-a="close" type="button">Close</button></div>';
    document.body.appendChild(el);
    draw(el.querySelector('canvas')); place();

    el.addEventListener('click', (e) => {
      const a = e.target.dataset && e.target.dataset.a; if (!a) return;
      if (a === 'rot') vertical = !vertical;
      if (a === 'minus' || a === 'plus') {
        ppi = Math.max(40, Math.min(400, ppi + (a === 'plus' ? 0.5 : -0.5) * (e.shiftKey ? 10 : 1)));
        try { localStorage.setItem(KEY, ppi); } catch (err) {}
        draw(el.querySelector('canvas'));
      }
      if (a === 'close') { history.replaceState(null, '', location.pathname + location.search); close(); return; }
      place();
    });
    let sx, sy, ox, oy, dragging = false;
    el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      dragging = true; sx = e.clientX; sy = e.clientY; ox = x; oy = y; el.setPointerCapture(e.pointerId); el.classList.add('drag');
    });
    el.addEventListener('pointermove', (e) => { if (!dragging) return; x = ox + e.clientX - sx; y = oy + e.clientY - sy; place(); });
    el.addEventListener('pointerup', () => { dragging = false; el.classList.remove('drag'); });
    addEventListener('scroll', () => el && place(), { passive: true });
    // arrow keys nudge 1px (Shift: 10px)
    addEventListener('keydown', (e) => {
      if (!el) return; const d = e.shiftKey ? 10 : 1;
      const k = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }[e.key];
      if (k) { x += k[0]; y += k[1]; place(); e.preventDefault(); }
    });
  }
  function close() { if (el) { el.remove(); el = null; } const s = document.getElementById('tw-ruler-css'); if (s) s.remove(); }

  const check = () => (location.hash === '#ruler' ? open() : close());
  addEventListener('hashchange', check); check();
  // "Ruler" link in the header (and in Contents): shows the ruler, or hides it if it is already showing
  document.querySelectorAll('[data-ruler-toggle]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    const toc = document.getElementById('toc'); if (toc) toc.hidden = true;
    if (location.hash === '#ruler') { history.replaceState(null, '', location.pathname + location.search); close(); }
    else { location.hash = 'ruler'; }
  }));
})();
