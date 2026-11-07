/* ---- START: the boot (the 3D engine, then each slice's world, behind the boot screen), then the title menu, or a
 * slice named in the address (#platformer; #racing/vs: the slice's enter(data) gets { part }) ---- */
// a 3D genre kit file holds one slice: the menu lists only the slices in this file
for (let i = SLICES.length - 1; i >= 0; i--) if (!scenes[SLICES[i].id]) SLICES.splice(i, 1);
titleMenu = menuOf(SLICES, { y: 0, room: 34, onPick: i => game.go(SLICES[i].id) });
const [first, part] = (location.hash || '').slice(1).split('/');
// (the boot screen's title and steps are lines too: starter3d.boot.*, and each slice's BOOT steps its own)
game.start({ scenes, scene: scenes[first] ? first : 'title', data: scenes[first] && part ? { part } : undefined, boot: { title: E.t('starter3d.boot.title'), steps: [
  [E.t('starter3d.boot.engine'), () => W3.init(game)],
  ...BOOT,
  [E.t('starter3d.boot.shaders'), () => { for (const w of W3.worlds) w.prepare(); }]
] } });
window.__game = { game, scenes, titleMenu, get title() { return title; } };   // for tests
/* =============================== GAME END =============================== */
