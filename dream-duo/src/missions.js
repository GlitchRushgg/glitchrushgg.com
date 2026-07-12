// Misiones diarias — 3 al día (seed por fecha), recompensa en ★ al completarse.
// Es el único sistema de meta nuevo del v2: alimenta la tienda y la sesión >5min.

import { Save } from "./utils/Save.js";

const POOL = [
  { id: "sync5",   label: "Make 5 SYNCs in one run",   goal: 5,  track: "syncs",      reward: 60 },
  { id: "time60",  label: "Survive 60 seconds",        goal: 60, track: "time",       reward: 60 },
  { id: "stars60", label: "Collect 60 stars today",    goal: 60, track: "stars",      reward: 60 },
  { id: "mult5",   label: "Reach a ×5 combo",          goal: 5,  track: "mult",       reward: 80 },
  { id: "rush1",   label: "Trigger a FAIRY RUSH",      goal: 1,  track: "rush",       reward: 80 },
  { id: "sync12",  label: "Make 12 SYNCs today",       goal: 12, track: "syncsTotal", reward: 100 },
];
// per-run: el progreso guarda el MEJOR valor de una sola run.
const PER_RUN = new Set(["syncs", "time", "mult", "rush"]);

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function getMissions() {
  const sv = Save.get();
  const day = todayKey();
  if (!sv.missions || sv.missions.date !== day) {
    let s = 0;
    for (const c of day) s = ((s * 31 + c.charCodeAt(0)) >>> 0);
    const idx = [];
    while (idx.length < 3) {
      s = ((s * 1103515245 + 12345) >>> 0);
      const i = s % POOL.length;
      if (!idx.includes(i)) idx.push(i);
    }
    sv.missions = { date: day, list: idx.map((i) => ({ id: POOL[i].id, progress: 0, done: false })) };
    Save.persist();
  }
  return sv.missions.list.map((m) => ({ ...POOL.find((p) => p.id === m.id), ...m }));
}

let run = null;
export function startRun() {
  run = { syncs: 0, time: 0, stars: 0, mult: 1, rush: 0 };
  getMissions(); // asegura el set del día
}

// evt: "syncs"|"time"|"stars"|"mult"|"rush" — devuelve misiones recién completadas.
export function report(evt, amt = 1) {
  if (!run) return [];
  if (evt === "mult") run.mult = Math.max(run.mult, amt);
  else run[evt] += amt;

  const sv = Save.get();
  const completed = [];
  for (const raw of sv.missions.list) {
    if (raw.done) continue;
    const def = POOL.find((p) => p.id === raw.id);
    let val = raw.progress;
    if (PER_RUN.has(def.track)) {
      if (def.track === evt || (def.track === "time" && evt === "time"))
        val = Math.max(raw.progress, Math.floor(run[def.track]));
    } else if (def.track === "stars" && evt === "stars") val = raw.progress + amt;
    else if (def.track === "syncsTotal" && evt === "syncs") val = raw.progress + amt;
    if (val !== raw.progress) {
      raw.progress = val;
      if (val >= def.goal) {
        raw.done = true;
        Save.addStars(def.reward);
        completed.push(def);
      }
    }
  }
  Save.persist();
  return completed;
}
