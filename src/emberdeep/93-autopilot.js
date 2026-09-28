/* =============================================================================
 * AUTOPILOT: a bot that plays the hero (balance runs, soak tests, and the title screen's attract mode)
 * It drives a virtual input (h.bot.input) the hero controller reads instead of the keyboard: a world move
 * direction, an aim point, and the slot / dodge / potion presses. It fights the nearest pack, dodges wind-ups
 * and warnings, drinks when low, loots, spends points, equips upgrades and heads for the exit.
 *   window.__ed.bot(true)   take over the current hero        __ed.botRun({ to: 10 }) play depths down to 10
 * ============================================================================= */
function makeBotInput() {
  return { aimSource: 'bot', aimAt: null, worldMove: [0, 0], padAim: null, _p: {}, _d: {},
    move() { return [0, 0]; }, buffered(a) { return !!this._p[a]; }, consume(a) { this._p[a] = false; }, pressed(a) { return !!this._p[a]; }, released() { return false; },
    down(a) { return !!this._d[a]; }, repeat() { return false; }, press(a) { this._p[a] = true; }, clear() { this._p = {}; } };
}
function botOn(h, on = true) { if (!h) return; if (on) h.bot = { input: makeBotInput(), flow: null, ft: [-1, -1], t: 0, stuck: 0, lx: h.x, ly: h.y, goal: null, think: 0, log: [] }; else h.bot = null; }
/** is the hero standing where something is about to land? (enemy wind-ups, boss telegraphs, charging monsters) */
function botDanger(h) {
  for (const f of ED.fx) if (f.kind === 'tele' && !f.cancelled && f.t > f.dur * .25) {
    if (f.shape === 'circle' && Math.hypot(h.x - f.x, h.y - f.y) < f.r + h.r + 2) return [f.x, f.y];
    if (f.shape === 'arc' && E.inArc(f, f.ang, h, f.r, f.half)) return [f.x, f.y];
    if (f.shape === 'line') { const ca = Math.cos(f.ang), sa = Math.sin(f.ang), dx = h.x - f.x, dy = h.y - f.y, al = dx * ca + dy * sa, sd = Math.abs(-dx * sa + dy * ca); if (al > 0 && al < f.len && sd < f.w / 2 + h.r + 2) return [h.x - sa * 10, h.y + ca * 10]; }
  }
  for (const m of ED.foes) if (m.alive && m.atk && m.atk.phase === 'wind' && m.atk.u > .45 && Math.hypot(m.x - h.x, m.y - h.y) < 30) return [m.x, m.y];
  return null;
}
function botScore(it) { if (!it) return -1; const w = it.dmg ? (it.dmg[0] + it.dmg[1]) * 1.5 : 0; return it.rarity * 12 + it.ilvl * 3 + w + it.affixes.length * 3 + (it.armor || 0) * .3; }
function botManage(h) {
  // equip upgrades from the bag
  for (const it of h.bag.slice()) { const slot = it.slot === 'ring' ? (!h.gear.ring ? 'ring' : !h.gear.ring2 ? 'ring2' : botScore(h.gear.ring) < botScore(h.gear.ring2) ? 'ring' : 'ring2') : it.slot; if (botScore(it) > botScore(h.gear[slot]) + 2) equip(h, it, slot); }
  while (h.bag.length > 30) { const it = h.bag.shift(); gainGold(h, it.value); }   // sells the rest (the bot has no patience for shops)
  // learn skills: fill empty slots with unlocked skills, then rank up what is slotted
  const known = Object.keys(REG.skills).filter(id => (REG.skills[id].unlock || 1) <= h.level);
  let guard = 20;
  while (h.pts.skill > 0 && guard-- > 0) {
    const empty = h.slots.findIndex((s, i) => !s && i > 0), fresh = known.filter(id => !(h.skills[id] && h.skills[id].rank) && !REG.skills[id].noAuto);
    if (empty > 0 && fresh.length) { const id = rnd.pick(fresh); h.skills[id] = { rank: 1 }; h.slots[empty] = id; h.pts.skill--; continue; }
    const up = h.slots.filter(Boolean).filter(id => h.skills[id] && h.skills[id].rank < 5);
    if (!up.length) break; const id = rnd.pick(up); h.skills[id].rank++; h.pts.skill--;
    if (h.skills[id].rank >= 2 && !h.skills[id].rune && REG.skills[id].runes) h.skills[id].rune = rnd.pick(REG.skills[id].runes).id;
  }
  if (h.pts.passive > 0 && typeof autoAllocatePassives === 'function') autoAllocatePassives(h);
  computeStats(h);
}
/** one bot decision per step: returns nothing, fills h.bot.input */
function botThink(h, dt) {
  const B = h.bot, I = B.input, L0 = ED.L; I.clear(); I._d = {};
  if (!L0 || !h.alive) return;
  B.t += dt; B.think -= dt;
  if (B.think <= 0) { B.think = .5; botManage(h); }
  const moved = Math.hypot(h.x - B.lx, h.y - B.ly); B.lx = h.x; B.ly = h.y; B.stuck = moved < .15 ? B.stuck + dt : Math.max(0, B.stuck - dt * 2);
  // drink when low
  if (h.hp < h.maxHp * .38 && h.potions > 0 && h.potionT <= 0) I.press('potion');
  // dodge out of danger (a perpendicular hop away from the threat)
  const dz = botDanger(h);
  if (dz && h.dodges > 0 && h.dodgeT <= 0) { const a = Math.atan2(h.y - dz[1], h.x - dz[0]) + (Math.random() < .5 ? .6 : -.6); I.worldMove = [Math.cos(a), Math.sin(a)]; I.press('dodge'); I.aimAt = [h.x + Math.cos(a) * 30, h.y + Math.sin(a) * 30]; return; }
  // the target: the nearest living monster within sight, else loot, else the exit
  let foe = null, fd = 1e9;
  for (const m of ED.foes) { if (!m.alive || m.spawnT > 0 || m.untargetable || (m.fade !== undefined && m.fade < .2 && !m.boss)) continue; const d = Math.hypot(m.x - h.x, m.y - h.y); if (d < fd) { fd = d; foe = m; } }
  const near = foe && fd < 170;
  let goal = null;
  if (near) goal = [foe.x, foe.y];
  else { const d0 = ED.drops.filter(d => d.kind === 'item' && d.rest && labelShown(d)).sort((a, b) => dist2(a, h) - dist2(b, h))[0]; if (d0 && Math.hypot(d0.x - h.x, d0.y - h.y) < 120 && h.bag.length < BAG_MAX) goal = [d0.x, d0.y]; }
  if (!goal) { const left = ED.foes.filter(m => m.alive).length, total = (L0.packs && L0.packs.length * 6) || 60; goal = foe && (left > total * .35 || (L0.exit && !L0.exit.open)) ? [foe.x, foe.y] : L0.exit && L0.exit.open ? [L0.exit.x, L0.exit.y] : foe ? [foe.x, foe.y] : [L0.start.x, L0.start.y]; }
  B.goal = goal;
  // walk there around walls (a flow field toward the goal cell)
  const cell = [Math.floor(goal[0] / T16), Math.floor(goal[1] / T16)];
  if (!B.flow || B.flow.map !== L0.map) B.flow = new E.FlowField(L0.map);
  if (cell[0] !== B.ft[0] || cell[1] !== B.ft[1]) { B.flow.update(goal[0], goal[1]); B.ft = cell; }
  const gd = Math.hypot(goal[0] - h.x, goal[1] - h.y), reach = near ? (foe.r + 14) : 4;
  let mv = [0, 0];
  if (gd > reach) mv = gd < 48 ? [(goal[0] - h.x) / gd, (goal[1] - h.y) / gd] : B.flow.dir(h.x, h.y, goal[0], goal[1]);
  if (B.stuck > .8) { const a = Math.random() * TAU; mv = [Math.cos(a), Math.sin(a)]; if (B.stuck > 1.6) { I.press('dodge'); B.stuck = 0; } }
  I.worldMove = mv; I.aimAt = near ? [foe.x, foe.y] : [h.x + mv[0] * 30 + .01, h.y + mv[1] * 30];
  if (!near) return;
  // fight: spenders and cooldowns when there is a crowd or an elite, the basic attack otherwise
  const crowd = GRID.near(h.x, h.y, 50).length, big = foe.elite || foe.boss;
  for (let i = 5; i >= 1; i--) {
    const id = h.slots[i]; if (!id) continue; const S = REG.skills[id]; if (!S || h.cds[id] > 0 || h.ember < skillCost(h, S)) continue;
    const want = (S.tags || []).includes('aoe') || S.kind === 'ultimate' ? crowd >= 3 || big : S.kind === 'mobility' ? fd > 60 : true;
    if (want && fd < (S.range || ((S.tags || []).includes('melee') ? 40 : 150))) { I.press(SLOT_ACTS[i]); I._d[SLOT_ACTS[i]] = true; break; }
  }
  if (fd < foe.r + 22) { I.press('s0'); I._d.s0 = true; }
}
BUS.on('step', () => { const h = ED.hero; if (h && h.bot) botThink(h, 1 / 120); });
/* a soak / balance run: the bot plays depth after depth and logs how it went (time, level, deaths, potions) */
const BOT_RUN = { on: false, to: 0, log: [] };
function botRun(o = {}) {
  BOT_RUN.on = true; BOT_RUN.to = o.to || 10; BOT_RUN.log = []; BOT_RUN.start = ED.t;
  if (!ED.hero) ED.hero = newHero();
  botOn(ED.hero, true); game.timeScale = o.speed || 3;
  descend(o.from || 1);
}
BUS.on('levelStart', e => { const h = ED.hero; if (BOT_RUN.on && h) { botOn(h, true); BOT_RUN.t0 = ED.t; BOT_RUN.deaths0 = BOT_RUN.deaths || 0; } });
BUS.on('levelEnd', e => { const h = ED.hero; if (!BOT_RUN.on || !h || !e.L || !e.L.depth) return; BOT_RUN.log.push({ depth: e.L.depth, name: e.L.name, time: +(ED.t).toFixed(1), level: h.level, hp: Math.round(h.hp / h.maxHp * 100), gold: h.gold, kills: ED.stats.kills, deaths: BOT_RUN.deaths || 0 }); if (e.L.depth >= BOT_RUN.to) { BOT_RUN.on = false; game.timeScale = 1; botOn(h, false); } });
BUS.on('heroDie', () => { if (!BOT_RUN.on) return; BOT_RUN.deaths = (BOT_RUN.deaths || 0) + 1; game.after(2.5, () => { UI.closeAll(); reviveHero(ED.hero); descend(ED.depth || 1); }); });
