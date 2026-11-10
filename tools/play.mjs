// The play file: index.html, at the repository's root, carries every page a player opens, so it is the one file to
// download, open in a browser and send to a friend (D87). Its home is the Labs list (src/labs.json, the labs template in
// its play mode); a pick opens ?play=<id> (and the page's own ?query and #part), and the bootstrap below writes that
// page over the home: the same page the repository's own file is, as files load it, but read from this one.
//   the pages: each lab the list names (examples/<id>.html), and the two editions every kit's slice is in: 2d, the
//     complete reference (dist/my-3d2dge.html; a 2D kit's tile opens it at #<genre>), and 3d, the 3D starter
//     (dist/my-3d2dge-3d.html; a 3D kit's at #<genre>). The Mocap Lab's CMU library (examples/cmu-lib, 68 MB) stays out.
//   each page's links to the others become routes (labs.html is the home, '?'), and its module scripts are written
//     inert: document.write never runs a module, so the bootstrap puts each back, in its order, once the page is in;
//     its <link>s to the web stay out (Scarfrunner's web font: its own fallback, Trebuchet MS, shows instead)
//   a script body two pages share (the engine, in every lab) is kept once; every page, part and library sits in a
//     <script type="text/plain">, with each '<' that could end it or open a comment there written as U+E000
//   a 3D page's libraries (vendor/: three.js, Rapier) become modules made on the device (blob: addresses), named in its
//     import map, each library's imports of the others pointed at theirs: nothing is loaded from anywhere
// Used by tools/build.mjs (pack), tools/labs-test.mjs (prepare; and the home's window.__play.page(id), a page as the
// file carries it) and tools/replay.mjs (pageFile).
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const ESC = '\uE000', MARK = '\uE001', SHARE = 20000;   // the escape for '<'; a shared part's mark; a part's least size
const read = (root, f) => {
  if (!existsSync(join(root, f))) throw new Error(`index.html carries ${f}, and it isn't built (node tools/build.mjs builds it; the 3D starter needs the dev dependencies: npm install)`);
  const s = readFileSync(join(root, f), 'utf8');
  for (const c of [ESC, MARK, '\r']) if (s.includes(c)) throw new Error(`${f} holds U+${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}, which the play file can't carry as it is`);
  return s;
};
const hash = s => createHash('sha1').update(s).digest('hex').slice(0, 12);
/** a page's top-level script elements, read in order past its comments: fn(startTag, body, endTag) returns the element */
const scripts = (html, fn) => html.replace(/<!--[\s\S]*?-->|(<script\b[^>]*>)([\s\S]*?)(<\/script\s*>)/gi, (m, a, b, c) => a ? fn(a, b, c) : m);
/** a page's markup outside its comments and scripts, through fn(text) */
const outside = (html, fn) => {
  let out = '', at = 0;
  for (const m of html.matchAll(/<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script\s*>/gi)) { out += fn(html.slice(at, m.index)) + m[0]; at = m.index + m[0].length; }
  return out + fn(html.slice(at));
};

/** the pages the play file carries, in order: [id, file], each lab the list names and the two editions */
export function pages(root) {
  const labs = JSON.parse(readFileSync(join(root, 'src/labs.json'), 'utf8'));
  const ids = [...new Set(labs.sections.flatMap(S => S.entries.map(L => L.page)))].filter(id => existsSync(join(root, 'examples', id + '.html')));
  return [...ids.map(id => [id, 'examples/' + id + '.html']), ['2d', 'dist/my-3d2dge.html'], ['3d', 'dist/my-3d2dge-3d.html']];
}

/** the file a route plays: pageFile(root, '3d') is 'dist/my-3d2dge-3d.html' (null: none) */
export const pageFile = (root, id) => (pages(root).find(p => p[0] === id) || [])[1] || null;

/** a page as the play file carries it: its links to the others are routes, its modules inert, its import map's
 *  libraries play:/vendor/... (the bootstrap swaps each for the module it makes), its <link>s to the web gone */
export function prepare(html, ids) {
  html = outside(html, t => t.replace(/<link\b[^>]*\bhref=["']https?:\/\/[^>]*>\n?/gi, ''));
  const link = html.replace(/(["'])((?:\.\.\/)?(?:examples\/|dist\/(?:kits\/)?)?([\w-]+)\.html)([?#][^"'\s]*)?\1/g, (m, q, path, base, tail = '') => {
    const to = (id, t) => q + '?play=' + id + (t.startsWith('?') ? '&' + t.slice(1) : t) + q;
    if (base === 'labs' || base === 'index') return q + '?' + q;
    if (ids.includes(base)) return to(base, tail);
    const k = /^my-3d2dge(?:-(3d))?(?:-(compact)|-([\w-]+))?$/.exec(base);
    if (!k) return m;
    if (k[3] && k[3].startsWith('3d-')) return to('3d', tail || '#' + k[3].slice(3));
    if (k[3]) return to(k[1] ? '3d' : '2d', tail || '#' + k[3]);
    return to(k[1] ? '3d' : '2d', tail);
  });
  return scripts(link, (a, b, c) => a === '<script type="module">' ? '<script type="text/x-play-module">' + b + c
    : a === '<script type="importmap">' ? a + b.replace(/"(\/vendor\/[^"]+)"/g, '"play:$1"') + c : a + b + c);
}

/** the bootstrap, in the play file's head: on ?play=<id>, the page over the home; on the home, window.__play for tools */
function boot(ESC, MARK) {
  const $ = sel => document.querySelector(sel), un = s => s.split(ESC).join('<');
  const page = id => {   // a page whole: its text, each shared part put back
    const el = $('script[data-page="' + id + '"]');
    return el ? un(el.textContent).replace(new RegExp(MARK + '(\\w+)' + MARK, 'g'), (m, h) => un($('script[data-part="' + h + '"]').textContent)) : null;
  };
  const id = new URLSearchParams(location.search).get('play');
  if (!id) { window.__play = { page, ids: () => [...document.querySelectorAll('script[data-page]')].map(e => e.dataset.page) }; return; }
  const hide = document.createElement('style');
  hide.textContent = 'html{background:#000}body{display:none}';
  document.head.appendChild(hide);
  addEventListener('DOMContentLoaded', () => {
    let html = page(id);
    if (html === null) { hide.remove(); document.body.insertAdjacentHTML('afterbegin', '<p class="missing">This file has no page called <b></b>. Here is everything it has.</p>'); $('.missing b').textContent = id; return; }
    if (html.includes('"play:/vendor/')) {   // a 3D page: its libraries, made here as modules, a library's imports first
      const made = {};
      for (const el of document.querySelectorAll('script[data-vendor]')) {
        let src = un(el.textContent);
        for (const [quoted, dep] of JSON.parse(el.dataset.imports)) src = src.split(quoted).join(JSON.stringify(made[dep]));
        made[el.dataset.vendor] = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      }
      html = html.replace(/"play:(\/vendor\/[^"]+)"/g, (m, p) => JSON.stringify(made[p] || p));
    }
    document.open(); document.write(html); document.close();
    // document.write never runs a module: each goes back in, in its order (not async: they run one after another)
    for (const old of document.querySelectorAll('script[type="text/x-play-module"]')) {
      const s = document.createElement('script'); s.type = 'module'; s.async = false; s.textContent = old.textContent; old.replaceWith(s);
    }
  });
}

/** the play file's parts: { boot } for its head, { data } for the end of its body (the pages, shared parts, libraries) */
export function pack(root) {
  const list = pages(root), ids = list.map(p => p[0]);
  const texts = list.map(([id, f]) => [id, prepare(read(root, f), ids)]);
  // the shared parts: a script body of SHARE characters or more that two pages or more carry
  const seen = new Map();
  for (const [id, s] of texts) scripts(s, (a, b, c) => { if (b.length >= SHARE) { const h = hash(b); seen.set(h, { body: b, n: (seen.has(h) ? seen.get(h).n : 0) + 1 }); } return a + b + c; });
  const shared = new Map([...seen].filter(([, v]) => v.n > 1));
  const esc = s => s.replace(/<(?=!--|\/?script)/gi, ESC);
  let data = '';
  for (const [h, v] of shared) data += `<script type="text/plain" data-part="${h}">${esc(v.body)}</script>\n`;
  for (const [id, s] of texts) {
    const marked = scripts(s, (a, b, c) => a + (b.length >= SHARE && shared.has(hash(b)) ? MARK + hash(b) + MARK : b) + c);
    data += `<script type="text/plain" data-page="${id}">${esc(marked)}</script>\n`;
  }
  // the libraries the 3D pages' import maps name, and what each imports of the others ("./three.core.min.js"), those first
  const libs = [], add = p => {
    if (libs.some(l => l.path === p)) return;
    const src = read(root, p.slice(1)), dir = p.slice(0, p.lastIndexOf('/') + 1), imports = [];
    for (const m of src.matchAll(/(?:from|import)\s*((["'])\.\/([^"']+)\2)/g)) { add(dir + m[3]); imports.push([m[1], dir + m[3]]); }
    libs.push({ path: p, src, imports });
  };
  for (const [, s] of texts) for (const m of s.matchAll(/"play:(\/vendor\/[^"]+)"/g)) add(m[1]);
  for (const l of libs) data += `<script type="text/plain" data-vendor="${l.path}" data-imports='${JSON.stringify(l.imports).replace(/'/g, '&#39;')}'>${esc(l.src)}</script>\n`;
  return { boot: `<script>(${boot.toString()})(${JSON.stringify(ESC)}, ${JSON.stringify(MARK)});</script>`, data, pages: list, shared: shared.size, libs: libs.length };
}
