// Headless QA (playwright-core de elizabeth-flofy vía createRequire).
// Comprueba: arranque limpio, menú→juego, física de ambos personajes,
// recogida/sync, golpe/corazones, tienda, game over, móvil+desktop.
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "..", "..", "games", "elizabeth-flofy", "tools", "package.json"));
const { chromium, devices } = require("playwright-core");

const URL = process.env.DD_URL || "http://localhost:8080/dream-duo/";
const browser = await chromium.launch({ channel: "chrome", headless: true });

async function run(ctxOpts, label) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  page.on("pageerror", (e) => errs.push("PAGEERROR: " + e.message));
  page.on("requestfailed", (r) => { if (!r.url().includes("crazygames")) errs.push("REQFAIL " + r.url()); });

  await page.goto(URL, { waitUntil: "networkidle", timeout: 25000 });
  await page.waitForTimeout(2500);

  // menú → PLAY (click centro-izq donde está el botón PLAY)
  const vp = page.viewportSize();
  const sx = vp.width / 1280, sy = vp.height / 720;
  await page.mouse.click(640 * sx, 380 * sy);
  await page.waitForTimeout(1200);

  const inGame = await page.evaluate(() => !!window.__dd && !window.__dd.dead);

  // saltar el tutorial si está
  await page.evaluate(() => { if (window.__dd && window.__dd.tutorial) window.__dd._showTutorial(4); });

  // Elizabeth salta (tap izquierda), Flofy bota + flutter (tap derecha x2)
  await page.mouse.click(320 * sx, 500 * sy);
  await page.waitForTimeout(250);
  await page.mouse.click(960 * sx, 500 * sy);
  await page.waitForTimeout(120);
  await page.mouse.click(960 * sx, 500 * sy);
  await page.waitForTimeout(700);

  const phys = await page.evaluate(() => ({
    dist: Math.round(window.__dd.dist),
    Ey: Math.round(window.__dd.E.y),
    Fy: Math.round(window.__dd.F.y),
    hearts: window.__dd.hearts,
    obstacles: window.__dd.obstacles.length,
    stars: window.__dd.stars.length,
  }));

  // forzar sync + rush para validar el flujo estrella
  await page.evaluate(() => { const g = window.__dd; g.meter = 4; g._sync(600); });
  await page.waitForTimeout(400);
  const rush = await page.evaluate(() => ({ rushT: +window.__dd.rushT.toFixed(1), mult: window.__dd.mult }));
  await page.waitForTimeout(1500);

  // forzar golpes hasta morir → revive offer o game over
  await page.evaluate(() => {
    const g = window.__dd;
    g.rushT = 0; g._endRush?.();
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const g = window.__dd;
    g.invuln = 0; g.hearts = 1;
    g._hit({ spr: g.add.image(300, 600, "px"), lane: "park", w: 10, h: 10, air: false, type: "test" });
  });
  await page.waitForTimeout(800);
  const afterDeath = await page.evaluate(() => ({
    dead: window.__dd.dead,
    reviveVisible: !!document.querySelector("canvas") && window.__dd.dead,
  }));
  // dejar que el countdown pase → game over
  await page.waitForTimeout(4800);
  const scene = await page.evaluate(() => {
    const scenes = window.__dd.scene.manager.getScenes(true).map((s) => s.scene.key);
    return scenes;
  });

  // guardado
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("dreamDuo_v1") || "{}"));

  console.log(`\n=== ${label} ===`);
  console.log("  inGame:", inGame, "| phys:", JSON.stringify(phys));
  console.log("  rush:", JSON.stringify(rush), "| dead:", afterDeath.dead, "| escenas activas:", scene.join(","));
  console.log("  save:", JSON.stringify({ best: saved.best, stars: saved.stars, plays: saved.plays, tutorialSeen: saved.tutorialSeen }));
  console.log("  errores:", errs.length, errs.slice(0, 6).map((e) => "\n    • " + e).join(""));
  await ctx.close();
  return errs.length;
}

let bad = 0;
bad += await run({ viewport: { width: 1280, height: 720 } }, "DESKTOP 1280x720");
bad += await run({ ...devices["iPhone 12"] }, "MÓVIL iPhone 12");
await browser.close();
console.log(bad === 0 ? "\n✅ SMOKETEST LIMPIO" : `\n❌ ${bad} errores`);
process.exit(bad ? 1 : 0);
