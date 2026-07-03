// Prueba de humo headless con el Chrome instalado. Reutiliza playwright-core de
// games/elizabeth-flofy/tools/node_modules (sin instalar nada nuevo):
//   NODE_PATH="<repo>/games/elizabeth-flofy/tools/node_modules" node smoketest.mjs
// Requiere el server en :8080 (npx http-server desde la raíz del repo).

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");

const PAGE = "http://localhost:8080/ricochet-rush/";
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

const box = await page.evaluate(() => {
  const c = document.querySelector("canvas");
  const r = c.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});
const lx = (px) => box.x + (px / 1280) * box.w;
const ly = (py) => box.y + (py / 720) * box.h;

await page.mouse.click(lx(640), ly(400)); // PLAY
await page.waitForTimeout(1200);
await page.screenshot({ path: here + "shot-play.png" });

// Jugar 12s moviéndose con teclado (el disparo es automático).
const dirs = ["KeyW", "KeyD", "KeyS", "KeyA"];
for (let i = 0; i < 12; i++) {
  const k = dirs[i % 4];
  await page.keyboard.down(k);
  await page.waitForTimeout(900);
  await page.keyboard.up(k);
}
await page.screenshot({ path: here + "shot-game.png" });

const state = await page.evaluate(() => {
  const g = window.__rr;
  return g ? {
    t: Math.round(g.elapsed), kills: g.kills, dead: g.dead, level: g.level,
    enemies: g.enemies.length, bullets: g.bullets.length, hp: g.stats.hp,
  } : null;
});
console.log("STATE:", JSON.stringify(state));

// Forzar level-up para verificar las cartas.
await page.evaluate(() => {
  const g = window.__rr;
  if (g && !g.dead) { g.invuln = 999; g.xp = g.xpNeed; g._checkLevel(); }
});
await page.waitForTimeout(600);
await page.screenshot({ path: here + "shot-levelup.png" });
await page.keyboard.press("Digit1"); // elegir la carta 1
await page.waitForTimeout(600);

// Adelantar el reloj: tanks/splitters/élites + comprobar rendimiento.
await page.evaluate(() => { const g = window.__rr; if (g && !g.dead) g.elapsed = 230; });
await page.waitForTimeout(4000);
await page.screenshot({ path: here + "shot-late.png" });
const state2 = await page.evaluate(() => {
  const g = window.__rr;
  return g ? { t: Math.round(g.elapsed), enemies: g.enemies.length, bullets: g.bullets.length, drops: g.drops.length, dead: g.dead } : null;
});
console.log("STATE2:", JSON.stringify(state2));

// Tienda desde el menú.
await page.goto(PAGE, { waitUntil: "load" });
await page.waitForTimeout(1500);
await page.mouse.click(lx(640), ly(486)); // MEJORAS
await page.waitForTimeout(700);
await page.screenshot({ path: here + "shot-shop.png" });

console.log("LOGS:\n" + (logs.join("\n") || "(sin logs)"));
await browser.close();
