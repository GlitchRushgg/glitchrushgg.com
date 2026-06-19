// ============================================================================
//  HOTEL DINO BLU — Turno de Limpieza 3D
//  Praia a Mare · Calabria · frente a la Isola di Dino
//  Eres Sofía, camarera del 2º piso: 12 habitaciones antes de las 14:00.
// ============================================================================
import * as THREE from 'three';
import { S, LANG, LANGS, setLang } from './i18n.js';

// ----------------------------------------------------------------------------
// Utilidades
// ----------------------------------------------------------------------------
const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ----------------------------------------------------------------------------
// Constantes del hotel
// ----------------------------------------------------------------------------
const FH = 3.2;                  // altura de cada planta
const EYE = 1.62;                // altura de los ojos
const PLAYER_FLOOR = 2;          // el piso de Sofía
const SHIFT_START = 6 * 60;     // 06:00
const SHIFT_END = 14 * 60;       // 14:00
let TIME_RATE = 0.8;             // minutos de juego por segundo real (~10 min); el modo Express lo acelera

const RX0 = -12, ROOM_W = 4, ROOM_D = 6, CORR = 1.3;
const BX0 = -12.45, BX1 = 16.45, BZ = 7.4;   // huella del edificio
const ELEV = { x: 15.3, z: 0 };               // salida del ascensor

const CART_MAX   = { sabanas: 6, grandes: 12, bidet: 12, pequenas: 14, alfombrin: 8, cortesia: 8 };
const CART_START = { sabanas: 4, grandes: 7,  bidet: 7,  pequenas: 8,  alfombrin: 5, cortesia: 5 };
const INV_LABEL = S.inv;

const TASK_DEFS = {
  strip:  { label: S.tasks.strip,  icon: '🧺', dur: 2.4 },
  bedC:   { label: S.tasks.bedC,   icon: '🛏', dur: 3.6, needs: 'strip' },
  bed:    { label: S.tasks.bed,    icon: '🛏', dur: 2.2 },
  bath:   { label: S.tasks.bath,   icon: '🛁', dur: 3.8 },
  bathQ:  { label: S.tasks.bathQ,  icon: '🚿', dur: 2.2 },
  towels: { label: S.tasks.towels, icon: '🧖', dur: 0 },
  trash:  { label: S.tasks.trash,  icon: '🗑', dur: 1.2 },
  floor:  { label: S.tasks.floor,  icon: '🧹', dur: 2.8 },
  amen:   { label: S.tasks.amen,   icon: '🧴', dur: 1.5 },
};

// ----------------------------------------------------------------------------
// Estado global
// ----------------------------------------------------------------------------
// modo de juego: 'full' (turno completo, 11 habitaciones) o 'express' (4, contrarreloj)
const MODE = localStorage.getItem('hg-mode') === 'express' ? 'express' : 'full';
if (MODE === 'express') TIME_RATE = 3.0;   // turno corto y tenso (~2,5 min reales)

// récords persistentes (localStorage) — la razón para volver a jugar
const REC = {
  best:   +localStorage.getItem('hg-best')   || 0,
  stars:  +localStorage.getItem('hg-stars')  || 0,
  streak: +localStorage.getItem('hg-streak') || 0,
  rooms:  +localStorage.getItem('hg-rooms')  || 0,
};

// progresión por DÍAS: cada turno completado avanza un día y abre zonas nuevas
const DAY = Math.max(1, parseInt(localStorage.getItem('hg-day'), 10) || 1);
const ZONES = [
  { id: 'terrace',    f: 11, unlockDay: 2, floorCol: 0xd8c08a, icons: ['🧹', '🧽', '⛱'] },
  { id: 'restaurant', f: 12, unlockDay: 3, floorCol: 0xb0875a, icons: ['🍽', '🧹', '🍴'] },
  { id: 'pool',       f: 13, unlockDay: 4, floorCol: 0xbfd6dd, icons: ['🪣', '🧖', '🧹'] },
  { id: 'garden',     f: 14, unlockDay: 5, floorCol: 0x9ccb7a, icons: ['💧', '🧹', '🪑'] },
];
const zoneUnlocked = z => DAY >= z.unlockDay;
const zoneByFloor = {};   // f -> zona construida

// personalización de la camarera (persistente) — se ve en la vista previa 3D y en las manos
const hex = c => parseInt(c.slice(1), 16);
const SKINS    = ['#f1c9a5', '#d2a074', '#a9744a', '#7a4e2e'];
const HAIRS    = ['#2a1c12', '#7a4a2a', '#caa15a', '#b8b3ad', '#3d2817'];
const UNIFORMS = ['#9fc3e0', '#7ec4b8', '#e3a3b5', '#a8d8a0', '#c9a24a'];
const CUSTOM = {
  skin:    localStorage.getItem('hg-skin')    || SKINS[1],
  hair:    localStorage.getItem('hg-hair')    || HAIRS[0],
  uniform: localStorage.getItem('hg-uniform') || UNIFORMS[0],
};

const G = {
  started: false, over: false, mode: MODE,
  time: SHIFT_START,
  score: 0, warnings: 0, towelPerfect: 0, mistakes: 0, trips: 0,
  combo: 0, comboBest: 0, lastTaskAt: -99, rating: 3, newRecord: false,
  floor: PLAYER_FLOOR, px: 13.6, pz: 0.3, yaw: Math.PI / 2, pitch: 0,
  inv: { ...CART_START }, dirty: 0,
  rooms: [], totalToClean: 0, done: 0,
  uiOpen: true, dialogOpen: false,
  hotspot: null, holdT: 0, eHeld: false,
  // mini-tutorial (0 = moverse, 1 = mirar, 2 = hecho) y objetivo guiado
  tut: localStorage.getItem('hg-tut') ? 2 : 0, tutDist: 0, tutLookAcc: 0, objective: null,
  lastInspect: SHIFT_START - 10,
  keys: {}, joy: { x: 0, y: 0, on: false },
};

const SOLID = {};   // colisiones por planta: SOLID[f] = [{x0,x1,z0,z1},...]
const BOUNDS = {};  // límites andables por planta
const HOTSPOTS = [];
const NPCS = [];
const DRUMS = [];   // tambores de lavadoras que giran
const ELEV_MARK = {}; // flecha dorada sobre el ascensor, por planta
const VIEW = {};      // materiales de vista (mar / pueblo) compartidos entre habitaciones

function addSolid(f, x0, x1, z0, z1) {
  (SOLID[f] ||= []).push({ x0, x1, z0, z1 });
}

// ----------------------------------------------------------------------------
// Three.js base
// ----------------------------------------------------------------------------
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fd3ee);
scene.fog = new THREE.Fog(0x9fd3ee, 70, 290);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.08, 420);
camera.rotation.order = 'YXZ';

scene.add(new THREE.AmbientLight(0xffffff, 0.7));
scene.add(new THREE.HemisphereLight(0xfff7e6, 0x8c9aa8, 1.0));
const sun = new THREE.DirectionalLight(0xfff1d0, 1.15);
sun.position.set(60, 95, 45);
scene.add(sun);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// Materiales
const lamb = c => new THREE.MeshLambertMaterial({ color: c });
// material con textura de assets/tex (generadas con IA); mientras carga —
// o si el archivo falta — se ve el color plano de siempre
const TEXL = new THREE.TextureLoader();
function texLamb(file, color, rx = 1, ry = 1) {
  const m = lamb(color);
  TEXL.load(`assets/tex/${file}`, t => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    t.anisotropy = 4;
    t.colorSpace = THREE.SRGBColorSpace;
    m.map = t;
    m.color.set(0xffffff);
    m.needsUpdate = true;
  });
  return m;
}
const MAT = {
  wall: lamb(0xf3ead9), wallIn: lamb(0xf8f3e9), accent: lamb(0xc96f4a),
  corr: lamb(0xcdbb9c), parquet: texLamb('parquet.jpg', 0xd9c194, 2, 3), tile: texLamb('tile.jpg', 0xe9eef0, 2, 2),
  cotto: texLamb('cotto.jpg', 0xc88a5a, 4, 6),   // suelo de terracota de las habitaciones
  headboard: lamb(0xcbab85),                      // cabecero de madera clara
  warmwall: lamb(0xefe6d2),                       // pared cálida crema
  tileWall: lamb(0xf2f6f7), ceil: lamb(0xffffff), marble: texLamb('marble.jpg', 0xeae6dd, 12, 6),
  travertine: lamb(0xd7c9af), bathStone: lamb(0xeae1cd),   // beige liso para paredes/encimera del baño
  carpet: texLamb('carpet.jpg', 0xa84f3c, 16, 1),
  wood: lamb(0x8a6240), woodDark: lamb(0x5d4327), white: lamb(0xfafafa),
  steel: lamb(0xb4bcc2), champagne: lamb(0xc9bda6), black: lamb(0x2c2f33),
  cover: texLamb('bedspread.jpg', 0xd9cdb8), coverMessy: lamb(0xc9bca6), mattress: lamb(0xf3f1e8),
  towel: lamb(0xffffff), towelOld: lamb(0xcfd4cd), trash: lamb(0x49555f),
  glass: new THREE.MeshBasicMaterial({ color: 0xcdeaf8, transparent: true, opacity: 0.16, side: THREE.DoubleSide }),
  dirt: new THREE.MeshBasicMaterial({ color: 0x57493b, transparent: true, opacity: 0.66 }),
  sea: texLamb('sea.jpg', 0x1773b0, 58, 25), sand: texLamb('sand.jpg', 0xe9d8a6, 110, 2.5),
  grass: texLamb('grass.jpg', 0x7fae62, 140, 140),
  road: lamb(0x9b9b98), paving: texLamb('paving.jpg', 0xd8d2c4, 110, 2.2), green: lamb(0x4e8c46),
  cliff: lamb(0x9a948a), terra: lamb(0xc96f4a), navy: lamb(0x27374f),
};
// materiales recolorables de las manos en primera persona (personalización del jugador)
const handSkinMat = lamb(hex(CUSTOM.skin));
const handSleeveMat = lamb(hex(CUSTOM.uniform));

function bx(w, h, d, m) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); }
function add(parent, mesh, x, y, z, ry = 0) {
  mesh.position.set(x, y, z);
  if (ry) mesh.rotation.y = ry;
  parent.add(mesh);
  return mesh;
}
function cyl(rt, rb, h, m, seg = 14) { return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); }

// pared con colisión (coordenadas mundo, y relativo al grupo de planta)
function wallSeg(parent, f, x0, x1, z0, z1, h = FH, y = 0, m = MAT.wallIn, solid = true) {
  const w = Math.max(x1 - x0, 0.06), d = Math.max(z1 - z0, 0.06);
  const mesh = bx(w, h, d, m);
  mesh.position.set((x0 + x1) / 2, y + h / 2, (z0 + z1) / 2);
  parent.add(mesh);
  if (solid) addSolid(f, x0 - 0.02, x1 + 0.02, z0 - 0.02, z1 + 0.02);
  return mesh;
}

function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.anisotropy = 4;
  return t;
}
function textPlane(lines, pw, ph, { bg = null, fg = '#fff', size = 90, stroke = null } = {}) {
  const tex = canvasTex(512, Math.round(512 * ph / pw), (ctx, w, h) => {
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); }
    const arr = Array.isArray(lines) ? lines : [lines];
    // auto-ajustar el tamaño para que la línea más larga quepa (evita que se recorte el rótulo)
    let fs = size;
    ctx.font = `bold ${fs}px sans-serif`;
    const widest = Math.max(...arr.map(ln => ctx.measureText(ln).width));
    const maxW = w * 0.9;
    if (widest > maxW) fs = Math.floor(fs * maxW / widest);
    const maxLineH = (h / arr.length) * 0.8;
    if (fs > maxLineH) fs = Math.floor(maxLineH);
    ctx.font = `bold ${fs}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    arr.forEach((ln, i) => {
      const y = h * (i + 0.5) / arr.length;
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = Math.max(2, fs * 0.12); ctx.strokeText(ln, w / 2, y); }
      ctx.fillStyle = fg; ctx.fillText(ln, w / 2, y);
    });
  });
  return new THREE.Mesh(
    new THREE.PlaneGeometry(pw, ph),
    new THREE.MeshBasicMaterial({ map: tex, transparent: !bg })
  );
}

// ----------------------------------------------------------------------------
// Parte de trabajo: generación de las 12 habitaciones del piso de Sofía
// ----------------------------------------------------------------------------
function genRooms() {
  const statuses = G.mode === 'express'
    ? shuffle(['P', 'P', 'F', 'F', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L'])  // Express: 4 habitaciones
    : shuffle(['P', 'P', 'P', 'P', 'P', 'F', 'F', 'F', 'F', 'F', 'F', 'L']);
  const stays = shuffle([3, 6, 2, 4, 3, 1]); // dos o tres fermate tocan cambio de sábanas
  let si = 0;
  for (let i = 0; i < 12; i++) {
    const st = statuses[i];
    const r = {
      idx: i, num: PLAYER_FLOOR * 100 + i + 1, status: st,
      guests: st === 'L' ? 0 : pick([1, 2, 2, 2, 3, 3, 4]),
      stay: 0, sheetChange: false,
      tasks: [], done: false, inspected: false, mistakes: 0, vis: {},
    };
    if (st === 'F') { r.stay = stays[si++ % stays.length]; r.sheetChange = r.stay % 3 === 0; }
    if (st === 'P') {
      r.tasks = ['strip', 'bedC', 'bath', 'towels', 'trash', 'floor', 'amen'];
    } else if (st === 'F') {
      r.tasks = r.sheetChange
        ? ['strip', 'bedC', 'bathQ', 'towels', 'trash', 'floor']
        : ['bed', 'bathQ', 'towels', 'trash', 'floor'];
    }
    r.tasks = r.tasks.map(k => ({ key: k, done: false }));
    G.rooms.push(r);
  }
  G.totalToClean = G.rooms.filter(r => r.status !== 'L').length;
  // 1-2 habitaciones VIP (propina sorpresa): recompensa variable que engancha
  const cleanable = shuffle(G.rooms.filter(r => r.status !== 'L'));
  cleanable.slice(0, G.mode === 'express' ? 1 : 2).forEach(r => { r.vip = true; });
}

const roomRect = i => {
  const side = i < 6 ? 0 : 1;
  const col = i % 6;
  return { x0: RX0 + col * ROOM_W, x1: RX0 + col * ROOM_W + ROOM_W, zIn: side ? -CORR : CORR, dir: side ? -1 : 1 };
};
// rect local (lx desde x0, lz desde la pared del pasillo hacia dentro) → mundo
function rrect(rc, lx0, lx1, lz0, lz1) {
  let z0 = rc.zIn + rc.dir * lz0, z1 = rc.zIn + rc.dir * lz1;
  if (z0 > z1) [z0, z1] = [z1, z0];
  return { x0: rc.x0 + lx0, x1: rc.x0 + lx1, z0, z1 };
}
const lpos = (rc, lx, lz) => ({ x: rc.x0 + lx, z: rc.zIn + rc.dir * lz });

// ----------------------------------------------------------------------------
// Construcción: planta de habitaciones
// ----------------------------------------------------------------------------
function buildGuestFloor(f) {
  const g = new THREE.Group();
  g.position.y = f * FH;
  scene.add(g);
  const full = f === PLAYER_FLOOR;
  BOUNDS[f] = { x0: BX0 + 0.3, x1: BX1 - 0.3, z0: -BZ + 0.3, z1: BZ - 0.3 };

  // suelo del pasillo + techo + losas exteriores
  add(g, bx(BX1 - BX0, 0.14, BZ * 2), (BX0 + BX1) / 2, -0.07, 0).material = MAT.corr;
  add(g, bx(BX1 - BX0, 0.14, BZ * 2), (BX0 + BX1) / 2, FH + 0.07, 0).material = MAT.ceil;
  // moqueta del pasillo
  const carpet = add(g, new THREE.Mesh(new THREE.PlaneGeometry(27.5, 1.6), MAT.carpet), 1.5, 0.012, 0);
  carpet.rotation.x = -Math.PI / 2;

  // muros exteriores este/oeste y tabiques del núcleo (ascensor/escaleras)
  wallSeg(g, f, BX0, BX0 + 0.15, -BZ, BZ, FH, 0, MAT.wall);
  wallSeg(g, f, BX1 - 0.15, BX1, -BZ, BZ, FH, 0, MAT.wall);
  wallSeg(g, f, 12, BX1, CORR, CORR + 0.12, FH, 0, MAT.wallIn);
  wallSeg(g, f, 12, BX1, -CORR - 0.12, -CORR, FH, 0, MAT.wallIn);
  // relleno del núcleo visto desde fuera
  add(g, bx(BX1 - 12, FH, BZ - CORR - 0.12), (12 + BX1) / 2, FH / 2, (CORR + BZ) / 2 + 0.06).material = MAT.wall;
  add(g, bx(BX1 - 12, FH, BZ - CORR - 0.12), (12 + BX1) / 2, FH / 2, -(CORR + BZ) / 2 - 0.06).material = MAT.wall;

  // puerta de escaleras y office
  add(g, bx(1.1, 2.1, 0.08), 13.6, 1.05, -CORR + 0.01).material = MAT.woodDark;
  add(g, textPlane(S.signStairs, 0.8, 0.18, { bg: '#5d4327', fg: '#fff', size: 70 }), 13.6, 2.3, -CORR + 0.06, 0);
  add(g, bx(1.1, 2.1, 0.08), 13.6, 1.05, CORR - 0.01).material = MAT.woodDark;
  add(g, textPlane(S.signOffice, 0.8, 0.18, { bg: '#5d4327', fg: '#fff', size: 70 }), 13.6, 2.3, CORR - 0.06, Math.PI);

  buildElevator(g, f);
  add(g, textPlane(S.signFloor(f), 1.1, 0.4, { bg: '#1773b0', fg: '#fff', size: 110 }), BX1 - 0.18, 2.5, 0, -Math.PI / 2);

  // ventana al fondo oeste del pasillo
  add(g, new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.6), MAT.glass), BX0 + 0.18, 1.6, 0, Math.PI / 2);

  // luces del techo (decorativas)
  for (let x = -10; x <= 14; x += 4) {
    const l = add(g, bx(0.7, 0.06, 0.35), x, FH - 0.04, 0);
    l.material = new THREE.MeshBasicMaterial({ color: 0xfff6d8 });
  }

  // carro de la limpieza junto al ascensor
  buildCart(g, 12.6, full ? 0.85 : -0.8);

  // las 12 habitaciones
  for (let i = 0; i < 12; i++) {
    const rc = roomRect(i);
    const room = full ? G.rooms[i] : null;
    const isOpen = full && room.status !== 'L';
    buildRoomShell(g, f, rc, i, isOpen);
    if (full) {
      buildRoomCard(g, rc, room);
      if (isOpen) buildRoomInterior(g, f, rc, room);
    } else {
      buildOtherCard(g, f, rc, i);
    }
  }

  // balcones exteriores (lado mar, norte) — barandilla blanca como en las fotos
  for (let i = 0; i < 6; i++) {
    const rc = roomRect(i);
    const cx = rc.x0 + 2;
    add(g, bx(2.4, 0.1, 1.0), cx, 0.9, BZ + 0.5).material = MAT.wall;
    add(g, bx(2.4, 0.08, 0.08), cx, 1.85, BZ + 0.96).material = MAT.white;
    for (let k = -2; k <= 2; k++) add(g, bx(0.05, 0.9, 0.05), cx + k * 0.55, 1.4, BZ + 0.96).material = MAT.white;
  }

  buildCorridorDecor(g, f);

  if (!full) {
    if (f === 4) {
      // Marco — housekeeper del 4º piso (equipo mixto)
      spawnMaid(g, 'Marco', S.marcoLabel, 0, -10, 10, 0, f, 0x241a12);
    } else {
      // compañera de piso (pelo oscuro mediterráneo, distinto por compañera)
      const names = { 1: 'Anna', 3: 'Giulia' };
      const hairs = { 1: 0x2a1c12, 3: 0x4a3220 };
      if (names[f]) spawnMaid(g, names[f], S.maidLabel(names[f], f), 0, -10, 10, 0, f, hairs[f]);
    }
  }
  return g;
}

// Calidez del pasillo: cuadros del mar, apliques cálidos, macetas, zócalo y moldura.
// Quita el aire de "hospital" sin necesidad de texturas externas.
const WARM = new THREE.MeshBasicMaterial({ color: 0xffe6b0 });
function plant(g, f, x, z, s = 1) {
  add(g, cyl(0.15 * s, 0.19 * s, 0.4 * s, MAT.terra, 10), x, 0.2 * s, z);
  for (const [dx, dy, dz] of [[0, 0.55, 0], [0.13, 0.44, 0.05], [-0.11, 0.48, -0.06], [0.04, 0.6, 0.08]])
    add(g, new THREE.Mesh(new THREE.SphereGeometry(0.19 * s, 7, 6), MAT.green), x + dx * s, (dy + 0.2) * s, z + dz * s);
  if (f !== undefined) addSolid(f, x - 0.22 * s, x + 0.22 * s, z - 0.22 * s, z + 0.22 * s);
}
function buildCorridorDecor(g, f) {
  // zócalo de madera + moldura de techo a lo largo del pasillo
  for (const zz of [CORR, -CORR]) {
    const sgn = zz > 0 ? -1 : 1;
    add(g, bx(27.5, 0.18, 0.03), 1.5, 0.09, zz + sgn * 0.07).material = MAT.woodDark;
    add(g, bx(27.5, 0.1, 0.03), 1.5, FH - 0.16, zz + sgn * 0.07).material = MAT.champagne;
  }
  const art = (VIEW.sea ||= viewMat(true));
  for (let i = 0; i < 12; i++) {
    const rc = roomRect(i);
    const fy = rc.dir > 0 ? Math.PI : 0;           // mirando al pasillo
    const zw = rc.zIn - rc.dir * 0.07;
    // cuadro enmarcado del mar
    add(g, bx(0.78, 0.58, 0.04), rc.x0 + 3.45, 1.62, zw, fy).material = MAT.woodDark;
    add(g, new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.46), art), rc.x0 + 3.45, 1.62, zw - rc.dir * 0.03, fy);
    // aplique de luz cálida
    add(g, bx(0.1, 0.2, 0.07), rc.x0 + 0.55, 2.05, zw, fy).material = MAT.champagne;
    add(g, new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), WARM), rc.x0 + 0.55, 2.0, zw - rc.dir * 0.05);
  }
  // macetas con plantas en los extremos y el centro del pasillo
  for (const x of [-11.4, 11.4, 0]) for (const side of [1, -1]) plant(g, f, x, side * (CORR - 0.33));
}

function buildElevator(g, f) {
  // puertas de acero en la pared este
  add(g, bx(0.1, 2.3, 1.7), ELEV.x + 0.92, 1.15, 0).material = MAT.terra;
  add(g, bx(0.07, 2.1, 0.72), ELEV.x + 0.86, 1.05, -0.38).material = MAT.steel;
  add(g, bx(0.07, 2.1, 0.72), ELEV.x + 0.86, 1.05, 0.38).material = MAT.steel;
  add(g, textPlane('🛗', 0.34, 0.34, { size: 200 }), ELEV.x + 0.83, 2.42, 0, -Math.PI / 2);
  addSolid(f, ELEV.x + 0.55, BX1, -0.9, 0.9);
  HOTSPOTS.push({
    floor: f, x: ELEV.x, z: ELEV.z, r: 1.7, type: 'press',
    label: S.callLift, action: openElevator,
  });
  // flecha dorada de guía (visible cuando el objetivo es el ascensor)
  const mk = arrowSprite();
  mk.position.set(ELEV.x, 2.7, ELEV.z);
  mk.visible = false;
  g.add(mk);
  ELEV_MARK[f] = mk;
}

// Carro de camarera de pisos (como la foto real): estructura tubular gris,
// tres bandejas, bolsas de tela laterales, toallas/sábanas y botes de cortesía.
function buildCart(g, x, z) {
  const c = new THREE.Group();
  const steel = MAT.steel, gray = lamb(0x9aa1a8), grayD = lamb(0x767d84);
  // ruedas
  for (const [dx, dz] of [[-0.5, -0.22], [0.5, -0.22], [-0.5, 0.22], [0.5, 0.22]]) {
    const w = cyl(0.06, 0.06, 0.05, MAT.black, 10); w.rotation.z = Math.PI / 2; add(c, w, dx, 0.06, dz);
  }
  // postes tubulares + 3 bandejas
  for (const [dx, dz] of [[-0.52, -0.24], [0.52, -0.24], [-0.52, 0.24], [0.52, 0.24]])
    add(c, cyl(0.022, 0.022, 1.0, steel, 8), dx, 0.55, dz);
  for (const yy of [0.95, 0.6, 0.2]) add(c, bx(1.06, 0.04, 0.52), 0, yy, 0).material = steel;
  // asa de empuje
  const handle = cyl(0.02, 0.02, 0.5, steel, 8); handle.rotation.x = Math.PI / 2; add(c, handle, 0.53, 1.04, 0);
  // dos bolsas de tela grandes al frente (lencería limpia / ropa sucia)
  for (const dx of [-0.27, 0.27]) {
    add(c, bx(0.46, 0.52, 0.42), dx, 0.4, 0.16).material = gray;
    add(c, bx(0.48, 0.06, 0.44), dx, 0.67, 0.16).material = grayD;
  }
  // pilas de toallas blancas y sábanas dobladas (bandeja superior)
  add(c, bx(0.3, 0.16, 0.36), -0.3, 1.06, -0.06).material = MAT.towel;
  add(c, bx(0.28, 0.1, 0.34), -0.3, 1.18, -0.06).material = lamb(0xf2f2f2);
  add(c, bx(0.3, 0.14, 0.36), 0.05, 1.05, -0.06).material = lamb(0xdfe8f2);     // sábanas azul claro
  add(c, bx(0.22, 0.08, 0.3), 0.36, 1.03, -0.06).material = lamb(0xeef3d8);      // alfombrines
  // botes de cortesía de colores (bandeja media)
  const cols = [0xe8a87c, 0x7cc4e8, 0x9be24a, 0xe87c9b];
  for (let i = 0; i < 4; i++) add(c, cyl(0.03, 0.03, 0.12, lamb(cols[i]), 8), -0.42 + i * 0.09, 0.71, -0.12);
  // bolsa negra de basura/ropa sucia colgando del lateral
  add(c, cyl(0.15, 0.12, 0.4, MAT.black, 10), 0.66, 0.42, 0.16);
  c.position.set(x, 0, z);
  g.add(c);
  return c;
}

// Postal tras la ventana: vista de playa (Praia a Mare, Isola di Dino) o pueblo.
// Plano sin niebla colocado lejos de la ventana → mar azul nítido como en las fotos.
function viewMat(sea) {
  const tex = canvasTex(384, 240, (ctx, w, h) => {
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.6);
    sky.addColorStop(0, '#3f9fe0'); sky.addColorStop(1, '#cfeaf8');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (const [cx, cy, cr] of [[w * 0.18, h * 0.16, 16], [w * 0.25, h * 0.19, 22], [w * 0.68, h * 0.1, 14], [w * 0.75, h * 0.13, 20], [w * 0.5, h * 0.22, 12]]) {
      ctx.beginPath(); ctx.arc(cx, cy, cr, 0, 7); ctx.fill();
    }
    const hz = h * 0.52;
    if (sea) {
      // Isola di Dino: islote de cima plana
      ctx.fillStyle = '#5f7d5c';
      ctx.beginPath(); ctx.moveTo(w * 0.60, hz); ctx.lineTo(w * 0.63, hz - 26); ctx.lineTo(w * 0.82, hz - 26); ctx.lineTo(w * 0.86, hz); ctx.closePath(); ctx.fill();
      // costa montañosa a la izquierda
      ctx.fillStyle = '#7a93a8';
      ctx.beginPath(); ctx.moveTo(0, hz); ctx.lineTo(w * 0.12, hz - 30); ctx.lineTo(w * 0.28, hz); ctx.fill();
      // mar
      const sea2 = ctx.createLinearGradient(0, hz, 0, h);
      sea2.addColorStop(0, '#1f86c8'); sea2.addColorStop(1, '#075a93');
      ctx.fillStyle = sea2; ctx.fillRect(0, hz, w, h - hz);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
      for (let k = 0; k < 6; k++) { const yy = hz + 18 + k * 16; ctx.beginPath(); ctx.moveTo(w * 0.25, yy); ctx.lineTo(w * 0.7, yy); ctx.stroke(); }
      // playa en primer plano
      ctx.fillStyle = '#e7d3a0'; ctx.fillRect(0, h * 0.9, w, h * 0.1);
    } else {
      // montañas de Calabria y casitas del pueblo
      ctx.fillStyle = '#6f8a5e';
      ctx.beginPath(); ctx.moveTo(0, hz); ctx.lineTo(w * 0.28, hz - 40); ctx.lineTo(w * 0.55, hz); ctx.fill();
      ctx.beginPath(); ctx.moveTo(w * 0.42, hz); ctx.lineTo(w * 0.78, hz - 32); ctx.lineTo(w, hz); ctx.fill();
      ctx.fillStyle = '#cdb98f'; ctx.fillRect(0, hz, w, h - hz);
      for (let k = 0; k < 7; k++) { ctx.fillStyle = ['#f2e3c8', '#e2b49a', '#f4d8b8'][k % 3]; ctx.fillRect(w * (0.04 + k * 0.135), hz - 4, w * 0.09, h * 0.16); ctx.fillStyle = '#c96f4a'; ctx.fillRect(w * (0.03 + k * 0.135), hz - 8, w * 0.11, 5); }
    }
    // palmeras en silueta a ambos lados (primer plano)
    ctx.fillStyle = '#2c6536';
    for (const px of [w * 0.06, w * 0.94]) {
      ctx.fillRect(px - 3, hz, 6, h - hz);
      for (let a = 0; a < 6; a++) { ctx.save(); ctx.translate(px, hz + 2); ctx.rotate(-1.2 + a * 0.42); ctx.fillRect(0, -3, 34, 6); ctx.restore(); }
    }
  });
  const m = new THREE.MeshBasicMaterial({ map: tex });
  m.fog = false; // la postal no se difumina con la distancia
  return m;
}

// caparazón de la habitación: tabiques, pared del pasillo, puerta
function buildRoomShell(g, f, rc, i, isOpen) {
  // pared del pasillo
  if (isOpen) {
    // puerta ANCHA (1.6 m) para entrar con holgura, sobre todo en móvil
    let r = rrect(rc, 0, 1.2, -0.06, 0.06);
    wallSeg(g, f, r.x0, r.x1, r.z0, r.z1);
    r = rrect(rc, 2.8, 4, -0.06, 0.06);
    wallSeg(g, f, r.x0, r.x1, r.z0, r.z1);
    // dintel sobre la puerta
    r = rrect(rc, 1.2, 2.8, -0.06, 0.06);
    add(g, bx(1.6, FH - 2.1, 0.12), (r.x0 + r.x1) / 2, 2.1 + (FH - 2.1) / 2, (r.z0 + r.z1) / 2).material = MAT.wallIn;
    // jambas de madera del marco
    for (const lx of [1.2, 2.8]) { const jp = lpos(rc, lx, 0); add(g, bx(0.08, 2.1, 0.18), jp.x, 1.05, jp.z).material = MAT.woodDark; }
    // hoja abierta PEGADA a la pared (ya no estorba el paso)
    const p = lpos(rc, 1.6, 0.11);
    add(g, bx(0.8, 2.05, 0.05), p.x, 1.03, p.z).material = MAT.wood;
  } else {
    const r = rrect(rc, 0, 4, -0.06, 0.06);
    wallSeg(g, f, r.x0, r.x1, r.z0, r.z1);
    const p = lpos(rc, 2, 0);
    const door = add(g, bx(0.95, 2.05, 0.07), p.x, 1.03, rc.zIn - rc.dir * 0.1);
    door.material = MAT.wood;
  }
  // tabique entre habitaciones (lado oeste de cada una) + cierre este de la última
  let r = rrect(rc, -0.05, 0.05, 0, ROOM_D);
  wallSeg(g, f, r.x0, r.x1, r.z0, r.z1);
  if (i % 6 === 5) { r = rrect(rc, 3.95, 4.05, 0, ROOM_D); wallSeg(g, f, r.x0, r.x1, r.z0, r.z1); }
  // pared exterior con ventana
  r = rrect(rc, 0, 4, ROOM_D - 0.12, ROOM_D);
  addSolid(f, r.x0, r.x1, r.z0, r.z1);
  const wz = (r.z0 + r.z1) / 2;
  add(g, bx(1.0, FH, 0.12), rc.x0 + 0.5, FH / 2, wz).material = MAT.wallIn;
  add(g, bx(0.9, FH, 0.12), rc.x0 + 3.55, FH / 2, wz).material = MAT.wallIn;
  add(g, bx(2.1, 0.7, 0.12), rc.x0 + 2.05, 0.35, wz).material = MAT.wallIn;          // antepecho más bajo
  add(g, bx(2.1, FH - 2.55, 0.12), rc.x0 + 2.05, 2.55 + (FH - 2.55) / 2, wz).material = MAT.wallIn;
  // postal de playa/pueblo lejos de la ventana (sin niebla) → vista nítida al entrar
  const seaSide = rc.dir > 0;
  const vm = seaSide ? (VIEW.sea ||= viewMat(true)) : (VIEW.town ||= viewMat(false));
  const view = add(g, new THREE.Mesh(new THREE.PlaneGeometry(13, 8), vm), rc.x0 + 2.05, 2.4, wz + rc.dir * 9);
  view.rotation.y = seaSide ? Math.PI : 0;
  // marco de aluminio + cristal limpio
  add(g, bx(2.12, 1.85, 0.05), rc.x0 + 2.05, 1.62, wz + rc.dir * 0.02).material = MAT.steel;
  add(g, bx(1.94, 1.7, 0.04), rc.x0 + 2.05, 1.62, wz - rc.dir * 0.01).material = MAT.wallIn;
  add(g, new THREE.Mesh(new THREE.PlaneGeometry(0.05, 1.7), MAT.steel), rc.x0 + 2.05, 1.62, wz + rc.dir * 0.03); // montante central
  add(g, new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.66), MAT.glass), rc.x0 + 2.05, 1.62, wz + rc.dir * 0.03);
  // alféizar de mármol como en las fotos
  add(g, bx(2.2, 0.08, 0.3), rc.x0 + 2.05, 0.74, wz - rc.dir * 0.12).material = MAT.marble;
}

// tarjeta de estado en la puerta (piso del jugador, se actualiza)
function buildRoomCard(g, rc, room) {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 170;
  const ctx = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv);
  room.cardCtx = ctx; room.cardTex = tex;
  drawRoomCard(room);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.385),
    new THREE.MeshBasicMaterial({ map: tex }));
  const p = lpos(rc, 2.95, 0);
  mesh.position.set(p.x, 1.62, rc.zIn - rc.dir * 0.085);
  mesh.rotation.y = rc.dir > 0 ? Math.PI : 0;
  g.add(mesh);
}
function drawRoomCard(room) {
  const ctx = room.cardCtx, W = 256, H = 170;
  const col = room.done ? '#3fa15c' : room.status === 'P' ? '#c0392b' : room.status === 'F' ? '#1773b0' : '#7f8c8d';
  ctx.fillStyle = '#f8f3e9'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = col; ctx.fillRect(0, 0, W, 56);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 40px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(room.num), W / 2, 29);
  ctx.fillStyle = '#25313c'; ctx.font = 'bold 26px sans-serif';
  if (room.done) {
    ctx.fillText(S.hecha, W / 2, 95);
  } else if (room.status === 'L') {
    ctx.fillText(S.libre, W / 2, 95);
  } else {
    ctx.fillText(room.status === 'P' ? S.partenza : S.fermata, W / 2, 88);
    ctx.font = '22px sans-serif';
    const extra = room.status === 'F' ? S.nightShort(room.stay) : '';
    ctx.fillText(`${S.guests(room.guests)}${extra}`, W / 2, 120);
    if (room.sheetChange) { ctx.fillStyle = '#c0392b'; ctx.font = 'bold 20px sans-serif'; ctx.fillText(S.sheetChangeCard, W / 2, 148); }
  }
  room.cardTex.needsUpdate = true;
}
// tarjeta decorativa en otros pisos
function buildOtherCard(g, f, rc, i) {
  const num = f * 100 + i + 1;
  const st = pick([S.partenza, S.fermata, S.fermata, S.libre]);
  const col = st === S.partenza ? '#c0392b' : st === S.fermata ? '#1773b0' : '#7f8c8d';
  const mesh = textPlane([String(num), st], 0.55, 0.36, { bg: '#f8f3e9', fg: col, size: 88 });
  const p = lpos(rc, 2.95, 0);
  mesh.position.set(p.x, 1.62, rc.zIn - rc.dir * 0.085);
  mesh.rotation.y = rc.dir > 0 ? Math.PI : 0;
  g.add(mesh);
}

// ----------------------------------------------------------------------------
// Interior de una habitación del piso del jugador
// ----------------------------------------------------------------------------
function buildRoomInterior(g, f, rc, room) {
  const V = room.vis;
  const P = (lx, lz) => lpos(rc, lx, lz);
  const solidL = (a, b, c, d) => { const r = rrect(rc, a, b, c, d); addSolid(f, r.x0, r.x1, r.z0, r.z1); };

  // suelos
  let r = rrect(rc, 0.05, 3.95, 0.06, ROOM_D - 0.12);
  const fl = add(g, new THREE.Mesh(new THREE.PlaneGeometry(r.x1 - r.x0, r.z1 - r.z0), MAT.cotto),
    (r.x0 + r.x1) / 2, 0.013, (r.z0 + r.z1) / 2);
  fl.rotation.x = -Math.PI / 2;
  r = rrect(rc, 0.05, 1.9, 0.06, 2.1);
  const bf = add(g, new THREE.Mesh(new THREE.PlaneGeometry(r.x1 - r.x0, r.z1 - r.z0), MAT.tile),
    (r.x0 + r.x1) / 2, 0.02, (r.z0 + r.z1) / 2);
  bf.rotation.x = -Math.PI / 2;

  // tabiques del baño
  r = rrect(rc, 0, 1.9, 2.04, 2.16); wallSeg(g, f, r.x0, r.x1, r.z0, r.z1, 2.5);
  r = rrect(rc, 1.84, 1.96, 1.0, 2.04); wallSeg(g, f, r.x0, r.x1, r.z0, r.z1, 2.5);

  // --- baño estilo hotel: encimera+lavabo+espejo, váter, bidet, ducha de cristal ---
  // revestimiento beige travertino en las paredes del baño (como en las fotos)
  let p = P(0, 1.05);
  add(g, bx(0.04, 2.4, 2.0), rc.x0 + 0.07, 1.2, p.z).material = MAT.travertine; // pared oeste
  p = P(0.95, 2.05);
  add(g, bx(1.86, 2.4, 0.04), p.x, 1.2, p.z).material = MAT.travertine;         // pared del fondo

  // --- BAÑERA con ducha, contra la pared oeste (eje largo en profundidad) ---
  p = P(0.42, 1.25);
  add(g, bx(0.58, 0.5, 1.5, MAT.white), p.x, 0.25, p.z);                        // cuerpo de la bañera
  add(g, bx(0.42, 0.18, 1.32, lamb(0xdcefff)), p.x, 0.45, p.z);                // agua / interior
  add(g, bx(0.05, 0.5, 1.55, MAT.travertine), rc.x0 + 0.05, 0.25, p.z);        // faldón contra la pared
  add(g, bx(0.04, 0.22, 0.04, MAT.steel), rc.x0 + 0.22, 0.62, P(0, 0.65).z);   // grifo de la bañera
  // ducha de teléfono sobre la bañera + mampara de cristal
  add(g, bx(0.04, 0.55, 0.04, MAT.steel), rc.x0 + 0.18, 1.9, P(0, 0.7).z);     // barra vertical
  add(g, bx(0.26, 0.04, 0.04, MAT.steel), rc.x0 + 0.3, 1.95, P(0, 0.7).z);     // brazo
  add(g, cyl(0.07, 0.07, 0.03, MAT.steel), rc.x0 + 0.42, 1.88, P(0, 0.7).z);   // alcachofa
  add(g, new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.55), MAT.glass), rc.x0 + 0.72, 1.05, p.z, Math.PI / 2); // mampara
  add(g, bx(0.05, 1.55, 0.05, MAT.steel), rc.x0 + 0.72, 1.05, P(0, 2.0).z);    // montante de la mampara

  // --- LAVABO con encimera, espejo grande y toallas (pared frontal, junto a la puerta) ---
  p = P(0.62, 0.3);
  add(g, bx(0.8, 0.5, 0.42, MAT.wood), p.x, 0.46, p.z);                         // mueble bajo
  add(g, bx(0.84, 0.06, 0.46, MAT.bathStone), p.x, 0.75, p.z);                 // encimera
  add(g, cyl(0.15, 0.12, 0.1, MAT.white), p.x, 0.79, p.z);                     // lavabo
  add(g, bx(0.04, 0.14, 0.04, MAT.steel), p.x, 0.88, P(0.62, 0.45).z);        // grifo
  add(g, bx(0.5, 0.72, 0.04, MAT.steel), p.x, 1.5, P(0.62, 0.08).z);          // marco del espejo
  add(g, new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.66), MAT.glass), p.x, 1.5, P(0.62, 0.07).z); // espejo
  add(g, bx(0.22, 0.12, 0.3, MAT.towel), p.x + 0.36, 0.85, p.z);              // toallas blancas dobladas

  // --- INODORO con cisterna y tapa (pared del fondo, lado este) ---
  p = P(1.42, 1.72);
  add(g, bx(0.44, 0.46, 0.52, MAT.white), p.x, 0.23, p.z);                     // taza
  add(g, bx(0.46, 0.52, 0.18, MAT.white), p.x, 0.66, P(1.42, 1.93).z);        // cisterna (contra la pared)
  add(g, bx(0.42, 0.06, 0.48, MAT.steel), p.x, 0.48, p.z);                    // tapa

  // --- BIDET (hotel italiano) junto al inodoro ---
  p = P(1.02, 1.74);
  add(g, bx(0.34, 0.4, 0.42, MAT.white), p.x, 0.2, p.z);

  solidL(0, 0.74, 0.45, 2.0);     // bañera + ducha
  solidL(0.84, 1.66, 1.5, 2.0);   // inodoro + bidet
  solidL(0.2, 1.04, 0.1, 0.52);   // lavabo

  // suciedad del baño
  p = P(0.9, 1.2);
  V.bathDirt = add(g, new THREE.Mesh(new THREE.CircleGeometry(0.34, 10), MAT.dirt), p.x, 0.028, p.z);
  V.bathDirt.rotation.x = -Math.PI / 2;

  // toallero: toallas usadas tiradas / pila de toallas limpias
  p = P(1.7, 0.55);
  add(g, bx(0.06, 0.05, 0.6), p.x, 1.15, p.z).material = MAT.steel;
  V.towelOld = add(g, bx(0.5, 0.08, 0.45), p.x - 0.35, 0.06, p.z, 0.4);
  V.towelOld.material = MAT.towelOld;
  V.towelNew = new THREE.Group();
  for (let k = 0; k < 3; k++) add(V.towelNew, bx(0.42 - k * 0.08, 0.07, 0.34), 0, 0.62 + k * 0.075, 0).material = MAT.towel;
  V.towelNew.position.set(p.x, 0, p.z);
  V.towelNew.visible = false;
  g.add(V.towelNew);

  // --- una sola cama doble, pegada a la pared oeste, con gran cabecero ---
  V.beds = [];
  makeBed(g, rc, room);
  solidL(0.05, 2.05, 3.2, 4.8);

  // aplique de luz cálida sobre el cabecero (pared oeste), como en las fotos
  p = P(0.12, 4.0);
  add(g, bx(0.18, 0.18, 0.1), p.x, 2.05, p.z).material = MAT.champagne;
  add(g, new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffe6b0 })), p.x + 0.05, 2.0, p.z);

  // mesilla con lamparita junto a la cabecera
  p = P(0.45, 3.05);
  add(g, bx(0.42, 0.5, 0.42), p.x, 0.25, p.z).material = MAT.wood;
  add(g, cyl(0.09, 0.12, 0.3, lamb(0xf2e3b8)), p.x, 0.65, p.z);

  // alfombra cálida a los pies de la cama
  p = P(2.55, 4.0);
  const rug = add(g, new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.5), lamb(0xb8584a)), p.x, 0.022, p.z);
  rug.rotation.x = -Math.PI / 2;

  // cuadro del mar en la pared oeste (esquina junto a la ventana)
  const rart = (VIEW.sea ||= viewMat(true));
  p = P(0.09, 5.45);
  add(g, bx(0.05, 0.52, 0.68), p.x, 1.6, p.z).material = MAT.woodDark;
  add(g, new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.4), rart), p.x + 0.04, 1.6, p.z).rotation.y = Math.PI / 2;

  // armario junto a la puerta (pared este)
  p = P(3.6, 0.75);
  add(g, bx(0.7, 2.2, 1.2), p.x, 1.1, p.z).material = MAT.woodDark;
  solidL(3.25, 3.95, 0.15, 1.35);

  // mueble-TV de madera oscura ENFRENTE de la cama (pared este), mirando al oeste
  p = P(3.5, 4.0);
  add(g, bx(0.5, 0.68, 1.3), p.x, 0.34, p.z).material = MAT.woodDark;          // cómoda
  add(g, bx(0.06, 0.64, 1.08), rc.x0 + 3.86, 1.15, p.z).material = MAT.black;  // TV mirando a la cama
  solidL(3.2, 3.95, 3.35, 4.65);

  // papelera junto al mueble-TV (fuera del paso de la puerta)
  p = P(3.55, 3.0);
  add(g, cyl(0.14, 0.11, 0.32, MAT.trash), p.x, 0.16, p.z);
  V.trashFull = add(g, cyl(0.11, 0.09, 0.12, lamb(0x8a8474)), p.x, 0.34, p.z);

  // butaca gris en la esquina de la ventana
  p = P(3.25, 5.35);
  add(g, bx(0.62, 0.4, 0.62), p.x, 0.2, p.z).material = lamb(0xb9bcc0);
  add(g, bx(0.62, 0.5, 0.14), p.x, 0.6, p.z + rc.dir * 0.24).material = lamb(0xb9bcc0);
  add(g, bx(0.13, 0.42, 0.62), p.x - 0.37, 0.46, p.z).material = lamb(0xacafb4);
  add(g, bx(0.13, 0.42, 0.62), p.x + 0.37, 0.46, p.z).material = lamb(0xacafb4);
  solidL(2.9, 3.6, 5.0, 5.7);

  // cortinas claras junto a la ventana
  const wz2 = rc.zIn + rc.dir * (ROOM_D - 0.2);
  add(g, bx(0.28, 2.3, 0.1), rc.x0 + 1.25, 1.4, wz2).material = lamb(0xe8e2d2);
  add(g, bx(0.28, 2.3, 0.1), rc.x0 + 2.95, 1.4, wz2).material = lamb(0xe8e2d2);

  // manchas del suelo
  V.dirtSpots = [];
  const n = room.status === 'P' ? 3 : 2;
  for (let k = 0; k < n; k++) {
    p = P(rand(2.2, 3.6), rand(2.0, 5.4));
    const d = add(g, new THREE.Mesh(new THREE.CircleGeometry(rand(0.16, 0.3), 9), MAT.dirt), p.x, 0.03 + k * 0.002, p.z);
    d.rotation.x = -Math.PI / 2;
    V.dirtSpots.push(d);
  }

  // luz de techo
  add(g, cyl(0.3, 0.3, 0.06, new THREE.MeshBasicMaterial({ color: 0xfff6d8 })), rc.x0 + 2, FH - 0.05, rc.zIn + rc.dir * 3.5);

  // --- puntos de interacción de las tareas ---
  const spots = {
    strip: [2.4, 4.0], bedC: [2.4, 4.0], bed: [2.4, 4.0],
    bath: [1.0, 1.0], bathQ: [1.0, 1.0], towels: [1.6, 0.7],
    trash: [3.15, 3.0], floor: [2.6, 2.6], amen: [2.95, 4.0],
  };
  for (const t of room.tasks) {
    const s = P(spots[t.key][0], spots[t.key][1]);
    const h = {
      floor: f, x: s.x, z: s.z, r: 1.5, roomIdx: room.idx, taskKey: t.key,
      type: t.key === 'towels' ? 'press' : 'hold', dur: TASK_DEFS[t.key].dur,
      label: `${TASK_DEFS[t.key].icon} ${TASK_DEFS[t.key].label} — ${S.roomTitle(room.num)}`,
    };
    // icono flotante sobre la tarea pendiente
    const mk = emojiSprite(TASK_DEFS[t.key].icon, 0.42);
    mk.position.set(s.x, 1.45, s.z);
    mk.visible = false;
    g.add(mk);
    h.marker = mk; h.markerY = 1.45;
    HOTSPOTS.push(h);
  }
}

// Una sola cama doble pegada a la pared OESTE: largo en X (cabeza en -x), ancho en Z
function makeBed(g, rc, room) {
  const V = room.vis;
  const len = 2.0, w = 1.6;
  const p = lpos(rc, 1.05, 4.0);
  const grp = new THREE.Group();
  grp.position.set(p.x, 0, p.z);
  add(grp, bx(len, 0.25, w), 0, 0.13, 0).material = MAT.wood;       // somier
  add(grp, bx(len, 0.16, w), 0, 0.33, 0).material = MAT.mattress;   // colchón
  add(grp, bx(0.1, 1.0, w + 0.24), -len / 2 - 0.03, 0.7, 0).material = MAT.headboard; // gran cabecero
  // versión deshecha (manta arrugada)
  const messy = new THREE.Group();
  add(messy, bx(len - 0.12, 0.12, w - 0.08), 0.05, 0.46, 0.05, 0.1).material = MAT.coverMessy;
  add(messy, bx(0.5, 0.12, 0.34), len / 5, 0.47, -w / 5).material = lamb(0xe8e4d8);
  grp.add(messy);
  // versión hecha (colcha de rayas + sábana vuelta + almohadas + cojín + toallas dobladas)
  const neat = new THREE.Group();
  add(neat, bx(len - 0.04, 0.1, w - 0.02), 0, 0.46, 0).material = MAT.cover;
  add(neat, bx(0.55, 0.05, w - 0.06), -len / 2 + 0.35, 0.5, 0).material = MAT.towel;        // sábana vuelta
  for (const dz of [-w / 4, w / 4]) add(neat, bx(0.5, 0.14, 0.42), -len / 2 + 0.42, 0.49, dz).material = MAT.towel; // almohadas
  add(neat, bx(0.42, 0.13, 0.32), -len / 2 + 0.52, 0.52, 0).material = lamb(0xe6b85c);      // cojín ámbar
  add(neat, bx(0.32, 0.1, 0.26), len / 4, 0.53, 0).material = MAT.towel;                     // toallas dobladas
  add(neat, bx(0.28, 0.08, 0.22), len / 4, 0.62, 0).material = MAT.towel;
  neat.visible = false;
  grp.add(neat);
  g.add(grp);
  V.beds.push({ messy, neat });
}

// ----------------------------------------------------------------------------
// Recepción (planta baja)
// ----------------------------------------------------------------------------
function buildLobby() {
  const f = 0;
  const g = new THREE.Group();
  scene.add(g);
  BOUNDS[f] = { x0: BX0 + 0.35, x1: BX1 - 0.35, z0: -BZ + 0.35, z1: BZ - 0.35 };

  add(g, bx(BX1 - BX0, 0.14, BZ * 2), (BX0 + BX1) / 2, -0.07, 0).material = MAT.marble;
  add(g, bx(BX1 - BX0, 0.14, BZ * 2), (BX0 + BX1) / 2, FH + 0.07, 0).material = MAT.ceil;
  wallSeg(g, f, BX0, BX0 + 0.15, -BZ, BZ, FH, 0, MAT.wall);
  wallSeg(g, f, BX1 - 0.15, BX1, -BZ, BZ, FH, 0, MAT.wall);
  // pared norte con ventanales al mar
  wallSeg(g, f, BX0, BX1, BZ - 0.15, BZ, FH, 0, MAT.wall);
  for (let x = -10; x < 14; x += 4)
    add(g, new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.7), MAT.glass), x + 1.2, 1.55, BZ - 0.16, Math.PI);
  // fachada sur acristalada con puerta (cerrada durante el turno)
  wallSeg(g, f, BX0, BX1, -BZ, -BZ + 0.15, FH, 0, MAT.wall);
  for (let x = -11; x < 15; x += 3.6)
    add(g, new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.1), MAT.glass), x + 1.1, 1.3, -BZ + 0.16);
  add(g, bx(1.8, 2.2, 0.1), 2, 1.1, -BZ + 0.2).material = MAT.glass;
  HOTSPOTS.push({
    floor: f, x: 2, z: -BZ + 1.1, r: 1.6, type: 'press',
    label: S.exitDoor, action: () => toast(S.exitMsg),
  });

  // columnas
  for (const x of [-8, -2, 4, 10]) for (const z of [-3.4, 3.4]) {
    add(g, cyl(0.28, 0.32, FH, MAT.wall, 12), x, FH / 2, z);
    addSolid(f, x - 0.35, x + 0.35, z - 0.35, z + 0.35);
  }

  // mostrador de recepción
  add(g, bx(3.4, 1.08, 0.7), 9, 0.54, 1.6).material = MAT.wood;
  add(g, bx(3.6, 0.06, 0.85), 9, 1.1, 1.6).material = MAT.woodDark;
  addSolid(f, 7.2, 10.8, 1.2, 2.0);
  add(g, bx(3.4, 1.6, 0.3), 9, 1.6, 3.2).material = MAT.woodDark;
  add(g, textPlane(['HOTEL DINO BLU ★★★', 'Reception'], 2.8, 0.8, { bg: '#c96f4a', fg: '#fff', size: 64 }), 9, 2.0, 3.05, Math.PI);

  // zona de sofás
  for (const [x, z] of [[-9, 1.5], [-9, -1.5]]) {
    add(g, bx(2.2, 0.45, 0.9), x, 0.22, z).material = lamb(0x4b7d9e);
    add(g, bx(2.2, 0.6, 0.2), x, 0.65, z + (z > 0 ? 0.36 : -0.36)).material = lamb(0x4b7d9e);
    addSolid(f, x - 1.15, x + 1.15, z - 0.5, z + 0.5);
  }
  add(g, bx(1.1, 0.4, 1.1), -9, 0.2, 0).material = MAT.wood;
  addSolid(f, -9.6, -8.4, -0.6, 0.6);

  // rincón restaurante "Blu" (decorativo)
  for (const [x, z] of [[-4, 5], [-1, 5], [-4, -5], [-1, -5]]) {
    add(g, cyl(0.55, 0.55, 0.06, MAT.white, 12), x, 0.74, z);
    add(g, cyl(0.06, 0.08, 0.72, MAT.woodDark), x, 0.37, z);
    addSolid(f, x - 0.6, x + 0.6, z - 0.6, z + 0.6);
  }
  add(g, textPlane('🌿 Ristorante Blu 🌿', 3, 0.5, { bg: '#3fa15c', fg: '#fff', size: 60 }), -2.5, 2.4, BZ - 0.2, Math.PI);

  // plantas
  for (const [x, z] of [[-11.5, 6], [-11.5, -6], [11.5, 6], [6, -6]]) {
    add(g, cyl(0.3, 0.36, 0.5, lamb(0xb5651d)), x, 0.25, z);
    add(g, new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), MAT.green), x, 1.0, z);
    addSolid(f, x - 0.4, x + 0.4, z - 0.4, z + 0.4);
  }
  // ── más mobiliario para que el lobby no se vea vacío ──────────────────
  // alfombra central
  const rug = add(g, new THREE.Mesh(new THREE.PlaneGeometry(7, 5), lamb(0xb8584a)), 0, 0.02, -0.4);
  rug.rotation.x = -Math.PI / 2;
  // salón central: sofá + 2 butacas + mesa de centro
  add(g, bx(2.6, 0.45, 0.95), 0, 0.22, -2.0).material = lamb(0x4b7d9e);        // sofá (respaldo al norte)
  add(g, bx(2.6, 0.62, 0.2), 0, 0.66, -2.42).material = lamb(0x4b7d9e);
  addSolid(f, -1.4, 1.4, -2.6, -1.5);
  for (const sx of [-2.1, 2.1]) {                                              // butacas mirando al sofá
    add(g, bx(0.95, 0.42, 0.95), sx, 0.22, 0.5).material = lamb(0x6f95b0);
    add(g, bx(0.95, 0.6, 0.2), sx, 0.62, 0.88).material = lamb(0x6f95b0);
    addSolid(f, sx - 0.55, sx + 0.55, 0.0, 1.0);
  }
  add(g, bx(1.5, 0.4, 0.85), 0, 0.2, -0.6).material = MAT.woodDark;            // mesa de centro
  add(g, cyl(0.5, 0.5, 0.04, MAT.glass, 12), 0, 0.42, -0.6);
  addSolid(f, -0.8, 0.8, -1.05, -0.15);
  // lámparas colgantes sobre el salón
  for (const lx of [-1.2, 1.2]) {
    add(g, cyl(0.02, 0.02, 0.7, MAT.woodDark, 6), lx, FH - 0.35, -0.6);
    add(g, new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.3, 12), MAT.champagne), lx, FH - 0.75, -0.6);
    add(g, new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffe6b0 })), lx, FH - 0.85, -0.6);
  }

  // carrito portaequipajes dorado junto a recepción
  add(g, bx(1.5, 0.12, 0.8), 6, 0.5, 2.4).material = MAT.woodDark;
  for (const [dx, dz] of [[-0.65, -0.32], [0.65, -0.32], [-0.65, 0.32], [0.65, 0.32]])
    add(g, cyl(0.03, 0.03, 1.4, MAT.champagne, 8), 6 + dx, 1.0, 2.4 + dz);
  add(g, bx(1.5, 0.05, 0.8), 6, 1.7, 2.4).material = MAT.champagne;            // barra superior
  add(g, bx(0.55, 0.42, 0.66), 5.75, 0.78, 2.4).material = lamb(0x7a4a2a);     // maletas
  add(g, bx(0.5, 0.34, 0.6), 6.35, 0.73, 2.4).material = lamb(0x3f5d80);
  for (const [dx, dz] of [[-0.55, 0.25], [0.55, 0.25]]) addSolid(f, 6 + dx - 0.06, 6 + dx + 0.06, 2.4 + dz - 0.06, 2.4 + dz + 0.06);

  // detalles de recepción: silla, campanita, monitor, plantita
  add(g, bx(0.5, 0.5, 0.5), 9, 0.25, 2.5).material = lamb(0x2c2f33);           // silla (asiento)
  add(g, bx(0.5, 0.6, 0.12), 9, 0.8, 2.74).material = lamb(0x2c2f33);
  add(g, bx(0.55, 0.06, 0.34), 8.2, 1.16, 1.5).material = MAT.black;           // monitor
  add(g, bx(0.5, 0.3, 0.04), 8.2, 1.36, 1.46).material = lamb(0x223047);
  add(g, cyl(0.07, 0.09, 0.08, MAT.champagne, 10), 10.2, 1.18, 1.5);           // campanita
  add(g, new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), MAT.champagne), 10.2, 1.24, 1.5);
  // reloj grande en la pared tras recepción (disco plano mirando al lobby)
  add(g, cyl(0.46, 0.46, 0.03, MAT.woodDark, 24), 9, 2.05, 3.17).rotation.x = Math.PI / 2;
  add(g, cyl(0.4, 0.4, 0.04, MAT.white, 24), 9, 2.05, 3.14).rotation.x = Math.PI / 2;
  add(g, bx(0.04, 0.28, 0.01), 9, 2.12, 3.12).material = MAT.black;            // manecillas
  add(g, bx(0.2, 0.04, 0.01), 8.93, 2.05, 3.12).material = MAT.black;

  // banco para esperar junto a la entrada
  add(g, bx(2.2, 0.12, 0.6), 6, 0.45, -5.6).material = MAT.wood;
  for (const bx2 of [5.1, 6.9]) add(g, cyl(0.05, 0.05, 0.45, MAT.woodDark, 6), bx2, 0.22, -5.6);
  addSolid(f, 4.9, 7.1, -5.9, -5.3);

  // plantas altas extra para llenar huecos
  for (const [x, z] of [[2.2, 2.6], [-6.5, -3], [12, -3]]) {
    add(g, cyl(0.26, 0.32, 0.55, lamb(0xb5651d)), x, 0.27, z);
    add(g, new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), MAT.green), x, 1.05, z);
    add(g, new THREE.Mesh(new THREE.SphereGeometry(0.38, 8, 6), MAT.green), x + 0.2, 1.4, z);
    addSolid(f, x - 0.35, x + 0.35, z - 0.35, z + 0.35);
  }
  // cuadros del mar en las paredes laterales
  for (const z of [-2, 2]) {
    add(g, bx(0.05, 0.7, 1.0), BX0 + 0.18, 1.8, z).material = MAT.woodDark;
    add(g, new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.56), (VIEW.sea ||= viewMat(true))), BX0 + 0.22, 1.8, z, Math.PI / 2);
  }

  buildElevator(g, f);
  add(g, textPlane(S.signLobby, 1.6, 0.3, { bg: '#1773b0', fg: '#fff', size: 64 }), BX1 - 0.18, 2.5, 0, -Math.PI / 2);
}

// ----------------------------------------------------------------------------
// Lavandería (sótano) — recreada según las fotos reales del hotel
// ----------------------------------------------------------------------------
function buildLaundry() {
  const f = -1;
  const g = new THREE.Group();
  g.position.y = -FH;
  scene.add(g);
  const X0 = 2, X1 = BX1, Z = 6.2;
  BOUNDS[f] = { x0: X0 + 0.35, x1: X1 - 0.35, z0: -Z + 0.35, z1: Z - 0.35 };

  add(g, bx(X1 - X0 + 1, 0.14, Z * 2 + 1), (X0 + X1) / 2, -0.07, 0).material = lamb(0xcfc3a8); // suelo beige
  add(g, bx(X1 - X0 + 1, 0.14, Z * 2 + 1), (X0 + X1) / 2, FH + 0.07, 0).material = MAT.ceil;
  // paredes de azulejo blanco
  wallSeg(g, f, X0 - 0.15, X0, -Z, Z, FH, 0, MAT.tileWall);
  wallSeg(g, f, X1 - 0.15, X1, -Z, Z, FH, 0, MAT.tileWall);
  wallSeg(g, f, X0, X1, Z - 0.15, Z, FH, 0, MAT.tileWall);
  wallSeg(g, f, X0, X1, -Z, -Z + 0.15, FH, 0, MAT.tileWall);
  // franja de azulejo
  add(g, bx(X1 - X0, 1.4, 0.04), (X0 + X1) / 2, 0.7, Z - 0.17).material = lamb(0xdde8ea);
  add(g, textPlane(S.signLaundry, 2.6, 0.5, { bg: '#1773b0', fg: '#fff', size: 70 }), (X0 + X1) / 2 - 2, 2.6, Z - 0.18, Math.PI);

  // --- 5 lavadoras industriales (color champán, ojo de buey) en la pared norte ---
  for (let i = 0; i < 5; i++) {
    const big = i === 4; // una de ellas es la industrial grande de las fotos
    const x = 3.6 + i * 1.75 + (big ? 0.45 : 0);
    const s = big ? 1.45 : 1.15;
    const m = new THREE.Group();
    add(m, bx(s, s + 0.25, 1.0), 0, (s + 0.25) / 2, 0).material = big ? MAT.steel : MAT.champagne;
    add(m, cyl(s * 0.33, s * 0.33, 0.06, MAT.black), 0, s * 0.62, 0.52, 0).rotation.x = Math.PI / 2;
    const drum = cyl(s * 0.24, s * 0.24, 0.05, lamb(0x57646e));
    drum.rotation.x = Math.PI / 2;
    drum.position.set(0, s * 0.62, 0.55);
    m.add(drum);
    DRUMS.push(drum);
    add(m, bx(s * 0.7, 0.18, 0.05), 0, s + 0.05, 0.5).material = MAT.black; // panel
    m.position.set(x, 0, Z - 0.72);
    m.rotation.y = Math.PI;
    g.add(m);
    addSolid(f, x - s / 2 - 0.05, x + s / 2 + 0.05, Z - 1.3, Z);
  }
  add(g, textPlane(S.signWashers, 1.8, 0.26, { bg: '#9aa7ad', fg: '#fff', size: 60 }), 7.5, 2.15, Z - 0.18, Math.PI);

  // --- 2 secadoras negras (como en las fotos, marca AGA) en la pared oeste ---
  for (let i = 0; i < 2; i++) {
    const z = 2.6 - i * 2.2;
    const m = new THREE.Group();
    add(m, bx(1.2, 1.9, 1.0), 0, 0.95, 0).material = MAT.black;
    add(m, cyl(0.4, 0.4, 0.06, MAT.steel), 0, 0.85, 0.52, 0).rotation.x = Math.PI / 2;
    const drum = cyl(0.31, 0.31, 0.05, MAT.towel); // ropa blanca dentro
    drum.rotation.x = Math.PI / 2;
    drum.position.set(0, 0.85, 0.55);
    m.add(drum);
    DRUMS.push(drum);
    add(m, bx(0.85, 0.5, 0.04), 0, 1.6, 0.51).material = lamb(0x3d4348); // panel de mandos
    m.position.set(X0 + 0.72, 0, z);
    m.rotation.y = Math.PI / 2;
    g.add(m);
    addSolid(f, X0, X0 + 1.35, z - 0.65, z + 0.65);
  }
  add(g, textPlane(S.signDryers, 1.3, 0.24, { bg: '#2c2f33', fg: '#fff', size: 60 }), X0 + 0.2, 2.3, 1.5, Math.PI / 2);

  // --- gran mesa central de plancha y doblado cubierta de sábanas blancas ---
  add(g, bx(4.6, 0.1, 2.0), 9.2, 0.86, -0.6).material = MAT.towel;
  add(g, bx(4.4, 0.78, 1.8), 9.2, 0.4, -0.6).material = lamb(0xe2ddd0);
  add(g, bx(0.8, 0.12, 0.5), 8.2, 0.97, -0.6).material = MAT.towel;       // pila doblada
  add(g, bx(0.35, 0.16, 0.16), 10.2, 1.0, -0.4).material = MAT.black;     // plancha
  add(g, cyl(0.14, 0.1, 0.2, lamb(0x9be24a)), 10.7, 1.0, -0.9);           // jarra verde
  addSolid(f, 6.8, 11.6, -1.7, 0.5);

  // sillas de madera
  for (const [x, z] of [[7.4, 1.4], [11, 1.4]]) {
    add(g, bx(0.45, 0.06, 0.45), x, 0.45, z).material = MAT.wood;
    add(g, bx(0.45, 0.55, 0.06), x, 0.75, z + 0.2).material = MAT.wood;
    for (const [dx, dz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]])
      add(g, bx(0.05, 0.45, 0.05), x + dx, 0.22, z + dz).material = MAT.wood;
  }

  // --- estanterías sur: lencería limpia + detergentes + cajas de cartón ---
  add(g, bx(5.4, 0.05, 0.6), 10.4, 0.7, -Z + 0.45).material = MAT.steel;
  add(g, bx(5.4, 0.05, 0.6), 10.4, 1.35, -Z + 0.45).material = MAT.steel;
  add(g, bx(5.4, 0.05, 0.6), 10.4, 2.0, -Z + 0.45).material = MAT.steel;
  for (let i = 0; i < 7; i++) {
    add(g, bx(0.6, 0.4, 0.5), 8 + i * 0.78, 0.95, -Z + 0.45).material = i % 2 ? MAT.towel : lamb(0xefe7d4);
    add(g, bx(0.6, 0.4, 0.5), 8 + i * 0.78, 1.6, -Z + 0.45).material = i % 2 ? lamb(0xdfe8f2) : MAT.towel;
  }
  // botes de detergente de colores
  const cols = [0xe84a7c, 0x4a9be2, 0xf2c14a, 0x9be24a, 0xe87c4a, 0xc44ae2];
  for (let i = 0; i < 6; i++) add(g, cyl(0.09, 0.09, 0.36, lamb(cols[i])), 8.2 + i * 0.5, 2.22, -Z + 0.45);
  addSolid(f, 7.6, 13.2, -Z, -Z + 0.8);
  // cajas de cartón apiladas en la esquina
  add(g, bx(0.8, 0.55, 0.8), 13.9, 0.28, -Z + 0.6).material = lamb(0xc8a878);
  add(g, bx(0.7, 0.5, 0.7), 13.9, 0.8, -Z + 0.6).material = lamb(0xbb9a66);
  addSolid(f, 13.4, 14.4, -Z, -Z + 1.1);

  // saco grande de ropa sucia
  add(g, cyl(0.55, 0.45, 1.0, lamb(0xcc8c8c)), 4.2, 0.5, -Z + 0.85);
  add(g, textPlane(S.signDirty, 1.0, 0.22, { bg: '#a85454', fg: '#fff', size: 60 }), 4.2, 1.5, -Z + 0.5, 0);
  addSolid(f, 3.6, 4.8, -Z, -Z + 1.4);

  // tendedero con sábanas
  add(g, bx(0.05, 1.7, 2.4), 5.6, 0.85, 4.6).material = MAT.steel;
  add(g, bx(0.04, 1.1, 2.2), 5.62, 0.95, 4.6).material = MAT.towel;
  addSolid(f, 5.3, 5.9, 3.3, 5.9);

  buildElevator(g, f);
  add(g, textPlane(S.signBasement, 1.6, 0.3, { bg: '#1773b0', fg: '#fff', size: 60 }), X1 - 0.18, 2.5, 0, -Math.PI / 2);

  // puntos de interacción
  HOTSPOTS.push({
    floor: f, x: 4.2, z: -Z + 1.7, r: 1.6, type: 'hold', dur: 2.0,
    label: S.deliverDirty,
    avail: () => G.dirty > 0 ? true : S.noDirty,
    action: () => {
      const pts = Math.min(60, G.dirty * 2);
      G.score += pts;
      toast(S.carmelaThanks(G.dirty, pts));
      G.dirty = 0; G.trips++;
      beep(520, 0.12); updateHUD();
    },
  });
  HOTSPOTS.push({
    floor: f, x: 10.4, z: -Z + 1.6, r: 1.8, type: 'hold', dur: 2.4,
    label: S.refillCart,
    avail: () => Object.keys(CART_MAX).some(k => G.inv[k] < CART_MAX[k]) ? true : S.cartFull,
    action: () => {
      G.inv = { ...CART_MAX };
      toast(S.cartRefilled);
      beep(660, 0.12); updateHUD();
    },
  });

  // iconos flotantes de las dos estaciones de la lavandería
  for (const [hs, emoji] of [[HOTSPOTS[HOTSPOTS.length - 2], '🧺'], [HOTSPOTS[HOTSPOTS.length - 1], '🧖']]) {
    const mk = emojiSprite(emoji, 0.55);
    mk.position.set(hs.x, 1.9, hs.z);
    mk.visible = false;
    g.add(mk);
    hs.marker = mk; hs.markerY = 1.9;
  }

  // Carmela, la encargada de lavandería (camiseta blanca, como en las fotos)
  spawnMaid(g, 'Carmela', S.carmelaLabel, 0, 6.5, 11.5, 2.6, f, 0xb8b3ad);
}

// ----------------------------------------------------------------------------
// Exterior: Praia a Mare — paseo, playa, mar e Isola di Dino
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// ZONAS desbloqueables (terraza, restaurante, piscina, jardín) — cubiertas
// abiertas con vista al mar, accesibles por el ascensor cuando el día las abre.
// ----------------------------------------------------------------------------
function buildZone(z) {
  const f = z.f;
  zoneByFloor[f] = z;
  z.done = [false, false, false];
  const g = new THREE.Group(); g.position.y = f * FH; scene.add(g);
  const X0 = -8, X1 = BX1, Z = 6.5, CX = (X0 + X1) / 2;
  BOUNDS[f] = { x0: X0 + 0.5, x1: X1 - 0.6, z0: -Z + 0.5, z1: Z - 0.5 };

  // suelo + zócalo
  add(g, bx(X1 - X0 + 1, 0.2, Z * 2 + 1), CX, -0.1, 0).material = lamb(z.floorCol);
  // VISTA ABIERTA A LA PLAYA: mar hasta el horizonte + arena + Isola di Dino + palmeras
  const seaG = add(g, new THREE.Mesh(new THREE.PlaneGeometry(260, 220), MAT.sea), CX, -0.7, 0); seaG.rotation.x = -Math.PI / 2;
  const beach = add(g, new THREE.Mesh(new THREE.PlaneGeometry(260, 12), MAT.sand), CX, -0.62, Z + 7.5); beach.rotation.x = -Math.PI / 2;
  const isla = new THREE.Group();                                   // Isola di Dino a lo lejos
  add(isla, cyl(9, 11, 5, MAT.cliff, 10), 0, 2.0, 0);
  const itop = add(isla, new THREE.Mesh(new THREE.SphereGeometry(11, 10, 6), MAT.green), 0, 4.5, 0); itop.scale.y = 0.3;
  isla.position.set(CX - 16, 0, Z + 62); g.add(isla);
  for (const [px, pz] of [[X0 + 1.3, Z - 1.4], [X1 - 3.2, Z - 1.4]]) {  // palmeras en el borde al mar
    add(g, cyl(0.08, 0.12, 2.2, lamb(0x8a6240), 7), px, 1.1, pz);
    for (let k = 0; k < 6; k++) {
      const lf = add(g, bx(1.4, 0.04, 0.28, MAT.green), px + Math.cos(k * 1.05) * 0.6, 2.3, pz + Math.sin(k * 1.05) * 0.6);
      lf.rotation.y = k * 1.05; lf.rotation.z = 0.35;
    }
  }
  // baranda blanca perimetral (N, S, O); el lado E es el ascensor/pared
  const rail = (x0, x1, zc) => {
    add(g, bx(x1 - x0, 0.1, 0.08), (x0 + x1) / 2, 1.05, zc).material = MAT.white;
    for (let x = x0 + 0.3; x <= x1; x += 1.3) add(g, cyl(0.03, 0.03, 1.05, MAT.steel, 6), x, 0.52, zc);
    addSolid(f, x0, x1, zc - 0.12, zc + 0.12);
  };
  rail(X0, X1 - 1.6, Z - 0.2);
  rail(X0, X1 - 1.6, -Z + 0.2);
  add(g, bx(0.08, 0.1, Z * 2 - 0.4), X0 + 0.1, 1.05, 0).material = MAT.white;        // baranda oeste
  for (let zz = -Z + 0.6; zz <= Z - 0.6; zz += 1.3) add(g, cyl(0.03, 0.03, 1.05, MAT.steel, 6), X0 + 0.1, 0.52, zz);
  addSolid(f, X0 - 0.05, X0 + 0.15, -Z, Z);
  add(g, bx(0.12, 2.7, Z * 2), X1 - 0.06, 1.35, 0).material = MAT.wall;               // pared este (ascensor)

  buildZoneProps(z, g, Z, CX);
  buildElevator(g, f);
  add(g, textPlane(S.zones[z.id].name, 3, 0.6, { bg: '#1773b0', fg: '#fff', size: 70 }), X1 - 0.2, 2.55, 0, -Math.PI / 2);

  // 3 tareas (mantener pulsado) repartidas por la cubierta
  z.spots = [[-4.5, -3], [4, 3], [10, -3.2]];
  S.zones[z.id].tasks.forEach((label, i) => {
    const [x, zc] = z.spots[i];
    const h = {
      floor: f, x, z: zc, r: 1.6, type: 'hold', dur: 2.6,
      label: `${z.icons[i]} ${label}`,
      avail: () => (z.done[i] ? S.zoneDoneMsg : true),
      action: () => zoneTaskDone(z, i, x, f * FH + 0.6, zc),
    };
    const mk = emojiSprite(z.icons[i], 0.42);
    mk.position.set(x, 1.4, zc); mk.visible = false; g.add(mk);
    h.marker = mk; h.markerY = 1.4;
    HOTSPOTS.push(h);
  });
}

function buildZoneProps(z, g, Z, CX) {
  const sun = lamb(0xf2e3b8), tableM = MAT.white;
  if (z.id === 'terrace') {
    for (const x of [-5, 1, 7]) {                                   // tumbonas
      add(g, bx(0.7, 0.16, 1.7, sun), x, 0.22, Z - 1.6);
      add(g, bx(0.7, 0.5, 0.12, sun), x, 0.42, Z - 2.3).rotation.x = -0.5;
    }
    for (const x of [-3, 6]) {                                      // mesas + sombrilla
      add(g, cyl(0.5, 0.5, 0.06, tableM, 12), x, 0.74, -2.5);
      add(g, cyl(0.05, 0.06, 0.72, MAT.steel, 6), x, 0.37, -2.5);
      add(g, new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.5, 12), MAT.terra), x, 2.0, -2.5);
      add(g, cyl(0.04, 0.04, 1.5, MAT.steel, 6), x, 1.1, -2.5);
    }
  } else if (z.id === 'restaurant') {
    for (const x of [-4, 1, 6, 11]) for (const zc of [-2.5, 2.5]) {  // mesas con mantel + sillas
      add(g, cyl(0.5, 0.5, 0.06, tableM, 12), x, 0.74, zc);
      add(g, cyl(0.07, 0.09, 0.72, MAT.woodDark), x, 0.37, zc);
      for (const dx of [-0.7, 0.7]) { add(g, bx(0.4, 0.4, 0.4, MAT.wood), x + dx, 0.2, zc); add(g, bx(0.4, 0.5, 0.1, MAT.wood), x + dx, 0.6, zc + (dx > 0 ? 0.18 : -0.18)); }
    }
  } else if (z.id === 'pool') {
    add(g, bx(11, 0.3, 5, lamb(0x1f86c8)), CX - 1, 0.06, 0);         // agua de la piscina
    add(g, bx(11.4, 0.34, 5.4, MAT.white), CX - 1, 0.02, 0);        // borde
    add(g, bx(11, 0.26, 5, new THREE.MeshBasicMaterial({ color: 0x36a6d8, transparent: true, opacity: 0.85 })), CX - 1, 0.1, 0);
    for (const x of [-5, 8]) { add(g, bx(0.7, 0.16, 1.7, sun), x, 0.22, -Z + 1.7); add(g, bx(0.7, 0.5, 0.12, sun), x, 0.42, -Z + 1.0).rotation.x = 0.5; }
  } else { // garden
    for (const [x, zc] of [[-5, 3], [0, -3.5], [8, 3.5], [11, -3]]) { // jardineras con arbustos
      add(g, cyl(0.4, 0.46, 0.5, lamb(0xb5651d)), x, 0.25, zc);
      add(g, new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), MAT.green), x, 0.95, zc);
      addSolid(z.f, x - 0.45, x + 0.45, zc - 0.45, zc + 0.45);
    }
    add(g, bx(2.4, 0.12, 0.6, MAT.wood), 3, 0.45, 1.5);             // banco
    for (const bx2 of [2, 4]) add(g, cyl(0.05, 0.05, 0.45, MAT.woodDark, 6), bx2, 0.22, 1.5);
    const path = add(g, new THREE.Mesh(new THREE.PlaneGeometry(3, 9), MAT.paving), CX, 0.02, 0); path.rotation.x = -Math.PI / 2;
  }
}

function zoneTaskDone(z, i, x, y, zc) {
  if (z.done[i]) return;
  z.done[i] = true;
  registerProgress(); addScore(20);
  burst(x, y, zc, { chars: ['✨', '✨', '💫'], n: 9 });
  dingOK();
  if (z.done.every(Boolean)) {
    addScore(60); flash('rgba(255,255,255,0.35)', 320);
    rain({ chars: ['✨', '🎉', '⭐'], n: 26, life: 2.2 });
    toast(S.zoneClean(S.zones[z.id].name, 60), 3500);
  }
  updateHUD(); refreshChecklist();
}

function buildExterior() {
  const gr = (w, d, m, x, y, z) => {
    const p = add(scene, new THREE.Mesh(new THREE.PlaneGeometry(w, d), m), x, y, z);
    p.rotation.x = -Math.PI / 2;
    return p;
  };
  gr(700, 700, MAT.grass, 0, -0.04, 0);
  gr(700, 14, MAT.paving, 0, 0.0, BZ + 7.5);     // paseo marítimo
  gr(700, 16, MAT.sand, 0, 0.005, BZ + 22);      // playa
  gr(700, 300, MAT.sea, 0, 0.01, BZ + 180);      // mar Tirreno
  gr(60, 9, texLamb('paving.jpg', 0xd8d2c4, 10, 1.5), 0, 0.0, -BZ - 5); // piazzetta sur
  gr(700, 8, MAT.road, 0, 0.005, -BZ - 13);      // Via Roma

  // tejado y rótulo (elevado para que NO se solape con el techo del último piso → sin z-fighting)
  add(scene, bx(BX1 - BX0 + 0.8, 0.3, BZ * 2 + 0.8), (BX0 + BX1) / 2, 5 * FH + 0.42, 0).material = MAT.terra;
  const sign1 = textPlane('HOTEL DINO BLU ★★★', 10, 1.1, { bg: '#c96f4a', fg: '#fff', size: 90 });
  add(scene, sign1, 2, 5 * FH + 0.9, BZ + 0.5, 0);
  const sign2 = sign1.clone();
  add(scene, sign2, 2, 5 * FH + 0.9, -BZ - 0.5, Math.PI);

  // Isola di Dino: el islote de cima plana frente a Praia a Mare
  const isla = new THREE.Group();
  add(isla, cyl(20, 24, 9, MAT.cliff, 10), 0, 4.5, 0);
  const top = add(isla, new THREE.Mesh(new THREE.SphereGeometry(21, 12, 8), MAT.green), 0, 8, 0);
  top.scale.y = 0.28;
  isla.position.set(-34, 0, 170);
  scene.add(isla);

  // palmeras
  const palm = (x, z) => {
    const p = new THREE.Group();
    add(p, cyl(0.09, 0.14, 2.6, lamb(0x8a6240), 7), 0, 1.3, 0);
    for (let k = 0; k < 6; k++) {
      const leaf = add(p, bx(1.6, 0.04, 0.3, MAT.green), Math.cos(k * 1.05) * 0.7, 2.7, Math.sin(k * 1.05) * 0.7);
      leaf.material = MAT.green;
      leaf.rotation.y = k * 1.05;
      leaf.rotation.z = 0.35;
    }
    p.position.set(x, 0, z);
    scene.add(p);
  };
  for (const [x, z] of [[-16, BZ + 4], [-6, BZ + 4], [6, BZ + 4], [18, BZ + 4], [-16, -BZ - 3], [20, -BZ - 3], [-22, -BZ - 9]]) palm(x, z);

  // sombrillas y hamacas del Dino Blu Beach Club
  for (let x = -24; x <= 24; x += 7) for (let zr = 0; zr < 2; zr++) {
    const z = BZ + 18 + zr * 6;
    add(scene, cyl(0.04, 0.04, 2.0, MAT.steel, 6), x, 1.0, z);
    add(scene, new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.6, 10), (x / 7 + zr) % 2 ? MAT.terra : MAT.white), x, 2.1, z);
    add(scene, bx(0.7, 0.18, 1.7), x + 1.1, 0.12, z).material = MAT.white;
    add(scene, bx(0.7, 0.18, 1.7), x - 1.1, 0.12, z).material = MAT.white;
  }

  // mesitas de la piazzetta sur con sombrillas
  for (const x of [-6, 0, 8]) {
    add(scene, cyl(0.5, 0.5, 0.06, MAT.white, 10), x, 0.74, -BZ - 4.5);
    add(scene, cyl(0.05, 0.07, 0.72, MAT.steel, 6), x, 0.37, -BZ - 4.5);
    add(scene, new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.5, 10), MAT.terra), x, 2.0, -BZ - 4.5);
    add(scene, cyl(0.04, 0.04, 1.6, MAT.steel, 6), x, 1.0, -BZ - 4.5);
  }

  // paso de cebra y coches aparcados en Via Roma (como en las fotos)
  for (let i = 0; i < 6; i++) {
    const stripe = add(scene, new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.5), MAT.white), 1 + i * 0, 0.01, 0);
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(1, 0.012, -BZ - 9.6 - i * 1.1);
  }
  for (const [x, c] of [[-14, 0xd8d8d8], [-9, 0x4a5a6a], [10, 0xb04040], [15, 0xe8e8e8], [20, 0x3a3a3a]]) {
    add(scene, bx(1.7, 0.55, 3.4), x, 0.35, -BZ - 11).material = lamb(c);
    add(scene, bx(1.5, 0.42, 1.8), x, 0.82, -BZ - 11).material = lamb(0xbcd4e0);
  }

  // buganvilla magenta, sillas de mimbre y farolas de la piazzetta
  for (const [x, z, s] of [[-9.5, -BZ - 2.2, 1.0], [12, -BZ - 2.4, 1.3], [4.5, -BZ - 7.8, 0.8]]) {
    const b = new THREE.Group();
    add(b, cyl(0.06, 0.09, 1.6, MAT.woodDark, 6), 0, 0.8, 0);
    for (let k = 0; k < 4; k++)
      add(b, new THREE.Mesh(new THREE.SphereGeometry(rand(0.4, 0.65), 7, 6), lamb(0xd1359a)),
        rand(-0.6, 0.6), rand(1.4, 2.2), rand(-0.4, 0.4));
    b.scale.setScalar(s);
    b.position.set(x, 0, z);
    scene.add(b);
  }
  for (const x of [-10, 4, 14]) {
    add(scene, cyl(0.05, 0.07, 3.2, MAT.black, 6), x, 1.6, -BZ - 7);
    add(scene, new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xfff2c8 })), x, 3.3, -BZ - 7);
  }
  for (const [x, z] of [[-6.8, -BZ - 4.3], [-5.2, -BZ - 4.7], [7.2, -BZ - 4.3], [8.8, -BZ - 4.6]]) {
    add(scene, bx(0.5, 0.45, 0.5), x, 0.22, z).material = lamb(0xb89a6a); // sillas de mimbre
    add(scene, bx(0.5, 0.5, 0.08), x, 0.7, z + 0.21).material = lamb(0xb89a6a);
  }

  // solárium de la azotea: tarima, pérgola, sillas rojas y tumbonas blancas
  const ry = 5 * FH + 0.32;
  const deck = add(scene, new THREE.Mesh(new THREE.PlaneGeometry(20, 10), lamb(0xb98a5a)), -2, ry, 0);
  deck.rotation.x = -Math.PI / 2;
  for (let k = 0; k < 4; k++) {
    const lounger = add(scene, bx(0.75, 0.3, 1.9), -8 + k * 2.2, ry + 0.15, 2.6);
    lounger.material = MAT.white;
  }
  for (const [x, z] of [[2, -1.5], [5, -1.5], [2, 1.5], [5, 1.5]]) {
    add(scene, cyl(0.45, 0.45, 0.05, lamb(0x8a3a3a), 10), x, ry + 0.72, z);
    add(scene, bx(0.42, 0.75, 0.06), x + 0.7, ry + 0.45, z).material = lamb(0xb04040);
    add(scene, bx(0.42, 0.75, 0.06), x - 0.7, ry + 0.45, z).material = lamb(0xb04040);
  }
  for (let x = -11; x <= 7; x += 1.5)
    add(scene, new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.85), MAT.glass), x, ry + 0.45, 4.9);
  for (const [x, z] of [[-10, -4], [6, -4], [-10, 4], [6, 4]])
    add(scene, bx(0.12, 2.4, 0.12), x, ry + 1.2, z).material = MAT.white;
  add(scene, bx(16.5, 0.08, 8.3), -2, ry + 2.45, 0).material = MAT.white; // pérgola

  // casitas de Praia a Mare al otro lado de Via Roma
  for (let i = 0; i < 9; i++) {
    const w = rand(4, 7), h = rand(3.5, 7.5), x = -34 + i * 9 + rand(-1, 1);
    const c = pick([0xf2e3c8, 0xe8c9a8, 0xf6efe2, 0xe2b49a, 0xf4d8b8]);
    add(scene, bx(w, h, 5), x, h / 2, -BZ - 22).material = lamb(c);
    add(scene, bx(w + 0.4, 0.25, 5.4), x, h + 0.13, -BZ - 22).material = MAT.terra;
  }

  // montañas de Calabria al sur
  for (let i = 0; i < 5; i++) {
    const m = add(scene, new THREE.Mesh(new THREE.ConeGeometry(rand(28, 45), rand(22, 38), 7), lamb(0x6c8a5e)), -90 + i * 55, 0, -110);
    m.position.y = 8;
  }
  // y la costa montañosa al otro lado de la bahía (se ve desde los balcones)
  for (let i = 0; i < 6; i++) {
    const m = add(scene, new THREE.Mesh(new THREE.ConeGeometry(rand(30, 55), rand(18, 32), 7), lamb(0x7a93a8)),
      -120 - i * 28, 6, 90 + i * 35);
    m.rotation.y = rand(0, 3);
  }
}

// ----------------------------------------------------------------------------
// Personajes (compañeras y gobernanta)
// ----------------------------------------------------------------------------
// rostro de dibujo compartido (ojos, sonrisa, mejillas) sobre la cara
let FACE_MAT = null;
function faceMat() {
  if (FACE_MAT) return FACE_MAT;
  const tex = canvasTex(128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#2a2018'; // ojos
    for (const ex of [w * 0.37, w * 0.63]) { ctx.beginPath(); ctx.ellipse(ex, h * 0.45, 7, 11, 0, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#fff';    // brillo
    for (const ex of [w * 0.37, w * 0.63]) { ctx.beginPath(); ctx.arc(ex + 2.5, h * 0.41, 3, 0, 7); ctx.fill(); }
    ctx.fillStyle = 'rgba(240,128,118,0.5)'; // mejillas
    for (const ex of [w * 0.25, w * 0.75]) { ctx.beginPath(); ctx.ellipse(ex, h * 0.58, 10, 6, 0, 0, 7); ctx.fill(); }
    ctx.strokeStyle = '#7a4030'; ctx.lineWidth = 4; ctx.lineCap = 'round'; // sonrisa
    ctx.beginPath(); ctx.arc(w * 0.5, h * 0.54, 15, 0.12 * Math.PI, 0.88 * Math.PI); ctx.stroke();
  });
  FACE_MAT = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  return FACE_MAT;
}

function makePerson({ shirt = 0xffffff, skirt = null, pants = 0x3a4a58, skin = 0xd2a074,
                      hair = 0x3d2817, trim = null, apron = null, cap = false }) {
  const p = new THREE.Group();
  const limbs = { legs: [], arms: [] };
  const dress = !!skirt;
  const sph = (r, c, seg = 14) => new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), lamb(c));
  const box = (w, h, d, c) => bx(w, h, d, lamb(c));

  // piernas (con vestido se ven las pantorrillas + zapato)
  const legLen = dress ? 0.34 : 0.5;
  for (const s of [-1, 1]) {
    const leg = box(0.1, legLen, 0.11, dress ? 0xefe1d2 : pants);
    leg.position.set(s * 0.085, dress ? 0.4 : 0.55, 0);
    leg.geometry.translate(0, -legLen / 2, 0);
    add(leg, box(0.13, 0.08, 0.19, 0x4a3a30), 0, -legLen + 0.02, 0.035);   // zapato
    p.add(leg); limbs.legs.push(leg);
  }

  // falda acampanada DESDE una cintura estrecha (silueta, no barril) / o caderas
  if (dress) {
    add(p, new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.34, 0.5, 18), lamb(skirt)), 0, 0.6, 0).scale.z = 0.9;
    if (trim) add(p, new THREE.Mesh(new THREE.CylinderGeometry(0.345, 0.345, 0.05, 18), lamb(trim)), 0, 0.37, 0).scale.z = 0.9; // bajo
  } else {
    add(p, box(0.28, 0.22, 0.19, pants), 0, 0.66, 0);
  }
  const waistY = dress ? 0.86 : 0.9;

  // torso esbelto + hombros (cintura marcada)
  add(p, box(0.29, 0.44, 0.18, shirt), 0, waistY + 0.18, 0);
  add(p, box(0.36, 0.11, 0.19, shirt), 0, waistY + 0.36, 0);
  if (trim) {
    add(p, box(0.3, 0.05, 0.2, trim), 0, waistY + 0.38, 0);            // cuello
    add(p, box(0.035, 0.4, 0.19, trim), 0, waistY + 0.16, 0.092);      // botonadura
  }
  if (apron) add(p, box(0.26, 0.5, 0.04, apron), 0, waistY + 0.02, dress ? 0.17 : 0.105); // delantal (peto+falda)

  // brazos afilados con manga, puño y mano
  for (const s of [-1, 1]) {
    const arm = box(0.085, 0.46, 0.1, shirt);
    arm.position.set(s * 0.21, waistY + 0.36, 0);
    arm.geometry.translate(0, -0.22, 0);
    arm.rotation.z = s * 0.07;
    if (trim) add(arm, box(0.1, 0.05, 0.12, trim), 0, -0.34, 0);       // puño
    add(arm, sph(0.06, skin, 8), 0, -0.45, 0);                         // mano
    p.add(arm); limbs.arms.push(arm);
  }

  // cuello + cabeza + rostro + pelo
  add(p, box(0.1, 0.08, 0.1, skin), 0, waistY + 0.42, 0);
  const hy = waistY + 0.62;
  add(p, sph(0.155, skin), 0, hy, 0);
  add(p, new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), faceMat()), 0, hy, 0.148);
  const hcap = add(p, sph(0.17, hair), 0, hy + 0.03, -0.015); hcap.scale.set(1, 0.95, 1);
  add(p, sph(0.11, hair, 12), 0, hy - 0.03, -0.13);                    // pelo trasero
  if (cap) {                                                            // camarera: trenzas + cofia
    for (const s of [-1, 1]) {
      add(p, box(0.045, 0.3, 0.045, hair), s * 0.165, hy - 0.13, 0.02);          // trenza
      add(p, sph(0.03, trim || 0xffffff, 8), s * 0.165, hy - 0.29, 0.02);        // lazo
    }
    if (trim) { const band = add(p, new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.02, 6, 16), lamb(trim)), 0, hy + 0.05, 0.02); band.rotation.x = 1.2; }
  }

  p.userData.limbs = limbs;
  return p;
}
// camarera low-poly: polo azul + delantal blanco + cofia (estilo del juego, no "AI")
function makeMaid(hair = 0x2a1c12) {
  return makePerson({ shirt: 0x9fc3e0, skirt: 0x7fb0d8, apron: 0xf2f6f7, skin: 0xd2a074, hair, trim: 0xffffff, cap: true });
}
// Marco low-poly (housekeeper del 4º): polo azul + pantalón + delantal, sin cofia
function makeMarco() {
  return makePerson({ shirt: 0x9fc3e0, pants: 0x3a4a58, apron: 0xeef2f4, skin: 0xc89a68, hair: 0x241a12, trim: 0xffffff });
}
function nameSprite(text) {
  const tex = canvasTex(384, 80, (ctx, w, h) => {
    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(10,30,48,0.9)'; ctx.lineWidth = 9;
    ctx.strokeText(text, w / 2, h / 2);
    ctx.fillStyle = '#fff'; ctx.fillText(text, w / 2, h / 2);
  });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sp.scale.set(1.7, 0.35, 1);
  sp.position.y = 2.0;
  return sp;
}
// --- iconos flotantes de guía (estilo arcade-idle: siempre se ve el siguiente paso) ---
function emojiSprite(char, scale = 0.45) {
  const tex = canvasTex(128, 128, (ctx, w, h) => {
    ctx.beginPath(); ctx.arc(w / 2, h / 2, 56, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.94)'; ctx.fill();
    ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(23,115,176,0.95)'; ctx.stroke();
    ctx.font = '64px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(char, w / 2, h / 2 + 4);
  });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sp.scale.set(scale, scale, 1);
  return sp;
}
function arrowSprite(scale = 0.85) {
  const tex = canvasTex(128, 128, (ctx, w, h) => {
    ctx.font = 'bold 100px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(10,30,48,0.95)'; ctx.lineWidth = 12;
    ctx.strokeText('▼', w / 2, h / 2 + 6);
    ctx.fillStyle = '#ffe066';
    ctx.fillText('▼', w / 2, h / 2 + 6);
  });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sp.renderOrder = 999; // visible a través de tabiques, como en los arcade-idle
  sp.scale.set(scale, scale, 1);
  return sp;
}
// flecha sobre la puerta de la siguiente habitación
const doorMark = arrowSprite();
doorMark.visible = false;
scene.add(doorMark);

// ----------------------------------------------------------------------------
// Efectos "oddly satisfying": partículas, limpieza progresiva, confeti, flash.
// Cada efecto es una función(dt)→bool; el loop la llama hasta que devuelve false.
// ----------------------------------------------------------------------------
const FX = [];
function updateFX(dt) {
  for (let i = FX.length - 1; i >= 0; i--) if (!FX[i](dt)) FX.splice(i, 1);
}
// sprite de partícula: solo el emoji. La textura se cachea por carácter (una sola
// vez), el material es propio de cada sprite para poder desvanecerlo por separado.
const PART_TEX = {};
function partTex(char) {
  return PART_TEX[char] ||= canvasTex(64, 64, (ctx, w, h) => {
    ctx.font = '50px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(char, w / 2, h / 2 + 2);
  });
}
function partSprite(char, scale) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: partTex(char), transparent: true }));
  sp.scale.set(scale, scale, 1);
  return sp;
}
// estallido de partículas que suben y se desvanecen (✨ por defecto)
function burst(x, y, z, opt = {}) {
  const { n = 9, chars = ['✨'], spread = 0.5, rise = 1.1, life = 0.8, scale = 0.22, grav = -1.8 } = opt;
  const parts = [];
  for (let i = 0; i < n; i++) {
    const sp = partSprite(chars[(Math.random() * chars.length) | 0], scale * (0.7 + Math.random() * 0.7));
    sp.position.set(x + (Math.random() - 0.5) * spread, y + Math.random() * 0.25, z + (Math.random() - 0.5) * spread);
    const a = Math.random() * Math.PI * 2, r = 0.4 + Math.random() * 0.7;
    sp.userData.v = new THREE.Vector3(Math.cos(a) * r * spread, rise * (0.6 + Math.random()), Math.sin(a) * r * spread);
    scene.add(sp); parts.push(sp);
  }
  let age = 0;
  FX.push(dt => {
    age += dt;
    for (const sp of parts) { sp.userData.v.y += grav * dt; sp.position.addScaledVector(sp.userData.v, dt); sp.material.opacity = Math.max(0, 1 - age / life); }
    if (age >= life) { for (const sp of parts) { scene.remove(sp); sp.material.dispose(); } return false; }
    return true;
  });
}
// "barrido": el objeto sucio se encoge hasta desaparecer (limpieza progresiva)
function wipeOut(mesh, dur = 0.5) {
  if (!mesh || !mesh.visible) return;
  const s0 = mesh.scale.clone(); let age = 0;
  FX.push(dt => {
    age += dt; const k = Math.min(1, age / dur), e = 1 - k * k;
    mesh.scale.set(s0.x * e, s0.y * e, s0.z * e);
    if (k >= 1) { mesh.visible = false; mesh.scale.copy(s0); return false; }
    return true;
  });
}
// "pop": el objeto recién limpio aparece con un pequeño rebote satisfactorio
function popIn(obj, from = 1.08, dur = 0.34) {
  obj.scale.setScalar(from); let age = 0;
  FX.push(dt => {
    age += dt; const k = Math.min(1, age / dur), s = from + (1 - from) * (k * (2 - k));
    obj.scale.setScalar(s);
    if (k >= 1) { obj.scale.setScalar(1); return false; }
    return true;
  });
}
// lluvia de confeti/monedas alrededor del jugador (celebración / VIP)
function rain(opt = {}) {
  const { n = 40, chars = ['🎉', '✨', '🎊'], life = 2.6, scale = 0.3, h = 4 } = opt;
  const parts = [];
  for (let i = 0; i < n; i++) {
    const sp = partSprite(chars[(Math.random() * chars.length) | 0], scale * (0.7 + Math.random() * 0.6));
    sp.position.set(G.px + (Math.random() - 0.5) * 6, G.floor * FH + 1.6 + Math.random() * h, G.pz + (Math.random() - 0.5) * 5 - 1);
    sp.userData.v = new THREE.Vector3((Math.random() - 0.5) * 0.6, -(0.8 + Math.random() * 1.2), (Math.random() - 0.5) * 0.6);
    sp.userData.born = Math.random() * 0.6;
    scene.add(sp); parts.push(sp);
  }
  let age = 0;
  FX.push(dt => {
    age += dt;
    for (const sp of parts) {
      if (age < sp.userData.born) continue;
      sp.position.addScaledVector(sp.userData.v, dt);
      sp.material.opacity = Math.max(0, 1 - (age - sp.userData.born) / (life - sp.userData.born));
    }
    if (age >= life) { for (const sp of parts) { scene.remove(sp); sp.material.dispose(); } return false; }
    return true;
  });
}
// destello suave en pantalla
function flash(color = 'rgba(255,255,255,0.55)', dur = 350) {
  const el = $('flash'); if (!el) return;
  el.style.background = color; el.style.transition = 'none'; el.style.opacity = '1';
  requestAnimationFrame(() => { el.style.transition = `opacity ${dur}ms ease-out`; el.style.opacity = '0'; });
}

// Personajes como FIGURAS (billboards) con los avatares generados (idénticos a
// los de la intro): plano vertical con la imagen recortada que mira a la cámara.
const AVTEX = new THREE.TextureLoader();
function billboard(imgKey, label, h = 1.8) {
  const mat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.4, side: THREE.DoubleSide });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(h * 0.55, h), mat);
  m.geometry.translate(0, h / 2, 0);      // provisional; se recalcula al cargar
  AVTEX.load(`assets/housekeper/${imgKey}-cut.png`, t => {
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    // escanear el alfa para recortar al contenido real (pies al suelo, sin flotar)
    const iw = t.image.width, ih = t.image.height;
    let top = ih, bot = 0, lft = iw, rgt = 0;
    try {
      const cv = document.createElement('canvas'); cv.width = iw; cv.height = ih;
      const cx = cv.getContext('2d'); cx.drawImage(t.image, 0, 0);
      const d = cx.getImageData(0, 0, iw, ih).data;
      for (let y = 0; y < ih; y++) for (let x = 0; x < iw; x++)
        if (d[(y * iw + x) * 4 + 3] > 25) { if (y < top) top = y; if (y > bot) bot = y; if (x < lft) lft = x; if (x > rgt) rgt = x; }
    } catch (e) { top = 0; bot = ih - 1; lft = 0; rgt = iw - 1; }
    const cw = Math.max(1, rgt - lft + 1), ch = Math.max(1, bot - top + 1);
    t.offset.set(lft / iw, 1 - (bot + 1) / ih);   // UV recortado al contenido
    t.repeat.set(cw / iw, ch / ih);
    mat.map = t; mat.needsUpdate = true;
    // re-dimensionar el plano al alto/ancho reales, con los pies en y=0
    m.geometry.dispose();
    const geo = new THREE.PlaneGeometry(h * cw / ch, h);
    geo.translate(0, h / 2, 0);
    m.geometry = geo;
  });
  if (label) { const sp = nameSprite(label); sp.position.y = h + 0.15; m.add(sp); }
  m.userData.billboard = true;
  return m;
}

function spawnMaid(g, name, label, apron, x0, x1, z, floor, hair) {
  const m = name === 'Marco' ? makeMarco() : makeMaid(hair);
  const nm = nameSprite(label); nm.position.y = 1.95; m.add(nm);
  m.position.set(rand(x0, x1), 0, z);
  g.add(m);
  // patrullan los pasillos; en la lavandería (P-1) se quedan trabajando de pie
  NPCS.push({ mesh: m, x0, x1, z, dir: pick([-1, 1]), speed: rand(0.55, 0.95), floor, name, walk: floor !== -1, phase: rand(0, 6) });
  return m;
}

let lucia = null, luciaState = { mode: 'patrol', t: 0 };
function spawnLucia(gFloor2) {
  lucia = billboard('lucia', S.luciaLabel);  // gobernanta (uniforme azul marino)
  lucia.position.set(11.7, 0, 0.7);          // junto al carro: te lo entrega al empezar
  gFloor2.add(lucia);
  NPCS.push({ mesh: lucia, x0: -11, x1: 11, z: 0.7, dir: 1, speed: 1.1, floor: PLAYER_FLOOR, name: 'Lucía', isBoss: true });
}

// ----------------------------------------------------------------------------
// Sonido (Web Audio)
// ----------------------------------------------------------------------------
let actx = null;
function beep(freq, dur = 0.1, type = 'sine', vol = 0.14) {
  try {
    actx ||= new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), ga = actx.createGain();
    o.type = type; o.frequency.value = freq;
    ga.gain.setValueAtTime(vol, actx.currentTime);
    ga.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
    o.connect(ga); ga.connect(actx.destination);
    o.start(); o.stop(actx.currentTime + dur);
  } catch (e) { /* sin audio */ }
}
const dingOK = () => { beep(740, 0.1); setTimeout(() => beep(988, 0.16), 90); };
const dingBad = () => beep(180, 0.3, 'sawtooth', 0.1);
const dingLift = () => { beep(660, 0.12); setTimeout(() => beep(880, 0.2), 140); };

// ----------------------------------------------------------------------------
// Música — TODO sintetizado con Web Audio ⇒ 100% libre de derechos (sin ficheros)
// ----------------------------------------------------------------------------
let musicGain = null, musicOn = (localStorage.getItem('hg-music') !== 'off');
let ambientTimer = null, ambientBar = 0;
const midi = m => 440 * Math.pow(2, (m - 69) / 12);
function ensureAudio() {
  actx ||= new (window.AudioContext || window.webkitAudioContext)();
  if (actx.state === 'suspended') actx.resume();
  if (!musicGain) { musicGain = actx.createGain(); musicGain.gain.value = musicOn ? 1 : 0; musicGain.connect(actx.destination); }
  return actx;
}
function mNote(m, t, dur, vol, type = 'sine', dest = null) {
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.value = midi(m);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest || musicGain);
  o.start(t); o.stop(t + dur + 0.05);
}
// ambiente de hotel: progresión suave y lenta (Cmaj7 · Am7 · Fmaj7 · G)
const AMBIENT = [[48, 52, 55, 59], [45, 48, 52, 55], [41, 45, 48, 52], [43, 47, 50, 55]];
function ambientBarPlay() {
  if (!musicOn || !actx) return;
  const t = actx.currentTime + 0.08;
  const ch = AMBIENT[ambientBar % AMBIENT.length];
  ch.forEach(m => mNote(m, t, 3.6, 0.05, 'triangle'));            // pad suave
  [...ch, ch[0] + 12].forEach((m, i) => mNote(m + 12, t + i * 0.5, 0.6, 0.03, 'sine')); // campanitas
  ambientBar++;
}
function startAmbient() {
  ensureAudio();
  if (ambientTimer) return;
  ambientBarPlay();
  ambientTimer = setInterval(ambientBarPlay, 4000);
}
function setMusic(on) {
  musicOn = on; localStorage.setItem('hg-music', on ? 'on' : 'off');
  if (musicGain && actx) musicGain.gain.setTargetAtTime(on ? 1 : 0, actx.currentTime, 0.1);
  const b = $('btnMusic'); if (b) b.textContent = on ? '🔊' : '🔇';
  if (on) startAmbient();
}
// tarantella viva (6/8, La menor) para celebrar el fin del turno
function playTarantella() {
  ensureAudio();
  if (ambientTimer) { clearInterval(ambientTimer); ambientTimer = null; } // baja el ambiente
  const t0 = actx.currentTime + 0.1, e = 0.15;
  const mel = [69, 71, 72, 71, 69, 67, 69, 71, 69, 67, 65, 64, 65, 67, 69, 71, 72, 71, 69, 67, 69];
  const dest = musicGain || actx.destination;
  for (let pass = 0; pass < 2; pass++) {
    const base = t0 + pass * mel.length * e;
    mel.forEach((m, i) => mNote(m, base + i * e, e * 0.95, 0.07, 'square', dest));        // melodía
    for (let i = 0; i < mel.length; i++) {
      mNote(i % 3 === 0 ? 45 : 57, base + i * e, e * 0.5, 0.05, 'triangle', dest);          // bajo
      if (i % 3 === 0) mNote(93, base + i * e, 0.03, 0.05, 'square', dest);                 // pandereta
    }
  }
}

// ----------------------------------------------------------------------------
// HUD y mensajes
// ----------------------------------------------------------------------------
let toastTimer = null;
function toast(msg, ms = 3200) {
  const t = $('toast');
  t.innerHTML = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), ms);
}
function fmtTime(min) {
  const h = Math.floor(min / 60), m = Math.floor(min % 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}
function updateHUD() {
  $('clock').textContent = `🕐 ${fmtTime(G.time)}`;
  $('roomsDone').textContent = `🛏 ${G.done}/${G.totalToClean}`;
  $('score').textContent = `⭐ ${G.score}`;
  $('hearts').textContent = '❤'.repeat(3 - G.warnings) + '🖤'.repeat(G.warnings);
  // rating del hotel en vivo (estrellas que suben con cada habitación)
  const rs = Math.max(1, Math.round(G.rating));
  $('rating').textContent = '🏨 ' + '★'.repeat(rs) + '☆'.repeat(5 - rs);
  const frac = (G.time - SHIFT_START) / (SHIFT_END - SHIFT_START);
  const expected = frac * G.totalToClean;
  const ok = G.done + 0.6 >= expected;
  const pace = $('pace');
  pace.textContent = ok ? S.paceOk : S.paceBad;
  pace.classList.toggle('bad', !ok);
  // inventario
  let html = `<h3>${S.cartTitle}</h3>`;
  for (const k of Object.keys(CART_MAX)) {
    const low = G.inv[k] <= 1;
    html += `<div class="${low ? 'low' : ''}">${INV_LABEL[k]}: <b>${G.inv[k]}</b></div>`;
  }
  html += `<div${G.dirty > 20 ? ' class="low"' : ''}>${S.dirtyLabel}: <b>${G.dirty}</b>${G.dirty > 20 ? S.heavy : ''}</div>`;
  $('inv').innerHTML = html;
}

// --- HUD del combo: un "🔥 xN" grande y vivo en el centro-arriba ---
function updateComboHUD() {
  const el = $('combo');
  if (!el) return;
  if (G.combo >= 2) {
    el.innerHTML = `🔥 <b>x${comboMult()}</b><span>${S.combo(G.combo)}</span>`;
    el.classList.remove('hidden');
  } else {
    el.classList.add('hidden');
  }
}
function bumpComboFx(up = true) {
  const el = $('combo');
  if (!el) return;
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  if (!up) el.classList.add('hidden');
}
function showCombo() { updateComboHUD(); if (G.combo >= 2) bumpComboFx(true); }

function getCurrentRoom() {
  if (G.floor !== PLAYER_FLOOR) return null;
  for (const room of G.rooms) {
    const rc = roomRect(room.idx);
    const zMin = Math.min(rc.zIn, rc.zIn + rc.dir * ROOM_D);
    const zMax = Math.max(rc.zIn, rc.zIn + rc.dir * ROOM_D);
    if (G.px >= rc.x0 && G.px <= rc.x1 && G.pz >= zMin + 0.1 && G.pz <= zMax - 0.1
        && Math.abs(G.pz) > CORR) return room;
  }
  return null;
}
function refreshChecklist() {
  const room = getCurrentRoom();
  const el = $('checklist');
  if (!room || room.status === 'L') { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  const stTxt = room.status === 'P' ? S.partenzaFull
    : S.fermataNight(room.stay) + (room.sheetChange ? S.sheetDue : '');
  let html = `<h3>${S.roomTitle(room.num)}${room.vip ? ' <span class="vip">' + S.vipBadge + '</span>' : ''}</h3><div class="meta">${stTxt} · ${S.guests(room.guests)}</div><ul>`;
  for (const t of room.tasks) {
    html += `<li class="${t.done ? 'done' : ''}">${t.done ? '✅' : '⬜'} ${TASK_DEFS[t.key].icon} ${TASK_DEFS[t.key].label}</li>`;
  }
  html += '</ul>';
  html += `<div class="hint">${S.towelHint(room.guests)}</div>`;
  el.innerHTML = html;
}

// ----------------------------------------------------------------------------
// Objetivo guiado: siempre hay UNA cosa clara que hacer (banner + flechas)
// ----------------------------------------------------------------------------
function computeObjective() {
  if (!G.started || G.over) { G.objective = null; return; }
  if (G.tut < 2) {
    G.objective = {
      type: 'tut',
      text: G.tut === 0 ? (IS_TOUCH ? S.tutMoveTouch : S.tutMove) : (IS_TOUCH ? S.tutLookTouch : S.tutLook),
    };
    return;
  }
  if (G.floor === -1) { // en la lavandería
    if (G.dirty > 0) { G.objective = { type: 'spot', x: 4.2, z: -4.5, text: S.objDeliver }; return; }
    if (Object.keys(CART_MAX).some(k => G.inv[k] < CART_MAX[k])) {
      G.objective = { type: 'spot', x: 10.4, z: -4.6, text: S.objRefill }; return;
    }
    G.objective = { type: 'lift', x: ELEV.x, z: ELEV.z, text: S.objBackUp }; return;
  }
  const zHere = zoneByFloor[G.floor];
  if (zHere) {   // en una zona: guía a la tarea pendiente más cercana, o de vuelta al ascensor
    let best = null, bd = 1e9;
    zHere.spots.forEach(([x, z], i) => {
      if (zHere.done[i]) return;
      const d = Math.hypot(G.px - x, G.pz - z);
      if (d < bd) { bd = d; best = { x, z, i }; }
    });
    if (best) { G.objective = { type: 'spot', x: best.x, z: best.z, text: `${zHere.icons[best.i]} ${S.zones[zHere.id].tasks[best.i]}` }; return; }
    G.objective = { type: 'lift', x: ELEV.x, z: ELEV.z, text: S.objBackUp }; return;
  }
  if (G.floor !== PLAYER_FLOOR) {
    G.objective = { type: 'lift', x: ELEV.x, z: ELEV.z, text: S.objGoFloor }; return;
  }
  // ¿queda trabajo pero no hay lencería para hacerlo?
  const pend = key => G.rooms.some(r => !r.done && r.tasks.some(x => !x.done && x.key === key));
  const noTowels = G.inv.grandes + G.inv.bidet + G.inv.pequenas + G.inv.alfombrin === 0;
  if ((G.inv.sabanas < 1 && pend('bedC')) || (noTowels && pend('towels')) || (G.inv.cortesia < 1 && pend('amen'))) {
    G.objective = { type: 'lift', x: ELEV.x, z: ELEV.z, text: S.objLaundry }; return;
  }
  const cur = getCurrentRoom();
  if (cur && !cur.done && cur.status !== 'L') { G.objective = { type: 'in', text: S.objFollow }; return; }
  // la habitación pendiente más cercana
  let best = null, bd = 1e9;
  for (const r of G.rooms) {
    if (r.done || r.status === 'L') continue;
    const rc = roomRect(r.idx);
    const p = lpos(rc, 2, 0.4);
    const d = Math.hypot(G.px - p.x, G.pz - p.z);
    if (d < bd) { bd = d; best = { r, p }; }
  }
  G.objective = best ? {
    type: 'room', x: best.p.x, z: best.p.z,
    text: S.objGoRoom(best.r.num, best.r.status === 'P' ? '🔴 ' + S.partenza : '🔵 ' + S.fermata),
  } : null;
}

function updateObjectiveHUD() {
  computeObjective();
  const el = $('objective');
  const o = G.objective;
  if (!o) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  let dir = '';
  if (o.x !== undefined) { // flecha de brújula relativa a donde miras
    let rel = Math.atan2(o.x - G.px, o.z - G.pz) - (G.yaw + Math.PI);
    while (rel > Math.PI) rel -= 2 * Math.PI;
    while (rel < -Math.PI) rel += 2 * Math.PI;
    dir = ['⬆️', '↖️', '⬅️', '↙️', '⬇️', '↘️', '➡️', '↗️'][Math.round(rel / (Math.PI / 4)) & 7] + ' ';
  }
  el.innerHTML = dir + o.text;
}

function updateMarkers(t) {
  const bob = Math.sin(t * 2.5);
  for (const h of HOTSPOTS) {
    if (!h.marker) continue;
    const on = G.started && !G.over && h.floor === G.floor &&
      (h.roomIdx !== undefined
        ? taskAvailable(h) && !taskBlocked(h)
        : (h.avail ? h.avail() === true : false));
    h.marker.visible = on;
    if (on) h.marker.position.y = h.markerY + bob * 0.07;
  }
  for (const f in ELEV_MARK) {
    const on = !!(G.objective && G.objective.type === 'lift') && Number(f) === G.floor;
    ELEV_MARK[f].visible = on;
    if (on) ELEV_MARK[f].position.y = 2.7 + bob * 0.1;
  }
  const onDoor = !!(G.objective && G.objective.type === 'room');
  doorMark.visible = onDoor;
  if (onDoor) doorMark.position.set(G.objective.x, PLAYER_FLOOR * FH + 2.65 + bob * 0.1, G.objective.z);
}

// ----------------------------------------------------------------------------
// Tareas
// ----------------------------------------------------------------------------
function getTask(room, key) { return room.tasks.find(t => t.key === key); }
function taskAvailable(h) {
  const room = G.rooms[h.roomIdx];
  if (room.done) return false;
  const t = getTask(room, h.taskKey);
  if (!t || t.done) return false;
  const def = TASK_DEFS[h.taskKey];
  if (def.needs && !getTask(room, def.needs)?.done) return false;
  return true;
}
function taskBlocked(h) {
  if (h.taskKey === 'bedC' && G.inv.sabanas < 1) return S.blockedSheets;
  if (h.taskKey === 'amen' && G.inv.cortesia < 1) return S.blockedAmen;
  if (h.taskKey === 'towels' && G.inv.grandes + G.inv.bidet + G.inv.pequenas + G.inv.alfombrin === 0)
    return S.blockedTowels;
  return null;
}
// --- COMBO: encadenar tareas sin pausas largas multiplica los puntos ---
const COMBO_WINDOW = 9;                 // s entre tareas para mantener la cadena
const comboMult = () => 1 + Math.min(4, Math.floor(G.combo / 2));  // x1..x5 (x2 desde la 2ª seguida)
function registerProgress() {
  const now = clock.elapsedTime;
  G.combo = (now - G.lastTaskAt < COMBO_WINDOW) ? G.combo + 1 : 1;
  G.lastTaskAt = now;
  if (G.combo > G.comboBest) G.comboBest = G.combo;
  showCombo();
}
function breakCombo() { if (G.combo > 1) bumpComboFx(false); G.combo = 0; updateComboHUD(); }
function addScore(base) { G.score += Math.round(base * comboMult()); }

function completeTask(h) {
  const room = G.rooms[h.roomIdx];
  const t = getTask(room, h.taskKey);
  if (!t || t.done) return;
  const V = room.vis;
  const fy = h.floor * FH;
  switch (h.taskKey) {
    case 'strip':
      G.dirty += room.guests + 3;
      V.beds.forEach(b => wipeOut(b.messy, 0.45));
      break;
    case 'bedC':
      G.inv.sabanas--;
      V.beds.forEach(b => { b.neat.visible = true; popIn(b.neat); });
      break;
    case 'bed':
      V.beds.forEach(b => { wipeOut(b.messy, 0.4); b.neat.visible = true; popIn(b.neat); });
      break;
    case 'bath': case 'bathQ':
      wipeOut(V.bathDirt, 0.5);
      break;
    case 'trash':
      wipeOut(V.trashFull, 0.4);
      break;
    case 'floor':
      V.dirtSpots.forEach((d, i) => wipeOut(d, 0.45 + i * 0.08));   // se van barriendo una a una
      break;
    case 'amen':
      G.inv.cortesia--;
      break;
  }
  burst(h.x, fy + 0.6, h.z, { chars: ['✨', '✨', '💫'], n: 10 });   // brillos al limpiar
  t.done = true;
  registerProgress();
  addScore(10);
  dingOK();
  updateHUD(); refreshChecklist();
  if (room.tasks.every(x => x.done)) roomComplete(room);
}
function roomComplete(room) {
  room.done = true;
  G.done++;
  let bonus = room.status === 'P' ? 125 : 100;
  // rating del hotel en vivo: sube con cada habitación (más si está impecable)
  G.rating = Math.min(5, G.rating + (room.mistakes === 0 ? 0.45 : 0.15));
  flash('rgba(255,255,255,0.4)', 300);                     // destello satisfactorio
  drawRoomCard(room);
  if (room.vip) {
    // habitación VIP: propina sorpresa + lluvia de monedas (recompensa variable)
    bonus += 150;
    addScore(bonus);
    toast(S.vipDone(room.num), 4200);
    rain({ chars: ['💶', '🪙', '⭐', '✨'], n: 34, life: 2.4 });
    [784, 988, 1175, 1568].forEach((f, i) => setTimeout(() => beep(f, 0.14), i * 100));
  } else {
    addScore(bonus);
    toast(S.roomDone(room.num, Math.round(bonus * comboMult())));
    beep(880, 0.1); setTimeout(() => beep(1175, 0.2), 110);
  }
  // gancho de la 1ª habitación: mini-celebración temprana para enganchar
  if (G.done === 1 && G.totalToClean > 1) {
    setTimeout(() => {
      toast(S.firstRoom, 3200);
      [660, 880, 990, 1320].forEach((f, i) => setTimeout(() => beep(f, 0.12), i * 90));
    }, 700);
  }
  updateHUD();
  if (G.done >= G.totalToClean) {
    const left = Math.max(0, Math.round(SHIFT_END - G.time));
    G.score += left * 2;
    // ¡turno completado! tarantella + confeti + baile de las compañeras antes del resumen
    G.celebrating = true;
    playTarantella();
    flash('rgba(255,240,200,0.55)', 500);
    rain({ chars: ['🎉', '🎊', '✨', '💃'], n: 60, life: 3.2, h: 5 });
    toast(S.tarantella, 4500);
    setTimeout(() => endShift('perfecto', left), 5200);
  }
}

// ----------------------------------------------------------------------------
// Diálogo de toallas
// ----------------------------------------------------------------------------
function openTowelDialog(h) {
  const room = G.rooms[h.roomIdx];
  const n = room.guests;
  G.dialogOpen = true;
  document.exitPointerLock?.();
  const dlg = $('dialog');
  const items = ['grandes', 'bidet', 'pequenas', 'alfombrin'].map(k => ({ k, label: S.towelItems[k] }));
  const sel = { grandes: 0, bidet: 0, pequenas: 0, alfombrin: 0 };
  dlg.innerHTML = `<div class="dlg">
    <h2>${S.towelDlgTitle(room.num)}</h2>
    <div class="meta">${S.towelDlgMeta(S.guests(n), room.status === 'P' ? S.partenza : S.fermata)}</div>
    ${items.map(it => `
      <div class="counter" data-k="${it.k}">
        <span>${it.label}</span>
        <span><button class="minus">−</button>
        <span class="num">0</span>
        <button class="plus">+</button></span>
        <span class="stock">${S.youHave(G.inv[it.k])}</span>
      </div>`).join('')}
    <button class="bigbtn" id="towelOk">${S.placeTowels}</button>
    <button class="cancel" id="towelCancel">${S.later}</button>
  </div>`;
  dlg.classList.remove('hidden');
  dlg.querySelectorAll('.counter').forEach(c => {
    const k = c.dataset.k;
    const num = c.querySelector('.num');
    c.querySelector('.plus').onclick = () => { if (sel[k] < G.inv[k] && sel[k] < 9) { sel[k]++; num.textContent = sel[k]; } };
    c.querySelector('.minus').onclick = () => { if (sel[k] > 0) { sel[k]--; num.textContent = sel[k]; } };
  });
  $('towelCancel').onclick = closeDialog;
  $('towelOk').onclick = () => {
    if (sel.grandes + sel.bidet + sel.pequenas + sel.alfombrin === 0) return;
    for (const k of Object.keys(sel)) G.inv[k] -= sel[k];
    G.dirty += n * 3 + 1;
    const right = sel.grandes === n && sel.bidet === n && sel.pequenas === n && sel.alfombrin === 1;
    const room2 = G.rooms[h.roomIdx];
    const t = getTask(room2, 'towels');
    t.done = true;
    if (room2.vis.towelOld) wipeOut(room2.vis.towelOld, 0.4);
    room2.vis.towelNew.visible = true;
    popIn(room2.vis.towelNew);
    burst(h.x, h.floor * FH + 0.7, h.z, { chars: ['✨', '🧖', '✨'], n: 9 });
    if (right) {
      G.towelPerfect++; registerProgress(); addScore(40);
      toast(S.towelPerfect);
      dingOK();
    } else {
      room2.mistakes++; G.mistakes++; breakCombo(); G.score = Math.max(0, G.score - 10);
      toast(S.towelWrong);
      dingBad();
    }
    closeDialog();
    updateHUD(); refreshChecklist();
    if (room2.tasks.every(x => x.done)) roomComplete(room2);
  };
}
function closeDialog() {
  $('dialog').classList.add('hidden');
  $('dialog').innerHTML = '';
  G.dialogOpen = false;
  if (!IS_TOUCH && G.started && !G.over) canvas.requestPointerLock?.();
}

// ----------------------------------------------------------------------------
// Ascensor
// ----------------------------------------------------------------------------
const FLOOR_NAMES = S.floors;
function openElevator() {
  G.dialogOpen = true;
  document.exitPointerLock?.();
  const dlg = $('dialog');
  dlg.innerHTML = `<div class="dlg">
    <h2>${S.liftTitle}</h2>
    <div class="meta">${S.liftMeta}</div>
    <div class="floors">
      ${[4, 3, 2, 1, 0, -1].map(f =>
        `<button data-f="${f}" class="${f === G.floor ? 'here' : ''}">${FLOOR_NAMES[f]}</button>`).join('')}
      ${ZONES.filter(zoneUnlocked).map(z =>
        `<button data-f="${z.f}" class="zone ${z.f === G.floor ? 'here' : ''}">${z.icons[0]} ${S.zones[z.id].name}</button>`).join('')}
    </div>
    <button class="cancel" id="liftCancel">${S.close}</button>
  </div>`;
  dlg.classList.remove('hidden');
  $('liftCancel').onclick = closeDialog;
  dlg.querySelectorAll('.floors button').forEach(b => {
    b.onclick = () => {
      const f = parseInt(b.dataset.f, 10);
      if (f === G.floor) return;
      closeDialog();
      travelTo(f);
    };
  });
}
function travelTo(f) {
  const fade = $('fade');
  fade.style.opacity = 1;
  dingLift();
  setTimeout(() => {
    G.floor = f;
    G.px = ELEV.x - 0.6; G.pz = ELEV.z;
    G.yaw = Math.PI / 2; G.pitch = 0;
    fade.style.opacity = 0;
    if (f === -1) toast(S.toastLaundry);
    if (f === 0) toast(S.toastLobby);
    if (f === PLAYER_FLOOR) toast(S.toastMyFloor);
    if (zoneByFloor[f]) toast(S.zoneWelcome(S.zones[zoneByFloor[f].id].name));
  }, 380);
}

// ----------------------------------------------------------------------------
// Inspección de la gobernanta
// ----------------------------------------------------------------------------
function checkInspection() {
  if (G.time - G.lastInspect < 45) return;
  const candidates = G.rooms.filter(r => r.done && !r.inspected);
  if (!candidates.length) return;
  G.lastInspect = G.time;
  const room = pick(candidates);
  room.inspected = true;
  const rc = roomRect(room.idx);
  lucia.position.set(rc.x0 + 2, 0, rc.zIn - rc.dir * 0.7);
  luciaState = { mode: 'inspect', t: 8 };
  if (room.mistakes > 0) {
    G.warnings++;
    G.score = Math.max(0, G.score - 60);
    toast(S.luciaBad(room.num, room.guests, G.warnings), 5200);
    dingBad();
    updateHUD();
    if (G.warnings >= 3) setTimeout(() => endShift('despido'), 1500);
  } else {
    G.score += 30;
    toast(S.luciaGood(room.num));
    beep(660, 0.12);
    updateHUD();
  }
}

// ----------------------------------------------------------------------------
// Fin de la jornada
// ----------------------------------------------------------------------------
function endShift(outcome, minutesLeft = 0) {
  if (G.over) return;
  G.over = true; G.uiOpen = true;
  document.exitPointerLock?.();
  $('objective').classList.add('hidden');
  $('combo')?.classList.add('hidden');
  doorMark.visible = false;
  const rate = G.done / G.totalToClean;
  let stars = 1;
  if (rate >= 0.5) stars = 2;
  if (rate >= 0.8) stars = 3;
  if (rate >= 1 && G.warnings === 0) stars = 4;
  if (rate >= 1 && G.warnings === 0 && G.mistakes === 0) stars = 5;
  if (outcome === 'despido') stars = 0;
  // --- récords persistentes: la razón para volver a jugar ---
  G.newRecord = G.score > REC.best;
  const perfectShift = rate >= 1 && stars >= 4;
  REC.streak = perfectShift ? REC.streak + 1 : 0;
  REC.best = Math.max(REC.best, G.score);
  REC.stars = Math.max(REC.stars, stars);
  REC.rooms += G.done;
  localStorage.setItem('hg-best', REC.best);
  localStorage.setItem('hg-stars', REC.stars);
  localStorage.setItem('hg-streak', REC.streak);
  localStorage.setItem('hg-rooms', REC.rooms);
  // avance de DÍA: hacer la mayor parte del turno (≥80%) pasa al día siguiente y abre zonas
  const dayComplete = rate >= 0.8 && outcome !== 'despido';
  const nextDay = dayComplete ? DAY + 1 : DAY;
  if (dayComplete) localStorage.setItem('hg-day', nextDay);
  const unlocking = dayComplete ? ZONES.find(z => z.unlockDay === nextDay) : null;
  const dayLine = dayComplete
    ? `<div class="dayLine">${S.dayComplete(DAY)} ${S.nextDayMsg(nextDay)}${unlocking ? '<br>' + S.zoneUnlockSoon(S.zones[unlocking.id].name) : ''}</div>`
    : `<div class="recordLine">${S.day(DAY)}</div>`;
  const recBadge = (G.newRecord
    ? `<div class="recordBadge">${S.newRecord(G.score)}</div>`
    : `<div class="recordLine">${S.bestLine(REC.best)}${REC.streak > 1 ? ' · ' + S.streakLine(REC.streak) : ''}</div>`) + dayLine;
  const msgs = {
    perfecto: S.endPerfect(G.totalToClean, minutesLeft),
    fin: S.endTime(G.totalToClean - G.done),
    despido: S.endFired,
  };
  $('end').innerHTML = `<div class="panel">
    <h1>${S.endTitles[outcome]}</h1>
    <div class="stars">${'⭐'.repeat(stars)}${'☆'.repeat(Math.max(0, 5 - stars))}</div>
    ${recBadge}
    <p>${msgs[outcome]}</p>
    <div class="luciaReview">
      <img src="assets/housekeper/lucia.png" alt="Lucía" />
      <p>${S.luciaVerdict(stars)}</p>
    </div>
    <table>
      <tr><td>${S.endRows[0]}</td><td>${G.done} / ${G.totalToClean}</td></tr>
      <tr><td>${S.endRows[1]}</td><td>${G.towelPerfect}</td></tr>
      <tr><td>${S.endRows[2]}</td><td>${G.trips}</td></tr>
      <tr><td>${S.endRows[3]}</td><td>${G.mistakes} / ${G.warnings}</td></tr>
      <tr><td>${S.endRows[4]}</td><td>${fmtTime(Math.min(G.time, SHIFT_END))}</td></tr>
      <tr><td>${S.endRows[5]}</td><td>${G.score}</td></tr>
    </table>
    <button class="bigbtn" id="btnShare">${S.shareBtn}</button>
    <button class="bigbtn alt" onclick="location.reload()">${S.again}</button>
  </div>`;
  $('end').classList.remove('hidden');
  $('btnShare').onclick = () => shareResult(stars);
}

// genera una tarjeta-resultado (PNG) para compartir: estrellas, puntuación,
// veredicto de Lucía y la URL → marketing que se propaga solo
async function shareResult(stars) {
  const cv = document.createElement('canvas');
  cv.width = 1080; cv.height = 1350;
  const ctx = cv.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 1350);
  grad.addColorStop(0, '#1aa3d6'); grad.addColorStop(0.55, '#1773b0'); grad.addColorStop(1, '#0e4f80');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 1080, 1350);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff'; ctx.font = 'bold 86px sans-serif';
  ctx.fillText('🌊 HOTEL DINO BLU', 540, 170);
  ctx.font = '40px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText(S.shareSub, 540, 235);
  // estrellas
  ctx.font = '120px sans-serif';
  ctx.fillText('⭐'.repeat(stars) + '☆'.repeat(Math.max(0, 5 - stars)), 540, 470);
  // puntuación
  ctx.fillStyle = '#ffe27a'; ctx.font = 'bold 150px sans-serif';
  ctx.fillText(`${G.score}`, 540, 660);
  ctx.fillStyle = '#fff'; ctx.font = '44px sans-serif';
  ctx.fillText(S.shareScore(G.done, G.totalToClean), 540, 740);
  if (G.newRecord) { ctx.fillStyle = '#ffd86b'; ctx.font = 'bold 60px sans-serif'; ctx.fillText(S.shareRecord, 540, 840); }
  // veredicto de Lucía en una "burbuja"
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  roundRect(ctx, 90, 900, 900, 180, 28); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '40px sans-serif';
  wrapText(ctx, S.luciaVerdict(stars).replace('👩‍💼 ', ''), 540, 975, 820, 52);
  // marca + URL
  ctx.fillStyle = '#ffe27a'; ctx.font = 'bold 52px sans-serif';
  ctx.fillText('glitchrushgg.com/hotel-dino-blu', 540, 1230);
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = '36px sans-serif';
  ctx.fillText('@glitchrush.gg', 540, 1290);

  cv.toBlob(async blob => {
    if (!blob) return;
    const file = new File([blob], 'hotel-dino-blu.png', { type: 'image/png' });
    const data = { files: [file], title: 'Hotel Dino Blu', text: S.shareText(G.score, stars) };
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share(data); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'hotel-dino-blu.png'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast(S.shareSaved, 3500);
  }, 'image/png');
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function wrapText(ctx, text, cx, y, maxW, lh) {
  const words = text.split(' '); let line = '', yy = y;
  for (const w of words) {
    if (ctx.measureText(line + w + ' ').width > maxW && line) { ctx.fillText(line.trim(), cx, yy); line = ''; yy += lh; }
    line += w + ' ';
  }
  ctx.fillText(line.trim(), cx, yy);
}

// ----------------------------------------------------------------------------
// Controles
// ----------------------------------------------------------------------------
const IS_TOUCH = matchMedia('(pointer: coarse)').matches;

addEventListener('keydown', e => {
  G.keys[e.code] = true;
  if ((e.code === 'KeyE' || e.code === 'Enter') && !G.uiOpen && !G.dialogOpen) {
    G.eHeld = true;
    if (G.hotspot && G.hotspot.type === 'press') triggerPress(G.hotspot);
  }
});
addEventListener('keyup', e => {
  G.keys[e.code] = false;
  if (e.code === 'KeyE' || e.code === 'Enter') G.eHeld = false;
});

canvas.addEventListener('click', () => {
  if (!G.uiOpen && !G.dialogOpen && !IS_TOUCH) canvas.requestPointerLock?.();
});
const LOOK_SENS = 0.0016;   // sensibilidad del ratón (antes 0.0024; demasiado brusca en pantallas con escalado)
addEventListener('mousemove', e => {
  if (document.pointerLockElement !== canvas) return;
  // En Windows con escalado de pantalla algunos navegadores INFLAN movementX y el giro
  // se descontrola: recortamos el delta por evento para que un movimiento pequeño no dé la vuelta entera.
  const mx = Math.max(-70, Math.min(70, e.movementX));
  const my = Math.max(-70, Math.min(70, e.movementY));
  G.yaw -= mx * LOOK_SENS;
  G.pitch = Math.max(-1.35, Math.min(1.35, G.pitch - my * LOOK_SENS));
  if (G.tut === 1) {
    G.tutLookAcc += Math.abs(mx * LOOK_SENS);
    if (G.tutLookAcc > 1) { G.tut = 2; localStorage.setItem('hg-tut', '1'); updateObjectiveHUD(); }
  }
});

// táctil: joystick + mirar arrastrando + botón de acción
if (IS_TOUCH) {
  $('joy').classList.remove('hidden');
  $('btnAction').classList.remove('hidden');
  const joy = $('joy'), stick = $('stick');
  let joyId = null, lookId = null, lx = 0, ly = 0;
  const jr = () => joy.getBoundingClientRect();
  addEventListener('touchstart', e => {
    for (const t of e.changedTouches) {
      const r = jr();
      if (t.clientX > r.left - 30 && t.clientX < r.right + 30 && t.clientY > r.top - 30 && t.clientY < r.bottom + 30 && joyId === null) {
        joyId = t.identifier;
      } else if (t.target === canvas && lookId === null) {
        lookId = t.identifier; lx = t.clientX; ly = t.clientY;
      }
    }
  }, { passive: true });
  addEventListener('touchmove', e => {
    for (const t of e.changedTouches) {
      if (t.identifier === joyId) {
        const r = jr();
        const dx = (t.clientX - (r.left + r.width / 2)) / (r.width / 2);
        const dy = (t.clientY - (r.top + r.height / 2)) / (r.height / 2);
        const len = Math.hypot(dx, dy) || 1;
        G.joy.x = Math.abs(dx) > 1 ? dx / len : dx;
        G.joy.y = Math.abs(dy) > 1 ? dy / len : dy;
        G.joy.on = true;
        stick.style.left = `${35 + G.joy.x * 30}px`;
        stick.style.top = `${35 + G.joy.y * 30}px`;
      } else if (t.identifier === lookId) {
        if (G.tut === 1) {
          G.tutLookAcc += Math.abs((t.clientX - lx) * 0.005);
          if (G.tutLookAcc > 1) { G.tut = 2; localStorage.setItem('hg-tut', '1'); updateObjectiveHUD(); }
        }
        G.yaw -= (t.clientX - lx) * 0.005;
        G.pitch = Math.max(-1.35, Math.min(1.35, G.pitch - (t.clientY - ly) * 0.005));
        lx = t.clientX; ly = t.clientY;
      }
    }
  }, { passive: true });
  addEventListener('touchend', e => {
    for (const t of e.changedTouches) {
      if (t.identifier === joyId) {
        joyId = null; G.joy.on = false; G.joy.x = G.joy.y = 0;
        stick.style.left = '35px'; stick.style.top = '35px';
      }
      if (t.identifier === lookId) lookId = null;
    }
  }, { passive: true });
  const btn = $('btnAction');
  btn.addEventListener('touchstart', e => {
    e.preventDefault();
    G.eHeld = true;
    if (G.hotspot && G.hotspot.type === 'press' && !G.uiOpen && !G.dialogOpen) triggerPress(G.hotspot);
  });
  btn.addEventListener('touchend', () => { G.eHeld = false; });
}

function triggerPress(h) {
  if (h.roomIdx !== undefined && taskBlocked(h)) return;
  if (h.avail && h.avail() !== true) return;
  $('prompt').classList.add('hidden');
  if (h.taskKey === 'towels') { openTowelDialog(h); return; }
  if (h.action) h.action();
}

// ----------------------------------------------------------------------------
// Movimiento y colisiones
// ----------------------------------------------------------------------------
const PR = 0.27; // radio del jugador
function collides(f, x, z) {
  const list = SOLID[f];
  if (!list) return false;
  for (const s of list) {
    if (x > s.x0 - PR && x < s.x1 + PR && z > s.z0 - PR && z < s.z1 + PR) return true;
  }
  return false;
}
function movePlayer(dt) {
  let ix = 0, iz = 0;
  if (G.keys.KeyW || G.keys.ArrowUp) iz += 1;
  if (G.keys.KeyS || G.keys.ArrowDown) iz -= 1;
  if (G.keys.KeyA || G.keys.ArrowLeft) ix -= 1;
  if (G.keys.KeyD || G.keys.ArrowRight) ix += 1;
  if (G.joy.on) { ix += G.joy.x; iz -= G.joy.y; }
  const len = Math.hypot(ix, iz);
  if (len < 0.01) return;
  ix /= Math.max(1, len); iz /= Math.max(1, len);
  const run = G.keys.ShiftLeft || G.keys.ShiftRight;
  let speed = (run ? 4.6 : 3.1) * (G.dirty > 20 ? 0.85 : 1);
  const fx = -Math.sin(G.yaw), fz = -Math.cos(G.yaw);
  const rx = Math.cos(G.yaw), rz = -Math.sin(G.yaw);
  const dx = (fx * iz + rx * ix) * speed * dt;
  const dz = (fz * iz + rz * ix) * speed * dt;
  const b = BOUNDS[G.floor];
  let nx = Math.max(b.x0, Math.min(b.x1, G.px + dx));
  if (!collides(G.floor, nx, G.pz)) G.px = nx;
  let nz = Math.max(b.z0, Math.min(b.z1, G.pz + dz));
  if (!collides(G.floor, G.px, nz)) G.pz = nz;
  if (G.tut === 0) { G.tutDist += Math.abs(dx) + Math.abs(dz); if (G.tutDist > 2.5) { G.tut = 1; updateObjectiveHUD(); } }
}

// ----------------------------------------------------------------------------
// Interacción con hotspots
// ----------------------------------------------------------------------------
function updateInteraction(dt) {
  G.working = false;   // ¿está la camarera fregando/haciendo una tarea ahora mismo? (para animar las manos)
  let best = null, bestD = 1e9;
  for (const h of HOTSPOTS) {
    if (h.floor !== G.floor) continue;
    if (h.roomIdx !== undefined && !taskAvailable(h)) continue;
    const d = Math.hypot(G.px - h.x, G.pz - h.z);
    if (d < h.r && d < bestD) { best = h; bestD = d; }
  }
  if (best !== G.hotspot) { G.hotspot = best; G.holdT = 0; }
  const pr = $('prompt'), pt = $('promptText'), pb = $('pbar'), pf = $('pfill');
  if (!best || G.dialogOpen) { pr.classList.add('hidden'); return; }
  pr.classList.remove('hidden');
  const blocked = best.roomIdx !== undefined ? taskBlocked(best) : null;
  const availMsg = best.avail ? best.avail() : true;
  if (blocked || availMsg !== true) {
    pt.textContent = blocked || availMsg;
    pb.classList.remove('on');
    G.holdT = 0;
    return;
  }
  const verb = best.type === 'press'
    ? (IS_TOUCH ? S.pressTouch : S.pressKey)
    : (IS_TOUCH ? S.holdTouch : S.holdKey);
  pt.textContent = best.label + verb;
  if (best.type === 'hold') {
    pb.classList.add('on');
    if (G.eHeld) {
      G.working = true;
      G.holdT += dt;
      pf.style.width = `${Math.min(100, G.holdT / best.dur * 100)}%`;
      if (G.holdT >= best.dur) {
        G.holdT = 0;
        pf.style.width = '0%';
        if (best.roomIdx !== undefined) completeTask(best);
        else if (best.action) best.action();
      }
    } else {
      G.holdT = Math.max(0, G.holdT - dt * 2);
      pf.style.width = `${Math.min(100, G.holdT / best.dur * 100)}%`;
    }
  } else {
    pb.classList.remove('on');
  }
}

// ----------------------------------------------------------------------------
// NPCs y animación
// ----------------------------------------------------------------------------
function updateNPCs(dt, t) {
  for (const n of NPCS) {
    const m = n.mesh;
    const limbs = m.userData.limbs;
    if (n.isBoss && luciaState.mode === 'inspect') {
      luciaState.t -= dt;
      if (luciaState.t <= 0) luciaState.mode = 'patrol';
    }
    if (G.celebrating) {                                  // tarantela: saltos + giros + brazos arriba
      m.position.y = Math.abs(Math.sin(t * 8 + n.x0)) * 0.22;
      m.rotation.z = Math.sin(t * 7 + n.x0) * 0.15;
      m.rotation.y = Math.sin(t * 3 + n.x0) * 0.7;
      if (limbs) {
        limbs.arms.forEach((a, i) => { a.rotation.x = -2.1 + Math.sin(t * 8 + i * 2) * 0.35; });
        limbs.legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 8 + i * Math.PI) * 0.4; });
      }
      continue;
    }
    m.rotation.z = 0;
    if (n.walk && n.floor === G.floor) {                  // patrulla el pasillo
      n.phase += dt * n.speed * 5;
      m.position.x += n.dir * n.speed * dt;
      if (m.position.x > n.x1) { m.position.x = n.x1; n.dir = -1; }
      if (m.position.x < n.x0) { m.position.x = n.x0; n.dir = 1; }
      m.rotation.y = n.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      m.position.y = Math.abs(Math.sin(n.phase)) * 0.03;
      if (limbs) {
        const sw = Math.sin(n.phase) * 0.5;
        limbs.legs[0].rotation.x = sw; limbs.legs[1].rotation.x = -sw;
        limbs.arms[0].rotation.x = -sw; limbs.arms[1].rotation.x = sw;
      }
    } else {                                              // de pie, respiración suave
      m.position.y = Math.abs(Math.sin(t * 1.6 + n.x0)) * 0.02;
      m.rotation.y = Math.PI;
      if (limbs) { limbs.legs.forEach(l => l.rotation.x = 0); limbs.arms.forEach(a => a.rotation.x = 0); }
    }
  }
  for (const d of DRUMS) d.rotation.z += dt * 5;
}
// los billboards (si quedara alguno) miran a la cámara; los modelos 3D los anima updateNPCs
function faceNPCsToCamera() {
  for (const n of NPCS) {
    const m = n.mesh;
    if (!m.userData.billboard || n.floor !== G.floor) continue;
    m.rotation.y = Math.atan2(camera.position.x - m.position.x, camera.position.z - m.position.z);
    m.rotation.z = m.userData.tilt || 0;
  }
}

// ----------------------------------------------------------------------------
// Parte de trabajo en la pantalla de inicio
// ----------------------------------------------------------------------------
function fillWorkSheet() {
  let html = `<table><tr>${S.sheetCols.map(c => `<th>${c}</th>`).join('')}</tr>`;
  for (const r of G.rooms) {
    const st = r.status === 'P' ? S.partenza : r.status === 'F' ? S.fermata : S.libre;
    html += `<tr><td><b>${r.num}</b></td><td class="${r.status}">${st}</td>
      <td>${r.guests || '—'}</td><td>${r.status === 'F' ? r.stay + 'ª' : '—'}</td>
      <td>${r.status === 'L' ? '—' : (r.status === 'P' || r.sheetChange) ? S.sheetChange : S.sheetNo}</td></tr>`;
  }
  html += '</table>';
  $('parte').innerHTML = html;
}

// ----------------------------------------------------------------------------
// Personalización de la camarera: vista previa 3D en vivo + selectores de color
// ----------------------------------------------------------------------------
let pvRenderer = null, pvScene = null, pvCamera = null, pvModel = null, pvRAF = 0;
let pvMixer = null, pvCharRoot = null, pvClock = null, pvLoader = null;

// recolorea el modelo 3D (Quaternius "Woman", CC0): materiales por nombre, sin texturas
function recolorChar(obj) {
  const uni = new THREE.Color(hex(CUSTOM.uniform));
  const sk = new THREE.Color(hex(CUSTOM.skin));
  const ha = new THREE.Color(hex(CUSTOM.hair));
  obj.traverse(o => {
    if (!o.isMesh) return;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
      const n = (m.name || '').toLowerCase();
      if (n.includes('skin')) m.color.copy(sk);
      else if (n.includes('hair') || n.includes('eyebrow')) m.color.copy(ha);
      else if (['shirt', 'jacket', 'pants'].some(k => n.includes(k))) m.color.copy(uni);
    });
  });
}
async function loadPreviewChar() {
  try {
    if (!pvLoader) { const mod = await import('./lib/jsm/loaders/GLTFLoader.js'); pvLoader = new mod.GLTFLoader(); }
    pvLoader.load('assets/models/char-woman.glb', gltf => {
      const obj = gltf.scene;
      obj.traverse(o => {                                  // no auto-ocultar + doble cara (por si mira atrás)
        if (!o.isMesh) return;
        o.frustumCulled = false;
        (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.side = THREE.DoubleSide; });
      });
      pvCharRoot = obj;
      recolorChar(obj);
      pvMixer = new THREE.AnimationMixer(obj);
      const idle = gltf.animations.find(a => /idle/i.test(a.name)) || gltf.animations[0];
      if (idle) pvMixer.clipAction(idle).play();
      const wrap = new THREE.Group(); wrap.add(obj);
      if (pvModel) pvScene.remove(pvModel);
      pvModel = wrap; pvScene.add(wrap);
      // La malla tiene escala 100 en la armadura → Box3 del mesh es poco fiable.
      // Calculamos la caja a partir de los HUESOS (sí tienen la transformación real),
      // centramos y NORMALIZAMOS a ~2 de alto para que la cámara a distancia fija lo encuadre.
      pvMixer.update(0); wrap.updateMatrixWorld(true);
      const box = new THREE.Box3(), v = new THREE.Vector3(); let nb = 0;
      obj.traverse(o => { if (o.isBone) { o.getWorldPosition(v); box.expandByPoint(v); nb++; } });
      if (nb < 2 || box.isEmpty()) box.setFromObject(obj);
      const ctr = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
      const h = (isFinite(size.y) && size.y > 0.001) ? size.y : 1;
      if (isFinite(ctr.x)) obj.position.sub(ctr);          // centrar el modelo en el origen del wrap
      wrap.scale.setScalar(2.0 / h);                        // normalizar a ~2 unidades de alto
      pvCamera.position.set(0, 0, 3.6);
      pvCamera.lookAt(0, 0, 0);
    }, undefined, e => console.warn('[preview glb]', e));
  } catch (e) { console.warn('[preview glb]', e); }
}
function updatePreviewModel() {
  if (!pvScene) return;
  if (pvCharRoot) { recolorChar(pvCharRoot); return; }      // GLB cargado → recolorear en vivo
  if (pvModel) pvScene.remove(pvModel);                       // low-poly de respaldo mientras carga
  pvModel = makePerson({
    shirt: hex(CUSTOM.uniform), skirt: hex(CUSTOM.uniform), apron: 0xf2f6f7,
    skin: hex(CUSTOM.skin), hair: hex(CUSTOM.hair), trim: 0xffffff, cap: true,
  });
  pvModel.position.y = -0.82;   // centrar verticalmente (la cámara mira al origen)
  pvScene.add(pvModel);
}
function buildCustomizer() {
  $('custTitle').textContent = S.customizeTitle;
  const rows = [['skin', SKINS, S.skinLabel], ['hair', HAIRS, S.hairLabel], ['uniform', UNIFORMS, S.uniformLabel]];
  $('custRows').innerHTML = rows.map(([key, pal, label]) =>
    `<div class="custRow"><span>${label}</span><div class="sw">` +
    pal.map(c => `<button class="swatch${c === CUSTOM[key] ? ' on' : ''}" data-key="${key}" data-c="${c}" style="background:${c}"></button>`).join('') +
    `</div></div>`).join('');
  $('custRows').querySelectorAll('.swatch').forEach(b => b.onclick = () => {
    const key = b.dataset.key, c = b.dataset.c;
    CUSTOM[key] = c; localStorage.setItem('hg-' + key, c);
    $('custRows').querySelectorAll(`.swatch[data-key="${key}"]`).forEach(x => x.classList.toggle('on', x === b));
    handSkinMat.color.set(hex(CUSTOM.skin));
    handSleeveMat.color.set(hex(CUSTOM.uniform));
    updatePreviewModel();
  });
  // renderer de la vista previa (una vez); si WebGL falla, el juego sigue sin preview
  if (!pvRenderer) {
    try {
      const cv = $('charPreview');
      pvRenderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
      pvRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      pvRenderer.setSize(170, 250, false);
      pvScene = new THREE.Scene();
      pvScene.add(new THREE.AmbientLight(0xffffff, 0.7));
      pvScene.add(new THREE.HemisphereLight(0xffffff, 0x8090a0, 1.4));
      const dl = new THREE.DirectionalLight(0xffffff, 1.1); dl.position.set(1.5, 3, 2.5); pvScene.add(dl);
      pvCamera = new THREE.PerspectiveCamera(38, 170 / 250, 0.05, 200);
      pvCamera.position.set(0, 0, 3.6); pvCamera.lookAt(0, 0, 0);
      pvClock = new THREE.Clock();
      const tick = () => {
        pvRAF = requestAnimationFrame(tick);
        const d = pvClock.getDelta();
        if (pvMixer) pvMixer.update(d);
        if (pvModel) pvModel.rotation.y += 0.5 * d;
        pvRenderer.render(pvScene, pvCamera);
      };
      tick();
      loadPreviewChar();                 // carga el modelo 3D bonito (reemplaza al low-poly)
    } catch (e) { console.warn('[preview]', e); $('charPreview').style.display = 'none'; }
  }
  updatePreviewModel();
}

// ----------------------------------------------------------------------------
// Textos de la pantalla de inicio + selector de idioma
// ----------------------------------------------------------------------------
function applyIntroTexts() {
  document.title = S.htmlTitle;
  document.documentElement.lang = LANG;
  $('sub').innerHTML = S.sub;
  $('story').innerHTML = S.story;
  $('manualTitle').textContent = S.manualTitle;
  $('manualList').innerHTML = S.manual.map(li => `<li>${li}</li>`).join('');
  $('parteTitle').textContent = S.sheetTitle;
  $('controlsTitle').textContent = S.controlsTitle;
  $('deskHelp').innerHTML = S.desktopHelp;
  $('touchHelp').innerHTML = S.touchHelp;
  $('btnStart').textContent = S.start;
  $('disclaimer').textContent = S.disclaimer;
  buildCustomizer();   // personalización: vista previa 3D + selectores
  // día actual + mapa de zonas del hotel (progresión)
  $('dayBadge').textContent = S.day(DAY);
  $('zones').innerHTML = `<h3>${S.mapTitle}</h3><p class="zsub">${S.mapSub}</p>` +
    ZONES.map(z => {
      const u = zoneUnlocked(z);
      return `<div class="zrow${u ? ' on' : ''}"><span>${z.icons[0]} ${S.zones[z.id].name}</span>` +
        `<span>${u ? S.mapOpen : S.mapLocked(z.unlockDay)}</span></div>`;
    }).join('');
  $('castTitle').textContent = S.castTitle;
  $('cast').innerHTML = S.cast.map(c =>
    `<figure><img src="assets/housekeper/${c.img}.png" alt="${c.name}" loading="lazy">` +
    `<figcaption><b>${c.name}</b><span>${c.role}</span></figcaption></figure>`).join('');
  $('langRow').innerHTML = LANGS.map(([code, name]) =>
    `<button class="lang${code === LANG ? ' active' : ''}" data-l="${code}">${name}</button>`).join('');
  $('langRow').querySelectorAll('button').forEach(b => { b.onclick = () => setLang(b.dataset.l); });
  // récord guardado (la razón para volver a jugar)
  const rec = $('record');
  if (REC.best > 0) {
    rec.innerHTML = S.bestLine(REC.best) + (REC.streak > 1 ? ' · ' + S.streakLine(REC.streak) : '');
    rec.classList.remove('hidden');
  } else rec.classList.add('hidden');
  // selector de modo de juego (turno completo vs express)
  $('modeRow').innerHTML = [['full', S.modeFull, S.modeFullSub], ['express', S.modeExpress, S.modeExpressSub]]
    .map(([m, t, sub]) => `<button class="mode${m === G.mode ? ' active' : ''}" data-m="${m}"><b>${t}</b><span>${sub}</span></button>`).join('');
  $('modeRow').querySelectorAll('button').forEach(b => { b.onclick = () => setMode(b.dataset.m); });
}
// cambiar de modo = guardar y recargar (el mundo se construye al cargar, como el idioma)
function setMode(m) {
  if (m === G.mode) return;
  localStorage.setItem('hg-mode', m);
  location.reload();
}

// ----------------------------------------------------------------------------
// Inicialización
// ----------------------------------------------------------------------------
genRooms();
applyIntroTexts();
fillWorkSheet();
buildExterior();
buildLobby();
buildLaundry();
let floor2Group = null;
for (let f = 1; f <= 4; f++) {
  const g = buildGuestFloor(f);
  if (f === PLAYER_FLOOR) floor2Group = g;
}
// zonas ya abiertas según el día actual (terraza, restaurante, piscina, jardín);
// con try/catch para que un fallo en una zona nunca rompa el juego entero
ZONES.forEach(z => { if (zoneUnlocked(z)) { try { buildZone(z); } catch (e) { console.warn('[zona]', z.id, e); } } });
// Lucía ya no ronda el pasillo: aparece solo en el saludo inicial y el veredicto final
updateHUD();

// ----------------------------------------------------------------------------
// Modelos 3D CC0 (Poly Pizza · dominio público) — carga ADITIVA y a prueba de
// fallos: si el loader o algún .glb no carga, el juego sigue exactamente igual.
// ----------------------------------------------------------------------------
async function loadDecorModels() {
  let GLTFLoader;
  try { ({ GLTFLoader } = await import('./lib/jsm/loaders/GLTFLoader.js')); }
  catch (e) { console.warn('[hotel] sin GLTFLoader, sigo sin modelos:', e); return; }
  const loader = new GLTFLoader();
  const load = url => new Promise((res, rej) => loader.load(url, gl => res(gl.scene), undefined, rej));
  // normaliza una COPIA (no muta el original): altura en metros, pies en y=0, centrado
  const fit = (src, targetH) => {
    const obj = src.clone(true);
    let b = new THREE.Box3().setFromObject(obj); const s = new THREE.Vector3(); b.getSize(s);
    obj.scale.setScalar(targetH / (s.y || 1));
    b = new THREE.Box3().setFromObject(obj); const c = new THREE.Vector3(); b.getCenter(c);
    obj.position.set(-c.x, -b.min.y, -c.z);
    const wrap = new THREE.Group(); wrap.add(obj); return wrap;
  };
  const place = (proto, spots) => spots.forEach(sp => {
    const m = proto.clone(true);
    m.position.set(sp.x, sp.y || 0, sp.z);
    if (sp.r) m.rotation.y = sp.r;
    scene.add(m);
  });
  try {
    const [plant, lamp, floorlamp, armchair, sofa] = await Promise.all(
      ['plant', 'lamp', 'floorlamp', 'armchair', 'sofa'].map(n => load(`assets/models/${n}.glb`)));
    // Lobby (planta baja, y=0): salón de espera + plantas decorativas
    place(fit(sofa, 0.8), [{ x: 2, z: -1.6, r: 0 }]);
    place(fit(armchair, 0.85), [{ x: 0.3, z: 1.1, r: -2.4 }, { x: 3.7, z: 1.1, r: 2.4 }]);
    place(fit(floorlamp, 1.6), [{ x: 4.4, z: -1.4 }]);
    place(fit(plant, 1.4), [
      { x: 6.6, z: 2.2 }, { x: 11.4, z: 2.2 },   // flanqueando recepción
      { x: -6, z: -5.6 }, { x: 6, z: -5.6 },      // junto a la entrada
    ]);
    place(fit(lamp, 0.45), [{ x: 8.2, y: 1.1, z: 1.6 }]); // lamparita sobre el mostrador
    // planta 3D en el rincón de la ventana de cada habitación abierta (tu piso)
    const fy2 = PLAYER_FLOOR * FH;
    const roomSpots = G.rooms.filter(r => r.status !== 'L').map(r => {
      const wp = lpos(roomRect(r.idx), 0.45, 5.5);  // esquina oeste junto a la ventana (la butaca va en la este)
      return { x: wp.x, y: fy2, z: wp.z };
    });
    place(fit(plant, 1.15), roomSpots);
    console.info('[hotel] modelos CC0 cargados ✔');
  } catch (e) { console.warn('[hotel] algún modelo no cargó (sigo sin él):', e); }
}
loadDecorModels();

$('btnStart').addEventListener('click', () => {
  $('intro').classList.add('hidden');
  $('hud').classList.remove('hidden');
  if (pvRAF) cancelAnimationFrame(pvRAF);   // detener la vista previa 3D
  G.uiOpen = false;
  G.started = true;
  luciaHandover();   // Lucía te recibe y te entrega el carro antes de la ronda
});

// Lucía te saluda y te entrega el carro; al cerrar, empieza la ronda (ella se va)
function luciaHandover() {
  G.dialogOpen = true;
  document.exitPointerLock?.();
  const dlg = $('dialog');
  dlg.innerHTML = `<div class="dlg lucia">
    <img class="luciaPortrait" src="assets/housekeper/lucia.png" alt="Lucía" />
    <h2>${S.luciaLabel}</h2>
    ${S.luciaWelcome.map(l => `<p>${l}</p>`).join('')}
    <button class="bigbtn" id="luciaGo">${S.startRound}</button>
  </div>`;
  dlg.classList.remove('hidden');
  $('luciaGo').onclick = () => {
    closeDialog();
    if (!IS_TOUCH) canvas.requestPointerLock?.();
    toast(S.toastStart, 4500);
    updateObjectiveHUD();
    beep(660, 0.15);
    if (musicOn) startAmbient();
  };
}

// botón de música del HUD
$('btnMusic').textContent = musicOn ? '🔊' : '🔇';
$('btnMusic').addEventListener('click', e => { e.stopPropagation(); setMusic(!musicOn); });

// ----------------------------------------------------------------------------
// Bucle principal
// ----------------------------------------------------------------------------
// manejador de depuración para pruebas automatizadas
window.HG = { G, HOTSPOTS };

// ----------------------------------------------------------------------------
// Manos en primera persona (viewmodel): las manos de la camarera, con el uniforme,
// que se balancean al andar y hacen el gesto de fregar al realizar tareas.
// ----------------------------------------------------------------------------
scene.add(camera);                       // la cámara (y sus hijos) entran en la escena
const HANDS = new THREE.Group();
camera.add(HANDS);
HANDS.visible = false;
{
  const skin = handSkinMat, sleeve = handSleeveMat, cloth = lamb(0xfff2b0);
  const buildArm = (s) => {                // s = -1 izquierda, +1 derecha
    const a = new THREE.Group();
    add(a, bx(0.12, 0.12, 0.34, sleeve), 0, 0, 0.04);        // manga del uniforme (antebrazo)
    add(a, bx(0.115, 0.115, 0.2, skin), 0, 0, -0.2);         // muñeca/antebrazo (piel)
    add(a, bx(0.13, 0.075, 0.16, skin), 0, 0, -0.36);        // mano
    add(a, bx(0.045, 0.06, 0.08, skin), -s * 0.08, 0, -0.33); // pulgar
    if (s > 0) add(a, bx(0.17, 0.03, 0.17, cloth), 0, -0.06, -0.4); // trapo amarillo en la mano derecha
    a.position.set(s * 0.27, -0.36, -0.6);
    a.rotation.set(-0.55, s * 0.16, s * 0.12);
    a.userData.base = { pos: a.position.clone(), rot: a.rotation.clone() };
    return a;
  };
  HANDS.userData.armR = buildArm(1);
  HANDS.userData.armL = buildArm(-1);
  HANDS.add(HANDS.userData.armR, HANDS.userData.armL);
}
function updateHands(dt, t) {
  HANDS.visible = G.started && !G.over && !G.uiOpen && !G.dialogOpen;
  if (!HANDS.visible) return;
  // velocidad del jugador (0..1) para el balanceo al andar
  const dpx = G.px - (G._ppx ?? G.px), dpz = G.pz - (G._ppz ?? G.pz);
  G._ppx = G.px; G._ppz = G.pz;
  const spd = Math.min(1, Math.hypot(dpx, dpz) / Math.max(dt, 0.001) / 3.2);
  G._spd = (G._spd ?? 0) + (spd - (G._spd ?? 0)) * 0.2;
  const work = (G._work = (G._work ?? 0) + ((G.working ? 1 : 0) - (G._work ?? 0)) * 0.25);
  HANDS.position.y = Math.sin(t * 8) * 0.012 * G._spd;
  HANDS.position.x = Math.cos(t * 4) * 0.008 * G._spd;
  for (const [a, s] of [[HANDS.userData.armR, 1], [HANDS.userData.armL, -1]]) {
    const b = a.userData.base, ph = t * 13 + (s < 0 ? 0.7 : 0);
    a.position.z = b.pos.z + Math.sin(ph) * 0.05 * work;
    a.position.y = b.pos.y + Math.abs(Math.sin(ph)) * 0.035 * work + Math.sin(t * 8 + (s < 0 ? 1 : 0)) * 0.006 * G._spd;
    a.rotation.x = b.rot.x + Math.sin(ph) * 0.32 * work;
  }
}

const clock = new THREE.Clock();
let hudTimer = 0;
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;
  if (G.started && !G.over) {
    G.time = Math.min(G.time + dt * TIME_RATE, SHIFT_END); // minutos de juego
    if (G.time >= SHIFT_END) endShift('fin');
    if (G.combo > 0 && t - G.lastTaskAt > COMBO_WINDOW) breakCombo();  // se enfría la cadena
    if (!G.uiOpen && !G.dialogOpen) {
      movePlayer(dt);
      updateInteraction(dt);
    }
    hudTimer += dt;
    if (hudTimer > 0.4) { hudTimer = 0; updateHUD(); refreshChecklist(); updateObjectiveHUD(); }
  }
  updateNPCs(dt, t);
  updateFX(dt);
  updateMarkers(t);
  const fy = G.floor * FH;
  camera.position.set(G.px, fy + EYE, G.pz);
  camera.rotation.set(G.pitch, G.yaw, 0);
  updateHands(dt, t);
  faceNPCsToCamera();
  renderer.render(scene, camera);
}
loop();
