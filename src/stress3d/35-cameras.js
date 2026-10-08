/* =============================================================================
 * THE CAMERAS. Two kinds:
 *   engine     the 2D page's own camera, whatever it is set to (its views, the side view, the custom view, zoom, turn,
 *              shake, fixed in place): an orthographic camera framing exactly the engine's picture (40-frame). It is
 *              shared code (src/stress.game.js), so it is the same camera on both stress tests.
 *   3D only    perspective cameras the engine can't give:
 *     chase    behind the hero and above him. A click on the picture captures the mouse: it turns the camera and the
 *              hero aims straight ahead; Esc frees it, and then the mouse aims at the floor and [ ] turn. The wheel or
 *              - = pull it in and out; it slides in front of a wall rather than through it
 *     first    the hero's eyes (he isn't drawn): the same mouse and keys; the wheel or - = set the field of view
 *     fly      a free camera: WASD fly where it looks, Q and E (or Space) down and up, Shift faster, the arrows or the
 *              captured mouse look. The hero stands where he is (the keys are the camera's)
 *     fixed    a perspective camera left where it was: F in chase, first person or fly fixes the camera there, and the
 *              hero is yours again; F frees it into fly mode from there
 *   With a 3D camera the hero's controls follow it: W walks away from the camera (the game's movement reads an engine
 *   view turned to match it), and he aims where the camera looks (mouse captured) or where the mouse points on the
 *   floor. Cards are drawn by the engine from the camera's own turn and tilt.
 *   side scrolling with depth (M, shared code: src/stress.game.js's DEPTH): the engine camera's side view, but through
 *            a perspective camera at the same pose the 2D page's Mode 7 uses, on a rail beside the hero, so he shrinks
 *            and grows with depth; walls between the camera and the hero are cut low as on the 2D page
 *   ?cam3=chase | first | fly[,x,y,z,yaw,pitch,fov] | fixed,x,y,z,yaw,pitch,fov  (engine units and degrees) opens one
 * ============================================================================= */
const DEG3 = Math.PI / 180;
const camP = new THREE.PerspectiveCamera(60, 1, .05, 300);
const CAM = {
  mode: 'engine', yaw: -Math.PI / 2, locked: false, held: new Set(), last: 0,
  chase: { pitch: -.36, dist: 88, fov: 60 }, first: { pitch: -.08, fov: 75 },
  fly: { x: CXu, y: CYu + 220, z: 90, yaw: -Math.PI / 2, pitch: -.32, fov: 70 },
  fixed: null, pose: null, smooth: null, eyeZ: 24
};
const CAM_LABEL = { chase: 'Chase camera', first: 'First person', fly: 'Fly camera', fixed: 'Fixed 3D camera' };
/** a 3D camera of its own (chase, first, fly, fixed: the panel's camera buttons and their keys) */
const cam3d = () => CAM.mode !== 'engine';
/** the engine camera's side scrolling with depth: a perspective camera at the shared depth pose */
const depthOn = () => CAM.mode === 'engine' && G.depthActive();
/** drawn through the perspective camera */
const persp = () => cam3d() || depthOn();
/** the engine view the hero's controls read in a 3D camera (W walks away from the camera), and the view cards are drawn
 *  from (the camera's own turn and tilt); cached by whole degrees */
const camViews = new Map();
function camView(kind, yawDeg, pitchDeg) {
  const key = kind + ':' + yawDeg + ':' + pitchDeg; let v = camViews.get(key);
  if (!v) { if (camViews.size > 500) camViews.clear(); v = new E.View('cam3-' + kind, '3D camera', yawDeg, pitchDeg, 1.5, 1); camViews.set(key, v); }
  return v;
}
/** the engine's turn for a camera looking along ground heading a (the engine's yaw puts the camera at (sin, cos)) */
const engineYaw = a => ((Math.round(Math.atan2(-Math.cos(a), -Math.sin(a)) / DEG3) % 360) + 360) % 360;

/* ---- each camera's pose: { x, y, z (engine units), yaw, pitch (radians), fov } ---- */
const _cp = [0, 0, 0];
function chasePose(dt) {
  const h = G.hero, C = CAM.chase, k = 1 - Math.exp(-dt * 12);
  // the point it looks at follows the hero smoothly (turning stays immediate)
  const s = CAM.smooth || (CAM.smooth = [h.x, h.y]); s[0] += (h.x - s[0]) * k; s[1] += (h.y - s[1]) * k;
  const tx = s[0], ty = s[1], tz = 24, cp = Math.cos(C.pitch), fx = Math.cos(CAM.yaw) * cp, fy = Math.sin(CAM.yaw) * cp, fz = Math.sin(C.pitch);
  let d = C.dist;
  for (let r = 6; r <= C.dist; r += 3) {   // pull in front of a wall (or the hall's edge) between the hero and the camera
    const x = tx - fx * r, y = ty - fy * r, z = tz - fz * r;
    if (z < map.heightAt(x, y) + 4) { d = Math.max(6, r - 5); break; }
  }
  return { x: tx - fx * d, y: ty - fy * d, z: Math.max(3, tz - fz * d), yaw: CAM.yaw, pitch: C.pitch, fov: C.fov };
}
function firstPose(dt) {
  const h = G.hero, k = 1 - Math.exp(-dt * 16);
  frame(h.rig); wp(h.rig.J.head, _cp);   // his head (it bobs with his steps, drops when he falls)
  CAM.eyeZ += (_cp[1] * U + 1 - CAM.eyeZ) * k;
  return { x: h.x + Math.cos(CAM.yaw) * 2.5, y: h.y + Math.sin(CAM.yaw) * 2.5, z: CAM.eyeZ, yaw: CAM.yaw, pitch: CAM.first.pitch, fov: CAM.first.fov };
}
function flyStep(dt) {
  const F = CAM.fly, k = c => CAM.held.has(c), sp = (k('ShiftLeft') || k('ShiftRight') ? 170 : 64) * dt;
  F.yaw += ((k('ArrowRight') ? 1 : 0) - (k('ArrowLeft') ? 1 : 0)) * 1.7 * dt;
  F.pitch = clamp(F.pitch + ((k('ArrowUp') ? 1 : 0) - (k('ArrowDown') ? 1 : 0)) * 1.2 * dt, -1.5, 1.5);
  const fwd = (k('KeyW') ? 1 : 0) - (k('KeyS') ? 1 : 0), str = (k('KeyD') ? 1 : 0) - (k('KeyA') ? 1 : 0), up = (k('KeyE') || k('Space') ? 1 : 0) - (k('KeyQ') ? 1 : 0);
  const cy = Math.cos(F.yaw), sy = Math.sin(F.yaw), cp = Math.cos(F.pitch), spp = Math.sin(F.pitch);
  F.x = clamp(F.x + (cp * cy * fwd - sy * str) * sp, -6 * T, (MW + 6) * T); F.y = clamp(F.y + (cp * sy * fwd + cy * str) * sp, -6 * T, (MH + 6) * T);
  F.z = clamp(F.z + (spp * fwd + up) * sp, 2, 600);
  return F;
}
/** turning with the keys in chase and first person ([ ] held), and the camera's pose this frame */
function cameraPose(dt) {
  if (CAM.mode === 'chase' || CAM.mode === 'first') CAM.yaw += ((CAM.held.has('BracketRight') ? 1 : 0) - (CAM.held.has('BracketLeft') ? 1 : 0)) * 2.2 * dt;
  const p = depthOn() ? G.depthPose() : CAM.mode === 'chase' ? chasePose(dt) : CAM.mode === 'first' ? firstPose(dt) : CAM.mode === 'fly' ? flyStep(dt) : CAM.fixed;
  return (CAM.pose = p);
}
const _look = new THREE.Vector3(), _pm = new THREE.Matrix4(), _fr = new THREE.Frustum(), _sph = new THREE.Sphere();
/** aim the perspective camera at a pose (with the engine's screen shake), and the hero's controls with it */
function placePersp(p, sc, shx, shy) {
  camP.fov = p.fov; camP.aspect = (sc.W + 1) / (sc.H + 1); camP.near = .05; camP.far = 300;
  const cp = Math.cos(p.pitch), fx = Math.cos(p.yaw) * cp, fz = Math.sin(p.yaw) * cp, fy = Math.sin(p.pitch);
  // the shake moves the camera sideways and up a little (the engine moves its picture a few pixels)
  const rx = -Math.sin(p.yaw), rz = Math.cos(p.yaw), k = .012;
  camP.position.set(p.x / U + rx * shx * k, p.z / U - shy * k, p.y / U + rz * shx * k);
  camP.up.set(0, 1, 0); camP.lookAt(_look.set(camP.position.x + fx, camP.position.y + fy, camP.position.z + fz));
  camP.updateMatrixWorld(); camP.updateProjectionMatrix();
  camP.getWorldQuaternion(CV.q);
  CV.right.set(1, 0, 0).applyQuaternion(CV.q); CV.up.set(0, 1, 0).applyQuaternion(CV.q); CV.back.set(0, 0, 1).applyQuaternion(CV.q);
  CV.ppm = 1.5 * U; CV.vert = 1; CV.snap = false;
  OUTLINE_PX.value.set(2 / (sc.W + 1), 2 / (sc.H + 1));
  _fr.setFromProjectionMatrix(_pm.multiplyMatrices(camP.projectionMatrix, camP.matrixWorldInverse), camP.coordinateSystem);
  // the hero's controls: the game reads game.view to turn the keys into a ground direction
  const yw = engineYaw(p.yaw);
  if (cam3d() && CAM.mode !== 'fly') game.view = camView('input', yw, 45);   // (with depth the engine's side view stays: W walks away)
  return camView('card', yw, clamp(Math.round(-p.pitch / DEG3), 0, 89));
}
/** on screen for the perspective camera: a sphere round the body inside the view */
const visPersp = (x, y, z) => _fr.intersectsSphere(_sph.set(_look.set(x / U, (z + 14) / U, y / U), 2.2));
/** a point (engine units) on the overlay's pixels, or null behind the camera */
const _pp3 = new THREE.Vector3();
function projectPersp(x, y, z, W, H) {
  _pp3.set(x / U, z / U, y / U).project(camP); if (_pp3.z > 1 || _pp3.z < -1) return null;
  return [(_pp3.x + 1) / 2 * W, (1 - _pp3.y) / 2 * H];
}

/* ---- aiming: where the mouse points on the floor, or straight ahead with the mouse captured ---- */
const _rd = new THREE.Vector3();
function mouseOnFloor() {
  const r = canvas3d.getBoundingClientRect(), m = game.input.mouse; if (!r.width) return null;
  _rd.set((m.cx - r.left) / r.width * 2 - 1, -((m.cy - r.top) / r.height * 2 - 1), .5).unproject(camP).sub(camP.position).normalize();
  if (_rd.y > -1e-3) return null;
  const k = -camP.position.y / _rd.y; return [(camP.position.x + _rd.x * k) * U, (camP.position.z + _rd.z * k) * U];
}
const engineMouseGround = game.mouseGround.bind(game);
game.mouseGround = () => {
  if (!persp()) return engineMouseGround();
  if (CAM.mode === 'fly' || !CAM.pose) return null;
  const h = G.hero, ahead = [h.x + Math.cos(CAM.pose.yaw) * 60, h.y + Math.sin(CAM.pose.yaw) * 60];
  return CAM.locked ? ahead : mouseOnFloor() || ahead;
};

/* ---- switching ---- */
/** out of the hero's head (first person) into a spot behind and above him, where fly and fixed cameras show him */
const backOff = p => ({ x: p.x - Math.cos(p.yaw) * 56, y: p.y - Math.sin(p.yaw) * 56, z: p.z + 26, yaw: p.yaw, pitch: Math.min(p.pitch, -.3), fov: p.fov });
function setCam(mode, keepPose) {
  if (mode === CAM.mode && !keepPose) return;
  const was = CAM.mode, p = CAM.pose;
  if (mode !== 'engine' && was === 'engine') {   // from the engine's view: keep looking the same way
    const v = game.view; CAM.yaw = Math.atan2(-Math.cos(v.yaw), -Math.sin(v.yaw));
  }
  if (mode === 'fly' && p && was !== 'engine') Object.assign(CAM.fly, was === 'first' ? backOff(p) : { x: p.x, y: p.y, z: p.z, yaw: p.yaw, pitch: p.pitch, fov: p.fov });
  else if (mode === 'fly' && was === 'engine') Object.assign(CAM.fly, { x: G.hero.x - Math.cos(CAM.yaw) * 120, y: G.hero.y - Math.sin(CAM.yaw) * 120, z: 80, yaw: CAM.yaw, pitch: -.4 });
  if ((mode === 'chase' || mode === 'first') && p && was !== 'engine') CAM.yaw = p.yaw;
  CAM.mode = mode; CAM.smooth = null; CAM.held.clear();
  game.input.clear();   // nothing stays held across the switch (fly mode takes the keys)
  if (mode === 'engine') { game.setView(game.baseView); if (document.pointerLockElement) document.exitPointerLock(); }
  if (mode === 'engine' || mode === 'fixed') CAM.locked = false;
  game.note(mode === 'engine' ? 'ENGINE CAMERA' : CAM_LABEL[mode].toUpperCase());
  lastFit = ''; syncCam(); G.syncUI();
}
/** F in a 3D camera: fix it where it is (the hero is yours again), or free a fixed one into fly mode */
function fix3d() {
  if (!cam3d()) return false;   // (the engine camera, depth or not, fixes as the 2D page does)
  if (CAM.mode === 'fixed') { setCam('fly', true); return true; }
  const p = CAM.mode === 'first' ? backOff(CAM.pose || firstPose(0)) : CAM.pose || chasePose(0);
  CAM.fixed = { x: p.x, y: p.y, z: p.z, yaw: p.yaw, pitch: p.pitch, fov: p.fov };
  if (document.pointerLockElement) document.exitPointerLock();
  setCam('fixed', true); return true;
}
const poseParam = p => [Math.round(p.x), Math.round(p.y), Math.round(p.z), Math.round(p.yaw / DEG3), Math.round(p.pitch / DEG3), Math.round(p.fov)].join(',');
G.HOOKS.camera = () => depthOn() ? 'Side scrolling with depth (a perspective camera on a rail, ' + Math.round(G.depthPose().fov) + '° field of view)' + (G.FIX.on ? ', camera fixed' : '')
  : !cam3d() ? null : CAM_LABEL[CAM.mode] + ' (perspective, ' + Math.round((CAM.pose || {}).fov || 60) + '° field of view)';
G.HOOKS.camLink = () => {
  if (!cam3d()) return null;
  const u = new URL(location.href); u.searchParams.delete('cam'); u.searchParams.delete('cam3');
  const v = CAM.mode === 'fixed' || CAM.mode === 'fly' ? CAM.mode + ',' + poseParam(CAM.pose || CAM.fly) : CAM.mode;
  const rest = u.search.slice(1); return u.origin + u.pathname + '?' + [rest, 'cam3=' + v].filter(Boolean).join('&') + u.hash;
};
G.HOOKS.fix = fix3d;
G.HOOKS.fixed = () => cam3d() ? CAM.mode === 'fixed' : null;

/* ---- the keys, the wheel and the mouse (taken before the game sees them where a 3D camera needs them) ---- */
const FLY_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyQ', 'KeyE', 'Space', 'ShiftLeft', 'ShiftRight', 'KeyJ', 'KeyK', 'KeyL', 'KeyX', 'KeyZ']);
const typingIn = e => { const t = e.target; return t && (t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || (t.tagName === 'INPUT' && !['range', 'checkbox', 'radio', 'button'].includes(t.type))); };
const take = e => { e.preventDefault(); e.stopImmediatePropagation(); };
function zoom3(dir) {   // chase: distance; first person and fly: field of view
  if (CAM.mode === 'chase') CAM.chase.dist = clamp(CAM.chase.dist * (dir > 0 ? 1 / 1.15 : 1.15), 24, 260);
  else if (CAM.mode === 'first') CAM.first.fov = clamp(CAM.first.fov - dir * 5, 45, 110);
  else if (CAM.mode === 'fly') CAM.fly.fov = clamp(CAM.fly.fov - dir * 5, 40, 110);
}
addEventListener('keydown', e => {
  if (typingIn(e) || e.ctrlKey || e.metaKey) return;
  if (CAM.mode === 'fly' && FLY_KEYS.has(e.code)) { CAM.held.add(e.code); take(e); return; }
  if (/^Digit[1-4]$/.test(e.code)) { if (!e.repeat) setCam(['engine', 'chase', 'first', 'fly'][+e.code.slice(5) - 1]); take(e); return; }
  if (!cam3d()) return;
  if (e.code === 'BracketLeft' || e.code === 'BracketRight') { CAM.held.add(e.code); take(e); }
  else if (e.code === 'Minus' || e.code === 'NumpadSubtract' || e.code === 'Equal' || e.code === 'NumpadAdd') { zoom3(e.code === 'Equal' || e.code === 'NumpadAdd' ? 1 : -1); take(e); }
  else if (e.code === 'Digit0') { Object.assign(CAM.chase, { pitch: -.36, dist: 88, fov: 60 }); Object.assign(CAM.first, { pitch: -.08, fov: 75 }); take(e); }
  else if (e.code === 'KeyV') { setCam('engine'); take(e); }
  else if (e.code === 'KeyF') { if (!e.repeat) fix3d(); take(e); }
}, true);
addEventListener('keyup', e => CAM.held.delete(e.code), true);
addEventListener('blur', () => CAM.held.clear());
const screenEl = $('screen');
addEventListener('wheel', e => { if (cam3d() && e.target === screenEl) { e.stopPropagation(); zoom3(e.deltaY < 0 ? 1 : -1); } }, { capture: true, passive: true });
addEventListener('pointerdown', e => {
  if (!cam3d() || e.target !== screenEl || e.pointerType !== 'mouse') return;
  if (CAM.mode === 'fly') e.stopPropagation();   // a click in fly mode only captures the mouse (no swing)
  if (CAM.mode !== 'fixed' && !CAM.locked && screenEl.requestPointerLock) { try { const r = screenEl.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (err) { /* refused: the keys still turn */ } }
}, true);
document.addEventListener('pointerlockchange', () => { CAM.locked = document.pointerLockElement === screenEl; syncCam(); });
document.addEventListener('mousemove', e => {
  if (!CAM.locked || !cam3d()) return;
  const k = .0024, dx = e.movementX || 0, dy = e.movementY || 0;
  if (CAM.mode === 'fly') { CAM.fly.yaw += dx * k; CAM.fly.pitch = clamp(CAM.fly.pitch - dy * k, -1.5, 1.5); }
  else { CAM.yaw += dx * k; const c = CAM.mode === 'chase' ? CAM.chase : CAM.first; c.pitch = clamp(c.pitch - dy * k, CAM.mode === 'chase' ? -1.3 : -1.2, CAM.mode === 'chase' ? .15 : 1.1); }
});
// a view button or the custom view's sliders go back to the engine's camera
document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => setCam('engine')));
['camYaw', 'camPitch', 'camBoost'].forEach(id => $(id).addEventListener('input', () => setCam('engine')));

/* ---- the panel ---- */
const CAM_NOTES = {
  engine: 'Engine: the 2D page\'s own camera (its views, side scrolling, custom, zoom, turn, fix), the same picture on both pages.',
  chase: 'Chase: behind the hero. Click the picture to steer with the mouse (Esc frees it); [ ] turn, the wheel pulls in and out. F fixes the camera here.',
  first: 'First person: through the hero\'s eyes. Click to look with the mouse (Esc frees it); [ ] turn, the wheel sets the field of view. F fixes the camera here.',
  fly: 'Fly: WASD fly where you look, Q and E down and up, Shift faster, the arrows or a click (mouse look) to look. The hero waits. F fixes the camera here and gives you the hero back.',
  fixed: 'Fixed: the camera stays here while you play; the hero walks away from it with W. F frees it (fly mode). Copy camera link keeps it.'
};
function syncCam() {
  document.querySelectorAll('[data-cam3]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cam3 === CAM.mode || (b.dataset.cam3 === 'fly' && CAM.mode === 'fixed'))));
  $('camNote').textContent = CAM_NOTES[CAM.mode] + (CAM.locked ? ' Mouse captured: Esc frees it.' : '');
  $('screen').style.cursor = cam3d() && CAM.mode !== 'fixed' && !CAM.locked ? 'pointer' : '';
}
document.querySelectorAll('[data-cam3]').forEach(b => b.addEventListener('click', () => { setCam(b.dataset.cam3); b.blur(); }));
// ?cam3= opens a 3D camera
{
  const q = (QS.get('cam3') || '').split(','), n = q.slice(1).map(Number);
  if (['chase', 'first'].includes(q[0]) || (q[0] === 'fly' && q.length === 1)) CAM.mode = q[0];
  else if (['fly', 'fixed'].includes(q[0]) && n.length >= 5 && n.every(Number.isFinite)) {
    const p = { x: n[0], y: n[1], z: n[2], yaw: n[3] * DEG3, pitch: clamp(n[4], -86, 86) * DEG3, fov: clamp(n[5] || 70, 40, 110) };
    if (q[0] === 'fly') Object.assign(CAM.fly, p); else CAM.fixed = p;
    CAM.mode = q[0];
  }
}
