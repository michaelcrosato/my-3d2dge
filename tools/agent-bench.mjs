// The North Star's open measures (DOCTRINE.md): how well a fresh coding agent builds a game from the handoff package
// alone. It copies dist/handoff/ into an empty directory outside the repository (so no CLAUDE.md, AGENTS.md or repo is
// in sight), gives a coding agent a brief there (claude with --safe-mode: no instructions, skills, plugins, hooks or MCP
// servers of this machine; or codex), and records:
//   - its output tokens, cost, turns and wall time (from the agent's own JSON stream);
//   - whether its first build passes tools/check.mjs (no page errors, something drawn) and its own game/test.mjs;
//   - whether it opened the engine below its header (read past the header's last line: a Read, cat, sed, head or tail
//     of my-3d2dge.js), searched it (grep, rg) or patched it;
//   - a vision judge's score of the check's screenshots against the PS1/N64-era 2D bar (tools/agent-bench/judge.md).
// It writes result.json and prints one table row per run (the format DOCTRINE.md's open measures take).
//
// Every real run spends money (a few dollars to tens of dollars): spending is a hard-to-undo call in DOCTRINE.md, so ask
// the owner before running it. --dry-run and --selftest spend nothing.
//
// Usage: node tools/agent-bench.mjs --brief assassins-creed [--agent claude|codex] [--model M] [--judge-model M]
//          [--budget 30] [--runs ~/.cache/my-3d2dge-bench] [--dry-run]
//        node tools/agent-bench.mjs --rescore <run dir>      (score a finished run again; runs no agent)
//        node tools/agent-bench.mjs --selftest               (the stream reader and the scoring on fixtures)
//        node tools/agent-bench.mjs --list                   (the briefs)
// Briefs: tools/agent-bench/briefs/<name>.md (assassins-creed: Vesper's brief, the baseline; botw-village; arkham-predator).
import { spawnSync, spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, cpSync } from 'node:fs';
import { join, dirname, resolve, basename } from 'node:path';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..'), BENCH = join(root, 'tools/agent-bench');
const args = process.argv.slice(2), opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d; }, flag = n => args.includes('--' + n);
const ENGINE = 'my-3d2dge.js';
const hash = f => existsSync(f) ? createHash('sha1').update(readFileSync(f)).digest('hex') : null;

/** the line where the engine's header ends (the IIFE that opens its code): reading past it is reading the source */
export const headerEnd = src => { const i = src.split('\n').findIndex(l => /^\(function \(root\) \{/.test(l)); return i < 0 ? 80 : i; };

/** read an agent's JSON stream (claude stream-json or codex --json) into what the bench measures */
export function readStream(text, header) {
  const out = { agent: null, outputTokens: 0, inputTokens: 0, costUsd: null, turns: 0, ms: null, reads: [], searches: [], belowHeader: false, patched: false, result: '' };
  const engine = p => typeof p === 'string' && basename(p) === ENGINE && !/\/node_modules\//.test(p);
  const shell = cmd => {
    if (typeof cmd !== 'string' || !cmd.includes(ENGINE)) return;
    if (/\b(sed\s+-i|perl\s+-pi)\b|>\s*\S*my-3d2dge\.js/.test(cmd)) { out.patched = true; return; }
    if (/\b(rg|grep|ag|ast-grep|sg)\b/.test(cmd) && !/\b(cat|sed|head|tail|awk|nl|less|more)\b/.test(cmd)) { out.searches.push(cmd.slice(0, 200)); return; }
    const sed = cmd.match(/sed\s+-n\s+['"]?(\d+)(?:,(\d+))?p/), head = cmd.match(/head\s+(?:-n\s*)?-?(\d+)/);
    const last = sed ? +(sed[2] || sed[1]) : head ? +head[1] : Infinity;   // cat, tail, awk, nl: the whole file or its end
    out.reads.push({ how: 'shell', cmd: cmd.slice(0, 200), to: last }); if (last > header) out.belowHeader = true;
  };
  for (const line of text.split('\n')) {
    let e; try { e = JSON.parse(line); } catch (err) { continue; }
    if (e.type === 'system' && e.subtype === 'init') out.agent = 'claude';
    if (e.type === 'assistant' && e.message) {
      for (const c of e.message.content || []) if (c.type === 'tool_use') {
        const i = c.input || {};
        if ((c.name === 'Read' || c.name === 'View') && engine(i.file_path)) { const from = i.offset || 1, to = from + (i.limit || 2000) - 1; out.reads.push({ how: 'read', from, to }); if (to > header) out.belowHeader = true; }
        else if ((c.name === 'Edit' || c.name === 'Write' || c.name === 'MultiEdit') && engine(i.file_path)) out.patched = true;
        else if (c.name === 'Grep' && (engine(i.path) || /my-3d2dge\.js/.test(i.glob || ''))) out.searches.push('Grep ' + (i.pattern || ''));
        else if (c.name === 'Bash') shell(i.command);
      }
    }
    if (e.type === 'result') { out.agent = out.agent || 'claude'; const u = e.usage || {}; out.outputTokens = u.output_tokens || 0; out.inputTokens = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0); out.costUsd = e.total_cost_usd ?? null; out.turns = e.num_turns || 0; out.ms = e.duration_ms ?? null; out.result = String(e.result || '').slice(0, 2000); }
    // codex exec --json: item events with commands and file changes, turn.completed with usage
    if (e.type === 'thread.started') out.agent = 'codex';
    if (e.type === 'item.completed' && e.item) {
      const it = e.item;
      if (it.type === 'command_execution') shell(it.command);
      if (it.type === 'file_change') for (const ch of it.changes || []) if (engine(ch.path)) out.patched = true;
      if (it.type === 'agent_message') out.result = String(it.text || '').slice(0, 2000);
    }
    if (e.type === 'turn.completed' && e.usage) { out.turns++; out.outputTokens += e.usage.output_tokens || 0; out.inputTokens += (e.usage.input_tokens || 0) + (e.usage.cached_input_tokens || 0); }
  }
  return out;
}

/** the judge's answer: the first {"score": n, ...} in its text */
export const readJudge = text => { const m = String(text).match(/\{[^{}]*"score"\s*:\s*(\d+(?:\.\d+)?)[^{}]*\}/); if (!m) return null; try { return JSON.parse(m[0]); } catch (e) { return { score: +m[1] }; } };

const briefs = () => readdirSync(join(BENCH, 'briefs')).filter(f => f.endsWith('.md')).map(f => f.slice(0, -3));
function brief(name) {
  const f = existsSync(name) ? name : join(BENCH, 'briefs', name + '.md');
  if (!existsSync(f)) throw new Error('no brief "' + name + '". Briefs: ' + briefs().join(', '));
  return readFileSync(f, 'utf8');
}
const run = (cmd, a, o = {}) => spawnSync(cmd, a, Object.assign({ encoding: 'utf8', maxBuffer: 1 << 28 }, o));
const agentCmd = (agent, prompt, o) => agent === 'codex'
  ? ['codex', ['exec', '--json', '--skip-git-repo-check', '--dangerously-bypass-approvals-and-sandbox', ...(o.model ? ['-m', o.model] : []), prompt]]
  : ['claude', ['-p', prompt, '--safe-mode', '--output-format', 'stream-json', '--verbose', '--permission-mode', 'bypassPermissions', '--no-session-persistence', '--max-budget-usd', String(o.budget), ...(o.model ? ['--model', o.model] : [])]];

/** score a run directory: the stream, the game's check and test, the judge */
function score(dir, o = {}) {
  const work = join(dir, 'work'), meta = JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8'));
  const s = readStream(existsSync(join(dir, 'stream.jsonl')) ? readFileSync(join(dir, 'stream.jsonl'), 'utf8') : '', meta.header);
  const page = join(work, 'game/index.html'), res = Object.assign({ brief: meta.brief, agent: meta.agent, model: meta.model || 'default', wallSeconds: meta.wallSeconds || (s.ms ? s.ms / 1000 : null) }, s);
  res.game = existsSync(page) && hash(join(work, 'game/game.js')) !== meta.template;   // (the package's template game alone is not a build)
  if (res.game) {
    const c = run(process.execPath, [join(root, 'tools/check.mjs'), page, '--out', join(dir, 'check')], { cwd: root });
    let rep = null; try { rep = JSON.parse(readFileSync(join(dir, 'check/report.json'), 'utf8')); } catch (e) { /* no report */ }
    res.checkPasses = c.status === 0 && !!rep && rep.scenes.concat(rep.views).some(x => x.filled > .1);
    res.checkErrors = rep ? rep.errors.slice(0, 5) : [(c.stderr || '').slice(0, 300)];
    const t = existsSync(join(work, 'game/test.mjs')) ? run(process.execPath, [join(work, 'game/test.mjs')], { cwd: work, timeout: 120000 }) : null;
    res.testPasses = t ? t.status === 0 : null;
    const shots = rep ? rep.scenes.concat(rep.views).map(x => x.screenshot).filter(f => f && existsSync(f)).slice(-5) : [];
    if (shots.length && !o.noJudge) {
      const prompt = readFileSync(join(BENCH, 'judge.md'), 'utf8') + '\n\nThe screenshots: ' + shots.join(', ');
      const j = run('claude', ['-p', prompt, '--safe-mode', '--output-format', 'json', '--allowedTools', 'Read', '--permission-mode', 'dontAsk', '--no-session-persistence', '--add-dir', join(dir, 'check'), ...(o.judgeModel ? ['--model', o.judgeModel] : [])], { cwd: dir, timeout: 600000 });
      let txt = j.stdout; try { txt = JSON.parse(j.stdout).result; } catch (e) { /* plain text */ }
      res.judge = readJudge(txt); res.judgeCostUsd = (() => { try { return JSON.parse(j.stdout).total_cost_usd; } catch (e) { return null; } })();
    }
  }
  writeFileSync(join(dir, 'result.json'), JSON.stringify(res, null, 2));
  return res;
}
const row = r => `| ${r.brief} | ${r.agent} ${r.model} | ${Math.round(r.outputTokens / 100) / 10}k | ${r.wallSeconds ? Math.round(r.wallSeconds / 60) + ' min' : '?'} | ${r.costUsd !== null && r.costUsd !== undefined ? '$' + r.costUsd.toFixed(2) : '?'} | ${r.game ? (r.checkPasses ? 'yes' : 'no') : 'no game (the template unchanged)'} | ${r.belowHeader ? 'yes' : 'no'}${r.patched ? ', patched it' : ''} | ${r.judge ? r.judge.score + '/10' : '-'} |`;
const HEAD = '| brief | agent | output tokens | wall time | cost | first build passes check | read the engine below its header | judge (PS1/N64 bar) |\n| --- | --- | --- | --- | --- | --- | --- | --- |';

function selftest() {
  let fails = 0; const ok = (name, c, d = '') => { if (!c) fails++; console.log((c ? '  ok   ' : '  FAIL ') + name + (c ? '' : ': ' + d)); };
  const S = (...ev) => ev.map(e => JSON.stringify(e)).join('\n'), use = (name, input) => ({ type: 'assistant', message: { content: [{ type: 'tool_use', name, input }] } });
  const header = headerEnd('/* a */\n/* b */\n(function (root) {\ncode');
  ok('the header ends at the IIFE', header === 2, String(header));
  let s = readStream(S({ type: 'system', subtype: 'init' }, use('Read', { file_path: '/w/my-3d2dge.js', limit: 60 }), use('Bash', { command: 'rg -n "ledge" my-3d2dge.js' }),
    { type: 'result', usage: { output_tokens: 1234, input_tokens: 10, cache_read_input_tokens: 90 }, total_cost_usd: .5, num_turns: 7, duration_ms: 9000, result: 'done' }), 70);
  ok('claude: tokens, cost, turns', s.agent === 'claude' && s.outputTokens === 1234 && s.inputTokens === 100 && s.costUsd === .5 && s.turns === 7, JSON.stringify(s));
  ok('claude: reading the header and searching is not reading below it', !s.belowHeader && s.searches.length === 1 && !s.patched, JSON.stringify(s));
  s = readStream(S(use('Read', { file_path: '/w/my-3d2dge.js' })), 70);
  ok('a Read with no range reads below the header', s.belowHeader);
  s = readStream(S(use('Read', { file_path: '/w/my-3d2dge.js', offset: 3000, limit: 50 })), 70);
  ok('a Read at an offset below the header', s.belowHeader);
  s = readStream(S(use('Bash', { command: "sed -n '1,60p' my-3d2dge.js" }), use('Bash', { command: 'head -n 50 my-3d2dge.js' })), 70);
  ok('sed and head inside the header are not', !s.belowHeader && s.reads.length === 2, JSON.stringify(s.reads));
  s = readStream(S(use('Bash', { command: "sed -n '2400,2460p' my-3d2dge.js" })), 70);
  ok('sed below the header is', s.belowHeader);
  s = readStream(S(use('Edit', { file_path: '/w/my-3d2dge.js', old_string: 'a', new_string: 'b' })), 70);
  ok('an Edit of the engine is a patch', s.patched);
  s = readStream(S({ type: 'thread.started' }, { type: 'item.completed', item: { type: 'command_execution', command: 'cat my-3d2dge.js' } }, { type: 'turn.completed', usage: { output_tokens: 500, input_tokens: 9 } }), 70);
  ok('codex: commands and usage', s.agent === 'codex' && s.belowHeader && s.outputTokens === 500 && s.turns === 1, JSON.stringify(s));
  ok('the judge\'s score is read from its text', readJudge('Here: {"score": 6, "why": "flat floors"} done').score === 6 && readJudge('no score') === null);
  ok('every brief exists and asks for game/index.html', briefs().length >= 3 && briefs().every(b => /game\/index\.html/.test(brief(b))), briefs().join(','));
  console.log(fails ? `\n${fails} failed` : '\nall passed'); process.exit(fails ? 1 : 0);
}

if (flag('selftest')) selftest();
else if (flag('list')) console.log(briefs().join('\n'));
else if (opt('rescore')) { const r = score(resolve(opt('rescore')), { judgeModel: opt('judge-model'), noJudge: flag('no-judge') }); console.log(HEAD + '\n' + row(r)); }
else {
  const name = opt('brief'); if (!name) { console.error('Usage: node tools/agent-bench.mjs --brief <' + briefs().join('|') + '> [--agent claude|codex] [--model M] [--budget 30] [--dry-run]'); process.exit(2); }
  const agent = opt('agent', 'claude'), model = opt('model'), budget = +opt('budget', 30), text = brief(name);
  if (!existsSync(join(root, 'dist/handoff/' + ENGINE))) { console.error('no dist/handoff/: run node tools/build.mjs'); process.exit(2); }
  const dir = join(resolve(opt('runs', join(homedir(), '.cache/my-3d2dge-bench'))), `${basename(name, '.md')}-${agent}-${new Date().toISOString().replace(/[:.]/g, '-')}`), work = join(dir, 'work');
  if (dir.startsWith(root)) { console.error('the run directory must be outside the repository (an agent there would read its CLAUDE.md and AGENTS.md)'); process.exit(2); }
  mkdirSync(work, { recursive: true }); cpSync(join(root, 'dist/handoff'), work, { recursive: true });
  const header = headerEnd(readFileSync(join(work, ENGINE), 'utf8')), [cmd, a] = agentCmd(agent, text, { model, budget });
  writeFileSync(join(dir, 'meta.json'), JSON.stringify({ brief: name, agent, model, budget, header, template: hash(join(work, 'game/game.js')), cmd: [cmd, ...a.map(x => x === text ? '<brief>' : x)] }, null, 2));
  console.log(`run: ${dir}\nworkspace: ${work} (the handoff package; header ends at line ${header})\nagent: ${cmd} ${a.map(x => x === text ? '<brief>' : x).join(' ')}`);
  if (flag('dry-run')) { console.log('dry run: nothing started, nothing spent'); process.exit(0); }
  const t0 = Date.now(), log = [];
  const child = spawn(cmd, a, { cwd: work, stdio: ['ignore', 'pipe', 'pipe'], env: Object.assign({}, process.env, { CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1' }) });
  child.stdout.on('data', d => log.push(d)); child.stderr.on('data', d => process.stderr.write(d));
  child.on('close', code => {
    writeFileSync(join(dir, 'stream.jsonl'), Buffer.concat(log));
    const meta = JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8')); meta.wallSeconds = (Date.now() - t0) / 1000; meta.exit = code; writeFileSync(join(dir, 'meta.json'), JSON.stringify(meta, null, 2));
    const r = score(dir, { judgeModel: opt('judge-model') });
    console.log('\n' + HEAD + '\n' + row(r) + '\n\nresult: ' + join(dir, 'result.json'));
  });
}
