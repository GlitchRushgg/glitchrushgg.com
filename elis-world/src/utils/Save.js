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
} catch (e) {}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
}

export const Save = { get: () => data, persist };
