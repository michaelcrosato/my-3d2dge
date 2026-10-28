/* =====================================================================================
 * SLICE 17  SIM  (Theme Park, RollerCoaster Tycoon, SimCity). @modules grid strategy
 * SUNNY BAY PARK: a field by the bay, a gate on the road, a path, a carousel and a burger stand to start, and $5,000.
 * Lay paths (a tap a tile, a drag a line), build rides (CAROUSEL, FERRIS WHEEL, TEACUPS, SWINGS) and shops (BURGERS,
 * LEMONADE) beside them. Guests come through the gate while the park is open (9:00 to 21:00), more when its rating is
 * high; each has money and needs (fun, hunger, thirst, tired) that rise as they walk, and goes for what serves them best
 * for the walk and the price (E.choose). They queue, ride, eat and drink, think aloud, and leave happy or not: the
 * rating is how happy they leave. Money: the gate's fee, tickets and sales, less building and each ride's upkeep at
 * midnight. Tap a ride to set its price or knock it down; tap a guest to read their mind. Day and night (E.Clock), time
 * controls (PAUSE, 1x, 2x, 4x: more fixed steps a frame), the CROWDS overlay (E.overlay), tooltips (E.tooltip).
 * Keys: arrows / WASD pan, the wheel zooms; Space pauses, 1 2 3 the speeds; Q path, E erase; Escape ends a tool. The
 * mouse: a click places or inspects, a drag lays a line of path, hovering shows a tooltip. TOUCH: a tap places or
 * inspects, a long press and a drag lays a line of path, a drag pans, two fingers zoom.
 * HOW IT WORKS: paths are the TileMap's floor tags; guests walk an E.Grid of them (grid.path); E.needs and E.choose
 * pick their next stop; E.Clock runs the days and the light. bot() lays out a park through the same calls the HUD makes
 * and runs ten days at 4x headless, its money each midnight (tools/kits-test.mjs). Deep link: #sim.
 * ===================================================================================== */
const SIM = (() => {
  const T = 16, DAY = 180, CAP = 140, TAU = Math.PI * 2;   // a day: 180 seconds at 1x (the park open half of it); at most 140 guests at once
  // the calliope: a waltz in C
  const SONG = { bpm: 150, steps: 3, tracks: [
    { wave: 'pulse25', vol: .09, notes: 'E5 - G5 | C6 - - | B5 - G5 | E5 - - | F5 - A5 | D6 - - | C6 - B5 | G5 - - | E5 - G5 | C6 - E6 | D6 - C6 | A5 - - | B5 - D6 | G5 - B5 | C6 - - | . . .' },
    { wave: 'triangle', vol: .26, notes: 'C3 G3 G3 | C3 G3 G3 | G2 G3 G3 | C3 G3 G3 | F2 A3 A3 | D3 A3 A3 | G2 G3 G3 | C3 G3 G3' }] };
  // the field: woods (T) round it, the bay (~) east, the gate (G) on the road south, the first path (P)
  const ROWS = [
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'T.T....T.....TT......T.......T....~~~~~~~~~T',
    'T.........................,,.....~~~~~~~~~~T',
    'TT.....,,,.....................~~~~~~~~~~~~T',
    'T......,,..........................~~~~~~~~T',
    'T...................................~~~~~~~T',
    'T............................,,......~~~~~~T',
    'TT...................................~~~~~~T',
    'T.....................................~~~~~T',
    'T.....,,..............................~~~~~T',
    'T.....,,,..............................~~~~T',
    'T.......................................~~~T',
    'TT...........................,,........~~~~T',
    'T............................,,,.......~~~~T',
    'T.......................................~~~T',
    'T........................................~~T',
    'T........................................~~T',
    'TT......................................~~~T',
    'T.......................................~~~T',
    'T..,,,..................................~~~T',
    'T...,,...................................~~T',
    'T........................................~~T',
    'T.........................,,............~~~T',
    'TT.......................................~~T',
    'T........................................~~T',
    'T........................................~~T',
    'T.........................................~T',
    'T.........................................~T',
    'TT................PPPPPPPPPP..............~T',
    'T.................P........P..............TT',
    'T.................P........P.............TTT',
    'T.................PPPPPPPPPP............TT.T',
    'T.....................P...................TT',
    'T.....................P...................TT',
    'T.....................P....................T',
    'TTTTTTTTTTTTTTTTTTTTTGGGTTTTTTTTTTTTTTTTTTTT'];
  const LEGEND = { '.': { floor: 'grass' }, ',': { floor: 'flowers' }, '~': { floor: 'water', block: true }, T: { floor: 'grass', block: true, spawn: 'tree' }, P: { floor: 'path' }, G: { floor: 'path', spawn: 'gate' } };
  const FLOORS = { grass: 'grass', flowers: '#86b04a speck', water: '#3a78b8 glaze', path: '#c8a878 tiles' };

  /* ---- 1. THE ATTRACTIONS: rides (seats, a ride's seconds, the fun it gives) and shops (what they give), each with a
   * price guests weigh against what it is worth to them, an upkeep each midnight, a shape (its moving part a generator
   * stepped through angles: a still picture per step) ---- */
  const KINDS = {
    carousel: { name: 'CAROUSEL', short: 'MERRY', w: 3, h: 3, cost: 600, price: 2, seats: 8, time: 9, fun: .45, upkeep: 25, worth: 3 },
    wheel: { name: 'FERRIS WHEEL', short: 'WHEEL', w: 3, h: 3, cost: 1100, price: 3, seats: 12, time: 14, fun: .55, upkeep: 45, worth: 4 },
    cups: { name: 'TEACUPS', short: 'CUPS', w: 3, h: 3, cost: 800, price: 2, seats: 8, time: 8, fun: .5, upkeep: 30, worth: 3, sick: .25 },
    swings: { name: 'SWING TOWER', short: 'SWING', w: 3, h: 3, cost: 1000, price: 3, seats: 10, time: 11, fun: .6, upkeep: 40, worth: 4, sick: .15 },
    burger: { name: 'BURGERS', short: 'FOOD', shop: true, w: 2, h: 2, cost: 300, price: 4, gives: { hunger: -.8 }, unit: 1.5, upkeep: 10, worth: 5 },
    lemonade: { name: 'LEMONADE', short: 'DRINK', shop: true, w: 2, h: 2, cost: 250, price: 2, gives: { thirst: -.8 }, unit: .5, upkeep: 8, worth: 3 }
  };
  const TOOLS = ['path', 'erase', 'carousel', 'wheel', 'cups', 'swings', 'burger', 'lemonade'];
  const rad = d => d / 180 * Math.PI, ring = (n, f) => Array.from({ length: n }, (_, i) => f(i, i / n * TAU));
  Object.assign(E.SHAPES, {
    'sim-gate': { about: 'the park gate: two brick pillars, a red beam, the sign', mats: {},
      parts: [['mirror','x',['box','brick',[19,0,0],[6,6,30]]], ['mirror','x',['cyl','#f0d050 glaze',[19,0,30],3.5,3,{r2:0}]], ['box','#d04040 glaze',[0,0,25],[44,5,5]], ['box','#fff2a0 none',[0,3,18],[22,1,7]]] },
    'sim-carousel': { about: 'a carousel\'s round platform, its pole', mats: {}, parts: [['cyl','#d8c8a8 tiles',[0,0,0],22,3,{seg:16}], ['cyl','#e8c860 metal',[0,0,3],2.5,22]] },
    'sim-carousel-top': { about: 'a carousel\'s turning part: a striped canopy, gilt poles, horses', mats: {},
      parts: [['cyl','#e04848 cloth',[0,0,24],23,9,{r2:2,seg:16}], ['ring',8,22,['box','#f8f0e0 none',[0,0,23],[3,3,2]]], ['ring',6,15,['cyl','#e8c860 metal',[0,0,3],.7,21]],
        ['ring',6,15,['group',[0,0,8],0,[['box','#f8f4ec none',[0,0,0],[2.5,7,3.5]], ['box','#f8f4ec none',[0,3.5,2.5],[2,2,3.5]], ['box','#8a5a3a none',[0,-3.5,1],[1,1.5,2]]]]]] },
    'sim-wheel': { about: 'a Ferris wheel: two A-frame legs, the rim and spokes at angle a, cars that hang level', mats: {}, params: { a: 0 },
      make: p => { const a = p.a / 24 * TAU, R = 21, H = 36, parts = [['mirror','y',['group',[0,7,0],0,[['box','#c8c8d4 metal',[-13,0,0],[2,2,38],{rot:[0,21,0]}], ['box','#c8c8d4 metal',[13,0,0],[2,2,38],{rot:[0,-21,0]}], ['box','#c8c8d4 metal',[0,0,14],[20,1.5,1.5]]]]], ['box','#b0b0bc metal',[0,0,H - 1],[2,16,2]]];
        for (let i = 0; i < 4; i++) parts.push(['box','#e0e0ea metal',[0,0,H],[2 * R,1,1],{rot:[0,(a / TAU * 360 + i * 45),0]}]);
        ring(16, (i, t) => parts.push(['box','#f0d050 metal',[Math.cos(a + t) * R,0,H + Math.sin(a + t) * R - .5],[2.5,2,1.5]]));
        ring(8, (i, t) => parts.push(['box',['#e04848 glaze','#4878e0 glaze','#48b060 glaze','#f0a030 glaze'][i % 4],[Math.cos(a + t) * R,0,H + Math.sin(a + t) * R - 6],[5,6,5]]));
        return parts; } },
    'sim-cups': { about: 'the teacups: a round floor, a teapot, four cups turning round it at angle a', mats: {}, params: { a: 0 },
      make: p => { const a = p.a / 16 * TAU, parts = [['cyl','#f0e0b8 tiles',[0,0,0],22,2,{seg:16}], ['lathe','#e06060 glaze',[0,0,2],[[0,0],[5,0],[6,5],[4,9],[1,12],[0,12]]]];
        ring(4, (i, t) => parts.push(['lathe',['#f088b0 glaze','#70b8f0 glaze','#f0d060 glaze','#90e090 glaze'][i],[Math.cos(a + t) * 13,Math.sin(a + t) * 13,2],[[0,0],[3,0],[5,2],[5.5,6],[0,6]]]));
        return parts; } },
    'sim-swings': { about: 'a swing tower: a pole, a turning top, chairs flying out as it speeds up (s)', mats: {}, params: { a: 0, s: 0 },
      make: p => { const a = p.a / 16 * TAU, R = 7 + p.s * 4, z = 22 + p.s * 3, parts = [['cyl','#d8d0e0 metal',[0,0,0],4,2], ['cyl','#d8d0e0 metal',[0,0,2],2,40], ['cyl','#5070e0 cloth',[0,0,38],14,6,{r2:3,seg:12}]];
        ring(8, (i, t) => parts.push(['box',i % 2 ? '#f0d050 glaze' : '#e04848 glaze',[Math.cos(a + t) * R,Math.sin(a + t) * R,z],[3,3,1.5]], ['cyl','#c8c8d0 none',[Math.cos(a + t) * R,Math.sin(a + t) * R,z + 1.5],.3,38 - z]));
        return parts; } },
    'sim-burger': { about: 'a burger stand: a plank booth, a striped awning, a burger on the roof', mats: {},
      parts: [['box','#e8d8b8 planks',[0,0,0],[26,20,13]], ['box','#c0402a glaze',[0,10.5,6],[26,2,1.5]], ['wedge','#e85040 cloth',[0,13,13],[28,8,4]],
        ['cyl','#d89040 none',[0,0,13],5,1.5], ['cyl','#5a3020 none',[0,0,14.5],5,1.5], ['ball','#d89040 none',[0,0,16],5,{sz:.5}]] },
    'sim-lemonade': { about: 'a lemonade stand: a booth, a yellow umbrella, a lemon', mats: {},
      parts: [['box','#f4ecd8 planks',[0,0,0],[20,14,10]], ['box','#e8c838 glaze',[0,7.5,5],[20,1,1.5]], ['cyl','#c8c8d0 none',[0,0,10],.6,10], ['cyl','#f0d040 cloth',[0,0,19],13,4,{r2:0,seg:8}], ['ball','#f0e040 glaze',[-6,4,11],2,{sz:.8}]] }
  });
  const GUESTS = [['#e04848', '#3a3a5a'], ['#4878e0', '#c8b890'], ['#48b060', '#3a3a5a'], ['#f0a030', '#5a4a3a'], ['#c060c0', '#3a3a5a'], ['#f0f0f0', '#4878e0'], ['#3ab0b0', '#5a4a3a'], ['#f088b0', '#3a3a5a']];
  const NAMES = ['ANNA', 'BEN', 'CLARA', 'DEV', 'ELLA', 'FINN', 'GUS', 'HANA', 'IVO', 'JUNE', 'KAI', 'LUZ', 'MILO', 'NOOR', 'OTTO', 'PIA', 'RAFE', 'SAGE', 'TEO', 'UMA', 'VERA', 'WES', 'YUKI', 'ZED'];

  let map = null, grid = null, clock = null, guests = [], spots = [], money = 0, rating = 50, fee = 5, tool = null, placing = null, picked = null, overlay = false, auto = false;
  let day = null, ledger = null, msg = null, gate = null, arrive = 0, served = 0, left = [], speed = 1, open = true, boxes = { tools: [], time: [], panel: [], place: [] };
  const say = (s, c = '#fff2c4') => { msg = { s, c, at: game.real }; };   // (a message's time is the player's: it fades at any speed, paused too)
  const isPath = (x, y) => map.floorTags[y * map.w + x] === 'path';
  const cellOf = (x, y) => [Math.floor(x / T), Math.floor(y / T)];
  const spend = (n, why) => { money -= n; ledger.out += n; if (why) ledger[why] = (ledger[why] || 0) + n; };
  const earn = n => { money += n; ledger.in += n; };

  /* ---- 2. THE PARK: the field, the first path, a carousel and a burger stand; the clock at 8:00 on day 1 ---- */
  function start(data) {
    auto = !!(data && data.auto);
    map = new E.TileMap({ rows: ROWS, legend: LEGEND, floorMat: 'grass', floorMats: FLOORS, ao: 0, outside: false });
    grid = new E.Grid(map.w, map.h, { walkable: (x, y) => isPath(x, y) });
    clock = new E.Clock({ day: DAY, hour: 8 }); guests = []; spots = []; money = 5000; rating = 50; fee = 5; tool = null; placing = null; picked = null; overlay = false;
    ledger = { in: 0, out: 0 }; day = { n: 1, log: [] }; msg = null; arrive = 0; served = 0; left = []; speed = 1; open = false;
    const g = map.spawns.filter(s => s.tag === 'gate'); gate = { cx: g[1].cx, cy: g[1].cy, x: g[1].x, y: g[1].y };
    build('carousel', 19, 25, true); build('burger', 24, 29, true);
    game.cam.free = { bounds: [0, 0, map.w * T, map.h * T] }; game.focus(gate.x, gate.y - 90); game.cam.snap = true; game.timeScale = 1;
    game.input.touchEnabled = false; L.enabled = false; A.music(SONG);
    if (!auto) say('SUNNY BAY PARK OPENS AT 9:00', '#ffe8b0');
  }
  // a ride or a shop at corner (cx, cy): on open grass, beside a path (its entrance: the path cell beside it nearest its
  // front); free: the park's first (no cost)
  function fits(kind, cx, cy) {
    const K = KINDS[kind];
    for (let j = 0; j < K.h; j++) for (let i = 0; i < K.w; i++) { const x = cx + i, y = cy + j; if (x < 1 || y < 1 || x >= map.w - 1 || y >= map.h - 1 || !map.walkable(x, y) || isPath(x, y) || spotAt(x, y)) return null; }
    const side = []; for (let i = 0; i < K.w; i++) side.push([cx + i, cy + K.h], [cx + i, cy - 1]); for (let j = 0; j < K.h; j++) side.push([cx + K.w, cy + j], [cx - 1, cy + j]);
    const mid = [cx + K.w / 2 - .5, cy + K.h], door = side.filter(c => isPath(...c)).sort((a, b) => Math.hypot(a[0] - mid[0], a[1] - mid[1]) - Math.hypot(b[0] - mid[0], b[1] - mid[1]))[0];
    return door || null;
  }
  function build(kind, cx, cy, free) {
    const K = KINDS[kind], door = fits(kind, cx, cy);
    if (!door) { if (!auto && !free) { A.sfx('bump'); say(K.shop ? 'A SHOP NEEDS A PATH BESIDE IT, ON OPEN GRASS' : 'A RIDE NEEDS A PATH BESIDE IT, ON OPEN GRASS', '#ffb070'); } return null; }
    if (!free && money < K.cost) { if (!auto) { A.sfx('bump'); say('NOT ENOUGH MONEY', '#ffb070'); } return null; }
    if (!free) spend(K.cost, 'build');
    const s = { kind, K, cx, cy, door, x: (cx + K.w / 2) * T, y: (cy + K.h / 2) * T, price: K.price, queue: [], riders: [], state: 'load', t: 0, spin: 0, v: 0, today: { riders: 0, take: 0 }, total: 0 };
    spots.push(s); if (!auto && !free) { A.sfx('powerup'); say(K.name + ' BUILT', '#a8ffb0'); }
    return s;
  }
  const spotAt = (x, y) => spots.find(s => x >= s.cx && x < s.cx + s.K.w && y >= s.cy && y < s.cy + s.K.h);
  function demolish(s) {
    spots.splice(spots.indexOf(s), 1); money += Math.round(s.K.cost / 2); ledger.in += Math.round(s.K.cost / 2);
    for (const g of [...s.queue, ...s.riders]) { g.at = null; g.state = 'decide'; g.ride = null; g.happy -= .1; g.thought = 'THEY KNOCKED IT DOWN!'; }
    for (const g of guests) if (g.goal === s) { g.goal = null; g.state = 'decide'; }
    if (picked === s) picked = null; A.sfx('explode'); game.particles.dust(s.x, s.y, 4, 12);
  }
  // a path from cell a to cell b, along x then y (a drag's line); each new tile costs 10
  function layPath(a, b) {
    let n = 0; const cells = [];
    for (let x = Math.min(a[0], b[0]); x <= Math.max(a[0], b[0]); x++) cells.push([x, a[1]]);
    for (let y = Math.min(a[1], b[1]); y <= Math.max(a[1], b[1]); y++) cells.push([b[0], y]);
    for (const [x, y] of cells) { if (x < 1 || y < 1 || x >= map.w - 1 || y >= map.h - 1 || !map.walkable(x, y) || isPath(x, y) || spotAt(x, y)) continue; if (money < 10) break; map.setFloor(x, y, 'path'); spend(10, 'build'); n++; }
    if (n && !auto) A.sfx('step'); return n;
  }
  function erase(c) {
    const s = spotAt(...c); if (s) { demolish(s); return; }
    if (!isPath(...c) || (c[0] === gate.cx && c[1] >= gate.cy - 1)) { A.sfx('bump'); return; }
    map.setFloor(c[0], c[1], 'grass'); money += 5; ledger.in += 5; A.sfx('cancel');
    for (const g of guests) g.route = null;   // (every route is walked afresh)
  }

  /* ---- 3. THE GUESTS: in at the gate while it is open (more when the park rates high, fewer when the fee is steep);
   * needs rising (E.needs), the best stop for the walk and the price (E.choose), a queue, a ride, a meal; home when
   * tired, broke or at closing ---- */
  function spawnGuest() {
    const [shirt, pants] = GUESTS[Math.floor(Math.random() * GUESTS.length)], name = NAMES[Math.floor(Math.random() * NAMES.length)];
    const g = { id: ++served, name, x: gate.x + (Math.random() - .5) * 8, y: gate.y, cx: gate.cx, cy: gate.cy, money: 20 + Math.floor(Math.random() * 40), needs: { fun: .5 + Math.random() * .3, hunger: Math.random() * .4, thirst: Math.random() * .4, tired: 0 },
      happy: .65, state: 'decide', goal: null, route: null, wait: 0, face: -Math.PI / 2, thought: 'WHAT A NICE PARK', spent: 0, moving: false,
      rig: new E.Humanoid({ size: .5, hat: Math.random() < .3 ? 'cap' : null, hair: ['short', 'long', 'ponytail', 'spiky'][Math.floor(Math.random() * 4)], weapon: null, outfit: 'shirt', sleeves: 'short',
        colors: { cloth: shirt, pants, hair: ['#2a1a10', '#6a4020', '#d8b060', '#1a1a1a', '#a03020'][Math.floor(Math.random() * 5)], skin: ['#f0c8a0', '#c8946a', '#8a5a3a', '#f4d4b4'][Math.floor(Math.random() * 4)] } }) };
    g.money -= fee; earn(fee); guests.push(g); return g;
  }
  const options = g => spots.filter(s => (s.K.shop || s.queue.length < s.K.seats * 2) && s.price <= g.money).map(s => ({ id: s, x: s.door[0] * T + 8, y: s.door[1] * T + 8, cost: s.price * (s.price > s.K.worth ? 3 : 1),
    gives: s.K.shop ? s.K.gives : { fun: -s.K.fun } }));
  function decide(g) {
    if (!open || g.money < 1 || g.needs.tired > .9) { g.state = 'leave'; g.goal = null; g.route = null; g.thought = !open ? 'TIME TO GO HOME' : g.money < 1 ? 'I\'M OUT OF MONEY' : 'I\'M TIRED'; return; }
    const o = E.choose(g, options(g));
    if (o) { g.goal = o.id; g.route = null; g.state = 'walk'; g.thought = o.id.K.shop ? (o.id.kind === 'burger' ? 'I\'M HUNGRY' : 'I\'M THIRSTY') : 'I WANT TO RIDE THE ' + o.id.K.name; }
    else { g.state = 'wander'; g.goal = null; g.route = null; g.wait = 1 + Math.random() * 3; g.stroll = strollFrom(g); const pricey = spots.some(s => s.price > s.K.worth); g.thought = pricey && Math.random() < .5 ? 'EVERYTHING HERE COSTS TOO MUCH' : 'THERE\'S NOTHING I WANT TO DO'; if (pricey) g.happy -= .05; }
  }
  // a path tile a few steps from a guest (a stroll while nothing appeals)
  function strollFrom(g) { const c = cellOf(g.x, g.y), near = []; for (let y = c[1] - 5; y <= c[1] + 5; y++) for (let x = c[0] - 5; x <= c[0] + 5; x++) if (x > 0 && y > 0 && x < map.w && y < map.h && isPath(x, y) && (x !== c[0] || y !== c[1])) near.push([x, y]); return near.length ? near[Math.floor(Math.random() * near.length)] : null; }
  // a guest's walk: the route of path cells to the goal's door (or the gate), a cell at a time
  function walkTo(g, c, dt) {
    if (!g.route) { const from = cellOf(g.x, g.y); g.route = grid.path(isPath(...from) ? from : [g.cx, g.cy], c); g.ri = 1; if (!g.route.length) { g.route = null; return 'lost'; } }
    const n = g.route[g.ri]; if (!n) return 'there';
    if (!isPath(...n)) { g.route = null; return 'walking'; }
    const tx = n[0] * T + 8 + ((g.id * 37) % 7 - 3), ty = n[1] * T + 8 + ((g.id * 53) % 7 - 3), dx = tx - g.x, dy = ty - g.y, d = Math.hypot(dx, dy), sp = 22 * dt;
    if (d <= sp) { g.x = tx; g.y = ty; g.cx = n[0]; g.cy = n[1]; g.ri++; } else { g.x += dx / d * sp; g.y += dy / d * sp; g.face = Math.atan2(dy, dx); }
    g.moving = true; return 'walking';
  }
  function guestStep(g, dt) {
    g.moving = false;
    if (g.state !== 'ride') E.needs(g, { fun: .012, hunger: .007, thirst: .01, tired: .006 }, dt);
    if (g.needs.hunger > .9 || g.needs.thirst > .9) g.happy = Math.max(0, g.happy - .02 * dt);
    if (g.state === 'decide') decide(g);
    else if (g.state === 'wander') { if (g.stroll && walkTo(g, g.stroll, dt) === 'walking') return; g.stroll = null; if ((g.wait -= dt) <= 0) decide(g); }   // (a stroll to a tile nearby, a look round)
    else if (g.state === 'walk') {
      const s = g.goal; if (!s || !spots.includes(s)) { g.state = 'decide'; return; }
      const r = walkTo(g, s.door, dt); if (r === 'lost') { g.state = 'wander'; g.wait = 3; g.thought = 'I CAN\'T FIND THE WAY'; g.happy -= .05; }
      else if (r === 'there') { g.state = 'queue'; s.queue.push(g); g.wait = 0; }
    } else if (g.state === 'queue') {
      g.wait += dt; if (g.wait > 25 && !g.goal.K.shop) { g.goal.queue.splice(g.goal.queue.indexOf(g), 1); g.state = 'decide'; g.happy -= .1; g.thought = 'THIS LINE IS TOO LONG'; g.needs.fun = Math.min(1, g.needs.fun + .1); }
    } else if (g.state === 'leave') {
      if (walkTo(g, [gate.cx, gate.cy], dt) !== 'walking') { g.gone = true; left.push(g.happy); rating = rating * .97 + g.happy * 100 * .03; }
    }
  }
  // a ride: load (up to its seats, or a few seconds), run (its time), let them off; a shop: serve one a second
  function spotStep(s, dt) {
    s.t += dt;
    if (s.K.shop) { if (s.queue.length && s.t > 1) { s.t = 0; const g = s.queue.shift(); serve(g, s); for (const k in s.K.gives) g.needs[k] = Math.max(0, g.needs[k] + s.K.gives[k]); g.happy = Math.min(1, g.happy + .08); g.thought = s.kind === 'burger' ? 'THAT BURGER WAS GREAT' : 'SO REFRESHING'; spend(s.K.unit); g.state = 'decide'; } return; }
    if (s.state === 'load') {
      while (s.queue.length && s.riders.length < s.K.seats) { const g = s.queue.shift(); s.riders.push(g); g.state = 'ride'; serve(g, s); }
      if (s.riders.length && (s.riders.length >= s.K.seats || s.t > 4)) { s.state = 'run'; s.t = 0; }
      s.v = Math.max(0, s.v - dt * .8);
    } else {
      s.v = s.t < s.K.time - 2 ? Math.min(1, s.v + dt * .6) : Math.max(0, s.v - dt * .6);
      if (s.t >= s.K.time) {
        for (const g of s.riders) { g.needs.fun = Math.max(0, g.needs.fun - s.K.fun); g.needs.tired = Math.min(1, g.needs.tired + .05); g.happy = Math.min(1, g.happy + s.K.fun * .35); g.state = 'decide'; g.thought = s.K.sick && Math.random() < s.K.sick ? 'I FEEL A LITTLE SICK' : 'THAT WAS FUN!'; if (g.thought[0] === 'I') g.happy -= .1; g.x = s.door[0] * T + 8; g.y = s.door[1] * T + 8; }
        s.riders = []; s.state = 'load'; s.t = 0;
      }
    }
    s.spin += s.v * dt * 2.2;
  }
  function serve(g, s) { g.money -= s.price; g.spent += s.price; earn(s.price); s.today.riders++; s.today.take += s.price; s.total += s.price; if (s.price > s.K.worth) { g.happy -= .08; g.thought = 'THE ' + s.K.name + ' COSTS TOO MUCH'; } }

  /* ---- 4. EACH STEP: the HUD's buttons, then the tool (a path, a ride, the eraser) or a look at what is under the
   * pointer; the clock (the night runs fast once the park is empty), the guests, the rides, midnight's books ---- */
  const hitBox = (b, p) => b && p && p[0] >= b.x && p[0] < b.x + b.w && p[1] >= b.y && p[1] < b.y + b.h;
  const groundAt = p => { const h = map.pick(p[0], p[1]); return h ? [h.cx, h.cy] : cellOf(...game.view.toGround(p[0] + game.screen.ix, p[1] + game.screen.iy)); };
  function setSpeed(k) { speed = k; game.timeScale = k; A.sfx(k ? 'select' : 'cancel'); }
  function useTool(t) { tool = tool === t ? null : t; placing = null; picked = null; A.sfx(tool ? 'blip' : 'cancel'); if (tool && KINDS[tool]) say(KINDS[tool].name + ' $' + KINDS[tool].cost + (touch() ? ': TAP WHERE IT GOES, THEN PLACE' : ': CLICK WHERE IT GOES (BESIDE A PATH)'), '#ffe8b0'); else if (tool === 'path') say(touch() ? 'PATH $10: TAP A TILE, OR A LONG PRESS AND A DRAG' : 'PATH $10 A TILE: CLICK, OR DRAG A LINE', '#ffe8b0'); }
  function update(dt) {
    const I = game.input, tap = I.clicked(), p = I.pointer();
    if (!auto) {
      let used = false;
      for (const b of boxes.time) if (hitBox(b, tap)) { setSpeed(b.k); used = true; }
      for (const b of boxes.tools) if (hitBox(b, tap)) { useTool(b.t); used = true; }
      for (const b of boxes.panel) if (hitBox(b, tap)) { panelButton(b.id); used = true; }
      for (const b of boxes.place) if (hitBox(b, tap)) { if (b.id === 'place' && placing) { if (build(tool, placing.cx, placing.cy)) { placing = null; tool = null; } } else { placing = null; tool = null; A.sfx('cancel'); } used = true; }
      if (I.pressed('pause')) setSpeed(speed ? 0 : 1); if (I.pressed('x1')) setSpeed(1); if (I.pressed('x2')) setSpeed(2); if (I.pressed('x4')) setSpeed(4);
      if (I.pressed('toolPath')) useTool('path'); if (I.pressed('toolErase')) useTool('erase'); if (I.pressed('cancel') && tool) useTool(tool);
      const b = I.box();
      if (!used && tool === 'path' && b && b.done) layPath(groundAt(b.from), groundAt(b.to));
      else if (!used && tap && tool === 'path') layPath(groundAt(tap), groundAt(tap));
      else if (!used && tap && tool === 'erase') erase(groundAt(tap));
      else if (tool && KINDS[tool]) {
        const at = !used && (tap || (!touch() && p)) ? groundAt(tap || p) : null, K = KINDS[tool];
        if (at) placing = { cx: at[0] - Math.floor(K.w / 2), cy: at[1] - Math.floor(K.h / 2) };
        if (!used && tap && !touch() && placing && build(tool, placing.cx, placing.cy)) { placing = null; tool = null; }
      } else if (!used && tap) {   // a look: the guest or the attraction under the tap
        const hit = game.r ? game.r.pick(...tap) : []; picked = hit[0] || (spotAt(...groundAt(tap)) || null); if (picked) A.sfx('select');
      }
    }
    simStep(dt);
  }
  function simStep(dt) {
    const was = clock.hour, empty = !guests.length;
    clock.update(dt * (!open && empty ? 6 : 1));   // (the night passes quickly once the park is empty)
    const h = clock.hour; open = h >= 9 && h < 21;
    if (open && h < 20 && guests.length < CAP && spots.length) {   // arrivals: by the rating and the fee
      arrive += dt * (.5 + rating / 100) * Math.min(1.6, .4 + spots.filter(s => !s.K.shop).length * .3) * (fee > 8 ? .6 : 1) * 1.1;
      while (arrive >= 1) { arrive -= 1; spawnGuest(); }
    }
    for (const g of guests) guestStep(g, dt);
    if (guests.some(g => g.gone)) guests = guests.filter(g => !g.gone);
    for (const s of spots) spotStep(s, dt);
    for (const g of guests) { if (!g.rig || !onScreen(g)) continue; g.rig.update(dt, { x: g.x, y: g.y, vx: g.moving ? Math.cos(g.face) * 22 : 0, vy: g.moving ? Math.sin(g.face) * 22 : 0, facing: g.face }); }
    if (was === 23 && h === 0) midnight();
    if (!auto && was !== h && h === 9) { say('THE PARK IS OPEN', '#a8ffb0'); A.sfx('secret'); }
    if (!auto && was !== h && h === 21) say('CLOSING TIME', '#ffd0a0');
  }
  // midnight: each ride's upkeep; the day's books into the log
  function midnight() {
    for (const s of spots) { spend(s.K.upkeep, 'upkeep'); s.today = { riders: 0, take: 0 }; }
    day.log.push({ day: day.n, money: Math.round(money), in: Math.round(ledger.in), out: Math.round(ledger.out), rating: Math.round(rating), guests: served });
    if (!auto) say('DAY ' + day.n + ': TOOK $' + Math.round(ledger.in) + ', SPENT $' + Math.round(ledger.out), ledger.in >= ledger.out ? '#a8ffb0' : '#ffb0a0');
    day.n++; ledger = { in: 0, out: 0 };
  }
  const onScreen = (u, m = 40) => { const q = game.view.p(u.x, u.y, 0), x = q[0] - game.screen.ix, y = q[1] - game.screen.iy; return x > -m && y > -m && x < game.W + m && y < game.H + m * 1.5; };
  function panelButton(id) {
    const s = picked; if (!s || !s.K) return;
    if (id === 'up') s.price = Math.min(20, s.price + 1); else if (id === 'down') s.price = Math.max(0, s.price - 1); else if (id === 'demolish') demolish(s); else if (id === 'close') picked = null;
    A.sfx('select');
  }

  /* ---- 5. DRAWING: the field and paths, the woods, the gate, the rides (their moving parts at this step's angle), the
   * guests (a crowd: each kept two frames of three), the plan of what is being placed, the overlay, night's lights ---- */
  function draw(r) {
    const lt = clock.light(), night = lt.ambient < .6;
    L.enabled = night; if (night) L.ambient = Math.max(.25, lt.ambient);
    map.drawFloor(r); map.queueWalls(r);
    for (const s of map.spawns) if (s.tag === 'tree') r.prop(E.hash2(s.cx, s.cy) < .5 ? 'tree' : 'pine', s.x, s.y, 0);
    r.shape('sim-gate', gate.x, gate.y + 2, 0, { facing: Math.PI / 2 });
    for (const s of spots) {
      const o = { pick: s };
      if (s.kind === 'carousel') { r.shape('sim-carousel', s.x, s.y, 0, o); r.shape('sim-carousel-top', s.x, s.y, 0, { pick: s, facing: s.spin }); }
      else if (s.kind === 'wheel') r.shape('sim-wheel', s.x, s.y, 0, { pick: s, params: { a: Math.floor(s.spin * 24 / TAU / 2) % 24 } });
      else if (s.kind === 'cups') r.shape('sim-cups', s.x, s.y, 0, { pick: s, params: { a: Math.floor(s.spin * 16 / TAU) % 16 } });
      else if (s.kind === 'swings') r.shape('sim-swings', s.x, s.y, 0, { pick: s, params: { a: Math.floor(s.spin * 16 / TAU) % 16, s: Math.round(s.v * 3) } });
      else r.shape('sim-' + s.kind, s.x, s.y, 0, o);
      if (night) game.lights.add(s.x, s.y, 30, 70, .9, { color: s.K.shop ? '#ffd080' : '#ffb0e0' });
      if (picked === s) r.decal(() => r.groundRing(s.x, s.y, s.K.w * 9, '#ffe070', .9));
    }
    if (night) game.lights.add(gate.x, gate.y, 34, 80, 1, { color: '#ffe0a0' });
    for (const g of guests) {
      if (g.state === 'ride') continue;
      r.shadow(g.x, g.y, 3, .3);
      r.actor(g.x, g.y, 0, (gr, ox, oy) => g.rig.draw(gr, ox, oy, r.view), { pick: g, every: 3, key: g });
      if (picked === g) r.decal(() => r.groundRing(g.x, g.y, 6, '#ffe070', .9));
    }
    if (tool && KINDS[tool] && placing) {
      const K = KINDS[tool], ok = !!fits(tool, placing.cx, placing.cy), cells = [];
      for (let j = 0; j < K.h; j++) for (let i = 0; i < K.w; i++) cells.push([placing.cx + i, placing.cy + j]);
      E.tint(r, cells, ok ? '#40e070' : '#ff4040', .45, T);
    }
    if (tool === 'path' || tool === 'erase') { const p = game.input.pointer(); if (p && !touch()) E.tint(r, [groundAt(p)], tool === 'path' ? '#ffe0a0' : '#ff6040', .5, T); }
    if (overlay) { const n = new Map(); for (const g of guests) { const k = Math.floor(g.x / T) + ',' + Math.floor(g.y / T); n.set(k, (n.get(k) || 0) + 1); } E.overlay(r, map, (x, y) => isPath(x, y) ? Math.min(1, (n.get(x + ',' + y) || 0) / 4) : null); }
    hud(r);
  }
  function hud(r) {
    const W = r.W, H = r.H, tc = touch(), th = Math.max(16, Math.ceil(44 * game.screen.dpr / game.screen.S));
    boxes = { tools: [], time: [], panel: [], place: [] };
    r.overlay(g => {
      // money, guests, the rating, the day and hour; the time controls
      E.ui.box(g, 3, 3, 150, 14, { alpha: .8 });
      E.font.text(g, '$' + Math.round(money), 8, 6, money >= 0 ? '#a8ffb0' : '#ff8a7a', { outline: false });
      E.font.text(g, 'GUESTS ' + guests.length, 56, 7, '#c8d8ff', { outline: false, font: 'tiny' });
      E.font.text(g, 'RATING ' + Math.round(rating), 104, 7, rating >= 60 ? '#a8ffb0' : rating >= 35 ? '#ffe070' : '#ff8a7a', { outline: false, font: 'tiny' });
      E.ui.box(g, 156, 3, 64, 14, { alpha: .8 }); E.font.text(g, clock.label(), 188, 7, '#ffe8b0', { align: 'center', outline: false, font: 'tiny' });
      const bw = tc ? th : 20, bh = tc ? th : 14, wide = 223 + 4 * (bw + 2) <= (tc ? cornerX() : W), x0 = wide ? 223 : 3, y0 = wide ? 3 : 20;   // (beside the clock, or under it: the corner's buttons keep the top right)
      [[0, 'II'], [1, '1X'], [2, '2X'], [4, '4X']].forEach(([k, s], i) => { const b = { k, x: x0 + i * (bw + 2), y: y0, w: bw, h: bh }; boxes.time.push(b); E.ui.box(g, b.x, b.y, b.w, b.h, { alpha: .85, bg: speed === k ? '#3a5aa0' : '#1a1a30' }); E.font.text(g, s, b.x + bw / 2, b.y + bh / 2 - 3, '#ffffff', { align: 'center', outline: false, font: 'tiny' }); });
      // the tools: a row along the bottom (two on a narrow screen)
      const cols = W >= 8 * 44 ? 8 : 4, tw = Math.floor((Math.min(W, 8 * 56) - 8) / cols) - 2, tth = tc ? th : 18, rows = 8 / cols, ty0 = H - rows * (tth + 2) - 3;
      TOOLS.forEach((t, i) => {
        const b = { t, x: 4 + (i % cols) * (tw + 2), y: ty0 + Math.floor(i / cols) * (tth + 2), w: tw, h: tth }, K = KINDS[t], on = tool === t, poor = K && money < K.cost;
        boxes.tools.push(b); E.ui.box(g, b.x, b.y, b.w, b.h, { alpha: .88, bg: on ? '#3a6a3a' : poor ? '#1a1828' : '#22284a' });
        E.font.text(g, K ? K.short : t.toUpperCase(), b.x + tw / 2, b.y + tth / 2 - (K ? 6 : 3), poor ? '#6a6680' : '#ffffff', { align: 'center', outline: false, font: 'tiny' });
        if (K) E.font.text(g, '$' + K.cost, b.x + tw / 2, b.y + tth / 2 + 1, poor ? '#6a6680' : '#ffd860', { align: 'center', outline: false, font: 'tiny' });
      });
      // PLACE and CANCEL (touch, a ride's plan shown)
      if (tc && tool && KINDS[tool] && placing) [['place', 'PLACE'], ['cancel', 'CANCEL']].forEach(([id, s], i) => { const b = { id, x: W / 2 - 64 + i * 66, y: ty0 - th - 4, w: 62, h: th }; boxes.place.push(b); E.ui.box(g, b.x, b.y, b.w, b.h, { alpha: .9, bg: i ? '#3a1a1a' : '#2a5a3a' }); E.font.text(g, s, b.x + 31, b.y + th / 2 - 3, '#ffffff', { align: 'center', outline: false }); });
      // what is picked: a ride's price, riders and takings (PRICE - +, DEMOLISH), or a guest's mind
      if (picked) panel(g, picked, W, ty0, tc, th);
      if (msg && game.real - msg.at < 3.5) E.font.text(g, msg.s, W / 2, 22, msg.c, { align: 'center', shadow: '#000', outline: false });
    });
    // a tooltip under the mouse (a ride or a guest)
    const p = game.input.pointer();
    if (p && !tc && !tool) { const o = r.pick(...p)[0]; if (o) E.tooltip(r, p[0], p[1], o.K ? [o.K.name, '$' + o.price + '  ' + (o.K.shop ? 'SERVED ' : 'RIDERS ') + o.today.riders] : [o.name, o.thought]); }
  }
  function panel(g, o, W, ty0, tc, th) {
    const x = 4, w = 168, bh = tc ? Math.min(th, 22) : 12, h = o.K ? 42 + bh : 50, y = ty0 - h - 4;
    E.ui.box(g, x, y, w, h, { alpha: .9 });
    if (o.K) {
      E.font.text(g, o.K.name, x + 5, y + 4, '#ffe8b0', { outline: false });
      E.font.text(g, (o.K.shop ? 'SERVED ' : 'RIDERS ') + o.today.riders + ' TODAY   $' + o.today.take + '   (' + (o.queue.length) + ' WAITING)', x + 5, y + 15, '#c8c0d8', { outline: false, font: 'tiny' });
      E.font.text(g, 'PRICE $' + o.price + (o.price > o.K.worth ? '  TOO DEAR' : ''), x + 5, y + 26, o.price > o.K.worth ? '#ffb070' : '#a8ffb0', { outline: false });
      [['down', '-'], ['up', '+'], ['demolish', 'KNOCK DOWN'], ['close', 'X']].forEach(([id, s], i) => {
        const b = { id, x: x + 5 + [0, 26, 52, 136][i], y: y + h - bh - 4, w: [22, 22, 80, 24][i], h: bh }; boxes.panel.push(b);
        E.ui.box(g, b.x, b.y, b.w, b.h, { alpha: .9, bg: id === 'demolish' ? '#5a2020' : '#2a3a7a' }); E.font.text(g, s, b.x + b.w / 2, b.y + b.h / 2 - 3, '#ffffff', { align: 'center', outline: false, font: 'tiny' }); });
    } else {
      E.font.text(g, o.name + '   $' + o.money, x + 5, y + 4, '#ffe8b0', { outline: false });
      E.font.text(g, '"' + o.thought + '"', x + 5, y + 15, '#ffffff', { outline: false, font: 'tiny' });
      [['FUN', 1 - o.needs.fun], ['FOOD', 1 - o.needs.hunger], ['DRINK', 1 - o.needs.thirst], ['HAPPY', o.happy]].forEach(([s, v], i) => { const bx = x + 5 + (i % 2) * 80, by = y + 26 + Math.floor(i / 2) * 9; E.font.text(g, s, bx, by, '#a8a0c0', { outline: false, font: 'tiny' }); E.ui.bar(g, bx + 30, by + 1, 40, 3, Math.max(0, v), v > .5 ? '#5ad86a' : v > .25 ? '#ffd060' : '#ff4a4a'); });
      const b = { id: 'close', x: x + w - 18, y: y + 3, w: 14, h: tc ? Math.min(th, 16) : 10 }; boxes.panel.push(b); E.font.text(g, 'X', b.x + 7, b.y + 1, '#ffffff', { align: 'center', outline: false, font: 'tiny' });
    }
  }

  /* ---- 6. THE BOT: lays out a park through the calls the HUD makes (paths, four rides and two shops), then runs ten
   * days at 4x: its money each midnight, the guests served, the rating (tools/kits-test.mjs) ---- */
  function bot(o = {}) {
    const was = Math.random;
    try {
      Math.random = E.rng(o.seed || 3);
      game.time = 0; game.timeScale = 1; game.go('sim', { auto: true }, { fade: 0 }); game.advance(1 / 120);
      layPath([22, 27], [22, 20]); layPath([12, 20], [32, 20]); layPath([12, 20], [12, 28]); layPath([32, 20], [32, 28]); layPath([12, 28], [18, 28]); layPath([27, 28], [32, 28]);
      [build('wheel', 13, 17), build('cups', 24, 17), build('swings', 28, 21), build('lemonade', 14, 21), build('lemonade', 29, 29), build('burger', 10, 24)];
      game.timeScale = 4;
      for (let i = 0; i < 30 * DAY * 11 && day.n <= 10; i++) game.advance(1 / 30);
      game.timeScale = 1;
      const m = day.log.map(d => d.money);
      return { days: day.log.length, built: spots.length, money: m, low: Math.min(...m), high: Math.max(...m), served, rating: Math.round(rating), left: left.length, happy: left.length ? Math.round(left.reduce((a, b) => a + b, 0) / left.length * 100) : 0, errors: game.errors.length };
    } finally { Math.random = was; }
  }

  return { view: 'iso', views: ['iso'], res: 'ps1', pausable: true, propSize: 1, touch: [], camera: { zoom: [.6, 1.8], start: 1, tall: 1.2 },
    input: { ...E.Input.DEFAULT, pause: ['Space'], x1: ['Digit1'], x2: ['Digit2'], x4: ['Digit3'], toolPath: ['KeyQ'], toolErase: ['KeyE'], cancel: ['Escape', 'Mouse2'] },
    enter: start, update, draw, bot,
    exit() { game.cam.free = null; game.input.touchEnabled = true; game.timeScale = 1; L.enabled = false; game.resetCamera(); },
    back() { if (tool || picked) { tool = null; placing = null; picked = null; return true; } return false; },
    /** for tests: the park's state, a cell's or a thing's place on the screen, the HUD's boxes, the calls the HUD makes */
    state: () => ({ money, rating, guests, spots, tool, placing, picked, boxes, clock, day, speed, open, overlay, map,
      at: (x, y) => { const q = game.view.p(x, y, 0); return [q[0] - game.screen.ix, q[1] - game.screen.iy]; }, isPath, fits, build, layPath, setOverlay: v => { overlay = v; } }),
    /** the proof: the park's first hours at 4x (key 3), a pause and on again; the guests' places, money and needs, the
     *  rides' states, hashed */
    run: (n = 1800) => proof('sim', n, (i, k) => { if (i === 20) k.tap('x4'); if (i === 1400) k.tap('pause'); if (i === 1500) k.tap('x2'); },
      () => [Math.round(money), Math.round(rating), clock.label(), guests.map(g => [g.id, Math.round(g.x), Math.round(g.y), g.state, Math.round(g.happy * 100)]), spots.map(s => [s.kind, s.state, s.today.riders])]) };
})();
scenes.sim = SIM;
