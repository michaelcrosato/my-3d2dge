/* =============================================================================
 * SHAPES VS PROPS (temporary comparison, src/labs.json "Temporary"): twelve 3D models from two CC0 kits, converted to
 * boxes (window.SHAPES_COMPARE, src/shapes-compare.data.js) and drawn by the engine in its four views and turning,
 * beside the hero and our closest flat prop. Each shape is rasterized at game size with a small depth buffer (whole
 * pixels, a tone of E.tones per face by how it faces the light), outlined like the renderer's actors, then enlarged.
 * Throwaway: it showed whether shapes were worth building (the Shapes library plan, since dropped).
 * ============================================================================= */
(() => {
'use strict';
const E = My3D2dge, DATA = window.SHAPES_COMPARE || [];
const VIEWS = [['iso', 'Isometric'], ['threequarter', 'Three-quarter'], ['topdown', 'Top-down'], ['brawler', 'Brawler']];
const S = { zoom: 3, scale: 1, tilt: false, edges: true, floor: 0, spin: true };
const FLOORS = [['Dark stone', '#3b3548'], ['Sand', '#8a7a5a']];
const VERDICT = { great: 'Great', good: 'Good', okay: 'Okay', weak: 'Weak', poor: 'Poor', worst: 'Worst' };
const FACING = .55, STEPS = 32;
// drawing a shape (prep, raster, outline) is shared with the Free camera room: src/shapes-raster.js
const { raster, outline } = window.ShapeRaster; DATA.forEach(window.ShapeRaster.prep);
const cache = new Map();
function shapeSprite(i, view, facing) {
  const key = i + '|' + view.yawDeg + ':' + view.pitchDeg + ':' + view.scale + ':' + view.zBoost + '|' + facing.toFixed(4) + '|' + S.scale + '|' + S.edges;
  let r = cache.get(key); if (!r) { r = raster(DATA[i], view, facing, S.scale, S.edges); cache.set(key, r); }
  return r;
}

const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; };
const viewOf = id => { const v = E.VIEWS[id]; return S.tilt && v.pitchDeg > 70 ? E.charView(v) : v; };
// the hero, posed once (it stands still), drawn the way the game draws characters (E.charView keeps faces readable)
const hero = new E.Humanoid({ size: 1 }); for (let i = 0; i < 40; i++) hero.update(1 / 60, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: .6 });

/* ---- the page ---- */
function cell(W, H, fx, fy, draw) {   // a floor-colored cell with one thing drawn (outlined) standing at (fx, fy)
  const [c, g] = canvas(W, H), [o, og] = canvas(W, H); draw(og, fx, fy); outline(o);
  g.fillStyle = FLOORS[S.floor][1]; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(Math.round(fx - 7), fy, 14, 1);   // a hint of the floor line under the feet
  g.drawImage(o, 0, 0); return c;
}
function figure(parent, c, label, cls, zoom) {
  const f = document.createElement('figure'); if (cls) f.className = cls;
  c.style.width = c.width * zoom + 'px'; c.style.height = c.height * zoom + 'px'; f.style.width = c.width * zoom + 'px'; f.appendChild(c);   // (the caption wraps to the picture's width)
  const cap = document.createElement('figcaption'); cap.textContent = label; f.appendChild(cap); parent.appendChild(f); return c;
}
const spinners = [];
function build() {
  const root = document.getElementById('cards'); root.textContent = ''; spinners.length = 0;
  DATA.forEach((d, i) => {
    const card = document.createElement('section'); card.className = 'card'; root.appendChild(card);
    const h = document.createElement('h2'); card.appendChild(h);
    h.innerHTML = `<span class="rank">#${i + 1}</span> ${d.title} <span class="chip" style="background:var(--${d.verdict})">${VERDICT[d.verdict]}</span> <span class="kit">${d.kit}</span>`;
    const nums = document.createElement('p'); nums.className = 'nums'; card.appendChild(nums);
    nums.innerHTML = `<b>${d.tris.toLocaleString()}</b> triangles in the model → <b>${d.boxes.toLocaleString()}</b> boxes with today's prototype (${d.kb} KB of text) → about <b>${d.lines.toLocaleString()}</b> lines with the planned encoder`;
    // one cell size for the whole row: everything this card draws must fit
    const views = VIEWS.map(([id]) => viewOf(id)), sprites = views.map(v => shapeSprite(i, v, FACING));
    const turns = []; for (let k = 0; k < STEPS; k += 4) turns.push(shapeSprite(i, E.VIEWS.iso, FACING + k / STEPS * Math.PI * 2));
    let up = 46, down = 6, half = 14;
    const prop = d.ours ? E.prop(d.ours) : null, spr = prop && prop.frames[0];
    if (spr) { up = Math.max(up, spr.h + 2); half = Math.max(half, spr.w / 2 + 2); }
    for (const r of sprites.concat(turns)) { up = Math.max(up, r.oy + 2); down = Math.max(down, r.cv.height - r.oy + 2); half = Math.max(half, r.ox + 2, r.cv.width - r.ox + 2); }
    const W = Math.ceil(half * 2 + 6), H = Math.ceil(up + down + 4), fx = Math.round(W / 2), fy = Math.round(up + 2);
    // as big as the zoom asks, but the row's seven cells on one line when the card is wide enough (never under 2x)
    const fit = Math.floor((card.clientWidth - 28 - 6 * 10) / (7 * W)), zoom = Math.max(1, Math.min(S.zoom, Math.max(2, fit), Math.floor(420 / H)));
    const strip = document.createElement('div'); strip.className = 'strip'; card.appendChild(strip);
    figure(strip, cell(W, H, fx, fy, (g, x, y) => hero.draw(g, x, y, E.charView(E.VIEWS.iso))), 'Hero, for scale', '', zoom);
    if (spr) figure(strip, cell(W, H, fx, fy, (g, x, y) => g.drawImage(spr.cv, Math.round(x - spr.w / 2), Math.round(y - spr.h))), 'Our ' + d.ours + ' prop: the same picture in every view', 'ours', zoom);
    else figure(strip, cell(W, H, fx, fy, () => {}), 'We have no prop like this', 'ours', zoom);
    VIEWS.forEach(([, label], k) => { const r = sprites[k]; figure(strip, cell(W, H, fx, fy, (g, x, y) => g.drawImage(r.cv, x - r.ox, y - r.oy)), label, '', zoom); });
    const sc = figure(strip, cell(W, H, fx, fy, () => {}), 'Turning (isometric)', '', zoom);
    spinners.push({ i, c: sc, W, H, fx, fy, step: -1 });
    const notes = document.createElement('div'); notes.className = 'notes'; card.appendChild(notes);
    for (const [label, text] of [['What works', d.works], ['What is off', d.off], ['What would fix it', d.fix]]) { const n = document.createElement('div'); n.innerHTML = '<b></b>'; n.firstChild.textContent = label; n.append(text); notes.appendChild(n); }
  });
  spin(performance.now(), true);
}
// the turning cells: one of STEPS facings, cached, so a turn costs nothing after the first lap
function spin(now, force) {
  const step = S.spin ? Math.floor(now / 1000 * 4) % STEPS : 0;
  for (const s of spinners) {
    if (s.step === step && !force) continue; s.step = step;
    const r = shapeSprite(s.i, E.VIEWS.iso, FACING + step / STEPS * Math.PI * 2), c = cell(s.W, s.H, s.fx, s.fy, (g, x, y) => g.drawImage(r.cv, x - r.ox, y - r.oy));
    const g = s.c.getContext('2d'); g.clearRect(0, 0, s.W, s.H); g.drawImage(c, 0, 0);
  }
}
function loop(now) { spin(now, false); requestAnimationFrame(loop); }

/* ---- the controls ---- */
const bar = document.getElementById('bar');
function seg(label, key, options) {
  const box = document.createElement('div'); box.className = 'seg'; const l = document.createElement('span'); l.textContent = label; box.appendChild(l);
  for (const [text, value] of options) {
    const b = document.createElement('button'); b.textContent = text; b.setAttribute('aria-pressed', String(S[key] === value));
    b.onclick = () => { S[key] = value; for (const x of box.querySelectorAll('button')) x.setAttribute('aria-pressed', String(x === b)); build(); };
    box.appendChild(b);
  }
  bar.appendChild(box);
}
seg('Size', 'scale', [['Real', 1], ['Prop size ×1.4', 1.4]]);
seg('Steep views', 'tilt', [['True top-down', false], ['Tilted like characters', true]]);
seg('Top edges', 'edges', [['Lit', true], ['Plain', false]]);
seg('Floor', 'floor', FLOORS.map(([n], k) => [n, k]));
seg('Zoom', 'zoom', [['2×', 2], ['3×', 3], ['4×', 4]]);
seg('Turning', 'spin', [['On', true], ['Off', false]]);
const back = document.createElement('a'); back.className = 'to-labs'; back.href = 'labs.html'; back.title = 'Every lab and test page'; back.textContent = 'All labs'; bar.appendChild(back);
const foot = document.getElementById('foot'), ver = document.createElement('div'); ver.textContent = 'my-3D2dge ' + E.versionLabel(); foot.appendChild(ver);

build(); requestAnimationFrame(loop);
window.__shapesCompare = { S, build, DATA };
})();
