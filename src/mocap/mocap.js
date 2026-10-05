/* =============================================================================
 * MOCAP  plays imported skeletal animation (tools/anim-import.mjs output) on my-3D2dge rigs.
 *   const lib = Mocap.load(window.MOCAP.UAL);          // decode once
 *   const clip = lib.clip('Dance_Loop');               // { name, n, dur, loop, fps }
 *   const pose = lib.sample(clip, t);                  // Float32Array: every point's f r z (mm), interpolated
 *   const man = new Mocap.Mannequin(lib, { height: 34 });  man.draw(g, ox, oy, view, pose, facing)
 *   lib.variant(clip, lib.reduce(clip, 10))           // key poses only (10 mm max error), played by in-betweening
 *   const R = Mocap.readable(lib); R.text(R.encode(clip, keys))   // the readable format for AI models (see LEGEND)
 *   Mocap.drive(humanoid, lib)  then  humanoid.mocap = pose  each step: the rig plays it (retargeted to its build);
 *   humanoid.mocapBlade = true while the clip holds a sword (the blade then follows the fist)
 * Points are in the rig's local frame: f = forward, r = right, z = up, centred on the root on the ground.
 * ============================================================================= */
const Mocap = (() => {
'use strict';
const E = My3D2dge, { px } = E;

/* ---- decoding and sampling ---- */
const b64 = s => { const bin = atob(s), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return new Int16Array(u8.buffer); };
function load(raw) {
  const P = raw.points.length, idx = {}; raw.points.forEach((p, i) => idx[p] = i);
  const clips = {};
  for (const [name, c] of Object.entries(raw.clips)) clips[name] = { name, n: c.n, dur: c.dur, loop: c.loop, fps: raw.fps, data: b64(c.data), move: c.move ? b64(c.move) : null };
  const lib = { raw, P, idx, clips, body: raw.body, names: Object.keys(clips), fps: raw.fps };
  lib.clip = name => clips[name] || null;
  /** the pose at time t (seconds): frames are interpolated, loops wrap, one-shots hold their last frame.
   *  A reduced clip (lib.variant) keeps only some frames (clip.kf) and in-betweens the rest */
  lib.sample = (clip, t, out = new Float32Array(P * 3)) => {
    const n = clip.n, u = Math.max(0, t) * clip.fps, f = clip.loop ? u % Math.max(1, n - 1) : Math.min(u, n - 1), D = clip.data, kf = clip.kf;
    let a, b, k;
    if (kf) { let lo = 0, hi = kf.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (kf[m] <= f) lo = m; else hi = m; } k = Math.min(1, (f - kf[lo]) / ((kf[hi] - kf[lo]) || 1)); a = lo * P * 3; b = hi * P * 3; }
    else { const i0 = Math.floor(f); k = f - i0; a = i0 * P * 3; b = Math.min(n - 1, i0 + 1) * P * 3; }
    for (let i = 0; i < P * 3; i++) out[i] = D[a + i] + (D[b + i] - D[a + i]) * k;
    return out;
  };
  /** the largest distance between matching body points of two poses (mm); the finger helpers that only aim a blade are left out */
  const shown = raw.points.map((p, i) => /^(index|pinky)/.test(p) ? -1 : i * 3).filter(i => i >= 0);
  lib.error = (A, B) => { let w = 0; for (const i of shown) w = Math.max(w, (A[i] - B[i]) ** 2 + (A[i + 1] - B[i + 1]) ** 2 + (A[i + 2] - B[i + 2]) ** 2); return Math.sqrt(w); };
  /**
   * key poses: the fewest frames such that in-betweening the rest is never more than tol mm off any captured frame
   * (a Ramer-Douglas-Peucker pass over whole poses). Smooth motion needs few keys, fast curving motion keeps many.
   */
  lib.reduce = (clip, tol) => {
    const D = clip.data, n = clip.n, keep = [0, n - 1], tmp = new Float32Array(P * 3);
    const off = (a, b, i) => { const t = (i - a) / (b - a); for (let j = 0; j < P * 3; j++) tmp[j] = D[a * P * 3 + j] + (D[b * P * 3 + j] - D[a * P * 3 + j]) * t; return lib.error(tmp, D.subarray(i * P * 3, (i + 1) * P * 3)); };
    const go = (a, b) => { if (b - a < 2) return; let wi = -1, we = 0; for (let i = a + 1; i < b; i++) { const e = off(a, b, i); if (e > we) { we = e; wi = i; } } if (we > tol) { keep.push(wi); go(a, wi); go(wi, b); } };
    if (n > 1) go(0, n - 1);
    return [...new Set(keep)].sort((x, y) => x - y);
  };
  /** a copy of a clip that keeps only the frames kf (played by in-betweening): the compression options */
  lib.variant = (clip, kf) => {
    const data = new Int16Array(kf.length * P * 3); kf.forEach((f, j) => data.set(clip.data.subarray(f * P * 3, (f + 1) * P * 3), j * P * 3));
    return Object.assign({}, clip, { kf, data });
  };
  /** root motion (clips that travel): the root's [f, r] in mm at time t, or null */
  lib.moveAt = (clip, t) => {
    if (!clip.move) return null;
    const n = clip.n, f = Math.min(Math.max(0, t) * clip.fps, n - 1), i0 = Math.floor(f), i1 = Math.min(n - 1, i0 + 1), k = f - i0, M = clip.move;
    return [M[i0 * 2] + (M[i1 * 2] - M[i0 * 2]) * k, M[i0 * 2 + 1] + (M[i1 * 2 + 1] - M[i0 * 2 + 1]) * k];
  };
  /** a pose blended from a to b (crossfades between clips) */
  lib.blend = (a, b, k, out = new Float32Array(P * 3)) => { for (let i = 0; i < P * 3; i++) out[i] = a[i] + (b[i] - a[i]) * k; return out; };
  lib.pt = (pose, name) => { const i = idx[name] * 3; return [pose[i], pose[i + 1], pose[i + 2]]; };
  return lib;
}

/* ---- the look-alike mannequin: shaded capsules in the source model's proportions, with its joint bands ---- */
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const add3 = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm3 = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
class Mannequin {
  /** o: { height: world units tall (34), main: '#e8aa3a', joint: '#aa66db' } (the colors of the source model's two materials) */
  constructor(lib, o = {}) {
    this.lib = lib; this.o = Object.assign({ height: 34, main: '#e8aa3a', joint: '#aa66db' }, o);
    this.k = this.o.height / lib.body.height;   // world units per mm
    this._ops = [];
  }
  /**
   * draw the pose into g with (ox, oy) = the projected root. Every part is a capsule between two body points,
   * sorted by true camera depth, drawn dark-then-lit like the engine's HD rigs.
   */
  draw(g, ox, oy, view, pose, facing = 0) {
    const L = this.lib, o = this.o, k = this.k, ca = Math.cos(facing), sa = Math.sin(facing), sc = view.scale;
    const pt = name => L.pt(pose, name);
    const S = p => { const wx = (p[0] * ca - p[1] * sa) * k, wy = (p[0] * sa + p[1] * ca) * k, wz = p[2] * k; return [ox + view.ax * wx + view.ay * wy, oy + view.bx * wx + view.by * wy + view.bz * wz, view.dx * wx + view.dy * wy + view.dz * wz]; };
    const R = mm => mm * k * sc;   // a radius in mm -> screen pixels
    const ops = this._ops; ops.length = 0;
    const main = E.tones(o.main), joint = E.tones(o.joint);
    // centre depth of the body: parts behind it are drawn a touch darker (the far arm and leg)
    const mid = S(pt('spine1'))[2];
    const capsule = (A, B, ra, rb, col, dx = 0, dy = 0) => {
      const ax = A[0] + dx, ay = A[1] + dy, bx = B[0] + dx, by = B[1] + dy, vx = bx - ax, vy = by - ay, l = Math.hypot(vx, vy);
      if (l > .01) { const nx = -vy / l, ny = vx / l; px.poly(g, [[ax + nx * ra, ay + ny * ra], [bx + nx * rb, by + ny * rb], [bx - nx * rb, by - ny * rb], [ax - nx * ra, ay - ny * ra]], col); }
      px.disc(g, ax, ay, Math.max(.5, ra - .3), col); px.disc(g, bx, by, Math.max(.5, rb - .3), col);
    };
    // a shaded part: dark silhouette, the base color shifted toward the light (upper left), a soft highlight
    const part = (a, b, ra, rb, T, bias = 0) => {
      const A = S(a), B = S(b), pa = R(ra), pb = R(rb), far = (A[2] + B[2]) * .5 < mid - 2 * k * 60;
      ops.push({ d: (A[2] + B[2]) * .5 + bias, f: () => {
        capsule(A, B, pa, pb, far ? T.deep : T.sh);
        capsule(A, B, Math.max(.5, pa - .9), Math.max(.5, pb - .9), far ? T.sh : T.base, -.5, -.6);
        if (pa > 2.2 && !far) capsule(A, B, pa * .32, pb * .32, T.lt, -pa * .38, -pa * .42);
      } });
    };
    // a ring painted round a limb (the second material): a straight-edged stripe across the capsule, no round ends,
    // so a thin band reads as a band from every side. Seen end-on (the limb points at the camera) it is hidden.
    const band = (a, b, t0, t1, ra, rb, T) => {
      const A = S(lerp3(a, b, t0)), B = S(lerp3(a, b, t1)), axis = S(a), end = S(b), vx = end[0] - axis[0], vy = end[1] - axis[1], l = Math.hypot(vx, vy);
      if (l < R(Math.max(ra, rb)) * .5) return;
      const nx = -vy / l, ny = vx / l, wa = R(ra + (rb - ra) * t0) + .2, wb = R(ra + (rb - ra) * t1) + .2;
      ops.push({ d: (axis[2] + end[2]) * .5 + .02, f: () => {
        const q = (w0, w1, dx, dy) => [[A[0] + nx * w0 + dx, A[1] + ny * w0 + dy], [B[0] + nx * w1 + dx, B[1] + ny * w1 + dy], [B[0] - nx * w1 + dx, B[1] - ny * w1 + dy], [A[0] - nx * w0 + dx, A[1] - ny * w0 + dy]];
        px.poly(g, q(wa, wb, 0, 0), T.sh); px.poly(g, q(Math.max(.5, wa - .9), Math.max(.5, wb - .9), -.5, -.6), T.base);
      } });
    };

    const pelvis = pt('pelvis'), sp1 = pt('spine1'), sp2 = pt('spine2'), chest = pt('chest'), neck = pt('neck'), head = pt('head'), top = pt('headTop'), face = pt('faceF'), chestF = pt('chestF');
    const fwdC = norm3(sub3(chestF, chest)), fwdH = norm3(sub3(face, head));
    // legs: thigh, shin, foot (heel to ball), toes; purple at the hip, knee and ankle
    for (const s of ['L', 'R']) {
      const hip = pt('hip' + s), knee = pt('knee' + s), ank = pt('ankle' + s), b = pt('ball' + s), toe = pt('toe' + s);
      const heel = add3(lerp3(ank, b, -.28), [0, 0, -1], 45);
      part(hip, knee, 80, 60, main); band(hip, knee, .02, .1, 80, 62, joint);
      part(knee, ank, 56, 40, main); band(knee, ank, .86, 1, 56, 41, joint);
      band(hip, knee, .9, 1, 80, 60, joint); band(knee, ank, 0, .1, 56, 40, joint);   // the knee ring
      part(heel, b, 44, 40, main, .005); part(b, toe, 38, 28, main, .006);
    }
    // torso: pelvis, a waist band, belly, a broad chest that runs shoulder to shoulder
    const shL = pt('shL'), shR = pt('shR'), clL = pt('clavL'), clR = pt('clavR');
    part(pt('hipL'), pt('hipR'), 92, 92, main, -.01);
    part(pelvis, sp1, 118, 112, main);
    part(sp1, sp2, 104, 112, main);
    band(sp1, sp2, .1, .26, 108, 112, joint);
    const pecL = add3(lerp3(chest, shL, .38), fwdC, 22), pecR = add3(lerp3(chest, shR, .38), fwdC, 22), up = norm3(sub3(neck, sp2));
    part(sp2, add3(chest, up, 40), 122, 132, main);
    part(add3(pecL, up, -30), add3(pecR, up, -30), 112, 112, main, .01);
    // neck (purple) and an egg-shaped head: a narrow jaw forward, a round crown
    part(add3(neck, up, -20), lerp3(head, top, .25), 48, 46, joint);
    const jaw = add3(lerp3(head, top, .3), fwdH, 26), crown = lerp3(head, top, .64);
    part(jaw, crown, 70, 96, main, .02);
    // arms: shoulder cap, upper arm, forearm, fist; purple elbow and wrist
    for (const s of ['L', 'R']) {
      const cl = s === 'L' ? clL : clR, sh = s === 'L' ? shL : shR, el = pt('elbow' + s), wr = pt('wrist' + s), kn = pt('knuck' + s), fist = pt('fist' + s);
      part(lerp3(cl, sh, .45), sh, 62, 68, main);
      part(sh, el, 62, 46, main); band(sh, el, .9, 1, 62, 46, joint);
      part(el, wr, 46, 34, main); band(el, wr, 0, .1, 46, 34, joint); band(el, wr, .86, 1, 46, 35, joint);
      part(wr, lerp3(kn, fist, .5), 36, 38, main, .005);
    }
    ops.sort((a, b) => a.d - b.d);
    for (const op of ops) op.f();
  }
}

/* ---- retarget onto a Humanoid: the clip's directions, the rig's own bone lengths, feet planted with IK ---- */
const V = E.V3, dist = (a, b) => V.len(V.sub(a, b));
/**
 * Mocap.drive(rig, lib): after the rig poses itself each step it takes the pose in rig.mocap (a sampled pose, or
 * null to play its own animation). The rig keeps its build: each bone takes the clip's direction at its own length,
 * the feet and hands are placed in proportion and solved with the engine's two-bone IK, so the cape and hair follow.
 */
function drive(rig, lib) {
  const base = E.Humanoid.prototype._pose, tpose = lib.sample(lib.clip('A_TPose') || lib.clip(lib.names[0]), 0);
  const P = n => lib.pt(tpose, n), hipH = (P('hipL')[2] + P('hipR')[2]) / 2;
  const legSrc = dist(P('hipL'), P('kneeL')) + dist(P('kneeL'), P('ankleL')), armSrc = dist(P('shL'), P('elbowL')) + dist(P('elbowL'), P('wristL')) + dist(P('wristL'), P('fistL')) * .6;
  const ankleH = P('ankleL')[2];
  rig._pose = function () {
    base.call(this);
    const pose = this.mocap; if (!pose) return;
    const o = this.o, J = this.J, pt = n => lib.pt(pose, n), k = o.hipZ / hipH;
    const mid = (a, b) => V.lerp(pt(a), pt(b), .5);
    const hipsS = mid('hipL', 'hipR'), shS = mid('shL', 'shR');
    const hipC = V.mul(hipsS, k), across = V.norm(V.sub(pt('hipR'), pt('hipL')));
    J.hipC = hipC; J.hipL = V.add(hipC, V.mul(across, -o.hipHalf)); J.hipR = V.add(hipC, V.mul(across, o.hipHalf));
    const legK = (o.legUpper + o.legLower) / legSrc;
    for (const s of ['L', 'R']) {
      const hip = J['hip' + s], hipSrc = pt('hip' + s), ank = pt('ankle' + s), knee = pt('knee' + s);
      const footSrc = V.sub(ank, [0, 0, ankleH * Math.min(1, Math.max(0, 1 - (ank[2] - ankleH) / 300))]);   // the sole, not the ankle, touches the ground
      let foot = V.add(hip, V.mul(V.sub(footSrc, hipSrc), legK)); if (foot[2] < 0) foot = [foot[0], foot[1], 0];
      const hint = V.norm(V.sub(knee, V.lerp(hipSrc, ank, .5)));
      const [kn, ft] = E.ik3(hip, foot, o.legUpper, o.legLower, hint); J['knee' + s] = kn; J['foot' + s] = ft;
    }
    J.shC = V.add(hipC, V.mul(V.norm(V.sub(shS, hipsS)), o.torso));
    const sAcross = V.norm(V.sub(pt('shR'), pt('shL')));
    J.shL = V.add(J.shC, V.mul(sAcross, -o.shoulderHalf)); J.shR = V.add(J.shC, V.mul(sAcross, o.shoulderHalf));
    const headC = V.lerp(pt('head'), pt('headTop'), .45);
    J.head = V.add(J.shC, V.mul(V.norm(V.sub(headC, shS)), o.neck + o.headR));
    const armK = (o.armUpper + o.armLower) / armSrc;
    for (const s of ['L', 'R']) {
      const sh = J['sh' + s], shSrc = pt('sh' + s), fist = pt('fist' + s), el = pt('elbow' + s);
      const hand = V.add(sh, V.mul(V.sub(fist, shSrc), armK));
      const hint = V.norm(V.sub(el, V.lerp(shSrc, fist, .5)));
      const [e, h] = E.ik3(sh, hand, o.armUpper, o.armLower, hint); J['elbow' + s] = e; J['hand' + s] = h;
    }
    // a sword in a fist runs along the knuckles, out past the index finger (rig.mocapBlade: the clip holds a weapon;
    // otherwise the blade keeps the rig's own resting angle)
    if (this.mocapBlade) J.bladeDir = V.norm(V.sub(pt('indexR'), pt('pinkyR')));
  };
  return rig;
}

/* =============================================================================
 * READABLE KEY POSES: the format for AI models (and people) to read, pick and edit.
 * A clip is a short list of key poses. Each pose names what an animator would: where the hips are, how the body,
 * chest and head turn and lean, and where each hand and foot is relative to its shoulder or hip, as a fraction of
 * that limb's length. It does not depend on body size, so the same clip fits any build; it mirrors by swapping L and R.
 * Limbs are positions, not angles, on purpose: an arm swinging through straight down has no angle flip, and an IK
 * rig (the engine's Humanoid) consumes exactly this. readable.pose() rebuilds every body point from it.
 * ============================================================================= */
const LEGEND = `// my-3D2dge readable clip. Times in seconds; every other number is a whole number. Rig frame: forward, right, up.
// L and R are the figure's own sides. Directions are percentages and need not add up: [100, 0, 0] and [50, 0, 0] agree.
// hips   [forward, right, up]   the pelvis, in percent of standing hip height (100 = standing, 55 = sitting on a chair)
// body   [turn, lean, tilt]     the pelvis, degrees: turn + = toward the right, lean + = forward, tilt + = toward the right
// chest  [turn, lean, tilt]     the chest, relative to the pelvis        head [turn, lean, tilt]  relative to the chest
// armL armR  [forward, out, up, bend, twist]  which way the arm points from the shoulder to the fist, in chest space
//            (out + = away from the body on that side; [0, 0, -100] hangs down, [100, 0, 0] punches ahead);
//            bend = elbow bend in degrees (0 = straight); twist = degrees the elbow swings round the arm from its
//            natural direction (back and down)
// legL legR  [forward, out, up, bend, twist]  hip to ankle in pelvis space; bend: the knee; twist: from pointing forward
// shL shR    [reach, shrug]     degrees the shoulder swings forward (into a punch or an aim) and up, from rest
// footL footR [down, out, toes]   degrees the foot points down from standing, turns outward, and the toes bend up
// blade  [forward, right, up]   (sword clips) the direction of a blade held in the right fist, in chest space`;
const RV = {
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len: a => Math.hypot(a[0], a[1], a[2]),
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
};
// a frame is [F, R, U]: its forward, right and up axes written in the parent's coordinates (f x r = u)
const frameFR = (right, fwd) => { const R = RV.norm(right), F = RV.norm(RV.sub(fwd, RV.mul(R, RV.dot(fwd, R)))); return [F, R, RV.cross(F, R)]; };
const frameUF = (up, fwd) => { const U = RV.norm(up), F = RV.norm(RV.sub(fwd, RV.mul(U, RV.dot(fwd, U)))); return [F, RV.cross(U, F), U]; };
const loc = (M, v) => [RV.dot(v, M[0]), RV.dot(v, M[1]), RV.dot(v, M[2])];
const wld = (M, l) => [M[0][0] * l[0] + M[1][0] * l[1] + M[2][0] * l[2], M[0][1] * l[0] + M[1][1] * l[1] + M[2][1] * l[2], M[0][2] * l[0] + M[1][2] * l[1] + M[2][2] * l[2]];
const rel = (Pm, Cm) => Cm.map(c => loc(Pm, c));          // child frame in parent coordinates
const compose = (Pm, Rm) => Rm.map(c => wld(Pm, c));      // parent then relative -> child in the grandparent's coordinates
const DG = Math.PI / 180;
// rotations as quaternions [x, y, z, w], to spread a bend over the spine and the neck
const quatOf = M => {   // frame [F, R, U] (columns) -> quaternion
  const [m00, m10, m20] = M[0], [m01, m11, m21] = M[1], [m02, m12, m22] = M[2], tr = m00 + m11 + m22;
  let q;
  if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; q = [(m21 - m12) / s, (m02 - m20) / s, (m10 - m01) / s, s / 4]; }
  else if (m00 > m11 && m00 > m22) { const s = Math.sqrt(1 + m00 - m11 - m22) * 2; q = [s / 4, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s]; }
  else if (m11 > m22) { const s = Math.sqrt(1 + m11 - m00 - m22) * 2; q = [(m01 + m10) / s, s / 4, (m12 + m21) / s, (m02 - m20) / s]; }
  else { const s = Math.sqrt(1 + m22 - m00 - m11) * 2; q = [(m02 + m20) / s, (m12 + m21) / s, s / 4, (m10 - m01) / s]; }
  const l = Math.hypot(...q); return q.map(v => v / l);
};
const qmul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
const qconj = q => [-q[0], -q[1], -q[2], q[3]];
const qrot = (q, v) => { const p = qmul(qmul(q, [v[0], v[1], v[2], 0]), qconj(q)); return [p[0], p[1], p[2]]; };
const qslerp = (a, b, t) => {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3], bb = b; if (d < 0) { d = -d; bb = b.map(v => -v); }
  if (d > .9995) { const o = a.map((v, i) => v + (bb[i] - v) * t), l = Math.hypot(...o); return o.map(v => v / l); }
  const th = Math.acos(d), k0 = Math.sin((1 - t) * th) / Math.sin(th), k1 = Math.sin(t * th) / Math.sin(th);
  return a.map((v, i) => v * k0 + bb[i] * k1);
};
/** the rotation that takes rest frame A to frame B (both [F, R, U]), as a quaternion */
const qFromTo = (A, B) => qmul(quatOf(B), qconj(quatOf(A)));
/** degrees [turn, lean, tilt] of a frame: yaw about up, then pitch about right (+ = forward), then roll (+ = toward the right) */
function euler(M) {
  const [F, , U] = M, yaw = Math.atan2(F[1], F[0]), pitch = Math.asin(Math.max(-1, Math.min(1, -F[2])));
  const cy = Math.cos(yaw), sy = Math.sin(yaw), u1 = [U[0] * cy + U[1] * sy, -U[0] * sy + U[1] * cy, U[2]], cp = Math.cos(pitch), sp = Math.sin(pitch);
  const u2 = [u1[0] * cp - u1[2] * sp, u1[1], u1[0] * sp + u1[2] * cp];
  return [yaw / DG, pitch / DG, -Math.atan2(-u2[1], u2[2]) / DG];
}
function fromEuler(a) {
  const y = a[0] * DG, p = a[1] * DG, r = -a[2] * DG, cy = Math.cos(y), sy = Math.sin(y), cp = Math.cos(p), sp = Math.sin(p), cr = Math.cos(r), sr = Math.sin(r);
  const rot = v => { let [x, yy, z] = v; [yy, z] = [yy * cr - z * sr, yy * sr + z * cr]; [x, z] = [x * cp + z * sp, -x * sp + z * cp]; return [x * cy - yy * sy, x * sy + yy * cy, z]; };
  return [rot([1, 0, 0]), rot([0, 1, 0]), rot([0, 0, 1])];
}
/** a two-bone limb: the bend at the middle joint (degrees, 0 = straight) for a root-to-end distance, and back */
const bendOf = (dist, L1, L2) => 180 - Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + L2 * L2 - dist * dist) / (2 * L1 * L2)))) / DG;
const reachOf = (bend, L1, L2) => Math.sqrt(Math.max(0, L1 * L1 + L2 * L2 + 2 * L1 * L2 * Math.cos(bend * DG)));
const unwrap = (v, prev) => prev === undefined ? v : v + 360 * Math.round((prev - v) / 360);
const r0 = v => Math.round(v);
// the natural direction elbows (back, out, down) and knees (forward) bend, in chest and pelvis space. A twist is
// measured from it round the limb, which is undefined when the limb points along it (an arm swung back and out, a
// knee pulled up in a roll): approaching that, the reference blends smoothly into a second one, so twists stay
// continuous between key poses. Both sides compute it from the stored direction, so they always agree.
const HINT = { arm: s => [-1, s * .5, -.3], leg: s => [1, s * .1, 0] }, HINT2 = { arm: s => [0, -s * .3, 1], leg: s => [-.2, s * .2, -1] };
const across = (h, d) => RV.norm(RV.sub(h, RV.mul(d, RV.dot(h, d))));
const hintFor = (limb, s, M, dLocal) => {
  const d = RV.norm(dLocal), h1 = RV.norm(HINT[limb](s)), a = Math.abs(RV.dot(h1, d)), w = Math.min(1, Math.max(0, (a - .6) / .3)), k = w * w * (3 - 2 * w);
  const n = k <= 0 ? across(h1, d) : k >= 1 ? across(RV.norm(HINT2[limb](s)), d) : RV.norm(RV.add(RV.mul(across(h1, d), 1 - k), RV.mul(across(RV.norm(HINT2[limb](s)), d), k)));
  return wld(M, n);
};
/** the signed angle (degrees) round axis d from hint h to the bend direction b */
const poleOf = (d, h, b) => { const hn = RV.norm(RV.sub(h, RV.mul(d, RV.dot(h, d)))), bn = RV.norm(RV.sub(b, RV.mul(d, RV.dot(b, d)))); return Math.atan2(RV.dot(RV.cross(hn, bn), d), RV.dot(hn, bn)) / DG; };
const poleHint = (d, h, deg) => { const hn = RV.norm(RV.sub(h, RV.mul(d, RV.dot(h, d)))), a = deg * DG; return RV.add(RV.mul(hn, Math.cos(a)), RV.mul(RV.cross(d, hn), Math.sin(a))); };

function readable(lib) {
  const T = lib.sample(lib.clip('A_TPose') || lib.clip(lib.names[0]), 0), q = n => lib.pt(T, n);
  // rest measurements of the source body (mm), taken once from its T-pose
  // the chest turns with the upper spine bone (not the shoulders, which shrug and reach on their own)
  const Pr = frameFR(RV.sub(q('hipR'), q('hipL')), RV.sub(q('pelvisF'), q('pelvis'))), Cr = frameUF(RV.sub(q('neck'), q('chest')), RV.sub(q('chestF'), q('chest')));
  const Hr = frameUF(RV.sub(q('headTop'), q('head')), RV.sub(q('faceF'), q('head')));
  const H0 = q('pelvis')[2], d = (a, b) => RV.len(RV.sub(q(a), q(b)));
  const R = {
    hip: { L: loc(Pr, RV.sub(q('hipL'), q('pelvis'))), R: loc(Pr, RV.sub(q('hipR'), q('pelvis'))) },
    // the spine's four bones at rest; in motion each turns part of the way from the hips' rotation to the chest's
    spine: [RV.sub(q('spine1'), q('pelvis')), RV.sub(q('spine2'), q('spine1')), RV.sub(q('chest'), q('spine2')), RV.sub(q('neck'), q('chest'))],
    neckSeg: RV.sub(q('head'), q('neck')),
    clav: { L: loc(Cr, RV.sub(q('clavL'), q('neck'))), R: loc(Cr, RV.sub(q('clavR'), q('neck'))) },
    cv: { L: loc(Cr, RV.sub(q('shL'), q('clavL'))), R: loc(Cr, RV.sub(q('shR'), q('clavR'))) },   // collarbone: pivot to shoulder
    topH: loc(Hr, RV.sub(q('headTop'), q('head'))), faceH: loc(Hr, RV.sub(q('faceF'), q('head'))),
    up: d('shL', 'elbowL'), fore: d('elbowL', 'wristL'), knuck: d('knuckL', 'wristL'), fist: d('fistL', 'wristL'),
    thigh: d('hipL', 'kneeL'), shin: d('kneeL', 'ankleL'), ab: d('ankleL', 'ballL'), bt: d('ballL', 'toeL'),
    abPitch: Math.asin((q('ankleL')[2] - q('ballL')[2]) / d('ankleL', 'ballL')) / DG, btPitch: Math.asin((q('ballL')[2] - q('toeL')[2]) / d('ballL', 'toeL')) / DG
  };
  R.lower = R.fore + R.fist; R.arm = R.up + R.lower; R.leg = R.thigh + R.shin;   // the hand is the end of the arm: fists land where they should
  // how much of the hips-to-chest turn each spine bone takes (and the neck between chest and head) differs per library
  // (how its animators posed the spine): fitted once from the clips themselves, the share that best predicts every bone
  {
    const sub = RV.sub, fr = X => { const pt = n => lib.pt(X, n); return { P: frameFR(sub(pt('hipR'), pt('hipL')), sub(pt('pelvisF'), pt('pelvis'))), C: frameUF(sub(pt('neck'), pt('chest')), sub(pt('chestF'), pt('chest'))), H: frameUF(sub(pt('headTop'), pt('head')), sub(pt('faceF'), pt('head'))) }; };
    const samples = []; for (const n of lib.names) { const c = lib.clip(n); for (let f = 0; f < c.n; f += Math.max(1, Math.floor(c.n / 6))) samples.push(lib.sample(c, f / c.fps)); }
    const frames = samples.map(X => { const F = fr(X); return { X, qP: qFromTo(Pr, F.P), qC: qFromTo(Cr, F.C), qH: qFromTo(Hr, F.H) }; });
    const fit = (a, b, from, to, rest) => { let best = 0, be = Infinity; for (let w = 0; w <= 1.0001; w += .05) { let e = 0; for (const S of frames) { const v = qrot(qslerp(S[from], S[to], w), rest), act = sub(lib.pt(S.X, b), lib.pt(S.X, a)); e += RV.len(sub(v, act)); } if (e < be) { be = e; best = w; } } return Math.round(best * 100) / 100; };
    R.spineW = [fit('pelvis', 'spine1', 'qP', 'qC', R.spine[0]), fit('spine1', 'spine2', 'qP', 'qC', R.spine[1]), fit('spine2', 'chest', 'qP', 'qC', R.spine[2]), 1];
    R.neckW = fit('neck', 'head', 'qC', 'qH', R.neckSeg);
  }
  const SG = { L: -1, R: 1 };
  /** the torso and head frames and the joints placed from them (shared by encode and decode, so rounding never drifts) */
  function torso(k) {
    const p = RV.mul(k.hips, H0 / 100), RP = fromEuler(k.body), RC = compose(RP, fromEuler(k.chest)), RH = compose(RC, fromEuler(k.head));
    const qP = qFromTo(Pr, RP), qC = qFromTo(Cr, RC), qH = qFromTo(Hr, RH), sp = [p];
    R.spineW.forEach((w, i) => sp.push(RV.add(sp[i], qrot(qslerp(qP, qC, w), R.spine[i]))));
    const neck = sp[4], head = RV.add(neck, qrot(qslerp(qC, qH, R.neckW), R.neckSeg));
    const sh = s => { const sv = k['sh' + s] || [0, 0], v0 = R.cv[s], L = RV.len(v0), az = Math.atan2(v0[0], v0[1] * SG[s]) + sv[0] * DG, el = Math.asin(v0[2] / L) + sv[1] * DG;
      return RV.add(RV.add(neck, wld(RC, R.clav[s])), wld(RC, [L * Math.cos(el) * Math.sin(az), SG[s] * L * Math.cos(el) * Math.cos(az), L * Math.sin(el)])); };
    return { p, RP, RC, RH, spine1: sp[1], spine2: sp[2], chest: sp[3], neck, head, sh, hip: s => RV.add(p, wld(RP, R.hip[s])) };
  }
  const limbEnd = (root, M, v, s, len) => RV.add(root, wld(M, [v[0] * len, v[1] * SG[s] * len, v[2] * len]));
  /** one key pose from captured body points */
  function encodePose(X, prev) {
    const pt = n => lib.pt(X, n), k = {};
    const pr = prev || {}, uw = (a, b) => a.map((v, i) => r0(unwrap(v, b && b[i])));
    k.hips = pt('pelvis').map(v => r0(v / H0 * 100));
    const RPx = frameFR(RV.sub(pt('hipR'), pt('hipL')), RV.sub(pt('pelvisF'), pt('pelvis')));
    const RCx = frameUF(RV.sub(pt('neck'), pt('chest')), RV.sub(pt('chestF'), pt('chest')));
    const RHx = frameUF(RV.sub(pt('headTop'), pt('head')), RV.sub(pt('faceF'), pt('head')));
    k.body = uw(euler(RPx), pr.body);
    k.chest = uw(euler(rel(fromEuler(k.body), RCx)), pr.chest);
    const RC = compose(fromEuler(k.body), fromEuler(k.chest));
    k.head = uw(euler(rel(RC, RHx)), pr.head);
    for (const s of ['L', 'R']) {
      const v = loc(RC, RV.sub(pt('sh' + s), pt('clav' + s))), v0 = R.cv[s], az = a => Math.atan2(a[0], a[1] * SG[s]) / DG, el = a => Math.asin(Math.max(-1, Math.min(1, a[2] / RV.len(a)))) / DG;
      k['sh' + s] = [r0(az(v) - az(v0)), r0(el(v) - el(v0))];
    }
    const tq = torso(k);
    for (const s of ['L', 'R']) {
      for (const [limb, root, M, end, mid, L1, L2] of [['arm', tq.sh(s), tq.RC, 'fist', 'elbow', R.up, R.lower], ['leg', tq.hip(s), tq.RP, 'ankle', 'knee', R.thigh, R.shin]]) {
        let v = loc(M, RV.sub(pt(end + s), root));
        // a fist curled in past the shoulder (a bent wrist, mid roll) is closer than a straight hand can fold: point the
        // fully bent limb away from the elbow instead, so the elbow, the bigger shape, stays where it was
        if (RV.len(v) < Math.abs(L1 - L2) + 10) v = RV.mul(RV.norm(loc(M, RV.sub(pt(mid + s), root))), -Math.abs(L1 - L2));
        const dir = RV.norm([v[0], v[1] * SG[s], v[2]]).map(x => r0(x * 100));
        const bend = r0(bendOf(RV.len(v), L1, L2)), target = limbEnd(root, M, dir, s, reachOf(bend, L1, L2)), dd = RV.norm(RV.sub(target, root));
        const tw = poleOf(dd, hintFor(limb, SG[s], M, [dir[0], dir[1] * SG[s], dir[2]]), RV.sub(pt(mid + s), root)), prevT = pr[limb + s] && pr[limb + s][4];
        k[limb + s] = [...dir, bend, r0(unwrap(tw, prevT))];
      }
      const fd = loc(tq.RP, RV.norm(RV.sub(pt('ball' + s), pt('ankle' + s)))), td = loc(tq.RP, RV.norm(RV.sub(pt('toe' + s), pt('ball' + s))));
      const pf = pr['foot' + s], down = Math.asin(Math.max(-1, Math.min(1, -fd[2]))) / DG;
      k['foot' + s] = [r0(down - R.abPitch), r0(unwrap(Math.atan2(fd[1] * SG[s], fd[0]) / DG, pf && pf[1])), r0(down - Math.asin(Math.max(-1, Math.min(1, -td[2]))) / DG - (R.abPitch - R.btPitch))];
    }
    return k;
  }
  /** every body point (the importer's 36) rebuilt from one key pose, on the source body's proportions */
  function decodePose(k, out) {
    const tq = torso(k), set = (n, v) => { const i = lib.idx[n] * 3; out[i] = v[0]; out[i + 1] = v[1]; out[i + 2] = v[2]; };
    const { p, RP, RC, RH, neck, head } = tq;
    set('pelvis', p); set('pelvisF', RV.add(p, RV.mul(RP[0], 120)));
    set('spine1', tq.spine1); set('spine2', tq.spine2);
    const chest = tq.chest; set('chest', chest); set('chestF', RV.add(chest, RV.mul(RC[0], 120)));
    set('neck', neck); set('head', head); set('headTop', RV.add(head, wld(RH, R.topH))); set('faceF', RV.add(head, wld(RH, R.faceH)));
    const blade = k.blade ? RV.norm(wld(RC, k.blade)) : null;
    for (const s of ['L', 'R']) {
      const sh = tq.sh(s), a = k['arm' + s], fT = limbEnd(sh, RC, RV.norm(a), s, reachOf(a[3] || 0, R.up, R.lower)), ad = RV.norm(RV.sub(fT, sh));
      const aN = RV.norm(a), [el, fist] = E.ik3(sh, fT, R.up, R.lower, poleHint(ad, hintFor('arm', SG[s], RC, [aN[0], aN[1] * SG[s], aN[2]]), a[4] || 0));
      const fd = RV.norm(RV.sub(fist, el)), wr = RV.add(el, RV.mul(fd, R.fore));
      set('clav' + s, RV.add(neck, wld(RC, R.clav[s]))); set('sh' + s, sh); set('elbow' + s, el); set('wrist' + s, wr);
      set('knuck' + s, RV.add(wr, RV.mul(fd, R.knuck))); set('fist' + s, fist);
      const across = s === 'R' && blade ? blade : RC[1];
      set('index' + s, RV.add(fist, RV.mul(across, 20))); set('pinky' + s, RV.add(fist, RV.mul(across, -20)));
      const hip = tq.hip(s), l = k['leg' + s], aT = limbEnd(hip, RP, RV.norm(l), s, reachOf(l[3] || 0, R.thigh, R.shin)), ld = RV.norm(RV.sub(aT, hip));
      const ln = RV.norm(l), [kn, an] = E.ik3(hip, aT, R.thigh, R.shin, poleHint(ld, hintFor('leg', SG[s], RP, [ln[0], ln[1] * SG[s], ln[2]]), l[4] || 0));
      set('hip' + s, hip); set('knee' + s, kn); set('ankle' + s, an);
      const ft = k['foot' + s] || [0, 0, 0], pa = (ft[0] + R.abPitch) * DG, pb = (ft[0] + R.btPitch - (ft[2] || 0)) * DG, yw = ft[1] * DG;
      const dir = pt => wld(RP, [Math.cos(pt) * Math.cos(yw), SG[s] * Math.cos(pt) * Math.sin(yw), -Math.sin(pt)]);
      const ball = RV.add(an, RV.mul(dir(pa), R.ab)); set('ball' + s, ball); set('toe' + s, RV.add(ball, RV.mul(dir(pb), R.bt)));
    }
    return out;
  }
  const FIELDS = ['hips', 'body', 'chest', 'head', 'shL', 'shR', 'armL', 'armR', 'legL', 'legR', 'footL', 'footR', 'blade'];
  return {
    legend: LEGEND, rest: R,
    /** a readable clip from a captured one, keeping the frames kf (from lib.reduce); extra: { tags, desc, blade } */
    encode(clip, kf, extra = {}) {
      const keys = [], X = new Float32Array(lib.P * 3); let prev = null;
      for (const f of kf) {
        lib.sample(clip, f / clip.fps, X); const k = Object.assign({ t: Math.round(f / clip.fps * 100) / 100 }, encodePose(X, prev));
        if (extra.blade) k.blade = loc(compose(fromEuler(k.body), fromEuler(k.chest)), RV.norm(RV.sub(lib.pt(X, 'indexR'), lib.pt(X, 'pinkyR')))).map(x => r0(x * 100));
        keys.push(k); prev = k;
      }
      return Object.assign({ clip: clip.name, dur: Math.round(clip.dur * 100) / 100, loop: clip.loop }, extra.tags ? { tags: extra.tags } : {}, extra.desc ? { desc: extra.desc } : {}, { keys });
    },
    /**
     * a readable clip within tol mm of the capture: starts from the position key poses and adds the frame the readable
     * in-betweening misses most until every frame is within tol (or every frame is a key). Returns { clip, error }.
     */
    fit(clip, tol, extra = {}) {
      const kf = lib.reduce(clip, tol), X = new Float32Array(lib.P * 3), Y = new Float32Array(lib.P * 3), t = f => f / clip.fps;
      // what the format itself cannot capture at each frame (that frame as its own key): not worth more keys
      const floor = Array.from({ length: clip.n }, (_, f) => lib.error(lib.sample(clip, t(f), X), this.pose(this.encode(clip, [f], extra), t(f), Y)));
      for (let guard = 0; ; guard++) {
        const o = this.encode(clip, kf, extra); let worst = 0, wf = -1, err = 0;
        for (let f = 0; f < clip.n; f++) { const e = lib.error(lib.sample(clip, t(f), X), this.pose(o, t(f), Y)), over = e - floor[f]; err = Math.max(err, e); if (over > worst) { worst = over; wf = f; } }
        if (worst <= tol || kf.includes(wf) || guard > clip.n) return { clip: o, error: err };
        kf.push(wf); kf.sort((a, b) => a - b);
      }
    },
    /** the text a model reads: one key pose per line */
    text(o) {
      const head = Object.entries(o).filter(([k]) => k !== 'keys').map(([k, v]) => JSON.stringify(k) + ': ' + JSON.stringify(v)).join(', ');
      // one key pose as three short lines: torso, arms, legs (what an animator, or a model, looks for together)
      const grp = [['hips', 'body', 'chest', 'head'], ['shL', 'shR', 'armL', 'armR', 'blade'], ['legL', 'legR', 'footL', 'footR']];
      const line = k => '  {"t":' + k.t + ',\n' + grp.map(g => '   ' + g.filter(f => k[f] !== undefined).map(f => '"' + f + '":' + JSON.stringify(k[f])).join(', ')).join(',\n') + '}';
      return '{' + head + ', "keys": [\n' + o.keys.map(line).join(',\n') + '\n]}';
    },
    /** text -> clip (comments allowed); throws a readable error when a key pose is missing a field */
    parse(txt) {
      const o = JSON.parse(txt.replace(/^\s*\/\/.*$/gm, ''));
      if (!Array.isArray(o.keys) || !o.keys.length) throw new Error('a clip needs "keys": [ ... ] with at least one key pose');
      o.keys.forEach((k, i) => { for (const f of ['hips', 'body', 'chest', 'head', 'armL', 'armR', 'legL', 'legR']) if (!Array.isArray(k[f])) throw new Error('key ' + (i + 1) + ' has no "' + f + '"'); if (typeof k.t !== 'number') throw new Error('key ' + (i + 1) + ' has no time "t"'); });
      o.keys.sort((a, b) => a.t - b.t); o.dur = o.dur || o.keys[o.keys.length - 1].t;
      return o;
    },
    /** every body point at time t, in-betweening the key poses (numbers interpolate linearly) */
    pose(o, t, out = new Float32Array(lib.P * 3)) {
      const K = o.keys, dur = o.dur || K[K.length - 1].t, tt = o.loop && dur > 0 ? ((t % dur) + dur) % dur : Math.min(Math.max(0, t), dur);
      let i = 0; while (i < K.length - 2 && K[i + 1].t <= tt) i++;
      const a = K[i], b = K[Math.min(i + 1, K.length - 1)], u = b.t > a.t ? Math.min(1, Math.max(0, (tt - a.t) / (b.t - a.t))) : 0, k = {};
      for (const f of FIELDS) if (a[f]) k[f] = a[f].map((v, j) => v + (((b[f] || a[f])[j]) - v) * u);
      return decodePose(k, out);
    },
    /** the same clip on the other side: L and R swap, turns and tilts change sign */
    mirror(o) {
      const neg = v => v && [-v[0], v[1], -v[2]], keys = o.keys.map(k => {
        const m = { t: k.t, hips: [k.hips[0], -k.hips[1], k.hips[2]], body: neg(k.body), chest: neg(k.chest), head: neg(k.head) };
        for (const [a, b] of [['L', 'R'], ['R', 'L']]) {
          for (const limb of ['arm', 'leg']) { const v = k[limb + b]; m[limb + a] = [v[0], v[1], v[2], v[3] || 0, -(v[4] || 0)]; }
          for (const f of ['foot', 'sh']) if (k[f + b]) m[f + a] = k[f + b].slice();
        }
        if (k.blade) m.blade = [k.blade[0], -k.blade[1], k.blade[2]];
        return m;
      });
      return Object.assign({}, o, { clip: (o.clip || 'clip') + '_Mirror', keys });
    }
  };
}

return { load, Mannequin, drive, readable, LEGEND };
})();
