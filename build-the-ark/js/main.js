/* ==================== MAIN / BOOT / LOOP ==================== */
(function () {
  const $ = UI.$;
  const S = Game.state;

  /* ---------- Simple WebAudio SFX (no asset files needed) ---------- */
  const Sound = (function () {
    let ctx;
    function ac() { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); return ctx; }
    function beep(freq, dur, type, vol) {
      if (!S.sound) return;
      try {
        const c = ac(), o = c.createOscillator(), g = c.createGain();
        o.type = type || 'square'; o.frequency.value = freq;
        g.gain.value = vol || 0.05;
        o.connect(g); g.connect(c.destination);
        o.start();
        g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + (dur || 0.08));
        o.stop(c.currentTime + (dur || 0.08));
      } catch (e) {}
    }
    return {
      chop: () => beep(170 + Math.random() * 50, 0.06, 'triangle', 0.06),
      buy:  () => { beep(520, 0.06, 'square', 0.05); setTimeout(() => beep(720, 0.08, 'square', 0.05), 60); },
      win:  () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.14, 'sine', 0.06), i * 90)); },
      resume: () => { try { ac().resume(); } catch (e) {} }
    };
  })();

  /* ---------- Boot sequence ---------- */
  Icons.hydrate(); // inject SVG icons into all [data-icon] elements

  const tips = ['Gathering the first planks…', 'Summoning the crew…', 'Checking the weather…', 'Blessing the timber…'];
  let boot = 0;
  const bootTimer = setInterval(() => {
    boot += Math.random() * 22 + 8;
    $('loaderFill').style.width = Math.min(boot, 100) + '%';
    $('loaderTip').textContent = tips[Math.floor(Math.random() * tips.length)];
    if (boot >= 100) { clearInterval(bootTimer); finishBoot(); }
  }, 220);

  async function initSDK() { Ark.SDK.loadingStart(); await Ark.SDK.init(); }
  const sdkReady = initSDK();

  async function finishBoot() {
    Game.load();
    $('setSound').checked = S.sound;

    const off = Game.computeOffline();
    await sdkReady; // sin esto, loadingStop/gameplayStart podían dispararse antes de init (señales perdidas en CrazyGames)
    Ark.SDK.loadingStop();
    $('loader').classList.add('hidden');
    $('game').classList.remove('hidden');
    Ark.SDK.gameplayStart();

    // canvas world
    Scene.init($('scene'), {
      onWood: onWoodCollect,
      onSurvivor: onSurvivorRescued,
      onSurvivorGone: scheduleSurvivor,
    });
    Scene.setBuild(S.arkStage, Game.arkProgress().pct);

    fullRender();
    wire();

    if (off) {
      $('offlineTime').textContent = 'You were gone ' + fmtTime(off.seconds) +
        (off.seconds >= Game.offlineCap() - 5 ? ' (max)' : '');
      $('offlineWood').textContent = fmt(off.earned);
      pendingOffline = off.earned;
      UI.show('offlineModal');
      dailyQueued = true; // show daily after the offline modal closes
    } else {
      maybeShowDaily();
    }

    scheduleSurvivor();
    startLoop();
  }

  /* ---------- Render helpers ---------- */
  function fullRender() { UI.renderHUD(); UI.renderArk(); UI.renderShops(); }

  /* ---------- Collecting floating wood ---------- */
  function onWoodCollect(e) {
    Sound.resume();
    const gain = Game.chop();
    Sound.chop();
    UI.floatNum(e.clientX, e.clientY, '+' + fmt(gain));
    UI.renderHUD(); UI.renderArk();
  }

  /* ---------- Survivors (random rescue event) ---------- */
  let survivorTimer;
  function scheduleSurvivor() {
    clearTimeout(survivorTimer);
    survivorTimer = setTimeout(() => {
      if (!Scene.spawnSurvivor()) scheduleSurvivor();
    }, 40000 + Math.random() * 60000); // 40–100s
  }
  function onSurvivorRescued(e) {
    Sound.win();
    Ark.SDK.happyTime();
    UI.burst(e.clientX, e.clientY, 'star4', 12);
    const roll = Math.random();
    if (roll < 0.4) {
      Game.setFrenzy(30);
      UI.toast('Rescued! They point out debris — FRENZY ×7 for 30s!');
    } else {
      // survivor joins the crew: +1 of a random unlocked worker tier
      const gens = Game.DATA.generators;
      let maxIdx = 0;
      gens.forEach((g, i) => { if (S.gens[g.id] > 0) maxIdx = Math.max(maxIdx, i); });
      const pick = gens[Math.floor(Math.random() * (maxIdx + 1))];
      S.gens[pick.id]++;
      UI.toast('Rescued! A ' + pick.name + ' joins your crew!');
    }
    fullRender();
    scheduleSurvivor();
  }

  /* ---------- Frenzy badge ---------- */
  let frenzyShown = false;
  function updateFrenzyBadge() {
    const b = $('frenzyBadge');
    if (Game.frenzyActive()) {
      if (!frenzyShown) { b.innerHTML = Icons.svg('flame', 15) + '<span></span>'; frenzyShown = true; }
      b.classList.remove('hidden');
      b.querySelector('span').textContent = ' FRENZY ×7 — ' + Math.ceil(Game.frenzyRemaining()) + 's';
    } else { b.classList.add('hidden'); frenzyShown = false; }
    Scene.setWeather(Game.frenzyActive());
  }

  /* ---------- Daily reward ---------- */
  function maybeShowDaily() {
    const r = Game.dailyReward();
    if (!r) return;
    Game.claimDaily();
    $('chestIco').innerHTML = Icons.svg('cal', 46);
    $('chestTitle').textContent = 'Daily Blessing!';
    const sub = $('chestSub');
    sub.classList.remove('hidden');
    sub.textContent = r.streak > 1
      ? r.streak + '-day streak! Come back tomorrow for more.'
      : 'Come back tomorrow to grow your streak!';
    $('chestReward').innerHTML = Icons.svg('log', 20) + ' +' + fmt(r.amount);
    pendingChest = 0; // already applied by claimDaily
    UI.show('chestModal');
    Sound.win();
  }

  /* ---------- Part built (celebration) ---------- */
  Game.onArkComplete = function (part, builtCount) {
    Sound.win();
    Ark.SDK.happyTime();
    Scene.buildFx();
    $('msIco').innerHTML = Icons.svg('boat', 50);
    $('msTitle').textContent = 'Part Built!';
    $('msText').textContent = 'You raised ' + part.name + '!';
    $('msReward').textContent = builtCount >= Game.DATA.arkStages.length
      ? 'The Ark is ready to sail!'
      : '×' + part.mult + ' all wood';
    UI.show('milestoneModal');
    UI.burst(window.innerWidth / 2, window.innerHeight / 2, 'star', 14);
  };

  /* ---------- Event wiring ---------- */
  let pendingOffline = 0;
  let pendingChest = 0;
  let dailyQueued = false;

  function wire() {
    // Tabs
    document.querySelectorAll('.tab').forEach(t => {
      t.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
        document.querySelectorAll('.tab-page').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        $('page-' + t.dataset.tab).classList.add('active');
      });
    });

    // Shop buys (event delegation)
    $('panel').addEventListener('click', (e) => {
      const bp = e.target.closest('[data-buildpart]');
      const bm = e.target.closest('[data-mult]');
      const bg = e.target.closest('[data-buygen]');
      const bt = e.target.closest('[data-buytap]');
      const bl = e.target.closest('[data-blessing]');
      if (bp) {
        const part = Game.buildPart();
        if (part) { Game.save(); fullRender(); }
        else UI.toast('Keep collecting wood!');
      } else if (bm) {
        UI.buyAmount = bm.dataset.mult === 'max' ? Infinity : parseInt(bm.dataset.mult, 10);
        UI.renderCrew();
      } else if (bg) {
        const n = Game.buyGen(bg.dataset.buygen, UI.buyAmount);
        if (n > 0) { Sound.buy(); if (n > 1) UI.toast('Hired ×' + n + '!'); fullRender(); }
        else UI.toast('Not enough wood');
      } else if (bt) {
        if (Game.buyTap(bt.dataset.buytap)) { Sound.buy(); UI.toast('Chop power upgraded!'); fullRender(); }
        else UI.toast('Not enough wood');
      } else if (bl) {
        if (Game.buyBlessing(bl.dataset.blessing)) { Sound.win(); UI.toast('Blessing acquired!'); fullRender(); }
        else UI.toast('Not enough Doves');
      }
    });

    // 2x Wood ad
    $('btnAd2x').addEventListener('click', () => {
      if (Game.boostActive()) { UI.toast('Boost already active!'); return; }
      Ark.SDK.rewardedAd(() => {
        Game.setBoost(60);
        UI.toast('2× wood for 60 seconds!');
        UI.burst(window.innerWidth / 2, 120, 'bolt', 10);
        UI.renderHUD();
      }, () => UI.toast('Ad not available — try later'));
    });

    // Free chest ad
    $('btnAdChest').addEventListener('click', () => {
      Ark.SDK.rewardedAd(() => {
        const reward = Math.max(Game.production() * 120, Game.tapPower() * 25, 50);
        pendingChest = reward;
        $('chestIco').innerHTML = Icons.svg('gift', 46);
        $('chestTitle').textContent = 'Free Chest!';
        $('chestSub').classList.add('hidden');
        $('chestReward').innerHTML = Icons.svg('log', 20) + ' +' + fmt(reward);
        UI.show('chestModal');
      }, () => UI.toast('Ad not available — try later'));
    });
    $('chestClaim').addEventListener('click', () => {
      Game.addWood(pendingChest); Sound.win(); UI.hide('chestModal'); fullRender();
    });

    // Offline modal
    const afterOffline = () => { if (dailyQueued) { dailyQueued = false; setTimeout(maybeShowDaily, 350); } };
    $('offlineClaim').addEventListener('click', () => {
      Game.addWood(pendingOffline); Sound.buy(); UI.hide('offlineModal'); fullRender(); afterOffline();
    });
    $('offlineDouble').addEventListener('click', () => {
      Ark.SDK.rewardedAd(() => {
        Game.addWood(pendingOffline * 2); Sound.win();
        UI.toast('Doubled!'); UI.hide('offlineModal'); fullRender(); afterOffline();
      }, () => { Game.addWood(pendingOffline); UI.hide('offlineModal'); fullRender(); afterOffline(); });
    });

    // Milestone modal
    $('msClaim').addEventListener('click', () => UI.hide('milestoneModal'));
    $('msShare').addEventListener('click', share);

    // Flood / prestige
    $('btnFlood').addEventListener('click', () => {
      const gain = Game.doveGain();
      if (gain <= 0) { UI.toast('Not enough lifetime wood yet'); return; }
      Ark.SDK.midgameAd(() => {
        const got = Game.flood();
        Sound.win();
        UI.burst(window.innerWidth / 2, window.innerHeight / 2, 'dove', 16);
        UI.toast('Your Ark set sail! +' + fmt(got) + ' Doves');
        Game.save(); fullRender();
      });
    });

    // Settings
    $('btnSettings').addEventListener('click', () => UI.show('settingsModal'));
    $('settingsClose').addEventListener('click', () => { Game.save(); UI.hide('settingsModal'); });
    $('setSound').addEventListener('change', (e) => { S.sound = e.target.checked; });
    $('btnShare2').addEventListener('click', share);
    // Back to glitchrushgg.com — only on the studio site, never inside the CrazyGames iframe.
    if (window.self === window.top) $('btnHome').addEventListener('click', () => { location.href = '/'; });
    else $('btnHome').classList.add('hidden');
    $('btnReset').addEventListener('click', () => {
      if (confirm('Reset ALL progress? This cannot be undone.')) {
        Game.reset(); location.reload();
      }
    });
    $('btnDove').addEventListener('click', () => {
      document.querySelector('.tab[data-tab="flood"]').click();
    });

    // Pause shop re-render while the user is touching/scrolling the panel
    const panel = $('panel');
    panel.addEventListener('pointerdown', () => panelBusy = true);
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev =>
      panel.addEventListener(ev, () => setTimeout(() => panelBusy = false, 120)));
    panel.addEventListener('scroll', () => {
      panelBusy = true; clearTimeout(scrollT);
      scrollT = setTimeout(() => panelBusy = false, 200);
    }, { passive: true });

    // Save on hide / unload
    document.addEventListener('visibilitychange', () => { if (document.hidden) Game.save(); });
    window.addEventListener('pagehide', Game.save);
    window.addEventListener('beforeunload', Game.save);
  }

  /* ---------- Share (viral loop) ---------- */
  async function share() {
    const built = S.arkStage;
    const stage = built > 0 ? Game.DATA.arkStages[built - 1].name : 'a bare raft';
    const text = `I'm building Noah's Ark — ${built}/${Game.DATA.arkStages.length} parts built (just raised ${stage}) with ${fmt(S.lifetime)} wood collected! Can you sail before me? 🌊`;
    let url = location.href;
    const cg = await Ark.SDK.invite({ stage, wood: Math.floor(S.lifetime) });
    if (cg) url = cg;
    try {
      if (navigator.share) { await navigator.share({ title: 'Build the Ark', text, url }); return; }
    } catch (e) {}
    try { await navigator.clipboard.writeText(text + ' ' + url); UI.toast('Copied! Share it with friends'); }
    catch (e) { UI.toast('Share: ' + url); }
  }

  /* ---------- Main loop ---------- */
  let panelBusy = false, scrollT;
  let lastTick = performance.now();
  let saveAccum = 0, uiAccum = 0;
  function startLoop() {
    function frame(now) {
      const dt = Math.min((now - lastTick) / 1000, 0.25);
      lastTick = now;

      const prod = Game.production();
      if (prod > 0) Game.addWood(prod * dt);

      uiAccum += dt;
      if (uiAccum >= 0.1) {
        uiAccum = 0;
        UI.renderHUD(); UI.renderArk(); updateFrenzyBadge();
        Scene.setBuild(S.arkStage, Game.arkProgress().pct);
        refreshAffordability();
      }

      saveAccum += dt;
      if (saveAccum >= 15) { saveAccum = 0; Game.save(); }

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // Re-render the visible shop only when needed: not while the user is
  // touching/scrolling it, and only when affordability plausibly changed.
  let affTick = 0, lastSig = '';
  function refreshAffordability() {
    if (++affTick % 3 !== 0) return; // ~every 300ms
    if (panelBusy) return;
    const active = document.querySelector('.tab.active').dataset.tab;
    const sig = active + '|' + Math.floor(Math.log10(S.wood + 1) * 10) + '|' + S.doves + '|' + UI.buyAmount
      + '|' + S.arkStage + '|' + Math.floor(Game.arkProgress().pct * 25);
    if (sig === lastSig) return;
    lastSig = sig;
    if (active === 'crew') UI.renderCrew();
    else if (active === 'build') UI.renderBuild();
    else if (active === 'flood') UI.renderFlood();
  }
})();
