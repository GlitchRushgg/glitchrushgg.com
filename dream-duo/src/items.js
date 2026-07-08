// Shop catalogue — stars are the persistent currency (market study rec #4).
// Skins with a small gameplay perk = reason to come back, not pay-to-win.

export const SKINS = [
  { id: "classic", name: "Classic Elizabeth", cost: 0,   desc: "The original adventurer.", perk: null },
  { id: "fairy",   name: "Fairy Elizabeth",   cost: 400, desc: "Dream Meter fills 20% faster.", perk: "meter" },
  { id: "golden",  name: "Golden Elizabeth",  cost: 900, desc: "+10% stars collected.", perk: "stars" },
];

export const TRAILS = [
  { id: "sparkle", name: "Stardust Trail", cost: 0,   tint: 0xfff2b0 },
  { id: "pink",    name: "Bubblegum Trail", cost: 150, tint: 0xff9ed2 },
  { id: "mint",    name: "Minty Trail",     cost: 150, tint: 0x8ef5c9 },
  { id: "rainbow", name: "Rainbow Trail",   cost: 500, tint: -1 }, // cycles hue
];
