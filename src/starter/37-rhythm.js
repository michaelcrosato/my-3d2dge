/* =====================================================================================
 * SLICE 21  RHYTHM  (PaRappa the Rapper, Beatmania, Dance Dance Revolution, Space Channel 5). @modules songs rhythm
 * STEP UP!: two songs on four lanes, a dancer who dances to the beat and to every note you hit, a crowd that bobs and
 * cheers. STEP UP (DDR's arrows: notes, jumps, holds) and RAP SCHOOL (PaRappa's: Master Beat raps a line on the top
 * row, you answer it, bar for bar). Judgments in ms of the music clock (PERFECT 45, GREAT 90, GOOD 135), the combo,
 * the score, a life gauge (empty: FAILED), a grade; CALIBRATE sets the audio offset by tapping on the clicks (Settings,
 * Sound has it too). Keys: D F J K or the arrows (left, down, up, right) or a pad's d-pad and face buttons are the four
 * lanes; Enter picks; Escape pauses. TOUCH: the four columns of the screen's lower part are the lanes, a thumb each.
 * HOW IT WORKS: the songbook's songs (the songs module) play on the music clock (game.audio: game time); E.Rhythm (the
 * rhythm module) holds the charts (parts in an order), judges each press by its distance from its note on that clock,
 * sounds the teacher's calls on their steps and draws the highways; game.audio.onBeat moves the dancer, the lights and
 * the crowd. bot() plays both songs, perfectly and then late, twice (tools/kits-test.mjs). Deep links: #rhythm,
 * #rhythm/stepup, #rhythm/rapschool, #rhythm/calibrate.
 * ===================================================================================== */
const RHYTHM = (() => {
  const px = E.px, SB = E.Songbook, LANES = ['l0', 'l1', 'l2', 'l3'], NAMES = ['LEFT', 'DOWN', 'UP', 'RIGHT'];
  const COLS = ['#ff4a8a', '#4ac8ff', '#6aff6a', '#ffd040'], MOVES = ['jab', 'kick', 'uppercut', 'cross'];
  const KEYS = Object.assign({}, E.Input.DEFAULT, { l0: ['KeyD', 'ArrowLeft', 'Pad14', 'Pad2'], l1: ['KeyF', 'ArrowDown', 'Pad13', 'Pad0'], l2: ['KeyJ', 'ArrowUp', 'Pad12', 'Pad3'], l3: ['KeyK', 'ArrowRight', 'Pad15', 'Pad1'] });
  const b16 = '................', I = [b16, b16, b16, b16];
  // STEP UP: a bar a part, its four lanes (left, down, up, right): notes (x), jumps (two at once), holds (h===)
  const STEPUP = { parts: { I,
    A: ['x...............', '....x...........', '........x.......', '............x...'], A2: ['............x...', '........x.......', '....x...........', 'x...............'],
    B: ['x.......x.......', '..x.......x.....', '....x.......x...', '......x.......x.'], B2: ['......x.......x.', '....x.......x...', '..x.......x.....', 'x.......x.......'],
    C: ['h=====..........', '........x...x...', '........x.......', '..........x...x.'], D: ['x..x............', '......x..x......', '............x...', '..............x.'],
    E: ['x.......h=======', '..x.......x.....', '....x.......x...', '......x.........'], F: ['x...............', b16, b16, 'x...............'] },
    order: 'I I A A2 A A2 B B2 B B2 C D C D B B2 E E A A2 B C D E B2 B D C E E F I' };
  // RAP SCHOOL: two bars a part: Master Beat's call (c), then the same line yours (x, a hold h===)
  const RAP = { parts: { I: [b16 + b16, b16 + b16, b16 + b16, b16 + b16],
    R1: ['c...........c...|x...........x...', '....c...........|....x...........', '........c.......|........x.......', b16 + b16],
    R2: ['c.c.............|x.x.............', '....c...c.......|....x...x.......', '..........c.....|..........x.....', '............c.c.|............x.x.'],
    R3: ['c..c..c.........|x..x..x.........', '.........c......|.........x......', '...........c.c..|...........x.x..', '..............c.|..............x.'],
    R4: ['c...............|x...............', '....c...c...c...|....x...x...x...', b16 + b16, '..c.............|..h=====........'] },
    order: 'I R1 R1 R2 R2 R3 R3 R4 R2 R3 R4 R4' };
  const SONGS = [{ id: 'stepup', name: 'STEP UP', about: 'FOUR LANES: NOTES, JUMPS, HOLDS', chart: STEPUP }, { id: 'rapschool', name: 'RAP SCHOOL', about: 'MASTER BEAT RAPS, YOU ANSWER', chart: RAP, call: true }];

  /* ---- 1. THE STAGE: the dancer, Master Beat, the crowd, the lights; each moves on the music's beat ---- */
  const dancer = { rig: new E.Humanoid({ size: 1.35, build: 'heroic', weapon: null, hair: 'ponytail', outfit: 'tunic', sleeves: 'none', face: { eyes: 'big' }, colors: { cloth: '#e83a8a', pants: '#2a2a4a', hair: '#ffd040', glove: '#ffffff', boot: '#ffffff', trim: '#4ac8ff' } }), pose: null, move: null, mt: 0, hurt: 0, hop: 0 };
  const master = { rig: new E.Humanoid({ size: 1.25, build: 'bulky', weapon: null, hat: { style: 'band', color: '#ffd040' }, outfit: 'coat', sleeves: 'long', colors: { cloth: '#6a3ab0', coat: '#3a2470', pants: '#2a2a3a', glove: '#ffd040', trim: '#ffd040', hair: '#2a1a10' } }), move: null, mt: 0, hop: 0 };
  const crowd = Array.from({ length: 28 }, (_, i) => ({ x: i, h: 14 + E.hash2(i, 3) * 8, c: ['#2a1a4a', '#3a2058', '#1a2a4a', '#2a2a5a'][i % 4], k: E.hash2(i, 9), up: 0 }));
  const POSES = ['hips', null, 'wave', null, 'cheer', null, 'hips', 'crouch'];
  let beat = 0, lightT = 0, cheer = 0;
  function onBeat(b) {
    beat = b; lightT = 1; dancer.rig.kick(-2.5); if (master.rig) master.rig.kick(-2);
    dancer.pose = rh && rh.combo >= 20 ? 'cheer' : POSES[b % POSES.length];
    if (rh && rh.combo >= 20 && b % 2 === 0) dancer.hop = .28;
    for (const c of crowd) if ((b + Math.floor(c.k * 4)) % 2 === 0 || cheer > 0) c.up = .2 + (cheer > 0 ? .15 : 0);
  }

  /* ---- 2. THE GAME: the menu (two songs, calibrate), play, the results; the calibration screen ---- */
  let mode = 'menu', modeT = 0, song = null, rh = null, menuI = 0, cal = null, bot = null, beatOn = null;
  const MENU = () => [...SONGS.map(s => [s.name, s.about]), ['CALIBRATE', 'THE AUDIO OFFSET: ' + Math.round(game.settings.audioOffset) + ' MS']];
  const AFTER = [['RETRY', ''], ['SONGS', ''], ['TITLE', '']];
  function begin(i) {
    song = SONGS[i]; mode = 'play'; modeT = 0; cheer = 0;
    rh = new E.Rhythm(game, { song: SB.get(song.id), chart: song.chart, lanes: LANES, windows: { perfect: 45, great: 90, good: 135 }, life: .6, lead: 1.5, voice: { wave: 'square', vol: .22, dur: .11 },
      on: { judge, fail() { A.sfx('die'); A.stopMusic(.6); end(); }, done: end } });
    rh.start(); game.input.consumeAll();
  }
  function judge(j, n) {
    if (j === 'miss') { dancer.hurt = .3; if (rh.counts.miss % 3 === 1) A.sfx('cancel', { vol: .3 }); return; }
    dancer.move = MOVES[n.lane]; dancer.mt = 0;
    if (rh.combo > 0 && rh.combo % 25 === 0) { cheer = 2; A.sfx('powerup', { vol: .4 }); for (const c of crowd) c.up = .4; }
  }
  function end() { mode = 'results'; modeT = 0; menuI = 0; if (!rh.failed) A.sting(SB.get(rh.grade === 'S' || rh.grade === 'A' ? 'fanfare' : 'clear')); }
  function calibrate() { mode = 'calibrate'; modeT = 0; cal = A.calibrate(); }
  function start(data) {
    mode = 'menu'; modeT = 0; menuI = 0; rh = null; cal = null; bot = null; A.music(SB.get('stepup')); A.layer('lead', 0, .01);
    if (!beatOn) beatOn = A.onBeat(onBeat);   // (the dancer, the lights and the crowd, on the music's beat)
    game.input.touchEnabled = false; L.enabled = false; game.follow(null); game.cam.smooth = 0; game.resetCamera();
    if (data && data.part === 'calibrate') calibrate(); else if (data && data.part) { const i = SONGS.findIndex(s => s.id === data.part); if (i >= 0) begin(i); }
  }
  // the buttons of a menu: a thumb's height on a touch screen
  function buttons(list, W, H) {
    const k = game.screen.dpr / game.screen.S, h = Math.max(24, Math.ceil(46 * k)), w = Math.min(W - 24, 210), gap = 6, y0 = Math.round(Math.max(H * .38, H - (h + gap) * list.length - 30));
    return list.map((b, i) => ({ x: Math.round((W - w) / 2), y: y0 + i * (h + gap), w, h, label: b[0], sub: b[1], i }));
  }
  function menu(I, list, pick) {
    const B = buttons(list, game.W, game.H), ck = I.clicked(), hit = ck && B.find(b => ck[0] >= b.x && ck[0] < b.x + b.w && ck[1] >= b.y && ck[1] < b.y + b.h);
    if (I.pressed('up')) { menuI = (menuI + list.length - 1) % list.length; A.sfx('select'); }
    if (I.pressed('down')) { menuI = (menuI + 1) % list.length; A.sfx('select'); }
    if (hit || I.pressed('confirm') || I.pressed('start')) { if (hit) menuI = hit.i; A.sfx('confirm'); I.consumeAll(); pick(menuI); }
  }
  // the lanes for thumbs: four columns of the screen below its top, where the highway's lanes are
  const zones = () => LANES.map((act, i) => ({ x0: i / 4, y0: .3, x1: (i + 1) / 4, y1: 1, act }));
  function update(dt) {
    const I = game.input; modeT += dt; game.focus(0, 0, 0);
    const touch = I.lastDevice === 'touch';
    I.zones = (mode === 'play' && !bot) ? zones() : mode === 'calibrate' ? [{ x0: 0, y0: .25, x1: 1, y1: 1, act: 'l1' }] : null;
    animate(dt);
    if (mode === 'menu') { menu(I, MENU(), i => i < SONGS.length ? begin(i) : calibrate()); return; }
    if (mode === 'results') { if (modeT > 1) menu(I, AFTER, i => i === 0 ? begin(SONGS.indexOf(song)) : i === 1 ? start() : game.go('title')); return; }
    if (mode === 'calibrate') {
      if (LANES.some(a => I.pressed(a)) || I.pressed('confirm')) cal.tap();
      if (I.pressed('cancel') || (cal.done && cal.taps >= 12)) { if (cal.done) game.settings.set('audioOffset', cal.result); cal.stop(); start(); }
      return;
    }
    if (bot) botLanes();
    rh.update();
    if (cheer > 0) cheer -= dt;
  }
  function animate(dt) {
    lightT = Math.max(0, lightT - dt * 2.5); dancer.mt += dt; master.mt += dt; dancer.hurt = Math.max(0, dancer.hurt - dt); dancer.hop = Math.max(0, dancer.hop - dt); master.hop = Math.max(0, master.hop - dt);
    for (const c of crowd) c.up = Math.max(0, c.up - dt);
    // Master Beat moves on each of his calls
    if (rh && song && song.call) for (const n of rh.notes) if (n.call && n.j === 'call' && !n.seen) { n.seen = true; master.move = MOVES[n.lane]; master.mt = 0; master.hop = .15; }
    const mv = (o, d) => o.move && o.mt < .32 ? E.move(o.move, o.mt / .32) : null;
    const hop = o => o.hop > 0 ? Math.sin(o.hop / .28 * Math.PI) * 8 : 0;
    dancer.rig.update(dt, { x: 0, y: 0, z: hop(dancer), facing: 0, vx: 0, vy: 0, pose: dancer.move && dancer.mt < .32 ? null : dancer.pose, attack: mv(dancer), hurt: dancer.hurt > 0, expr: dancer.hurt > 0 ? 'wince' : rh && rh.combo >= 10 ? 'smile' : null, air: dancer.hop > 0 });
    master.rig.update(dt, { x: 0, y: 0, z: hop(master), facing: 0, vx: 0, vy: 0, pose: master.move && master.mt < .32 ? null : beat % 2 ? 'hips' : null, attack: mv(master), expr: 'smile' });
  }
  // the bot's hands: each lane's note pressed on the step it is due (plus its lateness), a hold held to its end
  function botLanes() {
    const s = A.pos.step, spb = 60 / A.pos.bpm / 4;
    for (const n of rh.notes) {
      if (n.call || n.botDone) continue; if (n.step > s + 8) break;
      if ((s - n.step) * spb >= bot.late) { n.botDone = true; if (n.end > n.step) { game.input.hold(LANES[n.lane]); bot.holds.push(n); } else game.input.tap(LANES[n.lane]); }
    }
    for (const n of bot.holds.slice()) { if (s >= n.end) { game.input.hold(LANES[n.lane], false); bot.holds.splice(bot.holds.indexOf(n), 1); } }
  }

  /* ---- 3. DRAWING: the club (its wall of lights pulsing on the beat, spotlights, the floor), the dancer and Master
   * Beat, the crowd, the highways, the score, the combo, the life gauge, the judgments; the menu and the results ---- */
  const layout = (W, H) => {
    const tall = H > W * 1.1, gap = tall ? W / 4 : Math.min(40, Math.max(28, W / 12)), hx = tall ? W / 2 : Math.round(W * .5), ty = Math.round(H - (tall ? 52 : 34));
    return { tall, gap, hx, ty, len: Math.round(tall ? H * .5 : H * .62), dx: tall ? W / 2 : Math.round(Math.min(W * .82, hx + gap * 2 + 70)), dy: tall ? Math.round(H * .3) : Math.round(H * .66), mx: tall ? Math.round(W * .2) : Math.round(Math.max(40, hx - gap * 2 - 70)) };
  };
  function draw(r) {
    const W = r.W, H = r.H, Lo = layout(W, H), t = game.time;
    r.sky(['#0a0418', '#1a0a30', '#2a0a3a']);
    r.decal(g => {   // the wall of lights, the spotlights, the floor's tiles
      const n = 12, cw = W / n, pulse = lightT;
      for (let i = 0; i < n; i++) for (let j = 0; j < 6; j++) { const on = (i + j + beat) % 3 === 0; px.rect(g, i * cw + 2, 8 + j * 14, cw - 4, 10, on ? E.mix(E.mix(COLS[(i + beat) % 4], '#1a1030', .5), '#ffffff', pulse * .3) : '#1a1030'); }
      for (let k = 0; k < 3; k++) { const a = Math.sin(t * .7 + k * 2.1) * .5, x = W * (k + 1) / 4; px.blend(g, .16 + pulse * .1, 'add', () => px.poly(g, [[x - 3, 0], [x + 3, 0], [x + Math.sin(a) * H + 40, H], [x + Math.sin(a) * H - 40, H]], COLS[(k + beat) % 4])); }
      const fy = Lo.tall ? Math.round(H * .3 + 26) : Math.round(H * .66 + 2);
      for (let i = 0; i * 24 < W; i++) for (let j = 0; fy + j * 10 < H; j++) px.rect(g, i * 24, fy + j * 10, 23, 9, (i + j + beat) % 4 === 0 ? E.mix('#3a1a5a', COLS[(i + j) % 4], .5 * pulse + .2) : '#1a0a2a');
    });
    // the dancer (and Master Beat): rigs where the layout puts them (the side view: screen x, height up)
    const k = r.view.scale, wx = sx => (sx - W / 2) / k, wz = sy => (H / 2 - sy) / k;
    r.actor(wx(Lo.dx), 0, wz(Lo.dy), (g, ox, oy) => dancer.rig.draw(g, ox, oy, r.view));
    if (song && song.call) r.actor(wx(Lo.mx), 0, wz(Lo.dy), (g, ox, oy) => master.rig.draw(g, ox, oy, r.view));
    hud(r, Lo);
  }
  function hud(r, Lo) {
    const W = r.W, H = r.H, touch = game.input.lastDevice === 'touch';
    r.overlay(g => {
      // the crowd along the bottom, in front
      for (const c of crowd) { const x = (c.x + .5) * W / crowd.length, up = c.up > 0 ? c.up * 18 : 0, y = H - c.h + 6 - up; px.disc(g, x, y, 6, c.c); px.rect(g, x - 6, y + 4, 12, H - y, c.c); if (c.up > .15) { px.line(g, x - 5, y + 4, x - 9, y - 8, c.c, 3); px.line(g, x + 5, y + 4, x + 9, y - 8, c.c, 3); } }
      if (mode === 'menu' || mode === 'results' || mode === 'calibrate') { g.fillStyle = 'rgba(6,2,16,.45)'; g.fillRect(0, 0, r.bw, r.bh); px.reset(g); }
    });
    if (mode === 'play' && rh) {
      if (song.call) rh.draw(r, { call: true, x: Lo.mx - 40, y: Lo.dy - (Lo.tall ? 96 : 76), dir: 'left', len: Math.min(110, Lo.hx - Lo.gap * 2 - Lo.mx + 30), gap: 11, size: 5, arrows: true });   // (Master Beat's line, over his head)
      rh.draw(r, { x: Lo.hx, y: Lo.ty, dir: 'down', len: Lo.len, gap: Lo.gap, size: Lo.tall ? Math.min(18, Math.round(Lo.gap * .2)) : 9, colors: COLS, arrows: true });
    }
    r.overlay(g => {
      const W = r.W, H = r.H;
      if (mode === 'menu') {
        E.font.title(g, 'STEP UP!', W / 2, 14, { align: 'center', scale: 4, colors: ['#ffffff', '#ff8ac8', '#c03a8a'], depth: 3 });
        E.font.text(g, 'FOUR LANES, TWO SONGS, ONE GROOVE', W / 2, 52, '#ffe0f0', { align: 'center', shadow: '#000', outline: false });
        btns(g, buttons(MENU(), W, H)); return;
      }
      if (mode === 'calibrate') {
        E.font.title(g, 'CALIBRATE', W / 2, 16, { align: 'center', scale: 3, colors: ['#ffffff', '#4ac8ff', '#2a5ac0'], depth: 3 });
        const b = Math.floor(A.pos.beat), on = A.pos.beat - b < .15;
        px.disc(g, W / 2, H * .45, 22, '#000000'); px.disc(g, W / 2, H * .45, 20, on ? (b % 4 === 0 ? '#ffd040' : '#ffffff') : '#2a2a4a');
        E.font.text(g, touch ? 'TAP ON EACH CLICK YOU HEAR' : 'PRESS A LANE KEY ON EACH CLICK YOU HEAR', W / 2, H * .45 + 34, '#ffffff', { align: 'center', shadow: '#000', outline: false });
        E.font.text(g, cal.done ? 'YOUR OFFSET: ' + cal.result + ' MS  (' + cal.taps + ' TAPS, 12 SETS IT)' : 'TAPS: ' + cal.taps + ' OF 8', W / 2, H * .45 + 48, '#ffe7a8', { align: 'center', shadow: '#000', outline: false });
        E.font.text(g, (touch ? 'BACK' : 'ESCAPE') + ': KEEP THE OLD ONE (' + Math.round(game.settings.audioOffset) + ' MS)', W / 2, H - 50, '#a8b0d8', { align: 'center', outline: false });
        return;
      }
      if (mode === 'results') {
        const R = rh, gr = R.failed ? 'F' : R.grade, col = { S: '#ffd040', A: '#6aff6a', B: '#4ac8ff', C: '#ffffff', D: '#a8a8b8', F: '#ff4a4a' }[gr];
        E.font.text(g, song.name + (R.failed ? '  FAILED' : '  CLEAR!'), W / 2, 12, '#ffffff', { align: 'center', shadow: '#000', outline: false });
        E.font.title(g, gr, W / 2, 24, { align: 'center', scale: 6, colors: ['#ffffff', col, E.shade(col, .5)], depth: 4 });
        const c = R.counts, lines = ['PERFECT ' + c.perfect + '   GREAT ' + c.great, 'GOOD ' + c.good + '   MISS ' + c.miss, 'MAX COMBO ' + R.maxCombo + '   SCORE ' + R.score.toLocaleString('en-US')];
        lines.forEach((s, i) => E.font.text(g, s, W / 2, 76 + i * 11, '#ffe7a8', { align: 'center', shadow: '#000', outline: false }));
        if (modeT > 1) btns(g, buttons(AFTER, W, H));
        return;
      }
      if (mode !== 'play' || !rh) return;
      // the score, the life gauge, the song; the combo; the last judgment over its lane's target
      E.font.text(g, rh.score.toLocaleString('en-US'), 8, 8, '#ffffff', { shadow: '#000', outline: false, scale: 2 });
      E.font.text(g, song.name, 8, 26, '#ffb8e0', { shadow: '#000', outline: false });
      const gw = Math.min(110, W * .3), gx = Math.min(W - gw - 8, cornerX() - gw - 8); px.rect(g, gx - 1, 9, gw + 2, 9, '#ffffff'); px.rect(g, gx, 10, gw, 7, '#1a0a2a'); px.rect(g, gx, 10, Math.round(gw * rh.life), 7, rh.life < .25 ? '#ff4a4a' : rh.life > .8 ? '#6aff6a' : '#ffd040');
      E.font.text(g, 'LIFE', gx - 4, 10, '#ffffff', { align: 'right', shadow: '#000', outline: false, font: 'tiny' });
      if (rh.combo >= 5) E.font.title(g, String(rh.combo), Lo.hx, Lo.ty - Lo.len * .55, { align: 'center', scale: 3, colors: ['#ffffff', '#ff8ac8', '#8a2a5a'], depth: 2 });
      const L0 = rh.last;
      if (L0 && game.time - L0.t < .45) { const word = L0.j.toUpperCase(), cl = { perfect: '#ffd040', great: '#6aff6a', good: '#4ac8ff', miss: '#ff4a4a' }[L0.j]; E.font.text(g, word, Lo.hx, Lo.ty - 30 - (game.time - L0.t) * 20, cl, { align: 'center', shadow: '#000', outline: false, scale: 2 }); }
      if (A.pos.beat < 4) E.font.title(g, A.pos.beat < 2 ? 'READY?' : String(4 - Math.floor(A.pos.beat)), W / 2, H * .3, { align: 'center', scale: 3, colors: ['#ffffff', '#ffd040', '#a06a10'], depth: 2 });
      if (song.call && A.pos.beat >= 4) { const bar = Math.floor(A.pos.bar); E.font.text(g, bar % 2 === 0 ? 'MASTER BEAT:' : 'YOU:', Lo.mx, Lo.dy - (Lo.tall ? 124 : 100), bar % 2 === 0 ? '#ffd040' : '#ff8ac8', { align: 'center', shadow: '#000', outline: false }); }
      if (modeT < 6) E.font.text(g, touch ? 'TAP THE COLUMN AS A NOTE MEETS ITS RING' : 'D F J K (OR THE ARROWS) AS A NOTE MEETS ITS RING', W / 2, Lo.ty + 16, '#ffe0f0', { align: 'center', shadow: '#000', outline: false });
    });
  }
  function btns(g, B) {
    for (const b of B) {
      const on = b.i === menuI; E.ui.box(g, b.x, b.y, b.w, b.h, { bg: on ? '#5a1a5a' : '#1a0a2a', border: on ? '#ffd36a' : '#a87ac8' });
      E.font.text(g, b.label, b.x + b.w / 2, b.y + b.h / 2 - (b.sub ? 9 : 4), on ? '#ffd36a' : '#ffffff', { align: 'center', outline: false, shadow: '#000' });
      if (b.sub) E.font.text(g, b.sub, b.x + b.w / 2, b.y + b.h / 2 + 1, '#d8b8f0', { align: 'center', outline: false });
    }
  }

  /* ---- 4. THE BOT: both songs played perfectly (each note pressed on the step it is due), then 70 ms late, twice;
   * the grades, counts and scores, and whether the two runs judged alike (tools/kits-test.mjs) ---- */
  function botRun() {
    const play = (i, late) => {
      game.time = 0; game.timeScale = 1; game.go('rhythm', null, { fade: 0 }); game.advance(1 / 120);
      begin(i); bot = { late, holds: [] }; let t = 0;
      while (mode === 'play' && t < 120) { game.advance(1 / 60); t += 1 / 60; }
      const R = rh, out = { song: song.id, late: Math.round(late * 1000), grade: R.failed ? 'F' : R.grade, counts: Object.assign({}, R.counts), maxCombo: R.maxCombo, score: R.score, total: R.total, calls: R.notes.filter(n => n.call && n.j === 'call').length, judged: R.notes.filter(n => n.j && !n.call).reduce((h, n) => Math.imul(h, 31) + n.j.length * 1000 + n.ms | 0, 7) };   // (every judgment and its ms, hashed)
      bot = null; return out;
    };
    const runs = () => [play(0, 0), play(1, 0), play(0, .07), play(1, .07)], a = runs(), b = runs();
    return { runs: a, repeat: JSON.stringify(a) === JSON.stringify(b), errors: game.errors.length };
  }

  return { view: 'side', views: ['side'], res: 'ps1', pausable: true, touch: [], camera: { zoom: false }, input: KEYS,
    enter: start, update, draw, bot: botRun,
    exit() { game.input.zones = null; game.input.touchEnabled = true; game.cam.smooth = .18; if (cal) cal.stop(); A.stopMusic(); if (beatOn) beatOn.cancel(); beatOn = null; },
    back() { if (mode === 'menu') return false; if (cal) cal.stop(); start(); return true; },
    /** for tests: the mode, the song and its E.Rhythm, the menu's buttons, where each lane's target is on the screen */
    state: () => ({ mode, song: song && song.id, rh, cal, buttons: () => buttons(mode === 'results' ? AFTER : MENU(), game.W, game.H), lanes: () => { const Lo = layout(game.W, game.H); return LANES.map((a, i) => [Lo.hx + (i - 1.5) * Lo.gap, Lo.ty]); }, pos: A.pos }),
    /** the proof: STEP UP played for n steps, a lane pressed on a fixed beat; the score, the combo, the counts, the step */
    run: (n = 1200) => proof('rhythm', n, (i, k) => {
      if (i === 2) begin(0);
      if (i > 2 && i % 30 === 0) k.tap(LANES[(i / 30) % 4]);
    }, () => [rh ? rh.score : 0, rh ? rh.combo : 0, rh ? rh.counts : null, Math.round(A.pos.step * 100), mode]) };
})();
scenes.rhythm = RHYTHM;
