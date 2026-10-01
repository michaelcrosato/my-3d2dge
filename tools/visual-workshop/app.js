/* Browser UI and portable review format. No server, account, or model API is needed. */
(function () {
  'use strict';
  const VERSION = '1.0.0';
  const SCHEMA = 'emberdeep.visual-review.v1';
  const MAX_FRAMES = 32, MAX_NOTES = 100, MAX_FILE = 24_000_000;
  const $ = id => document.getElementById(id);
  const clone = value => JSON.parse(JSON.stringify(value));
  const PALETTES = {
    codex: { paper: '#eee2b9', light: '#fff5da', gold: '#d2a353', mint: '#83f4df', purple: '#bc9bea' },
    wanderer: { cloth: '#2f8f86', cape: '#c8452f', skin: '#f1c7a0', metal: '#dce8f1', hair: '#2e2230' }
  };
  const COLOR_NAMES = { paper: 'Paper', light: 'Mask', gold: 'Brass', mint: 'Light', purple: 'Ribbon', cloth: 'Cloth', cape: 'Cape', skin: 'Skin', metal: 'Blade', hair: 'Hair' };
  const defaults = (character = 'codex') => ({ character, mode: 'rig', reel: 0, action: '0', view: 'iso', yaw: 0, zoom: 3,
    background: 'dark', native: true, size: 1, colors: clone(PALETTES[character]), charge: 0, motion: 1, hover: .7, hoverRate: 2.8, seed: 104729, duration: 4 });
  const allowed = (value, values, name) => { if (!values.includes(value)) throw new Error('Invalid ' + name + '.'); return value; };
  const number = (value, min, max, name, integer = false) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) throw new Error('Invalid ' + name + '.');
    return value;
  };
  function validateConfig(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Missing settings.');
    const character = allowed(input.character, ['codex', 'wanderer'], 'character');
    const result = defaults(character);
    result.mode = allowed(input.mode, ['rig', 'gallery'], 'mode');
    result.reel = number(input.reel, 0, 3, 'gallery group', true);
    if (typeof input.action !== 'string' || !/^[a-zA-Z0-9_:\-.]{1,100}$/.test(input.action)) throw new Error('Invalid action ID.');
    result.action = input.action;
    result.view = allowed(input.view, ['iso', 'threequarter', 'topdown', 'brawler'], 'view');
    result.background = allowed(input.background, ['dark', 'light', 'checker'], 'background');
    result.native = input.native === true;
    for (const [key, min, max, integer] of [['yaw', -180, 180], ['zoom', 1, 6], ['size', .6, 1.6], ['charge', 0, 3, true], ['motion', .25, 2], ['hover', 0, 2], ['hoverRate', .5, 6], ['seed', 1, 2147483647, true]]) result[key] = number(input[key], min, max, key, integer);
    if (result.mode === 'gallery' && result.zoom > 3) throw new Error('Gallery zoom cannot exceed 3×.');
    result.duration = allowed(input.duration, [2, 4, 8, 12], 'duration');
    for (const key of Object.keys(PALETTES[character])) {
      const value = input.colors?.[key];
      if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) throw new Error('Invalid colour: ' + key);
      result.colors[key] = value.toLowerCase();
    }
    return result;
  }
  const signature = config => JSON.stringify(validateConfig(config));
  function validateImage(value) {
    if (typeof value !== 'string' || value.length > 2_000_000 || !/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(value)) throw new Error('Invalid PNG in the review.');
    // Read the PNG header without decoding a potentially oversized image.
    const header = atob(value.split(',')[1].slice(0, 44));
    if (header.slice(1, 4) !== 'PNG' || header.length < 24) throw new Error('Invalid PNG header.');
    const integer = offset => ((header.charCodeAt(offset) << 24) >>> 0) + (header.charCodeAt(offset + 1) << 16) + (header.charCodeAt(offset + 2) << 8) + header.charCodeAt(offset + 3);
    if (integer(16) !== 800 || integer(20) !== 500) throw new Error('Review frames must be 800 × 500 pixels.');
    return value;
  }
  function validateReview(data) {
    if (!data || data.schema !== SCHEMA) throw new Error('This is not a supported Visual Workshop review.');
    if (!data.source || !/^[a-f0-9]{64}$/.test(data.source.sha256)) throw new Error('The review has no valid source fingerprint.');
    if (!Array.isArray(data.captures) || data.captures.length > MAX_FRAMES || !Array.isArray(data.notes) || data.notes.length > MAX_NOTES) throw new Error('The review is too large.');
    const clean = { schema: SCHEMA, source: { sha256: data.source.sha256, name: String(data.source.name || '').slice(0, 200) },
      current: { config: validateConfig(data.current?.config), frame: number(data.current?.frame, 0, 720, 'frame', true) }, baseline: data.baseline ? validateConfig(data.baseline) : null, captures: [], notes: [] };
    if (clean.current.frame > clean.current.config.duration * 60) throw new Error('Frame is outside the loop.');
    const ids = new Set();
    for (const capture of data.captures) {
      if (typeof capture.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(capture.id) || ids.has(capture.id)) throw new Error('Invalid or duplicate capture ID.');
      ids.add(capture.id);
      const frame = number(capture.frame, 0, 720, 'capture frame', true), config = validateConfig(capture.config);
      if (frame > config.duration * 60) throw new Error('Capture is outside the loop.');
      clean.captures.push({ id: capture.id, frame, config, image: validateImage(capture.image), state: { simulationStep: frame }, sourceHash: clean.source.sha256 });
    }
    for (let index = 0; index < data.notes.length; index++) {
      const note = data.notes[index];
      if (typeof note.text !== 'string' || !note.text.trim() || note.text.length > 2000 || !ids.has(note.captureId)) throw new Error('Invalid note or missing note frame.');
      let pin = null;
      if (note.pin) pin = { x: number(note.pin.x, 0, 1, 'pin x'), y: number(note.pin.y, 0, 1, 'pin y') };
      clean.notes.push({ id: 'import-' + index, text: note.text, captureId: note.captureId, pin });
    }
    return clean;
  }

  // A small uncompressed ZIP writer. It avoids network dependencies and works offline.
  const encoder = new TextEncoder();
  const crcTable = new Uint32Array(256).map((_, index) => { let c = index; for (let bit = 0; bit < 8; bit++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc32 = bytes => { let c = 0xffffffff; for (const byte of bytes) c = crcTable[(c ^ byte) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  function zipFiles(entries) {
    const local = [], central = []; let offset = 0, centralSize = 0;
    for (const entry of entries) {
      const name = encoder.encode(entry.name), data = typeof entry.data === 'string' ? encoder.encode(entry.data) : entry.data;
      const crc = crc32(data), header = new Uint8Array(30 + name.length), view = new DataView(header.buffer);
      view.setUint32(0, 0x04034b50, true); view.setUint16(4, 20, true); view.setUint16(6, 0x0800, true); view.setUint16(12, 33, true);
      view.setUint32(14, crc, true); view.setUint32(18, data.length, true); view.setUint32(22, data.length, true); view.setUint16(26, name.length, true); header.set(name, 30);
      local.push(header, data);
      const record = new Uint8Array(46 + name.length), r = new DataView(record.buffer);
      r.setUint32(0, 0x02014b50, true); r.setUint16(4, 20, true); r.setUint16(6, 20, true); r.setUint16(8, 0x0800, true); r.setUint16(14, 33, true);
      r.setUint32(16, crc, true); r.setUint32(20, data.length, true); r.setUint32(24, data.length, true); r.setUint16(28, name.length, true); r.setUint32(42, offset, true); record.set(name, 46);
      central.push(record); centralSize += record.length; offset += header.length + data.length;
    }
    const end = new Uint8Array(22), e = new DataView(end.buffer);
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, entries.length, true); e.setUint16(10, entries.length, true); e.setUint32(12, centralSize, true); e.setUint32(16, offset, true);
    return new Blob([...local, ...central, end], { type: 'application/zip' });
  }
  function readReviewZip(buffer) {
    const bytes = new Uint8Array(buffer), view = new DataView(buffer); let offset = 0;
    while (offset + 30 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
      const flags = view.getUint16(offset + 6, true), method = view.getUint16(offset + 8, true), size = view.getUint32(offset + 18, true);
      const nameSize = view.getUint16(offset + 26, true), extraSize = view.getUint16(offset + 28, true);
      const start = offset + 30 + nameSize + extraSize, end = start + size;
      if (end > bytes.length || size > MAX_FILE || flags & 9 || method !== 0) throw new Error('Open review.json from this ZIP. Only unchanged Workshop ZIP files can open directly.');
      const name = new TextDecoder().decode(bytes.subarray(offset + 30, offset + 30 + nameSize));
      if (name === 'review.json') {
        const data = bytes.subarray(start, end);
        if (crc32(data) !== view.getUint32(offset + 14, true)) throw new Error('The review ZIP is damaged.');
        return JSON.parse(new TextDecoder().decode(data));
      }
      offset = end;
    }
    throw new Error('review.json is missing from the ZIP.');
  }
  function pngBytes(url) { const text = atob(url.split(',')[1]); return Uint8Array.from(text, char => char.charCodeAt(0)); }
  function download(blob, name) {
    const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  const uid = () => crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  async function hashSource(text) {
    if (!crypto.subtle) throw new Error('This browser cannot fingerprint the game here. Use the local Workshop server or a current browser.');
    const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(text)));
    return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  let config = defaults(), frame = 0, baseline = null, source = null, captures = [], notes = [], pin = null;
  let catalog = null, playing = false, playGeneration = 0, busy = false, lastImage = null, lastState = null;
  let renderSequence = 0, renderChain = Promise.resolve(), runtimes = {}, pendingDraft = null;
  const buildInfo = JSON.parse($('build-info').textContent);
  const gB = $('canvasB').getContext('2d'), gA = $('canvasA').getContext('2d'), marks = $('marks').getContext('2d');
  function status(message, error = false) { $('status').textContent = message; $('status').classList.toggle('error', error); }
  function report(error) { pause(); status(error.message || String(error), true); }
  function guarded(fn) { return (...args) => Promise.resolve().then(() => fn(...args)).catch(report); }
  function disposeRuntimes() { for (const runtime of Object.values(runtimes)) runtime.destroy(); runtimes = {}; }
  function makeRuntime(settings) {
    const channel = uid(), iframe = document.createElement('iframe'), pending = new Map(); let next = 0, disposed = false, bootTimer;
    let resolveReady, rejectReady;
    const runtime = { iframe, settings: signature(settings), frame: 0, catalog: null,
      ready: new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; }),
      destroy() {
        if (disposed) return; disposed = true; clearTimeout(bootTimer); window.removeEventListener('message', onMessage); iframe.remove();
        const error = new Error('Preview reset.'); error.name = 'AbortError'; rejectReady(error);
        for (const waiter of pending.values()) { clearTimeout(waiter.timer); waiter.reject(error); } pending.clear();
      },
      async render(target) {
        await runtime.ready;
        if (disposed) throw new Error('The preview was closed.');
        return new Promise((resolve, reject) => {
          const request = ++next;
          const timer = setTimeout(() => { pending.delete(request); reject(new Error('The preview did not return a frame. Reset it or load the game again.')); }, 30000);
          pending.set(request, { resolve, reject, timer });
          iframe.contentWindow.postMessage({ channel, type: 'render', request, frame: target }, '*');
        });
      }
    };
    function onMessage(event) {
      if (disposed || event.source !== iframe.contentWindow || event.data?.channel !== channel) return;
      const message = event.data;
      if (message.type === 'ready') { clearTimeout(bootTimer); runtime.catalog = { poses: message.poses, groups: message.groups }; resolveReady(message); }
      else if (message.type === 'fault') {
        const error = new Error(message.error || 'Game preview error.'); clearTimeout(bootTimer); rejectReady(error);
        for (const waiter of pending.values()) { clearTimeout(waiter.timer); waiter.reject(error); } pending.clear();
      } else if (message.type === 'result') {
        const waiter = pending.get(message.request); if (!waiter) return;
        clearTimeout(waiter.timer); pending.delete(message.request);
        if (message.error) waiter.reject(new Error(message.error));
        else { runtime.frame = message.frame; waiter.resolve(message); }
      }
    }
    iframe.className = 'runtime'; iframe.title = 'Isolated game preview'; iframe.tabIndex = -1; iframe.setAttribute('aria-hidden', 'true');
    iframe.setAttribute('sandbox', 'allow-scripts');
    window.addEventListener('message', onMessage);
    bootTimer = setTimeout(() => rejectReady(new Error('The game did not start. Use a current standalone Emberdeep build.')), 30000);
    try { iframe.srcdoc = VWBridge.buildHTML(source.html, settings, channel); document.body.appendChild(iframe); }
    catch (error) { clearTimeout(bootTimer); window.removeEventListener('message', onMessage); rejectReady(error); }
    return runtime;
  }
  async function runtimeFor(key, settings, target) {
    let runtime = runtimes[key];
    if (!runtime || runtime.settings !== signature(settings) || runtime.frame > target) {
      runtime?.destroy(); runtime = runtimes[key] = makeRuntime(settings);
    }
    await runtime.ready;
    return runtime;
  }
  function compareConfig() {
    if (!baseline || baseline.character !== config.character) return null;
    // Compare the saved look on the CURRENT action, seed, camera and timeline.
    return { ...clone(baseline), character: config.character, mode: config.mode, reel: config.reel, action: config.action, seed: config.seed,
      duration: config.duration, view: config.view, yaw: config.yaw, zoom: config.zoom, native: config.native, background: config.background };
  }
  function loadImage(url) {
    return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('Could not decode a preview frame.')); image.src = url; });
  }
  async function drawImage(context, url) { const image = await loadImage(url); context.imageSmoothingEnabled = false; context.clearRect(0, 0, 800, 500); context.drawImage(image, 0, 0, 800, 500); }
  function refresh() {
    const sequence = ++renderSequence;
    renderChain = renderChain.catch(() => {}).then(async () => {
      if (!source || sequence !== renderSequence) return;
      const current = clone(config), target = frame;
      const runtime = await runtimeFor('B', current, target);
      const result = await runtime.render(target);
      if (sequence !== renderSequence) return;
      if (!catalog || catalog.character !== config.character) { catalog = { ...runtime.catalog, character: config.character }; renderActions(); }
      lastImage = result.image; lastState = result.state;
      await drawImage(gB, result.image);
      const a = $('compare').checked ? compareConfig() : null;
      if (a) {
        const oldRuntime = await runtimeFor('A', a, target), oldResult = await oldRuntime.render(target);
        if (sequence !== renderSequence) return;
        await drawImage(gA, oldResult.image);
      }
      updateTimeline(); drawMarks();
      $('emptyState').hidden = true;
      $('connection').textContent = 'Game connected'; $('connection').classList.add('ready');
    });
    return renderChain;
  }
  function pause() { playing = false; playGeneration++; $('play').textContent = 'Play'; }
  async function play() {
    if (playing) { pause(); return; }
    if (!source || busy) return;
    playing = true; $('play').textContent = 'Pause'; const generation = ++playGeneration;
    let previous = performance.now(), accumulator = 0;
    while (playing && generation === playGeneration) {
      const now = performance.now(); accumulator += Math.min(.15, (now - previous) / 1000) * Number($('speed').value) * 60; previous = now;
      const steps = Math.floor(accumulator);
      if (steps > 0) {
        accumulator -= steps; frame += steps;
        const end = config.duration * 60;
        if (frame > end) {
          if ($('loop').checked) frame %= end + 1;
          else { frame = end; pause(); }
        }
        pin = null; await refresh();
      }
      await new Promise(resolve => setTimeout(resolve, 16));
    }
  }
  function updateTimeline() {
    const end = config.duration * 60;
    $('timeline').max = end; $('timeline').value = frame;
    $('frameLabel').textContent = 'FRAME ' + String(frame).padStart(4, '0');
    $('timeLabel').textContent = (frame / 60).toFixed(3) + ' s / ' + config.duration.toFixed(3) + ' s';
    $('endTime').textContent = config.duration + ' s'; $('midTime').textContent = config.duration / 2 + ' s';
    $('back').disabled = !source || frame === 0; $('step').disabled = !source || frame >= end;
    $('baselineLabel').textContent = 'SAME CAMERA / FRAME';
  }
  const pathsFor = settings => settings.mode === 'gallery'
    ? ['src/emberdeep/92-gallery.js', settings.character === 'codex' ? 'src/emberdeep/29-codex-skills.js' : 'src/emberdeep/25-skills-core.js', settings.reel === 1 ? 'src/emberdeep/31-monsters.js' : settings.reel === 2 ? 'src/emberdeep/36-bosses.js' : 'src/emberdeep/20-hero.js']
    : [settings.character === 'codex' ? 'src/emberdeep/21-codex.js' : 'engine/my-3d2dge.js', 'src/emberdeep/20-hero.js', 'src/emberdeep/92-gallery.js'];
  function actionItems() { return config.mode === 'rig' ? catalog?.poses || [] : catalog?.groups?.[config.reel] || []; }
  function renderActions() {
    const items = actionItems(), search = $('search').value.toLowerCase().trim(); $('actions').replaceChildren();
    for (const item of items.filter(item => item.name.toLowerCase().includes(search))) {
      const button = document.createElement('button'); button.textContent = item.name; button.dataset.action = item.id;
      button.classList.toggle('active', item.id === config.action); button.setAttribute('aria-pressed', item.id === config.action ? 'true' : 'false');
      button.addEventListener('click', guarded(async () => { pause(); config.action = item.id; frame = 0; pin = null; renderActions(); await refresh(); persist(); }));
      $('actions').appendChild(button);
    }
    const active = items.find(item => item.id === config.action);
    $('subjectTitle').textContent = (config.character === 'codex' ? 'Codex' : 'Wanderer') + ' / ' + (active?.name || config.action);
    $('sourcePaths').textContent = pathsFor(config).join('\n');
  }
  function syncControls() {
    for (const key of ['character', 'reel', 'view', 'yaw', 'zoom', 'size', 'motion', 'hover', 'hoverRate', 'charge', 'seed', 'duration', 'background']) $(key).value = config[key];
    $('native').checked = config.native; $('zoom').max = config.mode === 'gallery' ? '3' : '6';
    for (const [key, suffix] of [['yaw', '°'], ['zoom', '×'], ['size', '×'], ['motion', '×'], ['hover', ''], ['hoverRate', '']]) $(key + 'Out').textContent = config[key] + suffix;
    $('rigMode').classList.toggle('active', config.mode === 'rig'); $('galleryMode').classList.toggle('active', config.mode === 'gallery');
    $('rigMode').setAttribute('aria-pressed', String(config.mode === 'rig')); $('galleryMode').setAttribute('aria-pressed', String(config.mode === 'gallery'));
    $('reel').hidden = $('reelLabel').hidden = config.mode !== 'gallery';
    $('motionGroup').hidden = config.mode === 'gallery'; $('codexMotion').hidden = config.character !== 'codex'; $('chargeGroup').hidden = config.character !== 'codex';
    $('background').disabled = config.mode === 'gallery'; $('native').disabled = config.mode === 'gallery';
    const usableA = !!baseline && baseline.character === config.character;
    $('restoreA').disabled = !usableA; $('compare').disabled = !usableA;
    if (!usableA) $('compare').checked = false;
    $('baselineStage').hidden = !$('compare').checked; $('stages').classList.toggle('comparing', $('compare').checked);
    $('colors').replaceChildren();
    for (const key of Object.keys(PALETTES[config.character])) {
      const label = document.createElement('label'), input = document.createElement('input'), text = document.createElement('span');
      input.type = 'color'; input.value = config.colors[key]; input.id = 'color-' + key; input.setAttribute('aria-label', COLOR_NAMES[key]); text.textContent = COLOR_NAMES[key];
      input.addEventListener('change', guarded(async () => { pause(); config.colors[key] = input.value; pin = null; await refresh(); persist(); }));
      label.append(input, text); $('colors').appendChild(label);
    }
    updateTimeline(); renderActions();
  }
  function enableUI() {
    for (const id of ['character', 'rigMode', 'galleryMode', 'search', 'reel', 'saveA', 'restart', 'play', 'step', 'timeline', 'capture', 'captureStrip', 'savePNG', 'resetLook', 'note', 'addNote', 'clearPin', 'exportReview']) $(id).disabled = false;
    $('settings').disabled = false; syncControls();
  }
  async function loadGame(html, name) {
    pause(); disposeRuntimes(); renderSequence++;
    VWBridge.patchGame(html); // Validate the adapter before the browser executes the supplied game.
    const sha256 = await hashSource(html);
    source = { html, name, sha256 }; config = defaults(); frame = 0; baseline = null; catalog = null; captures = []; notes = []; pin = null;
    $('sourceLabel').textContent = name + ' · ' + sha256.slice(0, 12);
    if (buildInfo.commit) $('buildLabel').textContent = 'SOURCE ' + buildInfo.commit.slice(0, 12) + (buildInfo.dirty ? ' · LOCAL CHANGES' : '');
    enableUI(); status('Loading the actual game in an isolated preview.');
    await refresh();
    status('Ready. Select a pose, press Play, or open the game gallery. Changes stay in this preview.');
    if (pendingDraft?.source?.sha256 === sha256) {
      try { await applyReview(validateReview(pendingDraft)); status('Restored the local review draft for this game version.'); } catch { /* An invalid draft does not prevent a fresh session. */ }
    }
    renderReviewLists(); window.VisualWorkshop.ready = true;
  }
  function matchingNotes(capture) { return notes.filter(note => note.captureId === capture.id); }
  function currentCapture() { return captures.find(capture => capture.frame === frame && signature(capture.config) === signature(config)); }
  function drawPin(context, point, label) {
    const x = point.x * 800, y = point.y * 500;
    context.save(); context.lineWidth = 2; context.strokeStyle = '#101b0b'; context.fillStyle = '#c3e79c';
    context.beginPath(); context.arc(x, y, 11, 0, Math.PI * 2); context.fill(); context.stroke();
    context.fillStyle = '#172211'; context.font = 'bold 11px sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(label, x, y + .5); context.restore();
  }
  function drawMarks() {
    marks.clearRect(0, 0, 800, 500);
    const current = currentCapture();
    if (current) matchingNotes(current).forEach((note, index) => { if (note.pin) drawPin(marks, note.pin, String(index + 1)); });
    if (pin) drawPin(marks, pin, '+');
  }
  async function captureCurrent() {
    pause(); await refresh();
    const existing = currentCapture(); if (existing) return existing;
    if (captures.length >= MAX_FRAMES) throw new Error('This review already has 32 frames. Export it before starting another review.');
    if (!lastImage) throw new Error('No frame is ready.');
    const capture = { id: uid(), frame, config: clone(config), image: lastImage, state: clone(lastState || {}), sourceHash: source.sha256 };
    captures.push(capture); renderReviewLists(); persist(); return capture;
  }
  async function annotatedImage(capture) {
    const canvas = document.createElement('canvas'); canvas.width = 800; canvas.height = 500;
    const context = canvas.getContext('2d'); await drawImage(context, capture.image);
    matchingNotes(capture).forEach((note, index) => { if (note.pin) drawPin(context, note.pin, String(index + 1)); });
    return canvas.toDataURL('image/png');
  }
  function renderReviewLists() {
    $('frameStrip').replaceChildren(); $('noteList').replaceChildren();
    if (!captures.length) { const text = document.createElement('p'); text.className = 'muted'; text.textContent = 'Capture a frame to start a review.'; $('frameStrip').appendChild(text); }
    for (const capture of captures) {
      const button = document.createElement('button'), image = document.createElement('img'), caption = document.createElement('span');
      button.className = 'frame-card'; button.classList.toggle('annotated', matchingNotes(capture).length > 0);
      image.src = capture.image; image.alt = capture.config.character + ', frame ' + capture.frame; caption.textContent = 'F' + String(capture.frame).padStart(4, '0') + ' · ' + (capture.frame / 60).toFixed(2) + 's' + (matchingNotes(capture).length ? ' · NOTE' : '');
      button.append(image, caption); button.title = 'Restore this frame and its settings';
      button.addEventListener('click', guarded(async () => { pause(); config = clone(capture.config); frame = capture.frame; pin = null; syncControls(); await refresh(); renderReviewLists(); })); $('frameStrip').appendChild(button);
    }
    for (const note of notes) {
      const capture = captures.find(item => item.id === note.captureId); if (!capture) continue;
      const card = document.createElement('div'), head = document.createElement('div'), label = document.createElement('span'), text = document.createElement('p'), remove = document.createElement('button');
      card.className = 'note-card'; head.className = 'note-head'; label.textContent = capture.config.character.toUpperCase() + ' · FRAME ' + capture.frame;
      remove.textContent = '×'; remove.setAttribute('aria-label', 'Remove note'); text.textContent = note.text;
      remove.addEventListener('click', () => { notes = notes.filter(item => item !== note); renderReviewLists(); drawMarks(); persist(); });
      head.append(label, remove); card.append(head, text); $('noteList').appendChild(card);
    }
    drawMarks();
  }
  function makeReview() {
    return { schema: SCHEMA, workshopVersion: VERSION, createdAt: new Date().toISOString(), source: { name: source.name, sha256: source.sha256,
      commit: buildInfo.gameSha256 === source.sha256 ? buildInfo.commit || null : null, dirty: buildInfo.gameSha256 === source.sha256 ? !!buildInfo.dirty : null },
      current: { config: clone(config), frame }, baseline: baseline ? clone(baseline) : null, captures: clone(captures), notes: clone(notes),
      reproduction: { stepsPerSecond: 60, renderer: 'Canvas 2D', galleryFrameZero: 'First rendered engine tick after gallery setup. Later frames add fixed ticks.',
        playbackSpeedIsNotGameplaySpeed: true, backwardSeek: 'New sandbox; same source, seed and settings; replay from zero.',
        scope: 'Pose studies drive the actual rig directly. The game gallery runs real scene updates. Browser and platform differences can affect pixels.' }, sourcePaths: pathsFor(config),
      changePolicy: 'Preview settings only. A review does not edit game source or saved progress.' };
  }
  let draftWarning = false;
  function persist() {
    if (!source) return;
    try { localStorage.setItem('ed:visual-workshop:v1', JSON.stringify(makeReview())); }
    catch { if (!draftWarning) { draftWarning = true; status('Local draft storage is unavailable or full. Export the review to keep your work.'); } }
  }
  async function applyReview(review) {
    if (!source) throw new Error('Open the matching game file before opening a review.');
    if (review.source.sha256 !== source.sha256) throw new Error('This review uses a different game build. Open the exact game file used for that review. No settings were applied.');
    pause(); config = clone(review.current.config); frame = review.current.frame; baseline = review.baseline; captures = review.captures; notes = review.notes; pin = null;
    syncControls(); await refresh(); renderReviewLists(); persist();
  }
  async function overview() {
    const columns = 3, cellW = 400, cellH = 294, rows = Math.ceil(captures.length / columns);
    const canvas = document.createElement('canvas'); canvas.width = columns * cellW; canvas.height = 80 + rows * cellH;
    const g = canvas.getContext('2d'); g.imageSmoothingEnabled = false; g.fillStyle = '#10171b'; g.fillRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = '#c0dfa3'; g.font = 'bold 22px sans-serif'; g.fillText('EMBERDEEP / VISUAL REVIEW', 18, 30);
    g.fillStyle = '#a8b6b2'; g.font = '12px monospace'; g.fillText('Source ' + source.sha256.slice(0, 16) + ' · ' + captures.length + ' frames · ' + notes.length + ' notes', 18, 55);
    for (let index = 0; index < captures.length; index++) {
      const capture = captures[index], x = index % columns * cellW, y = 80 + Math.floor(index / columns) * cellH;
      const image = await loadImage(await annotatedImage(capture)); g.drawImage(image, x + 10, y, 380, 237.5);
      g.fillStyle = '#c0dfa3'; g.font = '12px monospace'; g.fillText(String(index + 1).padStart(2, '0') + ' · ' + capture.config.character + ' · ' + capture.config.mode + ':' + capture.config.action + ' · F' + capture.frame, x + 12, y + 258);
      g.fillStyle = '#a8b6b2'; g.font = '11px monospace'; g.fillText(matchingNotes(capture).length + ' notes · ' + (capture.frame / 60).toFixed(3) + 's', x + 12, y + 276);
    }
    return canvas.toDataURL('image/png');
  }
  async function withBusy(title, operation) {
    pause(); if (busy) return; busy = true; $('busyTitle').textContent = title; $('busyProgress').value = 0; $('busyDialog').showModal();
    try { return await operation(); } finally { busy = false; $('busyDialog').close(); }
  }
  async function exportReview() {
    await withBusy('Export review', async () => {
      if (!captures.length) await captureCurrent();
      const review = makeReview(), entries = [{ name: 'review.json', data: JSON.stringify(review, null, 2) }];
      const lines = ['# Emberdeep visual review', '', 'Game: ' + source.name, 'SHA-256: ' + source.sha256, '', 'Open overview.png first. Read review.json for exact settings and frame state.',
        'Open this ZIP with the Workshop to restore the review. Use the same game build.', '', 'These are preview settings. No game source or saved progress was changed.', '', '## Requested changes', ''];
      for (let index = 0; index < captures.length; index++) {
        const capture = captures[index], filename = 'frames/' + String(index + 1).padStart(2, '0') + '-frame-' + String(capture.frame).padStart(4, '0') + '.png';
        entries.push({ name: filename, data: pngBytes(await annotatedImage(capture)) });
        lines.push('### ' + filename, '', 'Subject: ' + capture.config.character + ' / ' + capture.config.mode + ' / ' + capture.config.action, 'Frame: ' + capture.frame + ' (' + (capture.frame / 60).toFixed(3) + ' s)', '');
        matchingNotes(capture).forEach((note, noteIndex) => lines.push((noteIndex + 1) + '. ' + note.text + (note.pin ? ' [marker ' + (noteIndex + 1) + ']' : ''), ''));
        $('busyProgress').value = (index + 1) / (captures.length + 1);
      }
      lines.push('## Source locations', '', ...pathsFor(config).map(path => '`' + path + '`'), '', '## Comparison', '', 'A stores a look. A and B use the current action, camera, seed and timeline. Their motion rates may differ.', '', '## Verification limits', '', 'Canvas rendering only. Same-build, same-browser replay is the target. Pixel identity across browsers is not guaranteed.');
      entries.push({ name: 'notes.md', data: lines.join('\n') }, { name: 'overview.png', data: pngBytes(await overview()) });
      download(zipFiles(entries), 'emberdeep-review-' + new Date().toISOString().slice(0, 10) + '.zip'); $('busyProgress').value = 1;
      status('Review exported. Share the ZIP here, or share overview.png with review.json and notes.md.'); persist();
    });
  }

  $('openGame').onclick = $('openGameEmpty').onclick = () => $('gameFile').click();
  $('gameFile').addEventListener('change', guarded(async () => {
    const file = $('gameFile').files[0]; if (!file) return; $('gameFile').value = '';
    if (file.size > 12_000_000) throw new Error('The game file is larger than 12 MB.');
    if ((captures.length || notes.length) && !confirm('Open another game and replace this review? Export first to keep the current review.')) return;
    pendingDraft = null; await loadGame(await file.text(), file.name);
  }));
  $('importReview').onclick = () => $('reviewFile').click(); $('reviewFile').accept = '.json,.zip,application/json,application/zip';
  $('reviewFile').addEventListener('change', guarded(async () => {
    const file = $('reviewFile').files[0]; if (!file) return; $('reviewFile').value = '';
    if (file.size > MAX_FILE) throw new Error('The review is larger than 24 MB.');
    if ((captures.length || notes.length) && !confirm('Replace the current review? Export first to keep it.')) return;
    const data = file.name.toLowerCase().endsWith('.zip') ? readReviewZip(await file.arrayBuffer()) : JSON.parse(await file.text());
    await applyReview(validateReview(data)); status('Review restored. Captured frames and notes keep their original settings.');
  }));
  $('exportReview').onclick = guarded(exportReview);
  $('character').addEventListener('change', guarded(async () => {
    pause(); const character = $('character').value; config = { ...defaults(character), view: config.view, yaw: config.yaw, zoom: config.zoom, background: config.background, duration: config.duration }; frame = 0; pin = null; catalog = null;
    syncControls(); await refresh(); persist();
  }));
  async function setMode(mode) {
    pause(); config.mode = mode; if (mode === 'gallery') config.zoom = Math.min(3, config.zoom); config.reel = 0; config.action = mode === 'rig' ? '0' : catalog.groups[0][0].id; frame = 0; pin = null; syncControls(); await refresh(); persist();
  }
  $('rigMode').onclick = guarded(() => setMode('rig')); $('galleryMode').onclick = guarded(() => setMode('gallery'));
  $('reel').addEventListener('change', guarded(async () => { pause(); config.reel = Number($('reel').value); config.action = catalog.groups[config.reel][0].id; frame = 0; pin = null; syncControls(); await refresh(); persist(); }));
  $('search').oninput = renderActions;
  for (const key of ['view', 'yaw', 'zoom', 'size', 'motion', 'hover', 'hoverRate', 'charge', 'seed', 'duration', 'background', 'native']) {
    $(key).addEventListener('input', () => { if ($(key + 'Out')) $(key + 'Out').textContent = $(key).value + (key === 'yaw' ? '°' : ['zoom', 'size', 'motion'].includes(key) ? '×' : ''); });
    $(key).addEventListener('change', guarded(async () => {
      pause(); const value = key === 'native' ? $(key).checked : ['view', 'background'].includes(key) ? $(key).value : Number($(key).value);
      const next = { ...config, [key]: value }; config = validateConfig(next); frame = Math.min(frame, config.duration * 60); pin = null; syncControls(); await refresh(); persist();
    }));
  }
  $('saveA').onclick = guarded(async () => { pause(); baseline = clone(config); $('compare').checked = true; syncControls(); await refresh(); persist(); status('A saved. Both previews use the current action, camera, seed and frame.'); });
  $('restoreA').onclick = guarded(async () => { pause(); config = compareConfig() || config; pin = null; syncControls(); await refresh(); persist(); });
  $('compare').onchange = guarded(async () => { syncControls(); await refresh(); });
  $('resetLook').onclick = guarded(async () => { pause(); const fresh = defaults(config.character); config = { ...config, size: fresh.size, colors: fresh.colors, charge: fresh.charge, motion: fresh.motion, hover: fresh.hover, hoverRate: fresh.hoverRate }; pin = null; syncControls(); await refresh(); persist(); });
  $('play').onclick = guarded(play);
  async function seek(target) { pause(); frame = Math.max(0, Math.min(config.duration * 60, target)); pin = null; await refresh(); }
  $('restart').onclick = guarded(() => seek(0)); $('back').onclick = guarded(() => seek(frame - 1)); $('step').onclick = guarded(() => seek(frame + 1));
  $('timeline').oninput = guarded(() => seek(Number($('timeline').value)));
  $('capture').onclick = guarded(async () => { await captureCurrent(); status('Frame captured. Select its card to restore the exact settings.'); });
  $('captureStrip').onclick = guarded(async () => {
    if (captures.length > MAX_FRAMES - 8) throw new Error('Leave room for eight frames. Export this review before starting another.');
    await withBusy('Capture eight frames', async () => {
      const original = frame;
      try { for (let index = 0; index < 8; index++) { frame = Math.round(config.duration * 60 * index / 7); await captureCurrent(); $('busyProgress').value = (index + 1) / 8; } }
      finally { frame = original; await refresh(); }
      status('Frame strip captured. Select a card and add a note.'); persist();
    });
  });
  $('savePNG').onclick = guarded(async () => { const capture = await captureCurrent(); download(new Blob([pngBytes(await annotatedImage(capture))], { type: 'image/png' }), 'emberdeep-' + config.character + '-frame-' + frame + '.png'); });
  $('marks').addEventListener('pointerdown', guarded(async event => {
    if (!source || busy) return; pause(); await refresh();
    const bounds = $('marks').getBoundingClientRect(); pin = { x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)), y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)) };
    drawMarks(); $('note').focus();
  }));
  $('clearPin').onclick = () => { pin = null; drawMarks(); };
  $('addNote').onclick = guarded(async () => {
    const text = $('note').value.trim(); if (!text) throw new Error('Enter a note first.');
    if (notes.length >= MAX_NOTES) throw new Error('This review already has 100 notes. Export it before starting another.');
    const anchor = pin ? clone(pin) : null, capture = await captureCurrent(); notes.push({ id: uid(), text, captureId: capture.id, pin: anchor });
    pin = null; $('note').value = ''; renderReviewLists(); persist(); status('Note saved with its frame and settings.');
  });
  $('busyDialog').addEventListener('cancel', event => event.preventDefault());
  window.addEventListener('keydown', event => {
    if (!source || busy || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(event.target.tagName) || event.target.isContentEditable) return;
    const commands = { ' ': play, ArrowLeft: () => seek(frame - 1), ArrowRight: () => seek(frame + 1), c: captureCurrent, C: captureCurrent };
    if (commands[event.key]) { event.preventDefault(); guarded(commands[event.key])(); }
  });
  window.addEventListener('pagehide', () => { persist(); pause(); disposeRuntimes(); });
  window.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  // A small, read-only inspection surface for automated tests and future adapters.
  window.VisualWorkshop = { version: VERSION, validateConfig, validateReview, zipFiles, readReviewZip, crc32,
    get state() { return { config: clone(config), frame, playing, sourceHash: source?.sha256 || null, baseline: baseline ? clone(baseline) : null, captureCount: captures.length, noteCount: notes.length }; },
    get review() { return source ? makeReview() : null; }, get settled() { return renderChain; }, ready: false };
  try { pendingDraft = JSON.parse(localStorage.getItem('ed:visual-workshop:v1') || 'null'); } catch { /* Draft storage is optional. */ }
  const embedded = JSON.parse($('game-source').textContent);
  if (typeof embedded === 'string') guarded(async () => { await loadGame(embedded, buildInfo.sourceName || 'examples/emberdeep.html'); window.VisualWorkshop.ready = true; })();
  else if (location.protocol === 'http:' || location.protocol === 'https:') {
    guarded(async () => { const response = await fetch('../../examples/emberdeep.html'); if (!response.ok) throw new Error('Open examples/emberdeep.html with Open game file, or run node tools/visual-workshop.mjs.'); await loadGame(await response.text(), 'examples/emberdeep.html'); window.VisualWorkshop.ready = true; })();
  }
})();
