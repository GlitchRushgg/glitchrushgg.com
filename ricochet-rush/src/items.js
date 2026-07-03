// Mejoras de partida (cartas al subir de nivel) y perks permanentes (tienda).

// Cada upgrade define cómo muta el estado del jugador en GameScene.
export const UPGRADES = [
  { id: "dmg", max: 5, apply: (s) => (s.dmg *= 1.25) },
  { id: "rate", max: 5, apply: (s) => (s.fireRate *= 1.2) },
  { id: "bounce", max: 4, apply: (s) => (s.bounces += 1) },
  { id: "multi", max: 3, apply: (s) => (s.multishot += 1) },
  { id: "pierce", max: 3, apply: (s) => (s.pierce += 1) },
  { id: "speed", max: 4, apply: (s) => (s.moveSpeed *= 1.1) },
  { id: "magnet", max: 3, apply: (s) => (s.magnet *= 1.4) },
  { id: "hp", max: 3, apply: (s) => { s.maxHp += 1; s.hp = s.maxHp; } },
  { id: "bspeed", max: 4, apply: (s) => (s.bulletSpeed *= 1.2) },
];

// Perks permanentes: 3 niveles, precio por nivel.
export const PERKS = [
  { id: "vit", prices: [30, 90, 200] },
  { id: "pow", prices: [25, 75, 180] },
  { id: "agi", prices: [25, 75, 180] },
  { id: "luck", prices: [40, 110, 220] },
];
