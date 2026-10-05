/* =============================================================================
 * MOCAP  plays imported skeletal animation (tools/anim-import.mjs output) on my-3D2dge rigs.
 *   const lib = Mocap.load(window.MOCAP.UAL);          // decode once
 *   const clip = lib.clip('Dance_Loop');               // { name, n, dur, loop, fps }
 *   const pose = lib.sample(clip, t);                  // Float32Array: every point's f r z (mm), interpolated
 *   const man = new Mocap.Mannequin(lib, { height: 34 });  man.draw(g, ox, oy, view, pose, facing)
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
  /** the pose at time t (seconds): frames are interpolated, loops wrap, one-shots hold their last frame */
  lib.sample = (clip, t, out = new Float32Array(P * 3)) => {
    const n = clip.n, u = Math.max(0, t) * clip.fps, f = clip.loop ? u % Math.max(1, n - 1) : Math.min(u, n - 1);
    const i0 = Math.floor(f), i1 = Math.min(n - 1, i0 + 1), k = f - i0, D = clip.data, a = i0 * P * 3, b = i1 * P * 3;
    for (let i = 0; i < P * 3; i++) out[i] = D[a + i] + (D[b + i] - D[a + i]) * k;
    return out;
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

return { load, Mannequin, drive };
})();
