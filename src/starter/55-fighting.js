/* =====================================================================================
 * SLICE 11  FIGHTING  (Street Fighter II, Darkstalkers, Samurai Shodown). @modules fight
 * One on one in the side view, best of three rounds, on a temple courtyard at dusk with a crowd that cheers the blows.
 *   RYO, the all-rounder: a fireball (236 + a punch), a rising uppercut (623 + HP), a spinning kick (214 + HK); his
 *     super, a great fireball (236236 + HP), once his meter is full.
 *   GORM, the grappler: big, slow and hard to move: a spinning slam (41236 + HP, close: it can't be blocked), a shoulder
 *     charge (hold back, then forward + HP), a lariat (623 + LP), an overhead axe kick (HK); his super slam 41236 + HK.
 *   VEX, the fast one: quick strikes, a teleport behind her foe (214 + LK), a rising flip kick (623 + LK), a dashing
 *     elbow (236 + LP); her super, a whirlwind of kicks (236236 + HK).
 * The numbers are a number pad for a fighter facing right (2 down, 6 forward, 4 back; 236 is a quarter circle forward):
 * they mirror when it faces left. Hold back to block (down-back for low moves; jump attacks must be blocked standing);
 * forward or back + HP close to a foe throws it.
 * MODES: VERSUS (a second player joins with 2 on the keyboard or Start on a pad), ARCADE (the other two, then your own
 * shadow, each CPU stronger), TRAINING (the boxes drawn, frame data, your inputs; Tab or a pad's Back changes the dummy:
 * stand, crouch, jump, guard). Deep links: #fighting/versus, #fighting/arcade, #fighting/training.
 * KEYS: arrows / WASD move, jump (up) and crouch (down); U, I punch and J, K kick (light, heavy); a pad's X, Y, A, B.
 * Two on one keyboard: each takes half, and the menus say whose keys are which. TOUCH: the stick (motions work on it)
 * and four buttons.
 * HOW IT WORKS: E.Fighter, E.Match, E.FightAI and E.FightSelect (the fight module) hold the rules; this file is the
 * roster with each fighter's moves, the stage and the menus.
 * ===================================================================================== */
const FIGHT = (() => {
  const A = game.audio, X0 = 0, X1 = 560, KEYS = Object.assign({}, E.FIGHT_KEYS, { dummy: ['Tab', 'Pad8'] });
  const M = E.MOVES, spin = (name, o) => Object.assign({}, M[name], { spin: true }, o);   // (a move turned into a spin)

  /* ---- THE ROSTER: each a rig and a move list (frame data in frames at 60: [startup, active, recovery]) ---- */
  const ROSTER = [
    { id: 'ryo', name: 'RYO', about: 'ALL-ROUNDER', o: { walk: 78, back: 62 }, alt: { cloth: '#2a2a34', pants: '#2a2a34', glove: '#3a6ac8' },
      rig: { size: 2.35, build: 'heroic', hair: 'short', sleeves: 'short', hat: { style: 'band', color: '#e0302a' }, colors: { skin: '#e8b088', hair: '#2a1a18', cloth: '#f2eee4', pants: '#f2eee4', boot: '#e8b088', belt: '#1a1a22', glove: '#c83a2a' } },
      moves: {
        jab: { move: 'jab', btn: 'lp', f: [3, 3, 7], dmg: 30, cancel: true }, cjab: { move: 'jab', btn: 'lp', when: 'crouch', f: [3, 3, 7], dmg: 25, cancel: true }, ajab: { move: 'jab', btn: 'lp', when: 'air', guard: 'overhead', dmg: 35 },
        cross: { move: 'cross', btn: 'hp', f: [5, 4, 16], dmg: 80, cancel: true }, cup: { move: 'uppercut', btn: 'hp', when: 'crouch', f: [5, 6, 18], dmg: 85 }, ahook: { move: 'hook', btn: 'hp', when: 'air', guard: 'overhead', dmg: 85 },
        kick: { move: 'kick', btn: 'lk', f: [4, 3, 9], dmg: 35, cancel: true }, ckick: { move: 'kick', btn: 'lk', when: 'crouch', guard: 'low', f: [4, 3, 9], dmg: 30, cancel: true }, akick: { move: 'flyingkick', btn: 'lk', when: 'air', guard: 'overhead', dmg: 50 },
        round: { move: 'roundhouse', btn: 'hk', f: [7, 5, 18], dmg: 95 }, sweep: { move: 'sweep', btn: 'hk', when: 'crouch', guard: 'low', down: true, f: [6, 5, 20], dmg: 90 }, afly: { move: 'flyingkick', btn: 'hk', when: 'air', guard: 'overhead', dmg: 95 },
        fire: { move: 'cast', btn: 'lp', motion: '236', f: [12, 2, 30], shot: { speed: 150, r: 7, dmg: 70, color: '#58b8ff' } },
        fire2: { move: 'cast', btn: 'hp', motion: '236', f: [12, 2, 30], shot: { speed: 220, r: 7, dmg: 80, color: '#58b8ff' } },
        rise: { move: 'uppercut', btn: 'hp', motion: '623', f: [3, 12, 26], inv: 8, vz: 360, vx: 40, launch: 340, dmg: 120, aa: true },
        whirl: { move: spin('roundhouse', { active: .4 }), btn: 'hk', motion: '214', f: [8, 24, 14], vx: 130, vz: 170, dmg: 90, down: true },
        super: { move: 'cast', btn: 'hp', motion: '236236', meter: 100, f: [8, 3, 30], inv: 10, shot: { speed: 200, r: 13, dmg: 260, color: '#ff7a3a', core: '#fff0c0' } } } },
    { id: 'gorm', name: 'GORM', about: 'GRAPPLER', alt: { pants: '#2a5ac8', belt: '#e0e0e8', glove: '#e0e0e8' }, o: { walk: 56, back: 46, life: 1150, throwDmg: 150, jump: 360, jumpX: 70 },
      rig: { size: 2.65, build: 'bulky', hair: 'bald', sleeves: 'none', stubble: '#4a2a1a', hunch: .2, colors: { skin: '#c88a5a', hair: '#2a1a10', cloth: '#c88a5a', pants: '#b82a2a', boot: '#3a2a20', belt: '#ffd040', glove: '#3a2a20' } },
      moves: {
        jab: { move: 'jab', btn: 'lp', f: [4, 3, 9], dmg: 40, cancel: true }, cjab: { move: 'elbow', btn: 'lp', when: 'crouch', f: [4, 3, 10], dmg: 40, cancel: true }, abash: { move: 'bash', btn: 'lp', when: 'air', guard: 'overhead', dmg: 50 },
        chop: { move: 'haymaker', btn: 'hp', f: [10, 4, 22], dmg: 120 }, butt: { move: 'bash', btn: 'hp', when: 'close', f: [6, 4, 18], dmg: 100, cancel: true }, cup: { move: 'uppercut', btn: 'hp', when: 'crouch', f: [7, 5, 22], dmg: 100 },
        ahay: { move: 'haymaker', btn: 'hp', when: 'air', guard: 'overhead', dmg: 110 },
        kick: { move: 'kick', btn: 'lk', f: [6, 3, 12], dmg: 45 }, ckick: { move: 'kick', btn: 'lk', when: 'crouch', guard: 'low', f: [6, 3, 12], dmg: 40 }, aknee: { move: 'knee', btn: 'lk', when: 'air', guard: 'overhead', dmg: 70 },
        axe: { move: 'axekick', btn: 'hk', f: [16, 4, 18], guard: 'overhead', dmg: 110 }, sweep: { move: 'sweep', btn: 'hk', when: 'crouch', guard: 'low', down: true, f: [8, 5, 24], dmg: 100 }, astomp: { move: 'axekick', btn: 'hk', when: 'air', guard: 'overhead', dmg: 110 },
        slam: { move: 'throw', btn: 'hp', motion: '41236', throw: true, range: 40, f: [4, 3, 34], dmg: 230 },
        rush: { move: 'bash', btn: 'hp', charge: '46', f: [8, 14, 20], vx: 220, dmg: 110, down: true },
        lariat: { move: spin('hook', { active: .4 }), btn: 'lp', motion: '623', f: [5, 22, 18], inv: 5, vx: 60, r: 7, dmg: 100, down: true, aa: true },
        super: { move: 'throw', btn: 'hk', motion: '41236', meter: 100, throw: true, range: 48, f: [2, 4, 34], dmg: 400 } } },
    { id: 'vex', name: 'VEX', about: 'FAST, TELEPORTS', alt: { cloth: '#8a2a3a', hair: '#e0c060', trim: '#e8e8f0' }, o: { walk: 96, back: 80, life: 900, jump: 410, jumpX: 105 },
      rig: { size: 2.2, build: 'heroic', hair: 'ponytail', sleeves: 'long', outfit: 'tunic', hood: true, colors: { skin: '#f0c8a0', hair: '#4a2a7a', cloth: '#2a6a6a', pants: '#1a2a3a', boot: '#1a1a2a', belt: '#e0b040', glove: '#1a2a3a', trim: '#e0b040' } },
      moves: {
        jab: { move: 'jab', btn: 'lp', f: [2, 2, 6], dmg: 25, cancel: true }, cjab: { move: 'jab', btn: 'lp', when: 'crouch', f: [2, 2, 6], dmg: 22, cancel: true }, ajab: { move: 'elbow', btn: 'lp', when: 'air', guard: 'overhead', dmg: 35 },
        palm: { move: 'cross', btn: 'hp', f: [4, 3, 13], dmg: 65, cancel: true }, knee: { move: 'knee', btn: 'hp', when: 'close', f: [3, 3, 12], dmg: 60, cancel: true }, cup: { move: 'uppercut', btn: 'hp', when: 'crouch', f: [4, 5, 15], dmg: 70 },
        ahook: { move: 'hook', btn: 'hp', when: 'air', guard: 'overhead', dmg: 70 },
        kick: { move: 'kick', btn: 'lk', f: [3, 3, 8], dmg: 30, cancel: true }, ckick: { move: 'kick', btn: 'lk', when: 'crouch', guard: 'low', f: [3, 3, 8], dmg: 28, cancel: true }, akick: { move: 'flyingkick', btn: 'lk', when: 'air', guard: 'overhead', dmg: 45 },
        round: { move: 'roundhouse', btn: 'hk', f: [5, 5, 15], dmg: 80 }, slide: { move: 'sweep', btn: 'hk', when: 'crouch', guard: 'low', down: true, f: [5, 8, 18], vx: 150, dmg: 75 }, afly: { move: 'flyingkick', btn: 'hk', when: 'air', guard: 'overhead', dmg: 80 },
        port: { move: 'cast', btn: 'lk', motion: '214', f: [10, 1, 12], teleport: 36, inv: 12 },
        flip: { move: 'flyingkick', btn: 'lk', motion: '623', f: [3, 12, 22], inv: 6, vz: 340, vx: 70, launch: 320, dmg: 100, aa: true },
        dash: { move: 'elbow', btn: 'lp', motion: '236', f: [6, 10, 16], vx: 260, dmg: 70 },
        super: { move: spin('roundhouse', { active: .5 }), btn: 'hk', motion: '236236', meter: 100, f: [4, 30, 20], inv: 10, vx: 170, vz: 220, dmg: 260, down: true } } }];
  const byId = id => ROSTER.find(e => e.id === id);
  // a fighter of the roster; alt: its second palette (a mirror match's player 2); shadow: the arcade's last foe, the
  // fighter's own moves in a dark palette
  const make = (id, x, side, shadow, alt) => {
    const e = byId(id), rig = Object.assign({}, e.rig, { weapon: null, speedRef: 40, colors: Object.assign({}, e.rig.colors, alt ? e.alt : {}, shadow ? { cloth: '#2a2a3a', pants: '#1a1a24', hair: '#0a0a12', glove: '#6a2a8a', skin: '#8a7a9a', eye: '#ff4a4a' } : {}) });
    return new E.Fighter(game, Object.assign({ name: shadow ? 'SHADOW ' + e.name : e.name, x, side, rig, moves: e.moves }, e.o));
  };

  /* ---- THE STAGE: a temple courtyard at dusk; a crowd behind the rope that cheers the blows ---- */
  const bg = new E.Backdrop({ sky: ['#1a1440', '#5a3070', '#d86a5a', '#f8b878'], sun: { x: .7, y: .58, r: 18, color: '#ffd8a0' },
    layers: [{ kind: 'mountains', color: '#4a2e5e', y: .5, height: .26, parallax: .05 }, { kind: 'castle', color: '#2e1c3c', y: .6, height: .34, parallax: .12, windows: '#ffb85a' }, { kind: 'forest', color: '#1e1428', y: .7, height: .14, parallax: .25 }] });
  const CROWD = Array.from({ length: 70 }, (_, i) => ({ x: X0 - 60 + i * ((X1 - X0 + 120) / 70) + E.hash2(i, 3) * 6, row: i % 3, h: 18 + E.hash2(i, 5) * 8, c: ['#5a3a6a', '#3a4a7a', '#7a3a3a', '#4a6a4a', '#7a5a3a', '#3a3a4a'][Math.floor(E.hash2(i, 7) * 6)], ph: E.hash2(i, 9) * 6 }));
  let cheer = 0;
  function stage(r) {
    const g = r.ctx, v = r.view; bg.draw(r);
    const W = r.bw, floor = Math.round(r.w(0, 0, 0)[1]), sx = x => r.w(x, 0, 0)[0];
    // the far wall and its lanterns, then the crowd behind the rope (parallax: the back rows move slower)
    px.rect(g, 0, floor - 70, W, 70, '#2a1a2a'); px.rect(g, 0, floor - 72, W, 2, '#5a3a4a');
    for (let k = 0; k < 9; k++) { const lx = Math.round(sx(X0 + k * 70) * .9 + W * .05), ly = floor - 66, glow = .6 + .4 * Math.sin(game.time * 3 + k); px.blend(g, .3 * glow, 'add', () => px.disc(g, lx, ly + 8, 14, '#ff9a4a')); px.rect(g, lx - 4, ly, 8, 12, '#e04a3a'); px.rect(g, lx - 4, ly + 5, 8, 1, '#ffd060'); }
    for (const p of CROWD) {
      const par = [.7, .82, .94][p.row], x = Math.round((sx(p.x) - W / 2) * par + W / 2), bob = Math.abs(Math.sin(game.time * (3 + cheer * 6) + p.ph)) * (1 + cheer * 4), y = floor - 18 - p.row * 9 - p.h + 18 - bob;
      const c = E.shade(p.c, -.1 * (2 - p.row)); px.rect(g, x - 5, y + 6, 10, p.h, c); px.disc(g, x, y + 3, 4, E.shade(c, .15));
      if (cheer > .3 && E.hash2(Math.floor(p.ph * 10), 1) > .5) { px.rect(g, x - 7, y - 4 - bob, 2, 8, c); px.rect(g, x + 5, y - 4 - bob, 2, 8, c); }   // arms up
    }
    px.rect(g, 0, floor - 12, W, 2, '#c8a060');   // the rope
    // the floor: planks to the horizon, lit in the middle
    for (let y = floor; y < r.bh; y++) { const k = (y - floor) / Math.max(1, r.bh - floor); px.rect(g, 0, y, W, 1, E.mix('#6a4a3a', '#3a2620', k)); }
    for (let k = -12; k <= 12; k++) { const x0 = sx(X0 + (X1 - X0) / 2 + k * 40); px.line(g, Math.round(x0), floor, Math.round(W / 2 + (x0 - W / 2) * 1.8), r.bh, '#4a3028'); }
    px.blend(g, .18, 'add', () => px.ell(g, W / 2, floor + 14, W * .45, 10, '#ffb878'));
  }

  /* ---- MODES: the menu, the select, the match, the results ---- */
  let mode = 'menu', match = null, select = null, kind = 'versus', picks = null, ladder = [], step = 0, dummy = 0, result = null, t = 0;
  const DUMMY = ['stand', 'crouch', 'jump', 'guard'];
  const menu = new E.Menu(game, ['VERSUS', 'ARCADE', 'TRAINING'], { y: 0, onPick: i => choose(['versus', 'arcade', 'training'][i]) });
  const after = new E.Menu(game, ['REMATCH', 'CHARACTER SELECT', 'TITLE'], { y: 0, onPick: i => i === 0 ? fight(picks) : i === 1 ? choose(kind) : game.go('title') });
  const cont = new E.Menu(game, ['CONTINUE', 'TITLE'], { y: 0, onPick: i => i ? game.go('title') : fight(picks) });
  const p2 = () => game.players[1] || null;
  function choose(k) {
    kind = k; mode = 'select'; t = 0;
    select = new E.FightSelect(game, { roster: ROSTER, inputs: [game.input, k === 'versus' ? p2() : null], cpu: [false, k !== 'versus'], seed: 1 + Math.floor(Math.random() * 1e6),
      onDone: ids => { if (k === 'arcade') { ladder = ROSTER.filter(e => e.id !== ids[0]).map(e => e.id).concat([ids[0]]); step = 0; picks = [ids[0], ladder[0]]; } else picks = ids; fight(picks); } });
  }
  function fight(ids) {
    const a = make(ids[0], 0, 1), shadow = kind === 'arcade' && step === ladder.length - 1, b = make(ids[1], 0, -1, shadow, ids[0] === ids[1] && !shadow), cpu = kind === 'arcade';
    const s = game.view.p(1, 0, 0)[0] - game.view.p(0, 0, 0)[0], span = Math.max(160, game.W / s - 36);
    match = new E.Match(game, { fighters: [a, b], ai: [null, cpu ? new E.FightAI({ level: 3 + step * 2, seed: 1 + Math.floor(Math.random() * 1e6) }) : null], inputs: [game.input, p2()], x0: X0, x1: X1, span,
      training: kind === 'training' ? { dummy: DUMMY[dummy] } : false, onEnd: w => end(w) });
    mode = 'fight'; result = null; t = 0; A.music(SONG); game.input.consumeAll();
  }
  function end(w) {
    result = { w, t: 0 }; t = 0; A.music(null);
    if (kind === 'arcade') { if (w === 0) { step++; result.next = step < ladder.length; } else cont.i = 0; } else after.i = 0;
  }
  // a fighting song: a driving bass under a modal lead (the step sequencer's format)
  const SONG = { bpm: 150, steps: 4, tracks: [
    { wave: 'pulse12', vol: .1, notes: 'A4 - C5 D5 E5 - D5 C5 | D5 - G4 - C5 B4 A4 G4 | F4 - A4 C5 D5 - E5 - | G5 F5 E5 D5 E5 - - -' },
    { wave: 'triangle', vol: .3, notes: 'A2 . A2 A3 A2 . A2 G2 | G2 . G2 G3 G2 . G2 E2 | F2 . F2 F3 F2 . F2 G2 | G2 . G2 B2 D3 . E3 .' },
    { wave: 'drums', vol: .1, notes: 'k . h . s . h k k . h . s . h h' }] };

  function update(dt) {
    t += dt; cheer = Math.max(0, cheer - dt * .8);
    for (const k of ['lp', 'hp', 'lk', 'hk']) game.input.touchSet(k, null, mode === 'fight' && !(result && result.t > 1.2));   // (the fight's buttons only in a fight: taps pick on the menus)
    if (mode === 'menu') { if (!menu.update(dt)) pickOnStart(menu); return; }
    if (mode === 'select') {
      if (kind === 'versus' && !select.inputs[1] && p2()) select.inputs[1] = p2();   // player 2 joined: its cursor comes alive
      select.update(dt); return;
    }
    if (!match) return;
    const lifeWas = match.f.map(f => f.life);
    match.update(dt);
    match.f.forEach((f, i) => { if (f.life < lifeWas[i]) cheer = Math.min(1, cheer + (lifeWas[i] - f.life) / 150); });
    if (kind === 'training' && game.input.pressed('dummy')) { dummy = (dummy + 1) % DUMMY.length; match.o.training.dummy = DUMMY[dummy]; A.sfx('select'); }
    if (result) {
      result.t += dt; if (result.t < 1.2) return;
      match.call = null;   // (the menu's own title instead)
      if (kind === 'arcade') { if (result.w === 0) { if (result.next) { picks = [picks[0], ladder[step]]; fight(picks); } else if (result.t > 5 || game.input.pressed('start')) game.go('title'); } else if (!cont.update(dt)) pickOnStart(cont); }
      else if (!after.update(dt)) pickOnStart(after);
    }
  }
  function draw(r) {
    stage(r);
    if (match && (mode === 'fight')) match.draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H;
      if (mode === 'menu') {
        px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, W, H, '#0a0614'));
        E.font.title(g, 'FIGHTING', W / 2, 30, { scale: 4, align: 'center', colors: ['#fff6d0', '#ff9a4a', '#c0302a'], depth: 3 });
        const two = game.players.length > 1, line = menu.i === 0 ? (two ? 'TWO PLAYERS: PICK YOUR FIGHTERS' : 'PLAYER 2: PRESS 2 OR START ON A PAD') : menu.i === 1 ? 'BEAT THE OTHER TWO, THEN YOUR SHADOW' : 'THE BOXES, FRAME DATA AND YOUR INPUTS';
        E.font.text(g, line, W / 2, H - 34, '#e8d8ff', { align: 'center', shadow: '#000', outline: false });
        const keys = I => (two ? I.name + ' ' : '') + ['lp', 'hp', 'lk', 'hk'].map(k => I.label(k)).join(' ') + ' PUNCH, KICK';
        E.font.text(g, two ? game.players.map(keys).join('     ') : 'ARROWS MOVE   ' + keys(game.input) + '   HOLD BACK TO BLOCK', W / 2, H - 22, '#9a8ac8', { align: 'center', outline: false, font: 'tiny' });
        E.font.text(g, '236 + PUNCH: A FIREBALL (NUMPAD NOTATION, FACING RIGHT)', W / 2, H - 12, '#7a6aa8', { align: 'center', outline: false, font: 'tiny' });
      }
      if (mode === 'select' && kind === 'versus' && !select.inputs[1]) E.font.text(g, 'PLAYER 2: PRESS 2 OR START ON A PAD', W / 2, 26, '#ff8a6a', { align: 'center', shadow: '#000', outline: false });
      if (mode === 'fight' && kind === 'arcade' && match.phase === 'intro') E.font.text(g, 'STAGE ' + (step + 1) + ' OF ' + ladder.length, W / 2, H / 2 + 6, '#ffffff', { align: 'center', shadow: '#000', outline: false });
      const ta = game.input.touchArea && game.input.touchArea();   // (clear of the touch buttons)
      if (mode === 'fight' && kind === 'training') E.font.text(g, 'DUMMY: ' + DUMMY[dummy].toUpperCase() + '  (TAB OR BACK CHANGES IT)', W / 2, ta ? Math.round(ta.y0) - 10 : H - 24, '#ffd060', { align: 'center', shadow: '#000', outline: false, font: 'tiny' });
      if (result && result.t > 1.2) {
        if (kind === 'arcade' && result.w === 0 && !result.next) { E.font.title(g, 'CHAMPION!', W / 2, H / 2 - 34, { scale: 3, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'] }); }
        else if (kind === 'arcade' && result.w === 1) { E.font.title(g, 'CONTINUE?', W / 2, H / 2 - 40, { scale: 2, align: 'center', colors: ['#ffffff', '#ff8a6a', '#c0302a'] }); }
        else if (kind !== 'arcade') E.font.title(g, match.f[result.w].name + ' WINS', W / 2, H / 2 - 44, { scale: 3, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8782a'] });
      }
    });
    if (mode === 'menu') { menu.y = Math.round(r.H / 2) - 10; menu.draw(r); }
    if (mode === 'select') select.draw(r);
    if (result && result.t > 1.2 && !(kind === 'arcade' && result.w === 0)) { const m = kind === 'arcade' ? cont : after; m.y = Math.round(r.H / 2) - 12; m.draw(r); }
  }

  /** the bot (tools/kits-test.mjs): two CPUs fight a match with seed s, twice; who won, the rounds, and whether the second
   *  match repeated the first exactly (the CPU's randomness is its own) */
  function bot(s = 1) {
    const one = () => {
      const was = Math.random; Math.random = E.rng(s);
      try {
        game.go('fighting', null, { fade: 0 }); game.advance(1 / 120); kind = 'versus'; picks = ['ryo', 'gorm'];
        fight(picks); match.ai = [new E.FightAI({ level: 6, seed: s }), new E.FightAI({ level: 5, seed: s + 1 })];
        let h = 2166136261, n = 0; for (; n < 260 && match.phase !== 'over'; n++) { game.advance(1); const v = match.f.map(f => Math.round(f.life) + ':' + Math.round(f.x)).join(','); for (let i = 0; i < v.length; i++) h = Math.imul(h ^ v.charCodeAt(i), 16777619); }
        return { winner: match.winner, wins: match.wins.slice(), rounds: match.round, seconds: n, over: match.phase === 'over', hash: h >>> 0 };
      } finally { Math.random = was; }
    };
    const a = one(), b = one(); return Object.assign(a, { repeat: a.hash === b.hash, errors: game.errors.length });
  }

  return { view: 'side', views: ['side'], input: KEYS, res: 'ps1', pausable: true, touch: ['lp', 'hp', 'lk', 'hk'], camera: { zoom: false, tall: 1.8 },   // (a phone held upright: closer, the fight filling it)
    enter(d) {
      mode = 'menu'; match = null; select = null; result = null; menu.i = 0; game.follow(null); game.cam.snap = true; game.focus((X0 + X1) / 2, 0, 52);
      game.cam.bounds = v => { const a = v.p(X0, 0, 0), b = v.p(X1, 0, 0), top = v.p(0, 0, 200)[1], bot2 = v.p(0, 0, -70)[1]; return { x0: a[0], x1: b[0], y0: top, y1: bot2 }; };
      game.allowJoin({ max: 2 }); A.music('title');
      if (d && d.part) choose(d.part === 'training' ? 'training' : d.part === 'arcade' ? 'arcade' : 'versus');
    },
    exit() { game.timeScale = 1; },
    back() { if (mode === 'menu') { game.go('title'); return true; } if (mode === 'select') { mode = 'menu'; return true; } return false; },
    update, draw, bot,
    state: () => ({ mode, kind, picks, phase: match && match.phase, wins: match && match.wins.slice(), life: match && match.f.map(f => f.life), x: match && match.f.map(f => f.x), winner: match && match.winner, dummy: DUMMY[dummy] }),   // for tests
    match: () => match, select: () => select,   // (for tests)
    /** the proof: player 1 (RYO) walks in on a standing GORM, jabs, sweeps and throws fireballs by motion; a hash of the
     *  fight */
    run: (n = 600) => proof('fighting', n, (i, k) => {
      if (i === 2) { kind = 'training'; dummy = 0; fight(['ryo', 'gorm']); }
      if (i < 120) { if (i === 3) k.hold('right'); if (i === 100) k.up('right'); }
      if (i % 40 === 20 && i < 300) k.tap('lp');
      if (i === 320) k.hold('down'); if (i === 330) k.hold('right'); if (i === 336) { k.up('down'); } if (i === 338) k.tap('lp'); if (i === 345) k.up('right');
      if (i === 400) k.hold('down'); if (i === 406) k.tap('hk'); if (i === 420) k.up('down');
    }, () => match ? [match.f.map(f => [f.x, f.z, f.life, f.meter, f.combo]), match.f[0].last] : null) };
})();
scenes.fighting = FIGHT;
