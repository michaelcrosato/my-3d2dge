/* ============================== GAME START ==============================
 * MY-3D2DGE STARTER: a title menu and five vertical slices (a genre kit file holds one). Each slice is a complete
 * small game, written to be copied and changed:
 *   SLICE 1  ADVENTURE   top-down action adventure (Zelda, Secret of Mana): rooms, sword,
 *                        key and locked door, NPC dialog, hearts, rupees, torch lighting
 *   SLICE 2  PLATFORMER  side-scroller (Mario, Mega Man): E.PlatformMap + E.Platformer,
 *                        stomp and shoot, ? blocks, ladder, moving platform, 2.5D view (V)
 *   SLICE 3  SHOOTER     vertical shoot-'em-up (1942, Xevious): E.Bullets, waves, boss
 *   SLICE 4  RPG BATTLE  turn-based battle (Dragon Quest, Final Fantasy): E.Menu, turns
 *   SLICE 5  BRAWLER     beat-'em-up (Final Fight, Streets of Rage): E.Combo punches, kicks,
 *                        knockback, depth lanes, waves that lock the screen, a boss
 * To make your own game: copy the slice closest to your genre, then replace everything
 * between GAME START and GAME END with ONLY your game: its own title, play and game-over
 * scenes. Delete this menu and the slices you do not use. Deep links: #adventure (etc.).
 * ======================================================================== */
(() => {
'use strict';
const E = My3D2dge, { px, clamp, lerp, approach, TAU } = E;

/* ---- SHELL: one game, several scenes. Each slice switches view, keys and resolution on entry ---- */
const game = new E.Game({ canvas: 'screen', res: 'ps1', view: 'side', bg: '#07060d' });
const P = game.particles, L = game.lights, A = game.audio;
const scenes = {};
let gpu = null;                               // WebGPU lighting, used by the adventure slice only
const best = (k, v) => { const old = E.store.get('best:' + k, 0); if (v > old) E.store.set('best:' + k, v); return Math.max(old, v); };
const SLICES = [
  { id: 'adventure', label: 'ADVENTURE', about: 'TOP-DOWN ACTION ADVENTURE' },
  { id: 'platformer', label: 'PLATFORMER', about: 'SIDE-SCROLLING PLATFORMER' },
  { id: 'brawler', label: 'BRAWLER', about: 'SIDE-SCROLLING BEAT-EM-UP' },
  { id: 'shooter', label: 'SHOOTER', about: 'VERTICAL SHOOT-EM-UP' },
  { id: 'rpg', label: 'RPG BATTLE', about: 'TURN-BASED BATTLE' }
];
/* keys every slice shares: V changes the camera view, G toggles GPU lighting, M mutes */
addEventListener('keydown', e => {
  if (e.repeat) return;
  if (e.code === 'KeyV') game.nextView();
  else if (e.code === 'KeyM') A.mute();
  else if (e.code === 'KeyG' && gpu) gpu.enabled = !gpu.enabled;
});

/* ---- TITLE: a lineup of HD heroes on a torch-lit castle ledge under a dusk sky ---- */
const stage = new E.PlatformMap({ rows: ['SSSSSSSSSSSSSSSSSSSSSSSSSSSSSS', 'SSSSSSSSSSSSSSSSSSSSSSSSSSSSSS'], legend: { S: 1 },
  types: { 1: { style: 'stone', side: '#6a5a78', moss: '#4a6a3a' } }, edges: 'open' });
const titleBg = new E.Backdrop('castle-night');
const HEROES = [   // one hero per genre slice, each dressed with the HD rig options
  { x: 170, face: 0, rig: new E.Humanoid({ size: 1.25, build: 'heroic', armor: true, hair: 'short', cape: { len: 6, width: 6, seg: 2.6 }, colors: { cloth: '#3a5ab0', cape: '#b02a3a', capeIn: '#5a1020', hair: '#e0b050', trim: '#e8c860' } }) },
  { x: 205, face: 0, rig: new E.Humanoid({ size: 1.25, outfit: 'tunic', hair: 'spiky', hat: { style: 'pointed', color: '#3aa050' }, colors: { cloth: '#3aa050', pants: '#e8dcc0', hair: '#e0b040', trim: '#8a5a2a' } }) },
  { x: 240, face: 0, rig: new E.Humanoid({ size: 1.3, build: 'bulky', weapon: null, hat: { style: 'band', color: '#e03a3a' }, colors: { cloth: '#f0f0f0', pants: '#2f5fd0' } }) },
  { x: 275, face: Math.PI, rig: new E.Humanoid({ size: 1.25, weapon: 'gun', hat: 'cap', sleeves: 'long', colors: { cloth: '#d83a2a', pants: '#2f5fd0', glove: '#f0f0f0' } }) },
  { x: 310, face: Math.PI, rig: new E.Humanoid({ size: 1.25, weapon: 'staff', outfit: 'robe', hair: 'ponytail', sleeves: 'long', colors: { cloth: '#6a3ab0', hair: '#c8402a', trim: '#e8c860' } }) }
];
const titleMenu = new E.Menu(game, SLICES.map(s => s.label), { y: 76, onPick: i => game.go(SLICES[i].id) });
scenes.title = {
  view: 'side', views: ['side', 'brawler'], input: 'DEFAULT', res: 'ps1',
  enter() { A.music('title'); game.follow(null); game.focus(240, 0, 84); game.cam.room = null; game.cam.bounds = null; if (gpu) gpu.enabled = false; L.enabled = false; },
  update(dt) {
    titleMenu.update(dt);
    const t = game.time;
    HEROES.forEach((h, i) => {
      const u = (t * .45 + i * .37) % 3, swing = u < .5 ? { spec: { a0: 1.4, a1: -1.6, z0: 12, z1: 8, reach: 7.5 }, phase: u < .15 ? 'wind' : 'active', u: u < .15 ? u / .15 : (u - .15) / .35 } : null;
      h.rig.update(dt, { x: h.x, y: 0, z: 32, facing: h.face, vx: 0, vy: 0, attack: swing, point: i === 3 && u < .6 });
    });
  },
  draw(r) {
    titleBg.draw(r);
    stage.draw(r);
    for (const x of [140, 340]) r.prop('torch', x, 0, 32, { size: 1.3, light: false });
    for (const x of [187, 293]) r.prop('banner', x, -8, 64, { size: 1.1, color: '#8a1a2a' });
    for (const h of HEROES) r.actor(h.x, 0, 32, (g, ox, oy) => h.rig.draw(g, ox, oy, r.view));
    r.overlay(g => {
      E.font.title(g, 'my-3D2dge', r.W / 2, 12, { align: 'center', scale: 4, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 3 });
      E.font.text(g, 'My "3D" 2D Game Engine', r.W / 2, 48, '#e8e0ff', { align: 'center', gradient: ['#ffffff', '#c8b8f0'], shadow: '#140c1c', outline: false });
      E.font.text(g, SLICES[titleMenu.i].about, r.W / 2, r.H - 14, '#ffe7a8', { align: 'center', shadow: '#000', outline: false });
    });
    titleMenu.draw(r);
    r.text('Arrows + Enter   V view   M mute   ? API', r.W / 2, r.H - 26, '#b8b0d8', { align: 'center', shadow: '#000', outline: false });
  }
};

/* ---- GAME OVER: shared by every slice ---- */
const overMenu = new E.Menu(game, ['Retry', 'Title'], { y: 118, onPick: i => game.go(i === 0 ? overMenu.from : 'title') });
const overBg = new E.Backdrop({ sky: ['#12040c', '#3a0c1c', '#6a1a28'], moon: { x: .5, y: .3, r: 16, color: '#e8a0a0' }, stars: 30,
  layers: [{ kind: 'mountains', color: '#2a0c16', y: .72, height: .3, parallax: 0 }, { kind: 'fog', color: '#8a2a3a', y: .9, height: .12, parallax: 0, drift: 4 }] });
scenes.over = {
  view: 'side', input: 'DEFAULT', res: 'ps1',
  enter(d) { overMenu.from = d.from; overMenu.i = 0; A.music(null); A.sfx('die'); game.follow(null); game.focus(0, 0, 0); if (gpu) gpu.enabled = false; L.enabled = false; },
  update(dt) { overMenu.update(dt); },
  draw(r) { overBg.draw(r); r.overlay(g => E.font.title(g, 'GAME OVER', r.W / 2, 60, { align: 'center', scale: 4, colors: ['#ffe0e0', '#ff7a6a', '#c8202a'], depthColor: '#3a0810' })); overMenu.draw(r); }
};
