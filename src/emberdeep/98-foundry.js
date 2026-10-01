/* EMBERDEEP FOUNDRY — runtime adapter and native agent workbench.
 * Extends registries and TOWN.build; does not replace the hero, save pipeline,
 * combat clock, authored levels, or any core file. See docs/FOUNDRY.md.
 */
(() => {
  'use strict';
  const G = ED_GENOME, CACHE_LIMIT = 128, LIVE_LIMIT = 300;
  const cache = new Map(), telemetry = [], views = {
    iso: [-45, 32], threequarter: [0, 28], topdown: [0, 68], brawler: [0, 12]
  };
  const state = { genome: G.compose({ seed: 'emberdeep-foundry', body: 'crawler', socket: 'sac' }),
    view: 'iso', pose: 'reel', paused: false, t: 0, unit: null, canvas: null, output: null, status: '' };
  const snapshot = o => JSON.parse(JSON.stringify(o));
  function record(type, payload) {
    telemetry.push({ type, time: +ED.t.toFixed(3), ...payload });
    if (telemetry.length > 256) telemetry.splice(0, telemetry.length - 256);
  }
  for (const ev of ['levelStart', 'bossDown', 'heroLevel']) BUS.on(ev, d => record(ev, {
    depth: ED.depth, name: d.L ? d.L.name : d.m ? d.m.name : '', level: d.lvl || null
  }));
  BUS.on('spawn', ({ m }) => { if (m.genome) record('genomeSpawn', { fingerprint: m.genome.fingerprint, kind: m.kind }); });

  function palette(g) {
    const p = G.palettes[g.palette], dark = c => E.shade(c, -.35), light = c => E.shade(c, .18);
    return { ...p, pants: dark(p.cloth), boot: '#26232e', belt: p.metal, hair: dark(p.skin),
      trim: p.accent, hilt: dark(p.metal), metalDk: dark(p.metal), cape: p.cloth, capeIn: dark(p.cloth),
      base: p.cloth, lt: light(p.cloth), dk: dark(p.cloth), belly: dark(p.skin), mark: p.accent,
      leg: p.metal, fang: p.bone, joint: light(p.metal), eye: p.accent, fin: p.metal, horn: p.bone,
      dirt: '#756454', flesh: p.cloth, iris: p.accent, sclera: p.bone, vein: dark(p.skin),
      pupil: '#180f21', tendril: dark(p.cloth) };
  }
  function flanker(m, dt) {
    const h = ED.hero, dx = h.x - m.x, dy = h.y - m.y, d = Math.hypot(dx, dy) || 1;
    // A flank spends the same cooldown and still uses the native turn/telegraph pipeline.
    if (m.ai.aware && !m.atk && m.cool > .2 && d > 28 && d < 90 && m.stunT <= 0 && m.kbT <= 0 && AI.clear(m, h.x, h.y)) {
      const side = G.hash(m.genome.seed) & 1 ? 1 : -1;
      m.cool -= dt;
      AI.move(m, [dx / d * .35 - dy / d * side * .8, dy / d * .35 + dx / d * side * .8], dt);
      AI.face(m, Math.atan2(dy, dx), dt, 7);
    } else REG.ai.melee.update(m, dt);
  }
  function materialize(g) {
    const key = [g.body, g.role, g.form, g.socket].join('/');
    if (cache.has(key)) { const a = cache.get(key); cache.delete(key); cache.set(key, a); return a; }
    const original = REG.archetypes[g.role === 'webweaver' ? 'webspinner' : g.body];
    if (!original) throw new Error('Missing authored body: ' + g.body);
    const f = G.stats(g), arch = { ...original, id: 'foundry_' + g.body, foundryBase: original.id,
      hp: original.hp * f.hp, dmg: original.dmg * f.damage, speed: (original.speed || 30) * f.speed,
      r: (original.r || 5) * f.radius, mass: (original.mass || 1) * f.mass,
      head: (original.head || 28) * f.size, xp: (original.xp || 10) * f.threat,
      _measured: false, palettes: undefined };
    if (G.bodies[g.body].family === 'biped') {
      arch.rig = { ...(original.rig || {}), size: ((original.rig && original.rig.size) || 1) * f.size };
      if (g.form === 'longlimb') Object.assign(arch.rig, { armUpper: 6.8, armLower: 7, legUpper: 7.7, legLower: 7.3, hipZ: 14 });
      if (g.form === 'hunched') Object.assign(arch.rig, { hunch: .65, lean: .2, stride: 4.5 });
      if (g.socket === 'mantle') arch.cape = true;
      arch.attacks = (g.role === 'breaker' ? [{ move: 'overhead', dmg: 1.18, kb: 160, recover: .32 }, { move: 'bash', dmg: 1, kb: 140, recover: .26 }] : original.attacks).map(a => {
        const clean = { ...a, over: a.over ? { ...a.over } : undefined };
        delete clean.spec; delete clean.reach; delete clean.stand; return clean;
      });
      if (g.role === 'flanker') arch.ai = flanker;
      measureAttacks(arch); // Strike reach follows the actual new arms and blade.
    } else if (g.body === 'slime') {
      arch.blob = { ...(original.blob || {}), R: ((original.blob && original.blob.R) || 6.2) * f.size };
    } else if (g.body === 'wisp') {
      arch.hover = g.form === 'heavy' ? 17 : 23;
      arch.shot = { ...(original.shot || {}), n: g.role === 'volley' ? 3 : 1, spread: .55,
        every: g.role === 'volley' ? 3.3 : 2.5, speed: g.role === 'volley' ? 88 : 95 };
      arch.draw = (m, r, alpha) => {
        r.shadow(m.x, m.y, m.r, .25 * alpha);
        r.actor(m.x, m.y, m.z, (ctx, x, y) => {
          const z = (r.preview ? r.view.scale : r.view.zoom || 1) * m.genomeScale;
          const charge = m.ai.charge > 0 ? 1 + (1 - m.ai.charge / .6) * .7 : 1, rr = 4 * z * charge;
          const el = EL(m.el === 'phys' ? 'void' : m.el);
          r.glowDisc(ctx, x, y, rr * 2.2, m.pal.accent, .2);
          px.poly(ctx, [[x, y - rr * 1.25], [x + rr, y], [x, y + rr * 1.15], [x - rr, y]], m.pal.cloth);
          px.poly(ctx, [[x, y - rr * 1.25], [x + rr, y], [x, y + rr * .2]], m.pal.metal);
          px.disc(ctx, x, y, rr * .52, el.color); px.dot(ctx, x - rr * .2, y - rr * .2, el.light);
          if (m.genome.socket === 'satellites') {
            const t = m.ai.t || 0;
            for (let i = 0; i < 3; ++i) { const a = t * 2 + i * TAU / 3; px.disc(ctx, x + Math.cos(a) * 10 * z, y + Math.sin(a) * 4 * z, 1.2 * z, m.pal.accent); }
          }
        }, { alpha, emissive: .7, rim: false });
        for (const id of m.affixes) { const a = REG.affixes[id]; if (a && a.draw && m.alive) a.draw(m, r); }
      };
    } else if (g.body === 'crawler') {
      arch.body = BST_crawlerBody({ size: f.size, long: g.form === 'longlimb' ? 1.25 : 1,
        abd: g.socket === 'sac' ? 1.5 : g.form === 'heavy' ? 1.25 : 1.1,
        egg: g.socket === 'sac' ? .75 : 0, thick: g.form === 'heavy' ? 1.15 : 1,
        pattern: g.role === 'webweaver' ? 'bands' : 'chevron' });
      // Original crawler onSpawn randomly changed its pattern; preserve recipe identity instead.
      arch.onSpawn = undefined;
    } else if (g.body === 'burrower') {
      arch.body = BST_serpentBody({ size: f.size, n: g.form === 'longlimb' ? 16 : g.form === 'heavy' ? 12 : 10,
        gap: 3, headR: 4.1, bodyR: 3.3, tailR: 1.1, horns: g.socket === 'horns', fins: g.socket === 'fins' ? 4 : 0 });
    } else if (g.body === 'eye') {
      arch.body = BST_eyeBody({ size: f.size, R: g.form === 'heavy' ? 7 : 6,
        n: g.socket === 'tendrils' ? 8 : 5, seg: g.socket === 'tendrils' ? 3 : 2.5 });
    }
    cache.set(key, arch);
    if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value);
    return arch;
  }
  function accessories(m) {
    const g = m.genome;
    if (g.socket === 'crown' && m.rig) m.drawExtra = (ctx, x, y, v) => {
      const H = m.rig.J.head; if (!H) return;
      for (const side of [-1, 1]) {
        const a = rigScreen(m.rig, [H[0] - .4, H[1] + side * 2.2, H[2] + 1.2], x, y, v);
        const b = rigScreen(m.rig, [H[0] - 2, H[1] + side * 4, H[2] + 5.5], x, y, v);
        px.line(ctx, a[0], a[1], b[0], b[1], m.pal.bone, Math.max(1, v.scale));
        px.dot(ctx, b[0], b[1], m.pal.accent);
      }
    };
    if (g.socket === 'crest' && m.blob) m.drawExtra = (ctx, x, y, v) => {
      const z = v.scale * m.genomeScale, h = m.blob.o && m.blob.o.R || 6.2;
      const q = v.p(0, 0, h * 1.6), cy = y + q[1];
      px.poly(ctx, [[x - 4 * z, cy], [x - 2 * z, cy - 5 * z], [x, cy - z], [x + 3 * z, cy - 6 * z], [x + 4 * z, cy]], m.pal.accent);
    };
  }
  function assemble(m, input, source, options = {}) {
    const genome = G.canonical(input), arch = materialize(genome), f = G.stats(genome);
    m.genome = genome; m.genomeScale = f.size; m.arch = arch;
    m.name = genome.name; m.pal = palette(genome);
    m.hp *= arch.hp / source.hp; m.maxHp *= arch.hp / source.hp;
    m.dmg *= arch.dmg / source.dmg; m.speed *= arch.speed / (source.speed || 30);
    m.xp *= arch.xp / (source.xp || 10); m.r = arch.r; m.head = arch.head; m.mass = arch.mass;
    makeBody(m, options);
    accessories(m);
    return m.body;
  }
  // Exactly eight permanent registry entries. Per-entity recipes never grow the registry.
  for (const body of Object.keys(G.bodies)) {
    const source = REG.archetypes[body];
    if (!source) continue;
    def('archetypes', 'foundry_' + body, { ...source, name: 'Forged ' + source.name,
      minDepth: 17, weight: 4, themes: undefined, noPack: false, attacks: undefined, _measured: false,
      body(m, o) {
        const R = o.rng || rnd;
        const genome = o.genome ? G.canonical(o.genome) : G.compose({ body,
          seed: 'depth:' + m.level + ':roll:' + Math.floor(R() * 4294967296), depth: m.level, element: m.el });
        if (genome.body !== body) throw new TypeError('Genome does not match the registered body family.');
        return assemble(m, genome, source, o);
      },
      onSpawn(m, o) { if (m.arch.onSpawn) m.arch.onSpawn(m, o); }
    });
  }
  function requireSandbox() {
    if (!DEV.enabled) throw new Error('Enable Developer Sandbox first. Foundry mutations never target a normal save.');
    if (!ED.hero || !ED.L || !['town', 'level', 'proving'].includes(ED.mode)) throw new Error('Enter town or a playable level first.');
  }
  function spawn(input, options = {}) {
    requireSandbox();
    const genome = G.canonical(input), count = options.count === undefined ? 1 : options.count;
    if (genome.depth > 500) throw new RangeError('Live Foundry playtests support depths 1–500; data-only recipes may be deeper.');
    if (!Number.isInteger(count) || count < 1 || count > 12) throw new RangeError('Spawn count must be 1–12.');
    if (ED.foes.length + count > LIVE_LIMIT) throw new RangeError('Live monster budget of 300 would be exceeded.');
    const h = ED.hero, map = ED.L.map, points = [], R = RNG(genome.seed), radius = materialize(genome).r;
    const fits = (x, y) => { for (let i = 0; i < 8; ++i) { const a = i * TAU / 8, xx = x + Math.cos(a) * radius, yy = y + Math.sin(a) * radius; if (!map.walkable(Math.floor(xx / 16), Math.floor(yy / 16))) return false; } return ED.foes.every(m => !m.alive || Math.hypot(x - m.x, y - m.y) > radius + m.r + 1); };
    for (let i = 0; i < count; ++i) {
      let p = null;
      for (let k = 0; k < 80; ++k) {
        const a = h.facing + k * 2.399963229728653 + i * .7, r = 36 + (k % 6) * 9;
        const x = h.x + Math.cos(a) * r, y = h.y + Math.sin(a) * r;
        if (map.walkable(Math.floor(x / 16), Math.floor(y / 16)) && fits(x, y) && points.every(q => Math.hypot(x - q.x, y - q.y) > radius * 2 + 2)) { p = { x, y }; break; }
      }
      if (!p) throw new Error('Not enough walkable space; no units were spawned.');
      points.push(p);
    }
    return points.map(p => {
      const m = spawnMonster('foundry_' + genome.body, p.x, p.y, { genome, level: genome.depth, el: genome.element, rng: R, instant: true });
      m.homeX = p.x; m.homeY = p.y;
      return { kind: m.kind, name: m.name, x: m.x, y: m.y, fingerprint: genome.fingerprint, hp: m.hp };
    });
  }
  function auditLevel() {
    const lv = ED.L;
    if (!lv || !lv.map || !lv.start || !lv.exit) return { ok: false, errors: ['No dungeon with a start and exit is active.'], depth: ED.depth };
    const start = { x: Math.floor(lv.start.x / 16), y: Math.floor(lv.start.y / 16) }, exit = { x: Math.floor(lv.exit.x / 16), y: Math.floor(lv.exit.y / 16) };
    const topology = G.auditGrid({ width: lv.w, height: lv.h, start, exit, isWalkable: (x, y) => lv.map.walkable(x, y) });
    const invalid = ED.foes.filter(m => ![m.hp, m.maxHp, m.dmg, m.speed, m.x, m.y].every(Number.isFinite)).map(m => m.kind);
    const missing = (lv.mechs || []).filter(id => !REG.mechanics[id]);
    return { ok: topology.ok && !invalid.length && !missing.length, depth: ED.depth, name: lv.name,
      mechanics: (lv.mechs || []).slice(), topology, nonFiniteUnits: invalid, missingMechanics: missing,
      note: 'Cardinal floor connectivity only; not a proof of collision clearance, hazard survival, or balanced combat.' };
  }
  function inspect() {
    const hero = ED.hero, r = { version: 1, mode: ED.mode, depth: ED.depth, sandbox: DEV.enabled,
      hero: hero ? { character: hero.character || 'wanderer', level: hero.level, hp: hero.hp, gold: hero.gold } : null,
      counts: Object.fromEntries(Object.entries(REG).map(([k, v]) => [k, Object.keys(v).length])),
      resources: { liveFoes: ED.foes.length, corpses: ED.corpses.length, effects: ED.fx.length, assemblyCache: cache.size, assemblyCacheLimit: CACHE_LIMIT },
      difficulty: { ...DIFF }, enemies: ED.foes.slice(0, LIVE_LIMIT).map(m => ({ kind: m.kind, name: m.name, hp: m.hp, maxHp: m.maxHp,
        x: m.x, y: m.y, state: m.atk ? m.atk.phase : m.ai.state || 'idle', genome: m.genome || null })), telemetry: telemetry.slice() };
    return snapshot(r);
  }
  function catalog() {
    return snapshot({ version: G.version, bodies: G.bodies, roles: G.roles, forms: G.forms, palettes: G.palettes,
      elements: G.elements, sockets: G.sockets, limits: { cache: CACHE_LIMIT, liveUnits: LIVE_LIMIT, spawnBatch: 12, liveDepth: 500 },
      determinism: 'Genome and pack recipes are deterministic. Existing combat and incidental animation randomness are not a deterministic replay.' });
  }
  function download(name, data, type = 'application/json') {
    const blob = new Blob([data], { type }), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function open() { if (UI.isOpen('foundry')) return; UI.closeAll(); UI.open('foundry'); }
  function guard(fn) { return () => { try { fn(); } catch (e) { state.status = e.message; status(); } }; }
  function status(message) {
    if (message !== undefined) state.status = message;
    const el = FORM.el && FORM.el.querySelector('[data-foundry-status]'); if (el) el.textContent = state.status;
  }
  function detachedUnit(genome) {
    const source = REG.archetypes[genome.body];
    const m = { team: 'foe', x: 0, y: 0, z: 0, hz: 16, vx: 0, vy: 0, vz: 0, facing: .6, scale: 1,
      kind: 'foundry_' + genome.body, level: genome.depth, hp: source.hp, maxHp: source.hp, dmg: source.dmg,
      speed: source.speed || 30, xp: source.xp || 10, mass: source.mass || 1, st: {}, ai: {}, affixes: [],
      alive: true, elite: 0, spawnT: 0, flash: 0, stunT: 0, kbT: 0, el: genome.element, deadT: 0 };
    assemble(m, genome, source);
    if (m.body && genome.body === 'burrower') m.body.rig.reset(-14, 0, 12, 0, 'line');
    return m;
  }
  function createPreview() { state.unit = detachedUnit(state.genome); state.t = 0; state.attack = null; }
  function inspectAsset(input) {
    const g = G.canonical(input), m = detachedUnit(g), rig = m.rig || m.blob || m.body && m.body.rig;
    const joints = m.rig ? Object.entries(m.rig.J).filter(([, p]) => Array.isArray(p) && p.length === 3).map(([id, p]) => ({ id, local: p.slice() })) : [];
    return snapshot({ genome: g, family: G.bodies[g.body].family, rig: rig ? rig.constructor.name : 'Wisp',
      collisionRadius: m.r, headHeight: m.head, baseStats: { hp: m.hp, damage: m.dmg, speed: m.speed, mass: m.mass },
      joints, segmentCount: m.genome.body === 'burrower' ? rig.o.n : null, tendrilCount: m.genome.body === 'eye' ? rig.o.n : null,
      attacks: (m.arch.attacks || []).map(a => ({ move: a.move, measuredReach: a.reach, standDistance: a.stand, windup: a.spec.wind, recovery: a.spec.recover })),
      warning: 'Base stats exclude depth, elite, difficulty and pack multipliers. Joint coordinates are local rig data, not world hitboxes.' });
  }
  function change(part) {
    const opts = { ...state.genome, ...part }; delete opts.version; delete opts.name; delete opts.fingerprint;
    if (part.body) { delete opts.role; delete opts.form; delete opts.socket; }
    state.genome = G.compose(opts); createPreview(); render();
  }
  function render() {
    openForm('The Foundry · creature and encounter workbench', el => {
      el.classList.add('ed-foundry');
      formElement('p', 'Compose → inspect → sandbox-test → export. The Wanderer and normal save are never replaced by a preview.', el);
      const ribbon = formElement('div', '', el, { class: 'ed-foundry-ribbon' });
      formElement('strong', DEV.enabled ? 'DISPOSABLE SANDBOX' : 'READ-ONLY PREVIEW', ribbon);
      formElement('span', 'GENOME v1 / ' + state.genome.fingerprint, ribbon);
      const grid = formElement('div', '', el, { class: 'ed-foundry-grid' }), left = formElement('section', '', grid), right = formElement('section', '', grid);
      const cv = formElement('canvas', '', left, { width: 400, height: 260, class: 'ed-foundry-preview', 'aria-label': 'Animated ' + state.genome.name });
      state.canvas = cv;
      formElement('h3', state.genome.name, left);
      formElement('p', G.stats(state.genome).cue, left);
      const nums = G.stats(state.genome);
      formElement('p', 'Life ×' + nums.hp.toFixed(2) + ' · damage ×' + nums.damage.toFixed(2) + ' · speed ×' + nums.speed.toFixed(2) + ' · threat ' + nums.threat.toFixed(2), left);
      formField(left, 'Camera', 'select', state.view, v => { state.view = v; }, { options: Object.keys(views).map(k => [k, k]) });
      formField(left, 'Animation', 'select', state.pose, v => { state.pose = v; createPreview(); }, { options: ['reel', 'idle', 'run', 'attack', 'hurt', 'death'].map(k => [k, k]) });
      formField(left, 'Pause preview', 'checkbox', state.paused, v => { state.paused = v; });
      formButton(left, 'Step preview 1/60 s', () => preview(1 / 60, true));
      formButton(left, 'Save preview PNG', () => { preview(0, true); const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = 'creature-' + state.genome.fingerprint + '.png'; a.click(); });
      const seedRow = formElement('label', 'Seed ', right, { class: 'ed-field' });
      const seed = formElement('input', '', seedRow, { type: 'text', value: state.genome.seed, maxlength: 128, 'aria-label': 'Genome seed' });
      seed.onchange = guard(() => change({ seed: seed.value }));
      const data = state.genome, body = G.bodies[data.body];
      for (const [key, label, options] of [['body', 'Body plan', Object.keys(G.bodies)], ['role', 'Behavior', body.roles], ['form', 'Anatomy', body.forms],
        ['palette', 'Palette', Object.keys(G.palettes)], ['element', 'Damage element', G.elements], ['socket', 'Attachment', G.sockets[body.family]]]) {
        formField(right, label, 'select', data[key], v => change({ [key]: v }), { options: options.map(k => [k, k]) });
      }
      formField(right, 'Test depth', 'number', data.depth, v => guard(() => change({ depth: v }))(), { min: 1, max: 500, step: 1 });
      formButton(right, 'Recombine from next seed', guard(() => { state.genome = G.compose({ seed: 'forge-' + G.hash(state.genome.seed + ':next'), depth: state.genome.depth }); createPreview(); render(); }));
      formElement('h3', 'Playtest without risking a save', right);
      if (!DEV.enabled) formButton(right, 'Enter disposable sandbox', () => { devEnable(); notify('Press F8 to reopen the Foundry in your sandbox.', '#8fe3ff', 5); });
      else {
        formButton(right, 'Spawn this creature', guard(() => { spawn(state.genome); status('Spawned. Close the Foundry to fight; the world is paused while inspecting.'); }));
        formButton(right, 'Spawn three-creature pack', guard(() => { spawn(state.genome, { count: 3 }); status('Three creatures spawned in the disposable sandbox.'); }));
        formButton(right, 'Test this dungeon depth', () => devTravel(Math.min(500, state.genome.depth)));
        formButton(right, 'Difficulty and simulation controls', () => { UI.closeAll(); UI.open('developer'); });
        formButton(right, 'Restore normal game', () => devDisable());
      }
      const tools = formElement('section', '', el);
      formElement('h3', 'Recipes and evidence', tools);
      const actions = formElement('div', '', tools, { class: 'ed-foundry-actions' });
      formButton(actions, 'Export genome JSON', () => download('creature-' + data.fingerprint + '.json', JSON.stringify(data, null, 2)));
      formButton(actions, 'Export budgeted pack', guard(() => download('encounter-' + data.fingerprint + '.json', JSON.stringify(G.planPack({ seed: data.seed, depth: data.depth, budget: 8, maxUnits: 10 }), null, 2))));
      formButton(actions, 'Inspect body and attack reach', () => { state.output.value = JSON.stringify(inspectAsset(state.genome), null, 2); status('Detached rig joints, measured melee reach, wind-ups and morphology.'); });
      formButton(actions, 'Inspect live scene', () => { state.output.value = JSON.stringify(inspect(), null, 2); status('Scene snapshot: read-only, capped at 300 units / 256 events.'); });
      formButton(actions, 'Audit dungeon route', () => { state.output.value = JSON.stringify(auditLevel(), null, 2); status('Checks ordinary ground connectivity and finite unit stats; not hazard survivability.'); });
      formButton(actions, 'Export inspection report', () => download('foundry-inspection.json', JSON.stringify({ scene: inspect(), route: auditLevel() }, null, 2)));
      const label = formElement('label', 'Genome import / inspection output', tools);
      state.output = formElement('textarea', JSON.stringify(data, null, 2), label, { rows: 8, spellcheck: 'false', 'aria-label': 'Genome JSON', class: 'ed-foundry-json' });
      formButton(tools, 'Validate and import genome', guard(() => { state.genome = G.parse(state.output.value); createPreview(); render(); status('Validated version, identifiers, body compatibility, and fingerprint. No code executed.'); }));
      formElement('p', state.status, el, { 'data-foundry-status': '', role: 'status', 'aria-live': 'polite' });
      formElement('p', 'F8 opens this workbench. Generated families join the normal descent after depth 15. Preview and pack seeds are reproducible; live combat randomness is not a replay.', el, { class: 'ed-foundry-footnote' });
    });
  }
  // A tiny offscreen projection adapter for the segmented serpent's existing draw API.
  // Live encounters still use the engine renderer, lights, occlusion and depth sorting.
  function previewRenderer(ctx, view, cx, cy) {
    const commands = [], decals = [];
    const r = { view, gpu: false, preview: true, tgt: ctx, w(x, y, z) { const p = view.p(x, y, z); return [cx + p[0], cy + p[1]]; },
      visible: () => true,
      queue(x, y, z, fn, o = {}) { commands.push({ d: view.depth(x, y, z) + (o.bias || 0), fn }); },
      actor(x, y, z, fn, o) { this.queue(x, y, z, g => { const p = this.w(x, y, z); fn(g, ...p); }, o); },
      decal(fn) { decals.push(fn); },
      groundDisc(x, y, rad, color, alpha = 1) { const p = this.w(x, y, 0); ctx.save(); ctx.globalAlpha = alpha; px.ell(ctx, p[0], p[1], rad * view.scale, Math.max(1, rad * view.scale * Math.sin(view.pitch)), color); ctx.restore(); },
      groundRing(x, y, rad, color, alpha = 1) { this.groundDisc(x, y, rad, color, alpha * .2); },
      shadow(x, y, rad, alpha) { this.decal(() => this.groundDisc(x, y, rad, '#080911', alpha)); },
      glowDisc(g, x, y, rad, color, alpha = 1) { g.save(); g.globalAlpha = alpha; px.disc(g, x, y, rad, color); g.restore(); },
      flush() { decals.forEach(fn => fn()); commands.sort((a, b) => a.d - b.d).forEach(q => { ctx.save(); q.fn(ctx); ctx.restore(); }); }
    };
    return r;
  }
  function preview(dt, force = false) {
    const cv = state.canvas, m = state.unit;
    if (!cv || !cv.isConnected || !m) return;
    const tick = state.paused && !force ? 0 : Math.min(.05, dt);
    state.t += tick;
    const t = state.t, part = state.pose === 'reel' ? ['idle', 'run', 'attack', 'hurt', 'death'][Math.floor(t / 3) % 5] : state.pose;
    const u = t % 3;
    m.facing = .7 + Math.sin(t * .3) * .6;
    const v = views[state.view], V = new E.View('foundry', 'Foundry', v[0], v[1], G.bodies[m.genome.body].family === 'biped' ? 4 : m.genome.body === 'burrower' ? 3.8 : 5);
    const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#101321'; ctx.fillRect(0, 0, cv.width, cv.height);
    for (let i = 0; i < 10; ++i) { ctx.fillStyle = i % 2 ? '#141929' : '#151a2c'; ctx.fillRect(0, 115 + i * 14, 400, 14); }
    const r = previewRenderer(ctx, V, 200, 203), active = part === 'attack';
    m.alive = part !== 'death'; m.deadT = m.alive ? 0 : Math.min(1.2, u); m.vx = part === 'run' ? 55 : 0; m.ai.t = t;
    if (m.rig) {
      if (active) {
        if (!state.attack || !state.attack.busy) { state.attack = new E.Attack(m.arch.attacks[0].spec); state.attack.start(); }
        state.attack.update(tick);
      } else state.attack = null;
      m.rig.update(tick, { x: 0, y: 0, z: 0, vx: m.vx, vy: 0, facing: m.facing, run: part === 'run' ? 1 : 0,
        attack: state.attack && state.attack.state, hurt: part === 'hurt', pose: part === 'death' ? 'die' : null, down: part === 'death' ? Math.min(1, u) : 0 });
      r.shadow(0, 0, 9, .7); r.flush();
      m.rig.draw(ctx, 200, 203, V); if (m.drawExtra) m.drawExtra(ctx, 200, 203, V);
    } else if (m.blob) {
      m.blob.update(tick, { squash: active ? Math.sin(t * 7) * .3 : part === 'death' ? -.4 : part === 'hurt' ? -.2 : Math.sin(t * 3) * .06, look: [Math.cos(t) * 20, 20], squint: active, flap: 1 });
      r.shadow(0, 0, 9, .7); r.flush(); m.blob.draw(ctx, 200, 193, V); if (m.drawExtra) m.drawExtra(ctx, 200, 193, V);
    } else if (m.genome.body === 'wisp') {
      m.ai.charge = active ? .3 + Math.sin(t * 5) * .28 : 0;
      m.arch.draw(m, r, 1); r.flush();
    } else if (m.genome.body === 'crawler') {
      m.body.rig.update(tick, { x: 0, y: 0, z: 0, vx: m.vx, vy: 0, facing: m.facing,
        dead: part === 'death' ? u : undefined, pose: { rear: active ? Math.max(0, Math.sin(t * 5)) : 0, fang: active ? 1 : 0, hurt: part === 'hurt' ? .8 : 0, crouch: active ? .4 : 0 } });
      r.shadow(0, 0, 13, .7); r.flush(); m.body.rig.draw(ctx, 200, 196, V);
    } else if (m.genome.body === 'eye') {
      m.body.rig.update(tick, { x: 0, y: 0, z: 0, look: [Math.cos(t * .7) * 25, 30, Math.sin(t) * 10], charge: active ? .8 : 0, dead: part === 'death' });
      r.shadow(0, 0, 8, .5); r.flush(); m.body.rig.draw(ctx, 200, 137, V);
    } else if (m.genome.body === 'burrower') {
      m.body.rig.update(tick, { x: Math.sin(t * .7) * 14, y: Math.cos(t * .7) * 8, z: 12 + Math.sin(t) * 3,
        facing: m.facing, jaw: active ? 1 : .1, writhe: part === 'hurt' ? .6 : 0, dead: part === 'death', crumble: part === 'death' ? Math.min(.8, u / 3) : 0 });
      m.body.rig.draw(r, m, 1); r.flush();
    }
    E.font.text(ctx, part.toUpperCase() + ' / ' + state.view.toUpperCase(), 200, 241, '#b3d8e7', { align: 'center', font: 'tiny' });
    E.font.text(ctx, 'GENOME ' + m.genome.fingerprint.toUpperCase(), 12, 12, '#dbb66b', { font: 'tiny' });
  }
  UI.def('foundry', { dom: true, captureKeys: true, open() { createPreview(); render(); }, close() { state.canvas = null; state.unit = null; closeForm(); },
    update(dt) { updateForm(); preview(dt); } });
  const style = document.createElement('style');
  style.textContent = `.ed-dialog.ed-foundry{width:min(1080px,96vw)}.ed-foundry-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px}.ed-foundry-preview{display:block;width:100%;height:auto;image-rendering:pixelated;border:1px solid #46526c;border-radius:8px}.ed-foundry-ribbon{display:flex;justify-content:space-between;gap:12px;color:#efc783;background:#191d2c;padding:12px;border-radius:6px;margin-bottom:18px}.ed-foundry-actions{display:flex;flex-wrap:wrap;gap:8px}.ed-foundry-json{display:block;box-sizing:border-box;width:100%;margin-top:8px;background:#101321;color:#c6d7e2;border:1px solid #46526c;border-radius:6px;padding:12px;font:12px/1.6 monospace;resize:vertical}.ed-foundry-footnote{opacity:.7;font-size:12px}.ed-foundry [data-foundry-status]{color:#a8e6ce;min-height:1.5em}.ed-foundry-launch{position:fixed;right:12px;top:12px;z-index:9;border:1px solid #756549;background:#171727dd;color:#e5c183;border-radius:6px;padding:9px 13px;font:12px system-ui;cursor:pointer}.ed-foundry-launch:focus-visible{outline:3px solid #c8e9ff}@media(max-width:650px){.ed-foundry-grid{grid-template-columns:1fr}.ed-foundry-ribbon{flex-direction:column}.ed-foundry-launch{top:6px;right:6px;padding:7px}}`;
  document.head.appendChild(style);
  const launcher = formElement('button', 'FOUNDRY · F8', document.body, { type: 'button', class: 'ed-foundry-launch', 'aria-label': 'Open creature Foundry' });
  launcher.onclick = open;
  addEventListener('keydown', e => { if (e.code === 'F8' && !e.repeat && !e.altKey && !e.ctrlKey && !e.metaKey) { e.preventDefault(); if (UI.isOpen('foundry')) UI.close('foundry'); else open(); } }, true);
  // An animated Beastwright makes the tool a discoverable part of Emberhold, not a hidden console demo.
  def('npcs', 'foundry_beastwright', { name: 'VEL', title: 'Beastwright · Foundry', at: [556, 314], facing: 2.5,
    rig: { weapon: null, outfit: 'coat', hair: 'ponytail', colors: { cloth: '#456374', trim: '#d5b46c', hair: '#b7c5c9', skin: '#b48d72' } },
    held: { kind: 'book', hand: 'L', color: '#42635e' }, service: 'foundry',
    hi: ['Every creature starts with a good skeleton.'], lines: ['Build a body. Give it intent. Test what it actually does.'],
    script: [{ dur: 3.4, rig: { pose: 'cast', point: true } }, { dur: 2, rig: { pose: 'idle' }, face: 2.2 }, { dur: 2.5, rig: { pose: 'cheer' }, face: 3 }] });
  const townBuild = TOWN.build;
  TOWN.build = function () {
    const lv = townBuild ? townBuild() : TOWN.fallback();
    if (lv.map.walkable(34, 19)) {
      const n = makeNPC('foundry_beastwright'); lv.npcs.push(n);
      addThing(lv, { kind: 'npcBody', x: n.x, y: n.y, r: 4, solid: true, keep: true, update() { this.x = n.x; this.y = n.y; } });
    }
    return lv;
  };
  window.__edFoundry = Object.freeze({ version: 1, describe: catalog, catalog, compose: G.compose, validate: G.validate, parse: G.parse,
    stats: G.stats, planPack: G.planPack, inspectAsset, inspect, auditLevel, open, spawn,
    enableSandbox: devEnable, disableSandbox: devDisable,
    travel(depth) { requireSandbox(); if (!Number.isInteger(depth) || depth < 1 || depth > 500) throw new RangeError('Live depth must be 1–500.'); devTravel(depth); },
    step(frames = 1) {
      requireSandbox();
      if (!Number.isInteger(frames) || frames < 1 || frames > 120) throw new RangeError('Frames must be 1–120.');
      const paused = DEV.paused, enginePaused = game.paused, stack = UI.stack;
      DEV.paused = true; DEV.steps = 1; game.paused = false; UI.stack = []; game.input.clear();
      try { for (let i = 0; i < frames; ++i) game._step(1 / 60); }
      finally { const raised = UI.stack; UI.stack = stack.concat(raised); DEV.steps = 0; DEV.paused = paused; game.paused = enginePaused; game.input.clear(); syncTouchControls(true); }
      return inspect();
    },
    preview(input, options = {}) { const genome = G.canonical(input); if (options.view && !views[options.view]) throw new TypeError('Unknown view.');
      if (options.pose && !['reel', 'idle', 'run', 'attack', 'hurt', 'death'].includes(options.pose)) throw new TypeError('Unknown pose.');
      state.genome = genome; if (options.view) state.view = options.view; if (options.pose) state.pose = options.pose;
      if (!UI.isOpen('foundry')) open(); else { createPreview(); render(); } preview(1 / 60, true); return snapshot(genome); },
    capture() { if (!state.canvas) throw new Error('Open Foundry before capturing its preview.'); return state.canvas.toDataURL('image/png'); }
  });
})();
