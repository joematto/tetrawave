// TetraWave ToolBox: all the working tools (Edit, Guide, Symmetry, Margins, Grid, Fonts, Ruler) sit in one
// "ToolBox" menu in the header, which is switched OFF unless turned on in this browser, so visitors never see
// the tools or change anything by accident.
//
//   Turn it on or off:  Ctrl + Option + T  (Ctrl + Alt + T on Windows), or add #toolbox to a page's address.
//   The menu also has "Turn ToolBox off". The choice is remembered by this browser only.
//
// While it is off: the ToolBox and the picture numbers are hidden, tool addresses (#edit, #grid ...) are
// ignored, and files dropped on a page are not added. (The page sets html.tools-on before it draws; see build.py.)
(() => {
  const KEY = 'tw-tools';
  const TOOL_HASHES = ['#edit', '#guide', '#symmetry', '#margins', '#grid', '#type', '#ruler', '#files'];
  const root = document.documentElement;
  const isOn = () => root.classList.contains('tools-on');
  const remember = (v) => { try { localStorage.setItem(KEY, v ? 'on' : 'off'); } catch (e) { /* storage unavailable */ } };
  const clearHash = () => history.replaceState(null, '', location.pathname + location.search);
  function turnOn() { root.classList.add('tools-on'); remember(true); }
  function turnOff() {
    remember(false); root.classList.remove('tools-on');
    if (location.hash) clearHash();
    location.reload();   // closes any tool that is open
  }
  window.twTools = isOn;

  // addresses: #toolbox turns it on; tool addresses do nothing while it is off
  if (location.hash === '#toolbox') { turnOn(); clearHash(); }
  else if (!isOn() && TOOL_HASHES.includes(location.hash)) clearHash();
  addEventListener('hashchange', (e) => {   // registered before the tools' own listeners, so it can stop them
    if (location.hash === '#toolbox') { e.stopImmediatePropagation(); turnOn(); clearHash(); return; }
    if (!isOn() && TOOL_HASHES.includes(location.hash)) { e.stopImmediatePropagation(); clearHash(); }
  });

  addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.altKey && !e.metaKey && e.code === 'KeyT') { e.preventDefault(); isOn() ? turnOff() : turnOn(); }
  });

  // the menu
  document.addEventListener('click', (e) => {
    const off = e.target.closest('[data-tools-off]');
    if (off) { e.preventDefault(); turnOff(); return; }
    const btn = e.target.closest('.tb-btn');
    document.querySelectorAll('.tl-dev.open').forEach((m) => { if (!btn || !m.contains(btn)) { m.classList.remove('open'); m.querySelector('.tb-btn').setAttribute('aria-expanded', 'false'); } });
    if (btn) {
      const m = btn.closest('.tl-dev'), open = !m.classList.contains('open');
      m.classList.toggle('open', open); btn.setAttribute('aria-expanded', String(open));
    }
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') document.querySelectorAll('.tl-dev.open').forEach((m) => m.classList.remove('open')); });
})();
