import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "..", "..", "games", "elizabeth-flofy", "tools", "package.json"));
const { chromium } = require("playwright-core");
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--js-flags=--expose-gc"] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = [];
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
await page.goto("http://127.0.0.1:8127/elis-world/", { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.removeItem("elizabethsWorld_v1"));
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(2600);
await page.mouse.click(700, 460);
await page.waitForTimeout(1400);
const go = async (r) => { await page.evaluate((r) => { const S = window.__ew; S.room = r; S._buildRoom(); S._refreshDots(); }, r); await page.waitForTimeout(260); };
const snap = () => page.evaluate(() => ({
  heapMB: +((performance.memory?.usedJSHeapSize || 0) / 1048576).toFixed(1),
  tweens: window.__ew.tweens.getTweens().length,
  objetos: window.__ew.children.list.length,
  sombras: window.__ew._shadowed.length,
}));
const ROOMS = ["living","kitchen","bathroom","bedroom","garden","balcony"];
await go("living");
console.log("inicio:  ", JSON.stringify(await snap()));
// con lluvia puesta (partículas) para forzar
await page.evaluate(() => { const S = window.__ew; S._cycleWeather(); });
for (let i = 0; i < 4; i++) for (const r of ROOMS) await go(r);
console.log("24 saltos:", JSON.stringify(await snap()));
for (let i = 0; i < 4; i++) for (const r of ROOMS) await go(r);
await page.waitForTimeout(1500);
console.log("48 saltos:", JSON.stringify(await snap()));
console.log("fps:", await page.evaluate(() => Math.round(window.__ew.game.loop.actualFps)), "| errores:", JSON.stringify(errs.slice(0, 6)));
await browser.close();
