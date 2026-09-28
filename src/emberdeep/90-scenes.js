/* =============================================================================
 * SCENES: title, Emberhold (town), a depth (level), the Proving Grounds (the stress test's endless horde)
 * The world step and the world draw are shared: every scene with a hero runs worldStep / worldDraw.
 * ============================================================================= */
let gpu = null;
function setupGPU(map) {
  if (!gpu) { gpu = game.enableGPU({ map, ambient: [.15, .14, .24], wrap: .5, bands: 6 }); gpu.enabled = OPT.gpu !== false; }
  gpu.map = map;
}
/* ---------- save / load ---------- */
const SAVE_KEYS = ['level', 'xp', 'gold', 'pts', 'gear', 'bag', 'skills', 'slots', 'tree', 'potions', 'maxDepth', 'seenMech', 'kills', 'visits', 'stash'];
function saveGame() { const h = ED.hero; if (!h) return; const o = {}; for (const k of SAVE_KEYS) if (h[k] !== undefined) o[k] = h[k]; o.v = 1; E.store.set('ed:save', o); }
function loadSave() { const s = E.store.get('ed:save', null); if (!s || !s.v) return null; let mx = 0; const scan = it => { if (it && it.uid > mx) mx = it.uid; }; Object.values(s.gear || {}).forEach(scan); (s.bag || []).forEach(scan); itemUid = mx + 1; return s; }
function newHero() {
  const h = makeHero(null);
  // a starting kit: the classic look, plain gear
  for (const [slot, base] of [['weapon', 'longsword'], ['chest', 'tunic'], ['boots', 'shoes'], ['cloak', 'cape']]) { const it = makeItem({ base, rarity: 0, ilvl: 1, R: RNG(slot) }); it.look.colors = Object.assign(it.look.colors || {}, slot === 'chest' ? { cloth: '#2f8f86' } : slot === 'cloak' ? { cape: '#c8452f', capeIn: '#7a2622' } : slot === 'boots' ? { boot: '#6a4128' } : {}); h.gear[slot] = it; }
  refreshPowers(h); computeStats(h); h.hp = h.maxHp; dressHero(h);
  return h;
}
function reviveHero(h) { h.alive = true; h.dead = false; h.deadT = 0; h.st = {}; h.act = null; computeStats(h); h.hp = h.maxHp; h.ember = h.maxEmber; h.potions = h.maxPotions; }

/* ---------- moving between places ---------- */
function descend(depth) { ED.savedLevel = null; game.go('level', { depth }); }
function goTown(o = {}) { game.go('town', o); }
/** T: a short channel, then a portal home appears where he stands (the level waits behind it) */
function openTownPortal(h) {
  if (!h || !h.alive || ED.mode !== 'level') return;
  if (ED.L.portal) { notify('THE PORTAL IS ALREADY OPEN', '#8ab4ff', 1.5); return; }
  startAction(h, { name: 'portal', moveK: 0, cancel: true, rig: { pose: 'cast', expr: null }, update(dt) {
    this.t += dt; if (Math.random() < .6) P.glints(h.x + Math.cos(h.facing) * 12, h.y + Math.sin(h.facing) * 12, 12, 1, '#8ab4ff', 10);
    if (this.t >= .9) { const x = h.x + Math.cos(h.facing) * 18, y = h.y + Math.sin(h.facing) * 18; ED.L.portal = { x, y, t: 0 }; sfx('portal'); P.ring(x, y, 2, 16, '#8ab4ff', .4); return false; }
    return true;
  } });
}
function drawPortal(pt, r, home) {
  const t = game.time;
  pt.t = (pt.t || 0) + 1 / 60;
  const grow = clamp(pt.t * 3, 0, 1), c = home ? '#6fd6cc' : '#8ab4ff';
  r.decal(() => r.groundRing(pt.x, pt.y, 10 * grow, c, .7), { emissive: .7 });
  r.queue(pt.x, pt.y, 0, g => {
    const [x, y] = r.w(pt.x, pt.y, 14 * grow), s = (r.view.zoom || 1) * grow;
    px.glow(g, 1); px.ell(g, x, y, 7 * s, 12 * s, E.shade(c, -.4)); px.ell(g, x, y, 5.5 * s, 10.5 * s, c);
    for (let i = 0; i < 6; i++) { const a = t * 3 + i; px.dot(g, x + Math.cos(a) * 4 * s, y + Math.sin(a * 1.3) * 8 * s, '#ffffff'); }
    px.ell(g, x, y, 3 * s, 7 * s, '#e8fbff');
  }, { emissive: true });
  L.add(pt.x, pt.y, 14, 60, .9, { color: c });
}

/* ---------- the shared world step ---------- */
function worldStep(dt, o = {}) {
  const h = ED.hero, L0 = ED.L;
  ED.t += dt; L0.t = (L0.t || 0) + dt;
  UI.prompt = null;
  updateHero(h, dt, o);
  updateFoes(dt); updateCorpses(dt); updateFx(dt); updateThings(L0, dt); updateDrops(dt);
  for (let i = ED.allies.length - 1; i >= 0; i--) { const a = ED.allies[i]; if (a.update && a.update(dt) === false) ED.allies.splice(i, 1); }
  for (const id of L0.mechs || []) { const M = REG.mechanics[id]; if (M && M.update) M.update(L0, dt); }
  for (const b of L0.torches) b.t += dt;
  if (L0.theme && L0.theme.ambience) L0.theme.ambience(L0, dt);
  BUS.emit('step', { dt, L: L0 });
  reveal(L0, h);
  const a = h.aim;
  game.focus(h.x + Math.cos(a) * 16, h.y + Math.sin(a) * 16, 8);
}
function worldDraw(r) {
  const L0 = ED.L, h = ED.hero;
  if (L0.sky) r.sky(L0.sky);
  L0.map.drawFloor(r);
  if (L0.drawUnder) L0.drawUnder(r);
  L0.map.queueWalls(r);
  drawTorches(L0, r); drawProps(L0, r); drawThings(L0, r);
  if (L0.exit) drawExit(L0, r);
  if (L0.waystone && !L0.drawWaystone) drawExit({ exit: Object.assign({ open: true }, L0.waystone) }, r);
  if (L0.portal) drawPortal(L0.portal, r, false);
  if (L0.npcs) for (const n of L0.npcs) drawNPC(n, r);
  drawDrops(r);
  for (const m of ED.corpses) drawFoe(m, r);
  for (const m of ED.foes) drawFoe(m, r);
  for (const a of ED.allies) if (a.draw) a.draw(r);
  drawHero(h, r);
  drawFx(r);
  for (const id of L0.mechs || []) { const M = REG.mechanics[id]; if (M && M.draw) M.draw(L0, r); }
  if (L0.drawOver) L0.drawOver(r);
  BUS.emit('draw', { r, L: L0 });
  if (!UI.hideHud) { drawFoeBars(r); drawHUD(r); }
  drawPanels(r);
}
function enterWorld(L0) {
  ED.L = L0; ED.fx.length = 0; ED.drops.length = 0; ED.corpses.length = 0; ED.foes.length = 0; ED.allies.length = 0; ED.boss = null; ED.t = 0;
  game.cam.bounds = v => L0.map.bounds(v);
  setupGPU(L0.map);
  L.ambient = L0.theme && L0.theme.ambient !== undefined ? L0.theme.ambient : L0.ambient !== undefined ? L0.ambient : .14;
  game.setZoom(OPT.zoom || 1.25);
}
/** the hero drops in from above: a fall in the jump pose, a crouched landing, dust and a thud */
function dropIn(h, from = 150) {
  h.z = from; h.vz = 0; h.inv = 1.4;
  startAction(h, { name: 'dropin', cancel: false, moveK: 0, rig: { air: true }, zz: from, vz: 0, update(dt) {
    if (this.zz > 0) { this.vz -= 520 * dt; this.zz = Math.max(0, this.zz + this.vz * dt); this.z = this.zz; this.rig = { air: true, expr: 'shout' }; if (this.zz <= 0) { this.land = .35; P.dust(h.x, h.y, 0, 14, { speed: 70 }); P.ring(h.x, h.y, 4, 30, '#bff6ff', .35); shake(4); sfx('thud'); h.rig.kick(-6); } return true; }
    this.z = 0; this.rig = { pose: 'crouch' }; return (this.land -= dt) > 0;
  } });
}

/* ---------- TITLE ---------- */
const TITLE = { menu: 0, t: 0 };
function titleItems() {
  const save = E.store.get('ed:save', null);
  return [save ? ['CONTINUE', () => startGame(false)] : null, ['NEW GAME', () => { if (save && !TITLE.confirmNew) { TITLE.confirmNew = true; notify('PRESS NEW GAME AGAIN TO START OVER (THE SAVE IS LOST)', '#ff9a7a', 3); return; } startGame(true); }], ['PROVING GROUNDS', () => { if (!ED.hero) ED.hero = loadHeroOrNew(); game.go('proving'); }], ['SETTINGS', () => UI.open('settings')]].filter(Boolean);
}
function loadHeroOrNew() { const s = loadSave(); if (s) { const h = makeHero(s); refreshPowers(h); computeStats(h); h.hp = h.maxHp; dressHero(h); return h; } return newHero(); }
function startGame(fresh) { if (fresh) { E.store.remove('ed:save'); ED.hero = newHero(); ED.hero.visits = {}; saveGame(); } else ED.hero = loadHeroOrNew(); ED.savedLevel = null; goTown({ arrive: fresh ? 'intro' : 'waystone' }); }
const titleScene = {
  enter() {
    ED.mode = 'title'; UI.closeAll(); TITLE.t = 0; TITLE.confirmNew = false;
    // the rune hall of the stress test, torch-lit, the hero waiting in its circle
    const rec = { depth: 1, seed: 5, name: 'The Rune Hall', theme: 'crypt', hue: 0, layout: 'halls', mechs: [], pool: [], size: [30, 24] };
    const w = 30, hh = 24, cells = new Array(w * hh).fill(0); for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) if (!x || !y || x === w - 1 || y === hh - 1) cells[y * w + x] = 1;
    for (const [px0, py0] of [[6, 5], [22, 5], [6, 17], [22, 17]]) for (let k = 0; k < 4; k++) cells[(py0 + (k >> 1)) * w + px0 + (k & 1)] = 2;
    const L0 = { kind: 'title', rec, depth: 0, name: rec.name, theme: REG.themes.crypt, hue: 0, w, h: hh, cells, tags: new Array(w * hh).fill(null), rooms: [{ x: 1, y: 1, w: w - 2, h: hh - 2, cx: w / 2, cy: hh / 2 }], things: [], props: [], torches: [], runes: [{ x: w * 8, y: hh * 8, r: 54 }], mechs: [], seen: new Uint8Array(w * hh), npcs: [] };
    L0.pal = CRYPT; L0.map = new E.TileMap({ w, h: hh, tile: T16, cells, types: REG.themes.crypt.walls, floorTex: (x, y, tag) => cryptFloor(L0, x, y, tag, CRYPT) }); L0.flow = new E.FlowField(L0.map);
    for (const [x, y] of [[10, 8], [20, 8], [10, 16], [20, 16]]) L0.torches.push({ x: x * T16, y: y * T16, t: Math.random() * 9, kind: 'brazier', color: '#ff9a4a', r: 4.5, solid: true });
    L0.start = { x: w * 8, y: hh * 8 + 20 };
    enterWorld(L0); L.ambient = .1;
    const h = ED.hero || loadHeroOrNew(); ED.titleHero = h; h.x = L0.start.x; h.y = L0.start.y; h.facing = Math.PI / 2 * .9; h.aim = h.facing; h.act = null; h.z = 0;
    game.cam.snap = true; game.setZoom(1.5); playSong('title');
  },
  update(dt) {
    TITLE.t += dt;
    if (updateUI(dt)) return;
    const h = ED.titleHero, items = titleItems();
    h.rig.update(dt, { x: h.x, y: h.y, z: 0, facing: E.lerpAng(h.facing, Math.PI / 2 + Math.sin(TITLE.t * .4) * .5, .02), pose: TITLE.t % 9 > 7.2 ? 'cheer' : null });
    h.facing = h.rig.facing;
    for (const b of ED.L.torches) b.t += dt;
    const inp = game.input;
    if (inp.repeat('up')) { TITLE.menu = (TITLE.menu + items.length - 1) % items.length; sfx('select'); UI.keyNav = true; }
    if (inp.repeat('down')) { TITLE.menu = (TITLE.menu + 1) % items.length; sfx('select'); UI.keyNav = true; }
    if (inp.pressed('confirm') || inp.pressed('start')) { inp.consumeAll(); sfx('confirm'); items[clamp(TITLE.menu, 0, items.length - 1)][1](); }
    if (Math.random() < dt * 8) { const b = rnd.pick(ED.L.torches); P.add({ kind: 'ember', x: b.x + (Math.random() - .5) * 6, y: b.y + (Math.random() - .5) * 6, z: 14, vx: (Math.random() - .5) * 14, vy: (Math.random() - .5) * 14, vz: 20 + Math.random() * 40, max: 1.2, color: '#ff8a3a' }); }
    game.focus(h.x, h.y - 10, 20);
  },
  draw(r) {
    const L0 = ED.L, h = ED.titleHero;
    L0.map.drawFloor(r); L0.map.queueWalls(r); drawTorches(L0, r);
    r.shadow(h.x, h.y, 5.5, .55);
    r.actor(h.x, h.y, 0, (g, ox, oy) => h.rig.draw(g, ox, oy, r.view), {});
    h.rig.drawSmear(r, h.smear);
    L.add(L0.w * 8, L0.h * 8, 3, 78, .55 + .12 * Math.sin(game.time * 1.7), { color: '#4fe0cc', shadow: true });
    r.overlay(g => {
      const W = r.W, H = r.H, cx = W / 2, a = clamp(TITLE.t / 1.2, 0, 1);
      px.blend(g, .55 * a, 'normal', () => { for (let y = 0; y < 64; y++) px.rect(g, 0, y, W, 1, '#05040a'); });
      E.font.title(g, 'EMBERDEEP', cx, 14, { scale: 4, colors: ['#fff6c8', '#ffd36a', '#ff8a3a', '#b83a1a'], depth: 3, align: 'center' });
      E.font.text(g, 'a my-3D2dge game  •  the deep goes on forever', cx, 50, '#c8c0d8', { align: 'center', shadow: '#05040a', outline: false });
      const items = titleItems(), bw = 118, by = Math.round(H * .56);
      items.forEach(([label, fn], i) => button(g, cx - bw / 2, by + i * 19, bw, 15, label, () => { TITLE.menu = i; fn(); }, { focus: TITLE.menu === i }));
      const h2 = ED.titleHero; if (E.store.get('ed:save', null)) E.font.text(g, 'Level ' + h2.level + ' • deepest ' + h2.maxDepth, cx, by - 11, '#9a90b0', { align: 'center', font: 'tiny', outline: false });
      E.font.text(g, 'WASD MOVE  MOUSE AIMS  LMB RMB 1-4 SKILLS  SPACE DODGE  Q POTION', cx, H - 17, '#8a80a8', { align: 'center', font: 'tiny', outline: false });
      E.font.text(g, 'E USE  T PORTAL  I BAG  K SKILLS  P PASSIVES  V VIEW  ESC MENU', cx, H - 10, '#8a80a8', { align: 'center', font: 'tiny', outline: false });
    });
    drawPanels(r);
  }
};

/* ---------- TOWN ---------- */
const talk = new E.Dialog(game, { bg: ['#2a2040', '#141024'], border: '#c8b8e8' });
const townScene = {
  enter(o = {}) {
    ED.mode = 'town'; ED.depth = 0; UI.closeAll(); BUS.clear('level');
    const L0 = (TOWN.build || TOWN.fallback)();
    L0.mechs = []; enterWorld(L0);
    const h = ED.hero; reviveIfDead(h);
    const at = o.arrive === 'portal' && L0.portalSpot ? L0.portalSpot : L0.start;
    h.x = at.x; h.y = at.y; h.vx = h.vy = 0; h.act = null; h.potions = h.maxPotions; h.hp = h.maxHp;
    if (ED.savedLevel) L0.portal = Object.assign({}, L0.portalSpot || { x: L0.waystone.x + 30, y: L0.waystone.y + 10 }, { t: 0 });
    if (o.arrive === 'intro' || o.arrive === 'waystone') dropIn(h, o.arrive === 'intro' ? 180 : 90);
    game.cam.snap = true; playSong(L0.music || 'town'); saveGame();
    if (o.arrive === 'intro') { showCard('Emberhold', 'THE LAST LIT TOWN', null, 4); game.after(4.5, () => notify('THE WAYSTONE IN THE SQUARE LEADS DOWN.  (E TO USE)', '#bff6ff', 5)); }
  },
  update(dt) {
    if (talk.update(dt)) { if (UI.modal) updateUI(dt); townLife(dt); return; }
    const waiting = updateUI(dt);
    const L0 = ED.L, h = ED.hero, inp = game.input;
    if (waiting) { townLife(dt); return; }
    worldStep(dt, { town: true, canAct: true });
    for (const n of L0.npcs) updateNPC(n, dt);
    // who is close enough to talk to, the waystone, the portal back
    const near = L0.npcs.filter(n => Math.hypot(n.x - h.x, n.y - h.y) < (n.S.talkR || 26)).sort((a, b) => dist2(a, h) - dist2(b, h))[0];
    const onStone = L0.waystone && Math.hypot(L0.waystone.x - h.x, L0.waystone.y - h.y) < 16;
    if (near) { UI.prompt = '[E] Talk to ' + near.S.name; if (inp.pressed('interact')) talkTo(near); }
    else if (onStone) { UI.prompt = '[E] Use the waystone'; if (inp.pressed('interact')) UI.open('waystone'); }
    if (L0.portal && ED.savedLevel && Math.hypot(L0.portal.x - h.x, L0.portal.y - h.y) < 10) returnThroughPortal();
  },
  draw(r) { worldDraw(r); talk.draw(r); }
};
function townLife(dt) { const L0 = ED.L; for (const n of L0.npcs) updateNPC(n, dt); for (const b of L0.torches) b.t += dt; if (L0.theme && L0.theme.ambience) L0.theme.ambience(L0, dt); ED.hero.rig.update(dt, { x: ED.hero.x, y: ED.hero.y, facing: ED.hero.facing, pose: UI.modal ? null : 'hips' }); }
function reviveIfDead(h) { if (h.dead || !h.alive) reviveHero(h); }
function talkTo(n) {
  const S = n.S; n.talking = true;
  const lines = Array.isArray(S.lines) ? [S.lines[(n.talks = (n.talks || 0) + 1) % S.lines.length]] : typeof S.lines === 'function' ? S.lines(n, ED.hero) : ['...'];
  talk.say(lines, { name: S.name, portrait: n.rig, onDone() { n.talking = false; if (S.service && UI.panels[S.service]) UI.open(S.service, { npc: n }); } });
}
function returnThroughPortal() { const S = ED.savedLevel; if (!S) return; sfx('portal'); game.go('level', { resume: S }); }

/* ---------- A DEPTH ---------- */
const levelScene = {
  enter(o = {}) {
    ED.mode = 'level'; UI.closeAll(); BUS.clear('level');
    const h = ED.hero; reviveIfDead(h);
    if (o.resume) {   // back through the portal: the level exactly as it was
      const S = o.resume; ED.savedLevel = null;
      enterWorld(S.L); ED.depth = S.L.depth; ED.foes.push(...S.foes); ED.drops.push(...S.drops); ED.boss = S.boss;
      h.x = S.L.portal.x; h.y = S.L.portal.y + 8; S.L.portal = null;
      for (const id of S.L.mechs) { const M = REG.mechanics[id]; if (M && M.start) M.start(S.L); }
      playSong(S.L.theme.music || 'deep'); game.cam.snap = true; return;
    }
    const depth = o.depth || 1; ED.depth = depth; ED.stats.kills = 0;
    h.visits = h.visits || {}; const visit = h.visits[depth] = (h.visits[depth] || 0) + 1;
    const rec = recipe(depth, visit), L0 = buildLevel(rec);
    enterWorld(L0); populate(L0);
    for (const id of L0.mechs) { const M = REG.mechanics[id]; if (M && M.start) M.start(L0); }
    h.x = L0.start.x; h.y = L0.start.y; h.vx = h.vy = 0; h.act = null; h.facing = h.aim = Math.PI / 4;
    dropIn(h);
    const M = rec.newMech && REG.mechanics[rec.newMech];
    const first = M && !(h.seenMech || []).includes(M.id + (depth > PLANNED ? ':' + rec.mechs.join('+') : ''));
    showCard(rec.name, 'DEPTH ' + depth, M ? Object.assign({}, M, { name: depth > PLANNED ? rec.mechs.map(id => REG.mechanics[id] && REG.mechanics[id].name).filter(Boolean).join(' + ') : M.name }) : null, first ? 6 : 4);
    if (M) { h.seenMech = h.seenMech || []; h.seenMech.push(M.id + (depth > PLANNED ? ':' + rec.mechs.join('+') : '')); }
    if (depth > h.maxDepth) h.maxDepth = depth;
    playSong(L0.theme.music || 'deep'); game.cam.snap = true; saveGame();
    BUS.emit('levelStart', { L: L0 });
  },
  exit() { BUS.emit('levelEnd', { L: ED.L }); game.timeScale = 1; },
  update(dt) {
    if (talk.update(dt)) return;
    if (updateUI(dt)) return;
    const L0 = ED.L, h = ED.hero, inp = game.input;
    worldStep(dt);
    if (h.dead) { if (h.deadT > 2.2 && !UI.isOpen('death')) UI.open('death'); return; }
    if (inp.pressed('portal')) openTownPortal(h);
    // wake the boss when the hero reaches its arena; open the exit when it falls
    const B = ED.boss;
    if (B && B.dormant && Math.hypot(B.x - h.x, B.y - h.y) < 130) { B.dormant = false; B.ai.aware = true; B.introT = 2.2; sfx('roar'); shake(4); }
    if (L0.exit && !L0.exit.open && (!B || !B.alive)) { L0.exit.open = true; notify('THE WAYSTONE WAKES', '#6fd6cc', 3); sfx('chime'); }
    // the exit: stand on it for a moment and it takes you down
    if (L0.exit && L0.exit.open && Math.hypot(L0.exit.x - h.x, L0.exit.y - h.y) < 12 && h.alive) {
      L0.exitT = (L0.exitT || 0) + dt; UI.prompt = 'DESCENDING...';
      if (L0.exitT > .7 && !L0.leaving) { L0.leaving = true; sfx('portal'); startAction(h, { name: 'ascend', cancel: false, moveK: 0, rig: { pose: 'cheer' }, update(dt2) { this.t += dt2; P.glints(h.x, h.y, 10 + this.t * 30, 1, '#bff6ff', 14); return this.t < .8; } }); game.after(.7, () => descend(ED.depth + 1)); }
    } else if (L0.exit) L0.exitT = 0;
    // the town portal: walk in to go home (the level is kept until you come back or go down elsewhere)
    if (L0.portal && L0.portal.t > .6 && Math.hypot(L0.portal.x - h.x, L0.portal.y - h.y) < 9) {
      ED.savedLevel = { L: L0, foes: ED.foes.slice(), drops: ED.drops.slice(), boss: ED.boss };
      sfx('portal'); goTown({ arrive: 'portal' });
    }
  },
  draw(r) { worldDraw(r); talk.draw(r); }
};

/* ---------- THE PROVING GROUNDS: the stress test lives on as an endless horde in the rune hall ---------- */
const PROVE = { wave: 0, next: 0 };
const provingScene = {
  enter() {
    ED.mode = 'proving'; ED.depth = Math.max(1, Math.min(ED.hero.maxDepth, 20)); UI.closeAll(); BUS.clear('level');
    const rec = { depth: ED.depth, seed: 77, name: 'The Proving Grounds', theme: 'crypt', hue: 0, layout: 'halls', mechs: ['powder'], pool: ['husk', 'skeleton', 'knight', 'slime', 'wisp'], size: [64, 44] };
    // the stress test's hall: a grid of pillars, low walls, torches, the rune circle in the middle
    const w = 64, hh = 44, cells = new Array(w * hh).fill(0), R = RNG(5);
    for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) if (!x || !y || x === w - 1 || y === hh - 1) cells[y * w + x] = 1;
    for (let py = 7; py < hh - 4; py += 10) for (let pxx = 7; pxx < w - 4; pxx += 10) { if (Math.abs(pxx + 1 - w / 2) < 6 && Math.abs(py + 1 - hh / 2) < 5) continue; for (let k = 0; k < 4; k++) cells[(py + (k >> 1)) * w + pxx + (k & 1)] = 2; }
    for (let i = 0; i < 16; i++) { const x = 3 + Math.floor(R() * (w - 8)), y = 3 + Math.floor(R() * (hh - 8)), hz = R() < .5; if (Math.abs(x - w / 2) < 7 && Math.abs(y - hh / 2) < 6) continue; for (let k = 0; k < 3; k++) { const cx = x + (hz ? k : 0), cy = y + (hz ? 0 : k); if (cells[cy * w + cx] === 0) cells[cy * w + cx] = 3; } }
    const L0 = { kind: 'proving', rec, depth: ED.depth, name: rec.name, theme: REG.themes.crypt, hue: 0, w, h: hh, cells, tags: new Array(w * hh).fill(null), rooms: [{ x: 2, y: 2, w: w - 4, h: hh - 4, cx: w / 2, cy: hh / 2 }], things: [], props: [], torches: [], runes: [{ x: w * 8, y: hh * 8, r: 54 }], mechs: [], seen: new Uint8Array(w * hh).fill(1), t: 0 };
    L0.pal = CRYPT; L0.map = new E.TileMap({ w, h: hh, tile: T16, cells, types: REG.themes.crypt.walls, floorTex: (x, y, tag) => cryptFloor(L0, x, y, tag, CRYPT) }); L0.flow = new E.FlowField(L0.map);
    L0.randomFloor = (Rr, o) => randomFloor(L0, Rr, o);
    for (let ty = 4; ty < hh - 3; ty += 6) for (let tx = 4; tx < w - 3; tx += 7) { if (Math.hypot(tx - w / 2, ty - hh / 2) < 5 || R() < .5 || cells[ty * w + tx]) continue; L0.torches.push({ x: (tx + .5) * T16, y: (ty + .5) * T16, t: R() * 9, kind: 'brazier', color: '#ff9a4a', r: 4.5, solid: true }); }
    L0.start = { x: w * 8, y: hh * 8 + 40 };
    enterWorld(L0);
    const h = ED.hero; reviveIfDead(h); h.x = L0.start.x; h.y = L0.start.y; h.act = null; dropIn(h, 100);
    PROVE.wave = 0; PROVE.next = 2; playSong('deep2');
    showCard('The Proving Grounds', 'ENDLESS WAVES', { name: 'The stress test', tip: 'Waves grow without end. Esc opens the menu; the difficulty sliders shape the horde.', color: '#ff9a3a' }, 5);
  },
  update(dt) {
    if (updateUI(dt)) return;
    const h = ED.hero;
    worldStep(dt);
    if (h.dead) { if (h.deadT > 2.2 && !UI.isOpen('death')) UI.open('death'); return; }
    if (!ED.foes.length && (PROVE.next -= dt) <= 0) {
      PROVE.wave++; PROVE.next = 2.5; const n = Math.round((12 + PROVE.wave * 10) * DIFF.density);
      notify('WAVE ' + PROVE.wave + ' • ' + n + ' MONSTERS', '#ff9a3a', 2.5);
      const R = RNG(PROVE.wave * 31);
      for (let i = 0; i < Math.ceil(n / 8); i++) { const [x, y] = randomFloor(ED.L, R, {}); if (Math.hypot(x - h.x, y - h.y) < 80) continue; const pk = spawnPack(x, y, { pool: ED.L.rec.pool, n: 8, elite: i === 0 && PROVE.wave % 3 === 0 ? 2 : i % 4 === 1 ? 1 : 0, rng: R }); for (const m of pk) m.ai.aware = true; }
    }
    if (game.input.pressed('portal')) goTown();
  },
  draw(r) { worldDraw(r); r.overlay(g => E.font.text(g, 'WAVE ' + PROVE.wave + ' • ' + ED.foes.length + ' LEFT', r.W / 2, 4, '#ff9a3a', { align: 'center', shadow: '#05040a', outline: false })); }
};

/* ---------- global keys: camera, view, mute, hide HUD ---------- */
const ZOOMS = [.75, 1, 1.25, 1.5, 2, 2.5];
function zoomStep(d) { const i = ZOOMS.findIndex(z => z >= game.zoom - 1e-6), z = ZOOMS[clamp((i < 0 ? 2 : i) + d, 0, ZOOMS.length - 1)]; game.setZoom(z); OPT.zoom = z; saveOpts(); game.note('ZOOM ' + z + 'x'); }
addEventListener('keydown', e => {
  if (e.repeat || ED.mode === 'title' && UI.stack.length) return;
  if (e.code === 'KeyV') { const V = ['iso', 'threequarter', 'topdown', 'brawler']; game.setView(V[(V.indexOf(game.baseView.id) + 1) % V.length]); game.note(game.view.label.toUpperCase() + ' VIEW'); }
  else if (e.code === 'Minus' || e.code === 'NumpadSubtract') zoomStep(-1);
  else if (e.code === 'Equal' || e.code === 'NumpadAdd') zoomStep(1);
  else if (e.code === 'BracketLeft' || e.code === 'BracketRight') { game.rotateView(e.code === 'BracketLeft' ? -45 : 45); game.note('TURN ' + game.yaw); }
  else if (e.code === 'Digit0') { game.resetCamera(); game.setZoom(OPT.zoom); game.note('CAMERA RESET'); }
  else if (e.code === 'KeyM') A.mute();
  else if (e.code === 'KeyH') UI.hideHud = !UI.hideHud;
});
let wheelT = 0;
canvas.addEventListener('wheel', e => { const P0 = UI.top(); if (P0 && P0.wheel) return; const t = performance.now(); if (t - wheelT > 120) { wheelT = t; zoomStep(e.deltaY < 0 ? 1 : -1); } }, { passive: true });
BUS.on('heroDie', () => {});
