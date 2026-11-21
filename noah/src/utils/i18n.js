// i18n ligero para Noah (ES/EN). Idioma: localStorage 'noah-lang' o el del navegador.
const STRINGS = {
  es: {
    play: '▶  JUGAR',
    highScores: '🏆 RÉCORDS',
    noScores: 'Aún sin récords —\n¡juega y sal en la tabla!',
    arkSafe: '⛵ El Arca — a salvo',
    hook: 'Rescata a los animales y llega al Arca\n¡antes de que te trague el agua! 🌊',
    freeTag: 'Gratis · Sin descargas · Toca y juega',
    level: 'Nivel', score: 'Puntos', animals: 'Animales',
    jumpHint: '¡Salta para llegar al Arca!', waterRising: '~ ¡SUBE EL AGUA! ~',
    calm: '☀️ ¡CALMA!', shield: '🫧 ¡Escudo!', saved: '🫧 ¡Salvado!', superJump: '🦘 ¡SÚPER SALTO!',
    combo: 'COMBO', golden: '¡DORADO!', allRescued: '🐾 ¡TODOS RESCATADOS!', storm: '⛈️ ¡TORMENTA!',
    levelComplete: n => `¡Nivel ${n} completado!`,
    animalsScore: (a, s) => `Animales salvados: ${a}   Puntos: ${s}`,
    rank: r => `¡Puesto #${r} en la tabla!`,
    nextLevel: 'Siguiente nivel →', shareCard: '📸  Compartir', mainMenu: 'Menú principal',
    screenshotTt: '📸  ¡Haz captura y súbela a TikTok!',
    gameOver: 'FIN DEL JUEGO', reachedLevel: n => `Llegaste al Nivel ${n}`, newRecord: '🏆 ¡NUEVO RÉCORD!',
    tryAgain: '↺  Reintentar',
    jump: 'SALTAR', lvAbbr: 'Niv.',
    shareTextWin: (a, l, s) => `🦁 ¡Rescaté ${a} animales y superé el nivel ${l} con ${s} puntos en Don't Drown, Noah! ¿Puedes superarme?`,
    shareTextGO: (a, l) => `🐾 ¡Salvé ${a} animales de la inundación (nivel ${l}) en Don't Drown, Noah! ¿Puedes superarme? #DontDrownNoah`,
    animalsSaved: a => (a === 1 ? 'ANIMAL SALVADO' : 'ANIMALES SALVADOS'),
    scoreSmall: s => `Puntos ${s}`,
    linkCopied: '¡Enlace copiado! 📋  Haz captura de la tarjeta y súbela a TikTok',
    imgSaved: '¡Imagen guardada! 📁  Súbela a TikTok con #DontDrownNoah',
    dailyTitle: n => `🌅 ARCA DEL DÍA #${n}`,
    dailyBtn: n => `🌅  ARCA DEL DÍA #${n}`,
    dailySub: 'El mismo mundo para todos hoy',
    dailyBest: (a, k) => `Tu mejor de hoy: 🐾 ${a}  ·  Intento ${k}`,
    dailyNone: 'Aún no la has jugado hoy',
    dailyNewBest: '🌅 ¡MEJOR DE HOY!',
    nextDaily: t => `Nueva Arca del Día en ${t}`,
    shareTextDaily: (n, a) => `🌅 Arca del Día #${n}: ¡salvé ${a} animales en Don't Drown, Noah! Hoy todos juegan el mismo mundo. ¿Puedes superarme? #DontDrownNoah`,
    themes: { Sunny: 'Soleado', Sunset: 'Atardecer', Dusk: 'Anochecer', Night: 'Noche', Storm: 'Tormenta', Aurora: 'Aurora', Dawn: 'Amanecer' },
  },
  en: {
    play: '▶  PLAY',
    highScores: '🏆 HIGH SCORES',
    noScores: 'No scores yet —\nplay to top the board!',
    arkSafe: '⛵ The Ark — safe & dry',
    hook: 'Rescue the animals and reach the Ark\nbefore the flood swallows you! 🌊',
    freeTag: 'Free · No download · Tap and play',
    level: 'Level', score: 'Score', animals: 'Animals',
    jumpHint: 'Jump up to reach the Ark!', waterRising: '~ WATER RISING! ~',
    calm: '☀️ CALM!', shield: '🫧 Shield!', saved: '🫧 Saved!', superJump: '🦘 SUPER JUMP!',
    combo: 'COMBO', golden: 'GOLDEN!', allRescued: '🐾 ALL RESCUED!', storm: '⛈️ STORM!',
    levelComplete: n => `Level ${n} Complete!`,
    animalsScore: (a, s) => `Animals saved: ${a}   Score: ${s}`,
    rank: r => `Rank #${r} on the leaderboard!`,
    nextLevel: 'Next Level →', shareCard: '📸  Share', mainMenu: 'Main Menu',
    screenshotTt: '📸  Screenshot this to post on TikTok!',
    gameOver: 'GAME OVER', reachedLevel: n => `You reached Level ${n}`, newRecord: '🏆 NEW RECORD!',
    tryAgain: '↺  Try Again',
    jump: 'JUMP', lvAbbr: 'Lv.',
    shareTextWin: (a, l, s) => `🦁 I saved ${a} animals and beat level ${l} (${s} pts) in Don't Drown, Noah! Beat that. #DontDrownNoah`,
    shareTextGO: (a, l) => `🐾 I saved ${a} animals from the flood (level ${l}) in Don't Drown, Noah! Beat that. #DontDrownNoah`,
    animalsSaved: a => (a === 1 ? 'ANIMAL SAVED' : 'ANIMALS SAVED'),
    scoreSmall: s => `Score ${s}`,
    linkCopied: 'Link copied! 📋  Screenshot the card to post on TikTok!',
    imgSaved: 'Image saved! 📁  Post it on TikTok with #DontDrownNoah',
    dailyTitle: n => `🌅 DAILY ARK #${n}`,
    dailyBtn: n => `🌅  DAILY ARK #${n}`,
    dailySub: 'Same world for everyone today',
    dailyBest: (a, k) => `Today's best: 🐾 ${a}  ·  Attempt ${k}`,
    dailyNone: "You haven't played today's yet",
    dailyNewBest: "🌅 TODAY'S BEST!",
    nextDaily: t => `New Daily Ark in ${t}`,
    shareTextDaily: (n, a) => `🌅 Daily Ark #${n}: I saved ${a} animals in Don't Drown, Noah! Everyone plays the same world today. Beat that. #DontDrownNoah`,
    themes: { Sunny: 'Sunny', Sunset: 'Sunset', Dusk: 'Dusk', Night: 'Night', Storm: 'Storm', Aurora: 'Aurora', Dawn: 'Dawn' },
  },
};

export function noahLang() {
  const s = localStorage.getItem('noah-lang');
  if (s === 'es' || s === 'en') return s;
  return 'en'; // por defecto inglés (regla del estudio); el toggle ES/EN sigue disponible
}
export let LANG = noahLang();
export let T = STRINGS[LANG];
export function setNoahLang(l) {
  localStorage.setItem('noah-lang', l);
  LANG = l; T = STRINGS[l];
}
