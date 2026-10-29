/*!
my-3D2dge module DRIVE v0.81.2: cars on the ground plane, a race round a track, the drivers who race it
https://github.com/michaelcrosato/my-3d2dge (MIT License)
Loads after: the full engine or the agent edition. Needs: no other module.

Super Mario Kart's, F-Zero's, Micro Machines' and GTA's cars: speed along the heading, a slide sideways that grip
takes away, the floor's tag under it slowing it, walls and other cars it bounces off; a race round a line of points.
- const car = new E.Car({ x, y, angle, top: 240 (units a second), accel: 200, brake: 380, turn: 2.4 (radians a second
  at speed), grip: 10, drift: 4.5 (the grip drifting), kart: true (a hop into a drift; held, it charges a boost),
  surfaces: { grass: { top: .5, grip: .9 }, sand, dirt, ice, boost: { boost: .8 } (seconds), ... }, ground: (x, y) =>
  tag (else map.floorAt) }): an E.Body. Each step car.update(dt, map, game.input (steer left/right; gas, brake, drift:
  actions; o.auto: gas by itself) or an intent { steer: -1..1, gas, brake (0..1), drift (held), top (a factor) }).
- car.speed (along it), car.slide (sideways), car.angle, car.drifting (-1, 0, 1), car.charge (a drift's: 1 blue, 2
  orange), car.boostT, car.surface, car.offroad, car.spinT; car.boost(seconds, power), car.spinOut(seconds);
  E.Car.collide(cars) bumps them apart.
- const race = new E.Race({ path: a closed E.Path (the racing line; the full engine's), laps: 3, checkpoints: 8, countdown: 3, width: 40
  (the track's half: the drivers' lanes), items: ['boost', 'shot', 'hazard'] }); race.grid(n) -> the start places
  [{ x, y, angle }]; race.add(car, { name, input (a player's) | ai: { skill: .95, rubber: .2 } }) -> a racer { car,
  name, lap, place, prog (distance raced), times, best, finished, time, wrong, item }.
- Each step race.update(dt, map): the countdown (race.go once it says GO), every car driven (players by their input,
  the rest by race.drive(racer): look ahead along the line, brake for bends, overtake, unstick, rubber band), bumps,
  laps through the checkpoints in order (a shortcut counts nothing), wrong way, places, the finish (race.results, then
  race.over); race.box(x, y) an item box; race.use(racer) fires a racer's item; race.shots, race.hazards to draw. The
  3D engine's vehicles (world.vehicle) race as cars do: pass race.update a null map; Rapier bumps them.
- race.hud(r, racer, { color, right }): the place, the lap, the time, the item, the countdown, WRONG WAY and FINISH (in its
  viewport; right: the x its right-hand text ends before).

```js drive
const E = My3D2dge, map = new E.TileMap({ w: 30, h: 30 }), car = new E.Car({ x: 40, y: 40, angle: 0 });
for (let i = 0; i < 240; i++) car.update(1 / 120, map, { gas: 1 });
if (!(car.speed > 150 && car.x > 150 && Math.abs(car.y - 40) < .01)) throw new Error('a car accelerates along its heading');
```
Rules: the angle is a heading (0 east, PI / 2 south) and a mode7 camera's; update cars at the fixed step; a player's
car takes game.input or its player's input; race.update moves every racer's car, so don't update them yourself.
*/
(function (E) {
'use strict';
if (!E) throw new Error('my-3D2dge module DRIVE: load engine/my-3d2dge.js (or the agent edition) first');

/* =============================================================================
 * DRIVE  cars, races, drivers
 * ========================================================================== */
const { clamp, angDiff } = E, TAU = Math.PI * 2;
const SURFACES = { grass: { top: .5, grip: .9 }, sand: { top: .4, grip: .6 }, dirt: { top: .7, grip: .8 }, ice: { grip: .15 }, boost: { boost: .8 } };
class Car extends E.Body {
  /** new E.Car({ x, y, angle, top, accel, brake, turn, grip, drift, kart, auto, surfaces, ground }): a car (the manual) */
  constructor(o = {}) {
    super({ x: o.x || 0, y: o.y || 0, z: o.z || 0, r: o.r || 7, h: o.h || 14, bounce: o.bounce === undefined ? .3 : o.bounce });
    /** o: its options */
    this.o = Object.assign({ top: 240, accel: 200, brake: 380, reverse: 70, turn: 2.4, grip: 10, drift: 4.5, drag: .5, hop: 110, kart: false, auto: false }, o);
    this.o.surfaces = Object.assign({}, SURFACES, o.surfaces);
    /** angle: its heading; speed: along it (units a second, - backing up); slide: sideways; drifting: -1 left, 1 right,
     *  0 not; charge: a kart's drift boost building (1 blue, 2 orange); boostT: a boost's seconds left; spinT: a
     *  spin-out's; surface: the floor tag under it; offroad: on a surface that slows it; bumped: it hit a wall or a car
     *  this step; airT: a hop's seconds in the air */
    this.angle = o.angle || 0; this.speed = 0; this.slide = 0; this.drifting = 0; this.charge = 0; this.boostT = 0; this.spinT = 0; this.surface = null; this.offroad = false; this.bumped = false; this.airT = 0;
    this._boostK = 0; this._hopDir = 0; this._stall = 0;
  }
  /** a boost: seconds of it, power (.4: top speed up by that share) */
  boost(sec = .8, power = .4) { this.boostT = Math.max(this.boostT, sec); this._boostK = Math.max(this.boostT > sec ? this._boostK : 0, power); return this; }
  /** spin out (a shot, a hazard): seconds without control, most of its speed lost */
  spinOut(sec = 1) { if (this.spinT > 0) return this; this.spinT = sec; this.vx *= .3; this.vy *= .3; this.drifting = 0; this.charge = 0; return this; }
  /** one step: steering, engine, grip, drift, the surface, then E.Body's walls and hop. c: an input or an intent */
  update(dt, map, c = {}) {
    const o = this.o, inp = typeof c.move === 'function';
    let steer = inp ? c.move()[0] : c.steer || 0, gas = inp ? (c.down('gas') || o.auto ? 1 : 0) : c.gas || 0, brake = inp ? (c.down('brake') ? 1 : 0) : c.brake || 0;
    const drift = inp ? c.down('drift') : !!c.drift, hop = inp ? c.pressed('drift') : drift && !this._held;
    this._held = drift;
    const tag = o.ground ? o.ground(this.x, this.y) : map && map.floorAt ? map.floorAt(this.x, this.y) : null, S = (tag && o.surfaces[tag]) || {};
    this.surface = tag; this.offroad = (S.top || 1) < 1;
    if (S.boost && this.onGround) this.boost(S.boost);
    if (this.spinT > 0) { this.spinT -= dt; this.angle += 11 * dt; steer = 0; gas = 0; brake = .5; }
    if (this.boostT > 0) { this.boostT -= dt; gas = 1; }
    const air = !this.onGround;
    // a kart hops on the drift button; landing still steering, it drifts that way while held, charging a boost
    if (o.kart) {
      /** vz, onGround: E.Body's (a hop leaves the ground) */
      if (hop && !air && this.spinT <= 0) { this.vz = o.hop; this.onGround = false; this._hopDir = Math.sign(steer); }
      if (!air && !this.drifting && drift && this._hopDir && this.speed > o.top * .4) this.drifting = this._hopDir;
      if (this.drifting) {
        if (!drift || this.speed < o.top * .2) { if (this.charge >= 1) this.boost(this.charge >= 2 ? 1 : .55, .35); this.drifting = 0; this.charge = 0; this._hopDir = 0; }
        else this.charge += dt * (steer * this.drifting > 0 ? 1.5 : .8);
      }
      if (!drift) this._hopDir = 0;
    } else this.drifting = drift && Math.abs(this.speed) > o.top * .3 ? Math.sign(steer) || this.drifting : 0;   // a car's handbrake
    // it turns with its speed (none standing, reversed backing up), harder into a drift, less in the air
    const k = clamp(Math.abs(this.speed) / (o.top * .25), 0, 1) * Math.sign(this.speed || 1), turn = this.drifting ? this.drifting * .6 + steer * .4 : steer;
    this.angle += turn * o.turn * k * dt * (air ? .5 : 1);
    // its speed along the new heading and across it, from the world's
    const fx = Math.cos(this.angle), fy = Math.sin(this.angle);
    let v = this.vx * fx + this.vy * fy, s = this.vy * fx - this.vx * fy;
    const top = o.top * (S.top || 1) * (c.top || 1) * (this.boostT > 0 ? 1 + this._boostK : 1);
    if (gas > 0 && v < top) v = Math.min(top, v + o.accel * gas * (this.boostT > 0 ? 2.5 : 1) * dt);
    else if (v > top) v = Math.max(top, v - o.accel * 1.6 * dt);   // over this ground's top: it slows to it
    if (brake > 0) v = v > 1 ? Math.max(0, v - o.brake * brake * dt) : Math.max(-o.reverse, v - o.accel * .6 * brake * dt);
    if (!gas && !brake) v *= Math.exp(-o.drag * dt);
    if (!air) s *= Math.exp(-(this.drifting ? o.drift : o.grip) * (S.grip || 1) * dt);   // grip takes the slide away
    /** vx, vy: its speed on the ground (E.Body's): along its heading and the slide */
    this.vx = fx * v - fy * s; this.vy = fy * v + fx * s;
    super.update(dt, map);
    if (this.hitWall) { const f = Math.cos(this.angle), g = Math.sin(this.angle); this.vx -= f * Math.max(0, this.vx * f + this.vy * g) * .4; this.vy -= g * Math.max(0, this.vx * f + this.vy * g) * .4; }
    this.speed = this.vx * fx + this.vy * fy; this.slide = this.vy * fx - this.vx * fy; this.bumped = this.hitWall; this.airT = air ? this.airT + dt : 0;
    return this;
  }
  /** bump every pair of cars that touch apart (equal weights, a little bounce) */
  static collide(cars) {
    for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) {
      const a = cars[i], b = cars[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), R = a.r + b.r;
      if (d >= R || d < 1e-6 || Math.abs(a.z - b.z) > 10) continue;
      const nx = dx / d, ny = dy / d, push = (R - d) / 2, vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
      if (vn < 0) { const J = -vn * .65; a.vx -= nx * J; a.vy -= ny * J; b.vx += nx * J; b.vy += ny * J; }
      a.bumped = b.bumped = true;
    }
  }
}
class Race {
  /** new E.Race({ path, laps, checkpoints, countdown, width, items }): a race round a closed path (the manual) */
  constructor(o = {}) {
    if (!o.path) throw new Error('E.Race needs { path }: a closed E.Path along the track (the racing line)');
    /** o: its options */
    this.o = Object.assign({ laps: 3, checkpoints: 8, countdown: 3, width: 40, items: ['boost', 'shot', 'hazard'] }, o);
    /** path: the racing line; racers: every racer, in the order added; t: seconds since GO (- before it); go: racing (the
     *  countdown over); over: every racer finished; results: the racers as they finished; boxes, shots, hazards: the
     *  items on the track */
    this.path = o.path; this.racers = []; this.t = -this.o.countdown; this.go = false; this.over = false; this.results = []; this.boxes = []; this.shots = []; this.hazards = [];
  }
  /** the start: n places behind the line, two by two, facing along it: [{ x, y, angle }] */
  grid(n) {
    const out = [], w = this.o.width * .45;
    for (let i = 0; i < n; i++) { const p = this.path.at(-14 - i * 22), a = p.angle, side = i % 2 ? 1 : -1; out.push({ x: p.x - Math.sin(a) * w * side, y: p.y + Math.cos(a) * w * side, angle: a }); }
    return out;
  }
  /** a racer: its car, o.name, o.input (a player's controls) or o.ai ({ skill, rubber, lane }); returns it */
  add(car, o = {}) {
    const d = this.path.nearest(car.x, car.y), L = this.path.length;
    const R = { car, name: o.name || 'CAR ' + (this.racers.length + 1), input: o.input || null, ai: o.input ? null : Object.assign({ skill: .95, rubber: .2, grip: 520, lane: ((this.racers.length * .37) % 1) * 2 - 1 }, o.ai), lap: 0, cp: Math.floor(d / L * this.o.checkpoints) % this.o.checkpoints, place: this.racers.length + 1, prog: d > L / 2 ? d - L : d, _d: d, times: [], best: null, lapT: 0, finished: false, time: 0, wrong: false, _wrongT: 0, item: null, _stuck: 0, _back: 0 };
    this.racers.push(R); return R;
  }
  /** an item box at (x, y): a racer that drives through it gets an item (when it holds none) */
  box(x, y) { this.boxes.push({ x, y, t: 0 }); return this; }
  /** a racer's way round: the intent race.update gives an AI racer's car (look ahead along the line, bends, overtakes,
   *  unsticking, the rubber band) */
  drive(R, dt) {
    const car = R.car, P = this.path, ai = R.ai, v = Math.max(40, car.speed), look = 30 + v * .4, L = P.length;
    // overtaking: a car just ahead in its lane moves it to the other side
    for (const Q of this.racers) if (Q !== R) { const dd = Q.prog - R.prog; if (dd > 0 && dd < 70 && Math.abs(this._lane(Q) - ai.lane) < .5) { ai.lane = ai.lane > 0 ? -.6 : .6; break; } }
    const p = P.at(R._d + look), off = ai.lane * this.o.width * .55, tx = p.x - Math.sin(p.angle) * off, ty = p.y + Math.cos(p.angle) * off;
    const diff = angDiff(car.angle, Math.atan2(ty - car.y, tx - car.x));
    // the sharpest bend ahead (its turn a unit along the line) and the speed it allows; faster than that, it brakes
    let k = 0; for (let a = 0; a < 4; a++) { const q0 = P.at(R._d + 20 + a * 35), q1 = P.at(R._d + 55 + a * 35); k = Math.max(k, Math.abs(angDiff(q0.angle, q1.angle)) / 35); }
    const vmax = Math.sqrt(ai.grip / Math.max(k, 1e-4)), leader = this.racers.reduce((a, b) => b.prog > a.prog ? b : a), gap = (leader.prog - R.prog) / L;
    const it = { steer: clamp(diff * 2.4, -1, 1), gas: car.speed < vmax ? 1 : 0, brake: car.speed > vmax + 15 ? clamp((car.speed - vmax) / 50, .3, 1) : 0, top: ai.skill * (1 + clamp(gap * 8, -.5, 1) * ai.rubber) };
    if (car.o.kart && vmax < car.o.top * .85 && car.speed > car.o.top * .55 && Math.abs(diff) > .15) { it.drift = true; it.steer = clamp(it.steer + Math.sign(diff) * .3, -1, 1); }
    // stuck against a wall: back away, turned
    if (car.speed < 12 && this.go) R._stuck += dt; else R._stuck = 0;
    if (R._stuck > 1.2) { R._back = .8; R._stuck = 0; }
    if (R._back > 0) { R._back -= dt; return { steer: -Math.sign(diff || 1), brake: 1 }; }
    if (R.item && (R.item === 'boost' ? k < .004 : R.item === 'shot' ? this.racers.some(Q => Q !== R && Q.prog - R.prog > 20 && Q.prog - R.prog < 160) : this.racers.some(Q => Q !== R && R.prog - Q.prog > 10 && R.prog - Q.prog < 60))) this.use(R);
    return it;
  }
  // where a racer is across the track: -1 left edge .. 1 right
  _lane(R) { const p = this.path.at(R._d); return ((R.car.x - p.x) * -Math.sin(p.angle) + (R.car.y - p.y) * Math.cos(p.angle)) / (this.o.width * .55); }
  /** fire a racer's item: boost (now), shot (ahead along its heading), hazard (behind it) */
  use(R) {
    const c = R.car, it = R.item; if (!it) return; R.item = null;
    if (it === 'boost') c.boost(1, .45);
    else if (it === 'shot') this.shots.push({ x: c.x + Math.cos(c.angle) * 12, y: c.y + Math.sin(c.angle) * 12, vx: Math.cos(c.angle) * (c.o.top * 1.6), vy: Math.sin(c.angle) * (c.o.top * 1.6), t: 0, by: R });
    else this.hazards.push({ x: c.x - Math.cos(c.angle) * 14, y: c.y - Math.sin(c.angle) * 14, t: 0 });
  }
  /** one step: the countdown, every car, bumps, items, progress, laps, wrong way, places, the finish */
  update(dt, map) {
    const L = this.path.length, n = this.o.checkpoints, cars = this.racers.map(R => R.car);
    this.t += dt; this.go = this.t >= 0;
    for (const R of this.racers) {
      const ctl = !this.go ? { gas: 0, brake: 1 } : R.finished ? { gas: .4, steer: R.ai ? this.drive(R, dt).steer : 0 } : R.ai ? this.drive(R, dt) : R.input;
      R.car.update(dt, map, ctl);
    }
    Car.collide(cars.filter(c => !c.isVehicle));   // (the 3D engine's vehicles bump in Rapier)
    for (const b of this.boxes) { b.t -= dt; if (b.t > 0) continue; for (const R of this.racers) if (!R.item && Math.hypot(R.car.x - b.x, R.car.y - b.y) < R.car.r + 8) { const I = this.o.items; R.item = I[Math.floor(Math.random() * I.length)]; b.t = 2; break; } }
    for (const s of this.shots) {
      s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt;
      if (map && map.collide) { const b = { x: s.x, y: s.y, r: 3 }; if (map.collide(b)) { s.t = 9; continue; } }
      for (const R of this.racers) if (R !== s.by && Math.hypot(R.car.x - s.x, R.car.y - s.y) < R.car.r + 4) { R.car.spinOut(1); s.t = 9; }
    }
    this.shots = this.shots.filter(s => s.t < 3);
    for (const h of this.hazards) for (const R of this.racers) if (h.t < 9 && Math.hypot(R.car.x - h.x, R.car.y - h.y) < R.car.r + 4 && R.car.onGround) { R.car.spinOut(.9); h.t = 9; }
    this.hazards = this.hazards.filter(h => h.t < 9);
    for (const R of this.racers) {
      // progress round the line (unwrapped), checkpoints in order, laps
      const d = this.path.nearest(R.car.x, R.car.y); let dd = d - R._d; if (dd > L / 2) dd -= L; if (dd < -L / 2) dd += L; R.prog += dd; R._d = d;
      if (R.finished) continue;
      if (this.go) { R.time += dt; R.lapT += dt; }
      const cp = Math.floor((((R.prog % L) + L) % L) / L * n);
      if (cp === (R.cp + 1) % n && R.prog > R.lap * L) { R.cp = cp; if (cp === 0 && R.prog >= (R.lap + 1) * L - L / n) { R.lap++; R.times.push(R.lapT); R.best = Math.min(R.best || 1e9, R.lapT); R.lapT = 0; if (R.lap >= this.o.laps) { R.finished = true; this.results.push(R); } } }
      // the wrong way: heading against the line a while at speed
      const a = this.path.at(d).angle, back = Math.cos(angDiff(R.car.angle, a)) < -.3 && Math.abs(R.car.speed) > 20;
      R._wrongT = back ? R._wrongT + dt : 0; R.wrong = R._wrongT > .8;
    }
    const order = this.racers.slice().sort((a, b) => (b.finished - a.finished) || (a.finished ? this.results.indexOf(a) - this.results.indexOf(b) : b.prog - a.prog));
    order.forEach((R, i) => { R.place = i + 1; });
    if (!this.over && this.racers.every(R => R.finished)) this.over = true;
    return this;
  }
  /** the standard HUD for a racer, in its viewport: place, lap, time, item, the countdown, WRONG WAY, FINISH (o.color;
   *  o.right: the x its right-hand text ends before, clear of a corner button) */
  hud(r, R, o = {}) {
    const vp = r.viewport || { x: 0, y: 0, w: r.W, h: r.H }, F = E.font, fmt = t => Math.floor(t / 60) + "'" + String(Math.floor(t % 60)).padStart(2, '0') + '"' + String(Math.floor(t * 100 % 100)).padStart(2, '0');
    r.overlay(g => {
      const x = vp.x + 6, y = vp.y + 6, sfx = ['ST', 'ND', 'RD'][R.place - 1] || 'TH', col = o.color || '#ffffff';
      F.text(g, R.place + sfx, x, y, R.place === 1 ? '#ffe04a' : col, { scale: 2, shadow: '#000', outline: false });
      const rx = Math.min(vp.x + vp.w, o.right || 1e9) - 6;
      F.text(g, 'LAP ' + Math.min(this.o.laps, R.lap + 1) + '/' + this.o.laps, rx, y, col, { align: 'right', shadow: '#000', outline: false });
      F.text(g, fmt(R.time), rx, y + 10, col, { align: 'right', shadow: '#000', outline: false, font: 'tiny' });
      E.ui.box(g, x, y + 20, 22, 22, { bg: '#101830', border: '#e8e4ff' });
      if (R.item) F.text(g, R.item === 'boost' ? '>>' : R.item === 'shot' ? '(*)' : '%', x + 11, y + 27, R.item === 'boost' ? '#ff9a3a' : R.item === 'shot' ? '#4ae04a' : '#ffe04a', { align: 'center', outline: false });
      const cx = vp.x + vp.w / 2, cy = vp.y + vp.h * .35;
      if (this.t < 1) F.text(g, this.t < 0 ? String(Math.ceil(-this.t)) : 'GO!', cx, cy, this.t < 0 ? '#ffffff' : '#4ae04a', { align: 'center', scale: 3, shadow: '#000', outline: false });
      if (R.wrong && !R.finished) F.text(g, 'WRONG WAY', cx, cy, '#ff4a3a', { align: 'center', scale: 2, shadow: '#000', outline: false });
      if (R.finished) F.text(g, 'FINISH', cx, cy, '#ffe04a', { align: 'center', scale: 3, shadow: '#000', outline: false });
    });
  }
}
Object.assign(E, { Car, Race });
})(typeof My3D2dge !== 'undefined' ? My3D2dge : undefined);
