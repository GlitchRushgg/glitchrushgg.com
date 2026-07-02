// Catálogo de la tienda: skins (forma + color del orbe) y estelas.
// "sync" = la estela adopta el color del carril actual (default, gratis).

export const SKINS = [
  { id: "pulse", name: { es: "Pulso", en: "Pulse" }, tex: "orb", color: 0xffffff, price: 0 },
  { id: "prism", name: { es: "Prisma", en: "Prism" }, tex: "orb-tri", color: 0xffd94e, price: 60 },
  { id: "cube", name: { es: "Cubo", en: "Cube" }, tex: "orb-square", color: 0x7cffb2, price: 120 },
  { id: "shard", name: { es: "Esquirla", en: "Shard" }, tex: "orb-diamond", color: 0xff8f4e, price: 200 },
  { id: "halo", name: { es: "Halo", en: "Halo" }, tex: "orb-ring", color: 0xb78cff, price: 320 },
  { id: "nova", name: { es: "Nova", en: "Nova" }, tex: "orb-star", color: 0xff4e6a, price: 500 },
];

export const TRAILS = [
  { id: "sync", name: { es: "Sincro", en: "Sync" }, color: null, price: 0 },      // color del carril
  { id: "gold", name: { es: "Oro", en: "Gold" }, color: 0xffd94e, price: 80 },
  { id: "ghost", name: { es: "Fantasma", en: "Ghost" }, color: 0xffffff, price: 150 },
  { id: "rainbow", name: { es: "Arcoíris", en: "Rainbow" }, color: "rainbow", price: 400 },
];

export function skinById(id) {
  return SKINS.find((s) => s.id === id) || SKINS[0];
}

export function trailById(id) {
  return TRAILS.find((s) => s.id === id) || TRAILS[0];
}
