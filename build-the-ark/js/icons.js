/* ============================================================
   Icons — consistent line-icon set (24×24, stroke-based).
   One visual language across the whole UI. No emoji, no files.
   ============================================================ */
const Icons = (function () {
  const P = {
    log:   '<ellipse cx="6.5" cy="12" rx="3" ry="6.5"/><path d="M6.5 5.5H16c2.2 0 4.5 2.9 4.5 6.5S18.2 18.5 16 18.5H6.5"/><ellipse cx="16" cy="12" rx="1.3" ry="3"/>',
    axe:   '<path d="M4 20 12.5 11.5"/><path d="M12.5 11.5C11 8.5 11.5 5.5 13.5 3.5c3 .8 5.2 3 6 6-2 2-5 2.5-8 2z"/>',
    factory:'<path d="M3 21V9.5l5 3.5V9.5l5 3.5V4h8v17z"/><path d="M17 9h2M17 13h2M17 17h2"/>',
    hammer:'<path d="M13.5 5 19 10.5"/><path d="M11.5 7 17 12.5l2.5-2.5L14 4.5z"/><path d="M11 9.5 3.5 17l3.5 3.5L14.5 13"/>',
    ox:    '<circle cx="12" cy="14" r="5"/><path d="M7.5 10.5C5 9.5 4 7.5 4 5c2.8 0 4.8 1.2 5.8 3.2M16.5 10.5C19 9.5 20 7.5 20 5c-2.8 0-4.8 1.2-5.8 3.2"/><path d="M10 15h.01M14 15h.01"/>',
    crane: '<path d="M8 21V5"/><path d="M8 5h13"/><path d="M8 5 4 9"/><path d="M17 5v4"/><path d="M15.5 9c0 2 3 2 3 0"/><path d="M4.5 21h7"/>',
    anchor:'<circle cx="12" cy="5" r="2.5"/><path d="M12 7.5V21"/><path d="M5 13c0 4.5 3 8 7 8s7-3.5 7-8"/><path d="M9 11h6"/>',
    tree:  '<path d="M12 3 6.5 11.5h3.5L5 19h14l-5-7.5h3.5z"/><path d="M12 19v2.8"/>',
    star4: '<path d="M12 3l1.9 5.4L19.5 10l-5.6 1.6L12 17l-1.9-5.4L4.5 10l5.6-1.6z"/><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
    whale: '<path d="M3.5 13c2-4 6-6 9.5-6 4 0 6.7 1.8 7.7 5.4-1.2 3.8-4 6.1-8 6.1-4 0-7.5-2-9.2-5.5z"/><path d="M20.5 12c1-2 2-3 3-3-.5 2-.5 4 0 6-1 0-2-1-3-3z"/><path d="M8 12h.01"/>',
    bolt:  '<path d="M13 2 4.5 14H11l-1 8 8.5-12H12z"/>',
    gear:  '<circle cx="12" cy="12" r="3.2"/><path d="M12 4.5V2.5M17.3 6.7l1.4-1.4M19.5 12h2M17.3 17.3l1.4 1.4M12 19.5v2M6.7 17.3l-1.4 1.4M4.5 12h-2M6.7 6.7 5.3 5.3"/>',
    dove:  '<path d="M20.5 6c-3 0-5.2 1-6.7 3C12.7 6.6 10.2 5 7 5c1.4 2 1.9 4 1.4 6L3 13.2c2.2 2 5 2.8 8 1.8 2.7-1 4.3-3 4.8-6 2-.5 3.6-1.5 4.7-3z"/><path d="M8.5 19c2 .6 4.2.4 6-.6"/>',
    film:  '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M10 9.3v5.4l4.8-2.7z"/>',
    gift:  '<rect x="4" y="11" width="16" height="10" rx="1.5"/><path d="M3 8h18v3H3z"/><path d="M12 8v13"/><path d="M12 8C10 8 8 7 8 5.5 8 4.4 9 4 10 4c1.5 0 2 2 2 4 0-2 .5-4 2-4 1 0 2 .4 2 1.5C16 7 14 8 12 8z"/>',
    crown: '<path d="M4.5 17 3.5 7.5l4.8 3.7L12 4.5l3.7 6.7 4.8-3.7-1 9.5z"/><path d="M4.5 20.5h15"/>',
    sun:   '<circle cx="12" cy="12" r="4"/><path d="M12 3.5V2M18 6l1-1M20.5 12H22M18 18l1 1M12 20.5V22M6 18l-1 1M3.5 12H2M6 6 5 5"/>',
    moon:  '<path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z"/>',
    wind:  '<path d="M3 8h9.5a2.5 2.5 0 1 0-2.5-2.5"/><path d="M3 12h14.5a2.5 2.5 0 1 1-2.5 2.5"/><path d="M3 16h7a2 2 0 1 1-2 2"/>',
    flame: '<path d="M12 2.5c1 3-1.5 4.5-1.5 7.5 0 1.4 1 2.5 2.2 2.5 1.3 0 2.3-1.1 2.3-2.7 1.9 1.6 3 3.7 3 6.2a6.5 6.5 0 0 1-13 0c0-5.5 4.5-7.5 7-13.5z"/>',
    star:  '<path d="M12 2.8l2.6 5.8 6.2.7-4.7 4.2 1.3 6.2L12 16.5l-5.4 3.2 1.3-6.2L3.2 9.3l6.2-.7z"/>',
    boat:  '<path d="M3.5 14.5h17l-2.7 5.5H6.2z"/><path d="M7.5 14.5V10h9v4.5"/><path d="M12 10V3.5"/><path d="M12 3.5c3.2 0 5.3 1.8 5.3 4.5H12z"/>',
    chest: '<rect x="3" y="9" width="18" height="11" rx="2"/><path d="M3 13h18"/><path d="M12 13v3.5"/><path d="M7 9c0-2.7 2.1-4.7 5-4.7S17 6.3 17 9"/>',
    cal:   '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    wave:  '<path d="M2 10c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/><path d="M2 16c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/>',
    share: '<circle cx="6" cy="12" r="2.4"/><circle cx="17.5" cy="5.5" r="2.4"/><circle cx="17.5" cy="18.5" r="2.4"/><path d="M8.2 10.8l7.2-4M8.2 13.2l7.2 4"/>',
    trash: '<path d="M4 7h16M10 7V5h4v2M6 7l1 13.5h10L18 7"/><path d="M10 11v6M14 11v6"/>',
    check: '<path d="M5 13l4 4L19 7"/>',
  };

  function svg(name, size, cls) {
    const body = P[name] || P.star;
    return `<svg class="ic ${cls || ''}" width="${size || 20}" height="${size || 20}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  }

  /* Inject icons into any element carrying data-icon="name" */
  function hydrate(root) {
    (root || document).querySelectorAll('[data-icon]').forEach(el => {
      if (el.querySelector('svg')) return;
      el.insertAdjacentHTML('afterbegin', svg(el.dataset.icon, el.dataset.iconSize || 20));
    });
  }

  return { svg, hydrate };
})();
