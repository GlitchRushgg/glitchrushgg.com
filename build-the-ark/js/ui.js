/* ==================== UI RENDERING ==================== */
const UI = (function () {
  const $ = (id) => document.getElementById(id);
  const S = Game.state;
  const logIc = (s) => Icons.svg('log', s || 13);
  const doveIc = (s) => Icons.svg('dove', s || 13);

  /* ---------- HUD ---------- */
  function renderHUD() {
    $('woodCount').textContent = fmt(S.wood);
    $('woodRate').textContent = fmt(Game.production()) + ' / sec';
    $('doveCount').textContent = fmt(S.doves);
    const b2 = $('btnAd2x');
    if (Game.boostActive()) {
      b2.classList.add('active-boost');
      b2.querySelector('small').textContent = fmtTime(Game.boostRemaining()) + ' left';
    } else {
      b2.classList.remove('active-boost');
      b2.querySelector('small').textContent = 'Watch ad · 60s';
    }
  }

  function renderArk() {
    const p = Game.arkProgress();
    if (p.maxed) {
      $('arkStageName').textContent = 'Ark Complete!';
      $('arkProgressFill').style.width = '100%';
      $('arkProgressText').textContent = 'Ready to Set Sail — earn your Doves!';
      return;
    }
    $('arkStageName').textContent = 'Next: ' + p.part.name;
    $('arkProgressFill').style.width = (p.pct * 100).toFixed(1) + '%';
    $('arkProgressText').textContent = fmt(p.have) + ' / ' + fmt(p.need) + ' wood';
  }

  /* ---------- SHOP LISTS ---------- */
  let buyAmount = 1; // 1 | 10 | Infinity

  function buildRow(g) {
    let qty = buyAmount === Infinity ? Math.max(1, Game.maxAffordable(g)) : buyAmount;
    const cost = Game.genCostN(g, qty);
    const can = S.wood >= cost && (buyAmount !== Infinity || Game.maxAffordable(g) > 0);
    const perSec = g.rate * Game.globalMult();
    return `<div class="shop-item ${can ? 'affordable' : ''}">
      <div class="si-ico">${Icons.svg(g.ico, 26)}</div>
      <div class="si-mid">
        <div class="si-name">${g.name} ${S.gens[g.id] > 0 ? `<span class="si-owned">×${S.gens[g.id]}</span>` : ''}</div>
        <div class="si-desc">${g.desc} · +${fmt(perSec)}/s each</div>
      </div>
      <button class="si-buy ${can ? '' : 'cant'}" data-buygen="${g.id}">
        <span class="si-cost">${logIc()} ${fmt(cost)}</span><small>BUY ×${qty}</small>
      </button>
    </div>`;
  }

  function buyMultRow() {
    const opts = [[1, '×1'], [10, '×10'], [Infinity, 'MAX']];
    return `<div class="buymult">` + opts.map(([v, l]) =>
      `<button data-mult="${v === Infinity ? 'max' : v}" class="${buyAmount === v ? 'on' : ''}">${l}</button>`
    ).join('') + `</div>`;
  }

  function tapRow(u) {
    const owned = S.taps[u.id];
    const can = !owned && S.wood >= u.base;
    return `<div class="shop-item ${owned ? '' : can ? 'affordable' : ''}" style="${owned ? 'opacity:.65' : ''}">
      <div class="si-ico">${Icons.svg(u.ico, 26)}</div>
      <div class="si-mid">
        <div class="si-name">${u.name} ${owned ? '<span class="si-owned">OWNED</span>' : ''}</div>
        <div class="si-desc">${u.desc}</div>
      </div>
      ${owned ? `<button class="si-buy cant">${Icons.svg('check', 16)}</button>`
        : `<button class="si-buy ${can ? '' : 'cant'}" data-buytap="${u.id}">
             <span class="si-cost">${logIc()} ${fmt(u.base)}</span><small>UPGRADE</small></button>`}
    </div>`;
  }

  function renderBuild() {
    const p = Game.arkProgress();
    let html = '';

    // Big BUILD card for the next part (the heart of the game)
    if (!p.maxed) {
      const can = S.wood >= p.part.cost;
      html += `<div class="build-next ${can ? 'ready' : ''}">
        <div class="bn-info">
          <div class="bn-label">Next Part</div>
          <div class="bn-name">${p.part.name}</div>
          <div class="bn-mult">${Icons.svg('star4', 12)} ×${p.part.mult} all wood when built</div>
          <div class="bn-bar"><div style="width:${(p.pct * 100).toFixed(1)}%"></div></div>
        </div>
        <button class="bn-btn ${can ? '' : 'cant'}" data-buildpart="1">
          ${Icons.svg('hammer', 20)}<span>BUILD</span>
          <small>${logIc()} ${fmt(p.part.cost)}</small>
        </button>
      </div>`;
    } else {
      html += `<div class="build-next ready">
        <div class="bn-info">
          <div class="bn-name">The Ark is complete!</div>
          <div class="bn-mult">Go to the Set Sail tab — earn your Doves.</div>
        </div>
      </div>`;
    }

    // Parts checklist (shows the journey)
    html += '<div class="shop-section">Ark Parts</div>';
    html += Game.DATA.arkStages.map((pt, i) => {
      const done = i < S.arkStage, cur = i === S.arkStage;
      return `<div class="part-row ${done ? 'done' : cur ? 'current' : 'future'}">
        <span class="pr-check">${done ? Icons.svg('check', 14) : (i + 1)}</span>
        <span class="pr-name">${pt.name}</span>
        <span class="pr-cost">${done ? '×' + pt.mult : logIc(11) + ' ' + fmt(pt.cost)}</span>
      </div>`;
    }).join('');

    // Tap tools
    html += '<div class="shop-section">Collector Tools</div>';
    html += Game.DATA.tapUpgrades.map(tapRow).join('');
    $('buildList').innerHTML = html;
  }

  function renderCrew() {
    let html = buyMultRow();
    let shownLocked = 0;
    for (let i = 0; i < Game.DATA.generators.length; i++) {
      const g = Game.DATA.generators[i];
      const unlocked = i === 0 || S.gens[Game.DATA.generators[i - 1].id] > 0 || S.wood >= g.base * 0.35;
      if (unlocked) html += buildRow(g);
      else if (shownLocked < 1) { html += lockedRow(g); shownLocked++; }
    }
    $('crewList').innerHTML = html;
  }

  function lockedRow(g) {
    return `<div class="shop-item locked">
      <div class="si-ico"><b style="font-size:20px">?</b></div>
      <div class="si-mid"><div class="si-name">???</div><div class="si-desc">Keep chopping to reveal</div></div>
      <button class="si-buy cant"><span class="si-cost">${logIc()} ${fmt(g.base)}</span></button>
    </div>`;
  }

  /* ---------- FLOOD / PRESTIGE ---------- */
  function renderFlood() {
    const gain = Game.doveGain();
    $('floodGain').textContent = fmt(gain);
    const newBoost = (gain * Game.DATA.dovePerBoost * 100).toFixed(0);
    $('floodMult').textContent = `(+${newBoost}% forever)`;
    const btn = $('btnFlood');
    if (gain > 0) { btn.classList.add('ready'); $('floodNote').textContent = 'Your Ark sails! Blessings stay forever.'; }
    else { btn.classList.remove('ready'); $('floodNote').textContent = 'Gather more lifetime wood to earn your first Dove.'; }

    $('blessingList').innerHTML = Game.DATA.blessings.map(b => {
      const owned = S.blessings[b.id];
      const can = !owned && S.doves >= b.cost;
      return `<div class="shop-item ${owned ? '' : can ? 'affordable' : 'locked'}">
        <div class="si-ico">${Icons.svg(b.ico, 26)}</div>
        <div class="si-mid"><div class="si-name">${b.name} ${owned ? '<span class="si-owned">OWNED</span>' : ''}</div>
          <div class="si-desc">${b.desc}</div></div>
        ${owned ? `<button class="si-buy cant">${Icons.svg('check', 16)}</button>`
          : `<button class="si-buy ${can ? '' : 'cant'}" data-blessing="${b.id}">
               <span class="si-cost">${doveIc()} ${b.cost}</span><small>BLESS</small></button>`}
      </div>`;
    }).join('');
  }

  function renderShops() { renderBuild(); renderCrew(); renderFlood(); }

  /* ---------- FX ---------- */
  function floatNum(x, y, text, color) {
    const el = document.createElement('div');
    el.className = 'float-num';
    el.textContent = text;
    if (color) el.style.color = color;
    el.style.left = (x - 20) + 'px';
    el.style.top = (y - 24) + 'px';
    $('fx').appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }

  function burst(x, y, iconName, n) {
    for (let i = 0; i < (n || 6); i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.innerHTML = Icons.svg(iconName || 'star4', 16);
      const ang = Math.random() * Math.PI * 2, dist = 40 + Math.random() * 60;
      p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      p.style.setProperty('--dy', (Math.sin(ang) * dist - 30) + 'px');
      p.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
      p.style.left = x + 'px'; p.style.top = y + 'px';
      $('fx').appendChild(p);
      setTimeout(() => p.remove(), 800);
    }
  }

  let toastT;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), 1800);
  }

  /* ---------- MODALS ---------- */
  function show(id) { $(id).classList.remove('hidden'); }
  function hide(id) { $(id).classList.add('hidden'); }

  return { renderHUD, renderArk, renderShops, renderFlood, renderCrew, renderBuild,
           floatNum, burst, toast, show, hide, $,
           get buyAmount() { return buyAmount; },
           set buyAmount(v) { buyAmount = v; } };
})();
