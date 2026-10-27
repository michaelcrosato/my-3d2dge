/* ---- (the starter's shell, continued; only in the files of several slices, not in a genre kit) ---- */
/* ---- THE TITLE MENU of a file of several families: each family's heading over its slices, two columns on a wide screen,
 * one column that scrolls where the list won't fit (up, down, left, right or the mouse move the cursor; a click or tap
 * picks; a finger dragging the list scrolls it). o: y (its top), room (the pixels it leaves below it), onPick(i). A file of
 * one family (a genre kit) has a plain E.Menu: menuOf(). Its twin is src/starter3d/05-families.js ---- */
class FamilyMenu {
  constructor(slices, o) { Object.assign(this, { y: 76, room: 100, onPick: null }, o); this.slices = slices; this.i = 0; this.top = 0; this.dy = 0; this.lay = null; this.mt = null; }
  /** the entries' labels (as E.Menu's items) */
  get items() { return this.slices.map(s => s.label); }
  /** the layout on a screen W x H: columns of rows ({ head } or { k }, slice k), the row height, the rows in view */
  layout(W, H) {
    const rowH = E.font.lineHeight() + 2, fams = [];
    this.slices.forEach((s, k) => { let f = fams.find(f => f.name === s.family); if (!f) fams.push(f = { name: s.family, ks: [] }); f.ks.push(k); });
    const colW = Math.max(...this.slices.map(s => E.font.width(s.label)), ...fams.map(f => E.font.width(f.name, { font: 'tiny' }))) + 24;
    const total = fams.reduce((n, f) => n + f.ks.length + 1, 0), two = W >= 400, cols = [[]];
    for (const f of fams) { if (two && cols.length === 1 && cols[0].length >= total / 2) cols.push([]); cols[cols.length - 1].push({ head: f.name }, ...f.ks.map(k => ({ k }))); }
    const rows = Math.max(...cols.map(c => c.length)), view = Math.min(rows, Math.max(5, Math.floor((H - this.y - this.room) / rowH))), w = cols.length * colW + (cols.length - 1) * 8;
    return { cols, rowH, colW, rows, view, w, x: Math.round((W - w) / 2), order: cols.flat().filter(e => e.k !== undefined).map(e => e.k) };
  }
  /** slice k's column and row */
  place(L, k) { for (let c = 0; c < L.cols.length; c++) { const r = L.cols[c].findIndex(e => e.k === k); if (r >= 0) return [c, r]; } return [0, 0]; }
  /** where slice k's entry is on the screen (its middle, in game pixels), or null while it is scrolled out of view (for tests) */
  spot(k) { const L = this.lay || this.layout(game.W, game.H), [c, r] = this.place(L, k); return r < this.top || r >= this.top + L.view ? null : [L.x + c * (L.colW + 8) + L.colW / 2, this.y + 5 + (r - this.top) * L.rowH + L.rowH / 2 - 2]; }
  /** the slice under a screen point, or -1 */
  at(L, p) {
    if (!p) return -1;
    const c = Math.floor((p[0] - L.x) / (L.colW + 8)), r = this.top + Math.floor((p[1] - this.y - 3) / L.rowH), e = c >= 0 && c < L.cols.length && r >= this.top && r < this.top + L.view && L.cols[c][r];
    return e && e.k !== undefined && p[0] - L.x - c * (L.colW + 8) < L.colW ? e.k : -1;
  }
  /** move the cursor, scroll, pick: true when it picked (as E.Menu's update) */
  update() {
    const inp = game.input, L = this.lay || (this.lay = this.layout(game.W, game.H)), old = this.i, d = inp.drag(), o = L.order, n = o.length;
    if (d) { this.dy += d[1]; const s = Math.trunc(this.dy / L.rowH); this.dy -= s * L.rowH; this.top -= s; }   // a finger drags the list
    else {
      this.dy = 0;
      if (inp.repeat('up')) this.i = o[(o.indexOf(this.i) + n - 1) % n];
      if (inp.repeat('down')) this.i = o[(o.indexOf(this.i) + 1) % n];
      if (L.cols.length > 1 && (inp.repeat('left') || inp.repeat('right'))) {   // across: the nearest entry in the other column
        const [c, r] = this.place(L, this.i), other = L.cols[1 - c].map((e, rr) => [e.k, rr]).filter(e => e[0] !== undefined);
        this.i = other.reduce((a, b) => Math.abs(b[1] - r) < Math.abs(a[1] - r) ? b : a)[0];
      }
    }
    if (inp.mouse.t !== this.mt) { this.mt = inp.mouse.t; const k = this.at(L, inp.pointer()); if (k >= 0) this.i = k; }
    const tap = this.at(L, inp.clicked()); if (tap >= 0) this.i = tap;
    if (this.i !== old) {
      A.sfx('select');
      const r = this.place(L, this.i)[1]; if (r - 1 < this.top) this.top = r - 1; if (r >= this.top + L.view) this.top = r - L.view + 1;   // in view, its heading too
    }
    this.top = clamp(this.top, 0, L.rows - L.view);
    if (inp.pressed('confirm') || tap >= 0) { A.sfx('confirm'); inp.consumeAll(); this.onPick(this.i, this.items[this.i]); return true; }
    return false;
  }
  draw(r) {
    const L = this.lay = this.layout(r.W, r.H), y0 = this.y, bg = '#141a3a'; this.top = clamp(this.top, 0, L.rows - L.view);
    r.overlay(g => {
      E.ui.box(g, L.x, y0, L.w, L.view * L.rowH + 8, { bg, border: '#e8e4ff' });
      const blink = Math.floor(game.real * 3) % 2 === 0;
      L.cols.forEach((col, c) => {
        const x = L.x + c * (L.colW + 8);
        for (let k = this.top; k < Math.min(col.length, this.top + L.view); k++) {
          const e = col[k], y = y0 + 5 + (k - this.top) * L.rowH, sel = e.k === this.i;
          if (e.head) { E.font.text(g, e.head, x + 6, y + 1, '#c8a868', { font: 'tiny', outline: false, shadow: '#05040a' }); continue; }
          if (sel) px.rect(g, x + 3, y - 2, L.colW - 6, L.rowH, E.shade(bg, .22));
          E.font.text(g, this.slices[e.k].label, x + 14, y, sel ? '#ffd36a' : '#ffffff', { outline: false, shadow: '#05040a' });
          if (sel && blink) E.font.text(g, '▸', x + 6, y, '#ffd36a', false);
        }
      });
      // more above, more below: a small arrow on the box's right edge
      const arrow = (y, up) => { for (let k = 0; k < 3; k++) px.rect(g, L.x + L.w - 9 + k, up ? y + 2 - k : y + k, 5 - 2 * k, 1, '#ffd36a'); };
      if (this.top > 0) arrow(y0 + 2, true);
      if (this.top + L.view < L.rows) arrow(y0 + L.view * L.rowH + 3, false);
    });
  }
}
