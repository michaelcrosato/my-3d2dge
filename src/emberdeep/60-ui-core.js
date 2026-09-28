/* =============================================================================
 * UI: the HUD, a small immediate-mode widget kit, panels (pause, settings, death, waystone, bag) and tooltips
 * Everything is pixel art drawn in r.overlay (screen pixels). Widgets register hot rectangles while they draw;
 * the next update resolves clicks against them. A PANEL is UI.def(id, { title, modal, w, h, open(data), close(),
 * update(dt), draw(g, x, y, w, h) }) and UI.open(id, data) shows it; Esc closes the top one. Modal panels
 * pause the level (the town keeps living behind them).
 * ============================================================================= */
const UI = {
  mouse: { x: -99, y: -99, cx: 0, cy: 0, down: false, active: false, wheel: 0 },
  panels: {}, stack: [], hot: [], nextHot: [], tip: null, drag: null, hotItem: null, focus: 0, keyNav: false, cardT: 0, card: null,
  def(id, spec) { spec.id = id; this.panels[id] = spec; return spec; },
  top() { return this.stack.length ? this.panels[this.stack[this.stack.length - 1].id] : null; },
  isOpen(id) { return this.stack.some(s => s.id === id); },
  get modal() { return this.stack.some(s => this.panels[s.id] && this.panels[s.id].modal !== false); },
  open(id, data) { const P0 = this.panels[id]; if (!P0) return; if (this.isOpen(id)) return this.close(id); this.stack.push({ id, data }); this.focus = 0; if (P0.open) P0.open(data); sfx('select'); game.input.consumeAll(); },
  close(id) { const i = id ? this.stack.findIndex(s => s.id === id) : this.stack.length - 1; if (i < 0) return; const s = this.stack.splice(i, 1)[0], P0 = this.panels[s.id]; if (P0 && P0.close) P0.close(s.data); sfx('cancel', { vol: .5 }); game.input.consumeAll(); },
  closeAll() { while (this.stack.length) this.close(); },
  data(id) { const s = this.stack.find(q => q.id === id); return s && s.data; }
};
/* the mouse in screen pixels (the canvas scale and letterbox undone) */
canvas.addEventListener('pointermove', e => { UI.mouse.cx = e.clientX; UI.mouse.cy = e.clientY; UI.mouse.active = true; UI.keyNav = false; });
canvas.addEventListener('pointerdown', e => { UI.mouse.cx = e.clientX; UI.mouse.cy = e.clientY; if (e.button === 0) UI.mouse.down = true; });
addEventListener('pointerup', e => { if (e.button === 0) { UI.mouse.down = false; UI.drag = null; } });
canvas.addEventListener('wheel', e => { UI.mouse.wheel += Math.sign(e.deltaY); }, { passive: true });
function mouseHUD() { const sc = game.screen, p = sc.clientToScreen(UI.mouse.cx, UI.mouse.cy); UI.mouse.x = p[0] - sc.ix; UI.mouse.y = p[1] - sc.iy; return UI.mouse; }
/** register a hot rectangle (inside draw). o: { click, rclick, tip: lines | () => lines, drag(mx, my), key } */
function hot(x, y, w, h, o) { UI.nextHot.push(Object.assign({ x, y, w, h }, o)); const m = UI.mouse; return m.x >= x && m.x < x + w && m.y >= y && m.y < y + h; }
const inRect = (m, r0) => m.x >= r0.x && m.x < r0.x + r0.w && m.y >= r0.y && m.y < r0.y + r0.h;
/** run every step before the world: clicks, drags, Esc, the panel's own update. Returns true when the world should wait */
function updateUI(dt) {
  const inp = game.input, m = mouseHUD();
  UI.cardT -= dt;
  for (const n of notes) n.t += dt; while (notes.length && notes[0].t > notes[0].dur) notes.shift();
  const over = UI.hot.find(r0 => inRect(m, r0));
  if (UI.drag && UI.mouse.down) UI.drag(m.x, m.y);
  if (inp.pressed('click')) { if (over) { if (over.drag) UI.drag = over.drag, over.drag(m.x, m.y); if (over.click) over.click(); inp.consume('s0'); } else if (UI.modal) inp.consume('s0'); }
  if (inp.pressed('rclick')) { if (over && over.rclick) { over.rclick(); inp.consume('s1'); } else if (UI.modal || over) inp.consume('s1'); }
  if (over) { inp.consume('s0'); inp.consume('s1'); }
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
/** a horizontal slider: value in [lo, hi] snapped to step. Returns the (maybe changed) value via onChange */
function slider(g, x, y, w, v, lo, hi, step, onChange, o = {}) {
  const m = UI.mouse, u = (v - lo) / (hi - lo), setAt = mx => { const q = clamp((mx - x) / w, 0, 1), nv = Math.round((lo + q * (hi - lo)) / step) * step; if (Math.abs(nv - v) > 1e-9) { v = +nv.toFixed(4); onChange(v); sfx('select', { vol: .3 }); } };
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
  r.overlay(g => {
    const W = r.W, H = r.H, cx = Math.round(W / 2), by = H - 24;
    // orbs
    const OR = 17;
    orb(g, 22, H - 22, OR, h.hp / h.maxHp, h.st.poison ? '#6ac03a' : '#d8303a', '#2a0c14');
    orb(g, W - 22, H - 22, OR, h.ember / h.maxEmber, '#ff8a2a', '#2a1408');
    if (hot(22 - OR, H - 22 - OR, OR * 2, OR * 2, { tip: [{ t: 'Life ' + Math.ceil(h.hp) + ' / ' + h.maxHp, c: '#ff8a8a' }, { t: (h.stats.lifeRegen || 0).toFixed(1) + ' per second', c: '#c8c0d8' }] })) {}
    if (hot(W - 22 - OR, H - 22 - OR, OR * 2, OR * 2, { tip: [{ t: 'Ember ' + Math.floor(h.ember) + ' / ' + h.maxEmber, c: '#ffb070' }, { t: 'Skills spend it; Blade Dance and other basic skills make it.', c: '#c8c0d8' }] })) {}
    E.font.text(g, String(Math.ceil(h.hp)), 22, H - 25, '#ffffff', { align: 'center', font: 'tiny', outline: '#0c0818' });
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
    px.rect(g, bx, H - 3, xw, 3, '#0c0818'); px.rect(g, bx + 1, H - 2, Math.round((xw - 2) * clamp(h.xp / need, 0, 1)), 1, '#b88aff');
    hot(bx, H - 4, xw, 4, { tip: [{ t: 'Level ' + h.level, c: GOLD }, { t: fmt(h.xp) + ' / ' + fmt(need) + ' experience', c: '#c8b0ff' }] });
    E.font.text(g, 'LV ' + h.level, bx - 4, H - 8, '#c8b0ff', { align: 'right', font: 'tiny', outline: '#0c0818' });
    if (h.pts.skill + h.pts.passive > 0) { const blink = Math.floor(game.real * 2) % 2; E.font.text(g, (h.pts.skill ? h.pts.skill + ' SKILL ' : '') + (h.pts.passive ? h.pts.passive + ' PASSIVE' : '') + ' POINT' + (h.pts.skill + h.pts.passive > 1 ? 'S' : '') + ' (K / P)', cx, by - 15, blink ? GOLD : '#e0a040', { align: 'center', font: 'tiny', outline: '#0c0818' }); }
    E.font.text(g, fmt(h.gold) + ' GOLD', W - 44, H - 9, GOLD, { align: 'right', font: 'tiny', outline: '#0c0818' });
    // top left: where we are, the level's elements, buffs
    const L0 = ED.L;
    if (L0) {
      E.font.text(g, (L0.kind === 'town' ? 'EMBERHOLD' : 'DEPTH ' + L0.depth) , 5, 4, GOLD, { shadow: '#05040a', outline: false });
      E.font.text(g, L0.kind === 'town' ? 'the last lit town' : L0.name, 5, 13, '#c8c0d8', { shadow: '#05040a', outline: false });
      let mx = 5;
      for (const id of L0.mechs || []) { const M = REG.mechanics[id]; if (!M) continue; E.ui.box(g, mx, 24, 14, 14, { bg: '#1a1428', border: M.color || '#8a7aa8', shadow: false, gradient: false }); if (M.icon) M.icon(g, mx + 1, 25, .75); hot(mx, 24, 14, 14, { tip: [{ t: M.name, c: M.color || GOLD }, { t: M.tip || '', c: '#c8c0d8' }] }); mx += 16; }
      let bxx = 5; const byy = L0.mechs && L0.mechs.length ? 42 : 26;
      for (const b of h.buffs) { E.ui.box(g, bxx, byy, 10, 10, { bg: '#141020', border: b.color || '#8affc8', shadow: false, gradient: false }); E.font.text(g, (b.name || '?')[0], bxx + 5, byy + 2, b.color || '#8affc8', { align: 'center', font: 'tiny', outline: false }); hot(bxx, byy, 10, 10, { tip: [{ t: b.name, c: b.color }, { t: Math.ceil(b.t) + 's', c: '#c8c0d8' }].concat(Object.keys(b.stats || {}).map(k => ({ t: statText(k, b.stats[k]), c: '#8ab4ff' }))) }); bxx += 12; }
      for (const id in h.st) { const S = REG.statuses[id]; if (!S) continue; E.ui.box(g, bxx, byy, 10, 10, { bg: '#1a0c14', border: S.color, shadow: false, gradient: false }); E.font.text(g, S.name[0], bxx + 5, byy + 2, S.color, { align: 'center', font: 'tiny', outline: false }); bxx += 12; }
      drawMinimap(g, r, L0, h);
    }
    // boss bar
    const B = ED.boss;
    if (B && B.alive && !B.dormant) {
      const w = Math.min(220, W - 120), x = cx - w / 2, y = 8;
      E.font.text(g, B.name.toUpperCase() + (B.title ? ', ' + B.title.toUpperCase() : ''), cx, y, '#ff9a6a', { align: 'center', shadow: '#05040a', outline: false });
      E.ui.bar(g, x, y + 10, w, 6, B.hp / B.maxHp, '#d8303a');
      const ph = (B.bossDef.phases || []).slice(1); for (const p of ph) px.rect(g, x + Math.round(w * p.at), y + 10, 1, 6, '#ffd36a');
    }
    // notices
    let ny = Math.round(H * .3);
    for (const n of notes) { const a = n.t < .2 ? n.t / .2 : n.t > n.dur - .5 ? (n.dur - n.t) / .5 : 1; if (a <= 0) continue; px.blend(g, a, 'normal', () => E.font.text(g, n.text, cx, ny, n.color, { align: 'center', shadow: '#05040a', outline: '#0c0818' })); ny += 10; }
    // interaction prompt
    if (UI.prompt) { const t = UI.prompt; E.font.text(g, t, cx, by - 26, '#ffffff', { align: 'center', shadow: '#05040a', outline: '#0c0818' }); }
    // the level card: name, depth, the new element
    if (UI.card && UI.cardT > 0) {
      const c = UI.card, a = clamp(Math.min(UI.cardT, (c.dur - UI.cardT) * 3), 0, 1);
      px.blend(g, a, 'normal', () => {
        const y = Math.round(H * .18);
        E.font.text(g, c.sub, cx, y - 12, '#c8c0d8', { align: 'center', shadow: '#05040a', outline: false });
        E.font.title(g, c.title.toUpperCase(), cx, y, { scale: 2, colors: ['#fff6c8', '#ffd36a', '#e07a2a'], depth: 2, align: 'center' });
        if (c.mech) { const M = c.mech; E.font.text(g, 'NEW: ' + M.name.toUpperCase(), cx, y + 22, M.color || GOLD, { align: 'center', shadow: '#05040a', outline: '#0c0818' }); const lines = E.font.wrap(M.tip || '', 280); lines.forEach((l, i) => E.font.text(g, l, cx, y + 32 + i * 9, '#e8e0f8', { align: 'center', shadow: '#05040a', outline: false })); }
      });
    }
  });
}
function skillTip(h, id) {
  const S = REG.skills[id], k = h.skills[id] || {}, rank = skillRank(h, id), rune = k.rune && S.runes && S.runes.find(q => q.id === k.rune);
  const out = [{ t: S.name + '  •  rank ' + rank, c: GOLD, big: true }, { t: (S.tags || []).join(', ') + (S.el && S.el !== 'phys' ? ', ' + EL(S.el).name : ''), c: '#9a90b0' }];
  const cost = skillCost(h, S); if (cost) out.push({ t: 'Costs ' + cost + ' Ember', c: '#ffb070' }); if (S.gen) out.push({ t: 'Generates ' + S.gen + ' Ember per hit', c: '#ffb070' }); if (S.cd) out.push({ t: 'Cooldown ' + skillCd(h, S).toFixed(1) + 's', c: '#8fe3ff' });
  out.push({ t: typeof S.desc === 'function' ? S.desc(rank, k.rune) : S.desc || '', c: '#e8e0f8' });
  if (rune) out.push({ t: rune.name + ': ' + rune.desc, c: '#ff9a4a' });
  return out;
}
/** the minimap: explored floor, walls, the exit, monsters nearby, the hero */
function drawMinimap(g, r, L0, h) {
  const big = game.input.down('map'), S = big ? 3 : 1.5, W0 = big ? Math.min(L0.w * S, r.W - 40) : 74, H0 = big ? Math.min(L0.h * S, r.H - 40) : 54;
  const x0 = big ? Math.round((r.W - W0) / 2) : r.W - W0 - 4, y0 = big ? Math.round((r.H - H0) / 2) : 4;
  const hcx = h.x / T16, hcy = h.y / T16, ox = big ? (L0.w * S > W0 ? clamp(hcx * S - W0 / 2, 0, L0.w * S - W0) : (L0.w * S - W0) / 2) : hcx * S - W0 / 2, oy = big ? (L0.h * S > H0 ? clamp(hcy * S - H0 / 2, 0, L0.h * S - H0) : (L0.h * S - H0) / 2) : hcy * S - H0 / 2;
  px.blend(g, big ? .85 : .7, 'normal', () => px.rect(g, x0, y0, W0, H0, '#08060e'));
  const c0 = Math.max(0, Math.floor(ox / S)), c1 = Math.min(L0.w - 1, Math.ceil((ox + W0) / S)), r0 = Math.max(0, Math.floor(oy / S)), r1 = Math.min(L0.h - 1, Math.ceil((oy + H0) / S));
  // the view rotates with the camera: north-up minimap in screen orientation for iso is confusing, so draw it as the view sees the ground
  for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
    const i = cy * L0.w + cx; if (!L0.seen[i]) continue;
    const cell = L0.cells[i], sx = x0 + cx * S - ox, sy = y0 + cy * S - oy, tag = L0.map.floorTags && L0.map.floorTags[i];
    if (sx < x0 || sy < y0 || sx + S > x0 + W0 || sy + S > y0 + H0) continue;
    const c = cell ? (cell === 1 ? '#6a5a88' : '#4a4060') : tag === 'pit' ? '#05040a' : tag === 'water' ? '#2a4a7a' : tag === 'ice' ? '#6a8aa8' : '#2a2238';
    px.rect(g, sx, sy, Math.ceil(S), Math.ceil(S), c);
  }
  const P0 = (wx, wy) => [x0 + wx / T16 * S - ox, y0 + wy / T16 * S - oy], inside = ([sx, sy]) => sx >= x0 && sy >= y0 && sx < x0 + W0 && sy < y0 + H0;
  if (L0.exit && L0.seen[Math.floor(L0.exit.y / T16) * L0.w + Math.floor(L0.exit.x / T16)]) { const q = P0(L0.exit.x, L0.exit.y); if (inside(q)) { px.rect(g, q[0] - 1, q[1] - 1, 3, 3, L0.exit.open ? '#6fd6cc' : '#8a7a9a'); } }
  if (L0.waystone) { const q = P0(L0.waystone.x, L0.waystone.y); if (inside(q)) px.rect(g, q[0] - 1, q[1] - 1, 3, 3, '#6fd6cc'); }
  if (L0.portal) { const q = P0(L0.portal.x, L0.portal.y); if (inside(q)) px.rect(g, q[0] - 1, q[1] - 1, 3, 3, '#8ab4ff'); }
  for (const t of L0.things) if (t.mapColor && !t.dead) { const q = P0(t.x, t.y); if (inside(q) && L0.seen[Math.floor(t.y / T16) * L0.w + Math.floor(t.x / T16)]) px.dot(g, q[0], q[1], t.mapColor); }
  for (const m of ED.foes) { if (!m.alive) continue; const q = P0(m.x, m.y); if (inside(q) && Math.hypot(m.x - h.x, m.y - h.y) < 200) px.dot(g, q[0], q[1], m.boss ? '#ff5a3a' : m.elite ? '#ffd36a' : '#d8303a'); }
  if (L0.npcs) for (const n of L0.npcs) { const q = P0(n.x, n.y); if (inside(q)) px.dot(g, q[0], q[1], '#ffd36a'); }
  const q = P0(h.x, h.y); px.rect(g, q[0] - 1, q[1] - 1, 3, 3, '#ffffff'); px.dot(g, q[0], q[1], '#2f8f86');
  px.rect(g, x0, y0, W0, 1, '#5a4a70'); px.rect(g, x0, y0 + H0 - 1, W0, 1, '#5a4a70'); px.rect(g, x0, y0, 1, H0, '#5a4a70'); px.rect(g, x0 + W0 - 1, y0, 1, H0, '#5a4a70');
  hot(x0, y0, W0, H0, { tip: [{ t: 'Map', c: GOLD }, { t: 'Hold Tab for the full map.', c: '#c8c0d8' }] });
}
/** mark what the hero has seen (a radius around him) */
function reveal(L0, h, rad = 9) {
  const cx = Math.floor(h.x / T16), cy = Math.floor(h.y / T16);
  for (let y = cy - rad; y <= cy + rad; y++) for (let x = cx - rad; x <= cx + rad; x++) if (x >= 0 && y >= 0 && x < L0.w && y < L0.h && (x - cx) * (x - cx) + (y - cy) * (y - cy) <= rad * rad) L0.seen[y * L0.w + x] = 1;
}
/** draw the open panels and the tooltip (after the HUD) */
function drawPanels(r) {
  r.overlay(g => {
    for (const s of UI.stack) {
      const P0 = UI.panels[s.id]; if (!P0) continue;
      if (P0.modal !== false && s === UI.stack[UI.stack.length - 1] && P0.dim !== false) px.blend(g, .45, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05030c'));
      const w = typeof P0.w === 'function' ? P0.w(r.W, r.H) : Math.min(P0.w || 240, r.W - 8), h = typeof P0.h === 'function' ? P0.h(r.W, r.H) : Math.min(P0.h || 180, r.H - 8);
      const x = P0.x !== undefined ? (typeof P0.x === 'function' ? P0.x(r.W, w) : P0.x) : Math.round((r.W - w) / 2), y = P0.y !== undefined ? P0.y : Math.round((r.H - h) / 2);
      if (P0.box !== false) panelBox(g, x, y, w, h, P0.title);
      P0.draw(g, x, y, w, h, s.data);
      if (P0.box !== false) button(g, x + w - 14, y + 3, 11, 11, 'x', () => UI.close(s.id), { color: '#4a2a3a' });
    }
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
const DIFF_ROWS = [['heroDmg', 'Hero damage'], ['heroHp', 'Hero life'], ['heroSpeed', 'Hero speed'], ['foeDmg', 'Monster damage'], ['foeHp', 'Monster life'], ['foeSpeed', 'Monster speed'], ['density', 'Monster density'], ['xp', 'Experience gain'], ['loot', 'Loot drops']];
UI.def('settings', { title: 'SETTINGS', w: (W) => Math.min(300, W - 8), h: (W, H) => Math.min(226, H - 6), draw(g, x, y, w, h) {
  const rows = DIFF_ROWS, lh = 12, sx = x + 104, sw = w - 150;
  E.font.text(g, 'DIFFICULTY  (for playtesting: 0.25x to 4x)', x + 10, y + 20, '#9a90b0', { font: 'tiny', outline: false });
  rows.forEach(([k, label], i) => {
    const yy = y + 30 + i * lh, v = DIFF[k], foc = UI.keyNav && UI.focus === i;
    E.font.text(g, label, x + 10, yy, foc ? GOLD : '#e8e0f8', { outline: false, shadow: '#05040a' });
    slider(g, sx, yy + 1, sw, v, .25, 4, .25, nv => { DIFF[k] = nv; saveOpts(); if (ED.hero && (k === 'heroHp' || k === 'heroSpeed')) computeStats(ED.hero); }, { mark: 1, color: k.startsWith('hero') ? '#6fd6cc' : k.startsWith('foe') || k === 'density' ? '#ff8a6a' : GOLD, focus: foc });
    E.font.text(g, v.toFixed(2).replace(/0$/, '') + 'x', x + w - 10, yy, v === 1 ? '#9a90b0' : '#ffffff', { align: 'right', outline: false });
  });
  const oy = y + 30 + rows.length * lh + 4;
  E.font.text(g, 'OPTIONS', x + 10, oy, '#9a90b0', { font: 'tiny', outline: false });
  const tog = (i, label, on, fn) => button(g, x + 10 + (i % 3) * Math.floor((w - 20) / 3), oy + 8 + Math.floor(i / 3) * 16, Math.floor((w - 20) / 3) - 3, 13, label + (on === null ? '' : on ? ': ON' : ': OFF'), fn, { active: !!on });
  tog(0, 'Numbers', OPT.numbers, () => { OPT.numbers = !OPT.numbers; saveOpts(); });
  tog(1, 'Shake', OPT.shake, () => { OPT.shake = !OPT.shake; saveOpts(); });
  tog(2, 'Bars', OPT.bars, () => { OPT.bars = !OPT.bars; saveOpts(); });
  tog(3, ['Loot: all', 'Loot: magic+', 'Loot: rare+'][OPT.labels] || 'Loot', null, () => { OPT.labels = (OPT.labels + 1) % 3; saveOpts(); });
  tog(4, 'Music ' + Math.round(OPT.music * 10), null, () => { OPT.music = OPT.music >= 1 ? 0 : Math.round((OPT.music + .1) * 10) / 10; saveOpts(); applyAudioOpts(); });
  tog(5, 'GPU light', !!(game.gpu && game.gpu.enabled && game.gpu.status() === 'on'), () => { if (game.gpu && game.gpu.status() !== 'unavailable') { game.gpu.enabled = !game.gpu.enabled; OPT.gpu = game.gpu.enabled; saveOpts(); } else notify('WEBGPU IS NOT AVAILABLE HERE', '#ff9a7a'); });
  button(g, x + w / 2 - 50, y + h - 18, 100, 13, 'RESET DEFAULTS', () => { Object.assign(DIFF, DIFF_DEFAULT); saveOpts(); if (ED.hero) computeStats(ED.hero); });
}, update() {
  const inp = game.input, n = DIFF_ROWS.length;
  if (inp.repeat('up')) { UI.focus = (UI.focus + n - 1) % n; UI.keyNav = true; }
  if (inp.repeat('down')) { UI.focus = (UI.focus + 1) % n; UI.keyNav = true; }
  if (UI.keyNav && (inp.repeat('left') || inp.repeat('right'))) { const k = DIFF_ROWS[UI.focus][0]; DIFF[k] = clamp(DIFF[k] + (inp.down('left') ? -.25 : .25), .25, 4); saveOpts(); if (ED.hero) computeStats(ED.hero); sfx('select', { vol: .3 }); }
} });
UI.def('death', { title: 'YOU DIED', w: 200, h: 96, draw(g, x, y, w) {
  const h = ED.hero;
  E.font.text(g, 'Depth ' + ED.depth + ' • ' + ED.stats.kills + ' kills this descent', x + w / 2, y + 22, '#c8c0d8', { align: 'center', outline: false });
  E.font.text(g, 'The waystone carries you home. You drop ' + fmt(Math.floor(h.gold * .1)) + ' gold.', x + w / 2, y + 34, '#9a90b0', { align: 'center', font: 'tiny', outline: false });
  button(g, x + 30, y + 52, w - 60, 18, 'RETURN TO EMBERHOLD', () => { UI.closeAll(); h.gold = Math.floor(h.gold * .9); reviveHero(h); goTown(); }, { focus: true });
}, update() { if (game.input.pressed('confirm')) { const h = ED.hero; UI.closeAll(); h.gold = Math.floor(h.gold * .9); reviveHero(h); goTown(); } } });
UI.def('waystone', { title: 'THE WAYSTONE', w: 220, h: (W, H) => Math.min(200, H - 8), draw(g, x, y, w, h) {
  const hero = ED.hero, list = waystoneDepths(hero);
  E.font.text(g, 'Choose where to descend. Every fifth depth is remembered.', x + w / 2, y + 20, '#9a90b0', { align: 'center', font: 'tiny', outline: false });
  const rows = Math.floor((h - 44) / 17), start = clamp((UI.focus || 0) - rows + 1, 0, Math.max(0, list.length - rows));
  list.slice(start, start + rows).forEach((d, i) => { const k = start + i, rec = recipe(d, 0), label = 'DEPTH ' + d + ' • ' + rec.name; button(g, x + 12, y + 30 + i * 17, w - 24, 14, label.length > 34 ? label.slice(0, 33) + '.' : label, () => { UI.closeAll(); descend(d); }, { focus: UI.keyNav && UI.focus === k, active: d === hero.maxDepth }); });
}, update() { const list = waystoneDepths(ED.hero); menuKeys(list.length, i => { UI.closeAll(); descend(list[i]); }); } });
function waystoneDepths(h) { const s = new Set([1]); for (let d = 5; d <= h.maxDepth; d += 5) s.add(d); s.add(h.maxDepth); if (ED.savedLevel) s.delete(0); return [...s].sort((a, b) => b - a); }
