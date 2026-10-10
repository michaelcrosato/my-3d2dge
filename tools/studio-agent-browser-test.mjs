// Agent workflow checks: an atomic animation edit reaches the human before capture completes;
// immutable export links preserve the reviewed scene and reopen as an offline playable page.
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { createStudioServer } from './animation-studio.mjs';

const out = resolve('check-output/studio-agent');
await mkdir(out, { recursive: true });
const work = await mkdtemp(join(out, 'session-')), checks = [], errors = [], timings = {};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
let app;
const digest = value => createHash('sha256').update(value).digest('hex');
const frames = page => page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
const snapshot = page => page.evaluate(() => __animationStudio.getSnapshot());
async function check(name, run) { await run(); checks.push(name); console.log('ok', name); }
async function request(path, body) {
  const response = await fetch(app.url + path, { method: body === undefined ? 'GET' : 'POST', headers: body === undefined ? {} : { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const value = await response.json(); assert.equal(response.status, 200, path + ': ' + JSON.stringify(value)); return value;
}
function inspect(page, label) {
  page.on('pageerror', error => errors.push(label + ': ' + error.message));
  page.on('console', message => { if (message.type() === 'error' || message.type() === 'warning' && message.text().startsWith('my-3D2dge:')) errors.push(label + ': ' + message.text()); });
}

try {
  app = await createStudioServer({ port: 0, file: join(work, 'project.json') });
  const live = await browser.newPage({ viewport: { width: 1360, height: 900 } }); inspect(live, 'live');
  await live.goto(app.url);
  const initial = await request('/api/state');
  await live.waitForFunction(revision => window.__animationStudio?.ready && __animationStudio.getSnapshot().revision === revision, initial.revision);
  const token = await live.evaluate(() => window.agentWorkflowToken = 'same-human-preview');

  await check('atomic animation authoring updates the human pose, captures the saved revision, and undoes in one step', async () => {
    const before = await snapshot(live);
    await live.evaluate(() => __animationStudio.setPreview({ time: 0, playing: false, view: 'threequarter', cast: 'both', bones: false, facing: -35, zoom: 2 }));
    const human = await live.evaluate(() => __animationStudio.state), started = performance.now();
    const pending = request('/api/animation/edit', {
      expectedRevision: before.revision, requestId: 'browser-greeting-batch', summary: 'Create and pose an agent greeting',
      actions: [
        { type: 'create', name: 'AgentGreeting', duration: 2, preset: 'neutral' },
        { type: 'edit_key', id: 'AgentGreeting', time: 0, values: { armR: [0, 0, 100, 0, 0] } },
        { type: 'edit_key', id: 'AgentGreeting', time: 1, values: { head: [20, 0, 0] } }
      ],
      capture: { id: 'AgentGreeting', times: [0, 1], view: 'side', cast: 'mannequin', bones: true }
    });
    await live.waitForFunction(() => __animationStudio.project.selected === 'AgentGreeting' && __animationStudio.project.clips.AgentGreeting.clip.keys[0].armR[2] === 100);
    await frames(live); timings.editToPreviewMs = Math.round(performance.now() - started);
    const pose = await live.evaluate(() => { const S = __animationStudio, i = MocapReadable.IDX; return { fist: S.pose[i.fistR * 3 + 2], shoulder: S.pose[i.shR * 3 + 2] }; });
    assert.ok(pose.fist > pose.shoulder + 350, 'The saved channels must raise the visible right hand.');
    const receipt = await pending; timings.editWithCaptureMs = Math.round(performance.now() - started);
    assert.equal(receipt.applied, true); assert.equal(receipt.revision, before.revision + 1); assert.equal(receipt.project, undefined);
    assert.equal(receipt.captureError, undefined); assert.equal(receipt.capture.revision, receipt.revision); assert.deepEqual(receipt.capture.times, [0, 1]);
    const png = Buffer.from(receipt.capture.data, 'base64'); assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a'); assert.ok(png.length > 3000);
    await writeFile(join(out, 'agent-greeting.png'), png);
    assert.deepEqual(await live.evaluate(() => __animationStudio.state), { ...human, id: 'AgentGreeting', time: 0 });
    assert.equal(await live.evaluate(() => window.agentWorkflowToken), token);
    assert.equal((await snapshot(live)).revision, receipt.revision);
    const undo = await request('/api/action', { expectedRevision: receipt.revision, action: { type: 'undo' } });
    await live.waitForFunction(revision => __animationStudio.getSnapshot().revision === revision, undo.revision);
    assert.deepEqual((await snapshot(live)).project, before.project); assert.equal(undo.canUndo, before.canUndo);
  });

  await check('a scene export link keeps its original bytes and revision after edits and opens offline in play mode', async () => {
    let state = await request('/api/state');
    const authored = await request('/api/scene/edit', { expectedRevision: state.revision, actions: [{ type: 'material_update', id: 'wood', changes: { color: '#765432' } }] });
    const saved = await request('/api/scene/export?format=json'), artifact = await request('/api/scene/export?format=html&delivery=link');
    assert.equal(artifact.schema, 1); assert.equal(artifact.revision, authored.revision); assert.equal(artifact.level, saved.level);
    assert.equal(artifact.format, 'html'); assert.equal(artifact.mimeType, 'text/html'); assert.match(artifact.filename, /\.html$/);
    assert.equal(new URL(artifact.downloadUrl).origin, app.url);
    const first = await fetch(artifact.downloadUrl); assert.equal(first.status, 200); assert.match(first.headers.get('content-type'), /^text\/html/);
    const bytes = Buffer.from(await first.arrayBuffer()); assert.equal(bytes.length, artifact.bytes); assert.equal(digest(bytes), artifact.sha256);
    state = await request('/api/state');
    const changed = await request('/api/scene/edit', { expectedRevision: state.revision, actions: [{ type: 'material_update', id: 'wood', changes: { color: '#abcdef' } }] });
    assert.ok(changed.revision > artifact.revision);
    const later = await fetch(artifact.downloadUrl); assert.equal(later.status, 200); assert.deepEqual(Buffer.from(await later.arrayBuffer()), bytes);
    const file = join(work, 'reviewed-level.html'); await writeFile(file, bytes);
    const offline = await browser.newPage({ viewport: { width: 1280, height: 820 } }); inspect(offline, 'export');
    const remote = []; offline.on('request', request => { if (/^https?:/.test(request.url())) remote.push(request.url()); });
    await offline.goto(pathToFileURL(file).href);
    await offline.waitForFunction(() => window.__assetStudio?.ready && __assetStudio.state.mode === 'play' && __assetStudio.state.player);
    const reopened = await offline.evaluate(() => ({ revision: __assetStudioExport.revision, project: __assetStudio.project, state: __assetStudio.state }));
    assert.equal(reopened.revision, artifact.revision); assert.deepEqual(reopened.project, saved.project); assert.equal(reopened.project.assets.materials.wood.color, '#765432');
    const start = reopened.state.player;
    await offline.keyboard.down('ArrowRight');
    await offline.waitForFunction(start => { const p = __assetStudio.state.player; return Math.hypot(p.x - start.x, p.y - start.y) > 2; }, start);
    await offline.keyboard.up('ArrowRight');
    assert.deepEqual(remote, []); await offline.close();
  });

  assert.deepEqual(errors, []);
  await writeFile(join(out, 'report.json'), JSON.stringify({ checks, timings, errors }, null, 2) + '\n');
  console.log('Agent Studio: ' + checks.length + ' browser workflow checks passed. ' + JSON.stringify(timings));
} finally {
  if (app) await app.close();
  await browser.close();
  await rm(work, { recursive: true, force: true });
}
