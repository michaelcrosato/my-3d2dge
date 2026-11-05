/* Fork Lab (a Temporary prototype: src/labs.json; docs/HANDOFF-MATRIX.md 7.5). A pseudo-3D road that forks at the end of
 * each stretch: one road splits into two that ease apart, each with its own bends and hills; the side the car is on at the
 * split is the way it goes, and the view turns with the road it took while the other bends away out of sight. Two forks
 * a run (a tree of roads), then the first stretch again. E.Road draws one road and its whole scene (sky, grass, scenery),
 * so a second drawn over it would paint over the first: two runs forked road.js for this. This lab draws its own: each
 * row's grass, then every road's rumble and surface at its own sideways offset, back to front. It asks whether a fork is
 * E.Road's own (road.fork(at, { left, right }): the branches as more segments, drawn together in its one pass), or roads
 * a game draws itself. Arrows or WASD steer, Z or J (or up) the gas, X or K (or down) the brake; ?auto drives itself,
 * taking the left at the first fork and the right at the next. */
const E = My3D2dge, { clamp } = E;
const game = new E.Game({ canvas: 'screen', res: [320, 224], expand: true, input: Object.assign({}, E.Input.DEFAULT, { gas: ['KeyZ', 'KeyJ', 'Pad0', 'Pad7'], brake: ['KeyX', 'KeyK', 'Pad2', 'Pad6'] }) });
const AUTO = new URLSearchParams(location.search).has('auto');
const SEG = 200, W = 1800, DRAW = 160, CAMH = 1000, DEPTH = 1 / Math.tan(50 * Math.PI / 180), SPLIT = 60, APART = 2.5;   // (W: the road's half width; the branches end APART road widths each side, SPLIT segments past the split)

/* a stretch of road: segments of { curve, y } from parts [count, curve, hill] (a hill's height climbed over its count) */
function stretch(parts) {
  const segs = []; let y = 0;
  for (const [n, curve = 0, hill = 0] of parts) for (let i = 0; i < n; i++) { segs.push({ curve: curve * Math.sin(i / n * Math.PI), y }); y += hill * Math.sin((i + .5) / n * Math.PI) * Math.PI / 2 / n; }
  return segs;
}
// the roads: a tree, each node a stretch (its hills come back to the height they start at) and the two it forks into
const node = (parts, kids) => ({ segs: stretch(parts), kids: kids || null });
const tree = node([[40], [60, 3], [30], [45, -4, 600], [45, 0, -600]], [
  node([[50], [30], [60, -5], [40, 0, -400], [50, 2, 400]], [node([[100, 2], [100]]), node([[100, -3, 500], [100, 0, -500]])]),
  node([[50], [30], [50, 4, 800], [50, -3, -800], [50]], [node([[100, -2], [100]]), node([[100, 3, 300], [100, 0, -300]])])
]);
// the car: the node it is on, how far into it, how far across (0 the middle, +-1 the edges); was: the last split (the
// side taken and the road left), the frame the view turns in until the road it took has eased round
let at = tree, z = 0, x = 0, speed = 0, picked = [], was = null, banner = null, t = 0;
const segAt = (chain, n) => { for (const nd of chain) { if (n < nd.segs.length) return nd.segs[n]; n -= nd.segs.length; } return { curve: 0, y: 0 }; };
const ease = u => u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u);
const F = k => APART * W * ease(k / SPLIT), dF = k => k <= 0 || k >= SPLIT ? 0 : APART * W * 6 * (k / SPLIT) * (1 - k / SPLIT) / SPLIT;   // (a branch's way off the line, and its slope, k segments past its split)
const away = k => k > SPLIT ? W * ((k - SPLIT) / 20) ** 2 : 0;   // (the road not taken keeps bending away, out of sight)
function draw(g, Wd, H) {
  const k = z / SEG, base = Math.floor(k), pct = k - base, kc = k - at.segs.length;   // (kc: segments past the coming split, below 0 before it)
  const next = nd => nd.kids ? [nd.kids[0]] : [tree];
  // the roads ahead, each one's sideways place n segments ahead in the frame of the last split, less the view's turn
  const cam = n => was ? was.side * (F(k) + n * dF(k)) : 0, mine = n => was ? was.side * F(n + k) : 0;
  const ways = at.kids ? at.kids.map((kid, i) => ({ chain: [at, kid, ...next(kid)], off: n => mine(n) + (i ? 1 : -1) * F(n + kc) - cam(n) }))
    : [{ chain: [at, ...next(at)], off: n => mine(n) - cam(n) }];
  if (was && k < SPLIT + 50) ways.push({ chain: [was.left, ...next(was.left)], off: n => -was.side * (F(n + k) + away(n + k)) - cam(n) });
  const camY = CAMH + segAt(ways[0].chain, base).y * (1 - pct) + segAt(ways[0].chain, base + 1).y * pct;
  E.px.rect(g, 0, 0, Wd, H, '#6ab0f0'); E.px.rect(g, 0, H * .3, Wd, H * .2, '#9ad0f8');   // the sky
  // each road projected near to far (a row behind a crest is left out); the curves bend it as E.Road's do
  const rows = ways.map(w => { const out = []; let dx = -segAt(w.chain, base).curve * pct, xx = 0, maxy = Infinity;
    for (let n = 0; n < DRAW; n++) {
      const s = segAt(w.chain, base + n), sc = DEPTH / ((n + 1 - pct) * SEG);
      const sx = Wd / 2 + sc * (xx + w.off(n + 1 - pct) - x * W) * Wd / 2, sy = H / 2 - sc * (s.y - camY) * H / 2, sw = sc * W * Wd / 2;
      xx += dx; dx += s.curve * 6;
      if (sy < maxy) { out.push({ sx, sy, sw, fog: n / DRAW }); maxy = sy; } else out.push(null);
    } return out; });
  const clip = (a, b) => { if (a.sy <= H + 2) return a; const u = (H + 2 - b.sy) / (a.sy - b.sy); return { sx: b.sx + (a.sx - b.sx) * u, sw: b.sw + (a.sw - b.sw) * u, sy: H + 2, fog: a.fog }; };   // (a row below the screen, brought up to its foot)
  for (let n = DRAW - 2; n >= 0; n--) {   // far to near: each row's grass, then every road's rumble, surface and line over it
    const odd = Math.floor((base + n) / 3) % 2, f = (c, a) => E.mix(c, '#9ad0f8', a.fog * .8), pair = w => { const b = w[n + 1]; return b && w[n] && b.sy < H + 2 ? [clip(w[n], b), b] : null; };
    for (const w of rows) { const p = pair(w); if (p) E.px.rect(g, 0, Math.ceil(p[1].sy), Wd, Math.ceil(p[0].sy) - Math.ceil(p[1].sy), f(odd ? '#3a9a3a' : '#44a844', p[0])); }   // (the rows px.poly fills: from the first whole row on)
    const on = rows.map(pair).filter(p => p && Math.min(p[0].sx - p[0].sw * 1.2, p[1].sx - p[1].sw * 1.2) < Wd && Math.max(p[0].sx + p[0].sw * 1.2, p[1].sx + p[1].sw * 1.2) > 0);   // (on the screen)
    const q = ([a, b], m, c) => E.px.poly(g, [[a.sx - a.sw * m, a.sy], [a.sx + a.sw * m, a.sy], [b.sx + b.sw * m, b.sy], [b.sx - b.sw * m, b.sy]], f(c, a));
    for (const p of on) q(p, 1.12, odd ? '#e8e8e8' : '#d02828');   // every road's rumble, then every surface, then the lines: where two overlap, one road
    for (const p of on) q(p, 1, odd ? '#6a6a72' : '#646470');
    if (odd) for (const p of on) q(p, .04, '#f0f0f0');
  }
  const cx = Wd / 2, cy = H - 18, lean = AUTO ? 0 : clamp(game.input.move()[0] * 3, -3, 3);   // the car, at the screen's foot
  E.px.rect(g, cx - 18, cy, 36, 10, '#e83020'); E.px.rect(g, cx - 12 + lean, cy - 7, 24, 8, '#c02018'); E.px.rect(g, cx - 9 + lean, cy - 6, 18, 4, '#80c8f0');
  E.px.rect(g, cx - 20, cy + 6, 6, 6, '#181818'); E.px.rect(g, cx + 14, cy + 6, 6, 6, '#181818');
  return { ahead: at.kids ? -kc : Infinity, ways: ways.length };
}
game.start({ scenes: { fork: { pausable: true, view: 'overhead', touch: ['gas', 'brake'],
  enter() { at = tree; z = 0; x = 0; speed = 0; picked = []; was = null; },
  update(dt) {
    t += dt; const I = game.input, k = z / SEG, near = at.kids && k + 30 >= at.segs.length;
    const want = near ? (picked.length % 2 ? .55 : -.55) : 0;   // (?auto: the left at the first fork, the right at the next)
    const steer = AUTO ? clamp((want - x) * 3, -1, 1) : I.move()[0], gas = AUTO || I.down('gas') || I.down('up'), brake = !AUTO && (I.down('brake') || I.down('down'));
    speed = clamp(speed + ((gas ? 9000 : 0) - (brake ? 14000 : 0) - speed * (Math.abs(x) > 1.15 ? 3 : 1.2)) * dt, 0, 7000);   // (slower on the grass)
    const s = at.segs[Math.min(at.segs.length - 1, Math.floor(k))];
    x = clamp(x + steer * dt * 2.2 * Math.min(1, speed / 2000) - s.curve * speed / 7000 * dt * .3, -2.4, 2.4);
    z += speed * dt;
    if (z >= at.segs.length * SEG) {
      z -= at.segs.length * SEG;
      if (at.kids) {   // the split: the side the car is on is the way it goes, the other is left behind
        const i = x < 0 ? 0 : 1; was = { side: i ? 1 : -1, left: at.kids[1 - i] }; at = at.kids[i]; picked.push(i ? 'RIGHT' : 'LEFT');
        banner = { text: picked[picked.length - 1] + ' AT FORK ' + picked.length, t: 2 };
      } else { at = tree; was = null; picked = []; }   // (the last stretch ran into the first: the run again)
    }
    if (banner && (banner.t -= dt) <= 0) banner = null;
  },
  draw(r) {
    r.overlay(g => {
      const info = draw(g, r.W, r.H);
      E.font.text(g, 'FORK LAB: a road that splits', r.W / 2, 4, '#ffffff', { align: 'center', outline: '#000', font: 'tiny' });
      E.font.text(g, Math.round(speed / 25) + ' KM/H', 6, r.H - 12, '#ffffff', { outline: '#000' });
      if (info.ahead < 60) E.font.text(g, 'FORK AHEAD: KEEP LEFT OR RIGHT', r.W / 2, 22, Math.floor(t * 4) % 2 ? '#ffe040' : '#ffffff', { align: 'center', outline: '#000' });
      if (banner) E.font.text(g, banner.text, r.W / 2, 40, '#ffe040', { align: 'center', outline: '#000', scale: 2 });
      E.font.text(g, 'WAY: ' + (picked.join(' > ') || 'START'), r.W - 6, r.H - 12, '#c8e0ff', { align: 'right', outline: '#000', font: 'tiny' });
    });
  } } }, scene: 'fork' });
window.__lab = { game, tree, get at() { return at; }, get z() { return z; }, get x() { return x; }, get picked() { return picked; }, jump(k, side) {   // (for a check: k segments into the run, on the left or right road past the first split)
  at = tree; was = null; picked = []; x = side * .5; z = k * SEG; speed = 0;
  if (k >= tree.segs.length) { const i = side < 0 ? 0 : 1; was = { side, left: tree.kids[1 - i] }; at = tree.kids[i]; picked = [i ? 'RIGHT' : 'LEFT']; z = (k - tree.segs.length) * SEG; }
} };
