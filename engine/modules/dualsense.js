/*!
my-3D2dge module DUALSENSE v0.106.0: a DualSense's extras: light bar, adaptive triggers, gyro aim, touchpad, speaker and mic
https://github.com/michaelcrosato/my-3d2dge (MIT License)
Loads after: the full engine only. Needs: no other module.

The engine plays any controller through the Gamepad API: the buttons and sticks, the triggers' travel (input.value), a
rumble (input.rumble), the touchpad's click (Pad17). This module adds what only a DualSense has, over WebHID, as extras:
a game plays the same without them (docs/CONTROLS.md).
- const ds = E.DualSense.attach(game, { light, triggers, gyro, speaker, mic }): the extras the game uses (true each);
  each gets a row on the Controls screen's Controller tab: Light bar, Adaptive triggers, Gyro aim (off, low, medium,
  high: off at first), Controller speaker, Microphone. attach again gives the same ds, with the rows of any extra it
  names now (a file of several games, each attaching its own). ds.clear(): the triggers free and the light bar back
  to blue (a scene's exit, so the next one starts clean).
- ds.light('#e8443a'): the light bar's colour, a meaning of the game's (health, danger, the team; null leaves it);
  ds.player(0..3): the player lights (-1 off).
- ds.trigger('left' | 'right', effect): null (free), { resist: [start, force] } (a firm pull from start: a brake, a
  bowstring), { weapon: [start, end, force] } (a click between start and end: a gun's break), { pulse: [start, hz,
  force] } (a buzz from start: an engine, a machine gun); numbers 0..1, hz 1..255. Set it when it changes, not each step.
- ds.gyroAim(dt) -> [dx, dy]: screen pixels to add to an aim cursor or a camera this step, from the controller's turn and
  tilt ([0, 0] with gyro aim off or no DualSense). ds.touches: the touchpad's fingers [{ x, y }] (0..1); ds.swipe() ->
  'left' | 'right' | 'up' | 'down' in the step after a flick on the touchpad, else null.
- ds.speaker(name, o): a sound effect (audio.sfx's name and options) from the controller's speaker while the player has
  it on, else from the game's as usual. ds.micLevel() -> 0..1, how loud the microphone hears (0 while it is off).
- ds.connected: a DualSense is open; ds.allowed: { hid, speaker, mic }, what the player has allowed.

Permissions: the game never asks. WebHID, the controller's speaker and the microphone work only where the player has
already allowed them (52in1's Settings: the page's permissions and its frame's allow), found without a prompt; until then
their rows are locked and say where to allow them.

```js dualsense
const E = My3D2dge, game = new E.Game({ headless: true }), ds = E.DualSense.attach(game, { light: true, gyro: true });
ds.light('#ff4040'); ds.trigger('right', { resist: [.3, .6] }); ds.player(0);
const a = ds.gyroAim(1 / 120); if (a[0] !== 0 || a[1] !== 0 || ds.connected || ds.swipe() !== null) throw new Error('nothing without a DualSense');
if (!game.settings.spec('padLight') || !game.settings.spec('gyro') || game.settings.spec('padTriggers')) throw new Error('a row for each extra named');
if (E.DualSense.attach(game, { triggers: true }) !== ds || !game.settings.spec('padTriggers') || ds.micLevel() !== 0) throw new Error('one ds a game, more rows');
```
Rules: every extra has another way in (a rumble for the triggers' feel, the stick for the gyro, a button for the
touchpad): the game is whole on any controller. Gyro aim adds to the stick or the mouse, never replaces them.
*/
(function (E) {
'use strict';
if (!E) throw new Error('my-3D2dge module DUALSENSE: load engine/my-3d2dge.js (the full engine) first');

/* =============================================================================
 * DUALSENSE  WebHID reports after Linux's hid-playstation (output 0x02 over USB, 0x31 over Bluetooth with a CRC-32;
 *   input 0x01 and 0x31: gyro, touchpad), the extras' rows in game.settings, permissions found without a prompt
 * ========================================================================== */
const SONY = 0x054c, PIDS = [0x0ce6, 0x0df2];   // DualSense, DualSense Edge
const isDS = d => !!d && d.vendorId === SONY && PIDS.includes(d.productId);
const LEDS = [0x04, 0x0a, 0x15, 0x1b];   // the player lights for players 1 to 4, as the console lights them
const GYRO = { off: 0, low: 2.5, medium: 5, high: 9 };   // gyro aim: screen pixels for a degree of turn
const ONCE = new WeakMap();
E.lang.engine({
  'engine.setting.pad_light': 'Light bar', 'engine.setting.pad_light.help': 'The DualSense\'s light shows what the game says: your health, danger, your team',
  'engine.setting.pad_triggers': 'Adaptive triggers', 'engine.setting.pad_triggers.help': 'The DualSense\'s triggers push back: a brake, a bowstring, a gun\'s break',
  'engine.setting.gyro': 'Gyro aim', 'engine.setting.gyro.help': 'Turn and tilt the DualSense to fine-tune your aim, on top of the stick', 'engine.setting.gyro.off': 'Off', 'engine.setting.gyro.low': 'Low', 'engine.setting.gyro.medium': 'Medium', 'engine.setting.gyro.high': 'High',
  'engine.setting.pad_speaker': 'Controller speaker', 'engine.setting.pad_speaker.help': 'Small sounds of the game play from the DualSense in your hands',
  'engine.setting.mic': 'Microphone', 'engine.setting.mic.help': 'The game listens for how loud you are, where it asks you to: nothing is recorded or sent',
  'engine.dualsense.need_pad': 'Connect a DualSense and allow it in 52in1 Settings', 'engine.dualsense.need_allow': 'Allow it in 52in1 Settings first'
});
const policy = f => { try { const P = document.permissionsPolicy || document.featurePolicy; return !P || typeof P.allowsFeature !== 'function' || P.allowsFeature(f); } catch (e) { return true; } };
const granted = async name => { try { return !!navigator.permissions && (await navigator.permissions.query({ name })).state === 'granted'; } catch (e) { return false; } };
const n01 = (v, lo, hi) => Math.round(lo + Math.max(0, Math.min(1, +v || 0)) * (hi - lo));
let crcT = null;
/** CRC-32 (IEEE), as a Bluetooth output report ends */
function crc32(bytes) {
  if (!crcT) { crcT = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; } }
  let c = 0xffffffff; for (const b of bytes) c = crcT[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0;
}
// a trigger effect's 11 bytes (the mode, then its parameters, in ten zones of the trigger's travel): off, feedback
// (resist), weapon, vibration (pulse)
function effect(e) {
  const b = new Uint8Array(11), zones = (from, amt) => { let a = 0, f = 0; for (let i = from; i < 10; i++) { a |= 1 << i; f += amt * 2 ** (3 * i); } return [a, f]; };
  const put = (a, f) => { b[1] = a & 255; b[2] = a >> 8; for (let k = 0; k < 4; k++) b[3 + k] = Math.floor(f / 2 ** (8 * k)) & 255; };
  if (!e) { b[0] = 0x05; return b; }
  if (e.resist) { b[0] = 0x21; put(...zones(n01(e.resist[0], 0, 9), n01(e.resist[1], 0, 7))); }
  else if (e.weapon) { const s = n01(e.weapon[0], 2, 7), t = Math.max(s + 1, n01(e.weapon[1], 3, 8)), z = (1 << s) | (1 << t); b[0] = 0x25; b[1] = z & 255; b[2] = z >> 8; b[3] = n01(e.weapon[2], 0, 7); }
  else if (e.pulse) { b[0] = 0x26; put(...zones(n01(e.pulse[0], 0, 9), n01(e.pulse[2], 0, 7))); b[9] = Math.max(1, Math.min(255, Math.round(e.pulse[1] || 30))); }
  else b[0] = 0x05;
  return b;
}
class DualSense {
  /** E.DualSense.attach(game, o) makes one (the manual above) */
  constructor(game, o) {
    /** game: its game; o: the extras it uses; connected: a DualSense is open over WebHID; allowed: what the player has
     *  allowed ({ hid, speaker, mic }); touches: the touchpad's fingers [{ x, y }] (0..1) */
    this.game = game; this._o = o; this.connected = false; this.allowed = { hid: false, speaker: false, mic: false }; this.touches = [];
    this._dev = null; this._wire = 'usb'; this._seq = 0; this._want = { light: null, player: null, left: null, right: null }; this._sent = ''; this._busy = false;
    this._raw = [0, 0, 0]; this._bias = [0, 0, 0]; this._rate = [0, 0, 0]; this._still = 0; this._flick = null; this._flicked = null; this._level = 0; this._an = null; this._spk = null;
    this.extras(o);
    game.hook('input', dt => this._tick(dt));
    if (!game.headless && typeof navigator !== 'undefined') this._find();
  }
  /** name more extras this game uses ({ light, triggers, gyro, speaker, mic }: attach does it): their rows are added */
  extras(o = {}) {
    for (const k in o) if (o[k] && k in this._o) this._o[k] = true;
    const game = this.game, S = game.settings, lockHid = () => this.allowed.hid ? null : E.t('engine.dualsense.need_pad');
    if (o.light && !S.spec('padLight')) S.define({ key: 'padLight', group: 'Controller', label: 'Light bar', help: 'The DualSense\'s light shows what the game says: your health, danger, your team', type: 'toggle', value: true, locked: lockHid, apply: () => this._push() });
    if (o.triggers && !S.spec('padTriggers')) S.define({ key: 'padTriggers', group: 'Controller', label: 'Adaptive triggers', help: 'The DualSense\'s triggers push back: a brake, a bowstring, a gun\'s break', type: 'toggle', value: true, locked: lockHid, apply: () => this._push() });
    if (o.gyro && !S.spec('gyro')) S.define({ key: 'gyro', group: 'Controller', label: 'Gyro aim', help: 'Turn and tilt the DualSense to fine-tune your aim, on top of the stick', type: 'select', value: 'off', options: [['off', 'Off'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High']], locked: lockHid });
    if (o.speaker && !S.spec('padSpeaker')) S.define({ key: 'padSpeaker', group: 'Controller', label: 'Controller speaker', help: 'Small sounds of the game play from the DualSense in your hands', type: 'toggle', value: false, locked: () => this.allowed.speaker ? null : E.t('engine.dualsense.need_allow'), apply: (g, v) => this._speakerOn(v) });
    if (o.mic && !S.spec('mic')) S.define({ key: 'mic', group: 'Controller', label: 'Microphone', help: 'The game listens for how loud you are, where it asks you to: nothing is recorded or sent', type: 'toggle', value: false, locked: () => this.allowed.mic ? null : E.t('engine.dualsense.need_allow'), apply: (g, v) => this._micOn(v) });
  }
  /** the triggers free and the light bar back to blue: a scene's exit, so the next starts clean */
  clear() { this._want.left = this._want.right = null; this._want.light = '#3050ff'; this._push(); return this; }
  /** the light bar's colour ('#rrggbb'; null leaves it as it is) */
  light(color) { this._want.light = typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color) ? color : null; this._push(); return this; }
  /** the player lights: 0..3 for players 1 to 4, -1 off */
  player(n) { this._want.player = n === null || n === undefined ? null : n | 0; this._push(); return this; }
  /** a trigger's effect: trigger('right', { resist: [start, force] } | { weapon: [start, end, force] } | { pulse: [start,
   *  hz, force] } | null) */
  trigger(side, eff) { if (side === 'left' || side === 'right') { this._want[side] = eff || null; this._push(); } return this; }
  /** screen pixels to add to an aim or a camera this step from the controller's turn ([dx, dy]; [0, 0] without gyro aim) */
  gyroAim(dt) { const k = GYRO[this.game.settings.gyro] || 0; if (!k || !this.connected || !this.allowed.hid) return [0, 0]; return [-this._rate[1] * k * dt, -this._rate[0] * k * dt]; }
  /** 'left' | 'right' | 'up' | 'down' in the step after a flick on the touchpad, else null */
  swipe() { return this._flicked; }
  /** how loud the microphone hears, 0..1 (0 while it is off or not allowed) */
  micLevel() { return this._an ? this._level : 0; }
  /** a sound effect from the controller's speaker while the player has it on, else as audio.sfx plays it */
  speaker(name, o = {}) {
    const A = this.game.audio;
    if (this._spk && this.game.settings.padSpeaker) { this._spk.gain.value = A.muted ? 0 : A.volume * A.sfxVolume; return A.sfx(name, Object.assign({}, o, { bus: this._spk })); }
    return A.sfx(name, o);
  }
  // what the player has allowed, found without a prompt: a DualSense the page may already open, a microphone already
  // granted, the DualSense's speaker named (names come with a granted microphone) and choosable
  async _find() {
    try {
      if (navigator.hid && policy('hid')) {
        navigator.hid.addEventListener('connect', e => { if (isDS(e.device) && !this._dev) this._open(e.device); });
        navigator.hid.addEventListener('disconnect', e => { if (e.device === this._dev) { this._dev = null; this.connected = false; this.touches = []; this._rate = [0, 0, 0]; } });
        const d = (await navigator.hid.getDevices()).find(isDS); this.allowed.hid = !!d; if (d) await this._open(d);
      }
      this.allowed.mic = policy('microphone') && await granted('microphone');
      const MD = navigator.mediaDevices, list = this.allowed.mic && MD && MD.enumerateDevices ? await MD.enumerateDevices() : [], named = k => list.find(d => d.kind === k && /dualsense|wireless controller/i.test(d.label));
      this._spkId = named('audiooutput') ? named('audiooutput').deviceId : null; this._micId = named('audioinput') ? named('audioinput').deviceId : null;
      this.allowed.speaker = !!this._spkId && policy('speaker-selection') && typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype;
      const S = this.game.settings; if (S.padSpeaker) this._speakerOn(true); if (S.mic) this._micOn(true);
    } catch (e) { /* not allowed here */ }
  }
  async _open(d) {
    try {
      if (!d.opened) await d.open();
      this._dev = d; this.connected = this.allowed.hid = true; this._sent = '';
      this._wire = (d.collections || []).some(c => (c.outputReports || []).some(r => r.reportId === 0x31)) ? 'bt' : 'usb';
      d.addEventListener('inputreport', e => this._report(e));
      if (this._wire === 'bt') d.receiveFeatureReport(0x05).catch(() => {});   // (asking for the calibration turns on Bluetooth's full reports)
      this._push();
    } catch (e) { this._dev = null; this.connected = false; }
  }
  // an input report: the gyro (pitch, yaw, roll: about 1,024 a degree a second) and the touchpad's two fingers
  _report(e) {
    const v = e.data, k = e.reportId === 0x31 ? 1 : e.reportId === 0x01 && v.byteLength >= 63 ? 0 : -1; if (k < 0) return;
    this._raw = [v.getInt16(k + 15, true), v.getInt16(k + 17, true), v.getInt16(k + 19, true)];
    const pts = [];
    for (let i = 0; i < 2; i++) { const at = k + 32 + i * 4; if (v.getUint8(at) & 0x80) continue; const b1 = v.getUint8(at + 1), b2 = v.getUint8(at + 2), b3 = v.getUint8(at + 3); pts.push({ x: (b1 | (b2 & 15) << 8) / 1919, y: ((b2 >> 4) | b3 << 4) / 1079 }); }
    this.touches = pts;
  }
  // each step: the gyro's rate less its drift (learned while the controller lies still), a touchpad flick, the mic's level
  _tick(dt) {
    this._flicked = null;
    if (this.connected) {
      const d = this._raw.map((r, i) => r - this._bias[i]), calm = d.every(x => Math.abs(x) < 300);
      this._still = calm ? this._still + dt : 0; if (this._still > .8) for (let i = 0; i < 3; i++) this._bias[i] += (this._raw[i] - this._bias[i]) * .05;
      this._rate = this._raw.map((r, i) => Math.abs(r - this._bias[i]) < 40 ? 0 : (r - this._bias[i]) / 1024);   // (degrees a second; a hair's noise is none)
      const p = this.touches[0], f = this._flick;
      if (p && !f) this._flick = { x: p.x, y: p.y, t: 0, x1: p.x, y1: p.y };
      else if (p && f) { f.t += dt; f.x1 = p.x; f.y1 = p.y; }
      else if (!p && f) { const dx = f.x1 - f.x, dy = f.y1 - f.y; this._flick = null; if (f.t < .45 && Math.max(Math.abs(dx), Math.abs(dy) * 1.8) > .25) this._flicked = Math.abs(dx) > Math.abs(dy) * 1.8 ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down'); }
    }
    if (this._an) { this._an.getFloatTimeDomainData(this._buf); let s = 0; for (const x of this._buf) s += x * x; const l = Math.min(1, Math.sqrt(s / this._buf.length) * 4); this._level += (l - this._level) * Math.min(1, dt * 12); }
  }
  // the output report for what is wanted now, sent when it changed (a light set each step sends once)
  _push() {
    if (!this._dev || !this._dev.opened) return;
    const S = this.game.settings, c = new Uint8Array(47), w = this._want;
    if (this._o.triggers) { const on = S.padTriggers !== false; c[0] |= 0x0c; c.set(effect(on && w.right), 10); c.set(effect(on && w.left), 21); }
    if (w.light && S.padLight !== false) { c[1] |= 0x04; c[44] = parseInt(w.light.slice(1, 3), 16); c[45] = parseInt(w.light.slice(3, 5), 16); c[46] = parseInt(w.light.slice(5, 7), 16); }
    if (w.player !== null) { c[1] |= 0x10; c[43] = w.player >= 0 ? LEDS[w.player % 4] : 0; }
    const key = c.join(); if (key === this._sent) return;
    if (this._busy) { this._again = true; return; }
    this._sent = key; this._busy = true;
    let id = 0x02, data = c;
    if (this._wire === 'bt') { id = 0x31; data = new Uint8Array(77); data[0] = (this._seq++ & 15) << 4; data[1] = 0x10; data.set(c, 2); new DataView(data.buffer).setUint32(73, crc32([0xa2, 0x31, ...data.subarray(0, 73)]), true); }
    this._dev.sendReport(id, data).catch(() => {}).then(() => { this._busy = false; if (this._again) { this._again = false; this._push(); } });
  }
  // the controller's speaker on or off: the game's sound for it goes through a stream to the DualSense's output
  _speakerOn(on) {
    const A = this.game.audio;
    if (!on || !this.allowed.speaker) { if (this._spkEl) { this._spkEl.pause(); this._spkEl = null; } this._spk = null; return; }
    if (this._spk || !A.bus('master') || !A.ctx.createMediaStreamDestination) return;
    try {
      const g = A.ctx.createGain(), dst = A.ctx.createMediaStreamDestination(), el = new Audio(); g.connect(dst); el.srcObject = dst.stream;
      el.setSinkId(this._spkId).then(() => el.play()).catch(() => { this._spk = null; });
      this._spk = g; this._spkEl = el;
    } catch (e) { this._spk = null; }
  }
  // the microphone on or off: its level read from an analyser on the game's sound (granted already: no prompt)
  async _micOn(on) {
    if (this._stream) { for (const t of this._stream.getTracks()) t.stop(); this._stream = null; }
    this._an = null; this._level = 0;
    if (!on || !this.allowed.mic || !navigator.mediaDevices) return;
    try {
      const st = this._stream = await navigator.mediaDevices.getUserMedia({ audio: this._micId ? { deviceId: { exact: this._micId } } : true });
      if (!this.game.settings.mic || !this.game.audio.bus('master')) { for (const t of st.getTracks()) t.stop(); this._stream = null; return; }
      const c = this.game.audio.ctx, an = c.createAnalyser(); an.fftSize = 512; c.createMediaStreamSource(st).connect(an); this._buf = new Float32Array(512); this._an = an;
    } catch (e) { this._an = null; }
  }
}
/** E.DualSense: attach(game, o) gives a game its DualSense extras (the manual above); effect(e) a trigger effect's bytes */
E.DualSense = {
  /** the extras a game uses: one DualSense object per game, its rows in the settings (the manual above) */
  attach(game, o = {}) { let ds = ONCE.get(game); if (!ds) { ds = new DualSense(game, Object.assign({ light: false, triggers: false, gyro: false, speaker: false, mic: false }, o)); ONCE.set(game, ds); } else ds.extras(o); return ds; },
  /** a trigger effect's 11 bytes (null, { resist }, { weapon }, { pulse }), as the output report carries it: for a tool or a test */
  effect(e) { return effect(e); }
};
})(typeof My3D2dge !== 'undefined' ? My3D2dge : undefined);
