// SPIKE (throwaway; see HANDOFF.md). Draw a box shapes file (from boxes.mjs) with the engine's own primitives (px.poly,
// E.tones) in four views, beside the hero and three of our billboard props, at game scale. Faces are painter-sorted
// (no depth buffer yet: Phase 0 should replace this with a small depth-correct rasterizer into a cached sprite).
// Usage: node handoff/shapes-spike/render.mjs <shapes.js> <out.png>
import { chromium } from '/home/user/my-3d2dge/node_modules/playwright/index.mjs';
const shapesFile = process.argv[2], out = process.argv[3];
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH }), p = await b.newPage(), errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.setContent('<canvas id="screen"></canvas>');
await p.addScriptTag({ path: '/home/user/my-3d2dge/engine/my-3d2dge.js' });
await p.addScriptTag({ path: shapesFile });
const png = await p.evaluate(() => {
  const E = My3D2dge, px = E.px, SH = window.SHAPES.FURNITURE;
  const L = (v => { const l = Math.hypot(...v); return v.map(x => x / l); })([-0.55, -0.35, 0.76]);
  // a shape's boxes, centred on its footprint, drawn with each visible face shaded by how it faces the light
  function drawShape(g, ox, oy, view, sh, facing = 0.6, k = 1) {
    let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; for (const bx of sh.boxes) for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], bx[1 + i]); hi[i] = Math.max(hi[i], bx[4 + i]); }
    const cx = (lo[0] + hi[0]) / 2, cy = (lo[1] + hi[1]) / 2, c = Math.cos(facing), s = Math.sin(facing);
    const W = p => { const x = (p[0] - cx) * k, y = (p[1] - cy) * k; return [x * c - y * s, x * s + y * c, (p[2] - lo[2]) * k]; };
    const T = sh.mats.map(m => E.tones(m)), faces = [];
    const D = [view.dx, view.dy, view.dz];
    for (const bx of sh.boxes) {
      const [m, x0, y0, z0, x1, y1, z1] = bx, P = (x, y, z) => W([x, y, z]);
      const F = [[[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1]], [[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0], [0, 0, -1]],
        [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], [1, 0, 0]], [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0]],
        [[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [0, 1, 0]], [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0]]];
      for (const f of F) {
        const n0 = f[4], n = [n0[0] * c - n0[1] * s, n0[0] * s + n0[1] * c, n0[2]];
        if (n[0] * D[0] + n[1] * D[1] + n[2] * D[2] <= 1e-6) continue;   // facing away from the camera
        const pts = f.slice(0, 4).map(q => P(...q)), ctr = pts.reduce((a, q) => a.map((v, i) => v + q[i] / 4), [0, 0, 0]);
        const lit = n[0] * L[0] + n[1] * L[1] + n[2] * L[2], t = T[m], col = lit > .6 ? t.lt : lit > .15 ? t.base : lit > -.35 ? t.sh : t.deep;
        faces.push({ d: view.depth(...ctr), scr: pts.map(q => { const v = view.p(...q); return [ox + v[0], oy + v[1]]; }), col });
      }
    }
    faces.sort((a, b) => a.d - b.d);
    for (const f of faces) px.poly(g, f.scr, f.col);
  }
  // outline like the renderer's actors: the silhouette in the dark outline color, one pixel out on four sides
  const outlined = (w, h, draw) => { const a = E.mkCanvas(w, h), ag = a.getContext('2d'); ag.imageSmoothingEnabled = false; draw(ag);
    const o = E.mkCanvas(w, h), og = o.getContext('2d'); og.drawImage(a, 0, 0); og.globalCompositeOperation = 'source-in'; og.fillStyle = '#140c1c'; og.fillRect(0, 0, w, h);
    const r = E.mkCanvas(w, h), rg = r.getContext('2d'); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) rg.drawImage(o, dx, dy); rg.drawImage(a, 0, 0); return r; };
  const views = ['iso', 'threequarter', 'topdown', 'brawler'], CW = 46, CH = 52, LW = 64;
  const cols = [['hero', null], ['our crate', 'crate'], ['our barrel', 'barrel'], ['our chest', 'chest'], ['chair', 'chair'], ['table', 'table'], ['bookcase', 'bookcaseOpen'], ['floor lamp', 'lampRoundFloor'], ['plant', 'pottedPlant'], ['fridge', 'kitchenFridge'], ['sofa', 'loungeSofa'], ['bed', 'bedSingle'], ['stove', 'kitchenStove'], ['coat rack', 'coatRackStanding']];
  const S = E.mkCanvas(LW + cols.length * CW, 14 + views.length * CH), g = S.getContext('2d'); g.imageSmoothingEnabled = false;
  g.fillStyle = '#0d0b14'; g.fillRect(0, 0, S.width, S.height);
  g.font = '7px sans-serif'; g.fillStyle = '#cfc6e0'; cols.forEach(([l], i) => g.fillText(l, LW + i * CW + 2, 9));
  const hero = new E.Humanoid({ size: 1 }); for (let i = 0; i < 30; i++) hero.update(1 / 60, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: .6 });
  views.forEach((vid, r) => {
    const view = E.VIEWS[vid], y0 = 14 + r * CH; g.fillStyle = '#cfc6e0'; g.fillText(vid, 2, y0 + 26);
    cols.forEach(([, id], i) => {
      const x0 = LW + i * CW; g.fillStyle = '#3e3850'; g.fillRect(x0 + 1, y0 + 1, CW - 2, CH - 2);
      const cell = outlined(CW, CH, cg => {
        if (i === 0) hero.draw(cg, CW / 2, CH - 8, E.charView ? E.charView(view) : view);
        else if (SH[id]) drawShape(cg, CW / 2, CH - 8, view, SH[id], .6, 1);
        else { const pr = E.prop(id); const s = pr.frames[0]; cg.drawImage(s.cv, Math.round(CW / 2 - s.w / 2), Math.round(CH - 8 - s.h)); }
      });
      g.drawImage(cell, x0, y0);
    });
  });
  return S.toDataURL('image/png');
});
const fs = await import('node:fs'); fs.writeFileSync(out, Buffer.from(png.split(',')[1], 'base64'));
console.log(errs.length ? 'ERR ' + errs.join(' | ') : 'ok', out);
await b.close();
