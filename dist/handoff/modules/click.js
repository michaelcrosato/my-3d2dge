/*!
my-3D2dge module CLICK v0.79.0: point-and-click adventures: walk areas with holes, depth, hotspots, verbs, an inventory
https://github.com/michaelcrosato/my-3d2dge (MIT License)
Loads after: the full engine only. Needs: no other module.

Monkey Island's, Day of the Tentacle's and Broken Sword's rooms: a picture the hero walks about by clicks and taps (talk
through story's E.Story when one is given).
- new E.Walkbox(outline, holes = []) (polygons of [x, y], room pixels): wb.inside(x, y), wb.nearest(x, y) (the closest
  point you can stand on), wb.path(a, b) -> [a, ..., b] (the shortest way round the holes: A* over the corners, then
  straight where nothing is in the way).
- const pc = new E.Click(game, { rooms, items, rules, hero: { rig, speed: 60 }, ui: 'verbs' | 'icons' | 'coin' | 'two',
  story, room: 'dock', at: [x, y], on: { enter(pc, room), done(pc, verb, item, target) } }).
  rooms[id]: { w, h (room pixels; wider than the screen scrolls), paint(g) (the backdrop, painted once), pad: pixels
  painted past each side, or [x, y] (past the sides, above and below: a bigger screen shows them; a tall one zooms the
  room), walk: [outline, ...holes] or a Walkbox, depth: [yFar, kFar, yNear, kNear] (a body's scale by its feet's y),
  hotspots: [...], things: [{ y, draw(g, x, y) }] (drawn by depth, not clicked), front(g, x, y) (over it all) }.
  A hotspot: { id, name, rect: [x, y, w, h] | poly | actor (anything with x, y, rig: drawn by depth), at: [x, y]
  (where the hero stands), face: 'left' | 'right' | 'up' | 'down', y (its baseline: drawn over the hero behind it),
  draw(g, x, y) (a thing in the room: its picture at its place), exit: 'room' (and enter: [x, y] there), if (shown
  while it holds), look / talk / use / pickup / open / close / push / pull / give: a line the hero says, a function
  (pc, item), or a rule's actions, default: the verb a plain click does (two buttons: talk for people, pick up what can
  be, else use) }.
  items[id]: { name, look, icon: a sprite or (g, x, y, size) }. rules: [{ verb, item, on (a hotspot or an item), if,
  say: 'line' | [lines], give, take, set (story vars), talk (a story node), go: [room, x, y], do(pc) }]: the first that
  matches runs; else the hotspot's own verb; else a line ("I can't pick that up.").
- pc.update(dt) each step; pc.draw(r) after the scene (the room, bodies and things by depth, the hero's line over him,
  the sentence line, the verbs or the coin, the inventory). pc.busy: true while a fade, a line, a talk or a walk is
  under way. pc.room, pc.hero ({ x, y, k, face, path }), pc.inv (item ids), pc.give(id), pc.take(id), pc.has(id),
  pc.say(lines, who), pc.go(room, [x, y]), pc.walkTo(x, y, then), pc.act(verb, target, item) (what a click does),
  pc.panel = false (the verbs hidden: a cutscene), pc.state() / pc.restore(s), pc.end() (on leaving: the cursor back).
  For tests and bots: pc.where(id) and pc.screen(x, y) (screen points), pc.boxes (the buttons drawn last frame).
- The interfaces: 'verbs' (SCUMM's nine: a verb, then what; USE and GIVE take an item first), 'icons' (Sierra's: WALK,
  LOOK, HAND, TALK; a right click turns the cursor), 'coin' (a click, or a long press, on a hotspot opens its verbs over
  the pointer), 'two' (a click does the default, a right click looks). The right click is the input's look action:
  bind look: ['Mouse2']. The cursor is a hand over a hotspot, its name beside it. An item in the inventory goes on the
  cursor: "Use rope with hook" (an item on an item works either way round; on someone, a give rule). A double click
  runs. Touch: a tap walks; a tap on a hotspot opens its verbs; the inventory by taps, a thumb's size; a long press
  looks.

```js click
const E = My3D2dge, game = new E.Game({ headless: true });
const wb = new E.Walkbox([[0, 100], [300, 100], [300, 200], [0, 200]], [[[120, 110], [180, 110], [180, 190], [120, 190]]]);
const p = wb.path([20, 150], [280, 150]);
if (p.length < 3 || p.some(q => !wb.inside(q[0], q[1]) && q !== p[0])) throw new Error('round the hole');
const pc = new E.Click(game, { rooms: { yard: { w: 320, h: 200, walk: wb, hotspots: [{ id: 'key', name: 'KEY', rect: [250, 140, 10, 10], at: [240, 150], pickup: { give: 'key', say: 'Got it.' } }] } },
  items: { key: { name: 'KEY' } }, room: 'yard', at: [20, 150] });
game.start({ update(dt) { pc.update(dt); }, draw(r) { pc.draw(r); } });
pc.act('pickup', 'key'); game.advance(8);
if (!pc.has('key')) throw new Error('picked up');
```
Rules: a room's picture is the game's (paint it in room pixels); keep puzzles as rules (data); talk goes through story
(its nodes, choices and flags: rules test them with if).
*/
(function (E) {
'use strict';
if (!E) throw new Error('my-3D2dge module CLICK: load engine/my-3d2dge.js (the full engine) first');
const { clamp } = E, hyp = Math.hypot, px = E.px;

/* =============================================================================
 * WALKBOX  a polygon you walk in, with holes: inside, the nearest point, the shortest path round the holes
 * ========================================================================== */
// does segment a-b cross segment c-d (properly: touching at an end doesn't count)
const cross = (a, b, c, d) => { const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]), d1 = o(c, d, a), d2 = o(c, d, b), d3 = o(a, b, c), d4 = o(a, b, d); return ((d1 > 1e-9 && d2 < -1e-9) || (d1 < -1e-9 && d2 > 1e-9)) && ((d3 > 1e-9 && d4 < -1e-9) || (d3 < -1e-9 && d4 > 1e-9)); };
const inPoly = (P, x, y) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };
class Walkbox {
  /** new E.Walkbox(outline, holes): polygons of [x, y] (room pixels); holes are places inside it no one stands */
  constructor(outline, holes = []) {
    /** outline: the area's edge; holes: its holes; edges: every side of both, as [a, b]; nodes: the corners a path may
     *  turn at */
    this.outline = outline; this.holes = holes; this.edges = [];
    for (const P of [outline, ...holes]) for (let i = 0; i < P.length; i++) this.edges.push([P[i], P[(i + 1) % P.length]]);
    // the corners a shortest path turns at: the outline's inward-pointing ones and every hole's outward one, set a pixel off
    this.nodes = [];
    const add = (P, hole) => P.forEach((p, i) => {
      const a = P[(i + P.length - 1) % P.length], b = P[(i + 1) % P.length], ux = p[0] - a[0], uy = p[1] - a[1], vx = b[0] - p[0], vy = b[1] - p[1];
      const nx = (a[0] - p[0]) / (hyp(ux, uy) || 1) + (b[0] - p[0]) / (hyp(vx, vy) || 1), ny = (a[1] - p[1]) / (hyp(ux, uy) || 1) + (b[1] - p[1]) / (hyp(vx, vy) || 1), l = hyp(nx, ny) || 1;
      for (const s of [-1.5, 1.5]) { const q = [p[0] + nx / l * s, p[1] + ny / l * s]; if (this.inside(q[0], q[1])) { this.nodes.push(q); break; } }
    });
    add(outline, false); for (const h of holes) add(h, true);
    this._links = null;
  }
  /** is (x, y) in the area and in none of its holes? */
  inside(x, y) { return inPoly(this.outline, x, y) && !this.holes.some(h => inPoly(h, x, y)); }
  /** the point you can stand on nearest (x, y): itself when inside, else the nearest on an edge (a pixel in) */
  nearest(x, y) {
    if (this.inside(x, y)) return [x, y];
    let best = null, bd = Infinity;
    for (const [a, b] of this.edges) {
      const dx = b[0] - a[0], dy = b[1] - a[1], t = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1), 0, 1), q = [a[0] + dx * t, a[1] + dy * t], d = hyp(q[0] - x, q[1] - y);
      if (d < bd) { bd = d; best = q; }
    }
    for (const r of [1, 2, 3]) for (const [ox, oy] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, -r], [r, -r], [-r, r]]) if (this.inside(best[0] + ox, best[1] + oy)) return [best[0] + ox, best[1] + oy];
    return best;
  }
  /** can one walk straight from a to b? (it crosses no edge, and its middle is inside) */
  sees(a, b) { if (this.edges.some(([c, d]) => cross(a, b, c, d))) return false; return this.inside((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
  /** the shortest way from a to b (b moved to the nearest point inside): [a, ..., b], round the holes */
  path(a, b) {
    a = this.nearest(...a); b = this.nearest(...b);
    if (this.sees(a, b)) return [a, b];
    const N = this.nodes; if (!this._links) this._links = N.map((p, i) => N.map((q, j) => j !== i && this.sees(p, q) ? hyp(p[0] - q[0], p[1] - q[1]) : -1));
    const all = [...N, a, b], A = N.length, B = N.length + 1, link = (i, j) => i < A && j < A ? this._links[i][j] : this.sees(all[i], all[j]) ? hyp(all[i][0] - all[j][0], all[i][1] - all[j][1]) : -1;
    const g = new Array(all.length).fill(Infinity), from = new Array(all.length).fill(-1), open = new Set([A]); g[A] = 0;
    const h = i => hyp(all[i][0] - b[0], all[i][1] - b[1]);
    while (open.size) {
      let cur = -1, cf = Infinity; for (const i of open) { const f = g[i] + h(i); if (f < cf) { cf = f; cur = i; } }
      if (cur === B) break; open.delete(cur);
      for (let j = 0; j < all.length; j++) { if (j === A || j === cur) continue; const w = link(cur, j); if (w < 0) continue; if (g[cur] + w < g[j] - 1e-9) { g[j] = g[cur] + w; from[j] = cur; open.add(j); } }
    }
    if (from[B] < 0) return [a];   // no way there
    const out = []; for (let i = B; i >= 0; i = from[i]) out.unshift(all[i]);
    return out;
  }
}
E.Walkbox = Walkbox;

/* =============================================================================
 * CLICK  rooms, the hero, hotspots, verbs, the inventory, rules; drawn over the screen in room pixels
 * ========================================================================== */
const VERBS = [['give', 'GIVE'], ['pickup', 'PICK UP'], ['use', 'USE'], ['open', 'OPEN'], ['look', 'LOOK AT'], ['push', 'PUSH'], ['close', 'CLOSE'], ['talk', 'TALK TO'], ['pull', 'PULL']];
const ICONS = [['walk', 'WALK'], ['look', 'LOOK'], ['hand', 'HAND'], ['talk', 'TALK']], ICON = Object.fromEntries(ICONS);   // (Sierra's cursor: a right click turns it)
const VERB = Object.fromEntries(VERBS), COIN = [['look', 'LOOK'], ['talk', 'TALK'], ['use', 'USE']];
// Sierra's icons, drawn: feet, an eye, a hand, a mouth
const PICS = { walk: ['..KK...', '.KSSK..', '.KSSK..', '..KK.KK', '....KSSK', '....KSSK', '.....KK'], look: ['..KKKKK..', '.KWWWWWK.', 'KWWBBBWWK', 'KWWBKBWWK', '.KWWWWWK.', '..KKKKK..'],
  hand: ['..K.K.K..', '.KSKSKSK.', '.KSKSKSKK', '.KSSSSSKS', 'KKSSSSSSK', 'KSSSSSSK.', '.KSSSSK..', '..KKKK...'], talk: ['.KKKKKK.', 'KRRRRRRK', 'KRWWWWRK', 'KRKKKKRK', 'KRRRRRRK', '.KKKKKK.'] };
const PAINTED = new WeakMap();   // each room's picture, painted once (a room kept between games keeps it)
const PAL = { K: '#1a1420', S: '#f0c8a0', W: '#ffffff', B: '#3a6ad8', R: '#c83a4a' };
const NO = { look: n => 'It\'s ' + n.toLowerCase() + '.', pickup: () => 'I can\'t pick that up.', use: () => 'I can\'t use that.', talk: () => 'It doesn\'t say much.', give: () => 'I\'d rather keep it.', open: () => 'It doesn\'t open.', close: () => 'It doesn\'t close.', push: () => 'It won\'t budge.', pull: () => 'It won\'t budge.', with: () => 'That doesn\'t work.' };
class Click {
  /** new E.Click(game, { rooms, items, rules, hero, ui, story, room, at, on }): see the manual */
  constructor(game, o = {}) {
    /** game: the game; rooms: the rooms by id; items: the items by id; rules: the rules (data); on: its events */
    this.game = game; this.rooms = o.rooms || {}; this.items = o.items || {}; this.rules = o.rules || []; this.on = o.on || {};
    /** ui: 'verbs' | 'coin' | 'two'; story: the E.Story that talks (or null) */
    this.ui = o.ui || 'verbs'; this.story = o.story || null;
    /** the hero: { x, y, rig, speed, face (radians: 0 right), k (its scale), path, room } */
    this.hero = Object.assign({ x: 0, y: 0, speed: 60, face: Math.PI / 2, k: 1, path: null }, o.hero || {});
    /** inv: the items held, by id; verb: the verb chosen ('walk' when none); item: the item on the cursor (or null);
     *  line: the line being said ({ lines, i, who }, or null); room: the room's id; boxes: the panel's and the coin's
     *  buttons in the last frame ({ id: 'verb:look' | 'icon:hand' | 'item:rope' | 'coin:use' | 'inv:<', x, y, w, h }:
     *  screen pixels, for tests and bots); panel: false hides the verbs and the inventory, keeping their place (a cutscene) */
    this.inv = []; this.verb = 'walk'; this.item = null; this.line = null; this.room = null; this.boxes = []; this.panel = true;
    this._then = null; this._fade = 0; this._views = new Map(); this._coin = null; this._hover = null; this._scroll = 0; this._invAt = 0;
    for (const id in this.rooms) { const R = this.rooms[id]; if (R.walk && !(R.walk instanceof Walkbox)) R.walk = new Walkbox(R.walk[0], R.walk.slice(1)); }
    if (o.room) this.go(o.room, o.at, true);
  }
  /* ---- the inventory ---- */
  /** add an item */
  give(id) { if (!this.inv.includes(id)) this.inv.push(id); }
  /** take an item away */
  take(id) { this.inv = this.inv.filter(i => i !== id); if (this.item === id) this.item = null; }
  /** is the item held? */
  has(id) { return this.inv.includes(id); }
  /* ---- rooms and walking ---- */
  /** to room id, the hero at at (or the room's start), with a fade (now: none) */
  go(id, at, now) {
    const R = this.rooms[id]; if (!R) throw new Error('E.Click: no room "' + id + '"');
    const swap = () => { this.room = id; const p = at || R.start || [R.w / 2, R.h * .8]; [this.hero.x, this.hero.y] = R.walk ? R.walk.nearest(p[0], p[1]) : p; this.hero.path = null; this._then = null; this._scroll = null; if (this.on.enter) this.on.enter(this, id); if (R.enter) R.enter(this); };
    if (now) swap(); else { this._fade = .0001; this._swap = swap; }
  }
  /** walk to (x, y) (the nearest point you can stand on), then(pc) when there; run: twice the speed */
  walkTo(x, y, then, run) { const R = this.rooms[this.room]; this.hero.path = R.walk ? R.walk.path([this.hero.x, this.hero.y], [x, y]).slice(1) : [[x, y]]; this.hero.run = !!run; this._then = then || null; }
  /** a body's scale where its feet are (the room's depth: [yFar, kFar, yNear, kNear]) */
  scaleAt(y) { const d = this.rooms[this.room].depth; if (!d) return 1; return clamp(d[1] + (d[3] - d[1]) * (y - d[0]) / (d[2] - d[0] || 1), Math.min(d[1], d[3]), Math.max(d[1], d[3])); }
  /** the hero says lines (over his head; a line's time by its length); who: anything with x, y and k to speak instead */
  say(lines, who) { const L = Array.isArray(lines) ? lines : [lines]; this.line = { lines: L, i: 0, t: 0, who: who || this.hero }; }
  /* ---- what a click does ---- */
  _spot(id) { const R = this.rooms[this.room]; return (R.hotspots || []).find(h => h.id === id && (!h.if || this._test(h.if))); }
  _test(c) { return typeof c === 'function' ? c(this) : this.story ? this.story.test(c) : true; }
  /** do verb on target (a hotspot's id, or an item's: in the inventory), with item (held) or not: the hero walks there
   *  first (a hotspot), then the first rule that matches, else the hotspot's own, else a line. Tests and bots call it */
  act(verb, target, item = null) {
    const spot = this._spot(target), inInv = !spot && this.has(target);
    if (!spot && !inInv) return false;
    const run = () => {
      if (spot && spot.face) this.hero.face = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[spot.face];
      if (verb === 'walk' && spot && spot.exit) { this.go(spot.exit, spot.enter); return; }
      const fits = (v, it, on) => r => (r.verb || 'use') === v && (r.item || null) === (it || null) && r.on === on && (!r.if || this._test(r.if));
      // (an item on an item: either way round; an item used on someone: given)
      const rule = this.rules.find(fits(verb, item, target)) || (item && inInv && this.rules.find(fits(verb, target, item))) || (item && verb === 'use' && this.rules.find(fits('give', item, target)));
      const own = !item && spot && spot[verb];
      if (rule) this._do(rule); else if (typeof own === 'function') own(this, item); else if (typeof own === 'string' || Array.isArray(own)) this.say(own);
      else if (own) this._do(own);
      else if (verb === 'look' && inInv) this.say(this.items[target].look || NO.look('a ' + this.items[target].name));
      else this.say(item ? NO.with() : (NO[verb] || NO.use)(spot ? spot.name : ''));
      if (this.on.done) this.on.done(this, verb, item, target);
    };
    this.item = null; this.verb = 'walk';
    if (spot && spot.at && !inInv) this.walkTo(spot.at[0], spot.at[1], run); else run();
    return true;
  }
  // what a plain click does to a hotspot (two-button), and the hand (Sierra's icons)
  _def(h) { return h.default || (h.exit ? 'walk' : h.actor || h.talk ? 'talk' : this._hand(h)); }
  _hand(h) { return h.pickup || this.rules.some(r => r.verb === 'pickup' && r.on === h.id) ? 'pickup' : 'use'; }
  // a rule's or a hotspot's actions
  _do(a) {
    if (a.take) for (const t of [].concat(a.take)) this.take(t);
    if (a.give) for (const t of [].concat(a.give)) this.give(t);
    if (a.set && this.story) { if (typeof a.set === 'string') this.story.set(a.set); else for (const k in a.set) this.story.set(k, a.set[k]); }
    if (a.say) this.say(a.say);
    if (a.talk && this.story) this.story.run(a.talk);
    if (a.go) this.go(a.go[0], [a.go[1], a.go[2]]);
    if (a.do) a.do(this);
  }
  /** a room point on the screen: [x, y] in screen pixels (the room scrolled or centred above the panel) */
  screen(x, y) { const L = this._layout(); return [Math.round(x * L.z + L.ox), Math.round(y * L.z + L.oy)]; }
  /** where a hotspot is on the screen: [x, y] (its middle; an actor's chest), or null (not in this room, or hidden) */
  where(id) {
    const h = this._spot(id); if (!h) return null;
    const k = h.actor && this.scaleAt(h.actor.y), p = h.rect ? [h.rect[0] + h.rect[2] / 2, h.rect[1] + h.rect[3] / 2] : h.poly ? h.poly.reduce((a, q) => [a[0] + q[0] / h.poly.length, a[1] + q[1] / h.poly.length], [0, 0]) : [h.actor.x, h.actor.y - 20 * k];
    return this.screen(p[0], p[1]);
  }
  /** what is under a room point: an inventory item never; a hotspot (the nearest-drawn), or null */
  at(x, y) {
    const R = this.rooms[this.room]; let best = null;
    for (const h of R.hotspots || []) {
      if (h.if && !this._test(h.if)) continue;
      const hit = h.rect ? x >= h.rect[0] && x < h.rect[0] + h.rect[2] && y >= h.rect[1] && y < h.rect[1] + h.rect[3] : h.poly ? inPoly(h.poly, x, y) : h.actor ? (k => Math.abs(x - h.actor.x) < 10 * k && y < h.actor.y + 3 && y > h.actor.y - (h.actor.h || 48) * k)(this.scaleAt(h.actor.y)) : false;
      if (hit && (!best || (h.y || 0) >= (best.y || 0))) best = h;
    }
    return best;
  }
  /* ---- each step ---- */
  /** read the pointer and keys, walk the hero, run the talk and the hero's line; true while play should wait */
  update(dt) {
    const G = this.game, I = G.input, R = this.rooms[this.room], H = this.hero;
    if (this._fade) { this._fade += dt * 4; if (this._fade >= 1 && this._swap) { this._swap(); this._swap = null; } if (this._fade >= 2) this._fade = 0; return true; }
    if (this.line) { const L = this.line; L.t += dt; if (L.t > 1 + L.lines[L.i].length * .05 || (L.t > .3 && (I.clicked() || I.pressed('confirm')))) { L.i++; L.t = 0; if (L.i >= L.lines.length) this.line = null; } }
    const talking = this.story && this.story.running && this.story.update(dt);
    // the hero's walk
    H.k = this.scaleAt(H.y); H.moving = false;
    if (H.path && H.path.length) {
      const [tx, ty] = H.path[0], dx = tx - H.x, dy = ty - H.y, d = hyp(dx, dy), sp = H.speed * H.k * (H.run ? 2 : 1) * dt;
      if (Math.abs(dx) > .5 || Math.abs(dy) > .5) H.face = Math.abs(dx) > Math.abs(dy) * .6 ? (dx > 0 ? 0 : Math.PI) : (dy > 0 ? Math.PI / 2 : -Math.PI / 2);
      if (d <= sp) { H.x = tx; H.y = ty; H.path.shift(); } else { H.x += dx / d * sp; H.y += dy / d * sp; }
      H.moving = true;
      if (!H.path.length) { H.path = null; if (this._then) { const t = this._then; this._then = null; t(this); } }
    }
    this._scroll = this._scroll === null ? this._want() : this._scroll + (this._want() - this._scroll) * (1 - Math.pow(.88, dt * 60));   // (the view follows him, eased)
    if (H.rig) H.rig.update(dt, { x: H.x, y: H.y * 2, vx: H.moving ? Math.cos(H.face) * 40 * (H.run ? 2 : 1) : 0, vy: H.moving ? Math.sin(H.face) * 40 * (H.run ? 2 : 1) : 0, facing: H.face });
    for (const h of R.hotspots || []) if (h.actor && h.actor.rig) h.actor.rig.update(dt, { x: h.actor.x, y: h.actor.y * 2, facing: h.actor.face !== undefined ? h.actor.face : Math.PI / 2, pose: h.actor.pose, expr: h.actor.expr });
    if (talking || this.line) return true;
    if (this.panel) this._input(I);
    return !!this._then;
  }
  // how far a wide room scrolls to keep the hero in the middle
  _want() { const R = this.rooms[this.room], W = this.game.W / this._zoom(); return clamp(this.hero.x - W / 2, 0, Math.max(0, R.w - W)); }
  // a tall screen (a phone held upright) shows the room at a whole zoom, keeping at least 180 room pixels across
  _zoom() { const G = this.game; return Math.max(1, Math.min(Math.floor((G.H - this._panelH()) / this.rooms[this.room].h), Math.floor(G.W / 180))); }
  _panelH() { return this.game.input.lastDevice === 'touch' ? this._thumb() + 14 : this.ui === 'verbs' ? 56 : 30; }
  // the screen's layout: the panel along the bottom, the room over it (scrolled to the hero, or centred)
  _layout() {
    const G = this.game, W = G.W, Hs = G.H, R = this.rooms[this.room], panel = this._panelH(), py = Hs - panel, z = this._zoom(), rh = Math.min(R.h * z, py), oy = Math.max(0, Math.floor((py - rh) / 2 / z)) * z;
    if (this._scroll === null) this._scroll = this._want();
    const ox = R.w * z > W ? -Math.round(this._scroll) * z : Math.floor((W - R.w * z) / 2 / z) * z;
    return { W, H: Hs, ox, oy, z, rw: R.w, rh, py, panel };
  }
  // the pointer: hover labels; clicks on the room, the verbs, the inventory, the coin
  _input(I) {
    const L = this._layout(), touch = I.lastDevice === 'touch', p = I.pointer(), c = I.clicked(), right = !!(I.map.look && I.pressed('look')), drop = I.pressed('cancel'), lp = I.longPress(), d2 = I.doubleTap();
    const toRoom = q => q && q[1] >= L.oy && q[1] < L.py ? [(q[0] - L.ox) / L.z, (q[1] - L.oy) / L.z] : null;
    const hp = toRoom(p); this._hover = hp && !touch ? this.at(...hp) : null;
    const cv = this.game.screen.canvas; if (cv && cv.style) cv.style.cursor = touch ? '' : this._hover ? 'pointer' : 'crosshair';
    // a long press's own release is no tap (it looked already); a drag ends it too
    if (lp) this._lp = lp; else if (I.box() || I.pan()) this._lp = null;
    if (c && this._lp) { const was = this._lp; this._lp = null; if (hyp(c[0] - was[0], c[1] - was[1]) < 12) return; }
    // a click on a box (a verb, an inventory slot, a coin's verb, a scroll arrow)
    if (c) { const b = this.boxes.find(b => c[0] >= b.x && c[0] < b.x + b.w && c[1] >= b.y && c[1] < b.y + b.h); if (b) { this._coin = null; b.fn(); return; } }
    if (this._coin && c) { this._coin = null; return; }   // (a click away closes the coin)
    if ((right || drop) && this.item) { this.item = null; return; }
    if (right && this.ui === 'icons') { const i = ICONS.findIndex(v => v[0] === this.verb); this.verb = ICONS[(i + 1) % ICONS.length][0]; return; }   // (Sierra's: a right click turns the cursor)
    const rc = toRoom(c) || toRoom(lp), lookAt = toRoom(right ? p : null);
    if (lookAt) { const h = this.at(...lookAt); if (h) this.act('look', h.id); return; }
    if (lp && rc) { const h = this.at(...rc); if (h) { this.act('look', h.id); return; } }
    if (!rc) return;
    const h = this.at(...rc), run = !!d2;
    if (!h) { if (!this.item) { this.verb = 'walk'; this.walkTo(rc[0], rc[1], null, run); } return; }
    if (this.item) { this.act(this.verb === 'give' ? 'give' : 'use', h.id, this.item); return; }
    if (h.exit && (this.verb === 'walk' || run)) { if (run) this.go(h.exit, h.enter); else this.act('walk', h.id); return; }
    if ((this.ui === 'verbs' || this.ui === 'icons') && !touch) { if (this.verb === 'walk') this.walkTo(...(h.at || rc), null, run); else this.act(this.verb === 'hand' ? this._hand(h) : this.verb, h.id); return; }
    if (this.ui === 'two' && !touch) { this.act(this._def(h), h.id); return; }
    this._coin = { h, x: c ? c[0] : lp[0], y: c ? c[1] : lp[1] };   // the coin: its verbs round the pointer
  }
  /* ---- drawing ---- */
  _view(k) { const q = Math.round(k * 16) / 16; let v = this._views.get(q); if (!v) { v = new E.View('click', 'Click', 0, 20, q * 1.5, 1); this._views.set(q, v); } return v; }
  /** the room over the whole screen: its backdrop, bodies and things by depth, the lines, the panel (call after the scene) */
  draw(r) {
    const R = this.rooms[this.room], L = this._layout(), G = this.game, touch = G.input.lastDevice === 'touch', z = L.z, pad = [].concat(R.pad || 0), px0 = pad[0], py0 = pad[1] || 0;
    let cv = PAINTED.get(R); if (!cv && R.paint) { cv = E.mkCanvas(R.w + px0 * 2, R.h + py0 * 2); const g = E.ctx2d(cv); g.translate(px0, py0); R.paint(g); PAINTED.set(R, cv); }   // (painted once, with its margins)
    this.boxes = [];
    r.overlay(g => {
      g.save(); g.fillStyle = '#05040a'; g.fillRect(0, 0, r.bw, r.bh); E.px.reset(g); g.imageSmoothingEnabled = false;
      const x0 = L.ox - px0 * z, top = L.oy - py0 * z, bot = L.oy + (R.h + py0) * z;
      if (cv) {   // past its painted margins, the room's top and bottom rows stretched: its sky above, its floor down to the panel
        if (top > 0) g.drawImage(cv, 0, 0, cv.width, 1, x0, 0, cv.width * z, top);
        if (L.py > bot) g.drawImage(cv, 0, cv.height - 1, cv.width, 1, x0, bot, cv.width * z, L.py - bot);
      }
      g.beginPath(); g.rect(0, 0, L.W, L.py); g.clip();
      if (cv) g.drawImage(cv, x0, top, cv.width * z, cv.height * z);
      g.scale(z, z); const ox = L.ox / z, oy = L.oy / z;   // (room pixels from here, zoomed)
      // things and bodies by their baselines, far to near
      const list = [];
      for (const t of R.things || []) list.push([t.y, () => t.draw(g, ox, oy)]);
      for (const h of R.hotspots || []) { if (h.if && !this._test(h.if)) continue; if (h.draw) list.push([h.y !== undefined ? h.y : (h.rect ? h.rect[1] + h.rect[3] : 0), () => h.draw(g, ox, oy)]); if (h.actor && h.actor.rig) list.push([h.actor.y, () => h.actor.rig.draw(g, Math.round(h.actor.x + ox), Math.round(h.actor.y + oy), this._view(this.scaleAt(h.actor.y)))]); }
      const H = this.hero; if (H.rig) list.push([H.y, () => H.rig.draw(g, Math.round(H.x + ox), Math.round(H.y + oy), this._view(H.k))]);
      list.sort((a, b) => a[0] - b[0]); for (const [, f] of list) f();
      if (R.front) R.front(g, ox, oy);
      g.restore(); E.px.reset(g);
      // the hero's line over his head, wrapped, kept on the screen
      if (this.line) { const w = this.line.who, s = this.line.lines[this.line.i], k = w.k || this.scaleAt(w.y), lines = E.font.wrap(s, Math.min(200, L.W - 16)), x = clamp(w.x * z + L.ox, 70, L.W - 70); lines.forEach((t, i) => E.font.text(g, t, x, Math.max(2, (w.y - 46 * k) * z + L.oy - (lines.length - i) * 9), w.color || '#fff4b0', { align: 'center', shadow: '#000', outline: true })); }
      // the pointer's label: the name of what is under it, beside it
      const p = G.input.pointer(), h = this._hover;
      if (h && p && !touch && !this._coin && !this.line && this.panel) E.font.text(g, (this.ui === 'icons' && this.verb !== 'walk' ? ICON[this.verb] + ' ' : '') + h.name, clamp(p[0], 30, L.W - 30), Math.max(2, p[1] - 14), '#ffe8b0', { align: 'center', shadow: '#000', outline: false });
      if (this._fade) { g.fillStyle = 'rgba(5,4,10,' + Math.min(1, this._fade < 1 ? this._fade : 2 - this._fade).toFixed(2) + ')'; g.fillRect(0, 0, r.bw, r.bh); }
      if (this.panel) this._panel(g, L, touch);
    });
    if (this.story) this.story.draw(r);
  }
  // a thumb's size in game pixels (44 CSS pixels)
  _thumb() { const S = this.game.screen; return Math.max(16, Math.ceil(44 * S.dpr / S.S)); }
  // the sentence line; the verbs (SCUMM's nine) or the icons (Sierra's), not on a touch screen; the inventory; the coin
  _panel(g, L, touch) {
    const y0 = L.py + 1, h = this._hover, it = this.item && this.items[this.item], verbs = this.ui === 'verbs' && !touch, icons = this.ui === 'icons' && !touch, th = this._thumb();
    const vb = this.verb !== 'walk' && (verbs || icons) && (verbs ? VERB : ICON)[this.verb], name = h ? h.name.toLowerCase() : '';
    const words = it ? (this.verb === 'give' ? 'Give ' : 'Use ') + it.name.toLowerCase() + (this.verb === 'give' ? ' to ' : ' with ') + name : touch ? '' : (vb ? vb[0] + vb.slice(1).toLowerCase() + ' ' : h ? '' : 'Walk to ') + name;
    E.font.text(g, words, L.W / 2, y0 + 1, '#c8e8ff', { align: 'center', outline: false });
    const box = (id, x, y, w, hh, label, on, fn, small) => { this.boxes.push({ id, x, y, w, h: hh, fn }); E.ui.box(g, x, y, w, hh, { alpha: .9, bg: on ? '#3a4a9a' : '#141428' }); if (label) E.font.text(g, label, x + w / 2, y + hh / 2 - 3, on ? '#ffffff' : '#9ab0ff', { align: 'center', outline: false, font: small ? 'tiny' : undefined }); };
    let ix = 4;
    if (verbs) { const bw = 52, bh = 14; VERBS.forEach(([v, s], i) => box('verb:' + v, 4 + (i % 3) * (bw + 2), y0 + 11 + Math.floor(i / 3) * (bh + 1), bw, bh, s, this.verb === v, () => { this.verb = v; this.item = null; }, true)); ix = 4 + 3 * (bw + 2) + 6; }
    if (icons) { ICONS.forEach(([v, s], i) => { const x = 4 + i * 30; box('icon:' + v, x, y0 + 4, 28, 24, '', this.verb === v && !it, () => { this.verb = v; this.item = null; }); const P = this._pic || (this._pic = {}), sp = P[v] || (P[v] = E.sprite(PICS[v], PAL)); px.sprite(g, sp, Math.round(x + 14 - sp.w / 2), y0 + 7); E.font.text(g, s, x + 14, y0 + 19, '#9ab0ff', { align: 'center', outline: false, font: 'tiny' }); }); ix = 4 + 4 * 30 + 6; }
    // the inventory: icons in a row (two in the verbs' panel; a thumb's size on a touch screen), arrows when it is longer
    const S = touch ? th : verbs ? 20 : 24, rows = verbs ? 2 : 1, aw = touch ? th : 14, cols = Math.max(1, Math.floor((L.W - ix - aw - 8) / (S + 2))), per = cols * rows, iy = verbs ? y0 + 11 : touch ? y0 + 10 : y0 + 4;
    this._invAt = clamp(this._invAt, 0, Math.max(0, Math.ceil(this.inv.length / cols) - rows) * cols);
    this.inv.slice(this._invAt, this._invAt + per).forEach((id, i) => {
      const x = ix + (i % cols) * (S + 2), y = iy + Math.floor(i / cols) * (S + 2), I = this.items[id];
      box('item:' + id, x, y, S, S, '', this.item === id, () => { if ((verbs && this.verb !== 'walk' && this.verb !== 'use' && this.verb !== 'give') || (icons && (this.verb === 'look' || this.verb === 'talk'))) { this.act(this.verb, id); return; } if (this.item && this.item !== id) { this.act('use', id, this.item); return; } this.item = this.item === id ? null : id; if (verbs && this.verb === 'walk') this.verb = 'use'; });
      if (I && typeof I.icon === 'function') I.icon(g, x + 2, y + 2, S - 4); else if (I && I.icon) px.sprite(g, I.icon, Math.round(x + S / 2 - I.icon.w / 2), Math.round(y + S / 2 - I.icon.h / 2));
      else if (I) E.font.text(g, I.name.slice(0, 3), x + S / 2, y + S / 2 - 3, '#ffe8b0', { align: 'center', outline: false, font: 'tiny' });
    });
    if (this.inv.length > per) { const hh = rows > 1 ? S : S / 2 - 1; box('inv:<', L.W - aw - 4, iy, aw, hh, '<', false, () => { this._invAt -= cols; }); box('inv:>', L.W - aw - 4, iy + hh + 2, aw, hh, '>', false, () => { this._invAt += cols; }); }
    // the coin: the hotspot's verbs round where it was clicked (a thumb's size on a touch screen)
    if (this._coin) {
      const C = this._coin, sz = touch ? th : 18, vs = COIN.filter(([v]) => v !== 'talk' || C.h.actor || C.h.talk).concat(C.h.pickup ? [['pickup', 'TAKE']] : [], C.h.exit ? [['walk', 'GO']] : []);
      const bw = sz + 14, all = vs.length * (bw + 3) - 3, x0 = clamp(C.x - all / 2, 2, L.W - all - 2), up = C.y - sz - 12 >= 2, y = up ? C.y - sz - 12 : Math.min(C.y + 12, L.py - sz - 2);   // (a row over the point, or under it near the top)
      vs.forEach(([v, s], i) => box('coin:' + v, x0 + i * (bw + 3), y, bw, sz, s, false, () => this.act(v, C.h.id), true));
      E.font.text(g, C.h.name, clamp(C.x, 40, L.W - 40), up ? Math.max(2, y - 10) : y + sz + 3, '#ffe8b0', { align: 'center', shadow: '#000', outline: false });
    }
  }
  /** the step's pointer stops changing the canvas's cursor (call on leaving the scene) */
  end() { const cv = this.game.screen.canvas; if (cv && cv.style) cv.style.cursor = ''; }
  /** true while play waits on it: a fade, a line, a talk, a walk */
  get busy() { return !!(this._fade || this.line || (this.story && this.story.running) || this.hero.path); }
  /** what a save keeps: the room, the hero's place, the inventory */
  state() { return { room: this.room, x: Math.round(this.hero.x), y: Math.round(this.hero.y), inv: this.inv.slice() }; }
  /** put back what state() gave */
  restore(s) { this.inv = (s.inv || []).slice(); this.go(s.room, [s.x, s.y], true); }
}
E.Click = Click;
})(typeof My3D2dge !== 'undefined' ? My3D2dge : undefined);
