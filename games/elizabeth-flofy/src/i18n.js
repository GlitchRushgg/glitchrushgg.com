// Bilingüe es/en. Idioma por defecto = navegador, con respaldo a español.
// La elección se guarda en localStorage. Todo texto visible pasa por t().

const STRINGS = {
  es: {
    subtitle: "Glitch Rush",
    tagline: "¡Ayuda a Flofy a purificar el GLITCH!",
    tapToPlay: "TOCA PARA JUGAR",
    howto1: "Toca los objetos glitcheados 🟪",
    howto2: "Flofy los purifica con un abrazo 🐰",
    howto3: "Si uno se escapa, ¡pierdes un corazón! 💔",
    best: "Récord",
    score: "Puntos",
    combo: "Combo",
    sparks: "Chispas",
    megaReady: "¡ABRAZO TOTAL listo! Toca a Flofy",
    megaHug: "¡ABRAZO TOTAL!",
    purified: "¡PURIFICADO!",
    gameOver: "¡Fin del turno!",
    newRecord: "¡NUEVO RÉCORD!",
    playAgain: "JUGAR DE NUEVO",
    menu: "MENÚ",
    glitchesPurified: "Glitches purificados",
    // Power-ups (familia)
    puMama: "¡Mamá te cura! +1 ❤️",
    puPapa: "¡Norman te escuda! 🛡️",
    puCristian: "¡Cristian alcanza los altos! ✨",
    tapShare: "COMPARTIR",
    shareText: "¡Purifiqué {score} glitches en Elizabeth & Flofy: Glitch Rush! 🐰⚡",
  },
  en: {
    subtitle: "Glitch Rush",
    tagline: "Help Flofy purify the GLITCH!",
    tapToPlay: "TAP TO PLAY",
    howto1: "Tap the glitched objects 🟪",
    howto2: "Flofy purifies them with a hug 🐰",
    howto3: "If one escapes, you lose a heart! 💔",
    best: "Best",
    score: "Score",
    combo: "Combo",
    sparks: "Sparks",
    megaReady: "SUPER HUG ready! Tap Flofy",
    megaHug: "SUPER HUG!",
    purified: "PURIFIED!",
    gameOver: "Shift over!",
    newRecord: "NEW RECORD!",
    playAgain: "PLAY AGAIN",
    menu: "MENU",
    glitchesPurified: "Glitches purified",
    puMama: "Mom heals you! +1 ❤️",
    puPapa: "Norman shields you! 🛡️",
    puCristian: "Cristian reaches the tall ones! ✨",
    tapShare: "SHARE",
    shareText: "I purified {score} glitches in Elizabeth & Flofy: Glitch Rush! 🐰⚡",
  },
};

const LANG_KEY = "ef_lang";

function detect() {
  const saved = localStorage.getItem(LANG_KEY);
  if (saved === "es" || saved === "en") return saved;
  const nav = (navigator.language || "es").toLowerCase();
  return nav.startsWith("en") ? "en" : "es";
}

let current = detect();

export function getLang() {
  return current;
}

export function setLang(lang) {
  current = lang === "en" ? "en" : "es";
  localStorage.setItem(LANG_KEY, current);
}

export function toggleLang() {
  setLang(current === "es" ? "en" : "es");
  return current;
}

// t("score") -> texto; admite interpolación {var}: t("shareText", {score: 42})
export function t(key, vars) {
  let s = (STRINGS[current] && STRINGS[current][key]) || STRINGS.es[key] || key;
  if (vars) for (const k in vars) s = s.replace(`{${k}}`, vars[k]);
  return s;
}
