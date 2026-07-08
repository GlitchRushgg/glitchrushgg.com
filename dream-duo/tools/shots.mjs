// Capturas de pantalla de cada estado para revisión visual.
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "..", "..", "games", "elizabeth-flofy", "tools", "package.json"));
const { chromium } = require("playwright-core");

const URL = "http://localhost:8080/dream-duo/";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
await page.goto(URL, { waitUntil: "networkidle", timeout: 25000 });
await page.waitForTimeout(2600);
await page.screenshot({ path: join(here, "shot-menu.png") });

// jugar
await page.mouse.click(640, 380);
await page.waitForTimeout(900);
await page.evaluate(() => window.__dd._showTutorial(4));
await page.screenshot({ path: join(here, "shot-early.png") });

// avanzar para ver obstáculos y estrellas
await page.evaluate(() => { window.__dd.dist = 3000; window.__dd._obClock = 0; window.__dd._starClock = 0; });
await page.waitForTimeout(2600);
await page.screenshot({ path: join(here, "shot-play.png") });

// bioma 2 (sunset)
await page.evaluate(() => { window.__dd.dist = 5000; });
await page.waitForTimeout(2200);
await page.screenshot({ path: join(here, "shot-sunset.png") });

// FAIRY RUSH
await page.evaluate(() => { const g = window.__dd; g.meter = 4; g._sync(640); });
await page.waitForTimeout(1600);
await page.screenshot({ path: join(here, "shot-rush.png") });

// power-up familia visible
await page.evaluate(() => { const g = window.__dd; g.rushT = 0.05; });
await page.waitForTimeout(1200);
await page.evaluate(() => { window.__dd._spawnPickup(); window.__dd.pickups.forEach(p => { p.spr.x = 800; p.glow.x = 800; }); });
await page.waitForTimeout(300);
await page.screenshot({ path: join(here, "shot-pickup.png") });

// tienda
await page.evaluate(() => { const g = window.__dd; g.dead = true; g.scene.start("Shop"); });
await page.waitForTimeout(900);
await page.screenshot({ path: join(here, "shot-shop.png") });

// game over
await page.evaluate(() => {
  const sc = window.__dd.scene;
  sc.manager.getScene("Shop").scene.start("GameOver", { score: 1234, meters: 456, stars: 78, maxMult: 4 });
});
await page.waitForTimeout(1100);
await page.screenshot({ path: join(here, "shot-over.png") });

await browser.close();
console.log("shots OK");
