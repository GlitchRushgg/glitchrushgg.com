// Room furniture layout. Each piece: texture key, x, ground y (bottom anchor),
// display height, and an optional interaction:
//   tap:  "glow" | "wiggle" | "fish" | "cuckoo" | "radio" | "tree" | "fridge"
//         | "sink" | "duck" | "fruit" | "rock" | "oven" | "drawers" | "tub"
//         | "towel" | "soap" | "brush" | "sand" | "water" | "ball" | "dollhouse"
//   drop: "cook" | "blend" | "table" | "lay" | "swing" | "bounce" | "hide"
//         | "bathe" | "sit" | "wash"  (drop:"table" also seats a character)
// AJUSTE PROFUNDO (referencia Toca Life World, orden fundadora 2026-07-16):
// los MUEBLES son FIJOS como en una casa de verdad — solo las cositas
// pequeñas marcadas con `movable: true` se arrastran. Todo lo demás FUNCIONA
// (tap/drop), que es donde vive el juego.
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
      { key: "ball", x: 255, y: 706, h: 84, tap: "ball", movable: true },
      { key: "teddy", x: 452, y: 704, h: 112, tap: "wiggle", movable: true },
      // INTERIORISMO lote 1 (refs Toca): repisa en la pared vacía con LIBROS
      // INDIVIDUALES movibles + cositas. SIN wall: al arrastrarlos, o vuelven
      // a la repisa o caen al suelo (feedback fundadora: "en la pared no es
      // real"). La chimenea se mudó al dormitorio: aquí tapaba TV/estantería.
      { key: "wallshelf", x: 460, y: 432, h: 55, wall: true },
      { key: "book-1", x: 372, y: 398, h: 54, tap: "wiggle", movable: true, shelf: true },
      { key: "book-2", x: 408, y: 398, h: 54, tap: "wiggle", movable: true, shelf: true },
      { key: "book-3", x: 444, y: 398, h: 54, tap: "wiggle", movable: true, shelf: true },
      { key: "birdie", x: 505, y: 396, h: 48, tap: "wiggle", movable: true, shelf: true },
      { key: "alarmclock", x: 555, y: 398, h: 58, tap: "wiggle", movable: true, shelf: true },
      { key: "toycar", x: 350, y: 708, h: 68, tap: "wiggle", movable: true },
      { key: "toyblocks", x: 545, y: 706, h: 78, tap: "wiggle", movable: true },
      { key: "vase-roses", x: 600, y: 598, h: 88, tap: "wiggle", movable: true },
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
      // el agua CORRE (visual + sonido) y suelta a alguien = se lava las manos
      { key: "sink", x: 830, y: 654, h: 225, tap: "sink", drop: "wash" },
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
      { key: "bathsink", x: 806, y: 664, h: 300, tap: "sink", drop: "wash" },
      { key: "towelrack", x: 596, y: 560, h: 240, wall: true, tap: "towel" },
      { key: "duck", x: 340, y: 470, h: 62, tap: "duck" },
      // Cositas que se mueven (arrastrar) — encargo fundadora. Van DELANTE (y
      // alta): el orden de dibujo es por y, así que sobre una repisa quedarían
      // tapadas por la propia tina o el lavamanos.
      { key: "soap", x: 545, y: 672, h: 66, tap: "soap", movable: true },
      { key: "toothbrush", x: 626, y: 676, h: 96, tap: "brush", movable: true },
      { key: "cream", x: 700, y: 670, h: 70, tap: "wiggle", movable: true },
      // interiorismo: champú y toallas dobladas (refs Toca)
      { key: "shampoo", x: 762, y: 674, h: 68, tap: "wiggle", movable: true },
      { key: "towels", x: 962, y: 698, h: 78, tap: "towel", movable: true },
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
      { key: "slippers", x: 450, y: 700, h: 60, tap: "wiggle", movable: true },
      // interiorismo: ordenador retro sobre el escritorio (ref Toca)
      { key: "retropc", x: 900, y: 508, h: 118, tap: "glow" },
      // CHIMENEA junto a la cama (venía del salón, donde tapaba la TV)
      { key: "fireplace", x: 128, y: 664, h: 200, tap: "fire" },
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
      { key: "wateringcan", x: 940, y: 690, h: 90, tap: "water", movable: true },
      { key: "ball", x: 440, y: 695, h: 80, tap: "ball", movable: true },
      { key: "doghouse", x: 60, y: 680, h: 170, drop: "hide" },
      { key: "bbq", x: 1230, y: 665, h: 180, drop: "cook" },
      // CARRITO DE HELADOS (GLB CC0 de la fundadora, "me gusta la idea de lo
      // del jardín"): tócalo y sirve un cucurucho. Va DELANTE del manzano
      // (y alta = se dibuja después): a 745 lo tragaba el trampolín.
      { key: "icecreamcart", x: 205, y: 700, h: 200, tap: "icecream" },
      // INVERNADERO (encargo fundadora): tap = cultiva algo rico; asoma
      // detrás del trampolín/flores (y baja = se dibuja antes)
      { key: "greenhouse", x: 985, y: 648, h: 250, tap: "grow" },
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
      { key: "teapot", x: 460, y: 640, h: 76, tap: "wiggle", movable: true },
      { key: "plant", x: 1156, y: 700, h: 200, tap: "wiggle" },
      { key: "ball", x: 880, y: 708, h: 82, tap: "ball", movable: true },
      { key: "teddy", x: 700, y: 706, h: 110, tap: "wiggle", movable: true },
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
  sausage: {}, hotdog: {}, breakfast: {},
  // Lote 2026-07-16: modelos CC0 que subió la fundadora ("te di bastantes
  // imagenes para Elis World"), renderizados a sprite con scripts/render-glb.js
  donut: {}, popcorn: {}, strawberry: {}, burger: {}, mango: {},
  icecream: {},
};
export const FRIDGE_MENU = ["milk", "egg", "cake", "carrot", "juice", "pizza", "cupcake", "bread", "sausage", "donut", "popcorn", "burger"];

// RECETAS (referencia Bluey/Toca, orden fundadora): junta dos comidas y se
// forma el plato — huevos + salchichas = desayuno; pan + salchicha = hot dog.
// Clave = los dos ingredientes ordenados alfabéticamente con "+".
export const COMBOS = {
  "egg+sausage": { result: "breakfast", label: "Eggs & sausages!" },
  "friedegg+sausage": { result: "breakfast", label: "Eggs & sausages!" },
  "bread+sausage": { result: "hotdog", label: "Hot dog!" },
  "sausage+toast": { result: "hotdog", label: "Hot dog!" },
};

// Utensilios que salen de las gavetas (se arrastran como la comida, pero no
// se comen: son cacharros de cocina).
export const UTENSILS = ["pot", "pan"];
