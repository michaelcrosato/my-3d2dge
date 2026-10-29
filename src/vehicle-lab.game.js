/* Vehicle Lab (a Temporary prototype: src/labs.json). One track, two karts driving it two ways:
 *   A  Rapier's ray-cast vehicle controller: a box chassis on four sprung wheels, engine force and steering on them,
 *      tyre friction (it tips, pitches on the suspension, slides when the tyres let go)
 *   B  world.vehicle: a ball Rapier rolls (walls, bumps, ramps, jumps) steered by the drive module's arcade handling
 *      (speed along the heading, a slide grip takes away, a hop into a drift that charges a boost)
 * Tab switches which you drive (the other drives itself round the line); arrows or WASD steer, Z or J the gas, X or K
 * the brake, Space hops and drifts (B), C the camera (behind, the view). It reaches past the engine's API (world.pw,
 * Rapier's own controller) as a prototype may. */
const E = My3D2dge, W3 = E.World3D, T = 16, { clamp } = E;
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, bg: null, input: Object.assign({}, E.Input.DEFAULT, { gas: ['KeyZ', 'KeyJ', 'Pad0'], brake: ['KeyX', 'KeyK', 'Pad2'], drift: ['Space', 'ShiftLeft', 'Pad5', 'Pad7'], swap: ['Tab', 'Pad3'], cam: ['KeyC', 'Pad11'] }), menu: { settings: W3.SETTINGS } });
const rows = Array.from({ length: 56 }, (_, y) => y === 0 || y === 55 ? '#'.repeat(80) : '#' + '.'.repeat(78) + '#');
// the line: a loop round the field, a hump to jump on the far straight, a long bend
const LINE = [[200, 300, 0], [600, 220, 0], [760, 200, 0], [840, 200, 14], [900, 200, 22], [960, 200, 0], [1180, 230, 0], [1220, 400, 0], [1150, 620, 0], [900, 720, 0], [600, 760, 0], [330, 700, 0], [170, 520, 0]];
let world, track, A, B, which = new URLSearchParams(location.search).get('drive') === 'A' ? 'A' : 'B', camMode = 'behind', t = 0;   // (?drive=A starts in A)
const AUTO = new URLSearchParams(location.search).has('auto');   // (?auto: both drive themselves)
const path = new E.Path(LINE, { closed: true, smooth: 'catmull' });
function buildA(x, y, angle) {   // the ray-cast vehicle: a chassis on four wheels (Rapier's DynamicRayCastVehicleController)
  const R = E.RAPIER, pw = world.pw, q = { x: 0, y: 0, z: Math.sin(angle / 2), w: Math.cos(angle / 2) };
  const body = pw.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(x, y, 14).setRotation(q).setCanSleep(false).setCcdEnabled(true).setAngularDamping(1.5));
  pw.createCollider(R.ColliderDesc.cuboid(9, 5.5, 2.4).setDensity(1).setFriction(.3).setCollisionGroups((8 << 16) | (1 | 2 | 4 | 8 | 64)), body);
  const vc = pw.createVehicleController(body); vc.indexUpAxis = 2; vc.setIndexForwardAxis = 0;
  for (const [wx, wy] of [[6, -5.5], [6, 5.5], [-6, -5.5], [-6, 5.5]]) vc.addWheel({ x: wx, y: wy, z: -1 }, { x: 0, y: 0, z: -1 }, { x: 0, y: -1, z: 0 }, 3.2, 3);
  for (let i = 0; i < 4; i++) { vc.setWheelSuspensionStiffness(i, 40); vc.setWheelSuspensionCompression(i, 2.6); vc.setWheelSuspensionRelaxation(i, 3.2); vc.setWheelFrictionSlip(i, 2.2); vc.setWheelSideFrictionStiffness(i, 1); vc.setWheelMaxSuspensionTravel(i, 4); vc.setWheelMaxSuspensionForce(i, 1e6); }
  return { body, vc, x, y, z: 14, angle, pitch: 0, roll: 0, speed: 0, ground: true };
}
function driveA(a, c, dt) {
  const vc = a.vc, m = a.body.mass(), top = 320, f = m * 170 * (c.gas && a.speed < top ? 1 : 0) - (c.brake && a.speed < 5 ? m * 80 : 0);
  for (let i = 0; i < 4; i++) { vc.setWheelEngineForce(i, i >= 2 ? f : 0); vc.setWheelBrake(i, c.brake && a.speed > 5 ? m * .3 : 0); }
  vc.setWheelSteering(0, c.steer * .42); vc.setWheelSteering(1, c.steer * .42);
  vc.updateVehicle(dt, E.RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC, (0xffff << 16) | (1 | 64));   // (its wheels feel the level and the track, not itself)
}
function readA(a) {
  const p = a.body.translation(), r = a.body.rotation(), v = a.body.linvel();
  const fx = 1 - 2 * (r.y * r.y + r.z * r.z), fy = 2 * (r.x * r.y + r.w * r.z), fz = 2 * (r.x * r.z - r.w * r.y), ry = 2 * (r.y * r.z + r.w * r.x), rz = 1 - 2 * (r.x * r.x + r.y * r.y);
  Object.assign(a, { x: p.x, y: p.y, z: p.z - 4.5, angle: Math.atan2(fy, fx), pitch: Math.asin(clamp(fz, -1, 1)), roll: Math.atan2(-ry, rz) * 0, speed: v.x * fx + v.y * fy, ground: [0, 1, 2, 3].some(i => a.vc.wheelIsInContact(i)) });
  a.roll = Math.atan2(2 * (r.w * r.x + r.y * r.z), 1 - 2 * (r.x * r.x + r.y * r.y));
}
/** a driver for whichever kart you are not driving: steer at a point ahead on the line */
function ai(k, dt) {
  const d = path.nearest(k.x, k.y), p = path.at(d + 80), a = Math.atan2(p.y - k.y, p.x - k.x), diff = E.angDiff(k.angle, a);
  k.slow = Math.abs(k.speed) < 15 ? (k.slow || 0) + dt : 0; if (k.slow > 1) { k.back = .9; k.slow = 0; }   // (stuck: back out, steering the other way)
  if (k.back > 0) { k.back -= dt; return { steer: -Math.sign(diff), gas: 0, brake: 1, drift: false }; }
  return { steer: clamp(diff * 2.2, -1, 1), gas: 1, brake: Math.abs(diff) > .9 && k.speed > 120 ? 1 : 0, drift: false };
}
const play = {
  view: 'iso', pausable: true, touch: ['gas', 'brake', 'drift', 'swap'],
  enter() {
    world.reset(); const s = path.at(0), s2 = path.at(30);
    B = world.vehicle({ kind: 'kart', x: s.x - Math.sin(s.angle) * 14, y: s.y + Math.cos(s.angle) * 14, angle: s.angle, color: '#2a8ad8', rig: new E.Humanoid({ weapon: null, hat: 'cap', colors: { cloth: '#2a8ad8', hat: '#2a8ad8' } }) });
    A = buildA(s2.x + Math.sin(s.angle) * 14, s2.y - Math.cos(s.angle) * 14, s.angle);
    world.camera.set('behind'); world.camera.follow(which === 'B' ? B : A); t = 0;
  },
  update(dt) {
    const I = game.input; t += dt;
    if (I.pressed('swap')) { which = which === 'B' ? 'A' : 'B'; world.camera.follow(which === 'B' ? B : A); game.note(which === 'A' ? 'A: RAY-CAST VEHICLE' : 'B: ROLLING BODY (world.vehicle)', 2); }
    if (I.pressed('cam')) { camMode = camMode === 'behind' ? 'view' : 'behind'; world.camera.set(camMode); }
    const you = { steer: I.move()[0], gas: I.down('gas') || I.down('up') ? 1 : 0, brake: I.down('brake') || I.down('down') ? 1 : 0, drift: I.down('drift') };
    B.update(dt, null, which === 'B' && !AUTO ? you : ai(B, dt));
    driveA(A, which === 'A' && !AUTO ? you : ai(A, dt), dt);
    world.step(dt); readA(A);
    if (B.fell) B.place(...[path.at(path.nearest(B.x, B.y))].map(p => [p.x, p.y])[0], 4);
  },
  draw(r) {
    const k = A, pen = world.pen; pen.at(k.x, k.y, k.z, k.angle, 1, k.pitch, k.roll);
    pen.box(0, 0, 3.6, 18, 11, 3, '#d8442a').box(-6, 0, 6, 4, 8, 4, '#3a3a44').box(8, 0, 4, 2.6, 12, 2.2, '#8a2a1a');
    for (const [wx, wy] of [[6, -6.6], [6, 6.6], [-6, -6.6], [-6, 6.6]]) pen.tube(wx, wy - 1.4, 3, wx, wy + 1.4, 3, 3, '#1c1a20');
    pen.at();
    world.draw(r);
    r.overlay(g => {
      const K = which === 'A' ? A : B;
      E.font.text(g, which === 'A' ? 'A  RAY-CAST VEHICLE (a chassis on four sprung wheels)' : 'B  ROLLING BODY, ARCADE HANDLING (world.vehicle)', 6, 6, which === 'A' ? '#ff9a7a' : '#8ad0ff', { outline: '#000', font: 'tiny' });
      E.font.text(g, 'SPEED ' + Math.round(Math.abs(K.speed)) + (which === 'B' ? '   ' + (B.drifting ? 'DRIFT ' + ['', 'BLUE', 'ORANGE'][Math.min(2, Math.floor(B.charge))] : '') + (B.onGround ? '' : '   AIR') + (B.boostT > 0 ? '   BOOST' : '') + '   ' + (B.surface || '') : K.ground ? '' : '   AIR'), 6, 16, '#ffffff', { outline: '#000', font: 'tiny' });
      E.font.text(g, 'TAB switch   Z gas   X brake   SPACE hop/drift   C camera', r.W / 2, r.H - 12, '#e8e0ff', { align: 'center', outline: '#000', font: 'tiny' });
    });
  }
};
game.start({ scenes: { play }, scene: 'play', boot: { title: 'Vehicle Lab', steps: [
  ['The 3D engine', () => W3.init(game)],
  ['The field and the track', () => {
    world = new W3(game, { level: { rows, ground: 'grass', colors: { base: '#5a9a3a', dark: '#4a8a32', light: '#6aaa4a' }, side: 'block' }, fog: { color: '#bcd8f0', near: 600, far: 1600 }, sky: ['#5a8ad8', '#bcd8f0'],
      ambient: ['#dde8ff', '#6a7a4a', 2.2], sun: { color: '#fff4dc', intensity: 2.6, dir: [-.5, .4, -.7], area: 500 }, torchLights: 0, camera: { mode: 'behind' } });
    track = world.track({ path, width: 80, bank: .3, pads: [[420, 0], [1500, -16]], off: 'grass' });
    world.prepare();
  }]] } });
window.__lab = { game, get world() { return world; }, get A() { return A; }, get B() { return B; }, get track() { return track; }, path };
