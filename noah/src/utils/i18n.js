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
    shareTextGO: (s, l) => `🌊 ¡Hice ${s} puntos y llegué al nivel ${l} en Don't Drown, Noah! ¿Puedes superarme?`,
    linkCopied: '¡Enlace copiado! 📋  Haz captura de la tarjeta y súbela a TikTok',
    imgSaved: '¡Imagen guardada! 📁  Súbela a TikTok con #DontDrownNoah',
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
    shareTextWin: (a, l, s) => `🦁 I rescued ${a} animals and beat level ${l} with ${s} pts in Don't Drown, Noah! Can you beat me?`,
    shareTextGO: (s, l) => `🌊 I scored ${s} pts and reached level ${l} in Don't Drown, Noah! Can you beat me?`,
    linkCopied: 'Link copied! 📋  Screenshot the card to post on TikTok!',
    imgSaved: 'Image saved! 📁  Post it on TikTok with #DontDrownNoah',
    themes: { Sunny: 'Sunny', Sunset: 'Sunset', Dusk: 'Dusk', Night: 'Night', Storm: 'Storm', Aurora: 'Aurora', Dawn: 'Dawn' },
  },
};

export function noahLang() {
  const s = localStorage.getItem('noah-lang');
  if (s === 'es' || s === 'en') return s;
  return (navigator.language || 'en').toLowerCase().startsWith('es') ? 'es' : 'en';
}
export let LANG = noahLang();
export let T = STRINGS[LANG];
export function setNoahLang(l) {
  localStorage.setItem('noah-lang', l);
  LANG = l; T = STRINGS[l];
}
