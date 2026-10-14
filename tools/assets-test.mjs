// The assets suite: shapes and materials (docs/ASSETS.md) do what the card says, on the full engine in headless Chromium.
//   1. every core shape draws in every view and 8 facings: not empty, inside its projected bounds, every part seen in the
//      isometric or the three-quarter view; two runs give the same pixels; a generator's params change its pixels
//   2. every material draws on every kind of surface (a wall face, a wall top, a floor, a platform tile, a shape) with no
//      warning, and the engine's own wall faces, tops and tile styles are entries of the registry
//   3. collision: a body walks into a solid table and stops, jumps at it below its top and is stopped, comes down on it
//      and lands, passes under a shape set above its head; the solid's box turns, scales and mirrors with the shape;
//      a hero walking round a table sorts in front of it on its near side and behind it on its far side
//   4. sets: E.addAssets names entries SET:id, never replaces the core's or another set's, resolves a set's own ids
//      first, and its sprites take 'material:tone' colors
//   5. validation: a broken entry warns, naming the entry and the field
//   6. size: each core entry within 300 tokens, the median within 150; the core library within 12 KB of source
// Usage: node tools/assets-test.mjs        (run node tools/build.mjs first; CHROMIUM_PATH picks a browser)
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..'), out = join(root, 'check-output/assets-test');
const ENGINE = readFileSync(join(root, 'engine/my-3d2dge.js'), 'utf8');
const problems = [], fail = (area, m) => problems.push(area + ': ' + m), ok = m => console.log('  ok   ' + m);
let tok = s => Math.ceil(s.length / 3.2); try { const { encode } = await import('gpt-tokenizer/encoding/cl100k_base'); tok = s => encode(s).length; } catch (e) { /* estimated */ }
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage(), warnings = [];
page.on('pageerror', e => fail('page', String(e))); page.on('console', m => { if (m.type() === 'warning' || m.type() === 'error') warnings.push(m.text()); });
await page.setContent('<!doctype html><html><body></body></html>');
await page.addScriptTag({ content: ENGINE });

/* 1. every core shape, every view, 8 facings */
console.log('1. the core shapes in every view');
{
  const r = await page.evaluate(() => {
    const E = My3D2dge, bad = [], hashes = {}, VIEWS = ['iso', 'threequarter', 'topdown', 'brawler', 'side'];
    const hash = a => { let h = 2166136261; for (let i = 0; i < a.length; i += 3) h = Math.imul(h ^ a[i], 16777619); return h >>> 0; };
    for (const id of Object.keys(E.SHAPES)) {
      let all = 0;
      for (const vid of VIEWS) for (let k = 0; k < 8; k++) {
        const view = vid === 'topdown' ? E.charView(E.VIEWS.topdown) : E.VIEWS[vid], f = k / 8 * Math.PI * 2, I = E.shapeInfo(id, { view, facing: f });
        if (!I || !I.pixels) { bad.push(id + ' draws nothing in ' + vid + ' facing ' + k + '/8'); continue; }
        // inside its bounds: no pixel outside the projected box of its bounds turned to this facing (a pixel of slack)
        const [x0, y0, z0, x1, y1, z1] = I.bounds, c = Math.cos(f - Math.PI / 2), s = Math.sin(f - Math.PI / 2); let a = 1e9, b = 1e9, A = -1e9, B = -1e9;
        for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [Math.max(0, z0), z1]) { const X = x * c - y * s, Y = x * s + y * c, p = view.p(X, Y, z); a = Math.min(a, p[0]); A = Math.max(A, p[0]); b = Math.min(b, p[1]); B = Math.max(B, p[1]); }
        let out = 0; for (let j = 0; j < I.rgba.length / 4; j++) if (I.rgba[j * 4 + 3]) { const px = j % I.w - I.ox + .5, py = Math.floor(j / I.w) - I.oy + .5; if (px < a - 1.5 || px > A + 1.5 || py < b - 1.5 || py > B + 1.5) out++; }
        if (out) bad.push(id + ' draws ' + out + ' pixels outside its bounds in ' + vid + ' facing ' + k + '/8');
        if ((vid === 'iso' || vid === 'threequarter') && !k) { const iso = vid === 'iso' ? I : null; if (iso) hashes[id] = { iso: I.parts, h: hash(I.rgba) }; else hashes[id].q3 = I.parts; }
        all++;
      }
      const H = hashes[id]; const unseen = H.iso.map((n, i) => n || H.q3[i] ? -1 : i).filter(i => i >= 0);
      if (unseen.length) bad.push(id + ': primitive ' + unseen.join(', ') + ' is not seen in the isometric or three-quarter view (under a pixel, or hidden)');
      // the same pixels again
      if (hash(E.shapeInfo(id, { view: E.VIEWS.iso, facing: 0 }).rgba) !== H.h) bad.push(id + ' draws different pixels the second time');
    }
    // a generator's params change its pixels; the same params give the same pixels
    const gen = [['pine', { h: 30 }], ['tree', { seed: 2 }], ['bush', { r: 10 }], ['rock', { seed: 9 }], ['crystal', { seed: 4 }], ['fence', { len: 32 }], ['grass', { n: 4 }]];
    for (const [id, p] of gen) { const a = E.shapeInfo(id, { view: E.VIEWS.iso }), b = E.shapeInfo(id, { view: E.VIEWS.iso, params: p }); if (hash(a.rgba) === hash(b.rgba) && a.w === b.w) bad.push(id + ' draws the same pixels with params ' + JSON.stringify(p)); }
    return { bad, n: Object.keys(E.SHAPES).length, gens: gen.length };
  });
  for (const b of r.bad) fail('shapes', b);
  if (!r.bad.length) ok(r.n + ' shapes draw in 5 views and 8 facings, inside their bounds, every part seen; the same pixels twice; ' + r.gens + ' generators change with their params');
}

/* 2. every material on every surface */
console.log('2. every material on every surface');
{
  warnings.length = 0;
  const r = await page.evaluate(() => {
    const E = My3D2dge, bad = [], ids = Object.keys(E.MATERIALS), cv = document.createElement('canvas'); document.body.appendChild(cv);
    let scene = null; const game = new E.Game({ canvas: cv, menu: false, corner: false, res: [160, 120], view: 'iso', bg: '#000000' });
    game.start({ update() {}, draw(r) { if (scene) scene(r); } });
    const shot = () => { game.advance(1 / 120, { draw: true }); const b = game.screen.buf, d = b.getContext('2d').getImageData(0, 0, b.width, b.height).data; let n = 0, mag = 0; for (let i = 0; i < d.length; i += 4) { if (d[i] + d[i + 1] + d[i + 2] > 0) n++; if (d[i] > 240 && d[i + 1] < 16 && d[i + 2] > 240) mag++; } return [n, mag]; };
    for (const id of ids) {
      // a wall block with this face and top, on a floor of it (isometric)
      const map = new E.TileMap({ w: 3, h: 3, cells: [0, 0, 0, 0, 1, 0, 0, 0, 0], types: { 1: { h: 24, top: '#6a6280', side: '#4a4360', face: id, roof: id } }, floorMat: id });
      game.setView('iso'); scene = r => { map.drawFloor(r); map.queueWalls(r); }; game.focus(24, 24, 0);
      let [n, mag] = shot(); if (n < 1500) bad.push(id + ' on a wall and a floor draws ' + n + ' pixels'); if (mag) bad.push(id + ' on a wall or a floor draws magenta');
      // a platform tile of it (side view), and a shape of it
      const level = new E.PlatformMap({ rows: ['...', '.#.', '###'], legend: { '#': 1 }, types: { 1: { kind: 'solid', style: 'block', mat: id } } });
      game.setView('side'); scene = r => level.draw(r); game.focus(24, 0, 24);
      [n, mag] = shot(); if (n < 600) bad.push(id + ' on a platform tile draws ' + n + ' pixels'); if (mag) bad.push(id + ' on a platform tile draws magenta');
      game.setView('iso'); scene = r => r.shape({ mats: { m: id }, parts: [['box', 'm', [0, 0, 0], [12, 12, 10]]] }, 0, 0, 0); game.focus(0, 0, 0);
      [n, mag] = shot(); if (n < 150) bad.push(id + ' on a shape draws ' + n + ' pixels'); if (mag) bad.push(id + ' on a shape draws magenta');
    }
    game.stop(); cv.remove();
    // the engine's own looks are entries: wall faces, wall tops, tile styles, floor textures
    for (const k of ['stone', 'rock', 'plank', 'timber', 'plaster', 'hedge']) if (!E.MATERIALS[k] || !E.MATERIALS[k].face) bad.push('the wall face ' + k + ' is not an entry with a face painter');
    for (const k of ['tiles', 'slab', 'leaves', 'grass']) if (!E.MATERIALS[k] || !E.MATERIALS[k].roof) bad.push('the wall top ' + k + ' is not an entry with a roof painter');
    for (const k of ['brick', 'stone', 'wood', 'metal', 'ground', 'pipe', 'block', 'bonus']) if (!E.MATERIALS[k] || !E.MATERIALS[k].tile) bad.push('the tile style ' + k + ' is not an entry with a tile painter');
    for (const k of ['flagstone', 'grass', 'dirt', 'water', 'planks', 'checker', 'plain']) if (!E.MATERIALS[k] || !E.MATERIALS[k].floor) bad.push('the floor texture ' + k + ' is not an entry with a floor painter');
    return { bad, n: ids.length };
  });
  for (const b of r.bad) fail('materials', b);
  for (const w of warnings) fail('materials', 'a warning: ' + w);
  // an unknown name warns, with the list
  warnings.length = 0;
  await page.evaluate(() => { const E = My3D2dge; E.material('no-such-stuff', null, 'wall face'); });
  if (!warnings.some(w => /unknown wall face "no-such-stuff"\. Materials: .*oak/.test(w))) fail('materials', 'an unknown face name does not warn with the list of names');
  if (!r.bad.length && !warnings.length) ok(r.n + ' materials draw on a wall face, a wall top, a floor, a platform tile and a shape; the engine\'s own faces, tops, tile styles and floor textures are entries');
}

/* 3. collision and sorting */
console.log('3. solid shapes: collision and sorting');
{
  const r = await page.evaluate(() => {
    const E = My3D2dge, bad = [], T = 16, map = () => new E.TileMap({ w: 12, h: 12 });
    // walk into a table (24 x 14, top at 12) from the west: stops at its edge
    let m = map(); m.solid('table', 96, 96, 0, { facing: Math.PI / 2 });
    let b = new E.Body({ x: 60, y: 96, r: 5 }); for (let i = 0; i < 240; i++) { b.vx = 60; b.update(1 / 120, m); }
    if (b.x > 96 - 12 - 5 + .5) bad.push('a body walking into the table passed its edge (x ' + b.x.toFixed(1) + ', the edge is at 84 - 5)');
    // a jump at it, below its top: stopped
    b = new E.Body({ x: 60, y: 96, r: 5 }); b.jump(120); for (let i = 0; i < 120; i++) { b.vx = 60; b.update(1 / 120, m); }
    if (b.x > 96 - 12 - 5 + .5) bad.push('a body jumping at the table below its top passed through it (x ' + b.x.toFixed(1) + ')');
    // a body dropped onto it lands on its top
    b = new E.Body({ x: 96, y: 96, z: 30, r: 5, onGround: false }); for (let i = 0; i < 240; i++) b.update(1 / 120, m);
    if (Math.abs(b.z - 12) > .01 || !b.onGround) bad.push('a body dropped onto the table did not land on its top (z ' + b.z.toFixed(2) + ')');
    // a shape set above a body's head (a shelf at z 40): it walks under it
    m = map(); m.solid('crate', 96, 96, 40);
    b = new E.Body({ x: 60, y: 96, r: 5 }); for (let i = 0; i < 240; i++) { b.vx = 60; b.update(1 / 120, m); }
    if (b.x < 120) bad.push('a body did not walk under a crate set at z 40 (x ' + b.x.toFixed(1) + ')');
    // the solid's box turns, scales and mirrors with the shape: compare it with the shape drawn from straight above
    const over = E.VIEWS.overhead, iou = (id, o) => {
      m = map(); const s = m.solid(id, 0, 0, 0, o), I = E.shapeInfo(id, Object.assign({ view: over }, o)); let inter = 0, uni = 0;
      for (let j = 0; j < I.rgba.length / 4; j++) { const x = j % I.w - I.ox + .5, y = Math.floor(j / I.w) - I.oy + .5, lx = (x - s.x) * s.c + (y - s.y) * s.s, ly = -(x - s.x) * s.s + (y - s.y) * s.c, inBox = Math.abs(lx) <= s.hx && Math.abs(ly) <= s.hy, drawn = I.rgba[j * 4 + 3] > 0; if (inBox && drawn) inter++; if (inBox || drawn) uni++; }
      return inter / (uni || 1);
    };
    for (const [id, o] of [['crate', { facing: .7 }], ['table', { facing: 2.1, scale: 1.5 }], ['bed', { facing: -.4, flip: true }], ['chest', { facing: 1, flip: true, scale: .8 }]]) { const v = iou(id, o); if (v < .8) bad.push('the solid box of ' + id + ' ' + JSON.stringify(o) + ' matches its top-down picture at IoU ' + v.toFixed(2) + ' (want .8)'); }
    // sorting: a hero round a table, in the three-quarter view: in front of it on its near side, behind it on its far side
    // (a magenta stand-in for the hero: on the near side it shows whole, on the far side the table hides part of it)
    const cv = document.createElement('canvas'); document.body.appendChild(cv); let hx = 0, hy = 0, withTable = true;
    const game = new E.Game({ canvas: cv, menu: false, corner: false, res: [200, 150], view: 'threequarter', bg: '#000000' });
    game.start({ update() {}, draw(r) { if (withTable) r.shape('table', 0, 0, 0, { facing: 0, shadow: false }); r.actor(hx, hy, 0, (g, ox, oy) => { g.fillStyle = '#ff00ff'; g.fillRect(ox - 4, oy - 30, 8, 30); }, { outline: false, rim: false }); } });
    const magenta = () => { game.focus(0, 0, 0); game.advance(1 / 120, { draw: true }); const b = game.screen.buf, d = b.getContext('2d').getImageData(0, 0, b.width, b.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 240 && d[i + 1] < 16 && d[i + 2] > 240) n++; return n; };
    for (const [x, y, want] of [[0, 9, 'front'], [0, -9, 'behind'], [10, 9, 'front'], [-10, -9, 'behind'], [14, 0, 'front?'], [-14, 0, 'front?']]) {
      hx = x; hy = y; withTable = false; const alone = magenta(); withTable = true; const seen = magenta(), got = seen >= alone ? 'front' : 'behind';
      if (want !== 'front?' && got !== want) bad.push('a hero at (' + x + ', ' + y + ') beside a table shows ' + seen + ' of its ' + alone + ' pixels: it sorts ' + got + ' (want ' + want + ')');
    }
    game.stop(); cv.remove();
    return { bad };
  });
  for (const b of r.bad) fail('collision', b);
  if (!r.bad.length) ok('bodies stop at a solid table, walking or jumping below its top, land on it, walk under a crate set above them; the solid box turns, scales and mirrors with the shape; a hero sorts right round a table');
}

/* 4. sets */
console.log('4. sets: names, never replacing, own ids first, sprites');
{
  warnings.length = 0;
  const r = await page.evaluate(() => {
    const E = My3D2dge, bad = [], core = E.SHAPES.barrel;
    const A = { set: 'A', format: 1, materials: { wood: '#203040 planks' }, shapes: { barrel: { about: 'A barrel', mats: { w: 'wood' }, parts: [['cyl', 'w', [0, 0, 0], 6, 14]] }, stack: { about: 'two of them', parts: [['use', 'barrel', [-7, 0, 0]], ['use', 'barrel', [7, 0, 0]]] } },
      sprites: { coin: { rows: ['.33.', '3443', '3443', '.22.'], colors: { 2: 'gold:sh', 3: 'gold', 4: 'gold:hi' } } } };
    const B = { set: 'B', format: 1, materials: { wood: '#c0a080 planks' }, shapes: { barrel: { about: 'B barrel', mats: { w: 'wood' }, parts: [['cyl', 'w', [0, 0, 0], 6, 14]] } } };
    const ra = E.addAssets(A), rb = E.addAssets(B);
    if (ra.shapes.join() !== 'A:barrel,A:stack' || rb.shapes.join() !== 'B:barrel') bad.push('the ids returned: ' + ra.shapes + ' / ' + rb.shapes);
    if (E.SHAPES.barrel !== core) bad.push('a set replaced the core barrel');
    if (E.SHAPES['A:barrel'].about !== 'A barrel' || E.SHAPES['B:barrel'].about !== 'B barrel') bad.push('a set replaced another set\'s entry');
    const ia = E.shapeInfo('A:barrel', { view: E.VIEWS.side }), ib = E.shapeInfo('B:barrel', { view: E.VIEWS.side }), mid = I => { const j = (I.oy - 7) * I.w + I.ox; return [I.rgba[j * 4], I.rgba[j * 4 + 1], I.rgba[j * 4 + 2]]; };
    const ca = mid(ia), cb = mid(ib); if (Math.abs(ca[0] - cb[0]) + Math.abs(ca[2] - cb[2]) < 60) bad.push('the two sets\' "wood" look the same: ' + ca + ' / ' + cb);
    const st = E.shapeInfo('A:stack', { view: E.VIEWS.side }); if (st.prims !== 2 || st.w < 2 * ia.w - 4) bad.push('A:stack does not use A\'s own barrel (two of them): ' + st.prims + ' primitives, ' + st.w + ' wide');
    E.addAssets(A);   // again: kept, with a warning
    if (E.SHAPES['A:barrel'].about !== 'A barrel') bad.push('adding a set twice replaced its entry');
    const coin = ra.sprites['A:coin'], gold = E.material('gold').hexes; if (!coin || !coin.isSprite || coin.w !== 4) bad.push('the sprite A:coin was not made');
    else { const d = coin.cv.getContext('2d').getImageData(1, 1, 1, 1).data, want = E.hex(gold[4]); if (Math.abs(d[0] - want[0]) + Math.abs(d[1] - want[1]) > 4) bad.push('the sprite\'s "gold:hi" is ' + [d[0], d[1], d[2]] + ', not ' + want); }
    return { bad };
  });
  for (const b of r.bad) fail('sets', b);
  if (!warnings.some(w => /A:barrel is already there/.test(w))) fail('sets', 'adding an id that is already there does not warn');
  if (!r.bad.length) ok('E.addAssets names entries SET:id, keeps the core\'s and other sets\', uses a set\'s own ids first, warns on an id already there; sprites take material:tone colors');
}

/* 5. validation */
console.log('5. a broken entry warns, naming the entry and the field');
{
  warnings.length = 0;
  await page.evaluate(() => {
    const E = My3D2dge;
    E.SHAPES.broken = { about: 'broken', parts: [['box', 'oak', [0, 0, 0], [4, 4]], ['cyl', 'oak', [0, 0], 3, 4], ['lathe', 'oak', [0, 0, 0], [[1, 2]]], ['spline', 'oak', [0, 0, 0]], ['mirror', 'q', ['box', 'oak', [0, 0, 0], [1, 1, 1]]]] };
    E.shapeInfo('broken', { view: E.VIEWS.iso });
  });
  const want = [/broken: parts\[0\] \(box\): its size is \[w, d, h\]/, /broken: parts\[1\] \(cyl\): its at is \[x, y, z\]/, /broken: parts\[2\] \(lathe\): its profile is/, /broken: parts\[3\]: unknown part "spline"/, /broken: parts\[4\] \(mirror\): its axis is/];
  const miss = want.filter(re => !warnings.some(w => re.test(w)));
  for (const re of miss) fail('validation', 'no warning matching ' + re + ' (got: ' + warnings.join(' | ') + ')');
  if (!miss.length) ok('5 broken parts warn, each naming the entry, the part and what it should be');
}

/* 6. size */
console.log('6. the library\'s size');
{
  const src = ENGINE, a = src.indexOf(' * 21f. THE CORE LIBRARY'), b = src.indexOf('/* ====', a + 10), lib = src.slice(a, b);
  const body = lib.slice(lib.indexOf('Object.assign(SHAPES, {')), starts = [...body.matchAll(/^(\w+): \{/gm)], sizes = [];
  starts.forEach((m, i) => { const text = body.slice(m.index, i + 1 < starts.length ? starts[i + 1].index : body.lastIndexOf('});')).trim().replace(/,$/, ''); sizes.push([m[1], tok(text)]); });
  const big = sizes.filter(([, n]) => n > 300), med = sizes.map(s => s[1]).sort((x, y) => x - y)[sizes.length >> 1];
  for (const [id, n] of big) fail('size', id + ' is ' + n + ' tokens (over 300)');
  if (med > 150) fail('size', 'the median core shape is ' + med + ' tokens (over 150)');
  if (lib.length > 12 * 1024) fail('size', 'the core library is ' + (lib.length / 1024).toFixed(1) + ' KB of source (over 12)');
  if (!big.length && med <= 150 && lib.length <= 12 * 1024) ok(sizes.length + ' core shapes, median ' + med + ' tokens, largest ' + Math.max(...sizes.map(s => s[1])) + '; the core library ' + (lib.length / 1024).toFixed(1) + ' KB');
  writeFileSync(join(out, 'sizes.json'), JSON.stringify(Object.fromEntries(sizes), null, 1));
}

await browser.close();
if (problems.length) { console.log('\nFAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('\nall passed');
