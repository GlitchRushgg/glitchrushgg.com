// Bilingüe es/en. Idioma por defecto = navegador, con respaldo a español.
// La elección se guarda en localStorage. Todo texto visible pasa por t().

const STRINGS = {
  es: {
    title: "GLITCH SHIFT",
    tagline: "Dos realidades. Un toque.\n¿Hasta dónde puedes llegar?",
    play: "JUGAR",
    shop: "TIENDA",
    best: "Récord",
    bits: "bits",
    howto1: "TOCA (o ESPACIO) = cambiar de realidad",
    howto2: "MANTÉN = OVERCLOCK (cámara lenta)",
    howto3: "Esquiva tu carril · los roces recargan energía",
    hintShift: "¡TOCA PARA CAMBIAR!",
    hintHold: "MANTÉN PULSADO = OVERCLOCK",
    sector: "SECTOR {n}",
    overclock: "OVERCLOCK",
    paused: "PAUSA",
    resume: "TOCA PARA SEGUIR",
    gameOver: "SEÑAL PERDIDA",
    meters: "m",
    newRecord: "¡NUEVO RÉCORD!",
    earned: "+{n} bits",
    playAgain: "OTRA VEZ",
    menu: "MENÚ",
    share: "COMPARTIR",
    shareText: "Aguanté {m} m entre dos realidades en GLITCH SHIFT ⚡ ¿Puedes superarme?",
    closeCall: "¡CERCA!",
    shieldOn: "¡ESCUDO!",
    skins: "SKINS",
    trails: "ESTELAS",
    equip: "EQUIPAR",
    equipped: "EQUIPADO",
    buy: "{n} bits",
    notEnough: "Te faltan bits",
    back: "VOLVER",
  },
  en: {
    title: "GLITCH SHIFT",
    tagline: "Two realities. One tap.\nHow far can you shift?",
    play: "PLAY",
    shop: "SHOP",
    best: "Best",
    bits: "bits",
    howto1: "TAP (or SPACE) = shift reality",
    howto2: "HOLD = OVERCLOCK (slow motion)",
    howto3: "Dodge your lane · close calls recharge energy",
    hintShift: "TAP TO SHIFT!",
    hintHold: "HOLD = OVERCLOCK",
    sector: "SECTOR {n}",
    overclock: "OVERCLOCK",
    paused: "PAUSED",
    resume: "TAP TO RESUME",
    gameOver: "SIGNAL LOST",
    meters: "m",
    newRecord: "NEW RECORD!",
    earned: "+{n} bits",
    playAgain: "RETRY",
    menu: "MENU",
    share: "SHARE",
    shareText: "I survived {m} m between two realities in GLITCH SHIFT ⚡ Can you beat me?",
    closeCall: "CLOSE!",
    shieldOn: "SHIELD!",
    skins: "SKINS",
    trails: "TRAILS",
    equip: "EQUIP",
    equipped: "EQUIPPED",
    buy: "{n} bits",
    notEnough: "Not enough bits",
    back: "BACK",
  },
};

const LANG_KEY = "gs_lang";

function detect() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === "es" || saved === "en") return saved;
  } catch (e) { /* sin storage */ }
  const nav = (navigator.language || "es").toLowerCase();
  return nav.startsWith("es") ? "es" : "en";
}

let current = detect();

export function getLang() {
  return current;
}

export function toggleLang() {
  current = current === "es" ? "en" : "es";
  try { localStorage.setItem(LANG_KEY, current); } catch (e) { /* sin storage */ }
  return current;
}

// t("best") -> texto; admite interpolación {var}: t("shareText", {m: 42})
export function t(key, vars) {
  let s = (STRINGS[current] && STRINGS[current][key]) || STRINGS.en[key] || key;
  if (vars) for (const k in vars) s = s.replace(`{${k}}`, vars[k]);
  return s;
}
