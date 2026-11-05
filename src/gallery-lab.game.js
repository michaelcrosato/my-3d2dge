/* Gallery Lab (a Temporary prototype: src/labs.json; the cc-matrix plan's 3.4). A light-gun gallery on the mode7 module:
 * a field at dusk seen in perspective, deer that bound across it and step out from behind a barn and a fence, a
 * crosshair (the mouse, a pad's stick, the arrows) and a shot (a click, a tap, Space or J; R or a shot off the screen
 * reloads six). It asks whether a 2D game's perspective camera can be the mode7 module with two more calls, here on
 * E.Mode7's prototype as a prototype may put them:
 *   m7.quad(points, color)  a world polygon ([[x, y, z], ...]: a wall, a fence) drawn projected, sorted with the
 *                           billboards by its middle's distance
 *   m7.pick(sx, sy)         what was drawn under a screen point last frame, nearest first: a billboard by the box it was
 *                           drawn in (m7.bill gives one its target and size), or a quad in front of it, which blocks
 * or whether those games need a perspective E.View the 2D renderer draws everything through (the other way the plan
 * names). Thirteen runs wrote their own renderer for this (all four Big Buck Hunter and all four Time Crisis builds). */
const E = My3D2dge, { clamp, rng } = E;
const game = new E.Game({ canvas: 'screen', res: [400, 240], expand: true, menu: { controls: { fire: 'Shoot', reload: 'Reload' } },
  input: Object.assign({}, E.Input.DEFAULT, { fire: ['Space', 'KeyJ', 'Mouse0', 'Pad0', 'Pad7'], reload: ['KeyR', 'Pad2'] }) });

/* ---- the prototype's two calls on E.Mode7 ---- */
const M7 = E.Mode7.prototype;
/** a billboard the gallery can pick: drawn by fn(g, sx, sy, k) at (x, y, z), its box w x h world units over its foot */
M7.bill = function (target, x, y, z, w, h, fn) {
  return this.add(x, y, z, (g, sx, sy, k) => { (this._seen || (this._seen = [])).push({ target, k, box: [sx - w * k / 2, sy - h * k, w * k, h * k] }); fn(g, sx, sy, k); });
};
/** a world polygon drawn projected and sorted with the billboards by its middle (a wall, a fence; not cut where it
 *  crosses one: a prototype's) */
M7.quad = function (pts, color, target = null) {
  const n = pts.length, c = pts.reduce((a, p) => [a[0] + p[0] / n, a[1] + p[1] / n, a[2] + p[2] / n], [0, 0, 0]);
  return this.add(c[0], c[1], c[2], (g, sx, sy, k) => {
    const q = pts.map(p => this.project(p[0], p[1], p[2])); if (q.some(p => !p)) return;
    const a = g.globalAlpha, fog = this.o.fog; g.globalAlpha = 1;   // (the module fogs a billboard by its transparency: a wall shows nothing behind it, so it mixes toward the fog's color)
    E.px.poly(g, q.map(p => [p[0], p[1]]), a < 1 && fog ? E.mix(color, fog.color, (1 - a) * .9) : color); g.globalAlpha = a; g._c = null;
    (this._seen || (this._seen = [])).push({ target, k, poly: q });
  });
};
/** what was drawn under (sx, sy) last frame, nearest first: { target, k } or null (a quad in front blocks what is behind) */
M7.pick = function (sx, sy) {
  const inPoly = (P, x, y) => { let inside = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) inside = !inside; return inside; };
  const hits = (this._last || []).filter(s => s.box ? sx >= s.box[0] && sx < s.box[0] + s.box[2] && sy >= s.box[1] && sy < s.box[1] + s.box[3] : inPoly(s.poly, sx, sy));
  hits.sort((a, b) => b.k - a.k); return hits[0] || null;
};
const draw0 = M7.draw;
M7.draw = function (r, cam) { this._seen = []; draw0.call(this, r, cam); r.overlay(() => { this._last = this._seen; }); };   // (the boxes of the frame drawn: what a shot reads)

/* ---- the field ---- */
const FIELD = 1600, grass = (x, y) => { const n = E.noise2(x * .02, y * .02), path = Math.abs(x - 800 - Math.sin(y * .004) * 120) < 26; return path ? [124 + n * 20, 98 + n * 14, 64] : [52 + n * 26, 92 + n * 34, 44 + n * 12]; };
const m7 = new E.Mode7({ floor: grass, size: [FIELD, FIELD], outside: '#2e4a2a', sky: ['#2a2350', '#d8885a'], fog: { color: '#c08060', near: 500, far: 1500 } });
const R = rng(5), trees = Array.from({ length: 70 }, () => ({ x: 120 + R() * 1360, y: 140 + R() * 900, kind: R() < .5 ? 'tree' : 'pine', s: .9 + R() * .7 }));
const BARN = [[640, 520, 0], [800, 520, 0], [800, 520, 90], [720, 520, 130], [640, 520, 90]], ROOF = [[630, 520, 92], [720, 520, 136], [810, 520, 92], [720, 520, 118]];
const FENCE = Array.from({ length: 9 }, (_, i) => [[300 + i * 40, 840, 0], [336 + i * 40, 840, 0], [336 + i * 40, 840, 26], [300 + i * 40, 840, 26]]);
let deer = [], score = 0, ammo = 6, shots = [], cross = [200, 120], t = 0, spawn = 0, flash = 0, missed = 0, mt = 0;
function addDeer() {   // a deer bounds across at some distance, or steps out from behind the barn
  const behind = R() < .35, y = behind ? 470 : 380 + R() * 600, dir = R() < .5 ? 1 : -1;
  deer.push({ x: behind ? 720 : dir > 0 ? 80 : 1520, y, vx: dir * (60 + R() * 70), vy: behind ? (R() - .5) * 30 : 0, hop: R() * 6, alive: true, fall: 0, stag: R() < .3 });
}
function drawDeer(g, sx, sy, k, d) {   // a deer in silhouette and two tones, k pixels a unit (it faces where it runs)
  const s = k, f = d.vx < 0 ? -1 : 1, up = d.fall > 0 ? 0 : Math.abs(Math.sin(d.hop)) * 6 * s, by = sy - 16 * s - up, P = (x, y) => [sx + x * s * f, by + y * s], C = d.alive ? '#7a4a2a' : '#5a3a2a', L = '#a8703a';
  if (d.fall > 0) { E.px.poly(g, [P(-14, 10), P(14, 10), P(14, 16), P(-14, 16)], C); return; }
  E.px.poly(g, [P(-12, -4), P(10, -6), P(13, 3), P(-11, 4)], C);   // the body
  E.px.poly(g, [P(9, -6), P(14, -16), P(19, -15), P(15, -4)], C); E.px.poly(g, [P(14, -16), P(22, -14), P(21, -11), P(15, -12)], L);   // the neck and head
  for (const [lx, sw] of [[-9, 1], [-6, -1], [7, 1], [10, -1]]) { const a = Math.sin(d.hop * 2) * sw * 3; E.px.line(g, ...P(lx, 2), ...P(lx + a, 16), C, Math.max(1, Math.round(1.6 * s))); }
  if (d.stag) for (const sgn of [-1, 1]) E.px.line(g, ...P(17, -16), ...P(17 + sgn * 4, -24), '#e8d8b0', 1);
  E.px.rect(g, ...P(-13, -3), Math.max(1, 3 * s), Math.max(1, 3 * s), '#f0e0c0');   // the white tail
}
game.start({ scenes: { gallery: { pausable: true, view: 'overhead', touch: [],
  enter() { deer = []; score = 0; ammo = 6; missed = 0; for (let i = 0; i < 3; i++) addDeer(); },
  update(dt) {
    t += dt; const I = game.input, p = I.pointer(), mv = I.move();
    if (p && I.mouse.t !== mt) { mt = I.mouse.t; cross = p; } else cross = [clamp(cross[0] + mv[0] * 220 * dt, 0, game.W), clamp(cross[1] + mv[1] * 220 * dt, 0, game.H)];   // (the mouse as it moves, else the stick or the arrows)
    const tap = I.clicked(); if (tap) cross = tap; const shot = I.pressed('fire') || !!tap;
    m7.cam = { x: 800 + (cross[0] / game.W - .5) * 120, y: 1180, h: 46, angle: -Math.PI / 2 + (cross[0] / game.W - .5) * .5, pitch: 6 + (cross[1] / game.H - .5) * 6, fov: 62 };
    if ((spawn -= dt) <= 0) { spawn = .8 + R() * 1.4; if (deer.filter(d => d.alive).length < 5) addDeer(); }
    for (const d of deer) { if (d.alive) { d.x += d.vx * dt; d.y += d.vy * dt; d.hop += dt * 9; } else d.fall += dt; }
    deer = deer.filter(d => d.x > -100 && d.x < FIELD + 100 && d.fall < 2.5);
    if (I.pressed('reload') || (shot && cross[1] > game.H - 6)) { ammo = 6; game.audio.sfx('door'); }   // (a shot at the screen's foot reloads, as a light gun's off the screen)
    else if (shot) {
      if (ammo <= 0) game.audio.sfx('bump');
      else {
        ammo--; flash = .06; game.audio.sfx('shoot'); const hit = m7.pick(cross[0], cross[1]);
        if (hit && hit.target && hit.target.alive) { hit.target.alive = false; score += hit.target.stag ? 250 : 100; game.audio.sfx('hit'); game.shake(2); }
        else if (!hit || !hit.target) missed++;
        shots.push({ x: cross[0], y: cross[1], t: .3, hit: !!(hit && hit.target), wall: !!(hit && !hit.target) });
      }
    }
    for (const s of shots) s.t -= dt; shots = shots.filter(s => s.t > 0); flash -= dt;
  },
  draw(r) {
    for (const tr of trees) m7.shape(tr.kind, tr.x, tr.y, 0, { size: tr.s });
    m7.quad(BARN, '#8a2a24'); m7.quad(ROOF, '#3a2a2a');   // the barn: a wall the deer step out from behind, its roof
    for (const f of FENCE) m7.quad(f, '#a07848');
    for (const d of deer) m7.bill(d, d.x, d.y, 0, 34, 30, (g, sx, sy, k) => drawDeer(g, sx, sy, k, d));
    m7.draw(r);
    r.overlay(g => {
      if (flash > 0) { g.save(); g.globalAlpha = .25; E.px.rect(g, 0, 0, r.W, r.H, '#fff4d0'); g.restore(); g._c = null; }
      for (const s of shots) E.px.disc(g, s.x, s.y, 3 + (1 - s.t / .3) * 6, s.hit ? '#ffd040' : s.wall ? '#c0a080' : '#e0e0e0');
      const [cx, cy] = cross.map(Math.round);
      for (const [dx, dy, w, h] of [[-9, 0, 6, 1], [4, 0, 6, 1], [0, -9, 1, 6], [0, 4, 1, 6]]) E.px.rect(g, cx + dx, cy + dy, w, h, '#ff3030');
      E.px.dot(g, cx, cy, '#ffffff');
      E.font.text(g, 'SCORE ' + score, 6, 6, '#ffffff', { shadow: '#000', outline: false });
      for (let i = 0; i < 6; i++) E.px.rect(g, r.W - 12 - i * 7, r.H - 14, 4, 9, i < ammo ? '#e8c060' : '#3a3040');
      if (!ammo) E.font.text(g, 'RELOAD: R, OR SHOOT THE GROUND BELOW', r.W / 2, r.H - 26, '#ffd060', { align: 'center', shadow: '#000', outline: false, font: 'tiny' });
      E.font.text(g, 'GALLERY LAB: m7.quad + m7.pick on the mode7 module', r.W / 2, 6, '#e8dcc8', { align: 'center', shadow: '#000', outline: false, font: 'tiny' });
    });
  } } }, scene: 'gallery' });
window.__lab = { game, m7, get deer() { return deer; }, get score() { return score; }, aim: (x, y) => { cross = [x, y]; } };
