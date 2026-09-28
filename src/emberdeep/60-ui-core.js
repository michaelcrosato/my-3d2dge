/* =============================================================================
 * UI: the HUD, a small immediate-mode widget kit, panels (pause, settings, death, waystone, bag) and tooltips
 * Everything is pixel art drawn in r.overlay (screen pixels). Widgets register hot rectangles while they draw;
 * the next update resolves clicks against them. A PANEL is UI.def(id, { title, modal, w, h, open(data), close(),
 * update(dt), draw(g, x, y, w, h) }) and UI.open(id, data) shows it; Esc closes the top one. Modal panels
 * pause the level (the town keeps living behind them).
 * ============================================================================= */
const UI = {
  mouse: { x: -99, y: -99, cx: 0, cy: 0, down: false, active: false, wheel: 0 },
  panels: {}, stack: [], hot: [], nextHot: [], tip: null, drag: null, hotItem: null, focus: 0, keyNav: false, keyT: -1e9, cardT: 0, card: null,
  def(id, spec) { spec.id = id; this.panels[id] = spec; return spec; },
  top() { return this.stack.length ? this.panels[this.stack[this.stack.length - 1].id] : null; },
  isOpen(id) { return this.stack.some(s => s.id === id); },
  get modal() { return this.stack.some(s => this.panels[s.id] && this.panels[s.id].modal !== false); },
  open(id, data) { const P0 = this.panels[id]; if (!P0) return; if (this.isOpen(id)) return this.close(id); this.stack.push({ id, data }); this.focus = 0; this.keyNav = performance.now() - this.keyT < 250; if (P0.open) P0.open(data); sfx('select'); game.input.consumeAll(); },
  close(id) { const i = id ? this.stack.findIndex(s => s.id === id) : this.stack.length - 1; if (i < 0) return; const s = this.stack.splice(i, 1)[0], P0 = this.panels[s.id]; if (P0 && P0.close) P0.close(s.data); sfx('cancel', { vol: .5 }); game.input.consumeAll(); },
  closeAll() { while (this.stack.length) this.close(); },
  data(id) { const s = this.stack.find(q => q.id === id); return s && s.data; }
};
/* the mouse in screen pixels (the canvas scale and letterbox undone). A panel opened from the keyboard starts in key navigation */
addEventListener('keydown', () => { UI.keyT = performance.now(); });
canvas.addEventListener('pointermove', e => { UI.mouse.cx = e.clientX; UI.mouse.cy = e.clientY; UI.mouse.active = true; UI.keyNav = false; });
canvas.addEventListener('pointerdown', e => { UI.mouse.cx = e.clientX; UI.mouse.cy = e.clientY; if (e.button === 0) UI.mouse.down = true; });
addEventListener('pointerup', e => { if (e.button === 0) { UI.mouse.down = false; UI.drag = null; } });
canvas.addEventListener('wheel', e => { UI.mouse.wheel += Math.sign(e.deltaY); }, { passive: true });
function mouseHUD() { const sc = game.screen, p = sc.clientToScreen(UI.mouse.cx, UI.mouse.cy); UI.mouse.x = p[0] - sc.ix; UI.mouse.y = p[1] - sc.iy; return UI.mouse; }
/** register a hot rectangle (inside draw). o: { click, rclick, tip: lines | () => lines, drag(mx, my), key } */
function hot(x, y, w, h, o) { if ((UI.hudPass || UI.underPass) && UI.modal) return false;   // under a modal panel the HUD and the panels below it are display only
  UI.nextHot.push(Object.assign({ x, y, w, h }, o)); const m = UI.mouse; return m.x >= x && m.x < x + w && m.y >= y && m.y < y + h; }
const inRect = (m, r0) => m.x >= r0.x && m.x < r0.x + r0.w && m.y >= r0.y && m.y < r0.y + r0.h;
/** run every step before the world: clicks, drags, Esc, the panel's own update. Returns true when the world should wait */
function updateUI(dt) {
  const inp = game.input, m = mouseHUD();
  UI.cardT -= dt;
  for (const n of notes) n.t += dt; while (notes.length && notes[0].t > notes[0].dur) notes.shift();
  let over = null; for (let i = UI.hot.length - 1; i >= 0; i--) if (inRect(m, UI.hot[i])) { over = UI.hot[i]; break; }   // the topmost rect (panels draw after the HUD)
  if (UI.drag && UI.mouse.down) UI.drag(m.x, m.y);
  // a rect that acts (click, drag, right click) takes the mouse buttons; one that only shows a tooltip (the orbs, the minimap,
  // buff and element icons) lets the swing through, so aiming at a monster behind the HUD still attacks
  const acts = !!over && !!(over.click || over.drag || over.rclick);
  if (inp.pressed('click')) { if (acts) { if (over.drag) UI.drag = over.drag, over.drag(m.x, m.y); if (over.click) over.click(); inp.consume('s0'); } else if (UI.modal) inp.consume('s0'); }
  if (inp.pressed('rclick')) { if (over && over.rclick) { over.rclick(); inp.consume('s1'); } else if (UI.modal || acts) inp.consume('s1'); }
  if (acts || (over && UI.modal)) { inp.consume('s0'); inp.consume('s1'); }
  const P0 = UI.top();
  if (inp.pressed('pause')) { if (P0) UI.close(); else if (ED.mode === 'level' || ED.mode === 'town' || ED.mode === 'proving') UI.open('pause'); }
  else if (P0 && P0.update) P0.update(dt, UI.stack[UI.stack.length - 1].data);
  // panel hotkeys (toggle)
  if (ED.mode === 'level' || ED.mode === 'town' || ED.mode === 'proving') for (const [act, id] of [['bag', 'inventory'], ['skills', 'skills'], ['tree', 'tree']]) if (inp.pressed(act) && UI.panels[id] && !(P0 && P0.captureKeys)) { if (UI.isOpen(id)) UI.close(id); else { if (P0 && P0.modal !== false && !P0.hotkeyPanel) UI.closeAll(); UI.open(id); } }
  if (UI.mouse.wheel && P0 && P0.wheel) P0.wheel(UI.mouse.wheel);
  UI.mouse.wheel = 0;
  return UI.modal;
}
/* ---------- widgets (call inside an overlay) ---------- */
const PANEL_BG = ['#1c1830', '#100c1c'], PANEL_BORDER = '#8a7aa8', GOLD = '#ffd36a';
function panelBox(g, x, y, w, h, title) {
  E.ui.box(g, x, y, w, h, { bg: PANEL_BG, border: PANEL_BORDER });
  px.rect(g, x + 3, y + 3, w - 6, 1, '#3a3050');
  if (title) { E.font.title(g, title, x + w / 2, y + 5, { scale: 1, colors: ['#fff6c8', '#ffd36a', '#e07a2a'], depth: 1, align: 'center' }); px.rect(g, x + 8, y + 15, w - 16, 1, '#4a3a60'); }
}
function button(g, x, y, w, h, label, onClick, o = {}) {
  const m = UI.mouse, focusMe = o.focus, over = hot(x, y, w, h, { click: o.disabled ? null : () => { sfx('confirm', { vol: .6 }); onClick(); }, tip: o.tip });
  const lit = !o.disabled && (over || focusMe), c = o.color || '#3a3058';
  E.ui.box(g, x, y, w, h, { bg: o.disabled ? '#242030' : lit ? E.shade(c, .25) : c, border: lit ? GOLD : o.active ? '#bff6ff' : '#6a5a88', shadow: false });
  E.font.text(g, label, x + w / 2, y + Math.round((h - 7) / 2), o.disabled ? '#6a6488' : lit ? '#fff6d8' : '#e8e0f8', { align: 'center', outline: false, shadow: '#05040a' });
  void m; return over;
}
/** a horizontal slider: value in [lo, hi] snapped to step (a value outside pins the knob to an end). Returns the (maybe changed) value via onChange */
function slider(g, x, y, w, v, lo, hi, step, onChange, o = {}) {
  const m = UI.mouse, u = clamp((v - lo) / (hi - lo), 0, 1), setAt = mx => { const q = clamp((mx - x) / w, 0, 1), nv = Math.round((lo + q * (hi - lo)) / step) * step; if (Math.abs(nv - v) > 1e-9) { v = +nv.toFixed(4); onChange(v); sfx('select', { vol: .3 }); } };
  const over = hot(x - 3, y - 3, w + 6, 10, { drag: setAt, tip: o.tip });
  px.rect(g, x, y + 1, w, 3, '#0c0818'); px.rect(g, x + 1, y + 2, Math.round((w - 2) * u), 1, o.color || GOLD);
  if (o.mark !== undefined) { const mx = x + Math.round((o.mark - lo) / (hi - lo) * w); px.rect(g, mx, y - 1, 1, 7, '#6a5a88'); }
  const kx = x + Math.round(u * w); px.rect(g, kx - 2, y - 1, 5, 7, over || o.focus ? '#fff6d8' : '#c8b8e8'); px.rect(g, kx - 1, y, 3, 5, o.color || GOLD);
  void m;
}
/** a tooltip box of lines [{ t, c, big, sep }] near (x, y), kept on screen */
function tipBox(g, lines, x, y, o = {}) {
  if (!lines || !lines.length) return;
  const W0 = o.w || Math.min(190, Math.max(...lines.map(l => E.font.width(l.t || '') + 10)));
  const wrapped = []; for (const l of lines) { if (l.sep) { wrapped.push(l); continue; } for (const t of E.font.wrap(l.t || '', W0 - 10)) wrapped.push({ t, c: l.c, big: l.big }); }
  const H0 = wrapped.reduce((a, l) => a + (l.sep ? 5 : 9), 0) + 8, W = game.W, H = game.H;
  let bx = Math.round(x + 10), by = Math.round(y + 8); if (bx + W0 > W - 2) bx = Math.round(x - W0 - 6); if (by + H0 > H - 2) by = H - H0 - 2; if (by < 2) by = 2; if (bx < 2) bx = 2;
  E.ui.box(g, bx, by, W0, H0, { bg: ['#1a1428', '#0c0818'], border: o.border || '#6a5a88', shadow: '#000000' });
  let yy = by + 4;
  for (const l of wrapped) { if (l.sep) { px.rect(g, bx + 6, yy + 2, W0 - 12, 1, '#3a3050'); yy += 5; continue; } E.font.text(g, l.t, bx + 5, yy, l.c || '#e8e0f8', { outline: false, shadow: '#05040a' }); yy += 9; }
}

/* ---------- the HUD ---------- */
function orb(g, cx, cy, R, frac, col, dark) {
  const t = E.tones(col);
  px.disc(g, cx, cy, R + 2, '#0c0818'); px.disc(g, cx, cy, R + 1, '#5a4a38'); px.disc(g, cx, cy, R, dark);
  const top = cy + R - Math.round(frac * R * 2), wob = Math.sin(game.real * 3) * 1;
  for (let y = Math.max(cy - R, Math.floor(top + wob)); y <= cy + R; y++) { const hw = Math.floor(Math.sqrt(Math.max(0, R * R - (y - cy) * (y - cy)))); px.rect(g, cx - hw, y, hw * 2 + 1, 1, y < top + wob + 1.5 ? t.hi : y > cy + R * .4 ? t.sh : t.base); }
  px.blend(g, .5, 'add', () => { px.disc(g, cx - R * .35, cy - R * .4, R * .28, '#ffffff'); });
  px.dot(g, cx - R * .45, cy - R * .5, '#ffffff');
}
function drawHUD(r) {
  const h = ED.hero; if (!h) return;
  r.overlay(g => { UI.hudPass = true; try { drawHudInner(g, r, h); } finally { UI.hudPass = false; } });
}
function drawHudInner(g, r, h) {
  {
    const W = r.W, H = r.H, cx = Math.round(W / 2), by = H - 24;
    // orbs
    const OR = 17;
    orb(g, 22, H - 22, OR, h.hp / h.maxHp, h.st.poison ? '#6ac03a' : '#d8303a', '#2a0c14');
    orb(g, W - 22, H - 22, OR, h.ember / h.maxEmber, '#ff8a2a', '#2a1408');
    if (hot(22 - OR, H - 22 - OR, OR * 2, OR * 2, { tip: [{ t: 'Life ' + fmt(Math.ceil(h.hp)) + ' / ' + fmt(h.maxHp), c: '#ff8a8a' }, { t: (h.stats.lifeRegen || 0).toFixed(1) + ' per second', c: '#c8c0d8' }] })) {}
    if (hot(W - 22 - OR, H - 22 - OR, OR * 2, OR * 2, { tip: [{ t: 'Ember ' + Math.floor(h.ember) + ' / ' + h.maxEmber, c: '#ffb070' }, { t: 'Skills spend it; Blade Dance and other basic skills make it.', c: '#c8c0d8' }] })) {}
    E.font.text(g, fmt(Math.ceil(h.hp)), 22, H - 25, '#ffffff', { align: 'center', font: 'tiny', outline: '#0c0818' });
    E.font.text(g, String(Math.floor(h.ember)), W - 22, H - 25, '#ffffff', { align: 'center', font: 'tiny', outline: '#0c0818' });
    // potions (Q) beside the life orb
    for (let i = 0; i < h.maxPotions; i++) { const x = 44 + i * 7, y = H - 12, full = i < h.potions; px.rect(g, x + 1, y - 7, 2, 2, full ? '#c8b890' : '#4a4050'); px.disc(g, x + 2, y - 2, 2.6, full ? '#e03a4a' : '#2a2030'); if (full) px.dot(g, x + 1, y - 3, '#ffc0c8'); }
    E.font.text(g, 'Q', 44 + h.maxPotions * 7 + 2, H - 13, '#9a90b0', { font: 'tiny', outline: '#0c0818' });
    // skill bar
    const SW = 18, gap = 2, n = 6, bw = n * SW + (n - 1) * gap + 4, bx = cx - Math.round(bw / 2);
    for (let i = 0; i < n; i++) {
      const x = bx + i * (SW + gap) + (i >= 2 ? 4 : 0), y = by, id = h.slots[i], S = id && REG.skills[id];
      E.ui.box(g, x - 1, y - 1, SW + 2, SW + 2, { bg: '#141020', border: h.cdWarn && h.cdWarn.slot === i && h.cdWarn.t > 0 ? '#ff5a5a' : h.act && h.act.slot === i ? GOLD : '#5a4a70', shadow: false, gradient: false });
      if (S) {
        drawSkillIcon(g, id, x + 1, y + 1, 1);
        const cd = h.cds[id], full = S.cd ? skillCd(h, S) : 0;
        if (cd > 0 && full) { const k = Math.round(16 * cd / full); px.blend(g, .7, 'normal', () => px.rect(g, x + 1, y + 1, 16, k, '#05040a')); E.font.text(g, cd >= 1 ? String(Math.ceil(cd)) : cd.toFixed(1), x + 9, y + 6, '#ffffff', { align: 'center', font: 'tiny', outline: '#0c0818' }); }
        else if (h.ember < skillCost(h, S)) px.blend(g, .5, 'normal', () => px.rect(g, x + 1, y + 1, 16, 16, '#101848'));
      }
      const kw = E.font.width(SLOT_KEYS[i], { font: 'tiny' }) + 3; px.rect(g, x + SW - kw, y + SW - 6, kw + 1, 7, '#0c0818'); E.font.text(g, SLOT_KEYS[i], x + SW - kw + 2, y + SW - 5, '#c8c0d8', { font: 'tiny', outline: false });
      hot(x, y, SW, SW, { tip: S ? () => skillTip(h, id) : [{ t: 'Empty slot', c: '#9a90b0' }, { t: 'Assign a skill in the Skills panel (K).', c: '#c8c0d8' }], click: () => { if (UI.panels.skills) UI.open('skills', { slot: i }); } });
    }
    if (h.cdWarn) h.cdWarn.t -= 1 / 60;
    // dodge charges over the bar, xp bar under it
    for (let i = 0; i < h.maxDodge; i++) { const x = cx - (h.maxDodge * 6) / 2 + i * 6, full = i < h.dodges; px.rect(g, x, by - 6, 4, 2, full ? '#8fe3ff' : '#2a3040'); }
    const need = SCALE.xpNeed(h.level), xw = bw;
    const xf = Math.round((xw - 2) * clamp(h.xp / need, 0, 1)); px.rect(g, bx, H - 4, xw, 4, '#0c0818'); px.rect(g, bx + 1, H - 3, xw - 2, 2, '#2a1e40');   // the xp bar: a 2 px fill with a lit top edge, and quarter ticks
    if (xf > 0) { px.rect(g, bx + 1, H - 3, xf, 2, '#8a5ae0'); px.rect(g, bx + 1, H - 3, xf, 1, '#c8a8ff'); px.dot(g, bx + xf, H - 3, '#ffffff'); }
    for (let q = 1; q < 4; q++) px.dot(g, bx + 1 + Math.round((xw - 2) * q / 4), H - 2, '#0c0818');
    hot(bx, H - 5, xw, 5, { tip: [{ t: 'Level ' + h.level, c: GOLD }, { t: fmt(h.xp) + ' / ' + fmt(need) + ' experience', c: '#c8b0ff' }] });
    E.font.text(g, 'LV ' + h.level, bx - 4, H - 8, '#c8b0ff', { align: 'right', font: 'tiny', outline: '#0c0818' });
    if (h.pts.skill + h.pts.passive > 0) {   // '2 SKILL POINTS (K)', '1 PASSIVE POINT (P)', '2 SKILL + 1 PASSIVE POINTS (K / P)'
      const blink = Math.floor(game.real * 2) % 2, sk = h.pts.skill, pa = h.pts.passive;
      const s = (sk ? sk + ' SKILL' : '') + (sk && pa ? ' + ' : '') + (pa ? pa + ' PASSIVE' : '') + ' POINT' + (sk + pa > 1 ? 'S' : '') + (sk && pa ? ' (K / P)' : sk ? ' (K)' : ' (P)');
      E.font.text(g, s, cx, by - 15, blink ? GOLD : '#e0a040', { align: 'center', font: 'tiny', outline: '#0c0818' });
    }
    E.font.text(g, fmt(h.gold) + ' GOLD', W - 44, H - 9, GOLD, { align: 'right', font: 'tiny', outline: '#0c0818' });
    // top left: where we are, the level's elements, buffs
    const L0 = ED.L; let leftW = 0;   // how far the place names reach (the boss bar keeps clear of them)
    if (L0) {
      const dl = L0.kind === 'town' ? 'EMBERHOLD' : 'DEPTH ' + L0.depth, nm = L0.kind === 'town' ? 'the last lit town' : L0.name || '';
      E.font.text(g, dl, 5, 4, GOLD, { shadow: '#05040a', outline: false });
      E.font.text(g, nm, 5, 13, '#c8c0d8', { shadow: '#05040a', outline: false });
      leftW = Math.max(E.font.width(dl), E.font.width(nm));
      if (L0.kind === 'level') {   // the speedrunner's clock: this depth's time, and the best
        const tm = L0.t || 0, best = h.best && h.best[L0.depth], ft = v => Math.floor(v / 60) + ':' + String(Math.floor(v % 60)).padStart(2, '0'), cs = ft(tm) + (best ? '  best ' + ft(best) : '');
        E.font.text(g, cs, E.font.width(dl) + 10, 4, best && tm > best ? '#9a90b0' : '#8fe3ff', { font: 'tiny', shadow: '#05040a', outline: false });
        leftW = Math.max(leftW, E.font.width(dl) + 5 + E.font.width(cs, { font: 'tiny' }));
      }
      let mx = 5;
      for (const id of L0.mechs || []) { const M = REG.mechanics[id]; if (!M) continue; E.ui.box(g, mx, 24, 14, 14, { bg: '#1a1428', border: M.color || '#8a7aa8', shadow: false, gradient: false }); if (M.icon) M.icon(g, mx + 1, 25, .75); hot(mx, 24, 14, 14, { tip: [{ t: M.name, c: M.color || GOLD }, { t: M.tip || '', c: '#c8c0d8' }] }); mx += 16; }
      let bxx = 5; const byy = L0.mechs && L0.mechs.length ? 42 : 26;
      for (const b of h.buffs) { E.ui.box(g, bxx, byy, 10, 10, { bg: '#141020', border: b.color || '#8affc8', shadow: false, gradient: false }); E.font.text(g, (b.name || '?')[0], bxx + 5, byy + 2, b.color || '#8affc8', { align: 'center', font: 'tiny', outline: false }); hot(bxx, byy, 10, 10, { tip: [{ t: b.name, c: b.color }, { t: Math.ceil(b.t) + 's', c: '#c8c0d8' }].concat(Object.keys(b.stats || {}).map(k => ({ t: statText(k, b.stats[k]), c: '#8ab4ff' }))) }); bxx += 12; }
      for (const id in h.st) { const S = REG.statuses[id]; if (!S) continue; E.ui.box(g, bxx, byy, 10, 10, { bg: '#1a0c14', border: S.color, shadow: false, gradient: false }); E.font.text(g, S.name[0], bxx + 5, byy + 2, S.color, { align: 'center', font: 'tiny', outline: false }); bxx += 12; }
      drawMinimap(g, r, L0, h);
    }
    // an arrow at the screen edge toward the exit once it has been seen (and is off screen)
    if (L0 && L0.exit && L0.kind === 'level' && L0.seen[Math.floor(L0.exit.y / T16) * L0.w + Math.floor(L0.exit.x / T16)]) {
      const [ex, ey] = r.w(L0.exit.x, L0.exit.y, 10), m = 14;
      if (ex < m || ex > W - m || ey < m || ey > H - m) {
        const dx = ex - cx, dy = ey - H / 2, k = Math.min((W / 2 - m) / Math.abs(dx || 1e-3), (H / 2 - m) / Math.abs(dy || 1e-3)), ax = cx + dx * k, ay = H / 2 + dy * k, a = Math.atan2(dy, dx), c = L0.exit.open ? '#6fd6cc' : '#8a7a9a';
        px.poly(g, [[ax + Math.cos(a) * 6, ay + Math.sin(a) * 6], [ax + Math.cos(a + 2.4) * 5, ay + Math.sin(a + 2.4) * 5], [ax + Math.cos(a - 2.4) * 5, ay + Math.sin(a - 2.4) * 5]], c);
        const dd = Math.round(Math.hypot(L0.exit.x - h.x, L0.exit.y - h.y) / T16); E.font.text(g, dd + 'm', ax - Math.cos(a) * 9, ay - Math.sin(a) * 9 - 2, c, { align: 'center', font: 'tiny', outline: '#0c0818' });
      }
    }
    // boss bar: in the gap between the place names (top left) and the minimap (top right), centered when it can be
    const B = ED.boss;
    if (B && B.alive && !B.dormant) {
      const lx = L0 ? 5 + leftW + 6 : 4, rx = L0 ? W - 84 : W - 4, w = Math.max(60, Math.min(220, rx - lx)), x = Math.round(clamp(cx - w / 2, lx, Math.max(lx, rx - w))), y = 8, mid = x + w / 2;
      let nm = B.name.toUpperCase() + (B.title ? ', ' + B.title.toUpperCase() : ''), tiny = false;
      if (E.font.width(nm) > w + 20) nm = B.name.toUpperCase(); if (E.font.width(nm) > w + 20) tiny = true;
      E.font.text(g, nm, mid, tiny ? y + 2 : y, '#ff9a6a', { align: 'center', shadow: '#05040a', outline: false, font: tiny ? 'tiny' : undefined });
      E.ui.bar(g, x, y + 10, w, 6, B.hp / B.maxHp, '#d8303a');
      const ph = (B.bossDef.phases || []).slice(1); for (const p of ph) px.rect(g, x + Math.round(w * p.at), y + 10, 1, 6, '#ffd36a');
    }
    // notices (over the panels instead while one is open: see drawPanels)
    if (!UI.modal) drawNotes(g, W, H, false);
    // interaction prompt
    if (UI.prompt) { const t = UI.prompt; E.font.text(g, t, cx, by - 26, '#ffffff', { align: 'center', shadow: '#05040a', outline: '#0c0818' }); }
    // the level card: name, depth, the new element
    if (UI.card && UI.cardT > 0) {
      const c = UI.card, a = clamp(Math.min(UI.cardT, (c.dur - UI.cardT) * 3), 0, 1);
      px.blend(g, a, 'normal', () => {
        const y = Math.round(H * .18);
        E.font.text(g, c.sub, cx, y - 12, '#c8c0d8', { align: 'center', shadow: '#05040a', outline: false });
        const T0 = c.title.toUpperCase(), sc = E.font.width(T0, { scale: 2 }) <= W - 16 ? 2 : 1;   // long composed names drop to one scale on narrow screens
        E.font.title(g, T0, cx, y + (sc === 1 ? 5 : 0), { scale: sc, colors: ['#fff6c8', '#ffd36a', '#e07a2a'], depth: sc, align: 'center' });
        if (c.mech) {
          const M = c.mech, ww = Math.min(300, W - 30); let lines = E.font.wrap(M.tip || '', ww);
          if (lines.length > 4) { const cut = lines.slice(0, 4).join(' '), dot = cut.lastIndexOf('. '); lines = E.font.wrap(dot > cut.length * .5 ? cut.slice(0, dot + 1) : cut.replace(/\s*\S*$/, '') + '...', ww).slice(0, 4); }   // whole sentences (the icon's tooltip has the rest)
          px.blend(g, .5, 'normal', () => px.rect(g, cx - ww / 2 - 8, y + 30, ww + 16, lines.length * 9 + 3, '#05030c'));   // a dark band: the rule reads over any floor
          E.font.text(g, (M.combo ? 'NEW COMBINATION: ' : 'NEW: ') + M.name.toUpperCase(), cx, y + 22, M.color || GOLD, { align: 'center', shadow: '#05040a', outline: '#0c0818' });
          lines.forEach((l, i) => E.font.text(g, l, cx, y + 32 + i * 9, '#e8e0f8', { align: 'center', shadow: '#05040a', outline: false }));
        }
      });
    }
  }
}

/** the notice feed: fading lines at a third of the height. Over a panel each line gets a dark band, so a shop's
 *  'again to confirm' or 'bag full' reads over whatever the panel draws there */
function drawNotes(g, W, H, band) {
  let ny = Math.round(H * .3); const cx = Math.round(W / 2);
  for (const n of notes) {
    const a = n.t < .2 ? n.t / .2 : n.t > n.dur - .5 ? (n.dur - n.t) / .5 : 1; if (a <= 0) continue;
    if (band) { const tw = Math.min(W, E.font.width(n.text) + 16); px.blend(g, .8 * a, 'normal', () => px.rect(g, cx - tw / 2, ny - 2, tw, 11, '#05030c')); }
    px.blend(g, a, 'normal', () => E.font.text(g, n.text, cx, ny, n.color, { align: 'center', shadow: '#05040a', outline: '#0c0818' })); ny += band ? 11 : 10;
  }
}
function skillTip(h, id) {
  const S = REG.skills[id], k = h.skills[id] || {}, rank = skillRank(h, id), rune = k.rune && S.runes && S.runes.find(q => q.id === k.rune);
  const out = [{ t: S.name + '  •  rank ' + rank, c: GOLD, big: true }, { t: (S.tags || []).join(', ') + (S.el && S.el !== 'phys' ? ', ' + EL(S.el).name : ''), c: '#9a90b0' }];
  const cost = skillCost(h, S); if (cost) out.push({ t: 'Costs ' + cost + ' Ember', c: '#ffb070' }); if (S.gen) out.push({ t: 'Generates ' + S.gen + ' Ember per hit', c: '#ffb070' }); if (S.cd) out.push({ t: 'Cooldown ' + skillCd(h, S).toFixed(1) + 's', c: '#8fe3ff' });
  out.push({ t: typeof S.desc === 'function' ? S.desc(rank, k.rune) : S.desc || '', c: '#e8e0f8' });
  if (rune) out.push({ t: rune.name + ': ' + rune.desc, c: '#ff9a4a' });
  return out;
}
/** the minimap: explored floor, walls, the exit, monsters nearby, the hero. It is drawn through the camera's own
 *  projection (flattened to the ground), so it turns and tilts with the view like Diablo's automap */
function drawMinimap(g, r, L0, h) {
  const big = game.input.down('map'), W0 = big ? r.W - 60 : 74, H0 = big ? r.H - 50 : 54;
  const x0 = big ? 30 : r.W - W0 - 4, y0 = big ? 25 : 4, v = r.view, k = (big ? 3.2 : 1.3) / (T16 * v.scale / (v.zoom || 1)) * T16 / T16;
  const hp0 = v.p(h.x, h.y, 0), cxm = x0 + W0 / 2, cym = y0 + H0 / 2;
  const M = (wx, wy) => { const q = v.p(wx, wy, 0); return [cxm + (q[0] - hp0[0]) * k, cym + (q[1] - hp0[1]) * k]; };
  const inside = ([sx, sy]) => sx >= x0 && sy >= y0 && sx < x0 + W0 - 1 && sy < y0 + H0 - 1;
  px.blend(g, big ? .85 : .7, 'normal', () => px.rect(g, x0, y0, W0, H0, '#08060e'));
  // the explored map is rendered once into a cached image in minimap space (rebuilt when new ground is seen or the
  // camera turns), then blitted around the hero: a few hundred polygons once, not every frame
  const key = v.id + ':' + v.yawDeg + ':' + v.pitchDeg + ':' + k.toFixed(4), c = L0._mm || (L0._mm = {});
  if (c.key !== key || (c.v !== L0.seenV && game.real - (c.t || 0) > .3)) {
    const map = L0.map, W = L0.w * T16, H = L0.h * T16; let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
    for (const [x, y] of [[0, 0], [W, 0], [0, H], [W, H]]) { const q = v.p(x, y, 0); bx0 = Math.min(bx0, q[0] * k); bx1 = Math.max(bx1, q[0] * k); by0 = Math.min(by0, q[1] * k); by1 = Math.max(by1, q[1] * k); }
    const cw = Math.ceil(bx1 - bx0) + 4, ch = Math.ceil(by1 - by0) + 4;
    if (!c.cv || c.cv.width !== cw || c.cv.height !== ch) { c.cv = E.mkCanvas(cw, ch); c.g = E.ctx2d(c.cv); }
    const cg = c.g; cg.clearRect(0, 0, cw, ch); cg._c = null;
    const P0 = (x, y) => { const q = v.p(x, y, 0); return [q[0] * k - bx0 + 2, q[1] * k - by0 + 2]; };
    const floorAt = (cx, cy) => map.cell(cx, cy) === 0 && !(map.floorTags && map.floorTags[cy * L0.w + cx] === 'pit');
    for (let cy = 0; cy < L0.h; cy++) for (let cx = 0; cx < L0.w; cx++) {
      const i = cy * L0.w + cx; if (!L0.seen[i]) continue;
      const cell = L0.cells[i], tag = map.floorTags && map.floorTags[i]; let col;
      if (cell) { if (!(floorAt(cx + 1, cy) || floorAt(cx - 1, cy) || floorAt(cx, cy + 1) || floorAt(cx, cy - 1))) continue; col = cell === 1 ? '#9a8ab8' : '#7a6a98'; }   // only walls that face a floor
      else if (tag === 'pit') continue;
      else col = tag === 'water' || tag === 'deep' ? '#3a6aa8' : tag === 'ice' ? '#8ab0d0' : tag === 'lava' ? '#b84a1a' : '#3e3458';
      px.poly(cg, [P0(cx * T16, cy * T16), P0(cx * T16 + T16, cy * T16), P0(cx * T16 + T16, cy * T16 + T16), P0(cx * T16, cy * T16 + T16)], col);
    }
    Object.assign(c, { key, v: L0.seenV, t: game.real, ox: bx0 - 2, oy: by0 - 2 });
  }
  // blit: the hero's minimap position at the panel center, clipped to the panel
  const hx = hp0[0] * k - c.ox, hy = hp0[1] * k - c.oy, sx0 = Math.max(0, Math.round(hx - W0 / 2 + 1)), sy0 = Math.max(0, Math.round(hy - H0 / 2 + 1));
  const dx0 = Math.round(cxm - (hx - sx0)), dy0 = Math.round(cym - (hy - sy0)), bw = Math.min(c.cv.width - sx0, x0 + W0 - 1 - dx0), bh = Math.min(c.cv.height - sy0, y0 + H0 - 1 - dy0);
  if (bw > 0 && bh > 0) g.drawImage(c.cv, sx0, sy0, bw, bh, dx0, dy0, bw, bh);
  const seenAt = (x, y) => L0.seen[Math.floor(y / T16) * L0.w + Math.floor(x / T16)];
  if (L0.exit && seenAt(L0.exit.x, L0.exit.y)) { const q = M(L0.exit.x, L0.exit.y); if (inside(q)) px.rect(g, q[0] - 1, q[1] - 1, 3, 3, L0.exit.open ? '#6fd6cc' : '#8a7a9a'); }
  if (L0.waystone) { const q = M(L0.waystone.x, L0.waystone.y); if (inside(q)) px.rect(g, q[0] - 1, q[1] - 1, 3, 3, '#6fd6cc'); }
  if (L0.portal) { const q = M(L0.portal.x, L0.portal.y); if (inside(q)) px.rect(g, q[0] - 1, q[1] - 1, 3, 3, '#8ab4ff'); }
  for (const t of L0.things) if (t.mapColor && !t.dead && seenAt(t.x, t.y)) { const q = M(t.x, t.y); if (inside(q)) px.dot(g, q[0], q[1], t.mapColor); }
  for (const m of ED.foes) { if (!m.alive || Math.hypot(m.x - h.x, m.y - h.y) > 200) continue; const q = M(m.x, m.y); if (inside(q)) px.dot(g, q[0], q[1], m.boss ? '#ff5a3a' : m.elite ? '#ffd36a' : '#d8303a'); }
  if (L0.npcs) for (const n of L0.npcs) { const q = M(n.x, n.y); if (inside(q)) px.dot(g, q[0], q[1], '#ffd36a'); }
  px.rect(g, cxm - 1, cym - 1, 3, 3, '#ffffff'); px.dot(g, cxm, cym, '#2f8f86');
  px.rect(g, x0, y0, W0, 1, '#5a4a70'); px.rect(g, x0, y0 + H0 - 1, W0, 1, '#5a4a70'); px.rect(g, x0, y0, 1, H0, '#5a4a70'); px.rect(g, x0 + W0 - 1, y0, 1, H0, '#5a4a70');
  if (!big) hot(x0, y0, W0, H0, { tip: [{ t: 'Map', c: GOLD }, { t: 'Hold Tab for the full map.', c: '#c8c0d8' }] });
}
/** mark what the hero has seen (a radius around him) */
function reveal(L0, h, rad = 9) {
  const cx = Math.floor(h.x / T16), cy = Math.floor(h.y / T16);
  if (cx === L0._rvx && cy === L0._rvy) return; L0._rvx = cx; L0._rvy = cy;
  for (let y = cy - rad; y <= cy + rad; y++) for (let x = cx - rad; x <= cx + rad; x++) if (x >= 0 && y >= 0 && x < L0.w && y < L0.h && (x - cx) * (x - cx) + (y - cy) * (y - cy) <= rad * rad) { const i = y * L0.w + x; if (!L0.seen[i]) { L0.seen[i] = 1; L0.seenV = (L0.seenV || 0) + 1; } }
}
/** draw the open panels and the tooltip (after the HUD) */
function drawPanels(r) {
  r.overlay(g => {
    for (const s of UI.stack) {
      const P0 = UI.panels[s.id]; if (!P0) continue;
      const top = s === UI.stack[UI.stack.length - 1];
      if (P0.modal !== false && top && P0.dim !== false) px.blend(g, .45, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05030c'));
      const w = typeof P0.w === 'function' ? P0.w(r.W, r.H) : Math.min(P0.w || 240, r.W - 8), h = typeof P0.h === 'function' ? P0.h(r.W, r.H) : Math.min(P0.h || 180, r.H - 8);
      const x = P0.x !== undefined ? (typeof P0.x === 'function' ? P0.x(r.W, w) : P0.x) : Math.round((r.W - w) / 2), y = P0.y !== undefined ? P0.y : Math.round((r.H - h) / 2);
      UI.underPass = !top;   // a panel under the top one takes no clicks (a click in a gap of the top panel must not reach the one below)
      try {
        if (P0.box !== false) panelBox(g, x, y, w, h, P0.title);
        P0.draw(g, x, y, w, h, s.data);
        if (P0.box !== false) button(g, x + w - 14, y + 3, 11, 11, 'x', () => UI.close(s.id), { color: '#4a2a3a' });
      } finally { UI.underPass = false; }
    }
    if (UI.modal && notes.length) r.overlay(g2 => drawNotes(g2, r.W, r.H, true));   // queued last: over the panels and their item tooltips
    // tooltip: the hovered hot rect's tip (last registered wins: the topmost)
    const m = UI.mouse; let tipR = null;
    for (const r0 of UI.nextHot) if (r0.tip && inRect(m, r0)) tipR = r0;
    if (tipR) tipBox(g, typeof tipR.tip === 'function' ? tipR.tip() : tipR.tip, m.x, m.y, { border: tipR.tipBorder });
    UI.hot = UI.nextHot; UI.nextHot = [];
  });
}
function showCard(title, sub, mech, dur = 5) { UI.card = { title, sub, mech, dur }; UI.cardT = dur; }

/* ---------- panels: pause, settings, death, waystone ---------- */
UI.def('pause', { title: 'PAUSED', w: 150, h: 128, draw(g, x, y, w) {
  const items = [['RESUME', () => UI.close('pause')], ['SETTINGS', () => UI.open('settings')], ED.mode === 'level' ? ['TOWN PORTAL', () => { UI.closeAll(); openTownPortal(ED.hero); }] : null, ['SAVE AND QUIT', () => { UI.closeAll(); saveGame(); game.go('title'); }]].filter(Boolean);
  items.forEach(([label, fn], i) => button(g, x + 15, y + 22 + i * 24, w - 30, 18, label, fn, { focus: UI.keyNav && UI.focus === i }));
  E.font.text(g, 'Esc closes • the deep waits', x + w / 2, y + 22 + items.length * 24 + 2, '#6a6488', { align: 'center', font: 'tiny', outline: false });
}, update() { menuKeys(ED.mode === 'level' ? 4 : 3, i => [() => UI.close('pause'), () => UI.open('settings'), ED.mode === 'level' ? () => { UI.closeAll(); openTownPortal(ED.hero); } : () => { UI.closeAll(); saveGame(); game.go('title'); }, () => { UI.closeAll(); saveGame(); game.go('title'); }][i]()); } });
/** up / down / confirm over a panel's list of n entries */
function menuKeys(n, pick) {
  const inp = game.input;
  if (inp.repeat('up')) { UI.focus = (UI.focus + n - 1) % n; UI.keyNav = true; sfx('select', { vol: .4 }); }
  if (inp.repeat('down')) { UI.focus = (UI.focus + 1) % n; UI.keyNav = true; sfx('select', { vol: .4 }); }
  if (UI.keyNav && inp.pressed('confirm')) { inp.consumeAll(); pick(UI.focus); }
}
// [key, label, what it does, which way is easier: +1 when more is easier (hero, xp, loot), -1 for the monsters]
const DIFF_ROWS = [['heroDmg', 'Hero damage', 'Every hit you deal.', 1], ['heroHp', 'Hero life', 'Your maximum life.', 1], ['heroSpeed', 'Hero speed', 'How fast you run.', 1],
  ['foeDmg', 'Monster damage', 'Every hit a monster deals.', -1], ['foeHp', 'Monster life', 'Monster and boss life (the living ones change too).', -1], ['foeSpeed', 'Monster speed', 'How fast monsters move (the living ones change too).', -1],
  ['density', 'Monster density', 'Packs per room. Takes hold from the next depth.', -1], ['xp', 'Experience gain', 'Experience from every kill.', 1], ['loot', 'Loot drops', 'How often monsters drop items and gold.', 1]];
/** set one difficulty value and make it felt at once: stats recompute, living monsters take the new life and speed */
function setDiff(k, v) {
  const was = DIFF[k] || 1; v = +clamp(v, .25, 4).toFixed(3); if (v === was) return; DIFF[k] = v; saveOpts();
  const q = v / was;
  if (k === 'foeHp') for (const m of ED.foes) if (m.alive && m.maxHp) { m.maxHp *= q; m.hp *= q; }
  if (k === 'foeSpeed') for (const m of ED.foes) if (m.speed) m.speed *= q;
  if (ED.hero) computeStats(ED.hero);
}
/* the settings' option buttons: [label, on (true / false, or null for a cycling button), action] */
function settingsToggles() {
  return [['Numbers', OPT.numbers, () => { OPT.numbers = !OPT.numbers; saveOpts(); }], ['Shake', OPT.shake, () => { OPT.shake = !OPT.shake; saveOpts(); }], ['Bars', OPT.bars, () => { OPT.bars = !OPT.bars; saveOpts(); }],
    [['Loot: all', 'Loot: magic+', 'Loot: rare+'][OPT.labels] || 'Loot', null, () => { OPT.labels = (OPT.labels + 1) % 3; saveOpts(); }],
    ['Music ' + Math.round(OPT.music * 10), null, () => { OPT.music = OPT.music >= 1 ? 0 : Math.round((OPT.music + .1) * 10) / 10; saveOpts(); applyAudioOpts(); }],
    ['GPU light', !!(game.gpu && game.gpu.enabled && game.gpu.status() === 'on'), () => { if (game.gpu && game.gpu.status() !== 'unavailable') { game.gpu.enabled = !game.gpu.enabled; OPT.gpu = game.gpu.enabled; saveOpts(); } else notify('WEBGPU IS NOT AVAILABLE HERE', '#ff9a7a'); }],
    ['Outlines', OPT.outlines !== false, () => { OPT.outlines = OPT.outlines === false; saveOpts(); }],
    ['Particles ' + ['low', 'mid', 'high'][OPT.fx === undefined ? 2 : OPT.fx], null, () => { OPT.fx = ((OPT.fx === undefined ? 2 : OPT.fx) + 1) % 3; P.max = [500, 1000, 1600][OPT.fx]; saveOpts(); }],
    ['Sound ' + Math.round(OPT.sfx * 10), null, () => { OPT.sfx = OPT.sfx >= 1 ? 0 : Math.round((OPT.sfx + .2) * 10) / 10; saveOpts(); applyAudioOpts(); sfx('coin'); }]];
}
const settingsReset = () => { for (const k in DIFF_DEFAULT) setDiff(k, DIFF_DEFAULT[k]); };
/* keyboard focus in settings: 0-8 the sliders, 9-17 the option buttons (a 3 x 3 grid), 18 RESET */
const SET_N = DIFF_ROWS.length, SET_RESET = SET_N + 9;
UI.def('settings', { title: 'SETTINGS', w: (W) => Math.min(300, W - 8), h: (W, H) => Math.min(240, H - 6), draw(g, x, y, w, h) {
  const rows = DIFF_ROWS, lh = 12, sx = x + 104, sw = w - 150;
  E.font.text(g, 'DIFFICULTY  (for playtesting: 0.25x to 4x)', x + 10, y + 20, '#9a90b0', { font: 'tiny', outline: false });
  const ez = Math.round(rows.reduce((a, [k, , , up]) => a + Math.log2(DIFF[k] || 1) * up, 0) * 2);   // a one-glance summary: how far from the default, and which way
  if (ez) E.font.text(g, ez > 0 ? 'EASIER' : 'HARDER', x + w - 10, y + 20, ez > 0 ? '#8affb0' : '#ff9a7a', { font: 'tiny', outline: false, align: 'right' });
  rows.forEach(([k, label, about, up], i) => {
    const yy = y + 30 + i * lh, v = DIFF[k], foc = UI.keyNav && UI.focus === i, easy = (v - 1) * up;
    const over = hot(x + 6, yy - 2, sx - x - 10, lh, { tip: [{ t: label, c: GOLD }, { t: about, c: '#c8c0d8' }, { t: 'Drag the bar, or arrows with the keys. The mark is 1x.', c: '#8a80a8' }] });
    E.font.text(g, label, x + 10, yy, foc || over ? GOLD : '#e8e0f8', { outline: false, shadow: '#05040a' });
    // a log scale: 1x in the middle, 0.25x and 4x at the ends, steps of the square root of 2
    const vs = (v >= 1 ? v.toFixed(v % 1 ? 1 : 0) : v.toFixed(2)) + 'x';
    slider(g, sx, yy + 1, sw, Math.log2(v), -2, 2, .5, nv => setDiff(k, Math.pow(2, nv)), { mark: 0, color: k.startsWith('hero') ? '#6fd6cc' : k.startsWith('foe') || k === 'density' ? '#ff8a6a' : GOLD, focus: foc, tip: [{ t: label + '  ' + vs, c: GOLD }, { t: about, c: '#c8c0d8' }] });
    E.font.text(g, vs, x + w - 10, yy, v === 1 ? '#9a90b0' : easy > 0 ? '#8affb0' : '#ff9a7a', { align: 'right', outline: false });   // green: easier, red: harder
  });
  const oy = y + 30 + rows.length * lh + 4;
  E.font.text(g, 'OPTIONS', x + 10, oy, '#9a90b0', { font: 'tiny', outline: false });
  settingsToggles().forEach(([label, on, fn], i) => button(g, x + 10 + (i % 3) * Math.floor((w - 20) / 3), oy + 8 + Math.floor(i / 3) * 16, Math.floor((w - 20) / 3) - 3, 13, label + (on === null ? '' : on ? ': ON' : ': OFF'), fn, { active: !!on, focus: UI.keyNav && UI.focus === SET_N + i }));
  button(g, x + w / 2 - 50, y + h - 18, 100, 13, 'RESET DEFAULTS', settingsReset, { focus: UI.keyNav && UI.focus === SET_RESET, tip: [{ t: 'Reset the difficulty', c: GOLD }, { t: 'Every slider back to 1x.', c: '#c8c0d8' }] });
}, update() {
  // up / down walk the sliders, the option grid and RESET; left / right change a slider or move along a row; Enter presses
  const inp = game.input, f = UI.focus || 0, nav = nf => { UI.focus = nf; UI.keyNav = true; sfx('select', { vol: .3 }); };
  const tg = f - SET_N, col = tg % 3, row = Math.floor(tg / 3);
  if (inp.repeat('up')) nav(f === 0 ? SET_RESET : f < SET_N ? f - 1 : f === SET_RESET ? SET_N + 7 : row === 0 ? SET_N - 1 : f - 3);
  else if (inp.repeat('down')) nav(f < SET_N - 1 ? f + 1 : f === SET_N - 1 ? SET_N : f === SET_RESET ? 0 : row === 2 ? SET_RESET : f + 3);
  else if (UI.keyNav && (inp.repeat('left') || inp.repeat('right'))) {
    const d = inp.down('left') ? -1 : 1;
    if (f < SET_N) { const k = DIFF_ROWS[f][0]; setDiff(k, Math.pow(2, clamp(Math.round(Math.log2(DIFF[k]) * 2) / 2 + d * .5, -2, 2))); sfx('select', { vol: .3 }); }
    else if (f < SET_RESET) nav(SET_N + row * 3 + (col + d + 3) % 3);
  }
  if (UI.keyNav && f >= SET_N && inp.pressed('confirm')) { inp.consumeAll(); sfx('confirm', { vol: .6 }); if (f === SET_RESET) settingsReset(); else settingsToggles()[f - SET_N][2](); }
} });
UI.def('death', { title: 'YOU DIED', w: 200, h: 100, draw(g, x, y, w) {
  const h = ED.hero;
  E.font.text(g, 'Depth ' + ED.depth + ' • ' + ED.stats.kills + ' kills this descent', x + w / 2, y + 22, '#c8c0d8', { align: 'center', outline: false });
  E.font.wrap('The waystone carries you home. You drop ' + fmt(Math.floor(h.gold * .1)) + ' gold.', w - 20, { font: 'tiny' }).slice(0, 2).forEach((l, i) => E.font.text(g, l, x + w / 2, y + 34 + i * 8, '#9a90b0', { align: 'center', font: 'tiny', outline: false }));
  button(g, x + 30, y + 56, w - 60, 18, 'RETURN TO EMBERHOLD', () => { UI.closeAll(); h.gold = Math.floor(h.gold * .9); reviveHero(h); goTown(); }, { focus: true });
}, update() { if (game.input.pressed('confirm')) { const h = ED.hero; UI.closeAll(); h.gold = Math.floor(h.gold * .9); reviveHero(h); goTown(); } } });
/* the waystone's list: the panel is as tall as its depths need (it scrolls past ten) */
UI.def('waystone', { title: 'THE WAYSTONE', w: 220, h: (W, H) => Math.min(H - 8, 200, 52 + Math.min(10, ED.hero ? waystoneDepths(ED.hero).length : 4) * 17), draw(g, x, y, w, h) {
  const hero = ED.hero, list = waystoneDepths(hero), sub = E.font.wrap('Choose where to descend. Every fifth depth is remembered.', w - 16, { font: 'tiny' }).slice(0, 2);
  sub.forEach((l, i) => E.font.text(g, l, x + w / 2, y + 19 + i * 7, '#9a90b0', { align: 'center', font: 'tiny', outline: false }));
  const top = y + 21 + sub.length * 7, rows = Math.max(1, Math.floor((y + h - 6 - top) / 17)), start = clamp((UI.focus || 0) - rows + 1, 0, Math.max(0, list.length - rows));
  list.slice(start, start + rows).forEach((d, i) => { const k = start + i, rec = recipe(d, 0), label = 'DEPTH ' + d + ' • ' + rec.name; button(g, x + 12, top + i * 17, w - 24, 14, label.length > 34 ? label.slice(0, 33) + '.' : label, () => { UI.closeAll(); descend(d); }, { focus: UI.keyNav && UI.focus === k, active: d === hero.maxDepth }); });
  if (list.length > rows) { const th = Math.max(6, Math.round((rows * 17 - 3) * rows / list.length)), ty = top + Math.round((rows * 17 - 3 - th) * start / Math.max(1, list.length - rows)); px.rect(g, x + w - 8, top, 2, rows * 17 - 3, '#1c1830'); px.rect(g, x + w - 8, ty, 2, th, '#8a7aa8'); }
}, update() { const list = waystoneDepths(ED.hero); menuKeys(list.length, i => { UI.closeAll(); descend(list[i]); }); },
  wheel(d) { const n = waystoneDepths(ED.hero).length; UI.focus = clamp((UI.focus || 0) + Math.sign(d), 0, n - 1); UI.keyNav = true; } });
function waystoneDepths(h) { const s = new Set([1]); for (let d = 5; d <= h.maxDepth; d += 5) s.add(d); s.add(h.maxDepth); if (ED.savedLevel) s.delete(0); return [...s].sort((a, b) => b - a); }
