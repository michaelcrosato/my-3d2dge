/* =============================================================================
 * FREE CAMERA ROOM (temporary lab, src/labs.json "Temporary"): a small stone room (four pillars, three crates, the hero
 * walking a lap round the pillars) and a free camera. The engine's camera has no fixed list of angles: a view is an
 * orthographic camera with a turn (yaw), a tilt (pitch), a scale and a height boost, so any of them can be set live
 * with new E.View(...) and game.setView(view). Drag turns and tilts, the wheel or a pinch zooms, WASD moves, Q/E go
 * down and up, F fixes the camera (and writes it to the address as ?cam=, so a reload or a shared link keeps it).
 * The crates switch between the converted 3D shape (src/shapes-raster.js), today's flat prop and the engine's box.
 * Fly mode (G) is a first-person camera the engine can't give: a small renderer of its own (src/free-camera.fly.js)
 * redraws the same room in perspective, fed by the engine where it can be (colors, textures, the hero's picture).
 * ============================================================================= */
(() => {
'use strict';
const E = My3D2dge, { clamp } = E, T = 16, SR = window.ShapeRaster;
const CRATE = (window.SHAPES_COMPARE || []).find(d => d.title === 'Crate'); if (CRATE) SR.prep(CRATE);
const $ = id => document.getElementById(id);

/* 1. The room: 0 = floor, 1 = the walls round it, 2 = the four pillars (wall blocks one tile across) */
const MW = 13, MH = 11, cells = new Array(MW * MH).fill(0);
for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (!x || !y || x === MW - 1 || y === MH - 1) cells[y * MW + x] = 1;
for (const [x, y] of [[3, 3], [9, 3], [3, 7], [9, 7]]) cells[y * MW + x] = 2;
const PAL = { stones: ['#6b6f5a', '#767a63', '#626653'].map(E.hex), mortar: E.hex('#3a3c31'), hi: E.hex('#8b8f75'), lo: E.hex('#51543f'), speck: E.hex('#45473a') };
const TYPES = { 1: { h: 40, cut: true, cutH: 6, top: '#8a8470', side: '#625d4d', course: 8 }, 2: { h: 46, top: '#b0a890', side: '#7d7662', course: 8 } };
const floorTex = (x, y) => E.tex.flagstone(x, y, PAL);
const map = new E.TileMap({ w: MW, h: MH, tile: T, cells, floorTex, types: TYPES });
const CX = MW * T / 2, CY = MH * T / 2;   // the room's centre (the camera looks here at first)

/* 2. Crates: two on the floor (one turned), one stacked. Shapes turn; the flat prop and the engine's box cannot */
const CRATES = [{ x: 5.7 * T, y: 5.0 * T, z: 0, f: 0 }, { x: 7.6 * T, y: 4.4 * T, z: 0, f: .45 }, { x: 5.7 * T, y: 5.0 * T, z: 17, f: .2 }];
const CRATE_NOTES = {
  shape: 'A free 3D model (KayKit, CC0) converted to boxes and drawn by the engine: it turns with the camera, the turned crate stays turned, and the stack sits right from every angle.',
  prop: 'Today\'s crate: one flat picture. It shows the same side from every angle, can\'t be turned, and the stack only lines up near the usual tilt.',
  box: 'The engine\'s own box (r.box): real 3D and cheap, but plain (no outline, no detail), and it only lines up with the floor tiles, so the turned crate can\'t turn.'
};

/* 3. The hero walks a rounded lap round the outside of the pillars, at a steady pace */
const LAP = (t, out) => { const c = Math.cos(t), s = Math.sin(t); out[0] = CX + 4.6 * T * Math.sign(c) * Math.sqrt(Math.abs(c)); out[1] = CY + 3.6 * T * Math.sign(s) * Math.sqrt(Math.abs(s)); return out; };
const hero = { x: LAP(0, [0, 0])[0], y: CY, vx: 0, vy: 0, facing: Math.PI / 2, t: 0, rig: new E.Humanoid({ cape: { len: 6, width: 5, seg: 2.5 } }) };
const pa = [0, 0], pb = [0, 0];

/* 4. The camera: what the controls set. pitch under 3 is the side view (which never turns); 3-5 snaps to 5 */
const BASE = 1.5;   // pixels per world unit at zoom 1 (the engine's three-quarter, top-down, brawler and side views)
const HOME = { yaw: 35, pitch: 42, zoom: 1, height: 0, boost: 1.1, fx: CX, fy: CY };
const S = Object.assign({ mode: 'orbit', fixed: false, crates: 'shape', walk: true, readable: true }, HOME);
// fly mode: the camera (position in world units, yaw and pitch in radians, field of view in degrees) and its options
const FLY_HOME = { x: CX, y: (MH - 1.7) * T, z: 20, yaw: -Math.PI / 2, pitch: -.12, fov: 70 };
const FLY = Object.assign({}, FLY_HOME), FS = { lines: 180, outlines: true, fog: true, collide: true };
const PRESETS = { iso: [45, 30, Math.SQRT2 / BASE, 1], threequarter: [0, 55, 1, 1.35], topdown: [0, 80, 1, 1.3], brawler: [0, 25, 1, 1], side: [0, 0, 1, 1] };
const eff = () => {   // the values the view is built from (whole degrees, zoom in .05 steps, so a drag reuses cached views)
  const pitch = S.pitch < 3 ? 0 : Math.max(5, Math.round(S.pitch)), yaw = pitch ? ((Math.round(S.yaw) % 360) + 360) % 360 : 0;
  return { yaw, pitch, zoom: Math.round(S.zoom * 20) / 20, boost: Math.round(S.boost * 20) / 20 };
};
const views = new Map();
function viewNow() {
  const v = eff(), scale = +(BASE * v.zoom).toFixed(4);
  for (const id in PRESETS) {   // exactly an engine view: use it, so the presets look exactly like the game's
    const p = PRESETS[id], ev = E.VIEWS[id];
    if (p[0] === v.yaw && p[1] === v.pitch && Math.abs(ev.scale - scale) < .04 && p[3] === v.boost) return ev;
  }
  const key = v.yaw + ':' + v.pitch + ':' + scale + ':' + v.boost;
  let w = views.get(key);
  if (!w) {
    if (views.size > 300) views.clear();
    // the id carries the boost: the map caches its wall blocks per id, turn, tilt and scale
    w = new E.View('free-' + v.boost, 'Free camera', v.yaw, v.pitch, scale, v.boost); w.zoom = v.zoom; views.set(key, w);
  }
  return w;
}

const game = new E.Game({ canvas: 'screen', view: viewNow(), minH: 200, maxW: 520, portrait: { maxH: 1000 }, bg: '#0d0b14' });
game.input.touchFilter = () => false;   // touches turn the camera here; no move stick
const fly = window.FlyCam($('fly'), { cells, MW, MH, T, types: TYPES, floorTex, light: map.light });
let shownView = null;
function apply() {
  const v = viewNow(); if (v !== shownView) { shownView = v; game.setView(v); }
  E.style.charPitch = S.readable ? undefined : false;
  sync();
}

/* 5. Update: the camera's keys, the hero's lap */
const held = new Set();
const touchMove = [0, 0];   // fly mode on a phone: two fingers held off their start point (forward, sideways)
function flyStep(dt) {
  const k = c => held.has(c), C = FLY, sp = 48 * (k('ShiftLeft') || k('ShiftRight') ? 2.5 : 1) * dt;
  C.yaw += ((k('ArrowRight') ? 1 : 0) - (k('ArrowLeft') ? 1 : 0)) * 1.8 * dt;
  const fwd = (k('KeyW') || k('ArrowUp') ? 1 : 0) - (k('KeyS') || k('ArrowDown') ? 1 : 0) + touchMove[0];
  const str = (k('KeyD') ? 1 : 0) - (k('KeyA') ? 1 : 0) + touchMove[1], up = (k('Space') || k('KeyE') ? 1 : 0) - (k('KeyQ') || k('KeyC') ? 1 : 0);
  const cy = Math.cos(C.yaw), sy = Math.sin(C.yaw), cp = Math.cos(C.pitch), spp = Math.sin(C.pitch);
  C.x += (cp * cy * fwd - sy * str) * sp; C.y += (cp * sy * fwd + cy * str) * sp; C.z += (spp * fwd + up) * sp;   // fly where you look
  if (FS.collide) fly.collide(C, CRATES); else { C.z = clamp(C.z, 1, 220); C.x = clamp(C.x, -4 * T, (MW + 4) * T); C.y = clamp(C.y, -4 * T, (MH + 4) * T); }
}
function update(dt) {
  if (S.mode === 'fly') flyStep(dt);
  else if (!S.fixed) {
    const mv = game.input.move(), d = game.view.screenDirToGround(mv[0], mv[1]), sp = 110 / S.zoom;
    if (mv[0] || mv[1]) { S.fx = clamp(S.fx + d[0] * sp * dt, -2 * T, (MW + 2) * T); S.fy = clamp(S.fy + d[1] * sp * dt, -2 * T, (MH + 2) * T); }
    const up = (held.has('KeyE') ? 1 : 0) - (held.has('KeyQ') ? 1 : 0);
    if (up) { S.height = clamp(S.height + up * 60 * dt, -40, 100); sync(); }
  }
  const h = hero;
  if (S.walk) {   // a steady 42 units a second along the lap, whatever its curve
    LAP(h.t, pa); LAP(h.t + .01, pb);
    h.t += dt * 42 / Math.max(5, Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) / .01);
    LAP(h.t, pb); h.vx = (pb[0] - h.x) / dt; h.vy = (pb[1] - h.y) / dt; h.x = pb[0]; h.y = pb[1];
    h.facing = E.approachAng(h.facing, Math.atan2(h.vy, h.vx), dt * 10);
  } else h.vx = h.vy = 0;
  h.rig.update(dt, { x: h.x, y: h.y, vx: h.vx, vy: h.vy, facing: h.facing });
  game.focus(S.fx, S.fy, S.height);
}

/* 6. Draw: floor, shadows, walls and pillars, crates, hero */
const sprites = new Map();
function crateSprite(view, f) {
  const key = view.yawDeg + ':' + view.pitchDeg + ':' + view.scale + ':' + view.zBoost + '|' + f;
  let s = sprites.get(key);
  if (!s) { if (sprites.size > 400) sprites.clear(); s = SR.raster(CRATE, view, f, 1, true); SR.outline(s.cv); sprites.set(key, s); }
  return s;
}
let flyText = '', flyTextT = 0, flyOff = [0, 0];
function draw(r) {
  if (S.mode === 'fly') {   // the engine's own picture is hidden: fly mode draws the room itself
    fly.render(FLY, { crates: S.crates, outlines: FS.outlines, fog: FS.fog, offX: flyOff[0], offY: flyOff[1] }, hero, CRATES, CRATE);
    const [W, H] = fly.size, C = FLY, deg = a => Math.round(a * 180 / Math.PI);
    const t = `x ${Math.round(C.x)}, y ${Math.round(C.y)}, ${Math.round(C.z)} up (${(C.z / T).toFixed(1)} m)\nfacing ${((deg(C.yaw) + 90) % 360 + 360) % 360}° · looking ${deg(C.pitch) > 0 ? 'up' : 'down'} ${Math.abs(deg(C.pitch))}°\n${W}×${H} pixels · ${fly.stats.ms.toFixed(1)} ms a frame`;
    if (game.real - flyTextT > .25 && t !== flyText) { flyText = t; flyTextT = game.real; $('flyCode').textContent = t; }
    return;
  }
  const view = r.view;
  map.drawFloor(r);
  r.shadow(hero.x, hero.y, 5.5, .45);
  for (const c of CRATES) if (!c.z) r.shadow(c.x, c.y, 10, .4);
  map.queueWalls(r);
  for (const c of CRATES) {
    if (S.crates === 'prop') r.prop('crate', c.x, c.y, c.z, { size: 1.8 });
    else if (S.crates === 'box') r.queue(c.x, c.y, c.z, g => r.box(g, c.x - 8.5, c.y - 8.5, c.z, c.x + 8.5, c.y + 8.5, c.z + 17, '#b08a58', '#7a5a36'), { hides: true });
    else if (CRATE) r.queue(c.x, c.y, c.z, g => {
      const s = crateSprite(view, c.f), [sx, sy] = r.w(c.x, c.y, c.z);
      g.drawImage(s.cv, Math.round(sx) - s.ox, Math.round(sy) - s.oy);
    }, { hides: true });
  }
  r.actor(hero.x, hero.y, 0, (g, ox, oy) => hero.rig.draw(g, ox, oy, view), { xray: true });
}

/* 7. The panel: sliders, fix, presets, crates, the code for this view */
const SL = {
  yaw: [v => S.yaw = v, () => Math.round(S.yaw), () => eff().pitch ? eff().yaw + '°' : 'side'],
  pitch: [v => S.pitch = v, () => Math.round(S.pitch), () => eff().pitch + '°'],
  zoom: [v => S.zoom = v / 100, () => Math.round(S.zoom * 100), () => eff().zoom.toFixed(2) + '×'],
  height: [v => S.height = v, () => Math.round(S.height), () => (S.height > 0 ? '+' : '') + Math.round(S.height)],
  boost: [v => S.boost = v / 100, () => Math.round(S.boost * 100), () => eff().boost.toFixed(2)]
};
for (const id in SL) $(id).addEventListener('input', e => { if (!S.fixed) { SL[id][0](+e.target.value); apply(); } });
const code = () => {   // what a game writes to use this camera (an engine view by its name)
  const v = viewNow(), set = E.VIEWS[v.id] === v ? `'${v.id}'` : `new E.View('mine', 'My view', ${v.yawDeg}, ${v.pitchDeg}, ${v.scale}, ${v.zBoost})`;
  return `game.setView(${set});\ngame.focus(${Math.round(S.fx)}, ${Math.round(S.fy)}, ${Math.round(S.height)});`;
};
const camParam = () => { const v = eff(); return [v.yaw, v.pitch, v.zoom, Math.round(S.height), v.boost, Math.round(S.fx), Math.round(S.fy)].join(','); };
const withCam = on => {   // this page's address with ?cam= (plain commas, so the link reads) or without it
  const u = new URL(location.href); u.searchParams.delete('cam'); const rest = u.search.slice(1);
  return u.origin + u.pathname + '?' + [rest, on ? 'cam=' + camParam() : ''].filter(Boolean).join('&') + u.hash;
};
function sync() {
  for (const id in SL) { const el = $(id); el.value = SL[id][1](); el.disabled = S.fixed; $(id + 'Out').textContent = SL[id][2](); }
  $('code').textContent = code();
  const fb = $('fixBtn'); fb.setAttribute('aria-pressed', String(S.fixed)); fb.lastChild.textContent = S.fixed ? 'Unfix camera' : 'Fix camera';
  $('resetBtn').disabled = S.fixed;
  $('tag').classList.toggle('on', S.fixed); $('screen').classList.toggle('fixed', S.fixed);
  const v = eff();
  for (const b of document.querySelectorAll('[data-preset]')) {
    const p = PRESETS[b.dataset.preset];
    b.disabled = S.fixed; b.setAttribute('aria-pressed', String(p[0] === v.yaw && p[1] === v.pitch && Math.abs(p[2] - v.zoom) < .03 && p[3] === v.boost));
  }
  for (const b of document.querySelectorAll('[data-crates]')) b.setAttribute('aria-pressed', String(b.dataset.crates === S.crates));
  $('crateNote').textContent = CRATE_NOTES[S.crates];
  $('walkBtn').setAttribute('aria-pressed', String(S.walk)); $('tiltBtn').setAttribute('aria-pressed', String(S.readable));
  // fly mode
  const isFly = S.mode === 'fly';
  for (const b of document.querySelectorAll('[data-mode]')) b.setAttribute('aria-pressed', String(b.dataset.mode === S.mode));
  $('orbitUI').hidden = isFly; $('flyUI').hidden = !isFly; $('screen').hidden = isFly; $('fly').hidden = !isFly;
  $('tag').classList.toggle('on', S.fixed && !isFly);
  $('brandNote').textContent = isFly
    ? 'Fly mode: a first-person camera the engine itself can\'t give. A small renderer made for this lab draws the room in perspective, using the engine\'s colors, textures and hero.'
    : 'Four pillars, a few crates and the hero walking a lap, drawn live by the engine from any angle. Drag to turn and tilt, then fix the camera where you like it.';
  $('fov').value = FLY.fov; $('fovOut').textContent = FLY.fov + '°';
  for (const b of document.querySelectorAll('[data-lines]')) b.setAttribute('aria-pressed', String(+b.dataset.lines === FS.lines));
  $('outlineBtn').setAttribute('aria-pressed', String(FS.outlines)); $('fogBtn').setAttribute('aria-pressed', String(FS.fog)); $('collideBtn').setAttribute('aria-pressed', String(FS.collide));
}
function setFixed(on) {
  S.fixed = on;
  try { history.replaceState(null, '', withCam(on)); } catch (e) { /* a file:// page may refuse; the code box still has it */ }
  if (on) game.note('CAMERA FIXED', 1.2);
  sync();
}
function preset(id) {
  if (S.fixed) return;
  const p = PRESETS[id]; Object.assign(S, { yaw: p[0], pitch: p[1], zoom: p[2], boost: p[3] }); apply();
}
function reset() { if (!S.fixed) { Object.assign(S, HOME); apply(); } }
$('fixBtn').onclick = () => setFixed(!S.fixed);
$('resetBtn').onclick = reset;
for (const b of document.querySelectorAll('[data-preset]')) b.onclick = () => preset(b.dataset.preset);
for (const b of document.querySelectorAll('[data-crates]')) b.onclick = () => { S.crates = b.dataset.crates; sync(); };
$('walkBtn').onclick = () => { S.walk = !S.walk; sync(); };
$('tiltBtn').onclick = () => { S.readable = !S.readable; apply(); };
const copy = (text, btn) => {
  const done = ok => { const t = btn.textContent; btn.textContent = ok ? 'Copied' : 'Select and copy'; setTimeout(() => { btn.textContent = t; }, 1200); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => done(true), () => done(false)); else done(false);
};
$('copyBtn').onclick = () => copy(code(), $('copyBtn'));
$('linkBtn').onclick = () => copy(withCam(true), $('linkBtn'));

/* 7b. Fly mode: switching in starts from the engine camera's own shot, so the same view gains perspective */
function setMode(m) {
  if (m === S.mode) return;
  if (m === 'fly') {
    const v = eff(), w = v.yaw * Math.PI / 180, p = v.pitch * Math.PI / 180, D = 150 / v.zoom;
    Object.assign(FLY, { x: S.fx + Math.cos(p) * Math.sin(w) * D, y: S.fy + Math.cos(p) * Math.cos(w) * D, z: S.height + Math.sin(p) * D, yaw: Math.atan2(-Math.cos(w), -Math.sin(w)), pitch: -clamp(p, 0, 1.5) });
    if (FS.collide) fly.collide(FLY, CRATES);
  } else if (document.pointerLockElement) document.exitPointerLock();
  S.mode = m; held.clear(); sync(); flyFit();
}
for (const b of document.querySelectorAll('[data-mode]')) b.onclick = () => setMode(b.dataset.mode);
$('fov').addEventListener('input', e => { FLY.fov = +e.target.value; sync(); });
for (const b of document.querySelectorAll('[data-lines]')) b.onclick = () => { FS.lines = +b.dataset.lines; flyFit(); sync(); };
$('outlineBtn').onclick = () => { FS.outlines = !FS.outlines; sync(); };
$('fogBtn').onclick = () => { FS.fog = !FS.fog; sync(); };
$('collideBtn').onclick = () => { FS.collide = !FS.collide; sync(); };
$('flyHomeBtn').onclick = () => { Object.assign(FLY, FLY_HOME, { fov: FLY.fov }); sync(); };
const flyParam = () => [FLY.x, FLY.y, FLY.z].map(Math.round).concat([FLY.yaw, FLY.pitch].map(a => Math.round(a * 180 / Math.PI)), [FLY.fov]).join(',');
$('flyLinkBtn').onclick = () => { const u = new URL(location.href); u.searchParams.delete('cam'); u.searchParams.delete('fly'); const rest = u.search.slice(1); copy(u.origin + u.pathname + '?' + [rest, 'fly=' + flyParam()].filter(Boolean).join('&') + u.hash, $('flyLinkBtn')); };
// the mouse steers once the view has it (pointer lock); otherwise a drag looks around, and two fingers fly
const fcv = $('fly'), fptrs = new Map(); let fpinch = null;
const look = (dx, dy, k) => { FLY.yaw += dx * k; FLY.pitch = clamp(FLY.pitch - dy * k, -1.52, 1.52); };
fcv.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse' && !document.pointerLockElement && fcv.requestPointerLock) { try { const p = fcv.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (err) { /* drag to look instead */ } }
  if (document.pointerLockElement === fcv) return;   // the locked mouse steers through pointermove
  try { fcv.setPointerCapture(e.pointerId); } catch (err) { /* a pointer that is being locked can't be captured */ }
  fptrs.set(e.pointerId, [e.clientX, e.clientY]);
  if (fptrs.size === 2) { const [a, b] = [...fptrs.values()]; fpinch = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }
});
fcv.addEventListener('pointermove', e => {
  if (document.pointerLockElement === fcv) { look(e.movementX, e.movementY, .0022); return; }
  const p = fptrs.get(e.pointerId); if (!p) return;
  const dx = e.clientX - p[0], dy = e.clientY - p[1]; p[0] = e.clientX; p[1] = e.clientY;
  if (fptrs.size === 1) look(-dx, -dy, .005);   // a drag grabs the scene: it moves with the finger
  else if (fpinch) { const [a, b] = [...fptrs.values()], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; touchMove[0] = clamp((fpinch[1] - my) / 60, -1, 1); touchMove[1] = clamp((mx - fpinch[0]) / 60, -1, 1); }
});
const flift = e => { fptrs.delete(e.pointerId); if (fptrs.size < 2) { fpinch = null; touchMove[0] = touchMove[1] = 0; } };
fcv.addEventListener('pointerup', flift); fcv.addEventListener('pointercancel', flift);
function flyFit() {   // the fly picture: lines of resolution tall, the screen's shape, centred in the part the panel leaves
  const st = $('stage'); fly.resize(FS.lines, st.clientWidth, st.clientHeight);
  const [W, H] = fly.size, open = details.open;
  flyOff = !open ? [0, 0] : innerWidth > 720 ? [-(side.offsetWidth + 12) / 2 * W / st.clientWidth, 0] : [0, -(side.offsetHeight + 8) / 2 * H / st.clientHeight];
}

/* 8. Drag to turn and tilt, wheel or pinch to zoom, two fingers to move */
const cv = $('screen'), ptrs = new Map(); let pinch = null;
const bufPerCss = () => game.screen.W / Math.max(1, cv.clientWidth);
const two = () => { const [a, b] = [...ptrs.values()]; return { d: Math.hypot(a[0] - b[0], a[1] - b[1]), mx: (a[0] + b[0]) / 2, my: (a[1] + b[1]) / 2 }; };
function pan(dxCss, dyCss) {   // grab the floor: it follows the fingers
  const k = bufPerCss(), v = game.view, dx = dxCss * k, dy = dyCss * k;
  if (v.inv) { S.fx -= v.inv[0] * dx + v.inv[1] * dy; S.fy -= v.inv[2] * dx + v.inv[3] * dy; }
  else { S.fx -= dx / v.ax; S.height = clamp(S.height - dy / Math.max(.2, Math.abs(v.bz)), -40, 100); }
}
cv.addEventListener('pointerdown', e => {
  if (S.fixed) { game.note('CAMERA FIXED: F OR UNFIX TO MOVE IT', 1.2); return; }
  cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); cv.classList.add('dragging');
  if (ptrs.size === 2) pinch = Object.assign(two(), { zoom: S.zoom });
});
cv.addEventListener('pointermove', e => {
  const p = ptrs.get(e.pointerId); if (!p || S.fixed) return;
  const dx = e.clientX - p[0], dy = e.clientY - p[1]; p[0] = e.clientX; p[1] = e.clientY;
  if (ptrs.size === 1) { S.yaw -= dx * .35; S.pitch = clamp(S.pitch + dy * .3, 0, 90); }
  else if (ptrs.size === 2 && pinch) {
    const t = two(); S.zoom = clamp(pinch.zoom * t.d / Math.max(10, pinch.d), .5, 3);
    pan(t.mx - pinch.mx, t.my - pinch.my); pinch.mx = t.mx; pinch.my = t.my;
  }
  apply();
});
const lift = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (!ptrs.size) cv.classList.remove('dragging'); };
cv.addEventListener('pointerup', lift); cv.addEventListener('pointercancel', lift);
cv.addEventListener('wheel', e => { e.preventDefault(); if (S.fixed) return; S.zoom = clamp(S.zoom * Math.exp(-e.deltaY * .0015), .5, 3); apply(); }, { passive: false });
addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT' && e.target.type !== 'range') return;
  held.add(e.code); if (e.repeat) return;
  if (e.code === 'KeyG') setMode(S.mode === 'fly' ? 'orbit' : 'fly');
  else if (S.mode === 'fly') return;
  else if (e.code === 'KeyF') setFixed(!S.fixed);
  else if (e.code === 'KeyR') reset();
  else if (/^Digit[1-5]$/.test(e.code)) preset(Object.keys(PRESETS)[+e.code.slice(5) - 1]);
  else if ((e.code === 'Equal' || e.code === 'Minus') && !S.fixed) { S.zoom = clamp(S.zoom * (e.code === 'Equal' ? 1.15 : 1 / 1.15), .5, 3); apply(); }
});
addEventListener('keyup', e => held.delete(e.code));
addEventListener('blur', () => held.clear());

/* 9. Keep the room clear of the panel: the camera centres in the part of the screen the panel leaves */
const side = document.querySelector('.side'), details = $('details');
function fitOffset() {
  const k = bufPerCss();
  game.cam.offset = innerWidth > 720 ? [-(side.offsetWidth + 12) / 2 * k, 0] : [0, -(side.offsetHeight + 8) / 2 * k];
  game.cam.snap = true;
}
addEventListener('resize', () => requestAnimationFrame(() => { fitOffset(); flyFit(); })); details.addEventListener('toggle', () => { fitOffset(); flyFit(); });
if (innerWidth <= 720) details.open = false;   // phones: the picture first, the controls one tap away

/* 10. Start: a ?cam= link opens fixed on that view */
const q = new URLSearchParams(location.search).get('cam');
if (q) {
  const n = q.split(',').map(Number);
  if (n.length >= 5 && n.every(Number.isFinite)) {
    Object.assign(S, { yaw: n[0], pitch: n[1], zoom: clamp(n[2], .5, 3), height: clamp(n[3], -40, 100), boost: clamp(n[4], 1, 1.5) });
    if (n.length >= 7) { S.fx = n[5]; S.fy = n[6]; }
    S.fixed = true;
  }
}
const qf = new URLSearchParams(location.search).get('fly');
if (qf) {   // a ?fly= link opens fly mode at that spot: x, y, z, yaw and pitch in degrees, field of view
  const n = qf.split(',').map(Number);
  if (n.length >= 5 && n.every(Number.isFinite)) {
    Object.assign(FLY, { x: n[0], y: n[1], z: n[2], yaw: n[3] * Math.PI / 180, pitch: clamp(n[4], -87, 87) * Math.PI / 180, fov: clamp(n[5] || 70, 45, 110) });
    S.mode = 'fly';
  }
}
const ver = document.createElement('p'); ver.className = 'note'; ver.textContent = 'my-3D2dge ' + E.versionLabel(); details.appendChild(ver);
apply(); fitOffset(); flyFit();
game.focus(S.fx, S.fy, S.height);
game.start({ update, draw });
window.__freeCam = { game, S, apply, preset, setFixed, viewNow, hero, FLY, FS, fly, setMode };
})();
