/* =====================================================================================
 * SLICE 3  SHOOTER  (Apex Legends' movement and gunplay, without the multiplayer; first or third person). A badlands
 * two kilometres across, streamed as you go: golden grass that sways, red rock mesas in strata, dry riverbeds,
 * junipers and pines; six outposts joined by dirt roads, each with buildings to breach, containers, a watch tower with
 * a zipline and supply bins. MOVE: sprint, crouch, slide (downhill it speeds up), jump, vault low cover, mantle onto
 * ledges, climb walls, ladders, ziplines, kick doors in. FIGHT: a rifle and a shotgun (from the hip or down the
 * sights: recoil, spread, reloads), a punch with a lunge, frag grenades; raiders with shields hold five outposts, and
 * the drop point has a firing range. T switches first and third person.
 * THE 3D: the ground is a terrain (world terrain: a height and a color function, streamed in chunks for the physics
 * and the picture); the structures are one merged mesh over fixed blocks; grass is merged tufts that sway (TSL); trees
 * and rocks are shapes streamed by chunk. Every soldier is drawn by code with the pen on a procedural skeleton (feet
 * planted by IK on the ground under them, stepping round as it turns on the spot, a spine that leans and twists, hands
 * on the gun); first person draws its arms and guns with the overlay's pen, which never sinks into a wall. Muzzle
 * flashes and hits are stars of additive streaks facing the eye. A frame draws the moving things part way between the
 * last two steps (game.alpha) and turns the view by the newest mouse moves, so the motion is even at 60, 90, 144 or
 * 240 Hz; feet and hands blend into a new job instead of jumping. SHOOT.run(n): the proof's hash
 * ===================================================================================== */
const SHOOT = (() => {
  const M = 16;   // engine units a metre
  /* ---- TUNING: engine units (16 a metre) and seconds ---- */
  const GRAV = 314, JUMP = 106, WALK = 68, RUN = 118, CROUCH = 40, ADS_WALK = 46, SLIDE_BOOST = 34, SLIDE_MAX = 182, SLIDE_DRAG = 62;
  const RADIUS = 5, HALF = 9, HALF_CROUCH = 4, HALF_SLIDE = 1.5, EYE = 26, EYE_CROUCH = 17, EYE_SLIDE = 11;
  const MANTLE_MAX = 40, VAULT_MAX = 19, CLIMB_SPEED = 96, CLIMB_TIME = .5, LADDER_SPEED = 76, ZIP_SPEED = 200;
  const HP = 100, SHIELD = 100, FOV = 70;
  const N2 = E.noise2, sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const fbm = (x, y, o) => { let v = 0, a = 1, t = 0; for (let k = 0; k < o; k++) { v += a * N2(x, y); t += a; a *= .5; x = x * 2.03 + 17.1; y = y * 2.03 + 3.7; } return v / t; };

  /* =====================================================================
   * THE BADLANDS: the ground's height and color (metres inside, engine units out), the outposts and the roads
   * ===================================================================== */
  const HM = 2048, SIZE = HM * M;   // the map: 2,048 metres (32,768 units) square
  // rasters every 4 m, made once at boot: the riverbeds, the roads (how much each flattens the ground, to what height,
  // its dirt) and the outposts' pads
  const RS = 4, RN = HM / RS + 1, RIVER = new Float32Array(RN * RN), ROADW = new Float32Array(RN * RN), ROADH = new Float32Array(RN * RN), ROADC = new Float32Array(RN * RN), PADW = new Float32Array(RN * RN), PADH = new Float32Array(RN * RN);
  const rs = (A, m, n) => {   // a raster at (m, n) metres, bilinear
    const gx = clamp(m / RS, 0, RN - 1.001), gy = clamp(n / RS, 0, RN - 1.001), i = gx | 0, j = gy | 0, u = gx - i, v = gy - j, k = j * RN + i;
    return (A[k] * (1 - u) + A[k + 1] * u) * (1 - v) + (A[k + RN] * (1 - u) + A[k + RN + 1] * u) * v;
  };
  const riverAt = (m, n) => 1 - sstep(.014, .05, Math.abs(fbm(m / 610 + 5.1, n / 610 + 9.7, 3) - .5));
  /** the land before roads and pads: broad hills, mesas in two tiers with ragged cliffs, riverbeds carved flat, small
   *  swells, and a wall of cliffs round the map's edge */
  function baseH(m, n) {
    let h = (fbm(m / 420, n / 420, 4) - .5) * 70;
    const f = fbm(m / 290 + 31.7, n / 290 + 11.3, 3) + (N2(m / 21, n / 21) - .5) * .045;
    h += sstep(.575, .6, f) * 32 + sstep(.67, .69, f) * 18;
    h -= rs(RIVER, m, n) * 7;
    h += (N2(m / 33, n / 33) - .5) * 3.2 + (N2(m / 9.5, n / 9.5) - .5) * .7;
    const e = Math.min(m, n, HM - m, HM - n); h += sstep(190, 30, e) * 140 + sstep(60, 0, e) * 60;
    return h;
  }
  /** the terrain's height function (engine units): the land, flattened under the roads and the outposts */
  function height(x, y) {
    const m = x / M, n = y / M; let h = baseH(m, n);
    const rw = rs(ROADW, m, n); if (rw > 0) h += (rs(ROADH, m, n) - h) * rw;
    const pw = rs(PADW, m, n); if (pw > 0) h += (rs(PADH, m, n) - h) * pw;
    return h * M;
  }
  /** the terrain's color function: golden grass patched olive and dry brown, pale sand in the riverbeds, dirt roads,
   *  gravel pads, bare earth where it steepens (the rock in strata is the terrain's own, steeper still) */
  function color(x, y, z, nz, out) {
    const m = x / M, n = y / M, p = N2(m / 23, n / 23), q = N2(m / 71 + 9, n / 71 + 4), f = N2(m / 4.3, n / 4.3);
    let r = 198, g = 170, b = 100;
    if (q < .46) { const k = (.46 - q) / .46; r -= 46 * k; g -= 16 * k; b -= 12 * k; }
    if (p > .6) { const k = (p - .6) / .4; r -= 20 * k; g -= 40 * k; b -= 18 * k; }
    if (z > 30 * M) { const k = sstep(30 * M, 60 * M, z) * .5; r += 8 * k; g -= 14 * k; b -= 12 * k; }   // (the mesas' tops: redder, drier)
    const mixTo = (k, R, G, B) => { r += (R - r) * k; g += (G - g) * k; b += (B - b) * k; };
    mixTo(sstep(.9, .62, nz) * .8, 150, 112, 80);
    mixTo(rs(RIVER, m, n) * .9, 214 + f * 20, 196 + f * 18, 158 + f * 14);
    mixTo(sstep(.35, 1, rs(PADW, m, n)) * .8, 172 + f * 30 + p * 14, 150 + f * 24 + p * 8, 116 + f * 18);
    mixTo(rs(ROADC, m, n) * .9, 160 + f * 18, 126 + f * 12, 92 + f * 10);
    const k = .9 + f * .2; out[0] = r * k; out[1] = g * k; out[2] = b * k; return out;
  }
  /* the outposts: where each is meant to be, moved at boot to the flattest ground near there; DROP POINT (the start)
     is the firing range. r: the pad's radius (metres) */
  const OUTPOSTS = [
    { id: 'drop', name: 'DROP POINT', at: [1030, 1560], r: 44 },
    { id: 'relay', name: 'RELAY STATION', at: [610, 1010], r: 44 },
    { id: 'salvage', name: 'SALVAGE YARD', at: [1480, 1230], r: 50 },
    { id: 'pump', name: 'PUMP HOUSE', at: [1010, 600], r: 44 },
    { id: 'ridge', name: 'RIDGE CAMP', at: [430, 1520], r: 40 },
    { id: 'depot', name: 'THE DEPOT', at: [1580, 620], r: 50 }
  ];
  const OP = Object.fromEntries(OUTPOSTS.map(o => [o.id, o]));
  const ROADS = [['drop', 'relay'], ['drop', 'salvage'], ['relay', 'pump'], ['pump', 'depot'], ['salvage', 'depot'], ['relay', 'ridge'], ['ridge', 'drop']];
  const roads = [];   // each a list of [m, n, h] every 6 m
  /** the cheapest way between two points over a 16 m grid (A*: distance, and much more for steep ground) */
  function route(a, b, NH) {
    const G = 128, S = HM / G, at = p => [clamp(Math.round(p[0] / S), 2, G - 3), clamp(Math.round(p[1] / S), 2, G - 3)];
    const [ai, aj] = at(a), [bi, bj] = at(b), goal = bj * G + bi, cost = new Float32Array(G * G).fill(Infinity), from = new Int32Array(G * G).fill(-1), shut = new Uint8Array(G * G);
    const hf = [], hk = [];   // a binary heap of (f, node)
    const push = (f, k) => { let i = hf.length; hf.push(f); hk.push(k); while (i > 0) { const p = (i - 1) >> 1; if (hf[p] <= f) break; hf[i] = hf[p]; hk[i] = hk[p]; i = p; } hf[i] = f; hk[i] = k; };
    const pop = () => { const top = hk[0], f = hf.pop(), k = hk.pop(); if (hf.length) { let i = 0; for (;;) { let c = 2 * i + 1; if (c >= hf.length) break; if (c + 1 < hf.length && hf[c + 1] < hf[c]) c++; if (hf[c] >= f) break; hf[i] = hf[c]; hk[i] = hk[c]; i = c; } hf[i] = f; hk[i] = k; } return top; };
    cost[aj * G + ai] = 0; push(0, aj * G + ai);
    while (hf.length) {
      const k = pop(); if (shut[k]) continue; shut[k] = 1; if (k === goal) break;
      const i = k % G, j = (k / G) | 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const i2 = i + di, j2 = j + dj, k2 = j2 * G + i2; if ((!di && !dj) || i2 < 2 || j2 < 2 || i2 > G - 3 || j2 > G - 3 || shut[k2]) continue;
        const d = Math.hypot(di, dj) * S, sl = Math.abs(NH[k2] - NH[k]) / d, c = cost[k] + d * (1 + 45 * sl * sl + (sl > .28 ? 80 : 0));
        if (c < cost[k2]) { cost[k2] = c; from[k2] = k; push(c + Math.hypot(i2 - bi, j2 - bj) * S, k2); }
      }
    }
    const path = []; for (let k = goal; k >= 0; k = from[k]) path.push([(k % G) * S, ((k / G) | 0) * S]);
    path.reverse(); path[0] = [a[0], a[1]]; path[path.length - 1] = [b[0], b[1]]; return path;
  }
  /** the boot's planning: the riverbeds, the outposts on flat ground, their pads, the roads routed, smoothed and laid */
  function planLand() {
    for (let j = 0; j < RN; j++) for (let i = 0; i < RN; i++) RIVER[j * RN + i] = riverAt(i * RS, j * RS);
    for (const o of OUTPOSTS) {
      let best = null;
      for (let k = 0; k < 110; k++) {
        const a = k * 2.399, rr = Math.sqrt(k) * 14, m = o.at[0] + Math.cos(a) * rr, n = o.at[1] + Math.sin(a) * rr, h0 = baseH(m, n);
        let dev = 0; for (let q = 0; q < 8; q++) { const b = q * TAU / 8, c = Math.cos(b), s = Math.sin(b); dev += Math.abs(baseH(m + c * o.r, n + s * o.r) - h0) + Math.abs(baseH(m + c * o.r * .55, n + s * o.r * .55) - h0); }
        const score = dev + rr * .03 + rs(RIVER, m, n) * 60; if (!best || score < best[0]) best = [score, m, n, h0];
      }
      [, o.m, o.n, o.h] = best; o.x = o.m * M; o.y = o.n * M; o.z = o.h * M;
    }
    const G = 128, S = HM / G, NH = new Float32Array(G * G);
    for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) NH[j * G + i] = baseH(i * S, j * S);
    const best = new Float32Array(RN * RN).fill(1e9);
    for (const [a, b] of ROADS) {
      let p = route([OP[a].m, OP[a].n], [OP[b].m, OP[b].n], NH);
      for (let it = 0; it < 3; it++) { const q = [p[0]]; for (let i = 0; i < p.length - 1; i++) { const u = p[i], v = p[i + 1]; q.push([u[0] * .75 + v[0] * .25, u[1] * .75 + v[1] * .25], [u[0] * .25 + v[0] * .75, u[1] * .25 + v[1] * .75]); } q.push(p[p.length - 1]); p = q; }   // (Chaikin's corners cut)
      const pts = [p[0]]; let acc = 0;
      for (let i = 1; i < p.length; i++) { const d = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); acc += d; if (acc >= 6 || i === p.length - 1) { pts.push(p[i]); acc = 0; } }
      const raw = pts.map(q => baseH(q[0], q[1])), road = pts.map((q, i) => { let s = 0, w = 0; for (let k = -5; k <= 5; k++) { const v = raw[clamp(i + k, 0, raw.length - 1)]; s += v; w++; } return [q[0], q[1], s / w]; });
      roads.push(road);
      for (let i = 0; i < road.length - 1; i++) {   // laid into the rasters: the flattening within 10 m, the dirt within 5.5 m
        const [x0, y0, h0] = road[i], [x1, y1, h1] = road[i + 1], dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1;
        for (let cj = Math.max(0, Math.floor((Math.min(y0, y1) - 14) / RS)); cj <= Math.min(RN - 1, Math.ceil((Math.max(y0, y1) + 14) / RS)); cj++)
          for (let ci = Math.max(0, Math.floor((Math.min(x0, x1) - 14) / RS)); ci <= Math.min(RN - 1, Math.ceil((Math.max(x0, x1) + 14) / RS)); ci++) {
            const px = ci * RS, py = cj * RS, t = clamp(((px - x0) * dx + (py - y0) * dy) / L2, 0, 1), d = Math.hypot(px - x0 - dx * t, py - y0 - dy * t), k = cj * RN + ci;
            if (d < 14 && d < best[k]) { best[k] = d; ROADH[k] = h0 + (h1 - h0) * t; ROADW[k] = sstep(10, 4.5, d); }
            ROADC[k] = Math.max(ROADC[k], sstep(5.5, 2.5, d));
          }
      }
    }
    for (const o of OUTPOSTS) {   // the pads: flat at the outpost's height within r, easing out over 30 m
      for (let cj = Math.max(0, Math.floor((o.n - o.r - 36) / RS)); cj <= Math.min(RN - 1, Math.ceil((o.n + o.r + 36) / RS)); cj++)
        for (let ci = Math.max(0, Math.floor((o.m - o.r - 36) / RS)); ci <= Math.min(RN - 1, Math.ceil((o.m + o.r + 36) / RS)); ci++) {
          const d = Math.hypot(ci * RS - o.m, cj * RS - o.n), k = cj * RN + ci, w = sstep(o.r + 30, o.r, d);
          if (d < o.r + 36 && (w > PADW[k] || (!PADW[k] && !PADH[k]))) { PADW[k] = w; PADH[k] = o.h; }
        }
    }
  }

  /* =====================================================================
   * STRUCTURES: one merged mesh for every outpost (buildings, containers, towers, barriers, ladders, cables), each
   * piece a box (or a cylinder) with a kind for its pattern; the fixed blocks under them; and the working parts drawn
   * every frame (doors, supply bins), ladders and ziplines to ride. Laid out in metres round each outpost's centre
   * ===================================================================== */
  const GEO = { P: [], N: [], C: [], K: [], I: [] }, solids = [], doors = [], bins = [], ladders = [], zips = [], spawns = [], dummies = [];
  const K_CONCRETE = 0, K_METAL = 1, K_RIBS = 2, K_PLANKS = 3, K_BAGS = 4, K_PLAIN = 5;
  const linC = new Map(), srgb = c => c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4);
  const linOf = h => { let v = linC.get(h); if (!v) { v = E.hex(h).map(c => srgb(c / 255)); linC.set(h, v); } return v; };
  let zLo = 0, zHi = 1;   // the box being built (its corners shade darker toward its foot)
  /** a quad: centre c, half-sides u and v, outward normal n (engine units), into the merged mesh (three's metres) */
  function quad(c, u, v, n, color, kind) {
    const base = GEO.P.length / 3, col = linOf(color), top = n[2] > .5, bot = n[2] < -.5;
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const x = c[0] + u[0] * a + v[0] * b, y = c[1] + u[1] * a + v[1] * b, z = c[2] + u[2] * a + v[2] * b, k = top ? 1.06 : bot ? .7 : lerp(.72, 1, clamp((z - zLo) / Math.max(1, Math.min(48, zHi - zLo)), 0, 1));
      GEO.P.push(x / M, z / M, y / M); GEO.N.push(n[0], n[2], n[1]); GEO.C.push(col[0] * k, col[1] * k, col[2] * k); GEO.K.push(kind);
    }
    const p = GEO.P, i = base * 3, e1 = [p[i + 3] - p[i], p[i + 4] - p[i + 1], p[i + 5] - p[i + 2]], e2 = [p[i + 6] - p[i], p[i + 7] - p[i + 1], p[i + 8] - p[i + 2]];
    const dn = (e1[1] * e2[2] - e1[2] * e2[1]) * n[0] + (e1[2] * e2[0] - e1[0] * e2[2]) * n[2] + (e1[0] * e2[1] - e1[1] * e2[0]) * n[1];
    if (dn > 0) GEO.I.push(base, base + 1, base + 2, base, base + 2, base + 3); else GEO.I.push(base, base + 2, base + 1, base, base + 3, base + 2);
  }
  /** a box: its centre and three half-axes (vectors, engine units): any way it turns or tilts */
  function boxAx(c, a, b, h, color, kind) {
    const ez = Math.abs(a[2]) + Math.abs(b[2]) + Math.abs(h[2]); zLo = c[2] - ez; zHi = c[2] + ez;
    for (const [X, Y, Z] of [[a, b, h], [b, h, a], [h, a, b]]) {
      const l = Math.hypot(X[0], X[1], X[2]) || 1;
      for (const s of [1, -1]) quad([c[0] + X[0] * s, c[1] + X[1] * s, c[2] + X[2] * s], Y, Z, [X[0] / l * s, X[1] / l * s, X[2] / l * s], color, kind);
    }
  }
  /** a cylinder from c0 to c1 (engine units), radius r, seg sides, capped */
  function cylAx(c0, c1, r, seg, color, kind) {
    const d = [c1[0] - c0[0], c1[1] - c0[1], c1[2] - c0[2]], L = Math.hypot(...d), f = d.map(v => v / L);
    const p = Math.abs(f[2]) < .9 ? [-f[1], f[0], 0] : [1, 0, 0], pl = Math.hypot(...p), u = p.map(v => v / pl), w = [f[1] * u[2] - f[2] * u[1], f[2] * u[0] - f[0] * u[2], f[0] * u[1] - f[1] * u[0]];
    zLo = Math.min(c0[2], c1[2]) - r; zHi = Math.max(c0[2], c1[2]) + r;
    const at = (k, e) => { const a = k / seg * TAU, cs = Math.cos(a) * r, sn = Math.sin(a) * r, o = e ? c1 : c0; return [o[0] + u[0] * cs + w[0] * sn, o[1] + u[1] * cs + w[1] * sn, o[2] + u[2] * cs + w[2] * sn]; };
    for (let k = 0; k < seg; k++) {
      const a = (k + .5) / seg * TAU, n = [u[0] * Math.cos(a) + w[0] * Math.sin(a), u[1] * Math.cos(a) + w[1] * Math.sin(a), u[2] * Math.cos(a) + w[2] * Math.sin(a)];
      const p0 = at(k, 0), p1 = at(k + 1, 0), p2 = at(k + 1, 1), c = [(p0[0] + p2[0]) / 2, (p0[1] + p2[1]) / 2, (p0[2] + p2[2]) / 2];
      quad(c, [(p1[0] - p0[0]) / 2, (p1[1] - p0[1]) / 2, (p1[2] - p0[2]) / 2], [d[0] / 2, d[1] / 2, d[2] / 2], n, color, kind);
    }
    for (const e of [0, 1]) for (let k = 0; k < seg; k += 2) {   // the caps, as quads round the middle (seg even)
      const o = e ? c1 : c0, a = at(k, e), b = at(k + 1, e), c = at(k + 2, e);
      quadPts(o, a, b, c, e ? f : f.map(v => -v), color, kind);
    }
  }
  /** a quad from four corners in order (a fan's slice) */
  function quadPts(p0, p1, p2, p3, n, color, kind) {
    const base = GEO.P.length / 3, col = linOf(color);
    for (const q of [p0, p1, p2, p3]) { GEO.P.push(q[0] / M, q[2] / M, q[1] / M); GEO.N.push(n[0], n[2], n[1]); GEO.C.push(col[0], col[1], col[2]); GEO.K.push(kind); }
    const p = GEO.P, i = base * 3, e1 = [p[i + 3] - p[i], p[i + 4] - p[i + 1], p[i + 5] - p[i + 2]], e2 = [p[i + 6] - p[i], p[i + 7] - p[i + 1], p[i + 8] - p[i + 2]];
    const dn = (e1[1] * e2[2] - e1[2] * e2[1]) * n[0] + (e1[2] * e2[0] - e1[0] * e2[2]) * n[2] + (e1[0] * e2[1] - e1[1] * e2[0]) * n[1];
    if (dn > 0) GEO.I.push(base, base + 1, base + 2, base, base + 2, base + 3); else GEO.I.push(base, base + 2, base + 1, base, base + 3, base + 2);
  }
  /* ---- the outposts' frame: P = { x, y, z (units), c, s (its turn) }; local metres (east, south, up) to world units ---- */
  const frameOf = (o, yaw) => ({ x: o.x, y: o.y, z: o.z, yaw, c: Math.cos(yaw), s: Math.sin(yaw) });
  const atP = (P, lx, ly) => [P.x + (lx * P.c - ly * P.s) * M, P.y + (lx * P.s + ly * P.c) * M];
  /** a box in an outpost: centre (lx, ly) metres, its foot lz metres above the pad, w x d x h metres, turned lyaw; solid:
   *  a fixed block too (true, or a height in metres for a lower one) */
  function B(P, lx, ly, lz, w, d, h, lyaw, color, kind, solid = true) {
    const [x, y] = atP(P, lx, ly), a = P.yaw + lyaw, c = Math.cos(a), s = Math.sin(a), z0 = P.z + lz * M;
    boxAx([x, y, z0 + h * M / 2], [c * w * M / 2, s * w * M / 2, 0], [-s * d * M / 2, c * d * M / 2, 0], [0, 0, h * M / 2], color, kind);
    if (solid) solids.push({ x, y, z: z0, w: w * M, d: d * M, h: (solid === true ? h : solid) * M, yaw: a });
  }
  /** a box between two points of the outpost (metres, lz up): a brace, a rafter, a sloped roof; across: its width's way */
  function beam(P, a, b, w, t, color, kind, up = [0, 0, 1]) {
    const pa = [...atP(P, a[0], a[1]), P.z + a[2] * M], pb = [...atP(P, b[0], b[1]), P.z + b[2] * M], c = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2, (pa[2] + pb[2]) / 2];
    const d = [(pb[0] - pa[0]) / 2, (pb[1] - pa[1]) / 2, (pb[2] - pa[2]) / 2], L = Math.hypot(...d), f = d.map(v => v / L);
    const u0 = [up[0] * P.c - up[1] * P.s, up[0] * P.s + up[1] * P.c, up[2]], dot = u0[0] * f[0] + u0[1] * f[1] + u0[2] * f[2];
    let u = [u0[0] - f[0] * dot, u0[1] - f[1] * dot, u0[2] - f[2] * dot]; const ul = Math.hypot(...u) || 1; u = u.map(v => v / ul);
    const s = [f[1] * u[2] - f[2] * u[1], f[2] * u[0] - f[0] * u[2], f[0] * u[1] - f[1] * u[0]];
    boxAx(c, d, s.map(v => v * w * M / 2), u.map(v => v * t * M / 2), color, kind);
  }
  const CYL = (P, lx, ly, lz, r, h, color, kind, seg = 12, solid = true) => {
    const [x, y] = atP(P, lx, ly); cylAx([x, y, P.z + lz * M], [x, y, P.z + (lz + h) * M], r * M, seg, color, kind);
    if (solid) solids.push({ x, y, z: P.z + lz * M, r: r * M, h: h * M });
  };
  /* ---- the pieces ---- */
  const CON = '#bdb4a2', CON2 = '#9a9284', TRIM = '#5a5650', STEEL = '#3a3e44', GALV = '#9aa09a', WOOD = '#9a7448', BAG = '#b8a478', TARP = '#5f6e4c';
  const OPEN = { door: [1.2, 2.2, 0], window: [1.3, 1.05, 1.0], gap: [1.5, 2.35, 0], bay: [4, 4.2, 0] };   // an opening's width, height and sill (metres)
  /** a wall from (ax, ay) to (bx, by) (local metres), h tall, t thick, with openings [{ at (metres from a), kind }] */
  function wall(P, ax, ay, bx, by, h, t, color, kind, openings = [], lz = 0) {
    const L = Math.hypot(bx - ax, by - ay), dx = (bx - ax) / L, dy = (by - ay) / L, yaw = Math.atan2(dy, dx), at = s => [ax + dx * s, ay + dy * s];
    let s0 = 0; const ops = openings.slice().sort((p, q) => p.at - q.at);
    const piece = (s1, s2, z1, z2) => { if (s2 - s1 < .02 || z2 - z1 < .02) return; const [cx, cy] = at((s1 + s2) / 2); B(P, cx, cy, lz + z1, s2 - s1, t, z2 - z1, yaw, color, kind); };
    for (const op of ops) {
      const [w, oh, sill] = OPEN[op.kind], a = op.at - w / 2, b = op.at + w / 2;
      piece(s0, a, 0, h); piece(a, b, sill + oh, h); if (sill) piece(a, b, 0, sill);
      const [cx, cy] = at(op.at), [x, y] = atP(P, cx, cy);
      if (op.kind === 'door') { const [hx, hy] = atP(P, ...at(a)); doors.push({ x, y, z: P.z + lz * M, hx, hy, yaw: P.yaw + yaw, w: w * M, h: oh * M, t: .09 * M, color: op.color || '#6a5a48', state: 'shut', ang: 0, vel: 0, want: 0, block: null, deb: null }); }
      s0 = b;
    }
    piece(s0, L, 0, h);
  }
  /** a single-room building: w x d metres, h tall, flat roof with a low parapet; walls: { n, s, e, w: [openings] } */
  function shack(P, lx, ly, w, d, h, walls, color = CON, roof = CON2, parapet = true) {
    const x0 = lx - w / 2, x1 = lx + w / 2, y0 = ly - d / 2, y1 = ly + d / 2, t = .22;
    B(P, lx, ly, -.3, w + .3, d + .3, .32, 0, CON2, K_CONCRETE, false);   // the slab it stands on
    wall(P, x0, y0, x1, y0, h, t, color, K_CONCRETE, walls.n); wall(P, x1, y1, x0, y1, h, t, color, K_CONCRETE, walls.s);
    wall(P, x1, y0 + t / 2, x1, y1 - t / 2, h, t, color, K_CONCRETE, walls.e); wall(P, x0, y1 - t / 2, x0, y0 + t / 2, h, t, color, K_CONCRETE, walls.w);
    B(P, lx, ly, h, w + .2, d + .2, .24, 0, roof, K_CONCRETE);
    if (parapet) { for (const yy of [y0, y1]) B(P, lx, yy, h + .24, w + .2, .2, .38, 0, roof, K_CONCRETE); for (const xx of [x0, x1]) B(P, xx, ly, h + .24, .2, d - .2, .38, 0, roof, K_CONCRETE); }
    B(P, lx, y1 + .1, h - .55, w + .2, .14, .14, 0, TRIM, K_PLAIN, false);   // a trim band and a rain pipe
    beam(P, [x1 + .12, y1 + .12, 0], [x1 + .12, y1 + .12, h], .12, .12, TRIM, K_PLAIN);
  }
  /** a shipping container, 6.1 x 2.45 x 2.6 m, its foot lz up; open: both ends open to walk through */
  function container(P, lx, ly, lz, lyaw, color, open = false) {
    const c = Math.cos(lyaw), s = Math.sin(lyaw), L = 6.1, Wd = 2.45, Hh = 2.6, t = .1, at = (u, v) => [lx + u * c - v * s, ly + u * s + v * c];
    if (!open) B(P, lx, ly, lz, L, Wd, Hh, lyaw, color, K_RIBS);
    else {
      for (const v of [-1, 1]) { const [x, y] = at(0, v * (Wd / 2 - t / 2)); B(P, x, y, lz, L, t, Hh, lyaw, color, K_RIBS); }
      B(P, lx, ly, lz + Hh - t, L, Wd, t, lyaw, color, K_RIBS); B(P, lx, ly, lz, L, Wd, .12, lyaw, '#4a3a2a', K_PLANKS, .12);
      for (const v of [-1, 1]) { const [x, y] = at(L / 2 + .55, v * (Wd / 2 + .05)), a = lyaw + v * 1.2; B(P, x + Math.cos(a) * .05, y, lz + .04, 1.2, .08, Hh - .08, a, E.shade(color, -.08), K_RIBS, false); }
    }
    for (const u of [-1, 1]) { const [x, y] = at(u * (L / 2 - .06), 0); B(P, x, y, lz, .14, Wd + .04, Hh + .02, lyaw, E.shade(color, -.25), K_PLAIN, false); }   // the frame's ends
  }
  /** a ladder up to z1 metres (its rails at the foot (lx, ly), climbed facing lyaw), with its record for climbing */
  function ladder(P, lx, ly, z0, z1, lyaw) {
    const c = Math.cos(lyaw), s = Math.sin(lyaw);
    for (const v of [-1, 1]) beam(P, [lx - s * v * .24, ly + c * v * .24, z0], [lx - s * v * .24, ly + c * v * .24, z1 + .9], .06, .06, STEEL, K_PLAIN);
    for (let z = z0 + .3; z < z1 + .1; z += .3) beam(P, [lx - s * .24, ly + c * .24, z], [lx + s * .24, ly - c * .24, z], .045, .045, GALV, K_PLAIN);
    const [x, y] = atP(P, lx, ly), a = P.yaw + lyaw;
    ladders.push({ x, y, z0: P.z + z0 * M, z1: P.z + z1 * M, yaw: a, top: [x + Math.cos(a) * 1.1 * M, y + Math.sin(a) * 1.1 * M, P.z + z1 * M] });
  }
  /** a watch tower: four legs, braces, a platform h metres up with railings (a gap where the ladder comes up), a roof;
   *  returns its zipline anchor (world units) */
  function tower(P, lx, ly, lyaw, h = 8) {
    const c = Math.cos(lyaw), s = Math.sin(lyaw), at = (u, v) => [lx + u * c - v * s, ly + u * s + v * c], R = 1.45;
    for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const [x, y] = at(u * R, v * R); B(P, x, y, 0, .26, .26, h + 3.2, lyaw, WOOD, K_PLANKS); }
    for (let k = 0; k < 4; k++) for (const z of [0, h / 2]) {   // the braces: an X on each side
      const [u0, v0] = [[-1, -1], [1, -1], [1, 1], [-1, 1]][k], [u1, v1] = [[1, -1], [1, 1], [-1, 1], [-1, -1]][k], a = at(u0 * R, v0 * R), b = at(u1 * R, v1 * R);
      beam(P, [a[0], a[1], z + .3], [b[0], b[1], z + h / 2 - .2], .14, .1, WOOD, K_PLANKS); beam(P, [b[0], b[1], z + .3], [a[0], a[1], z + h / 2 - .2], .14, .1, WOOD, K_PLANKS);
    }
    B(P, lx, ly, h - .2, 3.3, 3.3, .22, lyaw, WOOD, K_PLANKS);
    const rail = (u0, v0, u1, v1) => { const a = at(u0, v0), b = at(u1, v1), L = Math.hypot(b[0] - a[0], b[1] - a[1]); B(P, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, h, L, .12, 1.0, Math.atan2(b[1] - a[1], b[0] - a[0]), WOOD, K_PLANKS); };
    rail(-1.6, -1.6, 1.6, -1.6); rail(-1.6, 1.6, 1.6, 1.6); rail(-1.6, -1.6, -1.6, -.6); rail(-1.6, .6, -1.6, 1.6); rail(1.6, -1.6, 1.6, -.5);   // (the ladder comes up at +u, +v; the zipline leaves from the gap at -u)
    B(P, lx, ly, h + 3.0, 3.8, 3.8, .16, lyaw, GALV, K_METAL);
    const [lx2, ly2] = at(1.95, .9); ladder(P, lx2, ly2, 0, h, lyaw + Math.PI);
    const [ax, ay] = atP(P, ...at(-2.05, 0)); beam(P, [...at(-1.45, 0), h + 2.95], [...at(-2.15, 0), h + 2.95], .12, .12, STEEL, K_PLAIN); return [ax, ay, P.z + (h + 2.85) * M];
  }
  /** a zipline from a (an anchor, world units) to b, sagging a little; a post at a ground end */
  function zipline(a, b, post) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), sag = L * .03, pts = [];
    for (let k = 0; k <= 24; k++) { const t = k / 24; pts.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t) - sag * 4 * t * (1 - t)]); }
    const Z = { x: 0, y: 0, z: 0, c: 1, s: 0, yaw: 0 };
    for (let k = 0; k < 24; k++) beam(Z, [pts[k][0] / M, pts[k][1] / M, pts[k][2] / M], [pts[k + 1][0] / M, pts[k + 1][1] / M, pts[k + 1][2] / M], .035, .035, '#2a2a2e', K_PLAIN);
    if (post) { const g = height(b[0], b[1]) / M; beam(Z, [b[0] / M, b[1] / M, g], [b[0] / M, b[1] / M, b[2] / M + .5], .22, .22, WOOD, K_PLANKS); beam(Z, [b[0] / M - .6, b[1] / M, b[2] / M + .2], [b[0] / M + .6, b[1] / M, b[2] / M + .2], .14, .14, WOOD, K_PLANKS); }
    const zp = { a, b, pts, len: L }; zips.push(zp); return zp;
  }
  /** concrete barrier (jersey), 3 m long, 0.82 m tall: vault over it */
  const barrier = (P, lx, ly, lyaw) => { B(P, lx, ly, 0, 3, .62, .3, lyaw, CON, K_CONCRETE, .82); B(P, lx, ly, .3, 3, .3, .52, lyaw, CON, K_CONCRETE, false); };
  const sandbags = (P, lx, ly, lyaw, len = 4, h = 1.05) => B(P, lx, ly, 0, len, .7, h, lyaw, BAG, K_BAGS);
  const crate = (P, lx, ly, lz, lyaw, k = 1.2) => B(P, lx, ly, lz, k, k, k, lyaw, WOOD, K_PLANKS);
  const bin = (P, lx, ly, lz, lyaw) => { const [x, y] = atP(P, lx, ly); bins.push({ x, y, z: P.z + lz * M, yaw: P.yaw + lyaw, open: 0, used: false }); solids.push({ x, y, z: P.z + lz * M, w: 1.1 * M, d: .62 * M, h: .66 * M, yaw: P.yaw + lyaw }); };
  const spawn = (o, P, lx, ly, lz = 0, o2 = {}) => { const [x, y] = atP(P, lx, ly); spawns.push(Object.assign({ op: o.id, x, y, z: P.z + lz * M }, o2)); };
  /** a fuel tank on its side, on two saddles */
  function tank(P, lx, ly, lyaw, L = 5, r = 1.2) {
    const c = Math.cos(lyaw), s = Math.sin(lyaw), a = [...atP(P, lx - c * L / 2, ly - s * L / 2)], b = [...atP(P, lx + c * L / 2, ly + s * L / 2)];
    cylAx([a[0], a[1], P.z + (r + .35) * M], [b[0], b[1], P.z + (r + .35) * M], r * M, 14, '#d8d4c8', K_PLAIN);
    for (const u of [-.32, .32]) B(P, lx + c * u * L, ly + s * u * L, 0, .4, r * 1.6, .6, lyaw, STEEL, K_PLAIN, false);
    solids.push({ x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, z: P.z, w: L * M, d: r * 2 * M, h: (r * 2 + .35) * M, yaw: P.yaw + lyaw });
  }

  /* ---- the six outposts, laid out (each turned to its own heading) ---- */
  function layout() {
    const rnd = E.rng(77);
    for (const o of OUTPOSTS) {
      const P = frameOf(o, o.id === 'drop' ? 0 : Math.floor(rnd() * 8) * Math.PI / 4 + (rnd() - .5) * .3);
      o.P = P; o.zips = [];
      const zipTo = (a, ang, dist) => { const c = Math.cos(P.yaw + ang), s = Math.sin(P.yaw + ang), x = a[0] + c * dist * M, y = a[1] + s * dist * M; return zipline(a, [x, y, height(x, y) + 2.3 * M], true); };
      if (o.id === 'drop') {   // the firing range: a line of sandbags, targets at 12, 25 and 45 m; a course of walls and ledges; the armory
        shack(P, -15, 10, 7, 5, 3.2, { n: [{ at: 2, kind: 'door' }], e: [{ at: 2.5, kind: 'window' }], s: [{ at: 3.5, kind: 'window' }] });
        bin(P, -16.5, 11, 0, 0); bin(P, -13.6, 11.6, 0, 0); bin(P, -6, 15, 0, .4);
        for (const x of [-9, -4, 1, 6]) sandbags(P, x, 4, 0, 4.4, 1.05);
        for (const [x, y] of [[-6, -9], [2, -12], [7, -21], [-4, -24], [3, -41], [-8, -40]]) { const [wx, wy] = atP(P, x, y); dummies.push({ x: wx, y: wy, z: P.z }); }
        B(P, 15, 9, 0, 3, .4, .95, 0, CON, K_CONCRETE); B(P, 19, 4, 0, 3, 3, 1.7, 0, CON2, K_CONCRETE); B(P, 23.5, -1, 0, 3, 3, 2.4, 0, CON, K_CONCRETE);
        B(P, 27, -8, 0, 5, 1.2, 3.2, 0, CON2, K_CONCRETE); B(P, 17, -12, 0, 6, .4, 1.1, 0, CON, K_CONCRETE);
        container(P, 22, -17, 0, 0, '#2f6a8a', true); container(P, 22, -17, 2.6, 0, '#b8462e');
        barrier(P, 10, -6, .3); barrier(P, -12, -14, -.2); crate(P, 12, 15, 0, .2); crate(P, 12.4, 15.2, 1.2, .5);
        o.zips.push(zipTo(tower(P, -24, -10, 0, 8), Math.PI * .85, 105));
      } else if (o.id === 'relay') {   // a radio mast (seen from far off), two shacks, containers, a tower
        const mast = 34;
        for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) beam(P, [u * 1.6, v * 1.6, 0], [u * .25, v * .25, mast], .2, .2, '#c84a3a', K_PLAIN);
        for (let z = 2; z < mast; z += 3) { const k = 1.6 - 1.35 * z / mast; for (const [u0, v0, u1, v1] of [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]]) beam(P, [u0 * k, v0 * k, z], [u1 * k, v1 * k, z], .09, .09, z % 6 < 3 ? '#e8e4dc' : '#c84a3a', K_PLAIN); }
        B(P, 0, 0, 0, 3.6, 3.6, .4, 0, CON2, K_CONCRETE); CYL(P, 0, 0, mast - 1.5, .5, .9, '#e8e4dc', K_PLAIN, 10, false);
        solids.push({ x: o.x, y: o.y, z: o.z, w: 3.4 * M, d: 3.4 * M, h: 5 * M, yaw: P.yaw }); o.beacon = [o.x, o.y, o.z + (mast + 1) * M];
        shack(P, -12, -10, 6, 5, 3.2, { s: [{ at: 1.6, kind: 'door' }], e: [{ at: 2.5, kind: 'window' }], w: [{ at: 2.5, kind: 'window' }] });
        shack(P, 12, 9, 7, 5, 3.2, { w: [{ at: 2.5, kind: 'door' }], n: [{ at: 2, kind: 'window' }, { at: 5, kind: 'window' }] }, '#c4bba6');
        container(P, -5, 15, 0, .2, '#c8a03a'); container(P, 6, -15, 0, 1.4, '#3f7a4a', true); container(P, 8, -14.2, 2.6, 1.5, '#b8462e');
        barrier(P, 8, -4, .4); barrier(P, -8, 4, -.3); barrier(P, -16, 3, 1.4); sandbags(P, 15, -2, 1.6, 3.5); crate(P, -2, 9, 0, .3); crate(P, -1.4, 10.3, 0, .9);
        bin(P, -12.5, -11, 0, 0); bin(P, 3, 14, 0, -.4);
        o.zips.push(zipTo(tower(P, 19, -13, -.4, 8), -.9, 95));
        spawn(o, P, -10, -6); spawn(o, P, 12, 4); spawn(o, P, 19, -13, 8, { post: true }); spawn(o, P, 2, -10); spawn(o, P, -4, 11); spawn(o, P, 13, 9);
      } else if (o.id === 'salvage') {   // rows of containers, stacked and open; a long shed; sandbag nests; a tower
        const rows = [[-20, -14, 0], [-20, -10.6, 0], [-20, -7.2, .05], [-11, -16, .5], [-12.5, 4, 1.57], [-9.6, 4, 1.57], [-1, 15, .1], [8, 18, -.2], [20, -2, 1.57], [20, 6, 1.6]];
        const cols = ['#b8462e', '#2f6a8a', '#c8a03a', '#3f7a4a', '#d8d8d0', '#7a4a8a'];
        rows.forEach(([x, y, a], i) => { container(P, x, y, 0, a, cols[i % cols.length], i === 3 || i === 7); if (i % 3 === 0) container(P, x + .2, y, 2.6, a + .06, cols[(i + 2) % cols.length]); });
        shack(P, 9, -10, 10, 6, 3.6, { n: [{ at: 3, kind: 'window' }, { at: 7, kind: 'window' }], w: [{ at: 3, kind: 'door' }], s: [{ at: 2, kind: 'door' }, { at: 6.5, kind: 'window' }], e: [{ at: 3, kind: 'gap' }] }, '#a8a090');
        sandbags(P, -2, -4, .5, 4); sandbags(P, 2, 6, -.4, 3.5); barrier(P, 14, 9, 1.2); barrier(P, -6, 9, .1); for (let k = 0; k < 5; k++) crate(P, -4 + k * 1.3, -15 + (k % 2) * .3, 0, k * .4);
        crate(P, -2.6, -15, 1.2, .2); tank(P, 16, -20, .3, 5);
        bin(P, 7, -10, 0, 0); bin(P, -14, -2, 0, .5);
        o.zips.push(zipTo(tower(P, -3, 22, .2, 9), 1.2, 100));
        spawn(o, P, 8, -6); spawn(o, P, -15, -3); spawn(o, P, -3, 22, 9, { post: true }); spawn(o, P, 5, 10); spawn(o, P, -20, -10.6, 2.6, { post: true }); spawn(o, P, 16, 2, 0, { heavy: true }); spawn(o, P, -6, -10);
      } else if (o.id === 'pump') {   // a water tower, the pump house with its tanks and pipes, a two-storey block with outside stairs
        const wt = 10; for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) beam(P, [10 + u * 2.2, -8 + v * 2.2, 0], [10 + u * 1.7, -8 + v * 1.7, wt], .3, .3, STEEL, K_PLAIN);
        for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) solids.push({ x: atP(P, 10 + u * 2, -8 + v * 2)[0], y: atP(P, 10 + u * 2, -8 + v * 2)[1], z: o.z, w: .4 * M, d: .4 * M, h: wt * M, yaw: P.yaw });
        B(P, 10, -8, wt, 5.6, 5.6, .2, 0, STEEL, K_PLAIN); CYL(P, 10, -8, wt + .2, 2.5, 4, '#9ab0b8', K_METAL, 16); CYL(P, 10, -8, wt + 4.2, 2.6, .3, '#6a8088', K_PLAIN, 16);
        for (const [x0, y0, x1, y1] of [[7.2, -10.8, 12.8, -10.8], [7.2, -5.2, 12.8, -5.2], [7.2, -10.8, 7.2, -8.7], [7.2, -7.3, 7.2, -5.2], [12.8, -10.8, 12.8, -7.5]]) B(P, (x0 + x1) / 2, (y0 + y1) / 2, wt + .2, Math.max(.1, Math.abs(x1 - x0)), Math.max(.1, Math.abs(y1 - y0)), 1.0, 0, STEEL, K_PLAIN);
        beam(P, [7.2, -8, wt + 3.3], [6.5, -8, wt + 3.3], .12, .12, STEEL, K_PLAIN); for (const yy of [-8.7, -7.3]) beam(P, [7.2, yy, wt + 1.2], [7.2, yy, wt + 3.4], .1, .1, STEEL, K_PLAIN);
        ladder(P, 13.4, -6.4, 0, wt, Math.PI);
        o.zips.push(zipTo([...atP(P, 6.6, -8), o.z + (wt + 3.15) * M], Math.PI + .25, 110));
        shack(P, -13, -13, 6, 5, 3.2, { e: [{ at: 2.5, kind: 'door' }], n: [{ at: 3, kind: 'window' }] }, '#b0a898');
        tank(P, 13, 11, 0, 5.5); tank(P, 13, 14.4, 0, 5.5); for (const z of [.4, 1.2]) beam(P, [-10, -13, z], [10, 11, z], .2, .2, '#7a6a5a', K_PLAIN);
        // the two-storey block: the ground floor's roof is the upper floor; outside stairs up its east side to the upper door
        shack(P, -9, 6, 8, 6, 3.2, { n: [{ at: 2, kind: 'door' }, { at: 5.5, kind: 'window' }], s: [{ at: 4, kind: 'gap' }], w: [{ at: 3, kind: 'window' }] }, '#c8bca4', '#b0a490', false);
        wall(P, -13, 3, -5, 3, 3, .22, '#c8bca4', K_CONCRETE, [{ at: 2.5, kind: 'window' }, { at: 5.5, kind: 'window' }], 3.44); wall(P, -5, 9, -13, 9, 3, .22, '#c8bca4', K_CONCRETE, [{ at: 4, kind: 'window' }], 3.44);
        wall(P, -5, 3.1, -5, 8.9, 3, .22, '#c8bca4', K_CONCRETE, [{ at: 1, kind: 'door' }, { at: 4.2, kind: 'window' }], 3.44); wall(P, -13, 8.9, -13, 3.1, 3, .22, '#c8bca4', K_CONCRETE, [{ at: 3, kind: 'window' }], 3.44);
        B(P, -9, 6, 6.44, 8.2, 6.2, .24, 0, '#b0a490', K_CONCRETE);
        B(P, -3.4, 4, 0, 1.2, 1.2, 3.44, 0, CON2, K_CONCRETE);   // the landing by the upper door, then the steps down to the south
        for (let k = 0; k < 13; k++) B(P, -3.4, 4.75 + k * .3, 0, 1.2, .32, 3.44 - .265 * (k + 1), 0, CON2, K_CONCRETE);
        bin(P, -11, 5, 0, 0); bin(P, -8, 7.5, 3.44, 0); bin(P, 13, 8, 0, 0);
        spawn(o, P, -9, 6); spawn(o, P, -8, 6, 3.44); spawn(o, P, 10, -8, wt + .2, { post: true }); spawn(o, P, -13, -9); spawn(o, P, 9, 12); spawn(o, P, 2, -2, 0, { heavy: true });
      } else if (o.id === 'ridge') {   // tents round a fire, sandbag walls, a radio hut, a tower
        for (let k = 0; k < 4; k++) {
          const a = k * TAU / 4 + .4, x = Math.cos(a) * 9, y = Math.sin(a) * 9, c = Math.cos(a + 1.57), s = Math.sin(a + 1.57);
          for (const v of [-1, 1]) beam(P, [x, y, 1.9], [x - s * v * 1.45, y + c * v * 1.45, 0], 3.2, .05, TARP, K_PLAIN);   // the canvas, each side from the ridge down
          beam(P, [x - c * 1.65, y - s * 1.65, 1.95], [x + c * 1.65, y + s * 1.65, 1.95], .07, .07, WOOD, K_PLANKS);
          solids.push({ x: atP(P, x, y)[0], y: atP(P, x, y)[1], z: o.z, w: 2.6 * M, d: 3.0 * M, h: 1.7 * M, yaw: P.yaw + a });
        }
        o.fire = [...atP(P, 0, 0), o.z]; for (let k = 0; k < 7; k++) B(P, Math.cos(k * .9) * .8, Math.sin(k * .9) * .8, 0, .5, .4, .3, k * .9, '#6a6460', K_CONCRETE, false);
        for (const [x, y, a] of [[-16, -4, 1.57], [-14, 8, .9], [15, -8, -.8], [17, 4, 1.4], [3, -16, .1]]) sandbags(P, x, y, a, 4.5);
        shack(P, 4, 14, 5, 4, 3, { w: [{ at: 2, kind: 'door' }], n: [{ at: 2.5, kind: 'window' }] }, '#a89a84');
        crate(P, -4, -12, 0, .2); crate(P, -3.2, -12.6, 0, .9); crate(P, -3.6, -12.3, 1.2, .5); barrier(P, 10, 12, .8);
        bin(P, 3.8, 14, 0, 0); bin(P, -6, -11, 0, .6);
        o.zips.push(zipTo(tower(P, -12, 14, .5, 7), 2.3, 90));
        spawn(o, P, 4, 2); spawn(o, P, -5, 5); spawn(o, P, -12, 14, 7, { post: true }); spawn(o, P, 12, -6); spawn(o, P, 4, 14);
      } else if (o.id === 'depot') {   // a warehouse with doorways at both ends, an office, fuel tanks, a tower
        const x0 = -10, x1 = 10, y0 = -11, y1 = 3, h = 7;
        B(P, 0, -4, -.3, 20.4, 14.4, .32, 0, CON2, K_CONCRETE, false);
        wall(P, x0, y0, x1, y0, h, .25, '#8a9a9a', K_METAL, [{ at: 5, kind: 'window' }, { at: 15, kind: 'window' }]); wall(P, x1, y1, x0, y1, h, .25, '#8a9a9a', K_METAL, [{ at: 4, kind: 'door' }, { at: 10, kind: 'window' }]);
        wall(P, x1, y0, x1, y1, h, .25, '#8a9a9a', K_METAL, [{ at: 7, kind: 'bay' }]); wall(P, x0, y1, x0, y0, h, .25, '#8a9a9a', K_METAL, [{ at: 7, kind: 'bay' }]);
        for (const xx of [x0, x1]) B(P, xx, -4, h, .25, 7, 1.1, 0, '#8a9a9a', K_METAL, false);   // (the gables, under the ridge)
        for (const yy of [y0 - .4, y1 + .4]) beam(P, [0, -4, h + 1.6], [0, yy, h - .05], 20.8, .14, GALV, K_METAL);   // the roof's two slopes
        beam(P, [x0 - .2, -4, h + 1.45], [x1 + .2, -4, h + 1.45], .3, .3, STEEL, K_PLAIN); for (const xx of [-6, -2, 2, 6]) beam(P, [xx, y0, h - .2], [xx, y1, h - .2], .2, .3, STEEL, K_PLAIN);
        solids.push({ x: atP(P, 0, -4)[0], y: atP(P, 0, -4)[1], z: o.z + h * M, w: 20.6 * M, d: 14.6 * M, h: 1.2 * M, yaw: P.yaw });
        container(P, -4, -7, 0, .05, '#2f6a8a'); container(P, 4, -1, 0, -.1, '#b8462e', true); for (let k = 0; k < 4; k++) crate(P, 6 + (k % 2) * 1.25, -9 + Math.floor(k / 2) * 1.25, 0, 0); crate(P, 6.6, -8.4, 1.2, .3);
        shack(P, 14, -16, 6, 5, 3.2, { w: [{ at: 2.5, kind: 'door' }], n: [{ at: 3, kind: 'window' }], s: [{ at: 3, kind: 'window' }] }, '#c4bba6');
        tank(P, -16, 14, 1.2, 6, 1.4); tank(P, -12.5, 15, 1.2, 6, 1.4); barrier(P, 2, 9, 0); barrier(P, 6, 9.2, .1); barrier(P, -4, 10, -.2); sandbags(P, 15, 4, 1.57);
        bin(P, -6, -2, 0, 0); bin(P, 13, -17, 0, 0); bin(P, 8, 7, 0, .3);
        o.zips.push(zipTo(tower(P, 17, 15, -.2, 8), .6, 100));
        spawn(o, P, 0, -4); spawn(o, P, -6, -9); spawn(o, P, 14, -14); spawn(o, P, 17, 15, 8, { post: true }); spawn(o, P, -10, 12); spawn(o, P, 6, 6, 0, { heavy: true }); spawn(o, P, 2, -4, 0, { heavy: true });
      }
    }
  }

  /* ---- the structures' picture: the merged mesh in one material whose kinds draw their own patterns (TSL): poured
   *      concrete with stains, corrugated metal, a container's ribs, planks, sandbags in rows ---- */
  let NOISE = null;
  function noiseTex() {   // value noise that tiles (128 px), grey, filtered and mipmapped: seen from near and far
    if (NOISE) return NOISE;
    const S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d'), img = g.createImageData(S, S);
    const wn = (x, y, per) => { const xi = Math.floor(x), yi = Math.floor(y), u = x - xi, v = y - yi, su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v), m = a => ((a % per) + per) % per, h = (a, b) => E.hash2(m(a) + 11, m(b) + 57);
      return lerp(lerp(h(xi, yi), h(xi + 1, yi), su), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), su), sv); };
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      let v = 0, a = .5, t = 0; for (let o = 0, f = 4; o < 5; o++, f *= 2) { v += a * wn(x / S * f, y / S * f, f); t += a; a *= .5; }
      const i = (y * S + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = clamp((v / t - .5) * 1.7 + .5, 0, 1) * 255; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0); NOISE = new E.THREE.CanvasTexture(cv); NOISE.wrapS = NOISE.wrapT = E.THREE.RepeatWrapping; NOISE.colorSpace = E.THREE.NoColorSpace; NOISE.anisotropy = 4;
    return NOISE;
  }
  function structureMesh(world) {
    const T3 = E.THREE, { attribute, positionWorld, normalWorld, texture, vec2, float, fract, sin, step, abs, mix, floor, max, length } = E.TSL, NZ = noiseTex();
    const geo = new T3.BufferGeometry();
    geo.setAttribute('position', new T3.Float32BufferAttribute(GEO.P, 3)); geo.setAttribute('normal', new T3.Float32BufferAttribute(GEO.N, 3));
    geo.setAttribute('color', new T3.Float32BufferAttribute(GEO.C, 3)); geo.setAttribute('kind', new T3.Float32BufferAttribute(GEO.K, 1)); geo.setIndex(GEO.I);
    geo.computeBoundingSphere();
    const kind = attribute('kind', 'float'), wp = positionWorld, side = float(1).sub(abs(normalWorld.y)), tn = vec2(normalWorld.z, normalWorld.x.negate());
    const wu = mix(wp.x, wp.xz.dot(tn.div(max(length(tn), .001))), step(.5, side));   // along the face: a wall's own horizontal, a top's x
    const nW = texture(NZ, vec2(wu, wp.y).mul(.21)).r, nT = texture(NZ, wp.xz.mul(.21)).r, n = mix(nT, nW, side), fine = texture(NZ, vec2(wu, wp.y).mul(1.9)).r;
    const concrete = n.sub(.5).mul(.36).add(1).mul(fine.sub(.5).mul(.18).add(1));
    const corr = sin(wu.mul(52)).mul(.09).add(.93).mul(n.sub(.5).mul(.22).add(1));
    const ribs = step(.5, fract(wu.div(.3))).mul(.14).add(.88).mul(n.sub(.5).mul(.34).add(1));
    const planks = step(.06, fract(wp.y.div(.2).add(step(.5, side).oneMinus().mul(wu.div(.2))))).mul(.2).add(.8).mul(fine.sub(.5).mul(.3).add(1));
    const row = floor(wp.y.div(.15)), bu = fract(wu.div(.42).add(row.mul(.5))), bv = fract(wp.y.div(.15)), bag = sin(bu.mul(Math.PI)).mul(sin(bv.mul(Math.PI))).max(0).pow(.5).mul(.4).add(.64);
    const is = i => max(float(0), float(1).sub(abs(kind.sub(i))));   // 1 for its own kind, 0 for the rest
    const k = is(0).mul(concrete).add(is(1).mul(mix(concrete, corr, side))).add(is(2).mul(mix(concrete, ribs, side))).add(is(3).mul(planks)).add(is(4).mul(bag.mul(fine.sub(.5).mul(.2).add(1)))).add(is(5).mul(fine.sub(.5).mul(.12).add(1)));
    const mat = new T3.MeshLambertNodeMaterial({ color: '#ffffff' }); mat.colorNode = attribute('color', 'vec3').mul(k);
    const mesh = new T3.Mesh(geo, mat); mesh.castShadow = mesh.receiveShadow = true; mesh.matrixAutoUpdate = false; world.scene.add(mesh);
    return mesh;
  }

  /* =====================================================================
   * SCATTER: junipers, pines and boulders (shapes) placed chunk by chunk round the player as it moves (in the steps:
   * the trunks near the player are blocks), and grass round the camera (in the frames: only the picture)
   * ===================================================================== */
  const CH = 64 * M, TREE_R = 260 * M, ROCK_R = 170 * M, TRUNK_R = 60 * M;
  const SCAT = {
    juniper: s => ['tree', { params: { h: 26, seed: s }, mats: { l: '#5a6a3a foliage size=3', b: '#5a4636 bark' } }],
    pine: () => ['pine', { params: { h: 44, tiers: 5 }, mats: { l: '#335c3a foliage size=3', b: '#6a4a30 bark' } }],
    snag: () => ['pine', { params: { h: 40, tiers: 1 }, mats: { l: '#6a5a44 bark', b: '#7a6650 bark' } }],
    rock: s => ['rock', { params: { r: 7.5, seed: s }, mats: { s: '#b4744e noise' } }]
  };
  /** a chunk's trees and boulders: [kind, seed, x, y, z, facing, scale, trunk radius] (the same every time: its own seed) */
  function chunkItems(world, cx, cy) {
    const out = [], r = E.rng(((cx * 73856093) ^ (cy * 19349663) ^ 0x5bd1e995) | 0), T = world.terrain, nm = [0, 0, 1];
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      const x = (cx * 4 + i + .15 + r() * .7) * 16 * M, y = (cy * 4 + j + .15 + r() * .7) * 16 * M, m = x / M, n = y / M, v = r(), s = r(), f = r() * TAU;
      if (m < 150 || n < 150 || m > HM - 150 || n > HM - 150 || rs(PADW, m, n) > .02 || rs(ROADC, m, n) > .05) continue;
      const nz = T.normal(x, y, nm)[2], z = T.ground(x, y), river = rs(RIVER, m, n), dens = sstep(.4, .68, fbm(m / 170 + 77, n / 170 + 13, 2)) * .7 + river * .35;
      if (nz > .86 && v < dens * .52) {
        const kind = z > 34 * M || river > .4 ? (s < .7 ? 'pine' : 'snag') : s < .12 ? 'snag' : 'juniper', k = kind === 'juniper' ? 1.4 + s * .9 : kind === 'pine' ? 2.2 + s * 1.2 : 2 + s;
        out.push([kind, 1 + (i + j) % 3, x, y, z - 2, f, k, kind === 'juniper' ? 2.4 * k : 2.6 * k]);
      } else if ((v > .93 && nz > .7) || (nz < .8 && nz > .55 && v > .7)) out.push(['rock', 2 + (i * 3 + j) % 4, x, y, z - 1.5, f, 1 + s * 2.4, 5 * (1 + s * 2.4)]);
    }
    return out;
  }
  const placed = new Map();   // chunk key -> { items, shapes, blocks }
  /** keep the scatter round (x, y): chunks within reach placed (at most `budget` new ones), far ones taken away, trunk
   *  blocks near (x, y) only */
  function streamScatter(world, x, y, budget = 3) {
    const cx0 = Math.floor(x / CH), cy0 = Math.floor(y / CH), R = Math.ceil(TREE_R / CH) + 1, near = [];
    for (let cy = cy0 - R; cy <= cy0 + R; cy++) for (let cx = cx0 - R; cx <= cx0 + R; cx++) {
      if (cx < 0 || cy < 0 || cx >= SIZE / CH || cy >= SIZE / CH) continue;
      const d = Math.hypot((cx + .5) * CH - x, (cy + .5) * CH - y); if (d < TREE_R && !placed.has(cy * 4096 + cx)) near.push([d, cx, cy]);
    }
    near.sort((a, b) => a[0] - b[0]);
    for (const [, cx, cy] of near.slice(0, budget)) placed.set(cy * 4096 + cx, { cx, cy, items: chunkItems(world, cx, cy), shapes: [], blocks: null });
    for (const [key, c] of placed) {
      const d = Math.hypot((c.cx + .5) * CH - x, (c.cy + .5) * CH - y);
      if (d > TREE_R + CH) { for (const s of c.shapes) world.remove(s); if (c.blocks) for (const b of c.blocks) world.remove(b); placed.delete(key); continue; }
      // shapes: trees within reach, boulders nearer
      const wantRocks = d < ROCK_R;
      if (!c.shapes.length || c.rocks !== wantRocks) {
        for (const s of c.shapes) world.remove(s); c.shapes = [];
        for (const [kind, seed, ix, iy, iz, f, k] of c.items) if (kind !== 'rock' || wantRocks) { const [id, o] = SCAT[kind](seed); const sh = world.shape(id, ix, iy, iz, Object.assign({ facing: f, scale: k, solid: false }, o)); if (sh) c.shapes.push(sh); }
        c.rocks = wantRocks;
      }
      const wantBlocks = d < TRUNK_R + CH;
      if (wantBlocks && !c.blocks) c.blocks = c.items.map(([kind, , ix, iy, iz, , k, tr]) => world.block({ x: ix, y: iy, z: iz, r: tr, h: kind === 'rock' ? 7 * k : 48 }));
      else if (!wantBlocks && c.blocks) { for (const b of c.blocks) world.remove(b); c.blocks = null; }
    }
  }

  /* ---- grass: 32 m tiles of tufts round the camera, each tile one merged mesh from a pool; every blade leans with the
   *      wind (gusts roll across) and bends away from the player's feet (TSL, in the vertex stage) ---- */
  const GT = 32 * M, GRASS_R = 84 * M, GPOOL = 34, GMAX = 760 * 6 * 3, grass = { pool: [], tiles: new Map(), uT: null, uP: null };
  function grassMeshes(world) {
    const T3 = E.THREE, { attribute, positionLocal, vec3, float, sin, uniform, clamp: cl, length, max } = E.TSL;
    grass.uT = uniform(0); grass.uP = uniform(new T3.Vector3(0, -999, 0));
    const tip = attribute('tip', 'float'), p = positionLocal;
    const w = sin(grass.uT.mul(1.7).add(p.x.mul(.29)).add(p.z.mul(.17))).mul(.55).add(sin(grass.uT.mul(3.4).add(p.x.mul(.83)).sub(p.z.mul(.61))).mul(.22)).add(.42);
    const d = p.xz.sub(grass.uP.xz), l = max(length(d), .001), near = cl(float(1).sub(l.div(1.15)), 0, 1).mul(cl(float(1.6).sub(p.y.sub(grass.uP.y).abs()), 0, 1));
    const mat = new T3.MeshLambertNodeMaterial({ color: '#ffffff', side: T3.DoubleSide });
    mat.positionNode = p.add(vec3(w.mul(.12).add(d.x.div(l).mul(near).mul(.42)), near.mul(-.16), w.mul(.06).add(d.y.div(l).mul(near).mul(.42))).mul(tip));
    mat.colorNode = attribute('color', 'vec3');
    const up = new Float32Array(GMAX * 3); for (let i = 0; i < GMAX; i++) up[i * 3 + 1] = 1;
    const normal = new T3.BufferAttribute(up, 3);
    for (let k = 0; k < GPOOL; k++) {
      const geo = new T3.BufferGeometry();
      geo.setAttribute('position', new T3.BufferAttribute(new Float32Array(GMAX * 3), 3)); geo.setAttribute('normal', normal);
      geo.setAttribute('color', new T3.BufferAttribute(new Float32Array(GMAX * 3), 3)); geo.setAttribute('tip', new T3.BufferAttribute(new Float32Array(GMAX), 1));   // (floats: WebGPU has no one-byte vertex format)
      geo.boundingSphere = new T3.Sphere(new T3.Vector3(), 1); geo.setDrawRange(0, 3);
      const m = new T3.Mesh(geo, mat); m.receiveShadow = true; m.visible = k === 0; m.matrixAutoUpdate = false; world.scene.add(m);   // (one shows at the warm-up: its shader is built)
      grass.pool.push({ mesh: m, key: null, used: -1 });
    }
  }
  /** fill a pooled mesh with tile (tx, ty)'s tufts: golden blades (a sage clump here and there), thinning on roads,
   *  pads, riverbeds and slopes, coloured from the ground under them */
  function buildGrass(world, slot, tx, ty) {
    const geo = slot.mesh.geometry, P = geo.attributes.position.array, C = geo.attributes.color.array, Tp = geo.attributes.tip.array, T = world.terrain;
    const r = E.rng(((tx * 92837111) ^ (ty * 689287499)) | 0), col = [0, 0, 0], nm = [0, 0, 1], step = 1.15; let v = 0;
    const put = (x, y, z, c, k, t) => { P[v * 3] = x / M; P[v * 3 + 1] = z / M; P[v * 3 + 2] = y / M; C[v * 3] = srgb(c[0] * k / 255); C[v * 3 + 1] = srgb(c[1] * k / 255); C[v * 3 + 2] = srgb(c[2] * k / 255); Tp[v] = t; v++; };
    for (let gy = 0; gy < GT / M / step; gy++) for (let gx = 0; gx < GT / M / step; gx++) {
      const x = tx * GT + (gx + r()) * step * M, y = ty * GT + (gy + r()) * step * M, m = x / M, n = y / M, a = r(), b = r();
      const keep = (1 - sstep(.05, .5, rs(ROADC, m, n))) * (1 - sstep(.3, .8, rs(PADW, m, n))) * (1 - rs(RIVER, m, n) * .85) * sstep(.78, .9, T.normal(x, y, nm)[2]) * (.55 + N2(m / 9, n / 9) * .6);
      if (a > keep || v > GMAX - 20) continue;
      const z = T.ground(x, y); color(x, y, z, 1, col);
      const sage = N2(m / 14 + 40, n / 14 + 7) > .7 && b < .5, blades = sage ? 5 : 6, hgt = (sage ? .3 : .3 + b * .26) * M, wid = (sage ? .12 : .042) * M;
      const tint = sage ? [128, 140, 110] : [col[0] * 1.02 + 6, col[1] * 1.02 + 4, col[2] * .9];
      for (let k = 0; k < blades; k++) {
        const ang = (k / blades + b) * TAU, lean = (sage ? .55 : .22 + ((k * 13) % 7) / 30) * hgt, ca = Math.cos(ang), sa = Math.sin(ang), ox = ca * .06 * M, oy = sa * .06 * M;
        put(x + ox - sa * wid, y + oy + ca * wid, z, tint, .62, 0); put(x + ox + sa * wid, y + oy - ca * wid, z, tint, .62, 0);
        put(x + ox + ca * lean, y + oy + sa * lean, z + hgt * (.85 + ((k * 37) % 10) / 40), tint, 1.18, 1);
      }
    }
    for (const a of ['position', 'color', 'tip']) { geo.attributes[a].needsUpdate = true; geo.attributes[a].clearUpdateRanges(); geo.attributes[a].addUpdateRange(0, v * (a === 'tip' ? 1 : 3)); }
    geo.setDrawRange(0, v); geo.boundingSphere.center.set((tx + .5) * GT / M, T.ground((tx + .5) * GT, (ty + .5) * GT) / M, (ty + .5) * GT / M); geo.boundingSphere.radius = GT / M * .75 + 8;
    slot.key = tx + ':' + ty;
  }
  /** a frame's grass round the camera at (x, y): the tiles in reach shown (up to `budget` new ones built), the rest hidden */
  function drawGrass(world, x, y, budget = 2) {
    const f = (grass.frame = (grass.frame || 0) + 1), R = Math.ceil(GRASS_R / GT), tx0 = Math.floor(x / GT), ty0 = Math.floor(y / GT), want = [];
    for (let ty = ty0 - R; ty <= ty0 + R; ty++) for (let tx = tx0 - R; tx <= tx0 + R; tx++) { const d = Math.hypot((tx + .5) * GT - x, (ty + .5) * GT - y); if (d < GRASS_R) want.push([d, tx, ty]); }
    want.sort((a, b) => a[0] - b[0]);
    for (const [, tx, ty] of want) {
      const key = tx + ':' + ty; let s = grass.tiles.get(key);
      if (!s && budget > 0) { s = grass.pool.filter(p => p.used < f - 1).sort((a, b) => a.used - b.used)[0]; if (s) { if (s.key) grass.tiles.delete(s.key); buildGrass(world, s, tx, ty); grass.tiles.set(key, s); budget--; } }
      if (s) s.used = f;
    }
    for (const p of grass.pool) p.mesh.visible = p.used === f;
  }

  /* =====================================================================
   * FX: tracers (streaks that fly from the muzzle to what was hit), bullet holes (a ring of decals), impacts by surface
   * ===================================================================== */
  const TR_MAX = 64, DC_MAX = 160, FL_MAX = 24, FL_V = 3 * (16 + 6 * 2 + 2), fx = { tracers: [], decals: 0, trMesh: null, dcMesh: null, flW: null, flO: null, cam: [0, 0, 0], flashes: { world: [], ov: [] }, stars: [] };
  function fxMeshes(world) {
    const T3 = E.THREE, { attribute } = E.TSL;
    const tg = new T3.BufferGeometry(), ti = [];
    for (let k = 0; k < TR_MAX; k++) ti.push(k * 4, k * 4 + 1, k * 4 + 2, k * 4, k * 4 + 2, k * 4 + 3);
    tg.setAttribute('position', new T3.BufferAttribute(new Float32Array(TR_MAX * 12), 3)); tg.setAttribute('color', new T3.BufferAttribute(new Float32Array(TR_MAX * 12), 3)); tg.setIndex(ti);
    tg.setAttribute('normal', new T3.BufferAttribute(new Float32Array(TR_MAX * 12), 3)); tg.setDrawRange(0, 6);
    const tm = new T3.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: T3.AdditiveBlending, side: T3.DoubleSide, fog: false }); tm.colorNode = attribute('color', 'vec3');
    fx.trMesh = new T3.Mesh(tg, tm); fx.trMesh.frustumCulled = false; fx.trMesh.renderOrder = 3; world.scene.add(fx.trMesh);
    const dg = new T3.BufferGeometry(), di = [];
    for (let k = 0; k < DC_MAX; k++) for (let q = 0; q < 6; q++) di.push(k * 7, k * 7 + 1 + q, k * 7 + 1 + (q + 1) % 6);
    dg.setAttribute('position', new T3.BufferAttribute(new Float32Array(DC_MAX * 21), 3)); dg.setAttribute('dc', new T3.BufferAttribute(new Float32Array(DC_MAX * 28), 4));
    dg.setAttribute('normal', new T3.BufferAttribute(new Float32Array(DC_MAX * 21), 3)); dg.setIndex(di);
    const dm = new T3.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: T3.DoubleSide });
    dm.colorNode = attribute('dc', 'vec4').rgb; dm.opacityNode = attribute('dc', 'vec4').a;
    fx.dcMesh = new T3.Mesh(dg, dm); fx.dcMesh.frustumCulled = false; fx.dcMesh.renderOrder = 1; world.scene.add(fx.dcMesh);
    const flashMesh = (sc, mat) => {
      const g = new T3.BufferGeometry(); for (const a of ['position', 'color', 'normal']) g.setAttribute(a, new T3.BufferAttribute(new Float32Array(FL_MAX * FL_V * 3), 3));
      g.setDrawRange(0, 3); const m = new T3.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = 4; sc.add(m); return m;
    };
    const tmO = tm.clone(); tmO.colorNode = tm.colorNode; tmO.depthTest = false;   // (on the overlay a flash draws over the gun or the fist that made it)
    fx.flW = flashMesh(world.scene, tm); fx.flO = flashMesh(world.overlay.scene, tmO);
  }
  /** a tracer from a to b (engine units): a bright streak flying at `speed` units a second */
  function tracer(a, b, color = '#ffd890', speed = 9000, width = .5) {
    const d = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]); if (d < 8) return;
    fx.tracers.push({ a: a.slice(), b: b.slice(), d, t: 0, life: d / speed + .03, c: linOf(color), w: width });
    if (fx.tracers.length > TR_MAX) fx.tracers.shift();
  }
  /** a bullet hole (or a scorch: big) at a point on a surface, facing its normal n */
  function decal(p, n, r = .9, color = '#16120e', alpha = .92) {
    const k = fx.decals++ % DC_MAX, g = fx.dcMesh.geometry, P = g.attributes.position.array, Cc = g.attributes.dc.array, c = linOf(color);
    const nl = Math.hypot(n[0], n[1], n[2]) || 1, nx = n[0] / nl, ny = n[1] / nl, nz = n[2] / nl, ax = Math.abs(nz) < .9 ? [0, 0, 1] : [1, 0, 0];
    let tx = ny * ax[2] - nz * ax[1], ty = nz * ax[0] - nx * ax[2], tz = nx * ax[1] - ny * ax[0]; const tl = Math.hypot(tx, ty, tz); tx /= tl; ty /= tl; tz /= tl;
    const bx = ny * tz - nz * ty, by = nz * tx - nx * tz, bz = nx * ty - ny * tx, rot = (fx.decals * 2.39) % TAU;
    const set = (i, x, y, z, a) => { P[(k * 7 + i) * 3] = x / M; P[(k * 7 + i) * 3 + 1] = z / M; P[(k * 7 + i) * 3 + 2] = y / M; const o = (k * 7 + i) * 4; Cc[o] = c[0]; Cc[o + 1] = c[1]; Cc[o + 2] = c[2]; Cc[o + 3] = a; };
    const cx = p[0] + nx * .12, cy = p[1] + ny * .12, cz = p[2] + nz * .12; set(0, cx, cy, cz, alpha);
    for (let q = 0; q < 6; q++) { const a = rot + q * TAU / 6, rr = r * (.8 + ((q * 7 + fx.decals) % 5) * .1), u = Math.cos(a) * rr, v = Math.sin(a) * rr; set(1 + q, cx + tx * u + bx * v, cy + ty * u + by * v, cz + tz * u + bz * v, 0); }
    g.attributes.position.needsUpdate = g.attributes.dc.needsUpdate = true;
  }
  /** a frame's tracers as quads facing the camera (each a streak along its path with a bright head) */
  function drawTracers(dt) {
    const g = fx.trMesh.geometry, P = g.attributes.position.array, C = g.attributes.color.array, cam = fx.cam; let n = 0;
    for (let i = fx.tracers.length - 1; i >= 0; i--) {
      const t = fx.tracers[i]; t.t += dt; if (t.t > t.life) { fx.tracers.splice(i, 1); continue; }
      const u1 = Math.min(1, t.t / t.life * 1.08), u0 = Math.max(0, u1 - Math.min(.5, 260 / t.d)), d = [(t.b[0] - t.a[0]) / t.d, (t.b[1] - t.a[1]) / t.d, (t.b[2] - t.a[2]) / t.d];
      const h = [t.a[0] + d[0] * t.d * u1, t.a[1] + d[1] * t.d * u1, t.a[2] + d[2] * t.d * u1], e = [t.a[0] + d[0] * t.d * u0, t.a[1] + d[1] * t.d * u0, t.a[2] + d[2] * t.d * u0];
      // each end as wide as it needs to be seen at its own distance, thinning to nothing at the eye (a streak that
      // passes the camera never fills the picture)
      const o = n * 12, fade = 1 - t.t / t.life * .5, pts = [[e, -1, .15], [e, 1, .15], [h, 1, 1], [h, -1, 1]];
      pts.forEach(([q, sg, k], j) => {
        const v = [q[0] - cam[0], q[1] - cam[1], q[2] - cam[2]], dist = Math.hypot(...v); let sx = d[1] * v[2] - d[2] * v[1], sy = d[2] * v[0] - d[0] * v[2], sz = d[0] * v[1] - d[1] * v[0]; const sl = Math.hypot(sx, sy, sz) || 1;
        const w = t.w * (1 + dist / 900) * clamp((dist - 12) / 60, 0, 1) * sg; sx = sx / sl * w; sy = sy / sl * w; sz = sz / sl * w;
        P[o + j * 3] = (q[0] + sx) / M; P[o + j * 3 + 1] = (q[2] + sz) / M; P[o + j * 3 + 2] = (q[1] + sy) / M; C[o + j * 3] = t.c[0] * k * fade; C[o + j * 3 + 1] = t.c[1] * k * fade; C[o + j * 3 + 2] = t.c[2] * k * fade;
      });
      if (++n >= TR_MAX) break;
    }
    g.setDrawRange(0, Math.max(6, n * 6)); if (!n) P.fill(0, 0, 12);
    g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = true;
  }
  /** a frame's muzzle flashes as stars facing the eye at cam: a white-hot core, four to six spikes of flame of different
   *  lengths turned at random, a plume along the barrel; additive, so each fades to nothing at its edges and tips. They
   *  last two frames: the shot's, full, and one fading (each its own shape) */
  const FL_PAL = { fire: [[1.7, 1.45, 1], [1.3, .7, .22], [.5, .17, .03]], white: [[1.6, 1.6, 1.55], [1.1, 1, .85], [.35, .3, .26]], blue: [[1.3, 1.6, 1.8], [.45, .9, 1.4], [.08, .24, .5]], purple: [[1.6, 1.4, 1.8], [.95, .55, 1.4], [.3, .1, .5]] };
  /** a hit's star at p (facing d's way, size s, palette 'white', 'blue' or 'purple'): two frames, held through a hit-stop;
   *  (s 0: chips only); shards: chips thrown off it; ov: p is in the eye's frame, drawn on the overlay (over the fist that threw it) */
  function impactStar(p, d, s, pal, shards = 0, ov = false) {
    if (s > 0 && fx.stars.length < 12) fx.stars.push({ p: p.slice(), f: d.slice(), s, pal, t: 0, ov, seed: 1 + Math.floor(Math.abs(p[0] * 31 + p[1] * 17 + p[2] * 7)) % 2147483000 });
    const sd = [-d[1], d[0], 0];
    for (let i = 0; i < shards && fx.stars.length < 24; i++) { const a = (i % 2 ? 1 : -1) * (.4 + Math.random() * .8), v = [(sd[0] * a * 1.6 - d[0] * .4) * 45, (sd[1] * a * 1.6 - d[1] * .4) * 45, 20 + Math.random() * 30]; fx.stars.push({ p: p.slice(), f: d.slice(), s: ov ? .22 : .45, pal, t: 0, v: ov ? mul(v, .5) : v, ov, life: .1, seed: 7 + i * 131 }); }   // (chips thrown aside and back toward the eye, arcing down for six frames)
  }
  function drawFlashes(mesh, list, cam) {
    const g = mesh.geometry, P = g.attributes.position.array, C = g.attributes.color.array, K = [0, 0, 0]; let v = 0;
    const put = (q, c) => { P[v * 3] = q[0] / M; P[v * 3 + 1] = q[2] / M; P[v * 3 + 2] = q[1] / M; C[v * 3] = c[0]; C[v * 3 + 1] = c[1]; C[v * 3 + 2] = c[2]; v++; };
    const tri = (a, ca, b, cb, c, cc) => { put(a, ca); put(b, cb); put(c, cc); };
    for (const fl of list) {
      const { p, s } = fl, h = fl.heat, view = nrm(sub(p, cam)), a = nrm(cross(view, Math.abs(view[2]) < .95 ? UP : [1, 0, 0])), b = cross(a, view);
      let r = fl.seed; const rn = () => (r = (r * 16807) % 2147483647) / 2147483647;
      const pal = FL_PAL[fl.pal || 'fire'], hot = mul(pal[fl.thin && fl.pal !== 'fire' ? 1 : 0], h * (fl.thin ? 1.6 : 1)), warm = mul(pal[1], h * (fl.thin ? 1.6 : 1)), tip = mul(pal[2], h), ring = (rr, t) => add(add(p, a, Math.cos(t) * rr), b, Math.sin(t) * rr);
      const rc = s * (.55 + rn() * .2), dim = mul(warm, h >= 1 ? .16 : 0);
      for (let i = 0; i < 8; i++) { tri(p, hot, ring(rc, i / 8 * TAU), K, ring(rc, (i + 1) / 8 * TAU), K); tri(p, dim, ring(rc * 2.1, i / 8 * TAU), K, ring(rc * 2.1, (i + 1) / 8 * TAU), K); }   // (and the air round it, lit, on the first frame)
      const n = 4 + Math.floor(rn() * 3), rot = rn() * TAU;
      for (let i = 0; i < n; i++) {
        const t = rot + i / n * TAU + (rn() - .5) * .6, d = add(mul(a, Math.cos(t)), b, Math.sin(t)), pp = add(mul(a, -Math.sin(t)), b, Math.cos(t));
        const len = s * (1 + rn() * 1.9) * (i % 2 ? .7 : 1), w = s * (.16 + rn() * .1) * (fl.thin ? .6 : 1), e = add(p, d, len), m = add(p, d, len * .2);
        tri(p, warm, add(m, pp, w), K, e, tip); tri(p, warm, e, tip, add(m, pp, -w), K);
      }
      const wa = cross(fl.f, view), wl = Math.hypot(...wa);
      if (wl > .05) {
        const len = s * (1.8 + rn() * 1.2), e = add(p, fl.f, len), m = add(p, fl.f, len * .3), w = mul(wa, s * .34 / wl);
        tri(p, hot, add(m, w), K, e, tip); tri(p, hot, e, tip, sub(m, w), K);
      }
    }
    g.setDrawRange(0, Math.max(3, v)); if (!v) P.fill(0, 0, 9);
    g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = true; list.length = 0;
  }

  /* =====================================================================
   * THE SOLDIER: a procedural skeleton posed every frame from what the body is doing (its speed and heading, crouch,
   * slide, air, the ledge or wall or rung or cable it holds, the gun's pose: aim, recoil, reload, a punch, a kick,
   * a throw, a hit, a death), then drawn with the pen (boots, pads, plates, pouches, a helmet and visor). The player in
   * third person, the raiders and the range's dummies are all soldiers
   * ===================================================================== */
  const v3 = (x = 0, y = 0, z = 0) => [x, y, z];
  const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const nrm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const mixv = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const UP = [0, 0, 1], ease = t => t * t * (3 - 2 * t), win = (t, a, b) => ease(clamp((t - a) / (b - a), 0, 1));
  /** a point in a frame: o + f*a + u*b + r*c */
  const at = (F, a, b, c = 0) => [F.o[0] + F.f[0] * a + F.u[0] * b + F.r[0] * c, F.o[1] + F.f[1] * a + F.u[1] * b + F.r[1] * c, F.o[2] + F.f[2] * a + F.u[2] * b + F.r[2] * c];
  /** a frame looking along yaw and pitch (and rolled): { o, f (ahead), u (up), r (right) } */
  function frameYP(o, yaw, pitch, roll = 0) {
    const cp = Math.cos(pitch), f = [Math.cos(yaw) * cp, Math.sin(yaw) * cp, Math.sin(pitch)], r0 = [-Math.sin(yaw), Math.cos(yaw), 0], u0 = cross(f, r0);
    const cr = Math.cos(roll), sr = Math.sin(roll);
    return { o, f, u: add(mul(u0, cr), r0, -sr), r: add(mul(r0, cr), u0, sr) };
  }
  /** turn a frame about its own axes: pitch (about r: the muzzle up), yaw (about u: to the right), roll (about f) */
  function turn(F, pitch, yaw, roll) {
    let { f, u, r } = F;
    if (pitch) { const c = Math.cos(pitch), s = Math.sin(pitch); [f, u] = [add(mul(f, c), u, s), add(mul(u, c), f, -s)]; }
    if (yaw) { const c = Math.cos(yaw), s = Math.sin(yaw); [f, r] = [add(mul(f, c), r, s), add(mul(r, c), f, -s)]; }
    if (roll) { const c = Math.cos(roll), s = Math.sin(roll); [u, r] = [add(mul(u, c), r, s), add(mul(r, c), u, -s)]; }
    return { o: F.o, f, u, r };
  }
  /** two-bone IK: the joint between a (a hip, a shoulder) and the end b, bending toward hint; b pulled in if too far */
  function ik(a, b, L1, L2, hint) {
    let d = sub(b, a), dist = Math.hypot(...d); const mx = (L1 + L2) * .999;
    if (dist > mx) { d = mul(d, mx / dist); b = add(a, d); dist = mx; }
    dist = Math.max(dist, .01); const n = mul(d, 1 / dist);
    let h = sub(hint, mul(n, dot(hint, n))); const hl = Math.hypot(...h); h = hl < 1e-4 ? [n[1], -n[0], 0] : mul(h, 1 / hl);
    const x = (L1 * L1 - L2 * L2 + dist * dist) / (2 * dist), y = Math.sqrt(Math.max(0, L1 * L1 - x * x));
    return [add(add(a, n, x), h, y), b];
  }
  /** a spring toward a target: s = { x, v } (or arrays of them); k stiffness, d damping */
  const spring = (s, target, k, d, dt) => { s.v += (k * (target - s.x) - d * s.v) * dt; s.x += s.v * dt; return s.x; };
  const SPR = () => ({ x: 0, v: 0 });

  const LOOKS = {
    player: { cloth: '#4a5440', plate: '#cbb48a', dark: '#2c3036', glove: '#33302c', helmet: '#4a5058', visor: '#6ef0ff', skin: '#c89a78', boot: '#2a2622', accent: '#e8742a', pack: '#3a3f36' },
    raider: { cloth: '#6e3a2a', plate: '#3c3632', dark: '#262224', glove: '#2a2420', helmet: '#d8cfbc', visor: '#ff3a2a', skin: '#a87a5a', boot: '#221e1c', accent: '#c8a03a', pack: '#4a3a2e', mask: true },
    heavy: { cloth: '#4a3a4a', plate: '#5a5048', dark: '#24222a', glove: '#2a2428', helmet: '#3a3438', visor: '#c86aff', skin: '#a87a5a', boot: '#221e1c', accent: '#b05ae8', pack: '#3a3240' },
    dummy: { cloth: '#8a8c94', plate: '#e8e4dc', dark: '#4a4c54', glove: '#5a5c64', helmet: '#e8e4dc', visor: '#ffb347', skin: '#d8d4cc', boot: '#3a3c44', accent: '#ff5a2a', pack: '#6a6c74', dummy: true }
  };
  /** a new soldier's body: what the game sets (x, y, z, yaw, aim, velocity, move, the gun's state) and the springs and
   *  phases its pose keeps */
  function body(look, k = 1) {
    return { look: LOOKS[look], k, x: 0, y: 0, z: 0, yaw: 0, aimYaw: 0, aimPitch: 0, vx: 0, vy: 0, vz: 0, grounded: true, move: 'stand', sprint: false, ads: false, weapon: 'rifle',
      act: null, actT: 0, ledge: null, wallN: null, zipP: null, ladder: null, dead: null, hit: [0, 0, 0], flinch: 0, fire: 0, visible: true, onGround: null,
      // pose state
      ph: 0, amp: 0, cr: 0, sl: 0, air: 0, adsB: 0, spB: 0, leanF: SPR(), leanS: SPR(), dip: SPR(), jx: SPR(), jy: SPR(), jz: SPR(), rec: SPR(), pvx: 0, pvy: 0, twist: 0, J: null, G: null, feet: [null, null], stance: null, low: false, lowB: 0 };
  }
  /** joints that would jump when what they do changes (a stride ends, a slide starts, a ledge is caught or let go) go
   *  there over dur seconds from where they were, carried along with the body (key: what they do now) */
  function settle(b, name, key, pts, dt, dur = .12) {
    const o = [b.x, b.y, b.z], s = b[name] || (b[name] = { key, last: null, from: null, t: 0 });
    if (key !== s.key && s.last) { s.from = s.last; s.t = 0; } s.key = key;
    if (s.from) { s.t += dt; const u = ease(clamp(s.t / dur, 0, 1)); for (let i = 0; i < pts.length; i++) if (pts[i] && s.from[i]) pts[i] = mixv(add(o, s.from[i]), pts[i], u); if (u >= 1) s.from = null; }
    s.last = pts.map(q => q && sub(q, o));
  }
  /** the ground under a foot: the level's (the terrain, a floor, a roof) by a short ray down, else the body's own */
  function footGround(world, b, x, y) {
    const h = world.ray(x, y, b.z + 14 * b.k, 0, 0, -1, 30 * b.k, { level: true });
    return h ? h.z : b.z;
  }
  /** pose a soldier for this frame (dt: game seconds since the last pose). Sets b.J (joints) and b.G (the gun's frame) */
  function pose(world, b, dt) {
    const k = b.k, LT = 7.4 * k, LS = 7.1 * k, LU = 4.9 * k, LF = 4.7 * k, sp = Math.hypot(b.vx, b.vy), fine = b.visible;
    // the blends, eased toward what the body is doing
    const ap = (v, t, r) => v + (t - v) * Math.min(1, dt * r);
    b.cr = ap(b.cr, b.move === 'crouch' ? 1 : 0, 10); b.sl = ap(b.sl, b.move === 'slide' ? 1 : 0, 12); b.air = ap(b.air, b.move === 'air' ? 1 : 0, 9);
    b.adsB = ap(b.adsB, b.ads ? 1 : 0, 12); b.spB = ap(b.spB, b.sprint && b.move === 'stand' && !b.act ? 1 : 0, 8);
    b.trB = ap(b.trB || 0, ['mantle', 'climb', 'ladder'].includes(b.move) ? 1 : 0, 14);
    b.lowB = ap(b.lowB, b.low && !b.ads && !b.sprint && !b.act && (b.move === 'stand' || b.move === 'crouch') ? 1 : 0, 7);
    const walking = (b.move === 'stand' || b.move === 'crouch') && b.grounded;
    b.amp = ap(b.amp, walking ? clamp(sp / 34, 0, 1) : 0, 8);
    const L = (b.move === 'crouch' ? 22 : 16) * k + sp * .3;   // a stride (two steps) grows with speed
    if (walking) b.ph = (b.ph + sp / L * dt) % 1;
    // leaning: into the acceleration, forward with speed, into turns
    const fw = [Math.cos(b.yaw), Math.sin(b.yaw), 0], rt = [-Math.sin(b.yaw), Math.cos(b.yaw), 0], ax = dt > 0 ? (b.vx - b.pvx) / dt : 0, ay = dt > 0 ? (b.vy - b.pvy) / dt : 0; b.pvx = b.vx; b.pvy = b.vy;
    const accF = ax * fw[0] + ay * fw[1], accS = ax * rt[0] + ay * rt[1];
    spring(b.leanF, clamp(accF * .0006 + (walking ? sp * .0024 : 0) + b.spB * .3, -.25, .5), 120, 16, dt); spring(b.leanS, clamp(accS * .0005, -.3, .3), 120, 16, dt);
    spring(b.dip, 0, 160, 15, dt); spring(b.rec, 0, 260, 22, dt);
    for (const [q, j] of [[b.jx, 0], [b.jy, 1], [b.jz, 2]]) { q.v += b.hit[j]; spring(q, 0, 140, 13, dt); } b.hit[0] = b.hit[1] = b.hit[2] = 0;
    // the pelvis: standing, crouched, sliding, in the air; the walk's bob and sway; a landing's dip
    const run = clamp((sp - 60) / 50, 0, 1), bob = walking ? Math.abs(Math.sin(b.ph * TAU)) : 0;
    let pz = (15.2 - b.cr * 5.2 - b.sl * 9.8 - b.air * .6) * k + (walking ? (bob - .6) * (.5 + run * .9) * b.amp * k : 0) + b.dip.x;
    if (b.move === 'stand' && !walking) pz += Math.sin(drawT * 1.6) * .12 * k;   // breathing
    const P = [b.x + b.jx.x * .3, b.y + b.jy.x * .3, b.z + pz];
    if (walking) { const sw = Math.sin(b.ph * TAU) * (.35 + run * .25) * b.amp * k; P[0] += rt[0] * sw; P[1] += rt[1] * sw; }
    // turning on the spot: the feet keep the heading they planted at (the hips turn over them) until the body has turned
    // past it, then step round one after the other, the foot on the side it turns to first
    if (!((b.move === 'stand' || b.move === 'crouch') && !(walking && b.amp > .02))) b.stance = null;
    else {
      if (!b.stance || Math.hypot(b.x - b.stance.x, b.y - b.stance.y) > 3 * k) b.stance = { yaw: b.yaw, x: b.x, y: b.y, from: null, t: 1, lead: 0 };
      const S0 = b.stance, dyaw = ((b.yaw - S0.yaw + Math.PI * 3) % TAU) - Math.PI, turning = Math.abs(((b.yaw - (b.pyaw ?? b.yaw) + Math.PI * 3) % TAU) - Math.PI) > dt * .3;
      S0.still = turning ? 0 : (S0.still || 0) + dt; b.pyaw = b.yaw;
      if (S0.t >= 1 && (Math.abs(dyaw) > .48 || (Math.abs(dyaw) > .2 && S0.still > .3)))   // (past the feet: step round, aiming past the turn; stopped turning askew: a last step squares them)
        Object.assign(S0, { from: { yaw: S0.yaw, x: S0.x, y: S0.y }, yaw: b.yaw + (turning ? Math.sign(dyaw) * Math.min(.35, Math.abs(dyaw) * .45) : 0), x: b.x, y: b.y, t: 0, lead: dyaw > 0 ? 1 : 0 });
      if (S0.t < 1) {   // (the hips shift over the planted foot while the other lifts, and dip a little as each lands)
        S0.t = Math.min(1, S0.t + dt / .32); const t = S0.t, u0 = clamp(t / .58, 0, 1), u1 = clamp((t - .42) / .58, 0, 1), sh = (Math.sin(u0 * Math.PI) * (S0.lead ? -1 : 1) + Math.sin(u1 * Math.PI) * (S0.lead ? 1 : -1)) * .5 * k;
        P[0] += rt[0] * sh; P[1] += rt[1] * sh; P[2] -= (Math.max(0, 1 - Math.abs(t - .6) / .1) + Math.max(0, 1 - Math.abs(t - .96) / .08)) * .3 * k;
      }
    }
    const standFoot = (i, yaw, x, y) => {
      const f = [Math.cos(yaw), Math.sin(yaw), 0], r = [-f[1], f[0], 0], side = i ? 1 : -1;
      return { p: add(add([x, y, 0], r, side * (2.1 + b.cr * .7) * k), f, (i ? 1.2 : -.9) * k * (1 + b.cr)), toe: nrm(add(f, r, side * .25)) };
    };
    // ---- the feet on the ground (the gait, standing, crouched, sliding, on a rung), before the pelvis settles to them ----
    const footZ = (x, y) => fine ? footGround(world, b, x, y) : b.z, A = [null, null], toe = [fw, fw];
    if (!(walking && b.amp > .02)) b.feetW = null;
    for (let i = 0; i < 2; i++) {
      const side = i ? 1 : -1;
      if (b.move === 'slide') {   // the lead leg out ahead, the other tucked under
        const vd = sp > 1 ? [b.vx / sp, b.vy / sp, 0] : fw, out = i === 1;
        A[i] = add(add([b.x, b.y, b.z], vd, out ? 9 * k : 2 * k), rt, side * (out ? 1.2 : 2.6) * k); A[i][2] = footZ(A[i][0], A[i][1]) + (out ? 1.6 : 1.1) * k; toe[i] = vd;
      } else if (b.move === 'ladder') {   // on the rungs, stepping in turn
        const Ld = b.ladder, st = .3 * M, ph = (b.z / st + i * .5) % 1, rung = Math.floor(b.z / st + i * .5) * st - i * st / 2;
        A[i] = add(add([b.x, b.y, 0], fw, 1.6 * k), rt, side * 1.9 * k); A[i][2] = Math.max(Ld ? Ld.z0 : 0, rung) + (ph < .3 ? ph * 6 : 0) * k + 1;
      } else if (walking && b.amp > .02) {   // the gait: stance plants the foot (it moves back as fast as the body goes on), swing lifts it forward
        const q = (b.ph + i * .5) % 1, duty = lerp(.6, .34, clamp((sp - 30) / 70, 0, 1)), reach = duty * L * .5, md = sp > 1 ? [b.vx / sp, b.vy / sp, 0] : fw;
        let along, lift, roll = 0;
        if (q < duty) { const t = q / duty; along = reach * (1 - 2 * t); lift = 0; roll = t > .7 ? -(t - .7) / .3 * .6 : 0; }   // (the heel rises as it pushes off)
        else { const t = (q - duty) / (1 - duty); along = -reach + 2 * reach * ease(t); lift = Math.sin(t * Math.PI) * (2 + run * 3.2) * k; roll = lerp(-.7, .45, t); }   // (toe down off the ground, up to meet it)
        const base = add(add([b.x, b.y, 0], rt, side * (2.1 - run * .5) * k * (1 + b.cr * .25)), md, along * b.amp * Math.min(1, sp / 24));   // (the stride shrinks to nothing as the body turns back through a stop: its way flips there)
        // (the foot on the ground stays where it was put down while the body turns, slows or changes way over it, up
        // to half a stride from where the gait would have it; a swing carries it on from where it left the ground)
        const FW = b.feetW || (b.feetW = [null, null]); let f = FW[i], p = [base[0], base[1]];
        if (q < duty) { if (!f || !f.st) f = FW[i] = { st: true, p }; else p = f.p; }
        else { if (!f || f.st) f = FW[i] = { st: false, from: f ? f.p : p }; const u = ease((q - duty) / (1 - duty)); p = [lerp(f.from[0], p[0], u), lerp(f.from[1], p[1], u)]; }
        { const dx = p[0] - base[0], dy = p[1] - base[1], dd = Math.hypot(dx, dy), lim = (reach * .45 + 1.5 * k) * Math.min(1, b.amp * 1.5);   // (half a stride at most; as the body stops, the feet come in under it)
          if (dd > lim) { p = [base[0] + dx * lim / dd, base[1] + dy * lim / dd]; if (f.st) f.p = p; } }
        A[i] = [p[0], p[1], footZ(p[0], p[1]) + 1.15 * k + lift * b.amp]; toe[i] = nrm(add(add(fw, md, .5), UP, roll * b.amp));
      } else if (b.move === 'stand' || b.move === 'crouch') {   // standing: feet apart, the rear one turned out; crouched: wider, a knee forward
        const S0 = b.stance, now = standFoot(i, S0.yaw, S0.x, S0.y); let base = now.p, lift = 0, tq = now.toe;
        if (S0.t < 1 && S0.from) {   // a step round: lifted, carried, put down
          const u = clamp((S0.t - (i === S0.lead ? 0 : .42)) / .58, 0, 1), was = standFoot(i, S0.from.yaw, S0.from.x, S0.from.y);
          base = mixv(was.p, now.p, ease(u)); lift = Math.sin(u * Math.PI) * 2.3 * k; tq = nrm(mixv(was.toe, now.toe, u));
        }
        A[i] = [base[0], base[1], footZ(base[0], base[1]) + 1.15 * k + lift]; toe[i] = tq;
      }
    }
    // a kick: the right leg snaps out ahead at the waist and back (the torso leans away to balance)
    const kick = b.act === 'kick' ? win(b.actT, .04, .2) * (1 - win(b.actT, .3, .58)) : 0;
    if (kick > 0 && A[1]) A[1] = mixv(A[1], add(add([b.x, b.y, b.z + 9 * k], fw, 12.5 * k), rt, .8 * k), kick), toe[1] = nrm(mixv(toe[1], add(fw, UP, 1.2), kick));
    // the pelvis comes down until both legs reach their feet (a long stride lowers it: the run's bob)
    const pz0 = P[2];
    for (let i = 0; i < 2; i++) if (A[i] && !(kick > 0 && i === 1)) { const hx = P[0] + rt[0] * (i ? 1.85 : -1.85) * k - A[i][0], hy = P[1] + rt[1] * (i ? 1.85 : -1.85) * k - A[i][1], R = (LT + LS) * .985; P[2] = Math.min(P[2], A[i][2] + Math.sqrt(Math.max(0, R * R - hx * hx - hy * hy))); }
    // (the hips go down to the feet on a stiff spring, not at once: a foot held to the ground a little far, then lifted,
    // dropped the hips and sprang them back up in a frame)
    { const drop = pz0 - P[2], D = b.dropS || (b.dropS = { x: drop, v: 0 }); spring(D, drop, 900, 60, dt); P[2] = pz0 - Math.max(0, D.x); }
    // the torso: leaning, twisting toward the aim, curling back on a slide; the head looks along the aim
    const twist = clamp(((b.aimYaw - b.yaw + Math.PI * 3) % TAU) - Math.PI, -1.2, 1.2);
    const lf = b.leanF.x + b.sl * -.55 + b.cr * .18 + b.air * (b.vz > 0 ? .08 : -.05) - kick * .35, ls = b.leanS.x;
    const upT = nrm(add(add(add(UP, fw, lf), rt, ls), [b.jx.x * .05, b.jy.x * .05, 0]));
    const chestYaw = b.yaw + twist * .75, cf = [Math.cos(chestYaw), Math.sin(chestYaw), 0];
    let rtT = nrm(cross(upT, cf)); rtT = nrm(sub(rtT, mul(upT, dot(rtT, upT)))); const fT = nrm(cross(rtT, upT));
    const pitchBend = b.aimPitch * (.42 + b.adsB * .1) * (1 - b.spB);
    const upC = nrm(add(mul(upT, Math.cos(pitchBend)), fT, Math.sin(pitchBend))), fC = nrm(cross(rtT, upC));
    const C = add(add(P, upT, 5.2 * k), [b.jx.x, b.jy.x, b.jz.x]), N = add(C, upC, 4.4 * k), Hd = add(N, nrm(add(upC, fC, Math.sin(b.aimPitch) * .3 + b.spB * .45)), 2.3 * k);   // (a sprint drives the head forward and down)
    const S = [add(add(N, upC, -1.3 * k), rtT, -3.15 * k), add(add(N, upC, -1.3 * k), rtT, 3.15 * k)];
    const Hp = [add(P, rt, -1.85 * k), add(P, rt, 1.85 * k)];
    // ---- the legs: the feet that hang from the body (in the air, vaulting, at a wall, on a cable), then the knees by IK ----
    const feet = [];
    for (let i = 0; i < 2; i++) {
      const side = i ? 1 : -1;
      if (b.move === 'air' || b.move === 'vault') {   // knees up on the way up, reaching down to land
        const up = clamp(b.vz / 110, -1, 1), tuck = b.move === 'vault' ? 1 : .55 + up * .4;
        A[i] = add(add(P, rt, side * 2.1 * k), fw, (i ? 2 : -1.5) * k * (1 - tuck * .4)); A[i][2] = P[2] - (13.2 - tuck * 6.5 - (i ? 1.5 : 0)) * k;
      } else if (b.move === 'mantle' || b.move === 'climb') {   // feet scrabbling at the wall, a knee up
        const tt = drawT * (b.move === 'climb' ? 9 : 4) + i * Math.PI, wn = b.wallN || mul(fw, -1);
        A[i] = add(add([b.x, b.y, b.z], rt, side * 2 * k), wn, -1.2 * k); A[i][2] = b.z + (2 + Math.max(0, Math.sin(tt)) * 5) * k + (b.move === 'mantle' ? (i ? 4 : 1) * k : 0);
      } else if (b.move === 'zip') {   // hanging: legs together, swinging a little
        A[i] = add(add(P, rt, side * 1.4 * k), fw, (1.5 + Math.sin(drawT * 3 + i) * 1.5) * k); A[i][2] = P[2] - 13.4 * k;
      }
    }
    settle(b, 'feetB', walking && b.amp > .02 ? 'gait' : (b.move === 'stand' || b.move === 'crouch') && b.stance ? b.stance : b.move, A, dt);
    for (let i = 0; i < 2; i++) if (A[i]) { const hint = nrm(add(add(fw, rt, (i ? 1 : -1) * .25), UP, -.1)); feet.push({ A: A[i], Kn: ik(Hp[i], A[i], LT, LS, hint)[0], toe: toe[i] }); }
    // ---- the gun and the hands ----
    const G = gunFrame(b, C, N, Hd, upC, fC, rtT);
    const hands = handTargets(b, G, C, Hd, fC, rtT, upC);
    settle(b, 'handsB', b.move === 'ladder' && b.ladder ? 'ladder' : b.move === 'zip' && b.zipP ? 'zip' : b.ledge && (b.move === 'mantle' || b.move === 'climb') ? 'ledge' : 'gun', hands, dt);
    const hintR = nrm(add(add(rtT, upC, -.9 + b.spB * .5), fC, -.3)), hintL = nrm(add(add(rtT, upC, -1.4 + b.spB * .5), fC, -.2 - b.spB * .4));   // (a sprint swings the elbows out)
    const arms = [ik(S[0], hands[0], LU, LF, hintL), ik(S[1], hands[1], LU, LF, hintR)];
    b.J = { P, C, N, Hd, S, Hp, feet, arms, hands, upT, upC, rtT, fT, fC, fw, rt };
    b.G = G;
    if (b.move === 'dead') deadPose(world, b);
  }
  /** where the gun is: low and across the chest at a sprint, at the shoulder (the cheek on the stock down the sights),
   *  dipped for a punch or a throw, tilted for a reload; pushed back by recoil */
  function gunFrame(b, C, N, Hd, upC, fC, rtT) {
    const k = b.k, aim = frameYP([0, 0, 0], b.aimYaw, b.aimPitch);
    let F = { o: add(add(add(N, fC, 3.1 * k), rtT, 3 * k), upC, -3 * k), f: aim.f, u: aim.u, r: aim.r };   // (the stock in the right shoulder's pocket)
    if (b.adsB > .01) F.o = mixv(F.o, add(add(add(Hd, aim.f, 3 * k), aim.u, -2.6 * k), aim.r, 1.2 * k), b.adsB);
    if (b.lowB > .01) { const lo = turn(F, -.32 * b.lowB, .16 * b.lowB, .12 * b.lowB); lo.o = mixv(F.o, add(add(add(C, fC, 2.4 * k), rtT, 4.3 * k), upC, -1.8 * k), b.lowB); F = lo; }   // (the low ready: at the right side, muzzle down, where a camera over the shoulder sees it)
    if (b.spB > .01) {   // a sprint at port arms: the rifle across the chest, muzzle up past the left shoulder, swinging with the stride
      // (the rifle rises against world up: the torso leans into the run)
      const sw = Math.sin(b.ph * TAU) * b.amp, pf = nrm(add(add(mul(rtT, -.5), UP, .87 + sw * .05), fC, .04)), pu = nrm(sub(fC, mul(pf, dot(fC, pf))));
      const f = nrm(mixv(F.f, pf, b.spB)), u0 = mixv(F.u, pu, b.spB), u = nrm(sub(u0, mul(f, dot(u0, f))));
      F = { o: mixv(F.o, add(add(add(C, fC, 3.2 * k), rtT, (2.4 + sw * .3) * k), upC, 1.6 * k), b.spB), f, u, r: cross(u, f) };   // (high port arms: from behind, the barrel's top stands clear beside and above the helmet)
    }
    if (b.move === 'slide') F = turn(F, 0, 0, -.35 * b.sl);
    const a = b.act;
    if (a) {
      const t = b.actT;
      if (a === 'reload') { const R = reloadCurve(b.weapon, t, b.reloadDur, b.reloadEmpty); F = turn(F, R.pitch, R.yaw, R.roll); F.o = add(F.o, F.u, R.lift * k); }
      else if (a === 'melee' || a === 'throw' || a === 'kick') { const d = a === 'melee' ? win(t, 0, .07) * (1 - win(t, .32, .5)) : win(t, 0, .12) * (1 - win(t, .4, .6)); F = turn(F, -.7 * d, .5 * d, .6 * d); F.o = add(add(F.o, F.r, 1.5 * d * k), F.u, -2.2 * d * k); }
      else if (a === 'swap') { const d = Math.sin(Math.min(1, t / .5) * Math.PI); F = turn(F, -1.1 * d, 0, .3 * d); F.o = add(F.o, F.u, -3 * d * k); }
    }
    if (b.trB > .01) { const d = b.trB, o = F.o; F = turn(F, -1.3 * d, .9 * d, .3 * d); F.o = mixv(o, add(add(C, rtT, 2 * k), [0, 0, -3 * k]), d); }   // (slung for a climb, eased)
    if (b.move === 'zip') { F.o = add(add(C, fC, 3 * k), rtT, 2 * k); }
    F.o = add(F.o, F.f, -b.rec.x * 1.1 * k);
    if (b.rec.x) F = turn(F, b.rec.x * .06, 0, 0);
    return F;
  }
  /** the hands: right on the grip, left on the handguard (or the mag, the pump, the ledge, a rung, the cable, a punch) */
  function handTargets(b, G, C, Hd, fC, rtT, upC) {
    const k = b.k, W = WEAPONS[b.weapon];
    let R = at(G, -.5 * k, -1.5 * k, 0), Lh = at(G, (W.fore - (b.gun ? b.gun.pump || 0 : 0) * 2.3) * k, -.35 * k, -.2 * k);
    const a = b.act, t = b.actT;
    if (a === 'reload') { const R2 = reloadCurve(b.weapon, t, b.reloadDur, b.reloadEmpty); if (R2.hand) Lh = at(G, R2.hand[0] * k, R2.hand[1] * k, R2.hand[2] * k); }
    if (a === 'melee') {   // the left fist: back, then out across the front at chest height, then home
      const wind = win(t, 0, .045), hit = win(t, .045, .085), back = win(t, .16, .38), aim = [Math.cos(b.aimYaw), Math.sin(b.aimYaw), Math.sin(b.aimPitch) * .6];
      const cock = add(add(C, rtT, -3.5 * k), fC, -.5 * k), strike = add(add(C, aim, 9 * k), upC, 1.6 * k);
      Lh = mixv(mixv(mixv(Lh, cock, wind), strike, hit), Lh, back);
    }
    if (a === 'throw') { const wind = win(t, .1, .35), rel = win(t, .35, .48), back = win(t, .55, .75); Lh = mixv(mixv(mixv(Lh, add(add(Hd, rtT, -3.2 * k), fC, -3 * k), wind), add(add(Hd, fC, 8 * k), upC, 1.5 * k), rel), Lh, back); }
    if (b.ledge && (b.move === 'mantle' || b.move === 'climb')) {
      const e = b.ledge, wn = b.wallN || [0, 0, 0], sd = nrm(cross(UP, wn)), up = b.move === 'climb' ? drawT * 7 : 0;
      const hl = add(add(e, sd, 2.4 * k), wn, .6), hr = add(add(e, sd, -2.4 * k), wn, .6);
      if (b.move === 'climb') { hl[2] = Math.min(e[2], Hd[2] + 2 + Math.max(0, Math.sin(up)) * 4); hr[2] = Math.min(e[2], Hd[2] + 2 + Math.max(0, Math.sin(up + Math.PI)) * 4); }
      Lh = hl; R = hr;
    }
    if (b.move === 'ladder' && b.ladder) {
      const Ld = b.ladder, f = [Math.cos(Ld.yaw), Math.sin(Ld.yaw), 0], s = [-f[1], f[0], 0], base = [Ld.x, Ld.y, 0], step = .3 * M;
      const rung = i => { const z = Math.floor((Hd[2] + (i ? step / 2 : 0)) / step) * step + (i ? 0 : step / 2); return add(add(base, s, (i ? 1 : -1) * .24 * M), [0, 0, Math.min(Ld.z1 + .8 * M, z)]); };
      Lh = rung(0); R = rung(1);
    }
    if (b.move === 'zip' && b.zipP) Lh = b.zipP;
    return [Lh, R];
  }
  /** a death: the knees fold and the pelvis drops (a little the shot's way), then the body falls back from the hips
   *  until it lies on the ground, the arms going limp; the gun leaves the hands and clatters down beside it */
  function deadPose(world, b) {
    const D = b.dead, t = D.t, k = b.k, J = b.J, g = D.g ?? b.z, dir = [Math.cos(D.dir), Math.sin(D.dir), 0], axis = nrm(cross(UP, dir));
    const sink = ease(win(t, 0, .4)), fall = clamp((t - .16) / .52, 0, 1), phi = fall * fall * 1.5 + Math.sin(clamp((t - .68) / .22, 0, 1) * Math.PI) * .07;
    const P0 = J.P, P = mixv(P0, [P0[0] + dir[0] * 4 * k, P0[1] + dir[1] * 4 * k, g + 2.4 * k], sink), dP = sub(P, P0);
    const c = Math.cos(phi), sn = Math.sin(phi), tilt = v => add(add(mul(v, c), cross(axis, v), sn), axis, dot(axis, v) * (1 - c));
    const rot = q => { const o = add(add(P0, tilt(sub(q, P0))), dP); o[2] = Math.max(o[2], g + 1.3 * k); return o; };
    if (!D.G0 && b.G) D.G0 = { o: b.G.o.slice(), f: b.G.f.slice(), u: b.G.u.slice(), r: b.G.r.slice() };
    for (const key of ['C', 'N', 'Hd']) J[key] = rot(J[key]);
    J.P = P; J.S = J.S.map(rot); J.Hp = J.Hp.map(q => add(q, dP));
    for (const key of ['upT', 'upC', 'fT', 'fC', 'rtT']) J[key] = tilt(J[key]);
    // the legs: the feet stay where they stood, the knees fold up between
    J.feet = [0, 1].map(i => { const side = i ? 1 : -1, A = add(add([b.x, b.y, g + 1.15 * k], J.rt, side * (2.3 + sink) * k), J.fw, (i ? 1 : -1) * sink * 1.5 * k); return { A, Kn: ik(J.Hp[i], A, 7.4 * k, 7.1 * k, nrm(add(add(J.fw, UP, .5), J.rt, side * .4)))[0], toe: nrm(add(J.fw, J.rt, side * .5)) }; });
    // the arms: on the gun until it drops, then limp beside the body, on the ground
    const let_go = win(t, .22, .5), held = J.hands.map(rot), limp = [0, 1].map(i => { const h = add(add(J.S[i], J.rtT, (i ? 1 : -1) * 3.5 * k), J.upC, -4.5 * k); h[2] = Math.max(g + 1.1 * k, h[2] - let_go * 6 * k); return h; });
    J.hands = held.map((h, i) => mixv(h, limp[i], let_go));
    J.arms = [0, 1].map(i => ik(J.S[i], J.hands[i], 4.9 * k, 4.7 * k, nrm(add(mul(J.upC, -1), J.rtT, (i ? 1 : -.4)))));
    // the gun: turning with the body, then falling free to lie on its side
    const G0 = D.G0; if (!G0) return;
    if (t < .24) b.G = { o: rot(G0.o), f: tilt(G0.f), u: tilt(G0.u), r: tilt(G0.r) };
    else {
      if (!D.Gd) { const c2 = Math.cos(phi), s2 = Math.sin(phi), tl = v => add(add(mul(v, c2), cross(axis, v), s2), axis, dot(axis, v) * (1 - c2)); D.Gd = { o: rot(G0.o), f: tl(G0.f), r: tl(G0.r) }; }
      const u = t - .24, Gd = D.Gd, fl = nrm([Gd.f[0], Gd.f[1], 0]), s = win(u, 0, .32), o = add(Gd.o, [dir[0] * Math.min(u, .4) * 18, dir[1] * Math.min(u, .4) * 18, 0]);
      o[2] = Math.max(g + .8 * k, Gd.o[2] - .5 * GRAV * u * u);
      const f = nrm(mixv(Gd.f, fl, s)), r = nrm(mixv(Gd.r, UP, s)); b.G = { o, f, r, u: nrm(cross(f, r)) };
    }
  }

  /* ---- drawing a soldier with the pen (engine units, the pen's frame at the origin) ---- */
  function drawSoldier(pen, b) {
    const J = b.J; if (!J) return;
    const c = b.look, k = b.k, tube = (a, e, r, col) => pen.tube(a[0], a[1], a[2], e[0], e[1], e[2], r * k, col), ball = (p, r, col) => pen.ball(p[0], p[1], p[2], r * k, r * k, r * k, col);
    const slab = (a, e, ac, w, t, col) => pen.slab(a[0], a[1], a[2], e[0], e[1], e[2], ac[0], ac[1], ac[2], w * k, t * k, col);
    pen.flash = b.flash > 0;
    // legs: boots, shins with guards, knee pads, thighs, a holster
    J.feet.forEach(({ A, Kn, toe }, i) => {
      const fr = nrm(cross(toe, UP)), heel = add(add(A, toe, -1.3 * k), UP, -.55 * k), tip = add(add(A, toe, 2.5 * k), UP, -.75 * k);
      slab(heel, tip, fr, 2.1, 1.7, c.boot); slab(add(heel, UP, -.6 * k), add(tip, UP, -.55 * k), fr, 2.2, .45, c.dark);
      const lf = nrm(sub(Kn, A)), legF = nrm(cross(fr, lf)).map(v => -v);
      tube(A, Kn, 1.28, c.cloth); slab(add(add(A, lf, 1.6 * k), legF, .9 * k), add(Kn, legF, .9 * k), fr, 1.7, .55, c.plate);
      ball(add(Kn, legF, .55 * k), 1.38, c.dark);
      tube(Kn, J.Hp[i], 1.75, c.cloth);
      if (i === 1) slab(add(lerpP(Kn, J.Hp[i], .55), fr, -1.4 * k), add(lerpP(Kn, J.Hp[i], .88), fr, -1.5 * k), lf, 1.5, 1, c.dark);
    });
    // the belt, the torso, its plate and pouches, the pack
    const { P, C, N, Hd, upT, upC, rtT, fT, fC } = J;
    slab(add(P, rtT, -2.5 * k), add(P, rtT, 2.5 * k), fT, 3.6, 2.6, c.dark);
    for (const s of [-1.3, 0, 1.3]) slab(add(add(add(P, rtT, s * k), fT, 1.9 * k), upT, -.2 * k), add(add(add(P, rtT, s * k), fT, 1.9 * k), upT, 1.1 * k), rtT, 1.1, .9, c.pack);
    slab(add(P, upT, .6 * k), add(N, upC, -.6 * k), rtT, 6.0, 3.7, c.cloth);
    slab(add(add(P, upT, 3.2 * k), fC, 1.75 * k), add(add(N, upC, -1.1 * k), fC, 1.6 * k), rtT, 5.3, 1.1, c.plate);
    for (const s of [-1.6, 0, 1.6]) slab(add(add(add(P, upT, 3.6 * k), fC, 2.4 * k), rtT, s * k), add(add(add(P, upT, 5.4 * k), fC, 2.4 * k), rtT, s * k), rtT, 1.3, .8, s ? c.pack : c.accent);
    slab(add(add(P, upT, 2.6 * k), fC, -2.6 * k), add(add(N, upC, -1.2 * k), fC, -2.8 * k), rtT, 4.6, 2.3, c.pack);
    if (!c.dummy) slab(add(add(N, upC, -1.4 * k), fC, -4 * k), add(add(N, upC, 1.6 * k), fC, -3.6 * k), rtT, .4, .4, c.dark);   // a radio's aerial
    // arms: pads, sleeves, gloves
    J.arms.forEach(([El, Hn], i) => { const Sh = J.S[i]; ball(Sh, 1.85, c.plate); tube(Sh, El, 1.22, c.cloth); ball(El, 1.15, c.dark); tube(El, Hn, 1.08, c.cloth); tube(lerpP(El, Hn, .55), Hn, 1.16, c.glove); ball(Hn, 1.1, c.glove); });
    // the neck and head: a helmet with a visor (the raiders: a pale mask with eyes that glow)
    tube(N, Hd, .95, c.dark);
    const hf = nrm(sub(Hd, N)), hfw = nrm(add(fC, hf, -dot(fC, hf))), hr = nrm(cross(hf, hfw));
    ball(add(Hd, hfw, .5 * k), 1.75, c.skin);
    if (c.mask) {
      ball(add(Hd, hf, .3 * k), 2.05, c.cloth); ball(add(add(Hd, hfw, 1.2 * k), hf, -.1 * k), 1.55, c.helmet);
      for (const s of [-1, 1]) pen.glow(...add(add(add(Hd, hfw, 2.55 * k), hr, s * .62 * k), hf, .25 * k), .32 * k, c.visor);
    } else {
      ball(add(Hd, hf, .45 * k), 2.15, c.helmet); slab(add(add(Hd, hf, 1.9 * k), hfw, -1.6 * k), add(add(Hd, hf, 2.35 * k), hfw, 1.2 * k), hr, 1.2, .5, c.dark);
      slab(add(add(add(Hd, hfw, 1.85 * k), hr, -1.25 * k), hf, .45 * k), add(add(add(Hd, hfw, 1.85 * k), hr, 1.25 * k), hf, .45 * k), hf, .95, .45, c.visor);
      for (const s of [-1, 1]) ball(add(add(Hd, hr, s * 2 * k), hf, .2 * k), .75, c.dark);
      if (c.dummy) pen.glow(...add(add(Hd, hfw, 2.2 * k), hf, .45 * k), .35 * k, c.visor);
    }
    if (b.G) drawGun(pen, b.G, b.weapon, b.gun || GUN0, k);
    pen.flash = false;
  }
  const lerpP = (a, e, t) => [a[0] + (e[0] - a[0]) * t, a[1] + (e[1] - a[1]) * t, a[2] + (e[2] - a[2]) * t];
  const GUN0 = { mag: 0, bolt: 0, pump: 0, flash: 0 };
  /** a gun in its frame (o: the grip's top, f along the barrel, u up, r right): the RANGER rifle (a holo sight, a curved
   *  mag, a two-tone handguard) or the BREACHER pump shotgun; st: { mag (0 in, 1 in the hand at st.magP, 2 out), bolt
   *  (the charging handle pulled 0..1), pump (0..1), flash (0..1), shell (a shell in the hand at st.shellP) } */
  function drawGun(pen, F, weapon, st, k = 1) {
    const L = (a, b2, c2 = 0) => at(F, a * k, b2 * k, c2 * k), slab = (a, e, ac, w, t, col) => pen.slab(a[0], a[1], a[2], e[0], e[1], e[2], ac[0], ac[1], ac[2], w * k, t * k, col);
    const tube = (a, e, r, col) => pen.tube(a[0], a[1], a[2], e[0], e[1], e[2], r * k, col);
    if (weapon === 'rifle') {
      const BODY = '#2e3138', TAN = '#a99472', DK = '#1c1e22';
      slab(L(-2.4, .55), L(3.6, .55), F.r, .9, 1.5, BODY); slab(L(-2.1, 1.42), L(3.7, 1.42), F.r, .55, .26, DK);
      slab(L(3.6, .42), L(8.7, .42), F.r, 1.02, 1.26, TAN); for (const a of [4.6, 5.9, 7.2]) slab(L(a, .3, .53), L(a + .7, .3, .53), F.u, .45, .08, DK);
      tube(L(8.6, .55), L(11.3, .55), .27, DK); tube(L(11.1, .55), L(12.3, .55), .46, BODY); slab(L(8.25, 1.05), L(8.25, 1.75), F.r, .22, .3, DK);
      slab(L(-.2, -.15), L(-1.05, -2.55), F.r, .82, 1.15, DK); slab(L(.2, -.25), L(1.7, -.3), F.r, .25, .2, DK);
      slab(L(-2.4, .62), L(-6.3, .3), F.r, .82, 1.65, BODY); slab(L(-6.45, -.5), L(-6.45, 1.35), F.r, .98, .5, DK); slab(L(-4.6, 1.1), L(-2.6, 1.32), F.r, .62, .42, DK);
      slab(L(.4, .85, .5), L(1.6, .85, .5), F.u, .55, .1, '#45484e');
      const ch = L(-1.5 - (st.bolt || 0) * 1.9, .95, .48); slab(ch, add(ch, F.r, .42 * k), F.f, .3, .24, DK);
      // the holo sight: a base, a frame of four bars, its reticle (seen through it down the sights)
      slab(L(.1, 1.62), L(2.2, 1.62), F.r, .82, .34, DK);
      for (const s of [-1, 1]) slab(L(1.55, 1.75, s * .48), L(1.55, 2.95, s * .48), F.f, .5, .14, DK);
      slab(L(1.55, 3.0, -.55), L(1.55, 3.0, .55), F.f, .5, .16, DK); slab(L(.5, 1.8, -.4), L(.5, 2.35, -.4), F.f, .4, .1, DK); slab(L(.5, 1.8, .4), L(.5, 2.35, .4), F.f, .4, .1, DK);
      pen.glow(...L(1.6, 2.32), .045 * k, '#ff5a3a'); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; pen.glow(...L(1.6, 2.32 + Math.sin(a) * .3, Math.cos(a) * .3), .022 * k, '#ff4a2a'); }   // (the holo's dot and ring)
      // the magazine: in the well, in the hand, or gone
      if (st.mag !== 2) {
        const mF = st.mag === 1 && st.magP ? { o: st.magP, f: F.f, u: F.u, r: F.r } : { o: L(2.5, -.25), f: F.f, u: F.u, r: F.r };
        const M2 = (a, b2) => at(mF, a * k, b2 * k), m0 = M2(0, 0), m1 = M2(.45, -2.3), m2 = M2(1.15, -3.6);
        slab(m0, m1, F.r, .78, 1.38, BODY); slab(m1, m2, F.r, .78, 1.3, BODY); slab(M2(.95, -3.4), M2(1.4, -3.95), F.r, .9, 1.45, DK);
      }
      if (st.flash > 0) muzzleFlash(pen, L(12.6, .55), F, st.flash, k);
    } else {
      const BODY = '#34363c', WOOD = '#8a5a36', DK = '#1e2024';
      slab(L(-2.1, .5), L(3.1, .5), F.r, 1.05, 1.65, BODY); for (let i = 0; i < 4; i++) tube(L(-1.2 + i * .75, .9, .6), L(-1.2 + i * .75, -.1, .6), .26, '#c83a2a');
      tube(L(3, .95), L(13.6, .95), .4, DK); tube(L(3, .1), L(12.2, .1), .34, BODY); tube(L(12.9, .95), L(13.7, .95), .48, BODY);
      const pu = (st.pump || 0) * 2.3; slab(L(5.4 - pu, -.05), L(9.6 - pu, -.05), F.r, 1.25, 1.15, WOOD); for (const a of [6, 7, 8, 9]) slab(L(a - pu, -.05, .64), L(a + .3 - pu, -.05, .64), F.u, 1, .06, '#5a3a22');
      slab(L(-2.1, .2), L(-6.7, -.85), F.r, .92, 1.6, WOOD); slab(L(-6.85, -1.75), L(-6.85, .1), F.r, 1, .5, DK);   // (the stock drops below the sight line)
      slab(L(-1.3, -.3), L(-2.4, -2.1), F.r, .85, 1.1, WOOD); slab(L(.2, -.35), L(1.6, -.35), F.r, .25, .2, DK);
      slab(L(2.4, 1.4), L(2.9, 1.4), F.r, .7, .3, DK); pen.glow(...L(13.3, 1.42), .11 * k, '#ffe08a');
      if (st.shellP) tube(st.shellP, add(st.shellP, F.f, 1.2 * k), .3 * k, '#c83a2a');
      if (st.flash > 0) muzzleFlash(pen, L(14, .95), F, st.flash, k * 1.45);
    }
  }
  /** a muzzle flash at p (the gun's frame F, flash 1 on the shot's frame fading to 0 by the next but one), queued for
   *  the world's flashes or the overlay's (drawFlashes) by the pen that draws the gun */
  function muzzleFlash(pen, p, F, s, k) {
    const q = pen === world.overlay.pen ? fx.flashes.ov : fx.flashes.world; if (q.length >= FL_MAX) return;
    const full = s > .6, seed = (Math.imul(Math.floor(world.time * 240) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(Math.floor(Math.abs(p[0] * 13 + p[1] * 7)), 0xc2b2ae35)) >>> 1 || 1;
    q.push({ p: p.slice(), f: F.f.slice(), s: 1.7 * k * (full ? 1 : .75) * (s > 1 ? s : 1), heat: full ? 1 : .5, seed });
  }

  /* =====================================================================
   * WEAPONS: the RANGER rifle (automatic, a holo sight, a curved mag) and the BREACHER shotgun (a pump, nine pellets);
   * hitscan from the eye with spread (wider moving, in the air, from the hip; it blooms as you fire), recoil that climbs
   * (part of it comes back when you stop), damage that falls off with range, shields before health, headshots
   * ===================================================================== */
  const WEAPONS = {
    rifle: { name: 'RANGER AR', mag: 28, reserve: 196, rate: 13, auto: true, pellets: 1, dmg: 14, head: 1.75, far: 260 * M, fall: [45 * M, 140 * M, .72], hip: .03, adsSpread: .0025, bloom: .004, maxBloom: .03,
      kick: [.0105, .0046], fore: 6.2, adsFov: 50, reload: 1.75, reloadEmpty: 2.35, sound: 'ar', shake: .9, punch: 1.1 },
    shotgun: { name: 'BREACHER', mag: 6, reserve: 30, rate: 1.25, auto: false, pellets: 9, dmg: 11, head: 1.3, far: 70 * M, fall: [8 * M, 24 * M, .35], hip: .075, adsSpread: .052, bloom: 0, maxBloom: 0,
      kick: [.055, .012], fore: 7.3, adsFov: 62, shell: .5, sound: 'sg', shake: 3, punch: 4.5 }
  };
  // the rifle's recoil: up each shot, side to side in a fixed pattern (learnable), then a wander
  const PATTERN = [0, .3, .6, .4, 0, -.5, -.8, -.6, -.2, .3, .8, 1, .6, .1, -.4, -.9, -1, -.5, 0, .5, .9, .7, .2, -.3, -.7, -.4, 0, .4];
  let world = null, hero = null, pb = null, S = null, rnd = Math.random;   // pb: the player's body (its pose and gun)
  const raiders = [], loot = [], nades = [];
  /** a reload's shape over time t (seconds): how the gun tilts (pitch, yaw, roll), lifts, where the left hand is (in the
   *  gun's own frame), the magazine (0 in, 1 in the hand, 2 out), the charging handle, a shell in the hand */
  function reloadCurve(weapon, t, dur, empty) {
    const W = WEAPONS[weapon], hg = [W.fore, -.35, -.2];
    if (weapon === 'rifle') {
      const tilt = win(t, 0, .18) * (1 - win(t, dur - .25, dur));
      const keys = [[0, hg], [.18, hg], [.38, [2.8, -2.6, -.7]], [.55, [3.4, -5.4, -1.3]], [.66, [2, -6, -2.3]], [.8, [2.4, -5, -1.5]], [1.02, [2.9, -3.2, -.7]], [1.1, [2.9, -2.3, -.6]]];
      if (empty) keys.push([1.25, [-1.2, 1.4, 1.5]], [1.42, [-1.6, 1.25, 1.2]], [1.55, [-3.6, 1.25, 1.2]], [1.66, [-3.2, 1.6, 1.6]], [2.0, hg]); else keys.push([1.45, hg]);
      let hand = hg; for (let i = 0; i < keys.length - 1; i++) if (t >= keys[i][0]) hand = mixv(keys[i][1], keys[i + 1][1], win(t, keys[i][0], keys[i + 1][0]));
      if (t >= keys[keys.length - 1][0]) hand = keys[keys.length - 1][1];
      const mag = t < .38 ? 0 : t < .6 ? 1 : t < .64 ? 2 : t < 1.05 ? 1 : 0, bolt = empty ? win(t, 1.42, 1.55) * (1 - win(t, 1.6, 1.68)) : 0;
      const seat = win(t, 1.03, 1.07) * (1 - win(t, 1.07, 1.22));   // (the new mag seated: a jolt up)
      return { pitch: .32 * tilt + .04 * seat, yaw: -.2 * tilt, roll: .85 * tilt, lift: 1.8 * tilt + .8 * seat, hand, mag, bolt };   // (turned to show the well: the old mag out, the new one in)
    }
    // the shotgun: tilt in, a shell at a time (from the side saddle into the port under the receiver), tilt out
    const n = Math.round((dur - .3) / W.shell), tilt = win(t, 0, .15) * (1 - win(t, dur - .15, dur)), c = clamp(t - .15, 0, n * W.shell), q = (c % W.shell) / W.shell;
    let hand = q < .35 ? mixv([.4, .5, 1.2], [-.6, .3, 1.1], win(q, 0, .35)) : q < .75 ? mixv([-.6, .3, 1.1], [1.6, -1.2, .3], win(q, .35, .75)) : mixv([1.6, -1.2, .3], [.4, .5, 1.2], win(q, .75, 1));
    hand = mixv(hg, hand, tilt);
    return { pitch: .12 * tilt, yaw: -.1 * tilt, roll: .65 * tilt, lift: .8 * tilt, hand, mag: 0, bolt: 0, shell: tilt > .5 && q > .3 && q < .75 };
  }
  /** the pump's travel after a shot (0..1: back and forward again) */
  const pumpCurve = t => win(t, .08, .2) * (1 - win(t, .26, .4));
  /** the shot's damage at distance d (falloff between fall[0] and fall[1] down to fall[2]) */
  const falloff = (W, d) => lerp(1, W.fall[2], clamp((d - W.fall[0]) / (W.fall[1] - W.fall[0]), 0, 1));
  /** fire the current weapon from the eye (eye: [x, y, z], aim: the frame of the view). Hitscan: every pellet a ray */
  function fire(eye, F, muzzle) {
    const W = WEAPONS[S.cur], am = S.ammo[S.cur];
    if (am[0] <= 0) { A.sfx('empty'); S.fireCd = .25; if (am[1] > 0) startReload(); return; }
    am[0]--; S.fireCd = 1 / W.rate; S.lastShot = S.time; S.shots++;
    const moving = Math.hypot(hero.vx, hero.vy), sp = lerp(W.hip, W.adsSpread, S.adsB) + (W.pellets > 1 ? 0 : clamp(moving / RUN, 0, 1) * .03 * (1 - S.adsB * .7) + (hero.grounded ? 0 : .05) + S.bloom);
    S.bloom = Math.min(W.maxBloom, S.bloom + W.bloom);
    let mark = null;   // (the strongest of what the pellets did: a kill, a shield broken, a head, flesh, shield)
    for (let p = 0; p < W.pellets; p++) {
      // a pellet's way: the pattern ring for the shotgun (fixed, so it reads), random within the spread for the rifle
      const a = W.pellets > 1 ? (p ? (p - 1) / (W.pellets - 1) * TAU + S.shots : 0) : rnd() * TAU, rr = W.pellets > 1 ? (p ? sp * (.55 + .45 * (p % 2)) : 0) + rnd() * sp * .2 : Math.sqrt(rnd()) * sp;
      const d = nrm(add(add(F.f, F.r, Math.cos(a) * rr), F.u, Math.sin(a) * rr));
      const h = world.ray(eye[0], eye[1], eye[2], d[0], d[1], d[2], W.far, { skip: hero });
      const end = h ? [h.x, h.y, h.z] : add(eye, d, W.far);
      if (p < 3 || p % 3 === 0) tracer(muzzle, end, W.pellets > 1 ? '#ffd0a0' : '#ffe2a0', W.pellets > 1 ? 7000 : 9000, W.pellets > 1 ? .35 : .45);
      if (!h) continue;
      const e = h.actor && raiders.find(r => r.a === h.actor);
      if (e && e.alive) {
        const head = h.z > e.a.z + (e.b.move === 'crouch' ? 15 : 22.5) * e.b.k, dmg = W.dmg * falloff(W, h.dist) * (head ? W.head : 1);
        const res = hurtRaider(e, dmg, head, d, [h.x, h.y, h.z]); mark = strongest(mark, res === 'hit' && head ? 'head' : res);
      } else impact(h, W.pellets > 1 ? .5 : 1);
    }
    if (mark) hitmark(mark);
    // the kick: the view climbs (part of it comes back after), the gun and the camera punch
    const kk = S.cur === 'rifle' ? PATTERN[Math.min(S.burst, PATTERN.length - 1)] : (rnd() - .5) * 2, damp = 1 - S.adsB * .25 - (S.move === 'crouch' ? .15 : 0);
    const kp = W.kick[0] * damp * (S.cur === 'rifle' ? (S.burst < 4 ? 1.2 : S.burst < 9 ? .7 : .4) : 1), ky = W.kick[1] * kk * damp;   // (the climb settles after the first shots)
    S.pitch = clamp(S.pitch + kp, -1.45, 1.45); S.yaw += ky; S.recP += kp * .6; S.recY += ky * .3; S.burst++;
    S.kicks.push([W.punch, kk]);
    pb.rec.v += S.cur === 'rifle' ? 34 : 70; S.flash = 1; S.fovK = 1;
    game.shake(W.shake * (1 - S.adsB * .4));
    A.sfx(W.sound, { vary: .06 });
    if (S.cur === 'shotgun') S.pumpT = 0;
    alertNear(hero.x, hero.y, 130 * M, 'shot');
    if (am[0] === 0 && am[1] > 0) S.autoReload = .25;
  }
  /** a shot meeting the world: dust or chips by the surface, a hole, a ricochet's sparks off metal */
  function impact(h, k = 1) {
    const metal = !!h.prop && h.prop.isBlock, n = [h.nx, h.ny, h.nz], ang = Math.atan2(h.ny, h.nx);
    if (h.ground) { P.dust(h.x, h.y, h.z, Math.round(3 * k) + 1, { speed: 26, color: '#b8a07a', size: 1.4 }); P.bits(h.x, h.y, h.z, Math.round(2 * k), ['#8a7050', '#a88a64']); }
    else { P.sparks(h.x, h.y, h.z, Math.round(4 * k) + 1, ang, { color: '#ffd080' }); P.dust(h.x, h.y, h.z, 2, { speed: 20, color: '#c8c0b0', size: 1.1 }); }
    P.add({ kind: 'impact', x: h.x + h.nx, y: h.y + h.ny, z: h.z + h.nz, max: .12, size: 2.2 * k, color: '#ffc870' });
    decal([h.x, h.y, h.z], n, h.ground ? 1.1 : .8, metal ? '#141216' : '#1a1510', h.ground ? .7 : .92);
  }
  /** damage to a raider: its shield first (a crack of blue; it breaks with a burst and a stagger), then health; a hit
   *  jolts it away from the shot, a kill throws it down that way. Returns 'shield', 'break', 'hit' or 'kill' */
  function hurtRaider(e, dmg, head, d, p, melee = false) {
    if (!e.alive) return null;
    let res = 'hit', toShield = Math.min(e.shield, dmg); e.shield -= toShield; let rest = dmg - toShield;
    if (toShield > 0) { res = e.shield <= 0 ? 'break' : 'shield'; if (!melee) { P.sparks(p[0], p[1], p[2], 3, Math.atan2(-d[1], -d[0]), { color: e.heavy ? '#c88aff' : '#7ac8ff', hot: '#e8f6ff' }); impactStar(p, d, res === 'break' ? 3.2 : 1.1, e.heavy ? 'purple' : 'blue'); } }
    if (res === 'break') { rest *= .5; e.stun = .5; P.glints(p[0], p[1], p[2], 10, e.heavy ? '#d8a8ff' : '#a8e0ff', 14); A.sfx('shieldbreak'); }
    e.hp -= rest; e.lastHit = S.time; e.flinch = Math.max(e.flinch, melee ? .5 : head ? .3 : .16);
    e.b.leanF.x -= melee ? .24 : head ? .1 : .04; e.b.leanS.x += (S.shots % 2 ? 1 : -1) * (melee ? .2 : .05); e.hitNew = true;   // (rocked back by the blow and aside, at once: a hit-stop shows it)
    const push = melee ? 9 : head ? 5 : 2.6; e.b.hit[0] += d[0] * push * 20; e.b.hit[1] += d[1] * push * 20; e.b.hit[2] += head ? 30 : 0;
    dmgNumber(p, dmg, head, toShield > 0 && res !== 'break' ? (e.heavy ? '#d8a8ff' : '#8ad8ff') : null);
    if (toShield > 0 && res !== 'break') A.sfx('shieldhit', { vol: .8 });
    else A.sfx(head ? 'headshot' : 'tick', { vol: .9 });
    awake(e, 'hit');
    if (e.hp <= 0) { kill(e, d); return 'kill'; }
    return res;
  }
  /** a raider down: it falls the shot's way, drops loot, counts toward its outpost */
  function kill(e, d) {
    e.alive = false; e.b.move = 'dead'; e.b.dead = { t: 0, dir: Math.atan2(d[1], d[0]) + (rnd() - .5) * .6, g: e.a.z }; e.a.setSolid(false); e.a.vx = e.a.vy = 0;
    e.deadT = 0; A.sfx('kill'); S.kills++; S.feed.unshift({ text: (e.dummy ? 'TARGET' : e.heavy ? 'HEAVY RAIDER' : 'RAIDER') + ' DOWN', t: 4 }); S.feed.length = Math.min(S.feed.length, 4);
    if (!e.dummy) {
      dropLoot(e.a.x, e.a.y, e.a.z, rnd() < .55 ? 'ammo_' + (rnd() < .7 ? 'r' : 's') : 'cell');
      const o = OP[e.op]; o.left--; if (o.left === 0) outpostCleared(o);
    }
  }
  /** an explosion at (x, y, z): damage and a push falling off over r (blocked by walls), fire, smoke, a scorch, a shake */
  function explode(x, y, z, r = 7 * M, dmg = 110) {
    A.sfx('boom'); P.fire(x, y, z + 2, 22, { size: 7, speed: 70 }); P.smoke(x, y, z + 4, 10, { size: 8, color: '#5a5048' }); P.sparks(x, y, z + 2, 16); P.ring(x, y, 4, r * .8, '#ffc870', .35, z + 1);
    S.boom = { x, y, z, t: .35 };
    decal([x, y, z], [0, 0, 1], 3.2 * M / 16 * 1.8, '#18120c', .85);
    for (const e of raiders) {
      if (!e.alive) continue; const dd = Math.hypot(e.a.x - x, e.a.y - y, e.a.z + 14 - z); if (dd > r || !world.clear(x, y, z + 6, e.a.x, e.a.y, e.a.z + 16)) continue;
      const d = nrm([e.a.x - x, e.a.y - y, 6]), res = hurtRaider(e, dmg * (1 - dd / r), false, d, [e.a.x, e.a.y, e.a.z + 16]); if (res) hitmark(res);
      e.a.push(d[0] * 160 * (1 - dd / r), d[1] * 160 * (1 - dd / r), 0);
    }
    const dp = Math.hypot(hero.x - x, hero.y - y, hero.z + 14 - z);
    if (dp < r && world.clear(x, y, z + 6, hero.x, hero.y, hero.z + 16)) { hurtPlayer(dmg * .6 * (1 - dp / r), x, y); const d = nrm([hero.x - x, hero.y - y, 0]); hero.vx += d[0] * 180 * (1 - dp / r); hero.vy += d[1] * 180 * (1 - dp / r); hero.vz = Math.max(hero.vz, 90 * (1 - dp / r)); }
    game.shake(clamp(9 - dp / M * .3, 1, 9)); alertNear(x, y, 160 * M, 'boom');
  }
  /** grenades in flight: gravity, bounces off what they meet (a ray along each step), a fuse */
  function stepNades(dt) {
    for (let i = nades.length - 1; i >= 0; i--) {
      const g = nades[i]; g.t += dt; g.vz -= GRAV * dt; g.spin += dt * 12;
      const dx = g.vx * dt, dy = g.vy * dt, dz = g.vz * dt, L = Math.hypot(dx, dy, dz);
      const h = L > 1e-4 ? world.ray(g.x, g.y, g.z, dx, dy, dz, L + 1.2, { skip: hero }) : null;
      if (h && !h.actor) {   // bounce: reflect about the surface, lose most of the speed
        const n = [h.nx, h.ny, h.nz], v = [g.vx, g.vy, g.vz], vn = dot(v, n), r = add(v, n, -2 * vn);
        g.vx = r[0] * .45; g.vy = r[1] * .45; g.vz = r[2] * .38; g.x = h.x + h.nx * 1.3; g.y = h.y + h.ny * 1.3; g.z = h.z + h.nz * 1.3;
        if (Math.abs(vn) > 40) A.sfx('clink', { vol: clamp(Math.abs(vn) / 300, .2, 1) });
      } else { g.x += dx; g.y += dy; g.z += dz; }
      if (g.t >= g.fuse) { explode(g.x, g.y, g.z); nades.splice(i, 1); }
    }
  }

  /* =====================================================================
   * THE PLAYER: the look (mouse, right stick, a drag on a phone), the moves (sprint, crouch, slide, jump, vault,
   * mantle, climb, ladders, ziplines), the actions (fire, aim, reload, swap, punch, kick, throw, use) and the camera
   * (first person at the eyes, third over the shoulder). All in the game's steps: a replay is exact
   * ===================================================================== */
  function newState() {
    return { hp: HP, shield: SHIELD, alive: true, kills: 0, cleared: 0, time: 0,
      cur: 'rifle', ammo: { rifle: [28, 196], shotgun: [6, 30] }, nades: 3, fireCd: 0, burst: 0, bloom: 0, shots: 0, lastShot: -9, recP: 0, recY: 0, kicks: [], flash: 0, pumpT: 9, autoReload: 0,
      act: null, actT: 0, actDur: 0, reloadEmpty: false, hitDone: false, lunge: null,
      ads: false, adsB: 0, sprint: false, crouch: false, move: 'stand', slideT: 0, slideCd: 0, mantle: null, climbT: 0, climbUsed: false, ladder: null, zip: null, fallV: 0,
      view: 'first', yaw: -Math.PI / 2, pitch: 0, coyote: 0, eye: EYE, camClr: 0, punchP: SPR(), punchY: SPR(), punchR: SPR(), dipC: SPR(), stepPh: 0,
      hurtT: 0, hitDirs: [], nums: [], mark: null, feed: [], banner: null, prompt: null, boom: null, won: false, lost: false, cam: null, near: null, focus: { x: 0, y: 0, z: 0 } };
  }
  const SENS = .0021;
  /** radians a pixel of mouse turns the view: less as the sights zoom in, in step with the zoom (no sudden change halfway) */
  const lookK = () => SENS * lerp(1, WEAPONS[S.cur].adsFov / FOV, ease(S.adsB));
  /** the look: the mouse's moves (taken from the camera), the right stick's (faster the further it's pushed), recoil
   *  coming back after a burst */
  function look(dt, I) {
    const k = lookK(), m = I.mouse;
    S.yaw += m[0] * k; S.pitch = clamp(S.pitch - m[1] * k, -1.45, 1.45);
    const a = I.stick2; if (a) { const mag = Math.hypot(a[0], a[1]), rate = (1.2 + 2.6 * mag * mag) * lerp(1, .55, ease(S.adsB)); S.yaw += a[0] / mag * rate * mag * dt; S.pitch = clamp(S.pitch - a[1] / mag * rate * .8 * mag * dt, -1.45, 1.45); }
    if (S.recP || S.recY) { const r = Math.min(1, dt * lerp(1.6, 6, clamp((S.time - S.lastShot - .06) / .12, 0, 1))); S.pitch -= S.recP * r; S.yaw -= S.recY * r; S.recP -= S.recP * r; S.recY -= S.recY * r; }   // (some comes back even mid-burst)
  }
  /** the soldiers standing in the way: the player stops against them (the engine's heroes pass through each other; the
   *  camera went inside a body), and steps over the fallen */
  function bump() {
    const h = hero;
    for (const e of raiders) {
      if (!e.alive || Math.abs(e.a.z - h.z) > 20) continue;
      const dx = h.x - e.a.x, dy = h.y - e.a.y, d = Math.hypot(dx, dy) || 1, min = RADIUS + e.a.r + 1; if (d > min + 2) continue;
      const nx = dx / d, ny = dy / d, vn = h.vx * nx + h.vy * ny;
      if (vn < 0) { h.vx -= nx * vn; h.vy -= ny * vn; }   // (the way into them is taken out; along them is kept)
      if (d < min) { h.vx += nx * (min - d) * 30; h.vy += ny * (min - d) * 30; }   // (and overlapping, eased apart)
    }
  }
  /** a ledge ahead (yaw) of feet at (x, y, z) within reach: a wall at the knees or chest, a top to stand on with room
   *  above it; thin: the ground drops away again beyond (a vault) */
  function findLedge(x, y, z, yaw, reach) {
    const f = [Math.cos(yaw), Math.sin(yaw)], o = { skip: hero };
    let w = null; for (const hz of [7, 15, 24]) { w = world.ray(x, y, z + hz, f[0], f[1], 0, RADIUS + 8, o); if (w && !w.actor && Math.abs(w.nz) < .55) break; w = null; }
    if (!w) return null;
    const ex = w.x - w.nx * 3.5, ey = w.y - w.ny * 3.5, top = world.ray(ex, ey, z + reach + 3, 0, 0, -1, reach + 6, { skip: hero, level: true });
    if (!top || top.nz < .7) return null;
    const ht = top.z - z; if (ht < 5 || ht > reach) return null;
    if (world.ray(ex, ey, top.z + 1, 0, 0, 1, 2 * (HALF_CROUCH + RADIUS) + 1, { skip: hero, level: true })) return null;
    const bx = w.x - w.nx * 15, by = w.y - w.ny * 15, far = world.ray(bx, by, top.z + 2, 0, 0, -1, 30, { skip: hero, level: true });
    return { x: ex, y: ey, z: top.z, h: ht, nx: w.nx, ny: w.ny, wx: w.x, wy: w.y, thin: !far || far.z < top.z - 6 };
  }
  /** a wall straight ahead at the chest (to climb) */
  const wallAhead = (yaw) => { const h = world.ray(hero.x, hero.y, hero.z + 18, Math.cos(yaw), Math.sin(yaw), 0, RADIUS + 6, { skip: hero }); return h && !h.actor && Math.abs(h.nz) < .55 ? h : null; };
  const roomToStand = () => !world.ray(hero.x, hero.y, hero.z + 2 * (hero.half + RADIUS) - .5, 0, 0, 1, 2 * (HALF - hero.half) + 1.5, { skip: hero, level: true });
  const onTerrain = () => Math.abs(world.terrain.ground(hero.x, hero.y) - hero.z) < 3;
  function startMantle(L, vault) {
    const sp = Math.hypot(hero.vx, hero.vy);
    S.move = vault ? 'vault' : 'mantle'; S.crouch = false; S.climbUsed = true;
    S.mantle = { L, t: 0, x0: hero.x, y0: hero.y, z0: hero.z, dur: vault ? .4 : .3 + L.h / MANTLE_MAX * .32, v: Math.max(sp, 96), f: [-L.nx, -L.ny] };
    hero.fly = true; pb.ledge = [L.wx, L.wy, L.z]; pb.wallN = [L.nx, L.ny, 0]; A.sfx(vault ? 'vault' : 'mantle'); S.vmEvent = 'grab';
  }
  function stepMantle(dt) {
    const m = S.mantle, L = m.L, h = hero; m.t += dt; const u = clamp(m.t / m.dur, 0, 1); let tx, ty, tz;
    if (S.move === 'mantle') {   // up the face (hands on the edge), then over it onto the top
      const up = ease(clamp(u / .62, 0, 1)), over = ease(clamp((u - .55) / .45, 0, 1));
      tx = lerp(m.x0, L.x + m.f[0] * (RADIUS + 3), over); ty = lerp(m.y0, L.y + m.f[1] * (RADIUS + 3), over); tz = lerp(m.z0, L.z + 1.2, up);
    } else {   // a vault: a hop up and over at speed, a hand on the top
      tx = m.x0 + m.f[0] * m.v * m.t; ty = m.y0 + m.f[1] * m.v * m.t; tz = lerp(m.z0, L.z + 3.5, ease(clamp(u / .45, 0, 1)));
    }
    const k = 1 / dt; h.vx = clamp((tx - h.x) * k, -500, 500); h.vy = clamp((ty - h.y) * k, -500, 500); h.vz = clamp((tz - h.z) * k, -500, 500);
    if (u >= 1) {
      h.fly = false; pb.ledge = null;
      if (S.move === 'vault') { S.move = 'air'; h.vx = m.f[0] * m.v; h.vy = m.f[1] * m.v; h.vz = 30; }
      else { S.move = 'stand'; h.vx = m.f[0] * 30; h.vy = m.f[1] * 30; h.vz = 0; }
      S.mantle = null;
    }
  }
  function startClimb(w) { S.move = 'climb'; S.climbT = 0; S.climbUsed = true; hero.fly = true; pb.wallN = [w.nx, w.ny, 0]; pb.ledge = [w.x, w.y, hero.z + 34]; A.sfx('mantle'); }
  function stepClimb(dt, I, fwd, jumpP) {
    const h = hero, wn = pb.wallN; S.climbT += dt;
    h.vz = CLIMB_SPEED * (1 - S.climbT / CLIMB_TIME * .35); h.vx = -wn[0] * 24; h.vy = -wn[1] * 24; pb.ledge = [h.x - wn[0] * 5, h.y - wn[1] * 5, h.z + 34];
    const L = findLedge(h.x, h.y, h.z, Math.atan2(-wn[1], -wn[0]), MANTLE_MAX); if (L) { startMantle(L, false); return; }
    if (jumpP) { h.fly = false; S.move = 'air'; h.vz = JUMP * .85; h.vx = wn[0] * 110; h.vy = wn[1] * 110; S.yaw = Math.atan2(wn[1], wn[0]); A.sfx('hop'); pb.ledge = null; return; }
    if (S.climbT > CLIMB_TIME || fwd < .2 || !wallAhead(Math.atan2(-wn[1], -wn[0]))) { h.fly = false; S.move = 'air'; h.vz = Math.min(h.vz, 24); h.vx = wn[0] * 30; h.vy = wn[1] * 30; pb.ledge = null; }
  }
  /** a ladder within reach that the player faces */
  function nearLadder() {
    for (const L of ladders) {
      if (hero.z < L.z0 - 8 || hero.z > L.z1 - 2) continue;
      const fx = Math.cos(L.yaw), fy = Math.sin(L.yaw), px = L.x - fx * (RADIUS + 2.5), py = L.y - fy * (RADIUS + 2.5);
      if (Math.hypot(hero.x - px, hero.y - py) < 11 && Math.cos(S.yaw - L.yaw) > .25) return L;
    }
    return null;
  }
  function stepLadder(dt, I, fwd, jumpP) {
    const h = hero, L = S.ladder, fx = Math.cos(L.yaw), fy = Math.sin(L.yaw), px = L.x - fx * (RADIUS + 2.5), py = L.y - fy * (RADIUS + 2.5);
    h.vx = (px - h.x) * 14; h.vy = (py - h.y) * 14; h.vz = fwd * LADDER_SPEED;
    if (h.z >= L.z1 - 3 && fwd > 0) { startMantle({ x: L.top[0], y: L.top[1], z: L.top[2], h: L.top[2] - h.z, nx: -fx, ny: -fy, wx: L.x, wy: L.y, thin: false }, false); S.ladder = null; pb.ladder = null; return; }
    if (jumpP || (h.z <= L.z0 + 1 && fwd < 0)) { h.fly = false; S.move = jumpP ? 'air' : 'stand'; if (jumpP) { h.vz = 70; h.vx = -fx * 90; h.vy = -fy * 90; } S.ladder = null; pb.ladder = null; }
  }
  /** the zipline nearest the chest within reach: { z: the line, s (how far along it), d } */
  function nearZip() {
    let best = null; const c = [hero.x, hero.y, hero.z + 22];
    for (const Z of zips) {
      let acc = 0;
      for (let i = 0; i < Z.pts.length - 1; i++) {
        const a = Z.pts[i], b = Z.pts[i + 1], ab = sub(b, a), L = Math.hypot(...ab), t = clamp(dot(sub(c, a), ab) / (L * L), 0, 1), p = add(a, ab, t), d = Math.hypot(...sub(c, p));
        if (d < 36 && (!best || d < best.d)) best = { z: Z, s: acc + L * t, d };
        acc += L;
      }
      Z.total = acc;
    }
    return best;
  }
  const zipPoint = (Z, s) => { let acc = 0; for (let i = 0; i < Z.pts.length - 1; i++) { const a = Z.pts[i], b = Z.pts[i + 1], L = Math.hypot(...sub(b, a)); if (s <= acc + L) return mixv(a, b, (s - acc) / L); acc += L; } return Z.pts[Z.pts.length - 1]; };
  function startZip(n) {
    const Z = n.z, ahead = zipPoint(Z, Math.min(Z.total, n.s + 20)), back = zipPoint(Z, Math.max(0, n.s - 20)), d = sub(ahead, back), f = [Math.cos(S.yaw), Math.sin(S.yaw)];
    S.zip = { Z, s: n.s, dir: d[0] * f[0] + d[1] * f[1] >= 0 ? 1 : -1, v: Math.max(70, Math.hypot(hero.vx, hero.vy)) };
    S.move = 'zip'; hero.fly = true; S.crouch = false; A.sfx('zip'); S.vmEvent = 'grab';
  }
  function stepZip(dt, I, jumpP) {
    const h = hero, Z = S.zip; Z.v = approach(Z.v, ZIP_SPEED, 260 * dt); Z.s += Z.dir * Z.v * dt;
    const off = Z.s <= 0 || Z.s >= Z.Z.total, p = zipPoint(Z.Z, clamp(Z.s, 0, Z.Z.total)), q = zipPoint(Z.Z, clamp(Z.s + Z.dir * 8, 0, Z.Z.total)), along = nrm(sub(q, p));
    if (off || jumpP || I.pressed('use')) { h.fly = false; S.move = 'air'; h.vx = along[0] * Z.v * .9; h.vy = along[1] * Z.v * .9; h.vz = (jumpP ? 70 : 0) + along[2] * Z.v * .5; S.zip = null; pb.zipP = null; if (I.pressed('use')) I.use('use'); return; }
    const tx = p[0], ty = p[1], tz = p[2] - 31, k = 1 / dt; h.vx = clamp((tx - h.x) * k, -600, 600); h.vy = clamp((ty - h.y) * k, -600, 600); h.vz = clamp((tz - h.z) * k, -600, 600);
    pb.zipP = p; if ((S.time * 3) % 1 < dt * 3) A.sfx('zip', { vol: .5 });
  }
  function land(sp) {
    const v = S.fallV; S.fallV = 0; S.landT = S.time; S.landV = -v;
    if (v < -60) { pb.dip.v -= Math.min(60, -v * .18); S.dipC.v -= Math.min(40, -v * .12); A.sfx('land', { vol: clamp(-v / 300, .3, 1) }); P.dust(hero.x, hero.y, hero.z, 5, { speed: 30, color: '#b8a07a' }); }
    S.move = S.crouch ? 'crouch' : 'stand';
    if (I0.down('crouch') && sp > 92) startSlide();
  }
  function startSlide() {
    const h = hero, sp = Math.hypot(h.vx, h.vy); if (sp < 1) return;
    const boost = S.slideCd <= 0 ? SLIDE_BOOST : 6, k = Math.min(SLIDE_MAX, sp + boost) / sp; h.vx *= k; h.vy *= k;
    S.move = 'slide'; S.slideT = 0; S.slideCd = 1.6; S.crouch = true; A.sfx('slide'); P.dust(h.x, h.y, h.z, 6, { speed: 40, color: '#b8a07a' });
  }
  let I0 = null;   // (the step's input, for land())
  /** a step of the player's moves */
  function move(dt, I) {
    const h = hero, f = [Math.cos(S.yaw), Math.sin(S.yaw)], r = [-f[1], f[0]], mv = I.move, fwd = -mv[1], str = mv[0];
    const wish = [f[0] * fwd + r[0] * str, f[1] * fwd + r[1] * str], wl = Math.min(1, Math.hypot(wish[0], wish[1])), sp = Math.hypot(h.vx, h.vy);
    S.coyote = h.grounded ? .1 : S.coyote - dt; S.slideCd -= dt;
    if (!h.grounded) S.fallV = Math.min(S.fallV, h.vz);
    const jumpP = I.pressed('jump', .12);
    if (S.move === 'mantle' || S.move === 'vault') return stepMantle(dt);
    if (S.move === 'climb') return stepClimb(dt, I, fwd, jumpP);
    if (S.move === 'ladder') return stepLadder(dt, I, fwd, jumpP);
    if (S.move === 'zip') return stepZip(dt, I, jumpP);
    // onto a ladder: walk into it
    if (fwd > .5 && S.move !== 'slide') { const L = nearLadder(); if (L) { S.move = 'ladder'; S.ladder = pb.ladder = L; h.fly = true; S.crouch = false; S.sprint = false; return; } }
    S.sprint = I.down('sprint') && fwd > .5 && !S.ads && S.time - S.lastShot > .3 && S.move !== 'slide' && S.act !== 'melee';
    if (S.sprint && S.crouch && S.move !== 'slide' && roomToStand()) S.crouch = false;
    if (h.grounded && S.move !== 'air') {
      if (S.move === 'slide') {   // momentum: friction, downhill speeds it up, a little steering
        if (onTerrain()) { const n = world.terrain.normal(h.x, h.y, [0, 0, 1]); h.vx += n[0] * GRAV * 1.05 * dt; h.vy += n[1] * GRAV * 1.05 * dt; }
        let v = Math.hypot(h.vx, h.vy); const nv = Math.min(SLIDE_MAX, Math.max(0, v - SLIDE_DRAG * dt));
        if (v > .1) { let a = Math.atan2(h.vy, h.vx); if (wl > .2) a = E.approachAng(a, Math.atan2(wish[1], wish[0]), 1.2 * dt); h.vx = Math.cos(a) * nv; h.vy = Math.sin(a) * nv; v = nv; }
        S.slideT += dt;
        if (jumpP) { I.use('jump'); h.jump(JUMP * .96); S.move = 'air'; S.coyote = 0; S.climbUsed = false; S.crouch = !roomToStand(); A.sfx('hop'); }
        else if (v < 50 || (S.slideT > .3 && !I.down('crouch') && I.pressed('crouch'))) { S.move = 'crouch'; }
      } else {
        if (I.pressed('crouch')) { I.use('crouch'); if (sp > 92 && S.move === 'stand') startSlide(); else if (S.crouch) { if (roomToStand()) S.crouch = false; } else S.crouch = true; }
        if (S.move !== 'slide') {
          S.move = S.crouch ? 'crouch' : 'stand';
          const top = (S.crouch ? CROUCH : S.sprint ? RUN : S.ads ? ADS_WALK : WALK) * (S.act === 'reload' && S.sprint ? .9 : 1), acc = (S.lunge ? 0 : 1000) * dt;
          h.vx = approach(h.vx, wish[0] * top, acc); h.vy = approach(h.vy, wish[1] * top, acc);
          if (jumpP && S.coyote > 0) {
            I.use('jump'); const L = fwd > .3 ? findLedge(h.x, h.y, h.z, S.yaw, 26) : null;
            if (L) startMantle(L, L.thin && L.h <= VAULT_MAX && sp > 50);
            else { h.jump(JUMP); S.move = 'air'; S.coyote = 0; S.climbUsed = false; if (S.crouch && roomToStand()) S.crouch = false; A.sfx('hop'); }
          }
        }
      }
    } else {
      if (h.grounded && S.move === 'air' && h.vz <= 0) { land(sp); return; }
      if (S.move !== 'air' && !h.grounded && S.coyote <= 0) S.move = 'air';
      if (jumpP && S.coyote > 0 && S.move !== 'air') { I.use('jump'); h.jump(JUMP); S.move = 'air'; }
      // air control: steer, never faster than you were going (or a walk)
      const cap = Math.max(sp, WALK), acc = 170 * dt * wl; let vx = h.vx + wish[0] * acc, vy = h.vy + wish[1] * acc; const ns = Math.hypot(vx, vy); if (ns > cap) { vx *= cap / ns; vy *= cap / ns; } h.vx = vx; h.vy = vy;
      if (fwd > .3 && S.move === 'air') {   // into a ledge: mantle; into a wall: climb it (once a jump)
        const L = findLedge(h.x, h.y, h.z, S.yaw, MANTLE_MAX);
        if (L) startMantle(L, L.thin && L.h <= VAULT_MAX && sp > 50);
        else if (!S.climbUsed && h.vz > -70) { const w = wallAhead(S.yaw); if (w) startClimb(w); }
      }
    }
    // the capsule: shorter crouched, shortest sliding (standing up only where there's room)
    const want = S.move === 'slide' ? HALF_SLIDE : S.crouch ? HALF_CROUCH : HALF;
    if (want < h.half || roomToStand()) h.resize(want); else if (want > h.half) S.crouch = true;
  }
  /* ---- the actions: fire, aim, reload, swap, punch (a lunge at someone close), kick (a door), throw, use ---- */
  function startAct(kind, dur) { S.act = kind; S.actT = 0; S.actDur = dur; S.hitDone = false; }
  function startReload() {
    const W = WEAPONS[S.cur], am = S.ammo[S.cur]; if (S.act || am[0] >= W.mag || am[1] <= 0) return;
    S.reloadEmpty = am[0] === 0;
    if (S.cur === 'rifle') startAct('reload', S.reloadEmpty ? W.reloadEmpty : W.reload);
    else { S.shells = Math.min(W.mag - am[0], am[1]); startAct('reload', .3 + S.shells * W.shell); }
    S.ads = false;
  }
  const doorAhead = () => doors.find(d => d.state !== 'broken' && Math.hypot(d.x - hero.x, d.y - hero.y) < 40 && Math.abs(d.z - hero.z) < 20 && Math.cos(Math.atan2(d.y - hero.y, d.x - hero.x) - S.yaw) > .45);
  function actions(dt, I) {
    const W = WEAPONS[S.cur], t0 = S.actT; S.fireCd -= dt; S.bloom = Math.max(0, S.bloom - dt * .05); S.flash = Math.max(0, S.flash - dt * 30); S.pumpT += dt;
    const busyMove = ['mantle', 'vault', 'climb', 'ladder'].includes(S.move);
    if (S.act) {
      S.actT += dt; const t = S.actT, crossed = x => t0 < x && t >= x;
      if (S.act === 'reload') {
        const am = S.ammo[S.cur];
        if (S.cur === 'rifle') {
          if (crossed(.38)) A.sfx('magout'); if (crossed(1.05)) { const n = Math.min(W.mag - am[0], am[1]); am[0] += n; am[1] -= n; A.sfx('magin'); } if (S.reloadEmpty && crossed(1.5)) A.sfx('bolt');
        } else {
          for (let i = 0; i < S.shells; i++) if (crossed(.15 + i * W.shell + W.shell * .62) && am[1] > 0) { am[0]++; am[1]--; A.sfx('shell'); }
          if (I.pressed('fire') && am[0] > 0) { S.act = null; S.pumpT = S.reloadEmpty ? 0 : 9; }
        }
      } else if (S.act === 'melee') { if (crossed(.085)) punchHit(); }
      else if (S.act === 'kick') { if (crossed(.22)) kickHit(); }
      else if (S.act === 'throw') { if (crossed(.46)) throwNade(); }
      else if (S.act === 'swap') { if (crossed(.24)) { S.cur = S.cur === 'rifle' ? 'shotgun' : 'rifle'; S.pumpT = 9; } }
      if (S.act && S.actT >= S.actDur) { if (S.act === 'reload' && S.cur === 'shotgun' && S.reloadEmpty) S.pumpT = 0; S.act = null; }
    }
    if (S.lunge) {   // the lunge closes to a fist's length and stops there (what it carried would run on through the target)
      const L = S.lunge; L.t -= dt; const e = L.e, d = Math.hypot(e.a.x - hero.x, e.a.y - hero.y) || 1, ux = (e.a.x - hero.x) / d, uy = (e.a.y - hero.y) / d;
      if (L.t <= 0 || d < 24) { S.lunge = null; const c = Math.max(0, hero.vx * ux + hero.vy * uy); hero.vx -= ux * c; hero.vy -= uy * c; }
      else { const sp = Math.min(440, (d - 22) / dt); hero.vx = ux * sp; hero.vy = uy * sp; }
    }
    S.ads = I.down('aim') && !busyMove && !S.act;   // (not mid-reload, mid-punch, mid-throw or mid-swap)
    S.adsB = approach(S.adsB, S.ads ? 1 : 0, dt / .16); if (S.ads) S.sprint = false;
    // fire: held (the rifle) or each press (the shotgun, once its pump is back)
    const trig = W.auto ? I.down('fire') : I.pressed('fire', .12);
    if (!I.down('fire')) S.burst = 0;
    if (trig && S.fireCd <= 0 && !busyMove && (!S.act || (S.act === 'reload' && S.cur === 'shotgun' && S.ammo.shotgun[0] > 0)) && (S.cur !== 'shotgun' || S.pumpT > .42)) {
      if (!W.auto) I.use('fire');
      if (S.act === 'reload') S.act = null;
      const c = S.cam, eye = S.view === 'first' ? [hero.x, hero.y, hero.z + S.eye] : tpsOrigin(c), F = frameYP(eye, S.yaw, S.pitch);
      fire(eye, F, muzzlePoint(F));
    }
    if (S.autoReload > 0 && (S.autoReload -= dt) <= 0 && !S.act) startReload();
    // use: a zipline, a door, a supply bin (what's in reach and in front); reload when there's nothing to use
    const use = I.pressed('use'), near = S.near;
    if (use && near && !busyMove) {
      I.use('use');
      if (near.zip) startZip(near.zip); else if (near.door) toggleDoor(near.door); else if (near.bin) openBin(near.bin);
    } else if (I.pressed('reload') || (use && !near)) startReload();
    if (I.pressed('swap') && S.act !== 'swap' && !busyMove) { I.use('swap'); S.act = null; startAct('swap', .5); A.sfx('swapw'); }
    if (I.pressed('melee') && !['melee', 'kick'].includes(S.act) && !busyMove && S.move !== 'zip') {
      I.use('melee'); S.act = null; const d = doorAhead();
      if (d) startAct('kick', .72); else { startAct('melee', .55); A.sfx('swing'); const e = raiders.find(q => q.alive && Math.hypot(q.a.x - hero.x, q.a.y - hero.y) < 4.6 * M && Math.abs(q.a.z - hero.z) < 20 && Math.cos(Math.atan2(q.a.y - hero.y, q.a.x - hero.x) - S.yaw) > .75); if (e) S.lunge = { e, t: .085 }; }
    }
    if (I.pressed('grenade') && S.nades > 0 && !S.act && !busyMove) { I.use('grenade'); startAct('throw', .78); A.sfx('pin'); }
    if (I.pressed('view')) { I.use('view'); S.view = S.view === 'first' ? 'third' : 'first'; game.note(S.view === 'first' ? 'FIRST PERSON' : 'THIRD PERSON', 1.2); }
  }
  /** where a shot leaves from in third person: the camera's ray, begun level with the player (nothing behind them hit) */
  function tpsOrigin(c) { const F = frameYP([c.x, c.y, c.z], S.yaw, S.pitch), d = dot(sub([hero.x, hero.y, hero.z + S.eye], [c.x, c.y, c.z]), F.f); return add([c.x, c.y, c.z], F.f, Math.max(0, d)); }
  /** the muzzle in the world (tracers start there): the view model's in first person, the body's gun in third */
  function muzzlePoint(F) {
    if (S.view === 'third' && pb.G) return at(pb.G, S.cur === 'rifle' ? 12.6 : 14, S.cur === 'rifle' ? .55 : .95);
    const e = F.o; return add(add(add(e, F.f, lerp(14, 11, S.adsB)), F.r, lerp(3.2, 0, S.adsB)), F.u, lerp(-3.4, -1.6, S.adsB));
  }
  /** the punch lands: the nearest raider in front within reach takes 30 and is thrown back; a hit-stop sells it */
  function punchHit() {
    let best = null, bd = 1e9;
    for (const e of raiders) { if (!e.alive) continue; const dx = e.a.x - hero.x, dy = e.a.y - hero.y, d = Math.hypot(dx, dy); if (d < 2.9 * M && Math.abs(e.a.z - hero.z) < 20 && Math.cos(Math.atan2(dy, dx) - S.yaw) > .55 && d < bd) { best = e; bd = d; } }
    if (!best) return;
    const d = nrm([best.a.x - hero.x, best.a.y - hero.y, 0]), res = hurtRaider(best, 30, false, d, [best.a.x, best.a.y, best.a.z + 20], true);
    best.a.push(d[0] * 190, d[1] * 190, 60); if (res) hitmark(res); A.sfx('punch'); game.freeze(.05); game.shake(3);
    S.punchY.x += 2.2; S.punchR.x -= 4.2; S.punchP.x += 1.4; S.vmEvent = 'impact';   // (the view jolts along the blow, at once: the freeze holds it there)
    // the star where the fist meets the body: in first person just ahead of the knuckles in the eye's frame, drawn on the
    // overlay over the fist (behind it in the world, the glove hid it); in third person on the body, chest high
    const pal = res === 'shield' ? 'blue' : res === 'break' ? 'purple' : 'white';
    const onBody = [best.a.x - d[0] * 6, best.a.y - d[1] * 6, best.a.z + 24];   // (the chips fly off the body, whichever view: they stay with the target as the fist pulls away)
    if (S.view === 'first') { impactStar([14.4, -1.1, -1.2], [1, 0, 0], 1.3, pal, 0, true); impactStar(onBody, d, 0, pal, 7); } else impactStar(onBody, d, 2.6, pal, 7);
  }
  /** the kick lands: a door in front bursts off its hinges; raiders in front are thrown back */
  function kickHit() {
    const d = doorAhead(), f = [Math.cos(S.yaw), Math.sin(S.yaw), 0];
    if (d) breakDoor(d, f);
    for (const e of raiders) if (e.alive && Math.hypot(e.a.x - hero.x, e.a.y - hero.y) < 3 * M && Math.cos(Math.atan2(e.a.y - hero.y, e.a.x - hero.x) - S.yaw) > .5) { const res = hurtRaider(e, 40, false, f, [e.a.x, e.a.y, e.a.z + 12], true); e.a.push(f[0] * 260, f[1] * 260, 80); if (res) hitmark(res); impactStar([e.a.x - f[0] * 6, e.a.y - f[1] * 6, e.a.z + 12], f, 2.8, 'white'); }
    A.sfx('kickdoor'); game.shake(4); game.freeze(.05); S.punchP.v -= 12;
  }
  function throwNade() {
    if (S.nades <= 0) return; S.nades--;
    const F = frameYP([hero.x, hero.y, hero.z + S.eye], S.yaw, S.pitch), p = add(add(add(F.o, F.f, 6), F.r, -3), F.u, 2), v = add(F.f, UP, .18);
    nades.push({ x: p[0], y: p[1], z: p[2], vx: v[0] * 400 + hero.vx * .5, vy: v[1] * 400 + hero.vy * .5, vz: v[2] * 400, t: 0, fuse: 2.3, spin: 0 }); A.sfx('throw');
  }
  /* ---- the camera: the eyes (bob-free: the view model carries the motion), or over the right shoulder, pulled in
   *      where a wall stands behind; a slide and a strafe lean it, recoil and punches kick it ---- */
  function camStep(dt) {
    const h = hero, want = S.move === 'slide' ? EYE_SLIDE : S.crouch ? EYE_CROUCH : EYE; S.eye = approach(S.eye, want, dt * 80);
    spring(S.punchP, 0, 900, 40, dt); spring(S.punchY, 0, 900, 40, dt); spring(S.punchR, 0, 800, 36, dt); spring(S.dipC, 0, 180, 16, dt);   // (stiff: a punch peaks in two frames and is gone in eight)
    for (const [k, side] of S.kicks.splice(0)) { const j = rnd() - .5; S.punchP.x += k * 1.25; S.punchY.x += side * k * .25 + j * k; S.punchR.x += j * k * .6; }   // (a punch you see on the shot's own frame: a degree for the rifle, four for the shotgun, a jitter aside, back in four frames)
    S.fovK = Math.max(0, (S.fovK || 0) - dt * 14);
    const str = clamp((h.vx * -Math.sin(S.yaw) + h.vy * Math.cos(S.yaw)) / RUN, -1, 1);
    S.lean = approach(S.lean || 0, (S.move === 'slide' ? -.13 : 0) + str * -.018 + (S.move === 'zip' ? Math.sin(S.time * 2) * .03 : 0) + (S.move === 'climb' ? Math.sin(S.time * 14) * .02 : 0), dt * .6);
    const W = WEAPONS[S.cur], fov = lerp(FOV * (S.move === 'slide' ? 1.1 : S.sprint ? 1.06 : 1), W.adsFov, ease(S.adsB)) + (S.fovK || 0) * (S.cur === 'rifle' ? 1.5 : 3);
    const rumble = S.move === 'slide' && h.grounded ? (Math.sin(S.time * 97) * .6 + Math.sin(S.time * 151) * .4) * .0035 : 0;   // (a slide rumbles over the ground)
    const pitch = clamp(S.pitch + S.punchP.x * .012 + rumble, -1.5, 1.5), yaw = S.yaw + S.punchY.x * .01, roll = S.lean + S.punchR.x * .01;
    if (S.view === 'first') S.cam = { x: h.x, y: h.y, z: h.z + S.eye + S.dipC.x * .1, yaw, pitch, roll, fov, near: 1.2 };
    else {   // (what a wall behind takes from the distance comes in fast and goes back slowly: a stone passing behind doesn't make it flicker)
      const c = thirdCam(h.x, h.y, h.z, S.eye, S.adsB, S.stepPh, yaw, pitch, S.camClr); S.camClr = approach(S.camClr, c.need, dt * (c.need > S.camClr ? 90 : 40));
      S.cam = { x: c.p[0], y: c.p[1], z: c.p[2], yaw, pitch, roll: roll * .5, fov: fov * .92, near: 2 };
    }
    world.camera.fixed = S.cam; world.camera.near = S.cam.near;
    // its focus (what the outlines are sized for, the sun's shadow centred on): ahead of the eye
    const f = S.focus; f.x = h.x + Math.cos(S.yaw) * 20 * M; f.y = h.y + Math.sin(S.yaw) * 20 * M; f.z = h.z + 10;
  }

  /** the camera over the shoulder: beside and above the head, back along the view (closer down the sights) less clr (what
   *  a wall behind has taken, eased), never past a wall; a sprint bobs it with the footfalls. need: what the wall asks */
  function thirdCam(x, y, z, eye, adsB, ph, yaw, pitch, clr) {
    const F = frameYP([0, 0, 0], yaw, pitch), piv = add([x, y, z + eye + lerp(3, 4.5, adsB)], F.r, lerp(16, 14, adsB)), dist = lerp(48, 36, ease(adsB)), back = mul(F.f, -1);
    const hit = world.ray(piv[0], piv[1], piv[2], back[0], back[1], back[2], dist + 4, { skip: hero, level: true });
    const d = Math.min(hit ? Math.max(6, hit.dist - 2.5) : dist, dist - clr), bob = S.sprint && hero.grounded ? (Math.abs(Math.sin(ph * Math.PI)) - .5) * 1.1 : 0;
    return { p: add(add(piv, back, d), UP, bob), need: hit ? Math.max(0, dist - Math.max(6, hit.dist - 4)) : 0 };
  }

  /* =====================================================================
   * RAIDERS: each outpost's crew comes when the player is within 300 m (and goes again, if no fight, past 430 m). They
   * stand watch or patrol; a shot heard, a teammate hit or the player seen (in front, in the open) wakes them; then they
   * fight: bursts that settle on target (worse far off, at a sprint, a slide, a jump), strafing, holding a distance
   * (a heavy closes in), a punch up close, hunting where the player was last seen. A hit makes them flinch, a broken
   * shield staggers them. The range's dummies stand still and stand up again
   * ===================================================================== */
  function spawnRaider(sl) {
    const look = sl.dummy ? 'dummy' : sl.heavy ? 'heavy' : 'raider', k = sl.heavy ? 1.1 : 1;
    const a = world.hero({ x: sl.x, y: sl.y, z: sl.z + 1, r: RADIUS * k, half: HALF * k, visible: false, shadow: false, slope: 50, step: 5 });
    const b = body(look, k); b.weapon = sl.heavy ? 'shotgun' : 'rifle';
    const e = { a, b, sl, op: sl.op, heavy: !!sl.heavy, dummy: !!sl.dummy, post: !!sl.post, alive: true, hp: sl.heavy ? 150 : 100, shield: sl.dummy ? 50 : sl.heavy ? 100 : 50, maxShield: sl.dummy ? 50 : sl.heavy ? 100 : 50,
      state: 'idle', t: rnd() * 3, think: rnd() * .3, sees: false, seen: -99, last: null, fireCd: 0, burst: 0, burstN: 0, react: 0, strafe: rnd() < .5 ? 1 : -1, strafeT: 1 + rnd(), flinch: 0, stun: 0, deadT: 0, lastHit: -99,
      goal: null, home: [sl.x, sl.y], yaw: rnd() * TAU, pitch: 0, ammo: 24, melee: 0, flash: 0, crouch: false };
    e.yaw = sl.dummy ? Math.PI / 2 : e.yaw; a.facing = e.yaw;
    raiders.push(e); return e;
  }
  /** the crews come and go with the player's distance (decided in the steps, so a replay sees the same) */
  function streamRaiders() {
    for (const o of OUTPOSTS) {
      if (o.id === 'drop') continue;
      const d = Math.hypot(o.x - hero.x, o.y - hero.y);
      if (!o.spawned && d < 300 * M) { o.spawned = true; for (const sl of spawns) if (sl.op === o.id && !sl.dead) sl.e = spawnRaider(sl); }
      else if (o.spawned && d > 430 * M && !raiders.some(e => e.op === o.id && e.alive && e.state === 'combat')) {
        o.spawned = false; for (let i = raiders.length - 1; i >= 0; i--) { const e = raiders[i]; if (e.op !== o.id) continue; world.remove(e.a); raiders.splice(i, 1); }
      }
    }
  }
  /** wake a raider: something happened (a shot, a hit, a blast, a teammate's shout); it turns to look */
  function awake(e, why) {
    if (!e.alive || e.dummy) return;
    e.last = [hero.x, hero.y, hero.z];
    if (e.state === 'idle' || e.state === 'patrol') { e.state = 'alert'; e.react = why === 'hit' ? .15 : .45 + rnd() * .4; }
    if (why === 'hit') { e.state = 'combat'; e.seen = S.time; }
  }
  function alertNear(x, y, r, why) { for (const e of raiders) if (e.alive && Math.hypot(e.a.x - x, e.a.y - y) < r) awake(e, why === 'shot' ? 'heard' : why); }
  /** a raider's step: what it knows, where it goes, when it shoots */
  function raiderStep(e, dt) {
    const a = e.a, b = e.b;
    if (!e.alive) {   // down: it lies there a while (a dummy stands up again)
      e.deadT += dt; if (b.dead) b.dead.t += dt;
      if (e.dummy && e.deadT > 3.5) { e.alive = true; e.hp = 100; e.shield = e.maxShield; b.move = 'stand'; b.dead = null; a.setSolid(true); P.glints(a.x, a.y, a.z + 16, 10, '#ffd890'); }
      else if (!e.dummy && e.deadT > 30) { world.remove(a); raiders.splice(raiders.indexOf(e), 1); }
      a.vx = approach(a.vx, 0, 400 * dt); a.vy = approach(a.vy, 0, 400 * dt);
      return;
    }
    e.flinch -= dt; e.stun -= dt; e.fireCd -= dt; e.think -= dt; e.melee -= dt; e.flash = Math.max(0, e.flash - dt * 30);
    // where it aims chases the player a fifth of a second behind: standing still is hit, moving across its sights is missed
    const hp = [hero.x, hero.y, hero.z]; if (!e.aimP) e.aimP = hp; else { const q = Math.min(1, dt / .22); e.aimP = add(e.aimP, sub(hp, e.aimP), q); }
    const dx = hero.x - a.x, dy = hero.y - a.y, d = Math.hypot(dx, dy), toP = Math.atan2(dy, dx);
    if (e.dummy) { if (S.time - e.lastHit > 3 && e.shield < e.maxShield) e.shield = Math.min(e.maxShield, e.shield + dt * 40); a.vx = a.vy = 0; b.move = 'stand'; return; }
    // sight, a few times a second: in front (or close, or already fighting), in range, a clear line to the head
    if (e.think <= 0) {
      e.think = .18 + rnd() * .12;
      const fov = Math.cos(toP - e.yaw), range = (S.crouch ? 90 : 160) * M * (e.state === 'combat' ? 1.3 : 1);
      e.sees = S.alive && d < range && (fov > .35 || d < 16 * M || e.state === 'combat') && world.clear(a.x, a.y, a.z + 24, hero.x, hero.y, hero.z + S.eye - 2);
      if (e.sees) { e.last = [hero.x, hero.y, hero.z]; e.seen = S.time; if (e.state === 'idle' || e.state === 'patrol') awake(e, 'seen'); }
    }
    let goal = null, speed = 0, face = e.yaw;
    if (e.state === 'idle' || e.state === 'patrol') {   // stand watch, now and then a short walk round home
      e.t -= dt;
      if (e.t <= 0) { if (e.post || rnd() < .45) { e.goal = null; e.t = 2 + rnd() * 3; e.yaw += (rnd() - .5) * 2.4; } else { const an = rnd() * TAU, r = 4 + rnd() * 9; e.goal = [e.home[0] + Math.cos(an) * r * M, e.home[1] + Math.sin(an) * r * M]; e.t = 6 + rnd() * 4; } }
      if (e.goal) { goal = e.goal; speed = 34; if (Math.hypot(goal[0] - a.x, goal[1] - a.y) < 10) e.goal = null; }
      face = goal ? Math.atan2(goal[1] - a.y, goal[0] - a.x) : e.yaw;
    } else if (e.state === 'alert') {
      e.react -= dt; face = e.last ? Math.atan2(e.last[1] - a.y, e.last[0] - a.x) : e.yaw; if (e.react <= 0) e.state = 'combat';
    } else {   // the fight
      const lost = S.time - e.seen;
      if (e.sees) {
        face = toP;
        e.strafeT -= dt; if (e.strafeT <= 0) { e.strafe = -e.strafe; e.strafeT = .8 + rnd() * 1.6; e.crouch = !e.post && rnd() < .25; }
        const want = e.heavy ? 6 * M : e.post ? d : 26 * M, rad = d > want + 12 * M ? 1 : d < want - 10 * M ? -1 : 0, tx = dx / (d || 1), ty = dy / (d || 1);
        if (!e.post) { goal = [a.x + (tx * rad - ty * e.strafe * .8) * 60, a.y + (ty * rad + tx * e.strafe * .8) * 60]; speed = e.heavy && rad > 0 ? 80 : rad > 0 ? 70 : 48; }
        // shoot in bursts once facing the player
        if (e.fireCd <= 0 && Math.abs(((toP - e.yaw + Math.PI * 3) % TAU) - Math.PI) < .25 && e.flinch <= 0 && e.stun <= 0 && S.alive) {
          if (e.heavy && d > 30 * M) { /* (a shotgun: it closes first) */ }
          else { raiderShoot(e, d); e.burst--; if (e.burst <= 0) { e.burst = (e.heavy ? 1 : 3 + Math.floor(rnd() * 4)); e.fireCd = e.heavy ? 1.1 : .45 + rnd() * .6; e.burstN = 0; } else e.fireCd = e.heavy ? .9 : 1 / 8.5; }
        }
        if (d < 2.4 * M && e.melee <= 0 && Math.abs(hero.z - a.z) < 20) { e.melee = 1.3; e.b.act = 'melee'; e.b.actT = 0; e.meleeHit = .085; }
      } else if (lost < 9) {   // hunt: to where it was last seen
        if (e.last && !e.post) { goal = e.last; speed = 62; if (Math.hypot(e.last[0] - a.x, e.last[1] - a.y) < 14) e.last = null; }
        face = e.last ? Math.atan2(e.last[1] - a.y, e.last[0] - a.x) : e.yaw;
      } else { e.state = 'patrol'; e.t = 1; }
    }
    if (e.meleeHit !== undefined && e.meleeHit > 0 && (e.meleeHit -= dt) <= 0) {
      e.meleeHit = undefined;
      if (Math.hypot(hero.x - a.x, hero.y - a.y) < 3 * M && S.alive) { hurtPlayer(20, a.x, a.y); const n = nrm([dx, dy, 0]); hero.vx += n[0] * 160; hero.vy += n[1] * 160; A.sfx('punch'); game.shake(3); }
    }
    if (e.b.act === 'melee' && (e.b.actT += dt) > .55) e.b.act = null;
    // turning, then walking: round obstacles (a ray at the knees; it tries either side), slowed by a flinch
    e.yaw = E.approachAng(e.yaw, face, dt * (e.state === 'combat' ? 5 : 2.4)); e.pitch = e.sees ? Math.atan2(hero.z + 16 - (a.z + 24), d) : 0;
    let vx = 0, vy = 0;
    if (goal && speed) {
      let ang = Math.atan2(goal[1] - a.y, goal[0] - a.x);
      for (const off of [0, .7, -.7, 1.4, -1.4]) { const t = ang + off * (e.strafe || 1); if (!world.ray(a.x, a.y, a.z + 8, Math.cos(t), Math.sin(t), 0, 22, { skip: a, level: true })) { ang = t; break; } }
      const k = e.flinch > 0 || e.stun > 0 ? .25 : e.crouch ? .55 : 1; vx = Math.cos(ang) * speed * k; vy = Math.sin(ang) * speed * k;
    }
    a.vx = approach(a.vx, vx, 500 * dt); a.vy = approach(a.vy, vy, 500 * dt);
    a.facing = e.yaw;
    // keep off the player (heroes pass through each other)
    if (d < 11) { const n = d > .1 ? [dx / d, dy / d] : [1, 0]; a.vx -= n[0] * 80; a.vy -= n[1] * 80; }
  }
  /** a raider's shot: from its gun at the player's chest, spread by distance and the player's motion; a near miss
   *  whizzes past; its tracer burns orange */
  function raiderShoot(e, d) {
    const a = e.a, eye = [a.x, a.y, a.z + 23 * e.b.k], ap = e.aimP || [hero.x, hero.y, hero.z], tgt = [ap[0], ap[1], ap[2] + (S.crouch ? 11 : S.move === 'slide' ? 7 : 17)], dist = Math.hypot(...sub(tgt, eye));
    const W = WEAPONS[e.b.weapon], sp = Math.hypot(hero.vx, hero.vy), spread = .03 + dist / M * .0008 + sp / RUN * .028 + (S.move === 'slide' ? .03 : 0) + (S.move === 'air' || S.move === 'zip' ? .025 : 0) - Math.min(.018, e.burstN * .005);
    const f = nrm(sub(tgt, eye)), r = nrm(cross(f, UP)), u = cross(r, f);
    for (let p = 0; p < W.pellets; p++) {
      const an = rnd() * TAU, rr = Math.sqrt(rnd()) * (spread + (W.pellets > 1 ? .07 : 0)), dd = nrm(add(add(f, r, Math.cos(an) * rr), u, Math.sin(an) * rr));
      const h = world.ray(eye[0], eye[1], eye[2], dd[0], dd[1], dd[2], 260 * M, { skip: a }), end = h ? [h.x, h.y, h.z] : add(eye, dd, 260 * M);
      const mz = e.b.G ? at(e.b.G, W.pellets > 1 ? 14 : 12.6, W.pellets > 1 ? .95 : .55) : add(eye, dd, 10);
      if (p < 3) tracer(mz, end, '#ff9a5a', 6000, .55);
      if (h && h.actor === hero) hurtPlayer(W.pellets > 1 ? 9 * falloff(W, dist) : 10, a.x, a.y);   // (three raiders in the open kill a player who stands still in under ten seconds; moving, much later)
      else { if (h) impact(h, .6); const c = [hero.x, hero.y, hero.z + S.eye], t = dot(sub(c, eye), dd); if (t > 0 && (!h || h.dist > t) && Math.hypot(...sub(add(eye, dd, t), c)) < 1.8 * M) A.sfx('whiz', { vol: .7 }); }
    }
    e.burstN++; e.flash = 1; e.b.rec.v += 30;
    A.sfx(W.pellets > 1 ? 'sg' : 'ar2', { vol: clamp(1.1 - d / (220 * M), .12, .75), vary: .08 });
  }
  /** damage to the player: the shield first (it cracks), then health; where it came from shows round the crosshair */
  function hurtPlayer(dmg, fx, fy) {
    if (!S.alive || S.won) return;
    const toS = Math.min(S.shield, dmg); S.shield -= toS; S.hp -= dmg - toS; S.hurtT = .45; S.lastHurt = S.time;
    S.hitDirs.push({ a: Math.atan2(fy - hero.y, fx - hero.x), t: 1.3 }); if (S.hitDirs.length > 6) S.hitDirs.shift();
    A.sfx(toS > 0 && S.shield > 0 ? 'shieldhit' : toS > 0 ? 'shieldbreak' : 'ouch', { vol: .9 }); S.punchR.v += (rnd() - .5) * 12; S.punchP.v += 4;
    pb.hit[0] += (hero.x - fx) * .02; pb.hit[1] += (hero.y - fy) * .02;
    if (S.hp <= 0) { S.hp = 0; S.alive = false; S.lost = true; pb.move = 'dead'; pb.dead = { t: 0, dir: Math.atan2(hero.y - fy, hero.x - fx), g: hero.z }; S.view = 'third'; game.after(2.6, () => game.go('over', { from: 'shooter', world, lines: ['RAIDERS DOWN ' + S.kills + '   OUTPOSTS ' + S.cleared + ' OF 5'] })); }
  }
  function outpostCleared(o) {
    S.cleared++; S.banner = { text: o.name + ' CLEARED', sub: S.cleared + ' OF 5 OUTPOSTS', t: 3.5 }; A.sfx('secret');
    if (S.cleared >= 5 && !S.won) { S.won = true; game.after(4, () => game.go('over', { from: 'shooter', world, won: true, title: 'AREA SECURED', lines: ['RAIDERS DOWN ' + S.kills, 'TIME ' + Math.floor(S.time / 60) + ':' + String(Math.floor(S.time % 60)).padStart(2, '0')] })); }
  }

  /* =====================================================================
   * THE OUTPOSTS' WORKING PARTS: doors (E swings one open away from you, or shut; a kick bursts it off its hinges and
   * it flies, tumbles and lies there), supply bins (E lifts the lid: loot pops out), loot to walk over, grenades
   * ===================================================================== */
  const doorDir = d => [Math.cos(d.yaw + d.ang), Math.sin(d.yaw + d.ang)];
  function toggleDoor(d) {
    const side = Math.sign((hero.x - d.x) * -Math.sin(d.yaw) + (hero.y - d.y) * Math.cos(d.yaw)) || 1;
    if (d.want === 0) { d.want = -side * 1.8; A.sfx('dooropen'); } else if (Math.hypot(hero.x - d.x, hero.y - d.y) > 13) { d.want = 0; A.sfx('doorshut'); }
  }
  function breakDoor(d, f) {
    if (d.state === 'broken') return;
    d.state = 'broken'; if (d.block) { world.remove(d.block); d.block = null; }
    const dd = doorDir(d), c = [d.hx + dd[0] * d.w / 2, d.hy + dd[1] * d.w / 2];
    d.deb = { x: c[0], y: c[1], z: d.z + d.h / 2, vx: f[0] * 230, vy: f[1] * 230, vz: 70, yaw: d.yaw + d.ang, spin: (rnd() - .5) * 4, tip: 0, tipV: 5.5, n: [f[0], f[1]], rest: false };
    P.bits(c[0], c[1], d.z + d.h * .5, 14, ['#6a5a48', '#8a7660', '#3a3028']); P.dust(c[0], c[1], d.z + 4, 10, { speed: 60, color: '#c8b8a0', size: 2 }); P.dust(c[0], c[1], d.z + d.h * .6, 6, { speed: 40, color: '#c8b8a0', size: 1.6 });
  }
  function stepDoors(dt) {
    for (const d of doors) {
      if (d.state === 'broken') {   // the panel: thrown, spinning, tipping over until it lies flat; then it slides to a stop
        const b = d.deb; if (!b || b.rest) continue;
        b.vz -= GRAV * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.yaw += b.spin * dt; b.tipV += 7 * dt; b.tip = Math.min(Math.PI / 2, b.tip + b.tipV * dt);
        const g = world.ground(b.x, b.y), low = g + 1 + Math.cos(b.tip) * d.h / 2 + Math.sin(b.tip) * d.t / 2;
        if (b.z <= low) { b.z = low; b.vz = Math.abs(b.vz) > 60 ? -b.vz * .2 : 0; const k = Math.max(0, 1 - dt * 5); b.vx *= k; b.vy *= k; b.spin *= k; if (b.tip >= Math.PI / 2 - .01 && Math.hypot(b.vx, b.vy) < 4) { b.rest = true; P.dust(b.x, b.y, g, 6, { speed: 30, color: '#c8b8a0', size: 1.8 }); A.sfx('land'); } }
        continue;
      }
      d.ang = approach(d.ang, d.want, dt * 4.5);
      const shut = Math.abs(d.ang) < .3;
      if (shut && !d.block) d.block = world.block({ x: d.x, y: d.y, z: d.z, w: d.w, d: 2.4, h: d.h, yaw: d.yaw });
      else if (!shut && d.block) { world.remove(d.block); d.block = null; }
    }
  }
  /** what's in reach to use: a zipline, a door in front, a bin in front (for the prompt and for E) */
  function nearUse() {
    const z = S.move !== 'zip' ? nearZip() : null; if (z) return { zip: z, what: 'ZIPLINE' };
    const d = doorAhead(); if (d) return { door: d, what: d.want ? 'CLOSE DOOR' : 'OPEN DOOR', kick: true };
    const b = bins.find(q => !q.used && Math.hypot(q.x - hero.x, q.y - hero.y) < 28 && Math.abs(q.z - hero.z) < 20 && Math.cos(Math.atan2(q.y - hero.y, q.x - hero.x) - S.yaw) > .4); if (b) return { bin: b, what: 'OPEN SUPPLY BIN' };
    return null;
  }
  const LOOT = { ammo_r: ['RIFLE AMMO', '#d8b46a'], ammo_s: ['SHELLS', '#e8743a'], cell: ['SHIELD CELL', '#6ac8ff'], syringe: ['SYRINGE', '#f0f0f0'], nade: ['FRAG GRENADE', '#7aa04a'] };
  function openBin(b) {
    b.used = true; b.want = 1; A.sfx('bin');
    const kinds = ['ammo_r', rnd() < .5 ? 'ammo_s' : 'ammo_r', 'cell', rnd() < .6 ? 'syringe' : 'cell', rnd() < .45 ? 'nade' : 'ammo_s'];
    kinds.forEach((k, i) => { const a = b.yaw - Math.PI / 2 + (i - 2) * .5; dropLoot(b.x + Math.cos(a) * 14, b.y + Math.sin(a) * 14, b.z, k); });
  }
  function dropLoot(x, y, z, kind) { loot.push({ kind, x, y, z: world.ground(x, y) > z + 6 ? world.ground(x, y) : z, t: rnd() * 3, pop: 0 }); }
  function stepLoot(dt) {
    for (const b of bins) b.open = approach(b.open, b.want || 0, dt * 3);
    for (let i = loot.length - 1; i >= 0; i--) {
      const q = loot[i]; q.t += dt; q.pop = Math.min(1, q.pop + dt * 3);
      if (q.pop < 1 || Math.hypot(q.x - hero.x, q.y - hero.y) > 13 || Math.abs(q.z - hero.z) > 22 || !S.alive) continue;
      const am = S.ammo; let ok = true;
      if (q.kind === 'ammo_r') am.rifle[1] += 56; else if (q.kind === 'ammo_s') am.shotgun[1] += 12;
      else if (q.kind === 'cell') { if (S.shield >= SHIELD) ok = false; else S.shield = Math.min(SHIELD, S.shield + 35); }
      else if (q.kind === 'syringe') { if (S.hp >= HP) ok = false; else S.hp = Math.min(HP, S.hp + 30); }
      else if (q.kind === 'nade') { if (S.nades >= 4) ok = false; else S.nades++; }
      if (!ok) continue;
      loot.splice(i, 1); A.sfx(q.kind === 'cell' ? 'cellup' : 'pickup'); S.feed.unshift({ text: '+ ' + LOOT[q.kind][0], t: 2.5, c: LOOT[q.kind][1] }); S.feed.length = Math.min(S.feed.length, 4);
      P.glints(q.x, q.y, q.z + 6, 6, LOOT[q.kind][1]);
    }
  }
  /* ---- their drawing (the pen, each frame) ---- */
  function drawWorks(pen, cx, cy, al = 1) {
    pen.at(); const far = 110 * M;
    for (const d of doors) {
      if (Math.hypot(d.x - cx, d.y - cy) > far) continue;
      let c, u, ac;
      if (d.state === 'broken') { const b = d.deb; if (!b) continue; const n = [Math.cos(b.yaw + Math.PI / 2), Math.sin(b.yaw + Math.PI / 2), 0], s = Math.sign(n[0] * b.n[0] + n[1] * b.n[1]) || 1; ac = [Math.cos(b.yaw), Math.sin(b.yaw), 0]; u = add(mul(UP, Math.cos(b.tip)), n, Math.sin(b.tip) * s); c = [b.x, b.y, b.z]; }
      else { const dd = doorDir(d); ac = [dd[0], dd[1], 0]; u = UP; c = [d.hx + dd[0] * d.w / 2, d.hy + dd[1] * d.w / 2, d.z + d.h / 2]; }
      const a = add(c, u, -d.h / 2 + .4), b = add(c, u, d.h / 2 - .4), nn = nrm(cross(ac, u));
      pen.slab(...a, ...b, ...ac, d.w - .6, d.t, d.color);
      pen.slab(...add(add(c, u, d.h * .18), ac, 0), ...add(add(c, u, d.h * .34), ac, 0), ...ac, d.w * .5, d.t + .3, '#3a3430');   // a vision slit
      for (const s of [-1, 1]) pen.ball(...add(add(add(c, ac, d.w * .36), u, -d.h * .03), nn, s * d.t), .55, .55, .55, '#c8b070');
      pen.slab(...add(c, u, -d.h * .46), ...add(c, u, -d.h * .40), ...ac, d.w - .5, d.t + .2, '#4a4038');
    }
    for (const b of bins) {   // a supply bin: a base with a glowing stripe, its lid turning up about the back edge
      if (Math.hypot(b.x - cx, b.y - cy) > far) continue;
      pen.at(b.x, b.y, b.z, b.yaw); const o = b.open, a = o * 1.9, W2 = 17.6, D = 10, Hb = 8;
      pen.box(0, 0, Hb / 2, W2, D, Hb, '#2f5560').box(0, -D / 2 - .1, Hb * .62, W2 - 2, .4, 1.1, b.used ? '#4a6a70' : '#ffd060').box(0, 0, .6, W2 + 1, D + 1, 1.2, '#1e3036');
      pen.bar(0, D / 2, Hb + .8, 0, D / 2 - D * Math.cos(a), Hb + .8 + D * Math.sin(a), W2, 1.6, '#365f6a');
      if (!b.used) pen.halo(0, 0, Hb + 2, 10, [.25, .2, .04]);
      else if (o > .3) pen.glow(0, 0, Hb, 1.6 * o, '#9af0ff');
      pen.at();
    }
    for (const q of loot) {   // loot: a little model each, bobbing and turning in a halo of its color
      if (Math.hypot(q.x - cx, q.y - cy) > far) continue;
      const pz = q.z + 4 + Math.sin(q.t * 2.6) * 1.2 + (1 - q.pop) * 8, col = LOOT[q.kind][1]; pen.at(q.x, q.y, pz, q.t * 1.4);
      if (q.kind === 'ammo_r' || q.kind === 'ammo_s') pen.box(0, 0, 0, 5, 3.4, 3, '#4a5038').box(0, 0, 1.7, 4, 2.6, .6, col);
      else if (q.kind === 'cell') pen.tube(0, 0, -2, 0, 0, 2.6, 1.6, '#2a4a6a').tube(0, 0, -1, 0, 0, 1.6, 1.7, col).glow(0, 0, 3, .7, '#c8f0ff');
      else if (q.kind === 'syringe') pen.tube(-3, 0, 0, 2, 0, 0, .8, '#e8e8e8').tube(2, 0, 0, 4, 0, 0, .25, '#c8c8c8').box(-3.5, 0, 0, .6, 2.4, 2.4, '#c83a3a');
      else pen.ball(0, 0, 0, 1.9, 1.9, 2.2, '#4a6a34').box(0, 0, 2.2, 1, 1, 1.2, '#8a8a80');
      pen.at(); pen.halo(q.x, q.y, pz, 7, lin3(col, .22));
    }
    for (const g of nades) { const q = between(g.ip, g.x, g.y, g.z, al); pen.at(q[0], q[1], q[2], g.spin); pen.ball(0, 0, 0, 1.6, 1.6, 1.9, '#4a6a34').box(0, 0, 1.9, .8, .8, 1, '#8a8a80'); pen.at(); if ((g.t * 4) % 1 < .5) pen.glow(g.x, g.y, g.z + 2.4, .45, '#ff3a2a'); }
    pen.at();
  }
  const lin3 = (hex, k) => linOf(hex).map(v => v * k);

  /* =====================================================================
   * FIRST PERSON: the arms and the gun in the overlay (its pen: x ahead of the eye, y right, z up, engine units),
   * layered: the stance (from the hip, down the sights, low at a sprint, canted crouched, rolled on a slide), the sway
   * as the view turns, the walk's bob, each shot's kick, a landing's dip; reloads, swaps, punches, kicks, throws; hands
   * that grab ledges, rungs and the cable; brass that flies out. Drawn each frame (the picture only)
   * ===================================================================== */
  const vm = { travS: SPR(), lh: null, sx: SPR(), sy: SPR(), kick: SPR(), kp: SPR(), kr: SPR(), dip: SPR(), ly: null, lp: 0, ph: 0, spr: 0, cr: 0, sl: 0, trav: 0, shots: 0, land: 0, brass: [], pump: 9 };
  const VM = { rifle: { hip: [8.6, 4.4, -5.7], ads: [6, 0, -2.32] }, shotgun: { hip: [7.6, 4.5, -5.5], ads: [6.6, 0, -1.41] } };
  const SH = [[0, -4.4, -9.4], [0, 4.4, -9.4]], VLU = 8.6, VLF = 8.6;
  /** the keyframes of a path: [[t, point], ...] eased between, held past the ends */
  function keysAt(keys, t) { if (t <= keys[0][0]) return keys[0][1]; for (let i = 0; i < keys.length - 1; i++) if (t < keys[i + 1][0]) return mixv(keys[i][1], keys[i + 1][1], win(t, keys[i][0], keys[i + 1][0])); return keys[keys.length - 1][1]; }
  function drawViewModel(pen, dt, cam) {
    const W = WEAPONS[S.cur], V = VM[S.cur], h = hero, sp = Math.hypot(h.vx, h.vy), c = LOOKS.player, t = S.actT;
    const CF = frameYP([cam.x, cam.y, cam.z], cam.yaw, cam.pitch, cam.roll), cs = p => { const d = sub(p, CF.o); return [dot(d, CF.f), dot(d, CF.r), dot(d, CF.u)]; };
    // the springs: sway lags the turn, kicks per shot, a dip per landing
    const dyaw = vm.ly === null ? 0 : ((cam.yaw - vm.ly + Math.PI * 3) % TAU) - Math.PI, dpit = vm.ly === null ? 0 : cam.pitch - vm.lp; vm.ly = cam.yaw; vm.lp = cam.pitch;
    const sw = 1 - S.adsB * .7, rate = dt > 0 ? 1 / dt : 0;
    spring(vm.sx, clamp(-dyaw * rate * .3, -1.8, 1.8) * sw, 110, 13, dt); spring(vm.sy, clamp(dpit * rate * .3, -1.4, 1.4) * sw, 110, 13, dt);
    for (; vm.shots < S.shots; vm.shots++) {
      const kq = W.punch / 1.1; vm.kick.x += Math.min(2.4, .55 * kq) * (1 - S.adsB * .35); vm.kp.x += Math.min(1.6, .95 * kq) * (1 - S.adsB * .4); vm.kr.x += (Math.random() - .5) * Math.min(2, kq);   // (back, the muzzle up six degrees, a roll: big enough to read at a low resolution)
      if (S.cur === 'rifle') vm.brass.push({ p: null, v: [11 + Math.random() * 5, 46 + Math.random() * 12, 40 + Math.random() * 10], t: 0, s: Math.random() * 6 });
    }
    if (S.cur === 'shotgun' && S.pumpT < vm.pump && S.pumpT < .2) vm.brass.push({ p: null, v: [14, 36, 40], t: 0, s: 2, shell: true }); vm.pump = S.pumpT;
    if (S.landT && S.landT !== vm.land) { vm.land = S.landT; vm.dip.v -= Math.min(60, S.landV * .16); }
    spring(vm.kick, 0, 300, 26, dt); spring(vm.kp, 0, 240, 22, dt); spring(vm.kr, 0, 220, 20, dt);   // (two thirds back by the next shot: at 13 a second the gun chatters) spring(vm.dip, 0, 150, 13, dt);
    const ap = (v, to, r2) => v + (to - v) * Math.min(1, dt * r2), trav = ['mantle', 'vault', 'climb', 'ladder'].includes(S.move);
    vm.spr = ap(vm.spr, S.sprint && S.move === 'stand' && !S.act ? 1 : 0, 9); vm.cr = ap(vm.cr, S.move === 'crouch' ? 1 : 0, 9); vm.sl = ap(vm.sl, S.move === 'slide' ? 1 : 0, 11); spring(vm.travS, trav ? 1 : 0, 300, 34.6, dt); vm.trav = clamp(vm.travS.x, 0, 1);
    // the walk's bob (a figure of eight), stronger at a sprint, small down the sights; breathing when still
    const walking = h.grounded && (S.move === 'stand' || S.move === 'crouch') && sp > 5;
    if (walking) vm.ph = (vm.ph + sp / (30 + sp * .26) * dt) % 1;
    const amp = (walking ? clamp(sp / RUN, 0, 1) : 0) * (1 - S.adsB * .85) * (1 + vm.spr * .6), s1 = Math.sin(vm.ph * TAU), c1 = Math.cos(vm.ph * TAU), br = Math.sin(drawT * 1.6) * (1 - S.adsB * .8);
    // the stance: hip to sights, then the sprint's low ready, crouch, slide, traversal (gun away)
    let o = mixv(V.hip, V.ads, ease(S.adsB)), pit = .02 * (1 - S.adsB), yw = -.035 * (1 - S.adsB), rl = 0;
    o = add(o, [-Math.min(2.4, vm.kick.x * 1.8), vm.sx.x * .7 + s1 * .42 * amp, vm.sy.x * .5 - Math.abs(c1) * .5 * amp + br * .07 - vm.dip.x * .09 - clamp(h.vz * .012, -1.8, 1.8) * (S.move === 'air' ? 1 : 0)]);
    pit += vm.kp.x * .12 - (S.move === 'air' ? clamp(h.vz * .0003, -.04, .04) : 0) - vm.sy.x * .02 + Math.cos(vm.ph * TAU * 2) * .012 * amp + br * .004; yw += vm.sx.x * .025; rl += vm.kr.x * .08 + vm.sx.x * .05 + s1 * .03 * amp;
    o = mixv(o, add([7.6, 3.2, -3.9], [0, s1 * .8, -Math.abs(c1) * .9]), vm.spr); pit -= (.2 + c1 * .03) * vm.spr; yw -= (.72 + s1 * .04) * vm.spr; rl -= (.78 + s1 * .06) * vm.spr;   // (the sprint: canted across the body, muzzle down and left, swinging with the stride)
    o = add(o, [-.8 * vm.cr - .2 * vm.sl, -.4 * vm.cr + .6 * vm.sl, -.7 * vm.cr - 1.1 * vm.sl - 14 * vm.trav]); rl += .34 * vm.cr - .5 * vm.sl + .5 * vm.trav; yw -= .1 * vm.sl; pit += .06 * vm.cr + .12 * vm.sl - .9 * vm.trav;   // (crouched: low and central; a slide: down and out to the right, canted the camera's way)   // (crouched: a little lower and closer; a slide: canted hard, the muzzle up, kept in view)
    let F = turn({ o, f: [1, 0, 0], u: [0, 0, 1], r: [0, 1, 0] }, pit, yw, rl), st = { mag: 0, bolt: 0, pump: S.cur === 'shotgun' ? pumpCurve(S.pumpT) : 0, flash: S.flash };
    // the actions move the gun (and the left hand)
    let Lh = null, leg = null, nade = null;
    if (S.act === 'reload') {
      const R = reloadCurve(S.cur, t, S.actDur, S.reloadEmpty), k = Math.max(0, Math.min(1, R.roll / .5));
      F = turn(F, R.pitch, R.yaw, R.roll); F.o = add(add(F.o, F.u, R.lift * .5), [0, -2 * k, .9 * k]);
      Lh = at(F, ...R.hand); st.mag = R.mag; st.bolt = R.bolt; if (R.mag === 1) st.magP = add(add(Lh, F.u, 2.1), F.f, -.35); if (R.shell) st.shellP = add(Lh, F.f, -.4);
    } else if (S.act === 'swap') { const lo = Math.sin(clamp(t / .5, 0, 1) * Math.PI); F = turn(F, -.9 * lo, 0, .3 * lo); F.o = add(F.o, [0, 0, -10 * lo]); }
    else if (S.act === 'melee' || S.act === 'kick' || S.act === 'throw') {
      const d = S.act === 'melee' ? win(t, 0, .06) * (1 - win(t, .26, .44)) : win(t, 0, .1) * (1 - win(t, S.act === 'kick' ? .45 : .38, S.act === 'kick' ? .7 : .6)); F = turn(F, -.6 * d, .45 * d, .8 * d); F.o = add(F.o, [-.8 * d, 1.6 * d, (S.act === 'kick' ? -7 : -4.5) * d]);
      if (S.act === 'kick') leg = keysAt([[0, [1.5, 1.6, -20]], [.12, [6.5, 1.3, -12.5]], [.22, [13.6, .6, -5.6]], [.36, [10, 1, -9.5]], [.7, [1.5, 1.6, -20]]], t);
    }
    // the hands: the right on the grip; the left on the handguard (the pump), the mag, a fist, or what the body holds
    const pump = S.cur === 'shotgun' ? st.pump * 2.3 : 0, grip = at(F, -.5, -1.5, 0), guard = at(F, W.fore - pump, -.35, -.2);
    let L2 = Lh || guard, R2 = grip;
    if (S.act === 'melee') L2 = keysAt([[0, guard], [.035, [6, -5.8, -3.9]], [.058, [5.6, -5.6, -4.2]], [.085, [13.5, -1.1, -1.3]], [.1, [12.4, -1.5, -1.9]], [.13, [9.6, -2.8, -3.2]], [.19, [7.2, -3.9, -4.1]], [.32, guard]], t);   // (cocked low left, a straight jab to the middle, held through the hit-stop, home)
    if (S.act === 'throw') { L2 = keysAt([[0, guard], [.16, [6.5, -3.6, -4]], [.36, [1.6, -7.2, 1.6]], [.47, [13, -1.6, .6]], [.78, guard]], t); nade = t < .46; }
    if (pb.ledge && (S.move === 'mantle' || S.move === 'vault' || S.move === 'climb')) {
      const e = pb.ledge, wn = pb.wallN || [0, 0, 0], sd = nrm(cross(UP, wn)), up = S.move === 'climb' ? drawT * 7 : 0;
      const hl = add(add(e, sd, 3), wn, .6), hr = add(add(e, sd, -3), wn, .6);
      if (S.move === 'climb') { const hz = cam.z; hl[2] = hz + 3 + Math.max(0, Math.sin(up)) * 5; hr[2] = hz + 3 + Math.max(0, Math.sin(up + Math.PI)) * 5; }
      vm.lh = [hl, hr];
    } else if (vm.trav < .05) vm.lh = null;
    if (vm.trav > .05 && vm.lh) { L2 = mixv(L2, cs(vm.lh[0]), vm.trav); R2 = mixv(R2, cs(vm.lh[1]), vm.trav); }   // (over the top, the hands leave the ledge as the arms come back)
    if (S.move === 'ladder' && S.ladder) { const Ld = S.ladder, f = [Math.cos(Ld.yaw), Math.sin(Ld.yaw), 0], s = [-f[1], f[0], 0], st2 = .3 * M, rung = i => { const z = Math.floor((cam.z + (i ? st2 / 2 : 0)) / st2) * st2 + (i ? 0 : st2 / 2) + 2; return cs(add(add([Ld.x, Ld.y, 0], s, (i ? 1 : -1) * .24 * M), [0, 0, Math.min(Ld.z1 + .8 * M, z)])); }; L2 = mixv(L2, rung(0), vm.trav); R2 = mixv(R2, rung(1), vm.trav); }
    if (S.move === 'zip' && pb.zipP) L2 = cs(pb.zipP);
    // draw: the gun, the arms (sleeves, bracers, gloves), a grenade, the kicking leg, the brass
    vm.F = F; vm.L = L2; vm.R = R2; pen.at();
    if (vm.trav < .9) drawGun(pen, F, S.cur, st, 1);
    const tube = (a, b, r, col) => pen.tube(a[0], a[1], a[2], b[0], b[1], b[2], r, col), ball = (p, r, col) => pen.ball(p[0], p[1], p[2], r, r, r, col);
    const jab = S.act === 'melee' ? win(t, 0, .05) * (1 - win(t, .2, .32)) : 0, shL = add(SH[0], [-1.5, -1.2, -2.6], jab);   // (a jab drops the shoulder: the upper arm stays under the picture)
    [[shL, L2, nrm([-.2, -1, -1 - jab])], [SH[1], R2, nrm([-.3, 1, -1])]].forEach(([sh, hand, hint], i) => {
      const [el] = ik(sh, hand, VLU, VLF, hint), fd = nrm(sub(hand, el));
      tube(sh, el, 1.25, c.cloth); ball(el, 1.05, c.dark); tube(el, hand, .98, c.cloth);
      pen.slab(...add(el, fd, 1.6), ...add(el, fd, 5.4), ...nrm(cross(fd, [0, 0, 1])), 1.75, 1.85, c.plate);   // a bracer
      const knu = add(hand, fd, .85), side = nrm(cross(fd, i ? F.f : [0, 0, 1]));
      if (i === 0 && jab > .2) {   // a fist: wide across the knuckles, a guard on its back, the thumb across the front
        const up = nrm(cross(side, fd)), z = 1 + .2 * jab;
        pen.slab(...add(hand, fd, -1.2), ...add(hand, fd, 1.25), ...side, 2.1 * z, 1.7 * z, c.glove); tube(add(hand, fd, -1.7), add(hand, fd, -.7), 1.05, c.dark);
        for (let q = 0; q < 4; q++) ball(add(add(add(hand, fd, 1.3), side, (q - 1.5) * .5 * z), up, .32 * z), .4 * z, c.dark);
        pen.slab(...add(add(hand, fd, -.7), up, .88 * z), ...add(add(hand, fd, .95), up, .88 * z), ...side, 1.5 * z, .22, E.shade(c.glove, .22));
        tube(add(add(hand, fd, .55), up, -.75 * z), add(add(add(hand, fd, .85), up, -.55 * z), side, .85 * z), .36 * z, c.glove);
      } else { pen.slab(...add(hand, fd, -1.1), ...knu, ...side, 1.55, 1.05, c.glove); ball(knu, .68, c.glove); tube(add(hand, fd, -1.5), add(hand, fd, -.6), .98, c.dark); }
      if (i === 0 && nade) { const g = add(knu, fd, 1); pen.ball(...g, 1.6, 1.6, 1.9, '#4a6a34'); }
    });
    if (leg) {
      // the leg that kicks a door in: the boot comes up toe first, its sole flat to the door at the blow
      const hip = [-2, 1.4, -17], [kn] = ik(hip, leg, 8.6, 8.2, [1, .1, 1]), up = win(t, .08, .22) * (1 - win(t, .36, .6)), toe = nrm(mixv([1, 0, -.35], [.55, 0, .85], up)), fr = nrm(cross(toe, [0, 0, 1])), top = nrm(cross(fr, toe));
      tube(hip, kn, 1.9, c.cloth); ball(add(kn, [1, 0, .2], .6), 1.5, c.dark); tube(kn, leg, 1.4, c.cloth); pen.slab(...add(add(leg, [0, 0, 1], 1), [1, 0, 0], .9), ...add(add(kn, [0, 0, -1], 1.6), [1, 0, 0], .9), ...fr, 1.8, .7, c.plate);
      pen.slab(...add(leg, toe, -1.5), ...add(leg, toe, 2.6), ...fr, 2.3, 2, c.boot); ball(add(leg, toe, 2.7), 1.15, c.boot);
      pen.slab(...add(add(leg, toe, -1.6), top, -1.15), ...add(add(leg, toe, 3.1), top, -1.15), ...fr, 2.5, .55, '#4a4038'); pen.slab(...add(add(leg, toe, -.6), top, .95), ...add(add(leg, toe, 2), top, .9), ...fr, .9, .25, '#6a6052');   // (the sole, the laces)
    }
    for (let i = vm.brass.length - 1; i >= 0; i--) {   // brass from the ejection port (the shotgun's red shell from the pump)
      const b = vm.brass[i]; if (!b.p) b.p = at(F, .9, 1.05, .65); b.t += dt; if (b.t > .36) { vm.brass.splice(i, 1); continue; }   // (up and out over the right edge, clear of the ammo count)
      b.v[2] -= 300 * dt; b.p = add(b.p, b.v, dt); b.s += dt * 22;
      const ax = [Math.cos(b.s) * .4, Math.cos(b.s * .7), Math.sin(b.s)], l = b.shell ? .9 : .3; pen.tube(...b.p, ...add(b.p, ax, l), b.shell ? .25 : .065, b.shell ? '#c83a2a' : '#b8902c');
      if (b.shell) pen.tube(...b.p, ...add(b.p, ax, .24), .27, '#c8a040');   // (its brass head)
    }
  }

  /* =====================================================================
   * THE HUD: a crosshair that opens with the spread, hit markers (white, yellow for a head, red for a kill), damage
   * numbers that add up on one target (blue on a shield), shield and health, the gun and its ammo, a compass with the
   * outposts on it, the feed, what's in reach, where a hit came from, red edges when hurt
   * ===================================================================== */
  function spreadNow() { const W = WEAPONS[S.cur]; return lerp(W.hip, W.adsSpread, S.adsB) + (W.pellets > 1 ? 0 : clamp(Math.hypot(hero.vx, hero.vy) / RUN, 0, 1) * .03 * (1 - S.adsB * .7) + (hero.grounded ? 0 : .05) + S.bloom); }
  const MARKS = ['shield', 'hit', 'head', 'break', 'kill'], strongest = (a, b) => !a || MARKS.indexOf(b) > MARKS.indexOf(a) ? b : a;
  /** a hit marker (an X round the crosshair that pops out and settles): 'shield' blue, 'hit' white, 'head' yellow,
   *  'break' (a shield broken) purple and wide, 'kill' red, thick and longer; a kill's stays over the next hits */
  function hitmark(kind) { if (!S.mark || S.mark.kind !== 'kill' || S.mark.t <= 0) S.mark = { kind, t: kind === 'kill' ? .5 : kind === 'break' ? .32 : .24, dur: kind === 'kill' ? .5 : kind === 'break' ? .32 : .24 }; }
  function dmgNumber(p, v, head, col) {
    const q = S.nums.find(n => n.t < .6 && Math.hypot(n.p[0] - p[0], n.p[1] - p[1]) < 30);
    if (q) { q.v += v; q.t = Math.min(q.t, .1); q.head = q.head || head; q.col = col || null; q.p = p; } else S.nums.push({ p, v, head, col, t: 0 });
  }
  const BEARING = a => ((a + Math.PI / 2) / TAU * 360 % 360 + 360) % 360;   // north is up the map (-y)
  function hud(g, r) {
    const W = r.W, H = r.H, cx = Math.round(W / 2), cy = Math.round(H / 2), F = E.font, WP = WEAPONS[S.cur], am = S.ammo[S.cur], OL = '#0b0814';
    const rect = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    const red = Math.max(S.hurtT * 1.1, S.alive && S.hp < 35 ? (35 - S.hp) / 35 * (.32 + .1 * Math.sin(S.time * 6)) : 0);
    if (red > .01) { const gr = g.createRadialGradient(cx, cy, Math.min(W, H) * .32, cx, cy, Math.hypot(W, H) * .56); gr.addColorStop(0, 'rgba(150,0,0,0)'); gr.addColorStop(1, 'rgba(170,12,12,' + Math.min(.62, red) + ')'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
    // the crosshair (not down the sights: the sight has its own), the hit marker
    if (S.alive && S.adsB < .55 && !['ladder', 'mantle', 'climb'].includes(S.move)) {
      const gap = Math.round(2 + spreadNow() * H * 1.25), L = S.cur === 'shotgun' ? 2 : 3, a = 1 - S.adsB * 1.6;
      g.globalAlpha = clamp(a, 0, 1);
      if (S.cur === 'shotgun') { g.strokeStyle = OL; g.lineWidth = 3; g.beginPath(); g.arc(cx + .5, cy + .5, gap + 2, 0, TAU); g.stroke(); g.strokeStyle = '#ffffff'; g.lineWidth = 1; g.beginPath(); g.arc(cx + .5, cy + .5, gap + 2, 0, TAU); g.stroke(); }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = cx + dx * (gap + (dx > 0 ? 0 : L)) - (dx < 0 ? 0 : 0), y = cy + dy * (gap + (dy > 0 ? 0 : L)); const w = dx ? L : 1, h = dy ? L : 1; rect(x - 1 - (dx < 0 ? 0 : 0), y - 1, w + 2, h + 2, OL); }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = cx + dx * (gap + (dx > 0 ? 0 : L)), y = cy + dy * (gap + (dy > 0 ? 0 : L)); rect(x, y, dx ? L : 1, dy ? L : 1, '#ffffff'); }
      rect(cx - 1, cy - 1, 3, 3, OL); rect(cx, cy, 1, 1, '#ffffff');
      g.globalAlpha = 1;
    }
    if (S.mark && S.mark.t > 0) {
      const k = S.mark.kind, c = { shield: '#8ad8ff', hit: '#ffffff', head: '#ffd23a', break: '#c89aff', kill: '#ff3a2a' }[k], u = 1 - S.mark.t / S.mark.dur;
      const pop = Math.round(3 * Math.max(0, 1 - u * 5)), big = k === 'kill' || k === 'break', i0 = 4 + pop + (big ? 1 : 0), i1 = (big ? 10 : 8) + pop, th = k === 'kill' ? 2 : 1;
      g.globalAlpha = u > .7 ? (1 - u) / .3 : 1;
      for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) for (let i = i0; i <= i1; i++) rect(cx + sx * i - (sx < 0 ? th : 0) - 1, cy + sy * i - (sy < 0 ? th : 0) - 1, th + 2, th + 2, OL);
      for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) for (let i = i0; i <= i1; i++) rect(cx + sx * i - (sx < 0 ? th : 0), cy + sy * i - (sy < 0 ? th : 0), th, th, c);
      g.globalAlpha = 1;
    }
    // where hits came from: red arcs round the middle
    for (const hd of S.hitDirs) {
      const rel = hd.a - S.yaw, R0 = 34, a0 = rel - Math.PI / 2;
      g.strokeStyle = 'rgba(255,40,30,' + clamp(hd.t, 0, 1) * .9 + ')'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, R0, a0 - .32, a0 + .32); g.stroke();
    }
    // damage numbers, where they were dealt
    for (const n of S.nums) {
      const p = world.project(n.p[0], n.p[1], n.p[2] + 8 + n.t * 18); if (!p || (n.t > .8 && Math.floor(n.t * 20) % 2)) continue;   // (beside the hit, not over it)
      F.text(g, String(Math.round(n.v)), p[0] + 10 + n.t * 6, p[1] - 5, n.head ? '#ffd23a' : n.col || '#ffffff', { align: 'left', outline: OL, scale: n.head ? 2 : 1 });
    }
    // the compass: bearings every 15 degrees, the outposts (red: held, grey: cleared) with their distance
    const CW = Math.min(170, W - 120), x0 = cx - CW / 2, span = 110, yb = 5;
    rect(x0, yb + 8, CW, 1, 'rgba(255,255,255,.35)');
    for (let dgr = 0; dgr < 360; dgr += 15) {
      let rel = ((dgr - BEARING(S.yaw) + 540) % 360) - 180; if (Math.abs(rel) > span / 2) continue;
      const x = cx + rel / span * CW, lab = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' }[dgr];
      if (lab) F.text(g, lab, x, yb, dgr === 0 ? '#ffb347' : '#ffffff', { align: 'center', outline: OL, font: 'tiny' }); else rect(x, yb + 5, 1, 3, 'rgba(255,255,255,.6)');
    }
    for (const o of OUTPOSTS) {
      if (o.id === 'drop') continue; const a = Math.atan2(o.y - hero.y, o.x - hero.x), rel = ((BEARING(a) - BEARING(S.yaw) + 540) % 360) - 180; if (Math.abs(rel) > span / 2) continue;
      const x = cx + rel / span * CW, done = o.left === 0, d = Math.round(Math.hypot(o.x - hero.x, o.y - hero.y) / M);
      rect(x - 1, yb + 11, 3, 3, done ? '#8a8a8a' : '#ff4a3a'); F.text(g, d + 'M', x, yb + 16, done ? '#a8a8a8' : '#ffd0c8', { align: 'center', outline: OL, font: 'tiny' });
    }
    F.text(g, String(Math.round(BEARING(S.yaw))), cx, yb + 24, '#ffe7a8', { align: 'center', outline: OL, font: 'tiny' });
    // shield (purple, in segments) and health, bottom left; grenades
    const bx = 8, by = H - 20, segW = 17;
    for (let i = 0; i < 4; i++) { const f = clamp((S.shield - i * 25) / 25, 0, 1); rect(bx + i * (segW + 2) - 1, by - 1, segW + 2, 6, OL); rect(bx + i * (segW + 2), by, segW, 4, '#3a2a52'); if (f > 0) rect(bx + i * (segW + 2), by, Math.round(segW * f), 4, '#b07aff'); }
    const hw = segW * 4 + 6; rect(bx - 1, by + 7, hw + 2, 6, OL); rect(bx, by + 8, hw, 4, '#4a1a1a'); rect(bx, by + 8, Math.round(hw * clamp(S.hp / HP, 0, 1)), 4, S.hp < 30 ? '#ff5a4a' : '#f0ece4');
    F.text(g, 'G ' + S.nades, bx + hw + 6, by + 2, '#b8d890', { outline: OL, font: 'tiny' });
    // the gun: its name, the mag big, the rest small, the other slot; a reload's progress
    const rx = W - 8;
    F.text(g, String(am[0]), rx - 28, by - 8, am[0] === 0 ? '#ff5a4a' : am[0] <= WP.mag * .25 ? '#ffb347' : '#ffffff', { align: 'right', outline: OL, scale: 2 });
    F.text(g, '/ ' + am[1], rx, by - 2, '#c8c0b0', { align: 'right', outline: OL, font: 'tiny' });
    F.text(g, WP.name, rx, by + 8, '#ffe7a8', { align: 'right', outline: OL, font: 'tiny' });
    F.text(g, (S.cur === 'rifle' ? '1' : '2') + ' / ' + (S.cur === 'rifle' ? WEAPONS.shotgun.name : WEAPONS.rifle.name), rx, by - 18, '#8a8478', { align: 'right', outline: OL, font: 'tiny' });
    if (S.act === 'reload') { const f = clamp(S.actT / S.actDur, 0, 1); rect(rx - 60, by + 16, 60, 2, '#3a3428'); rect(rx - 60, by + 16, Math.round(60 * f), 2, '#ffe7a8'); }
    // the outposts and the feed, top right; where you are, top left
    F.text(g, 'OUTPOSTS ' + S.cleared + '/5', W - 6, 6, '#ffe7a8', { align: 'right', outline: OL, font: 'tiny' });
    S.feed.forEach((f, i) => F.text(g, f.text, W - 6, 16 + i * 8, f.c || '#ffffff', { align: 'right', outline: OL, font: 'tiny' }));
    const here = OUTPOSTS.find(o => Math.hypot(o.x - hero.x, o.y - hero.y) < (o.r + 30) * M);
    F.text(g, here ? here.name : 'THE BADLANDS', 6, 6, here ? '#ffffff' : '#c8c0b0', { outline: OL, font: 'tiny' });
    if (here && here.id !== 'drop') F.text(g, here.left ? here.left + ' RAIDERS LEFT' : 'CLEARED', 6, 14, here.left ? '#ff9a8a' : '#a8e0a0', { outline: OL, font: 'tiny' });
    else if (here) F.text(g, 'FIRING RANGE: TRY THE TARGETS', 6, 14, '#c8c0b0', { outline: OL, font: 'tiny' });
    // what's in reach; the banner; the controls at first
    if (S.near && S.alive) { const lab = game.input.label('use') + ' ' + S.near.what + (S.near.kick ? '   ' + game.input.label('melee') + ' KICK IT IN' : ''); F.text(g, lab, cx, Math.round(H * .66), '#ffffff', { align: 'center', outline: OL }); }
    if (S.banner && S.banner.t > 0) { const k = clamp(S.banner.t, 0, 1); g.globalAlpha = k; F.title(g, S.banner.text, cx, Math.round(H * .2), { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'], depth: 2 }); F.text(g, S.banner.sub, cx, Math.round(H * .2) + 22, '#ffe7a8', { align: 'center', outline: OL }); g.globalAlpha = 1; }
    if (S.time < 10 && S.alive && !touch()) {
      const l = a => game.input.label(a);
      F.text(g, l('up') + l('left') + l('down') + l('right') + ' MOVE  ' + l('sprint') + ' SPRINT  ' + l('jump') + ' JUMP, VAULT, MANTLE  ' + l('crouch') + ' CROUCH, SLIDE', cx, H - 44, '#ffffff', { align: 'center', outline: OL, font: 'tiny' });
      F.text(g, l('fire') + ' FIRE  ' + l('aim') + ' AIM  ' + l('reload') + ' RELOAD  ' + l('swap') + ' SWAP  ' + l('melee') + ' PUNCH  ' + l('grenade') + ' GRENADE  ' + l('use') + ' USE  ' + l('view') + ' 1ST/3RD', cx, H - 36, '#ffffff', { align: 'center', outline: OL, font: 'tiny' });
      F.text(g, 'CLICK TO CAPTURE THE MOUSE', cx, H - 28, '#c8c0b0', { align: 'center', outline: OL, font: 'tiny' });
    }
    g._c = null;
  }

  /* =====================================================================
   * SOUNDS: the guns, their parts, hits and kills, the body's moves (chip voices: no sound files)
   * ===================================================================== */
  const SOUNDS = {
    ar: [{ wave: 'noise', freq: 2600, to: 380, dur: .085, vol: .5, filter: 'lowpass' }, { wave: 'square', freq: 170, to: 55, dur: .06, vol: .26 }, { wave: 'noise', freq: 6400, dur: .025, vol: .16, filter: 'highpass' }],
    ar2: [{ wave: 'noise', freq: 1900, to: 300, dur: .08, vol: .42, filter: 'lowpass' }, { wave: 'square', freq: 140, to: 50, dur: .05, vol: .18 }],
    sg: [{ wave: 'noise', freq: 1500, to: 110, dur: .32, vol: .68, filter: 'lowpass' }, { wave: 'sine', freq: 95, to: 32, dur: .26, vol: .6 }, { wave: 'noise', freq: 5000, dur: .04, vol: .2, filter: 'highpass' }],
    empty: { wave: 'square', freq: 1500, dur: .014, vol: .14 },
    magout: [{ wave: 'noise', freq: 1600, to: 900, dur: .05, vol: .22 }, { wave: 'square', freq: 320, to: 260, dur: .03, vol: .1 }],
    magin: [{ wave: 'noise', freq: 2600, dur: .03, vol: .28 }, { wave: 'square', freq: 360, to: 200, dur: .035, vol: .14, delay: .035 }],
    bolt: [{ wave: 'noise', freq: 3000, to: 1800, dur: .04, vol: .24 }, { wave: 'noise', freq: 1800, to: 3200, dur: .045, vol: .26, delay: .1 }],
    shell: [{ wave: 'noise', freq: 2200, to: 1400, dur: .04, vol: .22 }, { wave: 'square', freq: 520, dur: .02, vol: .08, delay: .03 }],
    pump: [{ wave: 'noise', freq: 2400, to: 1300, dur: .06, vol: .26 }, { wave: 'noise', freq: 1500, to: 2600, dur: .06, vol: .26, delay: .14 }],
    swapw: { wave: 'noise', freq: 1400, to: 2200, dur: .08, vol: .16 },
    tick: [{ wave: 'square', freq: 1900, dur: .022, vol: .16 }, { wave: 'noise', freq: 4000, dur: .02, vol: .1 }],
    headshot: [{ wave: 'triangle', freq: 2700, to: 2500, dur: .13, vol: .32 }, { wave: 'square', freq: 1350, dur: .03, vol: .12 }],
    kill: [{ wave: 'triangle', freq: 1250, to: 620, dur: .2, vol: .32 }, { wave: 'noise', freq: 900, dur: .1, vol: .2 }, { wave: 'square', freq: 2400, dur: .04, vol: .1, delay: .05 }],
    shieldhit: { wave: 'noise', freq: 5200, to: 3200, dur: .045, vol: .2, filter: 'highpass' },
    shieldbreak: [{ wave: 'noise', freq: 6400, to: 900, dur: .36, vol: .42, filter: 'highpass' }, { wave: 'triangle', freq: 1700, to: 320, dur: .3, vol: .24 }],
    ouch: [{ wave: 'noise', freq: 520, to: 200, dur: .1, vol: .36, filter: 'lowpass' }, { wave: 'sine', freq: 160, to: 90, dur: .08, vol: .3 }],
    whiz: { wave: 'noise', freq: 4600, to: 1600, dur: .09, vol: .16, filter: 'highpass' },
    hop: { wave: 'noise', freq: 900, to: 520, dur: .06, vol: .13, filter: 'lowpass' },
    mantle: [{ wave: 'noise', freq: 700, to: 420, dur: .12, vol: .18, filter: 'lowpass' }, { wave: 'noise', freq: 1600, dur: .03, vol: .1, delay: .08 }],
    vault: [{ wave: 'noise', freq: 1100, to: 500, dur: .1, vol: .16 }, { wave: 'noise', freq: 600, dur: .06, vol: .14, delay: .12, filter: 'lowpass' }],
    slide: { wave: 'noise', freq: 900, to: 420, dur: .5, vol: .15, filter: 'lowpass' },
    zip: { wave: 'saw', freq: 300, to: 520, dur: .32, vol: .06 },
    kickdoor: [{ wave: 'noise', freq: 720, to: 90, dur: .32, vol: .62, filter: 'lowpass' }, { wave: 'sine', freq: 120, to: 40, dur: .22, vol: .6 }, { wave: 'noise', freq: 2600, to: 600, dur: .16, vol: .26 }],
    dooropen: [{ wave: 'square', freq: 220, to: 160, dur: .12, vol: .1 }, { wave: 'noise', freq: 900, dur: .1, vol: .12 }],
    doorshut: [{ wave: 'noise', freq: 600, to: 200, dur: .1, vol: .3, filter: 'lowpass' }, { wave: 'square', freq: 150, dur: .04, vol: .12 }],
    bin: [{ wave: 'square', freq: 196, to: 330, dur: .16, vol: .14 }, { wave: 'triangle', freq: 660, to: 990, dur: .2, vol: .16, delay: .1 }],
    cellup: { wave: 'triangle', freq: 520, arp: [0, 7, 12, 19], step: .05, dur: .26, vol: .26 },
    pin: { wave: 'square', freq: 2200, dur: .02, vol: .1 }, throw: { wave: 'noise', freq: 1200, to: 500, dur: .12, vol: .16 }, clink: { wave: 'square', freq: 1800, to: 1500, dur: .03, vol: .12 }
  };

  /* =====================================================================
   * THE STEP, THE FRAME, A FRESH START, THE PROOF
   * ===================================================================== */
  const { start, pause, confirm, cancel } = E.Input.DEFAULT;
  const KEYS = { up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
    jump: ['Space', 'Pad0'], crouch: ['KeyC', 'Pad1'], sprint: ['ShiftLeft', 'ShiftRight', 'Pad10'], fire: ['Mouse0', 'KeyJ', 'Pad7'], aim: ['Mouse2', 'KeyK', 'Pad6'],
    reload: ['KeyR', 'Pad2'], use: ['KeyE', 'KeyF', 'Pad2'], melee: ['KeyV', 'Pad11'], grenade: ['KeyG', 'Pad4'], swap: ['KeyQ', 'Digit1', 'Digit2', 'Pad3'], view: ['KeyT', 'Pad5'],
    start, pause, confirm, cancel };
  const TOUCH = ['use', 'melee', 'swap', 'crouch', 'jump', 'aim', 'fire'], TOUCH_LABELS = { use: 'USE', melee: 'HIT', swap: 'SWAP', crouch: 'DUCK', jump: 'JUMP', aim: 'AIM', fire: 'FIRE' };
  /** one step of the game */
  function step(dt, I) {
    if (!(dt > 0)) { ip.still = true; world.step(0); return; }   // (time stopped, timeScale 0: nothing moves)
    keepPrev(dt); I0 = I; S.time += dt;
    if (S.alive && !S.won) { look(dt, I); move(dt, I); actions(dt, I); bump(); }
    else { hero.vx = approach(hero.vx, 0, 600 * dt); hero.vy = approach(hero.vy, 0, 600 * dt); S.act = null; S.ads = false; }
    S.near = S.alive ? nearUse() : null;
    streamRaiders(); for (const e of raiders.slice()) raiderStep(e, dt);
    stepDoors(dt); stepLoot(dt); stepNades(dt);
    streamScatter(world, hero.x, hero.y);
    // footsteps, timers
    const sp = Math.hypot(hero.vx, hero.vy);
    if (hero.grounded && (S.move === 'stand' || S.move === 'crouch') && sp > 20) { const was = S.stepPh; S.stepPh += sp / ((16 + sp * .3) / 2) * dt; if (Math.floor(was) !== Math.floor(S.stepPh)) A.sfx('step', { vol: S.crouch ? .3 : S.sprint ? 1 : .7 }); }
    S.hurtT = Math.max(0, S.hurtT - dt); for (const h of S.hitDirs) h.t -= dt; S.hitDirs = S.hitDirs.filter(h => h.t > 0);
    for (const n of S.nums) n.t += dt; S.nums = S.nums.filter(n => n.t < 1.1); if (S.mark) S.mark.t -= dt;
    for (const f of S.feed) f.t -= dt; S.feed = S.feed.filter(f => f.t > 0); if (S.banner) S.banner.t -= dt;
    if (OP.ridge.fire && (S.time * 9) % 1 < dt * 9 && Math.hypot(OP.ridge.x - hero.x, OP.ridge.y - hero.y) < 120 * M) P.fire(OP.ridge.fire[0], OP.ridge.fire[1], OP.ridge.fire[2] + 1, 2, { size: 3, speed: 14 });
    if (hero.fell) { const s = atP(OP.drop.P, 0, 14); hero.place(s[0], s[1]); }
    world.step(dt);
    camStep(dt);
  }
  let lastDraw = null, lastReal = null, lights = null, drawT = 0;   // drawT: the clock of the frame drawn (between the last two steps)
  /* the steps run 120 times a second and a display 60, 90, 144 or 240 times: a frame shows the moving things part way
   * from where the step before left them to where the last one did (game.alpha), so motion is as even at any rate */
  const ip = { h: null, cam: null, eye: 0, adsB: 0, ph: 0, clr: 0, dt: 1 / 120, real: -1, still: false };
  function keepPrev(dt) {
    Object.assign(ip, { h: [hero.x, hero.y, hero.z], cam: S.cam, eye: S.eye, adsB: S.adsB, ph: S.stepPh, clr: S.camClr, dt, real: game.real, still: false });
    for (const e of raiders) e.ip = [e.a.x, e.a.y, e.a.z];
    for (const g of nades) g.ip = [g.x, g.y, g.z];
  }
  /** a point part way from where it was before the step to where it is (al: the frame's alpha); one that jumped (a respawn) is where it is */
  const between = (was, x, y, z, al) => !was || Math.abs(x - was[0]) + Math.abs(y - was[1]) + Math.abs(z - was[2]) > 40 ? [x, y, z] : [lerp(was[0], x, al), lerp(was[1], y, al), lerp(was[2], z, al)];
  /** the player's body follows the player (its heading along the run at a sprint, else with the view) */
  function syncBody(dt, hp) {
    const b = pb, h = hero;
    // (a shot from the hip shoulders the gun for a moment, so the gun and its flash are seen in third person)
    Object.assign(b, { x: hp[0], y: hp[1], z: hp[2], vx: h.vx, vy: h.vy, vz: h.vz, grounded: h.grounded, sprint: S.sprint, ads: S.ads || S.time - S.lastShot < .5, low: S.view === 'third', weapon: S.cur, act: S.act, actT: S.actT, reloadDur: S.actDur, reloadEmpty: S.reloadEmpty, aimYaw: S.yaw, aimPitch: S.pitch });
    if (S.alive) b.move = (S.move === 'stand' || S.move === 'crouch') && !h.grounded ? 'air' : S.move;
    const want = S.sprint && Math.hypot(h.vx, h.vy) > 40 && S.view === 'third' ? Math.atan2(h.vy, h.vx) : S.yaw; b.yaw = E.approachAng(b.yaw, want, dt * 10);
    const R = S.act === 'reload' ? reloadCurve(S.cur, S.actT, S.actDur, S.reloadEmpty) : null;
    b.gun = { mag: R ? R.mag : 0, bolt: R ? R.bolt : 0, pump: S.cur === 'shotgun' ? pumpCurve(S.pumpT) : 0, flash: S.flash, magP: null, shellP: null };
    if (b.dead) b.dead.t += dt;
  }
  function syncRaider(e, dt, al) {
    const a = e.a, b = e.b, p = between(e.ip, a.x, a.y, a.z, al);
    Object.assign(b, { x: p[0], y: p[1], z: p[2], vx: a.vx, vy: a.vy, vz: a.vz, grounded: a.grounded, aimYaw: e.yaw, aimPitch: e.pitch, ads: e.sees && e.state === 'combat', low: !e.dummy && !(e.sees && e.state === 'combat'), flash: (e.hitNew ? (e.hitReal = performance.now() / 1000, e.hitNew = false, 1) : performance.now() / 1000 - (e.hitReal ?? -9) < .025) ? 1 : 0 });   // (two frames white, on the clock: the hit-stop doesn't stretch it)
    if (e.alive) b.move = !a.grounded ? 'air' : e.crouch ? 'crouch' : 'stand';
    b.yaw = E.approachAng(b.yaw, e.yaw, dt * 8); b.sprint = Math.hypot(a.vx, a.vy) > 64;
    b.gun = { mag: 0, bolt: 0, pump: 0, flash: e.flash };
  }
  /** each frame, before the world draws: the grass and tracers round the camera, the soldiers posed and drawn, the
   *  outposts' working parts, the lights, and in first person the arms and the gun */
  function onDraw(w) {
    if (!S) return;
    // (a frame after a step that didn't run the game, paused or in a hit-stop, shows the last step as it is)
    const al = ip.still || ip.real !== game.real || game.hitstop > 0 || !ip.h ? 1 : clamp(game.alpha, 0, 1), hp = between(ip.h, hero.x, hero.y, hero.z, al);
    drawT = w.time - (1 - al) * ip.dt;
    const dt = clamp(drawT - (lastDraw ?? drawT), 0, .05); lastDraw = drawT;
    let cam = S.cam || w.camera.fixed;
    if (S.cam) {   // the camera where the frame is, turned by the newest mouse moves at once (the next step takes them)
      const live = S.alive && !S.won, m = w.camera.mouse, k = live ? lookK() : 0, pc = ip.cam || cam;
      const yaw = cam.yaw + m[0] * k, pitch = clamp(cam.pitch - m[1] * k, -1.5, 1.5), roll = lerp(pc.roll, cam.roll, al), fov = lerp(pc.fov, cam.fov, al);
      let p = between(pc && [pc.x, pc.y, pc.z], cam.x, cam.y, cam.z, al);
      if (S.view === 'third' && live) p = thirdCam(hp[0], hp[1], hp[2], lerp(ip.eye, S.eye, al), lerp(ip.adsB, S.adsB, al), lerp(ip.ph, S.stepPh, al), yaw, pitch, lerp(ip.clr, S.camClr, al)).p;
      cam = Object.assign({}, cam, { x: p[0], y: p[1], z: p[2], yaw, pitch, roll, fov }); w.camera.pose = Object.assign({ ortho: false }, cam);
    }
    fx.cam = [cam.x, cam.y, cam.z];
    drawGrass(w, cam.x, cam.y); grass.uT.value = drawT; grass.uP.value.set(hp[0] / M, hp[2] / M, hp[1] / M); drawTracers(dt);
    const pen = w.pen; pen.at();
    syncBody(dt, hp);
    if (S.view === 'third' || !S.alive) { pose(w, pb, dt); if (pb.gun.mag === 1) pb.gun.magP = add(pb.J.hands[0], pb.G.u, 2.1); drawSoldier(pen, pb); }
    for (const e of raiders) {
      const d = Math.hypot(e.a.x - cam.x, e.a.y - cam.y); if (d > 320 * M || !w.camera.sees(e.a.x, e.a.y, e.a.z, 40)) continue;
      if (S.view === 'first' && e.alive && d < 8 && cam.z > e.a.z && cam.z < e.a.z + 32 * e.b.k) continue;   // (a body the eye is inside isn't drawn)
      syncRaider(e, dt, al); e.b.visible = d < 110 * M; pose(w, e.b, dt); drawSoldier(pen, e.b);
      if (e.flash > .6 && e.b.G) w.glow(...at(e.b.G, 12.8, .55), 1.2, '#ffc870', { light: true, core: '#fff4d0' });
    }
    drawWorks(pen, cam.x, cam.y, al);
    const L = lights, F = frameYP([cam.x, cam.y, cam.z], S.yaw, S.pitch), mz = muzzlePoint(F);
    Object.assign(L.muzzle, { x: mz[0], y: mz[1], z: mz[2], on: S.flash > .6, power: (S.view === 'third' ? 11 : 6) * S.flash, reach: S.view === 'third' ? 160 : 100 });   // (the shot's own frame only: no strobe)
    if (S.boom && S.boom.t > 0) { Object.assign(L.boom, { x: S.boom.x, y: S.boom.y, z: S.boom.z + 20, on: true, power: 90 * S.boom.t / .35 }); S.boom.t -= dt; } else L.boom.on = false;
    const fire = OP.ridge.fire; if (fire) { const fl = .85 + Math.sin(drawT * 13) * .08 + Math.sin(drawT * 29) * .06; Object.assign(L.fire, { x: fire[0], y: fire[1], z: fire[2] + 10, on: Math.hypot(fire[0] - cam.x, fire[1] - cam.y) < 140 * M, power: 18 * fl }); w.glow(fire[0], fire[1], fire[2] + 3, 2.6 * fl, '#ff9a3a', { core: '#fff0b0' }); }
    for (const o of OUTPOSTS) if (o.beacon && (w.time % 1.6) < .8) w.glow(...o.beacon, 4, '#ff3a2a', { core: '#ffd0c0' });
    w.overlay.on = S.view === 'first' && S.alive;
    if (w.overlay.on) { w.overlay.camera.fov = lerp(54, 44, ease(S.adsB)); drawViewModel(w.overlay.pen, dt, cam); }
    const now = performance.now() / 1000, rdt = clamp(now - (lastReal ?? now), 0, .05); lastReal = now;   // (hits' stars run on the clock: a hit-stop freezes the world, not the spark)
    for (const st of fx.stars) {
      const list = st.ov ? fx.flashes.ov : fx.flashes.world; if (list.length >= FL_MAX) continue;
      if (st.v) { const u = st.t / st.life, q = add(st.p, st.v, st.t); q[2] -= (st.ov ? 450 : 900) * st.t * st.t; list.push({ p: q, f: st.f, s: st.s * (1 - u * .5), heat: .7 * (1 - u * .7), seed: st.seed + Math.floor(st.t * 60), pal: st.pal, thin: true }); }
      // (the first frame is anything under half a frame old: a frame of clock time can compare as a hair under 1/60)
      else { const first = st.t < .5 / 60; list.push({ p: st.p, f: st.f, s: st.s * (first ? 1.5 : .85), heat: first ? 1 : .5, seed: st.seed, pal: st.pal, thin: !first }); }
    }
    for (const st of fx.stars) st.t += rdt;
    fx.stars = fx.stars.filter(st => st.t < (st.life || 1.5 / 60));
    drawFlashes(fx.flW, fx.flashes.world, fx.cam); drawFlashes(fx.flO, fx.flashes.ov, [0, 0, 0]);
  }
  /** a fresh run: the world reset, the structures' blocks, doors shut, bins full, crews home, the player at the drop
   *  point facing the range, the scatter round them at once */
  function reset(seed = 1) {
    world.reset(); rnd = E.rng(seed);
    raiders.length = loot.length = nades.length = 0; placed.clear(); fx.tracers.length = fx.stars.length = 0; lastDraw = null; ip.h = ip.cam = null;
    for (const s of solids) world.block(s);
    for (const d of doors) Object.assign(d, { state: 'shut', ang: 0, want: 0, block: null, deb: null });
    for (const b of bins) Object.assign(b, { open: 0, want: 0, used: false });
    for (const sl of spawns) { sl.dead = false; sl.e = null; }
    for (const o of OUTPOSTS) { o.spawned = false; o.left = spawns.filter(s => s.op === o.id).length; }
    S = newState(); const P0 = OP.drop.P, s0 = atP(P0, 0, 14); S.yaw = P0.yaw - Math.PI / 2;
    hero = world.hero({ x: s0[0], y: s0[1], r: RADIUS, half: HALF, visible: false, shadow: false, slope: 48, step: 5, snap: 5 });
    pb = body('player'); pb.yaw = S.yaw;
    for (const d of dummies) spawnRaider(Object.assign({ dummy: true, op: 'drop' }, d));
    streamScatter(world, hero.x, hero.y, 1e9);
    world.camera.set('fixed'); world.camera.follow(S.focus); camStep(0);
  }
  const I = { move: [0, 0], mouse: [0, 0], stick2: null, pressed: (a, w) => game.input.buffered(a, w), use: a => game.input.consume(a), down: a => game.input.down(a) };
  /** the proof: a scripted run from the drop point (moving, sprinting, a slide, jumps, bursts at the range, a punch, a
   *  swap, a reload, aiming), n steps of 1/120 s; returns the world's hash */
  function run(n = 600) {
    reset(3); let i = 0;
    const c = { move: [0, -1], mouse: [0, 0], stick2: null, use() {},
      pressed: a => (a === 'jump' && i % 150 === 40) || (a === 'crouch' && i === 190) || (a === 'melee' && i === 330) || (a === 'swap' && i === 400) || (a === 'fire' && i > 420 && i % 50 === 0) || (a === 'reload' && i === 560),
      down: a => (a === 'sprint' && i < 200) || (a === 'fire' && i > 100 && i < 330 && i % 60 < 30) || (a === 'aim' && i > 440) || (a === 'crouch' && i > 190 && i < 230) };
    for (i = 0; i < n; i++) { c.move = [Math.sin(i / 70) * .5, -1]; c.mouse = [Math.sin(i / 50) * 3, Math.cos(i / 80) * 1.2]; step(1 / 120, c); }
    return world.hash([S.kills, S.ammo.rifle[0], S.ammo.shotgun[0], S.hp, S.shield, raiders.length, Math.round(S.yaw * 1000)]);
  }
  /* ---- a phone: a finger on the look side drags the view (the move stick is on the other) ---- */
  function touchLook() {
    const cv = game.screen.canvas; if (!cv || typeof document === 'undefined') return;
    const ids = new Map();
    cv.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' || active !== world || game.paused) return; const r = cv.getBoundingClientRect(), right = e.clientX - r.left > r.width * .5; if (right === (game.input.stickSide === 'right')) return; ids.set(e.pointerId, [e.clientX, e.clientY]); });
    cv.addEventListener('pointermove', e => { const p = ids.get(e.pointerId); if (!p || active !== world) return; world.camera.mouse[0] += (e.clientX - p[0]) * 2.4; world.camera.mouse[1] += (e.clientY - p[1]) * 2.4; p[0] = e.clientX; p[1] = e.clientY; });
    const up = e => ids.delete(e.pointerId); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  }
  BOOT.push(['The badlands: land, roads and outposts', () => { for (const [k, v] of Object.entries(SOUNDS)) A.define(k, v); planLand(); layout(); }]);
  BOOT.push(['The open world', () => {
    world = new W3(game, { terrain: { size: SIZE, cell: 32, chunk: 32, height, color, far: 17000, physics: 1400, detail: 1.2, rock: { colors: ['#a8644a', '#c47e5a', '#8e523c', '#d0946a', '#b06e50', '#7a4632', '#c8885e'], band: 46, slope: [.34, .52] }, speckle: .2, mottle: .34 },
      sky: { top: '#3d6fb8', horizon: '#f2dcb4', ground: '#b49070', sun: '#fff0c8', haze: .3 }, fog: { color: '#ead4b0', near: 2200, far: 19000 },
      ambient: ['#c4d4ee', '#8a6a48', 1.55], sun: { color: '#fff0d8', intensity: 3.1, dir: [-.55, .4, -.62], area: 1150, map: 2048 },
      torchLights: 0, glowLights: 4, lights: 3, overlay: { fov: 58 }, camera: { mode: 'fixed', capture: true, near: 1.2 }, res: 'balanced', gravity: GRAV, onDraw });
    structureMesh(world); grassMeshes(world); fxMeshes(world);
    lights = { muzzle: world.light({ color: '#ffc870', reach: 220, power: 0 }), boom: world.light({ color: '#ff9a4a', reach: 700, power: 0 }), fire: world.light({ color: '#ff8a3a', reach: 170, power: 0 }) };
    reset(1); touchLook();
  }]);
  return {
    view: 'iso', input: KEYS, pausable: true, touch: TOUCH,
    enter() { reset(1); active = world; A.music(null); game.input.touchButtons(TOUCH, { labels: TOUCH_LABELS }); },
    update(dt) {
      I.move = game.input.move(); world.camera.takeMouse(I.mouse); I.stick2 = game.input.padAim;
      step(dt, I);
      const inp = game.input; inp.touchSet('use', S.near ? 'USE' : null, !!S.near); inp.touchSet('melee', S.near && S.near.kick ? 'KICK' : null, !!(S.near && S.near.kick) || raiders.some(e => e.alive && Math.hypot(e.a.x - hero.x, e.a.y - hero.y) < 5 * M));
    },
    draw(r) { world.draw(r); r.overlay(g => hud(g, r)); },
    get world() { return world; }, get hero() { return hero; }, get state() { return S; }, get raiders() { return raiders; },
    /** the player's soldier (b.J: its joints, posed each frame it is drawn) and the first-person arms and gun (vm.F: the
     *  gun's frame in the eyes' space, vm.L, vm.R: the hands), for tools that measure the motion */
    get player() { return pb; }, get viewModel() { return vm; }, get outposts() { return OUTPOSTS; }, reset, run,
    /** the soldier's rig, for a sheet of its poses (tools, tests): body(look), pose(world, b, dt), draw(pen, b) */
    rig: { body, pose, draw: drawSoldier, onDraw }
  };
})();
scenes.shooter = SHOOT;
