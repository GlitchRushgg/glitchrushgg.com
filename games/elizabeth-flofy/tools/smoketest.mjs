// Prueba de humo headless: carga el juego, registra errores de consola y captura
// el menú y una partida. Uso: node smoketest.mjs  (requiere el server en :8080)
import { chromium } from "playwright";

const URL = "http://localhost:8080/games/elizabeth-flofy/";
const out = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });

const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
await page.screenshot({ path: out + "shot-menu.png" });

// Toca "TOCA PARA JUGAR" (centro-inferior) y juega unos segundos tocando glitches.
await page.mouse.click(210, 720);
await page.waitForTimeout(1500);
for (let i = 0; i < 14; i++) {
  await page.mouse.click(120 + (i % 3) * 90, 250 + (i % 4) * 90);
  await page.waitForTimeout(220);
}
await page.screenshot({ path: out + "shot-game.png" });

console.log("ERRORES:", errors.length ? "\n" + errors.join("\n") : "ninguno");
await browser.close();
