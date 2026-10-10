/* Asset Studio runtime. Readable parts, procedural materials and TileMap levels on public engine APIs.
 * AssetStudioRuntime.create({game, project, sets}) returns a live scene renderer; no editor or file I/O.
 * Coordinates are world units, z up. A part's position is the center of its bottom face.
 * Solid model parts use conservative world AABBs for playtest collision, including rotated parts. */
(() => {
'use strict';
const E = My3D2dge, A = AssetStudioModel, VIEWS = ['iso', 'threequarter', 'topdown', 'brawler', 'side'];
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const hex = color => [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
const color = rgb => '#' + rgb.map(n => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => a.map((n, i) => Math.round(n + (b[i] - n) * t));
const hash = (x, y, seed) => { let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ (seed | 0); n = Math.imul(n ^ n >>> 13, 1274126177); return (n ^ n >>> 16) >>> 0; };
function palette(material) {
  const a = hex(material.color), b = hex(material.accent), shades = [a, b, mix(a, b, .22), mix(a, b, .48)];
  const s = material.scale, seed = material.seed;
  return { material, rgb: shades, css: shades.map(color), at(x, y) {
    const u = x / s, v = y / s, ix = Math.floor(u), iy = Math.floor(v);
    switch (material.pattern) {
      case 'checker': return (ix + iy) & 1;
      case 'brick': return v - iy < .12 || ((u + (iy & 1) * .5) % 1 + 1) % 1 < .07 ? 1 : 0;
      case 'planks': return u - ix < .08 || v % 8 < .12 ? 1 : hash(ix, Math.floor(v / 8), seed) % 3 === 0 ? 2 : 0;
      case 'noise': return hash(ix, iy, seed) % 4;
      default: return 0;
    }
  } };
}
const avg = points => [0, 1, 2].map(i => points.reduce((n, p) => n + p[i], 0) / points.length);
const cross = (a, b, c) => { const u = b.map((n, i) => n - a[i]), v = c.map((n, i) => n - a[i]); return [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; };
const distance = (a, b) => Math.hypot(...a.map((n, i) => n - b[i]));
function partMesh(part, object) {
  const [w, d, h] = part.size, x = w / 2, y = d / 2;
  let vertices, indices;
  if (part.shape === 'cylinder') {
    vertices = []; indices = [];
    for (const z of [0, h]) for (let i = 0; i < 12; i++) vertices.push([Math.cos(i * Math.PI / 6) * x, Math.sin(i * Math.PI / 6) * y, z]);
    indices.push(Array.from({ length: 12 }, (_, i) => i + 12));
    for (let i = 0; i < 12; i++) { const j = (i + 1) % 12; indices.push([i, j, j + 12, i + 12]); }
  } else if (part.shape === 'wedge') {
    vertices = [[-x, -y, 0], [x, -y, 0], [x, y, 0], [-x, y, 0], [x, -y, h], [x, y, h]];
    indices = [[0, 4, 5, 3], [0, 1, 4], [1, 2, 5, 4], [2, 3, 5]];
  } else {
    vertices = [[-x, -y, 0], [x, -y, 0], [x, y, 0], [-x, y, 0], [-x, -y, h], [x, -y, h], [x, y, h], [-x, y, h]];
    indices = [[4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
  }
  const pa = part.rotation * E.DEG, oa = object.rotation * E.DEG, pc = Math.cos(pa), ps = Math.sin(pa), oc = Math.cos(oa), os = Math.sin(oa), k = object.scale;
  vertices = vertices.map(([vx, vy, vz]) => {
    const a = vx * pc - vy * ps + part.position[0], b = vx * ps + vy * pc + part.position[1];
    return [object.position[0] + (a * oc - b * os) * k, object.position[1] + (a * os + b * oc) * k, object.position[2] + (vz + part.position[2]) * k];
  });
  const bounds = [0, 1, 2].map(i => [Math.min(...vertices.map(v => v[i])), Math.max(...vertices.map(v => v[i]))]);
  return { vertices, bounds, center: avg(vertices), material: part.material, faces: indices.map(ids => {
    const points = ids.map(i => vertices[i]), normal = cross(points[0], points[1], points[2]), len = Math.hypot(...normal) || 1;
    return { points, center: avg(points), normal: normal.map(n => n / len), width: distance(points[0], points[1]), height: distance(points[0], points[points.length - 1]) };
  }) };
}
function quadPoint(p, u, v) { return [0, 1, 2].map(i => p[0][i] * (1 - u) * (1 - v) + p[1][i] * u * (1 - v) + p[2][i] * u * v + p[3][i] * (1 - u) * v); }
function paintFace(r, g, face, p) {
  const pts = face.points.map(v => r.w(...v)), n = face.normal;
  const light = clamp(.68 + n[2] * .3 - n[0] * .12 - n[1] * .12, .45, 1.08);
  const colors = p.rgb.map(rgb => color(rgb.map(c => c * light)));
  E.px.poly(g, pts, colors[0]);
  if (face.points.length === 4 && p.material.pattern !== 'solid') {
    // Bounded small quads keep textures readable at pixel scale, even for large agent-authored models.
    const cols = clamp(Math.ceil(face.width / Math.max(2, p.material.scale / 2)), 1, 8), rows = clamp(Math.ceil(face.height / Math.max(2, p.material.scale / 2)), 1, 8);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const c = p.at((x + .5) / cols * face.width, (y + .5) / rows * face.height);
      if (!c) continue;
      const q = [[x / cols, y / rows], [(x + 1) / cols, y / rows], [(x + 1) / cols, (y + 1) / rows], [x / cols, (y + 1) / rows]].map(([u, v]) => r.w(...quadPoint(face.points, u, v)));
      E.px.poly(g, q, colors[c]);
    }
  }
  const edge = color(p.rgb[0].map(c => c * light * .68));
  for (let i = 0; i < pts.length; i++) E.px.line(g, ...pts[i], ...pts[(i + 1) % pts.length], edge);
}
function create({ game, project, sets }) {
  let source, assets, level, map, physicsMap, palettes, objects = [], actorRigs = new Map(), meshes = new Map(), lastRenderer = null, player = null, playerRig = null, playerFacing = 0;
  let staticSolids = [], collisionBounds = [];
  const S = { level: null, selected: null, view: 'iso', zoom: 1, focus: null, grid: true, mode: 'edit', time: 0, playing: !game.reduceMotion };
  function context(p) { return { clipIds: [p.selected, ...Object.keys(p.clips).filter(id => id !== p.selected)] }; }
  function setData(next, options = {}) {
    source = next; assets = next.assets || A.createProject(context(next));
    const oldLevel = S.level;
    if (options.level !== undefined) S.level = options.level;
    if (!S.level || !assets.levels[S.level] || options.followSelection) S.level = assets.selectedLevel;
    level = assets.levels[S.level];
    if (options.followSelection || !Object.hasOwn(level.objects, S.selected)) S.selected = S.level === assets.selectedLevel ? assets.selectedObject : null;
    palettes = Object.fromEntries(Object.entries(assets.materials).map(([id, m]) => [id, palette(m)]));
    const legend = {}, collisionLegend = {}, types = {}; let nextType = 1;
    for (const [ch, tile] of Object.entries(level.tiles)) {
      const p = palettes[tile.material], wall = tile.height > 0 ? nextType++ : 0;
      if (wall) types[wall] = { h: tile.height, top: p.material.color, side: color(p.rgb[0].map(c => c * .8)), line: p.material.accent, face: ({ brick: 'brick', planks: 'plank', noise: 'stone' })[p.material.pattern] || 'none', roof: p.material.pattern === 'solid' ? 'plain' : 'slab', cut: false };
      legend[ch] = { tile: wall, floor: tile.material, block: tile.solid && !wall };
      collisionLegend[ch] = { tile: tile.solid ? wall : 0, floor: tile.material, block: tile.solid && !wall };
    }
    const fallback = Object.values(palettes)[0];
    const floorTex = (x, y, tag) => { const p = palettes[tag] || fallback; return p.rgb[p.at(x, y)]; };
    map = new E.TileMap({ tile: level.tile, rows: level.rows, legend, types, floorTex, ao: 3, shimmer: false, cutaway: false });
    physicsMap = new E.TileMap({ tile: level.tile, rows: level.rows, legend: collisionLegend, types, floorTex, shimmer: false });
    objects = Object.entries(level.objects); meshes = new Map(); actorRigs = new Map();
    for (const [id, object] of objects) {
      if (object.kind === 'model') meshes.set(id, assets.models[object.model].parts.map(part => partMesh(part, object)));
      else {
        const record = next.clips[object.clip], base = sets[record.set], lib = Mocap.load({ ...base, clips: { [object.clip]: record.clip } });
        const rig = Mocap.drive(new E.Humanoid({ size: object.scale, cape: null, weapon: null }), lib);
        actorRigs.set(id, { lib, rig, pose: new Float32Array(lib.P * 3), clip: object.clip, position: object.position.slice() });
      }
    }
    staticSolids = objects.filter(([, o]) => o.kind === 'model' && o.solid && o.visible).flatMap(([id]) => meshes.get(id).map(p => p.bounds));
    sampleActors();
    if (oldLevel !== S.level) { S.focus = null; player = null; if (S.mode === 'play') startPlay(); }
    if (!S.focus) fit();
    return getState();
  }
  function sampleActors() {
    for (const [id, object] of objects) if (object.kind === 'actor') {
      const a = actorRigs.get(id), c = a.lib.clip(object.clip), t = c.loop && c.dur > 0 ? S.time % c.dur : Math.min(S.time, c.dur);
      a.lib.sample(c, t, a.pose); a.rig.mocap = a.pose;
      const move = a.lib.moveAt(c, t), facing = object.rotation * E.DEG, k = a.rig.o.hipZ * a.rig.o.size / a.lib.rest.hipZ;
      const dx = move ? (move[0] * Math.cos(facing) - move[1] * Math.sin(facing)) * k : 0;
      const dy = move ? (move[0] * Math.sin(facing) + move[1] * Math.cos(facing)) * k : 0;
      a.position = [object.position[0] + dx, object.position[1] + dy, object.position[2]];
      a.rig.update(0, { x: a.position[0], y: a.position[1], z: a.position[2], facing });
    }
    collisionBounds = staticSolids.concat(objects.filter(([, o]) => o.kind === 'actor' && o.solid && o.visible).map(([id]) => bounds(id)));
  }
  function applyCamera() { game.setView(S.view); game.setZoom(S.zoom); game.cam.bounds = null; game.cam.smooth = 0; if (S.focus) game.focus(...S.focus); }
  function fit() {
    if (!level) return;
    const v = E.VIEWS[S.view], w = level.rows[0].length * level.tile, h = level.rows.length * level.tile, maxZ = Math.max(32, ...Object.values(level.tiles).map(t => t.height));
    const boxes = [[[0, w], [0, h], [0, maxZ]], ...objects.filter(([, o]) => o.visible).map(([id]) => bounds(id))], world = [];
    for (const box of boxes) for (const x of box[0]) for (const y of box[1]) for (const z of box[2]) world.push([x, y, z]);
    const points = world.map(p => v.p(...p)), x0 = Math.min(...points.map(p => p[0])), x1 = Math.max(...points.map(p => p[0])), y0 = Math.min(...points.map(p => p[1])), y1 = Math.max(...points.map(p => p[1]));
    const width = x1 - x0, height = y1 - y0;
    S.zoom = clamp(Math.min((game.W - 28) / Math.max(1, width), (game.H - 55) / Math.max(1, height)), .5, 3);
    const focus = [0, 1, 2].map(i => (Math.min(...world.map(p => p[i])) + Math.max(...world.map(p => p[i]))) / 2), center = v.p(...focus);
    const dx = (x0 + x1) / 2 - center[0], dy = (y0 + y1) / 2 - center[1], xx = v.ax * v.ax + v.ay * v.ay, yy = v.bx * v.bx + v.by * v.by + v.bz * v.bz;
    // Screen axes are orthogonal. This centers every view, including side views with no ground inverse.
    S.focus = [focus[0] + dx * v.ax / xx + dy * v.bx / yy, focus[1] + dx * v.ay / xx + dy * v.by / yy, focus[2] + dy * v.bz / yy];
    applyCamera(); return getState();
  }
  function focusSelection() {
    const object = level.objects[S.selected]; if (!object) return fit();
    const b = bounds(S.selected); S.focus = b.map(pair => (pair[0] + pair[1]) / 2); S.zoom = 2; applyCamera(); return getState();
  }
  function setPreview(options = {}) {
    if (options.level !== undefined && !assets.levels[options.level]) throw new Error('Unknown scene level.');
    if (options.view !== undefined && !VIEWS.includes(options.view)) throw new Error('Unknown camera view.');
    if (options.zoom !== undefined && (typeof options.zoom !== 'number' || !Number.isFinite(options.zoom) || options.zoom < .5 || options.zoom > 3)) throw new Error('Scene zoom must be between 0.5 and 3.');
    if (options.focus !== undefined && (!Array.isArray(options.focus) || options.focus.length !== 3 || options.focus.some(n => typeof n !== 'number' || !Number.isFinite(n) || Math.abs(n) > 100000))) throw new Error('Scene focus must be three finite world coordinates.');
    const target = assets.levels[options.level || S.level];
    if (options.selected !== undefined && options.selected !== null && !Object.hasOwn(target.objects, options.selected)) throw new Error('Unknown scene object.');
    if (options.mode !== undefined && !['edit', 'play'].includes(options.mode)) throw new Error('Scene mode must be edit or play.');
    for (const k of ['grid', 'playing']) if (options[k] !== undefined && typeof options[k] !== 'boolean') throw new Error(k + ' must be true or false.');
    if (options.time !== undefined && (typeof options.time !== 'number' || !Number.isFinite(options.time) || options.time < 0 || options.time > 600)) throw new Error('Scene time must be between 0 and 600 seconds.');
    if (options.level !== undefined && options.level !== S.level) setData(source, { level: options.level });
    for (const k of ['view', 'zoom', 'focus', 'selected', 'grid', 'playing', 'time']) if (options[k] !== undefined) S[k] = Array.isArray(options[k]) ? options[k].slice() : options[k];
    if (options.mode !== undefined && S.mode !== options.mode) options.mode === 'play' ? startPlay() : stopPlay();
    if (!S.focus) fit(); applyCamera(); sampleActors(); return getState();
  }
  function startPlay() {
    S.mode = 'play'; S.playing = true; game.input.clear(); game.input.use('PLATFORMER'); game.input.touchButtons(['jump']);
    player = new E.Body({ x: level.spawn[0], y: level.spawn[1], z: level.spawn[2], r: 5, gravity: 500 });
    playerRig = new E.Humanoid({ cape: null, weapon: null, colors: { cloth: '#9ee5c3' } }); playerFacing = 0;
    playerRig.update(0, { x: player.x, y: player.y, z: player.z, facing: playerFacing }); return getState();
  }
  function stopPlay() { S.mode = 'edit'; player = null; game.input.clear(); game.input.touchButtons([]); applyCamera(); return getState(); }
  function bounds(id) {
    const object = level.objects[id]; if (!object) return null;
    if (object.kind === 'actor') {
      const a = actorRigs.get(id), padding = 4 * object.scale;
      const points = Object.values(a.rig.J).filter(p => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite)).map(p => a.rig.worldOffset(p));
      return [0, 1, 2].map(i => [a.position[i] + Math.min(0, ...points.map(p => p[i])) - (i === 2 ? 0 : padding), a.position[i] + Math.max(0, ...points.map(p => p[i])) + padding]);
    }
    const parts = meshes.get(id); return [0, 1, 2].map(i => [Math.min(...parts.map(p => p.bounds[i][0])), Math.max(...parts.map(p => p.bounds[i][1]))]);
  }
  const collision = {
    collide(body) {
      let hit = physicsMap.collide(body);
      for (const b of collisionBounds) {
        if (body.z + 28 <= b[2][0] || body.z + body.step >= b[2][1]) continue;
        const nx = clamp(body.x, ...b[0]), ny = clamp(body.y, ...b[1]); let dx = body.x - nx, dy = body.y - ny, d = Math.hypot(dx, dy);
        if (d >= body.r) continue; hit = true;
        if (d < .0001) {
          const choices = [[body.x - b[0][0], -1, 0], [b[0][1] - body.x, 1, 0], [body.y - b[1][0], 0, -1], [b[1][1] - body.y, 0, 1]].sort((a, b2) => a[0] - b2[0]);
          const [gap, ux, uy] = choices[0]; body.x += ux * (gap + body.r); body.y += uy * (gap + body.r);
        } else { body.x = nx + dx / d * body.r; body.y = ny + dy / d * body.r; }
      }
      return physicsMap.collide(body) || hit;
    },
    groundAt(x, y, radius, z, step) {
      let ground = physicsMap.groundAt(x, y, radius, z, step);
      for (const b of collisionBounds) if (x >= b[0][0] - radius * .4 && x <= b[0][1] + radius * .4 && y >= b[1][0] - radius * .4 && y <= b[1][1] + radius * .4 && b[2][1] <= z + step) ground = Math.max(ground, b[2][1]);
      return ground;
    }
  };
  function update(dt) {
    if (S.playing) { S.time = (S.time + dt) % 600; sampleActors(); }
    if (S.mode === 'play' && player) {
      const typing = document.activeElement?.matches('input,textarea,select') || document.querySelector('dialog[open]');
      const m = typing ? [0, 0] : game.input.move(), dir = game.view.screenDirToGround(...m);
      player.vx = dir[0] * 66; player.vy = dir[1] * 66;
      if (!typing && game.input.pressed('jump')) player.jump(180);
      player.update(dt, collision); if (Math.hypot(...dir) > .01) playerFacing = Math.atan2(dir[1], dir[0]);
      playerRig.update(dt, { x: player.x, y: player.y, z: player.z, vx: player.vx, vy: player.vy, facing: playerFacing });
      game.focus(player.x, player.y, player.z + 16);
    } else if (S.focus) game.focus(...S.focus);
  }
  function draw(r) {
    lastRenderer = r; map.drawFloor(r);
    if (S.grid && S.mode === 'edit') {
      const w = level.rows[0].length * level.tile, h = level.rows.length * level.tile;
      r.decal(g => {
        for (let x = 0; x <= w; x += level.tile) E.px.line(g, ...r.w(x, 0, 0), ...r.w(x, h, 0), '#91aaa12b');
        for (let y = 0; y <= h; y += level.tile) E.px.line(g, ...r.w(0, y, 0), ...r.w(w, y, 0), '#91aaa12b');
      });
    }
    map.queueWalls(r);
    for (const [id, object] of objects) {
      if (!object.visible) continue;
      const b = bounds(id), radius = Math.max(b[0][1] - b[0][0], b[1][1] - b[1][0]) / 2;
      const center = b.map(pair => (pair[0] + pair[1]) / 2), pixels = [];
      for (const x of b[0]) for (const y of b[1]) for (const z of b[2]) pixels.push(r.w(x, y, z));
      const screen = r.w(...center), margin = Math.max(16, ...pixels.flatMap(p => [Math.abs(p[0] - screen[0]), Math.abs(p[1] - screen[1])]), object.kind === 'actor' ? Math.max(...b.map(pair => pair[1] - pair[0])) * r.view.scale * 2 : 0) + 8;
      if (!r.visible(...center, margin, margin, margin)) continue;
      if (object.kind === 'actor') {
        const a = actorRigs.get(id); r.shadow(a.position[0], a.position[1], Math.min(radius, 24), .28, '#091813', a.position[2]);
        r.queue(...a.position, g => { const [x, y] = r.w(...a.position); a.rig.draw(g, Math.round(x), Math.round(y), r.view); }, { solid: true });
      } else {
        r.shadow(center[0], center[1], Math.min(radius, 24), .28, '#091813', b[2][0]);
        for (const mesh of meshes.get(id)) {
        const faces = mesh.faces.filter(f => f.normal[0] * r.view.dx + f.normal[1] * r.view.dy + f.normal[2] * r.view.dz > .0001).sort((a, b2) => r.view.depth(...a.center) - r.view.depth(...b2.center));
        r.queue(mesh.center[0], mesh.center[1], mesh.bounds[2][0], g => { for (const face of faces) paintFace(r, g, face, palettes[mesh.material]); }, { solid: true });
        }
      }
    }
    if (S.mode === 'play' && player) { r.shadow(player.x, player.y, 7, .3, '#091813', player.groundZ); r.queue(player.x, player.y, player.z, g => { const [x, y] = r.w(player.x, player.y, player.z); playerRig.draw(g, Math.round(x), Math.round(y), r.view); }, { solid: true }); }
    else r.overlay(g => {
      const spawn = r.w(...level.spawn); E.px.line(g, spawn[0] - 4, spawn[1], spawn[0] + 4, spawn[1], '#dace8a'); E.px.line(g, spawn[0], spawn[1] - 4, spawn[0], spawn[1] + 4, '#dace8a');
      const b = bounds(S.selected);
      if (b) {
        const corners = [[b[0][0], b[1][0], b[2][0]], [b[0][1], b[1][0], b[2][0]], [b[0][1], b[1][1], b[2][0]], [b[0][0], b[1][1], b[2][0]]];
        for (const z of [b[2][0], b[2][1]]) for (let i = 0; i < 4; i++) { const a = corners[i], c = corners[(i + 1) % 4]; E.px.line(g, ...r.w(a[0], a[1], z), ...r.w(c[0], c[1], z), '#b4f5d3'); }
        for (const c of corners) E.px.line(g, ...r.w(...c), ...r.w(c[0], c[1], b[2][1]), '#b4f5d3');
        const p = r.w((b[0][0] + b[0][1]) / 2, (b[1][0] + b[1][1]) / 2, b[2][1]); E.font.text(g, S.selected, p[0], p[1] - 10, '#daf7e6', { align: 'center', font: 'tiny', shadow: '#14251e' });
      }
    });
  }
  function groundPoint(x, y) {
    const r = lastRenderer; if (!r) return null;
    const o = r.w(0, 0, 0), a = r.w(1, 0, 0), b = r.w(0, 1, 0), ax = a[0] - o[0], ay = a[1] - o[1], bx = b[0] - o[0], by = b[1] - o[1], det = ax * by - ay * bx;
    if (Math.abs(det) < .00001) return null;
    return [((x - o[0]) * by - (y - o[1]) * bx) / det, ((y - o[1]) * ax - (x - o[0]) * ay) / det, 0];
  }
  function pick(x, y) {
    if (!lastRenderer) return null;
    const r = lastRenderer;
    const location = ([id, o]) => o.kind === 'actor' ? actorRigs.get(id).position : bounds(id).map(pair => (pair[0] + pair[1]) / 2);
    return objects.filter(([, o]) => o.visible).sort((a, b) => r.view.order(...location(b)) - r.view.order(...location(a))).find(([id]) => {
      const b = bounds(id), p = [];
      for (const wx of b[0]) for (const wy of b[1]) for (const wz of b[2]) p.push(r.w(wx, wy, wz));
      return x >= Math.min(...p.map(q => q[0])) - 3 && x <= Math.max(...p.map(q => q[0])) + 3 && y >= Math.min(...p.map(q => q[1])) - 3 && y <= Math.max(...p.map(q => q[1])) + 3;
    })?.[0] || null;
  }
  function getState() { return { ...S, focus: S.focus?.slice() || null, player: player ? { x: player.x, y: player.y, z: player.z, onGround: player.onGround } : null }; }
  setData(project);
  return { setData, setPreview, fit, focusSelection, update, draw, pick, groundPoint, bounds, startPlay, stopPlay, getState, get assets() { return assets; }, get level() { return level; }, get map() { return map; }, get actors() { return actorRigs; } };
}
window.AssetStudioRuntime = { create, palette, partMesh };
})();
