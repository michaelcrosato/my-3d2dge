/*!
my-3D2dge module STORY v0.78.0: dialogue as data, flags and values, a quest log and emote balloons
https://github.com/michaelcrosato/my-3d2dge (MIT License)
Loads after: the full engine or the agent edition. Needs: no other module.

A JRPG's or an adventure's talk (Dragon Quest, Chrono Trigger, Zelda): conversations written as data and run through an
E.Dialog (its markup and portraits), remembering what was said and done.
- const story = new E.Story(game, { people: { elder: { name: 'ELDER', portrait: rig, at: npc } }, nodes, vars, on:
  { gift(story, step) {...} }, dialog }). people: who speaks (portrait: a Humanoid or a function (g, x, y, size); at:
  anything with x, y, z, and h its height, a balloon floats over); dialog: the E.Dialog it talks through (else its own:
  story.talk); on: the game's handlers for events.
- nodes: { id: [step, ...] }: the steps run in order, and a step with if runs only when its condition holds.
  - { who, say: 'text' | [pages], choices: [{ text, if, goto, ...actions }] }: a line in the box (markup, {$name}
    from vars); a choice's actions run when it is picked, then its goto, else the next step.
  - { goto: 'id' } jumps; { end: true } stops; { wait: seconds } pauses.
  - actions, on any step or choice: set: 'flag' | { key: value }; add: { gold: -50 }; quest: [id, title, text]; done:
    id; emote: '!' | '?' | 'heart' | 'dots' | 'note' (over who's at); event: 'name' (calls on[name](story, step), after
    the line on a step that speaks; with wait: true the story holds until story.resume(): the game's scene, a shop).
  - conditions: 'flag' (set and truthy), '!flag', 'gold >= 50' (== != < <= > >=, a number or a word), 'quest:id'
    (taken), 'done:id' (finished), an array (all of them), or a function (story) => true or false.
- story.run(id, { onDone }) starts a node (stopping any other). In update: if (story.update(dt)) return; (true while it
  runs: play waits); in draw: story.draw(r) (the box and the balloons). story.running; story.node: the node's id.
- story.vars: every flag and value ({$name} in a line reads them); story.set(key, value = true), get(key) (a dotted
  path), test(condition).
- Quests: story.quest(id, title, text), story.done(id); story.quests: [{ id, title, text, done }] in the order taken.
- story.emote(target, kind, seconds = 1.5): a balloon over anything with x, y, z (h: its height).
- A visual novel: story.log (what was said and chosen: { who, name, text }, for a backlog), story.auto (seconds a page
  stays before it turns), story.skip (pages type and turn at once; choices wait).
- story.state() and story.restore(state): its vars and quests as JSON, for a save (in game.saves' data).

```js story
const E = My3D2dge, game = new E.Game({ headless: true });
const story = new E.Story(game, { vars: { gold: 30, hero: 'ROWAN' }, nodes: {
  elder: [{ if: 'helping', goto: 'thanks' }, { who: 'elder', say: 'Will you help us, {$hero}?', choices: [
    { text: 'Yes', set: 'helping', quest: ['cave', 'The cave', 'Clear the cave north of town'] }, { text: 'No', goto: 'bye' }] },
    { add: { gold: 20 } }],
  thanks: [{ say: 'Thank you!' }, { if: 'gold >= 50', done: 'cave' }],
  bye: [{ say: 'Farewell.' }] } });
game.start({ update(dt) { story.update(dt); }, draw(r) { story.draw(r); } });
const press = n => { for (let i = 0; i < n; i++) { game.input.tap('confirm'); game.advance(.5); } };
story.run('elder'); press(2);   // the line types out, then the first choice: Yes
if (!story.get('helping') || story.get('gold') !== 50 || story.quests[0].id !== 'cave' || story.running) throw new Error('the quest taken');
story.run('elder'); press(2);
if (!story.quests[0].done || !story.test('done:cave')) throw new Error('the quest done');
```
Rules: keep the nodes as data (a game's script is an event); put story.state() in the game's save and restore it on a
load; one story per game, its talk the only box on screen.
*/
(function (E) {
'use strict';
if (!E) throw new Error('my-3D2dge module STORY: load engine/my-3d2dge.js (or the agent edition) first');

/* =============================================================================
 * STORY  conversations as data run through a Dialog, flags and values, quests, emote balloons
 * ========================================================================== */
const { px } = E;
const HEART = E.sprite(['.R.R.', 'RRRRR', 'RRRRR', '.RRR.', '..R..'], { R: '#e8384a' });
class Story {
  /** new E.Story(game, { people, nodes, vars, on, dialog }): the talk of a game (the manual above) */
  constructor(game, o = {}) {
    /** game: its game; people: who speaks, by id ({ name, portrait, at }); nodes: the conversations by id (lists of
     *  steps); on: the game's event handlers by name */
    this.game = game; this.people = o.people || {}; this.nodes = o.nodes || {}; this.on = Object.assign({}, o.on);
    /** vars: every flag and value (a line's {$name} reads them) */
    this.vars = Object.assign({}, o.vars);
    /** talk: the E.Dialog it speaks through */
    this.talk = o.dialog || new E.Dialog(game); this.talk.vars = this.vars;
    /** quests: the quest log, in the order taken ({ id, title, text, done }) */
    this.quests = [];
    /** log: what was said and chosen, oldest first ({ who, name, text }, the last 200: a visual novel's backlog) */
    this.log = [];
    /** auto: seconds a page shows before it turns by itself (0: it waits for the player); skip: pages type at once and
     *  turn at once (choices still wait) */
    this.auto = 0; this.skip = false;
    /** running: a node runs; node: its id */
    this.running = false; this.node = null;
    this._steps = null; this._i = 0; this._wait = 0; this._held = false; this._then = null; this._pick = null; this._done = null; this._balloons = [];
  }
  /** start node id (stopping any other); o.onDone(story) when it ends */
  run(id, o = {}) {
    if (!this.nodes[id]) { E.warn('story:' + id, 'E.Story: no node "' + id + '"'); return this; }
    if (this.talk.open) this.talk.close();
    this.running = true; this.node = id; this._steps = this.nodes[id]; this._i = 0; this._wait = 0; this._held = false; this._then = null; this._pick = null; this._done = o.onDone || null;
    this._next(); return this;
  }
  /** stop the node running (its box closes; onDone isn't called) */
  stop() { this.running = false; this.node = null; this._done = null; if (this.talk.open) this.talk.close(); }
  /** after an event with wait: true, go on (to the choice's goto, or the next step) */
  resume() { if (!this._held) return; this._held = false; const g = this._then; this._then = null; if (g && !this._jump(g)) return; this._next(); }
  // the steps until one waits (a line, a pause, a held event) or the node ends
  _next() {
    while (this.running) {
      const s = this._steps[this._i++];
      if (!s) return this._end();
      if (s.if !== undefined && !this.test(s.if)) continue;
      if (s.say !== undefined) return this._say(s);   // (its event, goto and a choice's run when the box closes)
      this._act(s); if (!this.running) return;
      if (this._fire(s, s.goto)) return;
      if (s.goto && !this._jump(s.goto)) return;
      if (!s.event && s.wait > 0) { this._wait = s.wait; return; }
    }
  }
  _say(s) {
    const p = this.people[s.who] || {}, ch = s.choices && s.choices.filter(c => c.if === undefined || this.test(c.if));
    this._act(s); if (!this.running) return;
    const name = s.name || p.name || '', note = e => { this.log.push(e); if (this.log.length > 200) this.log.shift(); };
    for (const t of [].concat(s.say)) note({ who: s.who || null, name, text: t });
    if (this._speed === undefined) this._speed = this.talk.speed;
    this.talk.speed = this.skip ? 1e6 : this._speed;
    this.talk.say(s.say, { name, portrait: p.portrait, auto: this.skip ? .08 : this.auto || undefined, choices: ch && ch.length ? ch.map(c => c.text) : null, onChoice: i => { this._pick = ch[i]; note({ who: 'choice', name: '', text: ch[i].text }); }, onDone: () => this._after(s) });
  }
  _after(s) {
    const c = this._pick; this._pick = null;
    if (c) { this._act(c); if (!this.running || this._fire(c, c.goto)) return; if (c.goto) { if (this._jump(c.goto)) this._next(); return; } }
    if (this._fire(s, s.goto)) return;
    if (s.goto && !this._jump(s.goto)) return;
    this._next();
  }
  // a step's or a choice's event: true when the story stops here (it ended, or holds till resume(), then goes to then)
  _fire(s, then) {
    if (!s.event) return false;
    const f = this.on[s.event];
    if (f) try { f(this, s); } catch (e) { this.game.fail('story event "' + s.event + '"', e); }
    else E.warn('story:on:' + s.event, 'E.Story: no handler for event "' + s.event + '" (on: { ' + s.event + '(story, step) {...} })');
    if (!this.running) return true;
    if (s.wait) { this._held = true; this._then = then || null; return true; }
    return false;
  }
  _jump(id) {
    if (!this.nodes[id]) { E.warn('story:' + id, 'E.Story: no node "' + id + '" (a goto)'); this._end(); return false; }
    this.node = id; this._steps = this.nodes[id]; this._i = 0; return true;
  }
  // a step's or a choice's actions: set, add, quest, done, emote, end (its event: _fire)
  _act(s) {
    if (s.set !== undefined) { if (typeof s.set === 'string') this.vars[s.set] = true; else Object.assign(this.vars, s.set); }
    if (s.add) for (const k in s.add) this.vars[k] = (+this.vars[k] || 0) + s.add[k];
    if (s.quest) this.quest(...s.quest);
    if (s.done) this.done(s.done);
    if (s.emote) { const at = (this.people[s.who] || {}).at; if (at) this.emote(at, s.emote); }
    if (s.end) this._end();
  }
  _end() { const f = this._done; this.running = false; this.node = null; this._done = null; if (f) f(this); }
  /** run the talk and the balloons; true while a node runs (play waits) */
  update(dt) {
    for (const b of this._balloons) b.t += dt;
    E.prune(this._balloons, b => b.t >= b.dur);
    if (!this.running) return false;
    if (this._wait > 0) { this._wait -= dt; if (this._wait <= 0) { this._wait = 0; this._next(); } return this.running; }
    if (!this._held) this.talk.update(dt);
    return this.running;
  }
  /** a flag or value (key may be a dotted path into vars) */
  get(key) { let v = this.vars; for (const k of String(key).split('.')) v = v == null ? undefined : v[k]; return v; }
  /** set a flag (value true) or a value */
  set(key, value = true) { this.vars[key] = value; return value; }
  /** does a condition hold? (the manual's conditions) */
  test(c) {
    if (c === undefined || c === null) return true;
    if (typeof c === 'function') return !!c(this);
    if (Array.isArray(c)) return c.every(x => this.test(x));
    c = String(c).trim();
    if (c[0] === '!') return !this.test(c.slice(1));
    let m = /^(quest|done):(.+)$/.exec(c);
    if (m) { const q = this.quests.find(q => q.id === m[2]); return !!q && (m[1] === 'quest' || q.done); }
    m = /^([\w.$]+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/.exec(c);
    if (m) {
      const a = this.get(m[1]), w = m[3].trim(), b = w !== '' && !isNaN(+w) ? +w : w.replace(/^['"]|['"]$/g, '');
      return m[2] === '==' ? a == b : m[2] === '!=' ? a != b : m[2] === '>=' ? a >= b : m[2] === '<=' ? a <= b : m[2] === '>' ? a > b : a < b;   // (a word compares as text)
    }
    return !!this.get(c);
  }
  /** take a quest (or change its title and text): it joins the log */
  quest(id, title = id, text = '') {
    const q = this.quests.find(q => q.id === id);
    if (q) Object.assign(q, { title, text }); else this.quests.push({ id, title, text, done: false });
    return this;
  }
  /** finish a quest (taken now if it wasn't) */
  done(id) { if (!this.quests.some(q => q.id === id)) this.quest(id); this.quests.find(q => q.id === id).done = true; return this; }
  /** a balloon over target (x, y, z; h: its height) for seconds: '!', '?', 'heart', 'dots', 'note' */
  emote(target, kind = '!', seconds = 1.5) { this._balloons.push({ at: target, kind, t: 0, dur: seconds }); return this; }
  /** draw the balloons over their targets and the box (anywhere in draw: both go to the overlay) */
  draw(r) {
    if (this._balloons.length) r.overlay(g => {
      for (const b of this._balloons) {
        const a = b.at, [sx, sy] = r.w(a.x, a.y, (a.z || 0) + (a.h || 28) + 4), x = Math.round(sx) - 6, y = Math.round(sy) - 14 - Math.round(Math.min(1, b.t * 8) * 3);
        px.rect(g, x, y + 1, 13, 9, '#1a1030'); px.rect(g, x + 1, y, 11, 11, '#1a1030'); px.rect(g, x + 1, y + 1, 11, 9, '#ffffff');   // a round-cornered white box,
        px.rect(g, x + 4, y + 10, 4, 1, '#ffffff'); px.rect(g, x + 5, y + 11, 2, 1, '#ffffff'); px.dot(g, x + 3, y + 10, '#1a1030'); px.dot(g, x + 8, y + 10, '#1a1030'); px.dot(g, x + 4, y + 11, '#1a1030'); px.dot(g, x + 7, y + 11, '#1a1030'); px.dot(g, x + 5, y + 12, '#1a1030'); px.dot(g, x + 6, y + 12, '#1a1030');   // its tail
        if (b.kind === '!') { px.rect(g, x + 6, y + 2, 2, 5, '#e8384a'); px.rect(g, x + 6, y + 8, 2, 1, '#e8384a'); }
        else if (b.kind === 'heart') px.sprite(g, HEART, x + 4, y + 3);
        else if (b.kind === 'dots') for (let k = 0; k < Math.min(3, Math.floor(b.t * 3) + 1); k++) px.rect(g, x + 3 + k * 3, y + 6, 2, 2, '#1a1030');   // one, two, three
        else E.font.text(g, b.kind === 'note' ? '♪' : b.kind, x + 7, y + 2, '#1a1030', { outline: false, align: 'center' });
      }
    });
    this.talk.draw(r);
  }
  /** its vars and quests, as JSON (for a save) */
  state() { return JSON.parse(JSON.stringify({ vars: this.vars, quests: this.quests })); }
  /** put back what state() gave (a load) */
  restore(s) {
    if (!s) return this;
    for (const k in this.vars) delete this.vars[k];   // (the same object: the box reads it)
    Object.assign(this.vars, JSON.parse(JSON.stringify(s.vars || {}))); this.quests = JSON.parse(JSON.stringify(s.quests || [])); return this;
  }
}
E.Story = Story;
})(typeof My3D2dge !== 'undefined' ? My3D2dge : undefined);
