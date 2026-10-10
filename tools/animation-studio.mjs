// Local Animation and Asset Studio: HTTP/SSE over one project, with isolated exact-time captures.
// Usage: node tools/animation-studio.mjs [--port 4173] [--file .animation-studio/project.json]
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT, MAX_BYTES, StudioError, object, createStudioSession, catalog, studioSchema, previewOptions, sceneOptions, sceneReceipt, projectAssets } from './studio-service.mjs';

const json = (res, code, value) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(value)); };
async function body(req) {
  if (!/^application\/json(?:\s*;[^\r\n]*)?$/i.test(req.headers['content-type'] || '')) throw new StudioError('Use Content-Type: application/json.', 415);
  const length = Number(req.headers['content-length']);
  if (Number.isFinite(length) && length > MAX_BYTES) throw new StudioError('Request exceeds the 8 MiB limit.', 413);
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BYTES) throw new StudioError('Request exceeds the 8 MiB limit.', 413);
    chunks.push(chunk);
  }
  try { return object(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
  catch (err) { if (err instanceof StudioError) throw err; throw new StudioError('Request must contain valid JSON.'); }
}

function guard(req, port) {
  const hosts = ['127.0.0.1:' + port, 'localhost:' + port];
  if (port === 80) hosts.push('127.0.0.1', 'localhost');
  const host = req.headers.host;
  if (!hosts.includes(host)) throw new StudioError('Host is not the local Animation Studio address.', 403);
  if (req.headers.origin !== undefined && req.headers.origin !== 'http://' + host) throw new StudioError('Cross-origin requests are not permitted.', 403);
  if (req.headers['sec-fetch-site'] === 'cross-site') throw new StudioError('Cross-site requests are not permitted.', 403);
}

const flags = params => {
  const values = Object.fromEntries(params);
  for (const key of ['includeSchema', 'full']) if (key in values) {
    if (!['true', 'false'].includes(values[key])) throw new StudioError(key + ' must be true or false.');
    values[key] = values[key] === 'true';
  }
  return values;
};
const scriptJSON = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

/** Start a server immediately; the returned close() also closes file watchers, SSE clients and capture browsers. */
export async function createStudioServer(options = {}) {
  const root = resolve(options.root || REPO_ROOT), port = options.port === undefined ? 4173 : Number(options.port);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new StudioError('port must be an integer from 0 to 65535.');
  const session = createStudioSession({ ...options, root });
  const clients = new Set(), browsers = new Set(); let captureBusy = false, stopping = false, captureBrowser;
  const paths = new Map([
    ['/', 'examples/animation-studio.html'], ['/animation-studio', 'examples/animation-studio.html'],
    ['/animation-studio.html', 'examples/animation-studio.html'], ['/examples/animation-studio.html', 'examples/animation-studio.html'],
    ['/asset-studio', 'examples/animation-studio.html'], ['/asset-studio.html', 'examples/animation-studio.html'],
    ['/labs.html', 'examples/labs.html']
  ]);
  const send = (res, event, data) => {
    if (res.destroyed || res.writableEnded) { clients.delete(res); return; }
    // A stalled client reconnects and receives the latest full snapshot; it must not retain unbounded history.
    if (res.writableLength > MAX_BYTES * 2) { clients.delete(res); res.destroy(); return; }
    res.write('event: ' + event + '\ndata: ' + JSON.stringify(data) + '\n\n');
  };
  const unsubscribe = session.subscribe((event, data) => { for (const res of clients) send(res, event, data); });
  const heartbeat = setInterval(() => { for (const res of clients) { if (res.destroyed) clients.delete(res); else res.write(': heartbeat\n\n'); } }, 15000);
  heartbeat.unref();

  async function capture(input, scene = false, savedState) {
    if (captureBusy) throw new StudioError('A capture is in progress. Try again when it has finished.', 429);
    if (!savedState) session.refresh();
    const state = savedState || session.snapshot();
    const assets = scene ? projectAssets(state.project, session.assetModel) : null;
    const opts = scene ? sceneOptions(input, assets, true) : previewOptions(input, state.project, true);
    if (opts.id) state.project.selected = opts.id;
    captureBusy = true; let page;
    try {
      let chromium;
      try { ({ chromium } = await import('playwright')); }
      catch { throw new StudioError('Capture needs Playwright. Run npm install in this repository, then npx playwright install chromium.', 503); }
      if (!captureBrowser?.isConnected()) {
        try { captureBrowser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, timeout: 15000, args: ['--autoplay-policy=no-user-gesture-required'] }); }
        catch (err) { throw new StudioError('Capture cannot start Chromium. Run npx playwright install chromium, or set CHROMIUM_PATH to an installed Chromium. ' + err.message.split('\n')[0], 503); }
        browsers.clear(); browsers.add(captureBrowser);
      }
      // Keep the browser warm, but give every request a fresh, isolated context and the captured revision.
      page = await captureBrowser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
      await page.addInitScript(() => {
        let seed = 1;
        Math.random = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
      });
      page.setDefaultTimeout(15000);
      const pageErrors = []; page.on('pageerror', err => pageErrors.push(err.message));
      await page.goto(address() + '/?capture=1', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__animationStudio?.ready === true, null, { polling: 50 });
      const result = await page.evaluate(async ({ state, opts, scene }) => {
        const api = window.__animationStudio;
        await api.loadSnapshot(state);
        const { times, ...preview } = opts; await api.setPreview({ workspace: scene ? 'scene' : 'animation', ...preview, playing: false });
        const frames = [], screen = document.getElementById('screen');
        if (!(screen instanceof HTMLCanvasElement)) throw new Error('The Animation Studio screen canvas is missing.');
        const paint = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
        for (const time of times) {
          await api.seek(time); await paint();
          const canvas = document.createElement('canvas'); canvas.width = screen.width; canvas.height = screen.height;
          canvas.getContext('2d').drawImage(screen, 0, 0); frames.push(canvas);
        }
        const w = Math.min(480, frames[0].width), h = Math.max(1, Math.round(frames[0].height * w / frames[0].width));
        const columns = Math.min(4, frames.length), rows = Math.ceil(frames.length / columns), label = 28, gap = 8;
        const strip = document.createElement('canvas'); strip.width = columns * (w + gap) + gap; strip.height = rows * (h + label + gap) + gap;
        const g = strip.getContext('2d'); g.fillStyle = '#141923'; g.fillRect(0, 0, strip.width, strip.height); g.imageSmoothingEnabled = false;
        g.font = '13px monospace'; g.textBaseline = 'middle';
        frames.forEach((frame, i) => {
          const x = gap + (i % columns) * (w + gap), y = gap + Math.floor(i / columns) * (h + label + gap);
          g.drawImage(frame, x, y, w, h); g.fillStyle = '#dfe8f2'; g.fillText(times[i].toFixed(3) + ' s', x + 8, y + h + label / 2);
        });
        return { data: strip.toDataURL('image/png').split(',')[1], width: strip.width, height: strip.height };
      }, { state, opts, scene });
      if (pageErrors.length) throw new StudioError('Capture page failed: ' + pageErrors[0], 500);
      return { mimeType: 'image/png', ...result, revision: state.revision, times: opts.times, ...(scene ? { workspace: 'scene', level: opts.level } : {}) };
    } catch (err) {
      if (err instanceof StudioError) throw err;
      throw new StudioError('Capture failed. Run npm run build and check that the Animation Studio page loads. ' + err.message, 500);
    } finally {
      if (page) await page.close().catch(() => {});
      captureBusy = false;
    }
  }

  const server = http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer'); res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    try {
      if (stopping) throw new StudioError('Animation Studio is stopping.', 503);
      guard(req, server.address().port);
      const url = new URL(req.url, address()), method = req.method, path = url.pathname;
      if (url.origin !== address() && url.origin !== 'http://localhost:' + server.address().port) throw new StudioError('Invalid request target.', 403);
      if (method === 'GET' && path === '/favicon.ico') { res.writeHead(204); res.end(); return; }
      if (method === 'GET' && paths.has(path)) {
        let page;
        try { page = readFileSync(resolve(root, paths.get(path))); }
        catch (err) { if (err.code === 'ENOENT') throw new StudioError('Build the Animation Studio page first: npm run build.', 503); throw err; }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" });
        res.end(page); return;
      }
      if (method === 'GET' && path === '/api/events') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
        res.flushHeaders(); clients.add(res); session.refresh(); send(res, 'state', session.snapshot());
        if (session.lastError) send(res, 'error', { error: session.lastError, revision: session.snapshot().revision });
        req.on('close', () => clients.delete(res)); return;
      }
      if (method === 'GET' && path === '/api/state') { session.refresh(); json(res, 200, session.snapshot()); return; }
      if (method === 'GET' && path === '/api/project') { session.refresh(); json(res, 200, session.snapshot().project); return; }
      if (method === 'GET' && path === '/api/catalog') { json(res, 200, catalog(session.sets, Object.fromEntries(url.searchParams))); return; }
      if (method === 'GET' && path === '/api/schema') { json(res, 200, studioSchema(session.model, session.sets, session.assetModel)); return; }
      if (method === 'GET' && path === '/api/assets/catalog') { json(res, 200, { ...session.assetCatalog(flags(url.searchParams)), editorUrl: address() + '/asset-studio' }); return; }
      if (method === 'GET' && path === '/api/scene') { json(res, 200, { ...session.scene(flags(url.searchParams)), editorUrl: address() + '/asset-studio' }); return; }
      if (method === 'GET' && path === '/api/clip') {
        const set = url.searchParams.get('set'), name = url.searchParams.get('name');
        if (!set || !Object.prototype.hasOwnProperty.call(session.sets, set)) throw new StudioError('Unknown source set.', 404);
        const source = session.sets[set];
        if (!name || !Object.prototype.hasOwnProperty.call(source.clips, name)) throw new StudioError('Unknown source clip.', 404);
        json(res, 200, { set, clip: source.clips[name], credit: source.credit, source: source.sources[source.clips[name].src] }); return;
      }
      if (method === 'GET' && path === '/api/export') {
        session.refresh(); const format = url.searchParams.get('format') || 'json';
        const output = session.export(url.searchParams.get('id') || undefined, format), safeName = output.id.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80) || 'animation';
        res.writeHead(200, { 'Content-Type': format === 'js' ? 'text/javascript; charset=utf-8' : 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="' + safeName + '.' + format + '"' });
        res.end(output.text); return;
      }
      if (method === 'GET' && path === '/api/scene/export') {
        const format = url.searchParams.get('format') || 'json';
        if (!['json', 'html'].includes(format)) throw new StudioError('format must be json or html.');
        const output = session.sceneExport(url.searchParams.get('level') || undefined);
        const safeName = output.level.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80) || 'level';
        let content = JSON.stringify(output, null, 2) + '\n';
        if (format === 'html') {
          let template;
          try { template = readFileSync(resolve(root, 'examples/animation-studio.html'), 'utf8'); }
          catch (err) { if (err.code === 'ENOENT') throw new StudioError('Build the Asset Studio page first: npm run build.', 503); throw err; }
          if (!/<head(?:\s[^>]*)?>/i.test(template)) throw new StudioError('The built studio page has no HTML head. Run npm run build.', 500);
          content = template.replace(/<head(?:\s[^>]*)?>/i, match => match + '\n<script>window.__assetStudioExport=' + scriptJSON(output) + ';<\/script>');
        }
        res.writeHead(200, { 'Content-Type': format === 'html' ? 'text/html; charset=utf-8' : 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="' + safeName + '.' + format + '"' });
        res.end(content); return;
      }
      if (method === 'POST' && path === '/api/scene/edit') {
        const input = await body(req);
        for (const key of Object.keys(input)) if (!['expectedRevision', 'actions', 'summary', 'source', 'capture'].includes(key)) throw new StudioError('Unknown scene edit field: ' + key + '.');
        if (input.capture !== undefined) object(input.capture, 'capture');
        session.refresh(); const before = session.snapshot();
        const state = session.apply({ expectedRevision: input.expectedRevision, action: { type: 'assets', actions: input.actions }, source: input.source ?? 'agent', ...(input.summary === undefined ? {} : { summary: input.summary }) });
        const receipt = { ...sceneReceipt(state, session.assetModel, before), editorUrl: address() + '/asset-studio' };
        if (input.capture !== undefined) {
          // A captured snapshot always identifies the edit it depicts, even if another editor saves meanwhile.
          // A rendering failure cannot undo a saved edit: report the successful revision and a separate error.
          try { receipt.capture = await capture(input.capture, true, state); }
          catch (err) { receipt.captureError = { error: err.message, status: err.status || 500, revision: state.revision }; }
        }
        json(res, 200, receipt); return;
      }
      if (method === 'POST' && path === '/api/scene/preview') { json(res, 200, session.scenePreview(await body(req))); return; }
      if (method === 'POST' && path === '/api/scene/capture') { json(res, 200, await capture(await body(req), true)); return; }
      if (method === 'POST' && path === '/api/action') { json(res, 200, session.apply(await body(req))); return; }
      if (method === 'PUT' && path === '/api/project') { json(res, 200, session.replace(await body(req))); return; }
      if (method === 'POST' && path === '/api/preview') { json(res, 200, session.preview(await body(req))); return; }
      if (method === 'POST' && path === '/api/capture') { json(res, 200, await capture(await body(req))); return; }
      if (path.startsWith('/api/') || paths.has(path)) throw new StudioError('This route does not support that method, or does not exist.', 404);
      throw new StudioError('Route not found. Open / for Animation Studio.', 404);
    } catch (err) {
      if (res.destroyed || res.writableEnded) return;
      if (res.headersSent) { res.end(); return; }
      json(res, err.status || 400, { error: err.message || 'Request failed.', ...(err.details || {}) });
    }
  });
  server.requestTimeout = 30000; server.headersTimeout = 10000; server.keepAliveTimeout = 5000;
  server.on('clientError', (err, socket) => { if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n'); });
  const address = () => 'http://127.0.0.1:' + server.address().port;
  try { await new Promise((done, fail) => { server.once('error', fail); server.listen(port, '127.0.0.1', () => { server.off('error', fail); done(); }); }); }
  catch (err) { clearInterval(heartbeat); unsubscribe(); session.close(); throw err; }
  let closing;
  const close = () => closing || (closing = (async () => {
    stopping = true; clearInterval(heartbeat); unsubscribe(); session.close();
    for (const res of clients) res.end(); clients.clear();
    await Promise.allSettled([...browsers].map(browser => browser.close())); browsers.clear();
    await new Promise(done => { server.close(done); server.closeAllConnections(); });
  })());
  return { url: address(), port: server.address().port, server, session, close };
}

async function main() {
  const args = process.argv.slice(2), options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--help' || args[i] === '-h') { console.log('Usage: node tools/animation-studio.mjs [--port 4173] [--file .animation-studio/project.json]\nThe server binds to 127.0.0.1. Keep this process running while the editor or MCP client is in use.'); return; }
    if (!['--port', '--file'].includes(args[i]) || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Unknown or incomplete option: ' + args[i]);
    const key = args[i].slice(2); options[key] = args[++i];
  }
  const app = await createStudioServer(options);
  console.log('Animation and Asset Studio: ' + app.url + '\nAssets and levels: ' + app.url + '/asset-studio\nProject: ' + app.session.file + '\nMCP: node tools/animation-mcp.mjs --url ' + app.url + '\nPress Ctrl+C to stop.');
  const stop = async () => { await app.close(); };
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main().catch(err => { console.error('Animation Studio: ' + err.message); process.exitCode = 1; });
