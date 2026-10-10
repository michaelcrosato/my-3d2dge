/* Animation Studio: preview and HTML controls over AnimationStudioModel.
 * The same actions run locally, through HTTP, and through MCP. A live connection uses server revisions.
 * Public handle: window.__animationStudio (project, pose, lib, game, apply, seek, setPreview, loadSnapshot).
 * ?capture=1 is an isolated view for tools: no file connection or browser storage. */
(() => {
'use strict';
const E = My3D2dge, MR = MocapReadable, M = AnimationStudioModel, $ = id => document.getElementById(id);
const SETS = Object.fromEntries(Object.entries(window.MOCAP).map(([k, v]) => [k.toLowerCase(), v]));
const qs = new URLSearchParams(location.search), capture = qs.get('capture') === '1', STORAGE = 'my3d2dge.animation-studio.v1';
if (capture) document.body.classList.add('capture');
let project = M.createProject(SETS), revision = 0, canUndo = false, canRedo = false, lastChange = null;
let live = false, connected = false, events = null, pending = false, jsonDirty = false, jsonRevision = 0, jsonTimer = null;
let pendingImport = null;
const undo = [], redo = [], activity = [];
const S = { time: 0, playing: !matchMedia('(prefers-reduced-motion: reduce)').matches, speed: 1, view: 'threequarter', cast: 'both', bones: false, facing: -35, zoom: 2 };
const CHANNELS = {
  hips: ['Forward', 'Right', 'Up'], body: ['Turn', 'Lean', 'Tilt'], chest: ['Turn', 'Lean', 'Tilt'], head: ['Turn', 'Lean', 'Tilt'],
  shL: ['Reach', 'Shrug'], shR: ['Reach', 'Shrug'], armL: ['Forward', 'Out', 'Up', 'Bend', 'Twist'], armR: ['Forward', 'Out', 'Up', 'Bend', 'Twist'],
  legL: ['Forward', 'Out', 'Up', 'Bend', 'Twist'], legR: ['Forward', 'Out', 'Up', 'Bend', 'Twist'], footL: ['Down', 'Out', 'Toes'], footR: ['Down', 'Out', 'Toes'], root: ['Forward', 'Right']
};
const VIEWS = ['iso', 'threequarter', 'topdown', 'brawler', 'side'], CASTS = ['both', 'mannequin', 'hero'];
const finite = (n, lo, hi, label) => { if (typeof n !== 'number' || !Number.isFinite(n) || n < lo || n > hi) throw new Error(label + ' must be between ' + lo + ' and ' + hi); return n; };
let previewId = null;
const drafts = new Map();
const activeId = () => previewId && Object.hasOwn(project.clips, previewId) ? previewId : project.selected;
const current = () => project.clips[activeId()], clip = () => current().clip;
const pretty = text => String(text).replace(/_Loop$/, '').replaceAll('_', ' ');
const snapshot = () => M.clone({ revision, project, canUndo, canRedo, lastChange });
const note = (text, bad = false) => { $('notice').textContent = text; $('notice').classList.toggle('bad', bad); };
const fail = error => { note(error.message || String(error), true); return null; };
function storeLocal() {
  if (capture || live) return;
  try { localStorage.setItem(STORAGE, JSON.stringify(project)); $('saveState').textContent = 'Saved in this browser'; }
  catch (e) { $('saveState').textContent = 'Not saved'; note('Browser storage is full or unavailable. Use Save project to keep this animation.', true); }
}
if (!capture) {
  try { const saved = localStorage.getItem(STORAGE); if (saved) project = M.validateProject(JSON.parse(saved), SETS); }
  catch (e) { note('The saved project could not load. A new project is open. ' + e.message, true); }
}

/* The stage uses the same engine and rig driver as the Mocap Lab. */
const game = new E.Game({ canvas: $('screen'), view: S.view, minH: 160, minW: 220, maxW: 760, maxH: 700, bg: '#25313a' });
game.lights.enabled = false; game.cam.bounds = null; game.cam.smooth = 0; game.pauseOverlay = false;
const CX = 320, CY = 320, T = 16;
const map = new E.TileMap({ w: 40, h: 40, tile: T, cells: new Array(1600).fill(0), types: {}, floorTex: (x, y) => {
  const major = x % 64 < 1 || y % 64 < 1, minor = x % T < 1 || y % T < 1;
  return major ? [67, 82, 92] : minor ? [51, 65, 75] : [39, 51, 61];
} });
let lib, man, hero, pose = new Float32Array(MR.P * 3), positions = {}, uiTime = 0, poseDirty = true;
function resetHero() {
  hero = Mocap.drive(new E.Humanoid({ cape: { len: 6, width: 5, seg: 2.5 } }), lib);
  hero.o.weapon = null; poseDirty = true;
}
function rebuildRig() {
  const record = current(), base = SETS[record.set];
  lib = Mocap.load(Object.assign({}, base, { clips: { [activeId()]: record.clip } }));
  man = new Mocap.Mannequin(lib, { height: 36, main: '#9ee5c3', joint: '#537a94' });
  resetHero();
  pose = new Float32Array(lib.P * 3);
  updateStage(0);
}
const actors = () => S.cast === 'both' ? ['mannequin', 'hero'] : [S.cast];
const sideDir = () => { const v = game.view, l = Math.hypot(v.ax, v.ay) || 1; return [v.ax / l, v.ay / l]; };
const groundLift = p => { let lo = 0; for (let i = 2; i < p.length; i += 3) lo = Math.min(lo, p[i]); return -lo; };
const sampleClip = () => S.time >= clip().dur ? Object.assign({}, lib.clip(activeId()), { loop: false }) : lib.clip(activeId());
function updateStage(dt) {
  if (!lib) return;
  const c = clip(), f = S.facing * E.DEG;
  if (S.playing) {
    S.time += dt * S.speed;
    if (S.time >= c.dur) { if (c.loop && c.dur > 0) S.time %= c.dur; else { S.time = c.dur; S.playing = false; syncTransport(); } }
  }
  const sampled = sampleClip(); lib.sample(sampled, S.time, pose);
  const move = lib.moveAt(sampled, S.time), cast = actors(), side = sideDir();
  positions = {};
  for (let i = 0; i < cast.length; i++) {
    const a = cast[i], k = a === 'hero' ? hero.o.hipZ * hero.o.size / lib.rest.hipZ : man.k;
    const off = (i - (cast.length - 1) / 2) * 36;
    const x = CX + side[0] * off + (move ? (move[0] * Math.cos(f) - move[1] * Math.sin(f)) * k : 0);
    const y = CY + side[1] * off + (move ? (move[0] * Math.sin(f) + move[1] * Math.cos(f)) * k : 0);
    positions[a] = [x, y];
  }
  hero.mocap = pose;
  if (positions.hero && (S.playing || poseDirty)) hero.update(S.playing ? dt : 0, { x: positions.hero[0], y: positions.hero[1], facing: f });
  poseDirty = false;
  const ps = Object.values(positions);
  game.focus(ps.reduce((n, p) => n + p[0], 0) / ps.length, ps.reduce((n, p) => n + p[1], 0) / ps.length, 17);
}
const BONES = [['pelvis', 'spine1'], ['spine1', 'spine2'], ['spine2', 'chest'], ['chest', 'neck'], ['neck', 'head'], ['head', 'headTop'],
  ...['L', 'R'].flatMap(s => [['chest', 'sh' + s], ['sh' + s, 'elbow' + s], ['elbow' + s, 'wrist' + s], ['pelvis', 'hip' + s], ['hip' + s, 'knee' + s], ['knee' + s, 'ankle' + s], ['ankle' + s, 'toe' + s]])];
function draw(r) {
  if (!lib) return;
  map.drawFloor(r);
  const f = S.facing * E.DEG, lift = groundLift(pose), view = E.charView(r.view);
  for (const p of Object.values(positions)) r.shadow(p[0], p[1], 8, .35);
  if (positions.mannequin) { const [x, y] = positions.mannequin; r.actor(x, y, lift * man.k, (g, ox, oy) => man.draw(g, ox, oy, view, pose, f), { outlineColor: '#172631' }); }
  if (positions.hero) { const [x, y] = positions.hero; r.actor(x, y, 0, (g, ox, oy) => hero.draw(g, ox, oy, r.view)); }
  r.overlay(g => {
    if (S.bones && positions.mannequin) {
      const [x, y] = positions.mannequin, q = r.w(x, y, lift * man.k), ca = Math.cos(f), sa = Math.sin(f);
      const point = name => { const p = lib.pt(pose, name), wx = (p[0] * ca - p[1] * sa) * man.k, wy = (p[0] * sa + p[1] * ca) * man.k; return [q[0] + view.ax * wx + view.ay * wy, q[1] + view.bx * wx + view.by * wy + view.bz * p[2] * man.k]; };
      for (const [a, b] of BONES) { const A = point(a), B = point(b); E.px.line(g, A[0], A[1], B[0], B[1], /L$/.test(a + b) ? '#83d3ff' : '#ffc085'); }
      for (const name of lib.points) { const p = point(name); E.px.rect(g, p[0] - 1, p[1] - 1, 2, 2, '#e7fff2'); }
    }
    for (const [a, p] of Object.entries(positions)) { const q = r.w(p[0], p[1], 0); E.font.text(g, a === 'hero' ? 'GAME HERO' : 'MANNEQUIN', q[0], q[1] + 10, a === 'hero' ? '#dec9aa' : '#a6d6c7', { align: 'center', font: 'tiny', shadow: '#1b2832' }); }
    if (capture) E.font.text(g, activeId() + '  ' + S.time.toFixed(2) + 's', 8, 8, '#d9eee4', { font: 'tiny' });
  });
}

/* All project changes use the shared model. A server result is also the undo result. */
function syncConnection() {
  $('connection').classList.toggle('live', connected);
  $('connection').replaceChildren(Object.assign(document.createElement('i'), {}), document.createTextNode(connected ? 'Live server connected' : live ? 'Reconnecting…' : 'Local editor'));
  $('saveState').textContent = live ? connected ? 'Saved to project file' : 'Server connection lost' : 'Saved in this browser';
}
function loadSnapshot(next) {
  if (!next || !Number.isInteger(next.revision) || next.revision < 0) throw new Error('A snapshot needs a non-negative revision.');
  const value = M.validateProject(next.project, SETS), oldId = activeId(), oldSelected = project.selected;
  project = value; revision = next.revision; canUndo = !!next.canUndo; canRedo = !!next.canRedo; lastChange = next.lastChange || null;
  if (project.selected !== oldSelected || !Object.hasOwn(project.clips, previewId)) previewId = null;
  if (oldId !== activeId()) { S.time = 0; switchDraft(oldId, activeId()); }
  S.time = Math.min(S.time, clip().dur);
  if (lastChange && !activity.some(a => a.revision === revision)) { activity.unshift({ revision, ...lastChange }); activity.length = Math.min(activity.length, 50); }
  rebuildRig(); renderProject();
  if (jsonDirty) { $('jsonStatus').textContent = 'A new revision arrived. Your JSON draft is kept. Read current before you apply it.'; $('jsonStatus').classList.add('bad'); }
  return snapshot();
}
async function request(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { 'content-type': 'application/json', ...options.headers } });
  let data; try { data = await response.json(); } catch (e) { throw new Error('The animation server did not return JSON. Start it with npm run animation:studio.'); }
  if (!response.ok) {
    const msg = typeof data.error === 'string' ? data.error : data.error?.message || data.message || response.statusText;
    if (response.status === 409) throw new Error('Another edit changed the project. Read the current revision, then apply your change again. ' + msg);
    throw new Error(msg);
  }
  return data;
}
async function mutate(action, expectedRevision = revision) {
  if (pending) throw new Error('An edit is still saving. Try again when it completes.');
  if (action.id === undefined && ['replace', 'edit_key', 'delete_key', 'transform', 'rename', 'delete'].includes(action.type)) action = { ...action, id: activeId() };
  pending = true;
  try {
    let next;
    if (live) {
      next = await request('/api/action', { method: 'POST', body: JSON.stringify({ expectedRevision, action, source: 'editor' }) });
    } else {
      if (expectedRevision !== revision) throw new Error('This draft uses an old revision. Read current before you apply it.');
      let value;
      if (action.type === 'undo') { if (!undo.length) throw new Error('There is no edit to undo.'); value = undo[undo.length - 1]; redo.push(M.clone(project)); undo.pop(); }
      else if (action.type === 'redo') { if (!redo.length) throw new Error('There is no edit to redo.'); value = redo[redo.length - 1]; undo.push(M.clone(project)); redo.pop(); }
      else { value = M.apply(project, action, SETS); undo.push(M.clone(project)); if (undo.length > 50) undo.shift(); redo.length = 0; }
      next = { revision: revision + 1, project: value, canUndo: undo.length > 0, canRedo: redo.length > 0, lastChange: { source: 'editor', summary: actionSummary(action) } };
    }
    if (!live || next.revision >= revision) {
      loadSnapshot(next);
      // A select action can keep the saved selection and still end a temporary preview.
      if (action.type === 'select') setPreview({ id: action.id });
    }
    storeLocal(); note(next.lastChange?.summary || 'Animation updated.'); return snapshot();
  } finally { pending = false; }
}
async function replaceProject(value) {
  const validated = M.validateProject(value, SETS);
  if (pending) throw new Error('An edit is still saving. Try again when it completes.');
  pending = true;
  try {
    let next;
    if (live) next = await request('/api/project', { method: 'PUT', body: JSON.stringify({ expectedRevision: revision, project: validated, source: 'editor' }) });
    else { undo.push(M.clone(project)); if (undo.length > 50) undo.shift(); redo.length = 0; next = { revision: revision + 1, project: validated, canUndo: true, canRedo: false, lastChange: { source: 'editor', summary: 'Imported project.' } }; }
    if (!live || next.revision >= revision) loadSnapshot(next);
    storeLocal(); note('Project imported.'); return snapshot();
  } finally { pending = false; }
}
function actionSummary(a) {
  if (a.type === 'edit_key') return 'Updated key at ' + Number(a.time).toFixed(2) + ' s.';
  if (a.type === 'transform') return ({ retime: 'Changed animation duration.', mirror: 'Mirrored animation.', reverse: 'Reversed animation.' })[a.kind];
  return ({ create: 'Created animation.', import: 'Copied a library animation.', add: 'Imported readable animation.', replace: 'Applied readable clip.', select: 'Selected animation.', delete_key: 'Deleted key pose.', undo: 'Undid the last edit.', redo: 'Restored the last edit.' })[a.type] || 'Animation updated.';
}
async function applyJSON() {
  clearTimeout(jsonTimer);
  const draftText = $('clipText').value, value = M.validateClip(draftText), id = activeId(), draftRevision = jsonRevision;
  const next = await mutate({ type: 'replace', id, clip: value }, draftRevision);
  if (id === activeId() && $('clipText').value === draftText) { renderJSON(); $('jsonStatus').textContent = 'Applied revision ' + next.revision + '.'; $('jsonStatus').classList.remove('bad'); }
  else {
    if (drafts.get(id)?.text === draftText) drafts.delete(id);
    $('jsonStatus').textContent = 'The saved edit completed. Your newer JSON draft is kept.';
  }
  return next;
}
function jsonError(e) { $('jsonStatus').textContent = e.message; $('jsonStatus').classList.add('bad'); note('The preview still uses the last valid animation.', true); }

/* The scene clock advances only by the engine's dt. Seek is exact, including a looping clip's endpoint. */
function syncTransport() {
  $('playBtn').textContent = S.playing ? 'Ⅱ' : '▶'; $('playBtn').setAttribute('aria-label', S.playing ? 'Pause' : 'Play');
  $('previewMode').textContent = S.playing ? 'LIVE' : 'PAUSED'; $('speedSelect').value = String(S.speed);
}
function updateTime() {
  $('scrub').value = String(S.time); $('timeLabel').replaceChildren(document.createTextNode(S.time.toFixed(2) + ' '), Object.assign(document.createElement('span'), { textContent: '/ ' + clip().dur.toFixed(2) + ' s' }));
  if (document.activeElement !== $('poseTime')) $('poseTime').value = String(Math.round(S.time * 1000) / 1000);
  for (const b of $('keyMarkers').children) b.setAttribute('aria-pressed', String(Math.abs(Number(b.dataset.time) - S.time) < .002));
  $('fps').textContent = game.fps + ' fps';
}
function seek(time) {
  finite(time, 0, clip().dur, 'Time'); S.time = time; S.playing = false; resetHero(); updateStage(0); updateTime(); syncTransport(); renderChannels(); return S.time;
}
function setPreview(options = {}) {
  // Check every option before changing any state.
  if (options.id !== undefined && (typeof options.id !== 'string' || !Object.hasOwn(project.clips, options.id))) throw new Error('Unknown project clip.');
  if (options.view !== undefined && !VIEWS.includes(options.view)) throw new Error('Unknown camera view.');
  if (options.cast !== undefined && !CASTS.includes(options.cast)) throw new Error('Unknown preview cast.');
  for (const k of ['playing', 'bones']) if (options[k] !== undefined && typeof options[k] !== 'boolean') throw new Error(k + ' must be true or false.');
  if (options.speed !== undefined) finite(options.speed, .05, 4, 'Speed');
  if (options.facing !== undefined) finite(options.facing, -180, 180, 'Facing');
  if (options.zoom !== undefined) finite(options.zoom, .5, 3, 'Zoom');
  const target = project.clips[options.id || activeId()].clip;
  if (options.time !== undefined) finite(options.time, 0, target.dur, 'Time');
  const oldId = activeId();
  if (options.id !== undefined) previewId = options.id === project.selected ? null : options.id;
  if (oldId !== activeId()) { switchDraft(oldId, activeId()); S.time = 0; rebuildRig(); }
  for (const k of ['view', 'cast', 'playing', 'bones', 'speed', 'facing', 'zoom', 'time']) if (options[k] !== undefined) S[k] = options[k];
  game.setView(S.view); game.setZoom(S.zoom);
  $('viewSelect').value = S.view; $('castSelect').value = S.cast; $('bonesBtn').setAttribute('aria-pressed', String(S.bones));
  $('facingInput').value = String(S.facing); $('zoomInput').value = String(S.zoom);
  if (!S.playing) resetHero(); else poseDirty = true;
  if (oldId !== activeId()) renderProject();
  updateStage(0); updateTime(); syncTransport(); if (!S.playing) renderChannels(); return { id: activeId(), ...S };
}

/* DOM rendering never owns animation data. */
function renderProject() {
  const c = clip(), record = current();
  $('projectCount').textContent = Object.keys(project.clips).length;
  $('clipList').replaceChildren(...Object.entries(project.clips).map(([id, r]) => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.id = id; b.setAttribute('aria-pressed', String(id === activeId()));
    const icon = Object.assign(document.createElement('span'), { className: 'clip-icon', textContent: '◇' });
    const label = Object.assign(document.createElement('span'), { className: 'clip-label' });
    label.append(Object.assign(document.createElement('strong'), { textContent: id }), Object.assign(document.createElement('small'), { textContent: r.clip.dur.toFixed(2) + ' s · ' + r.clip.keys.length + ' keys' }));
    b.append(icon, label); b.onclick = () => mutate({ type: 'select', id }).catch(fail); return b;
  }));
  $('clipTitle').textContent = activeId(); $('clipMeta').textContent = c.keys.length + ' key poses · ' + c.dur.toFixed(2) + ' seconds · ' + (c.loop ? 'Loop' : 'Plays once');
  $('revision').textContent = 'rev ' + revision; $('undoBtn').disabled = !canUndo; $('redoBtn').disabled = !canRedo;
  $('clipDuration').value = c.dur; $('loopInput').checked = c.loop; $('scrub').max = c.dur; $('poseTime').max = c.dur;
  $('keyCount').textContent = c.keys.length + ' key poses';
  $('keyMarkers').replaceChildren(...c.keys.map((k, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.time = k.t; b.style.left = (c.dur > 0 ? Math.min(100, k.t / c.dur * 100) : 0) + '%';
    b.title = 'Key ' + (i + 1) + ' · ' + k.t.toFixed(3) + ' s'; b.setAttribute('aria-label', b.title); b.onclick = () => seek(Math.min(c.dur, k.t)); return b;
  }));
  $('ruler').replaceChildren(...Array.from({ length: 5 }, (_, i) => Object.assign(document.createElement('span'), { textContent: (i / 4 * c.dur).toFixed(2) })));
  const source = SETS[record.set].sources[c.src] || {}, authored = c.tags?.includes('authored');
  $('origin').textContent = authored ? 'Authored in Animation Studio. Body reference: ' + (source.label || record.set) + '.' : (source.label || record.set) + (source.license ? ' · ' + source.license : '') + (c.orig ? '. Source clip: ' + c.orig : '') + (c.take ? '. Take: ' + c.take : '') + '.';
  if (!authored && c.desc) $('origin').appendChild(document.createTextNode(' ' + c.desc));
  if (!jsonDirty) renderJSON(); renderChannels(); renderActivity(); updateTime(); syncTransport();
}
function switchDraft(oldId, newId) {
  if (jsonDirty) drafts.set(oldId, { text: $('clipText').value, revision: jsonRevision });
  clearTimeout(jsonTimer);
  const draft = drafts.get(newId); jsonDirty = !!draft;
  if (draft) { $('clipText').value = draft.text; jsonRevision = draft.revision; }
}
function renderJSON() { drafts.delete(activeId()); $('clipText').value = MR.text(clip()); jsonRevision = revision; jsonDirty = false; $('jsonStatus').textContent = 'The preview uses revision ' + revision + '.'; $('jsonStatus').classList.remove('bad'); }
function keyAtCursor() {
  let nearest = null, distance = .002;
  for (const key of clip().keys) {
    const delta = Math.abs(key.t - S.time);
    if (delta < distance) { nearest = key; distance = delta; }
  }
  return nearest;
}
function renderChannels() {
  const key = MR.keyAt(Object.assign({}, clip(), { loop: false }), S.time), channel = $('channelSelect').value, labels = CHANNELS[channel], values = key[channel] || labels.map(() => 0);
  const atKey = keyAtCursor();
  $('keyState').textContent = atKey ? 'Key pose' : 'Sampled pose'; $('deleteKeyBtn').disabled = !atKey || atKey.t === 0;
  $('channelHelp').textContent = /^(arm|leg)/.test(channel) ? 'Directions are percentages. Bend and twist are degrees.' : /^(hips|root)/.test(channel) ? 'Distances are percentages of standing hip height.' : 'Angles are in degrees.';
  $('channelValues').replaceChildren(...labels.map((label, i) => {
    const row = document.createElement('label'); row.textContent = label;
    const input = document.createElement('input'); input.type = 'number'; input.step = '1'; input.value = Math.round(values[i] * 100) / 100; input.dataset.component = i; input.setAttribute('aria-label', label);
    input.addEventListener('focus', () => { if (S.playing) { S.playing = false; updateStage(0); syncTransport(); $('poseTime').value = Math.round(S.time * 1000) / 1000; } });
    row.appendChild(input); return row;
  }));
}
function renderActivity() {
  $('activityList').replaceChildren(...activity.map(a => {
    const li = document.createElement('li'); li.append(Object.assign(document.createElement('strong'), { textContent: a.summary || 'Animation updated.' }), Object.assign(document.createElement('small'), { textContent: 'Revision ' + a.revision + ' · ' + (a.source || 'editor') })); return li;
  }));
}
function buildLibrary() {
  const query = $('librarySearch').value.trim().toLowerCase(), wantedSet = $('librarySet').value, rows = [];
  for (const [id, set] of Object.entries(SETS)) {
    if (wantedSet !== 'all' && wantedSet !== id) continue;
    for (const [name, c] of Object.entries(set.clips)) if (!query || [name, c.desc, ...(c.tags || [])].join(' ').toLowerCase().includes(query)) rows.push({ id, name, c });
  }
  $('libraryCount').textContent = rows.length;
  $('libraryList').replaceChildren(...rows.slice(0, 100).map(({ id, name, c }) => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.set = id; b.dataset.clip = name; b.title = 'Use ' + name + ' from ' + id + '. ' + (c.desc || '');
    const label = document.createElement('span'); label.append(document.createTextNode(pretty(name)), Object.assign(document.createElement('small'), { textContent: id + ' · ' + c.dur.toFixed(2) + ' s' }));
    b.append(label, Object.assign(document.createElement('span'), { className: 'add-symbol', textContent: '+' }));
    b.onclick = () => mutate({ type: 'import', set: id, clip: name, name: uniqueName(name) }).catch(fail); return b;
  }));
  if (!rows.length || rows.length > 100) $('libraryList').appendChild(Object.assign(document.createElement('p'), { className: 'empty-list', textContent: rows.length ? 'First 100 matches. Search or choose a source to see more.' : 'No clips match. Try a move, such as walk or wave.' }));
}
function uniqueName(name) { const base = String(name).replace(/[^A-Za-z0-9_-]/g, '_').replace(/^[^A-Za-z]+/, '') || 'Animation'; let id = base, n = 2; while (project.clips[id]) id = base.slice(0, 65) + '_' + n++; return id; }
function exportFile(filename, text, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type })), a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); note('Exported ' + filename + '.');
}

/* Bind the human controls to the same public actions an LLM can call. */
$('newBtn').onclick = () => { $('newName').value = uniqueName('My_animation'); $('newDialog').showModal(); $('newName').select(); };
$('newForm').onsubmit = async e => { e.preventDefault(); try { await mutate({ type: 'create', name: $('newName').value, duration: +$('newDuration').value, preset: $('newPreset').value, loop: $('newLoop').checked, set: current().set }); $('newDialog').close(); } catch (error) { fail(error); } };
$('connectBtn').onclick = () => $('connectDialog').showModal();
for (const b of document.querySelectorAll('[data-close]')) b.onclick = () => $(b.dataset.close).close();
$('undoBtn').onclick = () => mutate({ type: 'undo' }).catch(fail); $('redoBtn').onclick = () => mutate({ type: 'redo' }).catch(fail);
$('mirrorBtn').onclick = () => mutate({ type: 'transform', id: activeId(), kind: 'mirror' }).catch(fail);
$('reverseBtn').onclick = () => mutate({ type: 'transform', id: activeId(), kind: 'reverse' }).catch(fail);
$('retimeBtn').onclick = () => mutate({ type: 'transform', id: activeId(), kind: 'retime', duration: +$('clipDuration').value }).catch(fail);
$('loopInput').onchange = () => mutate({ type: 'replace', id: activeId(), clip: { ...clip(), loop: $('loopInput').checked } }).catch(e => { $('loopInput').checked = clip().loop; fail(e); });
$('playBtn').onclick = () => { if (!S.playing && S.time >= clip().dur) S.time = 0; setPreview({ playing: !S.playing }); };
$('prevFrame').onclick = () => seek(Math.max(0, S.time - 1 / 30)); $('nextFrame').onclick = () => seek(Math.min(clip().dur, S.time + 1 / 30));
$('scrub').oninput = () => seek(+$('scrub').value); $('poseTime').onchange = () => { try { seek(+$('poseTime').value); } catch (e) { fail(e); } };
$('speedSelect').onchange = () => setPreview({ speed: +$('speedSelect').value });
$('viewSelect').onchange = () => setPreview({ view: $('viewSelect').value }); $('castSelect').onchange = () => setPreview({ cast: $('castSelect').value });
$('bonesBtn').onclick = () => setPreview({ bones: !S.bones }); $('facingInput').oninput = () => setPreview({ facing: +$('facingInput').value }); $('zoomInput').oninput = () => setPreview({ zoom: +$('zoomInput').value });
$('channelSelect').onchange = () => { seek(S.time); renderChannels(); };
$('setKeyBtn').onclick = async () => {
  const time = Number($('poseTime').value), values = [...$('channelValues').querySelectorAll('input')].map(e => Number(e.value));
  try { await mutate({ type: 'edit_key', id: activeId(), time, values: { [$('channelSelect').value]: values } }); seek(time); } catch (e) { fail(e); }
};
$('deleteKeyBtn').onclick = () => {
  const key = keyAtCursor();
  if (key) mutate({ type: 'delete_key', id: activeId(), time: key.t }).catch(fail);
};
$('librarySearch').oninput = buildLibrary; $('librarySet').onchange = buildLibrary;
for (const tab of document.querySelectorAll('[data-panel]')) tab.onclick = () => {
  for (const b of document.querySelectorAll('[data-panel]')) { const on = b === tab; b.setAttribute('aria-selected', String(on)); $(b.dataset.panel + 'Panel').hidden = !on; }
  if (tab.dataset.panel === 'pose' && !S.playing) renderChannels();
};
$('clipText').oninput = () => {
  if (!jsonDirty) jsonRevision = revision; jsonDirty = true; clearTimeout(jsonTimer); $('jsonStatus').textContent = 'Draft. Waiting for valid JSON.';
  if ($('autoApply').checked) jsonTimer = setTimeout(() => applyJSON().catch(jsonError), 500);
};
$('autoApply').onchange = () => { clearTimeout(jsonTimer); if ($('autoApply').checked && jsonDirty) jsonTimer = setTimeout(() => applyJSON().catch(jsonError), 500); };
$('applyJsonBtn').onclick = () => applyJSON().catch(jsonError); $('resetJsonBtn').onclick = () => { clearTimeout(jsonTimer); renderJSON(); };
$('importBtn').onclick = () => $('importFile').click();
$('importFile').onchange = async () => {
  try {
    const file = $('importFile').files[0]; if (!file) return; if (file.size > 8 * 1024 * 1024) throw new Error('The JSON file must be smaller than 8 MB.');
    const text = await file.text(), value = JSON.parse(text);
    if (value.schema === 1 && value.clips) await replaceProject(value);
    else if (typeof value.set === 'string' && value.clip && typeof value.clip === 'object') {
      const imported = M.validateClip(value.clip); imported.clip = uniqueName(imported.clip);
      await mutate({ type: 'add', set: value.set, clip: imported });
    }
    else {
      const imported = M.validateClip(value); imported.clip = uniqueName(imported.clip || 'Imported');
      const candidates = Object.keys(SETS).filter(id => Object.hasOwn(SETS[id].sources, imported.src));
      if (!candidates.length) throw new Error('The clip uses an unknown source body. Import a studio project or use a source from the motion library.');
      if (candidates.length === 1) await mutate({ type: 'add', set: candidates[0], clip: imported });
      else {
        pendingImport = imported;
        $('importSourceSet').replaceChildren(...candidates.map(id => Object.assign(document.createElement('option'), { value: id, textContent: SETS[id].title || SETS[id].set })));
        $('importSourceDialog').showModal();
      }
    }
  } catch (e) { fail(e); } finally { $('importFile').value = ''; }
};
$('importSourceForm').onsubmit = async e => {
  e.preventDefault();
  try {
    if (!pendingImport) throw new Error('Choose a clip file first.');
    pendingImport.clip = uniqueName(pendingImport.clip);
    await mutate({ type: 'add', set: $('importSourceSet').value, clip: pendingImport });
    pendingImport = null; $('importSourceDialog').close();
  } catch (error) { fail(error); }
};
$('exportBtn').onclick = () => exportFile(activeId() + '.json', JSON.stringify(current(), null, 2) + '\n');
$('saveProjectBtn').onclick = () => exportFile('animation-project.json', JSON.stringify(project, null, 2) + '\n');
$('exportSetBtn').onclick = () => {
  try { const set = M.exportSet(project, activeId(), SETS), data = JSON.stringify(set, null, 2).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026'); exportFile(activeId() + '.js', '/* Animation Studio export. Load after src/mocap/readable.js. */\n(window.MOCAP = window.MOCAP || {})[' + JSON.stringify(set.set) + '] = ' + data + ';\n', 'text/javascript'); }
  catch (e) { fail(e); }
};
addEventListener('keydown', e => {
  if (e.target.closest('input,textarea,select,dialog')) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); mutate({ type: e.shiftKey ? 'redo' : 'undo' }).catch(fail); }
  else if (e.code === 'Space') { e.preventDefault(); $('playBtn').click(); }
  else if (e.code === 'Comma') { e.preventDefault(); $('prevFrame').click(); }
  else if (e.code === 'Period') { e.preventDefault(); $('nextFrame').click(); }
});
new ResizeObserver(() => game.screen.resize()).observe($('viewport'));

/* A hosted/downloaded page remains self-contained. Only a loopback page probes the local tool server. */
async function connect() {
  if (capture || !['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname)) return;
  try {
    const next = await request('/api/state'); live = true; connected = true; loadSnapshot(next); syncConnection(); note('Live connection ready. LLM edits will appear here.');
    events = new EventSource('/api/events');
    events.addEventListener('state', event => {
      try { const state = JSON.parse(event.data); connected = true; syncConnection(); if (state.revision > revision) { loadSnapshot(state); note(state.lastChange?.summary || 'Live animation updated.'); } } catch (e) { fail(e); }
    });
    events.addEventListener('preview', event => {
      try { const options = JSON.parse(event.data); setPreview(options); } catch (e) { fail(e); }
    });
    events.addEventListener('error', event => {
      if (event.data) { try { const error = JSON.parse(event.data); note(typeof error === 'string' ? error : error.error || error.message || 'The project file is invalid. The last valid animation is still shown.', true); } catch (e) { fail(e); } }
      else { connected = false; syncConnection(); }
    });
    events.onopen = () => { connected = true; syncConnection(); };
  } catch (e) { live = false; connected = false; syncConnection(); }
}
rebuildRig(); renderProject(); buildLibrary(); setPreview({ view: VIEWS.includes(qs.get('view')) ? qs.get('view') : S.view, cast: CASTS.includes(qs.get('cast')) ? qs.get('cast') : S.cast });
game.start({ pausable: false, update(dt) { updateStage(dt); uiTime += dt; if (uiTime >= 1 / 20) { uiTime = 0; updateTime(); } }, draw });
window.__animationStudio = {
  ready: true, game, SETS, get project() { return M.clone(project); }, get lib() { return lib; }, get pose() { return pose; }, get hero() { return hero; }, get man() { return man; }, get state() { return { id: activeId(), ...S }; },
  getSnapshot: snapshot, loadSnapshot, seek, setPreview, apply: mutate, replaceProject, exportSet: () => M.exportSet(project, activeId(), SETS)
};
if (capture) setPreview({ playing: false }); else connect();
})();
