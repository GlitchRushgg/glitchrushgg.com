// Bilingüe es/en. Idioma por defecto = navegador, con respaldo a español.
// La elección se guarda en localStorage. Todo texto visible pasa por t().

const STRINGS = {
  es: {
    title: "RICOCHET RUSH",
    tagline: "Cada bala rebota. El enjambre no para.\n¿Cuánto aguantas?",
    play: "JUGAR",
    shop: "MEJORAS",
    best: "Récord",
    coins: "monedas",
    howtoMove: "MUÉVETE: WASD / flechas / mantén el dedo",
    howtoShoot: "Disparas solo — las balas REBOTAN en las paredes",
    howtoXP: "Recoge las gemas 💚 y elige tu mejora",
    paused: "PAUSA",
    resume: "TOCA PARA SEGUIR",
    gameOver: "TE ATRAPARON",
    survived: "Sobreviviste",
    kills: "bajas",
    level: "NIVEL",
    newRecord: "¡NUEVO RÉCORD!",
    earned: "+{n} monedas",
    playAgain: "OTRA VEZ",
    menu: "MENÚ",
    share: "COMPARTIR",
    shareText: "Sobreviví {t} al enjambre en RICOCHET RUSH 🔥 {k} bajas y {c} carambolas 🎱 ¿Puedes superarme?",
    levelUp: "¡NIVEL {n}!",
    choosePerk: "Elige una mejora",
    eliteWarn: "¡ÉLITE!",
    up_dmg: "POTENCIA", up_dmg_d: "+25% de daño",
    up_rate: "CADENCIA", up_rate_d: "+20% velocidad de disparo",
    up_bounce: "REBOTE", up_bounce_d: "+1 rebote por bala",
    up_multi: "MULTIDISPARO", up_multi_d: "+1 bala por ráfaga",
    up_pierce: "PERFORACIÓN", up_pierce_d: "Las balas atraviesan +1 enemigo",
    up_speed: "AGILIDAD", up_speed_d: "+10% velocidad de movimiento",
    up_magnet: "IMÁN", up_magnet_d: "+40% radio de recogida",
    up_hp: "CORAZÓN", up_hp_d: "+1 corazón y cura total",
    up_heal: "CURA", up_heal_d: "Recupera 1 corazón",
    caramb: "¡CARAMBOLA!",
    carambs: "carambolas",
    pk_vit: "VITALIDAD", pk_vit_d: "+1 corazón inicial",
    pk_pow: "POTENCIA", pk_pow_d: "+10% daño base",
    pk_agi: "AGILIDAD", pk_agi_d: "+8% velocidad",
    pk_luck: "FORTUNA", pk_luck_d: "+50% monedas",
    buyFor: "MEJORAR · {n}",
    maxed: "MÁXIMO",
    notEnough: "Te faltan monedas",
    back: "VOLVER",
    lvlTag: "Nv {n}/3",
  },
  en: {
    title: "RICOCHET RUSH",
    tagline: "Every bullet ricochets. The swarm never stops.\nHow long can you survive?",
    play: "PLAY",
    shop: "UPGRADES",
    best: "Best",
    coins: "coins",
    howtoMove: "MOVE: WASD / arrows / hold to steer",
    howtoShoot: "You fire automatically — bullets BOUNCE off walls",
    howtoXP: "Grab the gems 💚 and pick your upgrade",
    paused: "PAUSED",
    resume: "TAP TO RESUME",
    gameOver: "OVERRUN",
    survived: "Survived",
    kills: "kills",
    level: "LEVEL",
    newRecord: "NEW RECORD!",
    earned: "+{n} coins",
    playAgain: "RETRY",
    menu: "MENU",
    share: "SHARE",
    shareText: "I survived {t} against the swarm in RICOCHET RUSH 🔥 {k} kills, {c} bank shots 🎱 Can you beat me?",
    levelUp: "LEVEL {n}!",
    choosePerk: "Pick an upgrade",
    eliteWarn: "ELITE!",
    up_dmg: "POWER", up_dmg_d: "+25% damage",
    up_rate: "FIRE RATE", up_rate_d: "+20% attack speed",
    up_bounce: "RICOCHET", up_bounce_d: "+1 bounce per bullet",
    up_multi: "MULTISHOT", up_multi_d: "+1 bullet per volley",
    up_pierce: "PIERCE", up_pierce_d: "Bullets pierce +1 enemy",
    up_speed: "AGILITY", up_speed_d: "+10% move speed",
    up_magnet: "MAGNET", up_magnet_d: "+40% pickup radius",
    up_hp: "HEART", up_hp_d: "+1 heart and full heal",
    up_heal: "HEAL", up_heal_d: "Restore 1 heart",
    caramb: "BANK SHOT!",
    carambs: "bank shots",
    pk_vit: "VITALITY", pk_vit_d: "+1 starting heart",
    pk_pow: "POWER", pk_pow_d: "+10% base damage",
    pk_agi: "AGILITY", pk_agi_d: "+8% move speed",
    pk_luck: "LUCK", pk_luck_d: "+50% coins",
    buyFor: "UPGRADE · {n}",
    maxed: "MAXED",
    notEnough: "Not enough coins",
    back: "BACK",
    lvlTag: "Lv {n}/3",
  },
};

const LANG_KEY = "rr_lang";

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

export function t(key, vars) {
  let s = (STRINGS[current] && STRINGS[current][key]) || STRINGS.en[key] || key;
  if (vars) for (const k in vars) s = s.replace(`{${k}}`, vars[k]);
  return s;
}
