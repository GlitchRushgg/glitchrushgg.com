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
page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
const boot = async () => {
  await page.goto("http://127.0.0.1:8127/elis-world/", { waitUntil: "networkidle" });
  await page.waitForTimeout(2600);
  await page.mouse.click(700, 460);
  await page.waitForTimeout(1400);
};
const go = async (r) => { await page.evaluate((r) => { const S = window.__ew; S.room = r; S._buildRoom(); S._refreshDots(); }, r); await page.waitForTimeout(700); };
const drag = async (x1, y1, x2, y2) => {
  await page.mouse.move(x1, y1); await page.mouse.down();
  await page.mouse.move((x1+x2)/2, (y1+y2)/2, { steps: 8 });
  await page.mouse.move(x2, y2, { steps: 8 }); await page.mouse.up();
  await page.waitForTimeout(700);
};
await page.goto("http://127.0.0.1:8127/elis-world/", { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.removeItem("elizabethsWorld_v1"));
await boot();

// cocina: abrir nevera → dejar comida; hornear pan
await go("kitchen");
await page.mouse.click(110, 600); await page.waitForTimeout(700);   // nevera
const spawned = await page.evaluate(() => window.__ew.items.map(i => i._item));
console.log("nevera da:", JSON.stringify(spawned));
// llevar el primer objeto al salón por la flecha izquierda
const first = await page.evaluate(() => { const i = window.__ew.items[0]; return { x: i.x, y: i.y, kind: i._item }; });
await drag(first.x, first.y, 40, 400);
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("elizabethsWorld_v1")).items.map(i => `${i.kind}@${i.room}`));
console.log("tras mandarlo por la flecha:", JSON.stringify(saved));

// RECARGAR: ¿sigue todo donde lo dejó?
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(2600);
await page.mouse.click(700, 460);
await page.waitForTimeout(1400);
const afterReload = await page.evaluate(() => ({ room: window.__ew.room, items: window.__ew.items.map(i => i._item) }));
console.log("tras recargar, en el salón:", JSON.stringify(afterReload));
await go("kitchen");
console.log("tras recargar, en la cocina:", JSON.stringify(await page.evaluate(() => window.__ew.items.map(i => i._item))));

// comerse uno → desaparece del guardado
await page.evaluate(() => window.__ew._spawnChar("elizabeth", 400, 690));
await page.waitForTimeout(300);
const it = await page.evaluate(() => { const i = window.__ew.items[0]; return { x: i.x, y: i.y }; });
await drag(it.x, it.y, 400, 620);
await page.waitForTimeout(900);
console.log("guardados tras comer:", await page.evaluate(() => JSON.parse(localStorage.getItem("elizabethsWorld_v1")).items.length));

// paseo largo por las 6 salas x3 (fugas)
for (let i = 0; i < 3; i++) for (const r of ["living","kitchen","bathroom","bedroom","garden","balcony"]) await go(r);
const end = await page.evaluate(() => ({
  fps: Math.round(window.__ew.game.loop.actualFps),
  heapMB: Math.round((performance.memory?.usedJSHeapSize || 0) / 1048576),
  tweens: window.__ew.tweens.getTweens().length,
  objetos: window.__ew.children.list.length,
}));
console.log(JSON.stringify({ ...end, errs: errs.slice(0, 10) }, null, 1));
await browser.close();
