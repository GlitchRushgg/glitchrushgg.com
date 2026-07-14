import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "..", "..", "games", "elizabeth-flofy", "tools", "package.json"));
const { chromium } = require("playwright-core");
const OUT = process.argv[2] || join(here, "shots");
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = [];
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
await page.goto("http://127.0.0.1:8127/elis-world/", { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
await page.evaluate(() => localStorage.removeItem("elizabethsWorld_v1"));
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(3000);
await page.mouse.click(700, 460);          // PLAY
await page.waitForTimeout(1800);
const rooms = ["living", "kitchen", "bathroom", "bedroom", "garden", "balcony"];
for (const r of rooms) {
  await page.evaluate((r) => { window.__ew.room = r; window.__ew._buildRoom(); window.__ew._refreshDots(); }, r);
  await page.waitForTimeout(900);
  await page.screenshot({ path: join(OUT, `${r}.png`) });
}
// hora + clima en el balcón y en el salón
for (const [sky, weather, tag] of [["night", "rain", "night-rain"], ["sunset", "snow", "sunset-snow"], ["day", "cloudy", "day-cloudy"]]) {
  await page.evaluate(({ sky, weather }) => {
    const S = window.__ew;
    const sv = S.sys.game.scene.getScene("House");
    window.__save = window.__save || null;
    S._timeBtn.t.setText("x");
    const st = JSON.parse(localStorage.getItem("elizabethsWorld_v1") || "{}");
    st.sky = sky; st.weather = weather;
    localStorage.setItem("elizabethsWorld_v1", JSON.stringify(st));
  }, { sky, weather });
  // aplicar en vivo vía los ciclos reales
  await page.evaluate(({ sky, weather }) => {
    const S = window.__ew;
    while (S._timeBtn && document) { break; }
  }, { sky, weather });
}
const info = await page.evaluate(() => ({ fps: Math.round(window.__ew.game.loop.actualFps), room: window.__ew.room }));
console.log(JSON.stringify({ ...info, errs: errs.slice(0, 8) }, null, 1));
await browser.close();
