/*!
my-3D2dge module ARCADE v0.72.0: the coin-op's frame: scores, high-score tables and initials, lives, credits, turns, cards, the attract mode
https://github.com/michaelcrosato/my-3d2dge (MIT License)
Loads after: the full engine or the agent edition. Needs: no other module.

What every coin-op had around its game: for arcade games, shooters, puzzles, pinball and brawlers.
- const cab = new E.Arcade(game, { id: 'maze', lives: 3, extra: [10000] (or every: 20000), credits: null (free play;
  a number: coins a game, cab.coin() adds one), hud: true }); cab.start(players, { demo }) begins a game (one or two
  taking turns; false without the credits); cab.p is the player up ({ n, score, lives, save }), cab.players all.
- cab.add(points, at): the score (at: a world point { x, y, z }: the points float up there), an extra life at each
  threshold. cab.die() takes a life: 'again', 'next' (the other player's turn: "PLAYER 2, READY!"; keep each one's
  stage in p.save) or 'over'; then cab.continue(10, done) counts down (done(true): lives back, the score kept).
- Tables, saved per game and mode: cab.table(mode) (the top ten { name, score }), cab.qualifies(score, mode),
  cab.enter(score, mode, done): initials on a letter wheel (up and down turn it, left and right move, confirm takes a
  letter; taps on its arrows and OK do each); cab.entry is it while open. cab.drawTable(r, mode, y, title).
- cab.card('STAGE 2', 2) shows a card (cab.carding while one is up), cab.say('READY!') a word under it.
- The attract mode, on the title: cab.attract(dt) -> 'title', then 'demo' once o.idle seconds (20) pass without input
  (play the game's own bot, start(1, { demo: true }): DEMO shows, no table), 'scores' for o.scores seconds (6) once
  cab.endDemo() is called or o.demo seconds (30) pass, then 'title'; any input goes back to 'title'.
- cab.update(dt) every step (cards, the entry, the continue); cab.draw(r, [x, y, w, h]) after your drawing: the HUD
  (in the playfield's box: the screen when none), cards, DEMO, the continue and the entry.

```js arcade
const E = My3D2dge, game = new E.Game({ headless: true }), cab = new E.Arcade(game, { id: 'doc', lives: 2, extra: [500] });
cab.start(1); cab.add(300); cab.add(300);
if (cab.p.score !== 600 || cab.p.lives !== 3) throw new Error('extra life');
if (cab.die() !== 'again' || cab.die() !== 'again' || cab.die() !== 'over') throw new Error('lives');
cab.start(2); if (cab.die() !== 'next' || cab.p.n !== 2) throw new Error('turns');
```
Rules: tables live in E.store ('arcade:' + id + ':' + mode; kept for the visit where storage is blocked); a demo is the game's own bot (or a recorded input log)
playing the real rules; the entry and the continue read the game's keys, so hold play while either is open.
*/
(function (E) {
'use strict';
if (!E) throw new Error('my-3D2dge module ARCADE: load engine/my-3d2dge.js (or the agent edition) first');

/* =============================================================================
 * ARCADE  scores, tables, initials, lives, credits, turns, cards and the attract mode
 * ========================================================================== */
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-! ', COLS = ['#ff4a4a', '#ffffff', '#ffe070'];
const clicked = I => I.clicked ? I.clicked() : null;   // (a tap: the full engine's; the agent edition has none)
const KEPT = {};   // the tables this visit, beside E.store (they still show where storage is blocked)
class Arcade {
  /** new E.Arcade(game, { id, lives: 3, extra: [] (the scores that give a life) or every (a life each that many points),
   *  credits: null (free play) or the coins a game takes, idle: 20, demo: 30, scores: 6 (the attract mode's seconds),
   *  hud: true, colors: [label, number, highlight] }) */
  constructor(game, o = {}) {
    /** game: the game it serves; id: the game's name (its tables'); o: the options */
    this.game = game; this.id = o.id || 'game'; this.o = Object.assign({ lives: 3, extra: [], credits: null, idle: 20, demo: 30, scores: 6, hud: true, colors: COLS }, o);
    /** players: [{ n, score, lives, save (the game's own: a stage kept while the other plays), next (the score of the
     *  next extra life) }]; p: the player up; credits: coins in (null: free play); entry: the initials being entered
     *  ({ score, mode, name, i }), or null */
    this.players = []; this.p = null; this.credits = this.o.credits === null ? null : 0; this.entry = null;
    /** mode: 'title' | 'play' | 'over'; demo: a demo is playing (no table); phase: the attract mode's, 'title' | 'demo' |
     *  'scores' */
    this.mode = 'title'; this.demo = false; this.phase = 'title';
    /** hi: the high score shown; wheel: where the letter wheel was last drawn (taps answer to it): { x, y, cw, up, down,
     *  ok } in screen pixels: three columns cw wide from x, the up and down bands [y0, y1], the OK button [x, y, w, h] */
    this._cards = []; this._idle = 0; this._t = 0; this._cont = null; this.wheel = null; this.hi = 0;
  }
  /** begin a game for 1 or 2 players (taking turns), o: { demo: true } for the attract mode's; spends the credits a
   *  game takes unless it is free play or a demo. Returns false without them */
  start(players = 1, o = {}) {
    if (this.credits !== null && !o.demo) { if (this.credits < this.o.credits) return false; this.credits -= this.o.credits; }
    this.players = Array.from({ length: Math.max(1, Math.min(2, players)) }, (_, i) => ({ n: i + 1, score: 0, lives: this.o.lives, save: null, next: this.o.every || (this.o.extra[0] === undefined ? Infinity : this.o.extra[0]) }));
    this.p = this.players[0]; this.mode = 'play'; this.demo = !!o.demo; this.entry = null; this._cont = null; this._cards.length = 0;
    this.hi = Math.max(this.hi, (this.table()[0] || { score: 0 }).score);
    if (this.players.length > 1) this.card('PLAYER 1', 1.6);
    return true;
  }
  /** add points to the player up (at: a world point { x, y, z } where they float up); an extra life at each threshold */
  add(points, at) {
    const p = this.p; if (!p || !points) return;
    p.score += points; this.hi = Math.max(this.hi, p.score);
    while (p.score >= p.next) {
      p.lives++; const every = this.o.every, more = this.o.extra.find(s => s > p.next); p.next = every ? p.next + every : more === undefined ? Infinity : more;
      this.say('EXTRA LIFE!', 1.2); this.game.audio.sfx('oneup');
    }
    if (at) this.game.particles.text(at.x || 0, at.y || 0, (at.z || 0) + 6, points, this.o.colors[2]);
  }
  /** a life lost: 'again' (lives left), 'next' (the other player's turn) or 'over' (none left for anyone) */
  die() {
    const p = this.p; if (!p) return 'over';
    p.lives = Math.max(0, p.lives - 1);
    const i = this.players.indexOf(p), n = this.players.length;
    for (let k = 1; k <= n; k++) {
      const q = this.players[(i + k) % n]; if (q.lives <= 0) continue;
      if (q === p) return 'again';
      this.p = q; this.card('PLAYER ' + q.n + ', READY!', 2); return 'next';
    }
    this.mode = 'over'; return 'over';
  }
  /** add a coin (credits on); returns the credits */
  coin() { if (this.credits === null) return null; this.credits++; this.game.audio.sfx('coin'); return this.credits; }
  /** a continue: CONTINUE? counts down seconds; start, confirm or a tap continues (with the credits it takes): every
   *  player's lives back, the scores kept, done(true); at zero, done(false) */
  continue(seconds = 10, done) { this._cont = { t: seconds, done }; this.game.input.consumeAll(); }
  /** is the continue counting down? */
  get continuing() { return !!this._cont; }
  /** the top ten of a mode: [{ name, score }] */
  table(mode = '') { const k = 'arcade:' + this.id + ':' + mode, t = KEPT[k] || E.store.get(k, null); return Array.isArray(t) ? t.slice() : []; }
  /** would score make the top ten (never in a demo)? */
  qualifies(score, mode = '') { const t = this.table(mode); return !this.demo && score > 0 && (t.length < 10 || score > t[t.length - 1].score); }
  /** open the initials entry for score; done(name) once it is taken and saved */
  enter(score, mode = '', done) { this.entry = { score, mode, name: [0, 0, 0], i: 0, done, t: 0 }; this.game.input.consumeAll(); }
  /** a card in the middle of the screen for seconds ('STAGE 2', 'PLAYER 2, READY!') */
  card(text, seconds = 2) { this._cards.push({ text, t: seconds, big: true }); }
  /** a short word under the cards for seconds ('READY!', 'EXTRA LIFE!') */
  say(text, seconds = 1.2) { this._cards.push({ text, t: seconds, big: false }); }
  /** take every card and word down */
  clear() { this._cards.length = 0; }
  /** is a card up? (hold play while it is) */
  get carding() { return this._cards.some(c => c.big); }
  /** the attract mode, each step on the title: 'title', 'demo' (o.idle seconds without input; it lasts o.demo seconds or
   *  until endDemo()), 'scores' (o.scores seconds), then 'title' again; any input goes back to 'title' */
  attract(dt) {
    const I = this.game.input, o = this.o;
    if (I.anyPressed() || clicked(I)) { this._idle = 0; this.phase = 'title'; return 'title'; }
    this._idle += dt;
    const next = this.phase === 'title' ? (this._idle >= o.idle ? 'demo' : null) : this.phase === 'demo' ? (this._idle >= o.demo ? 'scores' : null) : this._idle >= o.scores ? 'title' : null;
    if (next) { this.phase = next; this._idle = 0; }
    return this.phase;
  }
  /** the attract mode back to the title, its idle clock at zero (as any input does) */
  wake() { this.phase = 'title'; this._idle = 0; }
  /** the demo is over (a demo in a scene of its own: call it on the way back): the attract mode shows the scores */
  endDemo() { this.phase = 'scores'; this._idle = 0; }
  /** a step: the cards count down, the entry and the continue read the keys */
  update(dt) {
    this._t += dt;
    for (const c of this._cards) c.t -= dt;
    this._cards = this._cards.filter(c => c.t > 0);
    const I = this.game.input, e = this.entry, tap = clicked(I);
    if (e) {
      e.t += dt;
      const turn = d => { e.name[e.i] = (e.name[e.i] + d + LETTERS.length) % LETTERS.length; this.game.audio.sfx('blip'); };
      if (I.repeat('up', .3, .09)) turn(1);
      if (I.repeat('down', .3, .09)) turn(-1);
      if (I.pressed('left') && e.i > 0) e.i--;
      let ok = I.pressed('confirm') || I.pressed('right') || I.pressed('start');
      const b = this.wheel, in4 = (q, r) => q[0] >= r[0] && q[0] < r[0] + r[2] && q[1] >= r[1] && q[1] < r[1] + r[3];
      if (tap && b) {   // a tap: OK takes the letter; in a letter's column, above it turns it up, below down, on it picks it
        const col = Math.floor((tap[0] - b.x) / b.cw), y = tap[1];
        if (in4(tap, b.ok)) ok = true;
        else if (col >= 0 && col < 3 && y >= b.up[0] && y < b.down[1]) { e.i = col; if (y < b.up[1]) turn(1); else if (y >= b.down[0]) turn(-1); }
      }
      if (ok) {
        this.game.audio.sfx('confirm');
        if (e.i < 2) e.i++;
        else {
          const name = e.name.map(k => LETTERS[k]).join('').trim() || '---', t = this.table(e.mode);
          t.push({ name, score: e.score }); t.sort((a, b2) => b2.score - a.score); const k = 'arcade:' + this.id + ':' + e.mode; KEPT[k] = t.slice(0, 10); E.store.set(k, KEPT[k]);
          this.entry = null; I.consumeAll(); if (e.done) e.done(name);
        }
      }
    }
    const c = this._cont;
    if (c && !e) {
      c.t -= dt;
      const yes = I.pressed('start') || I.pressed('confirm') || !!tap, paid = this.credits === null || this.credits >= this.o.credits;
      if (yes && paid) {
        if (this.credits !== null) this.credits -= this.o.credits;
        this._cont = null; for (const p of this.players) p.lives = this.o.lives;
        this.mode = 'play'; I.consumeAll(); this.game.audio.sfx('confirm'); if (c.done) c.done(true);
      } else if (c.t <= 0) { this._cont = null; if (c.done) c.done(false); }
    }
  }
  /** the frame over the game, after its drawing: the HUD (o.hud: 1UP, HI, 2UP in a row) along the top of box [x, y, w, h] (the playfield; the
   *  screen when none), the lives along its foot, the cards, DEMO, the continue and the entry */
  draw(r, box) {
    r.overlay(g => {
      const [X, Y, W, H] = box || [0, 0, r.W, r.H], cx = X + W / 2, F = E.font, col = this.o.colors, tx = (s, x, y, c, o) => F.text(g, s, x, y, c, Object.assign({ outline: false, shadow: '#000' }, o));
      if (this.o.hud && this.p) {
        const up = n => this.p.n === n && this.mode === 'play' && this.players.length > 1 && Math.floor(this._t * 3) % 2;   // the player up's label blinks
        tx(up(1) ? '' : '1UP', X + 4, Y + 3, col[0], { font: 'tiny' }); tx(String(this.players[0].score), X + 20, Y + 2, col[1]);
        tx('HI', cx - 2, Y + 3, col[0], { align: 'right', font: 'tiny' }); tx(String(this.hi), cx + 2, Y + 2, col[1]);
        if (this.players[1]) { tx(up(2) ? '' : '2UP', X + W - 4, Y + 3, col[0], { align: 'right', font: 'tiny' }); tx(String(this.players[1].score), X + W - 20, Y + 2, col[1], { align: 'right' }); }
        for (let i = 0; i < Math.min(6, this.p.lives - 1); i++) { E.px.disc(g, X + 9 + i * 9, Y + H - 7, 3, col[2]); E.px.dot(g, X + 8 + i * 9, Y + H - 8, '#ffffff'); }
      }
      let y = Math.round(Y + H / 2) - 14;
      for (const c of this._cards) { if (c.big) { tx(c.text, cx, y, col[2], { align: 'center', scale: 2 }); y += 20; } else { tx(c.text, cx, y, col[1], { align: 'center' }); y += 11; } }
      if (this.demo && Math.floor(this._t * 2) % 2 === 0) tx('DEMO', cx, Y + H - 30, col[2], { align: 'center', scale: 2 });
      if (this._cont && !this.entry) { tx('CONTINUE?', cx, Y + H / 2 - 24, col[1], { align: 'center', scale: 2 }); tx(String(Math.max(0, Math.ceil(this._cont.t))), cx, Y + H / 2, col[2], { align: 'center', scale: 3 }); }
      const e = this.entry;
      if (e) {
        g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 0, r.bw, r.bh); E.px.reset(g);
        // three letters (scale 3) in columns, bands above and below them and an OK button, each a thumb's size: 46 CSS
        // pixels on this screen, at least 34 game pixels
        const S = this.game.screen, u = Math.max(34, Math.ceil(46 * (S && S.S ? S.dpr / S.S : 0))), cw = u, x0 = Math.round(cx - cw * 1.5), y0 = Math.round(Y + H / 2 - u / 2 - 4);
        const ok = [Math.round(cx - u), y0 + 26 + u + 4, u * 2, u];
        this.wheel = { x: x0, y: y0, cw, up: [y0 - u, y0], down: [y0 + 26, y0 + 26 + u], ok };
        tx('NEW HIGH SCORE!', cx, y0 - u - 30, col[2], { align: 'center', scale: 2 }); tx(String(e.score), cx, y0 - u - 12, col[1], { align: 'center' });
        for (let i = 0; i < 3; i++) {
          const x = x0 + i * cw + cw / 2, on = i === e.i;
          tx(LETTERS[e.name[i]], x, y0 + 4, on && Math.floor(e.t * 4) % 2 ? col[1] : on ? col[2] : col[1], { align: 'center', scale: 3 });
          E.px.poly(g, [[x - 5, y0 - 8], [x + 5, y0 - 8], [x, y0 - 14]], on ? col[0] : '#5a4a6a'); E.px.poly(g, [[x - 5, y0 + 32], [x + 5, y0 + 32], [x, y0 + 38]], on ? col[0] : '#5a4a6a');
        }
        E.px.rect(g, ok[0], ok[1], ok[2], ok[3], '#2a1a3e'); E.px.rect(g, ok[0], ok[1], ok[2], 1, col[2]); tx('OK', cx, ok[1] + ok[3] / 2 - 3, col[2], { align: 'center' });
        tx('ENTER YOUR INITIALS', cx, ok[1] + ok[3] + 4, '#c8c0e0', { align: 'center', font: 'tiny' });
      }
    });
  }
  /** a table as a screen (the attract mode's, or after a game), its title at y: rank, name, score */
  drawTable(r, mode = '', y = 40, title = 'HIGH SCORES') {
    const t = this.table(mode);
    r.overlay(g => {
      const cx = r.W / 2, col = this.o.colors, tx = (s, x, yy, c, o) => E.font.text(g, s, x, yy, c, Object.assign({ outline: false, shadow: '#000' }, o));
      tx(title, cx, y, col[2], { align: 'center', scale: 2 });
      for (let i = 0; i < 10; i++) { const e = t[i], yy = y + 26 + i * 11, c = i ? col[1] : col[2]; tx((i + 1) + '.', cx - 52, yy, c, { align: 'right' }); tx(e ? e.name : '---', cx - 42, yy, c); tx(String(e ? e.score : 0), cx + 60, yy, c, { align: 'right' }); }
    });
  }
}
E.Arcade = Arcade;
})(typeof My3D2dge !== 'undefined' ? My3D2dge : undefined);
