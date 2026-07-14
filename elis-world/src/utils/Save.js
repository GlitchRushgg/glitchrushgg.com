// Persistence: wall paint + patterns, hung paintings, character positions,
// hora del día + clima. try/catch everywhere (blocked storage in some webviews).

import { ROOM_ORDER, PAINTS } from "../const.js";
import { CHAR_START } from "../data/rooms.js";

const KEY = "elizabethsWorld_v1";

const data = {
  mute: false,
  rooms: Object.fromEntries(ROOM_ORDER.map((r) => [r, { wall: PAINTS[0], pattern: "none", moved: {} }])),
  paintings: [],          // { room, x, y, art }
  items: [],              // { room, kind, x, y } comida y cacharros sueltos
  chars: JSON.parse(JSON.stringify(CHAR_START)),
  worn: {},               // name -> [accessory keys] (dress-up)
  sky: "day",             // day | sunset | night
  weather: "clear",       // clear | rain | snow | cloudy
  visits: 0,
};
try {
  const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
  Object.assign(data, raw);
  for (const r of ROOM_ORDER) {
    if (!data.rooms[r]) data.rooms[r] = { wall: PAINTS[0], pattern: "none", moved: {} };
    if (!data.rooms[r].moved) data.rooms[r].moved = {};
  }
  for (const c of Object.keys(CHAR_START)) if (!data.chars[c]) data.chars[c] = { ...CHAR_START[c] };
  // La familia salió del juego (encargo fundadora: solo Eli y sus juguetes) →
  // purgar a quien ya no exista, o una casa guardada los resucitaría sin textura.
  for (const c of Object.keys(data.chars)) if (!CHAR_START[c]) delete data.chars[c];
  if (!data.worn) data.worn = {};
  if (!Array.isArray(data.items)) data.items = [];
  for (const c of Object.keys(data.worn)) if (!CHAR_START[c]) delete data.worn[c];
  // migración del interruptor día/noche viejo → hora + clima
  if (data.night !== undefined) { if (data.night && !raw.sky) data.sky = "night"; delete data.night; }
  if (!data.sky) data.sky = "day";
  if (!data.weather) data.weather = "clear";
} catch (e) {}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
}

// Wipe everything (soft reset button in the dress-up bar).
function reset() {
  try { localStorage.removeItem(KEY); } catch (e) {}
}

export const Save = { get: () => data, persist, reset };
