// Headless smoketest (CJS: NODE_PATH only resolves for require()).
// Usage: NODE_PATH=<repo>\games\elizabeth-flofy\tools\node_modules node smoketest.cjs
// Requires the repo served at :8080.
const { chromium } = require("playwright-core");
const path = require("path");
const here = __dirname + path.sep;

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });

  const logs = [];
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(`[${m.type()}] ${m.text()}`); });
  page.on("pageerror", (e) => logs.push(`[PAGEERROR] ${e.message}`));

  await page.goto("http://localhost:8080/hop-and-run/", { waitUntil: "load" });
  await page.waitForTimeout(2600);
  const info = await page.evaluate(() => ({
    hasPhaser: typeof window.Phaser !== "undefined",
    canvas: !!document.querySelector("canvas"),
  }));
  console.log("INFO:", JSON.stringify(info));
  await page.screenshot({ path: here + "shot-menu.png" });

  const box = await page.evaluate(() => {
    const r = document.querySelector("canvas").getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  const lx = (px) => box.x + (px / 1280) * box.w;
  const ly = (py) => box.y + (py / 720) * box.h;

  await page.mouse.click(lx(640), ly(636)); // PLAY
  await page.waitForTimeout(1200);
  await page.screenshot({ path: here + "shot-play.png" });

  // Immortal bot from the start: refill energy, rescue from gaps.
  await page.evaluate(() => {
    const g = window.__hr;
    if (!g || g.dead) return;
    g.invuln = 999;
    setInterval(() => {
      if (!window.__hr || window.__hr.dead) return;
      const h = window.__hr;
      h.invuln = 999;
      h.energy = Math.max(h.energy, 80);
      if (h.player.y > 640) { h.player.y = 200; h.player.body.velocity.y = 0; }
    }, 120);
  });

  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("Space");
    await page.waitForTimeout(380 + Math.random() * 300);
  }
  const st = await page.evaluate(() => {
    const g = window.__hr;
    return g ? { m: Math.floor(g.dist / 50), energy: Math.round(g.energy), dead: g.dead, animals: g.animals } : null;
  });
  console.log("STATE:", JSON.stringify(st));

  // Force the guitar solo + later sectors to exercise those paths.
  await page.evaluate(() => {
    const g = window.__hr;
    if (!g || g.dead) return;
    g._startSolo();
    g.dist = Math.max(g.dist, 26000);
  });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: here + "shot-solo.png" });
  await page.evaluate(() => { const g = window.__hr; if (g && !g.dead) { g.energy = 100; g.dist = Math.max(g.dist, 56000); } });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: here + "shot-night.png" });

  const st2 = await page.evaluate(() => {
    const g = window.__hr;
    return g ? { m: Math.floor(g.dist / 50), sector: g.sectorIx, dead: g.dead } : null;
  });
  console.log("STATE2:", JSON.stringify(st2));
  console.log("LOGS:\n" + (logs.join("\n") || "(clean)"));
  await browser.close();
})();
