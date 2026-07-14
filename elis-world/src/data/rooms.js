// Room furniture layout. Each piece: texture key, x, ground y (bottom anchor),
// display height, and an optional interaction:
//   tap:  "glow" | "wiggle" | "fish" | "cuckoo" | "radio" | "tree" | "fridge"
//         | "sink" | "duck" | "fruit" | "rock" | "oven" | "drawers" | "tub"
//         | "towel" | "soap" | "brush" | "sand" | "water" | "ball" | "dollhouse"
//   drop: "cook" | "blend" | "table" | "lay" | "swing" | "bounce" | "hide"
//         | "bathe" | "sit"  (drop:"table" also seats a character = dining)
// Garden paints its FENCE; the balcony paints its DECK (handled by HouseScene).

export const ROOMS = {
  living: {
    floor: "wood",
    furniture: [
      { key: "rug", x: 640, y: 700, h: 120, flat: true, drop: "sit", seat: 0.1 },
      { key: "sofa", x: 350, y: 660, h: 230, tap: "wiggle", drop: "sit", seat: 0.42 },
      { key: "coffeetable", x: 640, y: 672, h: 120, tap: "wiggle", drop: "table" },
      { key: "tv", x: 950, y: 655, h: 220, tap: "glow" },
      // detrás del sofá (y menor = se dibuja antes): asoma la pantalla por
      // encima del respaldo y deja libre el rincón de los juguetes
      { key: "lamp", x: 250, y: 630, h: 300, tap: "glow" },
      { key: "plant", x: 1200, y: 645, h: 190, tap: "wiggle" },
      { key: "bookshelf", x: 770, y: 560, h: 210, wall: true, tap: "wiggle" },
      { key: "aquarium", x: 1105, y: 632, h: 170, tap: "fish" },
      { key: "radio", x: 640, y: 596, h: 74, tap: "radio" },
      { key: "cuckoo", x: 180, y: 300, h: 150, wall: true, tap: "cuckoo" },
      { key: "armchair", x: 530, y: 655, h: 190, tap: "wiggle", drop: "sit", seat: 0.45 },
      // RINCÓN DE JUGUETES (encargo fundadora: "coloca juguetes para jugar,
      // más peluches, pelota, casa de muñecas"). Fuera la caja de Halloween.
      { key: "dollhouse", x: 96, y: 700, h: 215, tap: "dollhouse" },
      { key: "ball", x: 255, y: 706, h: 84, tap: "ball" },
      { key: "teddy", x: 452, y: 704, h: 112, tap: "wiggle" },
    ],
  },
  kitchen: {
    floor: "tiles",
    furniture: [
      { key: "fridge", x: 110, y: 654, h: 310, tap: "fridge" },
      // el horno ABRE (tap) y hornea lo que le sueltes dentro; la sartén de
      // arriba sigue cocinando (drop)
      { key: "stove", x: 350, y: 654, h: 240, drop: "cook", tap: "oven" },
      // las GAVETAS abren y dan los utensilios (olla, sartén) para llevar
      { key: "drawers", x: 590, y: 660, h: 186, tap: "drawers" },
      // encima de la encimera de las gavetas
      { key: "blender", x: 540, y: 480, h: 112, drop: "blend", tap: "wiggle" },
      { key: "teapot", x: 646, y: 478, h: 78, tap: "wiggle" },
      { key: "sink", x: 830, y: 654, h: 225, tap: "sink" },
      // COMEDOR: suelta comida encima = mesa puesta; suelta a alguien = se sienta
      { key: "ktable", x: 1090, y: 674, h: 215, drop: "table" },
      { key: "fruitbowl", x: 1090, y: 516, h: 76, tap: "fruit" },
    ],
  },
  bathroom: {
    floor: "tiles",
    furniture: [
      // la tina se LLENA de agua si la abre (tap) y baña a quien le suelte
      { key: "bathtub", x: 340, y: 690, h: 250, drop: "bathe", tap: "tub" },
      { key: "toilet", x: 1146, y: 668, h: 230, tap: "wiggle" },
      { key: "bathsink", x: 806, y: 664, h: 300, tap: "sink" },
      { key: "towelrack", x: 596, y: 560, h: 240, wall: true, tap: "towel" },
      { key: "duck", x: 340, y: 470, h: 62, tap: "duck" },
      // Cositas que se mueven (arrastrar) — encargo fundadora. Van DELANTE (y
      // alta): el orden de dibujo es por y, así que sobre una repisa quedarían
      // tapadas por la propia tina o el lavamanos.
      { key: "soap", x: 545, y: 672, h: 66, tap: "soap" },
      { key: "toothbrush", x: 626, y: 676, h: 96, tap: "brush" },
      { key: "cream", x: 700, y: 670, h: 70, tap: "wiggle" },
    ],
  },
  bedroom: {
    floor: "wood",
    furniture: [
      { key: "bed", x: 320, y: 668, h: 260, drop: "lay" },
      { key: "wardrobe", x: 1150, y: 648, h: 330, tap: "wiggle" },
      { key: "desk", x: 900, y: 650, h: 210, tap: "wiggle" },
      { key: "rockinghorse", x: 640, y: 668, h: 180, tap: "rock" },
      { key: "starlamp", x: 760, y: 590, h: 130, tap: "glow" },
      { key: "slippers", x: 450, y: 700, h: 60, tap: "wiggle" },
      { key: "moonmobile", x: 640, y: 260, h: 170, wall: true, tap: "wiggle" },
    ],
  },
  garden: {
    floor: "grass",
    outdoor: true,
    furniture: [
      { key: "tree", x: 190, y: 665, h: 430, tap: "tree" },
      { key: "swing", x: 520, y: 665, h: 290, drop: "swing" },
      { key: "trampoline", x: 820, y: 672, h: 170, drop: "bounce" },
      { key: "hutch", x: 1120, y: 660, h: 200, drop: "hide" },
      { key: "flowerbed", x: 1010, y: 700, h: 110, tap: "wiggle" },
      { key: "sandbox", x: 350, y: 705, h: 120, tap: "sand", drop: "sit", seat: 0.3 },
      { key: "picnic", x: 660, y: 706, h: 110, drop: "sit", seat: 0.12 },
      // tócala y RIEGA: las plantas cercanas florecen
      { key: "wateringcan", x: 940, y: 690, h: 90, tap: "water" },
      { key: "ball", x: 440, y: 695, h: 80, tap: "ball" },
      { key: "doghouse", x: 60, y: 680, h: 170, drop: "hide" },
      { key: "bbq", x: 1230, y: 665, h: 180, drop: "cook" },
    ],
  },
  // BALCÓN (encargo fundadora): terraza con vista a la ciudad; la hora y el
  // clima se ven aquí a lo grande. El fondo ya trae baranda + suelo de tablas.
  balcony: {
    floor: "deck",
    outdoor: true,
    bg: "city",
    furniture: [
      { key: "armchair", x: 268, y: 700, h: 200, tap: "wiggle", drop: "sit", seat: 0.45 },
      { key: "coffeetable", x: 460, y: 706, h: 112, tap: "wiggle", drop: "table" },
      { key: "teapot", x: 460, y: 640, h: 76, tap: "wiggle" },
      { key: "plant", x: 1156, y: 700, h: 200, tap: "wiggle" },
      { key: "ball", x: 880, y: 708, h: 82, tap: "ball" },
      { key: "teddy", x: 700, y: 706, h: 110, tap: "wiggle" },
    ],
  },
};

// Quién empieza dónde. ENCARGO FUNDADORA: solo ELI y sus juguetes (mamá, papá
// y Cristian fuera) — Flofy, Rainbow (la amiga de peluche) y el cachorro.
export const CHAR_START = {
  elizabeth: { room: "living", x: 640 },
  flofy: { room: "living", x: 760 },
  rainbow: { room: "living", x: 860 },
  pet: { room: "garden", x: 900 },
};
export const PET_SCALE = "pet-puppy";

// Foods (spawn from fridge / tree / fruit bowl). cooked = texture after the pan.
export const FOODS = {
  apple: {}, banana: {}, orange: {}, melon: {},
  cake: {}, cookie: {}, milk: {}, juice: {}, cupcake: {}, pizza: {},
  pancakes: {}, carrot: {},
  bread: { cooked: "toast" },
  egg: { cooked: "friedegg" },
};
export const FRIDGE_MENU = ["milk", "egg", "cake", "carrot", "juice", "pizza", "cupcake", "bread"];

// Utensilios que salen de las gavetas (se arrastran como la comida, pero no
// se comen: son cacharros de cocina).
export const UTENSILS = ["pot", "pan"];
