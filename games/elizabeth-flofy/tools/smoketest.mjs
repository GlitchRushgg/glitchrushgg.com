// Prueba de humo headless usando el Chrome instalado (playwright-core, sin descargas).
// Uso: node smoketest.mjs   (requiere el server en :8080)
import { chromium } from "playwright-core";

const PAGE = "http://localhost:8080/games/elizabeth-flofy/";
const here = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });

const logs = [];
page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => logs.push(`[PAGEERROR] ${e.message}\n${e.stack || ""}`));
page.on("requestfailed", (r) => logs.push(`[REQFAIL] ${r.url()} -> ${r.failure()?.errorText}`));

await page.goto(PAGE, { waitUntil: "load" });
await page.waitForTimeout(2500);

// ¿Existe un canvas y con qué tamaño?
const info = await page.evaluate(() => {
  const c = document.querySelector("canvas");
  return {
    hasPhaser: typeof window.Phaser !== "undefined",
    canvas: c ? { w: c.width, h: c.height } : null,
  };
});
console.log("INFO:", JSON.stringify(info));
console.log("LOGS:\n" + (logs.join("\n") || "(sin logs)"));

await page.screenshot({ path: here + "shot-menu.png" });

// Entra a jugar y purifica unos glitches.
await page.mouse.click(210, 768); // TAP TO PLAY
await page.waitForTimeout(1500);
for (let i = 0; i < 18; i++) {
  await page.mouse.click(70 + (i % 4) * 80, 200 + (i % 5) * 90);
  await page.waitForTimeout(200);
}
await page.screenshot({ path: here + "shot-game.png" });
console.log("POST-GAME LOGS:\n" + (logs.slice(-6).join("\n") || "(sin nuevos)"));

await browser.close();
