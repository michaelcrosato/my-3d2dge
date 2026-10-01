/* Visual Workshop adapter. The original game file is never written.
 * The sandbox runs a temporary copy with a fixed clock and isolated storage.
 * Do not add allow-same-origin to the sandbox in app.js.
 */
(function (root) {
  'use strict';
  const PALETTE = { paper: '#eee2b9', light: '#fff5da', gold: '#d2a353', mint: '#83f4df', purple: '#bc9bea' };
  const json = value => JSON.stringify(value).replace(/</g, String.fromCharCode(92) + 'u003c');

  function patchGame(source) {
    if (typeof source !== 'string' || source.length > 12_000_000) throw new Error('Use a standalone Emberdeep HTML file smaller than 12 MB.');
    const marker = /window\.__ed\s*=\s*\{/g;
    if ([...source.matchAll(marker)].length !== 1) throw new Error('This file has no supported Emberdeep tool handle. Rebuild examples/emberdeep.html from this repository.');
    const hooks = 'window.__vwGallery = { GAL, GAL_POSES, galItems, galReset, settleCape };\n';
    source = source.replace(marker, match => hooks + match);
    const start = source.indexOf('class CodexRig');
    const end = source.indexOf('\n}', start) + 2;
    let palette = false, hover = false;
    if (start >= 0 && end > start) {
      let block = source.slice(start, end), count = 0;
      for (const [key, value] of Object.entries(PALETTE)) {
        const re = new RegExp('\\b' + key + ':\\s*["\']' + value + '["\']', 'g');
        const matches = [...block.matchAll(re)];
        if (matches.length === 1) {
          block = block.replace(re, `${key}: (window.__vwLook.colors.${key} || '${value}')`);
          count++;
        }
      }
      palette = count === Object.keys(PALETTE).length;
      const bob = /Math\.sin\(this\.t\s*\*\s*2\.8\)\s*\*\s*0\.7/g;
      hover = [...block.matchAll(bob)].length === 1;
      if (hover) block = block.replace(bob, 'Math.sin(this.t * window.__vwLook.hoverRate) * window.__vwLook.hover');
      source = source.slice(0, start) + block + source.slice(end);
    }
    // Fail closed. A changed source layout must get a new adapter, not a silent partial preview.
    if (!palette || !hover) throw new Error('The Codex source layout has changed. This Workshop adapter needs an update before it can apply preview settings.');
    return source;
  }

  function bootstrap(config, channel) {
    'use strict';
    window.__vwConfig = config;
    window.__vwChannel = channel;
    window.__vwLook = config;
    let randomState = config.seed >>> 0, now = 1000, serial = 0;
    const callbacks = new Map();
    Math.random = () => {
      randomState += 0x6D2B79F5;
      let t = randomState;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
    const memoryStorage = () => {
      const data = new Map();
      return { get length() { return data.size; }, key: i => [...data.keys()][i] ?? null,
        getItem: key => data.get(String(key)) ?? null,
        setItem: (key, value) => data.set(String(key), String(value)),
        removeItem: key => data.delete(String(key)), clear: () => data.clear() };
    };
    // The opaque sandbox also blocks access to the host's storage if an override fails.
    Object.defineProperty(window, 'localStorage', { value: memoryStorage(), configurable: true });
    Object.defineProperty(window, 'sessionStorage', { value: memoryStorage(), configurable: true });
    Object.defineProperty(performance, 'now', { value: () => now, configurable: true });
    Date.now = () => 1_700_000_000_000 + now;
    // Connected controllers must not steer a repeatable capture.
    Object.defineProperty(navigator, 'getGamepads', { value: () => [], configurable: true });
    window.requestAnimationFrame = callback => { callbacks.set(++serial, callback); return serial; };
    window.cancelAnimationFrame = id => callbacks.delete(id);
    window.__vwClock = { tick() { now += 1000 / 60; const batch = [...callbacks.values()]; callbacks.clear(); for (const callback of batch) callback(now); }, get now() { return now; } };
    window.addEventListener('error', e => parent.postMessage({ channel, type: 'fault', error: String(e.message).slice(0, 1500) }, '*'));
    window.addEventListener('unhandledrejection', e => parent.postMessage({ channel, type: 'fault', error: String(e.reason).slice(0, 1500) }, '*'));
  }

  function startBridge() {
    'use strict';
    const config = window.__vwConfig, channel = window.__vwChannel;
    const api = window.__ed, E = window.My3D2dge, hooks = window.__vwGallery;
    const post = data => parent.postMessage({ channel, ...data }, '*');
    try {
      if (!api || !E || !hooks || !api.newHero) throw new Error('The game did not expose the required preview API.');
      const game = api.game;
      if (game.errors?.length) throw new Error(game.errors[0].message);
      game.onError = (error, where) => post({ type: 'fault', error: where + ': ' + error.message });
      game.paused = true;
      game.fadeTime = 0;
      api.OPT.gpu = false;
      api.OPT.music = 0;
      api.OPT.sfx = 0;
      api.OPT.shake = false;
      api.OPT.numbers = false;
      if (game.audio) { game.audio.musicVolume = 0; game.audio.sfxVolume = 0; if (game.audio._levels) game.audio._levels(); }
      api.CHAR.selected = config.character;
      api.ED.hero = api.newHero(config.character);
      const cv = document.createElement('canvas');
      cv.width = 800; cv.height = 500;
      const g = cv.getContext('2d', { willReadFrequently: true });
      g.imageSmoothingEnabled = false;
      let frame = 0, hero = api.ED.hero;
      const clone = object => JSON.parse(JSON.stringify(object));
      const groups = [];
      for (let reel = 0; reel < 4; reel++) {
        hooks.GAL.reel = reel;
        groups.push(hooks.galItems().map(id => ({ id: String(id), name: reel === 0 ? api.REG.skills[id].name : reel === 1 ? api.REG.archetypes[id].name : reel === 2 ? (api.REG.bosses[id]?.name || String(id).replace('gal:', '')) : hooks.GAL_POSES[id][0] })));
      }
      const poses = hooks.GAL_POSES.map((p, index) => ({ id: String(index), name: p[0] }));
      function applyLook() {
        if (hero.rig.o) hero.rig.o.size = config.size;
        if (config.character === 'wanderer' && hero.rig.C) Object.assign(hero.rig.C, config.colors);
        hero.manuscript = config.charge;
      }
      function rigState() {
        const pose = hooks.GAL_POSES[Number(config.action)] || hooks.GAL_POSES[0];
        const s = Object.assign({ x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 }, clone(pose[1]));
        // Give the non-humanoid rig the same motion input as the selected gait.
        if (s.run) { s.vx = 0; s.vy = s.run * 90; }
        return s;
      }
      game.setView(config.view);
      if (config.mode === 'gallery') {
        game.go('gallery', undefined, { fade: 0 });
        window.__vwClock.tick(); // game.go enters the scene on the next engine step.
        api.ED.hero = hero = api.newHero(config.character);
        hooks.GAL.reel = config.reel;
        const list = hooks.galItems();
        const index = list.findIndex(id => String(id) === String(config.action));
        if (index < 0) throw new Error('This gallery item is not available for this character.');
        hooks.GAL.i = index;
        hooks.galReset();
        game.setView(config.view);
        game.resetCamera();
        game.rotateView(config.yaw);
        game.setZoom(config.zoom);
        game.paused = false;
      } else {
        applyLook();
        hero.rig.update(0, rigState());
      }
      applyLook();
      function stageBackground() {
        g.fillStyle = config.background === 'light' ? '#d9ddd5' : '#12191e';
        g.fillRect(0, 0, 800, 500);
        if (config.background === 'checker') {
          for (let y = 0; y < 500; y += 20) for (let x = 0; x < 800; x += 20) { g.fillStyle = ((x + y) / 20) % 2 ? '#202a31' : '#172027'; g.fillRect(x, y, 20, 20); }
        } else {
          g.strokeStyle = config.background === 'light' ? '#bfc7ba' : '#243138';
          g.lineWidth = 1;
          for (let y = 330; y < 500; y += 26) { g.beginPath(); g.moveTo(0, y + .5); g.lineTo(800, y + .5); g.stroke(); }
          for (let x = -400; x < 1200; x += 100) { g.beginPath(); g.moveTo(400 + (x - 400) * .1, 290); g.lineTo(x, 500); g.stroke(); }
        }
      }
      function makeView(scale) {
        // Use the game's own preset angles and its own View projection.
        const base = E.VIEWS[config.view];
        const view = new E.View('workshop', 'Workshop', base.yawDeg + config.yaw, base.pitchDeg, base.scale * scale, base.zBoost);
        view.zoom = scale;
        return view;
      }
      function draw() {
        stageBackground();
        g._c = null;
        if (config.mode === 'gallery') {
          const screen = document.getElementById('screen');
          if (!screen || !screen.width) throw new Error('The game has no rendered canvas.');
          const scale = Math.min(800 / screen.width, 500 / screen.height);
          const width = screen.width * scale, height = screen.height * scale;
          g.drawImage(screen, (800 - width) / 2, (500 - height) / 2, width, height);
        } else {
          const view = makeView(config.zoom);
          E.px.ell(g, 400, 375, 16 * config.zoom * config.size, 3 * config.zoom, '#0b1014');
          g._c = null; hero.rig.draw(g, 400, 372, view);
          if (config.native) {
            g.fillStyle = config.background === 'light' ? '#e8ede1' : '#1c252b'; g.fillRect(22, 22, 140, 116);
            g.strokeStyle = '#465442'; g.strokeRect(22.5, 22.5, 139, 115);
            g.fillStyle = config.background === 'light' ? '#364330' : '#b6c4ad'; g.font = '10px monospace'; g.fillText('1× RIG REFERENCE', 32, 41);
            g._c = null; hero.rig.draw(g, 91, 116, makeView(1));
          }
          g.fillStyle = config.background === 'light' ? '#55624f' : '#738778';
          g.font = '10px monospace';
          g.fillText('POSE STUDY  /  ' + config.character.toUpperCase(), 22, 476);
          g.fillText('60 FIXED STEPS / SECOND', 595, 476);
        }
        return cv.toDataURL('image/png');
      }
      function advance(target) {
        if (!Number.isInteger(target) || target < frame || target > 720) throw new Error('Frame must move forward and remain between 0 and 720. Reset the sandbox to move backward.');
        while (frame < target) {
          frame++;
          if (config.mode === 'gallery') {
            applyLook();
            game.paused = false;
            window.__vwClock.tick();
            if (game.errors?.length) throw new Error(game.errors[0].message);
          } else {
            const dt = config.motion / 60;
            hero.rig.update(dt, rigState());
            if (hooks.settleCape) hooks.settleCape(hero.rig, dt, .3);
          }
        }
        applyLook();
      }
      window.addEventListener('message', event => {
        if (event.source !== parent || event.data?.channel !== channel) return;
        const message = event.data;
        if (message.type !== 'render') return;
        try {
          advance(message.frame);
          post({ type: 'result', request: message.request, frame, image: draw(), state: { simulationStep: frame, rigTime: hero.rig.t ?? null, character: config.character, action: config.action, mode: config.mode, galleryTime: config.mode === 'gallery' ? hooks.GAL.t : null, galleryItem: config.mode === 'gallery' ? hooks.GAL.cur : null } });
        } catch (error) { post({ type: 'result', request: message.request, error: error.message }); }
      });
      // Let the normal renderer draw once without advancing the reported timeline.
      // Gallery frame zero is its first rendered engine tick; this convention is recorded in exports.
      if (config.mode === 'gallery') window.__vwClock.tick();
      post({ type: 'ready', poses, groups, image: draw(), state: { simulationStep: 0, character: config.character, action: config.action, mode: config.mode } });
    } catch (error) { post({ type: 'fault', error: error.message }); }
  }

  function buildHTML(source, config, channel) {
    let html = patchGame(source);
    const prelude = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; media-src blob:; connect-src 'none'; font-src 'none'; worker-src blob:"><script>(${bootstrap.toString()})(${json(config)},${json(channel)})<\/script>`;
    if (!/<head(?:\s[^>]*)?>/i.test(html)) throw new Error('The game file has no HTML head.');
    html = html.replace(/<head(?:\s[^>]*)?>/i, match => match + prelude);
    // Force Canvas lighting before the game starts; stored options are empty in this sandbox.
    html = html.replace(/<\/body\s*>/i, `<script>(${startBridge.toString()})()<\/script></body>`);
    return html;
  }
  root.VWBridge = { buildHTML, patchGame, bootstrap, startBridge };
})(typeof window !== 'undefined' ? window : globalThis);
