/* =============================================================================
 * STRESS TEST 3D (temporary lab; docs/LAB-3D.md): the engine's stress test drawn by three.js r182 instead of the
 * engine's canvas renderer, for a head-to-head comparison with /stress-test.
 * The game is the 2D page's own code (src/stress.game.js: the hero, walkers, slimes, wisps, attack tokens, telegraphs,
 * waves, particles, the panel, metrics and benchmark), inlined unchanged before this module. It runs in the engine's
 * own loop exactly as on the 2D page; this module replaces only the loop's drawing step (game._frame) and reads the
 * game's state from window.__game. Nothing here changes gameplay.
 * Parts (one module, joined in name order by tools/build.mjs; they share one scope):
 *   00-setup    imports, the game's state, units, the renderer, the materials the parts share
 *   10-hall     the hall from the game's TileMap (its floorTex, wall types, cut-away), braziers, the lights
 *   20-crowd    the hero, walkers, slimes, wisps and the fallen, as Puppets (3D parts on each rig's joints, drawn in
 *               instanced batches) or Cards (each rig drawn by the engine into a sprite atlas, on camera-facing cards)
 *   30-effects  telegraph arcs, weapon trails, bolts, particles; damage numbers and notes on a pixel overlay
 *   35-cameras  the engine's camera, or a 3D one: chase, first person, fly, fixed
 *   38-filters  Clean, Comic cel or Pixel over the whole picture, the characters and objects, or the hall; bloom; FXAA
 *   40-frame    the frame (the engine's own view and camera to the pixel, or a 3D camera), the panel's numbers, keys
 * Units: three.js metres, y up; the engine's units, z up: 16 units = 1 metre (one floor tile).
 *   engine (x, y, z) -> three (x / U, z / U, y / U)
 * Rules as the 3D world lab (tools/lab3d-test.mjs checks them): WebGPURenderer and node materials only, no compute,
 * no GPU read-backs.
 * ============================================================================= */
import * as THREE from 'three/webgpu';
import { Fn, vec2, vec3, vec4, float, uniform, positionLocal, normalLocal, modelViewMatrix, cameraProjectionMatrix, texture, uv, instancedBufferAttribute,
  pass, mrt, output, rtt, floor, mod, abs, max, min, mix, select, smoothstep, luminance, saturation, sRGBTransferOETF } from 'three/tsl';

const E = window.My3D2dge, G = window.__game, game = G.game, { clamp, lerp, TAU } = E;
const QS = new URLSearchParams(location.search);
const U = 16;                                   // engine units per metre (one floor tile)
const OUTLINE = '#0c0818';                      // the engine's outline color
const $ = id => document.getElementById(id);
/** anything that stops the 3D drawing says so on the page (and in window.__stress3d.error for tests) */
function fail(e) {
  const msg = String(e && e.message || e), L = $('loading3d');
  if (L) { L.hidden = false; L.textContent = 'The 3D view stopped: ' + msg; }
  window.__stress3d = Object.assign(window.__stress3d || {}, { error: msg });
}
addEventListener('error', e => fail(e.error || e.message));
addEventListener('unhandledrejection', e => fail(e.reason));
/** engine units (z up) -> three metres (y up) */
const toThree = (x, y, z, out = new THREE.Vector3()) => out.set(x / U, z / U, y / U);
/** '#rrggbb' -> linear RGB floats for instance colors (cached) */
const _lin = new Map(), _c = new THREE.Color();
function lin(hex) { let v = _lin.get(hex); if (!v) { _c.set(hex); v = [_c.r, _c.g, _c.b]; _lin.set(hex, v); } return v; }

/* ---- the renderer: WebGPU, or WebGL 2 by itself; ?backend=webgl forces WebGL 2 ---- */
const canvas3d = $('view'), over = $('over'), og = over.getContext('2d');
const renderer = new THREE.WebGPURenderer({ canvas: canvas3d, antialias: false, forceWebGL: QS.get('backend') === 'webgl' });
await renderer.init();
const BACKEND = renderer.backend.isWebGPUBackend ? 'WebGPU' : 'WebGL 2';
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.NoToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor('#06050b');
renderer.info.autoReset = false;   // (the frame resets it: with a filter on, one frame is several renders)
const scene = new THREE.Scene();
scene.background = new THREE.Color('#06050b');

/* ---- materials shared by the parts ---- */
/** a texture function (x, y) -> [r, g, b] baked into a crisp, repeating texture (the engine's texture style) */
function bake(fn, w, h, repeat = true) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d'), img = g.createImageData(w, h), d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = fn(x, y), i = (y * w + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  return t;
}
/* the puppets' toon look: three bands of light (shadow, base, lit), like the engine's tones */
const TOON_BANDS = (() => {
  const t = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 170, 170, 170, 255, 255, 255, 255, 255]), 3, 1);
  t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return t;
})();
/** the materials of characters and objects (not the hall): while a filter is on they write 1 into the filters' mask
 *  (38-filters), so a filter can take the characters and objects, or the hall, alone */
const OBJ_MATS = new Set(); let OBJ_MRT = null;
function objMat(m) { OBJ_MATS.add(m); if (OBJ_MRT) { m.mrtNode = OBJ_MRT; m.needsUpdate = true; } return m; }
/* outlines: an inverted hull. The same (instanced) mesh again, back faces only, each vertex pushed OUTLINE_PX pixels
 * outward on the screen (along its normal for round parts, away from the part's centre for boxes) */
const OUTLINE_PX = uniform(new THREE.Vector2(.01, .01));   // clip-space size of the push, set per frame (one game pixel)
const _outline = {};
function outlineMat(mode = 'normal') {
  if (_outline[mode]) return _outline[mode];
  const m = objMat(new THREE.MeshBasicNodeMaterial({ color: OUTLINE, side: THREE.BackSide, fog: false }));
  m.vertexNode = Fn(() => {
    const mvp = cameraProjectionMatrix.mul(modelViewMatrix), pos = mvp.mul(vec4(positionLocal, 1));
    const out = mode === 'center' ? positionLocal : normalLocal;
    const pos2 = mvp.mul(vec4(positionLocal.add(out.normalize().mul(.01)), 1));
    const dir = pos2.xy.div(pos2.w).sub(pos.xy.div(pos.w)).normalize();
    return vec4(pos.xy.add(dir.mul(OUTLINE_PX).mul(pos.w)), pos.z, pos.w);
  })();
  return (_outline[mode] = m);
}
