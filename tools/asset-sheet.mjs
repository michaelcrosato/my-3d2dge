// Asset sheet: draws a shape the way a game will (the full engine, headless) and says what reads badly, so a model that
// wrote an object can look at it before using it (docs/ASSETS.md, "Make one").
//   node tools/asset-sheet.mjs barrel                     a core shape
//   node tools/asset-sheet.mjs mine.js#stool              a file that sets E.SHAPES.stool, or a store set
//                                                         ((window.ASSETS = window.ASSETS || {}).MINE = {...}, then 'stool'
//                                                         finds MINE:stool)
//   node tools/asset-sheet.mjs mine.js                    every shape the file adds
//   [--out check-output/asset-sheet] [--zoom 3] [--json]  (--json prints the numbers and lints as JSON)
// Each sheet (a PNG per shape): every view (isometric, three-quarter, top-down as games draw it, brawler, side) and three
// more facings, beside the hero, on a light and a dark floor, the contact shadow under it. The lints:
//   small from above   under 30 pixels seen from the top-down view
//   a part not seen    a part with no pixel in the isometric or the three-quarter view (under a pixel, or hidden)
//   few tones          fewer than 4 colors in the isometric view (a flat-looking object)
//   low contrast       its mean lightness within 12% of a floor's
//   tokens             the entry as written, in cl100k tokens (exact)
// Exit code 1 on an engine warning or a page error (an unknown material, a broken part).
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..'), args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const target = args.find((a, i) => !a.startsWith('--') && !(i && args[i - 1].startsWith('--') && !['--json'].includes(args[i - 1])));
if (!target) { console.error('Usage: node tools/asset-sheet.mjs <id | file.js[#id]> [--out dir] [--zoom 3] [--json]'); process.exit(2); }
const out = resolve(opt('out', join(root, 'check-output/asset-sheet'))), zoom = +opt('zoom', 3), json = args.includes('--json');
const [file, want] = target.includes('.js') ? target.split('#') : [null, target];
if (file && !existsSync(file)) { console.error('no such file: ' + file); process.exit(2); }
const src = file ? readFileSync(file, 'utf8') : null;
let tok = s => Math.ceil(s.length / 3.2); try { const { encode } = await import('gpt-tokenizer/encoding/cl100k_base'); tok = s => encode(s).length; } catch (e) { /* estimated */ }

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage(), problems = [];
page.on('pageerror', e => problems.push(String(e))); page.on('console', m => { if ((m.type() === 'warning' || m.type() === 'error') && !/willReadFrequently/.test(m.text())) problems.push(m.text()); });   // (not Chromium's readback hint)
await page.setContent('<!doctype html><html><body></body></html>');
await page.addScriptTag({ content: readFileSync(join(root, 'engine/my-3d2dge.js'), 'utf8') });
const before = await page.evaluate(() => Object.keys(My3D2dge.SHAPES));
if (src) await page.addScriptTag({ content: src });
// the shapes to draw: the file's sets (registered), the shapes it added to E.SHAPES, or the core id asked for
const ids = await page.evaluate(([before, want]) => {
  const E = My3D2dge, added = [];
  for (const set of Object.values(window.ASSETS || {})) added.push(...E.addAssets(set).shapes);
  for (const k of Object.keys(E.SHAPES)) if (!before.includes(k) && !added.includes(k)) added.push(k);
  if (!want) return added;
  const hit = [want, ...added.filter(k => k.endsWith(':' + want))].find(k => E.SHAPES[k]);
  return hit ? [hit] : [];
}, [before, want]);
if (!ids.length) { console.error((want ? 'no shape "' + want + '"' : 'no shapes') + (file ? ' in ' + file : ' in the core library')); await browser.close(); process.exit(1); }

mkdirSync(out, { recursive: true });
const report = [];
for (const id of ids) {
  const res = await page.evaluate(([id, zoom]) => {
    const E = My3D2dge, S = E.SHAPES[id], FACE = Math.PI / 2 + .45;
    const VIEWS = [['Isometric', E.VIEWS.iso, FACE], ['3/4 view', E.VIEWS.threequarter, FACE], ['Top-down', E.charView(E.VIEWS.topdown), FACE], ['Brawler', E.VIEWS.brawler, FACE], ['Side', E.VIEWS.side, FACE],
      ['Iso +90', E.VIEWS.iso, FACE + Math.PI / 2], ['Iso +180', E.VIEWS.iso, FACE + Math.PI], ['Iso +270', E.VIEWS.iso, FACE + Math.PI * 1.5]];
    const info = VIEWS.map(([, v, f]) => E.shapeInfo(id, { view: v, facing: f }));
    const FLOORS = { light: ['#8c8472', '#958b76', '#3e3a32'], dark: ['#3a3234', '#433a3b', '#1a1416'] };
    const hero = new E.Humanoid({ cape: { len: 6, width: 5, seg: 2.5 }, colors: { cloth: '#2f8f86', cape: '#c8452f' } }); for (let i = 0; i < 30; i++) hero.update(1 / 60, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: .6 });
    // one cell size for the whole sheet: everything drawn must fit
    let up = 44, down = 8, half = 16; for (const r of info) { up = Math.max(up, r.oy + 4); down = Math.max(down, r.h - r.oy + 4); half = Math.max(half, r.ox + 4, r.w - r.ox + 4); }
    const CW = Math.ceil(half * 2), CH = up + down, cols = VIEWS.length + 1, head = 18, W = cols * (CW + 4) + 4, H = head + 2 * (CH + 14) + 4;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    g.fillStyle = '#1c1826'; g.fillRect(0, 0, W, H);
    E.font.text(g, id + (S.about ? ': ' + S.about : ''), 4, 4, '#f1e4c8', { outline: false });
    const lum = c => .2126 * c[0] + .7152 * c[1] + .0722 * c[2], floorLum = {};
    ['light', 'dark'].forEach((fl, row) => {
      const P = FLOORS[fl], y0 = head + row * (CH + 14);
      floorLum[fl] = lum(E.hex(P[0]));
      for (let c = 0; c < cols; c++) {
        const x0 = 4 + c * (CW + 4), cell = document.createElement('canvas'); cell.width = CW; cell.height = CH; const cg = cell.getContext('2d');
        const img = cg.createImageData(CW, CH);
        for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { const k = (y * CW + x) * 4, sx = x, sy = y * 1.25, stone = (Math.floor(sy / 16) & 1 ? 8 : 0), edge = (sx + stone) % 16 < 1 || sy % 16 < 1; const col = E.hex(edge ? P[2] : E.hash2(Math.floor((sx + stone) / 16), Math.floor(sy / 16)) > .5 ? P[0] : P[1]); img.data[k] = col[0]; img.data[k + 1] = col[1]; img.data[k + 2] = col[2]; img.data[k + 3] = 255; }
        cg.putImageData(img, 0, 0);
        const fx = Math.round(CW / 2), fy = up, layer = document.createElement('canvas'); layer.width = CW; layer.height = CH; const lg = layer.getContext('2d');
        if (!c) hero.draw(lg, fx, fy, E.charView(E.VIEWS.iso));
        else { const [, v, f] = VIEWS[c - 1], spr = E.shapeSprite(id, { view: v, facing: f, outline: false }); if (spr) lg.drawImage(spr.cv, fx - spr.ox, fy - spr.oy); }
        // the actors' outline round the layer, then the layer over the floor
        const d = lg.getImageData(0, 0, CW, CH), a = d.data, sol = a.map((v, i) => i % 4 === 3 && v ? 1 : 0);
        for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { const i = y * CW + x; if (sol[i * 4 + 3]) continue; if ((x && sol[(i - 1) * 4 + 3]) || (x < CW - 1 && sol[(i + 1) * 4 + 3]) || (y && sol[(i - CW) * 4 + 3]) || (y < CH - 1 && sol[(i + CW) * 4 + 3])) { a[i * 4] = 20; a[i * 4 + 1] = 12; a[i * 4 + 2] = 28; a[i * 4 + 3] = 255; } }
        lg.putImageData(d, 0, 0); cg.drawImage(layer, 0, 0);
        g.drawImage(cell, x0, y0);
        E.font.text(g, c ? VIEWS[c - 1][0] : 'Hero', x0, y0 + CH + 3, '#ab9dc0', { outline: false });
      }
    });
    // the lints
    const lints = [], iso = info[0], q3 = info[1], top = info[2];
    if (top.pixels < 30) lints.push('small from above: ' + top.pixels + ' pixels in the top-down view');
    const unseen = iso.parts.map((n, i) => n || q3.parts[i] ? -1 : i).filter(i => i >= 0);
    if (unseen.length) lints.push('a part not seen in the isometric or three-quarter view (under a pixel, or hidden): primitive ' + unseen.join(', '));
    if (iso.colors < 4) lints.push('few tones: ' + iso.colors + ' colors in the isometric view');
    let L = 0, n = 0; for (let j = 0; j < iso.rgba.length; j += 4) if (iso.rgba[j + 3]) { L += lum([iso.rgba[j], iso.rgba[j + 1], iso.rgba[j + 2]]); n++; } L /= n || 1;
    for (const [fl, fL] of Object.entries(floorLum)) if (Math.abs(L - fL) < 255 * .12) lints.push('low contrast with the ' + fl + ' floor: its mean lightness ' + Math.round(L) + ', the floor\'s ' + Math.round(fL));
    // the big picture, whole pixels
    const big = document.createElement('canvas'); big.width = W * zoom; big.height = H * zoom; const bg = big.getContext('2d'); bg.imageSmoothingEnabled = false; bg.drawImage(cv, 0, 0, W * zoom, H * zoom);
    const entry = JSON.stringify(Object.fromEntries(Object.entries(S).filter(([k]) => !k.startsWith('_'))), (k, v) => typeof v === 'function' ? v.toString() : v);
    return { url: big.toDataURL(), lints, entry, numbers: { prims: iso.prims, tris: iso.tris, isoPixels: iso.pixels, topPixels: top.pixels, colors: iso.colors, bounds: iso.bounds.map(v => Math.round(v * 10) / 10) } };
  }, [id, zoom]);
  // tokens: the entry as the file writes it (its own text, from `id: {` to the next entry), else as data
  const local = id.includes(':') ? id.split(':').pop() : id, m = src && new RegExp('(?:^|[\\s{,])[\'"]?' + local.replace(/[-]/g, '\\-') + '[\'"]?\\s*:\\s*\\{').exec(src);
  let text = res.entry;
  if (m) { let depth = 0, k = src.indexOf('{', m.index); const s0 = m.index; for (; k < src.length; k++) { if (src[k] === '{') depth++; else if (src[k] === '}' && --depth === 0) break; } text = src.slice(s0, k + 1).trim(); }
  res.numbers.tokens = tok(text);
  const png = join(out, local.replace(/[^\w-]/g, '_') + '.png');
  writeFileSync(png, Buffer.from(res.url.split(',')[1], 'base64'));
  report.push({ id, png, lints: res.lints, numbers: res.numbers });
}
await browser.close();
if (json) console.log(JSON.stringify({ shapes: report, problems }, null, 1));
else for (const r of report) {
  console.log(`${r.id}: ${r.numbers.tokens} tokens, ${r.numbers.prims} primitives, ${r.numbers.tris} triangles; ${r.numbers.isoPixels} pixels in iso, ${r.numbers.topPixels} from above, ${r.numbers.colors} colors -> ${r.png}`);
  for (const l of r.lints) console.log('  lint: ' + l);
}
if (problems.length) { console.log('engine warnings and page errors:\n  ' + [...new Set(problems)].join('\n  ')); process.exitCode = 1; }
