/* =============================================================================
 * MOCAP LAB  ready-made animations imported from a 3D library, played on my-3D2dge rigs.
 * The clips are Quaternius' Universal Animation Library (CC0), converted by tools/anim-import.mjs into
 * src/mocap/ual-clips.js. A look-alike of the library's mannequin plays them as captured; the engine's own
 * hero plays the same clips retargeted to his build (Mocap.drive in src/mocap/mocap.js).
 * Deep links: mocap-lab.html#Dance_Loop, ?view=side, ?cast=both|hero|mannequin, ?speed=.25, ?true (true camera),
 * ?facing=90 (degrees), ?spin (turntable), ?caption (clip name drawn into the image, for recordings)
 * ============================================================================= */
(() => {
'use strict';
const E = My3D2dge, { clamp } = E;
const lib = Mocap.load(window.MOCAP.UAL);

/* 1. Game and a studio floor: light grey with a grid, like the library's preview stage */
const game = new E.Game({ canvas: document.getElementById('screen'), view: 'threequarter', minH: 230, maxW: 520, bg: '#cfcac3' });
const MW = 40, MH = 40, T = 16, CX = MW * T / 2, CY = MH * T / 2;
const map = new E.TileMap({
  w: MW, h: MH, tile: T, cells: new Array(MW * MH).fill(0), types: {},
  floorTex: (x, y) => {
    const gx = ((x % T) + T) % T, gy = ((y % T) + T) % T, major = x % (T * 4) < 1 || y % (T * 4) < 1;
    if (major) return [92, 88, 86];
    if (gx < 1 || gy < 1) return [126, 121, 117];
    const n = (E.hash2(x >> 2, y >> 2) - .5) * 4; return [169 + n, 164 + n, 158 + n];
  }
});
game.cam.bounds = null;

/* 2. The cast: the library's mannequin (drawn from the clip as captured) and the engine's hero (retargeted) */
const man = new Mocap.Mannequin(lib, { height: 34 });
const hero = Mocap.drive(new E.Humanoid({ cape: { len: 6, width: 5, seg: 2.5 } }), lib);
const tpose = lib.sample(lib.clip('A_TPose'), 0), hipMM = (lib.pt(tpose, 'hipL')[2] + lib.pt(tpose, 'hipR')[2]) / 2;
const heroK = hero.o.hipZ * hero.o.size / hipMM;   // hero world units per mm (for root motion)

/* 3. Clips, grouped the way a game asks for them; the starred ones are the core set */
const GROUPS = [
  ['Locomotion', ['Idle_Loop', 'Walk_Loop', 'Walk_Formal_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop', 'Crouch_Idle_Loop', 'Crouch_Fwd_Loop']],
  ['Jump and roll', ['Jump_Start', 'Jump_Loop', 'Jump_Land', 'Roll', 'Roll_RM']],
  ['Melee', ['Punch_Enter', 'Punch_Jab', 'Punch_Cross', 'Sword_Idle', 'Sword_Attack', 'Sword_Attack_RM']],
  ['Magic', ['Spell_Simple_Enter', 'Spell_Simple_Idle_Loop', 'Spell_Simple_Shoot', 'Spell_Simple_Exit']],
  ['Pistol', ['Pistol_Idle_Loop', 'Pistol_Aim_Neutral', 'Pistol_Aim_Up', 'Pistol_Aim_Down', 'Pistol_Shoot', 'Pistol_Reload']],
  ['Reactions', ['Hit_Chest', 'Hit_Head', 'Death01']],
  ['Everyday', ['Interact', 'PickUp_Table', 'Push_Loop', 'Fixing_Kneeling', 'Idle_Talking_Loop', 'Idle_Torch_Loop', 'Dance_Loop', 'Driving_Loop']],
  ['Sitting', ['Sitting_Enter', 'Sitting_Idle_Loop', 'Sitting_Talking_Loop', 'Sitting_Exit']],
  ['Swimming', ['Swim_Idle_Loop', 'Swim_Fwd_Loop']],
  ['Reference', ['A_TPose']]
];
const CORE = new Set(['Idle_Loop', 'Walk_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop', 'Jump_Start', 'Roll', 'Punch_Jab', 'Sword_Attack', 'Hit_Chest', 'Death01', 'Interact', 'PickUp_Table', 'Sitting_Enter', 'Dance_Loop']);
const listed = new Set(GROUPS.flatMap(g => g[1]));
const extra = lib.names.filter(n => !listed.has(n)); if (extra.length) GROUPS.push(['Other', extra]);
const ORDER = GROUPS.flatMap(g => g[1]).filter(n => lib.clip(n));
const pretty = n => n.replace(/_Loop$/, '').replace(/_RM$/, ' (root motion)').replace(/_/g, ' ');

/* 4. State */
const qs = new URLSearchParams(location.search);
const S = {
  clip: lib.clip(decodeURIComponent(location.hash.slice(1))) || lib.clip('Idle_Loop'), t: 0, hold: 0, playing: true,
  speed: clamp(+qs.get('speed') || 1, .1, 2), cast: ['mannequin', 'hero', 'both'].includes(qs.get('cast')) ? qs.get('cast') : 'both',
  facing: qs.has('facing') ? +qs.get('facing') * E.DEG : null, spin: qs.has('spin'), bones: false, trueCam: qs.has('true'), caption: qs.has('caption'),
  fade: 0, pose: new Float32Array(lib.P * 3), prev: new Float32Array(lib.P * 3)
};

function play(name, cut) {
  const c = lib.clip(name); if (!c) return;
  if (S.clip !== c && !cut) { S.prev.set(S.pose); S.fade = .18; }   // crossfade from the pose on screen (cut: no blend)
  S.clip = c; S.t = 0; S.hold = 0;
  history.replaceState(null, '', location.pathname + location.search + '#' + c.name);
  syncList(); syncInfo();
}

/* 5. Update: advance the clip, pose both rigs */
const pos = {};   // where each figure on stage stands this step
const actors = () => S.cast === 'both' ? ['mannequin', 'hero'] : [S.cast];
function update(dt) {
  const c = S.clip;
  if (S.playing) {
    S.t += dt * S.speed;
    if (!c.loop && S.t >= c.dur) { S.hold += dt; if (S.hold > .8) { S.t = 0; S.hold = 0; } S.t = Math.min(S.t, c.dur); }   // one-shots hold their end, then replay
  }
  lib.sample(c, S.t, S.pose);
  if (S.fade > 0) { S.fade = Math.max(0, S.fade - dt); lib.blend(S.pose, S.prev, S.fade / .18, S.pose); }
  if (S.spin && S.playing) S.facing = (S.facing ?? baseFacing()) + dt * .6;
  const f = facing(), mv = lib.moveAt(c, S.t);
  let side = sideDir();
  if (c.move) { const v = game.view; side = [-Math.sin(f), Math.cos(f)]; if (v.ax * side[0] + v.ay * side[1] < 0) side = [-side[0], -side[1]]; }   // travelling clips: parallel lanes, mannequin still on the left
  const gap = S.cast === 'both' ? 15 : 0;
  for (const a in pos) delete pos[a];   // only the cast on stage is placed (and drawn)
  for (const a of actors()) {
    const off = a === 'hero' ? gap : -gap, k = a === 'hero' ? heroK : man.k;
    let x = CX + side[0] * off, y = CY + side[1] * off;
    if (mv) { x += (mv[0] * Math.cos(f) - mv[1] * Math.sin(f)) * k; y += (mv[0] * Math.sin(f) + mv[1] * Math.cos(f)) * k; }
    pos[a] = [x, y];
  }
  hero.mocap = S.pose; hero.mocapBlade = /^Sword/.test(c.name);
  if (pos.hero) hero.update(dt, { x: pos.hero[0], y: pos.hero[1], facing: f });
  const ps = actors().map(a => pos[a]);   // the camera keeps the cast in frame (root motion clips travel)
  game.focus(ps.reduce((t, p) => t + p[0], 0) / ps.length, ps.reduce((t, p) => t + p[1], 0) / ps.length, 14);
  scrub.value = String(Math.round(S.t / Math.max(.001, c.dur) * 1000));
  frameEl.textContent = 'frame ' + Math.min(c.n, Math.floor(S.t * c.fps) + 1) + ' / ' + c.n;
}
/** in-place jumps keep the root on the floor while the feet point down (a game lifts the body); lift the figure so
 *  its lowest point touches the floor instead of sinking through it (mm) */
function groundLift(pose) { let lo = 0; for (let i = 2; i < pose.length; i += 3) if (pose[i] < lo) lo = pose[i]; return -lo; }
/** the ground direction that runs left to right across the screen */
function sideDir() { const v = game.view, l = Math.hypot(v.ax, v.ay) || 1; return [v.ax / l, v.ay / l]; }
/** three-quarter toward the camera by default, so both arms and both legs read */
function baseFacing() { const v = game.view; return v.isSide ? 0 : Math.atan2(v.fy, v.fx) - .75; }
const facing = () => S.facing ?? baseFacing();

/* 6. Draw */
function draw(r) {
  const view = r.view, mv = camFor(view), f = facing();
  map.drawFloor(r);
  for (const a of actors()) r.shadow(pos[a][0], pos[a][1], 7, .35);
  const lift = groundLift(S.pose);
  if (pos.mannequin) r.actor(pos.mannequin[0], pos.mannequin[1], lift * man.k, (g, ox, oy) => man.draw(g, ox, oy, mv, S.pose, f), { outlineColor: '#3a2a1c' });
  if (pos.hero) r.actor(pos.hero[0], pos.hero[1], lift * heroK, (g, ox, oy) => hero.draw(g, ox, oy, view));
  if (S.bones) r.overlay(g => drawBones(r, g, f));
  if (S.caption) r.overlay(g => {   // for filmstrips and recordings, which capture the game's own image
    E.font.text(g, pretty(S.clip.name).toUpperCase(), 6, 6, '#2a2140');
    E.font.text(g, view.label + (S.trueCam ? ', true camera' : '') + (S.speed < 1 ? '  ' + S.speed + 'x' : ''), 6, 17, '#4a3f5c');
  });
}
/**
 * The angle the figures are drawn from. By default the engine's character view: in steep views (three-quarter,
 * top-down) characters are drawn from a lower, sprite-like angle so faces and poses read, as SNES RPGs did.
 * The true camera draws them exactly as the view sees the floor, with no height boost: the fair comparison with a 3D game.
 */
const _tv = new Map();
function camFor(v) {
  if (!S.trueCam) return E.charView(v);
  if (v.zBoost === 1) return v;
  const key = v.yawDeg + ':' + v.pitchDeg + ':' + v.scale; let t = _tv.get(key);
  if (!t) { t = new E.View(v.id, v.label, v.yawDeg, v.pitchDeg, v.scale, 1); _tv.set(key, t); }
  return t;
}
// the raw data: every imported point and the bones between them, over the mannequin
const BONES = [['pelvis', 'spine1'], ['spine1', 'spine2'], ['spine2', 'chest'], ['chest', 'neck'], ['neck', 'head'], ['head', 'headTop'], ['head', 'faceF'],
  ...['L', 'R'].flatMap(s => [['chest', 'clav' + s], ['clav' + s, 'sh' + s], ['sh' + s, 'elbow' + s], ['elbow' + s, 'wrist' + s], ['wrist' + s, 'knuck' + s], ['pelvis', 'hip' + s], ['hip' + s, 'knee' + s], ['knee' + s, 'ankle' + s], ['ankle' + s, 'ball' + s], ['ball' + s, 'toe' + s]])];
function drawBones(r, g, f) {
  if (!pos.mannequin) return;
  const view = camFor(r.view), [x0, y0] = pos.mannequin, k = man.k, c = Math.cos(f), s = Math.sin(f);
  const lift = groundLift(S.pose) * k;
  const W = n => { const p = lib.pt(S.pose, n), wx = (p[0] * c - p[1] * s) * k, wy = (p[0] * s + p[1] * c) * k, q = r.w(x0, y0, lift); return [q[0] + view.ax * wx + view.ay * wy, q[1] + view.bx * wx + view.by * wy + view.bz * p[2] * k]; };
  for (const [a, b] of BONES) { const A = W(a), B = W(b); E.px.line(g, A[0], A[1], B[0], B[1], b.endsWith('L') || a.endsWith('L') ? '#2f7fff' : '#ff3a6a'); }
  for (const n of lib.raw.points) { const p = W(n); E.px.rect(g, p[0] - 1, p[1] - 1, 2, 2, '#ffffff'); }
}

/* 7. UI: clip list, views, cast, playback */
const $ = id => document.getElementById(id);
const listEl = $('clips'), pick = $('pick'), scrub = $('scrub'), frameEl = $('frame');
for (const [label, names] of GROUPS) {
  const have = names.filter(n => lib.clip(n)); if (!have.length) continue;
  const h = document.createElement('h2'); h.textContent = label; listEl.appendChild(h);
  const og = document.createElement('optgroup'); og.label = label; pick.appendChild(og);
  for (const n of have) {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.clip = n; b.textContent = (CORE.has(n) ? '★ ' : '') + pretty(n);
    b.addEventListener('click', () => { play(n); b.blur(); }); listEl.appendChild(b);
    const op = document.createElement('option'); op.value = n; op.textContent = (CORE.has(n) ? '★ ' : '') + pretty(n); og.appendChild(op);
  }
}
pick.addEventListener('change', () => play(pick.value));
function syncList() {
  for (const b of listEl.querySelectorAll('button')) { const on = b.dataset.clip === S.clip.name; b.setAttribute('aria-pressed', String(on)); if (on) b.scrollIntoView({ block: 'nearest' }); }
  pick.value = S.clip.name;
}
function syncInfo() {
  const c = S.clip;
  $('note').textContent = pretty(c.name) + ': ' + c.n + ' frames, ' + c.dur.toFixed(2) + ' s, ' + (c.loop ? 'loops' : 'plays once') + (c.move ? ', travels (root motion)' : '') + '.';
  $('playBtn').setAttribute('aria-pressed', String(!S.playing));
}
scrub.addEventListener('input', () => { S.playing = false; S.t = +scrub.value / 1000 * S.clip.dur; S.hold = 0; syncInfo(); });

const viewBtns = [...document.querySelectorAll('[data-view]')];
function setView(id) { game.setView(id); viewBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === id))); }
viewBtns.forEach(b => b.addEventListener('click', () => { setView(b.dataset.view); b.blur(); }));
const castBtns = [...document.querySelectorAll('[data-cast]')];
function setCast(c) { S.cast = c; castBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cast === c))); }
castBtns.forEach(b => b.addEventListener('click', () => { setCast(b.dataset.cast); b.blur(); }));
const speedBtns = [...document.querySelectorAll('[data-speed]')];
function setSpeed(v) { S.speed = v; speedBtns.forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.speed === v))); }
speedBtns.forEach(b => b.addEventListener('click', () => { setSpeed(+b.dataset.speed); b.blur(); }));
const tog = (id, get, set) => { const b = $(id); const sync = () => b.setAttribute('aria-pressed', String(get())); b.addEventListener('click', () => { set(!get()); sync(); b.blur(); }); sync(); return sync; };
const syncBones = tog('boneBtn', () => S.bones, v => { S.bones = v; });
const syncSpin = tog('spinBtn', () => S.spin, v => { S.spin = v; if (!v) S.facing = null; });
const syncTrue = tog('trueBtn', () => S.trueCam, v => { S.trueCam = v; hero.o.charView = !v; });
$('playBtn').addEventListener('click', e => { S.playing = !S.playing; syncInfo(); e.currentTarget.blur(); });

const step = d => { S.playing = false; S.t = clamp(Math.round(S.t * S.clip.fps + d) / S.clip.fps, 0, S.clip.dur); S.hold = 0; syncInfo(); };
addEventListener('keydown', e => {
  if (e.target === pick || e.target === scrub) return;
  const order = E.VIEW_ORDER, i = ORDER.indexOf(S.clip.name);
  if (e.code === 'ArrowDown' || e.code === 'KeyS') { play(ORDER[(i + 1) % ORDER.length]); e.preventDefault(); }
  else if (e.code === 'ArrowUp' || e.code === 'KeyW') { play(ORDER[(i - 1 + ORDER.length) % ORDER.length]); e.preventDefault(); }
  else if (e.code === 'Space') { S.playing = !S.playing; syncInfo(); e.preventDefault(); }
  else if (e.code === 'Comma' || e.code === 'ArrowLeft') step(-1);
  else if (e.code === 'Period' || e.code === 'ArrowRight') step(1);
  else if (e.repeat) return;
  else if (e.code === 'KeyV') setView(order[(order.indexOf(game.view.id) + 1) % order.length]);
  else if (/^Digit[1-5]$/.test(e.code)) setView(order[+e.code.slice(5) - 1]);
  else if (e.code === 'KeyC') setCast(S.cast === 'both' ? 'mannequin' : S.cast === 'mannequin' ? 'hero' : 'both');
  else if (e.code === 'KeyT') setSpeed(S.speed === 1 ? .5 : S.speed === .5 ? .25 : 1);
  else if (e.code === 'KeyB') { S.bones = !S.bones; syncBones(); }
  else if (e.code === 'KeyP') { S.spin = !S.spin; if (!S.spin) S.facing = null; syncSpin(); }
  else if (e.code === 'KeyH') { S.trueCam = !S.trueCam; hero.o.charView = !S.trueCam; syncTrue(); }
  else if (e.code === 'KeyQ') S.facing = facing() - Math.PI / 8;
  else if (e.code === 'KeyE') S.facing = facing() + Math.PI / 8;
  else if (e.code === 'BracketLeft') game.rotateView(-15);
  else if (e.code === 'BracketRight') game.rotateView(15);
  else if (e.code === 'Minus') game.setZoom(game.zoom / 1.25);
  else if (e.code === 'Equal') game.setZoom(game.zoom * 1.25);
  else if (e.code === 'Digit0') { game.resetCamera(); game.setZoom(1.5); S.facing = null; }
});
addEventListener('wheel', e => { if (e.target.closest && e.target.closest('.list')) return; game.setZoom(game.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1)); }, { passive: true });

game.lights.enabled = false; hero.o.charView = !S.trueCam;
setView(E.VIEWS[qs.get('view')] ? qs.get('view') : 'threequarter');
setCast(S.cast); setSpeed(S.speed); syncList(); syncInfo();
game.setZoom(innerWidth < 600 ? 1.8 : 1.5);   // the figures are the subject: start close
game.start({ update, draw: r => { draw(r); $('fps').textContent = game.fps + ' fps'; } });
/** for tools (filmstrips, tests): play a clip, seek to a time, change the view or the cast */
window.__mocap = { game, lib, hero, man, S, groundLift, play, setView, setCast, setSpeed, seek(t) { S.playing = false; S.t = t; S.hold = 0; }, resume() { S.playing = true; } };
})();
