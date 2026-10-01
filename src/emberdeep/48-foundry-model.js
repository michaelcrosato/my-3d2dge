/* EMBERDEEP FOUNDRY — deterministic, data-only creature grammar.
 * No renderer, mutable game state, network, eval, or Math.random dependencies.
 * A genome is an immutable recipe, NOT a serialized live unit or executable asset.
 * Version 1 is append-only: changing vocabulary/order requires a new version.
 */
const ED_GENOME = (() => {
  'use strict';
  const VERSION = 1;
  const bodies = {
    husk: { label: 'Hollow', family: 'biped', roles: ['stalker', 'flanker', 'breaker'], forms: ['lean', 'longlimb', 'heavy', 'hunched'] },
    skeleton: { label: 'Ossuary', family: 'biped', roles: ['stalker', 'flanker', 'breaker'], forms: ['lean', 'longlimb', 'heavy', 'hunched'] },
    knight: { label: 'Ironbound', family: 'biped', roles: ['stalker', 'flanker', 'breaker'], forms: ['lean', 'longlimb', 'heavy', 'hunched'] },
    slime: { label: 'Mire', family: 'blob', roles: ['pouncer', 'lurker'], forms: ['lean', 'heavy', 'hunched'] },
    wisp: { label: 'Lantern', family: 'orb', roles: ['orbit', 'volley'], forms: ['lean', 'heavy'] },
    crawler: { label: 'Brood', family: 'crawler', roles: ['hunter', 'webweaver'], forms: ['lean', 'longlimb', 'heavy'] },
    burrower: { label: 'Wyrm', family: 'serpent', roles: ['burrow'], forms: ['lean', 'longlimb', 'heavy'] },
    eye: { label: 'Watcher', family: 'eye', roles: ['beam'], forms: ['lean', 'heavy'] }
  };
  const roles = {
    hunter: { label: 'Hunter', hp: 1, damage: 1, speed: 1.04, threat: 1.1, cue: 'Eight planted IK legs; a crouch telegraphs the pounce.' },
    webweaver: { label: 'Webweaver', hp: 1.08, damage: .9, speed: .9, threat: 1.2, cue: 'Creates slowing webs; fire clears a path through them.' },
    burrow: { label: 'Burrower', hp: 1.1, damage: 1, speed: 1, threat: 1.25, cue: 'Dirt marks its approach; attack while its segmented body surfaces.' },
    beam: { label: 'Beamer', hp: 1, damage: .94, speed: 1, threat: 1.3, cue: 'Its pupil contracts before a marked sweeping beam.' },
    stalker: { label: 'Stalker', hp: 1, damage: 1, speed: 1, threat: 1, cue: 'Measured approach; alternate heavy and light strikes.' },
    flanker: { label: 'Flanker', hp: .88, damage: .94, speed: 1.15, threat: 1.06, cue: 'Circles at midrange before closing; punish the commitment.' },
    breaker: { label: 'Breaker', hp: 1.2, damage: 1.16, speed: .82, threat: 1.24, cue: 'Heavy, readable blows; slow approach and long recovery.' },
    pouncer: { label: 'Pouncer', hp: .92, damage: 1.03, speed: 1.05, threat: 1.05, cue: 'Compresses its body before a committed leap.' },
    lurker: { label: 'Lurker', hp: 1.2, damage: 1.08, speed: .85, threat: 1.12, cue: 'Heavier leaps with longer breathing room between attacks.' },
    orbit: { label: 'Orbiter', hp: 1, damage: 1, speed: 1, threat: 1.08, cue: 'Circles at range and charges each shot visibly.' },
    volley: { label: 'Volley', hp: .88, damage: .68, speed: .9, threat: 1.18, cue: 'A three-shot fan; each projectile is weaker and the recovery longer.' }
  };
  const forms = {
    lean: { label: 'Lean', size: .92, radius: .95, hp: .9, speed: 1.06, mass: .85 },
    longlimb: { label: 'Longlimb', size: 1.02, radius: 1.05, hp: 1, speed: 1, mass: 1 },
    heavy: { label: 'Heavy', size: 1.18, radius: 1.2, hp: 1.22, speed: .86, mass: 1.5 },
    hunched: { label: 'Hunched', size: .96, radius: 1.02, hp: 1.05, speed: .97, mass: 1.1 }
  };
  const palettes = {
    cinder: { label: 'Cinder', cloth: '#823b37', skin: '#aa8a71', bone: '#d0b798', metal: '#b09073', accent: '#ffac68' },
    glacial: { label: 'Glacial', cloth: '#315875', skin: '#92b1b0', bone: '#bccfd1', metal: '#92b5c6', accent: '#b5efff' },
    verdigris: { label: 'Verdigris', cloth: '#37695c', skin: '#9dac80', bone: '#bbc69c', metal: '#84aaa1', accent: '#c9ea8e' },
    amethyst: { label: 'Amethyst', cloth: '#634775', skin: '#ac91a9', bone: '#cbbdd7', metal: '#b3a2bd', accent: '#e6c0ff' },
    brass: { label: 'Brass', cloth: '#7a603c', skin: '#b49b78', bone: '#d3c39e', metal: '#baa268', accent: '#ffe09a' },
    ash: { label: 'Ash', cloth: '#535a67', skin: '#9ca3a1', bone: '#ced0c6', metal: '#a6b0b3', accent: '#e1eddb' }
  };
  const elements = ['phys', 'fire', 'frost', 'storm', 'void', 'venom'];
  const sockets = { biped: ['none', 'crown', 'mantle'], blob: ['none', 'crest'], orb: ['none', 'satellites'], crawler: ['none', 'sac'], serpent: ['none', 'horns', 'fins'], eye: ['none', 'tendrils'] };
  const allowed = new Set(['version', 'seed', 'depth', 'body', 'role', 'form', 'palette', 'element', 'socket', 'name', 'fingerprint']);
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const freeze = o => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.values(o).forEach(freeze); Object.freeze(o); } return o; };
  function hash(value) { const s = String(value); let h = 2166136261; for (let i = 0; i < s.length; ++i) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }
  function random(seed) { let a = hash(seed); return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const fingerprint = g => hash(JSON.stringify([VERSION, g.seed, g.depth, g.body, g.role, g.form, g.palette, g.element, g.socket])).toString(16).padStart(8, '0');
  function validate(g) {
    const errors = [];
    if (!g || typeof g !== 'object' || Array.isArray(g)) return { ok: false, errors: ['Genome must be an object.'] };
    for (const k of Object.keys(g)) if (!allowed.has(k)) errors.push('Unknown genome field: ' + k);
    if (g.version !== VERSION) errors.push('Unsupported genome version.');
    if (typeof g.seed !== 'string' || !g.seed.length || g.seed.length > 128 || /[\x00-\x1f]/.test(g.seed)) errors.push('Seed must contain 1–128 printable characters.');
    if (!Number.isSafeInteger(g.depth) || g.depth < 1) errors.push('Depth must be a positive safe integer.');
    const b = own(bodies, g.body) ? bodies[g.body] : null;
    if (!b) errors.push('Unknown body.');
    if (!own(roles, g.role) || b && !b.roles.includes(g.role)) errors.push('Role is incompatible with this body.');
    if (!own(forms, g.form) || b && !b.forms.includes(g.form)) errors.push('Form is incompatible with this body.');
    if (!own(palettes, g.palette)) errors.push('Unknown palette.');
    if (!elements.includes(g.element)) errors.push('Unknown element.');
    if (b && !sockets[b.family].includes(g.socket)) errors.push('Attachment is incompatible with this body.');
    if (g.name !== undefined && (typeof g.name !== 'string' || g.name.length > 100 || /[\x00-\x1f<>]/.test(g.name))) errors.push('Invalid display name.');
    if (g.fingerprint !== undefined && g.fingerprint !== fingerprint(g)) errors.push('Fingerprint does not match the recipe.');
    return { ok: errors.length === 0, errors };
  }
  function canonical(input) {
    const v = validate(input); if (!v.ok) throw new TypeError(v.errors.join(' '));
    const g = { version: VERSION, seed: input.seed, depth: input.depth, body: input.body, role: input.role, form: input.form, palette: input.palette, element: input.element, socket: input.socket };
    g.name = palettes[g.palette].label + ' ' + bodies[g.body].label + ' ' + roles[g.role].label;
    g.fingerprint = fingerprint(g); return freeze(g);
  }
  function compose(options = {}) {
    if (!options || typeof options !== 'object' || Array.isArray(options)) throw new TypeError('Options must be an object.');
    const seed = String(options.seed === undefined ? 'emberdeep' : options.seed), depth = options.depth === undefined ? 16 : options.depth;
    const R = random('genome-v' + VERSION + ':' + seed + ':' + depth), pick = a => a[Math.floor(R() * a.length)];
    const body = options.body === undefined ? pick(Object.keys(bodies)) : options.body;
    if (!own(bodies, body)) throw new TypeError('Unknown body.');
    const b = bodies[body];
    return canonical({ version: VERSION, seed, depth, body, role: options.role === undefined ? pick(b.roles) : options.role,
      form: options.form === undefined ? pick(b.forms) : options.form, palette: options.palette === undefined ? pick(Object.keys(palettes)) : options.palette,
      element: options.element === undefined ? pick(elements) : options.element, socket: options.socket === undefined ? pick(sockets[b.family]) : options.socket });
  }
  function stats(input) {
    const g = canonical(input), r = roles[g.role], f = forms[g.form];
    return freeze({ hp: +(r.hp * f.hp).toFixed(5), damage: r.damage, speed: +(r.speed * f.speed).toFixed(5),
      size: f.size, radius: f.radius, mass: f.mass, threat: +(r.threat * Math.sqrt(r.hp * f.hp)).toFixed(5), cue: r.cue });
  }
  function parse(text) {
    if (typeof text !== 'string' || text.length > 8192) throw new TypeError('Genome JSON must be at most 8 KiB.');
    let input; try { input = JSON.parse(text); } catch { throw new TypeError('Invalid genome JSON.'); }
    return canonical(input);
  }
  function planPack({ seed = 'pack', depth = 16, budget = 8, maxUnits = 12 } = {}) {
    if (!Number.isFinite(budget) || budget < 1 || budget > 128) throw new RangeError('Budget must be in [1, 128].');
    if (!Number.isInteger(maxUnits) || maxUnits < 1 || maxUnits > 64) throw new RangeError('maxUnits must be in [1, 64].');
    if (typeof seed !== 'string' || !seed.length || seed.length > 128 || /[\x00-\x1f]/.test(seed)) throw new TypeError('Invalid pack seed.');
    if (!Number.isSafeInteger(depth) || depth < 1) throw new RangeError('Invalid pack depth.');
    const out = []; let spent = 0, ranged = 0;
    for (let i = 0; i < maxUnits * 8 && out.length < maxUnits; ++i) {
      const g = compose({ seed: 'pack-v1-' + hash(seed).toString(16) + ':' + i, depth }), cost = stats(g).threat;
      if (spent + cost > budget + 1e-9) continue;
      // At most one ranged body in three. No unbounded rejection loop.
      if (['wisp', 'eye'].includes(g.body) && ranged >= Math.ceil(maxUnits / 3)) continue;
      out.push(g); spent += cost; if (['wisp', 'eye'].includes(g.body)) ranged++;
    }
    return freeze({ version: VERSION, seed: String(seed), budget, spent: +spent.toFixed(5), units: out });
  }
  /** Cardinal ground route. This checks topology, not combat viability or hazard DPS. */
  function auditGrid({ width, height, start, exit, isWalkable, maxCells = 262144 }) {
    const report = { ok: false, errors: [], reachable: 0, pathLength: null, visited: 0 };
    if (!Number.isSafeInteger(maxCells) || maxCells < 1 || maxCells > 262144 || !Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width * height > maxCells) { report.errors.push('Invalid dimensions or cell budget exceeded.'); return report; }
    if (typeof isWalkable !== 'function') { report.errors.push('isWalkable must be a function.'); return report; }
    const inside = p => p && Number.isInteger(p.x) && Number.isInteger(p.y) && p.x >= 0 && p.y >= 0 && p.x < width && p.y < height;
    if (!inside(start) || !inside(exit)) { report.errors.push('Start or exit lies outside the map.'); return report; }
    if (!isWalkable(start.x, start.y) || !isWalkable(exit.x, exit.y)) { report.errors.push('Start or exit is blocked.'); return report; }
    const n = width * height, seen = new Int32Array(n); seen.fill(-1);
    const queue = new Int32Array(n), si = start.y * width + start.x, ei = exit.y * width + exit.x;
    let head = 0, tail = 1; queue[0] = si; seen[si] = 0;
    while (head < tail) {
      const i = queue[head++], x = i % width, y = Math.floor(i / width);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy, j = yy * width + xx;
        if (xx < 0 || yy < 0 || xx >= width || yy >= height || seen[j] !== -1 || !isWalkable(xx, yy)) continue;
        seen[j] = seen[i] + 1; queue[tail++] = j;
      }
    }
    report.reachable = tail; report.visited = head; report.pathLength = seen[ei] < 0 ? null : seen[ei]; report.ok = seen[ei] >= 0;
    if (!report.ok) report.errors.push('No ordinary ground route from start to exit.');
    return report;
  }
  return freeze({ version: VERSION, bodies, roles, forms, palettes, elements, sockets, hash, random, compose, canonical, validate, parse, stats, planPack, auditGrid });
})();
