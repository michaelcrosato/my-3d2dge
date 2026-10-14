/* =============================================================================
 * ASSET PROBE (temporary lab, src/labs.json "Temporary"; docs/HANDOFF-ASSETS.md, Phase 0): do short part lists with
 * named materials draw objects at least as well as our props, in every view?
 *   Sheets: each object (24 written by hand, 8 converted from Kenney's CC0 kits) in every view and turning, beside the
 *     hero and our closest flat prop, on a light and a dark Emberdeep floor, with its numbers (tokens, parts, raster
 *     time); the six fitted materials (ambientCG, CC0) on a box, a barrel and a floor.
 *   Room: the same objects drawn by the engine in a room (r.actor: outline, sorting, x-ray), beside the props they
 *     would replace, the hero walking a lap; 1-4 or the buttons pick the view.
 * The bar holds the look decisions (light, steep views, colors, size, lit edges, dithering), set to what was decided.
 * window.__probe: { S, ids, build, timing(id), numbers }.
 * ============================================================================= */
(() => {
'use strict';
const E = My3D2dge, AP = window.AssetProbe, $ = id => document.getElementById(id);
const CONV = AP.CONVERTED || {}, KIT = { 'kenney-survival': 3.5, 'kenney-graveyard': 2, 'kenney-furniture': 2 };   // each kit's prop scale (the converter's)
const HAND = Object.keys(AP.SHAPES), CONVERTED = Object.keys(CONV), FITTED = AP.FITTED || [];
// the look decisions (docs/HANDOFF-ASSETS.md section 6, Phase 0, step 5), not yet made: the renderer plain; the bar changes them live
const S = { light: 'view', steep: 'tilt', colors: 'own', size: 'kit', edges: false, dither: false, zoom: 2, show: 'all', mode: 'sheets', view: 'iso', floor: 'light' };
const q = new URLSearchParams(location.search); for (const k of Object.keys(S)) if (q.has(k)) { const v = q.get(k); S[k] = v === 'true' ? true : v === 'false' ? false : isNaN(+v) ? v : +v; }
const FLOORS = {
  light: { name: 'Ruins (light)', pal: { stones: ['#8c8472', '#958b76', '#827a6a'], mortar: '#3e3a32', hi: '#a39a84', lo: '#6f685a', speck: '#5f7a3a' } },
  dark: { name: 'Forge (dark)', pal: { stones: ['#3a3234', '#433a3b', '#3e3638'], mortar: '#1a1416', hi: '#4e4446', lo: '#2c2426', speck: '#565866' } }
};
for (const f of Object.values(FLOORS)) f.p = { stones: f.pal.stones.map(E.hex), mortar: E.hex(f.pal.mortar), hi: E.hex(f.pal.hi), lo: E.hex(f.pal.lo), speck: E.hex(f.pal.speck) };
const VIEWS = [['iso', 'Isometric'], ['threequarter', 'Three-quarter'], ['topdown', 'Top-down'], ['brawler', 'Brawler'], ['side', 'Side']];
const FACE = Math.PI / 2 + .45;   // a quarter turn off the front, so both sides show
const PROP_SIZE = 1.4;   // our props as the starters draw them (propSize 1.25 to 2.4): bigger than life, beside the hero

/* ---------- a shape as the sheets and the room draw it ---------- */
/** the spec a shape draws from, with the decisions applied (a converted model's colors and size) */
function spec(id) {
  const e = CONV[id]; if (!e) return id;
  const mats = S.colors === 'own' ? Object.fromEntries(Object.entries(e.srcColors || {}).map(([s, c]) => [s, c + ' ' + ((AP.MATERIALS[e.mats[s]] || {}).pattern || 'none')])) : e.mats;
  return Object.assign({}, e, { mats });
}
const scaleOf = id => CONV[id] && S.size === 'kit' ? 1 / (KIT[CONV[id].src] || 1) : 1;
const viewFor = v => S.steep === 'tilt' ? E.charView(v) : v;
const cache = new Map();
function raster(id, view, facing, extra) {
  const key = id + '|' + view.id + view.yawDeg + ':' + view.pitchDeg + ':' + view.scale + ':' + view.zBoost + '|' + facing.toFixed(3) + '|' + JSON.stringify([S.light, S.colors, S.size, S.edges, S.dither, extra || 0]);
  let r = cache.get(key);
  if (!r) { if (cache.size > 2000) cache.clear(); r = AP.raster(spec(id), view, { facing, scale: scaleOf(id), light: S.light, edges: S.edges, creases: S.edges, dither: S.dither }); r.cv = AP.toCanvas(r, false); cache.set(key, r); }
  return r;
}
const shadows = new Map();
/** the contact shadow: the footprint's hull (soft) and where parts meet the floor (darker), turned and projected */
function drawShadow(g, id, view, facing, x, y) {
  let sh = shadows.get(id + S.size + S.colors); if (!sh) { sh = AP.shadow(spec(id)); shadows.set(id + S.size + S.colors, sh); }
  const k = scaleOf(id), a = facing - Math.PI / 2, c = Math.cos(a), s = Math.sin(a);
  const P = pts => pts.map(([px, py]) => { const X = (px * c - py * s) * k, Y = (px * s + py * c) * k, q2 = view.p(X, Y, 0); return [x + q2[0], y + q2[1]]; });
  if (sh.hull.length >= 3) E.px.polyDither(g, P(sh.hull), '#0c0818', .26, 0, 0);
  for (const ct of sh.contact) E.px.polyDither(g, P(ct), '#0c0818', .4, 0, 0);
}

/* ---------- the sheets ---------- */
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; };
const floorTex = new Map();
function floorCanvas(name, W, H) {
  const key = name + W + 'x' + H; let c = floorTex.get(key); if (c) return c;
  const [cv, g] = mk(W, H), img = g.createImageData(W, H), F = FLOORS[name].p;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const col = E.tex.flagstone(x, y * 1.25, F, 16), i = (y * W + x) * 4; img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0); floorTex.set(key, cv); return cv;
}
const outline = cv => {   // the renderer's 1-px outline round everything drawn on a layer
  const g = cv.getContext('2d'), W = cv.width, H = cv.height, im = g.getImageData(0, 0, W, H), a = im.data, s = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) s[i] = a[i * 4 + 3] ? 1 : 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (s[i]) continue; if ((x > 0 && s[i - 1]) || (x < W - 1 && s[i + 1]) || (y > 0 && s[i - W]) || (y < H - 1 && s[i + W])) { a[i * 4] = 20; a[i * 4 + 1] = 12; a[i * 4 + 2] = 28; a[i * 4 + 3] = 255; } }
  g.putImageData(im, 0, 0); return cv;
};
const hero = new E.Humanoid({ outfit: 'tunic', hair: 'short', sleeves: 'short', weapon: 'sword', bladeLen: 11, cape: { len: 6, width: 5, seg: 2.5 },
  colors: { skin: '#f1c7a0', hair: '#2e2230', cloth: '#2f8f86', pants: '#3b3552', boot: '#6a4128', belt: '#e0a84a', cape: '#c8452f', capeIn: '#7a2622', metal: '#dce8f1', metalDk: '#7f93ab', hilt: '#e8b04e' } });
for (let i = 0; i < 40; i++) hero.update(1 / 60, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: .6 });
/** a cell: the floor, a shadow, one thing (outlined) standing at (fx, fy) */
function cell(W, H, fx, fy, floor, shadow, draw) {
  const [c, g] = mk(W, H), [o, og] = mk(W, H);
  g.drawImage(floorCanvas(floor, W, H), 0, 0);
  if (shadow) shadow(g); draw(og, fx, fy); outline(o); g.drawImage(o, 0, 0); return c;
}
function figure(parent, c, label, zoom, cls) {
  const f = document.createElement('figure'); if (cls) f.className = cls;
  c.style.width = c.width * zoom + 'px'; c.style.height = c.height * zoom + 'px'; f.appendChild(c);
  const cap = document.createElement('figcaption'); cap.textContent = label; f.appendChild(cap); parent.appendChild(f); return f;
}
/** what each view of a sheet draws: [label, view, facing] */
function columns() {
  const cols = VIEWS.map(([id, label]) => [label, id === 'topdown' ? viewFor(E.VIEWS[id]) : E.VIEWS[id], FACE]);   // (steep: pitch 70 and up)
  if (S.steep === 'tilt') cols.splice(3, 0, ['Top-down, true', E.VIEWS.topdown, FACE]);
  for (let k = 1; k < 4; k++) cols.push(['Turned ' + k * 90 + '°', E.VIEWS.iso, FACE + k * Math.PI / 2]);
  return cols;
}
const timing = id => {   // raster milliseconds at zoom 1 in the isometric view: the median of 9, after 3 to warm up
  for (let i = 0; i < 3; i++) AP.raster(spec(id), E.VIEWS.iso, { facing: FACE - i }); const t = [];
  for (let i = 0; i < 9; i++) { const a = performance.now(); AP.raster(spec(id), E.VIEWS.iso, { facing: FACE + i * .7 }); t.push(performance.now() - a); }
  return t.sort((a, b) => a - b)[4];
};
const N = () => AP.NUMBERS || {};
function numbers(id) {
  const n = N()[id] || {}, R = AP.resolve(spec(id)), r = raster(id, E.VIEWS.iso, FACE), e = CONV[id] || AP.SHAPES[id];
  const tokens = n.tokens ? n.tokens + ' tokens' : '≈' + Math.round((n.chars || JSON.stringify(e).length) / 3.2) + ' tokens';
  const out = [tokens, (e.parts ? e.parts.length + ' parts, ' : 'a generator, ') + R.prims.length + ' primitives', r.tris + ' triangles', timing(id).toFixed(2) + ' ms to draw'];
  if (CONV[id]) { const f = CONV[id].fit; out.push(`fit: IoU ${f.iou} (worst view ${f.worst}), color dE ${f.dE} in its own colors, ${f.dElib} in the library's`); }
  return out;
}
function card(root, id) {
  const e = CONV[id] || AP.SHAPES[id], sec = document.createElement('section'); sec.className = 'card'; sec.id = id; root.appendChild(sec);
  const h = document.createElement('h2'); h.innerHTML = '<a href="#' + id + '"></a> <span class="about"></span>'; h.firstChild.textContent = id; h.lastChild.textContent = e.about || ''; sec.appendChild(h);
  if (CONV[id]) { const src = document.createElement('p'); src.className = 'src'; src.textContent = `Converted from Kenney's ${CONV[id].src.replace('kenney-', '')} kit (CC0 1.0), ${CONV[id].orig}, at ${KIT[CONV[id].src] || 1}x its size.`; sec.appendChild(src); }
  const nums = document.createElement('p'); nums.className = 'nums'; nums.textContent = numbers(id).join(' · '); sec.appendChild(nums);
  const cols = columns(), rs = cols.map(([, v, f]) => raster(id, v, f)), prop = AP.PROP_OF[id] && E.prop(AP.PROP_OF[id], { size: PROP_SIZE }), spr = prop && prop.frames[0];
  let up = 40, down = 8, half = 14;
  if (spr) { up = Math.max(up, spr.h + 4); half = Math.max(half, spr.w / 2 + 3); }
  for (const r of rs) { up = Math.max(up, r.oy + 3); down = Math.max(down, r.h - r.oy + 3); half = Math.max(half, r.ox + 3, r.w - r.ox + 3); }
  const W = Math.ceil(half * 2 + 6), H = Math.ceil(up + down + 4), fx = Math.round(W / 2), fy = Math.round(up + 2);
  for (const floor of ['light', 'dark']) {
    const strip = document.createElement('div'); strip.className = 'strip'; sec.appendChild(strip);
    figure(strip, cell(W, H, fx, fy, floor, null, (g, x, y) => hero.draw(g, x, y, E.charView(E.VIEWS.iso))), 'Hero', S.zoom);
    if (spr) figure(strip, cell(W, H, fx, fy, floor, null, (g, x, y) => g.drawImage(spr.cv, Math.round(x - spr.w / 2), Math.round(y - spr.h))), 'Our ' + AP.PROP_OF[id] + ' prop (1.4x)', S.zoom, 'ours');
    cols.forEach(([label, v, f], k) => { const r = rs[k]; figure(strip, cell(W, H, fx, fy, floor, g => drawShadow(g, id, v, f, fx, fy), (g, x, y) => g.drawImage(r.cv, x - r.ox, y - r.oy)), label, S.zoom); });
  }
  const pre = document.createElement('pre'); pre.textContent = entryText(id); sec.appendChild(pre);
}
function entryText(id) {
  const e = CONV[id] || AP.SHAPES[id], f = (k, v) => typeof v === 'function' ? v.toString() : v;
  const o = Object.assign({}, e); delete o.srcColors; delete o.fit;
  return id + ': ' + JSON.stringify(o, f).replace(/"(\w+)":/g, '$1:') + (CONV[id] ? '\n// fit ' + JSON.stringify(e.fit) + '; the model\'s own colors ' + JSON.stringify(e.srcColors) : '');
}
function materialCard(root, id) {
  const m = AP.MATERIALS[id], sec = document.createElement('section'); sec.className = 'card mat'; sec.id = id; root.appendChild(sec);
  const h = document.createElement('h2'); h.innerHTML = '<a href="#' + id + '"></a> <span class="about"></span>'; h.firstChild.textContent = id; h.lastChild.textContent = `fitted from ambientCG's ${m.orig} (CC0 1.0)`; sec.appendChild(h);
  const nums = document.createElement('p'); nums.className = 'nums'; nums.textContent = `pattern ${m.pattern} · fit: color dE ${m.fit.dE}, ramp dE ${m.fit.ramp}, structure ${m.fit.structure}`; sec.appendChild(nums);
  const strip = document.createElement('div'); strip.className = 'strip'; sec.appendChild(strip);
  const things = [['A crate of it', { mats: { m: id }, parts: [['box', 'm', [0, 0, 0], [24, 24, 22]]] }], ['A barrel of it', { mats: { m: id }, parts: [['lathe', 'm', [0, 0, 0], [[0, 0], [9, 0], [10.5, 12], [9, 24], [0, 24]]]] }],
    ['A floor of it (top-down)', { mats: { m: id }, parts: [['box', 'm', [0, 0, 0], [40, 40, .5]]] }]];
  for (const [label, sp] of things) {
    const v = label.includes('floor') ? E.VIEWS.topdown : E.VIEWS.iso, r = AP.raster(sp, v, { facing: FACE, light: S.light, edges: S.edges, creases: S.edges }), cv = AP.toCanvas(r, false);
    const W = r.w + 10, H = r.h + 10; figure(strip, cell(W, H, 5 + r.ox, 5 + r.oy, 'dark', null, (g, x, y) => g.drawImage(cv, x - r.ox, y - r.oy)), label, S.zoom);
  }
  const pre = document.createElement('pre'); const o = Object.assign({}, m); delete o.fit; pre.textContent = `E.MATERIALS['${id}'] = ` + JSON.stringify(o).replace(/"(\w+)":/g, '$1:'); sec.appendChild(pre);
}
function build() {
  const root = $('cards'); root.textContent = '';
  const ids = S.show === 'converted' ? CONVERTED : S.show === 'hand' ? HAND : S.show === 'materials' ? [] : HAND.concat(CONVERTED);
  for (const id of ids) card(root, id);
  if (S.show === 'all' || S.show === 'materials') for (const id of FITTED) materialCard(root, id);
  summary();
  if (location.hash) { const el = document.getElementById(location.hash.slice(1)); if (el) el.scrollIntoView(); }
}
/** the gate's numbers (docs/HANDOFF-ASSETS.md section 7), measured on this page */
function summary() {
  const tok = HAND.map(id => (N()[id] || {}).tokens || Math.round(JSON.stringify(AP.SHAPES[id], (k, v) => typeof v === 'function' ? v.toString() : v).length / 3.2)).sort((a, b) => a - b);
  const typical = HAND.filter(id => AP.resolve(id).prims.length <= 30), ms = typical.map(timing).sort((a, b) => a - b);
  const fits = CONVERTED.map(id => CONV[id].fit), passed = fits.filter(f => f.iou >= .7).length;
  $('gate').innerHTML = '';
  for (const [k, v, ok] of [
    ['Hand-written shapes', `median ${tok[tok.length >> 1]} tokens (gate: 150 or fewer)`, tok[tok.length >> 1] <= 150],
    ['Raster time', `typical shapes (${typical.length} of ${HAND.length}, 30 primitives or fewer): median ${ms[ms.length >> 1].toFixed(2)} ms, slowest ${ms[ms.length - 1].toFixed(2)} ms at zoom 1 (gate: 4 ms or less)`, ms[ms.length - 1] <= 4],
    ['Converted models', `${passed} of ${fits.length} reach IoU .7 (gate: 6 or more); mean ${(fits.reduce((a, f) => a + f.iou, 0) / fits.length).toFixed(2)}, worst view ${Math.min(...fits.map(f => f.worst))}`, passed >= 6]]) {
    const d = document.createElement('div'); d.className = ok ? 'ok' : 'fail'; d.innerHTML = '<b></b> '; d.firstChild.textContent = k + ':'; d.append(v); $('gate').appendChild(d);
  }
}

/* ---------- the room: the same objects, drawn by the engine ---------- */
let game = null;
const T = 16, MW = 15, MH = 11, PLACES = [   // [id, x, y (tiles), facing (radians)], with the prop it would replace on the right
  ['barrel', 2.5, 2.5, 1.9], ['crate', 4, 2.4, 1.2], ['chest', 5.6, 2.6, 1.57], ['pot', 2.3, 4.2, 1], ['rock', 4.2, 4.4, .3], ['crystal', 5.8, 4.3, 2],
  ['table', 2.8, 6.4, 1.57], ['chair', 2.8, 5.6, -1.57], ['bookcase', 5.5, 6.2, 1.57], ['pine', 2.4, 8.6, 0], ['tree', 4.2, 8.6, 0], ['lamppost', 6, 8.5, 0],
  ['bed', 5.6, 1.6, 0]];
const RIGHT = [['barrel', 9.5, 2.5], ['crate', 11, 2.4], ['chest', 12.6, 2.6], ['pot', 9.3, 4.2], ['rock', 11.2, 4.4], ['crystal', 12.8, 4.3], ['pine', 9.4, 8.6], ['tree', 11.2, 8.6], ['streetlamp', 13, 8.5]];
function room() {
  if (game) return;
  const cells = new Array(MW * MH).fill(0); for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (!x || !y || x === MW - 1 || y === MH - 1) cells[y * MW + x] = 1;
  for (let y = 3; y < 8; y++) cells[y * MW + 7] = 2;   // a low wall down the middle: shapes on the left, props on the right
  const F = FLOORS[S.floor].p, map = new E.TileMap({ w: MW, h: MH, tile: T, cells, floorTex: (x, y) => E.tex.flagstone(x, y, F), types: { 1: { h: 36, cut: true, cutH: 6, top: '#8a8470', side: '#625d4d', course: 8 }, 2: { h: 10, top: '#8a8470', side: '#625d4d' } } });
  game = new E.Game({ canvas: 'screen', menu: false, corner: false, fullscreen: 'button', view: S.view, minH: 220, maxW: 520, bg: '#0d0b14' });
  const h = { x: 7.5 * T, y: 9.2 * T, vx: 0, vy: 0, facing: 0, t: 0, rig: hero };
  const lap = t => [7.5 * T + Math.cos(t) * 6.2 * T, 5.4 * T + Math.sin(t) * 4 * T];
  game.start({
    update(dt) { h.t += dt * .22; const [x, y] = lap(h.t), [x2, y2] = lap(h.t + .02); h.vx = (x2 - x) * 50; h.vy = (y2 - y) * 50; h.x = x; h.y = y; h.facing = Math.atan2(y2 - y, x2 - x); h.rig.update(dt, { x: h.x, y: h.y, vx: h.vx, vy: h.vy, facing: h.facing }); game.focus(7.5 * T, 5.5 * T, 0); },
    draw(r) {
      const v = r.view; map.drawFloor(r);
      for (const [id, tx, ty, f] of PLACES) {
        const x = tx * T, y = ty * T, rv = v.pitchDeg > 70 && S.steep === 'tilt' ? E.charView(v) : v, ras = raster(id, rv, f, 'room');
        r.decal(g => { const [sx, sy] = r.w(x, y, 0); drawShadow(g, id, v, f, Math.round(sx), Math.round(sy)); });
        r.actor(x, y, 0, (g, ox, oy) => g.drawImage(ras.cv, ox - ras.ox, oy - ras.oy), { rim: false, hides: true });
      }
      for (const [p, tx, ty] of RIGHT) { r.shadow(tx * T, ty * T, 6, .35); r.prop(p, tx * T, ty * T, 0, { size: 1.3 }); }
      map.queueWalls(r);
      r.shadow(h.x, h.y, 5.5, .45); r.actor(h.x, h.y, 0, (g, ox, oy) => h.rig.draw(g, ox, oy, v), { xray: true });
    }
  });
  for (const [k, id] of [['Digit1', 'iso'], ['Digit2', 'threequarter'], ['Digit3', 'topdown'], ['Digit4', 'brawler']]) addEventListener('keydown', e => { if (e.code === k) setView(id); });
}
function setView(id) { S.view = id; if (game) game.setView(id); sync(); }

/* ---------- the bar ---------- */
function seg(label, key, options, after) {
  const box = document.createElement('div'); box.className = 'seg'; const l = document.createElement('span'); l.textContent = label; box.appendChild(l);
  for (const [text, value] of options) {
    const b = document.createElement('button'); b.textContent = text; b.dataset.key = key; b.dataset.value = String(value);
    b.onclick = () => { S[key] = value; cache.clear(); shadows.clear(); (after || rebuild)(); sync(); };
    box.appendChild(b);
  }
  $('bar').appendChild(box);
}
function sync() {
  for (const b of document.querySelectorAll('#bar button[data-key]')) b.setAttribute('aria-pressed', String(String(S[b.dataset.key]) === b.dataset.value));
  $('sheets').hidden = S.mode !== 'sheets'; $('roomBox').hidden = S.mode !== 'room';
  const u = new URL(location.href); for (const k of Object.keys(S)) u.searchParams.delete(k);
  try { history.replaceState(null, '', u.pathname + '?mode=' + S.mode + u.hash); } catch (e) { /* file:// */ }
}
const rebuild = () => { if (S.mode === 'sheets') build(); };
seg('Show', 'mode', [['Sheets', 'sheets'], ['Room', 'room']], () => { if (S.mode === 'room') room(); else build(); });
seg('Objects', 'show', [['All', 'all'], ['By hand', 'hand'], ['Converted', 'converted'], ['Materials', 'materials']]);
seg('Light', 'light', [['From the view', 'view'], ['Fixed in the world', 'world']]);
seg('Steep views', 'steep', [['Tilted like characters', 'tilt'], ['True', 'true']]);
seg('Kit colors', 'colors', [['The kit\'s own', 'own'], ['The library\'s', 'library']]);
seg('Kit size', 'size', [['Prop scale', 'prop'], ['The kit\'s own', 'kit']]);
seg('Lit edges, creases', 'edges', [['On', true], ['Off', false]]);
seg('Dither', 'dither', [['Off', false], ['On', true]]);
seg('Zoom', 'zoom', [['2×', 2], ['3×', 3]]);
seg('Room view', 'view', [['Iso', 'iso'], ['3/4', 'threequarter'], ['Top', 'topdown'], ['Brawler', 'brawler']], () => setView(S.view));
const back = document.createElement('a'); back.className = 'to-labs'; back.href = 'labs.html'; back.textContent = 'All labs'; $('bar').appendChild(back);
$('ver').textContent = 'my-3D2dge ' + E.versionLabel();
sync();
if (S.mode === 'room') room(); else build();
window.__probe = { S, ids: HAND.concat(CONVERTED), fitted: FITTED, build, timing, numbers: N, summary, raster };
})();
