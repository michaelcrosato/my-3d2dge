/* =====================================================================================
 * SLICE 6  FLIGHT  (Star Fox 64, Panzer Dragoon).
 * A stage on rails: out over the sea between rock islands, fighters coming at you in waves, rings to fly through, then
 * over the coast and the enemy's base (turrets on the plateau, masts to weave between, fighters taking off), and into a
 * bay where their flagship waits: there the rails end and you fly free round it, its four engines first, then its core.
 * J (or Space, a click) fires the twin lasers; hold it to charge: the reticle locks on what is ahead, let go and the
 * charged shot flies to it. K (or Q) barrel-rolls toward the stick: a roll turns shots aside. Shift boosts, X brakes
 * (the meter refills). The stick moves the ship about the screen (on rails) or turns it (free). Silver rings mend the
 * shield, a gold one more. Your wingman, KESTREL, calls on the radio and needs a hand once. Settings: Invert flight.
 * THE 3D: world.flyer (on rails along an E.Path, the ship moving in a window across it; then free within the bay's
 * bounds), f.seek (the charged shot's lock), barrel rolls (f.rolling), the 'behind' camera (behind the rail's point,
 * then the ship), a terrain (the sea, islands, the coast, the base's plateau, mountains round the bay), Dialog's radio.
 * FLIGHT.run(n): a scripted flight's hash (the proof); FLIGHT.bot(): flies the stage and beats the flagship
 * ===================================================================================== */
const FLIGHT = (() => {
  const PI = Math.PI, U = 16;
  const KEYS = Object.assign({}, W3.INPUT, { fire: ['KeyJ', 'Space', 'Mouse0', 'Pad0'], roll: ['KeyK', 'KeyQ', 'Pad4', 'Pad5'], boost: ['ShiftLeft', 'ShiftRight', 'KeyL', 'Pad1'], brake: ['KeyX', 'KeyH', 'Pad2'] });
  for (const k of ['attack', 'dash', 'skill', 'jump', 'lock']) delete KEYS[k];
  const TOUCH = ['brake', 'boost', 'roll', 'fire'], TOUCH_LABELS = { fire: 'FIRE', roll: 'ROLL', boost: 'BOOST', brake: 'BRAKE' };
  const INVERT = { key: 'invertFlight', label: 'Invert flight', group: 'Game', value: false, help: 'Up on the stick dives, as a pilot\'s stick does.' };

  /* ---- THE WORLD: a terrain. The sea (height 0), rock islands by the rail, the coast (a diagonal line: x + y = 30,500),
   * the base's plateau beyond it, mountains further in, and a bay carved out of them for the flagship ---- */
  const BAY = [21000, 14500], ISLES = [[9000, 11400, 450, 300], [9000, 9560, 450, 260], [12100, 12950, 420, 340], [13150, 11700, 420, 300], [6200, 9100, 380, 220], [5200, 10900, 300, 160]];
  const vn = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), a = E.hash2(xi, yi), b = E.hash2(xi + 1, yi), c = E.hash2(xi, yi + 1), d = E.hash2(xi + 1, yi + 1); return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy; };
  const fbm = (x, y) => vn(x, y) * .55 + vn(x * 2.1 + 5, y * 2.1 + 9) * .3 + vn(x * 4.3 + 1, y * 4.3 + 3) * .15, sstep = (a, b, v) => { const k = clamp((v - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
  function height(x, y) {
    const inland = (x + y - 30500) / 1500; let h = 0;
    if (inland > 0) h = Math.min(1, inland * 1.6) * 48 + sstep(2.5, 4, inland) * fbm(x / 1700, y / 1700) * 900;   // the plateau, then mountains
    const db = Math.hypot(x - BAY[0], y - BAY[1]); if (db < 3000) h *= sstep(2200, 3000, db);   // the bay: sea inside the mountains
    for (const [cx, cy, r, H] of ISLES) { const d2 = ((x - cx) ** 2 + (y - cy) ** 2) / (r * r); if (d2 < 1) h = Math.max(h, H * (1 - d2) ** .6 * (.75 + .5 * vn(x / 80, y / 80))); }
    return h;
  }
  const inBase = (x, y) => { const k = x + y - 30500; return k > 600 && k < 3600 && Math.hypot(x - BAY[0], y - BAY[1]) > 3000; };
  function color(x, y, z, nz, out) {
    const n = E.hash2(x >> 5, y >> 5);
    if (z < 1.5) { const w = vn(x / 260, y / 260); out[0] = 30 + w * 20 + n * 8; out[1] = 90 + w * 40 + n * 10; out[2] = 170 + w * 40; return out; }   // the sea
    if (z < 9) { out[0] = 214 + n * 20; out[1] = 196 + n * 16; out[2] = 140; return out; }   // sand
    if (inBase(x, y) && z < 70) { const g = ((x >> 7) + (y >> 7)) & 1 ? 128 : 118; out[0] = g + n * 10; out[1] = g + 2 + n * 10; out[2] = g + 8 + n * 10; return out; }   // the base: concrete
    const w = vn(x / 400, y / 400); out[0] = 70 + w * 40 + n * 12; out[1] = 128 + w * 30 + n * 12; out[2] = 60 + w * 10; return out;   // grass
  }

  /* ---- THE RAIL: the path the stage rides (heights in it), and what is set along it, by distance ---- */
  const RAIL = new E.Path([[3000, 9000, 170], [7000, 10000, 150], [9000, 10480, 140], [11000, 11000, 130], [14000, 13500, 150], [16500, 15800, 150], [18500, 15200, 190], [21000, 14500, 240]], { smooth: 'catmull' });
  const RL = RAIL.length, SPEED = 380, WIN = [320, 180];   // the rail's pace, the window the ship moves in across it
  const BOUNDS = [BAY[0] - 2600, BAY[1] - 2600, 70, BAY[0] + 2600, BAY[1] + 2600, 1100];
  // the waves: at rail distance d, fighters [pattern, ox, oy, k]; rings; the turrets and masts of the base; radio calls
  const WAVES = [
    [900, 'v', 0, 30, 5], [2600, 'cross', -1, 10, 4], [4300, 'v', 80, -20, 5], [7600, 'chase', 0, 0, 1], [9200, 'behind', 0, 40, 5],
    [11200, 'cross', 1, 40, 4], [13400, 'rise', 0, 0, 6], [15400, 'v', -60, 30, 5]];
  const RINGS = [[3500, 0, 0, 's'], [3720, 60, 20, 's'], [3940, 120, 30, 's'], [4160, 60, 10, 's'], [5800, -100, -30, 'g'], [10200, 0, 50, 's'], [12600, -80, 0, 's'], [16400, 60, 40, 'g']];
  const TURRETS = Array.from({ length: 10 }, (_, k) => [12900 + k * 420, k % 2 ? 1 : -1, 140 + (k * 37) % 110]);
  const MASTS = Array.from({ length: 8 }, (_, k) => [13300 + k * 480, ((k * 53) % 9 - 4) * 30]);
  const CALLS = [[150, 'KESTREL', 'Stay with me! Their base is past the islands.'], [800, 'KESTREL', 'Fighters, dead ahead!'], [3300, 'KESTREL', 'Rings! Fly through them to mend your shield.'],
    [7500, 'KESTREL', 'I\'ve got one on my tail! Get it off me!'], [9100, 'KESTREL', 'More behind us! Hold your fire till they pass.'], [12400, 'KESTREL', 'Turrets on the plateau. Roll to turn their shots aside!'],
    [13300, 'KESTREL', 'Weave through those masts!'], [RL - 900, 'KESTREL', 'That\'s their flagship in the bay. Hit the engines first!']];

  let world, ship, rnd = Math.random, mode = 'play', t = 0, scripted = false, ended = 0, endT = 0, freed = false, boss = null;
  let foes = [], shots = [], lasers = [], rings = [], turrets = [], masts = [], wave = 0, call = 0, score = 0, hits = 0, lock = null;
  const S = { shield: 100, boost: 1, charge: 0, fireT: 0, hurtT: 0, held: false, wing: 100, wingT: 0, saved: null };
  const camT = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0 };   // the camera's target: the rail's point, drawn a little after the ship
  const talk = new E.Dialog(game, { lines: 2, place: 'top', border: '#8ad0ff' });
  const PILOT = new E.Humanoid({ hair: 'short', colors: { cloth: '#3a6ad8', pants: '#2a3a5a', hair: '#e8c060', skin: '#e8b890' } });
  const radio = (name, line) => { if (!scripted) talk.say(line, { name, auto: 2.6, modal: false, alpha: .75, portrait: PILOT, portraitOpts: { zoom: 3, turn: .4 } }); };
  const SONG = { bpm: 140, steps: 4, tracks: [
    { wave: 'square', vol: .055, notes: 'A4 . C5 E5 . A5 . G5 | F5 . E5 C5 . D5 . E5 | A4 . C5 E5 . A5 . B5 | C6 . B5 G5 . E5 . . ' },
    { wave: 'triangle', vol: .26, notes: 'A2 A2 E3 A2 A2 E3 A2 G2 | F2 F2 C3 F2 G2 G2 D3 G2 | A2 A2 E3 A2 A2 E3 A2 G2 | F2 F2 G2 G2 A2 A2 A2 A2' },
    { wave: 'drums', vol: .07, notes: 'k . h . s . h k k . h . s . h h' }] };

  BOOT.push(['The sea and the base', () => {
    world = new W3(game, { terrain: { size: 32768, cell: 64, chunk: 32, height, color, far: 9000, physics: 0, detail: 1.1, rock: { colors: ['#8a8478', '#a09a8c', '#6e685e', '#b4ad9c'], band: 40, slope: [.4, .6] } },
      sky: { top: '#3a78d8', horizon: '#d8ecff', ground: '#3a6aa8', sun: '#fff4d0', haze: .25 }, fog: { color: '#cfe4f8', near: 2600, far: 8800 },
      ambient: ['#d8e4ff', '#5a7aa0', 2], sun: { color: '#fff4dc', intensity: 2.8, dir: [-.4, .5, -.7], area: 900 }, torchLights: 0, glowLights: 6, camera: { mode: 'behind', far: 12000 }, onDraw });
    reset(1);
  }]);

  /** the stage from the start (seed: the fighters' choices) */
  function reset(seed = 1) {
    world.reset(); rnd = E.rng(seed); t = 0; ended = 0; endT = 0; freed = false; wave = 0; call = 0; score = 0; hits = 0; lock = null;
    Object.assign(S, { shield: 100, boost: 1, charge: 0, fireT: 0, hurtT: 0, held: false, wing: 100, wingT: 0, saved: null });
    ship = world.flyer({ rail: { path: RAIL, speed: SPEED, w: WIN[0], h: WIN[1], slide: 240 }, speed: SPEED, min: 230, max: 640, turn: 1.4, climb: 1.2, bank: .7, low: 18, invert: !!game.settings[INVERT.key] });
    foes = []; shots = []; lasers = [];
    rings = RINGS.map(([d, ox, oy, k]) => Object.assign(frameAt(d, ox, oy), { d, kind: k, got: false }));
    turrets = TURRETS.map(([d, side, off]) => { const p = RAIL.at(d), x = p.x - Math.sin(p.angle) * side * off, y = p.y + Math.cos(p.angle) * side * off; return { x, y, z: height(x, y), hp: 3, cool: 1 + rnd(), yaw: 0, alive: true, type: 'turret', r: 18 }; });
    masts = MASTS.map(([d, ox]) => { const q = frameAt(d, ox, 0); return { x: q.x, y: q.y, z: height(q.x, q.y), top: height(q.x, q.y) + 210 }; });
    boss = { x: BAY[0] + 1200, y: BAY[1], z: 280, yaw: PI / 2, a: 0, alive: true, hp: 30, core: false, parts: [[60, -70, 0], [60, 70, 0], [-60, -90, -6], [-60, 90, -6]].map(o => ({ o, hp: 10, alive: true })), cool: 3, mcool: 6, t: 0, dying: 0 };
    camT.x = ship.x; camT.y = ship.y; camT.z = ship.z;
    world.camera.set('behind'); world.camera.follow(camT); Object.assign(world.camera.behind, { dist: 120, height: 26, ahead: 260, lag: 7, fov: 70, roll: .3 });
  }
  /** a point in the rail's frame: d along it, ox right of it, oy up */
  function frameAt(d, ox, oy) { const p = RAIL.at(clamp(d, 0, RL)); return { x: p.x - Math.sin(p.angle) * ox, y: p.y + Math.cos(p.angle) * ox, z: p.z + oy, yaw: p.angle }; }

  /* ---- the fighters: each rides the rail's frame by its pattern (d along it, ox, oy across it), or chases ---- */
  function spawn([d0, kind, a, b, n]) {
    for (let i = 0; i < n; i++) {
      const f = { type: 'fighter', kind, hp: 2, alive: true, t: -i * .25, cool: 1.2 + rnd() * 1.4, r: 16, x: 0, y: 0, z: 0, yaw: 0, roll: 0 };
      if (kind === 'v') Object.assign(f, { d: d0 + 1900 + Math.abs(i - (n - 1) / 2) * 90, ox: a + (i - (n - 1) / 2) * 70, oy: b + Math.abs(i - (n - 1) / 2) * 15, vd: -320 });
      else if (kind === 'cross') Object.assign(f, { d: d0 + 760 + i * 60, ox: -a * 600, oy: b + i * 25, vd: -100, vx: a * 330 });
      else if (kind === 'behind') Object.assign(f, { d: d0 - 300 - i * 60, ox: (i - 2) * 70, oy: b + 60, vd: 620 });
      else if (kind === 'rise') Object.assign(f, { d: d0 + 900 + i * 120, ox: (i % 2 ? 1 : -1) * (60 + i * 25), oy: -200, vd: -150, vy: 140 });   // (up from the base's runways)
      else if (kind === 'chase') Object.assign(f, { d: d0 + 240, ox: 150, oy: 30, vd: 0, hp: 3, chase: true });
      foes.push(f);
    }
  }
  function moveFoe(f, dt) {
    f.t += dt; if (f.t < 0) { place(f); return; }
    f.d += (SPEED + f.vd) * dt;
    if (f.kind === 'v') { f.oy += Math.sin(f.t * 2) * 20 * dt; if (f.d < ship.d + 300) f.vd = -60; }   // (they come at you, then hang ahead)
    if (f.kind === 'cross') f.ox += f.vx * dt;
    if (f.kind === 'behind' && f.d > ship.d + 600) f.vd = 20;   // (past you, they turn to hold ahead)
    if (f.kind === 'rise') { f.oy = Math.min(60, f.oy + f.vy * dt); }
    if (f.chase) { const k = wingAt(); f.ox = k.ox + Math.sin(f.t * 1.7) * 30; f.oy = k.oy + Math.cos(f.t * 2.3) * 15; f.d = ship.d + 240; }   // (on KESTREL's tail, ahead of you)
    place(f);
    if (f.d < ship.d - 400 || Math.abs(f.ox) > 900 || f.t > 40) f.alive = false, f.gone = true;   // (behind you, or off the screen: gone)
  }
  /** KESTREL, your wingman: where it flies in the rail's frame (ahead of you, weaving, while a fighter chases it) */
  function wingAt() { const chased = foes.some(f => f.chase && f.alive), w = t; return { chased, d: ship.d + (chased ? 300 : 60), ox: (chased ? 90 : 150) + Math.sin(w * (chased ? 1.7 : .7)) * 30, oy: 30 + Math.sin(w * 1.1) * 15 }; }
  function place(f) { const q = frameAt(f.d, f.ox, f.oy); f.x = q.x; f.y = q.y; f.z = q.z; f.yaw = q.yaw + (f.vd < 0 ? PI : 0); f.roll = Math.sin(f.t * 3) * .4 + (f.vx || 0) / 700; }

  /* ---- shots: theirs (aimed at you, turned aside by a roll), your lasers and the charged shot ---- */
  function fireAt(o, sp = 520, spread = 0) {
    const dx = ship.x - o.x, dy = ship.y - o.y, dz = ship.z - o.z, d = Math.hypot(dx, dy, dz) || 1, a = spread * (rnd() - .5);
    const c = Math.cos(a), s = Math.sin(a), vx = (dx * c - dy * s) / d, vy = (dx * s + dy * c) / d;
    shots.push({ x: o.x, y: o.y, z: o.z, vx: vx * sp, vy: vy * sp, vz: dz / d * sp, t: 0, back: false }); if (!scripted) A.sfx('laser', { vol: .25 });
  }
  const nose = (k = 1) => { const cp = Math.cos(ship.pitch); return [Math.cos(ship.yaw) * cp * k, Math.sin(ship.yaw) * cp * k, Math.sin(ship.pitch) * k]; };
  function laser() {
    const f = nose(), r = [-Math.sin(ship.yaw), Math.cos(ship.yaw)], v = 2400 + ship.speed;
    for (const s of [-1, 1]) lasers.push({ x: ship.x + r[0] * s * 9 + f[0] * 10, y: ship.y + r[1] * s * 9 + f[1] * 10, z: ship.z, vx: f[0] * v, vy: f[1] * v, vz: f[2] * v, t: 0, dmg: 1 });
    if (!scripted) A.sfx('shoot', { vol: .35 });
  }
  function charged() {
    const f = nose(); lasers.push({ x: ship.x + f[0] * 14, y: ship.y + f[1] * 14, z: ship.z, vx: f[0] * 1300, vy: f[1] * 1300, vz: f[2] * 1300, t: 0, dmg: 6, big: true, target: lock });
    if (!scripted) A.sfx('powerup');
  }
  const targets = () => { const L = foes.filter(f => f.alive && f.t >= 0).concat(turrets.filter(q => q.alive)); if (freed && boss.alive) { for (const p of boss.parts) if (p.alive) L.push(partAt(p)); if (boss.core) L.push(coreAt()); } return L; };
  function partAt(p) { const c = Math.cos(boss.yaw), s = Math.sin(boss.yaw); return Object.assign(p, { type: 'part', x: boss.x + p.o[0] * c - p.o[1] * s, y: boss.y + p.o[0] * s + p.o[1] * c, z: boss.z + p.o[2], r: 34 }); }
  const CORE = { type: 'core', o: [0, 0, 16], r: 40, hp: 1, alive: true };
  function coreAt() { return Object.assign(partAt(CORE), { type: 'core', alive: boss.alive && boss.core, hp: boss.hp }); }
  function hurtFoe(q, dmg, x, y, z) {
    P.sparks(x, y, z, 5, null, { color: '#ffd080' }); if (!scripted) A.sfx('hit', { vol: .4 });
    if (q.type === 'core') { boss.hp -= dmg; if (boss.hp <= 0) { boss.alive = false; boss.dying = 3; score += 5000; hits += 10; } return; }
    q.hp -= dmg; if (q.hp > 0) return;
    q.alive = false; score += q.type === 'part' ? 1000 : q.type === 'turret' ? 300 : 100; hits++;
    P.fire(q.x, q.y, q.z, 10, { size: 9, speed: 80 }); P.bits(q.x, q.y, q.z, 8, ['#5a5a6a', '#8a8a9a', '#ff9a3a']); game.shake(q.type === 'part' ? 5 : 2); if (!scripted) A.sfx('explode', { vol: .5 });
    if (q.chase) radio('KESTREL', 'Thanks! I owe you one.');
    if (q.type === 'part' && boss.parts.every(p => !p.alive)) { boss.core = true; radio('KESTREL', 'The core\'s open! Now!'); }
  }
  function moveShots(dt) {
    const L = targets();
    for (const l of lasers) {
      if (l.target && l.target.alive !== false) { const dx = l.target.x - l.x, dy = l.target.y - l.y, dz = l.target.z - l.z, d = Math.hypot(dx, dy, dz) || 1, sp = Math.hypot(l.vx, l.vy, l.vz), k = Math.min(1, dt * 7);
        l.vx += (dx / d * sp - l.vx) * k; l.vy += (dy / d * sp - l.vy) * k; l.vz += (dz / d * sp - l.vz) * k; }
      const x0 = l.x, y0 = l.y, z0 = l.z; l.x += l.vx * dt; l.y += l.vy * dt; l.z += l.vz * dt; l.t += dt;
      for (const q of L) if (q.alive !== false && segHit(x0, y0, z0, l.x, l.y, l.z, q.x, q.y, q.z, q.r + (l.big ? 10 : 2))) { hurtFoe(q, l.dmg, l.x, l.y, l.z); l.t = 9; if (l.big) for (const o of L) if (o !== q && o.alive !== false && Math.hypot(o.x - l.x, o.y - l.y, o.z - l.z) < 90) hurtFoe(o, 2, o.x, o.y, o.z); break; }
      if (l.z < height(l.x, l.y)) { if (l.big) P.fire(l.x, l.y, l.z, 6); l.t = 9; }
    }
    lasers = lasers.filter(l => l.t < (l.big ? 3 : .9));
    for (const s of shots) {
      const x0 = s.x, y0 = s.y, z0 = s.z; s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt; s.t += dt;
      if (s.back) { for (const q of L) if (q.alive !== false && segHit(x0, y0, z0, s.x, s.y, s.z, q.x, q.y, q.z, q.r)) { hurtFoe(q, 2, s.x, s.y, s.z); s.t = 9; break; } continue; }
      if (segHit(x0, y0, z0, s.x, s.y, s.z, ship.x, ship.y, ship.z, ship.rolling > 0 ? 26 : 11)) {
        if (ship.rolling > 0) { s.vx *= -1.3; s.vy *= -1.3; s.vz *= -1.3; s.back = true; P.sparks(s.x, s.y, s.z, 4, null, { color: '#a0e0ff' }); if (!scripted) A.sfx('blip', { vol: .5 }); }   // (a roll turns it aside)
        else { hurt(8); s.t = 9; }
      }
    }
    shots = shots.filter(s => s.t < 3.5);
  }
  function segHit(x0, y0, z0, x1, y1, z1, cx, cy, cz, r) {   // (a step's segment against a ball: fast shots never pass through)
    const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, L2 = dx * dx + dy * dy + dz * dz || 1, k = clamp(((cx - x0) * dx + (cy - y0) * dy + (cz - z0) * dz) / L2, 0, 1);
    return Math.hypot(x0 + dx * k - cx, y0 + dy * k - cy, z0 + dz * k - cz) < r;
  }
  function hurt(n) { if (S.hurtT > 0 || ended) return; S.shield -= n; S.hurtT = .5; game.shake(3); game.flash('#ff3a2a'); if (!scripted) A.sfx('hurt'); if (S.shield <= 0) { S.shield = 0; end(-1); } }
  function end(k) { if (ended) return; ended = k; endT = 0; if (k < 0) { P.fire(ship.x, ship.y, ship.z, 16, { size: 10 }); } }

  /* ---- the flagship: it circles the bay, fires spreads from its engines and homing mines; its core opens when they burn ---- */
  function moveBoss(dt) {
    const B = boss; B.t += dt;
    if (!B.alive) { B.dying -= dt; B.z -= 40 * dt; if ((world.n & 7) === 0) P.fire(B.x + (rnd() - .5) * 120, B.y + (rnd() - .5) * 120, B.z, 4, { size: 12 }); if (B.dying <= 0 && !ended) end(1); return; }
    B.a += dt * .11; B.x = BAY[0] + Math.cos(B.a) * 1200; B.y = BAY[1] + Math.sin(B.a) * 1200; B.z = 280 + Math.sin(B.t * .5) * 60; B.yaw = B.a + PI / 2;
    if (!freed) return;
    B.cool -= dt; B.mcool -= dt; const near = Math.hypot(ship.x - B.x, ship.y - B.y) < 2400;
    if (B.cool <= 0 && near) { B.cool = B.core ? 1.6 : 2.4; const from = B.parts.filter(p => p.alive).map(partAt)[0] || coreAt(); for (let k = 0; k < 5; k++) fireAt(from, 560, .5 + k * .1); }
    if (B.mcool <= 0 && near) { B.mcool = 7; for (const s of [-1, 1]) foes.push({ type: 'mine', alive: true, hp: 1, r: 14, x: B.x, y: B.y + s * 60, z: B.z, t: 0, home: true }); }
  }
  function moveMine(m, dt) {
    m.t += dt; const dx = ship.x - m.x, dy = ship.y - m.y, dz = ship.z - m.z, d = Math.hypot(dx, dy, dz) || 1, sp = 300;
    m.x += dx / d * sp * dt; m.y += dy / d * sp * dt; m.z += dz / d * sp * dt;
    if (d < 20) { m.alive = false; if (ship.rolling > 0) { P.sparks(m.x, m.y, m.z, 6, null, { color: '#a0e0ff' }); } else { hurt(12); P.fire(m.x, m.y, m.z, 8); } }
    if (m.t > 9) m.alive = false;
  }

  /* ---- one step: the controls, the ship, the stage's script, the shots, the camera's target ---- */
  const ctl = { steer: [0, 0], boost: false, brake: false, roll: 0, fire: false, down: a => game.input.down(a), pressed: a => game.input.pressed(a) };
  function controls() {
    const I = game.input, m = I.move(); ctl.steer[0] = m[0]; ctl.steer[1] = m[1];
    ctl.boost = I.down('boost'); ctl.brake = I.down('brake'); ctl.roll = I.pressed('roll') ? (Math.sign(m[0]) || 1) : 0; ctl.fire = I.down('fire'); ctl.tap = I.pressed('fire');
    return ctl;
  }
  function step(dt, c) {
    t += dt; world.step(dt);
    if (ended) { endT += dt; if (ended < 0) ship.z -= 60 * dt; for (const l of lasers) l.t += dt; return; }
    if (S.hurtT > 0) S.hurtT -= dt;
    // the boost meter: boost or brake while it lasts, then it refills
    const use = (c.boost || c.brake) && S.boost > 0; S.boost = clamp(S.boost + (use ? -.45 : .25) * dt, 0, 1);
    ship.update(dt, { steer: c.steer, boost: use && c.boost, brake: use && c.brake, roll: c.roll });
    if (c.roll && !scripted) A.sfx('whoosh', { vol: .5 });
    if (ship.hitGround) { if ((world.n & 7) === 0) { P.sparks(ship.x, ship.y, ship.z - 6, 3); hurt(4); } }
    // fire: a tap shoots; held, it charges (a lock on what is ahead), let go, the charged shot flies
    S.fireT -= dt;
    if (c.fire) { S.charge = Math.min(1, S.charge + dt * 1.4); if (S.charge > .35) lock = ship.seek(targets(), { cone: .3, range: 1800 }) || lock; if (lock && lock.alive === false) lock = null; }
    if (c.tap && S.fireT <= 0) { laser(); S.fireT = .12; }
    if (!c.fire && S.held) { if (S.charge >= 1) charged(); S.charge = 0; lock = null; }
    S.held = c.fire;
    // the stage's script: waves, radio calls, the end of the rails
    while (wave < WAVES.length && ship.d >= WAVES[wave][0]) spawn(WAVES[wave++]);
    while (call < CALLS.length && ship.d >= CALLS[call][0]) { radio(CALLS[call][1], CALLS[call][2]); call++; }
    if (!freed && ship.d >= RL - 20) { freed = true; ship.o.rail = null; ship.o.bounds = BOUNDS; ship.pitch = 0; foes = []; shots = []; if (!scripted) A.music(BOSS_SONG); radio('KESTREL', 'All range mode! Take it down!'); }
    // the fighters, turrets and masts
    for (const f of foes) if (f.alive) {
      if (f.type === 'mine') { moveMine(f, dt); continue; }
      moveFoe(f, dt); if (!f.alive || f.t < 0) continue;
      f.cool -= dt; if (f.cool <= 0 && !f.chase && f.d > ship.d + 150) { f.cool = 1.8 + rnd() * 1.6; fireAt(f, 480, .15); }
      if (Math.hypot(f.x - ship.x, f.y - ship.y, f.z - ship.z) < 22) { hurt(10); hurtFoe(f, 9, f.x, f.y, f.z); }
      if (f.chase) { S.wingT += dt; if (S.wingT > 9) { f.alive = false; S.wing -= 40; radio('KESTREL', 'I\'m hit! I\'ll make it.'); } }
    }
    foes = foes.filter(f => f.alive);
    for (const q of turrets) if (q.alive) {
      const dx = ship.x - q.x, dy = ship.y - q.y, d = Math.hypot(dx, dy); q.yaw = Math.atan2(dy, dx);
      q.cool -= dt; if (q.cool <= 0 && d < 1500 && !freed) { q.cool = 2 + rnd() * 1.2; fireAt({ x: q.x, y: q.y, z: q.z + 26 }, 460, .1); }
    }
    for (const m of masts) if (Math.hypot(ship.x - m.x, ship.y - m.y) < 22 && ship.z < m.top) { hurt(10); P.sparks(ship.x, ship.y, ship.z, 6); }
    for (const g of rings) if (!g.got && Math.abs(ship.d - g.d) < 14 && !freed && Math.hypot(ship.x - g.x, ship.y - g.y, ship.z - g.z) < 34) { g.got = true; S.shield = Math.min(100, S.shield + (g.kind === 'g' ? 40 : 15)); score += 50; P.glints(g.x, g.y, g.z, 10, g.kind === 'g' ? '#ffe04a' : '#e0e8ff', 40); if (!scripted) A.sfx('coin'); }
    if (freed && boss.alive && Math.hypot(ship.x - boss.x, ship.y - boss.y, ship.z - boss.z) < 110) hurt(10);   // (into its hull)
    moveBoss(dt); moveShots(dt);
    // the camera: behind the rail's point (the ship moves about in front of it), then behind the ship
    if (!freed) { const F = ship.frame, k = .35; Object.assign(camT, { x: F.x + (ship.x - F.x) * k, y: F.y + (ship.y - F.y) * k, z: F.z + (ship.z - F.z) * k, yaw: F.yaw, pitch: F.pitch, roll: 0 }); }
    else Object.assign(camT, { x: ship.x, y: ship.y, z: ship.z, yaw: ship.yaw, pitch: ship.pitch * .6, roll: ship.roll });
  }
  const BOSS_SONG = { bpm: 156, steps: 4, tracks: [
    { wave: 'sawtooth', vol: .045, notes: 'D5 . D5 F5 . E5 D5 . | C5 . C5 E5 . D5 C5 . | D5 . D5 F5 . G5 A5 . | A#5 . A5 G5 . F5 E5 .' },
    { wave: 'triangle', vol: .26, notes: 'D2 D2 D3 D2 D2 D3 D2 D3 | C2 C2 C3 C2 C2 C3 C2 C3 | D2 D2 D3 D2 D2 D3 D2 D3 | A#1 A#1 A#2 A#1 A2 A2 A1 A2' },
    { wave: 'drums', vol: .08, notes: 'k h s h k k s h k h s h k k s s' }] };

  /* ---- the look: the ship, the wingman, the fighters, turrets, masts, rings, the flagship, every shot (the pen) ---- */
  function shipParts(pen, x, y, z, yaw, pitch, roll, body, trim, k = 1) {
    pen.at(x, y, z, yaw, k, pitch, roll);
    pen.ball(2, 0, 0, 13, 3.4, 2.6, body).cone(14, 0, 0, 22, 0, -.4, 2.2, body).ball(4, 0, 2.2, 4.4, 2, 1.8, '#4ac0ff');
    for (const s of [-1, 1]) pen.slab(2, s * 2, -.4, -8, s * 17, -1.6, 1, 0, 0, 7, .8, body).slab(-6, s * 15, -1.4, -9, s * 19, 4, 1, 0, 0, 4, .6, trim).tube(-12, s * 2.6, 0, -9, s * 2.6, 0, 1.6, '#3a3a48').glow(-13.5, s * 2.6, 0, 1.8, '#7ad8ff');
    pen.at();
  }
  function onDraw(w) {
    const pen = w.pen, a = ship.at(), tt = game.real || 0;
    if (!(ended < 0 && endT > .3)) shipParts(pen, a.x, a.y, a.z, a.yaw, a.pitch, a.roll, S.hurtT > 0 && (tt * 20 & 1) ? '#ff8a7a' : '#e8e8f0', '#3a6ad8');
    if (!freed && !ended) { const k = wingAt(), q = frameAt(k.d, k.ox, k.oy); shipParts(pen, q.x, q.y, q.z, q.yaw, 0, Math.sin(tt * .9) * .3 + (k.chased ? Math.sin(tt * 3) * .5 : 0), '#e8e0d0', '#2a9a4a', .9); }   // KESTREL: on your right, or ahead with one on its tail
    for (const f of foes) {
      if (f.type === 'mine') { pen.ball(f.x, f.y, f.z, 7, 7, 7, '#5a3a4a').glow(f.x, f.y, f.z, 4 + Math.sin(tt * 12) * 1.5, '#ff4a3a'); continue; }
      if (f.t < 0) continue;
      pen.at(f.x, f.y, f.z, f.yaw, 1, 0, f.roll).ball(0, 0, 0, 10, 3, 3, '#5a5a6a').slab(-2, 0, 0, -8, 0, 0, 0, 1, 0, 26, .8, '#8a2a2a').ball(4, 0, 1.6, 3, 1.6, 1.4, '#ffb03a').glow(-10, 0, 0, 2, '#ff7a3a'); pen.at();
    }
    for (const q of turrets) if (q.alive) pen.at(q.x, q.y, q.z, q.yaw).box(0, 0, 8, 22, 22, 16, '#6a6a74').ball(0, 0, 18, 9, 9, 7, '#8a8a94').tube(0, 0, 20, 26, 0, 26, 2.2, '#3a3a44').glow(26, 0, 26, q.cool < .3 ? 3 : 1.4, '#ff5a3a').at();
    else pen.box(q.x, q.y, q.z + 3, 22, 22, 6, '#2a2a30');
    for (const m of masts) pen.tube(m.x, m.y, m.z, m.x, m.y, m.top, 7, '#9a9aa8').box(m.x, m.y, m.top, 26, 26, 10, '#c8302a').glow(m.x, m.y, m.top + 8, 2.5 + Math.sin(tt * 4) * 1, '#ff4a3a');
    for (const g of rings) if (!g.got) { const c = g.kind === 'g' ? '#ffd040' : '#d8e0f0'; pen.at(g.x, g.y, g.z, g.yaw); for (let i = 0; i < 16; i++) { const a0 = i / 16 * PI * 2, a1 = (i + 1) / 16 * PI * 2; pen.tube(0, Math.cos(a0) * 30, Math.sin(a0) * 30, 0, Math.cos(a1) * 30, Math.sin(a1) * 30, 2.2, c); } pen.at(); }
    if (boss.alive || boss.dying > 0) {   // the flagship: a long hull, a bridge, four engines on pylons, the core's dome
      const B = boss; pen.at(B.x, B.y, B.z, B.yaw, 1, 0, Math.sin(B.t * .4) * .08);
      pen.ball(0, 0, 0, 150, 46, 22, '#5a5a68').box(-20, 0, 18, 120, 40, 16, '#4a4a56').box(30, 0, 34, 40, 24, 22, '#6a6a78').cone(140, 0, 0, 200, 0, -4, 14, '#4a4a56');
      for (const p of B.parts) { const [px, py, pz] = p.o; pen.slab(px, 0, pz, px, py, pz, 1, 0, 0, 22, 4, '#3a3a44'); if (p.alive) pen.ball(px, py, pz, 34, 16, 14, '#7a6a5a').glow(px - 30, py, pz, 8 + Math.sin(tt * 20) * 2, '#ff9a3a'); else pen.ball(px, py, pz, 22, 12, 10, '#2a2420'); }
      pen.ball(0, 0, 16, 28, 28, 18, B.core ? (tt * 6 & 1 ? '#ff4a6a' : '#c82a4a') : '#8a8a98');
      pen.at();
    }
    for (const l of lasers) { const sp = Math.hypot(l.vx, l.vy, l.vz) || 1, n = l.big ? 0 : 26; if (l.big) pen.glow(l.x, l.y, l.z, 7 + Math.sin(tt * 30) * 2, '#7aff9a').halo(l.x, l.y, l.z, 30, [.2, .6, .3]); else pen.tube(l.x, l.y, l.z, l.x - l.vx / sp * n, l.y - l.vy / sp * n, l.z - l.vz / sp * n, 1.4, '#7aff8a'); }
    for (const s of shots) pen.glow(s.x, s.y, s.z, 4, s.back ? '#8ad0ff' : '#ff6a3a');
  }

  /* ---- the HUD: the shield, the boost meter, hits and score, the reticle (and the lock), the flagship's strength ---- */
  function hud(r) {
    const g0 = r, W = r.W, H = r.H;
    r.overlay(g => {
      E.ui.bar(g, 8, H - 16, 90, 7, S.shield / 100, S.shield > 30 ? '#4ae07a' : '#ff5a3a', { bg: '#1a1a2a', border: '#e8e4ff' });
      E.font.text(g, 'SHIELD', 8, H - 26, '#c8d8ff', { font: 'tiny', shadow: '#000', outline: false });
      E.ui.bar(g, 104, H - 16, 50, 7, S.boost, '#4ac0ff', { bg: '#1a1a2a', border: '#e8e4ff' });
      E.font.text(g, 'HITS ' + hits, W - 8, 8, '#ffe04a', { align: 'right', shadow: '#000', outline: false });
      E.font.text(g, String(score).padStart(6, '0'), W - 8, 18, '#ffffff', { align: 'right', font: 'tiny', shadow: '#000', outline: false });
      // the reticle: where the lasers go (a point ahead of the nose); the lock: a box on its target
      const f = nose(500), p = world.project(ship.x + f[0], ship.y + f[1], ship.z + f[2]);
      if (p && !ended) { const c = S.charge >= 1 ? '#ff4a3a' : '#7aff8a'; g.strokeStyle = c; g.lineWidth = 1; g.strokeRect(Math.round(p[0]) - 5.5, Math.round(p[1]) - 5.5, 11, 11); E.px.rect(g, Math.round(p[0]), Math.round(p[1]), 1, 1, c); }
      if (lock && lock.alive !== false) { const q = world.project(lock.x, lock.y, lock.z); if (q) { g.strokeStyle = '#ff4a3a'; g.lineWidth = 1; const s = 9 + Math.sin(t * 12) * 2; g.strokeRect(Math.round(q[0] - s) + .5, Math.round(q[1] - s) + .5, s * 2, s * 2); } }
      if (S.charge > 0 && S.charge < 1) E.ui.bar(g, W / 2 - 20, H - 10, 40, 4, S.charge, '#ff9a3a', { bg: '#1a1a2a' });
      if (freed && (boss.alive || boss.dying > 0)) { const left = boss.parts.reduce((n, p) => n + Math.max(0, p.hp), 0) + Math.max(0, boss.hp); E.font.text(g, 'FLAGSHIP', W / 2, 8, '#ffb0a0', { align: 'center', font: 'tiny', shadow: '#000', outline: false }); E.ui.bar(g, W / 2 - 50, 16, 100, 5, left / 70, '#ff5a3a', { bg: '#1a1a2a', border: '#e8e4ff' }); }
      if (ended > 0) E.font.title(g, 'MISSION COMPLETE', W / 2, H * .36, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'] });
    });
    talk.draw(g0);
  }

  /* ---- the proof and the bot ---- */
  /** the proof: a scripted flight: a lean right and up, lasers through the first wave, a barrel roll, a charged shot; n
   *  steps of 1/120 s. The world's hash with the ship's rail distance, shield, hits and every fighter: the same on WebGPU,
   *  WebGL 2 and run again */
  function run(n = 600) {
    reset(3); scripted = true; const c = { steer: [0, 0], boost: false, brake: false, roll: 0, fire: false, tap: false };
    try {
      for (let i = 0; i < n; i++) {
        c.steer[0] = i < 200 ? .6 : i < 360 ? -.4 : 0; c.steer[1] = i < 120 ? -.5 : 0; c.roll = i === 300 ? 1 : 0;
        c.fire = (i % 24 < 2) || (i > 420 && i < 560); c.tap = i % 24 === 0;
        c.boost = i > 200 && i < 260;
        step(1 / 120, c);
      }
      return world.hash([Math.round(ship.d), S.shield, hits, score, foes.length, Math.round(S.boost * 100), ...foes.map(f => Math.round(f.x + f.y + f.z))]);
    } finally { scripted = false; reset(1); }
  }
  /** the bot (tools/kits-test.mjs): flies the stage by the controls a player has: on rails it moves toward what is ahead
   *  (the nearest fighter, a ring) and away from the masts, fires at what is in line, charges at turrets, rolls when a
   *  shot is about to hit; free, it turns after the flagship's engines (then its core), firing when they are in line.
   *  Returns { won, freed, shield, hits, rings, killed, boss, seconds, errors } */
  function bot(max = 120 * 240) {
    reset(5); scripted = true; const c = { steer: [0, 0], boost: false, brake: false, roll: 0, fire: false, tap: false };
    let n = 0, errors = 0, rolls = 0, deflected = 0, charges = 0, chase = false; const dt = 1 / 120;
    try {
      for (; n < max && !(ended && endT > 1); n++) {
        c.steer[0] = c.steer[1] = 0; c.roll = 0; c.tap = false; c.boost = false; c.brake = false;
        const live = targets(), F = ship.frame;
        // a shot about to hit: roll
        const threat = shots.find(s => !s.back && Math.hypot(s.x - ship.x, s.y - ship.y, s.z - ship.z) < 70 && (s.vx * (ship.x - s.x) + s.vy * (ship.y - s.y) + s.vz * (ship.z - s.z)) > 0) || foes.find(m => m.type === 'mine' && Math.hypot(m.x - ship.x, m.y - ship.y, m.z - ship.z) < 60);
        if (threat && ship.rolling <= 0) { c.roll = 1; rolls++; }
        if (!freed) {
          // on rails: the window's goal (ox, oy): a ring coming up, else the nearest foe ahead; away from a mast
          const rx = -Math.sin(F.yaw), ry = Math.cos(F.yaw), local = o => [(o.x - F.x) * rx + (o.y - F.y) * ry, o.z - F.z];
          const ring = rings.find(g => !g.got && g.d > ship.d + 20 && g.d < ship.d + 500);
          const foe = live.filter(q => q.type !== 'turret' && (q.d === undefined || q.d > ship.d + 80)).sort((a, b) => Math.hypot(a.x - ship.x, a.y - ship.y) - Math.hypot(b.x - ship.x, b.y - ship.y))[0];
          let goal = ring ? local(ring) : foe ? local(foe) : [0, 20];
          const mast = masts.find(m => { const ahead = (m.x - ship.x) * Math.cos(F.yaw) + (m.y - ship.y) * Math.sin(F.yaw); return ahead > 0 && ahead < 500 && Math.abs(local(m)[0] - ship.ox) < 50; });
          if (mast) goal = [local(mast)[0] + (local(mast)[0] > ship.ox ? -90 : 90), goal[1]];
          c.steer[0] = clamp((goal[0] - ship.ox) / 60, -1, 1); c.steer[1] = clamp(-(goal[1] - ship.oy) / 50, -1, 1) * (ship.o.invert ? -1 : 1);
          if (ship.z - height(ship.x, ship.y) < 40) c.steer[1] = -1 * (ship.o.invert ? -1 : 1);
          const turret = turrets.find(q => q.alive && Math.hypot(q.x - ship.x, q.y - ship.y) < 1500 && Math.hypot(q.x - ship.x, q.y - ship.y) > 300);
          c.fire = !!turret && S.charge < 1 ? true : (n % 20 < 2); c.tap = n % 14 === 0; if (turret && S.charge >= 1 && lock) { c.fire = false; charges++; }
        } else {
          // free: turn after the next engine (then the core), fire when in line; circle wide when too close
          const tg = live.filter(q => q.type === 'part' || q.type === 'core')[0] || boss, dx = tg.x - ship.x, dy = tg.y - ship.y, dz = tg.z - ship.z, d = Math.hypot(dx, dy);
          const want = d < 260 ? Math.atan2(dy, dx) + PI / 2 : Math.atan2(dy, dx), diff = E.angDiff(ship.yaw, want), pitchTo = Math.atan2(dz, d);
          c.steer[0] = clamp(diff * 3, -1, 1); c.steer[1] = clamp(-(pitchTo - ship.pitch) * 3, -1, 1) * (ship.o.invert ? -1 : 1);
          const inLine = Math.abs(diff) < .12 && Math.abs(pitchTo - ship.pitch) < .15 && d < 1600;
          c.fire = inLine; c.tap = inLine && n % 12 === 0; c.brake = d < 500 && S.boost > .3;
        }
        const was = shots.filter(s => s.back).length; step(dt, c); deflected += Math.max(0, shots.filter(s => s.back).length - was);
        chase = chase || foes.some(f => f.chase);
      }
    } catch (e) { errors++; console.error(e); }
    scripted = false;
    const r = { won: ended > 0, freed, shield: S.shield, hits, score, rings: rings.filter(g => g.got).length, turrets: turrets.filter(q => !q.alive).length, boss: !boss.alive, rolls, deflected, charges, wing: S.wing, chase, seconds: Math.round(n / 120), errors: errors + game.errors.length };
    reset(1); return r;
  }

  return {
    view: 'iso', input: KEYS, pausable: true, touch: TOUCH, camera: { zoom: false },
    enter() {
      game.settings.define(INVERT); reset(1); active = world; A.music(SONG); game.input.touchButtons(TOUCH, { labels: TOUCH_LABELS });
      ship.o.invert = !!game.settings[INVERT.key];
    },
    update(dt) {
      talk.update(dt);
      step(dt, controls());
      if (ended && endT > (ended > 0 ? 4 : 2.5)) game.go('over', { from: 'flight', world, won: ended > 0, title: ended > 0 ? 'MISSION COMPLETE' : null, lines: ['HITS ' + hits + '   SCORE ' + score, ended > 0 ? 'THE FLAGSHIP IS DOWN' : 'SHOT DOWN'] });
    },
    draw(r) { world.draw(r); hud(r); },
    get world() { return world; }, get hero() { return ship; }, get ship() { return ship; }, get state() { return S; }, get foes() { return foes; }, get boss() { return boss; },
    get freed() { return freed; }, reset, run, bot, RAIL
  };
})();
scenes.flight = FLIGHT;
