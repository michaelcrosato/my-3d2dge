/* =============================================================================
 * THE HALL, from the game's own TileMap (G.map): the same cells, wall types and floor.
 *   floor        the map's floorTex baked once, pixel for pixel as the engine bakes it (contact shadows at the foot of
 *                walls; a floorTex color's 4th number, its glow, becomes light the floor gives off: the rune circle)
 *   walls        one instanced box per cell of each wall type (type.h tall), faces textured with its courses of bricks
 *                (type.side, type.line, type.course) and a speckled top (type.top); walls the engine cuts away in front
 *                of the camera (map._isFront, the engine's own rule) drop to type.cutH, as on the 2D page
 *   braziers     the lit torches (the first S.lights of G.TORCHES), each a real point light that flickers
 *   lights       a fixed set (the count never changes, so shaders never rebuild): 30 torches, 2 shadow casters that
 *                take over the 2 lit torches nearest the hero, the rune circle's teal glow, the hero's light, 4 for wisps
 *                and 4 for bolts
 * ============================================================================= */
const map = G.map, T = map.T, MW = map.w, MH = map.h, CXu = MW * T / 2, CYu = MH * T / 2;

/* ---- the floor: color and glow, baked as the engine bakes it ---- */
const floorMesh = (() => {
  const w = MW * T, h = MH * T, cv = document.createElement('canvas'), gv = document.createElement('canvas');
  cv.width = gv.width = w; cv.height = gv.height = h;
  const g = cv.getContext('2d'), gg = gv.getContext('2d'), img = g.createImageData(w, h), gimg = gg.createImageData(w, h), d = img.data, gd = gimg.data;
  const wall = (cx, cy) => map.cell(cx, cy) !== 0, R = map.ao;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const cx = Math.floor(x / T), cy = Math.floor(y / T); if (wall(cx, cy)) continue;
    let c = map.floorTex(x + .5, y + .5); if (!c) continue;
    if (R) {   // the engine's contact shadow along the foot of a wall
      const lx = x + .5 - cx * T, ly = y + .5 - cy * T; let ao = 0;
      if (wall(cx - 1, cy)) ao = Math.max(ao, 1 - lx / R); if (wall(cx + 1, cy)) ao = Math.max(ao, 1 - (T - lx) / R);
      if (wall(cx, cy - 1)) ao = Math.max(ao, 1 - ly / R); if (wall(cx, cy + 1)) ao = Math.max(ao, 1 - (T - ly) / R);
      if (wall(cx - 1, cy - 1)) ao = Math.max(ao, 1 - Math.hypot(lx, ly) / R); if (wall(cx + 1, cy - 1)) ao = Math.max(ao, 1 - Math.hypot(T - lx, ly) / R);
      if (wall(cx - 1, cy + 1)) ao = Math.max(ao, 1 - Math.hypot(lx, T - ly) / R); if (wall(cx + 1, cy + 1)) ao = Math.max(ao, 1 - Math.hypot(T - lx, T - ly) / R);
      if (ao > 0) { const k = 1 - .4 * Math.round(ao * 5) / 5; c = [c[0] * k, c[1] * k * .98, c[2] * k * 1.02, c[3]]; }
    }
    const i = (y * w + x) * 4, glow = clamp(c[3] || 0, 0, 1);
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    gd[i] = c[0] * glow; gd[i + 1] = c[1] * glow; gd[i + 2] = c[2] * glow; gd[i + 3] = 255;
  }
  g.putImageData(img, 0, 0); gg.putImageData(gimg, 0, 0);
  const tex = cvs => { const t = new THREE.CanvasTexture(cvs); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace; return t; };
  const m = new THREE.Mesh(new THREE.PlaneGeometry(MW, MH), new THREE.MeshLambertNodeMaterial({ map: tex(cv), emissiveMap: tex(gv), emissive: '#ffffff', emissiveIntensity: 1.6 }));
  m.rotation.x = -Math.PI / 2; m.position.set(MW / 2, 0, MH / 2); m.receiveShadow = true;
  scene.add(m);
  return m;
})();

/* ---- walls: a texture per wall type, one instanced box per cell (and a short one where the engine cuts it away) ---- */
const H = E.hex;
/** a wall face, 16 pixels wide and type.h tall: courses of bricks, joints staggered by course, a lit top edge and specks
 *  on each brick, as the engine's 'brick' face; x 0..15 across the tile, y 0 at the top */
function faceTex(t, h) {
  const tt = E.tones(t.side), base = H(t.side), line = H(t.line || E.shade(t.side, -.3)), sh = H(tt.sh), lt = H(tt.lt), course = t.course || 8;
  return (x, y) => {
    const z = h - 1 - y, ci = Math.floor(z / course), fz = z - ci * course;
    if (fz === 0 && z > 0) return line;                                       // the course line
    const jx = (ci & 1) ? 4 : 12; if (x === jx) return line;                  // the joint between two bricks
    const v = E.hash2(ci * 7 + (x < jx ? 0 : 1), ci + 99);
    if (fz === course - 1) return v > .5 ? lt : base;                         // a lit brick top
    if (E.hash2(x * 3 + 1, z * 5 + 2) < .07) return sh;                       // specks
    return v < .22 ? sh : v > .86 ? lt : base;
  };
}
function topTex(t) { const tt = E.tones(t.top), base = H(t.top), sh = H(tt.sh), lt = H(tt.lt); return (x, y) => { const v = E.hash2(x * 3 + 71, y * 5 + 37); return v < .08 ? sh : v > .96 ? lt : base; }; }
/** a box with two draw groups (its four sides, then top and bottom) instead of six: fewer draw calls */
function sidesThenTops(g) {
  const idx = g.index.array, face = f => Array.from(idx.slice(f * 6, f * 6 + 6));
  g.setIndex([0, 1, 4, 5, 2, 3].flatMap(face)); g.clearGroups(); g.addGroup(0, 24, 0); g.addGroup(24, 12, 1);
  return g;
}
const WALLS = {};   // per type: { full, cut, cells }
const _wm = new THREE.Matrix4();
for (const id of [...new Set(map.cells)].filter(i => i > 0)) {
  const t = map.types[id], cells = [];
  for (let cy = 0; cy < MH; cy++) for (let cx = 0; cx < MW; cx++) if (map.cell(cx, cy) === id) cells.push([cx, cy]);
  const make = h => {
    const side = new THREE.MeshLambertNodeMaterial({ map: bake(faceTex(t, h), 16, h, false) }), top = new THREE.MeshLambertNodeMaterial({ map: bake(topTex(t), 16, 16) });
    const m = new THREE.InstancedMesh(sidesThenTops(new THREE.BoxGeometry(1, h / U, 1)), [side, top], cells.length);
    m.castShadow = m.receiveShadow = true; m.frustumCulled = false; m.count = 0; scene.add(m); return m;
  };
  WALLS[id] = { t, cells, full: make(t.h), cut: t.cut ? make(t.cutH || 6) : null };
}
/** place the walls for this view: the full height, or the cut height for walls the engine cuts away in front (or, with
 *  cut = { key, fn(cx, cy) }, the walls fn cuts: side scrolling with depth cuts the ones between camera and hero) */
let wallKey = '';
function placeWalls(view, cut) {
  const key = cut ? 'cut:' + cut.key : view.id + ':' + view.yawDeg + ':' + view.pitchDeg; if (key === wallKey) return; wallKey = key;
  for (const W of Object.values(WALLS)) {
    let nf = 0, nc = 0;
    for (const [cx, cy] of W.cells) {
      const isCut = W.cut && (cut ? cut.fn(cx, cy) : map._isFront(cx, cy, view)), m = isCut ? W.cut : W.full, h = (isCut ? W.t.cutH || 6 : W.t.h) / U;
      m.setMatrixAt(isCut ? nc++ : nf++, _wm.makeTranslation(cx + .5, h / 2, cy + .5));
    }
    W.full.count = nf; W.full.instanceMatrix.needsUpdate = true;
    if (W.cut) { W.cut.count = nc; W.cut.instanceMatrix.needsUpdate = true; }
  }
}

/* ---- braziers: a stone base, an iron bowl, glowing coals and three flame tongues (the 2D page's drawBrazier), all
 *      thirty in a few instanced meshes; the first S.lights stand ---- */
const NT = G.TORCHES.length, inst = (geo, mat, n, shadow) => { const m = new THREE.InstancedMesh(geo, mat, n); m.frustumCulled = false; m.count = 0; m.castShadow = m.receiveShadow = !!shadow; scene.add(m); return m; };
const BRAZ = {
  base: inst(new THREE.BoxGeometry(6 / U, 8 / U, 6 / U), objMat(new THREE.MeshLambertNodeMaterial({ color: '#4c4562' })), NT),
  bowl: inst(new THREE.CylinderGeometry(5.5 / U, 4.2 / U, 3 / U, 10), objMat(new THREE.MeshLambertNodeMaterial({ color: '#2b2430' })), NT),   // (a brazier casts no shadow: its own torch sits on it)
  coals: inst(new THREE.CylinderGeometry(4 / U, 4 / U, .4 / U, 10), objMat(new THREE.MeshBasicNodeMaterial({ color: '#ff8a3c' })), NT),
  outer: inst(new THREE.ConeGeometry(2.2 / U, 1, 5), objMat(new THREE.MeshBasicNodeMaterial({ color: '#ff7a2a' })), NT * 3),
  inner: inst(new THREE.ConeGeometry(2.2 / U, 1, 5), objMat(new THREE.MeshBasicNodeMaterial({ color: '#ffd36a' })), NT * 3)
};
const _bq = new THREE.Quaternion(), _bp = new THREE.Vector3(), _bs = new THREE.Vector3(), _bz = new THREE.Vector3(0, 0, 1);
/** stand the first n braziers; the flames dance as the 2D page's drawFlame: three tongues, each with its own height and sway */
function animateBraziers(n) {
  for (let i = 0; i < n; i++) {
    const b = G.TORCHES[i], x = b.x / U, z = b.y / U, t = b.t;
    BRAZ.base.setMatrixAt(i, _wm.makeTranslation(x, 4 / U, z)); BRAZ.bowl.setMatrixAt(i, _wm.makeTranslation(x, 9.5 / U, z)); BRAZ.coals.setMatrixAt(i, _wm.makeTranslation(x, 11.1 / U, z));
    for (let k = 0; k < 3; k++) {
      const a = k * 2.1 + t * .6, h = (7 + Math.sin(t * 9 + k * 2) * 2.2 + Math.sin(t * 17 + k) * 1.2) / U, sw = Math.sin(t * 6 + k * 1.7) * 1.4 / U, bx = x + Math.cos(a) * 1.6 / U, bz = z + Math.sin(a) * 1.6 / U;
      _bq.setFromAxisAngle(_bz, -sw * 3);
      BRAZ.outer.setMatrixAt(i * 3 + k, _wm.compose(_bp.set(bx + sw * .5, 11 / U + h / 2, bz), _bq, _bs.set(1, h, 1)));
      BRAZ.inner.setMatrixAt(i * 3 + k, _wm.compose(_bp.set(bx + sw * .3, 11 / U + h * .65 / 2, bz), _bq, _bs.set(.55, h * .65, .55)));
    }
  }
  for (const [k, m] of Object.entries(BRAZ)) { m.count = k === 'outer' || k === 'inner' ? n * 3 : n; m.instanceMatrix.needsUpdate = true; }
}

/* ---- lights: a fixed set (see the header) ---- */
const FLICKER = t => .9 + Math.sin(t * 13) * .05 + Math.sin(t * 29) * .04 + Math.sin(t * 7.3) * .04;   // the 2D page's flicker
const LIGHT = { torch: 30, center: 6, hero: 16, wisp: 10, shot: 10, ambient: 4 };   // intensities, set by eye against the 2D page (screenshots of the same spots)
const ambient = new THREE.HemisphereLight('#5a5480', '#241f30', LIGHT.ambient);
scene.add(ambient);
const point = (color, dist, decay = 1) => { const l = new THREE.PointLight(color, 0, dist / U, decay); scene.add(l); return l; };
const TORCH_COLOR = '#ffc8a0';   // the 2D page's torch light reads as a pale warm white on the floor
const TORCH_REACH = 170;   // a gentle falloff reaching a little past the 2D light's radius (124), so its wide pools match
const torchLights = G.TORCHES.map(() => point(TORCH_COLOR, TORCH_REACH, .5));
const shadowLights = [0, 1].map(() => { const l = point(TORCH_COLOR, TORCH_REACH, .5); l.shadow.mapSize.set(256, 256); l.shadow.camera.near = .1; l.shadow.camera.far = TORCH_REACH / U; l.shadow.bias = -.002; return l; });
const centerLight = point('#4fe0cc', 78); centerLight.position.set(CXu / U, 3 / U, CYu / U);
const heroLight = point('#c9c2ec', 150);   // high over the hero (40 units): it lights the floor round him as the 2D one does, without burning out his own colors
const wispLights = [0, 1, 2, 3].map(() => point('#b78bff', 52));
const shotLights = [0, 1, 2, 3].map(() => point('#ffb347', 40));
/** light the hall: the lit torches (the nearest two through the shadow casters when shadows are on), the rune glow */
function lightHall(t) {
  const S = G.S, gpu = game.gpu, lit = gpu.enabled, n = lit ? S.lights : 0, h = G.hero;
  let near = [];
  if (gpu.shadows && n) near = G.TORCHES.slice(0, n).map((b, i) => [Math.hypot(b.x - h.x, b.y - h.y), i]).sort((a, b) => a[0] - b[0]).slice(0, shadowLights.length).map(a => a[1]);
  G.TORCHES.forEach((b, i) => {
    const L = torchLights[i]; L.position.set(b.x / U, 16 / U, b.y / U);
    L.intensity = i < n && !near.includes(i) ? LIGHT.torch * FLICKER(b.t) : 0;
  });
  shadowLights.forEach((L, k) => {
    const i = near[k], on = i !== undefined; L.castShadow = !!gpu.shadows;
    L.intensity = on ? LIGHT.torch * FLICKER(G.TORCHES[i].t) : 0;
    if (on) L.position.set(G.TORCHES[i].x / U, 16 / U, G.TORCHES[i].y / U);
  });
  centerLight.intensity = (lit ? LIGHT.center : 0) * (.5 + .12 * Math.sin(t * 1.7)) / .5;
  ambient.intensity = lit ? LIGHT.ambient : LIGHT.ambient * 2.2;
  return (n ? n : 0) + (lit ? 2 : 0);
}
