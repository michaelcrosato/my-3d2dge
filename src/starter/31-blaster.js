/* =====================================================================================
 * SLICE 24  BLASTER  (Space Harrier, After Burner, Thunder Blade, Yoshi's Safari, HyperZone, Super Star Wars). @modules mode7 mesh
 * Shooters into the screen, five stages in a row (or one picked on the menu). HARRIER: a hero with a jet pack over a
 * checkered plain, anywhere on the screen, firing into it at saucers and jets; columns to dodge; a serpent at the end.
 * BURNER: a jet over the sea (seen first from overhead, as Thunder Blade opens), the horizon tilting as it banks: its cannon, missiles at what the reticle has locked, a
 * barrel roll that shakes off missiles; a bomber at the end. SAFARI: first person on rails through a valley, a cursor
 * to aim: slimes and bats out from behind the rocks (a rock stops a shot), a walker with three weak points at the end.
 * ZONE (HyperZone): a craft along a winding course over a neon grid, the camera banking into its bends: pods to
 * shoot, mines on the course to steer round, the gate at its end. SPEEDER (Super Star Wars' speeders): free over the
 * dunes, low, turned where you will: four crawlers to find by the radar and bring down, skimmers that hunt you.
 * Three lives, a score and a best. Deep links: #blaster/harrier, #blaster/burner, #blaster/safari, #blaster/zone,
 * #blaster/speeder. KEYS: the arrows (the hero, the jet: up climbs; the cursor; the speeder: up faster), J / Z / Space or a click fire, K / X the missiles,
 * L / C / Shift the barrel roll. A pad: the stick, A fire, X missiles, B the roll. TOUCH: the stick, and it fires by
 * itself; MISSILE and ROLL in the jet; in the safari a tap shoots where it lands.
 * HOW IT WORKS: E.Mode7 (the mode7 module): the plain, the sea and the valley, the camera rolled with the jet, m7.pick
 * under the cursor; E.Mesh (the mesh module) the saucers, jets, missiles, columns, rocks, the bomber and the walker;
 * E.Humanoid the hero, E.Blob the slimes and bats, E.Path the rails; this file the stages, their waves and the score.
 * ===================================================================================== */
const BLASTER = (() => {
  const KEYS = Object.assign({}, E.Input.DEFAULT, { fire: ['KeyJ', 'KeyZ', 'Space', 'Mouse0', 'Pad0', 'Pad7'], missile: ['KeyK', 'KeyX', 'Pad2', 'Pad5'], roll: ['KeyL', 'KeyC', 'ShiftLeft', 'ShiftRight', 'Pad1', 'Pad4'] });
  for (const k of ['attack', 'dash', 'skill', 'jump']) delete KEYS[k];
  const STAGES = ['harrier', 'burner', 'safari', 'zone', 'speeder'], hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;
  /* ---- THE MODELS (x forward, y right, z up) ---- */
  const SAUCER = new E.Mesh([['ball', [0, 0, 6], [16, 16, 4], 'hull', { n: 10 }], ['ball', [0, 0, 9.5], [7, 7, 5], '#8ae0ff', { n: 8 }], ['tube', [0, 0, 1.6], 5, 1.4, '#ffd040', { axis: 'z', n: 6 }]]);
  const JET = new E.Mesh([['tube', [2, 0, 4], 2.6, 12, 'body', { n: 8, end: .3 }], ['tube', [-13, 0, 4.2], 2.3, 3, '#3a3a42', { n: 8, end: 1.15 }],
    ['face', [[7, 2, 4], [-6, 2, 4], [-10, 14, 3.4], [-5, 14, 3.4]], 'body', { both: true, mirror: true }], ['face', [[-10, 2.5, 4.4], [-17, 2.5, 4.4], [-18.5, 8, 4.2], [-15.5, 8, 4.2]], 'body', { both: true, mirror: true }],
    ['face', [[-10, 2.6, 6], [-16.5, 2.6, 6], [-18, 3.6, 13], [-14.5, 3.6, 13]], 'tail', { both: true, mirror: true }], ['ball', [6.5, 0, 6.4], [4, 1.8, 1.9], '#5ab8f0', { n: 6 }], ['box', [0, 3.3, 3.4], [4, 1.2, 1.4], '#5a5a62', { mirror: true }]]);
  const MISSILE = new E.Mesh([['tube', [0, 0, 0], .9, 4, '#eceae4', { n: 5, end: .25 }], ['face', [[-2.5, 0, 0], [-4.5, 0, 0], [-4.5, 0, 2.6]], '#c83a30', { both: true }], ['face', [[-2.5, 0, 0], [-4.5, 0, 0], [-4.5, 2.6, 0]], '#c83a30', { both: true, mirror: true }]]);
  const PILLAR = new E.Mesh([['tube', [0, 0, 60], 10, 60, 'col', { axis: 'z', n: 8 }], ['box', [0, 0, 123], [14, 14, 3], 'cap'], ['box', [0, 0, 2], [14, 14, 2], 'cap']]);
  const ROCK = new E.Mesh([['ball', [0, 0, 10], [26, 20, 16], '#8a8278', { n: 7 }], ['ball', [10, 8, 6], [12, 10, 8], '#7a7268', { n: 6 }]]);
  const SEG = new E.Mesh([['ball', [0, 0, 0], [22, 22, 22], 'hue', { n: 8 }], ['tube', [0, 0, 16], 3, 5, '#f0e8c8', { axis: 'z', n: 4, end: 0 }]]);
  const HEAD = new E.Mesh([['ball', [0, 0, 0], [26, 21, 19], 'hue', { n: 8 }], ['box', [20, 0, -4], [10, 12, 6], 'hue', { top: [.8, .8] }], ['tube', [-6, 11, 20], 3.5, 9, '#f0e8c8', { axis: 'z', n: 5, end: 0, mirror: true }], ['ball', [19, 9, 6], [4, 4, 4], '#fff4a0', { n: 6, mirror: true }], ['box', [26, 0, -9], [6, 11, 2], '#5a1a2a']]);
  const WALKER = new E.Mesh([['box', [0, 18, 30], [7, 6, 30], '#5a5e6a', { mirror: true }], ['box', [0, 18, 2], [12, 9, 2], '#3a3e4a', { mirror: true }], ['box', [0, 0, 72], [22, 30, 14], 'hull', { top: [.85, .8] }],
    ['box', [16, 0, 84], [8, 14, 6], '#2a2e3a', { top: [.6, .8] }], ['box', [24, 0, 74], [4, 18, 3], '#ffc040'], ['box', [0, 0, 92], [12, 12, 6], 'hull', { top: [.5, .6] }], ['box', [0, 18, 62], [9, 8, 4], '#3a3e4a', { mirror: true }], ['box', [6, 18, 4], [16, 8, 4], '#4a4e5a', { top: [.7, 1], mirror: true }]]);
  const ARM = new E.Mesh([['box', [0, 0, 0], [10, 7, 7], 'hull'], ['tube', [16, 0, 0], 3.2, 9, '#2a2e3a', { n: 6 }]]);
  const CORE = new E.Mesh([['ball', [0, 0, 0], [9, 9, 9], 'core', { n: 8 }]]);
  const SPEEDER = new E.Mesh([['box', [0, 0, 3], [12, 5, 1.6], 'body', { top: [.7, .9] }], ['tube', [-6, 6, 4], 1.8, 6, '#5a5a62', { n: 6, mirror: true }], ['ball', [3, 0, 5], [4, 3, 2.2], '#5ab8f0', { n: 6 }]]);
  const CRAWLER = new E.Mesh([['box', [0, 0, 16], [24, 13, 13], 'hull', { top: [.8, .85] }], ['box', [6, 0, 33], [11, 9, 5], 'hull', { top: [.7, .8] }], ['box', [0, 14, 6], [24, 3, 6], '#3a3430', { mirror: true }], ['box', [24, 0, 24], [1, 9, 3], '#ffc040']]);
  const HERO = new E.Humanoid({ size: 1.2, weapon: 'gun', hair: 'spiky', colors: { cloth: '#e83a30', pants: '#2a3a8a', hair: '#ffd040' } });
  const SONG = { bpm: 150, steps: 4, tracks: [
    { wave: 'square', vol: .05, notes: 'E5 . E5 G5 . E5 D5 . | C5 . D5 . E5 . . . | E5 . E5 G5 . A5 G5 . | E5 . D5 . C5 . . . | A5 . A5 C6 . A5 G5 . | E5 . G5 . A5 . . . | G5 . E5 . D5 . C5 . | D5 . . . . . . .' },
    { wave: 'saw', vol: .08, notes: 'A2 A2 A3 A2 A2 A3 A2 A3 | F2 F2 F3 F2 G2 G2 G3 G2 | A2 A2 A3 A2 A2 A3 A2 A3 | F2 F2 F3 F2 E2 E2 E3 E2 | D2 D2 D3 D2 D2 D3 D2 D3 | F2 F2 F3 F2 G2 G2 G3 G2 | C3 C3 C3 C3 B2 B2 B2 B2 | E2 E2 E3 E2 E2 . . .' },
    { wave: 'drums', vol: .07, notes: 'k . h k s . h . k . h k s . h h' }] };
  /* ---- THE FLOORS: the checkered plain, the sea, the valley and its rails ---- */
  let VP = null;
  const ZONE = new E.Path([[2048, 3900], [2048, 3200], [2600, 2700], [3300, 2800], [3500, 2100], [2900, 1500], [2200, 1700], [1500, 1300], [900, 1500], [600, 2200], [1000, 2900], [700, 3500], [300, 3000], [300, 1000], [1200, 400]], { smooth: 'catmull' }), ZL = ZONE.length;   // (the zone's course)
  const RAIL = new E.Path([[2048, 3900], [2050, 3300], [2280, 2800], [2160, 2250], [1800, 1850], [1880, 1300], [2100, 900], [2100, 700]], { smooth: 'catmull' });
  function floors() {
    if (VP) return VP;
    const vale = E.mkCanvas(1024, 1024), g = vale.getContext('2d'), img = g.createImageData(1024, 1024), d = img.data;
    for (let y = 0; y < 1024; y++) for (let x = 0; x < 1024; x++) { const n = hash(x, y) % 9, m = E.noise2(x / 24, y / 24), i = (y * 1024 + x) * 4, c = m > .62 ? [60 + n, 118, 52] : m < .3 ? [120 + n * 2, 150, 70] : [84 + n * 2, 146, 62]; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; }
    g.putImageData(img, 0, 0);
    for (let s = 0; s < RAIL.length; s += 6) { const p = RAIL.at(s); px.disc(g, p.x / 4, p.y / 4, 9, '#b89a6a'); }
    for (let s = 0; s < RAIL.length; s += 6) { const p = RAIL.at(s); px.disc(g, p.x / 4, p.y / 4, 6, '#c8aa78'); }
    const R = E.rng(4); for (let i = 0; i < 900; i++) px.rect(g, R() * 1024, R() * 1024, 1, 1, ['#f0e060', '#f0f0f0', '#e870a0'][i % 3]);
    return (VP = {
      zone: new E.Mode7({ floor: (x, y) => (x & 127) < 3 || (y & 127) < 3 ? [60, 200, 255] : (x >> 7) + (y >> 7) & 1 ? [14, 10, 40] : [20, 14, 52], size: [4096, 4096], texel: 4, wrap: true, far: 3200, fog: { color: '#3a1a6a', near: 1400, far: 3200 }, sky: ['#0a0418', '#6a2a9a'] }),
      plain: new E.Mode7({ floor: (x, y) => ((x >> 6) + (y >> 6)) & 1 ? [66, 168, 88] : [196, 226, 120], size: [1024, 1024], texel: 4, wrap: true, far: 4000, fog: { color: '#f0c8a0', near: 1400, far: 4000 },
        sky: new E.Backdrop({ sky: ['#3a2a8a', '#b86aa8', '#f0c8a0'], sun: { x: .3, y: .45, r: 18, color: '#fff0c0' }, layers: [{ kind: 'mountains', color: '#7a5a9a', y: .82, height: .2, parallax: .05, seed: 3 }] }) }),
      sea: new E.Mode7({ floor: (x, y) => { const n = E.noise2(x / 700, y / 700), r = hash(x >> 4, y >> 4) % 6; return n > .7 ? [70 + r * 3, 140, 60] : n > .66 ? [220, 200, 140] : n > .58 ? [40, 140, 190] : [20 + r, 70 + r * 2, 160]; }, size: [8192, 8192], texel: 16, wrap: true, far: 9000, fog: { color: '#cfe0f4', near: 2500, far: 9000 },
        sky: new E.Backdrop({ sky: ['#1a4aa8', '#5a9ae0', '#cfe0f4'], layers: [{ kind: 'clouds', color: '#ffffff', y: .55, height: .18, parallax: .04, drift: 6 }] }) }),
      dunes: new E.Mode7({ floor: (x, y) => { const n = E.noise2(x / 420, y / 420), r = hash(x >> 2, y >> 2) % 7; return n > .74 ? [150 + r, 104, 76] : Math.sin((x + y * .4) / 46 + n * 14) > .6 ? [230 - r, 194, 136] : [212 - r * 2, 172 - r, 112]; }, size: [4096, 4096], texel: 4, wrap: true, far: 6000, fog: { color: '#f0d0a0', near: 2000, far: 6000 },
        sky: ['#c8683a', '#f0d0a0'] }),
      vale: new E.Mode7({ floor: vale, texel: 4, outside: '#4a8a3e', far: 3000, fog: { color: '#6a9a58', near: 1200, far: 3000 }, sky: new E.Backdrop({ sky: ['#3a7ad8', '#8ac0f0', '#cfe6f8'], sun: { x: .8, y: .2, r: 12, color: '#fffbe0' }, layers: [{ kind: 'clouds', color: '#ffffff', y: .25, height: .15, parallax: .04, drift: 4 }, { kind: 'mountains', color: '#6a7ab8', y: .55, height: .3, parallax: .05, seed: 2 }, { kind: 'hills', color: '#5a9a4a', y: .78, height: .22, parallax: .08 }] }) })
    });
  }

  /* ---- THE RUN: the score, the lives, what flies; a stage at a time ---- */
  let mode = 'menu', R = null, t = 0, auto = false;
  const menu = new E.Menu(game, [E.t('blaster.menu.start'), E.t('blaster.stage.harrier'), E.t('blaster.stage.burner'), E.t('blaster.stage.safari'), E.t('blaster.stage.zone'), E.t('blaster.stage.speeder'), E.t('blaster.menu.back')], { onPick: i => i === 6 ? game.go('title') : begin(i ? i - 1 : 0, i > 0) });
  const after = new E.Menu(game, [E.t('blaster.menu.again'), E.t('blaster.menu.menu')], { onPick: i => i === 0 ? begin(R.first, R.one) : toMenu() });
  function toMenu() { mode = 'menu'; R = null; A.music('title'); }
  /** a run from a stage (one: that stage alone); a game of one: players who joined elsewhere (a split screen) leave, and
   *  player 1 has the whole keyboard again */
  function begin(i, one) { while (game.players.length > 1) game.removePlayer(game.players.length); floors(); R = { first: i, one, stage: -1, score: 0, lives: 3, hits: 0, best: 0 }; next(i); }
  function next(i) {
    Object.assign(R, { stage: i, name: STAGES[i], t: 0, phase: 'intro', phaseT: 2, hurt: 0, cool: 0, fired: 0, shots: [], hot: [], foes: [], fx: [], boss: null, waves: 0 });
    mode = 'play'; STAGE[STAGES[i]].start(); A.music(i === 2 ? 'adventure' : SONG); game.input.consumeAll();
  }
  const boom = (x, y, z, s = 1) => { R.fx.push({ x, y, z, t: 0, s }); A.sfx('explode', { vol: .5 }); };
  const score = n => { R.score += n; };
  function hurt() {
    if (R.hurt > 0 || R.phase === 'clear' || R.phase === 'intro') return;   // (the stage card is a grace: the zone's first pods are on you before it ends)
    R.hits++; R.hurt = 2; game.shake(5); game.flash('#ff4040', .15, .5); A.sfx('hurt');
    if (!auto && --R.lives <= 0) { R.phase = 'over'; R.phaseT = 2.5; }
  }
  function clear() { if (R.phase === 'clear') return; R.phase = 'clear'; R.phaseT = 3; A.music('victory'); score(5000); }
  // the player's controls, or the autopilot's (the bot): { x, y, fire, missile, roll, tap: [sx, sy] where a touch tapped }
  // (a mouse's click is fire, through Mouse0, at the cursor that follows it, even pressed and let go between two steps:
  // a tap of its own would shoot it twice)
  const pad = () => { const I = game.input, [x, y] = I.move(); return { x, y, fire: I.down('fire') || I.pressed('fire') || I.lastDevice === 'touch', missile: I.pressed('missile'), roll: I.pressed('roll'), tap: I.lastDevice === 'touch' && I.clicked && I.clicked() }; };

  /* ---- THE STAGES ---- */
  const STAGE = {
    /** the zone: a course along a path over the grid; the craft a lateral u and a height on it, the camera behind banking into the bends */
    zone: {
      start() { Object.assign(R, { s: 0, u: 0, zh: 60, steer: 0, spawn: 400 }); },
      at(s, u, z) { const p = ZONE.at(s); return { x: p.x - Math.sin(p.angle) * u, y: p.y + Math.cos(p.angle) * u, z, a: p.angle }; },
      cam() { const c = this.at(R.s - 170, R.u * .6, 0), a = ZONE.at(R.s).angle, bend = E.angDiff(a, ZONE.at(R.s + 260).angle); return { x: c.x, y: c.y, h: 46 + R.zh * .55, angle: c.a + E.angDiff(c.a, a) * .5, pitch: 6 + R.zh * .02, fov: 70, roll: clamp(bend * 70, -24, 24) + R.steer * -6 }; },
      update(dt, k) {
        R.s = R.phase === 'clear' ? R.s + (ZL - 10 - R.s) * Math.min(1, dt * 2) : R.s + 760 * dt;   // (through the gate, the craft eases to a stop at the course's end: past it the camera would see nothing)
        R.steer += (k.x - R.steer) * Math.min(1, dt * 8); R.u = clamp(R.u + R.steer * 300 * dt, -150, 150); R.zh = clamp(R.zh - k.y * 220 * dt, 16, 160);
        const me = this.at(R.s, R.u, R.zh);
        if (k.fire && R.cool <= 0) { R.cool = .11; R.fired++; R.shots.push({ x: me.x, y: me.y, z: me.z + 4, vx: Math.cos(me.a) * 1700, vy: Math.sin(me.a) * 1700, vz: 0, t: 0 }); A.sfx('shoot', { vol: .3 }); }
        while (R.spawn < R.s + 2400 && R.spawn < ZL - 900) {   // what lies ahead, placed along the course: pods in threes, now and then a mine on it
          const n = Math.round(R.spawn / 260), u = Math.sin(n * .9) * 110, mine = n % 4 === 3;
          if (mine) { const q = this.at(R.spawn, -u * .6, 14); R.foes.push({ kind: 'mine', s: R.spawn, u: -u * .6, x: q.x, y: q.y, z: 14, hp: 2, r: 16 }); }
          else for (let i = -1; i <= 1; i++) { const q = this.at(R.spawn + i * 40, u + i * 40, 50 + Math.abs(i) * 30); R.foes.push({ kind: 'pod', s: R.spawn + i * 40, u: u + i * 40, x: q.x, y: q.y, z: q.z, hp: 1, r: 16, ph: n + i }); }
          R.spawn += 260;
        }
        for (const f of R.foes) if (f.hp > 0) {
          f.t = (f.t || 0) + dt;
          if (f.kind === 'pod') { f.s -= 160 * dt; f.u += Math.sin(f.t * 2 + f.ph) * 40 * dt; const q = this.at(f.s, f.u, f.z); f.x = q.x; f.y = q.y; if (!f.shot && f.s - R.s < 900 && f.ph % 3 === 0) { f.shot = true; fireAt(f, 560); } }
          if (Math.abs(f.s - R.s) < 14 && Math.abs(f.u - R.u) < f.r + 6 && Math.abs(f.z - R.zh) < 26) { f.hp = 0; boom(f.x, f.y, f.z); hurt(); }
        }
        R.foes = R.foes.filter(f => f.hp > 0 && f.s > R.s - 300);
        if (R.s >= ZL - 400) clear();
      },
      hit(s) { for (const f of R.foes) if (f.hp > 0 && Math.hypot(s.x - f.x, s.y - f.y, s.z - f.z) < f.r + 8) { if (--f.hp <= 0) { boom(f.x, f.y, f.z); score(f.kind === 'mine' ? 500 : 200); } return true; } return false; },
      me() { const m = this.at(R.s, R.u, R.zh); return { x: m.x, y: m.y, z: m.z }; },
      gather(V) {
        const k0 = Math.floor((R.s - 160) / 90);
        for (let k = k0; k < k0 + 30; k++) {   // the course: a band of two tones, rails of light along its edges
          const a = k * 90, b = a + 90, P = [this.at(a, -170, 0), this.at(a, 170, 0), this.at(b, 170, 0), this.at(b, -170, 0)].map(q => [q.x, q.y, 0]);
          V.quad(P, k & 1 ? '#2a1a6a' : '#3a2a8a');
          for (const e of [-1, 1]) V.quad([this.at(a, e * 170, 0), this.at(a, e * 182, 0), this.at(b, e * 182, 0), this.at(b, e * 170, 0)].map(q => [q.x, q.y, .5]), k & 1 ? '#ff3ab0' : '#ffe040');
        }
        if (R.s > ZL - 2600) { const g0 = this.at(ZL - 400, -190, 0), g1 = this.at(ZL - 400, 190, 0); for (const q of [g0, g1]) V.quad([[q.x - 6, q.y, 0], [q.x + 6, q.y, 0], [q.x + 6, q.y, 120], [q.x - 6, q.y, 120]], '#ffe040'); V.quad([[g0.x, g0.y, 110], [g1.x, g1.y, 110], [g1.x, g1.y, 124], [g0.x, g0.y, 124]], '#ffe040'); }   // (the gate)
        for (const f of R.foes) if (f.hp > 0 && f.s > R.s - 20) { if (f.kind === 'mine') V.add(f.x, f.y, f.z, (g, sx, sy, k) => { const q = Math.max(1, 9 * k); px.disc(g, sx, sy, q, '#2a2a32'); px.disc(g, sx, sy, q * .45, Math.floor(t * 6) % 2 ? '#ff3a3a' : '#801818'); }); else V.mesh(SAUCER, f.x, f.y, f.z, { yaw: f.t * 4, scale: 1.2, colors: { hull: '#a8f0ff' } }); }
        const m = this.at(R.s, R.u, R.zh); if (R.hurt <= 0 || Math.floor(t * 12) % 2) V.mesh(JET, m.x, m.y, m.z, { yaw: m.a, roll: R.steer * .6, scale: 2.4, colors: { body: '#3a8ae8', tail: '#e8e8f0' } });
        const sh = this.at(R.s, R.u, 0); V.add(sh.x, sh.y, 0, (g, sx, sy, k) => { const a = g.globalAlpha; g.globalAlpha = .4; px.ell(g, sx, sy, 30 * k, 9 * k, '#000000'); g.globalAlpha = a; });
      }
    },
    /** the plain: the hero 150 ahead of the camera, which follows across and up (closely enough to keep the hero on the
     *  screen, its corners too); waves by time, then the serpent */
    harrier: {
      start() { Object.assign(R, { F: 0, hx: 0, hz: 60 }); },
      cam() { const tall = game.H > game.W; return { x: R.hx * .8, y: R.F + (tall ? 170 : 115), h: 38 + R.hz * .85, angle: -Math.PI / 2, pitch: 5 + R.hz * .012, fov: tall ? 80 : 66 }; },
      update(dt, k) {
        R.F -= 520 * dt; R.hx = clamp(R.hx + k.x * 330 * dt, -260, 260); R.hz = clamp(R.hz - k.y * 280 * dt, 0, 240);
        HERO.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: R.hz < 6 ? -150 : 0, facing: -Math.PI / 2, air: R.hz > 6, point: true });
        if (k.fire && R.cool <= 0) {   // (the aim leans to what a shot can hit: a saucer, a jet, the serpent's head; not a column or a bush)
          const aim = R.foes.filter(f => f.hp > 0 && f.kind !== 'bush').concat(R.boss && R.boss.hp > 0 && R.boss.parts ? [R.boss.parts[0]] : []).filter(f => f.y < R.F && R.F - f.y < 1500).sort((a, b) => Math.abs(a.x - R.hx) - Math.abs(b.x - R.hx))[0], dx = aim && Math.abs(aim.x - R.hx) < 90 ? (aim.x - R.hx) / ((R.F - aim.y) / 1500) : 0;
          R.shots.push({ x: R.hx + 4, y: R.F - 10, z: R.hz + 26, vx: clamp(dx, -260, 260), vy: -1500, vz: 0, t: 0 }); R.cool = .11; R.fired++; A.sfx('shoot', { vol: .3 }); }
        const T = R.t, W = R.waves, ahead = R.F - 2400;
        const wave = (at, fn) => { if (T >= at && W === wave.n) { fn(); R.waves++; } wave.n++; }; wave.n = 0;
        for (const [at, kind, n] of [[1.5, 'v', 5], [4, 'cols', 8], [7, 'ring', 6], [9, 'jets', 4], [12, 'v', 5], [14, 'cols', 12], [17, 'ring', 8], [20, 'v', 7], [22, 'cols', 8], [24, 'jets', 6]])
          wave(at, () => { for (let i = 0; i < n; i++) {
            if (kind === 'v') R.foes.push({ kind: 'saucer', x: (i - (n - 1) / 2) * 70, y: ahead - Math.abs(i - (n - 1) / 2) * 120, z: 120, hp: 2, r: 18, ph: i });
            if (kind === 'ring') R.foes.push({ kind: 'saucer', x: Math.cos(i / n * TAU) * 120, y: ahead, z: 120 + Math.sin(i / n * TAU) * 70, hp: 2, r: 18, ph: i, ring: i / n * TAU });
            if (kind === 'cols') { R.foes.push({ kind: 'col', x: (i % 2 ? 1 : -1) * (40 + (i * 53) % 200), y: ahead - i * 260, z: 0, r: 14, still: true }); if (i % 3 === 0) R.foes.push({ kind: 'bush', x: (i % 2 ? -1 : 1) * (60 + (i * 37) % 160), y: ahead - i * 260 - 120, z: 0, hp: 1, r: 22, still: true }); }
            if (kind === 'jets') R.foes.push({ kind: 'jet', x: (i % 2 ? 1 : -1) * 700, y: ahead + 900 + i * 220, z: 60 + i * 30, hp: 1, r: 20, vx: (i % 2 ? -1 : 1) * 380 });
          } });
        if (T > 28 && !R.boss) { R.boss = { kind: 'serpent', hp: 34, max: 34, t: 0, trail: [], segs: 9, die: 0 }; A.music('boss'); }
        for (const f of R.foes) {
          f.t = (f.t || 0) + dt;
          if (f.kind === 'saucer') { f.y += 330 * dt; if (f.ring !== undefined) f.ring += dt * 1.2; f.x += (f.ring !== undefined ? Math.cos(f.ring) * 180 - f.x : Math.sin(f.t * 2.2 + f.ph) * 140 - f.x * .1) * dt * 1.5;
            if (f.ring !== undefined) f.z += (120 + Math.sin(f.ring) * 70 - f.z) * dt * 1.5; if (!f.shot && R.F - f.y < 1100) { f.shot = true; if (f.ph % 2 === 0) fireAt(f, 620); } }
          if (f.kind === 'jet') { f.x += f.vx * dt; f.y += 200 * dt; }
          if (f.kind === 'col' && Math.abs(f.y - R.F) < 14 && Math.abs(f.x - R.hx) < 22 && R.hz < 124) hurt();
        }
        const B = R.boss;
        if (B) {   // the serpent weaves ahead, its body following its head; it breathes fire; shot apart, tail first
          B.t += dt; const head = { x: Math.sin(B.t * 1.1) * 170, y: R.F - 290 + Math.sin(B.t * .7) * 70, z: 100 + Math.sin(B.t * .9) * 60 }; if (B.flash > 0) B.flash -= dt;
          B.trail.unshift([head.x - R.hx * 0, head.y - R.F, head.z]); if (B.trail.length > 120) B.trail.pop();
          B.parts = Array.from({ length: B.segs }, (_, i) => { const p = B.trail[Math.min(B.trail.length - 1, i * 9)]; return { x: p[0], y: R.F + p[1] - i * 40, z: p[2] }; });
          if (B.hp > 0 && Math.floor(B.t / 1.3) !== Math.floor((B.t - dt) / 1.3)) fireAt(B.parts[0], 700);
          if (B.hp <= 0) { B.die += dt; if (B.die > .12 * (9 - B.segs + 1) && B.segs > 0) { const p = B.parts[B.segs - 1]; boom(p.x, p.y, p.z, 1.6); B.segs--; } if (!B.segs) clear(); }
        }
      },
      hit(s) {
        for (const f of R.foes) if (f.hp > 0 && Math.abs(s.y - f.y) < 26 && Math.hypot(s.x - f.x, s.z - (f.z + (f.kind === 'bush' ? 14 : 6))) < f.r + 8) { if (--f.hp <= 0) { boom(f.x, f.y, f.z + 8); score(f.kind === 'bush' ? 50 : 300); } return true; }
        const B = R.boss; if (B && B.hp > 0) for (let i = 0; i < B.segs; i++) { const p = B.parts[i]; if (Math.abs(s.y - p.y) < 36 && Math.hypot(s.x - p.x, s.z - p.z) < (i ? 24 : 30)) { B.hp -= i ? 1 : 2; B.flash = .08; R.fx.push({ x: p.x, y: p.y, z: p.z, t: .2, s: .5 }); if (B.hp <= 0) score(10000); A.sfx('hit', { vol: .4 }); return true; } }
        return false;
      },
      me() { return { x: R.hx, y: R.F, z: R.hz + 20 }; },
      gather(V) {
        for (const f of R.foes) {
          if (f.kind === 'col') V.mesh(PILLAR, f.x, f.y, 0, { colors: { col: '#e8d8b8', cap: '#c8b898' } });
          else if (f.kind === 'bush') { if (f.hp > 0) V.add(f.x, f.y, 0, (g, sx, sy, k) => { for (const [ox, oy, r, c] of [[-10, 10, 12, '#2a7a3a'], [10, 12, 11, '#2a7a3a'], [0, 22, 14, '#3a9a48'], [-4, 26, 7, '#5ab85a']]) px.disc(g, sx + ox * k, sy - oy * k, r * k, c); }); }
          else if (f.kind === 'saucer') V.mesh(SAUCER, f.x, f.y, f.z, { yaw: f.t * 4, scale: 1.4, colors: { hull: '#d8d8e8' } });
          else V.mesh(JET, f.x, f.y, f.z, { yaw: f.vx > 0 ? 0 : Math.PI, roll: f.vx > 0 ? .5 : -.5, colors: { body: '#c84a3a', tail: '#3a3a42' } });
        }
        const B = R.boss; if (B) for (let i = B.segs - 1; i >= 0; i--) { const p = B.parts[i]; V.mesh(i ? SEG : HEAD, p.x, p.y, p.z, { yaw: Math.PI / 2, colors: { hue: B.flash > 0 || B.hp <= 0 ? '#f8f0f0' : i % 2 ? '#3a9a6a' : '#5ac88a' } }); }
        if (R.hurt <= 0 || Math.floor(t * 12) % 2) V.add(R.hx, R.F, R.hz, (g, sx, sy, k) => HERO.draw(g, Math.round(sx), Math.round(sy), V.view(k)));
        V.add(R.hx, R.F, 0, (g, sx, sy, k) => { const a = g.globalAlpha; g.globalAlpha = .35; px.ell(g, sx, sy, 14 * k, 5 * k, '#1a2a10'); g.globalAlpha = a; });
      }
    },
    /** the sea: the jet's heading, bank, height and a barrel roll; bandits ahead and behind; the lock-on; the bomber */
    burner: {
      start() { R.j = { x: 4096, y: 4096, z: 420, yaw: -Math.PI / 2, roll: 0, pitch: 0, spin: 0, speed: 560, missiles: 60 }; R.locks = []; },
      cam() {   // (the stage opens overhead, Thunder Blade's way, the camera swinging down behind the jet after 5 s)
        const j = R.j, back = 90 * (game.H > game.W ? 1.4 : 1), n = { x: j.x - Math.cos(j.yaw) * back, y: j.y - Math.sin(j.yaw) * back, h: j.z + 34 - j.pitch * 40, angle: j.yaw, pitch: 12 - j.pitch * 25, fov: game.H > game.W ? 84 : 68, roll: j.roll * 34 + (j.spin > 0 ? (1 - j.spin / .9) * 360 : 0) }, u = E.ease.inOutQuad(clamp((R.t - 5) / 2.5, 0, 1));
        if (u >= 1) return n; const h = n.h + (j.z + 420 - n.h) * (1 - u), dn = Math.atan2(h - j.z, Math.max(1, back * u)) * 180 / Math.PI;   // (dn: the angle down to the jet: the pitch kept within 20 degrees of it, the jet on the screen as the camera swings)
        return Object.assign(n, { x: j.x + (n.x - j.x) * u, y: j.y + (n.y - j.y) * u, h, pitch: Math.max(n.pitch + (90 - n.pitch) * (1 - u), dn - 20), roll: n.roll * u });
      },
      update(dt, k) {
        const j = R.j;
        j.roll += (clamp(k.x, -1, 1) * 1.15 - j.roll) * Math.min(1, dt * 3); j.yaw += Math.sin(j.roll) * 1.5 * dt;
        j.pitch += (-clamp(k.y, -1, 1) * .35 - j.pitch) * Math.min(1, dt * 4); j.z = clamp(j.z + j.pitch * 700 * dt, 140, 900);
        if (k.roll && j.spin <= 0) { j.spin = .9; A.sfx('whoosh'); } if (j.spin > 0) j.spin -= dt;
        j.x += Math.cos(j.yaw) * j.speed * dt; j.y += Math.sin(j.yaw) * j.speed * dt;
        if (k.fire && R.cool <= 0) { const n = JET.at(16, 0, 4, { x: j.x, y: j.y, z: j.z, yaw: j.yaw }); R.shots.push({ x: n[0], y: n[1], z: n[2], vx: Math.cos(j.yaw) * 2600, vy: Math.sin(j.yaw) * 2600, vz: j.pitch * 1200, t: 0 }); R.cool = .07; R.fired++; A.sfx('shoot', { vol: .2 }); }
        // the lock-on: what stays near the reticle (ahead of the jet, on the screen) a moment is locked, four at most, while a missile is left
        VP.sea.begin({ W: game.W, H: game.H }, this.cam());
        for (const f of R.foes) if (f.hp > 0 && (f.p = VP.sea.project(f.x, f.y, f.z + 6))) { const near = Math.hypot(f.p[0] - game.W / 2, f.p[1] - game.H * .38) < 60 && f.p[2] > .05; f.lockT = near ? (f.lockT || 0) + dt : 0; if (f.lockT > .25 && !R.locks.includes(f) && R.locks.length < 4 && j.missiles > 0) { R.locks.push(f); A.sfx('blip'); } }
        R.locks = R.locks.filter(f => f.hp > 0);
        if (k.missile && R.locks.length && j.missiles > 0) { for (const f of R.locks.splice(0)) if (j.missiles > 0 && j.missiles--) R.shots.push({ x: j.x, y: j.y, z: j.z - 6, vx: Math.cos(j.yaw) * 700, vy: Math.sin(j.yaw) * 700, vz: 0, t: 0, homing: f, sp: 1100 }); A.sfx('laser'); }
        // the bandits: from ahead (head on, firing) and from behind (overtaking); then the bomber
        const fw = [Math.cos(j.yaw), Math.sin(j.yaw)], rt = [-fw[1], fw[0]], T = R.t;
        if (T > 2 && T < 34 && Math.floor(T / 2.6) !== Math.floor((T - dt) / 2.6)) {
          const n = Math.floor(T / 2.6), behind = n % 3 === 2;
          for (let i = 0; i < 3; i++) { const side = (i - 1) * 260 + (n % 2 ? 120 : -120), d = behind ? -700 : 2600;
            R.foes.push({ kind: 'bandit', x: j.x + fw[0] * d + rt[0] * side, y: j.y + fw[1] * d + rt[1] * side, z: j.z + (i - 1) * 60, yaw: behind ? j.yaw : j.yaw + Math.PI, speed: behind ? 820 : 520, hp: 2, r: 26, t: 0, fire: 1 + i * .5 }); }
        }
        if (T > 36 && !R.boss) { const d = 1500; R.boss = { kind: 'bomber', x: j.x + fw[0] * d, y: j.y + fw[1] * d, z: j.z + 60, yaw: j.yaw, hp: 30, max: 30, t: 0, r: 70 }; R.foes.push(R.boss); A.music('boss'); }
        for (const f of R.foes) {
          f.t += dt; if (f.hp <= 0) continue;
          if (f.kind === 'bandit') { const want = Math.atan2(j.y - f.y, j.x - f.x); if (f.t > 1) f.yaw += clamp(E.angDiff(f.yaw, want), -.5 * dt, .5 * dt); f.x += Math.cos(f.yaw) * f.speed * dt; f.y += Math.sin(f.yaw) * f.speed * dt; f.z += (j.z - f.z) * dt * .4;
            f.fire -= dt; if (f.fire < 0 && Math.hypot(j.x - f.x, j.y - f.y) < 1800) { f.fire = 3 + (f.t % 1); R.hot.push({ x: f.x, y: f.y, z: f.z, vx: Math.cos(f.yaw) * 700, vy: Math.sin(f.yaw) * 700, vz: 0, t: 0, home: true }); } }
          if (f.kind === 'bomber') { const w = Math.sin(f.t * .6) * 260, ax = j.x + fw[0] * 900 + rt[0] * w, ay = j.y + fw[1] * 900 + rt[1] * w, e = Math.min(1, dt * .8);   // (it holds a place ahead of the jet, weaving)
            f.x += (ax - f.x) * e; f.y += (ay - f.y) * e; f.z += (j.z + 60 + Math.sin(f.t * .9) * 70 - f.z) * e; f.yaw += E.angDiff(f.yaw, j.yaw) * e;
            if (Math.floor(f.t / 1.8) !== Math.floor((f.t - dt) / 1.8)) for (const s of [-1, 1]) R.hot.push({ x: f.x + rt[0] * s * 40, y: f.y + rt[1] * s * 40, z: f.z, vx: -fw[0] * 300, vy: -fw[1] * 300, vz: 0, t: 0, home: true }); }
        }
        R.foes = R.foes.filter(f => f === R.boss || (f.hp > 0 && f.t < 14)); R.locks = R.locks.filter(f => R.foes.includes(f));   // (a bandit flown off lets go of its lock)
        if (R.boss && R.boss.hp <= 0 && !R.boss.dead) { R.boss.dead = true; for (let i = 0; i < 6; i++) boom(R.boss.x + (i - 3) * 20, R.boss.y, R.boss.z, 2); clear(); }
      },
      hit(s) {
        for (const f of R.foes) if (f.hp > 0 && Math.hypot(s.x - f.x, s.y - f.y, s.z - f.z - 4) < f.r) { f.hp -= s.homing ? 3 : 1; if (f.hp <= 0) { if (f !== R.boss) boom(f.x, f.y, f.z, 1.4); score(f === R.boss ? 20000 : 1000); } else A.sfx('hit', { vol: .3 }); return true; }
        return false;
      },
      me() { const j = R.j; return j.spin > 0 ? null : { x: j.x, y: j.y, z: j.z }; },
      gather(V) {
        const j = R.j, o = { yaw: j.yaw, pitch: j.pitch, roll: j.roll + (j.spin > 0 ? (1 - j.spin / .9) * TAU : 0) };
        for (const f of R.foes) if (f.hp > 0) V.mesh(JET, f.x, f.y, f.z, f === R.boss ? { yaw: f.yaw, scale: 4, colors: { body: '#4a4a5a', tail: '#c83a30' } } : { yaw: f.yaw, roll: Math.sin(f.t * 2) * .4, colors: { body: '#6a7a4a', tail: '#4a5a3a' } });
        if (R.hurt <= 0 || Math.floor(t * 12) % 2) V.mesh(JET, j.x, j.y, j.z, Object.assign({ scale: 1.5, colors: { body: '#d8dce4', tail: '#3a5ab8' } }, o));
        for (const s of R.shots) if (s.homing) V.mesh(MISSILE, s.x, s.y, s.z, { yaw: Math.atan2(s.vy, s.vx) });
        for (const h of R.hot) V.mesh(MISSILE, h.x, h.y, h.z, { yaw: Math.atan2(h.vy, h.vx), colors: {} });
      }
    },
    /** the dunes: the speeder turned freely, faster or slower, low over the sand; four crawlers far apart (the radar
     *  finds them), slow, firing when you're near; skimmers that hunt you; the stage clear when the last crawler falls */
    speeder: {
      start() {
        const Q = E.rng(9); R.v = { x: 4096, y: 4096, z: 26, yaw: -Math.PI / 2, turn: 0, speed: 420 }; R.next = 5;
        for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + .5 + Q() * .5, d = 1300 + i * 350; R.foes.push({ kind: 'crawler', x: 4096 + Math.cos(a) * d, y: 4096 + Math.sin(a) * d, z: 40, yaw: Q() * TAU, hp: 10, r: 70, t: 0, fire: 2 + i }); }
      },
      cam() { const v = R.v, back = game.H > game.W ? 150 : 110; return { x: v.x - Math.cos(v.yaw) * back, y: v.y - Math.sin(v.yaw) * back, h: 46, angle: v.yaw, pitch: 7, fov: game.H > game.W ? 84 : 70, roll: v.turn * 8 }; },
      update(dt, k) {
        const v = R.v; v.turn += (clamp(k.x, -1, 1) - v.turn) * Math.min(1, dt * 6); v.yaw += v.turn * 1.6 * dt;
        v.speed = clamp(v.speed - clamp(k.y, -1, 1) * 420 * dt, 260, 780); v.x += Math.cos(v.yaw) * v.speed * dt; v.y += Math.sin(v.yaw) * v.speed * dt; v.z = 26 + Math.sin(R.t * 3) * 2;
        if (k.fire && R.cool <= 0) { R.cool = .1; R.fired++; R.shots.push({ x: v.x + Math.cos(v.yaw) * 20, y: v.y + Math.sin(v.yaw) * 20, z: v.z + 4, vx: Math.cos(v.yaw) * 2400, vy: Math.sin(v.yaw) * 2400, vz: 0, t: 0 }); A.sfx('shoot', { vol: .3 }); }
        const fw = [Math.cos(v.yaw), Math.sin(v.yaw)];
        if (R.t > R.next && R.foes.filter(f => f.kind === 'skimmer').length < 3) { R.next = R.t + 7; for (const sd of [-1, 1]) R.foes.push({ kind: 'skimmer', x: v.x + fw[0] * 2200 - fw[1] * sd * 300, y: v.y + fw[1] * 2200 + fw[0] * sd * 300, z: 30, yaw: v.yaw + Math.PI, speed: 640, hp: 2, r: 26, t: 0, fire: 1.5 }); }
        for (const f of R.foes) {
          f.t += dt; const d = Math.hypot(v.x - f.x, v.y - f.y), want = Math.atan2(v.y - f.y, v.x - f.x);
          if (f.kind === 'crawler') {   // it grinds on, turning slowly; near, it fires; run into it and it hurts
            f.yaw += Math.sin(f.t * .3 + f.r) * .1 * dt; f.x += Math.cos(f.yaw) * 60 * dt; f.y += Math.sin(f.yaw) * 60 * dt;
            f.fire -= dt; if (f.fire < 0 && d < 1500) { f.fire = 2.6; fireAt(f, 520); }
            if (d < 66) { hurt(); v.speed = 260; v.x = f.x - Math.cos(want) * 68; v.y = f.y - Math.sin(want) * 68; }
          } else {   // a skimmer: turns after you, fires a homing bolt now and then
            if (f.t > .8) f.yaw += clamp(E.angDiff(f.yaw, want), -1.1 * dt, 1.1 * dt); f.x += Math.cos(f.yaw) * f.speed * dt; f.y += Math.sin(f.yaw) * f.speed * dt;
            f.fire -= dt; if (f.fire < 0 && d < 1400) { f.fire = 3; R.hot.push({ x: f.x, y: f.y, z: f.z, vx: Math.cos(f.yaw) * 620, vy: Math.sin(f.yaw) * 620, vz: 0, t: 0, home: true }); }
          }
        }
        R.foes = R.foes.filter(f => f.hp > 0 && (f.kind === 'crawler' || f.t < 16));
        if (R.phase === 'play' && !R.foes.some(f => f.kind === 'crawler')) clear();
      },
      hit(s) {
        for (const f of R.foes) if (f.hp > 0 && Math.hypot(s.x - f.x, s.y - f.y, s.z - f.z) < f.r) { if (--f.hp <= 0) { const big = f.kind === 'crawler'; for (let i = 0; i < (big ? 3 : 1); i++) boom(f.x + (i - 1) * 30, f.y, f.z, big ? 2 : 1.2); score(big ? 5000 : 800); } else A.sfx('hit', { vol: .3 }); return true; }
        return false;
      },
      me() { const v = R.v; return { x: v.x, y: v.y, z: v.z }; },
      gather(V) {
        const v = R.v; V.add(v.x, v.y, 0, (g, sx, sy, k) => { const a = g.globalAlpha; g.globalAlpha = .35; px.ell(g, sx, sy, 20 * k, 7 * k, '#3a2010'); g.globalAlpha = a; });
        for (const f of R.foes) V.mesh(f.kind === 'crawler' ? CRAWLER : SPEEDER, f.x, f.y, f.kind === 'crawler' ? 0 : f.z, f.kind === 'crawler' ? { yaw: f.yaw, scale: 3, colors: { hull: '#9a8a74' } } : { yaw: f.yaw, scale: 1.4, colors: { body: '#7a2a2a' } });
        if (R.hurt <= 0 || Math.floor(t * 12) % 2) V.mesh(SPEEDER, v.x, v.y, v.z, { yaw: v.yaw, roll: v.turn * .5, scale: 1.4, colors: { body: '#e8e4d8' } });
      }
    },
    /** the valley: the camera rides the rails, the cursor aims, a shot is what m7.pick finds under it; the walker at the end */
    safari: {
      start() {
        R.s = 0; R.cur = [game.W / 2, game.H / 2]; R.rocks = []; R.ptr = null;
        for (let s = 300, n = 0; s < RAIL.length - 500; s += 260, n++) { const p = RAIL.at(s), side = n % 2 ? 1 : -1, nx = -Math.sin(p.angle), ny = Math.cos(p.angle), off = side * (110 + (s * 7) % 80);
          const rock = { x: p.x + nx * off, y: p.y + ny * off }; R.rocks.push(rock); R.foes.push({ kind: n % 3 === 2 ? 'bat' : 'slime', at: s - 420, x: rock.x + Math.cos(p.angle) * 50, y: rock.y + Math.sin(p.angle) * 50, z: 0, hp: 1, out: 0, rig: null, rock }); }
      },
      cam() { const p = RAIL.at(R.s), look = R.boss ? Math.atan2(R.boss.y - p.y, R.boss.x - p.x) : p.angle; return { x: p.x, y: p.y, h: 26, angle: look + (R.cur[0] / game.W - .5) * .25, pitch: 3 + (R.cur[1] / game.H - .5) * 8, fov: game.H > game.W ? 80 : 70 }; },
      update(dt, k) {
        const I = game.input, ptr = I.pointer && I.pointer();
        if (ptr && (!R.ptr || ptr[0] !== R.ptr[0] || ptr[1] !== R.ptr[1])) R.cur = ptr.slice(); R.ptr = ptr;
        R.cur = [clamp(R.cur[0] + k.x * 230 * dt, 6, game.W - 6), clamp(R.cur[1] + k.y * 230 * dt, 6, game.H - 6)];
        const shoot = k.tap || (k.fire && R.cool <= 0 && !(I.lastDevice === 'touch' && !auto)); if (k.tap) R.cur = k.tap.slice();
        if (shoot) { R.cool = .22; R.fired++; A.sfx('shoot', { vol: .4 }); R.flash = .06; VP.vale.begin({ W: game.W, H: game.H }, this.cam()); const h = VP.vale.pick(R.cur[0], R.cur[1], targets()), f = h && h.target;
          if (f && f.hp > 0) { f.hp--; if (f.hp <= 0) { boom(f.x, f.y, f.z + 12, f.weak ? 1.6 : 1); score(f.weak ? 3000 : f.kind === 'shell' ? 200 : 500); } else A.sfx('hit', { vol: .4 }); } }
        if (R.flash > 0) R.flash -= dt;
        if (!R.boss) { R.s = Math.min(RAIL.length - 40, R.s + 150 * dt); if (R.s >= RAIL.length - 40) { const p = RAIL.at(RAIL.length), ap = p.angle; R.boss = { x: p.x + Math.cos(ap) * 230, y: p.y + Math.sin(ap) * 230, t: 0 };
          R.boss.parts = [-1, 1].map(sd => ({ kind: 'arm', weak: true, hp: 6, side: sd, x: 0, y: 0, z: 0 })).concat([{ kind: 'core', weak: true, hp: 10, x: 0, y: 0, z: 0 }]); R.foes.push(...R.boss.parts); A.music('boss'); } }
        const c = RAIL.at(R.s);
        for (const f of R.foes) {
          if (f.hp <= 0) continue;
          if (f.kind === 'slime' || f.kind === 'bat') {
            if (R.s < f.at) continue; f.out += dt; if (!f.rig) f.rig = f.kind === 'bat' ? new E.Blob({ R: 14, wings: true, ears: 'cat', mouth: 'fangs', colors: { base: '#6a4a9a' } }) : new E.Blob({ R: 16, colors: { base: ['#5ac85a', '#e8a030', '#3a9ae8'][Math.floor(f.at) % 3] } });
            const dx = c.x - f.x, dy = c.y - f.y, d = Math.hypot(dx, dy), sp = f.kind === 'bat' ? 170 : 90;
            if (f.out > (f.kind === 'bat' ? .3 : 1.1)) { f.x += dx / d * sp * dt; f.y += dy / d * sp * dt; }
            f.z = f.kind === 'bat' ? 40 + Math.sin(f.out * 3) * 14 : Math.abs(Math.sin(f.out * 5)) * 22; f.rig.update(dt, { squash: f.kind === 'bat' ? 0 : Math.sin(f.out * 10) * .25, look: [dx / d, dy / d] });
            if (d < 50) { f.hp = 0; hurt(); }
          }
          if (f.kind === 'shell') { f.t += dt; const u = f.t / 1.6; f.x = f.x0 + (c.x - f.x0) * u; f.y = f.y0 + (c.y - f.y0) * u; f.z = 70 + Math.sin(u * Math.PI) * 50 - u * 50; if (u >= 1) { f.hp = 0; hurt(); } }
        }
        const B = R.boss;
        if (B) {   // the walker: two arm cannons, then its core; it stamps in place and fires shells you can shoot down
          B.t += dt; const a = Math.atan2(c.y - B.y, c.x - B.x), arms = B.parts.filter(p => p.kind === 'arm' && p.hp > 0); B.yaw = a;
          for (const p of B.parts) { const at = WALKER.at(p.kind === 'core' ? 22 : 8, p.kind === 'core' ? 0 : p.side * 40, p.kind === 'core' ? 74 : 68, { x: B.x, y: B.y, yaw: a }); p.x = at[0]; p.y = at[1]; p.z = at[2]; }
          B.parts[2].shield = arms.length > 0;
          if (B.parts[2].shield) B.parts[2].hp = Math.max(B.parts[2].hp, 10);
          if (arms.length && Math.floor(B.t / 1.7) !== Math.floor((B.t - dt) / 1.7)) { const p = arms[Math.floor(B.t) % arms.length]; R.foes.push({ kind: 'shell', hp: 1, t: 0, x0: p.x, y0: p.y, x: p.x, y: p.y, z: p.z }); }
          if (B.parts[2].hp <= 0 && !B.dead) { B.dead = true; for (let i = 0; i < 5; i++) boom(B.x, B.y, 40 + i * 12, 2); clear(); }
        }
      },
      hit() { return false; },
      me() { return null; },
      gather(V) {
        for (const r of R.rocks) V.mesh(ROCK, r.x, r.y, 0, { scale: 1.7 });
        for (const f of R.foes) {
          if (f.hp <= 0 || ((f.kind === 'slime' || f.kind === 'bat') && (R.s < f.at || !f.rig))) continue;
          if (f.kind === 'slime' || f.kind === 'bat') V.add(f.x, f.y, f.z, (g, sx, sy, k) => f.rig.draw(g, Math.round(sx), Math.round(sy), V.view(k)), { target: f, w: 50, h: f.kind === 'bat' ? 40 : 46 });
          if (f.kind === 'shell') V.add(f.x, f.y, f.z, (g, sx, sy, k) => { px.disc(g, sx, sy - 5 * k, 6 * k, '#3a3a3a'); px.disc(g, sx - k, sy - 6 * k, 2.5 * k, '#9a9a9a'); }, { target: f, w: 18, h: 16 });
        }
        const B = R.boss;
        if (B && !B.dead) {
          V.mesh(WALKER, B.x, B.y, Math.abs(Math.sin(B.t * 2)) * 4, { yaw: B.yaw, colors: { hull: '#8a909e' }, target: null });
          for (const p of B.parts) if (p.hp > 0) V.mesh(p.kind === 'core' ? CORE : ARM, p.x, p.y, p.z, { yaw: B.yaw, colors: { hull: '#9aa0ae', core: p.shield ? '#4a5a8a' : (t * 6 % 2 < 1 ? '#ff5040' : '#ffd040') }, target: p.shield ? null : p });
        }
      }
    }
  };
  // what a safari shot can meet: each foe out of hiding (its box), the rocks and the walker's body (in the way)
  function targets() {
    const out = R.rocks.map(r => ({ x: r.x, y: r.y, z: 0, w: 80, h: 48 }));
    for (const f of R.foes) if (f.hp > 0 && (f.kind === 'shell' || f.weak || (f.rig && R.s >= f.at))) out.push(f.kind === 'shell' ? { x: f.x, y: f.y, z: f.z, w: 18, h: 16, target: f } : f.weak ? { x: f.x, y: f.y, z: f.z - (f.kind === 'core' ? 10 : 8), w: f.kind === 'core' ? 20 : 26, h: f.kind === 'core' ? 20 : 16, target: f.shield ? null : f } : { x: f.x, y: f.y, z: f.z, w: 50, h: f.kind === 'bat' ? 40 : 46, target: f });
    if (R.boss && !R.boss.dead) out.push({ x: R.boss.x, y: R.boss.y, z: 0, w: 60, h: 56 });
    return out;
  }
  function fireAt(f, sp) { const m = STAGE[R.name].me() || { x: 0, y: R.F, z: 60 }, dx = m.x - f.x, dy = m.y - f.y, dz = m.z - f.z, d = Math.hypot(dx, dy, dz) || 1; R.hot.push({ x: f.x, y: f.y, z: f.z, vx: dx / d * sp, vy: dy / d * sp, vz: dz / d * sp, t: 0 }); }

  /* ---- each step ---- */
  function update(dt) {
    const I = game.input, st = R && STAGE[R.name];
    I.touchSet('missile', null, mode === 'play' && R.name === 'burner'); I.touchSet('roll', null, mode === 'play' && R.name === 'burner'); I.touchSet('fire', null, false);
    t += dt;
    if (mode === 'menu') { menu.update(dt); return; }
    if (mode === 'results') { after.update(dt); return; }
    R.t += dt; R.cool -= dt; if (R.hurt > 0) R.hurt -= dt;
    if (R.phase === 'intro') { R.phaseT -= dt; if (R.phaseT <= 0) R.phase = 'play'; }
    const k = auto ? pilot() : pad();
    if (R.phase === 'over') { R.phaseT -= dt; if (R.phaseT <= 0) end(); return; }
    st.update(dt, R.phase === 'clear' ? { x: 0, y: 0 } : k);
    for (const s of R.shots) {   // the player's shots (a homing missile turns after its target)
      s.t += dt;
      if (s.homing) { const f = s.homing, dx = f.x - s.x, dy = f.y - s.y, dz = f.z - s.z, d = Math.hypot(dx, dy, dz) || 1; s.vx += (dx / d * s.sp - s.vx) * Math.min(1, dt * 4); s.vy += (dy / d * s.sp - s.vy) * Math.min(1, dt * 4); s.vz += (dz / d * s.sp - s.vz) * Math.min(1, dt * 4); }
      s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt; if (st.hit(s)) s.t = 9;
    }
    R.shots = R.shots.filter(s => s.t < (s.homing ? 3 : .9));
    const me = st.me();
    for (const h of R.hot) {   // what flies at the player: fireballs and (homing a little) missiles
      h.t += dt;
      if (h.home && me) { const dx = me.x - h.x, dy = me.y - h.y, dz = me.z - h.z, d = Math.hypot(dx, dy, dz) || 1, sp = Math.hypot(h.vx, h.vy, h.vz); h.vx += (dx / d * sp - h.vx) * dt * .8; h.vy += (dy / d * sp - h.vy) * dt * .8; h.vz += (dz / d * sp - h.vz) * dt * .8; }
      h.x += h.vx * dt; h.y += h.vy * dt; h.z += h.vz * dt;
      if (me && Math.hypot(h.x - me.x, h.y - me.y, h.z - me.z) < (h.home ? 24 : 26)) { h.t = 9; hurt(); }
    }
    R.hot = R.hot.filter(h => h.t < 4);
    for (const f of R.fx) f.t += dt; R.fx = R.fx.filter(f => f.t < .9);
    if (R.name === 'harrier') R.foes = R.foes.filter(f => f.y < R.F + 400 && (f.hp === undefined || f.hp > 0 || f.still));
    if (R.phase === 'clear') { R.phaseT -= dt; if (R.phaseT <= 0) { if (!R.one && R.stage < STAGES.length - 1) next(R.stage + 1); else end(); } }
  }
  function end() { mode = 'results'; after.i = 0; R.best = best('blaster', R.score); R.won = R.phase === 'clear'; }
  /** the autopilot (the bot, and a demo): the hero lines up with what is ahead and keeps clear of the columns; the jet
   *  turns toward the bandits, locks them and fires; the cursor goes to the nearest foe on the screen */
  function pilot() {
    const k = { x: 0, y: 0, fire: true, missile: false, roll: false };
    if (R.name === 'harrier') {
      const B = R.boss, f = B && B.parts && B.hp > 0 ? B.parts[0] : R.foes.filter(f => f.hp > 0 && f.y < R.F - 100 && f.kind !== 'col').sort((a, b) => b.y - a.y)[0];
      let tx = f ? f.x : 0, tz = f ? f.z : 60;
      for (const c of R.foes) if (c.kind === 'col' && c.y < R.F + 20 && R.F - c.y < 500 && Math.abs(c.x - tx) < 50) tz = Math.max(tz, 150);
      for (const h of R.hot) if (h.y < R.F && R.F - h.y < 400 && Math.abs(h.x - R.hx) < 40) tx += h.x > R.hx ? -80 : 80;
      k.x = clamp((tx - R.hx) / 40, -1, 1); k.y = clamp(-(tz - R.hz) / 40, -1, 1);
    } else if (R.name === 'zone') {   // line up the nearest pod ahead; a mine ahead on your line: step round it
      const f = R.foes.filter(f => f.hp > 0 && f.s > R.s + 60 && f.kind === 'pod').sort((a, b) => a.s - b.s)[0], m = R.foes.find(f => f.kind === 'mine' && f.hp > 0 && f.s > R.s && f.s < R.s + 420 && Math.abs(f.u - R.u) < 50);
      const tu = m ? m.u + (m.u > R.u ? -110 : 110) : f ? f.u : 0, tz = m ? 30 : f ? f.z : 60; k.x = clamp((tu - R.u) / 30, -1, 1); k.y = clamp(-(tz - R.zh) / 30, -1, 1);
    } else if (R.name === 'speeder') {   // the nearest crawler: turn to it, close in, veer off its side; fire at whatever is lined up
      const v = R.v, dist = f => Math.hypot(f.x - v.x, f.y - v.y), off = f => Math.abs(E.angDiff(v.yaw, Math.atan2(f.y - v.y, f.x - v.x))), f = R.foes.filter(f => f.kind === 'crawler').sort((a, b) => dist(a) - dist(b))[0];
      if (f) { const a = E.angDiff(v.yaw, Math.atan2(f.y - v.y, f.x - v.x)), d = dist(f); k.x = d < 240 ? 1 : clamp(a * 3, -1, 1); k.y = d > 900 ? -1 : d < 500 ? 1 : 0; }
      k.fire = R.foes.some(f => off(f) < .2 && dist(f) < 2000);
    } else if (R.name === 'burner') {
      const j = R.j, f = R.foes.filter(f => f.hp > 0).sort((a, b) => Math.hypot(a.x - j.x, a.y - j.y) - Math.hypot(b.x - j.x, b.y - j.y))[0];
      if (f) { k.x = clamp(E.angDiff(j.yaw, Math.atan2(f.y - j.y, f.x - j.x)) * 2.5, -1, 1); k.y = clamp(-(f.z - j.z) / 120, -1, 1); }
      k.missile = R.locks.length > 0 && Math.floor(R.t * 3) % 2 === 0; k.roll = R.hot.some(h => Math.hypot(h.x - j.x, h.y - j.y) < 260);
    } else {
      const V = VP.vale.begin({ W: game.W, H: game.H }, STAGE.safari.cam()), all = targets().filter(q => q.target).map(q => [q.target, V.project(q.x, q.y, q.z + q.h / 2)]).filter(([, p]) => p && p[0] > 0 && p[0] < game.W && p[1] > 0 && p[1] < game.H).sort((a, b) => (a[0].kind === 'shell' ? -1 : 0) - (b[0].kind === 'shell' ? -1 : 0) || b[1][2] - a[1][2]);
      const on = all.find(a => a[0] === R.aimAt && a[0].kind !== 'shell' && !all.some(b => b[0].kind === 'shell')) || all[0]; R.aimAt = on && on[0];   // (it keeps to one target; a shell first)
      if (on) { const dx = on[1][0] - R.cur[0], dy = on[1][1] - R.cur[1]; k.x = clamp(dx / 12, -1, 1); k.y = clamp(dy / 12, -1, 1); k.fire = Math.hypot(dx, dy) < 6; } else k.fire = false;
    }
    return k;
  }

  /* ---- the look ---- */
  function draw(r) {
    const W = r.W, H = r.H;
    if (mode === 'menu') {
      const V = floors().plain; V.draw(r, { x: Math.sin(t * .3) * 100, y: -t * 300, h: 90, angle: -Math.PI / 2, pitch: 7, fov: 66, roll: Math.sin(t * .5) * 8 });
      r.overlay(g => { E.font.title(g, E.t('blaster.title'), W / 2, 22, { scale: 4, align: 'center', colors: ['#fff8d0', '#ffd060', '#ff7a3a', '#c83a6a'], depth: 3 }); E.font.text(g, E.t('blaster.tagline'), W / 2, 68, '#fff0e0', { align: 'center', shadow: '#2a1040', outline: false }); });
      menu.y = Math.round(H / 2) - 8; menu.draw(r); return;
    }
    const st = STAGE[R.name], V = VP[{ harrier: 'plain', burner: 'sea', zone: 'zone', safari: 'vale', speeder: 'dunes' }[R.name]], cam = st.cam();
    st.gather(V);
    for (const s of R.shots) if (!s.homing) V.add(s.x, s.y, s.z, (g, sx, sy, k) => { const q = Math.max(1, 4 * k); px.disc(g, sx, sy, q * 1.6, '#ffe070'); px.disc(g, sx, sy, q, '#ffffff'); });
    for (const h of R.hot) if (!h.home) V.add(h.x, h.y, h.z, (g, sx, sy, k) => { const q = Math.max(1.5, 7 * k), w = Math.sin(t * 30) > 0; px.disc(g, sx, sy, q * 1.4, w ? '#ff5020' : '#ff9030'); px.disc(g, sx, sy, q * .7, '#fff0a0'); });
    for (const f of R.fx) V.add(f.x, f.y, f.z, (g, sx, sy, k) => { const u = f.t / .9, q = (10 + u * 26) * f.s * k; if (u < .5) { px.disc(g, sx, sy - q * .5, q, u < .2 ? '#ffffff' : '#ffd040'); px.disc(g, sx, sy - q * .5, q * .7, '#ff7a20'); } else px.disc(g, sx, sy - q * .5, q * (1.2 - u * .4), u < .7 ? '#6a5a5a' : '#4a4a4a'); });
    V.draw(r, cam);
    r.overlay(g => {
      const txt = (s, x, y, c = '#ffffff', o = {}) => E.font.text(g, s, x, y, c, Object.assign({ shadow: '#100818', outline: false }, o)), lh = E.font.lineHeight(), right = cornerX() - 4;
      txt(E.t('blaster.score', { n: R.score }), 6, 6, '#ffe890');
      for (let i = 0; i < R.lives; i++) HERO_ICON(g, 8 + i * 12, 8 + lh);
      if (R.name === 'burner') {
        const j = R.j, cx = W / 2, cy = Math.round(H * .38);
        px.rect(g, cx - 14, cy - 1, 9, 2, '#80ff90'); px.rect(g, cx + 6, cy - 1, 9, 2, '#80ff90'); px.rect(g, cx - 1, cy - 14, 2, 9, '#80ff90'); px.rect(g, cx - 1, cy + 6, 2, 9, '#80ff90');
        for (const f of R.locks) { const p = VP.sea.project(f.x, f.y, f.z + 6); if (p) { const s = 10; for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { px.rect(g, p[0] + a * s - (a > 0 ? 4 : 0), p[1] + b * s, 5, 1, '#ff4040'); px.rect(g, p[0] + a * s, p[1] + b * s - (b > 0 ? 4 : 0), 1, 5, '#ff4040'); } } }
        txt(E.t('blaster.missiles', { n: j.missiles }), 6, 10 + lh * 2, '#ffffff');
        if (R.locks.length && j.missiles > 0) txt(E.t('blaster.lock', { n: R.locks.length, key: game.input.label('missile') }), cx, cy + 20, '#ff6060', { align: 'center' });
      }
      if (R.name === 'speeder') {   // the radar (ahead is up; a crawler yellow, a skimmer red) and the crawlers left
        const v = R.v, cx = 26, cy = H - 26, fx = Math.cos(v.yaw), fy = Math.sin(v.yaw); px.disc(g, cx, cy, 21, '#2a1a10'); px.disc(g, cx, cy, 19, '#4a3420'); px.rect(g, cx, cy, 1, 1, '#ffffff');
        for (const f of R.foes) { const dx = f.x - v.x, dy = f.y - v.y, a = (dx * fx + dy * fy) / 130, b = (dy * fx - dx * fy) / 130, m = Math.min(1, 17 / (Math.hypot(a, b) || 1)), big = f.kind === 'crawler'; px.rect(g, Math.round(cx + b * m) - (big ? 1 : 0), Math.round(cy - a * m) - (big ? 1 : 0), big ? 3 : 2, big ? 3 : 2, big ? '#ffe040' : '#ff4040'); }
        txt(E.t('blaster.crawlers', { n: R.foes.filter(f => f.kind === 'crawler').length }), 6, 10 + lh * 2, '#ffe890');
      }
      if (R.name === 'safari') {   // the cursor: a ring and a cross
        const [cx, cy] = R.cur, c = R.flash > 0 ? '#ffffff' : '#ff3a3a';
        px.rect(g, cx - 9, cy, 6, 1, c); px.rect(g, cx + 4, cy, 6, 1, c); px.rect(g, cx, cy - 9, 1, 6, c); px.rect(g, cx, cy + 4, 1, 6, c);
        for (let a = 0; a < 16; a++) px.rect(g, Math.round(cx + Math.cos(a / 16 * TAU) * 6), Math.round(cy + Math.sin(a / 16 * TAU) * 6), 1, 1, c);
      }
      const B = R.boss, hp = B && (R.name === 'safari' ? (B.parts ? B.parts.reduce((a, p) => a + Math.max(0, p.hp), 0) / 22 : 0) : Math.max(0, B.hp) / B.max);
      if (B && hp > 0) { const w = Math.min(160, W - 80), x = Math.round((W - w) / 2), y = H - 14; px.rect(g, x - 1, y - 1, w + 2, 6, '#100818'); px.rect(g, x, y, Math.round(w * hp), 4, '#ff4a4a'); txt(E.t('blaster.boss'), W / 2, y - lh - 2, '#ffd0d0', { align: 'center' }); }
      if (R.phase === 'intro') txt(E.t('blaster.stage.' + R.name), W / 2, Math.round(H * .3), '#ffffff', { align: 'center', scale: 2 });
      if (R.phase === 'clear' && mode === 'play') txt(E.t('blaster.clear'), W / 2, Math.round(H * .3), '#ffe890', { align: 'center', scale: 2 });
      if (R.phase === 'over' || mode === 'results') txt(E.t(R.won ? 'blaster.won' : 'blaster.over'), W / 2, Math.round(H * .26), R.won ? '#ffe890' : '#ff8080', { align: 'center', scale: 2 });
      if (mode === 'results') { txt(E.t('blaster.final', { n: R.score }), W / 2, Math.round(H * .26) + lh * 2 + 4, '#ffffff', { align: 'center' }); txt(E.t('blaster.best', { n: R.best }), W / 2, Math.round(H * .26) + lh * 3 + 6, '#c8b8f0', { align: 'center' }); }
    });
    if (mode === 'results') { after.y = Math.round(H / 2) + 30; after.draw(r); }
  }
  const HERO_ICON = (g, x, y) => { px.rect(g, x + 2, y, 4, 4, '#ffd040'); px.rect(g, x + 1, y + 4, 6, 5, '#e83a30'); px.rect(g, x + 1, y + 9, 2, 3, '#2a3a8a'); px.rect(g, x + 5, y + 9, 2, 3, '#2a3a8a'); };

  /** the bot (tools/kits-test.mjs): each stage played alone by the autopilot to its boss's fall (the hits it takes
   *  counted; the bot plays on through them) */
  function bot(s = 1) {
    const was = Math.random; Math.random = E.rng(s);
    try {
      game.go('blaster', null, { fade: 0 }); game.advance(1 / 120); const out = {};
      for (let i = 0; i < STAGES.length; i++) { auto = true; begin(i, true); let n = 0; for (; n < 150 && mode === 'play'; n++) game.advance(1); out[STAGES[i]] = { cleared: !!R.won, score: R.score, hits: R.hits, seconds: n }; toMenu(); }
      return Object.assign(out, { errors: game.errors.length });
    } finally { Math.random = was; auto = false; }
  }

  return { view: 'topdown', views: ['topdown'], input: KEYS, res: 'ps1', pausable: true, touch: ['missile', 'roll'], camera: { zoom: false },
    enter(d) { mode = 'menu'; R = null; menu.i = 0; auto = false; game.follow(null); game.cam.bounds = null; L.enabled = false; if (gpu) gpu.enabled = false; A.music('title'); if (d && d.part) begin(Math.max(0, STAGES.indexOf(d.part)), true); },
    back() { if (mode === 'menu') { game.go('title'); return true; } if (mode === 'results') { toMenu(); return true; } return false; },
    update, draw, bot,
    /** a stage played by the autopilot (a demo; the bot's) */
    demo(stage) { begin(Math.max(0, STAGES.indexOf(stage)), true); auto = true; },
    state: () => R && { mode, stage: R.name, phase: R.phase, t: +R.t.toFixed(2), score: R.score, lives: R.lives, hits: R.hits, foes: R.foes.length, shots: R.shots.length, fired: R.fired,
      hero: R.name === 'harrier' ? [Math.round(R.hx), Math.round(R.hz)] : R.name === 'burner' ? [Math.round(R.j.x), Math.round(R.j.y), Math.round(R.j.z), +R.j.roll.toFixed(3)] : R.name === 'zone' ? [Math.round(R.s), Math.round(R.u), Math.round(R.zh)] : R.name === 'speeder' ? [Math.round(R.v.x), Math.round(R.v.y), +R.v.yaw.toFixed(3)] : [Math.round(R.s), Math.round(R.cur[0]), Math.round(R.cur[1])], boss: R.boss ? (R.boss.hp !== undefined ? R.boss.hp : R.boss.parts.map(p => p.hp)) : null },
    /** the proof: the harrier stage, flying up and right, firing, then down and left */
    run: (n = 600) => proof('blaster', n, (i, k) => {
      if (i === 2) begin(0, true);
      if (i === 60) { k.hold('fire'); k.hold('right'); k.hold('up'); }
      if (i === 300) { k.up('right'); k.up('up'); k.hold('left'); k.hold('down'); }
      if (i === 500) { k.up('left'); k.up('down'); k.up('fire'); }
    }, () => R && [R.hx, R.hz, R.F, R.score, R.foes.length, R.shots.length, R.hits]) };
})();
scenes.blaster = BLASTER;
