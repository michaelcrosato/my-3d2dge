/* =============================================================================
 * BEASTS: two new procedural rigs and everything built on them
 *   CRAWLER  an eight-legged spider rig: two shaded ellipsoids (cephalothorax, abdomen), 8 two-bone IK legs with a
 *            real alternating gait (feet stay planted, step in groups when they stray, grip walls), fangs and
 *            chelicerae that open, glowing eyes, palps, a lagging abdomen, crouch / rear / pounce / death-curl poses
 *   SERPENT  a segmented wyrm: segments follow the head's path history, spines and fins, jaws that open; it travels
 *            UNDERGROUND (a moving dirt mound) and breaches in arcs through churned-earth holes
 *   WATCHER  a floating eye: a fleshy orb, an iris that tracks the hero, blinking lids, trailing tendrils
 * Monsters: crawler, webspinner, broodling (from egg sacs), burrower, eye.  Bosses: the Brood Mother (depth 10) and
 * the Deep Wyrm (depth 15), with their patterns.  Mechanics: WEBS (depth 10) and QUAKE (depth 15).
 * Every part is drawn from continuous values (gait phases, timers, velocities), projected through any view and
 * depth sorted part by part (a boss's legs interleave with the hero standing between them).
 * ============================================================================= */
const BST_T = 16, BST_OL = '#140c1c';
const BST_rnd = (a, b) => a + Math.random() * (b - a);

/* ---------- drawing helpers: projection, shaded capsules and ellipsoids ---------- */
/** world offset (from a rig's root) -> [screen x, screen y, camera depth] */
const BST_p = (view, ox, oy, x, y, z) => [ox + view.ax * x + view.ay * y, oy + view.bx * x + view.by * y + view.bz * z, view.dx * x + view.dy * y + view.dz * z];
/** a capsule between two screen points (radii in pixels): the limb shape of the Humanoid */
function BST_cap(g, A, B, ra, rb, col, dx = 0, dy = 0) {
  const ax = A[0] + dx, ay = A[1] + dy, bx = B[0] + dx, by = B[1] + dy, vx = bx - ax, vy = by - ay, L0 = Math.hypot(vx, vy);
  if (ra < .7 && rb < .7) { px.line(g, ax, ay, bx, by, col, 1); return; }
  if (L0 > .01) { const nx = -vy / L0, ny = vx / L0; px.poly(g, [[ax + nx * ra, ay + ny * ra], [bx + nx * rb, by + ny * rb], [bx - nx * rb, by - ny * rb], [ax - nx * ra, ay - ny * ra]], col); }
  px.disc(g, ax, ay, Math.max(0, ra - .35), col); px.disc(g, bx, by, Math.max(0, rb - .35), col);
}
/** a shaded limb: (outline), dark silhouette, base inset toward the light, a lit edge on thick ones */
function BST_limb(g, A, B, ra, rb, t, far, ol) {
  if (ol) BST_cap(g, A, B, ra + 1, rb + 1, ol);
  BST_cap(g, A, B, ra, rb, far ? t.deep : t.sh);
  if (ra > 1.05) BST_cap(g, A, B, Math.max(.45, ra - .75), Math.max(.45, rb - .75), far ? t.sh : t.base, -.5, -.5);
  if (ra > 1.6 && !far) { const vx = B[0] - A[0], vy = B[1] - A[1], l = Math.hypot(vx, vy) || 1; let nx = -vy / l, ny = vx / l; if (nx * -.6 + ny * -.8 < 0) { nx = -nx; ny = -ny; } const off = ra - 1.1; px.line(g, A[0] + vx * .2 + nx * off, A[1] + vy * .2 + ny * off, A[0] + vx * .7 + nx * off, A[1] + vy * .7 + ny * off, t.lt); }
}
/** the screen ellipse of an ellipsoid: center c and three axis vectors (world units, radius included), exact for any view */
function BST_ell(view, ox, oy, c, a, b, d) {
  const px1 = view.ax * a[0] + view.ay * a[1], py1 = view.bx * a[0] + view.by * a[1] + view.bz * a[2], px2 = view.ax * b[0] + view.ay * b[1], py2 = view.bx * b[0] + view.by * b[1] + view.bz * b[2];
  const px3 = view.ax * d[0] + view.ay * d[1], py3 = view.bx * d[0] + view.by * d[1] + view.bz * d[2];
  const cxx = px1 * px1 + px2 * px2 + px3 * px3, cxy = px1 * py1 + px2 * py2 + px3 * py3, cyy = py1 * py1 + py2 * py2 + py3 * py3;
  const l00 = Math.sqrt(cxx) || .01, l10 = cxy / l00, l11 = Math.sqrt(Math.max(1e-4, cyy - l10 * l10)), m = (cxx + cyy) / 2, q = Math.sqrt(((cxx - cyy) / 2) ** 2 + cxy * cxy);
  const s = BST_p(view, ox, oy, c[0], c[1], c[2]);
  return { x: s[0], y: s[1], d: s[2], l00, l10, l11, rmin: Math.sqrt(Math.max(.01, m - q)), rmax: Math.sqrt(m + q) };
}
function BST_ellPts(e, k = 1, dx = 0, dy = 0) { const n = clamp(Math.round(e.rmax * k * 1.6), 10, 30), pts = []; for (let i = 0; i < n; i++) { const a = i / n * TAU, c = Math.cos(a), s = Math.sin(a); pts.push([e.x + dx + e.l00 * c * k, e.y + dy + (e.l10 * c + e.l11 * s) * k]); } return pts; }
/** a shaded ball: (outline), shadow tone, base inset toward the upper-left light, a lit cap and a sparkle */
function BST_ball(g, e, t, ol, far) {
  if (ol) px.poly(g, BST_ellPts(e, 1 + 1 / e.rmin), ol);
  px.poly(g, BST_ellPts(e, 1), far ? t.deep : t.sh);
  px.poly(g, BST_ellPts(e, Math.max(.3, 1 - 1.1 / e.rmin), -.6, -.7), far ? t.sh : t.base);
  if (e.rmin > 1.7) px.poly(g, BST_ellPts(e, .48, -e.rmax * .2, -e.rmin * .3), far ? t.base : t.lt);
  if (e.rmin > 2.6 && !far) px.rect(g, e.x - e.rmax * .34, e.y - e.rmin * .58, Math.max(1, Math.round(e.rmax * .18)), 1, t.hi);
}
/** a point on an ellipsoid's surface (u, v, w on the unit sphere): [screen x, y, faces the camera?] */
function BST_surf(view, ox, oy, c, a, b, d, u, v, w) {
  const x = c[0] + a[0] * u + b[0] * v + d[0] * w, y = c[1] + a[1] * u + b[1] * v + d[1] * w, z = c[2] + a[2] * u + b[2] * v + d[2] * w;
  const la = a[0] * a[0] + a[1] * a[1] + a[2] * a[2], lb = b[0] * b[0] + b[1] * b[1] + b[2] * b[2], ld = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
  const nx = a[0] * u / la + b[0] * v / lb + d[0] * w / ld, ny = a[1] * u / la + b[1] * v / lb + d[1] * w / ld, nz = a[2] * u / la + b[2] * v / lb + d[2] * w / ld;
  const s = BST_p(view, ox, oy, x, y, z); return [s[0], s[1], nx * view.dx + ny * view.dy + nz * view.dz > 0, [x, y, z]];
}
/* ---------- sounds (chip voices) ---------- */
A.define('bst_hiss', [{ wave: 'noise', freq: 5200, to: 2600, dur: .22, vol: .16, filter: 'highpass' }, { wave: 'saw', freq: 1900, to: 1500, dur: .12, vol: .04 }]);
A.define('bst_skitter', { wave: 'noise', freq: 4200, to: 3000, dur: .04, vol: .07, filter: 'bandpass' });
A.define('bst_bite', [{ wave: 'noise', freq: 2400, to: 700, dur: .07, vol: .3 }, { wave: 'square', freq: 320, to: 120, dur: .06, vol: .14 }]);
A.define('bst_screech', [{ wave: 'saw', freq: 1300, to: 2300, dur: .55, vol: .14, vib: [22, .08] }, { wave: 'saw', freq: 900, to: 1400, dur: .6, vol: .1, vib: [17, .1] }, { wave: 'noise', freq: 3500, to: 1500, dur: .5, vol: .16 }]);
A.define('bst_spit', [{ wave: 'noise', freq: 1500, to: 400, dur: .12, vol: .24, filter: 'lowpass' }, { wave: 'sine', freq: 520, to: 180, dur: .1, vol: .2 }]);
A.define('bst_squelch', [{ wave: 'noise', freq: 700, to: 200, dur: .18, vol: .32, filter: 'lowpass' }, { wave: 'sine', freq: 260, to: 70, dur: .16, vol: .26 }]);
A.define('bst_rumble', [{ wave: 'noise', freq: 220, to: 120, dur: 1.1, vol: .42, filter: 'lowpass' }, { wave: 'sine', freq: 48, to: 36, dur: 1.1, vol: .35 }]);
A.define('bst_burst', [{ wave: 'noise', freq: 900, to: 90, dur: .5, vol: .5, filter: 'lowpass' }, { wave: 'sine', freq: 120, to: 35, dur: .4, vol: .5 }, { wave: 'noise', freq: 3000, to: 900, dur: .15, vol: .2 }]);
A.define('bst_charge', { wave: 'sine', freq: 300, to: 1400, dur: .7, vol: .16, vib: [16, .05] });
A.define('bst_burn', [{ wave: 'noise', freq: 1200, to: 300, dur: .35, vol: .28 }, { wave: 'noise', freq: 5000, to: 2000, dur: .25, vol: .1, filter: 'highpass' }]);
A.define('bst_egg', [{ wave: 'noise', freq: 900, to: 300, dur: .14, vol: .3, filter: 'lowpass' }, { wave: 'triangle', freq: 700, to: 300, dur: .1, vol: .16 }]);
A.define('bst_roar', [{ wave: 'saw', freq: 90, to: 55, dur: 1.3, vol: .26, vib: [11, .16] }, { wave: 'saw', freq: 135, to: 80, dur: 1.2, vol: .14, vib: [7, .1] }, { wave: 'noise', freq: 500, to: 150, dur: 1.3, vol: .32, filter: 'lowpass' }]);

/* =============================================================================
 * CRAWLER RIG
 *   new BST_Crawler({ size, H (ride height), ceph, abd, egg (egg-sac abdomen 0..1), long (leg length), pattern:
 *     'chevron' | 'hourglass' | 'spots' | 'bands', flip (dies on its back), colors: { base, leg, belly, mark, eye, fang, joint, sac, vein } })
 *   rig.update(dt, { x, y, z, lift, vx, vy, facing, dead (seconds since death), pose: { crouch, rear, fang, lunge, hurt, curl, dash } })
 *   rig.draw(g, ox, oy, view)  (an actor)  or  rig.draw(null, 0, 0, view, { r, x, y, z, alpha })  (every part queued on its own)
 * Local frame: f forward, r right, z up, centred on the body. Planted feet live in world space.
 * ============================================================================= */
const BST_LEG = [   // hip angle (from forward) on the cephalothorax, rest-spot angle and distance, femur and tibia length
  { ha: .5, ra: .6, D: 10.6, L1: 7.2, L2: 8.8 }, { ha: 1.15, ra: 1.28, D: 9.6, L1: 6.4, L2: 7.6 },
  { ha: 1.9, ra: 2.02, D: 9.4, L1: 6.4, L2: 7.4 }, { ha: 2.55, ra: 2.62, D: 10.4, L1: 7.3, L2: 8.6 }];
const BST_RATE = { crouch: 7, rear: 5, fang: 18, lunge: 16, air: 12, curl: 3.2, hurt: 12, dash: 6 };
class BST_Crawler {
  constructor(o = {}) {
    this.o = Object.assign({ size: 1, H: 5, ceph: 1, abd: 1, egg: 0, long: 1, pattern: 'chevron', flip: true, palps: true }, o);
    const C = this.C = Object.assign({ base: '#4a3a4e', leg: '#3e3242', belly: '#2a2230', mark: '#d8a840', eye: '#ff5a3a', fang: '#e0d0b8', joint: '#7a6a7e', sac: '#d8c8a0', vein: '#a85a5a' }, o.colors || {});
    this.T = {}; for (const k of ['base', 'leg', 'belly', 'mark', 'fang', 'sac', 'joint']) this.T[k] = E.tones(C[k]);
    this.legs = []; for (let i = 0; i < 8; i++) { const s = i < 4 ? -1 : 1, k = i % 4; this.legs.push({ s, k, grp: (k + (s > 0 ? 1 : 0)) % 2, d: BST_LEG[k], foot: [0, 0, 0], from: [0, 0, 0], u: -1, dur: .12, seed: Math.random() }); }
    this.x = 0; this.y = 0; this.rootZ = 0; this.facing = 0; this.t = Math.random() * 9; this.init = false; this.wasAir = false;
    this.W = { crouch: 0, rear: 0, fang: 0, lunge: 0, air: 0, curl: 0, hurt: 0, dash: 0 };
    this.pitch = 0; this.roll = 0; this.sq = 0; this.sqV = 0; this.abdY = 0; this.abdV = 0; this.turn = 0; this.spd = 0; this.bz = 0; this.hop = 0; this.glow = [];
    this.cfv = [1, 0, 0]; this.crv = [0, 1, 0]; this.czv = [0, 0, 1];
  }
  kick(v) { this.sqV += v * .6; }
  /** local (f, r, z) -> world offset from the body centre (rotated, scaled, squashed) */
  L(f, r, z) { const S = this.o.size, a = (1 - this.sq * .4) * S, c = (1 + this.sq) * S, F = this.cfv, R = this.crv, Z = this.czv; f *= a; r *= a; z *= c; return [F[0] * f + R[0] * r + Z[0] * z, F[1] * f + R[1] * r + Z[1] * z, F[2] * f + R[2] * r + Z[2] * z]; }
  update(dt, s) {
    const o = this.o, S = o.size, W = this.W, P = s.pose || {}, dead = s.dead !== undefined && s.dead >= 0;
    const f0 = this.facing; this.x = s.x; this.y = s.y; this.rootZ = s.z || 0; this.facing = s.facing; this.t += dt; this.dead = dead;
    this.turn = lerp(this.turn, dt > 0 ? clamp(E.angDiff(f0, s.facing) / dt, -14, 14) : 0, Math.min(1, dt * 10));
    const vx = s.vx || 0, vy = s.vy || 0, sp = Math.hypot(vx, vy); this.spd = lerp(this.spd, sp, Math.min(1, dt * 8));
    const lift = (s.lift || 0) + this.rootZ, air = lift > 1.5 && !dead;
    for (const k in W) { const tg = k === 'air' ? (air ? 1 : 0) : k === 'curl' ? (dead ? 1 : P.curl || 0) : P[k] || 0; W[k] = approach(W[k], tg, dt * (BST_RATE[k] || 8)); }
    this.sqV += (-240 * this.sq - 14 * this.sqV) * dt; this.sq = clamp(this.sq + this.sqV * dt, -.35, .35);
    // the abdomen lags behind turns and bounces with the steps (a damped spring)
    this.abdV += (-this.turn * .05 - this.abdY * 70 - this.abdV * 9) * dt; this.abdY = clamp(this.abdY + this.abdV * dt, -.5, .5);
    // attitude: the nose dips at speed and into a bite, rears for threats, rolls into turns; small ones die on their backs
    const flipU = dead && o.flip ? E.ease.inOut(clamp((s.dead - .1) / .4, 0, 1)) : 0;
    const pitchT = -.13 * clamp(sp / 70, 0, 1) + .8 * W.rear + .14 * W.crouch - .22 * W.lunge + .12 * W.hurt;
    this.pitch = approach(this.pitch, pitchT, dt * 4); this.roll = dead && o.flip ? Math.PI * flipU : approach(this.roll, clamp(-this.turn * .035, -.3, .3), dt * 3);
    this.hop = dead && o.flip ? Math.sin(flipU * Math.PI) * 4 * S : 0;
    const cp = Math.cos(this.pitch), spn = Math.sin(this.pitch), cr = Math.cos(this.roll), sr = Math.sin(this.roll), ct = Math.cos(this.facing), st = Math.sin(this.facing);
    this.cfv = [cp * ct, cp * st, spn]; this.crv = [-sr * spn * ct - cr * st, -sr * spn * st + cr * ct, sr * cp]; this.czv = [-cr * spn * ct + sr * st, -cr * spn * st - sr * ct, cr * cp];
    // ride height: breathing when still, a dip while legs are in the air, low in a crouch, flat when it dies
    let lifting = 0; for (const Lg of this.legs) if (Lg.u >= 0) lifting += Math.sin(Lg.u * Math.PI);
    const H = o.H * S, idle = 1 - clamp(sp / 30, 0, 1);
    this.bz = lift + lerp(H * (1 - .45 * W.crouch - .18 * W.hurt + .3 * W.rear) - lifting * .05 * H + Math.sin(this.t * 2.4) * .06 * H * idle, H * .55, W.curl) + this.hop;
    // the gait: each foot stays planted until it strays from its rest spot, then steps in its group (alternating tetrapods)
    const cf = Math.cos(this.facing), sf = Math.sin(this.facing), D = o.long * S, spread = 1 + .2 * W.crouch, lead = .09;
    const thr = (2.4 + Math.min(sp, 130) * .026) * S * o.long;
    const busy = [0, 0]; for (const Lg of this.legs) if (Lg.u >= 0) busy[Lg.grp]++;
    const loose = W.air > .02 || W.curl > .02;
    if (this.wasAir && !air && W.air < .5) { for (const Lg of this.legs) { Lg.foot = this._drawnFoot(Lg); Lg.foot[2] = 0; Lg.u = -1; } if (S > 1.5) { P0dust(this.x, this.y, 10 * S); } }
    this.wasAir = air;
    for (const Lg of this.legs) {
      const d = Lg.d, lf = 2.2 + Math.cos(d.ra) * d.D * spread, lr = Lg.s * Math.sin(d.ra) * d.D * spread;
      const rx = this.x + (lf * cf - lr * sf) * D + vx * lead, ry = this.y + (lf * sf + lr * cf) * D + vy * lead;
      if (!this.init) { Lg.foot = BST_footAt(rx, ry, this.x, this.y, Lg.seed); continue; }
      if (loose) { Lg.u = -1; continue; }
      if (Lg.u >= 0) {
        Lg.u = Math.min(1, Lg.u + dt / Lg.dur);
        const tg = BST_footAt(rx + vx * Lg.dur * .35, ry + vy * Lg.dur * .35, this.x, this.y, Lg.seed), e = E.ease.inOut(Lg.u);
        Lg.foot = [lerp(Lg.from[0], tg[0], e), lerp(Lg.from[1], tg[1], e), lerp(Lg.from[2], tg[2], e) + Math.sin(Lg.u * Math.PI) * (1.5 + Math.min(sp, 110) * .022) * S];
        if (Lg.u >= 1) { Lg.u = -1; Lg.foot = tg; if (S > 1.6 && Math.random() < .7) P0dust(tg[0], tg[1], 3 * S); }
      } else {
        const off = Math.hypot(Lg.foot[0] - rx, Lg.foot[1] - ry);
        if ((off > thr && !busy[1 - Lg.grp]) || off > thr * 2.3) { Lg.u = 0; Lg.from = Lg.foot.slice(); Lg.dur = clamp(thr / Math.max(sp, 14) * .75, .055, .17); busy[Lg.grp]++; }
      }
    }
    this.init = true;
  }
  /** where a foot is drawn: planted (world), tucked under the body in the air, raised for a threat, curled in death */
  _drawnFoot(Lg) {
    const W = this.W, d = Lg.d, s = Lg.s, k = Lg.k, bx = this.x, by = this.y, bz = this.bz; let f = Lg.foot.slice();
    const rel = (lf, lr, lz) => { const w = this.L(lf, lr, lz); return [bx + w[0], by + w[1], bz + w[2]]; };
    if (W.rear > 0 && k < 2) { const q = rel(2.2 + Math.cos(d.ra * .55) * d.D * .78 + (k ? 0 : 1.5), s * Math.sin(d.ra * .55) * d.D * .78, k ? 1 + Math.sin(this.t * 7 + s) : 4 + Math.sin(this.t * 9 + s * 2) * 1.5); f = V3lerp(f, q, W.rear * (k ? .7 : 1)); }
    if (W.crouch > 0 && k === 0) { const q = rel(2.2 + Math.cos(d.ra) * d.D * .8, s * Math.sin(d.ra) * d.D * .8, -this.o.H * .2); f = V3lerp(f, q, W.crouch * .45); }
    if (W.air > 0) { const q = rel(2.2 + Math.cos(d.ra) * d.D * .6 + (k === 0 ? 3 : k === 3 ? -1.5 : 0), s * Math.sin(d.ra) * d.D * .62, k === 0 ? .5 : -this.o.H * .6 - Math.sin(this.t * 20 + k) * .6); f = V3lerp(f, q, W.air); }
    if (W.curl > 0) { const tw = Math.sin(this.t * 26 + k * 2 + s) * Math.max(0, 1 - W.curl * .8) * 1.2; const q = rel(2.2 * .4 + Math.cos(d.ra) * 2.4, s * (2.4 + Math.sin(d.ra) * 1.4), -(this.o.H * .75) + tw); f = V3lerp(f, q, W.curl); }
    return f;
  }
  /** Q: { r, x, y, z, alpha, ol } queues each part on its own (bosses); otherwise draws into g around (ox, oy) */
  draw(g, ox, oy, view, Q) {
    const o = this.o, C = this.C, W = this.W, S = o.size, sc = view.scale * S, ops = [], ol = Q ? BST_OL : null, T = Q && Q.flash ? this._flashT(Q.flash) : this.T;
    const rx = this.x, ry = this.y, rz = this.rootZ, bx = 0, by = 0, bzr = this.bz - rz;   // everything relative to the root
    if (Q) { const w0 = Q.r.w(rx, ry, rz); ox = Math.round(w0[0]); oy = Math.round(w0[1]); }
    const lung = (W.lunge * 2.6 - W.hurt * 1.4) * S, lx = Math.cos(this.facing) * lung, ly = Math.sin(this.facing) * lung;
    const Bp = (lf, lr, lz) => { const w = this.L(lf, lr, lz); return [bx + lx + w[0], by + ly + w[1], bzr + w[2]]; };   // body-local -> root-relative world
    const P = p => BST_p(view, ox, oy, p[0], p[1], p[2]);
    const bodyD = view.dx * lx + view.dy * ly + view.dz * bzr;
    const push = (w, f) => ops.push({ d: view.dx * w[0] + view.dy * w[1] + view.dz * w[2], ax: w[0], ay: w[1], az: w[2] + rz, f });
    // ---- legs: hip -> knee (IK) -> foot, a knee knob, a banded shin and a claw ----
    const sil = this.sq * .4;
    for (const Lg of this.legs) {
      const d = Lg.d, hipL = [2.2 + Math.cos(d.ha) * 2.1 * o.ceph, Lg.s * Math.sin(d.ha) * 2 * o.ceph, -.3];
      const hip = Bp(...hipL), fw = this._drawnFoot(Lg), foot = [fw[0] - rx, fw[1] - ry, fw[2] - rz];
      const ox0 = foot[0] - hip[0], oy0 = foot[1] - hip[1], ol0 = Math.hypot(ox0, oy0) || 1;
      const [knee, ft] = E.ik3(hip, foot, d.L1 * S * o.long, d.L2 * S * o.long, [ox0 / ol0 * .7, oy0 / ol0 * .7, 1.3]);
      const H2 = P(hip), K = P(knee), F = P(ft), far = (H2[2] + K[2]) / 2 < bodyD - 1 * S, far2 = (K[2] + F[2]) / 2 < bodyD - 1 * S;
      const mid = [(hip[0] + knee[0]) / 2, (hip[1] + knee[1]) / 2, (hip[2] + knee[2]) / 2], mid2 = [(knee[0] + ft[0]) / 2, (knee[1] + ft[1]) / 2, (knee[2] + ft[2]) / 2];
      const r1 = Math.max(.7, (1 - sil) * .95 * sc), r2 = Math.max(.6, .78 * sc), r3 = Math.max(.5, .42 * sc);
      push(mid, () => { BST_limb(g0(), H2, K, r1, r2, T.leg, far, ol); if (r2 > 1.1) px.disc(g0(), K[0] - .4, K[1] - .5, Math.max(.6, r2 * .55), far ? T.joint.sh : T.joint.base); });
      push(mid2, () => { const G = g0(), band = [lerp(K[0], F[0], .3), lerp(K[1], F[1], .3), 0]; BST_limb(G, K, F, r2 * .92, r3, T.leg, far2, ol); if (r2 > 1.2) BST_cap(G, K, band, Math.max(.5, r2 * .6), Math.max(.5, r2 * .5), far2 ? T.leg.sh : T.leg.lt, -.4, -.4);
        const cl = P([ft[0] + ox0 / ol0 * .9 * S, ft[1] + oy0 / ol0 * .9 * S, ft[2] - .4 * S]); px.line(G, F[0], F[1], cl[0], cl[1], T.leg.deep); });
    }
    // ---- abdomen (with the markings), or the swollen egg sac of a brood mother ----
    const ay = this.abdY, cA = Math.cos(ay), sA = Math.sin(ay), aS = o.abd, eg = o.egg;
    const abdC = Bp(-.6 - 4.4 * aS * cA, -4.4 * aS * sA, .9 * aS + .3), aF = this.L(4.6 * aS * cA, 4.6 * aS * sA, .5 * aS), aR = this.L(-3.8 * aS * sA, 3.8 * aS * cA, 0), aZ = this.L(0, 0, 3.3 * aS);
    push(abdC, () => {
      const G = g0(), e = BST_ell(view, ox, oy, abdC, aF, aR, aZ); BST_ball(G, e, T.base, ol, false);
      const mk = (u, v, w) => BST_surf(view, ox, oy, abdC, aF, aR, aZ, u, v, w), mt = T.mark;
      if (o.pattern === 'chevron') for (const [u, k] of [[.5, .9], [.18, 1], [-.14, .9], [-.44, .7]]) { const a0 = mk(u + .12 * k, -.34 * k, .62), a1 = mk(u - .1 * k, 0, .8), a2 = mk(u + .12 * k, .34 * k, .62), a3 = mk(u - .02, 0, .8); if (a1[2]) { px.poly(G, [a0, a1, a2, a3], mt.base); px.line(G, a0[0], a0[1], a1[0], a1[1], mt.lt); } }
      else if (o.pattern === 'hourglass') { const q = [mk(.45, -.22, .78), mk(.45, .22, .78), mk(.05, 0, .96), mk(-.4, .24, .8), mk(-.4, -.24, .8), mk(.05, 0, .96)]; if (q[2][2]) { px.poly(G, [q[0], q[1], q[2]], mt.base); px.poly(G, [q[2], q[3], q[4]], mt.base); px.dot(G, q[2][0], q[2][1] - 1, mt.hi); } }
      else if (o.pattern === 'spots') for (const [u, v] of [[.4, -.4], [.4, .4], [0, -.5], [0, .5], [-.4, -.35], [-.4, .35], [.1, 0]]) { const a0 = mk(u, v, Math.sqrt(Math.max(0, 1 - u * u - v * v))); if (a0[2]) { px.disc(G, a0[0], a0[1], Math.max(.6, sc * .45), mt.base); px.dot(G, a0[0] - .5, a0[1] - .5, mt.hi); } }
      else if (o.pattern === 'bands') for (const u of [.55, .2, -.15, -.5]) { const pts = []; for (let v = -.9; v <= .91; v += .3) { const a0 = mk(u, v, Math.sqrt(Math.max(0, 1 - u * u - v * v))); if (a0[2]) pts.push(a0); } for (let i = 1; i < pts.length; i++) px.line(G, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], mt.base, Math.max(1, Math.round(sc * .5))); }
      const spn = mk(-.98, 0, .1); if (spn[2] || view.pitchDeg < 40) px.disc(G, spn[0], spn[1], Math.max(.6, sc * .35), T.belly.lt);
      if (eg > 0) this._sac(G, view, ox, oy, abdC, aF, aR, aZ, ol);
    });
    // ---- pedicel and cephalothorax (eyes on top), chelicerae and fangs, palps ----
    const cS = o.ceph, cC = Bp(2.2 * cS, 0, .1), cF = this.L(3 * cS, 0, -.25 * cS), cR = this.L(0, 2.6 * cS, 0), cZ = this.L(.3 * cS, 0, 2 * cS);
    push(Bp(-.5, 0, 0), () => { const a = P(Bp(-.2, 0, .1)), b = P(Bp(-1.4, 0, .4)); BST_cap(g0(), a, b, Math.max(.6, .9 * sc), Math.max(.6, .9 * sc), T.base.deep); });
    const glow = this.glow; glow.length = 0;
    push(cC, () => {
      const G = g0(), e = BST_ell(view, ox, oy, cC, cF, cR, cZ); BST_ball(G, e, T.base, ol, false);
      const mk = (u, v, w) => BST_surf(view, ox, oy, cC, cF, cR, cZ, u, v, w);
      const groove = [mk(.4, 0, .9), mk(-.5, 0, .85)]; if (groove[0][2] && sc > 1.3) px.line(G, groove[0][0], groove[0][1], groove[1][0], groove[1][1], T.base.sh);
      for (const [u, v, w, big] of [[.78, -.2, .56, 1], [.78, .2, .56, 1], [.62, -.46, .6, 0], [.62, .46, .6, 0], [.45, -.62, .62, 0], [.45, .62, .62, 0]]) {
        const q = mk(u, v, w); if (!q[2]) continue;
        const rr = big ? Math.max(.5, sc * .42) : Math.max(.4, sc * .26); px.disc(G, q[0], q[1], rr + (sc > 1.4 ? .6 : 0), '#140a10'); px.glow(G, 1); px.disc(G, q[0], q[1], rr, this.dead ? T.base.deep : C.eye); if (big && rr > .8) px.dot(G, q[0] - .5, q[1] - .6, '#ffffff');
        glow.push([q[3][0], q[3][1], q[3][2], rr]);
      }
    });
    const fo = W.fang, fangs = [];
    for (const s of [-1, 1]) {
      const c0 = Bp(2.2 * cS + 2.5 * cS, s * .8 * cS, -.7 * cS), c1 = Bp(2.2 * cS + 3.4 * cS + fo * .5, s * (.7 + fo * .5) * cS, -2 * cS + fo * .6);
      const tip = Bp(2.2 * cS + 3.6 * cS + fo * 1.6, s * (.15 + fo * 1.7) * cS, -2.7 * cS + fo * 1.2), mid = [(c0[0] + tip[0]) / 2, (c0[1] + tip[1]) / 2, (c0[2] + tip[2]) / 2];
      fangs.push(tip);
      push(mid, () => { const G = g0(), A0 = P(c0), B0 = P(c1), Tp = P(tip); BST_limb(G, A0, B0, Math.max(.6, .72 * sc), Math.max(.55, .6 * sc), T.base, false, ol); px.line(G, B0[0], B0[1], Tp[0], Tp[1], T.fang.base, Math.max(1, Math.round(sc * .4))); px.dot(G, Tp[0], Tp[1], T.fang.deep); });
      if (o.palps) { const p0 = Bp(2.2 * cS + 2.2 * cS, s * 1.5 * cS, -.4 * cS), tw = Math.sin(this.t * 6 + s * 1.7) * .8 + W.rear * 2, p1 = Bp(2.2 * cS + 4 * cS, s * 2.3 * cS, .6 + tw), p2 = Bp(2.2 * cS + 5.6 * cS, s * 2.1 * cS, -1.6 * cS + tw * .6 + W.rear * 2 - (1 - W.rear) * 1.2);
        push(p1, () => { const G = g0(), A0 = P(p0), B0 = P(p1), C0 = P(p2); BST_limb(G, A0, B0, Math.max(.5, .45 * sc), Math.max(.5, .4 * sc), T.leg, false, ol); BST_limb(G, B0, C0, Math.max(.5, .4 * sc), Math.max(.5, .45 * sc), T.leg, false, ol); }); }
    }
    this.fangTips = fangs;
    // draw: into one image (a small crawler through r.actor) or part by part (bosses)
    let gg = g; function g0() { return gg; }
    if (!Q) { ops.sort((a, b) => a.d - b.d); for (const op of ops) op.f(); return; }
    for (const op of ops) Q.r.queue(rx + op.ax, ry + op.ay, Math.max(0, op.az), G => { gg = G; if (Q.alpha < 1) px.blend(G, Q.alpha, 'normal', op.f); else op.f(); }, { bias: Q.bias || 0 });
  }
  /** hit flash for bodies drawn part by part: every tone pulled toward the flash color */
  _flashT(c) { const k = c + '|', F = this._ft || (this._ft = {}); if (!F[k]) { F[k] = {}; for (const n in this.T) F[k][n] = E.tones(E.mix(this.C[n], c, .65)); } return F[k]; }
  /** a brood mother's egg sac: a pale swollen membrane behind the abdomen, eggs showing through, veins, a pulse */
  _sac(G, view, ox, oy, c, a, b, d, ol) {
    const T = this.T, k = 1 + .05 * Math.sin(this.t * 3.1), e = this.o.egg, back = [c[0] - a[0] * .55, c[1] - a[1] * .55, c[2] - a[2] * .55 - d[2] * .15];
    const sa = a.map(v => v * .95 * e * k), sb = b.map(v => v * 1.18 * e * k), sd = d.map(v => v * 1.08 * e * k), el = BST_ell(view, ox, oy, back, sa, sb, sd);
    BST_ball(G, el, T.sac, ol, false);
    for (let i = 0; i < 14; i++) {
      const u = -.7 + (i % 5) * .32 + ((i / 5 | 0) & 1) * .16, v = ((i / 5 | 0) - 1) * .5, w = Math.sqrt(Math.max(0, 1 - u * u - v * v)); if (w <= .15) continue;
      const q = BST_surf(view, ox, oy, back, sa, sb, sd, u, v, w * .98); if (!q[2]) continue;
      const pr = Math.max(.6, el.rmin * .13 * (1 + .25 * Math.sin(this.t * 4 + i * 1.7)));
      px.disc(G, q[0], q[1], pr + .5, T.sac.sh); px.disc(G, q[0] - .4, q[1] - .4, pr, T.sac.hi);
    }
    for (let i = 0; i < 5; i++) { const v = -.6 + i * .3, q0 = BST_surf(view, ox, oy, back, sa, sb, sd, .6, v, .7), q1 = BST_surf(view, ox, oy, back, sa, sb, sd, -.2 + (i % 2) * .2, v * 1.2, .95); if (q0[2] && q1[2]) px.line(G, q0[0], q0[1], q1[0], q1[1], this.C.vein); }
  }
}
const V3lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
/** where a foot lands: its rest spot, or (if that is inside a wall) gripping the wall face a little way up, like a spider */
function BST_footAt(x, y, bx, by, seed) {
  const map = ED.L && ED.L.map; if (!map || !map.solidAt(x, y)) return [x, y, 0];
  const dx = x - bx, dy = y - by, d = Math.hypot(dx, dy) || 1; let k = d;
  while (k > 0 && map.solidAt(bx + dx / d * k, by + dy / d * k)) k -= 1.2;
  const h = Math.min(18, map.heightAt(x, y));
  return [bx + dx / d * (k + 1.4), by + dy / d * (k + 1.4), Math.min(h - 1, 3 + seed * 7)];
}
function P0dust(x, y, n) { P.dust(x, y, 0, Math.round(clamp(n / 3, 1, 8)), { speed: 20 + n * 2, color: '#8a7a6a' }); }
