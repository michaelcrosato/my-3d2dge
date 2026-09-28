/* =============================================================================
 * THE HERO  (the stress test's swordsman: teal tunic, red cape, dark hair)
 * One action at a time (a skill's swing, a leap, a cast, a stagger). An ACTION is
 *   { name, t, update(dt) -> keep going?, rig: { fields merged into rig.update }, moveK (movement while busy, 0..1),
 *     cancel: true (a dodge may cut it short), face: angle | null (hold this facing), z (lift for leaps), ghost }
 * Skills return actions (see 25-skills-core.js). Gear changes the rig: colors, helm, armor, cape, blade.
 * ============================================================================= */
const HERO_LOOK = {   // the classic look: every piece of gear may override parts of it
  outfit: 'tunic', hair: 'short', sleeves: 'short', armor: false, hat: null, weapon: 'sword', bladeLen: 11, cape: { len: 6, width: 5, seg: 2.5 },
  colors: { skin: '#f1c7a0', hair: '#2e2230', cloth: '#2f8f86', pants: '#3b3552', boot: '#6a4128', belt: '#e0a84a', cape: '#c8452f', capeIn: '#7a2622', metal: '#dce8f1', metalDk: '#7f93ab', hilt: '#e8b04e', glove: null, trim: null }
};
function makeHero(save) {
  const h = {
    team: 'hero', x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 4.5, facing: -Math.PI / 2, aim: -Math.PI / 2, alive: true, st: {}, res: {}, armor: 0, head: 26, mass: 1.6,
    level: 1, xp: 0, gold: 0, pts: { skill: 1, passive: 0 }, gear: {}, bag: [], skills: { blade: { rank: 1 }, ember: { rank: 1 } }, slots: ['blade', 'ember', null, null, null, null],
    tree: [], potions: 3, potionT: 0, healT: 0, healRate: 0, act: null, cds: {}, inv: 0, hurtT: 0, flash: 0, dodges: 2, dodgeT: 0, dodgeRe: 0, dodgeDir: 0, buffs: [], powers: [],
    dead: false, deadT: 0, lastGhost: 0, idleT: 0, cheerT: 0, stats: {}, maxDepth: 1, unlocked: [1], seenMech: [], kills: 0
  };
  if (save) Object.assign(h, save, { st: {}, act: null, cds: {}, buffs: [], alive: true, dead: false });
  h.react = heroReact; h.onDie = heroDie; h.onDodgedHit = heroDodgedHit; h.onBeforeHit = heroBeforeHit;
  h.hp = undefined; h.ember = undefined;
  computeStats(h); h.hp = h.maxHp; h.ember = h.maxEmber; h.potions = Math.min(h.potions, h.maxPotions); h.dodges = h.maxDodge;
  dressHero(h);
  return h;
}
/** the look from gear: each item's `look` merges over the classic look */
function heroLook(h) {
  const L0 = JSON.parse(JSON.stringify(HERO_LOOK));
  for (const slot of ['legs', 'boots', 'gloves', 'chest', 'cloak', 'helm', 'weapon']) {
    const it = h.gear[slot]; if (!it || !it.look) continue;
    const lk = it.look;
    for (const k in lk) if (k === 'colors') Object.assign(L0.colors, lk.colors); else if (k !== 'glow' && k !== 'smear') L0[k] = lk[k];
  }
  const w = h.gear.weapon; L0.el = w && w.el || 'phys';
  return L0;
}
function dressHero(h) {
  const lk = heroLook(h), old = h.rig;
  h.look = lk;
  h.rig = new E.Humanoid(Object.assign({}, lk, { colors: Object.assign({}, lk.colors) }));
  if (old) { h.rig.update(0, { x: h.x, y: h.y, z: h.z, facing: h.facing }); }
  h.smear = EL(lk.el).smear;
}

/* ---------- actions ---------- */
function startAction(h, act) {
  if (h.act && h.act.end) h.act.end(true);
  act.t = 0; h.act = act; return act;
}
function endAction(h) { if (h.act && h.act.end) h.act.end(false); h.act = null; }

/* ---------- xp, levels, gold ---------- */
function gainXp(h, n) {
  if (!h.alive) return;
  n *= (1 + (h.stats.xpGain || 0) / 100) * DIFF.xp;
  h.xp += n;
  while (h.xp >= SCALE.xpNeed(h.level)) {
    h.xp -= SCALE.xpNeed(h.level); h.level++; h.pts.skill++; h.pts.passive++;
    computeStats(h); h.hp = h.maxHp; h.ember = h.maxEmber;
    levelUpFx(h); BUS.emit('heroLevel', { lvl: h.level });
  }
}
function levelUpFx(h) {
  sfx('powerup'); notify('LEVEL ' + h.level + '  •  +1 SKILL POINT  +1 PASSIVE POINT', '#ffe070', 4);
  h.cheerT = 1; P.glints(h.x, h.y, 16, 20, '#ffe070', 22); P.ring(h.x, h.y, 4, 34, '#ffe070', .5);
  FX.visual(1.2, (r, u) => {
    r.queue(h.x, h.y, 0, g => { const [x, y] = r.w(h.x, h.y, 0), [, ty] = r.w(h.x, h.y, 80), a = 1 - u; px.glow(g, 1); px.blend(g, .5 * a, 'add', () => { px.rect(g, x - 6, ty, 12, y - ty, '#ffd36a'); px.rect(g, x - 2, ty, 4, y - ty, '#fffbe0'); }); }, { emissive: true, bias: -.1 });
    L.add(h.x, h.y, 20, 110, 1.2 * (1 - u), { color: '#ffd36a' });
  });
}
function gainGold(h, n) { h.gold += n; BUS.emit('gold', { n }); }

/* ---------- getting hurt ---------- */
// every hit shows: a flash, a wince and a stagger; big hits (kb >= 200 or a slam) knock him down for a moment
function heroReact(hit) {
  const h = this;
  h.hurtT = .22; h.flash = .06; h.inv = Math.max(h.inv, .35);
  const ang = hit.ang !== undefined ? hit.ang : (hit.src ? angTo(hit.src, h) : 0);
  h.hitA = ang + Math.PI;
  knock(h, ang, Math.min(260, (hit.kb || 60) + 60), 0);
  game.freeze(.05); shake(3); P.sparks(h.x, h.y, 12, 10, ang + Math.PI, { color: '#ff7a6a' });
  sfx('hurt', { vol: .6 });
  if ((hit.kb || 0) >= 200 || hit.knockdown) knockDown(h, 1);
  else if (h.act && h.act.cancel !== false && h.act.interrupt !== false && (hit.dmg || 0) > h.maxHp * .12) endAction(h);
  BUS.emit('hurt', { tgt: h, hit, dmg: hit.dmg });
}
/** knocked flat: the rig falls ('down'), lies a moment, gets up (invulnerable while down) */
function knockDown(h, t = 1) {
  startAction(h, { name: 'down', cancel: false, moveK: 0, dur: t + .6, rig: { down: 1 }, update(dt) {
    this.rig.down = this.t < t ? 1 : 0; h.inv = Math.max(h.inv, .2);
    return (this.t += dt) < this.dur;
  } });
}
function heroDie(hit) {
  const h = this;
  h.dead = true; h.deadT = 0; h.act = null;
  P.bits(h.x, h.y, 8, 20, [h.look.colors.cloth, h.look.colors.cape, h.look.colors.skin]);
  sfx('die'); A.music(null);
  BUS.emit('heroDie', { h, hit });
}
/** evasion: a chance to sidestep a hit entirely */
function heroBeforeHit(hit, amt) {
  const ev = (this.stats.dodge || 0) / 100;
  if (ev > 0 && Math.random() < Math.min(.6, ev)) { P.text(this.x, this.y, 30, 'EVADE', '#bff6ff'); return 0; }
  return amt;
}
function heroDodgedHit(hit) {
  const h = this;
  if (h.dodgeT > 0 && h.dodgeT > .1 && !h.perfectT && hit.src && hit.src.team === 'foe') {   // dodged right through a strike: time slows for everyone else
    h.perfectT = 1.1; game.timeScale = .35; sfx('warp', { vol: .6 }); notify('PERFECT DODGE', '#8fe3ff', 1.5);
    P.ring(h.x, h.y, 4, 40, '#8fe3ff', .4); game.flash('#8fe3ff', .15, .5);
    BUS.emit('perfectDodge', { h, hit });
  }
}

/* ---------- the per-step controller ---------- */
const HERO_SPEED = 84, DODGE_T = .22, DODGE_SPEED = 270;
function heroAim(h) {
  const inp = game.input, view = game.view;
  const mv = inp.move(), md = view.screenDirToGround(mv[0], mv[1]), mlen = Math.hypot(md[0], md[1]);
  let aimA = null, tgt = null;
  if (inp.aimSource === 'mouse') { const m = game.mouseGround(); if (m) { tgt = m; if (Math.hypot(m[0] - h.x, m[1] - h.y) > 3) aimA = Math.atan2(m[1] - h.y, m[0] - h.x); } }
  else if (inp.aimSource === 'pad' && inp.padAim) { const d = view.screenDirToGround(inp.padAim[0], inp.padAim[1]); aimA = Math.atan2(d[1], d[0]); }
  if (aimA === null && mlen > .1) aimA = Math.atan2(md[1], md[0]);
  if (aimA !== null) h.aim = aimA;
  if (!tgt) { const nearest = nearestEnemy('hero', h.x + Math.cos(h.aim) * 40, h.y + Math.sin(h.aim) * 40, 70); tgt = nearest ? [nearest.x, nearest.y] : [h.x + Math.cos(h.aim) * 60, h.y + Math.sin(h.aim) * 60]; }
  h.tx = tgt[0]; h.ty = tgt[1];
  return { md, mlen };
}
function updateHero(h, dt, o = {}) {
  const inp = game.input, town = !!o.town;
  h.inv -= dt; h.hurtT -= dt; h.flash -= dt; h.cheerT -= dt; h.potionT -= dt;
  if (h.perfectT > 0 && (h.perfectT -= dt / Math.max(.2, game.timeScale)) <= 0) { h.perfectT = 0; game.timeScale = 1; }
  for (const k in h.cds) if ((h.cds[k] -= dt) <= 0) delete h.cds[k];
  for (let i = h.buffs.length - 1; i >= 0; i--) if ((h.buffs[i].t -= dt) <= 0) { h.buffs.splice(i, 1); computeStats(h); }
  tickStatus(h, dt);
  if (h.dead) { h.deadT += dt; h.vx *= .9; h.vy *= .9; h.rig.update(dt, { x: h.x, y: h.y, z: 0, facing: h.facing, pose: 'die' }); return; }
  // regeneration, heal over time (potions)
  const s = h.stats;
  h.hp = Math.min(h.maxHp, h.hp + (s.lifeRegen || 0) * dt + (h.healT > 0 ? h.healRate * dt : 0)); h.healT -= dt;
  h.ember = Math.min(h.maxEmber, h.ember + (s.emberRegen || 0) * dt);
  if (h.dodges < h.maxDodge && (h.dodgeRe -= dt * (1 + (s.dodgeCd || 0) / 100)) <= 0) { h.dodges++; h.dodgeRe = 1.4; }
  const { md, mlen } = heroAim(h), sp = statusSpeed(h);
  // dodge: a quick low dash with invulnerability; it carries him over chasms (he is briefly airborne)
  if (inp.buffered('dodge', .12) && h.dodges > 0 && h.dodgeT <= 0 && sp > 0 && (!h.act || h.act.cancel !== false)) {
    inp.consume('dodge');
    const a = mlen > .1 ? Math.atan2(md[1], md[0]) : h.aim;
    if (h.act) endAction(h);
    h.dodgeDir = a; h.dodgeT = DODGE_T; h.facing = a; h.dodges--; if (h.dodgeRe <= 0) h.dodgeRe = 1.4; h.inv = Math.max(h.inv, DODGE_T + .04);
    P.dust(h.x, h.y, 0, 6, { speed: 40 }); P.ring(h.x, h.y, 3, 14, '#bff6ff', .25); h.rig.kick(-3); sfx('whoosh', { vol: .7 });
    BUS.emit('dodge', { h });
  }
  // skills: the six slots (in town the swing is harmless, and E / click on a person talks instead)
  if (!town || o.canAct) for (let i = 0; i < 6; i++) if (inp.buffered(SLOT_ACTS[i], .16)) { if (useSlot(h, i)) inp.consume(SLOT_ACTS[i]); }
  // hold-to-channel skills keep running while the key is down
  if (h.act && h.act.hold && !inp.down(SLOT_ACTS[h.act.slot])) h.act.release = true;
  if (inp.pressed('potion')) drinkPotion(h);
  // the current action
  if (h.act) { const k = h.act.speed || 1; if (!h.act.update(dt * k * sp, h)) endAction(h); }
  const act = h.act;
  // movement
  if (h.dodgeT > 0) {
    h.dodgeT -= dt; const u = 1 - h.dodgeT / DODGE_T, v = DODGE_SPEED * h.speedMul * (1 - .5 * u * u);
    h.vx = Math.cos(h.dodgeDir) * v; h.vy = Math.sin(h.dodgeDir) * v; h.z = Math.sin(Math.min(1, u) * Math.PI) * 4 + 2.1;
  } else {
    const slow = act ? (act.moveK === undefined ? .3 : act.moveK) : 1, acc = (h.hurtT > 0 ? 300 : 1000) * dt * (h.traction === undefined ? 1 : h.traction), top = HERO_SPEED * h.speedMul * sp * (h.speedK === undefined ? 1 : h.speedK);
    h.vx = approach(h.vx, md[0] * top * slow, acc); h.vy = approach(h.vy, md[1] * top * slow, acc);
    h.z = act && act.z !== undefined ? act.z : 0;
  }
  // facing: an action may hold it; otherwise turn toward the aim (a quick turn toward a hit when staggered)
  if (act && act.face !== undefined && act.face !== null) h.facing = E.approachAng(h.facing, act.face, dt * 30);
  else if (h.dodgeT > 0) h.facing = h.dodgeDir;
  else if (h.hurtT > 0 && !act) h.facing = E.approachAng(h.facing, h.hitA, dt * 30);
  else h.facing = E.approachAng(h.facing, h.aim, dt * (act ? 10 : 16));
  const wasX = h.x, wasY = h.y;
  h.x += h.vx * dt * (sp || 0); h.y += h.vy * dt * (sp || 0);
  if (h.drift) { h.x += h.drift[0] * dt; h.y += h.drift[1] * dt; }
  h.traction = undefined; h.speedK = undefined; h.drift = null;   // mechanics set these every step (ice, mud, wind)
  collideUnit(h);
  h.idleT = Math.hypot(h.x - wasX, h.y - wasY) > .05 || act ? 0 : h.idleT + dt;
  // the rig: the action's fields over the locomotion state
  const rs = { x: h.x, y: h.y, z: h.z, vx: h.vx, vy: h.vy, facing: h.facing, dash: h.dodgeT > 0, hurt: h.hurtT > 0 && !(act && act.rig && act.rig.attack), expr: h.hurtT > 0 ? 'wince' : h.cheerT > 0 ? 'shout' : null };
  if (act && act.rig) Object.assign(rs, act.rig);
  if (!act && h.cheerT > .3 && mlen < .1) rs.pose = 'cheer';
  else if (!act && town && h.idleT > 6) rs.pose = 'hips';   // waiting in town: hands on hips
  if (sp === 0) { if (!h.st.freeze) h.rig.update(dt, rs); }
  else h.rig.update(dt * (h.st.chill ? .8 : 1), rs);
  if (h.dodgeT <= 0 && !(act && act.rig && act.rig.attack && act.rig.attack.phase === 'active')) settleCape(h.rig, dt, h.hurtT > 0 ? 1 : clamp(1 - Math.hypot(h.vx, h.vy) / 60, 0, 1));
}
/** push a unit out of walls and solid things (braziers, pylons, kegs). A unit that is knocked back, airborne or
 *  flying may cross blocked floor (pits, deep water): that is how monsters get knocked into chasms */
const _probe = { x: 0, y: 0, r: 0, z: 0, step: 2 };
function collideUnit(u) {
  const L0 = ED.L; if (!L0 || !L0.map) return;
  if (u.team === 'foe' && (u.kbT > 0 || u.air || u.canFly || u.z > 2)) { _probe.x = u.x; _probe.y = u.y; _probe.r = u.r; _probe.z = Math.max(u.z || 0, 4.5); L0.map.collide(_probe); u.x = _probe.x; u.y = _probe.y; }
  else L0.map.collide(u);
  if (L0.things) for (const t of L0.things) if (t.solid && !t.dead) { const dx = u.x - t.x, dy = u.y - t.y, d = Math.hypot(dx, dy), m = u.r + t.r; if (d < m && d > .001) { u.x = t.x + dx / d * m; u.y = t.y + dy / d * m; } }
}
/** after a spin, lunge or knockback the cape keeps its swing: draw it back toward hanging (from the stress test) */
function settleCape(rig, dt, w) {
  if (!rig.capeL || !rig.o.cape) return;
  const k = Math.min(1, dt * 16 * w), fx = Math.cos(rig.facing), fy = Math.sin(rig.facing), seg = rig.o.cape.seg || 2.5;
  for (const ch of [rig.capeL, rig.capeR]) ch.forEach((n, i) => {
    n.x = lerp(n.x, ch[0].x - fx * i * .5, k); n.y = lerp(n.y, ch[0].y - fy * i * .5, k); n.z = lerp(n.z, ch[0].z - i * seg * rig.o.size, k);
    n.px = lerp(n.px, n.x, k); n.py = lerp(n.py, n.y, k); n.pz = lerp(n.pz, n.z, k);
  });
}
function drinkPotion(h) {
  if (h.potions <= 0 || h.potionT > 0 || h.dead) { if (h.potions <= 0) notify('NO POTIONS', '#ff8a7a', 1.2); return; }
  h.potions--; h.potionT = .8;
  const heal = h.maxHp * .45 * (1 + (h.stats.potionHeal || 0) / 100);
  h.hp = Math.min(h.maxHp, h.hp + heal * .35); h.healT = 1.5; h.healRate = heal * .65 / 1.5;
  sfx('heal'); P.glints(h.x, h.y, 14, 10, '#ff6a7a', 14); P.ring(h.x, h.y, 2, 16, '#ff8a9a', .35);
}
/** is the hero standing still and free (for pickups, talk prompts) */
const heroFree = h => h.alive && !h.act && h.dodgeT <= 0;

/** afterimages: the dodge leaves blue ones; an action with a ghost color (a lunge, a leap) leaves its own */
function actGhost(h, dodging) {
  if (dodging) return { color: '#62d8ff', life: .22 };
  if (h.act && h.act.ghost && game.time - h.lastGhost > .04) { h.lastGhost = game.time; return { color: h.act.ghost, life: .25 }; }
  return null;
}
function drawHero(h, r) {
  if (!h.rig) return;
  const t = game.time, view = r.view;
  if (!h.dead) r.shadow(h.x, h.y, 5.5, .55, undefined, ED.L && ED.L.map ? ED.L.map.groundAt(h.x, h.y, h.r, h.z) : 0);
  const ghost = h.dodgeT > 0 && t - h.lastGhost > .03; if (ghost) h.lastGhost = t;
  const tint = statusTint(h), fl = h.flash > 0 ? ['#ffe6d8', .3] : tint;
  r.actor(h.x, h.y, h.z, (g, ox, oy) => { h.rig.draw(g, ox, oy, view); if (h.drawExtra) h.drawExtra(g, ox, oy, view); },
    { xray: true, alpha: h.dead ? clamp(4 - h.deadT * 1.2, 0, 1) : h.fade !== undefined ? h.fade : 1, flash: fl && fl[0], flashMix: fl && fl[1], outlineColor: h.flash > 0 ? '#fff4e6' : undefined, ghost: actGhost(h, ghost) });
  h.rig.drawSmear(r, h.smear);
  if (h.act && h.act.draw) h.act.draw(r);
  if (r.gpu) { L.add(h.x, h.y, 18, 84, .6, { color: '#c9c2ec' }); L.caster(h.x, h.y, 3.2, 24); } else L.add(h.x, h.y, 10, 92, .85, { color: '#fff0d8' });
}
