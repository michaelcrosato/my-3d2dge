/* =====================================================================================
 * SLICE FIXTURE  (a test's own: tools/modules-test.mjs puts it in a copy of the repository; never shipped). A tally on a
 * screen: the least slice that names a module. @modules fixture
 * ===================================================================================== */
const FIXTURE = (() => {
  let tally = null;
  const reset = () => { tally = new E.Tally({ start: 1 }); };
  /** the proof: n steps, a count every 30th; returns the tally (the same every time) */
  function run(n = 600) { reset(); for (let i = 0; i < n; i++) if (i % 30 === 0) tally.add(); return tally.total; }
  return { view: 'side', views: ['side'], input: 'DEFAULT', res: 'ps1', pausable: true, enter: reset,
    update() { if (game.input.pressed('confirm')) tally.add(); },
    draw(r) { r.sky(['#102040', '#204060']); r.text('TALLY ' + tally.total, r.W / 2, r.H / 2, '#ffffff', { align: 'center', shadow: '#000', outline: false }); },
    run };
})();
scenes.fixture = FIXTURE;
