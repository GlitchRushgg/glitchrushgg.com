import { chromium } from "playwright-core";
const SP = "C:/Users/Rosselyn/AppData/Local/Temp/claude/c--Users-Rosselyn-Documents-glitchrush-gg/a859682c-7876-4f9d-beb0-c4a78ffbb6ab/scratchpad";
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const logs = [];
page.on("pageerror", e => logs.push(`[PAGEERROR] ${e.message.slice(0,300)}`));
await page.goto("http://localhost:8123/dream-duo/", { waitUntil: "load" });
await page.waitForTimeout(3500);
await page.mouse.click(195, 300); // PLAY
await page.waitForTimeout(600);

let rushShot = false, shots = { 15: false, 40: false, 70: false };
const t0 = Date.now();
while (Date.now() - t0 < 88000) {
  const st = await page.evaluate(() => {
    const s = window.__dd;
    if (!s || s.dead) return { dead: true };
    const CHAR_Y = 700;
    const decide = (col, curLane) => {
      let star = null, obCur = null, obOther = null;
      for (const o of s.objs) {
        if (o.taken || o.col !== col) continue;
        const d = CHAR_Y - o.y;
        if (o.kind === "star" && d > 30 && d < 330 && (!star || o.y > star.y)) star = o;
        if (o.kind === "ob" && d > 20 && d < 260) {
          if (o.lane === curLane && (!obCur || o.y > obCur.y)) obCur = o;
          if (o.lane !== curLane && (!obOther || o.y > obOther.y)) obOther = o;
        }
      }
      // 1º: esquivar obstáculo inminente en el carril actual (aunque haya estrella detrás)
      const imminent = obCur && (CHAR_Y - obCur.y) < 185;
      const otherBlocked = obOther && (CHAR_Y - obOther.y) < 165;
      if (imminent && !otherBlocked) return 1 - curLane;
      if (star && !imminent) {
        if (star.lane !== curLane) {
          const blocked = s.objs.some(o => !o.taken && o.col === col && o.kind === "ob" && o.lane === star.lane && CHAR_Y - o.y > 20 && CHAR_Y - o.y < 150);
          return blocked ? curLane : star.lane;
        }
        return curLane;
      }
      return curLane;
    };
    return {
      dead: false, time: s.time_, rush: s.rushT > 0, meter: s.meter,
      score: Math.floor(s.score), hearts: s.hearts, syncs: s.syncsRun, mult: s.mult,
      wantE: decide(0, s.E.lane), curE: s.E.lane,
      wantF: decide(1, s.F.lane), curF: s.F.lane,
    };
  }).catch(() => ({ dead: true }));
  if (st.dead) break;
  if (st.wantE !== st.curE) await page.mouse.click(97, 500);
  if (st.wantF !== st.curF) await page.mouse.click(292, 500);
  for (const k of [15, 40, 70]) {
    if (!shots[k] && st.time > k) { shots[k] = true; await page.screenshot({ path: `${SP}/dd2-bot-${k}s.png` }); }
  }
  if (st.rush && !rushShot) { rushShot = true; await page.waitForTimeout(900); await page.screenshot({ path: `${SP}/dd2-bot-rush.png` }); }
  await page.waitForTimeout(110);
}
const fin = await page.evaluate(() => {
  const s = window.__dd;
  const sv = JSON.parse(localStorage.getItem("dreamDuo_v1") || "{}");
  return {
    dead: s?.dead, time: +(s?.time_ ?? 0).toFixed(1), score: Math.floor(s?.score ?? 0),
    hearts: s?.hearts, syncs: s?.syncsRun, multMax: s?.multMax, stars: s?.starsRun,
    speed: Math.round(s?.speed ?? 0), missions: sv.missions?.list,
  };
});
console.log("FINAL:", JSON.stringify(fin, null, 1));
console.log("rush visto:", rushShot);
const losses = await page.evaluate(() => window.__ddLoss || []);
console.log("PERDIDAS:", JSON.stringify(losses));
console.log(logs.length ? "ERRORES:\n" + logs.join("\n") : "sin pageerrors");
await page.screenshot({ path: `${SP}/dd2-bot-final.png` });
await browser.close();
// (el log de pérdidas se imprime en la siguiente ejecución vía __ddLoss)
