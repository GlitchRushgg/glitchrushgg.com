// Persistence: wall paint + patterns, hung paintings, character positions.
// try/catch everywhere (blocked storage in some webviews).

import { ROOM_ORDER, PAINTS } from "../const.js";
import { CHAR_START } from "../data/rooms.js";

const KEY = "elizabethsWorld_v1";

const data = {
  mute: false,
  rooms: Object.fromEntries(ROOM_ORDER.map((r) => [r, { wall: PAINTS[0], pattern: "none", moved: {} }])),
  paintings: [],          // { room, x, y, art }
  chars: JSON.parse(JSON.stringify(CHAR_START)),
  worn: {},               // name -> [accessory keys] (dress-up)
  night: false,           // day/night toggle
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
  if (!data.worn) data.worn = {};
} catch (e) {}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
}

// Wipe everything (soft reset button in the dress-up bar).
function reset() {
  try { localStorage.removeItem(KEY); } catch (e) {}
}

export const Save = { get: () => data, persist, reset };
