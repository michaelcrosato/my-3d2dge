/* =============================================================================
 * THE FRAME: the engine's loop steps the game (its fixed steps, hit-stop, camera, particles) and then calls
 * game._frame() to draw; here that is replaced by frame3d(). It times this as it times its own drawing ("Drawing
 * (CPU)" on the panel), so the two pages' numbers compare directly.
 *   the camera   the engine's own: game.view (view, zoom and turn) and game.cam (with its shake) give an orthographic
 *                camera framing exactly the engine's picture (W x H pixels at view.scale per unit), stretched in
 *                height by the view's zBoost through the projection (as in the 3D world lab). The 3D canvas sits where
 *                the engine's picture sits (its whole-pixel scale and letterbox), one pixel larger and shifted by the
 *                camera's sub-pixel offset, as the engine presents its own buffer. So the engine's mouse aiming lands
 *                on the 3D picture unchanged.
 *   resolution   the engine's own pixels (W x H, the panel's camera distance grows it), or the screen's full resolution
 *   look         Card or Puppet (20-crowd), C switches; X switches the resolution
 *   window.__stress3d  { ready, backend, look, pixels, set(key, value), stats }
 * ============================================================================= */
const R3 = { look: ['card', 'puppet'].includes(QS.get('look')) ? QS.get('look') : 'card', pixels: QS.get('pixels') !== '0' };
const cam3 = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 200);
const DEG = Math.PI / 180, _S = new THREE.Matrix4(), _M = new THREE.Matrix4(), _g = new THREE.Vector3();
const CV = { right: new THREE.Vector3(), up: new THREE.Vector3(), back: new THREE.Vector3(), q: new THREE.Quaternion(), ppm: 1, vert: 1 };
const frameEl = $('frame');
let lastFit = '';
/** the 3D canvas over the engine's picture (its whole-pixel scale and letterbox), one pixel larger, at the right size */
function fit(sc) {
  const dpr = sc.dpr, key = [sc.W, sc.H, sc.S, sc.OX, sc.OY, dpr, R3.pixels].join(',');
  if (key === lastFit) return; lastFit = key;
  Object.assign(frameEl.style, { left: sc.OX / dpr + 'px', top: sc.OY / dpr + 'px', width: sc.W * sc.S / dpr + 'px', height: sc.H * sc.S / dpr + 'px' });
  const cw = (sc.W + 1) * sc.S / dpr + 'px', ch = (sc.H + 1) * sc.S / dpr + 'px';
  renderer.setPixelRatio(1);
  if (R3.pixels) renderer.setSize(sc.W + 1, sc.H + 1, false); else renderer.setSize((sc.W + 1) * sc.S, (sc.H + 1) * sc.S, false);
  over.width = sc.W + 1; over.height = sc.H + 1;
  for (const c of [canvas3d, over]) { c.style.width = cw; c.style.height = ch; }
  canvas3d.classList.toggle('pixels', R3.pixels);
}
/** the engine's projection, for the camera at buffer origin (ix, iy): the ground point under the picture's centre */
function placeCamera(view, sc, ix, iy) {
  const ppm = view.scale * U, w = (sc.W + 1) / ppm, h = (sc.H + 1) / ppm;
  Object.assign(cam3, { left: -w / 2, right: w / 2, top: h / 2, bottom: -h / 2 });
  const g = view.toGround(ix + (sc.W + 1) / 2, iy + (sc.H + 1) / 2);
  _g.set(g[0] / U, 0, g[1] / U);
  const yw = view.yawDeg * DEG, pt = view.pitchDeg * DEG;
  cam3.position.set(_g.x + Math.sin(yw) * Math.cos(pt) * 60, Math.sin(pt) * 60, _g.z + Math.cos(yw) * Math.cos(pt) * 60);
  cam3.up.set(0, 1, 0); cam3.lookAt(_g);
  cam3.updateMatrixWorld(); cam3.updateProjectionMatrix();
  if (view.zBoost !== 1) {   // the engine's height boost, in the projection only: P * V * S(1, boost, 1) * V^-1
    _M.copy(cam3.matrixWorldInverse).multiply(_S.makeScale(1, view.zBoost, 1)).multiply(cam3.matrixWorld);
    cam3.projectionMatrix.multiply(_M); cam3.projectionMatrixInverse.copy(cam3.projectionMatrix).invert();
  }
  cam3.getWorldQuaternion(CV.q);
  CV.right.set(1, 0, 0).applyQuaternion(CV.q); CV.up.set(0, 1, 0).applyQuaternion(CV.q); CV.back.set(0, 0, 1).applyQuaternion(CV.q);
  CV.ppm = ppm; CV.vert = 1 + (view.zBoost - 1) * CV.up.y * CV.up.y;
  OUTLINE_PX.value.set(2 / (sc.W + 1), 2 / (sc.H + 1));   // one engine pixel, whatever the resolution
}
const STATS = { drawn: 0, culled: 0, calls: 0, tris: 0, frames: 0 };
/** one picture of the game as it stands (the engine's loop calls this in place of its own drawing) */
function frame3d() {
  const sc = game.screen, view = game.view, c = game.cam, s = game.shakeAmt, t = game.real;
  // the engine's camera with its shake, split into whole pixels and the sub-pixel rest, as Screen.begin splits it
  const shx = s > .05 ? (Math.sin(t * 83) + Math.sin(t * 57.3)) * .5 * s : 0, shy = s > .05 ? (Math.sin(t * 71) + Math.sin(t * 49.7)) * .5 * s : 0;
  const cx = c.x + shx, cy = c.y + shy, ix = Math.floor(cx), iy = Math.floor(cy);
  sc.ix = ix; sc.iy = iy; sc.fx = cx - ix; sc.fy = cy - iy;   // (the engine's mouse aiming reads these)
  fit(sc);
  const shift = `translate(${-Math.round(sc.fx * sc.S) / sc.dpr}px, ${-Math.round(sc.fy * sc.S) / sc.dpr}px)`;
  canvas3d.style.transform = over.style.transform = shift;
  placeCamera(view, sc, ix, iy);
  placeWalls(view);
  let lights = lightHall(t);
  animateBraziers(G.S.lights);
  const h = G.hero; heroLight.position.set(h.x / U, 40 / U, h.y / U); heroLight.intensity = game.gpu.enabled && !h.dead ? LIGHT.hero : 0; if (heroLight.intensity) lights++;
  // the wisps nearest the hero carry lights when the panel says so (the 2D page lights up to 16; here up to 4)
  const wisps = G.S.monsterLights ? G.enemies.filter(e => e.type === 'wisp' && e.alive).sort((a, b) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y)) : [];
  wispLights.forEach((L, i) => { const e = wisps[i]; L.intensity = e ? LIGHT.wisp : 0; if (e) { L.position.set(e.x / U, e.z / U, e.y / U); lights++; } });
  const crowd = drawCrowd(view, [ix, iy], sc.W + 1, sc.H + 1, R3.look, G.S.outlines, CV);
  lights += drawEffects(view, [ix, iy], sc.W + 1, sc.H + 1, CV);
  renderer.render(scene, cam3);
  drawOverlay(view, ix, iy, sc.W + 1, sc.H + 1);
  // the numbers the panel shows, as the engine counts its own
  const info = renderer.info.render, st = game.stats;
  st.actors = crowd.drawn; st.culled = crowd.culled; st.items = info.drawCalls; G.frameStats.lights = lights;
  STATS.drawn = crowd.drawn; STATS.culled = crowd.culled; STATS.calls = info.drawCalls; STATS.tris = info.triangles; STATS.frames++;
  G.hud();
  $('mGpu').textContent = 'three.js · ' + BACKEND;
  if (!R3.pixels) $('mRes').textContent = (sc.W + 1) * sc.S + '×' + (sc.H + 1) * sc.S + ' (' + Math.round((sc.W + 1) * (sc.H + 1) * sc.S * sc.S / 1000) + 'k px)';
}
game._frame = frame3d;

/* ---- the panel's 3D section and keys ---- */
const LOOK_NOTES = {
  card: 'Card: the engine draws each character, exactly as on the 2D page, onto a card standing in the 3D hall. Flat, one depth each, lit by its own tones.',
  puppet: 'Puppet: the same rigs and poses wearing 3D parts, drawn in shared batches: real depth, torchlight and shadows. The look is an approximation.'
};
function sync3d() {
  document.querySelectorAll('[data-look]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.look === R3.look)));
  $('pixels3d').checked = R3.pixels; $('lookNote').textContent = LOOK_NOTES[R3.look];
}
function set3d(k, v) { if (k === 'look') R3.look = v; else if (k === 'pixels') R3.pixels = !!v; lastFit = ''; sync3d(); }
document.querySelectorAll('[data-look]').forEach(b => b.addEventListener('click', () => { set3d('look', b.dataset.look); b.blur(); }));
$('pixels3d').addEventListener('change', e => { set3d('pixels', e.target.checked); e.target.blur(); });
addEventListener('keydown', e => {
  if (e.repeat || e.ctrlKey || e.metaKey || (e.target && ['SELECT', 'TEXTAREA', 'INPUT'].includes(e.target.tagName) && e.target.type !== 'checkbox')) return;
  if (e.code === 'KeyC') set3d('look', R3.look === 'card' ? 'puppet' : 'card');
  else if (e.code === 'KeyX') set3d('pixels', !R3.pixels);
});
{
  const url = new URL(location.href), webgl = BACKEND !== 'WebGPU';
  if (webgl) url.searchParams.delete('backend'); else url.searchParams.set('backend', 'webgl');
  $('backendBtn').textContent = webgl ? 'Try it on WebGPU' : 'Try it on WebGL 2';
  $('backendBtn').addEventListener('click', () => { location.href = url.href; });
  $('backend3d').innerHTML = `Drawn by <b>three.js r182</b> on <b>${BACKEND}</b>. The game is the 2D page's own code, unchanged; only the drawing is new.`;
  // the 2D page's address: the site serves pages without .html, a local server as files
  $('to2d').href = /\.html$/.test(location.pathname) ? 'stress-test.html' + location.search.replace(/[?&](look|pixels|backend)=[^&]*/g, '') : '/stress-test';
}
// the engine's canvas stays on top for the mouse and keys, but shows nothing; the stand-in GPU lighting reports in
$('screen').style.opacity = '0';
game.gpu._st = 'on'; if (game.gpu.onStatus) game.gpu.onStatus();
// the benchmark's report says what drew it, for the head-to-head with the 2D page
game.gpu.renderer = () => 'drawn by three.js r182 on ' + BACKEND + ', ' + (R3.look === 'card' ? 'Card' : 'Puppet') + ' look, ' + (R3.pixels ? "the engine's pixels" : 'full resolution');
$('loading3d').hidden = true;
sync3d();
window.__stress3d = { ready: true, backend: BACKEND, R3, set: set3d, renderer, scene, stats: STATS, camera: cam3, LIGHT };
