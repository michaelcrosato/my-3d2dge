/* =============================================================================
 * THE GALLERY: the animation showcase (title menu > GALLERY, or #gallery)
 *   SKILLS   the hero performs every registered skill on straw training dummies
 *   BESTIARY every monster walks in, attacks, flinches and falls, one at a time
 *   POSES    the hero's whole pose vocabulary, and his reactions
 *   BOSSES   the bosses wake on the stage and run their patterns (the hero cannot be hurt here)
 * Left / Right pick, Up / Down change the reel, Enter replays, Z toggles slow motion, V view, [ ] turn, Esc leaves.
 * The gallery plays with a COPY of the saved hero (skills are ranked up for the show), so nothing here reaches the save.
 * ============================================================================= */
/* ---- a straw training dummy: a post, a stuffed body and a sack head on a damped spring, so every hit shows ---- */
def('archetypes', 'dummy', { name: 'Training Dummy', tags: ['object'], minDepth: 999, weight: 0, noPack: true, hp: 1e9, dmg: 0, speed: 0, r: 5, xp: 0, head: 26, mass: 3, stagger: false,
  ai: m => { m.vx *= .8; m.vy *= .8; m.x = lerp(m.x, m.homeX, .1); m.y = lerp(m.y, m.homeY, .1); },
  body: m => ({ ax: 0, ay: 0, vx: 0, vy: 0, kick(v) { this.vx += (Math.random() - .5) * v * 30; },
    hit(ang, k) { this.vx += Math.cos(ang) * k; this.vy += Math.sin(ang) * k; },
    update(dt) { this.vx += (-this.ax * 90 - this.vx * 7) * dt; this.vy += (-this.ay * 90 - this.vy * 7) * dt; this.ax += this.vx * dt; this.ay += this.vy * dt; this.ax = clamp(this.ax, -1.2, 1.2); this.ay = clamp(this.ay, -1.2, 1.2); },
    draw(g, ox, oy, view) {
      const s = (view.zoom || 1), P0 = (x, y, z) => { const q = view.p(x, y, z); return [ox + q[0], oy + q[1]]; };
      const lean = (z, k = 1) => [this.ax * z * .35 * k, this.ay * z * .35 * k];
      const wood = E.tones('#7a5634'), straw = E.tones('#d8b25a'), sack = E.tones('#c8a878');
      const [b0x, b0y] = P0(0, 0, 0), [l1x, l1y] = lean(10), [b1x, b1y] = P0(l1x, l1y, 10);
      px.line(g, b0x, b0y, b1x, b1y, wood.sh, Math.max(2, Math.round(2 * s))); px.line(g, b0x - 1, b0y, b1x - 1, b1y, wood.lt);
      px.rect(g, b0x - 3 * s, b0y - 1, 6 * s, 2, wood.deep);
      const [tx, ty] = lean(17), [c0x, c0y] = P0(l1x, l1y, 10), [c1x, c1y] = P0(tx, ty, 18);
      px.poly(g, [[c0x - 3.5 * s, c0y], [c1x - 4 * s, c1y], [c1x + 4 * s, c1y], [c0x + 3.5 * s, c0y]], straw.sh);
      px.poly(g, [[c0x - 2.5 * s, c0y - 1], [c1x - 3 * s, c1y + 1], [c1x + 1 * s, c1y + 1], [c0x + .5 * s, c0y - 1]], straw.base);
      for (let i = 0; i < 4; i++) px.line(g, c0x - 3 + i * 2 * s, c0y, c0x - 4 + i * 2.2 * s, c0y + 2 * s, straw.lt);
      const [ax1, ay1] = lean(16, 1.2), [armL, armLy] = P0(ax1 - 1, ay1 - 6, 16), [armR, armRy] = P0(ax1 - 1, ay1 + 6, 16);
      px.line(g, armL, armLy, armR, armRy, wood.base, Math.max(1, Math.round(1.5 * s)));
      const [hx0, hy0] = lean(23, 1.3), [hx, hy] = P0(hx0, hy0, 23);
      px.disc(g, hx, hy, 3.6 * s, sack.sh); px.disc(g, hx - .6, hy - .6, 2.9 * s, sack.base);
      px.rect(g, hx - 2 * s, hy - 1 * s, 1, 1, '#3a2a1a'); px.rect(g, hx + 1 * s, hy - 1 * s, 1, 1, '#3a2a1a'); px.line(g, hx - 1.5 * s, hy + 1.5 * s, hx + 1.5 * s, hy + 1.5 * s, '#8a3a2a');
      px.line(g, hx - 1, hy - 3.6 * s, hx + 2, hy - 4.6 * s, straw.lt);
    } }),
  react(m, hit) { if (m.body) m.body.hit(hit.ang || 0, 3 + (hit.kb || 0) * .02); m.hp = m.maxHp; P.add({ kind: 'bit', x: m.x, y: m.y, z: 16, vx: (Math.random() - .5) * 60, vy: (Math.random() - .5) * 60, vz: 60, g: 300, max: .8, color: '#d8b25a' }); }
});

const GAL = { reel: 0, i: 0, t: 0, slow: false, cur: null, key: null, reels: ['SKILLS', 'BESTIARY', 'BOSSES', 'POSES'], cam: null };
addEventListener('keydown', e => { if (ED.mode === 'gallery' && !e.repeat && /^(Arrow|Enter)/.test(e.code)) GAL.key = e.code; });
const GAL_POSES = [
  ['Idle', {}, 'He breathes and shifts his weight.'], ['Walk', { run: .55 }, 'A gait driven by velocity, not frames.'], ['Run', { run: 1.1 }, 'The cape streams behind.'],
  ['Guard', { pose: 'guard' }, 'A boxer\'s guard.'], ['Block', { pose: 'block' }, 'Blade upright across the body.'], ['Ready', { stance: 'ready' }, 'Weapon held forward.'],
  ['Cast', { pose: 'cast' }, 'Both hands forward.'], ['Cheer', { pose: 'cheer', expr: 'shout' }, 'Victory: fists pump, the blade points up.'], ['Wave', { pose: 'wave', expr: 'smile' }, 'A greeting.'],
  ['Hands on hips', { pose: 'hips', expr: 'smile' }, 'A cocky idle.'], ['Kneel', { pose: 'kneel' }, 'Resting, or wounded.'], ['Crouch', { pose: 'crouch' }, 'Ducking low.'],
  ['Airborne', { air: true }, 'Legs tuck in a jump.'], ['Dash', { dash: true }, 'Leaning into a dash.'], ['Hurt', { hurt: true, expr: 'wince' }, 'A flinch: one arm shields the face.'],
  ['Knocked down', { down: 1 }, 'Flat on his back, then up again.'], ['Fall', { pose: 'die' }, 'A stagger, the knees give, a topple.'], ['Climb', { climb: true, vz: 30 }, 'Hand over hand.']
];
function galItems() {
  if (GAL.reel === 0) return Object.keys(REG.skills);
  if (GAL.reel === 1) return Object.keys(REG.archetypes).filter(id => { const A0 = REG.archetypes[id]; return id !== 'dummy' && !A0.bossBody && !(A0.tags || []).includes('boss'); });   // bosses have their own reel
  if (GAL.reel === 2) return Object.keys(REG.bosses);
  return GAL_POSES.map((p, i) => i);
}
function galStage() {
  const w = 26, hh = 20, cells = new Array(w * hh).fill(0);
  for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) if (!x || !y || x === w - 1 || y === hh - 1) cells[y * w + x] = 1;
  const L0 = { kind: 'gallery', rec: { depth: 3, seed: 3, pool: [] }, depth: 3, name: 'The Gallery', theme: REG.themes.crypt, hue: 0, w, h: hh, cells, tags: new Array(w * hh).fill(null), rooms: [{ x: 1, y: 1, w: w - 2, h: hh - 2, cx: w / 2, cy: hh / 2 }], things: [], props: [], torches: [], runes: [{ x: w * 8, y: hh * 8, r: 44 }], mechs: [], seen: new Uint8Array(w * hh).fill(1), t: 0 };
  L0.pal = CRYPT; L0.map = new E.TileMap({ w, h: hh, tile: T16, cells, types: REG.themes.crypt.walls, floorTex: (x, y, tag) => cryptFloor(L0, x, y, tag, CRYPT) }); deepCutaway(L0.map); L0.flow = new E.FlowField(L0.map);
  for (const [x, y] of [[5, 5], [21, 5], [5, 15], [21, 15]]) L0.torches.push({ x: x * T16, y: y * T16, t: Math.random() * 9, kind: 'brazier', color: '#ff9a4a', r: 4.5, solid: true });
  L0.randomFloor = (R, o) => randomFloor(L0, R, o); L0.start = { x: w * 8 - 30, y: hh * 8 };
  return L0;
}
/* ---- SKILLS staging: a tight cluster of dummies east of the rune circle's centre; the hero's mark depends on the skill ---- */
const GAL_DUMMIES = [[-12, 0], [0, -13], [0, 13], [13, -6], [13, 8], [27, 0]];
const GAL_K = 20;   // the cluster's centre, east of the stage centre
/** how far west of the cluster the hero stands: melee within reach, spells at range, movers far back so they travel */
function galMark(id) {
  const S = REG.skills[id] || {}, t = S.tags || [];
  if (S.kind === 'mobility' || t.includes('movement')) return 66;
  if (t.includes('melee') && !t.includes('proj')) return 29;
  if (S.range) return clamp(S.range * .75, 26, 46);
  return 60;
}
function galReset() {
  // bosses leave their marks on the floor (webs, lava, craters) and things: a fresh stage for the next take
  if (ED.L.things.length || (ED.L.map.floorTags || []).some(Boolean) || ED.L.mechs.length) { enterWorld(galStage()); ED.depth = 3; L.ambient = .16; }
  const h = ED.hero, L0 = ED.L, cx = L0.w * 8, cy = L0.h * 8;
  ED.foes.length = 0; ED.corpses.length = 0; ED.fx.length = 0; ED.allies.length = 0; ED.drops.length = 0; P.list.length = 0; ED.boss = null;
  endAction(h); h.vx = h.vy = 0; h.z = 0; h.facing = h.aim = 0; h.hp = h.maxHp; h.st = {}; h.inv = 0; h.dead = false; h.alive = true; h.ember = h.maxEmber; h.cds = {}; h.buffs = []; computeStats(h);
  h.bot = { manual: true, input: makeBotInput() };   // the gallery drives him through the autopilot's virtual input (the mouse must not steer the show)
  GAL.t = 0; GAL.fired = 0; GAL.next = .8; GAL.hold = 0; GAL.mon = null;
  const items = galItems(); GAL.i = (GAL.i + items.length) % Math.max(1, items.length); GAL.cur = items[GAL.i];
  if (GAL.reel === 0) {   // a cluster of dummies to strike
    const kx = cx + GAL_K; GAL.markX = kx - galMark(GAL.cur); h.x = GAL.markX; h.y = cy;
    for (const [dx, dy] of GAL_DUMMIES) { const m = spawnMonster('dummy', kx + dx, cy + dy, { instant: true }); if (m) { m.homeX = m.x; m.homeY = m.y; m.noLoot = true; m.facing = Math.PI; } }
    const id = GAL.cur; h.skills[id] = Object.assign({}, h.skills[id] || {}, { rank: Math.max(3, (h.skills[id] && h.skills[id].rank) || 0) }); h.slots[5] = id;
  } else if (GAL.reel === 1) {   // one monster walks in from the east
    h.x = cx - 22; h.y = cy;
    const m = spawnMonster(GAL.cur, cx + 40, cy, { instant: true, level: 3 }); if (m) { m.noLoot = true; m.ai.aware = true; m.facing = Math.PI; GAL.mon = m; }
  } else if (GAL.reel === 2) {   // a boss, awake
    h.x = cx - 44; h.y = cy;
    const m = spawnBoss(GAL.cur, cx + 30, cy, { level: 3 }); if (m) { m.noLoot = true; m.facing = Math.PI; GAL.mon = m; ED.boss = m; if (typeof wakeBoss === 'function') wakeBoss(m); }
  } else { h.x = cx; h.y = cy; }   // poses: centre stage
  if (GAL.reel !== 2) playSong('title');
  game.setZoom(GAL.reel === 3 ? 2.5 : GAL.reel === 2 ? 1.25 : 1.75);
  GAL.cam = null;
}
/** the SKILLS reel's autopilot: walk back to the mark, face the dummies, cast (holding channels), let combos run on */
function galSkill(h, dt) {
  const id = GAL.cur, S = REG.skills[id], I = h.bot.input, cy = ED.L.h * 8, kx = ED.L.w * 8 + GAL_K;
  I.clear(); I._d = {}; I.worldMove = [0, 0]; I.aimAt = [kx, cy];
  if (!S) return;
  const dx = GAL.markX - h.x, dy = cy - h.y, d = Math.hypot(dx, dy);
  if (!h.act && d > 3 && GAL.t > .3) { I.worldMove = [dx / d, dy / d]; I.aimAt = null; h.speedK = d < 10 ? .5 : 1; return; }   // back to his mark (a walk, not a jump cut)
  h.speedK = 0;
  if (GAL.hold > 0) { GAL.hold -= dt; I._d.s5 = true; }                                              // channels (Whirlwind) are held down
  if (S.again && h.act && h.act.skill === id && h.act.free) useSlot(h, 5);                             // whole combos
  if (!h.act && GAL.fired < 4 && GAL.t >= GAL.next && d <= 3) {
    h.cds = {}; h.ember = h.maxEmber; h.aim = h.facing = Math.atan2(cy - h.y, kx - h.x); h.tx = kx; h.ty = cy;
    if (useSlot(h, 5)) { GAL.fired++; if (h.act && h.act.hold) GAL.hold = 1.8; }
  }
  if (h.act) GAL.next = GAL.t + 1.1;   // the next take starts a beat after this one ends
}
const galleryScene = {
  enter() {
    ED.mode = 'gallery'; UI.closeAll(); BUS.clear('level');
    GAL.real = ED.hero; ED.hero = loadHeroOrNew();   // a copy from the save: the show ranks skills up, and none of that may be saved
    const L0 = galStage(); enterWorld(L0); ED.depth = 3; L.ambient = .16;
    GAL.i = 0; galReset(); game.cam.snap = true;
  },
  exit() { game.timeScale = 1; ED.foes.length = 0; ED.boss = null; ED.hero = GAL.real || null; GAL.real = null; },
  update(dt) {
    const inp = game.input, h = ED.hero, L0 = ED.L, cx = L0.w * 8, cy = L0.h * 8;
    if (updateUI(dt)) return;
    if (inp.pressed('cancel')) { game.go('title'); return; }
    if (GAL.key) { const k = GAL.key; GAL.key = null;
      if (k === 'ArrowRight' || k === 'ArrowLeft') { GAL.i += k === 'ArrowRight' ? 1 : -1; galReset(); sfx('select'); }
      else if (k === 'ArrowUp' || k === 'ArrowDown') { GAL.reel = (GAL.reel + (k === 'ArrowDown' ? 1 : GAL.reels.length - 1)) % GAL.reels.length; GAL.i = 0; galReset(); sfx('confirm'); }
      else if (k === 'Enter') galReset(); }
    GAL.t += dt; h.speedK = 0;   // the arrow keys browse here, so the hero stays put
    h.inv = 99; h.hp = h.maxHp; h.ember = h.maxEmber;
    const I = h.bot && h.bot.input; if (I && GAL.reel !== 0) { I.clear(); I._d = {}; I.worldMove = [0, 0]; I.aimAt = GAL.mon ? [GAL.mon.x, GAL.mon.y] : [h.x + 30, h.y]; }
    if (GAL.reel === 0) {
      galSkill(h, dt);
      if (GAL.fired >= 4 && !h.act && GAL.t > GAL.next + .6 || GAL.t > 16) galReset();
    } else if (GAL.reel === 1) {
      const m = GAL.mon;
      if (m && m.alive && GAL.t > 7) { m.st = {}; dealDamage(m, { src: h, amount: m.hp + 1, el: 'phys', kb: 90, ang: angTo(h, m), noNumber: false }); }
      if (GAL.t > 10) galReset();
    } else if (GAL.reel === 2) {
      if (GAL.t > 16) galReset();
    }
    if (GAL.reel === 3) {   // poses: the rig alone
      const p = GAL_POSES[GAL.cur] || GAL_POSES[0], st = Object.assign({ x: h.x, y: h.y, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 + Math.sin(GAL.t * .5) * .8 }, p[1]);
      if (p[1].down) st.down = GAL.t % 4 < 2.2 ? 1 : 0;
      if (p[1].pose === 'die' && GAL.t > 3.5) galReset();
      h.rig.update(dt, st); h.facing = st.facing; settleCape(h.rig, dt, .3);
      for (const b of ED.L.torches) b.t += dt;
    } else worldStep(dt, { canAct: false, gallery: true });
    // keep the show on the stage: the hero near his mark, monsters leashed to the circle (kiters and flyers wander off otherwise)
    h.x = clamp(h.x, cx - 80, cx + 60); h.y = clamp(h.y, cy - 40, cy + 40);
    if (GAL.reel === 1 || GAL.reel === 2) for (const m of ED.foes) if (m.alive) { const R = GAL.reel === 2 ? 76 : 58, dx = m.x - cx, dy = m.y - cy, d = Math.hypot(dx, dy); if (d > R) { m.x = cx + dx / d * R; m.y = cy + dy / d * R; } }
    if (GAL.reel === 1 && h.act === null && GAL.mon) { h.facing = E.approachAng(h.facing, angTo(h, GAL.mon), dt * 6); h.aim = h.facing; }
    // the camera frames what matters: the hero and the dummies, the monster (at its height: flyers too), or the hero alone
    const m = GAL.mon, tgt = GAL.reel === 0 ? [(GAL.markX + cx + GAL_K) / 2 + 4, cy, 10]
      : (GAL.reel === 1 || GAL.reel === 2) && m ? [(h.x + m.x) / 2, (h.y + m.y) / 2, 8 + Math.max(0, (m.z || 0)) * .5 + (GAL.reel === 2 ? 14 : 0)] : [h.x, h.y, 19];
    const c = GAL.cam || (GAL.cam = tgt.slice()), k = Math.min(1, dt * 3); for (let i = 0; i < 3; i++) c[i] += (tgt[i] - c[i]) * k;
    game.focus(c[0], c[1], c[2]);
    if (inp.pressed('labels')) { GAL.slow = !GAL.slow; }
    game.timeScale = GAL.slow ? .3 : 1;
  },
  draw(r) {
    const L0 = ED.L;
    L0.map.drawFloor(r); L0.map.queueWalls(r); drawTorches(L0, r);
    for (const m of ED.corpses) drawFoe(m, r);
    for (const m of ED.foes) drawFoe(m, r);
    for (const a of ED.allies) if (a.draw) a.draw(r);
    drawHero(ED.hero, r); drawFx(r);
    L.add(L0.w * 8, L0.h * 8, 3, 70, .5, { color: '#4fe0cc' });
    r.overlay(g => {
      const W = r.W, H = r.H, cx = W / 2, items = galItems();
      px.blend(g, .6, 'normal', () => { px.rect(g, 0, 0, W, 31, '#05040a'); px.rect(g, 0, H - 38, W, 38, '#05040a'); });   // bands behind the text, so it reads on any floor
      E.font.title(g, 'GALLERY', cx, 4, { scale: 2, colors: ['#fff6c8', '#ffd36a', '#e07a2a'], depth: 2, align: 'center' });
      GAL.reels.forEach((n, i) => E.font.text(g, n, cx + (i - (GAL.reels.length - 1) / 2) * 60, 22, i === GAL.reel ? GOLD : '#8a80a8', { align: 'center', font: 'tiny', outline: '#0c0818' }));
      let title = '', sub = '';
      if (GAL.reel === 0) { const S = REG.skills[GAL.cur]; if (S) { title = S.name; sub = typeof S.desc === 'function' ? S.desc(3, null) : S.desc || ''; drawSkillIcon(g, GAL.cur, 8, H - 32, 1); } }
      else if (GAL.reel === 1) { const A0 = REG.archetypes[GAL.cur]; if (A0) { title = A0.name; sub = (A0.tags || []).join(', ') + (A0.themes ? '  ·  lives in: ' + A0.themes.join(', ') : '  ·  found everywhere'); } }
      else if (GAL.reel === 2) { const B = REG.bosses[GAL.cur]; if (B) { title = B.name; sub = (B.title ? B.title + '  ·  ' : '') + (B.depth ? 'depth ' + B.depth + '  ·  ' : '') + 'patterns: ' + ((GAL.mon && GAL.mon.patterns) || (B.phases || []).flatMap(p => p.patterns || []).filter((v, i, a) => a.indexOf(v) === i)).join(', '); } }
      else { const p = GAL_POSES[GAL.cur] || GAL_POSES[0]; title = p[0]; sub = p[2]; }
      E.font.text(g, title.toUpperCase(), cx, H - 35, '#ffffff', { align: 'center', scale: 1, shadow: '#05040a', outline: '#0c0818' });
      E.font.wrap(sub.replace(/·/g, '•'), W - 60).slice(0, 2).forEach((l, i) => E.font.text(g, l, cx, H - 25 + i * 9, '#d8d0e8', { align: 'center', shadow: '#05040a', outline: false }));
      E.font.text(g, (GAL.i + 1) + ' / ' + items.length + '   ← → pick   ↑ ↓ reel   ENTER replay   Z slow' + (GAL.slow ? ' (ON)' : '') + '   V view   ESC back', cx, H - 6, '#a89ec8', { align: 'center', font: 'tiny', outline: false });
    });
    drawPanels(r);
  }
};
