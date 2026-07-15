/* ============================================================
   CrazyGames SDK v3 wrapper.
   On crazygames.com: real ads + platform signals.
   Anywhere else: silently no-ops and grants rewards instantly,
   so the game is always playable (local file, itch, etc.).
   init() NEVER blocks the game (timeout-guarded).
   ============================================================ */
const BR = {};
BR.SDK = (function () {
  let sdk = null, avail = false;

  async function init() {
    try {
      if (window.CrazyGames && window.CrazyGames.SDK) {
        sdk = window.CrazyGames.SDK;
        // never let a hung SDK block the game (e.g. file:// pages)
        const inited = await Promise.race([
          sdk.init().then(() => true),
          new Promise(r => setTimeout(() => r(false), 3000)),
        ]);
        // solo tocar sdk.environment si init terminó: leerlo antes hace que el
        // SDK imprima "CrazySDK is not initialized yet" en consola
        avail = inited && !!sdk.environment && sdk.environment !== 'disabled';
      }
    } catch (e) { avail = false; }
  }

  const safe = (fn) => { try { fn && fn(); } catch (e) {} };

  return {
    init,
    get available() { return avail; },
    loadingStart() { if (avail) safe(() => sdk.game.sdkGameLoadingStart()); },
    loadingStop()  { if (avail) safe(() => sdk.game.sdkGameLoadingStop()); },
    gameplayStart(){ if (avail) safe(() => sdk.game.gameplayStart()); },
    gameplayStop() { if (avail) safe(() => sdk.game.gameplayStop()); },
    happyTime()    { if (avail) safe(() => sdk.game.happytime()); },

    rewardedAd(onReward, onFail) {
      if (!avail) { onReward && onReward(); return; }
      try {
        sdk.ad.requestAd('rewarded', {
          adFinished: () => onReward && onReward(),
          adError:    () => onFail && onFail(),
          adStarted:  () => {},
        });
      } catch (e) { onFail && onFail(); }
    },

    midgameAd(done) {
      if (!avail) { done && done(); return; }
      try {
        sdk.ad.requestAd('midgame', {
          adFinished: () => done && done(),
          adError:    () => done && done(),
          adStarted:  () => {},
        });
      } catch (e) { done && done(); }
    },

    async invite(params) {
      if (!avail) return null;
      try { return sdk.game.inviteLink(params || {}); } catch (e) { return null; }
    },
  };
})();

