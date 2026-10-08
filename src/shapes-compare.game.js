/* =============================================================================
 * SHAPES VS PROPS (temporary comparison, src/labs.json "Temporary"): twelve 3D models from two CC0 kits, converted to
 * boxes (window.SHAPES_COMPARE, src/shapes-compare.data.js) and drawn by the engine in its four views and turning,
 * beside the hero and our closest flat prop. Each shape is rasterized at game size with a small depth buffer (whole
 * pixels, a tone of E.tones per face by how it faces the light), outlined like the renderer's actors, then enlarged.
 * Throwaway: it settles whether shapes are worth building (HANDOFF.md, the Shapes library plan).
 * ============================================================================= */
(() => {
'use strict';
const E = My3D2dge, DATA = window.SHAPES_COMPARE || [];
const VIEWS = [['iso', 'Isometric'], ['threequarter', 'Three-quarter'], ['topdown', 'Top-down'], ['brawler', 'Brawler']];
const S = { zoom: 3, scale: 1, tilt: false, edges: true, floor: 0, spin: true };
const FLOORS = [['Dark stone', '#3b3548'], ['Sand', '#8a7a5a']];
const VERDICT = { great: 'Great', good: 'Good', okay: 'Okay', weak: 'Weak', poor: 'Poor', worst: 'Worst' };
const FACING = .55, STEPS = 32, OUTLINE = [20, 12, 28];   // the renderer's outline color, #140c1c
const norm = v => { const l = Math.hypot(...v); return v.map(x => x / l); }, LIGHT = norm([-.55, -.35, .76]);

/* ---- colors: any CSS color -> [r, g, b] ---- */
const cc = document.createElement('canvas').getContext('2d'), rgbs = new Map();
function rgb(c) {
  let v = rgbs.get(c); if (v) return v;
  cc.fillStyle = '#000'; cc.fillStyle = c; const h = cc.fillStyle;
  v = h[0] === '#' ? [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)) : h.match(/[\d.]+/g).slice(0, 3).map(Number);
  rgbs.set(c, v); return v;
}

/* ---- a shape: its footprint centre and floor, and its tones ---- */
for (const d of DATA) {
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (const b of d.b) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], b[1 + k]); hi[k] = Math.max(hi[k], b[4 + k]); }
  d.c = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, lo[2]];
  d.T = d.mats.map(m => { const t = E.tones(m); return { deep: rgb(t.deep), sh: rgb(t.sh), base: rgb(t.base), lt: rgb(t.lt), hi: rgb(t.hi) }; });
}
// a box's corners (bit 0 x, bit 1 y, bit 2 z) and its faces: [corners in order, outward normal]
const FACES = [[[4, 5, 7, 6], [0, 0, 1]], [[0, 2, 3, 1], [0, 0, -1]], [[1, 3, 7, 5], [1, 0, 0]], [[0, 4, 6, 2], [-1, 0, 0]], [[2, 6, 7, 3], [0, 1, 0]], [[0, 1, 5, 4], [0, -1, 0]]];
const edge = (a, b, x, y) => (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);

/**
 * Draw a shape at game size into a canvas: every visible face rasterized with a depth buffer (nearer wins), shaded by
 * how it faces the light. Returns { cv, ox, oy }: the canvas and where the shape's feet are in it.
 */
function raster(d, view, facing, k, edges) {
  const c = Math.cos(facing), s = Math.sin(facing), [cx, cy, cz] = d.c, D = [view.dx, view.dy, view.dz];
  const P = (x, y, z) => { x = (x - cx) * k; y = (y - cy) * k; z = (z - cz) * k; const X = x * c - y * s, Y = x * s + y * c; return [view.ax * X + view.ay * Y, view.bx * X + view.by * Y + view.bz * z, view.dx * X + view.dy * Y + view.dz * z]; };
  const boxes = d.b.map(b => { const q = []; for (let i = 0; i < 8; i++) q.push(P(i & 1 ? b[4] : b[1], i & 2 ? b[5] : b[2], i & 4 ? b[6] : b[3])); return [b[0], q]; });
  let x0 = 0, y0 = 0, x1 = 0, y1 = 0;
  for (const [, q] of boxes) for (const p of q) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  const ox = 2 - Math.floor(x0), oy = 2 - Math.floor(y0), W = Math.ceil(x1) + ox + 3, H = Math.ceil(y1) + oy + 3;
  const zb = new Float32Array(W * H).fill(-Infinity), col = new Uint8ClampedArray(W * H * 4), top = new Uint8Array(W * H);
  for (const [m, q] of boxes) for (const [ix, n0] of FACES) {
    const n = [n0[0] * c - n0[1] * s, n0[0] * s + n0[1] * c, n0[2]];
    if (n[0] * D[0] + n[1] * D[1] + n[2] * D[2] <= 1e-6) continue;   // faces away from the camera
    const lit = n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2], t = d.T[m] || d.T[0];
    const C = lit > .6 ? t.lt : lit > .15 ? t.base : lit > -.35 ? t.sh : t.deep, up = n[2] > .5 ? 1 : 0;
    const v = ix.map(i => [q[i][0] + ox, q[i][1] + oy, q[i][2]]);
    for (const [a, b, e] of [[v[0], v[1], v[2]], [v[0], v[2], v[3]]]) {
      const area = edge(a, b, e[0], e[1]); if (Math.abs(area) < 1e-9) continue;
      const mx = Math.max(0, Math.floor(Math.min(a[0], b[0], e[0]))), Mx = Math.min(W - 1, Math.ceil(Math.max(a[0], b[0], e[0])));
      const my = Math.max(0, Math.floor(Math.min(a[1], b[1], e[1]))), My = Math.min(H - 1, Math.ceil(Math.max(a[1], b[1], e[1])));
      for (let y = my; y <= My; y++) for (let x = mx; x <= Mx; x++) {
        const px = x + .5, py = y + .5, l0 = edge(b, e, px, py) / area, l1 = edge(e, a, px, py) / area, l2 = 1 - l0 - l1;
        if (l0 < -1e-9 || l1 < -1e-9 || l2 < -1e-9) continue;
        const z = l0 * a[2] + l1 * b[2] + l2 * e[2], i = y * W + x;
        if (z <= zb[i] + 1e-6) continue;
        zb[i] = z; top[i] = up; col[i * 4] = C[0]; col[i * 4 + 1] = C[1]; col[i * 4 + 2] = C[2]; col[i * 4 + 3] = 255;
      }
    }
  }
  // lit edges: the top silhouette of upward faces one tone brighter, the way pixel artists light a top edge
  if (edges) for (let y = 1; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!top[i] || col[(i - W) * 4 + 3]) continue;
    const t = col.subarray(i * 4, i * 4 + 3); for (let k2 = 0; k2 < 3; k2++) t[k2] = Math.min(255, t[k2] + 34);
  }
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  cv.getContext('2d').putImageData(new ImageData(col, W, H), 0, 0);
  return { cv, ox, oy };
}
const cache = new Map();
function shapeSprite(i, view, facing) {
  const key = i + '|' + view.yawDeg + ':' + view.pitchDeg + ':' + view.scale + ':' + view.zBoost + '|' + facing.toFixed(4) + '|' + S.scale + '|' + S.edges;
  let r = cache.get(key); if (!r) { r = raster(DATA[i], view, facing, S.scale, S.edges); cache.set(key, r); }
  return r;
}

/* ---- a 1-px dark outline around everything drawn in a canvas, the way the renderer outlines actors ---- */
function outline(cv) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height, img = g.getImageData(0, 0, W, H), a = img.data, solid = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) solid[i] = a[i * 4 + 3] > 0 ? 1 : 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (solid[i]) continue;
    if ((x > 0 && solid[i - 1]) || (x < W - 1 && solid[i + 1]) || (y > 0 && solid[i - W]) || (y < H - 1 && solid[i + W])) { a[i * 4] = OUTLINE[0]; a[i * 4 + 1] = OUTLINE[1]; a[i * 4 + 2] = OUTLINE[2]; a[i * 4 + 3] = 255; }
  }
  g.putImageData(img, 0, 0); return cv;
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
