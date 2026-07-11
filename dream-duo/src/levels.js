// Level definitions — the game is LEVEL-BASED (founder decision: not an
// endless-only runner). Each level is a fixed course with a seeded, learnable
// layout, a goal line where the family waits, and a 1-3 star rating.
// `len` in meters · `speed` multiplies BASE_SPEED · `biome` picks the art set
// · `ground`/`air` = obstacle pools unlocked · `pairDens` = sync pairs per 100m.

export const LEVELS = [
  { len: 260, speed: 0.80, biome: 0, ground: ["hedge"],                                   air: [],                    pairDens: 0.9, intro: "Tap LEFT — Elizabeth jumps!" },
  { len: 300, speed: 0.85, biome: 0, ground: ["hedge", "bench"],                          air: ["bubble"],            pairDens: 0.9, intro: "Tap RIGHT — Flofy boosts up!" },
  { len: 340, speed: 0.90, biome: 0, ground: ["hedge", "bench"],                          air: ["bubble", "pigeon"],  pairDens: 1.0, intro: "Grab BOTH stars = SYNC ×!" },
  { len: 380, speed: 0.95, biome: 0, ground: ["hedge", "bench", "birdbath"],              air: ["bubble", "pigeon"],  pairDens: 1.0, intro: "Tall birdbaths — hold the jump!" },
  { len: 420, speed: 1.00, biome: 1, ground: ["hedge", "bench", "birdbath"],              air: ["bubble", "pigeon", "cloud"], pairDens: 1.1, intro: "Golden hour! Watch the clouds." },
  { len: 460, speed: 1.05, biome: 1, ground: ["hedge", "bench", "birdbath", "top"],       air: ["bubble", "pigeon", "cloud"], pairDens: 1.1, intro: "Runaway spinning tops!" },
  { len: 500, speed: 1.10, biome: 1, ground: ["hedge", "bench", "birdbath", "top"],       air: ["bubble", "pigeon", "cloud"], pairDens: 1.2, intro: "5 syncs = FAIRY RUSH!" },
  { len: 540, speed: 1.15, biome: 1, ground: ["hedge", "bench", "birdbath", "top", "blocks"], air: ["bubble", "pigeon", "cloud"], pairDens: 1.2, intro: "Toy towers — jump BIG!" },
  { len: 580, speed: 1.20, biome: 2, ground: ["hedge", "bench", "birdbath", "top", "blocks"], air: ["bubble", "pigeon", "cloud"], pairDens: 1.3, intro: "Starlight! The dream is close…" },
  { len: 620, speed: 1.28, biome: 2, ground: ["bench", "birdbath", "top", "blocks"],      air: ["bubble", "pigeon", "cloud"], pairDens: 1.3, intro: "Faster! Trust your two hands." },
  { len: 660, speed: 1.36, biome: 2, ground: ["hedge", "bench", "birdbath", "top", "blocks"], air: ["bubble", "pigeon", "cloud"], pairDens: 1.4, intro: "Almost home…" },
  { len: 720, speed: 1.45, biome: 2, ground: ["hedge", "bench", "birdbath", "top", "blocks"], air: ["bubble", "pigeon", "cloud"], pairDens: 1.5, intro: "The grand finale!" },
];

export const ENDLESS_UNLOCK = 8; // completing this many levels unlocks Endless Dream

// Builds the full, learnable event list for a level (seeded → same every try).
// Returns [{ x, kind, type }...] sorted by x (px), plus total star count.
export function buildCourse(levelIdx, PX_PER_M) {
  const L = LEVELS[levelIdx];
  const rnd = new Phaser.Math.RandomDataGenerator([`dreamduo-${levelIdx}`]);
  const events = [];
  const lenPx = L.len * PX_PER_M;
  const startPad = 900;                       // breathing room
  const endPad = 600;                         // clean approach to the goal
  const usable = lenPx - startPad - endPad;

  // obstacles: alternating pools, spacing eases with level speed
  const gapBase = Math.max(430, 720 - levelIdx * 22);
  let x = startPad;
  let lastAir = -9999, lastGround = -9999;
  while (x < startPad + usable) {
    const roll = rnd.frac();
    const both = L.air.length && roll < 0.18 && levelIdx >= 4; // mirrored challenge
    if ((roll < 0.62 || !L.air.length) && L.ground.length) {
      events.push({ x, kind: "ob", lane: "ground", type: rnd.pick(L.ground) });
      lastGround = x;
    }
    if ((both || roll >= 0.62) && L.air.length && x - lastAir > gapBase * 0.9) {
      events.push({ x: both ? x : x + 40, kind: "ob", lane: "air", type: rnd.pick(L.air) });
      lastAir = x;
    }
    x += gapBase + rnd.between(0, 240);
  }

  // sync pairs + star lines between obstacles
  const pairs = Math.round((L.len / 100) * L.pairDens);
  let starCount = 0;
  for (let i = 0; i < pairs; i++) {
    const px = startPad + ((i + 0.5) / pairs) * usable + rnd.between(-90, 90);
    // keep clear of obstacles
    const near = events.some((e) => e.kind === "ob" && Math.abs(e.x - px) < 190);
    events.push({ x: near ? px + 220 : px, kind: "pair" });
    starCount += 2;
  }
  const lines = Math.round(pairs * 0.8);
  for (let i = 0; i < lines; i++) {
    const px = startPad + ((i + 0.23) / lines) * usable + rnd.between(-70, 70);
    const lane = rnd.frac() < 0.5 ? "ground" : "air";
    events.push({ x: px, kind: "line", lane });
    starCount += 3;
  }

  // Nivel 1: cinta de estrellas AÉREAS garantizada al principio para que la
  // mano derecha (Flofy) tenga trabajo desde el primer segundo (auditoría: en
  // L1 el segundo botón no servía para nada → no se entendía el juego dual).
  if (levelIdx === 0) {
    events.push({ x: startPad + 240, kind: "line", lane: "air" });
    starCount += 3;
  }

  // GIRO cada 4 niveles (4/8/12): una "SYNC STORM" — ráfaga de 3 pares de sync
  // juntos a media pista (reusa el sistema de pares, sin mecánica nueva) que
  // dispara el FAIRY RUSH y da a esos niveles un clímax reconocible.
  if ((levelIdx + 1) % 4 === 0) {
    const base = startPad + usable * 0.6;
    for (let i = 0; i < 3; i++) { events.push({ x: base + i * 150, kind: "pair" }); starCount += 2; }
  }

  events.sort((a, b) => a.x - b.x);
  return { events, lenPx, starCount, def: L };
}
