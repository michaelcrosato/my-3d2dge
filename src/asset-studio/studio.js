/* Human controls over the same asset actions used by MCP and the watched project file.
 * This helper shares the parent editor's revision, history, connection and canvas. */
(() => {
'use strict';
const A = AssetStudioModel, $ = id => document.getElementById(id);
const el = (tag, properties = {}) => Object.assign(document.createElement(tag), properties);
const cleanName = name => String(name).replace(/[^A-Za-z0-9_-]/g, '_').replace(/^[^A-Za-z]+/, '').slice(0, 56) || 'Asset';
function attach(ctx) {
  const { game, sets, getSnapshot, mutate, replaceProject, note, exportFile } = ctx;
  const runtime = AssetStudioRuntime.create({ game, project: getSnapshot().project, sets });
  const template = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
  let materialID = null, modelID = null, tool = 'select', jsonDirty = false, jsonRevision = 0, jsonTimer = null;
  let objectDirty = false, objectRevision = 0, objectID = null, materialDirty = false, materialRevision = 0, modelDirty = false, modelRevision = 0;
  let pointer = null, lastSavedSelection = null, lastSavedLevel = null;
  const state = () => runtime.getState(), assets = () => runtime.assets, currentLevel = () => runtime.level;
  const fail = error => { note(error.message || String(error), true); return null; };
  const unique = (registry, base) => { base = cleanName(base); let id = base, n = 2; while (Object.hasOwn(registry, id)) id = base + '_' + n++; return id; };
  const selected = () => currentLevel().objects[state().selected];
  const applyActions = (actions, expectedRevision = getSnapshot().revision) => mutate({ type: 'assets', actions }, expectedRevision);
  const action = (value, rev) => applyActions([value], rev);
  function panel(name) { for (const b of document.querySelectorAll('[data-scene-panel]')) { const on = b.dataset.scenePanel === name; b.setAttribute('aria-selected', String(on)); $('scene' + b.dataset.scenePanel[0].toUpperCase() + b.dataset.scenePanel.slice(1) + 'Panel').hidden = !on; } }
  function optionList(select, rows, value) {
    select.replaceChildren(...rows.map(([id, label]) => el('option', { value: id, textContent: label })));
    if (rows.some(([id]) => id === value)) select.value = value;
  }
  function readObject() {
    objectDirty = false; objectRevision = getSnapshot().revision; objectID = state().selected;
    const o = selected(); $('sceneObjectFields').disabled = !o;
    $('sceneSelectionTitle').textContent = objectID || 'No object selected'; $('sceneObjectKind').textContent = o?.kind || 'Select';
    $('sceneSelectionHelp').textContent = o ? (o.kind === 'actor' ? 'This actor uses a clip from the Animation workspace.' : 'This is a reusable model instance. Change its asset to update every copy.') : 'Click an object in the scene or the list. Place a model to start.';
    $('sceneDraftNotice').textContent = '';
    if (!o) return;
    $('sceneObjectName').value = o.name;
    const registry = o.kind === 'actor' ? getSnapshot().project.clips : assets().models;
    optionList($('sceneObjectAsset'), Object.entries(registry).map(([id, value]) => [id, value.name || id]), o.kind === 'actor' ? o.clip : o.model);
    ['X', 'Y', 'Z'].forEach((axis, i) => { $('sceneObject' + axis).value = o.position[i]; });
    $('sceneObjectRotation').value = o.rotation; $('sceneObjectScale').value = o.scale; $('sceneObjectVisible').checked = o.visible; $('sceneObjectSolid').checked = o.solid;
  }
  function readMaterial() {
    materialDirty = false; materialRevision = getSnapshot().revision;
    const m = assets().materials[materialID]; if (!m) return;
    $('sceneMaterialSelect').value = materialID; $('sceneMaterialColor').value = m.color; $('sceneMaterialAccent').value = m.accent;
    $('scenePattern').value = m.pattern; $('sceneMaterialScale').value = m.scale; $('sceneMaterialSeed').value = m.seed;
  }
  function readModel() {
    modelDirty = false; modelRevision = getSnapshot().revision;
    const m = assets().models[modelID]; if (!m) return;
    $('sceneModelSelect').value = modelID; $('sceneModelText').value = JSON.stringify(m, null, 2); $('scenePartCount').textContent = m.parts.length + ' parts'; $('sceneModelStatus').textContent = '';
  }
  function readJSON() { clearTimeout(jsonTimer); jsonDirty = false; jsonRevision = getSnapshot().revision; $('sceneJson').value = JSON.stringify(assets(), null, 2); $('sceneJsonStatus').textContent = 'Current assets · revision ' + jsonRevision; $('sceneJsonStatus').classList.remove('bad'); }
  function render() {
    const a = assets(), s = state(), level = currentLevel(), saved = getSnapshot();
    if (!a.materials[materialID]) { materialID = Object.keys(a.materials)[0]; materialDirty = false; }
    if (!a.models[modelID]) { modelID = Object.keys(a.models)[0]; modelDirty = false; }
    $('sceneTitle').textContent = level.name; $('sceneMeta').textContent = level.rows[0].length + ' × ' + level.rows.length + ' tiles · ' + Object.keys(level.objects).length + ' objects · ' + Object.keys(a.models).length + ' reusable models';
    optionList($('sceneLevel'), Object.entries(a.levels).map(([id, l]) => [id, l.name]), s.level);
    $('sceneObjectCount').textContent = Object.keys(level.objects).length;
    $('sceneObjectList').replaceChildren(...Object.entries(level.objects).map(([id, o]) => {
      const b = el('button', { type: 'button' }); b.dataset.id = id; b.setAttribute('aria-pressed', String(id === s.selected));
      const label = el('span', { textContent: o.name }); label.append(el('small', { textContent: (o.kind === 'actor' ? 'Animation · ' + o.clip : o.model) + (o.visible ? '' : ' · hidden') }));
      b.append(el('span', { className: 'asset-symbol', textContent: o.kind === 'actor' ? '♧' : '◇' }), label);
      b.onclick = () => { objectDirty = false; action({ type: 'select', level: s.level, id }).catch(fail); }; return b;
    }));
    if (!Object.keys(level.objects).length) $('sceneObjectList').append(el('p', { className: 'help muted', textContent: 'An empty level. Place a model or animation actor.' }));
    optionList($('sceneObjectModel'), Object.entries(a.models).map(([id, m]) => [id, m.name]), $('sceneObjectModel').value || modelID);
    $('sceneNewObject').disabled = !Object.keys(a.models).length;
    $('sceneApplyModel').disabled = !modelID;
    if (!modelID) { $('sceneModelText').value = ''; $('scenePartCount').textContent = '0 models'; }
    $('sceneModelList').replaceChildren(...Object.entries(a.models).map(([id, m]) => {
      const b = el('button', { type: 'button' }); b.dataset.id = id; b.setAttribute('aria-pressed', String(id === modelID));
      const label = el('span', { textContent: m.name }); label.append(el('small', { textContent: m.parts.length + ' parts' })); b.append(el('span', { className: 'model-icon', textContent: '◇' }), label);
      b.onclick = () => { modelID = id; modelDirty = false; $('sceneObjectModel').value = id; render(); panel('asset'); }; return b;
    }));
    $('sceneMaterialList').replaceChildren(...Object.entries(a.materials).map(([id, m]) => {
      const b = el('button', { type: 'button' }); b.dataset.id = id; b.setAttribute('aria-pressed', String(id === materialID));
      const swatch = el('span', { className: 'material-swatch' }); swatch.style.backgroundColor = m.color;
      if (m.pattern !== 'solid') { swatch.style.backgroundImage = 'repeating-linear-gradient(45deg, transparent, transparent 4px, ' + m.accent + ' 4px, ' + m.accent + ' 6px)'; }
      const label = el('span', { textContent: m.name }); label.append(el('small', { textContent: m.pattern })); b.append(swatch, label);
      b.onclick = () => { materialID = id; materialDirty = false; render(); panel('asset'); }; return b;
    }));
    optionList($('sceneMaterialSelect'), Object.entries(a.materials).map(([id, m]) => [id, m.name]), materialID);
    optionList($('sceneModelSelect'), Object.entries(a.models).map(([id, m]) => [id, m.name]), modelID);
    optionList($('sceneBrush'), Object.entries(level.tiles).map(([ch, t]) => [ch, (ch === ' ' ? 'space' : ch) + ' · ' + a.materials[t.material].name + (t.height ? ' · ' + t.height + ' high' : '')]), $('sceneBrush').value);
    if (!objectDirty) readObject(); else if (objectRevision !== saved.revision) $('sceneDraftNotice').textContent = 'A newer revision arrived. Your object draft is kept. Click the object again to read current values.';
    if (!materialDirty) readMaterial();
    if (!modelDirty) readModel(); else if (modelRevision !== saved.revision) $('sceneModelStatus').textContent = 'A newer revision arrived. Click this model in the list to read current data.';
    if (!jsonDirty) readJSON(); else if (jsonRevision !== saved.revision) { $('sceneJsonStatus').textContent = 'A new revision arrived. Your draft is kept. Read current before applying.'; $('sceneJsonStatus').classList.add('bad'); }
    updateTime();
  }
  function sync(project) {
    const a = project.assets, followSelection = a?.selectedLevel !== lastSavedLevel || a?.selectedObject !== lastSavedSelection;
    runtime.setData(project, { followSelection }); lastSavedLevel = a?.selectedLevel ?? null; lastSavedSelection = a?.selectedObject ?? null;
    render();
  }
  function setPreview(options = {}) { runtime.setPreview(options); render(); return state(); }
  function activate() { runtime.setPreview({}); game.screen.resize(); render(); }
  function seek(time) { return setPreview({ time, playing: false }).time; }
  function updateTime() {
    if (ctx.getWorkspace() !== 'scene') return;
    const s = state(); $('viewSelect').value = s.view; $('zoomInput').value = s.zoom;
    $('previewMode').textContent = s.mode === 'play' ? 'PLAYTEST' : s.playing ? 'LIVE SCENE' : 'PAUSED'; $('fps').textContent = game.fps + ' fps';
    $('scenePlayBtn').textContent = s.mode === 'play' ? '■ Stop' : '▶ Play'; $('sceneGridBtn').setAttribute('aria-pressed', String(s.grid));
    $('sceneHint').textContent = s.mode === 'play' ? 'Move: WASD / arrows · Jump: Space · Stop or Esc returns to editing.' : tool === 'paint' ? 'Click or drag to paint tiles. Release to save one edit. Shift-drag to pan.' : 'Click objects · Shift-drag to pan · Scroll to zoom · F fits the level';
  }
  async function applyObject() {
    const o = currentLevel().objects[objectID]; if (!o) throw new Error('Select the object again before applying your draft.');
    const changes = { name: $('sceneObjectName').value, position: ['X', 'Y', 'Z'].map(axis => Number($('sceneObject' + axis).value)), rotation: Number($('sceneObjectRotation').value), scale: Number($('sceneObjectScale').value), visible: $('sceneObjectVisible').checked, solid: $('sceneObjectSolid').checked, [o.kind === 'actor' ? 'clip' : 'model']: $('sceneObjectAsset').value };
    await action({ type: 'object_update', level: state().level, id: objectID, changes }, objectRevision); objectDirty = false; render();
  }
  async function applyJSON() {
    clearTimeout(jsonTimer); const text = $('sceneJson').value, value = A.validateProject(JSON.parse(text), { clips: getSnapshot().project.clips });
    const next = await replaceProject({ ...getSnapshot().project, assets: value }, jsonRevision);
    if ($('sceneJson').value === text) { readJSON(); $('sceneJsonStatus').textContent = 'Applied revision ' + next.revision + '.'; }
    return next;
  }
  function jsonError(error) { $('sceneJsonStatus').textContent = error.message; $('sceneJsonStatus').classList.add('bad'); note('The scene still uses the last valid edit.', true); }
  const atCenter = () => { const s = state(); return [Math.round((s.focus?.[0] ?? currentLevel().spawn[0]) / 8) * 8, Math.round((s.focus?.[1] ?? currentLevel().spawn[1]) / 8) * 8, 0]; };
  for (const b of document.querySelectorAll('[data-scene-panel]')) b.onclick = () => panel(b.dataset.scenePanel);
  $('sceneLevel').onchange = () => { objectDirty = false; action({ type: 'select', level: $('sceneLevel').value, id: null }).then(() => { runtime.fit(); render(); }).catch(fail); };
  $('sceneNewLevelBtn').onclick = () => { objectDirty = false; action({ type: 'level_create', id: unique(assets().levels, 'Level') }).then(() => { runtime.fit(); render(); }).catch(fail); };
  $('sceneNewObject').onclick = () => { const model = $('sceneObjectModel').value; objectDirty = false; action({ type: 'object_add', level: state().level, id: unique(currentLevel().objects, model), object: { kind: 'model', model, position: atCenter() } }).then(() => panel('object')).catch(fail); };
  $('sceneAddActor').onclick = () => { objectDirty = false; action({ type: 'object_add', level: state().level, id: unique(currentLevel().objects, 'Actor'), object: { kind: 'actor', clip: getSnapshot().project.selected, position: atCenter(), solid: false } }).then(() => panel('object')).catch(fail); };
  $('sceneNewMaterial').onclick = async () => { try { const id = unique(assets().materials, 'Material'); await action({ type: 'material_create', id, material: { name: id, color: '#cfad79', accent: '#79604a', pattern: 'checker', scale: 8, seed: 1 } }); materialID = id; materialDirty = false; render(); panel('asset'); } catch (e) { fail(e); } };
  $('sceneNewModel').onclick = async () => { try { const id = unique(assets().models, 'Model'); await action({ type: 'model_create', id, model: { name: id, parts: [{ shape: 'box', position: [0, 0, 0], size: [24, 24, 24], rotation: 0, material: materialID }] } }); modelID = id; modelDirty = false; $('sceneObjectModel').value = id; render(); panel('asset'); } catch (e) { fail(e); } };
  $('sceneApplyObject').onclick = () => applyObject().catch(fail);
  for (const input of $('sceneObjectFields').querySelectorAll('input,select')) input.addEventListener('input', () => { if (!objectDirty) objectRevision = getSnapshot().revision; objectDirty = true; });
  $('sceneDuplicateObject').onclick = () => { if (!selected()) return; objectDirty = false; action({ type: 'object_duplicate', level: state().level, id: state().selected, newId: unique(currentLevel().objects, state().selected), offset: [16, 16, 0] }).catch(fail); };
  $('sceneDeleteObject').onclick = () => { if (!selected()) return; objectDirty = false; action({ type: 'object_delete', level: state().level, id: state().selected }).catch(fail); };
  $('sceneSetSpawn').onclick = () => { if (!selected()) return fail(new Error('Select an object to use its position as the player start.')); action({ type: 'level_update', id: state().level, changes: { spawn: selected().position.slice() } }).catch(fail); };
  $('sceneMaterialSelect').onchange = () => { materialID = $('sceneMaterialSelect').value; readMaterial(); render(); };
  for (const id of ['sceneMaterialColor', 'sceneMaterialAccent', 'scenePattern', 'sceneMaterialScale', 'sceneMaterialSeed']) $(id).addEventListener('input', () => { if (!materialDirty) materialRevision = getSnapshot().revision; materialDirty = true; });
  $('sceneApplyMaterial').onclick = async () => { try { await action({ type: 'material_update', id: materialID, changes: { color: $('sceneMaterialColor').value, accent: $('sceneMaterialAccent').value, pattern: $('scenePattern').value, scale: Number($('sceneMaterialScale').value), seed: Number($('sceneMaterialSeed').value) } }, materialRevision); materialDirty = false; render(); } catch (e) { fail(e); } };
  $('sceneModelSelect').onchange = () => { modelID = $('sceneModelSelect').value; readModel(); render(); };
  $('sceneModelText').oninput = () => { if (!modelDirty) modelRevision = getSnapshot().revision; modelDirty = true; $('sceneModelStatus').textContent = 'Model draft. Apply to update every placed copy.'; };
  $('sceneApplyModel').onclick = async () => { try { await action({ type: 'model_update', id: modelID, changes: JSON.parse($('sceneModelText').value) }, modelRevision); modelDirty = false; render(); } catch (e) { $('sceneModelStatus').textContent = e.message; fail(e); } };
  $('sceneJson').oninput = () => { if (!jsonDirty) jsonRevision = getSnapshot().revision; jsonDirty = true; clearTimeout(jsonTimer); $('sceneJsonStatus').textContent = 'Draft. Waiting for valid JSON.'; if ($('sceneLiveJson').checked) jsonTimer = setTimeout(() => applyJSON().catch(jsonError), 350); };
  $('sceneLiveJson').onchange = () => { clearTimeout(jsonTimer); if ($('sceneLiveJson').checked && jsonDirty) jsonTimer = setTimeout(() => applyJSON().catch(jsonError), 350); };
  $('sceneApplyJson').onclick = () => applyJSON().catch(jsonError); $('sceneReadJson').onclick = readJSON;
  $('sceneFitBtn').onclick = () => { runtime.fit(); render(); }; $('sceneFocusBtn').onclick = () => { runtime.focusSelection(); render(); };
  $('sceneGridBtn').onclick = () => setPreview({ grid: !state().grid });
  $('scenePlayBtn').onclick = () => setPreview({ mode: state().mode === 'play' ? 'edit' : 'play' });
  function chooseTool(next) { tool = next; document.body.classList.toggle('scene-painting', tool === 'paint'); $('sceneSelectBtn').setAttribute('aria-pressed', String(tool === 'select')); $('scenePaintBtn').setAttribute('aria-pressed', String(tool === 'paint')); updateTime(); }
  $('sceneSelectBtn').onclick = () => chooseTool('select'); $('scenePaintBtn').onclick = () => { setPreview({ mode: 'edit' }); chooseTool('paint'); };
  const point = event => { const p = game.screen.clientToScreen(event.clientX, event.clientY); return [p[0] - game.screen.ix, p[1] - game.screen.iy]; };
  function paintCell(event) {
    const p = runtime.groundPoint(...point(event)); if (!p) throw new Error('Choose a ground view to paint tiles. Side view has no floor plane.');
    const x = Math.floor(p[0] / currentLevel().tile), y = Math.floor(p[1] / currentLevel().tile);
    if (y >= 0 && y < currentLevel().rows.length && x >= 0 && x < currentLevel().rows[0].length) pointer.cells.set(x + ',' + y, { x, y, tile: $('sceneBrush').value });
  }
  $('screen').addEventListener('pointerdown', event => {
    if (ctx.getWorkspace() !== 'scene' || state().mode === 'play') return;
    event.preventDefault(); game.input.clear(); const s = state();
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, pan: event.shiftKey || event.button === 1 || event.button === 2, focus: s.focus.slice(), start: runtime.groundPoint(...point(event)), revision: getSnapshot().revision, level: s.level, cells: new Map() };
    $('screen').setPointerCapture(event.pointerId);
    if (!pointer.pan && tool === 'paint') { try { paintCell(event); } catch (e) { pointer = null; fail(e); } }
  });
  $('screen').addEventListener('pointermove', event => {
    if (!pointer || event.pointerId !== pointer.id) return;
    if (pointer.pan) {
      const k = game.screen.dpr / game.screen.S, dx = (event.clientX - pointer.x) * k, dy = (event.clientY - pointer.y) * k, v = game.view;
      const delta = v.toGround(dx, dy);
      const focus = delta ? [pointer.focus[0] - delta[0], pointer.focus[1] - delta[1], pointer.focus[2]] : [pointer.focus[0] - dx / v.ax, pointer.focus[1], pointer.focus[2] - dy / v.bz];
      runtime.setPreview({ focus });
    } else if (tool === 'paint') { try { paintCell(event); } catch (e) { fail(e); } }
  });
  $('screen').addEventListener('pointerup', event => {
    if (!pointer || event.pointerId !== pointer.id) return; const p = pointer; pointer = null;
    if (p.pan) return;
    if (tool === 'paint' && p.cells.size) action({ type: 'paint', level: p.level, cells: [...p.cells.values()] }, p.revision).catch(fail);
    else if (tool === 'select' && Math.hypot(event.clientX - p.x, event.clientY - p.y) < 8) { const id = runtime.pick(...point(event)); objectDirty = false; action({ type: 'select', level: p.level, id }, p.revision).then(() => panel('object')).catch(fail); }
  });
  $('screen').addEventListener('pointercancel', () => { pointer = null; }); $('screen').addEventListener('contextmenu', event => { if (ctx.getWorkspace() === 'scene') event.preventDefault(); });
  $('screen').addEventListener('wheel', event => { if (ctx.getWorkspace() !== 'scene') return; event.preventDefault(); setPreview({ zoom: Math.max(.5, Math.min(3, state().zoom + (event.deltaY > 0 ? -.1 : .1))) }); }, { passive: false });
  $('sceneSaveProject').onclick = () => exportFile('asset-project.json', JSON.stringify({ ...getSnapshot().project, assets: assets() }, null, 2) + '\n');
  $('sceneImportProject').onclick = () => $('sceneImportFile').click();
  $('sceneImportFile').onchange = async () => {
    try {
      const file = $('sceneImportFile').files[0]; if (!file) return; if (file.size > 8 * 1024 * 1024) throw new Error('The JSON file must be smaller than 8 MB.');
      const data = JSON.parse(await file.text()), p = data.project || (data.clips ? data : { ...getSnapshot().project, assets: data });
      await replaceProject(p); runtime.fit(); render();
    } catch (e) { fail(e); } finally { $('sceneImportFile').value = ''; }
  };
  function exportData() {
    const p = A.clone(getSnapshot().project), a = A.clone(assets()), levelID = state().level;
    a.levels = { [levelID]: a.levels[levelID] }; a.selectedLevel = levelID; if (!a.levels[levelID].objects[a.selectedObject]) a.selectedObject = null;
    const ids = new Set(Object.values(a.levels[levelID].objects).filter(o => o.kind === 'actor').map(o => o.clip)); if (!ids.size) ids.add(p.selected);
    p.clips = Object.fromEntries([...ids].map(id => [id, p.clips[id]])); if (!p.clips[p.selected]) p.selected = [...ids][0]; p.assets = a;
    return { schema: 1, level: levelID, revision: getSnapshot().revision, project: p };
  }
  async function exportScene(format) {
    const data = exportData();
    if (ctx.isLive()) {
      const response = await fetch('/api/scene/export?level=' + encodeURIComponent(state().level) + '&format=' + format);
      if (!response.ok) throw new Error('Scene export failed. ' + await response.text());
      exportFile(data.level + '.' + format, await response.text(), format === 'html' ? 'text/html' : 'application/json'); return;
    }
    if (format === 'json') exportFile(data.level + '.json', JSON.stringify(data, null, 2) + '\n');
    else {
      const json = JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
      const html = template.replace(/<head(?:\s[^>]*)?>/i, match => match + '\n<script>window.__assetStudioExport=' + json + ';<\/script>');
      exportFile(data.level + '.html', html, 'text/html');
    }
  }
  $('sceneExportHtml').onclick = () => exportScene('html').catch(fail); $('sceneExportJson').onclick = () => exportScene('json').catch(fail);
  function draw(r) {
    runtime.draw(r);
    if (pointer?.cells.size) r.overlay(g => {
      const t = currentLevel().tile;
      for (const { x, y } of pointer.cells.values()) E.px.polyDither(g, [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]].map(([cx, cy]) => r.w(cx * t, cy * t, 0)), '#b4f5d3', .35);
    });
  }
  const E = My3D2dge;
  sync(getSnapshot().project);
  return { runtime, sync, render, activate, setPreview, seek, update: dt => runtime.update(dt), draw, updateTime, applyActions, exportData, getState: () => ({ workspace: 'scene', ...state() }) };
}
window.AssetStudioUI = { attach };
})();
