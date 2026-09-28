/* =============================================================================
 * PERFORMANCE GOVERNOR: keeps the game fluid on slower machines. When the frame rate stays low it drops the
 * outlines on ordinary monsters and caps particles; when there is headroom again it brings them back.
 * PERF.low is read by drawFoe (30-monsters-core.js). Settings > Particles still sets the ceiling.
 * ============================================================================= */
const PERF = { low: false, bad: 0, good: 0, t: 0 };
BUS.on('step', e => {
  PERF.t += e.dt; if (PERF.t < .5) return; PERF.t = 0;
  const fps = game.fps, cap = [500, 1000, 1600][OPT.fx === undefined ? 2 : OPT.fx];
  if (!PERF.low) { PERF.bad = fps < 45 ? PERF.bad + 1 : 0; if (PERF.bad >= 6) { PERF.low = true; PERF.good = 0; P.max = Math.min(cap, 700); } }
  else { PERF.good = fps >= 57 ? PERF.good + 1 : 0; if (PERF.good >= 20) { PERF.low = false; PERF.bad = 0; P.max = cap; } }
});
