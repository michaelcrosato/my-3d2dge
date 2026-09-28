/* =============================================================================
 * BOSSES: a monster with phases of patterns, a bar across the top and a loot shower
 * A BOSS is def('bosses', id, { name, title, arch (archetype for the body), size, hp (x a normal monster), dmg, el,
 *   music: 'boss', phases: [{ at: 1, patterns: ['slam', 'charge'], gap: 1.2 }, { at: .5, ... }],
 *   intro(b), update(b, dt), onPhase(b, i), onDie(b), minDepth })
 * A PATTERN is def('patterns', id, { name, range: [min, max] (distance it likes), start(b, P) -> runtime
 *   { update(dt) -> keep going?, rig: { fields for the body's rig } } }). Patterns are verbs any boss can use:
 * procedural bosses past the planned depths pick a body, an element and a set of patterns.
 * ============================================================================= */
function spawnBoss(id, x, y, o = {}) {
  const B = REG.bosses[id]; if (!B) return null;
  const arch = REG.archetypes[B.arch || 'knight'];
  const m = spawnMonster(arch.id, x, y, Object.assign({ elite: 3, hpMul: B.hp || 14, dmgMul: B.dmg || 1.3, el: B.el || o.el, instant: true, scale: B.size || 1.8, pal: B.pal ? shiftPal(B.pal, o.hue || 0) : undefined }, o));
  if (!m) return null;
  m.boss = true; m.bossDef = B; m.name = o.name || B.name; m.title = o.title || B.title || ''; m.mass = 99; m.phase = 0; m.pat = null; m.patT = 1.5; m.xp *= 2;
  m.patterns = o.patterns || null;
  m.r = (arch.r || 5) * m.scale * .8; m.head = (arch.head || 28) * m.scale;
  m.arch = Object.assign(Object.create(arch), { ai: 'boss', stagger: false });
  if (B.intro) B.intro(m);
  ED.boss = m; m.introT = 2.2;
  notify(m.name.toUpperCase() + (m.title ? ', ' + m.title.toUpperCase() : ''), '#ff8a5a', 3);
  A.music(B.music || 'boss');
  return m;
}
def('ai', 'boss', { update(m, dt) {
  const B = m.bossDef, h = ED.hero; if (!h) return;
  if (m.introT > 0) { m.introT -= dt; AI.face(m, angTo(m, h), dt, 3); m.rigState = { pose: m.introT > .8 ? 'cheer' : null, expr: 'shout' }; if (m.introT > 1 && Math.random() < .2) shake(1); return; }
  // phases at health thresholds: a roar, a flash, new patterns
  const phases = B.phases || [{ at: 1, patterns: m.patterns || ['slam', 'charge'] }];
  const next = phases[m.phase + 1];
  if (next && m.hp / m.maxHp <= next.at) { m.phase++; m.pat = null; m.patT = 1; m.introT = 1.2; game.flash('#ff8a5a', .2, .6); sfx('boom'); shake(5); P.ring(m.x, m.y, 6, 60, '#ff8a5a', .5); if (B.onPhase) B.onPhase(m, m.phase); notify(m.name.toUpperCase() + ' GROWS ENRAGED', '#ff8a5a', 2); return; }
  const ph = phases[m.phase];
  if (B.update) B.update(m, dt);
  if (m.pat) { const keep = m.pat.update(dt * statusSpeed(m)); m.rigState = m.pat.rig || null; if (!keep) { m.pat = null; m.patT = (ph.gap || 1.1) * (.8 + Math.random() * .4); m.rigState = null; } return; }
  // between patterns: stalk the hero, then pick a pattern that suits the distance
  m.patT -= dt; const d = Math.hypot(h.x - m.x, h.y - m.y);
  AI.face(m, angTo(m, h), dt, 4); AI.move(m, d > 40 ? AI.steer(m, h.x, h.y) : [0, 0], dt, .8);
  if (m.patT <= 0) {
    const ids = (m.patterns && m.phase === 0 ? m.patterns : ph.patterns || m.patterns || ['slam']).filter(id => REG.patterns[id]);
    const fit = ids.filter(id => { const rg = REG.patterns[id].range || [0, 999]; return d >= rg[0] && d <= rg[1]; });
    const id = rnd.pick(fit.length ? fit : ids); if (!id) return;
    m.pat = REG.patterns[id].start(m, ph) || null; m.lastPat = id;
  }
} });
BUS.on('kill', e => {
  const m = e.tgt; if (!m.boss) return;
  if (ED.boss === m) ED.boss = null;
  game.flash('#fff4d0', .3); shake(8); game.timeScale = .3; game.after(.6, () => { game.timeScale = 1; });
  P.explosion(m.x, m.y, 10, 2, { flash: false }); sfx('boom');
  if (m.bossDef.onDie) m.bossDef.onDie(m);
  BUS.emit('bossDown', { m });
  A.music('victory');
});

/* ---------- core patterns: the vocabulary procedural bosses are built from ---------- */
// slam: a crouch, a leap at the hero, a landing shockwave
def('patterns', 'slam', { name: 'Slam', range: [20, 140], start(b) {
  const h = ED.hero, tx = h.x, ty = h.y, sx = b.x, sy = b.y, R = 34 * (b.scale || 1);
  FX.telegraph({ shape: 'circle', x: tx, y: ty, r: R, dur: 1, owner: b });
  const P0 = { t: 0, rig: { pose: 'crouch' }, update(dt) {
    this.t += dt; const t = this.t;
    if (t < .35) { this.rig = { pose: 'crouch', expr: 'angry' }; AI.face(b, Math.atan2(ty - b.y, tx - b.x), dt, 8); return true; }
    if (t < 1) { const u = (t - .35) / .65; b.x = lerp(sx, tx, u); b.y = lerp(sy, ty, u); b.z = Math.sin(u * Math.PI) * 60; b.vx = b.vy = 0; this.rig = { air: true, attack: E.move('plunge', u, u < .5 ? 'wind' : 'active') }; return true; }
    if (!this.landed) { this.landed = true; b.z = 0; FX.nova({ team: 'foe', src: b, x: b.x, y: b.y, r0: 6, r1: R, dur: .25, el: b.el, hit: { amount: b.dmg * 1.6, kb: 240, knockdown: true } }); FX.wave({ team: 'foe', src: b, x: b.x, y: b.y, ang: angTo(b, h), speed: 200, len: 140, w: 14, el: b.el, hit: { amount: b.dmg, kb: 150 } }); P.dust(b.x, b.y, 0, 16, { speed: 80 }); shake(6); sfx('boom'); FX.scorch(b.x, b.y, R * .7); }
    this.rig = { pose: 'crouch' }; return t < 1.6;
  } };
  return P0;
} });
// charge: lines up, a red lane on the floor, then a rush that bowls the hero over
def('patterns', 'charge', { name: 'Charge', range: [50, 260], start(b) {
  const h = ED.hero, ang = angTo(b, h), len = Math.min(220, Math.hypot(h.x - b.x, h.y - b.y) + 60);
  FX.telegraph({ shape: 'line', x: b.x, y: b.y, ang, len, w: 20 * (b.scale || 1), dur: .8, owner: b });
  return { t: 0, hitDone: false, rig: {}, update(dt) {
    this.t += dt; b.facing = ang;
    if (this.t < .8) { this.rig = { pose: 'crouch', expr: 'angry' }; b.vx = b.vy = 0; return true; }
    if (this.t < .8 + len / 320) { b.vx = Math.cos(ang) * 320; b.vy = Math.sin(ang) * 320; this.rig = { dash: true, expr: 'shout' }; if (Math.random() < .5) P.dust(b.x, b.y, 0, 2);
      if (!this.hitDone && Math.hypot(h.x - b.x, h.y - b.y) < b.r + h.r + 6) { this.hitDone = true; dealDamage(h, { src: b, amount: b.dmg * 1.4, el: b.el, kb: 260, ang, knockdown: true }); }
      if (ED.L.map.solidAt(b.x + Math.cos(ang) * (b.r + 4), b.y + Math.sin(ang) * (b.r + 4))) { shake(5); sfx('boom'); b.stunT = 1; P.dust(b.x, b.y, 10, 10); return false; }
      return true; }
    b.vx *= .8; b.vy *= .8; this.rig = {}; return this.t < 1.3 + len / 320;
  } };
} });
// nova: raises the weapon, a ring of bolts in the boss's element (rotated waves in later phases)
def('patterns', 'nova', { name: 'Nova', range: [0, 200], start(b) {
  let waves = 1 + b.phase, fired = 0;
  return { t: 0, rig: { pose: 'cast' }, update(dt) {
    this.t += dt;
    if (this.t > .5 + fired * .35 && fired < waves) { const n = 12 + 2 * b.phase; for (let i = 0; i < n; i++) FX.bolt({ team: 'foe', src: b, x: b.x, y: b.y, z: 14, ang: i / n * TAU + fired * .13, speed: 90, life: 3, r: 3, el: b.el === 'phys' ? 'fire' : b.el, hit: { amount: b.dmg * .6, kb: 50 }, look: { kind: 'orb', size: 1.6 }, light: 0 }); fired++; sfx('shoot', { pitch: .6 }); }
    this.rig = { pose: 'cast', expr: 'shout' };
    return this.t < .6 + waves * .35;
  } };
} });
// summon: calls a pack of its kind around it
def('patterns', 'summon', { name: 'Summon', range: [0, 400], start(b) {
  return { t: 0, rig: { pose: 'cheer' }, update(dt) {
    this.t += dt;
    if (this.t > .6 && !this.done) { this.done = true; const pool = (ED.L && ED.L.rec && ED.L.rec.pool) || ['husk']; for (let i = 0; i < 3 + b.phase; i++) { const a = i / (3 + b.phase) * TAU, x = b.x + Math.cos(a) * 40, y = b.y + Math.sin(a) * 40; if (ED.L.map.walkable(Math.floor(x / 16), Math.floor(y / 16))) { const m = spawnMonster(rnd.pick(pool), x, y, {}); if (m) { m.ai.aware = true; P.ring(x, y, 2, 16, '#ff8a5a', .4); } } } sfx('warp'); }
    this.rig = { pose: 'cheer', expr: 'shout' }; return this.t < 1.2;
  } };
} });
// cleave: a huge telegraphed swing in a wide arc in front
def('patterns', 'cleave', { name: 'Cleave', range: [0, 60], start(b) {
  const atk = new E.Attack('twohand', { wind: .75, active: .12, recover: .5 }); atk.start();
  const h = ED.hero, R = 44 * (b.scale || 1) * .8;
  return { t: 0, rig: {}, update(dt) {
    const began = atk.update(dt); this.rig = { attack: atk.state, expr: 'angry' };
    if (atk.phase === 'wind') { AI.face(b, angTo(b, h), dt, 3); if (!this.tel) { this.tel = true; FX.telegraph({ shape: 'arc', x: b.x, y: b.y, r: R, ang: b.facing, half: 1.2, dur: .75, owner: b, follow: b, followAng: true }); } }
    if (began === 'active') { hitCone('foe', b.x, b.y, b.facing, R, 1.2, () => ({ src: b, amount: b.dmg * 1.8, el: b.el, kb: 240, ang: b.facing, knockdown: true })); shake(4); sfx('kick'); FX.wave({ team: 'foe', src: b, x: b.x, y: b.y, ang: b.facing, speed: 240, len: 100, w: 12, el: b.el, hit: { amount: b.dmg * .8, kb: 120 } }); }
    return atk.busy;
  } };
} });

/* a boss at every fifth depth: the planned ones by name, then composed ones (a body, an element, patterns, a name) */
const BOSS_BODIES = ['knight', 'husk', 'skeleton'];
const BOSS_NAMES = { a: ['Vor', 'Mal', 'Gor', 'Ser', 'Kha', 'Ul', 'Dre', 'Az', 'Mor', 'Thes'], b: ['gath', 'akar', 'eth', 'uun', 'orix', 'avel', 'grim', 'oth', 'ira', 'eon'], t: ['the Deep King', 'Warden of the Stair', 'the Hungering', 'Who Waits Below', 'the Last Flame', 'the Unmade', 'Heart of the Pit', 'the Hollow Crown'] };
function composeBoss(depth, R) {
  const el = R.pick(ELEMENT_IDS), arch = R.pick(BOSS_BODIES.filter(id => REG.archetypes[id]).concat(Object.keys(REG.archetypes).filter(id => REG.archetypes[id].bossBody)));
  const pats = R.shuffle(Object.keys(REG.patterns).filter(id => !REG.patterns[id].unique)).slice(0, 3 + (depth > 40 ? 1 : 0));
  const id = 'composed' + depth; if (REG.bosses[id]) return id;
  def('bosses', id, { name: R.pick(BOSS_NAMES.a) + R.pick(BOSS_NAMES.b), title: R.pick(BOSS_NAMES.t), arch, el, size: 1.9 + R() * .5, hp: 16, dmg: 1.4,
    phases: [{ at: 1, patterns: pats.slice(0, 2) }, { at: .6, patterns: pats.slice(0, 3), gap: .9 }, { at: .3, patterns: pats, gap: .7 }] });
  return id;
}
