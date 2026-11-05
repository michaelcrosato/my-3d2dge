/* Track Lab (a Temporary prototype: src/labs.json; the cc-matrix plan's 7.5). A racer's track of its own on the 3D
 * engine: a ribbon that leaves the ground, banks into its bends and runs round a loop, a craft that rides it in the
 * track's own space (along it, across it, up from it: through the loop upside down), the track's walls its colliders.
 * Seven of eight WipeoutHD and TrackMania builds wrote their own track physics. It asks: is a track a world.track() of
 * the 3D engine with these, its frames as data (track.at(s) -> { p, t, r, u }, track.toTrack(x, y, z) -> { s, u, h })
 * and its riders in its space; or a module of its own beside world.track's flat circuit and E.Road's pseudo-3D one?
 * Arrows or WASD steer, Z or J (or up) the gas, X or K (or down) the brake, C the camera (behind, the view from the
 * stands); ?auto drives itself. Its mesh is its own three.js in world.scene (the 3D engine's "Your own three.js"). */
const E = My3D2dge, W3 = E.World3D, { clamp, lerp } = E;
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, bg: null, input: Object.assign({}, E.Input.DEFAULT, { gas: ['KeyZ', 'KeyJ', 'Pad0', 'Pad7'], brake: ['KeyX', 'KeyK', 'Pad2', 'Pad6'], cam: ['KeyC', 'Pad3'] }) });
const AUTO = new URLSearchParams(location.search).has('auto'), WIDTH = 64, WALL = 7, HOVER = 3;
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len = a => Math.hypot(a[0], a[1], a[2]), norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];   // (the engine's axes are left-handed: right = cross(up, forward))
const smooth = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };

/* ---- the track: its centreline and frames, sampled every 2 units (a straight, a loop that drifts aside so it never meets
 * itself, an S back into line, two banked half circles that close the circuit) ---- */
function build() {
  const pts = [], Z = 10, X0 = 300, Y0 = 400, LOOP = 70, SHIFT = 60, TURN = 160, BANK = .45;
  const put = (p, up) => pts.push({ p, up });
  for (let x = 0; x < 200; x += 2) put([X0 + x, Y0, Z], [0, 0, 1]);
  const L0 = [X0 + 200, Y0, Z];
  for (let a = 0; a < Math.PI * 2; a += 2 / LOOP) {   // the loop: up the far side, over the top upside down, down to the ground again, drifting south
    const lat = SHIFT * smooth(a / (Math.PI * 2)), c = [L0[0], L0[1] + lat, L0[2] + LOOP];
    const p = [L0[0] + Math.sin(a) * LOOP, L0[1] + lat, L0[2] + LOOP - Math.cos(a) * LOOP]; put(p, norm(sub(c, p)));
  }
  for (let d = 0; d < 200; d += 2) put([L0[0] + d, Y0 + SHIFT * (1 - smooth(d / 200)), Z], [0, 0, 1]);   // the S back into line
  for (let d = 0; d < 100; d += 2) put([L0[0] + 200 + d, Y0, Z], [0, 0, 1]);
  const turn = (cx, cy, a0) => { for (let a = 0; a < Math.PI; a += 2 / TURN) {   // half a circle to the right, banked into it (the outside edge higher)
    const th = a0 + a, p = [cx + Math.cos(th) * TURN, cy + Math.sin(th) * TURN, Z], inward = [-Math.cos(th), -Math.sin(th), 0], b = BANK * Math.sin(Math.min(1, a / .5, (Math.PI - a) / .5) * Math.PI / 2);
    put(p, norm(add([0, 0, Math.cos(b)], inward, Math.sin(b)))); } };
  const XE = L0[0] + 300; turn(XE, Y0 + TURN, -Math.PI / 2);
  for (let x = XE; x > X0; x -= 2) put([x, Y0 + TURN * 2, Z], [0, 0, 1]);
  turn(X0, Y0 + TURN, Math.PI / 2);
  // frames: forward from the points around, right = up x forward, up made square to forward
  let s = 0; const F = pts.map((q, i) => { const a = pts[(i - 1 + pts.length) % pts.length].p, b = pts[(i + 1) % pts.length].p, t = norm(sub(b, a)), r = norm(cross(q.up, t)), u = cross(t, r); return { p: q.p, t, r, u, s: 0 }; });
  F.forEach((f, i) => { if (i) s += len(sub(f.p, F[i - 1].p)); f.s = s; });
  const total = s + len(sub(F[0].p, F[F.length - 1].p));
  return {
    frames: F, length: total,
    /** the frame at a distance s along it (wrapping round the circuit): { p, t (forward), r (right), u (up) } */
    at(s) {
      s = ((s % total) + total) % total; let lo = 0, hi = F.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (F[m].s <= s) lo = m; else hi = m - 1; }
      const a = F[lo], b = F[(lo + 1) % F.length], span = (b.s || total) - a.s, k = span > 0 ? (s - a.s) / span : 0, mix = (x, y) => norm(add(x, sub(y, x), k));
      return { p: add(a.p, sub(b.p, a.p), k), t: mix(a.t, b.t), r: mix(a.r, b.r), u: mix(a.u, b.u) };
    },
    /** a world point in the track's space, near a guess s0 (or anywhere): { s, u (across: + right), h (up from it) } */
    toTrack(x, y, z, s0) {
      let best = null, bd = 1e18; const P = [x, y, z], w = s0 === undefined ? 0 : ((s0 % total) + total) % total, list = s0 === undefined ? F : F.filter(f => Math.abs(((f.s - w + total * 1.5) % total) - total / 2) < 120);   // (s0 on any lap)
      for (const f of list) { const d = len(sub(P, f.p)); if (d < bd) { bd = d; best = f; } }
      const v = sub(P, best.p); return { s: best.s + dot(v, best.t), u: dot(v, best.r), h: dot(v, best.u) };
    }
  };
}

/* ---- its mesh (the lab's own three.js: a prototype's reach): the road in stripes, its edges, its walls ---- */
function meshes(world, track) {
  const T = E.THREE, to = (p) => W3.toThree(p[0], p[1], p[2]), pos = [], col = [], idx = [];
  const quad = (a, b, c, d, rgb) => { const n = pos.length / 3; for (const q of [a, b, c, d]) { const v = to(q); pos.push(v.x, v.y, v.z); col.push(...rgb); } idx.push(n, n + 1, n + 2, n, n + 2, n + 3); };
  const F = track.frames, H = WIDTH / 2;
  for (let i = 0; i < F.length; i++) {
    const a = F[i], b = F[(i + 1) % F.length], stripe = Math.floor(a.s / 24) % 2, road = stripe ? [.32, .34, .4] : [.28, .3, .36];
    const L = f => add(f.p, f.r, -H), R = f => add(f.p, f.r, H);
    quad(L(a), R(a), R(b), L(b), road);
    for (const sd of [-1, 1]) {   // the edge lines and the walls (each side's, up from the road)
      const e = f => add(f.p, f.r, sd * H), e2 = f => add(f.p, f.r, sd * (H - 2.5)), w = f => add(e(f), f.u, WALL), edge = stripe ? [.9, .2, .2] : [.95, .95, .95];
      quad(e2(a), e(a), e(b), e2(b), edge); quad(e(a), w(a), w(b), e(b), [.25, .55, .95]);
    }
  }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new T.Mesh(g, new T.MeshLambertNodeMaterial({ vertexColors: true, side: T.DoubleSide })); m.frustumCulled = false; world.scene.add(m);
  return m;
}

/* ---- the craft, in the track's space ---- */
let world, track, cam = 'behind', laps = 0;
const craft = { s: 10, u: 0, v: 0, vu: 0, bump: 0, x: 0, y: 0, z: 0 };
function step(c, dt, ctl) {
  const top = 420, acc = 260;
  c.v = clamp(c.v + (ctl.gas * acc - ctl.brake * 380 - c.v * .35) * dt, 0, top);
  c.vu = lerp(c.vu, ctl.steer * (60 + c.v * .35), Math.min(1, dt * 6));
  const was = c.s; c.s += c.v * dt; c.u += c.vu * dt; if (Math.floor(c.s / track.length) > Math.floor(was / track.length)) laps++;
  const lim = WIDTH / 2 - 5;   // the walls: a craft that reaches one is pushed back and slowed
  if (Math.abs(c.u) > lim) { c.u = Math.sign(c.u) * lim; c.vu *= -.4; c.v *= .96; c.bump = .3; }
  c.bump -= dt;
  const f = track.at(c.s), p = add(add(f.p, f.r, c.u), f.u, HOVER + Math.sin(c.s * .05) * .4);
  Object.assign(c, { x: p[0], y: p[1], z: p[2], f });
}
function auto(c) { const ahead = track.at(c.s + 60), off = track.toTrack(...ahead.p, c.s + 60); return { gas: 1, brake: 0, steer: clamp(-(c.u - off.u) * .05, -1, 1) }; }
/** a frame's turn as the engine's yaw, pitch and roll (radians: yaw from east toward south, pitch up, roll about forward) */
function ypr(t, u) {
  const yaw = Math.atan2(t[1], t[0]), pitch = Math.asin(clamp(t[2], -1, 1)), u0 = [-Math.sin(pitch) * Math.cos(yaw), -Math.sin(pitch) * Math.sin(yaw), Math.cos(pitch)], r0 = cross(u0, t);
  return [yaw, pitch, Math.atan2(dot(u, r0), dot(u, u0))];
}
const play = {
  view: 'iso', pausable: true, touch: ['gas', 'brake'],
  enter() { Object.assign(craft, { s: 10, u: 0, v: 0, vu: 0 }); laps = 0; world.camera.set('fixed'); },
  update(dt) {
    const I = game.input; if (I.pressed('cam')) cam = cam === 'behind' ? 'stands' : 'behind';
    const you = { steer: I.move()[0], gas: I.down('gas') || I.down('up') ? 1 : 0, brake: I.down('brake') || I.down('down') ? 1 : 0 };
    step(craft, dt, AUTO ? auto(craft) : you);
    const f = craft.f;
    if (cam === 'behind') {   // behind the craft in the track's frame: upside down with it through the loop
      const c = add(add([craft.x, craft.y, craft.z], f.t, -42), f.u, 14), look = norm(sub(add([craft.x, craft.y, craft.z], f.t, 30), c)), [yaw, pitch, roll] = ypr(look, f.u);
      world.camera.fixed = { x: c[0], y: c[1], z: c[2], yaw, pitch, roll, fov: 72 };
    } else { const c = [520, 900, 120], d = norm(sub([craft.x, craft.y, craft.z], c)), [yaw, pitch] = ypr(d, [0, 0, 1]); world.camera.fixed = { x: c[0], y: c[1], z: c[2], yaw, pitch, roll: 0, fov: 60 }; }
    world.step(dt);
  },
  draw(r) {
    const f = craft.f, [yaw, pitch, roll] = ypr(f.t, f.u), pen = world.pen;
    pen.at(craft.x, craft.y, craft.z, yaw, 1, pitch, roll);   // the craft: a wedge with its fins and engines, turned with the track
    pen.box(0, 0, 1.5, 22, 12, 3, craft.bump > 0 ? '#ffffff' : '#e8d040').box(-6, 0, 4, 8, 6, 3, '#2a3a5a').box(-11, -5, 2, 3, 3, 3, '#ff7a30').box(-11, 5, 2, 3, 3, 3, '#ff7a30');
    pen.at();
    world.draw(r);
    r.overlay(g => {
      const q = track.toTrack(craft.x, craft.y, craft.z, craft.s % track.length);
      E.font.text(g, 'TRACK LAB: a ribbon of its own, a craft in its space', r.W / 2, 4, '#e8e0ff', { align: 'center', outline: '#000', font: 'tiny' });
      E.font.text(g, Math.round(craft.v) + ' KM/H   LAP ' + (laps + 1), 6, r.H - 22, '#ffffff', { outline: '#000' });
      E.font.text(g, 'ALONG ' + Math.round(q.s) + '  ACROSS ' + q.u.toFixed(1) + '  UP ' + q.h.toFixed(1) + ' (track.toTrack)', 6, r.H - 10, '#a8d8ff', { outline: '#000', font: 'tiny' });
    });
  }
};
game.start({ scenes: { play }, scene: 'play', boot: { title: 'Track Lab', steps: [
  ['The 3D engine', () => W3.init(game)],
  ['The field and the track', () => {
    world = new W3(game, { level: { rows: Array.from({ length: 64 }, () => '.'.repeat(72)), ground: 'grass', colors: { base: '#3a7a4a', dark: '#2e6a3e', light: '#4a8a5a' } }, fog: { color: '#3a3a6a', near: 500, far: 1500 },
      sky: ['#1a1840', '#5a4a8a'], ambient: ['#c8d0ff', '#4a5a6a', 2.4], sun: { color: '#ffe8d0', intensity: 2.2, dir: [-.4, .5, -.8], area: 600 }, torchLights: 0, camera: { mode: 'fixed' } });
    track = build(); meshes(world, track); world.prepare();
  }]] } });
window.__lab = { game, get world() { return world; }, get track() { return track; }, craft, get laps() { return laps; } };
