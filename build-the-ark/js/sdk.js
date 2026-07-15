/* ============================================================
   CrazyGames SDK v3 wrapper — monetization + platform hooks.
   Falls back gracefully when run outside crazygames.com (local
   dev, itch.io, etc.) so the game is always playable.
   Docs: https://docs.crazygames.com/sdk/html5-v3/
   ============================================================ */
const Ark = window.Ark || {};
Ark.SDK = (function () {
  let sdk = null;
  let ready = false;
  let adInProgress = false;

  async function init() {
    try {
      if (window.CrazyGames && window.CrazyGames.SDK) {
        sdk = window.CrazyGames.SDK;
        // nunca dejar que un SDK colgado bloquee el juego (p.ej. file://)
        ready = await Promise.race([
          sdk.init().then(() => true),
          new Promise(r => setTimeout(() => r(false), 3000)),
        ]);
        if (ready) console.log('[Ark] CrazyGames SDK ready. Env:', sdk.environment);
      } else {
        console.log('[Ark] CrazyGames SDK not present — local fallback mode.');
      }
    } catch (e) {
      console.warn('[Ark] SDK init failed, fallback mode.', e);
    }
  }

  /* --- Loading lifecycle (tells CG when the game is ready) --- */
  function loadingStart() { try { ready && sdk.game.sdkGameLoadingStart(); } catch (e) {} }
  function loadingStop()  { try { ready && sdk.game.sdkGameLoadingStop(); } catch (e) {} }

  /* --- Gameplay session (improves ad targeting / analytics) --- */
  function gameplayStart() { try { ready && sdk.game.gameplayStart(); } catch (e) {} }
  function gameplayStop()  { try { ready && sdk.game.gameplayStop(); } catch (e) {} }

  /* --- Happy time: fire on wins / milestones (CG "engaged" signal) --- */
  function happyTime() { try { ready && sdk.game.happytime(); } catch (e) {} }

  /* --- Rewarded ad. onReward runs ONLY on a full successful view. --- */
  function rewardedAd(onReward, onSkipOrError) {
    if (adInProgress) return;
    // Fallback: no SDK -> grant reward instantly so local play works.
    if (!ready) { onReward && onReward(); return; }
    adInProgress = true;
    gameplayStop();
    sdk.ad.requestAd('rewarded', {
      adStarted: () => {},
      adFinished: () => { adInProgress = false; gameplayStart(); onReward && onReward(); },
      adError: (err) => { adInProgress = false; gameplayStart(); onSkipOrError && onSkipOrError(err); },
    });
  }

  /* --- Midgame (interstitial) ad. No reward; good on prestige/restart. --- */
  function midgameAd(onDone) {
    if (!ready) { onDone && onDone(); return; }
    gameplayStop();
    sdk.ad.requestAd('midgame', {
      adFinished: () => { gameplayStart(); onDone && onDone(); },
      adError: () => { gameplayStart(); onDone && onDone(); },
    });
  }

  /* --- Native share via CG invite link (viral loop) --- */
  async function invite(params) {
    try {
      if (ready && sdk.game.showInviteButton) {
        const link = await sdk.game.inviteLink(params || {});
        return link;
      }
    } catch (e) {}
    return null;
  }

  /* --- Persistent, cloud-synced storage on CG; localStorage otherwise --- */
  const store = {
    get(key) {
      try {
        if (ready && sdk.data) return sdk.data.getItem(key);
      } catch (e) {}
      return localStorage.getItem(key);
    },
    set(key, val) {
      try {
        if (ready && sdk.data) { sdk.data.setItem(key, val); return; }
      } catch (e) {}
      localStorage.setItem(key, val);
    },
    remove(key) {
      try { if (ready && sdk.data) { sdk.data.removeItem(key); return; } } catch (e) {}
      localStorage.removeItem(key);
    }
  };

  function isReady() { return ready; }

  return { init, loadingStart, loadingStop, gameplayStart, gameplayStop, happyTime,
           rewardedAd, midgameAd, invite, store, isReady };
})();
window.Ark = Ark;
