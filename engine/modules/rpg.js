/*!
my-3D2dge module RPG v0.85.1: items, inventories, equipment, shops, a party's stats and levels, status, damage, encounters
https://github.com/michaelcrosato/my-3d2dge (MIT License)
Loads after: the full engine or the agent edition. Needs: no other module.

The systems under a JRPG (Dragon Quest, Final Fantasy, Chrono Trigger), and the inventory grid of a Resident Evil.
- const rpg = new E.RPG({ items, monsters, status, curve }). items: { id: { name, kind: 'use' | 'weapon' | 'armor' |
  'helm' | 'accessory' | 'key', price, stack (99), heal, mp, cure: ['poison'], revive (a share of HP), stats: { atk: 4 }
  (worn: slot = its kind), size: [w, h] (grid cells), icon (a sprite; else one for its kind), info } }. monsters: { id:
  { name, hp, atk, def, mag, spd, exp, gold, drops: [[chance, item]] } }. status: over the defaults (poison: a
  sixteenth of HP each tick; regen heals that; sleep and stop skip turns; silence bars skills; haste and slow change
  spd), each { turns (0: till cured), hurt, heal, skip, mute, spd }. curve(lv): the experience a level needs in all.
- const hero = rpg.member({ name, level, stats: { hp, mp, atk, def, mag, spd }, growth: { hp: 10, atk: 2 } (a level),
  equip: { weapon: 'sword' }, data }): hero.stat(k) (base, growth, gear, status), hero.max('hp'), hero.hp, mp, level,
  exp, next (to the next level), dead, data (the game's own); gain(exp) → the levels reached [{ level, up: { hp: 11 } }];
  equip(id, inv) (the old piece back into inv), unequip(slot, inv), compare(id) → { atk: 3, def: -1 } (equipping it); afflict(k, turns), cure(k) (k left out: all), has(k), acts() (no skip), tick() (a turn: hurt, heal,
  effects run out; → [[k, hp change or 'ends']]).
- const party = rpg.party([hero], { gold, inv }): members, alive, gold, inv (rpg.inventory() by default); use(id, m)
  (heal, mp, cure, revive; → true when it did something, and the item is gone); rest() (an inn); reward(troop) (monster
  ids, or { exp, gold, items }) → { exp, gold, items, levels: [[member, levels]] } (exp shared by the living).
- const inv = rpg.inventory({ slots: 32 } | { grid: [8, 5] }): add(id, n) (false, and nothing added, when it won't
  fit), remove(id, n), count(id), has(id, n), list() → [{ id, n, item, x, y }]; a grid's: fits(id, x, y), place(id, x,
  y), at(x, y).
- const shop = rpg.shop(['potion', 'sword']): price(id), worth(id) (selling: half), buy(party, id, n), sell(party, id,
  n) (→ true when done; key items don't sell).
- rpg.damage(a, b, { power: 1, kind: 'phys' | 'mag', crit: .08, guard }) → { hp, crit }: attack less half the defense
  (members' stats, or a monster's fields), a tenth either way; a critical hit ignores armor.
- const enc = rpg.encounters({ field: { every: [12, 28] (cells walked), troops: [[3, ['slime', 'slime']], [1, ['bat']]] } }):
  enc.walk(zone, units) each step → a troop when the count runs out (it starts again), else null.
- party.state() → JSON for a save; rpg.restore(state) → that party.
- Windows (in r.overlay): rpg.list(g, x, y, w, rows, { cursor, title, top, show, rowH, bg }) (rows: [{ label, note,
  icon, off }]; → { x, y, w, h, row(px, py): the row under a tap, at(i) }), rpg.card(g, x, y, member, { portrait } (full engine)),
  rpg.icon(id).

```js rpg
const E = My3D2dge, rpg = new E.RPG({ items: { potion: { name: 'Potion', kind: 'use', heal: 30, price: 10 }, sword: { name: 'Sword', kind: 'weapon', stats: { atk: 5 }, price: 60 } },
  monsters: { slime: { name: 'Slime', hp: 10, atk: 4, def: 1, exp: 9, gold: 6 } } });
const hero = rpg.member({ name: 'Rowan', stats: { hp: 40, mp: 4, atk: 10, def: 4 }, growth: { hp: 8, atk: 2 } });
const party = rpg.party([hero], { gold: 100 }), shop = rpg.shop(['potion', 'sword']);
if (!shop.buy(party, 'sword') || hero.compare('sword').atk !== 5 || !hero.equip('sword', party.inv) || hero.stat('atk') !== 15) throw new Error('a sword bought and worn');
const won = party.reward(['slime', 'slime', 'slime', 'slime']);
if (won.exp !== 36 || party.gold !== 64 || hero.level < 2 || hero.max('hp') !== 40 + 8 * (hero.level - 1)) throw new Error('the reward, a level');
hero.hp = 5; shop.buy(party, 'potion'); if (!party.use('potion', hero) || hero.hp !== 35 || party.inv.has('potion')) throw new Error('a potion drunk');
if (rpg.restore(JSON.parse(JSON.stringify(party.state()))).members[0].stat('atk') !== hero.stat('atk')) throw new Error('saved and back');
```
Rules: ids in the save, never objects; a battle reads members' stat() and writes their hp and mp back; draw windows
in r.overlay; randomness is Math.random's (a proof seeds it).
*/
(function (E) {
'use strict';
if (!E) throw new Error('my-3D2dge module RPG: load engine/my-3d2dge.js (or the agent edition) first');

/* =============================================================================
 * RPG  items, inventories, equipment, shops, members and their party, status, damage, encounters, windows
 * ========================================================================== */
const { px } = E, STATS = ['hp', 'mp', 'atk', 'def', 'mag', 'spd'], SLOTS = ['weapon', 'armor', 'helm', 'accessory'];
const STATUS = {   // the default effects: hurt and heal (a share of max HP a tick), skip (no turns), mute (no skills), spd (its speed)
  poison: { hurt: 1 / 16, turns: 0, color: '#b060e0' }, regen: { heal: 1 / 16, turns: 5, color: '#58d068' }, sleep: { skip: true, turns: 3, color: '#8ab0ff' },
  stop: { skip: true, turns: 2, color: '#c0c0c0' }, silence: { mute: true, turns: 4, color: '#e0e0a0' }, haste: { spd: 1.5, turns: 5, color: '#ffd060' }, slow: { spd: .5, turns: 5, color: '#6a8ac0' }
};
const copy = v => JSON.parse(JSON.stringify(v));
class Member {
  /** a party member (rpg.member(o): the manual above) */
  constructor(rpg, o = {}) {
    /** rpg: its rules; name; level; base: its stats at level 1; growth: what each level adds; equipped: its gear by
     *  slot; effects: its status effects (turns left, 0 till cured); data: the game's own (a rig's look, skills) */
    this.rpg = rpg; this.name = o.name || 'Hero'; this.level = o.level || 1; this.base = Object.assign({ hp: 30, mp: 0, atk: 5, def: 5, mag: 5, spd: 5 }, o.stats);
    this.growth = Object.assign({}, o.growth); this.equipped = Object.assign({}, o.equip); this.effects = Object.assign({}, o.effects); this.data = o.data || {};
    /** exp: experience gained in all; hp, mp: what it has now */
    this.exp = o.exp !== undefined ? o.exp : rpg.curve(this.level); this.hp = o.hp !== undefined ? o.hp : this.max('hp'); this.mp = o.mp !== undefined ? o.mp : this.max('mp');
  }
  _raw(k) { let v = (this.base[k] || 0) + (this.growth[k] || 0) * (this.level - 1); for (const s in this.equipped) { const it = this.rpg.item(this.equipped[s]); if (it && it.stats) v += it.stats[k] || 0; } return v; }
  /** a stat now: base, growth, gear, and status (haste and slow on spd) */
  stat(k) { let v = this._raw(k); if (k === 'spd') for (const e in this.effects) { const s = this.rpg.status[e]; if (s && s.spd) v *= s.spd; } return Math.round(v * 100) / 100; }
  /** the most HP (or MP) it can have */
  max(k) { return Math.round(this._raw(k)); }
  /** experience to the next level */
  get next() { return Math.max(0, this.rpg.curve(this.level + 1) - this.exp); }
  /** no HP left */
  get dead() { return this.hp <= 0; }
  /** gain experience: the levels reached, [{ level, up: { hp, mp, atk, ... } }] (hp and mp grow with them) */
  gain(n) {
    this.exp += Math.max(0, Math.round(n)); const out = [];
    while (this.level < 99 && this.exp >= this.rpg.curve(this.level + 1)) {
      const was = {}; for (const k of STATS) was[k] = this.max(k);
      this.level++; const up = {}; for (const k of STATS) { const d = this.max(k) - was[k]; if (d) up[k] = d; }
      if (!this.dead) { this.hp += up.hp || 0; this.mp += up.mp || 0; }
      out.push({ level: this.level, up });
    }
    return out;
  }
  _fit() { this.hp = Math.min(this.hp, this.max('hp')); this.mp = Math.min(this.mp, this.max('mp')); }
  /** wear item id (from inv, when given: the old piece goes back into it); false when it can't be worn or isn't there */
  equip(id, inv) {
    const it = this.rpg.item(id), slot = it && (it.slot || (SLOTS.includes(it.kind) ? it.kind : null)); if (!slot || (inv && !inv.has(id))) return false;
    const old = this.equipped[slot]; if (inv) { inv.remove(id, 1); if (old && !inv.add(old, 1)) { inv.add(id, 1); return false; } }
    this.equipped[slot] = id; this._fit(); return true;
  }
  /** take off what is in slot (into inv, when given: false if it won't fit) */
  unequip(slot, inv) { const id = this.equipped[slot]; if (!id || (inv && !inv.add(id, 1))) return false; delete this.equipped[slot]; this._fit(); return true; }
  /** what wearing item id would change: { atk: 3, def: -1 } (the stats that differ) */
  compare(id) {
    const it = this.rpg.item(id), slot = it && (it.slot || it.kind), cur = this.rpg.item(this.equipped[slot]), out = {};
    for (const k of STATS) { const d = ((it && it.stats && it.stats[k]) || 0) - ((cur && cur.stats && cur.stats[k]) || 0); if (d) out[k] = d; }
    return out;
  }
  /** a status effect for turns (its own by default; 0: till cured) */
  afflict(k, turns) { const s = this.rpg.status[k]; if (!s || this.dead) return false; this.effects[k] = turns !== undefined ? turns : s.turns || 0; return true; }
  /** cure an effect (every one when k is left out) */
  cure(k) { if (k === undefined) this.effects = {}; else delete this.effects[k]; }
  /** has it this effect? */
  has(k) { return k in this.effects; }
  /** can it take its turn (no sleep, no stop)? */
  acts() { return !this.dead && !Object.keys(this.effects).some(e => (this.rpg.status[e] || {}).skip); }
  /** a turn passes: poison hurts, regen heals, effects run out; → [[effect, hp change or 'ends']] */
  tick() {
    const out = [];
    for (const k of Object.keys(this.effects)) {
      const s = this.rpg.status[k] || {}, m = this.max('hp');
      if (s.hurt && !this.dead) { const d = Math.min(this.hp, Math.max(1, Math.round(m * s.hurt))); this.hp -= d; out.push([k, -d]); }
      if (s.heal && !this.dead) { const d = Math.min(m - this.hp, Math.max(1, Math.round(m * s.heal))); this.hp += d; out.push([k, d]); }
      if (this.effects[k] > 0 && --this.effects[k] === 0) { delete this.effects[k]; out.push([k, 'ends']); }
    }
    return out;
  }
  /** what it is now, as JSON (party.state() holds it) */
  state() { return copy({ name: this.name, level: this.level, exp: this.exp, hp: this.hp, mp: this.mp, stats: this.base, growth: this.growth, equip: this.equipped, effects: this.effects, data: this.data }); }
}
class Inventory {
  /** a bag of items (rpg.inventory(o): the manual above) */
  constructor(rpg, o = {}) {
    /** rpg: its rules; slots: how many stacks a list holds; grid: [w, h] cells, or null; entries: its stacks ({ id, n, x, y }) */
    this.rpg = rpg; this.slots = o.slots || 32; this.grid = o.grid || null; this.entries = copy(o.entries || []);
  }
  _stack(id) { const it = this.rpg.item(id); return (it && it.stack) || 99; }
  _size(id) { const it = this.rpg.item(id); return (it && it.size) || [1, 1]; }
  /** how many of item id it holds */
  count(id) { return this.entries.reduce((a, e) => a + (e.id === id ? e.n : 0), 0); }
  /** does it hold n of item id? */
  has(id, n = 1) { return this.count(id) >= n; }
  /** its stacks: [{ id, n, item, x, y }] */
  list() { return this.entries.map(e => ({ id: e.id, n: e.n, item: this.rpg.item(e.id), x: e.x, y: e.y })); }
  /** add n of item id: false, adding nothing, when they won't fit */
  add(id, n = 1) {
    if (!this.rpg.item(id)) { E.warn('rpg:item:' + id, 'E.RPG: no item "' + id + '"'); return false; }
    const st = this._stack(id), plan = []; let left = n;
    for (const e of this.entries) if (left > 0 && e.id === id && e.n < st) { const k = Math.min(st - e.n, left); plan.push([e, k]); left -= k; }
    const fresh = [];
    while (left > 0) {
      const k = Math.min(st, left), at = this.grid ? this._free(id, fresh) : this.entries.length + fresh.length < this.slots ? [] : null;
      if (!at) return false;
      fresh.push({ id, n: k, x: at[0], y: at[1] }); left -= k;
    }
    for (const [e, k] of plan) e.n += k;
    for (const e of fresh) { if (!this.grid) { delete e.x; delete e.y; } this.entries.push(e); }
    return true;
  }
  /** take away n of item id (the last stacks first); false when it holds fewer */
  remove(id, n = 1) {
    if (this.count(id) < n) return false;
    for (let i = this.entries.length - 1; i >= 0 && n > 0; i--) { const e = this.entries[i]; if (e.id !== id) continue; const k = Math.min(e.n, n); e.n -= k; n -= k; if (!e.n) this.entries.splice(i, 1); }
    return true;
  }
  /** a grid's stack covering cell x, y, or null */
  at(x, y) { return this.entries.find(e => { const [w, h] = this._size(e.id); return x >= e.x && x < e.x + w && y >= e.y && y < e.y + h; }) || null; }
  /** would item id fit with its top left at cell x, y (a grid's)? */
  fits(id, x, y, more = []) {
    const [w, h] = this._size(id), [W, H] = this.grid || [0, 0]; if (x < 0 || y < 0 || x + w > W || y + h > H) return false;
    return ![...this.entries, ...more].some(e => { const [ew, eh] = this._size(e.id); return x < e.x + ew && e.x < x + w && y < e.y + eh && e.y < y + h; });
  }
  /** put one item id at cell x, y of a grid; false when it doesn't fit there */
  place(id, x, y) { if (!this.grid || !this.fits(id, x, y)) return false; this.entries.push({ id, n: 1, x, y }); return true; }
  _free(id, more) { const [W, H] = this.grid; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (this.fits(id, x, y, more)) return [x, y]; return null; }
  /** its stacks as JSON */
  state() { return { slots: this.slots, grid: this.grid, entries: copy(this.entries) }; }
}
class Party {
  /** the party (rpg.party(members, o): the manual above) */
  constructor(rpg, members, o = {}) {
    /** rpg: its rules; members: who is in it, in order; gold: its money; inv: its items */
    this.rpg = rpg; this.members = members || []; this.gold = o.gold || 0; this.inv = o.inv || rpg.inventory();
  }
  /** the members still standing */
  get alive() { return this.members.filter(m => !m.dead); }
  /** use item id on member m (heal, mp, cure, revive): true when it did something (then it is used up) */
  use(id, m) {
    const it = this.rpg.item(id); if (!it || it.kind !== 'use' || !this.inv.has(id) || !m) return false;
    let did = false;
    if (m.dead) { if (it.revive) { m.hp = Math.max(1, Math.round(m.max('hp') * it.revive)); did = true; } }
    else {
      if (it.heal && m.hp < m.max('hp')) { m.hp = Math.min(m.max('hp'), m.hp + it.heal); did = true; }
      if (it.mp && m.mp < m.max('mp')) { m.mp = Math.min(m.max('mp'), m.mp + it.mp); did = true; }
      for (const k of [].concat(it.cure || [])) if (m.has(k)) { m.cure(k); did = true; }
    }
    if (did) this.inv.remove(id, 1); return did;
  }
  /** an inn: every member's HP and MP back, every effect gone */
  rest() { for (const m of this.members) { m.hp = m.max('hp'); m.mp = m.max('mp'); m.cure(); } }
  /** a battle won: troop (monster ids) or { exp, gold, items }; the gold and items kept, the exp shared by the living;
   *  → { exp, gold, items, levels: [[member, levels]] } */
  reward(troop) {
    let r = troop;
    if (Array.isArray(troop)) {
      r = { exp: 0, gold: 0, items: [] };
      for (const id of troop) { const mo = this.rpg.monsters[id] || {}; r.exp += mo.exp || 0; r.gold += mo.gold || 0; for (const [p, it] of mo.drops || []) if (Math.random() < p) r.items.push(it); }
    }
    const items = [].concat(r.items || []).filter(it => this.inv.add(it, 1)), alive = this.alive, share = alive.length ? Math.ceil((r.exp || 0) / alive.length) : 0;
    this.gold += r.gold || 0;
    return { exp: r.exp || 0, gold: r.gold || 0, items, levels: alive.map(m => [m, m.gain(share)]).filter(x => x[1].length) };
  }
  /** the party as JSON (a save: rpg.restore(state) brings it back) */
  state() { return { gold: this.gold, members: this.members.map(m => m.state()), inv: this.inv.state() }; }
}
class Shop {
  /** a shop's stock (rpg.shop(ids, o): the manual above) */
  constructor(rpg, ids, o = {}) {
    /** rpg: its rules; items: the ids it sells; rate: what it pays for an item, a share of its price (.5) */
    this.rpg = rpg; this.items = ids || []; this.rate = o.sell !== undefined ? o.sell : .5;
  }
  /** what item id costs */
  price(id) { const it = this.rpg.item(id); return (it && it.price) || 0; }
  /** what selling item id brings (nothing for a key item) */
  worth(id) { const it = this.rpg.item(id); return it && it.kind !== 'key' ? Math.floor(this.price(id) * this.rate) : 0; }
  /** buy n of item id: false when the party can't pay or carry them */
  buy(party, id, n = 1) { const c = this.price(id) * n; if (party.gold < c || !party.inv.add(id, n)) return false; party.gold -= c; return true; }
  /** sell n of item id: false for a key item, or when the party hasn't them */
  sell(party, id, n = 1) { const it = this.rpg.item(id); if (!it || it.kind === 'key' || !party.inv.remove(id, n)) return false; party.gold += this.worth(id) * n; return true; }
}
class Encounters {
  /** random encounters by zone (rpg.encounters(zones, o): the manual above) */
  constructor(rpg, zones, o = {}) {
    /** rpg: its rules; zones: { zone: { every: [min, max] cells, troops: [[weight, [ids]]] } }; T: a cell's units (16);
     *  left: cells till the next one */
    this.rpg = rpg; this.zones = zones || {}; this.T = o.tile || 16; this.left = null; this._zone = null;
  }
  /** units walked in zone this step: a troop (a copy of its ids) when the count runs out, else null */
  walk(zone, units) {
    const z = this.zones[zone]; if (!z || !(units > 0)) return null;
    if (this.left === null || this._zone !== zone) { this._zone = zone; this.left = E.rand(z.every[0], z.every[1]); }
    this.left -= units / this.T; if (this.left > 0) return null;
    this.left = E.rand(z.every[0], z.every[1]);
    let w = Math.random() * z.troops.reduce((a, t) => a + t[0], 0);
    for (const [k, ids] of z.troops) if ((w -= k) < 0) return ids.slice();
    return z.troops[z.troops.length - 1][1].slice();
  }
}
// the icons for an item's kind (8 x 8): a flask (red: HP, blue: MP), a blade, a breastplate, a helm, a ring, a key
const ICONS = {
  use: ['..kk....', '..kk....', '.kffk...', 'kffwfk..', 'kfffwk..', 'kffffk..', '.kkkk...', '........'], weapon: ['......kw', '.....kwk', '....kwk.', '...kwk..', 'k.kwk...', '.kgk....', 'kgk.k...', 'kk......'],
  armor: ['.kk..kk.', 'kaakkaak', 'kaaaaaak', '.kaaaak.', '.kaaaak.', '.kaaaak.', '..kkkk..', '........'], helm: ['..kkkk..', '.kaaaak.', 'kaaaaaak', 'kakkkkak', 'kk....kk', 'k......k', '........', '........'],
  accessory: ['..kgk...', '.k...k..', 'k.....k.', 'k.....k.', '.k...k..', '..kkk...', '........', '........'], key: ['.kkk....', 'kg.gk...', 'kg.gk...', '.kgkkkkk', '....k.kk', '........', '........', '........']
};
class RPG {
  /** new E.RPG({ items, monsters, status, curve }): the rules of a role-playing game (the manual above) */
  constructor(o = {}) {
    /** items: the items by id; monsters: the monsters by id; status: the status effects by name (the defaults and yours) */
    this.items = o.items || {}; this.monsters = o.monsters || {}; this.status = Object.assign({}, STATUS, o.status);
    /** curve(lv): the experience level lv needs in all (15 x (lv - 1) ^ 2.4 by default) */
    this.curve = o.curve || (lv => Math.round(15 * Math.pow(Math.max(0, lv - 1), 2.4)));
    this._icons = {};
  }
  /** item id's definition, or null */
  item(id) { return (id && this.items[id]) || null; }
  /** a party member: { name, level, stats, growth, equip, data } */
  member(o) { return new Member(this, o); }
  /** a party: its members and { gold, inv } */
  party(members, o) { return new Party(this, members, o); }
  /** a bag: { slots: 32 } or { grid: [8, 5] } */
  inventory(o) { return new Inventory(this, o); }
  /** a shop selling these item ids ({ sell: .5 }: what it pays back) */
  shop(ids, o) { return new Shop(this, ids, o); }
  /** random encounters by zone: { zone: { every: [min, max], troops: [[weight, ids]] } } */
  encounters(zones, o) { return new Encounters(this, zones, o); }
  /** the party a save held (party.state()) */
  restore(s) {
    const members = (s.members || []).map(m => new Member(this, m));
    return new Party(this, members, { gold: s.gold, inv: new Inventory(this, s.inv || {}) });
  }
  /** a hit: { hp, crit } (a's attack, or its magic with kind 'mag', less half b's defense or magic; a tenth either way;
   *  a critical hit, physical only, ignores armor; guard halves it) */
  damage(a, b, o = {}) {
    const mag = o.kind === 'mag', st = (u, k) => typeof u.stat === 'function' ? u.stat(k) : u[k] || 0;
    const at = st(a, mag ? 'mag' : 'atk'), df = st(b, mag ? 'mag' : 'def'), crit = !mag && Math.random() < (o.crit === undefined ? .08 : o.crit);
    let hp = (crit ? at * 1.5 : at - df / 2) * (o.power || 1) * (.9 + Math.random() * .2);
    if (o.guard) hp /= 2;
    return { hp: Math.max(1, Math.round(hp)), crit };
  }
  /** item id's icon: its own sprite, or one for its kind (a flask red for HP, blue for MP) */
  icon(id) {
    const it = this.item(id); if (!it) return null; if (it.icon) return it.icon;
    const k = ICONS[it.kind] ? it.kind : 'use', key = k + (it.mp && !it.heal ? ':mp' : '');
    return this._icons[key] || (this._icons[key] = E.sprite(ICONS[k], { k: '#1a1030', f: it.mp && !it.heal ? '#5aa0ff' : '#e8384a', w: '#ffffff', g: '#e8c860', a: '#b8c4d8' }));
  }
  /** a window of rows ({ label, note, icon, off }) with a cursor; o: { cursor, title, top (the first row shown), show
   *  (rows shown: 8), bg, rowH }. → { x, y, w, h, row(px, py) }: the row index at a screen point, or -1 */
  list(g, x, y, w, rows, o = {}) {
    const rh = o.rowH || 11, show = Math.min(rows.length, o.show || 8), top = Math.max(0, Math.min(o.top || 0, rows.length - show)), ty = o.title ? 13 : 0, h = Math.max(1, show) * rh + 8 + ty;
    E.ui.box(g, x, y, w, h, { bg: o.bg || ['#6c8cff', '#0a0a48'] });
    if (o.title) { E.font.text(g, o.title, x + 7, y + 5, '#ffe08a', { outline: false, shadow: '#0a0820' }); px.rect(g, x + 4, y + 14, w - 8, 1, '#a8b8ff'); }
    for (let k = 0; k < show; k++) {   // (rows taller than the text, a thumb's on a phone: the text in their middle)
      const i = top + k, r = rows[i], ry = y + 5 + ty + k * rh + Math.max(0, Math.floor((rh - 11) / 2)), col = r.off ? '#7c7aa8' : '#ffffff';
      if (r.icon) px.sprite(g, r.icon, x + 12, ry);
      E.font.text(g, r.label, x + (r.icon ? 23 : 13), ry, col, { outline: false, shadow: '#0a0820' });
      if (r.note !== undefined && r.note !== null) E.font.text(g, String(r.note), x + w - 7, ry, r.off ? '#7c7aa8' : '#9ad0ff', { outline: false, shadow: '#0a0820', align: 'right' });
      if (i === o.cursor) px.poly(g, [[x + 4, ry], [x + 9, ry + 3], [x + 4, ry + 6]], '#ffe060');
    }
    if (top > 0) px.poly(g, [[x + w / 2 - 3, y + ty + 4], [x + w / 2 + 3, y + ty + 4], [x + w / 2, y + ty + 1]], '#ffe060');
    if (top + show < rows.length) px.poly(g, [[x + w / 2 - 3, y + h - 4], [x + w / 2 + 3, y + h - 4], [x + w / 2, y + h - 1]], '#ffe060');
    return { x, y, w, h, rowH: rh, top, show, row: (qx, qy) => { const k = Math.floor((qy - y - 5 - ty + (rh > 11 ? 0 : 2)) / rh); return qx >= x && qx < x + w && k >= 0 && k < show ? top + k : -1; },
      at: k => [x + w / 2, y + 5 + ty + (k - top + .5) * rh] };   // (a row's middle on screen: a tap's target)
  }
  /** a member's card: o.portrait (a Humanoid) beside its name, level, HP and MP bars, its stats and effects; → { w, h } */
  card(g, x, y, m, o = {}) {
    const w = o.w || 150, h = 62, P = o.portrait, tx = x + (P ? 34 : 7), t = (s, a, b, c, al) => E.font.text(g, String(s), a, b, c, { outline: false, shadow: '#0a0820', align: al });
    E.ui.box(g, x, y, w, h, { bg: o.bg || ['#6c8cff', '#0a0a48'] });
    if (P) P.drawPortrait(g, x + 4, y + 4, 26, { zoom: 2.1, turn: .7, bg: ['#3a4aa8', '#10143a'], tint: m.dead ? '#808080' : undefined });
    t(m.name, tx, y + 5, m.dead ? '#a08aa8' : '#ffffff'); t('Lv ' + m.level, x + w - 7, y + 5, '#ffe08a', 'right');
    const bar = (lab, v, mx, by, c) => { E.font.text(g, lab, tx, by, '#9ad0ff', { font: 'tiny', outline: false }); t(v + '/' + mx, x + w - 7, by - 2, '#ffffff', 'right'); E.ui.bar(g, tx + 12, by + 7, x + w - tx - 19, 3, mx ? v / mx : 0, c, { bg: '#2a2650' }); };
    bar('HP', m.hp, m.max('hp'), y + 17, m.hp < m.max('hp') / 4 ? '#e8a030' : '#58d068'); bar('MP', m.mp, m.max('mp'), y + 30, '#5aa0ff');
    ['atk', 'def', 'mag', 'spd'].forEach((k, i) => E.font.text(g, k.toUpperCase() + ' ' + Math.round(m.stat(k)), x + 7 + i * ((w - 14) / 4), y + 46, '#c8d0ff', { font: 'tiny', outline: false }));
    const fx = Object.keys(m.effects); if (fx.length) E.font.text(g, fx.join(' ').toUpperCase(), x + 7, y + 54, (this.status[fx[0]] || {}).color || '#ffffff', { font: 'tiny', outline: false });
    return { w, h };
  }
}
E.RPG = RPG;
})(typeof My3D2dge !== 'undefined' ? My3D2dge : undefined);
