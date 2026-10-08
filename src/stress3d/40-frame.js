/* =============================================================================
 * THE FRAME: the engine's loop steps the game (its fixed steps, hit-stop, camera, particles) and then calls
 * game._frame() to draw; here that is replaced by frame3d(). It times this as it times its own drawing ("Drawing
 * (CPU)" on the panel), so the two pages' numbers compare directly.
 *   the camera   the engine's own (35-cameras: "engine"): game.view (view, zoom, turn) and game.cam (with its shake)
 *                give an orthographic camera framing exactly the engine's picture (W x H pixels at view.scale per
 *                unit), stretched in height by the view's zBoost through the projection (as in the 3D world lab). The
 *                3D canvas sits where the engine's picture sits (its whole-pixel scale and letterbox), one pixel larger
 *                and shifted by the camera's sub-pixel offset, as the engine presents its own buffer. So the engine's
 *                mouse aiming lands on the 3D picture unchanged. Or one of the 3D cameras (perspective, 35-cameras).
 *   resolution   the engine's own pixels (W x H, the panel's camera distance grows it), balanced (half the screen's
 *                resolution) or full (the screen's); P cycles them. ?res=engine|balanced|full (?pixels=0: full)
 *   look         Card or Puppet (20-crowd), C switches; P switches the resolution
 *   warm-up      the first frame (and the first after a filter change) also draws everything once, empty, so every
 *                shader is built before the fight needs it
 *   window.__stress3d  { ready, backend, R3, CAM, set(key, value), setCam(mode), stats, FX }
 * ============================================================================= */
const RES = ['engine', 'balanced', 'full'];
const R3 = { look: ['card', 'puppet'].includes(QS.get('look')) ? QS.get('look') : 'card', res: RES.includes(QS.get('res')) ? QS.get('res') : QS.get('pixels') === '0' ? 'full' : 'engine' };
/** the picture's pixels per engine pixel at this resolution (the engine's whole-pixel scale S is full) */
const resScale = sc => R3.res === 'engine' ? 1 : R3.res === 'full' ? sc.S : sc.S / 2;
const cam3 = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 300);
const DEG = Math.PI / 180, _S = new THREE.Matrix4(), _M = new THREE.Matrix4(), _g = new THREE.Vector3();
const CV = { right: new THREE.Vector3(), up: new THREE.Vector3(), back: new THREE.Vector3(), q: new THREE.Quaternion(), ppm: 1, vert: 1, snap: true, detail: 1 };
/** the cards' detail: the engine draws them this many times finer than its own pixels, as fine as the picture's own
 *  pixels at the balanced or full resolution (zoomed out, a card is then sharp, not a small sprite blown up), within
 *  cells of at most 256 pixels (each card is drawn and uploaded every frame) */
const cardDetail = (sc, view) => R3.res === 'engine' ? 1 : clamp(Math.min(resScale(sc), 256 / (64 * view.scale)), 1, 8);
const fineViews = new Map();
function fineView(view, q) {
  if (q === 1) return view;
  const s = Math.round(view.scale * q * 16) / 16, key = view.id + ':' + view.yawDeg + ':' + view.pitchDeg + ':' + view.zBoost + ':' + s; let v = fineViews.get(key);
  if (!v) { if (fineViews.size > 300) fineViews.clear(); v = new E.View(view.id, view.label, view.yawDeg, view.pitchDeg, s, view.zBoost); fineViews.set(key, v); }
  return v;
}
const frameEl = $('frame');
let lastFit = '';
/** the 3D canvas over the engine's picture (its whole-pixel scale and letterbox), one pixel larger, at the right size */
function fit(sc) {
  const dpr = sc.dpr, key = [sc.W, sc.H, sc.S, sc.OX, sc.OY, dpr, R3.res].join(','), k = resScale(sc);
  if (key === lastFit) return; lastFit = key;
  Object.assign(frameEl.style, { left: sc.OX / dpr + 'px', top: sc.OY / dpr + 'px', width: sc.W * sc.S / dpr + 'px', height: sc.H * sc.S / dpr + 'px' });
  const cw = (sc.W + 1) * sc.S / dpr + 'px', ch = (sc.H + 1) * sc.S / dpr + 'px';
  renderer.setPixelRatio(1);
  renderer.setSize(Math.max(1, Math.round((sc.W + 1) * k)), Math.max(1, Math.round((sc.H + 1) * k)), false);
  over.width = sc.W + 1; over.height = sc.H + 1;
  for (const c of [canvas3d, over]) { c.style.width = cw; c.style.height = ch; }
  canvas3d.classList.toggle('pixels', R3.res !== 'full');
}
/** the engine's projection, for the camera at buffer origin (ix, iy) */
function placeCamera(view, sc, ix, iy) {
  const ppm = view.scale * U, w = (sc.W + 1) / ppm, h = (sc.H + 1) / ppm;
  Object.assign(cam3, { left: -w / 2, right: w / 2, top: h / 2, bottom: -h / 2 });
  // the world point at the picture's centre: the engine camera's target moved within the picture's plane by its offset
  // on screen (exact for every view, the side view too, where the picture's centre has no ground point)
  const c = game.cam, sr = view.p(c.tx, c.ty, c.tz), dxs = ix + (sc.W + 1) / 2 - sr[0], dys = iy + (sc.H + 1) / 2 - sr[1];
  const sk = view.scale, sp = Math.sin(view.pitch), cw = Math.cos(view.yaw), sw = Math.sin(view.yaw);
  let gx = c.tx + cw * dxs / sk, gy = c.ty - sw * dxs / sk, gz = c.tz;
  if (sp > .5) { gx += sw * dys / (sk * sp); gy += cw * dys / (sk * sp); } else gz += dys / view.bz;
  _g.set(gx / U, gz / U, gy / U);
  const yw = view.yawDeg * DEG, pt = view.pitchDeg * DEG, D = 100;
  cam3.position.set(_g.x + Math.sin(yw) * Math.cos(pt) * D, _g.y + Math.sin(pt) * D, _g.z + Math.cos(yw) * Math.cos(pt) * D);
  if (view.pitchDeg > 89) cam3.up.set(-Math.sin(yw), 0, -Math.cos(yw)); else cam3.up.set(0, 1, 0);   // (straight down: the picture's up is the view's far side)
  cam3.lookAt(_g);
  cam3.updateMatrixWorld(); cam3.updateProjectionMatrix();
  if (view.zBoost !== 1) {   // the engine's height boost, in the projection only: P * V * S(1, boost, 1) * V^-1
    _M.copy(cam3.matrixWorldInverse).multiply(_S.makeScale(1, view.zBoost, 1)).multiply(cam3.matrixWorld);
    cam3.projectionMatrix.multiply(_M); cam3.projectionMatrixInverse.copy(cam3.projectionMatrix).invert();
  }
  cam3.getWorldQuaternion(CV.q);
  CV.right.set(1, 0, 0).applyQuaternion(CV.q); CV.up.set(0, 1, 0).applyQuaternion(CV.q); CV.back.set(0, 0, 1).applyQuaternion(CV.q);
  CV.ppm = ppm; CV.vert = 1 + (view.zBoost - 1) * CV.up.y * CV.up.y; CV.snap = true;
  OUTLINE_PX.value.set(2 / (sc.W + 1), 2 / (sc.H + 1));   // one engine pixel, whatever the resolution
}
const NO_CUT = { id: 'persp', yawDeg: 0, pitchDeg: 90, isTop: true };   // 3D cameras: every wall at full height
let warmed = false;
/** draw one picture with every batch, atlas page, trail and floor shape in it (empty, scaled to nothing), so each
 *  material builds its shader and GPU pipelines now, shadow passes too, and not on the frame a monster kind or an effect
 *  first appears (tens of milliseconds each: the stall the benchmark caught at 50 monsters) */
function warmUp(camNow, cardView) {
  ARCS.prepare(8); RINGS.prepare(12); RIBBONS.prepare(6); ATLAS.prepare(cardView, 2);
  const Z = new THREE.Matrix4().makeScale(0, 0, 0), inst = [], pools = [...ARCS.list, ...RINGS.list, ...RIBBONS.list];
  for (const b of [...Object.values(BATCH), ...Object.values(PART)]) { inst.push(b.mesh); if (b.shell) inst.push(b.shell); }
  for (const pg of ATLAS.pages) inst.push(pg.mesh);
  for (const m of inst) { m.setMatrixAt(0, Z); m.instanceMatrix.clearUpdateRanges(); m.instanceMatrix.needsUpdate = true; m.count = 1; }
  for (const m of pools) m.visible = true;
  renderFrame(camNow);
  for (const m of inst) m.count = 0;
  for (const m of pools) m.visible = false;
  warmed = true;
}
const STATS = { drawn: 0, culled: 0, calls: 0, tris: 0, frames: 0, detail: 1 };
/** one picture of the game as it stands (the engine's loop calls this in place of its own drawing) */
function frame3d() {
  const sc = game.screen, view = game.view, c = game.cam, s = game.shakeAmt, t = game.real, dt = clamp(t - (CAM.last || t), 0, .1); CAM.last = t;
  // the engine's camera with its shake, split into whole pixels and the sub-pixel rest, as Screen.begin splits it
  const shx = s > .05 ? (Math.sin(t * 83) + Math.sin(t * 57.3)) * .5 * s : 0, shy = s > .05 ? (Math.sin(t * 71) + Math.sin(t * 49.7)) * .5 * s : 0;
  const cx = c.x + shx, cy = c.y + shy, ix = Math.floor(cx), iy = Math.floor(cy);
  sc.ix = ix; sc.iy = iy; sc.fx = cx - ix; sc.fy = cy - iy;   // (the engine's mouse aiming reads these)
  fit(sc);
  const W1 = sc.W + 1, H1 = sc.H + 1;
  let camNow, cardView, vis, project;
  if (!persp()) {   // the engine's camera, to the pixel
    canvas3d.style.transform = over.style.transform = `translate(${-Math.round(sc.fx * sc.S) / sc.dpr}px, ${-Math.round(sc.fy * sc.S) / sc.dpr}px)`;
    placeCamera(view, sc, ix, iy); placeWalls(view);
    camNow = cam3; cardView = view;
    vis = (x, y, z) => { const p = view.p(x, y, z), sx = p[0] - ix, sy = p[1] - iy; return sx > -60 && sx < W1 + 60 && sy > -60 && sy < H1 + 100; };
    project = (x, y, z) => { const p = view.p(x, y, z); return [p[0] - ix, p[1] - iy]; };
  } else {          // a 3D camera
    canvas3d.style.transform = over.style.transform = '';
    cardView = placePersp(cameraPose(dt), sc, shx, shy);
    if (depthOn()) placeWalls(view, { key: 'depth' + Math.floor(G.hero.y / T), fn: G.depthCut }); else placeWalls(NO_CUT);
    camNow = camP; vis = visPersp; project = (x, y, z) => projectPersp(x, y, z, W1, H1);
  }
  let lights = lightHall(t);
  animateBraziers(G.S.lights);
  const h = G.hero; heroLight.position.set(h.x / U, 40 / U, h.y / U); heroLight.intensity = game.gpu.enabled && !h.dead ? LIGHT.hero : 0; if (heroLight.intensity) lights++;
  // the wisps nearest the hero carry lights when the panel says so (the 2D page lights up to 16; here up to 4)
  const wisps = G.S.monsterLights ? G.enemies.filter(e => e.type === 'wisp' && e.alive).sort((a, b) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y)) : [];
  wispLights.forEach((L, i) => { const e = wisps[i]; L.intensity = e ? LIGHT.wisp : 0; if (e) { L.position.set(e.x / U, e.z / U, e.y / U); lights++; } });
  const fine = fineView(cardView, cardDetail(sc, cardView)); CV.detail = fine.scale / cardView.scale;
  renderer.info.reset();
  if (!warmed) warmUp(camNow, fine);
  const crowd = drawCrowd({ view: fine, vis, look: R3.look, outlines: G.S.outlines, v: CV, hideHero: CAM.mode === 'first' });
  lights += drawEffects(CV);
  renderFrame(camNow);
  drawOverlay(project, W1, H1, CAM.mode === 'first' || (CAM.locked && CAM.mode === 'chase'));
  // the numbers the panel shows, as the engine counts its own
  const info = renderer.info.render, st = game.stats;
  st.actors = crowd.drawn; st.culled = crowd.culled; st.items = info.drawCalls; G.frameStats.lights = lights;
  STATS.drawn = crowd.drawn; STATS.culled = crowd.culled; STATS.detail = CV.detail; STATS.calls = info.drawCalls; STATS.tris = info.triangles; STATS.frames++;
  G.hud();
  $('mGpu').textContent = 'three.js · ' + BACKEND;
  if (R3.res !== 'engine') { const k = resScale(sc), w = Math.round(W1 * k), hh = Math.round(H1 * k); $('mRes').textContent = w + '×' + hh + ' (' + Math.round(w * hh / 1000) + 'k px)'; }
}
game._frame = frame3d;

/* ---- the panel's 3D section and keys ---- */
const LOOK_NOTES = {
  card: 'Card: the engine draws each character, exactly as on the 2D page, onto a card standing in the 3D hall. Flat, one depth each, lit by its own tones.',
  puppet: 'Puppet: the same rigs and poses wearing 3D parts, drawn in shared batches: real depth, torchlight and shadows. The look is an approximation.'
};
function sync3d() {
  document.querySelectorAll('[data-look]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.look === R3.look)));
  $('res3d').value = R3.res; $('lookNote').textContent = LOOK_NOTES[R3.look];
}
function set3d(k, v) {
  if (k === 'look') R3.look = v; else if (k === 'res' && RES.includes(v)) R3.res = v; else if (k === 'pixels') R3.res = v ? 'engine' : 'full';   // ('pixels': the switch before the resolution menu)
  lastFit = ''; sync3d();
}
document.querySelectorAll('[data-look]').forEach(b => b.addEventListener('click', () => { set3d('look', b.dataset.look); b.blur(); }));
$('res3d').addEventListener('change', e => { set3d('res', e.target.value); e.target.blur(); });
addEventListener('keydown', e => {
  if (e.repeat || e.ctrlKey || e.metaKey || (e.target && ['SELECT', 'TEXTAREA', 'INPUT'].includes(e.target.tagName) && e.target.type !== 'checkbox')) return;
  if (e.code === 'KeyC') set3d('look', R3.look === 'card' ? 'puppet' : 'card');
  else if (e.code === 'KeyP') { set3d('res', RES[(RES.indexOf(R3.res) + 1) % RES.length]); game.note(R3.res === 'engine' ? 'ENGINE PIXELS' : R3.res === 'balanced' ? 'BALANCED RESOLUTION' : 'FULL RESOLUTION'); }
});
{
  const url = new URL(location.href), webgl = BACKEND !== 'WebGPU';
  if (webgl) url.searchParams.delete('backend'); else url.searchParams.set('backend', 'webgl');
  $('backendBtn').textContent = webgl ? 'Try it on WebGPU' : 'Try it on WebGL 2';
  $('backendBtn').addEventListener('click', () => { location.href = url.href; });
  $('backend3d').innerHTML = `Drawn by <b>three.js r182</b> on <b>${BACKEND}</b>. The game is the 2D page's own code, unchanged; only the drawing is new.`;
  // the 2D page's address: the site serves pages without .html, a local server as files
  // the 2D page's address, with the same engine camera (?view, ?cam): the site serves pages without .html, a local server as files
  const keepQ = () => { const u = new URLSearchParams(location.search); for (const k of [...u.keys()]) if (!['view', 'cam'].includes(k)) u.delete(k); const q = u.toString(); return q ? '?' + q : ''; };
  $('to2d').href = (/\.html$/.test(location.pathname) ? 'stress-test.html' : '/stress-test') + keepQ();
}
// the engine's canvas stays on top for the mouse and keys, but shows nothing; the stand-in GPU lighting reports in
$('screen').style.opacity = '0';
game.gpu._st = 'on'; if (game.gpu.onStatus) game.gpu.onStatus();
// the benchmark's report says what drew it, for the head-to-head with the 2D page
const FX_NAMES = { cel: 'Comic cel', pixel: 'Pixel' }, FX_TO = { all: 'the entire scene', objects: 'the characters and objects', env: 'the environment' };
G.HOOKS.renderer = () => 'drawn by three.js r182 on ' + BACKEND + ', ' + (R3.look === 'card' ? 'Card' : 'Puppet') + ' look, ' + (R3.res === 'engine' ? "the engine's pixels" : R3.res === 'balanced' ? 'balanced resolution (half the screen\'s)' : 'full resolution') +
  (FX.look !== 'clean' ? ', filter ' + FX_NAMES[FX.look] + ' on ' + FX_TO[FX.apply] : ', no filter') + (FX.bloom ? ', bloom' : '') + (FX.fxaa ? ', FXAA' : '');
$('loading3d').hidden = true;
sync3d(); syncCam(); syncFX();
window.__stress3d = { ready: true, backend: BACKEND, R3, CAM, set: set3d, setCam, renderer, scene, stats: STATS, camera: cam3, cameraP: camP, LIGHT, FX };
