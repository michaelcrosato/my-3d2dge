/*!
my-3D2dge module FIGHT v0.81.5: one-on-one fighting: fighters with frame data, guards, throws, specials, a meter; rounds; a CPU; training
https://github.com/michaelcrosato/my-3d2dge (MIT License)
Loads after: the full engine only. Needs: no other module.

Street Fighter II's rules, in the side view: for fighting games, and a boss duel in any side-scroller.
- const f = new E.Fighter(game, { name, x, rig: { size: 2.4, build: 'heroic', colors }, life: 1000, walk: 75, back: 60,
  moves }); E.Match gives each its foe and its control: an E.Input (the scene's input: E.FIGHT_KEYS; player 2's is
  game.players[1]) or a CPU. It faces its foe, walks, crouches on down, jumps on up (straight, forward or back), and
  holds back to block.
- moves: { id: spec }. A spec: move (an E.MOVES name the rig plays: 'jab', 'uppercut', 'roundhouse'; or its own
  fields), btn ('lp' | 'hp' | 'lk' | 'hk': the preset E.FIGHT_KEYS), when ('stand' | 'crouch' | 'air' | 'close'), or
  motion ('236', '623', '214', '41236': numpad notation, mirrored by facing) or charge ('46': back held .7 s, then
  forward; '28') for a special; f: [startup, active, recovery] (frames at 60; else the move's seconds), dmg, stun and
  block (frames of hit- and block-stun), guard ('mid' | 'low': blocked crouching | 'overhead': standing | 'throw'),
  chip (the share of dmg a block still takes: specials .25), push, launch (up speed: a juggle, then a knockdown), down
  (a knockdown), cancel (true: a special may cut it short once it connects), meter (a super's cost; 100 a bar), vx and
  vz (it travels: a spinning kick, a rising uppercut), inv (frames invulnerable from its start), shot ({ speed, r,
  dmg, color }: a projectile on E.Bullets, one at a time), teleport (units past the foe), throw (true: a command grab,
  range in units), r (the hit box's radius).
- A throw: the throw button (o.throwBtn, 'hp') with forward or back, close, on a foe standing or walking; it can't be
  blocked. Hits in a row scale down to half; a juggled foe takes three hits at most; a knockdown gets up invulnerable.
- f.life, f.meter, f.combo (the hits it has taken in a row), f.ko, f.boxes ({ hurt: [boxes], hit, push }: boxes
  { x, z, w, h }, x the left), f.last (the frame data of its last move: { id, startup, active, recovery, adv }).
- const m = new E.Match(game, { fighters: [a, b], ai: [null, new E.FightAI({ level: 4, seed: 1 })], rounds: 2 (wins
  needed), time: 99, x0: 0, x1: 520 (the stage's walls), training: false | { dummy: 'stand' | 'crouch' | 'jump' |
  'guard' } }): m.update(dt) runs it (ROUND 1, FIGHT!, K.O., TIME, PERFECT, the win poses, the next round); m.draw(r) draws the
  fighters, their shots and the HUD (life, timer, rounds, meters, combos, the calls; in training the boxes, the frame
  data and the input display). m.phase ('intro' | 'fight' | 'ko' | 'win' | 'over'), m.winner (0 or 1), m.wins, m.x.
- new E.FightAI({ level: 1..8, seed }): reads its foe after a reaction time (shorter at higher levels), keeps its
  range, guards, answers jumps with an anti-air (a move with aa: true), throws, confirms hits into specials. Its
  randomness is its own E.rng, so the same seed fights the same match.
- new E.FightSelect(game, { roster: [{ id, name, rig, about }], inputs: [p1, p2 or null], cpu: [false, true], onDone:
  ids => {} }): pick a fighter each (left, right, confirm; a tap on a portrait); update(dt), draw(r).

```js fight
const E = My3D2dge, game = new E.Game({ headless: true });
const moves = { jab: { move: 'jab', btn: 'lp', dmg: 40, stun: 14, block: 10, cancel: true }, sweep: { move: 'sweep', btn: 'lk', when: 'crouch', guard: 'low', down: true, dmg: 70 },
  fire: { move: 'cast', btn: 'lp', motion: '236', shot: { speed: 160, dmg: 60 } }, rise: { move: 'uppercut', btn: 'hp', motion: '623', inv: 6, vz: 300, launch: 300, dmg: 110, aa: true } };
const a = new E.Fighter(game, { name: 'A', moves }), b = new E.Fighter(game, { name: 'B', moves });
const m = new E.Match(game, { fighters: [a, b], ai: [new E.FightAI({ level: 7, seed: 1 }), new E.FightAI({ level: 2, seed: 2 })], time: 30 });
game.start({ update: dt => m.update(dt), draw: r => m.draw(r) });   // once a step, 120 times a second
for (let s = 0; s < 300 && m.phase !== 'over'; s++) game.advance(1);
if (m.phase !== 'over' || m.wins[m.winner] < 2) throw new Error('a match ends with a winner');
```
Rules: a fighter reads its input at the engine's 120 Hz step (motions too), so update it once a step; f.update(dt, ctl) takes an
E.Input or a CPU's intent ({ x, y: -1..1 on screen, press: a button, do: a move id }); frame data is in frames at 60.
*/
(function (E) {
'use strict';
if (!E) throw new Error('my-3D2dge module FIGHT: load engine/my-3d2dge.js first');
if (!E.Platformer || !E.Input.prototype.motion) throw new Error('my-3D2dge module FIGHT: it needs the full engine (E.Platformer, input.motion)');

/* =============================================================================
 * FIGHT  fighters, matches, a CPU, a character select and training
 * ========================================================================== */
const { clamp, lerp, approach, px } = E, FPS = 60, sec = n => n / FPS, frames = s => Math.round(s * FPS), PI = Math.PI;
const D = E.Input.DEFAULT;
/** the fighting preset (a scene's input): the moves and menu keys of E.Input.DEFAULT, light and heavy punch (U, I; a
 *  pad's X, Y), light and heavy kick (J, K; A, B) */
E.FIGHT_KEYS = { up: D.up, down: D.down, left: D.left, right: D.right, lp: ['KeyU', 'Pad2'], hp: ['KeyI', 'Pad3'], lk: ['KeyJ', 'Pad0'], hk: ['KeyK', 'Pad1'], start: D.start, pause: D.pause, confirm: D.confirm, cancel: D.cancel };
const BTN = ['lp', 'hp', 'lk', 'hk'];
// what a move does by its button when the spec doesn't say: [dmg, stun, block, push]
const BASE = { lp: [30, 13, 9, 70], hp: [80, 20, 15, 120], lk: [35, 14, 10, 80], hk: [90, 21, 16, 130] };
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.z < b.z + b.h && b.z < a.z + a.h;

/** the floor the fighters stand on when no level is given: z 0 between walls at x0 and x1 (a Platformer's level) */
class FightStage {
  /** new E.FightStage(x0, x1): a flat floor at z 0. x0: its left wall; x1: its right wall */
  constructor(x0 = 0, x1 = 520) { this.x0 = x0; this.x1 = x1; }
  /** move a body one step: the floor and the walls stop it */
  move(b, dt) {
    b.x += b.vx * dt; b.z += b.vz * dt; b.hitWall = 0; const h = b.w / 2;
    if (b.x - h < this.x0) { b.x = this.x0 + h; b.hitWall = -1; if (b.vx < 0) b.vx = 0; }
    if (b.x + h > this.x1) { b.x = this.x1 - h; b.hitWall = 1; if (b.vx > 0) b.vx = 0; }
    b.onGround = b.z <= 0 && b.vz <= 0; if (b.onGround) { b.z = 0; b.vz = 0; } b.onOneWay = false;
  }
  /** no ladders on a stage */
  touching() { return false; }
  /** no cells either */
  cellsTouching() { return []; }
}
E.FightStage = FightStage;

class Fighter {
  /** new E.Fighter(game, { name, x, side: 1 (faces right), rig: Humanoid options (or a Humanoid), life: 1000, walk: 75,
   *  back: 60, jump: 390, jumpX: 90, moves, throwBtn: 'hp', throwRange, throwDmg: 120, input }) */
  constructor(game, o = {}) {
    /** game: the game it fights in; name: its name on the HUD */
    this.game = game; this.name = o.name || 'FIGHTER';
    /** rig: its E.Humanoid (drawn and posed from its state every step) */
    this.rig = o.rig instanceof E.Humanoid ? o.rig : new E.Humanoid(Object.assign({ size: 2.6, build: 'heroic', weapon: null }, o.rig));
    const sz = this.rig.o.size;
    /** o: its options, with the defaults filled in */
    this.o = Object.assign({ life: 1000, walk: 75, back: 60, jump: 390, jumpX: 90, throwBtn: 'hp', throwRange: 13 * sz, throwDmg: 120 }, o);
    /** body: its E.Platformer (x, z: its feet; w, h: its push box) */
    this.body = new E.Platformer({ x: o.x || 0, w: 8 * sz, h: 30 * sz, run: this.o.walk, accel: 2400, decel: 3200, airAccel: 0, gravity: 1000, fallGravity: 1000, maxFall: 700, coyote: 0, buffer: 0, cut: 1 });
    /** moves: { id: spec }, each spec with its E.Attack (atk) and its frame data (frames: [startup, active, recovery]) */
    this.moves = {}; for (const id in o.moves || {}) this.moves[id] = this._spec(id, o.moves[id]);
    /** input: its E.Input, or null (a CPU passes its intent to update); foe: the other fighter (E.Match sets it); shots: its
   *  projectiles (E.Bullets, the side plane) */
    this.input = o.input || null; this.foe = null; this.shots = new E.Bullets(game, { plane: 'side', sparks: false, max: 4 }); this._level = o.stage || new FightStage();
    this._throwM = this._spec('throw', { move: 'throw', btn: this.o.throwBtn, f: [3, 10, 20], dmg: this.o.throwDmg });
    /** facing: 1 right, -1 left */
    this.facing = o.side || 1; this.reset(this.body.x, this.facing);
  }
  _spec(id, s) {
    const b = BASE[s.btn] || BASE.lp, m = Object.assign({ id, when: s.motion || s.charge ? null : 'stand', guard: 'mid', dmg: b[0], stun: b[1], block: b[2], push: b[3], chip: s.motion || s.charge ? .25 : 0, r: 5 }, s);
    const shape = typeof m.move === 'string' ? E.MOVES[m.move] || E.MOVES.jab : m.move || {};
    const t = m.f ? { wind: sec(m.f[0]), active: sec(m.f[1]), recover: sec(m.f[2]) } : {};
    m.atk = new E.Attack(Object.assign({ name: typeof m.move === 'string' ? m.move : id }, shape, t, { hitAt: 0 }));
    m.frames = [frames(m.atk.spec.wind), frames(m.atk.spec.active), frames(m.atk.spec.recover)];
    return m;
  }
  /** back to the start of a round: at x, facing side (1 right), full life (the meter stays) */
  reset(x, side = this.facing) {
    const b = this.body; Object.assign(b, { x, z: 0, vx: 0, vz: 0, stun: 0, onGround: true });
    /** life: what it has left (o.life at the start); meter: 0 to 100 a bar (bars: o.bars, 1), kept between rounds; combo:
     *  the hits it has taken in a row; ko: knocked out; win: in its win pose */
    this.life = this.o.life; this.meter = this.meter || 0; this.combo = 0; this.ko = false; this.win = false;
    /** act: the move playing ({ m, hit: it connected, blocked }), or null; stun: seconds of hit- or block-stun left; kind:
     *  'hit' | 'block' (which stun); down: seconds lying down; rise: seconds getting up; inv: seconds invulnerable; juggle:
     *  hits taken in the air; thrown: a throw holding it ({ by, t, dur, dir, dmg }), or null; air: flying from a hit */
    this.act = null; this.stun = 0; this.kind = null; this.down = 0; this.rise = 0; this.inv = 0; this.juggle = 0; this.thrown = null; this.air = false;
    /** facing: 1 right, -1 left; crouch: crouching; blocking: guarding (holding back as an attack comes, or in block-stun);
     *  last: the frame data of its last move to connect ({ id, startup, active, recovery, adv, on: 'hit' | 'block' }) */
    this.facing = side; this.crouch = false; this.blocking = false; this.last = null; this.shots.clear();
    this._want = null; this._chB = this._chD = this._gB = this._gD = 0; this._airUsed = false; this._lag = 1; this._t = 0;
  }
  /** x and z: the body's feet */
  get x() { return this.body.x; }
  /** its feet's height */
  get z() { return this.body.z; }
  /** true while it can act: on the ground, not stunned, down, thrown or out */
  get free() { return !this.ko && !this.win && !this.act && this.stun <= 0 && this.down <= 0 && this.rise <= 0 && !this.thrown && this.body.onGround && !this.air; }
  // read the control: an E.Input or a CPU's intent -> { x (+ toward the foe), y (+ down), raw x, buttons pressed, do }
  _read(ctl) {
    if (!ctl) return { x: 0, y: 0, sx: 0, press: [], do: null };
    if (typeof ctl.move === 'function') {
      const mv = ctl.move(), press = BTN.filter(k => ctl.map[k] && ctl.buffered(k, .1));
      return { x: mv[0] * this.facing, y: mv[1], sx: mv[0], press, do: null, input: ctl };
    }
    return { x: (ctl.x || 0) * this.facing, y: ctl.y || 0, sx: ctl.x || 0, press: ctl.press ? [ctl.press] : [], do: ctl.do || null };
  }
  // the special this step's input calls for (motion or charge, a super first while the meter has it), or null
  _special(c) {
    let best = null;
    for (const id in this.moves) {
      const m = this.moves[id]; if (!m.motion && !m.charge) continue;
      if (m.meter && this.meter < m.meter) continue;
      if (m.shot && this.shots.list.length) continue;
      let ok = false;
      if (c.do) ok = c.do === id;
      else if (m.motion && c.input) ok = c.input.motion(m.motion, m.btn, { facing: this.facing, window: m.window || (m.motion.length > 4 ? .8 : .45) });
      else if (m.charge && c.press.includes(m.btn)) ok = m.charge === '46' ? this._chB >= (m.time || .7) && c.x > .5 : this._chD >= (m.time || .7) && c.y < -.5;
      if (ok && (!best || (m.meter || 0) > (best.meter || 0) || (m.motion || '').length > (best.motion || '').length)) best = m;
    }
    return best;
  }
  // the normal for a button in this state: air, crouching, close, standing
  _normal(btn, close) {
    const air = !this.body.onGround, list = Object.values(this.moves).filter(m => m.btn === btn && !m.motion && !m.charge);
    if (air) return list.find(m => m.when === 'air') || null;
    if (this.crouch) return list.find(m => m.when === 'crouch') || null;
    return (close && list.find(m => m.when === 'close')) || list.find(m => m.when === 'stand') || null;
  }
  // start move m: its Attack from the top, its invulnerability, its travel at the active frames
  _start(m) {
    if (this.act) this.act.m.atk.cancel();
    m.atk.start(); this.act = { m, hit: false, blocked: false, fired: false, moved: false };
    if (m.inv) this.inv = Math.max(this.inv, sec(m.inv));
    if (m.meter) { this.meter -= m.meter; this.game.flash('#ffffff', .1, .6); this.game.freeze(.2); this.game.audio.sfx('charge'); }   // a super: its cost, a flash, the world holds its breath
    if (!this.body.onGround) this._airUsed = true;
    this.game.audio.sfx(m.motion || m.charge ? 'whoosh' : 'select', { pitch: m.btn === 'hp' || m.btn === 'hk' ? .8 : 1.1 });
  }
  /** move one step (once a step, 120 times a second): ctl is its E.Input (this.input by default) or a CPU's intent */
  update(dt, ctl = this.input) {
    const b = this.body, foe = this.foe;
    if (foe && this.free && foe.x !== this.x) this.facing = foe.x > this.x ? 1 : -1;   // it faces its foe (sides switch on a cross-up)
    const c = this._read(ctl); this._t += dt; this.inv -= dt; this._c = c;
    // charges: back or down held, kept a quarter second after letting go
    if (c.x < -.5) { this._chB += dt; this._gB = .25; } else if ((this._gB -= dt) <= 0) this._chB = 0;
    if (c.y > .5) { this._chD += dt; this._gD = .25; } else if ((this._gD -= dt) <= 0) this._chD = 0;
    if (!this.ko && !this.thrown) { const s = this._special(c); if (s) this._want = { m: s, t: .12 }; }   // a motion stays wanted for a moment
    if (this._want && (this._want.t -= dt) <= 0) this._want = null;
    let ix = 0;
    if (this.thrown) this._thrownStep(dt);
    else if (this.ko || this.win) { if (b.onGround && this.ko) this.down = 1; }
    else if (this.down > 0) { if ((this.down -= dt) <= 0) { this.rise = .45; this.inv = Math.max(this.inv, .6); } }
    else if (this.rise > 0) { this.rise -= dt; }
    else if (this.stun > 0) { if ((this.stun -= dt) <= 0) { this.kind = null; if (b.onGround) this.combo = 0; } }
    else if (this.air) { if (b.onGround) { this.air = false; this.down = .55; this.combo = 0; this.juggle = 0; b.vx = 0; this.game.shake(2); this.game.audio.sfx('land'); } }   // flying from a hit, then down
    else {
      const close = foe && Math.abs(foe.x - this.x) < this.o.throwRange * 1.6;
      if (this.act) {   // a move playing: a special may cancel it once it connects (until early in its recovery)
        const a = this.act, st = a.m.atk; if (this._want && a.m.cancel && (a.hit || a.blocked) && (st.phase !== 'recover' || st.u < .4) && !a.m.motion) { this._start(this._want.m); this._want = null; }
      } else if (b.onGround && this.free) {
        this.crouch = c.y > .5;
        const thr = this.o.throwBtn;
        if (this._want) { this._start(this._want.m); if (c.input && this._want.m.btn) c.input.consume(this._want.m.btn); this._want = null; }
        else if (c.press.includes(thr) && Math.abs(c.x) > .5 && foe && foe._throwable() && Math.abs(foe.x - this.x) < this.o.throwRange) this._throw(c.x > 0 ? 1 : -1);
        else { for (const k of c.press) { const m = this._normal(k, close); if (m) { this._start(m); if (c.input) c.input.consume(k); break; } } }
        if (!this.act && !this.crouch && c.y < -.5) {   // a jump: straight, forward or back
          b.vz = this.o.jump; b.vx = Math.sign(Math.round(c.sx)) * this.o.jumpX; b.onGround = false; this._airUsed = false; this.game.audio.sfx('jump');
        } else if (!this.act && !this.crouch) {   // walking, or holding back to guard as an attack comes
          const back = c.x < -.5, threat = foe && (foe.act && foe.act.m.atk.phase !== 'recover' || foe.shots.list.length) && Math.abs(foe.x - this.x) < 110;
          this.blocking = back && threat;
          if (!this.blocking && Math.abs(c.x) > .5) { b.run = back ? this.o.back : this.o.walk; ix = Math.sign(c.sx); }
        }
        if (this.crouch) this.blocking = c.x < -.5;
      } else if (!b.onGround && !this.act && !this._airUsed) {   // a jump's one attack
        for (const k of c.press) { const m = this._normal(k, false); if (m) { this._start(m); if (c.input) c.input.consume(k); break; } }
      }
    }
    if (!this.free) this.blocking = this.stun > 0 && this.kind === 'block';
    // the move: its phases, its shot and travel at the active frames
    if (this.act) {
      const a = this.act, m = a.m, began = m.atk.update(dt);
      if (began === 'active') {
        if (m.shot && !a.fired) this._fire(m);
        if ((m.vx || m.vz) && !a.moved) { if (m.vx) { b.vx = this.facing * m.vx; if (!m.vz) b.stun = m.atk.spec.active + m.atk.spec.recover * .5; } if (m.vz) { b.vz = m.vz; b.onGround = false; } a.moved = true; }
        if (m.teleport && foe) { b.x = foe.x + this.facing * m.teleport; this.facing = -this.facing; this.game.particles.sparks(b.x, 0, 40, 10, null, { color: '#c8a0ff' }); }
        if (m.throw && foe && foe._throwable() && Math.abs(foe.x - this.x) < (m.range || this.o.throwRange)) this._throw(1, m);
      }
      if (!m.atk.busy) { this.act = null; if (b.onGround) this._airUsed = false; }
    }
    if (b.onGround && !this.air && this.act && !this.act.m.vx && !this.act.moved) b.vx = approach(b.vx, 0, 1600 * dt);
    if (!this.thrown) b.update(dt, this._level, { x: ix });
    if (b.landed && this.act && (this.act.m.when === 'air' || this.act.m.vz)) { this.act.m.atk.cancel(); this.act = null; }   // a jump's attack ends on landing
    if (b.landed) this._airUsed = false;
    this.shots.update(dt);
    this._lag = Math.max(this.life / this.o.life, this._lag - dt * .4);
    this._rig(dt);
  }
  _throwable() { return !this.ko && this.body.onGround && !this.air && this.stun <= 0 && this.down <= 0 && this.rise <= 0 && this.inv <= 0 && !this.thrown && !(this.act && this.act.m.atk.phase === 'active'); }
  // grab the foe: dir 1 throws it forward, -1 behind; m: a command grab's spec
  _throw(dir, m) {
    const foe = this.foe; if (!m) this._start(this._throwM);
    foe.thrown = { by: this, t: 0, dur: .45, dir: dir * this.facing, dmg: m ? m.dmg : this.o.throwDmg, x0: foe.x }; foe.act = null; foe.combo = 0;
    this.game.audio.sfx('swing');
  }
  _thrownStep(dt) {
    const T = this.thrown, b = this.body, by = T.by, u = clamp((T.t += dt) / T.dur, 0, 1), x1 = by.x + T.dir * 28;
    b.x = lerp(T.x0, x1, u); b.z = Math.sin(u * PI) * 50; b.vx = b.vz = 0;
    if (u >= 1) {
      this.thrown = null; b.z = 0; this.life -= T.dmg; this.down = .7; this.inv = .3; this.facing = by.x > b.x ? 1 : -1;
      this.game.hitFx(b.x, 0, 8, { power: 2, color: '#ffe070', sound: 'kick' }); this.game.shake(4);
      by.meter = Math.min(100 * (by.o.bars || 1), by.meter + 15);
      if (this.life <= 0) { this.life = 0; this.ko = true; }
    }
  }
  _fire(m) {
    const s = m.shot, h = this.rig.hand('R');
    this.shots.fire({ x: h[0] + this.facing * 6, y: 0, z: h[2], vx: this.facing * (s.speed || 150), r: s.r || 7, life: s.life || 3, color: s.color || '#60c8ff', core: s.core || '#ffffff', team: this.name, data: m });
    this.act.fired = true; this.game.audio.sfx('laser');
  }
  // the rig from the state: guard, crouch, block, hurt, flying, down, getting up, the move, the win pose
  _rig(dt) {
    const b = this.body, st = this.act && this.act.m.atk.state, fly = (this.air || this.ko) && !b.onGround;
    this.rig.update(dt, Object.assign(b.rigState(), {
      facing: this.facing > 0 ? 0 : PI, vx: this.stun > 0 || this.act ? 0 : b.vx, air: !b.onGround && !this.air && !this.thrown,
      stance: this.free && !this.blocking ? 'guard' : null, hurt: (this.stun > 0 && this.kind === 'hit') || !!this.thrown,
      down: fly ? clamp(.6 - b.vz / 500, 0, 1) : undefined, attack: st,
      pose: this.win ? 'cheer' : this.down > 0 || (this.ko && b.onGround) ? 'down' : this.rise > .2 ? 'kneel' : this.rise > 0 || this.crouch ? 'crouch' : this.blocking ? 'block' : null,
      expr: this.win ? 'smile' : this.stun > 0 || this.ko ? 'wince' : st ? 'shout' : null }));
    this._boxes();
  }
  // its boxes this step, from the rig's joints: hurt (head, body, legs), hit (the striking fist or foot), push
  _boxes() {
    const r = this.rig, J = r.J, sz = r.o.size, P = k => { const w = r.worldOffset(J[k]); return [r.x + w[0], r.z + w[2]]; };
    const box = (pts, pad) => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [x, z] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); } return { x: x0 - pad, z: z0 - pad, w: x1 - x0 + pad * 2, h: z1 - z0 + pad * 2 }; };
    const hd = P('head'), hurt = [box([hd], 3.2 * sz), box([P('shC'), P('hipC'), P('shL'), P('shR')], 2.4 * sz), box([P('hipC'), P('kneeL'), P('kneeR'), P('footL'), P('footR')], 1.6 * sz)];
    let hit = null; const a = this.act;
    if (a && !a.hit && !a.blocked && a.m.atk.active && !a.m.shot && !a.m.throw && !a.m.teleport) {
      const s = a.m.atk.spec, p = s.kick ? P('footR') : P(s.hand === 'L' ? 'handL' : 'handR'), R = a.m.r * sz / 2;
      hit = { x: p[0] - R, z: p[1] - R, w: R * 2, h: R * 2 };
    }
    /** boxes: this step's boxes ({ hurt: [head, body, legs], hit: the striking fist or foot's, or null, push }: each
     *  { x, z, w, h }, x its left, z its bottom) */
    const b = this.body; this.boxes = { hurt, hit, push: { x: b.x - b.w / 2, z: b.z, w: b.w, h: b.h } };
  }
  // does it block move m now: holding back, on the ground, and low moves crouching, overheads standing
  _blocks(m) {
    if (m.guard === 'throw' || !this.body.onGround || this.air || this.stun > 0 && this.kind === 'hit' || this.act || this.down > 0 || this.ko) return false;
    if (!(this._c && this._c.x < -.5)) return false;
    return m.guard === 'low' ? this.crouch : m.guard === 'overhead' ? !this.crouch : true;
  }
  // this fighter's move m lands on the foe at (x, z): blocked or a hit (a shot passes its own spec as m)
  _lands(foe, m, x, z) {
    const g = this.game, dir = foe.x > this.x ? 1 : foe.x < this.x ? -1 : this.facing, a = this.act, bars = 100 * (this.o.bars || 1);
    if (a && a.m === m) a.hit = true;
    const rec = a && a.m === m ? Math.max(0, frames(m.atk.spec.recover) + frames(m.atk.spec.active * (1 - m.atk.u))) : 0;
    if (foe._blocks(m)) {
      if (a && a.m === m) { a.blocked = true; a.hit = false; }
      foe.stun = sec(m.block); foe.kind = 'block'; foe.life = Math.max(1, foe.life - Math.round(m.dmg * m.chip)); foe.body.vx = dir * m.push * .8; foe.body.stun = foe.stun;
      this.meter = Math.min(bars, this.meter + m.dmg * .06); foe.meter = Math.min(100 * (foe.o.bars || 1), foe.meter + m.dmg * .04);
      g.particles.impact(x, 0, z, 6, '#a0d8ff'); g.particles.sparks(x, 0, z, 5, null, { color: '#a0d8ff' }); g.audio.sfx('bump'); g.freeze(.04);
      this.last = { id: m.id, startup: m.frames[0], active: m.frames[1], recovery: m.frames[2], adv: m.block - rec, on: 'block' };
      return;
    }
    const scale = Math.max(.5, 1 - foe.combo * .1), dmg = Math.round(m.dmg * scale);
    foe.combo++; foe.life -= dmg; foe.act && foe.act.m.atk.cancel(); foe.act = null; foe.crouch = false;
    this.meter = Math.min(bars, this.meter + m.dmg * .12); foe.meter = Math.min(100 * (foe.o.bars || 1), foe.meter + m.dmg * .06);
    const lift = foe.life <= 0 ? Math.max(m.launch || 0, 260) : m.launch || ((m.down || !foe.body.onGround || foe.air) ? 200 : 0);
    if (lift) { foe.air = true; foe.juggle++; foe.body.knock(dir, foe.life <= 0 ? 150 : 70, lift, 1); foe.stun = 0; foe.kind = 'hit'; }
    else { foe.stun = sec(m.stun); foe.kind = 'hit'; foe.body.vx = dir * m.push; foe.body.stun = foe.stun; }
    if (foe.life <= 0) { foe.life = 0; foe.ko = true; }
    const heavy = m.dmg >= 70; g.hitFx(x, 0, z, { power: heavy ? 1.8 : 1.1, angle: dir > 0 ? 0 : PI, color: '#ffe070', sound: heavy ? 'kick' : 'punch' });
    this.last = { id: m.id, startup: m.frames[0], active: m.frames[1], recovery: m.frames[2], adv: lift ? null : m.stun - rec, on: 'hit' };
  }
  /** draw it (and its shots) in the scene: r.actor with its rig */
  draw(r) {
    const b = this.body;
    r.actor(b.x, 0, b.z, (g, ox, oy) => this.rig.draw(g, ox, oy, r.view));
    for (const s of this.shots.list) r.queue(s.x, 0, s.z, g => {   // an energy ball: a glow, a bright core, a flickering trail
      const [x, y] = r.w(s.x, 0, s.z), R = s.r * r.view.scale, f = Math.floor(s.t * 30) % 2;
      px.glow(g, 1); for (let k = 3; k > 0; k--) px.disc(g, x - Math.sign(s.vx) * k * R * .7, y, R * (1 - k * .2), E.shade(s.color, -.2 * k));
      px.disc(g, x, y, R + f, s.color); px.disc(g, x, y, R * .55, s.core);
    }, { bias: .5, emissive: true });
  }
  /** the boxes drawn (training): hurt green, hit red, push blue */
  drawBoxes(r) {
    const B = this.boxes; if (!B) return;
    r.overlay(g => {
      const out = (b, c) => { const [x0, y0] = r.w(b.x, 0, b.z + b.h), [x1, y1] = r.w(b.x + b.w, 0, b.z); const x = Math.round(x0), y = Math.round(y0), w = Math.round(x1 - x0), h = Math.round(y1 - y0); px.rect(g, x, y, w, 1, c); px.rect(g, x, y + h - 1, w, 1, c); px.rect(g, x, y, 1, h, c); px.rect(g, x + w - 1, y, 1, h, c); };
      out(B.push, '#4a8aff'); for (const h of B.hurt) out(h, this.inv > 0 ? '#ffffff' : '#4ad860'); if (B.hit) out(B.hit, '#ff4a4a');
    });
  }
  /** settle one step between two fighters (E.Match calls it after both update): hits (both may land: a trade), shots
   *  against each other and against the fighters, push boxes apart */
  static exchange(a, b) {
    const hits = (p, q) => { const h = p.boxes && p.boxes.hit; if (!h || q.inv > 0 || q.thrown || q.ko || q.down > 0 || (q.air && q.juggle >= 3)) return null; return q.boxes.hurt.find(u => overlap(h, u)) ? h : null; };
    const ha = hits(a, b), hb = hits(b, a), ma = ha && a.act.m, mb = hb && b.act.m;   // (a trade: both land)
    if (ha) a._lands(b, ma, ha.x + ha.w / 2, ha.z + ha.h / 2);
    if (hb) b._lands(a, mb, hb.x + hb.w / 2, hb.z + hb.h / 2);
    for (const s of a.shots.list) for (const t of b.shots.list) if (!s.dead && !t.dead && Math.abs(s.x - t.x) < s.r + t.r && Math.abs(s.z - t.z) < s.r + t.r) { s.dead = t.dead = true; a.game.particles.sparks((s.x + t.x) / 2, 0, s.z, 12, null, { color: '#ffffff' }); a.game.audio.sfx('bump'); }
    for (const [p, q] of [[a, b], [b, a]]) for (const s of p.shots.list) {
      if (s.dead || q.inv > 0 || q.thrown || q.ko || q.down > 0) continue;
      const sb = { x: s.x - s.r, z: s.z - s.r, w: s.r * 2, h: s.r * 2 };
      if (q.boxes.hurt.some(u => overlap(sb, u))) { s.dead = true; const m = Object.assign({ id: s.data.id, dmg: 60, guard: 'mid', stun: 18, block: 14, push: 90, chip: .25, frames: s.data.frames, atk: s.data.atk }, s.data.shot); p._lands(q, m, s.x, s.z); }
    }
    for (const p of [a, b]) E.prune(p.shots.list, s => s.dead);
    // push boxes: never inside each other (a wall keeps one where it is)
    const A = a.body, B = b.body, need = (A.w + B.w) / 2, dx = B.x - A.x;
    if (Math.abs(dx) < need && A.z < B.z + B.h && B.z < A.z + A.h && !a.thrown && !b.thrown) {
      const d = (need - Math.abs(dx)) * (dx >= 0 ? 1 : -1) / 2, st = a._level;
      A.x -= d; B.x += d;
      if (st) for (const [P, Q, s] of [[A, B, 1], [B, A, -1]]) { if (P.x - P.w / 2 < st.x0) { const k = st.x0 + P.w / 2 - P.x; P.x += k; Q.x += k; } if (P.x + P.w / 2 > st.x1) { const k = P.x + P.w / 2 - st.x1; P.x -= k; Q.x -= k; } }
    }
  }
}
E.Fighter = Fighter;

class FightAI {
  /** new E.FightAI({ level: 1..8 (4), seed }): a CPU for a fighter. level: how well it fights; react: seconds before it
   *  sees what its foe does; rng: its own randomness */
  constructor(o = {}) {
    /** level: how well it fights (1 to 8); react: seconds before it sees what its foe does; rng: its own randomness (the
     *  seed's: the same match each time) */
    this.level = clamp(o.level || 4, 1, 8); this.react = lerp(.42, .12, (this.level - 1) / 7); this.rng = E.rng(o.seed || 1);
    this._seen = []; this._plan = null; this._t = 0; this._think = 0;
  }
  /** what it does this step: an intent for fighter f.update(dt, intent) ({ x, y: -1..1 on screen, press, do }) */
  intent(f, foe, dt) {
    const R = this.rng, L = this.level / 8, out = { x: 0, y: 0, press: null, do: null }, dist = Math.abs(foe.x - f.x), toward = Math.sign(foe.x - f.x) || f.facing;
    this._t += dt; this._seen.push({ t: this._t, atk: foe.act && foe.act.m.atk.phase !== 'recover' ? foe.act.m : null, air: !foe.body.onGround && !foe.air, vx: foe.body.vx, shot: foe.shots.list.length > 0, x: foe.x });
    while (this._seen.length > 2 && this._seen[1].t <= this._t - this.react) this._seen.shift();
    const seen = this._seen[0], moves = Object.values(f.moves);
    // a hit that landed: cancel into a special
    if (f.act && f.act.hit && f.act.m.cancel && R() < L) { const sp = moves.filter(m => m.motion && !m.meter && !m.shot && !m.throw && !m.teleport); if (sp.length) { out.do = sp[Math.floor(R() * sp.length)].id; return out; } }
    if (!f.free) { if (!f.body.onGround && !f.act && !f.air && dist < 60 && R() < .1) out.press = 'hk'; else if (this._plan && this._plan.guard) out.x = -toward; return out; }
    // its foe jumps at it: an anti-air
    const aa = moves.find(m => m.aa);
    if (seen.air && dist < 90 && aa && R() < L * .9) { out.do = aa.id; return out; }
    // an attack or a shot comes: guard (low against a low move)
    if ((seen.atk && dist < 100 || seen.shot) && R() < .35 + L * .6) { out.x = -toward; out.y = seen.atk && seen.atk.guard === 'low' ? 1 : 0; this._plan = { guard: true, t: .25 }; return out; }
    if (this._plan && (this._plan.t -= dt) > 0) { if (this._plan.guard) { out.x = -toward; return out; } Object.assign(out, this._plan.out); return out; }
    this._plan = null;
    if ((this._think -= dt) > 0) { out.x = this._walk || 0; return out; }
    this._think = lerp(.35, .12, L) + R() * .2;
    const shot = moves.find(m => m.shot), normals = moves.filter(m => !m.motion && !m.charge && m.when !== 'air');
    const reach = m => (m.atk.spec.reach || m.atk.spec.r1 || 7) * f.rig.o.size + 18;
    const inReach = normals.filter(m => dist < reach(m));
    const r = R();
    if (dist > 150 && shot && !f.shots.list.length && r < .5) { out.do = shot.id; return out; }
    if (dist < f.o.throwRange && r < .25 * L + .05 && foe._throwable()) { out.x = toward; out.press = f.o.throwBtn; return out; }
    if (inReach.length && r < .55 + L * .3) {
      const m = inReach[Math.floor(R() * inReach.length)]; out.press = m.btn; if (m.when === 'crouch') out.y = 1;
      this._plan = { t: .05, out: { y: out.y } }; return out;
    }
    if (r < .12 + L * .05 && dist < 160 && dist > 50) { out.y = -1; out.x = toward; this._walk = 0; return out; }   // a jump in
    this._walk = dist > 70 ? toward : dist < 40 ? -toward : (R() < .5 ? toward : 0); out.x = this._walk; return out;
  }
}
E.FightAI = FightAI;

const CALL = ['#fff6d0', '#ffd060', '#e8782a'];
class Match {
  /** new E.Match(game, { fighters: [a, b], ai: [null, null] (E.FightAI each, or null for its input), inputs: [game.
   *  input, null], rounds: 2 (wins needed), time: 99, x0: 0, x1: 520, span: 250 (how far apart they may be), camera:
   *  true (the game's camera follows them), training: false | { dummy }, onEnd: winner => {} }) */
  constructor(game, o = {}) {
    /** game: the game it runs in; o: its options, with the defaults filled in */
    this.game = game; this.o = Object.assign({ rounds: 2, time: 99, x0: 0, x1: 520, span: 250, camera: true, training: false }, o);
    /** f: the two fighters; ai: each one's CPU (E.FightAI), or null; inputs: each one's E.Input when no CPU plays it */
    this.f = o.fighters; this.ai = o.ai || [null, null]; this.inputs = o.inputs || [game.input, game.players ? game.players[1] || null : null];
    /** stage: the floor and walls they stand in (E.FightStage) */
    this.stage = o.stage || new FightStage(this.o.x0, this.o.x1);
    this.f[0].foe = this.f[1]; this.f[1].foe = this.f[0]; for (const f of this.f) f._level = this.stage;
    /** wins: the rounds each has won; round: the round's number; winner: 0 or 1 once known (a round's, then the match's), or
     *  null */
    this.wins = [0, 0]; this.round = 0; this.winner = null; this.startRound();
  }
  /** the stage's middle */
  get x() { return (this.f[0].x + this.f[1].x) / 2; }
  /** the next round: both back at the middle, full life */
  startRound() {
    const mid = (this.o.x0 + this.o.x1) / 2; this.round++;
    this.f[0].reset(mid - 60, 1); this.f[1].reset(mid + 60, -1);
    /** phase: 'intro' | 'fight' | 'ko' | 'win' | 'over'; clock: the round's seconds left; call: the words on the screen
     *  (ROUND 1, FIGHT!, K.O., TIME, PERFECT), or null */
    this.phase = this.o.training ? 'fight' : 'intro'; this._t = 0; this.clock = this.o.time; this.winner = null; this.call = this.o.training ? null : 'ROUND ' + this.round; this._slow = 0;
  }
  _control(i) {
    if (this.phase !== 'fight') return null;
    const ai = this.ai[i]; if (ai) return ai.intent(this.f[i], this.f[1 - i], this._dt);
    if (this.o.training && i === 1) {   // the dummy
      const d = this.o.training.dummy || 'stand', f = this.f[1], foe = this.f[0], back = -Math.sign(foe.x - f.x);
      if (d === 'crouch') return { y: 1 }; if (d === 'jump') return { y: f.body.onGround ? -1 : 0 };
      if (d === 'guard') return { x: back, y: foe.act && foe.act.m.guard === 'low' ? 1 : 0 };
      return {};
    }
    return this.inputs[i];
  }
  /** one step: the fighters, their exchange, the clock, the calls and the rounds */
  update(dt) {
    const [a, b] = this.f; this._t += dt; this._dt = dt;
    a.update(dt, this._control(0)); b.update(dt, this._control(1)); Fighter.exchange(a, b);
    const span = this.o.span, d = b.x - a.x;   // never farther apart than the screen
    if (Math.abs(d) > span) { const fix = (Math.abs(d) - span) * Math.sign(d) / 2; a.body.x += fix; b.body.x -= fix; }
    if (this.o.camera) this.game.focus(this.x, 0, 52);
    if (this.o.training) {   // no KO; life back once a combo ends
      for (const f of this.f) if (f.life <= 0) { f.life = 1; f.ko = false; }
      for (const f of this.f) if (f.combo === 0 && f.stun <= 0 && f.down <= 0 && !f.air) { f.life = Math.min(f.o.life, f.life + f.o.life * dt); if (f.ko) f.ko = false; }
      for (const f of this.f) f.meter = 100 * (f.o.bars || 1);
      return;
    }
    if (this.phase === 'intro') { if (this._t > 1.1) this.call = 'FIGHT!'; if (this._t > 1.8) { this.phase = 'fight'; this.call = null; this._t = 0; } }
    else if (this.phase === 'fight') {
      this.clock = Math.max(0, this.clock - dt);
      if (a.ko || b.ko || this.clock <= 0) {
        this.phase = 'ko'; this._t = 0; this.call = a.ko || b.ko ? 'K.O.' : 'TIME';
        this.winner = a.ko && b.ko ? null : a.ko ? 1 : b.ko ? 0 : a.life === b.life ? null : a.life > b.life ? 0 : 1;
        if (a.ko || b.ko) { this.game.timeScale = .35; this._slow = .9; this.game.flash('#ffffff', .2); this.game.audio.sfx('boom'); }
      }
    } else if (this.phase === 'ko') {
      if (this._slow > 0 && (this._slow -= dt / Math.max(.01, this.game.timeScale)) <= 0) this.game.timeScale = 1;
      if (this._t > 2.2 && [a, b].every(f => f.body.onGround && !f.thrown)) {
        this.phase = 'win'; this._t = 0;
        if (this.winner === null) { this.wins[0]++; this.wins[1]++; this.call = 'DRAW'; }
        else { const w = this.f[this.winner]; this.wins[this.winner]++; w.win = true; this.call = w.life >= w.o.life ? 'PERFECT' : w.name + ' WINS'; this.game.audio.sfx('powerup'); }
      }
    } else if (this.phase === 'win' && this._t > 2.6) {
      const done = this.wins.map(n => n >= this.o.rounds);
      if (done[0] !== done[1]) { this.phase = 'over'; this.winner = done[0] ? 0 : 1; this.call = this.f[this.winner].name + ' WINS'; if (this.o.onEnd) this.o.onEnd(this.winner); }
      else this.startRound();
    }
  }
  /** draw the fighters, their shots and the HUD; in training the boxes, the frame data and player 1's inputs */
  draw(r) {
    const [a, b] = this.f; a.draw(r); b.draw(r);
    if (this.o.training) { a.drawBoxes(r); b.drawBoxes(r); }
    r.overlay(g => this._hud(g, r.W, r.H));
  }
  _hud(g, W, H) {   // (below a phone's corner button when it sits on top)
    const font = E.font, bw = Math.floor(W / 2) - 34, ca = this.game.input.lastDevice === 'touch' && this.game.cornerArea ? this.game.cornerArea() : null, y = ca && ca.y0 < 40 ? Math.ceil(ca.y1) + 6 : 10;
    this.f.forEach((f, i) => {
      const x = i ? W - 12 - bw : 12, k = f.life / f.o.life, lag = f._lag, flip = i === 1;
      px.rect(g, x - 1, y - 1, bw + 2, 10, '#140b12'); px.rect(g, x, y, bw, 8, '#3a1a26');
      const fill = (u, c) => { const w = Math.round(bw * clamp(u, 0, 1)); if (w > 0) px.rect(g, flip ? x : x + bw - w, y, w, 8, c); };
      fill(lag, '#e0463c'); fill(k, k < .25 ? '#ff9a2a' : '#ffd23a'); px.rect(g, x, y, bw, 1, '#fff6c0');
      font.text(g, f.name, flip ? x + bw : x, y + 12, '#ffffff', { align: flip ? 'right' : 'left', shadow: '#000', outline: false });
      for (let w = 0; w < this.o.rounds; w++) { const sx = flip ? x + w * 9 : x + bw - 7 - w * 9; px.disc(g, sx + 3, y + 16, 3, w < this.wins[i] ? '#ffd23a' : '#3a2a4a'); }
      const mb = Math.round(bw * .6), mx = flip ? W - 12 - mb : 12, my = H - 12, mk = f.meter / 100, full = mk >= 1;
      E.ui.bar(g, mx, my, mb, 6, mk % 1 || (full ? 1 : 0), full && Math.floor(this.game.real * 6) % 2 ? '#a0f0ff' : '#3a8aff');
      if (f.combo > 1 && f.stun > 0) font.title(g, f.combo + ' HITS', flip ? 14 : W - 14, y + 44, { scale: 2, align: flip ? 'left' : 'right', colors: CALL });
    });
    if (!this.o.training) { const box = Math.round(W / 2); E.ui.box(g, box - 15, y - 6, 30, 22, { bg: ['#2a1a4a', '#120a28'] }); font.title(g, String(Math.ceil(this.clock)).padStart(2, '0'), box, y - 3, { scale: 2, align: 'center', colors: ['#ffffff', '#c8d8ff'] }); }
    if (this.call) font.title(g, this.call, W / 2, H / 2 - 30, { scale: 4, align: 'center', colors: CALL, depth: 3 });
    if (this.o.training) {   // frame data and player 1's last second of inputs
      const L = this.f[0].last; if (L) font.text(g, L.id.toUpperCase() + '  STARTUP ' + L.startup + '  ACTIVE ' + L.active + '  RECOVERY ' + L.recovery + (L.adv === null ? '  KNOCKDOWN' : '  ON ' + L.on.toUpperCase() + ' ' + (L.adv > 0 ? '+' : '') + L.adv), 12, y + 24, '#c8f0ff', { shadow: '#000', outline: false, font: 'tiny' });
      const I = this.inputs[0], hist = I && I.history ? I.history.slice(-12) : [], mir = { 1: 3, 3: 1, 4: 6, 6: 4, 7: 9, 9: 7 };   // (numpad digits, as the fighter faces)
      hist.forEach((h, k) => font.text(g, (this.f[0].facing < 0 ? mir[h.dir] || h.dir : h.dir) + ' ' + h.pressed.filter(p => BTN.includes(p)).join('+').toUpperCase(), 12, y + 36 + k * 8, '#ffffff', { shadow: '#000', outline: false, font: 'tiny' }));
    }
  }
}
E.Match = Match;

class FightSelect {
  /** new E.FightSelect(game, { roster: [{ id, name, rig, about }], inputs: [p1, p2 or null], cpu: [false, true],
   *  seed, onDone: ids => {} }): a character select. picks: each side's id once chosen; at: each side's cursor */
  constructor(game, o = {}) {
    /** game: the game it runs in; o: its options; roster: the fighters to pick from; inputs: each side's E.Input; cpu: which
     *  sides the CPU picks for */
    this.game = game; this.o = o; this.roster = o.roster || []; this.inputs = o.inputs || [game.input, null]; this.cpu = o.cpu || [false, true];
    /** at: each side's cursor; picks: each side's id once chosen; rects: where each portrait was drawn ([x, y, w, h] in
     *  screen pixels: a tap there picks it) */
    this.at = [0, Math.min(1, this.roster.length - 1)]; this.picks = [null, null]; this.rects = null; this._t = 0; this._cpuT = [0, 0]; this._rng = E.rng(o.seed || 7);
    /** rigs: each fighter's portrait rig */
    this.rigs = this.roster.map(e => { const r = new E.Humanoid(Object.assign({ size: 1, weapon: null }, e.rig, { size: 1 })); r.update(0, { x: 0, y: 0, z: 0, stance: 'guard' }); return r; });
  }
  /** move the cursors, take the picks; onDone(ids) once both have one */
  update(dt) {
    this._t += dt; const n = this.roster.length;
    for (let i = 0; i < 2; i++) {
      if (this.picks[i]) continue;
      if (this.cpu[i]) { if ((this._cpuT[i] += dt) > .8 && this.picks[0]) this.picks[i] = this.roster[this.at[i] = Math.floor(this._rng() * n)].id; continue; }
      const I = this.inputs[i]; if (!I) continue;
      const tap = i === 0 && this.rects && I.clicked ? I.clicked() : null, k = tap ? this.rects.findIndex(([x, y, w, h]) => tap[0] >= x && tap[0] < x + w && tap[1] >= y && tap[1] < y + h) : -1;
      if (k >= 0) { this.at[0] = k; this.picks[0] = this.roster[k].id; this.game.audio.sfx('confirm'); continue; }   // a tap on a portrait picks it
      if (I.repeat('left')) { this.at[i] = (this.at[i] + n - 1) % n; this.game.audio.sfx('select'); }
      if (I.repeat('right')) { this.at[i] = (this.at[i] + 1) % n; this.game.audio.sfx('select'); }
      if (BTN.some(k => I.map[k] && I.pressed(k)) || I.pressed('confirm') || I.pressed('start')) { this.picks[i] = this.roster[this.at[i]].id; this.game.audio.sfx('confirm'); I.consumeAll(); }
    }
    if (this.picks[0] && this.picks[1] && !this._done) { this._done = this._t + .7; }
    if (this._done && this._t >= this._done && this.o.onDone) { this.o.onDone(this.picks.slice()); this.o.onDone = null; }
  }
  /** draw the roster, the cursors and each side's fighter large */
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, n = this.roster.length, s = Math.min(46, Math.floor((W - 40) / n) - 6), x0 = Math.round(W / 2 - (n * (s + 6) - 6) / 2), y = H - s - 34;
      E.font.title(g, 'SELECT YOUR FIGHTER', W / 2, 10, { scale: 2, align: 'center', colors: CALL });
      for (let i = 0; i < 2; i++) {
        const e = this.roster[this.at[i]], big = Math.min(96, Math.round(H * .42)), bx = i ? W - 16 - big : 16;
        this.rigs[this.at[i]].drawPortrait(g, bx, 36, big, { zoom: 2.4, turn: i ? -.6 : .6, bg: i ? ['#ff8a6a', '#5a1a2a'] : ['#6ab0ff', '#1a2a5a'], border: E.PLAYER_COLORS[i] });
        E.font.text(g, e.name, bx + big / 2, 40 + big, '#ffffff', { align: 'center', shadow: '#000', outline: false });
        if (e.about) E.font.text(g, e.about, bx + big / 2, 50 + big, '#c8b8e8', { align: 'center', outline: false, font: 'tiny' });
        if (this.picks[i]) E.font.text(g, 'READY', bx + big / 2, 30, E.PLAYER_COLORS[i], { align: 'center', shadow: '#000', outline: false });
      }
      E.font.title(g, 'VS', W / 2, 70, { scale: 3, align: 'center', colors: ['#ffffff', '#ff8a6a', '#c0302a'] });
      this.rects = this.roster.map((e, k) => [x0 + k * (s + 6), y, s, s]);   // (where a tap picks)
      this.roster.forEach((e, k) => {
        const x = x0 + k * (s + 6); this.rigs[k].drawPortrait(g, x, y, s, { zoom: 2, turn: .5 });
        for (let i = 0; i < 2; i++) if (this.at[i] === k && (!this.cpu[i] || this.picks[0])) { const c = E.PLAYER_COLORS[i], o = i * 2; px.rect(g, x - 2 - o, y - 2 - o, s + 4 + o * 2, 2, c); px.rect(g, x - 2 - o, y + s + o, s + 4 + o * 2, 2, c); px.rect(g, x - 2 - o, y - 2 - o, 2, s + 4 + o * 2, c); px.rect(g, x + s + o, y - 2 - o, 2, s + 4 + o * 2, c); E.font.text(g, this.cpu[i] ? 'CPU' : 'P' + (i + 1), x + s / 2, y + s + 6, c, { align: 'center', outline: false, font: 'tiny' }); }
      });
    });
  }
}
E.FightSelect = FightSelect;
})(typeof My3D2dge !== 'undefined' ? My3D2dge : undefined);
