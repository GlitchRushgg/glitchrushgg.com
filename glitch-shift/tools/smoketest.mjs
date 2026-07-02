// Prueba de humo headless con el Chrome instalado. Reutiliza playwright-core de
// games/elizabeth-flofy/tools/node_modules (sin instalar nada nuevo):
//   $env:NODE_PATH="<repo>\games\elizabeth-flofy\tools\node_modules"; node smoketest.mjs
// Requiere el server en :8080 (npx http-server desde la raíz del repo).

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");

const PAGE = "http://localhost:8080/glitch-shift/";
const here = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });

const logs = [];
page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => logs.push(`[PAGEERROR] ${e.message}\n${e.stack || ""}`));
page.on("requestfailed", (r) => logs.push(`[REQFAIL] ${r.url()} -> ${r.failure()?.errorText}`));

await page.goto(PAGE, { waitUntil: "load" });
await page.waitForTimeout(2200);

const info = await page.evaluate(() => {
  const c = document.querySelector("canvas");
  return {
    hasPhaser: typeof window.Phaser !== "undefined",
    canvas: c ? { w: c.width, h: c.height } : null,
  };
});
console.log("INFO:", JSON.stringify(info));
await page.screenshot({ path: here + "shot-menu.png" });

// Jugar: click en PLAY (centro, y≈430 lógico → escala al viewport).
const box = await page.evaluate(() => {
  const c = document.querySelector("canvas");
  const r = c.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});
const lx = (px) => box.x + (px / 1280) * box.w;
const ly = (py) => box.y + (py / 720) * box.h;

await page.mouse.click(lx(640), ly(430)); // PLAY
await page.waitForTimeout(900);
await page.screenshot({ path: here + "shot-play.png" });

// Shiftear unas cuantas veces y sobrevivir un rato.
for (let i = 0; i < 16; i++) {
  await page.keyboard.press("Space");
  await page.waitForTimeout(Math.random() * 500 + 250);
}
await page.screenshot({ path: here + "shot-game.png" });

// Estado interno.
const state = await page.evaluate(() => {
  const gs = window.__gs;
  return gs ? { dist: Math.round(gs.distPx), dead: gs.dead, bits: gs.runBits, obstacles: gs.obstacles.length } : null;
});
console.log("STATE:", JSON.stringify(state));

// Si murió: capturar GameOver y reintentar con ESPACIO.
if (state && state.dead) {
  await page.waitForTimeout(1300);
  await page.screenshot({ path: here + "shot-gameover.png" });
  await page.keyboard.press("Space");
  await page.waitForTimeout(700);
}

// Forzar sector 3 (invulnerable, solo para verificar láseres/paleta en juego).
await page.evaluate(() => {
  const gs = window.__gs;
  if (gs && !gs.dead) { gs.distPx = 50000; gs.invuln = 999; }
});
await page.waitForTimeout(2600);
await page.screenshot({ path: here + "shot-sector3.png" });

// Tienda (desde el menú).
await page.goto(PAGE, { waitUntil: "load" });
await page.waitForTimeout(1500);
await page.mouse.click(lx(640), ly(512)); // SHOP
await page.waitForTimeout(700);
await page.screenshot({ path: here + "shot-shop.png" });

console.log("LOGS:\n" + (logs.join("\n") || "(sin logs)"));
await browser.close();
