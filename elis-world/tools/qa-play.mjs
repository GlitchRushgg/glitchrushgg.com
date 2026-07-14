import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "..", "..", "games", "elizabeth-flofy", "tools", "package.json"));
const { chromium } = require("playwright-core");
const OUT = join(here, "shots");
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = [];
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
await page.goto("http://127.0.0.1:8127/elis-world/", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await page.evaluate(() => localStorage.removeItem("elizabethsWorld_v1"));
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(3000);
await page.mouse.click(700, 460);
await page.waitForTimeout(1500);

const tap = async (x, y) => { await page.mouse.click(x, y); await page.waitForTimeout(500); };
const drag = async (x1, y1, x2, y2) => {
  await page.mouse.move(x1, y1); await page.mouse.down();
  await page.mouse.move((x1 + x2) / 2, (y1 + y2) / 2, { steps: 8 });
  await page.mouse.move(x2, y2, { steps: 8 }); await page.mouse.up();
  await page.waitForTimeout(700);
};
const go = async (r) => { await page.evaluate((r) => { window.__ew.room = r; window.__ew._buildRoom(); window.__ew._refreshDots(); }, r); await page.waitForTimeout(700); };
const state = () => page.evaluate(() => {
  const S = window.__ew;
  return { room: S.room, oven: !!S._ovenOpen, drawers: !!S._drawersOpen, tub: !!S._tubOn, items: S.items.map((i) => i._item), chars: Object.keys(S.chars), shadows: S._shadowed.length, wfx: S._weatherFx.length, skyfx: S._skyFx.length };
});

// --- COCINA: horno + gavetas + comedor ---
await go("kitchen");
await tap(350, 600);                 // horno
await tap(590, 600);                 // gavetas
console.log("cocina:", JSON.stringify(await state()));
await page.screenshot({ path: join(OUT, "p-kitchen-open.png") });
// sentar a alguien en la mesa: traer a Eli a la cocina
await page.evaluate(() => { const S = window.__ew; S._spawnChar("elizabeth", 300, 690); });
await page.waitForTimeout(400);
await drag(300, 620, 1090, 600);     // Eli → mesa
await page.screenshot({ path: join(OUT, "p-kitchen-dine.png") });
console.log("Eli sentada:", await page.evaluate(() => !!window.__ew.chars.elizabeth?._sitting));

// --- BAÑO: tina + bañar a Rainbow + toalla ---
await go("bathroom");
await tap(340, 600);                 // abrir la tina
await page.waitForTimeout(2600);
await page.evaluate(() => { window.__ew._spawnChar("rainbow", 900, 690); });
await page.waitForTimeout(300);
await drag(900, 640, 340, 560);      // Rainbow → tina
await page.screenshot({ path: join(OUT, "p-bath-fill.png") });
console.log("baño:", JSON.stringify(await state()), "bañando:", await page.evaluate(() => !!window.__ew.chars.rainbow?._bathing));
await tap(596, 450);                 // toalla → secar
await page.waitForTimeout(600);
console.log("tras toalla, bañando:", await page.evaluate(() => !!window.__ew.chars.rainbow?._bathing));

// --- JARDÍN: regar ---
await go("garden");
await tap(940, 650);                 // regadera
await page.waitForTimeout(1400);
await page.screenshot({ path: join(OUT, "p-garden-water.png") });

// --- CLIMA + HORA ---
for (const [t, w, tag] of [[2, 1, "night-rain"], [1, 2, "sunset-snow"], [0, 3, "day-cloudy"]]) {
  await page.evaluate(({ t, w }) => {
    const S = window.__ew;
    const TIMES = ["day", "sunset", "night"], WEA = ["clear", "rain", "snow", "cloudy"];
    const sv = JSON.parse(localStorage.getItem("elizabethsWorld_v1"));
    while (sv.sky !== TIMES[t]) { S._cycleSky(); sv.sky = JSON.parse(localStorage.getItem("elizabethsWorld_v1")).sky; }
    while (sv.weather !== WEA[w]) { S._cycleWeather(); sv.weather = JSON.parse(localStorage.getItem("elizabethsWorld_v1")).weather; }
  }, { t, w });
  await page.waitForTimeout(1600);
  await page.screenshot({ path: join(OUT, `w-garden-${tag}.png`) });
  await go("living");
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(OUT, `w-living-${tag}.png`) });
  await go("garden");
}
await go("balcony");
await page.waitForTimeout(1400);
await page.screenshot({ path: join(OUT, "w-balcony-day-cloudy.png") });

const fps = await page.evaluate(() => Math.round(window.__ew.game.loop.actualFps));
const heap = await page.evaluate(() => Math.round((performance.memory?.usedJSHeapSize || 0) / 1048576));
console.log(JSON.stringify({ fps, heapMB: heap, errs: errs.slice(0, 10) }, null, 1));
await browser.close();
