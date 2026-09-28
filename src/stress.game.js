/* =============================================================================
 * CO55 STRESS TEST
 * Push the engine: thousands of animated monsters, up to 30 shadow-casting torches,
 * particle storms, a pull-back camera that multiplies the pixel count, and toggles
 * for every expensive feature. Live metrics show where each frame's time goes, and
 * the benchmark ramps the crowd up step by step to rate this device.
 * ============================================================================= */
(() => {
'use strict';
const E = CO55, { px, clamp, lerp, approach, TAU } = E;
const qs = new URLSearchParams(location.search);

/* ---------- setup ---------- */
const canvas = document.getElementById('screen');
const BASE = { minH: 200, minW: 300, maxW: 540, maxH: 330 };
const game = new E.Game(Object.assign({ canvas, view: qs.get('view') || 'iso', bg: '#06050b' }, BASE));
const P = game.particles;
game.lights.enabled = true; game.lights.ambient = .12;

const S = { monsters: 0, mix: 'balanced', behavior: 'swarm', lights: 12, rate: 0, pcap: 2000, distance: 1, god: true, outlines: true, capes: false, lod: false, monsterLights: false };

/* ---------- map: a large hall with a grid of pillars ---------- */
const MW = 64, MH = 44, T = 16, CX = MW * T / 2, CY = MH * T / 2;
const cells = new Array(MW * MH).fill(0);
const setC = (x, y, v) => { if (x >= 0 && y >= 0 && x < MW && y < MH) cells[y * MW + x] = v; };
for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (!x || !y || x === MW - 1 || y === MH - 1) setC(x, y, 1);
for (let py = 7; py < MH - 4; py += 10) for (let pxx = 7; pxx < MW - 4; pxx += 10) {
  if (Math.abs(pxx + 1 - MW / 2) < 6 && Math.abs(py + 1 - MH / 2) < 5) continue;
  for (let k = 0; k < 4; k++) setC(pxx + (k & 1), py + (k >> 1), 2);
}
{
  const R = E.rng(5);
  for (let i = 0; i < 16; i++) {
    const x = 3 + Math.floor(R() * (MW - 8)), y = 3 + Math.floor(R() * (MH - 8)), horiz = R() < .5;
    if (Math.abs(x - MW / 2) < 7 && Math.abs(y - MH / 2) < 6) continue;
    for (let k = 0; k < 3; k++) { const cx = x + (horiz ? k : 0), cy = y + (horiz ? 0 : k); if (cells[cy * MW + cx] === 0) setC(cx, cy, 3); }
  }
}
const PAL = { stones: ['#4b4559', '#554f64', '#433e51', '#5d566c'].map(E.hex), mortar: E.hex('#221e2b'), hi: E.hex('#6f6782'), lo: E.hex('#322d3e'), speck: E.hex('#2a2634') };
const RUNE = [...E.hex('#2f7f82'), .45], RUNE_HI = [...E.hex('#6fd6cc'), 1], MOSS = [E.hex('#3f5a44'), E.hex('#4d6b4b')];
function floorTex(x, y) {
  const dx = x - CX, dy = y - CY, d = Math.hypot(dx, dy);
  if (Math.abs(d - 54) < .8 || Math.abs(d - 43) < .6) return RUNE;
  if (d > 43 && d < 54) {
    const a = (Math.atan2(dy, dx) / TAU + 1) * 16, k = a % 1;
    if (k < .05) return RUNE;
    if (Math.abs(d - 48.5) < 2 && E.hash2(Math.floor(a), Math.floor(d * .5)) > .35 && ((Math.floor(x) + Math.floor(y)) & 1)) return RUNE_HI;
  }
  if (d < 7) return d < 3 ? RUNE_HI : E.tex.flagstone(x, y, PAL);
  let c = E.tex.flagstone(x, y, PAL);
  const edge = Math.min(x - T, y - T, MW * T - T - x, MH * T - T - y);
  if (edge < 22 && E.noise2(x * .13, y * .13) > .5 + edge * .014) c = MOSS[E.hash2(x | 0, y | 0) < .5 ? 0 : 1];
  return c;
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
const gpu = game.enableGPU({ map, ambient: [.15, .14, .24], wrap: .5, bands: 6, offscreen: qs.has('gpu-offscreen') });

/* ---------- torches (the first N are lit) ---------- */
const TORCHES = [];
{
  const R = E.rng(9), cand = [];
  for (let ty = 4; ty < MH - 3; ty += 6) for (let tx = 4; tx < MW - 3; tx += 7) {
    const x = tx + ((R() * 2) | 0), y = ty + ((R() * 2) | 0);
    if (Math.hypot(x - MW / 2, y - MH / 2) < 5) continue;
    let ok = true; for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) if (cells[(y + oy) * MW + x + ox] !== 0) ok = false;
    if (ok) cand.push({ x: (x + .5) * T, y: (y + .5) * T, r: 4.5, t: R() * 9 });
  }
  for (let i = cand.length - 1; i > 0; i--) { const j = (R() * (i + 1)) | 0; [cand[i], cand[j]] = [cand[j], cand[i]]; }
  TORCHES.push(...cand.slice(0, 30));
}
const activeTorches = () => TORCHES.slice(0, S.lights);
function pushFromCircle(a, b, rad) { const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy), m = a.r + rad; if (d < m && d > .001) { a.x = b.x + dx / d * m; a.y = b.y + dy / d * m; } }
function collideWorld(a) { map.collide(a); for (let i = 0; i < S.lights; i++) pushFromCircle(a, TORCHES[i], TORCHES[i].r); }

/* ---------- hero ---------- */
const SPEED = 80;
const SWINGS = [
  { a0: 1.75, a1: -1.95, z0: 13, z1: 10, reach: 7.5, wind: .07, active: .1, recover: .2, range: 27, half: 1.35, dmg: 12, kb: 130, lunge: 70 },
  { a0: -1.9, a1: 1.8, z0: 10, z1: 12, reach: 7.5, wind: .07, active: .1, recover: .2, range: 27, half: 1.35, dmg: 12, kb: 130, lunge: 70 },
  { a0: 1.3, a1: 1.3, spin: true, z0: 11, z1: 11, reach: 8, wind: .12, active: .24, recover: .3, range: 34, half: Math.PI, dmg: 22, kb: 230, lunge: 40 }
];
const hero = {
  x: CX, y: CY + 40, z: 0, vx: 0, vy: 0, r: 4.5, facing: -Math.PI / 2, aim: undefined, hp: 100, max: 100, inv: 0, hurtT: 0, flash: 0,
  dashT: 0, dashCD: 0, dashDir: 0, boltCD: 0, atk: null, lastN: -1, comboT: 0, dead: false, deadT: 0, lastGhost: 0,
  rig: new E.Humanoid({ cape: { len: 6, width: 5, seg: 2.5 }, colors: { cloth: '#2f8f86', cape: '#c8452f', capeIn: '#7a2622', hair: '#2e2230' } })
};
const phaseDur = A => A.phase === 'wind' ? A.spec.wind : A.phase === 'active' ? A.spec.active : A.spec.recover;
function updateHero(dt) {
  const h = hero, inp = game.input, view = game.view;
  h.inv -= dt; h.hurtT -= dt; h.dashCD -= dt; h.boltCD -= dt; h.comboT -= dt; h.flash -= dt;
  if (h.dead) { h.deadT += dt; if (h.deadT > 2) Object.assign(h, { dead: false, hp: h.max, inv: 1.5, x: CX, y: CY + 40, vx: 0, vy: 0 }); return; }
  const mv = inp.move(), md = view.screenDirToGround(mv[0], mv[1]), mlen = Math.hypot(md[0], md[1]);
  let aimA = null;
  if (inp.aimSource === 'mouse') { const m = game.mouseGround(); if (m && Math.hypot(m[0] - h.x, m[1] - h.y) > 3) aimA = Math.atan2(m[1] - h.y, m[0] - h.x); }
  else if (inp.aimSource === 'pad' && inp.padAim) { const d = view.screenDirToGround(inp.padAim[0], inp.padAim[1]); aimA = Math.atan2(d[1], d[0]); }
  if (aimA === null && mlen > .1) aimA = Math.atan2(md[1], md[0]);
  if (aimA !== null) h.aim = aimA;
  if (inp.buffered('dash', .12) && h.dashCD <= 0 && h.dashT <= 0) {
    inp.consume('dash'); const a = mlen > .1 ? Math.atan2(md[1], md[0]) : h.facing;
    Object.assign(h, { dashDir: a, dashT: .2, dashCD: .45, atk: null, facing: a }); h.inv = Math.max(h.inv, .24);
    P.dust(h.x, h.y, 0, 6, { speed: 40 }); P.ring(h.x, h.y, 3, 14, '#bff6ff', .25); h.rig.kick(-3);
  }
  if (h.dashT > 0) { h.dashT -= dt; const u = 1 - h.dashT / .2, sp = 260 * (1 - .5 * u * u); h.vx = Math.cos(h.dashDir) * sp; h.vy = Math.sin(h.dashDir) * sp; }
  else { const slow = h.atk ? .25 : 1, acc = 900 * dt; h.vx = approach(h.vx, md[0] * SPEED * slow, acc); h.vy = approach(h.vy, md[1] * SPEED * slow, acc); }
  if (inp.buffered('attack', .18) && h.dashT <= 0 && (!h.atk || (h.atk.phase === 'recover' && h.atk.t > .04))) {
    inp.consume('attack');
    const n = h.atk ? (h.atk.n + 1) % 3 : (h.comboT > 0 ? (h.lastN + 1) % 3 : 0);
    h.atk = { n, spec: SWINGS[n], phase: 'wind', t: 0, hit: new Set() }; if (h.aim !== undefined) h.facing = h.aim;
  }
  if (h.atk) {
    const A = h.atk, sp = A.spec; A.t += dt;
    if (A.phase === 'wind' && A.t >= sp.wind) { A.phase = 'active'; A.t -= sp.wind; h.vx += Math.cos(h.facing) * sp.lunge; h.vy += Math.sin(h.facing) * sp.lunge; }
    else if (A.phase === 'active') { swingHits(); if (A.t >= sp.active) { A.phase = 'recover'; A.t -= sp.active; } }
    else if (A.phase === 'recover' && A.t >= sp.recover) { h.lastN = A.n; h.comboT = .3; h.atk = null; }
  }
  if (inp.buffered('skill', .15) && h.boltCD <= 0) { inp.consume('skill'); fireBolt(); h.boltCD = .3; }
  if (!h.atk && h.dashT <= 0 && h.aim !== undefined) h.facing = E.approachAng(h.facing, h.aim, dt * 16);
  h.x += h.vx * dt; h.y += h.vy * dt; collideWorld(h);
  h.rig.update(dt, { x: h.x, y: h.y, z: 0, vx: h.vx, vy: h.vy, facing: h.facing, dash: h.dashT > 0, hurt: h.hurtT > 0,
    attack: h.atk ? { spec: h.atk.spec, phase: h.atk.phase, u: clamp(h.atk.t / phaseDur(h.atk), 0, 1) } : null });
}
function hurtHero(dmg, ang) {
  const h = hero; if (S.god || h.inv > 0 || h.dead) return;
  h.hp -= dmg; h.inv = .8; h.hurtT = .25; h.flash = .12; h.atk = null; h.vx += Math.cos(ang) * 170; h.vy += Math.sin(ang) * 170;
  game.freeze(.05); game.shake(3); P.text(h.x, h.y, 30, '-' + dmg, '#ff7a6a');
  if (h.hp <= 0) { h.hp = 0; h.dead = true; h.deadT = 0; P.bits(h.x, h.y, 8, 20, ['#2f8f86', '#c8452f', '#f1c7a0']); }
}

/* ---------- projectiles ---------- */
const shots = [];
function fireBolt() {
  const h = hero, a = h.aim !== undefined ? h.aim : h.facing; h.facing = a;
  shots.push({ x: h.x + Math.cos(a) * 8, y: h.y + Math.sin(a) * 8, z: 11, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, life: 1.2, from: 'hero', dmg: 9, color: '#ffb347', core: '#fff3c4', r: 3 });
}
function updateShots(dt) {
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i]; s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt;
    let dead = s.life <= 0 || map.solidAt(s.x, s.y);
    if (!dead && s.from === 'hero') { for (const e of near(s.x, s.y)) if (e.alive && e.spawnT <= 0 && Math.hypot(e.x - s.x, e.y - s.y) < e.r + s.r) { damageEnemy(e, s.dmg, Math.atan2(s.vy, s.vx), 70, false); dead = true; break; } }
    else if (!dead && s.from === 'enemy' && Math.hypot(hero.x - s.x, hero.y - s.y) < hero.r + s.r) { hurtHero(s.dmg, Math.atan2(s.vy, s.vx)); dead = true; }
    if (dead) { P.ring(s.x, s.y, 1, 9, s.color, .2); shots.splice(i, 1); }
  }
}

/* ---------- monsters ---------- */
const enemies = [];
const HUSK = { wind: .45, active: .14, recover: .5 };
const HUSK_SWING = { a0: 1.5, a1: -.8, z0: 16, z1: 7, reach: 6.5, blade: 0 };
const MONSTER_CAPE = { len: 5, width: 4, seg: 2.3 };
const HUSK_COLORS = [
  { skin: '#8fa38a', hair: '#3a3f38', cloth: '#5b4a3c', pants: '#3d3530', boot: '#2c2622', belt: '#7a6a4a', cape: '#4a3a5a', capeIn: '#2c2236' },
  { skin: '#9a9a7a', hair: '#403a30', cloth: '#4a5a4c', pants: '#35302c', boot: '#2a2420', belt: '#6a5a3a', cape: '#5a3a30', capeIn: '#32201a' },
  { skin: '#7f9a9a', hair: '#303a3f', cloth: '#5a4a5a', pants: '#302a36', boot: '#221e26', belt: '#6a6a7a', cape: '#3a4a5a', capeIn: '#202a36' }
];
function makeHusk(x, y) {
  const c = HUSK_COLORS[(Math.random() * 3) | 0];
  return { type: 'husk', x, y, z: 0, vx: 0, vy: 0, r: 5, hp: 32, max: 32, facing: Math.random() * TAU, state: 'move', t: 0, stun: 0, flash: 0, spawnT: .6, alive: true, head: 30,
    speed: 28 + Math.random() * 12,
    rig: new E.Humanoid({ weapon: null, hunch: .4, lean: .18, stride: 5, swing: 2.5, speedRef: 40, armLower: 5.6, headR: 3.2, eyeGlow: '#ff6a3d', colors: c, cape: S.capes ? MONSTER_CAPE : null }) };
}
function makeSlime(x, y) {
  return { type: 'slime', x, y, z: 0, vx: 0, vy: 0, vz: 0, r: 6, hp: 20, max: 20, state: 'idle', t: Math.random(), stun: 0, flash: 0, spawnT: .6, alive: true, head: 16, blob: new E.Blob({ R: 6.2 }) };
}
function makeWisp(x, y) {
  return { type: 'wisp', x, y, z: 20, vx: 0, vy: 0, r: 5, hp: 14, max: 14, t: Math.random() * 9, fire: 2 + Math.random() * 2, charge: 0, stun: 0, flash: 0, spawnT: .6, alive: true, orbit: Math.random() < .5 ? 1 : -1, head: 10 };
}
const MAKERS = { husk: makeHusk, slime: makeSlime, wisp: makeWisp };
function pickType() {
  if (S.mix === 'husks') return 'husk'; if (S.mix === 'slimes') return 'slime'; if (S.mix === 'wisps') return 'wisp';
  const r = Math.random(); return r < .5 ? 'husk' : r < .8 ? 'slime' : 'wisp';
}
function randomFloor(minDist) {
  for (let k = 0; k < 30; k++) {
    const cx = 2 + ((Math.random() * (MW - 4)) | 0), cy = 2 + ((Math.random() * (MH - 4)) | 0);
    if (cells[cy * MW + cx] !== 0) continue;
    const x = (cx + Math.random()) * T, y = (cy + Math.random()) * T;
    if (minDist && Math.hypot(x - hero.x, y - hero.y) < minDist) continue;
    return [x, y];
  }
  return [CX + (Math.random() - .5) * 200, CY - 120];
}
function spawnOne(instant) {
  const [x, y] = randomFloor(S.behavior === 'swarm' ? 80 : 0), e = MAKERS[pickType()](x, y);
  if (instant) e.spawnT = 0; enemies.push(e); return e;
}
/** grow or shrink the crowd to exactly n (instant = skip the spawn fade) */
function setMonsters(n, instant) {
  S.monsters = n;
  while (enemies.length > n) enemies.pop();
  while (enemies.length < n) spawnOne(instant);
}
function applyCapes() { for (const e of enemies) if (e.rig) { e.rig.o.cape = S.capes ? MONSTER_CAPE : null; e.rig.capeL = null; } }

// spatial hash: keeps crowd separation cheap even with thousands of monsters
const grid = new Map(), GC = 12, gkey = (x, y) => ((x / GC) | 0) + ((y / GC) | 0) * 8192;
function rebuildGrid() { grid.clear(); for (const e of enemies) { if (!e.alive) continue; const k = gkey(e.x, e.y); let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(e); } }
function near(x, y, rad = 1) {
  const out = [], cx = (x / GC) | 0, cy = (y / GC) | 0;
  for (let oy = -rad; oy <= rad; oy++) for (let ox = -rad; ox <= rad; ox++) { const a = grid.get(cx + ox + (cy + oy) * 8192); if (a) out.push(...a); }
  return out;
}
function separate() {
  for (const e of enemies) {
    if (!e.alive) continue;
    const cx = (e.x / GC) | 0, cy = (e.y / GC) | 0;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const a = grid.get(cx + ox + (cy + oy) * 8192); if (!a) continue;
      for (const b of a) {
        if (b === e) continue;
        const dx = e.x - b.x, dy = e.y - b.y, d = Math.hypot(dx, dy), m = e.r + b.r;
        if (d < m && d > .01) { const k = (m - d) / d * .5; e.x += dx * k; e.y += dy * k; }
      }
    }
  }
}
function steer(e, dt) {
  const h = hero;
  if (S.behavior === 'swarm' && !h.dead) { const dx = h.x - e.x, dy = h.y - e.y, d = Math.hypot(dx, dy) || 1; return d < 70 ? [dx / d, dy / d] : flow.dir(e.x, e.y, h.x, h.y); }
  if (S.behavior === 'wander') {
    e.wtT = (e.wtT || 0) - dt;
    if (!e.wt || e.wtT <= 0 || Math.hypot(e.wt[0] - e.x, e.wt[1] - e.y) < 6) {
      e.wtT = 2 + Math.random() * 4;
      const a = Math.random() * TAU, d = 20 + Math.random() * 60, x = e.x + Math.cos(a) * d, y = e.y + Math.sin(a) * d;
      e.wt = map.solidAt(x, y) ? [e.x - Math.cos(a) * 10, e.y - Math.sin(a) * 10] : [x, y];
    }
    const dx = e.wt[0] - e.x, dy = e.wt[1] - e.y, d = Math.hypot(dx, dy) || 1; return [dx / d * .6, dy / d * .6];
  }
  return [0, 0];
}
function onScreen(e) {
  const s = game.view.p(e.x, e.y, 0), vx = s[0] - game.cam.x, vy = s[1] - game.cam.y;
  return vx > -80 && vx < game.screen.W + 80 && vy > -60 && vy < game.screen.H + 140;
}
function updateEnemies(dt) {
  if (S.behavior === 'freeze') { rebuildGrid(); return; }
  if (S.behavior === 'swarm') flow.update(hero.x, hero.y);
  rebuildGrid();
  for (const e of enemies) {
    if (!e.alive) continue;
    e.flash -= dt; e.stun -= dt;
    if (e.spawnT > 0) { e.spawnT -= dt; continue; }
    const vis = !S.lod || onScreen(e);
    if (e.type === 'husk') updateHusk(e, dt, vis); else if (e.type === 'slime') updateSlime(e, dt, vis); else updateWisp(e, dt, vis);
  }
  separate();
  for (let i = enemies.length - 1; i >= 0; i--) if (!enemies[i].alive) enemies.splice(i, 1);
  for (let k = 0; k < 40 && enemies.length < S.monsters; k++) spawnOne(false);
}
function updateHusk(e, dt, vis) {
  const h = hero, dx = h.x - e.x, dy = h.y - e.y, d = Math.hypot(dx, dy) || 1, toH = Math.atan2(dy, dx);
  let mv = [0, 0];
  if (e.stun <= 0) {
    if (e.state === 'move') {
      mv = steer(e, dt);
      if (mv[0] || mv[1]) e.facing = E.approachAng(e.facing, Math.atan2(mv[1], mv[0]), dt * 5);
      if (S.behavior === 'swarm' && d < 21 && !h.dead) { e.state = 'wind'; e.t = 0; }
    } else if (e.state === 'wind') { e.t += dt; e.facing = E.approachAng(e.facing, toH, dt * 2.5); if (e.t >= HUSK.wind) { e.state = 'active'; e.t = 0; e.hitDone = false; e.vx += Math.cos(e.facing) * 90; e.vy += Math.sin(e.facing) * 90; } }
    else if (e.state === 'active') { e.t += dt; if (!e.hitDone && d < 26 && Math.abs(E.angDiff(e.facing, toH)) < 1.1) { e.hitDone = true; hurtHero(10, toH); } if (e.t >= HUSK.active) { e.state = 'recover'; e.t = 0; } }
    else if (e.state === 'recover') { e.t += dt; if (e.t >= HUSK.recover) e.state = 'move'; }
  }
  const acc = (e.stun > 0 ? 160 : 500) * dt;
  e.vx = approach(e.vx, mv[0] * e.speed, acc); e.vy = approach(e.vy, mv[1] * e.speed, acc);
  e.x += e.vx * dt; e.y += e.vy * dt; collideWorld(e);
  if (!vis) return;
  const ph = e.state !== 'move' && e.stun <= 0 ? e.state : null;
  e.rig.update(dt, { x: e.x, y: e.y, z: 0, vx: e.vx, vy: e.vy, facing: e.facing, hurt: e.stun > 0, attack: ph ? { spec: HUSK_SWING, phase: ph, u: clamp(e.t / HUSK[ph], 0, 1) } : null });
}
function updateSlime(e, dt, vis) {
  const h = hero;
  if (e.z <= 0 && e.vz <= 0) {
    e.vx = approach(e.vx, 0, 400 * dt); e.vy = approach(e.vy, 0, 400 * dt);
    if (e.stun <= 0 && S.behavior !== 'hold') {
      e.t -= dt;
      if (e.state === 'idle' && e.t <= 0) { e.state = 'crouch'; e.t = .28; }
      else if (e.state === 'crouch' && e.t <= 0) { const dir = steer(e, dt), l = Math.hypot(dir[0], dir[1]) || 1; e.state = 'air'; e.vz = 150; e.vx = dir[0] / l * 70; e.vy = dir[1] / l * 70; e.blob.kick(4.5); }
    }
  }
  if (e.state === 'air' || e.z > 0) { e.vz -= 480 * dt; e.z += e.vz * dt; if (e.z <= 0) { e.z = 0; e.vz = 0; e.state = 'idle'; e.t = .45 + Math.random() * .6; e.blob.kick(-5); } }
  e.x += e.vx * dt; e.y += e.vy * dt; collideWorld(e);
  const dx = h.x - e.x, dy = h.y - e.y;
  if (!h.dead && e.z < 5 && Math.hypot(dx, dy) < e.r + h.r) hurtHero(6, Math.atan2(dy, dx));
  if (vis) e.blob.update(dt, { squash: e.state === 'crouch' ? -.32 : e.z > 0 ? clamp(e.vz / 600, -.2, .28) : 0, look: [dx, dy], squint: e.state === 'crouch' });
}
function updateWisp(e, dt) {
  const h = hero, dx = h.x - e.x, dy = h.y - e.y, d = Math.hypot(dx, dy) || 1; e.t += dt;
  let ax = 0, ay = 0;
  if (e.stun <= 0) {
    if (S.behavior === 'swarm') { const want = d > 100 ? 1 : d < 70 ? -1 : 0; ax = dx / d * want * 60 + (-dy / d) * e.orbit * 34; ay = dy / d * want * 60 + (dx / d) * e.orbit * 34; }
    else if (S.behavior === 'wander') { const s = steer(e, dt); ax = s[0] * 50; ay = s[1] * 50; }
  }
  e.vx += (ax - e.vx * 1.6) * dt; e.vy += (ay - e.vy * 1.6) * dt; e.x += e.vx * dt; e.y += e.vy * dt; collideWorld(e);
  e.z = 20 + Math.sin(e.t * 2) * 3;
  if (S.behavior === 'swarm' && !h.dead && e.stun <= 0 && d < 160) {
    if (e.charge > 0) { e.charge -= dt; if (e.charge <= 0) { const a = Math.atan2(dy, dx); shots.push({ x: e.x, y: e.y, z: e.z, vx: Math.cos(a) * 95, vy: Math.sin(a) * 95, life: 3, from: 'enemy', dmg: 8, color: '#c78bff', core: '#f4e6ff', r: 3 }); e.fire = 2.5 + Math.random() * 2; } }
    else { e.fire -= dt; if (e.fire <= 0) e.charge = .6; }
  }
}

/* ---------- combat ---------- */
function swingHits() {
  const A = hero.atk, sp = A.spec;
  for (const e of near(hero.x, hero.y, 3)) {
    if (!e.alive || e.spawnT > 0 || A.hit.has(e)) continue;
    const dx = e.x - hero.x, dy = e.y - hero.y, d = Math.hypot(dx, dy);
    if (d > sp.range + e.r) continue;
    if (!sp.spin && Math.abs(E.angDiff(hero.facing, Math.atan2(dy, dx))) > sp.half) continue;
    A.hit.add(e); damageEnemy(e, sp.dmg, Math.atan2(dy, dx), sp.kb, sp.spin);
  }
}
const BITS = { husk: ['#8fa38a', '#5b4a3c', '#3d3530'], slime: ['#c95f9a', '#f5a3cc', '#6d2658'], wisp: ['#c78bff', '#f4e6ff', '#7a4ac0'] };
function damageEnemy(e, dmg, ang, kb, big) {
  e.hp -= dmg; e.flash = .1; e.stun = .22; e.vx += Math.cos(ang) * kb; e.vy += Math.sin(ang) * kb;
  if (e.type === 'husk') { e.state = 'move'; e.rig.kick(2.5); } else if (e.type === 'slime') { e.blob.kick(5); e.state = 'idle'; e.t = .5; } else e.charge = 0;
  game.freeze(big ? .06 : .045); game.shake(big ? 3 : 2);
  P.sparks(lerp(hero.x, e.x, .6), lerp(hero.y, e.y, .6), e.type === 'wisp' ? e.z : 10, 7, ang);
  P.text(e.x, e.y, (e.z || 0) + e.head + 4, dmg, big ? '#ffd36a' : '#fff2c4');
  if (e.hp <= 0) { e.alive = false; P.bits(e.x, e.y, (e.z || 0) + 6, 12, BITS[e.type]); P.ring(e.x, e.y, 3, 22, BITS[e.type][1], .3); }
}

/* ---------- particle storm ---------- */
let emitAcc = 0;
function storm(dt) {
  P.max = S.pcap;
  if (!S.rate) { emitAcc = 0; return; }
  emitAcc += S.rate * dt;
  const torches = activeTorches();
  while (emitAcc >= 1) {
    emitAcc--;
    if (torches.length && Math.random() < .45) {
      const b = torches[(Math.random() * torches.length) | 0];
      P.add({ kind: 'ember', x: b.x + (Math.random() - .5) * 6, y: b.y + (Math.random() - .5) * 6, z: 14, vx: (Math.random() - .5) * 14, vy: (Math.random() - .5) * 14, vz: 20 + Math.random() * 40, max: .8 + Math.random() * .8, color: '#ff8a3a' });
    } else {
      const a = Math.random() * TAU, rr = Math.random() * 170, x = hero.x + Math.cos(a) * rr, y = hero.y + Math.sin(a) * rr, k = Math.random();
      P.add({ kind: k < .55 ? 'spark' : k < .8 ? 'dust' : 'bit', x, y, z: 2, vx: (Math.random() - .5) * 60, vy: (Math.random() - .5) * 60, vz: 60 + Math.random() * 120, g: 300, drag: 1.5, bounce: .4, max: .6 + Math.random() * .6, color: k < .8 ? '#ffb85c' : '#7fe3d6', size: 1.3 });
    }
  }
}

/* ---------- update ---------- */
function update(dt) {
  updateHero(dt);
  updateEnemies(dt);
  updateShots(dt);
  storm(dt);
  for (const b of TORCHES) b.t += dt;
  const a = hero.aim !== undefined ? hero.aim : hero.facing;
  game.focus(hero.x + Math.cos(a) * 16, hero.y + Math.sin(a) * 16, 8);
}

/* ---------- draw ---------- */
const flicker = t => .9 + Math.sin(t * 13) * .05 + Math.sin(t * 29) * .04 + Math.sin(t * 7.3) * .04;
function drawFlame(g, r, x, y, z, t) {
  px.glow(g, 1);
  const sc = r.view.scale;
  for (let k = 0; k < 3; k++) {
    const a = k * 2.1 + t * .6, bx = x + Math.cos(a) * 1.6, by = y + Math.sin(a) * 1.6, h = 7 + Math.sin(t * 9 + k * 2) * 2.2 + Math.sin(t * 17 + k) * 1.2, sw = Math.sin(t * 6 + k * 1.7) * 1.4;
    const [x0, y0] = r.w(bx, by, z), [tx, ty] = r.w(bx + sw, by, z + h), w = 2.2 * sc;
    px.poly(g, [[x0 - w, y0], [tx, ty], [x0 + w, y0]], '#ff7a2a');
    const [mx, my] = r.w(bx + sw * .5, by, z + h * .65); px.poly(g, [[x0 - w * .55, y0], [mx, my], [x0 + w * .55, y0]], '#ffd36a');
  }
}
function drawBrazier(g, r, b) {
  r.box(g, b.x - 3, b.y - 3, 0, b.x + 3, b.y + 3, 8, '#5d566f', '#433d55');
  px.poly(g, r.groundPts(b.x, b.y, 5.5, 14, 11), '#2b2430'); px.poly(g, r.groundPts(b.x, b.y, 5.5, 14, 9), '#3a3036');
  px.glow(g, .9); px.poly(g, r.groundPts(b.x, b.y, 4, 12, 11.2), '#ff8a3c');
  drawFlame(g, r, b.x, b.y, 11, b.t);
}
function drawWisp(g, ox, oy, e) {
  const k = e.charge > 0 ? 1 + (1 - e.charge / .6) * .8 : 1;
  game.r.glowDisc(g, ox, oy, 7 * k, '#7a4ac0', .55);
  px.disc(g, ox, oy, 3.2 * k, e.flash > 0 ? '#ffffff' : '#c78bff'); px.disc(g, ox - .5, oy - .5, 1.8 * k, '#f4e6ff');
  for (let i = 0; i < 3; i++) { const a = e.t * 4 + i * TAU / 3; px.dot(g, ox + Math.cos(a) * 6, oy + Math.sin(a) * 3, '#e3c8ff'); }
}
function draw(r) {
  const view = r.view, L = game.lights, t = game.time;
  map.drawFloor(r);
  if (!hero.dead) r.shadow(hero.x, hero.y, 5.5, .55);
  map.queueWalls(r);
  let heats = 0;
  for (let i = 0; i < S.lights; i++) {
    const b = TORCHES[i];
    if (r.visible(b.x, b.y, 0)) { r.queue(b.x, b.y, 0, g => drawBrazier(g, r, b)); if (heats++ < 8) L.heat(b.x, b.y, 17, 7, 1.1); }
    L.add(b.x, b.y, 16, 124, 1.25 * flicker(b.t), { color: '#ff9a4a', shadow: true });
    L.caster(b.x, b.y, 4.5, 11);
  }
  L.add(CX, CY, 3, 78, .5 + .12 * Math.sin(t * 1.7), { color: '#4fe0cc', shadow: true });
  let monsterLights = 0;
  const outline = S.outlines;
  for (const e of enemies) {
    if (!e.alive) continue;
    const alpha = e.spawnT > 0 ? clamp(1 - e.spawnT / .6, .05, 1) : 1, flash = e.flash > 0;
    if (e.type === 'husk') {
      if (!r.visible(e.x, e.y, 0)) { r.game.stats.culled++; continue; }
      r.shadow(e.x, e.y, 5, .5);
      if (e.state === 'wind' && e.stun <= 0) { const u = clamp(e.t / HUSK.wind, 0, 1); r.decal(() => r.groundArc(e.x, e.y, 4, 4 + 20 * u, e.facing - 1.05, e.facing + 1.05, '#ff4a3a', .25 + .45 * u), { emissive: .2 + .35 * u }); }
      if (r.gpu) L.caster(e.x, e.y, 3.2, 22);
      r.actor(e.x, e.y, 0, (g, ox, oy) => e.rig.draw(g, ox, oy, view), { flash, alpha, outline, rim: outline });
    } else if (e.type === 'slime') {
      if (!r.visible(e.x, e.y, e.z)) { r.game.stats.culled++; continue; }
      r.shadow(e.x, e.y, 6 - Math.min(3, e.z * .1), .5);
      if (r.gpu) L.caster(e.x, e.y, 5, e.z + 11);
      r.actor(e.x, e.y, e.z, (g, ox, oy) => e.blob.draw(g, ox, oy, view), { flash, alpha, outline, rim: outline });
    } else {
      r.actor(e.x, e.y, e.z, (g, ox, oy) => drawWisp(g, ox, oy, e), { rim: false, alpha, emissive: 1, outline });
      if (S.monsterLights && monsterLights < 16 && r.visible(e.x, e.y, e.z)) { monsterLights++; L.add(e.x, e.y, e.z, 52, .8, { color: '#b78bff' }); }
    }
  }
  if (!hero.dead) {
    const h = hero, ghost = h.dashT > 0 && t - h.lastGhost > .03; if (ghost) h.lastGhost = t;
    r.actor(h.x, h.y, 0, (g, ox, oy) => h.rig.draw(g, ox, oy, view), { xray: true, flash: h.flash > 0 ? '#ffb0a0' : false, ghost: ghost ? { color: '#62d8ff', life: .22 } : null });
    h.rig.drawSmear(r);
    if (r.gpu) { L.add(h.x, h.y, 18, 84, .6, { color: '#c9c2ec' }); L.caster(h.x, h.y, 3.2, 24); } else L.add(h.x, h.y, 10, 82, .8);
  }
  for (const s of shots) {
    if (!r.visible(s.x, s.y, s.z, 10, 10, 10)) continue;
    r.queue(s.x, s.y, s.z, g => { px.glow(g, 1); const [x, y] = r.w(s.x, s.y, s.z); px.ddisc(g, x, y, 5, s.color, .5, r.ix, r.iy); px.disc(g, x, y, 2, s.color); px.dot(g, x, y, s.core); });
    L.add(s.x, s.y, s.z, 40, .85, { color: s.color });
  }
  if (showRig) r.overlay(() => { if (!hero.dead) hero.rig.debug(r); for (const e of enemies) if (e.alive && e.rig && r.visible(e.x, e.y, 0)) e.rig.debug(r); });
  frameStats.lights = L.list.length;
}

/* =============================================================================
 * METRICS, CONTROLS, BENCHMARK
 * ============================================================================= */
const $ = id => document.getElementById(id);
const frameStats = { lights: 0 };
const ft = []; let lastT = 0, showRig = false;
const ema = { update: 0, render: 0 };
let gpuSkipLast = 0, gpuSkipRate = 0, gpuSkipT = performance.now(), refreshEst = 60;
function pct(arr, p) { const a = arr.slice().sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(a.length * p))] || 0; }
function snapRefresh(f) { const R = [30, 50, 60, 75, 90, 100, 120, 144, 165, 180, 240, 360]; let best = 60; for (const r of R) if (Math.abs(r - f) < Math.abs(best - f)) best = r; return best; }

// frame-time graph
const graph = $('graph'), gctx = graph.getContext('2d');
function sizeGraph() { const d = Math.min(3, devicePixelRatio || 1), rc = graph.getBoundingClientRect(); graph.width = Math.max(1, Math.round(rc.width * d)); graph.height = Math.max(1, Math.round(rc.height * d)); }
sizeGraph(); addEventListener('resize', sizeGraph);
function drawGraph() {
  const w = graph.width, h = graph.height, g = gctx, maxMs = 50, cs = getComputedStyle(document.documentElement);
  g.clearRect(0, 0, w, h);
  const y = ms => h - Math.min(1, ms / maxMs) * h;
  g.fillStyle = cs.getPropertyValue('--line').trim() || 'rgba(255,255,255,.2)';
  for (const m of [1000 / 60, 1000 / 30]) g.fillRect(0, Math.round(y(m)), w, 1);
  const n = Math.min(ft.length, 180), bw = w / 180;
  for (let i = 0; i < n; i++) {
    const ms = ft[ft.length - n + i];
    g.fillStyle = ms <= 18 ? cs.getPropertyValue('--good') : ms <= 34 ? cs.getPropertyValue('--warn') : cs.getPropertyValue('--bad');
    g.fillRect(Math.floor(i * bw), Math.round(y(ms)), Math.max(1, Math.ceil(bw)), h);
  }
}

function hwInfo() {
  const lines = [];
  const ua = navigator.userAgentData;
  lines.push('Browser: ' + (ua && ua.brands ? ua.brands.filter(b => !/Not/i.test(b.brand)).map(b => b.brand + ' ' + b.version).join(', ') + (ua.platform ? ' on ' + ua.platform : '') : navigator.userAgent));
  lines.push('CPU threads: ' + (navigator.hardwareConcurrency || 'unknown') + (navigator.deviceMemory ? ', memory about ' + navigator.deviceMemory + ' GB' : ''));
  lines.push('Screen: ' + screen.width + '×' + screen.height + ' at ' + (devicePixelRatio || 1) + 'x pixel ratio');
  let g = '';
  if (gpu.adapterInfo) { const i = gpu.adapterInfo; g = [i.vendor, i.architecture, i.description].filter(Boolean).join(' '); }
  if (!g) { try { const c = document.createElement('canvas').getContext('webgl'); const ext = c && c.getExtension('WEBGL_debug_renderer_info'); g = ext ? c.getParameter(ext.UNMASKED_RENDERER_WEBGL) : ''; } catch (e) { g = ''; } }
  lines.push('GPU: ' + (g || 'not reported by the browser') + ' (WebGPU ' + (gpu.status() === 'unavailable' ? 'unavailable' : 'available') + ')');
  return lines;
}
let hwLines = null;

function hint(fps, frameMs, cpuMs) {
  if (gpu.active(game.view) && gpuSkipRate > 1) return ['GPU-bound', 'bad', 'The graphics card is dropping frames. Lower the camera distance, torches or shadows.'];
  if (fps >= refreshEst * .93) return ['Headroom', 'good', 'Running at the display\'s refresh rate. Add more load to find the limit.'];
  if (cpuMs > frameMs * .75) return ['CPU-bound', 'warn', 'Game logic and drawing use most of each frame. Fewer monsters, outlines off, or skipping off-screen animation helps most.'];
  return ['Browser-bound', 'warn', 'Time is going to the browser and compositor. Lower the camera distance to shrink the image.'];
}
let hudT = 0;
function hud() {
  const now = performance.now();
  if (lastT) { ft.push(now - lastT); if (ft.length > 600) ft.shift(); }
  lastT = now;
  const st = game.stats;
  ema.update = lerp(ema.update, st.updateMs, .1); ema.render = lerp(ema.render, st.renderMs, .1);
  if (bench) benchFrame(ft[ft.length - 1] || 16.7);
  drawGraph();
  if (now - hudT < 250) return; hudT = now;
  if (now - gpuSkipT > 1000) { const sk = gpu.skipped || 0; gpuSkipRate = (sk - gpuSkipLast) * 1000 / (now - gpuSkipT); gpuSkipLast = sk; gpuSkipT = now; }
  const recent = ft.slice(-60), avgMs = recent.reduce((a, b) => a + b, 0) / Math.max(1, recent.length), fps = 1000 / avgMs, low = 1000 / pct(ft.slice(-240), .99);
  if (S.monsters === 0 && S.rate === 0 && ft.length > 120) refreshEst = Math.max(refreshEst === 60 ? 0 : refreshEst, snapRefresh(fps));
  $('fpsBig').textContent = Math.round(fps);
  $('mFrame').textContent = avgMs.toFixed(1) + ' ms';
  $('mLow').textContent = Math.round(low) + ' fps';
  $('mUpdate').textContent = ema.update.toFixed(1) + ' ms';
  $('mRender').textContent = ema.render.toFixed(1) + ' ms';
  const alive = enemies.filter(e => e.alive).length;
  $('mMonsters').textContent = alive.toLocaleString() + ' (' + st.actors + ' drawn)';
  $('mParts').textContent = P.list.length.toLocaleString() + ' / ' + S.pcap.toLocaleString();
  $('mLights').textContent = frameStats.lights + (gpu.active(game.view) && frameStats.lights > 32 ? ' (GPU uses 32)' : '');
  $('mItems').textContent = st.items.toLocaleString();
  const sc = game.screen; $('mRes').textContent = sc.W + '×' + sc.H + ' (' + Math.round(sc.W * sc.H / 1000) + 'k px)';
  $('mGpu').textContent = gpu.status() === 'on' ? (gpu.active(game.view) ? 'on' + (gpuSkipRate > .5 ? ', dropping ' + Math.round(gpuSkipRate) + '/s' : '') : 'on (not used in this view)') : gpu.status() === 'off' ? 'off' : gpu.status() === 'loading' ? 'starting' : 'unavailable';
  const [tag, cls, text] = hint(fps, avgMs, ema.update + ema.render);
  const tg = $('bottleneck'); tg.textContent = tag; tg.dataset.level = cls; $('hint').textContent = text;
  if (!hwLines && gpu.status() !== 'loading') { hwLines = hwInfo(); $('hw').textContent = hwLines.join('\n'); }
}

/* ---------- controls ---------- */
const VIEWS = ['iso', 'threequarter', 'topdown', 'brawler'];
function setDistance(d) {
  S.distance = d;
  game.screen.setOptions({ minH: BASE.minH * d, minW: BASE.minW * d, maxW: Math.round(BASE.maxW * d), maxH: Math.round(BASE.maxH * d) });
  game.cam.snap = true;
}
function syncUI() {
  $('monsters').value = Math.min(5000, S.monsters); $('monstersOut').textContent = S.monsters.toLocaleString();
  $('mix').value = S.mix; $('behavior').value = S.behavior;
  $('lights').value = S.lights; $('lightsOut').textContent = S.lights;
  $('rate').value = S.rate; $('rateOut').textContent = S.rate.toLocaleString() + '/s';
  $('pcap').value = S.pcap; $('pcapOut').textContent = S.pcap.toLocaleString();
  $('distance').value = S.distance; $('distanceOut').textContent = S.distance.toFixed(2).replace(/\.?0+$/, '') + '×';
  $('god').checked = S.god; $('outlines').checked = S.outlines; $('capes').checked = S.capes; $('lod').checked = S.lod; $('mlights').checked = S.monsterLights;
  const st = gpu.status();
  $('gpuOn').checked = st === 'on'; $('gpuOn').disabled = st === 'unavailable' || st === 'loading';
  $('gpuLabel').title = st === 'unavailable' ? (gpu.failed || '') : '';
  $('shadows').checked = st === 'on' && gpu.shadows; $('shadows').disabled = st !== 'on';
  $('canvasLight').checked = game.lights.enabled;
  document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === game.view.id)));
}
gpu.onStatus = syncUI;
const on = (id, ev, f) => $(id).addEventListener(ev, e => { f(e); syncUI(); });
on('monsters', 'input', e => setMonsters(+e.target.value));
document.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => { setMonsters(b.hasAttribute('data-clear') ? 0 : Math.max(0, Math.min(10000, S.monsters + +b.dataset.add))); syncUI(); b.blur(); }));
on('mix', 'change', e => { S.mix = e.target.value; const n = S.monsters; setMonsters(0); setMonsters(n, true); e.target.blur(); });
on('behavior', 'change', e => { S.behavior = e.target.value; e.target.blur(); });
on('lights', 'input', e => { S.lights = +e.target.value; });
on('rate', 'input', e => { S.rate = +e.target.value; });
on('pcap', 'input', e => { S.pcap = +e.target.value; P.max = S.pcap; });
on('distance', 'input', e => setDistance(+e.target.value));
on('god', 'change', e => { S.god = e.target.checked; e.target.blur(); });
on('outlines', 'change', e => { S.outlines = e.target.checked; e.target.blur(); });
on('capes', 'change', e => { S.capes = e.target.checked; applyCapes(); e.target.blur(); });
on('lod', 'change', e => { S.lod = e.target.checked; e.target.blur(); });
on('mlights', 'change', e => { S.monsterLights = e.target.checked; e.target.blur(); });
on('gpuOn', 'change', e => { gpu.enabled = e.target.checked; e.target.blur(); });
on('shadows', 'change', e => { gpu.shadows = e.target.checked; e.target.blur(); });
on('canvasLight', 'change', e => { game.lights.enabled = e.target.checked; e.target.blur(); });
document.querySelectorAll('input[type=range]').forEach(el => el.addEventListener('pointerup', () => el.blur()));
document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => { game.setView(b.dataset.view); syncUI(); b.blur(); }));
const PRESETS = {
  light: { monsters: 100, lights: 8, rate: 100, pcap: 2000, distance: 1, capes: false, monsterLights: false, outlines: true },
  medium: { monsters: 400, lights: 16, rate: 400, pcap: 3000, distance: 1.5, capes: false, monsterLights: false, outlines: true },
  heavy: { monsters: 1200, lights: 24, rate: 1000, pcap: 5000, distance: 2.5, capes: true, monsterLights: false, outlines: true },
  extreme: { monsters: 3000, lights: 30, rate: 2500, pcap: 9000, distance: 4, capes: true, monsterLights: true, outlines: true },
  reset: { monsters: 0, lights: 12, rate: 0, pcap: 2000, distance: 1, capes: false, monsterLights: false, outlines: true }
};
document.querySelectorAll('[data-preset]').forEach(b => b.addEventListener('click', () => {
  const p = PRESETS[b.dataset.preset];
  Object.assign(S, { lights: p.lights, rate: p.rate, pcap: p.pcap, capes: p.capes, monsterLights: p.monsterLights, outlines: p.outlines });
  setDistance(p.distance); setMonsters(p.monsters); applyCapes(); syncUI(); b.blur();
}));
function setPanel(open) { $('panel').hidden = !open; $('showPanel').hidden = open; }
$('hidePanel').addEventListener('click', () => setPanel(false));
$('showPanel').addEventListener('click', () => setPanel(true));
addEventListener('keydown', e => {
  if (e.repeat || (e.target && ['SELECT', 'TEXTAREA'].includes(e.target.tagName))) return;
  if (e.code === 'KeyH') setPanel($('panel').hidden);
  else if (e.code === 'KeyV') { game.setView(VIEWS[(VIEWS.indexOf(game.view.id) + 1) % VIEWS.length]); syncUI(); }
  else if (e.code === 'KeyG' && gpu.status() !== 'unavailable' && gpu.status() !== 'loading') { gpu.enabled = !gpu.enabled; syncUI(); }
  else if (e.code === 'KeyR') showRig = !showRig;
});
game.input.bindButtons(document);

/* ---------- benchmark ---------- */
const STEPS = [0, 50, 100, 200, 400, 700, 1000, 1500, 2000, 3000, 4000, 5000];
let bench = null, lastReport = '';
function benchStart() {
  bench = { i: 0, phase: 'warm', t0: performance.now(), samples: [], results: [] };
  S.god = true; hero.inv = 0;
  setMonsters(STEPS[0], true);
  document.body.classList.add('benching');
  $('benchBtn').textContent = 'Stop benchmark'; $('benchTable').innerHTML = ''; $('copyBtn').hidden = true; $('benchSummary').textContent = '';
  benchStatus();
}
function benchStop(done) {
  document.body.classList.remove('benching');
  $('benchBtn').textContent = 'Run benchmark';
  if (done && bench.results.length) benchReport();
  else $('benchStatus').textContent = 'Stopped.';
  bench = null; syncUI();
}
function benchStatus() { $('benchStatus').textContent = 'Testing ' + STEPS[bench.i].toLocaleString() + ' monsters (step ' + (bench.i + 1) + ' of ' + STEPS.length + ')...'; }
function benchFrame(ms) {
  const now = performance.now();
  if (bench.phase === 'warm') { if (now - bench.t0 > 1500) { bench.phase = 'measure'; bench.t0 = now; bench.samples = []; } return; }
  bench.samples.push(ms);
  if (now - bench.t0 < 3000) return;
  const avg = bench.samples.reduce((a, b) => a + b, 0) / bench.samples.length;
  const res = { n: STEPS[bench.i], fps: 1000 / avg, low: 1000 / pct(bench.samples, .99), cpu: ema.update + ema.render };
  bench.results.push(res);
  const row = document.createElement('tr');
  row.innerHTML = '<td>' + res.n.toLocaleString() + '</td><td>' + Math.round(res.fps) + '</td><td>' + Math.round(res.low) + '</td><td>' + res.cpu.toFixed(1) + '</td>';
  $('benchTable').appendChild(row);
  bench.i++;
  if (res.fps < 20 || bench.i >= STEPS.length) return benchStop(true);
  setMonsters(STEPS[bench.i], true); bench.phase = 'warm'; bench.t0 = now; benchStatus();
}
function benchReport() {
  const R = bench.results, base = R[0] ? R[0].fps : 60;
  const upto = th => { let best = null; for (const r of R) if (r.fps >= th) best = r.n; return best; };
  const smooth = upto(Math.min(55, base * .92)), play = upto(30);
  const smoothText = smooth === null ? 'Not smooth even with an empty hall. ' : smooth === 0 ? 'Smooth only with an empty hall. ' : 'Smooth up to ' + smooth.toLocaleString() + ' monsters. ';
  const playText = play === null ? 'Below 30 fps even with an empty hall.' : play === 0 ? 'Playable (30 fps) only with an empty hall.' : 'Playable (30 fps) up to ' + play.toLocaleString() + ' monsters.';
  const summary = smoothText + playText;
  $('benchSummary').textContent = summary; $('benchStatus').textContent = 'Done.';
  const v = game.view, sc = game.screen;
  lastReport = [
    'CO55 engine stress test',
    'Result: ' + summary,
    'Settings: ' + v.label + ' view, camera distance ' + S.distance + 'x (' + sc.W + '×' + sc.H + ' internal), ' + (gpu.active(v) ? 'GPU lighting' + (gpu.shadows ? ' with shadows' : ' without shadows') : 'Canvas lighting' + (game.lights.enabled ? '' : ' off')) +
      ', ' + S.lights + ' torches, ' + S.rate + ' particles/s, mix ' + S.mix + ', behavior ' + S.behavior + ', outlines ' + (S.outlines ? 'on' : 'off') + ', monster capes ' + (S.capes ? 'on' : 'off') + ', off-screen animation ' + (S.lod ? 'skipped' : 'on'),
    ...(hwLines || hwInfo()),
    '',
    'Monsters | avg fps | 1% low | CPU ms',
    ...R.map(r => r.n + ' | ' + Math.round(r.fps) + ' | ' + Math.round(r.low) + ' | ' + r.cpu.toFixed(1))
  ].join('\n');
  $('copyBtn').hidden = false;
}
$('benchBtn').addEventListener('click', () => { if (bench) benchStop(false); else benchStart(); $('benchBtn').blur(); });
$('copyBtn').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(lastReport); $('copyBtn').textContent = 'Copied'; }
  catch (e) { const ta = $('reportText'); ta.hidden = false; ta.value = lastReport; ta.select(); $('copyBtn').textContent = 'Select and copy below'; }
  setTimeout(() => { $('copyBtn').textContent = 'Copy results'; }, 2000);
});

syncUI();
game.start({ update, draw: r => { draw(r); hud(); } });
window.__game = { game, hero, enemies, S, setMonsters, setDistance, gpu, benchStart, get bench() { return bench; }, get report() { return lastReport; } };
})();
