/* ============================== GAME START ==============================
 * STARTER HALL: a complete small CO55 game, written to be copied and changed.
 * To make your own game, replace everything between GAME START and GAME END.
 * Sections: 1 game, 2 map, 3 hero, 4 enemies, 5 combat, 6 update, 7 draw, 8 UI.
 * ======================================================================== */
(() => {
'use strict';
const E = CO55, { px, clamp, lerp, approach, TAU } = E;

/* 1. GAME: canvas, starting view, lighting ---------------------------------- */
const game = new E.Game({ canvas: document.getElementById('screen'), view: 'iso', minH: 200, maxW: 520, bg: '#07060d' });
const P = game.particles, L = game.lights;
L.enabled = true; L.ambient = .18;

/* 2. MAP: written as ASCII. # outer wall, P pillar, = low wall, . floor,
 *    T torch, H hero start, h husk, s slime. One character = one 16-unit tile. */
const LAYOUT = [
  '##################',
  '#................#',
  '#.PP..........PP.#',
  '#.PP..T....T..PP.#',
  '#................#',
  '#...h........h...#',
  '#................#',
  '#..s....H.....s..#',
  '#................#',
  '#.PP....==....PP.#',
  '#.PP..........PP.#',
  '##################'
];
const T = 16, MW = LAYOUT[0].length, MH = LAYOUT.length, CX = MW * T / 2, CY = MH * T / 2;
const cells = [], torches = [], spawns = [];
let heroStart = [CX, CY];
LAYOUT.forEach((row, y) => [...row].forEach((ch, x) => {
  cells.push(ch === '#' ? 1 : ch === 'P' ? 2 : ch === '=' ? 3 : 0);
  const at = [(x + .5) * T, (y + .5) * T];
  if (ch === 'T') torches.push({ x: at[0], y: at[1], r: 4.5, t: Math.random() * 9 });
  if (ch === 'H') heroStart = at;
  if (ch === 'h' || ch === 's') spawns.push({ type: ch === 'h' ? 'husk' : 'slime', x: at[0], y: at[1] });
}));
const STONE = { stones: ['#4b4559', '#554f64', '#433e51', '#5d566c'].map(E.hex), mortar: E.hex('#221e2b'), hi: E.hex('#6f6782'), lo: E.hex('#322d3e'), speck: E.hex('#2a2634') };
const RUNE = [...E.hex('#2f7f82'), .5], RUNE_HI = [...E.hex('#6fd6cc'), 1];
function floorTex(x, y) {                        // returns [r, g, b] or [r, g, b, glow]
  const d = Math.hypot(x - CX, y - CY);
  if (Math.abs(d - 30) < .8 || Math.abs(d - 23) < .6) return RUNE;
  if (d < 3) return RUNE_HI;
  if (d > 23 && d < 30 && ((Math.atan2(y - CY, x - CX) / TAU + 1) * 12) % 1 < .07) return RUNE;
  return E.tex.flagstone(x, y, STONE);
}
const map = new E.TileMap({
  w: MW, h: MH, tile: T, cells, floorTex,
  types: {
    1: { h: 46, cut: true, cutH: 7, top: '#57506a', side: '#3d3750', line: '#2a2538', course: 8 },
    2: { h: 40, top: '#6a6280', side: '#4a4360', line: '#302a40', course: 10 },
    3: { h: 12, top: '#5d566f', side: '#433d55', line: '#2e2940', course: 6 }
  }
});
game.cam.bounds = v => map.bounds(v);
const flow = new E.FlowField(map);
const gpu = game.enableGPU({ map, ambient: [.16, .15, .25], wrap: .5 });   // falls back to Canvas lighting by itself
function collide(a) { map.collide(a); for (const t of torches) { const dx = a.x - t.x, dy = a.y - t.y, d = Math.hypot(dx, dy), m = a.r + t.r; if (d < m && d > .01) { a.x = t.x + dx / d * m; a.y = t.y + dy / d * m; } } }

/* 3. HERO: a Humanoid rig with a cape and sword ----------------------------- */
const SWINGS = [   // three-hit combo: slash, backhand, spin
  { a0: 1.75, a1: -1.95, z0: 13, z1: 10, reach: 7.5, wind: .07, active: .1, recover: .2, range: 27, half: 1.35, dmg: 12, kb: 130 },
  { a0: -1.9, a1: 1.8, z0: 10, z1: 12, reach: 7.5, wind: .07, active: .1, recover: .2, range: 27, half: 1.35, dmg: 12, kb: 130 },
  { a0: 1.3, a1: 1.3, spin: true, z0: 11, z1: 11, reach: 8, wind: .12, active: .24, recover: .3, range: 31, half: Math.PI, dmg: 22, kb: 230 }
];
const hero = { x: heroStart[0], y: heroStart[1], vx: 0, vy: 0, r: 4.5, facing: -Math.PI / 2, aim: undefined, hp: 100, max: 100, inv: 0, hurt: 0, dash: 0, dashCD: 0, dashDir: 0, atk: null, combo: -1, comboT: 0, down: 0, ghostT: 0,
  rig: new E.Humanoid({ cape: { len: 6, width: 5, seg: 2.5 }, colors: { cloth: '#2f8f86', cape: '#c8452f', capeIn: '#7a2622', hair: '#2e2230' } }) };
const phaseLen = A => A.spec[A.phase];

function updateHero(dt) {
  const h = hero, inp = game.input, view = game.view;
  h.inv -= dt; h.hurt -= dt; h.dashCD -= dt; h.comboT -= dt;
  if (h.down > 0) { h.down -= dt; if (h.down <= 0) Object.assign(h, { hp: h.max, inv: 1.5, x: heroStart[0], y: heroStart[1] }); return; }
  const mv = inp.move(), md = view.screenDirToGround(mv[0], mv[1]), moving = Math.hypot(md[0], md[1]) > .1;
  if (inp.aimSource === 'mouse') { const m = game.mouseGround(); if (m && Math.hypot(m[0] - h.x, m[1] - h.y) > 3) h.aim = Math.atan2(m[1] - h.y, m[0] - h.x); }
  else if (moving) h.aim = Math.atan2(md[1], md[0]);
  if (inp.buffered('dash') && h.dash <= 0 && h.dashCD <= 0) {
    inp.consume('dash'); h.dashDir = moving ? Math.atan2(md[1], md[0]) : h.facing; h.facing = h.dashDir;
    h.dash = .2; h.dashCD = .5; h.inv = Math.max(h.inv, .24); h.atk = null; P.dust(h.x, h.y, 0, 6, { speed: 40 }); h.rig.kick(-3);
  }
  if (h.dash > 0) { h.dash -= dt; const u = 1 - h.dash / .2, sp = 260 * (1 - .5 * u * u); h.vx = Math.cos(h.dashDir) * sp; h.vy = Math.sin(h.dashDir) * sp; }
  else { const s = h.atk ? .25 : 1; h.vx = approach(h.vx, md[0] * 78 * s, 900 * dt); h.vy = approach(h.vy, md[1] * 78 * s, 900 * dt); }
  if (inp.buffered('attack', .18) && h.dash <= 0 && (!h.atk || (h.atk.phase === 'recover' && h.atk.t > .04))) {
    inp.consume('attack');
    const n = h.atk ? (h.atk.n + 1) % 3 : h.comboT > 0 ? (h.combo + 1) % 3 : 0;
    h.atk = { n, spec: SWINGS[n], phase: 'wind', t: 0, hit: new Set() }; if (h.aim !== undefined) h.facing = h.aim;
  }
  if (h.atk) {
    const A = h.atk; A.t += dt;
    if (A.t >= phaseLen(A)) {
      A.t -= phaseLen(A);
      if (A.phase === 'wind') { A.phase = 'active'; h.vx += Math.cos(h.facing) * 60; h.vy += Math.sin(h.facing) * 60; }
      else if (A.phase === 'active') A.phase = 'recover';
      else { h.combo = A.n; h.comboT = .3; h.atk = null; }
    }
    if (h.atk && h.atk.phase === 'active') swingHits();
  } else if (h.dash <= 0 && h.aim !== undefined) h.facing = E.approachAng(h.facing, h.aim, dt * 16);
  h.x += h.vx * dt; h.y += h.vy * dt; collide(h);
  h.rig.update(dt, { x: h.x, y: h.y, vx: h.vx, vy: h.vy, facing: h.facing, dash: h.dash > 0, hurt: h.hurt > 0,
    attack: h.atk ? { spec: h.atk.spec, phase: h.atk.phase, u: clamp(h.atk.t / phaseLen(h.atk), 0, 1) } : null });
}

/* 4. ENEMIES: husks (skeleton rigs that telegraph a swipe) and slimes (Blob rigs that hop) */
const HUSK_SWING = { a0: 1.5, a1: -.8, z0: 16, z1: 7, reach: 6.5, blade: 0, wind: .45, active: .14, recover: .5 };
const enemies = spawns.map(makeEnemy);
function makeEnemy(sp) {
  const e = { sp, type: sp.type, x: sp.x, y: sp.y, z: 0, vx: 0, vy: 0, vz: 0, r: sp.type === 'husk' ? 5 : 6, hp: sp.type === 'husk' ? 32 : 20, facing: 0, state: 'move', t: 0, stun: 0, flash: 0, dead: 0 };
  e.max = e.hp;
  if (e.type === 'husk') e.rig = new E.Humanoid({ weapon: null, hunch: .4, lean: .18, stride: 5, swing: 2.5, speedRef: 40, armLower: 5.6, headR: 3.2, eyeGlow: '#ff6a3d',
    colors: { skin: '#8fa38a', hair: '#3a3f38', cloth: '#5b4a3c', pants: '#3d3530', boot: '#2c2622', belt: '#7a6a4a' } });
  else e.blob = new E.Blob({ R: 6.2 });
  return e;
}
function updateEnemy(e, dt) {
  if (e.dead > 0) { e.dead -= dt; if (e.dead <= 0) { Object.assign(e, makeEnemy(e.sp)); P.ring(e.x, e.y, 2, 16, '#7fe3d6', .5); } return; }
  e.flash -= dt; e.stun -= dt;
  const h = hero, dx = h.x - e.x, dy = h.y - e.y, d = Math.hypot(dx, dy) || 1, toHero = Math.atan2(dy, dx), alive = h.down <= 0;
  const chase = d < 70 && map.los(e.x, e.y, h.x, h.y) ? [dx / d, dy / d] : flow.dir(e.x, e.y, h.x, h.y);
  if (e.type === 'husk') {
    let mv = [0, 0];
    if (e.stun <= 0 && alive) {
      if (e.state === 'move') { mv = chase; e.facing = E.approachAng(e.facing, Math.atan2(mv[1], mv[0]), dt * 5); if (d < 21) { e.state = 'wind'; e.t = 0; } }
      else {
        e.t += dt;
        if (e.state === 'wind') e.facing = E.approachAng(e.facing, toHero, dt * 2.5);
        if (e.state === 'active' && !e.hit && d < 26 && Math.abs(E.angDiff(e.facing, toHero)) < 1.1) { e.hit = true; hurtHero(12, toHero); }
        if (e.t >= HUSK_SWING[e.state]) { e.t = 0; e.state = e.state === 'wind' ? 'active' : e.state === 'active' ? 'recover' : 'move'; e.hit = false; if (e.state === 'active') { e.vx += Math.cos(e.facing) * 90; e.vy += Math.sin(e.facing) * 90; } }
      }
    }
    e.vx = approach(e.vx, mv[0] * 32, (e.stun > 0 ? 160 : 500) * dt); e.vy = approach(e.vy, mv[1] * 32, (e.stun > 0 ? 160 : 500) * dt);
    e.x += e.vx * dt; e.y += e.vy * dt; collide(e);
    const ph = e.state !== 'move' && e.stun <= 0 ? e.state : null;
    e.rig.update(dt, { x: e.x, y: e.y, vx: e.vx, vy: e.vy, facing: e.facing, hurt: e.stun > 0, attack: ph ? { spec: HUSK_SWING, phase: ph, u: clamp(e.t / HUSK_SWING[ph], 0, 1) } : null });
  } else {
    if (e.z <= 0 && e.vz <= 0) {
      e.vx = approach(e.vx, 0, 400 * dt); e.vy = approach(e.vy, 0, 400 * dt); e.t -= dt;
      if (e.stun <= 0 && alive && e.t <= 0) {
        if (e.state !== 'crouch') { e.state = 'crouch'; e.t = .28; }
        else { e.state = 'air'; e.vz = 150; e.vx = chase[0] * 72; e.vy = chase[1] * 72; e.blob.kick(4.5); }
      }
    }
    if (e.state === 'air') { e.vz -= 480 * dt; e.z += e.vz * dt; if (e.z <= 0) { e.z = e.vz = 0; e.state = 'idle'; e.t = .5 + Math.random() * .5; e.blob.kick(-5); P.dust(e.x, e.y, 0, 4); } }
    e.x += e.vx * dt; e.y += e.vy * dt; collide(e);
    if (alive && e.z < 5 && d < e.r + h.r) hurtHero(8, toHero);
    e.blob.update(dt, { squash: e.state === 'crouch' ? -.32 : e.z > 0 ? clamp(e.vz / 600, -.2, .28) : 0, look: [dx, dy], squint: e.state === 'crouch' });
  }
}

/* 5. COMBAT: hits, knockback, hit-stop, shake, particles --------------------- */
function swingHits() {
  const A = hero.atk, s = A.spec;
  for (const e of enemies) {
    if (e.dead > 0 || A.hit.has(e)) continue;
    const dx = e.x - hero.x, dy = e.y - hero.y, a = Math.atan2(dy, dx);
    if (Math.hypot(dx, dy) > s.range + e.r || (!s.spin && Math.abs(E.angDiff(hero.facing, a)) > s.half)) continue;
    A.hit.add(e); e.hp -= s.dmg; e.flash = .1; e.stun = .22; e.vx += Math.cos(a) * s.kb; e.vy += Math.sin(a) * s.kb;
    if (e.rig) { e.rig.kick(2.5); e.state = 'move'; } else { e.blob.kick(5); e.state = 'idle'; e.t = .5; }
    game.freeze(s.spin ? .075 : .055); game.shake(s.spin ? 3.5 : 2.4);
    P.sparks(lerp(hero.x, e.x, .6), lerp(hero.y, e.y, .6), 10, 9, a); P.text(e.x, e.y, 30, s.dmg, '#fff2c4');
    if (e.hp <= 0) { e.dead = 3; P.bits(e.x, e.y, 8, 14, e.rig ? ['#8fa38a', '#5b4a3c'] : ['#c95f9a', '#f5a3cc']); P.ring(e.x, e.y, 3, 22, '#fff3c4', .35); game.freeze(.08); }
  }
}
function hurtHero(dmg, ang) {
  const h = hero; if (h.inv > 0 || h.down > 0) return;
  h.hp -= dmg; h.inv = .8; h.hurt = .25; h.atk = null; h.vx += Math.cos(ang) * 170; h.vy += Math.sin(ang) * 170;
  game.freeze(.06); game.shake(4); P.text(h.x, h.y, 30, '-' + dmg, '#ff7a6a');
  if (h.hp <= 0) { h.hp = 0; h.down = 1.5; P.bits(h.x, h.y, 8, 20, ['#2f8f86', '#c8452f', '#f1c7a0']); }
}

/* 6. UPDATE: called in fixed ~1/120 s steps --------------------------------- */
function update(dt) {
  updateHero(dt);
  flow.update(hero.x, hero.y);
  for (const e of enemies) updateEnemy(e, dt);
  for (const t of torches) { t.t += dt; if (Math.random() < dt * 8) P.add({ kind: 'ember', x: t.x, y: t.y, z: 14, vx: (Math.random() - .5) * 8, vy: (Math.random() - .5) * 8, vz: 20 + Math.random() * 20, max: 1, color: '#ff8a3a' }); }
  const a = hero.aim !== undefined ? hero.aim : hero.facing;
  game.focus(hero.x + Math.cos(a) * 14, hero.y + Math.sin(a) * 14, 8);
}

/* 7. DRAW: floor, shadows, walls, props, characters, lights, overlays -------- */
const flicker = t => .9 + Math.sin(t * 13) * .05 + Math.sin(t * 29) * .04;
function drawTorch(g, r, t) {
  r.box(g, t.x - 3, t.y - 3, 0, t.x + 3, t.y + 3, 8, '#5d566f', '#433d55');
  px.poly(g, r.groundPts(t.x, t.y, 5.5, 14, 10), '#2b2430');
  px.glow(g, 1);                                                   // everything below glows under GPU lighting
  px.poly(g, r.groundPts(t.x, t.y, 4, 12, 10.2), '#ff8a3c');
  for (let k = 0; k < 3; k++) {
    const b = [t.x + Math.cos(k * 2.1) * 1.6, t.y + Math.sin(k * 2.1) * 1.6], hgt = 7 + Math.sin(t.t * 9 + k * 2) * 2.2, sw = Math.sin(t.t * 6 + k) * 1.4;
    const [x0, y0] = r.w(b[0], b[1], 10), [tx, ty] = r.w(b[0] + sw, b[1], 10 + hgt), w = 2.2 * r.view.scale;
    px.poly(g, [[x0 - w, y0], [tx, ty], [x0 + w, y0]], '#ff7a2a');
    px.poly(g, [[x0 - w * .5, y0], [(x0 + tx) / 2, (y0 + ty) / 2], [x0 + w * .5, y0]], '#ffd36a');
  }
}
let showRig = false;
function draw(r) {
  const view = r.view;
  map.drawFloor(r);
  if (hero.down <= 0) r.shadow(hero.x, hero.y, 5.5, .55);
  for (const e of enemies) if (e.dead <= 0) {
    r.shadow(e.x, e.y, 5.5, .5);
    if (e.state === 'wind' && e.stun <= 0) { const u = clamp(e.t / HUSK_SWING.wind, 0, 1); r.decal(() => r.groundArc(e.x, e.y, 4, 4 + 20 * u, e.facing - 1.05, e.facing + 1.05, '#ff4a3a', .25 + .45 * u), { emissive: .2 + .4 * u }); }
  }
  map.queueWalls(r);
  for (const t of torches) {
    r.queue(t.x, t.y, 0, g => drawTorch(g, r, t));
    L.add(t.x, t.y, 16, 120, 1.2 * flicker(t.t), { color: '#ff9a4a', shadow: true });
    L.caster(t.x, t.y, 4.5, 10); L.heat(t.x, t.y, 17, 7, 1);
  }
  L.add(CX, CY, 3, 60, .45, { color: '#4fe0cc', shadow: true });
  for (const e of enemies) if (e.dead <= 0) {
    if (e.rig) { r.actor(e.x, e.y, 0, (g, ox, oy) => e.rig.draw(g, ox, oy, view), { flash: e.flash > 0 }); L.caster(e.x, e.y, 3.2, 22); }
    else { r.actor(e.x, e.y, e.z, (g, ox, oy) => e.blob.draw(g, ox, oy, view), { flash: e.flash > 0 }); L.caster(e.x, e.y, 5, e.z + 11); }
  }
  if (hero.down <= 0) {
    const h = hero, ghost = h.dash > 0 && game.time - h.ghostT > .03; if (ghost) h.ghostT = game.time;
    const blink = h.inv > 0 && h.hurt <= 0 && Math.floor(game.real * 16) % 2 === 0;
    r.actor(h.x, h.y, 0, (g, ox, oy) => h.rig.draw(g, ox, oy, view), { xray: true, alpha: blink ? .45 : 1, flash: h.hurt > .13 ? '#ffb0a0' : false, ghost: ghost ? { color: '#62d8ff', life: .22 } : null });
    h.rig.drawSmear(r);
    L.add(h.x, h.y, 16, r.gpu ? 80 : 90, r.gpu ? .55 : .8, { color: '#c9c2ec' }); L.caster(h.x, h.y, 3.2, 24);
  }
  r.overlay(g => {
    for (const e of enemies) if (e.dead <= 0 && e.hp < e.max) { const [x, y] = r.w(e.x, e.y, (e.z || 0) + (e.rig ? 33 : 18)), f = Math.round(14 * e.hp / e.max); px.rect(g, x - 8, y - 1, 16, 4, '#140b12'); px.rect(g, x - 7, y, f, 2, '#e0463c'); }
    const w = 40, f = Math.round(w * hero.hp / hero.max); px.rect(g, 5, 5, w + 2, 5, '#140b12'); px.rect(g, 6, 6, f, 3, '#e0463c'); px.rect(g, 6, 6, f, 1, '#ff8a74');
    E.font.text(g, view.label.toUpperCase(), 6, r.H - 10, '#f1e4c8');
    if (showRig) { if (hero.down <= 0) hero.rig.debug(r); for (const e of enemies) if (e.rig && e.dead <= 0) e.rig.debug(r); }
  });
}

/* 8. UI: keyboard toggles and the on-screen buttons ------------------------- */
const $ = id => document.getElementById(id);
function setView(id) { game.setView(id); document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === id))); }
function syncGPU() { const st = gpu.status(); $('gpuBtn').setAttribute('aria-pressed', String(st === 'on')); $('gpuBtn').disabled = st === 'unavailable' || st === 'loading'; $('gpuBtn').title = st === 'unavailable' ? (gpu.failed || 'WebGPU is not available') : ''; }
gpu.onStatus = syncGPU;
document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => { setView(b.dataset.view); b.blur(); }));
$('gpuBtn').addEventListener('click', e => { gpu.enabled = !gpu.enabled; syncGPU(); e.currentTarget.blur(); });
$('rigBtn').addEventListener('click', e => { showRig = !showRig; e.currentTarget.setAttribute('aria-pressed', String(showRig)); e.currentTarget.blur(); });
addEventListener('keydown', e => {
  if (e.repeat) return;
  const order = E.VIEW_ORDER;
  if (e.code === 'KeyV') setView(order[(order.indexOf(game.view.id) + 1) % order.length]);
  else if (/^Digit[1-5]$/.test(e.code)) setView(order[+e.code.slice(5) - 1]);
  else if (e.code === 'KeyG') $('gpuBtn').click();
  else if (e.code === 'KeyR') $('rigBtn').click();
  else if (e.code === 'KeyT') game.timeScale = game.timeScale < 1 ? 1 : .25;
});
game.input.bindButtons(document);
setView('iso'); syncGPU();
game.start({ update, draw });
window.__game = { game, hero, enemies, setView, gpu };
})();
/* =============================== GAME END =============================== */
