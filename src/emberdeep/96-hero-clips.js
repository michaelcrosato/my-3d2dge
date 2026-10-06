/* =============================================================================
 * HERO CLIPS: motion-captured moments the Wanderer plays on his own rig. The clips are the HERO animation set
 * (src/mocap/sets/hero.js: picked from the Quaternius set by tools/anim-set.mjs, in the readable format; docs/MOCAP.md),
 * each one a moment his procedural animation had no answer for:
 *   death      Death01             he dies: staggers back and falls flat (the death panel waits until he lands)
 *   rise       LayToIdle           revived (back in town, a retry, the developer's revive): he gets up off the ground
 *   wait       Idle_FoldArms_Loop  someone talks to him, or a shopkeeper serves him: arms folded while he waits
 *   chest      Chest_Open          the stash opens: he turns to it, bends and lifts the lid
 *   stone      Interact            the waystone's panel opens: he turns to it and works it with his hands
 *   pickup     PickUp_Table        loot goes in his bag: a quick reach (upper body only: he keeps walking)
 *   hitChest,  Hit_Chest, Hit_Head a heavy blow that does not knock him down (over 12% of his life): the upper body
 *   hitHead                        snaps back while his legs take the stagger
 * Mocap.drive retargets a clip onto his rig each step (his build, cape and hair stay his). Moving, rolling, attacking
 * or a flinch takes the body back at once (the clip fades out in a few frames). The gallery's POSES reel shows each one.
 * Codex has his own rig and plays none of them.
 * Hooks: updateHero, townLife and reviveHero are wrapped (the clip is stepped before the rig poses itself);
 * deathPanelDue waits for the fall; the pickup and hurt events start the small ones.
 * ============================================================================= */
const HCL = { lib: typeof Mocap !== 'undefined' && window.MOCAP && window.MOCAP.HERO ? Mocap.load(window.MOCAP.HERO) : null, LANDED: 1.4 };
// how each moment plays: speed, fade (seconds in and out), mask 'upper' (his legs keep walking), walk (moving does not
// cut it), hold (the last pose stays: he lies where he fell)
const HCL_MOVES = {
  death: { clip: 'Death01', hold: true },
  rise: { clip: 'LayToIdle', speed: 1.1, instant: true, out: .25 },
  wait: { clip: 'Idle_FoldArms_Loop', fade: .35 },
  chest: { clip: 'Chest_Open', speed: 1.15 },
  stone: { clip: 'Interact', speed: 1.2 },
  pickup: { clip: 'PickUp_Table', speed: 1.5, mask: 'upper', walk: true },
  hitChest: { clip: 'Hit_Chest', mask: 'upper', walk: true },
  hitHead: { clip: 'Hit_Head', mask: 'upper', walk: true }
};
const HCL_fit = h => !!(HCL.lib && h && h.rig instanceof E.Humanoid && h.character !== 'codex');
/** start a moment (crossfading from whatever clip is on him); o.instant: at full weight from the first frame */
function HCL_play(h, id, o = {}) {
  const M = HCL_MOVES[id], c = M && HCL.lib.clip(M.clip); if (!c) return null;
  const was = h.HCL, from = was && was.w > 0 && h.HCL_pose ? Float32Array.from(h.HCL_pose) : null;
  h.HCL = { id, c, t: 0, speed: M.speed || 1, fade: M.fade || .12, w: o.instant || M.instant ? 1 : was ? was.w : 0, out: false, hold: !!(M.hold || o.hold), mask: o.full ? null : M.mask || null, walk: !!M.walk, from, blend: from ? .18 : 0, gal: !!o.gal };
  return h.HCL;
}
/** let the clip go: it fades out over `fade` seconds and the rig's own animation takes the body back */
function HCL_stop(h, fade = .15) { const k = h.HCL; if (k && !k.out) { k.out = true; k.fade = fade; } }
/** advance the clip and hand this step's pose to the rig (call before the rig updates) */
function HCL_step(h, dt) {
  const rig = h.rig, k = h.HCL, L = HCL.lib;
  if (rig.HCL !== L) { Mocap.drive(rig, L); rig.HCL = L; }   // a new rig (new gear dresses him again) is driven again
  if (!k) { rig.mocap = null; return; }
  k.t += dt * k.speed;
  if (k.t >= k.c.dur && !k.c.loop && !k.hold && !k.out) { k.out = true; k.fade = HCL_MOVES[k.id].out || .2; }
  k.w = k.out ? k.w - dt / k.fade : Math.min(1, k.w + dt / k.fade);
  if (k.w <= 0) { h.HCL = null; rig.mocap = null; return; }
  const pose = L.sample(k.c, k.t, h.HCL_pose || (h.HCL_pose = new Float32Array(L.P * 3)));
  if (k.from) { k.blend -= dt; if (k.blend <= 0) k.from = null; else L.blend(k.from, pose, 1 - k.blend / .18, pose); }
  rig.mocap = pose; rig.mocapW = E.ease.inOut(clamp(k.w, 0, 1)); rig.mocapMask = k.mask; rig.mocapBlade = false;
}
const HCL_waiting = () => !!(talk.open || (ED.L && ED.L.serving));
/** the moments that start from his state: dying, getting up after a revive */
function HCL_auto(h) {
  const k = h.HCL;
  if (h.dead) { if ((!k || k.id !== 'death') && (h.z || 0) <= 1) HCL_play(h, 'death'); return; }
  if (h.HCL_rise) { h.HCL_rise = false; if (!(h.act && h.act.name === 'dropin') && !((h.z || 0) > 1)) HCL_play(h, 'rise'); }   // (dropped in from above, he lands on his feet)
}
/** what takes the body back: a roll or an action at once; moving or a flinch (unless the clip walks with him) */
function HCL_cancel(h) {
  const k = h.HCL; if (!k || k.out || k.gal || h.dead) return;
  if (h.dodgeT > 0 || h.act) return HCL_stop(h, .07);
  if (!k.walk && (Math.hypot(h.vx, h.vy) > 20 || h.hurtT > 0)) return HCL_stop(h, HCL_MOVES[k.id].out || .15);
  if (k.id === 'wait' && !HCL_waiting()) HCL_stop(h, .3);
}
{ const base = updateHero;
  updateHero = function (h, dt, o) {
    if (!HCL_fit(h)) return base(h, dt, o);
    h.HCL_ui = null; HCL_auto(h); HCL_step(h, dt);
    base(h, dt, o);
    HCL_cancel(h);
  };
}
/** in town with a panel or a talk open (townLife poses him then, not updateHero): fold the arms, open the chest, work the stone */
{ const base = townLife;
  townLife = function (dt) {
    const h = ED.hero;
    if (HCL_fit(h) && !h.dead) {
      const L0 = ED.L, chest = UI.isOpen('stash') && (L0.things || []).find(t => t.kind === 'stash'), stone = UI.isOpen('waystone') && L0.waystone, at = chest || stone;
      if (at) h.facing = E.approachAng(h.facing, angTo(h, at), dt * 8);
      const want = chest ? 'chest' : stone ? 'stone' : HCL_waiting() ? 'wait' : null;
      if (want !== h.HCL_ui) { h.HCL_ui = want; if (want && !(h.HCL && h.HCL.id === want && !h.HCL.out)) HCL_play(h, want); }
      HCL_step(h, dt);
    }
    return base(dt);
  };
}
{ const base = reviveHero;
  reviveHero = function (h) {
    const fell = !!(h && (h.dead || (h.HCL && h.HCL.id === 'death')));
    base(h);
    if (!HCL_fit(h)) return;
    if (h.HCL && h.HCL.id === 'death') h.HCL = null;
    if (fell) h.HCL_rise = true;   // he gets up on his next step (unless he drops in from above)
  };
}
// the YOU DIED panel stops the world: it waits until he has landed, so it never freezes him mid-fall
{ const base = deathPanelDue; deathPanelDue = h => base(h) && !(h.HCL && h.HCL.id === 'death' && h.HCL.t < HCL.LANDED); }
BUS.on('pickup', () => {
  const h = ED.hero; if (!HCL_fit(h) || !h.alive || h.dead || h.act || h.dodgeT > 0 || (h.HCL && !h.HCL.out && !h.HCL.walk)) return;
  HCL_play(h, 'pickup');
});
BUS.on('hurt', e => {
  const h = ED.hero, hit = (e && e.hit) || {}; if (!e || e.tgt !== h || !HCL_fit(h) || !h.alive || h.dead) return;
  if ((hit.kb || 0) >= 200 || hit.knockdown || h.act || h.dodgeT > 0 || !(e.dmg > h.maxHp * .12)) return;   // knocked down: the rig's own fall
  if (h.HCL && !h.HCL.out && !h.HCL.walk) return;
  HCL_play(h, (h.HCL_hits = (h.HCL_hits || 0) + 1) % 2 ? 'hitChest' : 'hitHead');
});

/* ---- the gallery's POSES reel: each captured moment, played whole on the spot, then again ---- */
const HCL_GALLERY = [
  ['Captured death', 'death', 'Motion capture: a stagger, then flat on his back.'], ['Captured get-up', 'rise', 'Motion capture: up off the ground.'],
  ['Arms folded', 'wait', 'Waiting while someone talks.'], ['Open the stash', 'chest', 'He bends and lifts the lid.'],
  ['Use the waystone', 'stone', 'Hands on the stone.'], ['Pick up', 'pickup', 'A quick reach for loot.'],
  ['Hit in the chest', 'hitChest', 'A heavy blow snaps him back.'], ['Hit in the head', 'hitHead', 'A heavy blow to the head.']
];
if (HCL.lib) for (const [name, id, cap] of HCL_GALLERY) GAL_POSES.push([name, { clip: id }, cap]);
{ const base = galItems;
  galItems = function () { const ids = base(); return GAL.reel === 3 && !HCL_fit(ED.hero) ? ids.filter(i => !GAL_POSES[i][1].clip) : ids; };
}
{ const base = galleryScene.update;
  galleryScene.update = function (dt) {
    const h = ED.hero;
    if (HCL_fit(h)) {
      const p = GAL.reel === 3 && GAL_POSES[GAL.cur], id = p && p[1].clip, k = h.HCL;
      if (id) {
        const again = k && k.gal && k.id === id && !k.c.loop && k.t > k.c.dur + 1.2;   // the end pose holds a moment, then the take runs again
        if (again) galReset();
        if (again || !k || !k.gal || k.id !== id || GAL.t < (h.HCL_galT || 0)) HCL_play(h, id, { gal: true, hold: true, full: true, instant: true });
        h.HCL_galT = GAL.t; HCL_step(h, dt);
      } else if (k && k.gal) { h.HCL = null; h.rig.mocap = null; }
    }
    return base.call(this, dt);
  };
}
