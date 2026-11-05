const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const [vw, tag] of [[1280,'d'],[390,'m']]) {
    const p = await b.newPage({ viewport: { width: vw, height: 900 }, reducedMotion: 'reduce' });
    for (const f of ['index.html','part-2-the-geometry.html','11-11-grid.html','3d-exploration-cad-models.html']) {
      await p.goto('file://' + process.cwd() + '/preview/' + f); await p.waitForTimeout(400);
      const sw = await p.evaluate(() => document.documentElement.scrollWidth);
      console.log(tag, f, 'scrollWidth', sw);
      await p.screenshot({ path: `shots/${tag}-${f}.png`, fullPage: f !== '11-11-grid.html' });
    }
  }
  await b.close();
})();
