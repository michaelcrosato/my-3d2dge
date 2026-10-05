/* =============================================================================
 * MOCAP LAB  ready-made animations imported from a 3D library, played on my-3D2dge rigs.
 * The clips are Quaternius' Universal Animation Library (CC0), converted by tools/anim-import.mjs into
 * src/mocap/ual-clips.js. A look-alike of the library's mannequin plays them as captured; the engine's own
 * hero plays the same clips retargeted to his build (Mocap.drive in src/mocap/mocap.js).
 * Compare mode plays one clip five ways side by side: as captured, at half the frame rate, as key poses at two
 * error budgets, and as the readable text format an AI model reads and edits (the panel on the right).
 * Deep links: mocap-lab.html#Dance_Loop, ?view=side, ?cast=both|hero|mannequin|compare, ?speed=.25, ?true (true
 * camera), ?readable (play the readable format), ?ghost, ?facing=90 (degrees), ?spin (turntable), ?caption (labels
 * drawn into the image, for recordings)
 * ============================================================================= */
(() => {
'use strict';
const E = My3D2dge, { clamp } = E;
const lib = Mocap.load(window.MOCAP.UAL), RD = Mocap.readable(lib), CATALOG = window.MOCAP.UAL_CATALOG || {};

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
const ghostMan = new Mocap.Mannequin(lib, { height: 34, main: '#5ab8f0', joint: '#2f6fd0' });   // the capture, behind each variant
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

/* 4. The ways to store a clip, compared side by side. tol: the key-pose error budget (mm) */
const READ_TOL = 30;   // the readable format's in-betweening budget (past the format's own limits, keys are not worth it)
const TOK = 2, PROSE = 3.5;   // characters per token (cl100k, measured): the numeric clip text 1.98, the catalog and legend 3.4-3.5
const tokens = (txt, per = TOK) => Math.round(txt.length / per);
const OPTIONS = [
  { id: 'cap', label: 'CAPTURED', note: 'every frame, 30 fps' },
  { id: 'fps15', label: '15 FPS', note: 'every 2nd frame' },
  { id: 'k10', label: 'KEYS 10 MM', note: 'key poses, under a pixel', tol: 10 },
  { id: 'k40', label: 'KEYS 40 MM', note: 'key poses, about 2 px', tol: 40 },
  { id: 'read', label: 'READABLE', note: 'the text a model edits' }
];
const blade = name => /^Sword/.test(name);
const extraFor = name => ({ blade: blade(name), tags: CATALOG[name] ? CATALOG[name][0].split(' ') : undefined, desc: CATALOG[name] ? CATALOG[name][1] : undefined });
const framesOf = (c, id) => { const all = Array.from({ length: c.n }, (_, i) => i); return id === 'cap' ? all : id === 'fps15' ? all.filter(i => i % 2 === 0 || i === c.n - 1) : lib.reduce(c, OPTIONS.find(o => o.id === id).tol); };
const edits = new Map();   // clip name -> the readable clip the person edited in the panel
const _var = new Map();
/** the five versions of a clip (cached): each plays with pose(t, out) and knows its size and its worst error */
function versions(c) {
  let v = _var.get(c.name); if (v) return v;
  const keyed = id => { const kf = framesOf(c, id), vc = id === 'cap' ? c : lib.variant(c, kf); return { keys: kf.length, bytes: kf.length * lib.P * 3 * 2, pose: (t, o) => lib.sample(vc, t, o) }; };
  const fit = RD.fit(c, READ_TOL, extraFor(c.name)).clip;
  v = {
    cap: keyed('cap'), fps15: keyed('fps15'), k10: keyed('k10'), k40: keyed('k40'),
    read: { fitted: fit, get clip() { return edits.get(c.name) || fit; }, get keys() { return this.clip.keys.length; }, get text() { return RD.text(this.clip); }, pose(t, o) { return RD.pose(this.clip, t, o); } }
  };
  for (const o of OPTIONS) v[o.id].maxErr = worstError(c, v[o.id]);
  _var.set(c.name, v);
  return v;
}
/** the largest distance any body point of a version strays from the capture, over the whole clip (mm) */
function worstError(c, ver) { const X = new Float32Array(lib.P * 3), Y = new Float32Array(lib.P * 3); let w = 0; for (let f = 0; f < c.n; f++) w = Math.max(w, lib.error(lib.sample(c, f / c.fps, X), ver.pose(f / c.fps, Y))); return w; }

/* 5. State */
const qs = new URLSearchParams(location.search);
const CASTS = ['mannequin', 'hero', 'both', 'compare'];
const S = {
  clip: lib.clip(decodeURIComponent(location.hash.slice(1))) || lib.clip('Idle_Loop'), t: 0, hold: 0, playing: true,
  speed: clamp(+qs.get('speed') || 1, .1, 2), cast: CASTS.includes(qs.get('cast')) ? qs.get('cast') : 'both',
  facing: qs.has('facing') ? +qs.get('facing') * E.DEG : null, spin: qs.has('spin'), bones: false, trueCam: qs.has('true'), caption: qs.has('caption'),
  readable: qs.has('readable'), ghost: qs.has('ghost'),
  fade: 0, pose: new Float32Array(lib.P * 3), prev: new Float32Array(lib.P * 3), poses: {}, err: {}
};
for (const o of OPTIONS) S.poses[o.id] = new Float32Array(lib.P * 3);

function play(name, cut) {
  const c = lib.clip(name); if (!c) return;
  if (S.clip !== c && !cut) { S.prev.set(S.pose); S.fade = .18; }   // crossfade from the pose on screen (cut: no blend)
  S.clip = c; S.t = 0; S.hold = 0;
  history.replaceState(null, '', location.pathname + location.search + '#' + c.name);
  syncList(); syncInfo(); showText();
}

/* 6. Update: advance the clip, pose every figure */
const pos = {};   // where each figure on stage stands this step
const actors = () => S.cast === 'compare' ? OPTIONS.map(o => o.id) : S.cast === 'both' ? ['mannequin', 'hero'] : [S.cast];
function update(dt) {
  const c = S.clip;
  if (S.playing) {
    S.t += dt * S.speed;
    if (!c.loop && S.t >= c.dur) { S.hold += dt; if (S.hold > .8) { S.t = 0; S.hold = 0; } S.t = Math.min(S.t, c.dur); }   // one-shots hold their end, then replay
  }
  const V = versions(c);
  if (S.cast === 'compare') for (const o of OPTIONS) { V[o.id].pose(S.t, S.poses[o.id]); S.err[o.id] = lib.error(S.poses.cap, S.poses[o.id]); }
  (S.readable ? V.read : V.cap).pose(S.t, S.pose);
  if (S.fade > 0) { S.fade = Math.max(0, S.fade - dt); lib.blend(S.pose, S.prev, S.fade / .18, S.pose); }
  if (S.spin && S.playing) S.facing = (S.facing ?? baseFacing()) + dt * .6;
  const f = facing(), mv = lib.moveAt(c, S.t), list = actors();
  let side = sideDir();
  if (c.move) { const v = game.view; side = [-Math.sin(f), Math.cos(f)]; if (v.ax * side[0] + v.ay * side[1] < 0) side = [-side[0], -side[1]]; }   // travelling clips: parallel lanes, still left to right
  const spacing = list.length > 2 ? 33 : 30;
  for (const a in pos) delete pos[a];   // only the cast on stage is placed (and drawn)
  list.forEach((a, i) => {
    const off = (i - (list.length - 1) / 2) * spacing, k = a === 'hero' ? heroK : man.k;
    let x = CX + side[0] * off, y = CY + side[1] * off;
    if (mv) { x += (mv[0] * Math.cos(f) - mv[1] * Math.sin(f)) * k; y += (mv[0] * Math.sin(f) + mv[1] * Math.cos(f)) * k; }
    pos[a] = [x, y];
  });
  hero.mocap = S.pose; hero.mocapBlade = blade(c.name);
  if (pos.hero) hero.update(dt, { x: pos.hero[0], y: pos.hero[1], facing: f });
  const ps = list.map(a => pos[a]), sh = panelShift();   // the camera keeps the cast in frame (root motion clips travel), centred between the panels
  game.focus(ps.reduce((t, p) => t + p[0], 0) / ps.length - sideDir()[0] * sh, ps.reduce((t, p) => t + p[1], 0) / ps.length - sideDir()[1] * sh, 14);
  scrub.value = String(Math.round(S.t / Math.max(.001, c.dur) * 1000));
  frameEl.textContent = 'frame ' + Math.min(c.n, Math.floor(S.t * c.fps) + 1) + ' / ' + c.n;
}
/** world units to slide the camera so the figures sit in the middle of the space the side panels leave open */
function panelShift() {
  const cv = game.screen.canvas || document.getElementById('screen'), W = cv.clientWidth || innerWidth, l = $('clips').closest('.side'), a = $('ai');
  const left = l && l.offsetParent ? l.getBoundingClientRect().right : 0, right = a && !a.hidden && a.offsetParent ? W - a.getBoundingClientRect().left : 0;
  const v = game.view, ppu = Math.hypot(v.ax, v.ay) * (W / game.screen.W);   // screen pixels per world unit, across the screen
  return ppu > 0 ? (left - right) / 2 / ppu : 0;
}
/** in-place jumps keep the root on the floor while the feet point down (a game lifts the body); lift the figure so
 *  its lowest point touches the floor instead of sinking through it (mm) */
function groundLift(pose) { let lo = 0; for (let i = 2; i < pose.length; i += 3) if (pose[i] < lo) lo = pose[i]; return -lo; }
/** the ground direction that runs left to right across the screen */
function sideDir() { const v = game.view, l = Math.hypot(v.ax, v.ay) || 1; return [v.ax / l, v.ay / l]; }
/** three-quarter toward the camera by default, so both arms and both legs read */
function baseFacing() { const v = game.view; return v.isSide ? 0 : Math.atan2(v.fy, v.fx) - .75; }
const facing = () => S.facing ?? baseFacing();

/* 7. Draw */
const errCol = e => e < 12 ? '#2f7a3a' : e < 40 ? '#9a6a10' : '#b0302a';   // under a pixel at 3x zoom / about 2 px / more
function draw(r) {
  const view = r.view, mv = camFor(view), f = facing();
  map.drawFloor(r);
  for (const a of actors()) r.shadow(pos[a][0], pos[a][1], 7, .35);
  if (S.cast === 'compare') {
    const V = versions(S.clip), lift = groundLift(S.poses.cap) * man.k;
    for (const o of OPTIONS) {
      const p = pos[o.id], pose = S.poses[o.id];
      if (S.ghost && o.id !== 'cap') r.actor(p[0], p[1], lift, (g, ox, oy) => ghostMan.draw(g, ox, oy, mv, S.poses.cap, f), { outline: false, bias: -.02 });
      r.actor(p[0], p[1], lift, (g, ox, oy) => man.draw(g, ox, oy, mv, pose, f), { outlineColor: '#3a2a1c' });
    }
    r.overlay(g => {
      for (const o of OPTIONS) {
        const [sx, sy] = r.w(pos[o.id][0], pos[o.id][1], 0), x = Math.round(sx), y = Math.round(sy) + 8, v = V[o.id];
        const size = o.id === 'read' ? '~' + tokens(v.text) + ' TOKENS' : (v.bytes / 1024).toFixed(1) + ' KB', lab = { align: 'center', outline: '#ddd7cf', font: 'tiny' };
        E.font.text(g, o.label, x, y, '#2a2140', lab);
        E.font.text(g, v.keys + ' POSES', x, y + 7, '#4a3f5c', lab);
        E.font.text(g, size, x, y + 14, '#4a3f5c', lab);
        if (o.id !== 'cap') E.font.text(g, 'OFF ' + Math.round(S.err[o.id] || 0) + ' MM', x, y + 21, errCol(S.err[o.id] || 0), lab);
      }
    });
  } else {
    const lift = groundLift(S.pose);
    if (pos.mannequin) r.actor(pos.mannequin[0], pos.mannequin[1], lift * man.k, (g, ox, oy) => man.draw(g, ox, oy, mv, S.pose, f), { outlineColor: '#3a2a1c' });
    if (pos.hero) r.actor(pos.hero[0], pos.hero[1], lift * heroK, (g, ox, oy) => hero.draw(g, ox, oy, view));
  }
  if (S.bones) r.overlay(g => drawBones(r, g, f));
  if (S.caption) r.overlay(g => {   // for filmstrips and recordings, which capture the game's own image
    E.font.text(g, pretty(S.clip.name).toUpperCase() + (S.readable && S.cast !== 'compare' ? ' (READABLE)' : ''), 6, 6, '#2a2140');
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
  const who = pos.mannequin ? ['mannequin', S.pose] : pos.read ? ['read', S.poses.read] : null; if (!who) return;
  const view = camFor(r.view), [x0, y0] = pos[who[0]], pose = who[1], k = man.k, c = Math.cos(f), s = Math.sin(f);
  const lift = groundLift(S.cast === 'compare' ? S.poses.cap : pose) * k;
  const W = n => { const p = lib.pt(pose, n), wx = (p[0] * c - p[1] * s) * k, wy = (p[0] * s + p[1] * c) * k, q = r.w(x0, y0, lift); return [q[0] + view.ax * wx + view.ay * wy, q[1] + view.bx * wx + view.by * wy + view.bz * p[2] * k]; };
  for (const [a, b] of BONES) { const A = W(a), B = W(b); E.px.line(g, A[0], A[1], B[0], B[1], b.endsWith('L') || a.endsWith('L') ? '#2f7fff' : '#ff3a6a'); }
  for (const n of lib.raw.points) { const p = W(n); E.px.rect(g, p[0] - 1, p[1] - 1, 2, 2, '#ffffff'); }
}

/* 8. UI: clip list, views, cast, playback */
const $ = id => document.getElementById(id);
const listEl = $('clips'), pick = $('pick'), scrub = $('scrub'), frameEl = $('frame');
for (const [label, names] of GROUPS) {
  const have = names.filter(n => lib.clip(n)); if (!have.length) continue;
  const h = document.createElement('h2'); h.textContent = label; listEl.appendChild(h);
  const og = document.createElement('optgroup'); og.label = label; pick.appendChild(og);
  for (const n of have) {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.clip = n; b.textContent = (CORE.has(n) ? '★ ' : '') + pretty(n);
    if (CATALOG[n]) b.title = CATALOG[n][1];
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
  const c = S.clip, cat = CATALOG[c.name];
  $('note').textContent = pretty(c.name) + ': ' + (cat ? cat[1] + '. ' : '') + c.n + ' frames, ' + c.dur.toFixed(2) + ' s, ' + (c.loop ? 'loops' : 'plays once') + '.';
  $('playBtn').setAttribute('aria-pressed', String(!S.playing));
}
scrub.addEventListener('input', () => { S.playing = false; S.t = +scrub.value / 1000 * S.clip.dur; S.hold = 0; syncInfo(); });

const viewBtns = [...document.querySelectorAll('[data-view]')];
function setView(id) { game.setView(id); viewBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === id))); }
viewBtns.forEach(b => b.addEventListener('click', () => { setView(b.dataset.view); b.blur(); }));
const castBtns = [...document.querySelectorAll('[data-cast]')];
function setCast(c) {
  const was = S.cast; S.cast = c; castBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cast === c)));
  if ((c === 'compare') !== (was === 'compare')) game.setZoom(c === 'compare' ? 1 : innerWidth < 600 ? 1.8 : 1.5);   // five figures need room
  $('readBtn').disabled = c === 'compare';
}
castBtns.forEach(b => b.addEventListener('click', () => { setCast(b.dataset.cast); b.blur(); }));
const speedBtns = [...document.querySelectorAll('[data-speed]')];
function setSpeed(v) { S.speed = v; speedBtns.forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.speed === v))); }
speedBtns.forEach(b => b.addEventListener('click', () => { setSpeed(+b.dataset.speed); b.blur(); }));
const tog = (id, get, set) => { const b = $(id); const sync = () => b.setAttribute('aria-pressed', String(get())); b.addEventListener('click', () => { set(!get()); sync(); b.blur(); }); sync(); return sync; };
const syncBones = tog('boneBtn', () => S.bones, v => { S.bones = v; });
const syncSpin = tog('spinBtn', () => S.spin, v => { S.spin = v; if (!v) S.facing = null; });
const syncTrue = tog('trueBtn', () => S.trueCam, v => { S.trueCam = v; hero.o.charView = !v; });
const syncRead = tog('readBtn', () => S.readable, v => { S.readable = v; });
const syncGhost = tog('ghostBtn', () => S.ghost, v => { S.ghost = v; });
const syncAI = tog('aiBtn', () => !$('ai').hidden, v => { $('ai').hidden = !v; });
$('playBtn').addEventListener('click', e => { S.playing = !S.playing; syncInfo(); e.currentTarget.blur(); });

/* 9. The AI panel: the clip as a model reads it (editable), the catalog a model picks from, the format and its costs */
const tabs = [...document.querySelectorAll('[data-tab]')], panes = { text: $('paneText'), catalog: $('paneCatalog'), format: $('paneFormat') };
function setTab(id) { tabs.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tab === id))); for (const [k, el] of Object.entries(panes)) el.hidden = k !== id; if (id === 'format') showFormat(); }
tabs.forEach(b => b.addEventListener('click', () => { setTab(b.dataset.tab); b.blur(); }));
const textEl = $('clipText'), textNote = $('textNote');
function showText(msg) {
  const v = versions(S.clip).read, txt = v.text;
  textEl.value = txt;
  textNote.textContent = msg || ((edits.has(S.clip.name) ? 'Edited. ' : '') + v.keys + ' key poses, ~' + tokens(txt) + ' tokens, at most ' + Math.round(v.maxErr) + ' mm from the capture. Edit, then Apply (Ctrl+Enter): the READABLE figure in Compare, and the Readable source, play your version.');
  textNote.className = 'tnote';
}
function edited(o) { o.clip = S.clip.name; o.dur = o.dur || S.clip.dur; edits.set(S.clip.name, o); const v = versions(S.clip).read; v.maxErr = worstError(S.clip, v); showText(); }
function apply() {
  try { edited(RD.parse(textEl.value)); }
  catch (e) { textNote.textContent = 'Not applied: ' + e.message; textNote.className = 'tnote bad'; }
}
$('applyBtn').addEventListener('click', apply);
$('resetBtn').addEventListener('click', () => { edits.delete(S.clip.name); const v = versions(S.clip).read; v.maxErr = worstError(S.clip, v); showText(); });
$('mirrorBtn').addEventListener('click', () => edited(RD.mirror(versions(S.clip).read.clip)));
$('copyBtn').addEventListener('click', () => { if (navigator.clipboard) navigator.clipboard.writeText(RD.legend + '\n' + textEl.value).then(() => { textNote.textContent = 'Copied with the legend: ready to paste into a model.'; }, () => {}); });
textEl.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); apply(); } });
// the catalog: one line per clip, what a model reads to choose (it never needs the motion data to pick)
const catalogText = '// ' + lib.names.length + ' clips. name | seconds | loop or once | tags | what the body does\n' + ORDER.map(n => {
  const c = lib.clip(n), cat = CATALOG[n] || ['', ''];
  return n + ' | ' + c.dur.toFixed(2) + ' | ' + (c.loop ? 'loop' : 'once') + ' | ' + cat[0] + ' | ' + cat[1];
}).join('\n');
$('catalog').textContent = catalogText; $('catalogNote').textContent = '~' + tokens(catalogText, PROSE) + ' tokens for all ' + lib.names.length + ' clips. A model picks from this list, then opens only the clips it uses.';
$('legend').textContent = RD.legend;
$('fmtCount').textContent = 'All ' + lib.names.length + ' clips'; $('legendNote').textContent = 'The legend a model reads once (~' + tokens(RD.legend, PROSE) + ' tokens):';
let formatDone = false;
async function gz(bytes) { if (!window.CompressionStream) return null; const s = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip')); return (await new Response(s).arrayBuffer()).byteLength; }
const kb = n => (n / 1024).toFixed(0) + ' KB';
/** the whole library stored each way: what it costs to ship and to hand a model, and how far it drifts */
async function showFormat() {
  if (formatDone) return; formatDone = true;
  const body = $('formatRows'); body.innerHTML = '<tr><td colspan="5">Measuring all ' + lib.names.length + ' clips…</td></tr>';
  await new Promise(r => setTimeout(r, 30));
  const cells = [];
  for (const o of OPTIONS) {
    let poses = 0, err = 0, ship, model;
    if (o.id === 'read') {
      let text = ''; for (const n of lib.names) { const v = versions(lib.clip(n)).read; poses += v.keys; err = Math.max(err, v.maxErr); text += v.text + '\n'; }
      const b = new TextEncoder().encode(text), z = await gz(b); ship = kb(z || b.length); model = '~' + Math.round(tokens(text) / 1000) + 'k tokens';
    } else {   // the capture's own frames at this budget, each stored as its change from the last (it compresses well)
      const parts = [];
      for (const n of lib.names) {
        const c = lib.clip(n), v = versions(c)[o.id], kf = framesOf(c, o.id), Pn = lib.P * 3, d = new Int16Array(kf.length * Pn); poses += kf.length; err = Math.max(err, v.maxErr);
        kf.forEach((f, j) => { for (let i = 0; i < Pn; i++) d[j * Pn + i] = c.data[f * Pn + i] - (j ? c.data[kf[j - 1] * Pn + i] : 0); }); parts.push(new Uint8Array(d.buffer));
      }
      const all = new Uint8Array(parts.reduce((s, p) => s + p.length, 0)); let at = 0; for (const p of parts) { all.set(p, at); at += p.length; }
      ship = kb((await gz(all)) || all.length); model = 'unreadable (binary)';
    }
    cells.push('<tr><td><b>' + o.label + '</b><br><span>' + o.note + '</span></td><td>' + poses + '</td><td>' + ship + '</td><td>' + Math.round(err) + ' mm</td><td>' + model + '</td></tr>');
  }
  body.innerHTML = cells.join('');
}

/* 10. Keys */
const step = d => { S.playing = false; S.t = clamp(Math.round(S.t * S.clip.fps + d) / S.clip.fps, 0, S.clip.dur); S.hold = 0; syncInfo(); };
addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('textarea, input, select')) return;   // typing in the panel
  const order = E.VIEW_ORDER, i = ORDER.indexOf(S.clip.name);
  if (e.code === 'ArrowDown' || e.code === 'KeyS') { play(ORDER[(i + 1) % ORDER.length]); e.preventDefault(); }
  else if (e.code === 'ArrowUp' || e.code === 'KeyW') { play(ORDER[(i - 1 + ORDER.length) % ORDER.length]); e.preventDefault(); }
  else if (e.code === 'Space') { S.playing = !S.playing; syncInfo(); e.preventDefault(); }
  else if (e.code === 'Comma' || e.code === 'ArrowLeft') step(-1);
  else if (e.code === 'Period' || e.code === 'ArrowRight') step(1);
  else if (e.repeat) return;
  else if (e.code === 'KeyV') setView(order[(order.indexOf(game.view.id) + 1) % order.length]);
  else if (/^Digit[1-5]$/.test(e.code)) setView(order[+e.code.slice(5) - 1]);
  else if (e.code === 'KeyC') setCast(CASTS[(CASTS.indexOf(S.cast) + 1) % CASTS.length]);
  else if (e.code === 'KeyT') setSpeed(S.speed === 1 ? .5 : S.speed === .5 ? .25 : 1);
  else if (e.code === 'KeyB') { S.bones = !S.bones; syncBones(); }
  else if (e.code === 'KeyP') { S.spin = !S.spin; if (!S.spin) S.facing = null; syncSpin(); }
  else if (e.code === 'KeyH') { S.trueCam = !S.trueCam; hero.o.charView = !S.trueCam; syncTrue(); }
  else if (e.code === 'KeyR' && S.cast !== 'compare') { S.readable = !S.readable; syncRead(); }
  else if (e.code === 'KeyG') { S.ghost = !S.ghost; syncGhost(); }
  else if (e.code === 'KeyA') { $('ai').hidden = !$('ai').hidden; syncAI(); }
  else if (e.code === 'KeyQ') S.facing = facing() - Math.PI / 8;
  else if (e.code === 'KeyE') S.facing = facing() + Math.PI / 8;
  else if (e.code === 'BracketLeft') game.rotateView(-15);
  else if (e.code === 'BracketRight') game.rotateView(15);
  else if (e.code === 'Minus') game.setZoom(game.zoom / 1.25);
  else if (e.code === 'Equal') game.setZoom(game.zoom * 1.25);
  else if (e.code === 'Digit0') { game.resetCamera(); game.setZoom(S.cast === 'compare' ? 1 : 1.5); S.facing = null; }
});
addEventListener('wheel', e => { if (e.target.closest && e.target.closest('.list, .ai')) return; game.setZoom(game.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1)); }, { passive: true });

game.lights.enabled = false; hero.o.charView = !S.trueCam;
$('ai').hidden = innerWidth < 1100; syncAI();
setView(E.VIEWS[qs.get('view')] ? qs.get('view') : 'threequarter');
game.setZoom(S.cast === 'compare' ? 1 : innerWidth < 600 ? 1.8 : 1.5);   // the figures are the subject: start close (five need room)
setCast(S.cast); setSpeed(S.speed); syncList(); syncInfo(); setTab('text'); showText();
game.start({ update, draw: r => { draw(r); $('fps').textContent = game.fps + ' fps'; } });
/** for tools (filmstrips, tests): play a clip, seek to a time, change the view or the cast */
window.__mocap = { game, lib, hero, man, RD, S, OPTIONS, versions, edits, groundLift, play, setView, setCast, setSpeed, apply, seek(t) { S.playing = false; S.t = t; S.hold = 0; }, resume() { S.playing = true; } };
})();
