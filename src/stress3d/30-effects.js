/* =============================================================================
 * COMBAT EFFECTS, from the same state the 2D page draws them from:
 *   telegraphs   the red arc that grows on the floor toward the hero during a wind-up (walkers: out to the move's
 *                measured reach, e.kind.reach; slimes: out to the hero), as the 2D page's telegraph()
 *   trails       the hero's blade trail (blue-white) and the attacking monsters' claw trails (red), from each rig's
 *                own trail of blade positions, as 3D ribbons
 *   bolts        the hero's embers and the wisps' shots (G.shots): a hot core and a glow, the first four carry a light
 *   particles    the game's particles (game.particles.list) as tiny camera-facing quads: sparks, embers, glints and
 *                impact stars add light, dust and bits are solid; rings are rings on the floor
 *   overlay      damage numbers and notes ("WAVE 1 CLEARED", "ZOOM 2x") in the engine's pixel font, on a canvas over the
 *                picture at the engine's resolution, exactly where the 2D page prints them
 * ============================================================================= */
/** a pool of flat floor shapes (arcs and rings), each its own mesh so each can fade on its own */
function floorPool(segments) {
  const pool = [];
  return {
    get(i) {
      if (!pool[i]) {
        const geo = new THREE.BufferGeometry(), pos = new Float32Array((segments + 1) * 2 * 3), idx = [];
        for (let k = 0; k < segments; k++) { const a = k * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx);
        const m = new THREE.Mesh(geo, new THREE.MeshBasicNodeMaterial({ color: '#ffffff', transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
        m.frustumCulled = false; m.renderOrder = 1; scene.add(m); pool[i] = m;
      }
      return pool[i];
    },
    /** shape i: from radius r0 to r1 (engine units) between angles a0 and a1, around (x, y) at height z */
    set(i, x, y, z, r0, r1, a0, a1, color, alpha) {
      const m = this.get(i), p = m.geometry.attributes.position.array;
      for (let k = 0; k <= segments; k++) {
        const a = a0 + (a1 - a0) * k / segments, c = Math.cos(a), s = Math.sin(a), o = k * 6;
        p[o] = (x + c * r0) / U; p[o + 1] = (z + .3) / U; p[o + 2] = (y + s * r0) / U; p[o + 3] = (x + c * r1) / U; p[o + 4] = (z + .3) / U; p[o + 5] = (y + s * r1) / U;
      }
      m.geometry.attributes.position.needsUpdate = true; m.material.color.set(color).multiplyScalar(alpha); m.visible = true;
    },
    hideFrom(i) { for (let k = i; k < pool.length; k++) pool[k].visible = false; }
  };
}
const ARCS = floorPool(12), RINGS = floorPool(24);
/** the swing trails: ribbons between a blade's base and tip over its last positions, fading to nothing at the tail */
const RIBBONS = (() => {
  const pool = [], MAX = 12;
  function make() {
    const pos = new Float32Array(MAX * 2 * 3), col = new Float32Array(MAX * 2 * 3), idx = [];
    for (let i = 0; i < MAX - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setIndex(idx);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicNodeMaterial({ vertexColors: true, transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    m.frustumCulled = false; m.renderOrder = 3; scene.add(m); return m;
  }
  return {
    set(i, trail, tint) {
      const m = pool[i] || (pool[i] = make()), n = Math.min(MAX, trail.length); m.visible = n > 1; if (n < 2) return;
      const pos = m.geometry.attributes.position.array, col = m.geometry.attributes.color.array;
      for (let k = 0; k < n; k++) {
        const p = trail[trail.length - n + k], f = ((k + 1) / n) ** 1.5 * .85, o = k * 6;
        pos[o] = p.b[0] / U; pos[o + 1] = p.b[2] / U; pos[o + 2] = p.b[1] / U; pos[o + 3] = p.t[0] / U; pos[o + 4] = p.t[2] / U; pos[o + 5] = p.t[1] / U;
        col[o] = tint[0] * f * .5; col[o + 1] = tint[1] * f * .5; col[o + 2] = tint[2] * f * .5; col[o + 3] = tint[0] * f; col[o + 4] = tint[1] * f; col[o + 5] = tint[2] * f;
      }
      m.geometry.attributes.position.needsUpdate = m.geometry.attributes.color.needsUpdate = true; m.geometry.setDrawRange(0, (n - 1) * 6);
    },
    hideFrom(i) { for (let k = i; k < pool.length; k++) pool[k].visible = false; }
  };
})();
const HERO_TRAIL = lin('#d8f2ff'), CLAW_TRAIL = lin('#ff7a5a');
/* particles: camera-facing quads in two instanced batches (light that adds, and solid) */
const PART = {
  add: new Batch(new THREE.CircleGeometry(1, 6), new THREE.MeshBasicNodeMaterial({ color: '#ffffff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), { order: 4, cap: 4096 }),
  solid: new Batch(new THREE.CircleGeometry(1, 6), new THREE.MeshBasicNodeMaterial({ color: '#ffffff' }), { cap: 4096 }),
  bit: new Batch(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicNodeMaterial({ color: '#ffffff' }), { cap: 2048 })
};
const _pc = [0, 0, 0], _pp = [0, 0, 0];
/** one quad facing the camera (v: the card view's axes) at engine (x, y, z), radius r engine units */
function quad(B, x, y, z, r, col, v) {
  const s = r / U, R = v.right, Up = v.up, Bk = v.back;
  B.put(R.x * s, R.y * s, R.z * s, Up.x * s, Up.y * s, Up.z * s, Bk.x, Bk.y, Bk.z, x / U + Bk.x * .05, z / U + Bk.y * .05, y / U + Bk.z * .05, col);
}
const mul3 = (c, k, out = _pc) => { out[0] = c[0] * k; out[1] = c[1] * k; out[2] = c[2] * k; return out; };
const ease = E.ease;
/** everything above, this frame; returns how many lights the bolts and wisps used */
function drawEffects(view, cam, W, H, v) {
  // telegraphs
  let na = 0;
  for (const e of G.enemies) {
    if (!e.alive) continue;
    if (e.type === 'walker' && e.atk && e.atk.busy && e.atk.phase === 'wind') { const u = e.atk.u, r0 = e.r * .6, r1 = r0 + (e.kind.reach[e.next] - r0) * u; ARCS.set(na++, e.x, e.y, 0, r0, r1, e.facing - .8, e.facing + .8, '#ff4a3a', .25 + .45 * u); }
    else if (e.type === 'slime' && e.state === 'wind') { const u = clamp(1 - e.t / .5, 0, 1), reach = Math.hypot(G.hero.x - e.x, G.hero.y - e.y) - G.hero.r, r0 = e.r * .6, a = Math.atan2(G.hero.y - e.y, G.hero.x - e.x); ARCS.set(na++, e.x, e.y, 0, r0, r0 + (reach - r0) * u, a - .8, a + .8, '#ff4a3a', .25 + .45 * u); }
  }
  ARCS.hideFrom(na);
  // trails: the hero's blade, the claws of monsters in a swing
  let nr = 0;
  if (G.hero.rig.trail.length > 1) RIBBONS.set(nr++, G.hero.rig.trail, HERO_TRAIL);
  for (const e of G.enemies) if (e.alive && e.atk && e.rig && e.rig.trail.length > 1) RIBBONS.set(nr++, e.rig.trail, CLAW_TRAIL);
  RIBBONS.hideFrom(nr);
  // bolts: a glow and a hot core, added to drawCrowd's glow batches (begun and ended there; ended again here), the first four lit
  let ns = 0;
  for (const s of G.shots) {
    _pp[0] = s.x / U; _pp[1] = s.z / U; _pp[2] = s.y / U;
    BATCH.halo.ball(_pp, 5 / U, 5 / U, 5 / U, mul3(lin(s.color), .5)); BATCH.glow.ball(_pp, 2 / U, 2 / U, 2 / U, lin(s.core));
    if (ns < shotLights.length) { const L = shotLights[ns++]; L.position.set(_pp[0], _pp[1], _pp[2]); L.color.set(s.color); L.intensity = LIGHT.shot; }
  }
  for (let k = ns; k < shotLights.length; k++) shotLights[k].intensity = 0;
  BATCH.halo.end(); BATCH.glow.end();
  // particles
  for (const b of Object.values(PART)) b.begin();
  let nrng = 0;
  for (const p of game.particles.list) {
    const u = p.life / p.max;
    switch (p.kind) {
      case 'spark': quad(PART.add, p.x, p.y, p.z, (p.size > 1.5 ? 1.4 : 1) * (1 - u * .5), lin(u < .5 ? (p.hot || '#fff5cf') : p.color), v); break;
      case 'ember': quad(PART.add, p.x, p.y, p.z, .9, mul3(lin(u < .4 ? '#fff0b0' : p.color), 1 - u * .8), v); break;
      case 'glint': { const k = (1 - Math.abs(u * 2 - 1)) * p.size * 2.5; if (k > .2) quad(PART.add, p.x, p.y, p.z, k * .7, lin(p.color), v); break; }
      case 'impact': quad(PART.add, p.x, p.y, p.z, p.size * (u < .35 ? 1 : 1.4 - u), lin(u < .35 ? '#ffffff' : p.color), v); break;
      case 'bit': quad(PART.bit, p.x, p.y, p.z, p.size * .5, lin(p.color), v); break;
      case 'ring': RINGS.set(nrng++, p.x, p.y, p.z, lerp(p.r0, p.r1, ease.outQuad(u)) - .7, lerp(p.r0, p.r1, ease.outQuad(u)) + .7, 0, TAU, p.color, 1 - u); break;
      case 'text': break;   // on the overlay
      default: quad(PART.solid, p.x, p.y, p.z, p.size * (1 + u * 1.4) * (1 - u * .6), lin(p.color), v);   // dust, smoke, fire
    }
  }
  RINGS.hideFrom(nrng);
  for (const b of Object.values(PART)) b.end(false);
  return ns;
}
/** the overlay at the engine's resolution: damage numbers and the current note, where the 2D page prints them */
function drawOverlay(view, ix, iy, W, H) {
  og.clearRect(0, 0, over.width, over.height);
  for (const p of game.particles.list) {
    if (p.kind !== 'text') continue;
    const u = p.life / p.max; if (!(u < .75 || Math.floor(p.life * 20) % 2)) continue;
    const s = view.p(p.x, p.y, p.z);
    E.font.text(og, p.text, Math.round(s[0] - ix), Math.round(s[1] - iy), p.color, { align: 'center', scale: p.scale || 1, outline: '#0b0814' });
  }
  const n = game._note;
  if (n && game.real < n.end) E.font.text(og, n.text, W / 2, 3, '#ffffff', { align: 'center', shadow: '#000', outline: false, font: 'tiny' });
}
