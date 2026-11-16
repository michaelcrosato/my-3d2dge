/* =============================================================================
 * RUMBLE: a controller feels what the screen shows (the engine's input.rumble, scaled by game.settings.rumble: the
 * Vibration slider in Controls, saved by the engine). Every screen shake rumbles in proportion (explosions, slams,
 * meteors, an execution), and the hero's own moments have their own: a blow taken (harder the more life it took), a
 * perfect dodge, an elite's or a boss's fall, a level up, his death. Nothing happens without a controller that can.
 * Turning Shake off in Settings leaves the hero's own moments. Private names start with RMB_. A DualSense's extras (the
 * light bar, the adaptive triggers, gyro aim, the speaker) follow at the end: DS, DSX, DS_aim, padSfx.
 * ============================================================================= */
const RMB_ = { hitT: 0 };
{ const s0 = game.shake.bind(game); game.shake = n => { s0(n); if (n >= 1.5) game.input.rumble(Math.min(1, n / 8), Math.min(.4, .06 + n * .02)); }; }   // (after 01-tune.js's own wrap)
BUS.on('hurt', e => { const h = e.tgt; if (h && h === ED.hero && e.dmg > 0) game.input.rumble(.25 + .75 * Math.min(1, e.dmg / (h.maxHp * .25)), .12); });
BUS.on('hit', e => { if (e.hit && e.hit.crit && e.src === ED.hero && game.time - RMB_.hitT > .1) { RMB_.hitT = game.time; game.input.rumble(.18, .05); } });   // a crit ticks (ten a second at most)
BUS.on('perfectDodge', () => game.input.rumble(.35, .1));
BUS.on('kill', e => { const m = e.tgt; if (m && m.team === 'foe' && m.elite && !m.boss) game.input.rumble(.5, .16); });
BUS.on('bossDown', () => game.input.rumble(1, .6));
BUS.on('heroLevel', () => game.input.rumble(.3, .2));
BUS.on('heroDie', () => game.input.rumble(.9, .45));
/* ---------- the DualSense's extras (engine/modules/dualsense.js: nothing at all without a DualSense the player allowed) ----------
 * light bar: the hero's life (teal, amber below 60%, red below 35%, blinking near death; violet in a boss fight while
 * healthy; venom green while poisoned), a white flash on a heavy blow, gold on a level; the ember orange in town, on the
 * title and in menus. Adaptive triggers: L2 (the potion, where it is bound) clicks like a stopper while a potion is
 * left and goes slack with none; R2 (the sixth slot) pushes back while its skill cools or Ember is short, and buzzes
 * while a held skill runs on it; both free in menus and in death. Gyro aim (off at first: Settings, Controls,
 * Controller) fine-tunes the right stick's aim (DS_aim) and pans the passive tree. The speaker plays a potion and a
 * pickup from the controller (padSfx). The touchpad's click holds the map (INPUT.map: Pad17, beside d-pad ↑), a flick on
 * it turns a panel's tabs (pageStep). No microphone: nothing in a hack-and-slash is voiced. Every extra has another
 * way in, so the game is whole on any controller */
const DS = E.DualSense ? E.DualSense.attach(game, { light: true, triggers: true, gyro: true, speaker: true }) : null;
const DSX = { light: '', flash: 0, flashC: null, l2: '', r2: '', gyro: [0, 0] };
/** a sound from the controller's speaker while the player has it on (else as sfx plays it) */
const padSfx = (name, o) => DS ? DS.speaker(name, o) : sfx(name, o);
/** the right stick's aim (screen direction) with the gyro's fine-tune on top: the tilt moves the aim point up to 40 px
 *  off the stick's, a push of 48 px; dt 0 and a null stick start it over */
function DS_aim(dt, a) {
  const G = DSX.gyro; if (!a || !DS) { G[0] = G[1] = 0; return a; }
  const q = DS.gyroAim(dt), l = Math.hypot(a[0], a[1]) || 1; if (!q[0] && !q[1] && !G[0] && !G[1]) return a;
  G[0] = clamp(G[0] + q[0], -40, 40); G[1] = clamp(G[1] + q[1], -40, 40);
  return [a[0] / l * 48 + G[0], a[1] / l * 48 + G[1]];
}
BUS.on('hurt', e => { const h = e.tgt; if (h && h === ED.hero && e.dmg > h.maxHp * .15) { DSX.flash = .25; DSX.flashC = '#ffffff'; } });
BUS.on('heroLevel', () => { DSX.flash = .6; DSX.flashC = '#ffe070'; });
if (DS) game.hook('input', dt => {
  const h = ED.hero, md = ED.mode, play = !!h && !ED.demo && (md === 'level' || md === 'proving' || md === 'town'), B = ED.boss;
  DSX.flash -= dt;
  const f = h && h.maxHp ? h.hp / h.maxHp : 1;
  const c = !play ? '#ff8a2a' : DSX.flash > 0 ? DSX.flashC : h.dead || !h.alive ? '#5a0a10' : md === 'town' ? '#ff8a2a' : h.st && h.st.poison ? '#6ac03a'
    : f < .2 ? (Math.floor(game.real * 4) % 2 ? '#d8303a' : '#3a0810') : f < .35 ? '#d8303a' : f < .6 ? '#ff8a2a' : B && B.alive && !B.dormant ? '#8a3aff' : '#2f8f86';
  if (c !== DSX.light) { DSX.light = c; DS.light(c); }
  // the triggers, set only when they change: free in menus, in death, when the potion or the sixth slot is bound elsewhere
  const free = !play || UI.modal || !h || h.dead, map = game.input.map, S5 = h && h.slots[5] && REG.skills[h.slots[5]];
  const l2 = free || !map.potion || !map.potion.includes('Pad6') ? null : h.potions > 0 ? { weapon: [.3, .6, .5] } : null;
  const r2 = free || !S5 || !map.s5 || !map.s5.includes('Pad7') ? null : h.act && h.act.hold && h.act.slot === 5 ? { pulse: [0, 12, .4] } : h.cds[S5.id] > 0 || h.ember < skillCost(h, S5) ? { resist: [0, .7] } : null;
  const kl = JSON.stringify(l2), kr = JSON.stringify(r2);
  if (kl !== DSX.l2) { DSX.l2 = kl; DS.trigger('left', l2); }
  if (kr !== DSX.r2) { DSX.r2 = kr; DS.trigger('right', r2); }
});
