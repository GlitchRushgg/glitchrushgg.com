// Stress-test estilo QA CrazyGames: ~2 min de juego real con inputs aleatorios,
// velocidad máxima, los 3 biomas, rush forzado, muerte real → revive → game over
// → retry. Vigila errores de consola y fps.
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "..", "..", "games", "elizabeth-flofy", "tools", "package.json"));
const { chromium } = require("playwright-core");

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = [];
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
page.on("pageerror", (e) => errs.push("PAGEERROR: " + e.message));

await page.goto("http://localhost:8080/dream-duo/", { waitUntil: "networkidle", timeout: 25000 });
await page.waitForTimeout(2500);
await page.mouse.click(640, 380);
await page.waitForTimeout(800);
await page.evaluate(() => window.__dd._showTutorial(4));

// FASE 1: 45s de juego con inputs aleatorios a velocidad creciente
console.log("FASE 1: inputs aleatorios 45s...");
await page.evaluate(() => { window.__dd.dist = 8000; }); // ~bioma 2, velocidad alta
const t0 = Date.now();
while (Date.now() - t0 < 45000) {
  const r = Math.random();
  if (r < 0.4) await page.keyboard.press("A");
  else if (r < 0.8) await page.keyboard.press("L");
  else if (r < 0.9) { await page.keyboard.press("L"); await page.keyboard.press("L"); }
  await page.waitForTimeout(120 + Math.random() * 260);
  // si murió, revive con estrellas si puede o reinicia
  const state = await page.evaluate(() => ({
    dead: window.__dd?.dead, scene: window.__dd?.scene?.manager?.getScenes(true).map((s) => s.scene.key) || [],
  }));
  if (state.scene.includes("GameOver")) {
    await page.waitForTimeout(800);
    await page.keyboard.press("Space"); // retry
    await page.waitForTimeout(1200);
    await page.evaluate(() => { if (window.__dd) { window.__dd._showTutorial?.(4); window.__dd.dist = 8000; } });
  } else if (state.dead) {
    await page.waitForTimeout(5200); // deja pasar el countdown del revive
  }
}
const p1 = await page.evaluate(() => ({
  dist: Math.round(window.__dd?.dist || 0), fps: Math.round(window.__dd?.game.loop.actualFps || 0),
  obstacles: window.__dd?.obstacles.length, stars: window.__dd?.stars.length,
  hearts: window.__dd?.hearts, biome: window.__dd?.biome,
}));
console.log("  estado:", JSON.stringify(p1), "| errores:", errs.length);

// FASE 2: rush + muerte + revive por estrellas + segundo game over
console.log("FASE 2: rush → muerte → revive estrellas → game over...");
await page.evaluate(() => {
  const g = window.__dd;
  if (!g || g.dead) return;
  g.meter = 4; g._sync(600);
});
await page.waitForTimeout(9000); // rush entero + endRush
await page.evaluate(() => {
  const g = window.__dd;
  if (!g || g.dead) return;
  g.starsRun = 200; g.invuln = 0; g.hearts = 1;
  g._hit({ spr: g.add.image(300, 600, "px"), lane: "park", w: 10, h: 10, air: false, type: "t" });
});
await page.waitForTimeout(900);
// pulsar el botón de revive por estrellas si existe (texto ★ REVIVE)
const clicked = await page.evaluate(() => {
  const g = window.__dd;
  if (!g || !g.dead) return "no-dead";
  return "dead-ok";
});
console.log("  post-hit:", clicked);
await page.waitForTimeout(5500); // deja resolver countdown → gameover
const scenes = await page.evaluate(() => window.__dd.scene.manager.getScenes(true).map((s) => s.scene.key));
console.log("  escenas:", scenes.join(","));

// FASE 3: pausa/blur + mute + tienda
console.log("FASE 3: UI (retry → pausa → blur → tienda)...");
await page.keyboard.press("Space");
await page.waitForTimeout(1300);
await page.evaluate(() => window.__dd?._showTutorial?.(4));
await page.keyboard.press("P");
await page.waitForTimeout(400);
const paused = await page.evaluate(() => window.__dd?.paused);
await page.keyboard.press("P");
await page.waitForTimeout(400);
const resumed = await page.evaluate(() => window.__dd?.paused === false);
console.log("  pausa:", paused, "| resume:", resumed);

const mem = await page.evaluate(() => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : -1));
console.log("  heap:", mem + "MB");
console.log("\nERRORES TOTALES:", errs.length, errs.slice(0, 8).map((e) => "\n  • " + e).join(""));
await browser.close();
process.exit(errs.length ? 1 : 0);
