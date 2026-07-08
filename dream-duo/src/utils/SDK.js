// CrazyGames SDK v3 wrapper. The <script> only loads on crazygames domains /
// localhost (see index.html), so off-platform everything no-ops and rewarded
// callbacks grant instantly — the game is always playable.

let sdk = null, avail = false;

export const SDK = {
  async init() {
    try {
      if (window.CrazyGames && window.CrazyGames.SDK) {
        sdk = window.CrazyGames.SDK;
        await sdk.init();
        avail = sdk.environment !== "disabled";
      }
    } catch (e) { avail = false; }
  },
  get available() { return avail; },
  loadingStart() { try { if (avail) sdk.game.loadingStart(); } catch (e) {} },
  loadingStop()  { try { if (avail) sdk.game.loadingStop(); } catch (e) {} },
  gameplayStart(){ try { if (avail) sdk.game.gameplayStart(); } catch (e) {} },
  gameplayStop() { try { if (avail) sdk.game.gameplayStop(); } catch (e) {} },
  happyTime()    { try { if (avail) sdk.game.happytime(); } catch (e) {} },
  rewardedAd(onReward, onFail) {
    if (!avail) { onReward && onReward(); return; }
    try {
      sdk.ad.requestAd("rewarded", {
        adFinished: () => onReward && onReward(),
        adError: () => onFail && onFail(),
        adStarted: () => {},
      });
    } catch (e) { onFail && onFail(); }
  },
  midgameAd(done) {
    if (!avail) { done && done(); return; }
    try {
      sdk.ad.requestAd("midgame", {
        adFinished: () => done && done(),
        adError: () => done && done(),
        adStarted: () => {},
      });
    } catch (e) { done && done(); }
  },
  async invite(params) {
    if (!avail) return null;
    try { return await sdk.game.inviteLink(params || {}); } catch (e) { return null; }
  },
};
