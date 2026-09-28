// Filmstrip: records a run of frames from a my-3D2dge game into one contact-sheet PNG, so an animation
// (a sword swing, a combo, a jump) can be judged frame by frame. Screenshots of single moments hide
// broken animation; a strip shows it.
//
// Usage:  node tools/filmstrip.mjs game.html[#scene] --steps "<steps>" [--out strip.png] [--cols 8] [--scale 2] [--crop x,y,w,h]
// Steps run in order, separated by spaces:
//   wait:600          wait 600 ms
//   press:Enter       tap a key (KeyboardEvent.code, e.g. KeyJ, Space, ArrowRight)
//   down:ArrowRight   hold a key down            up:ArrowRight   release it
//   rec:16:2          start recording 16 frames, one every 2 display frames (runs alongside the next steps)
//   eval:<js>         run JavaScript in the page (the game is My3D2dge.current)
// The strip waits for the recording to finish. Frames are the game's own low-resolution buffer, scaled
// up with whole pixels; --crop takes a region of that buffer (in game pixels) to zoom on one character.
// Example: node tools/filmstrip.mjs dist/my-3d2dge.html#brawler --steps "wait:1500 press:Enter wait:800 rec:16:2 press:KeyJ wait:120 press:KeyJ" --out jab.png
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--'));
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
if (!file) { console.error('Usage: node tools/filmstrip.mjs game.html[#scene] --steps "wait:1000 rec:16:2 press:KeyJ" [--out strip.png] [--cols 8] [--scale 2] [--crop x,y,w,h]'); process.exit(2); }
const steps = (opt('steps', 'wait:1000 rec:16:2') || '').trim().split(/\s+/);
const out = resolve(opt('out', 'filmstrip.png')), cols = +opt('cols', 8), scale = +opt('scale', 2), crop = opt('crop', null);

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e && e.message || e)));
const [filePath, hash] = file.split('#');
await page.goto(pathToFileURL(resolve(filePath)).href + (hash ? '#' + hash : ''));
await page.waitForFunction(() => window.My3D2dge && My3D2dge.current, null, { timeout: 10000 });

let recording = null;
for (const step of steps) {
  const [kind, ...rest] = step.split(':'), arg = rest.join(':');
  if (kind === 'wait') await page.waitForTimeout(+arg);
  else if (kind === 'press') { await page.keyboard.down(arg); await page.waitForTimeout(60); await page.keyboard.up(arg); }
  else if (kind === 'down') await page.keyboard.down(arg);
  else if (kind === 'up') await page.keyboard.up(arg);
  else if (kind === 'eval') await page.evaluate(arg);
  else if (kind === 'rec') {
    const [n, every] = arg.split(':').map(Number);
    // copy the game's buffer on every display frame, keep one in `every`
    recording = page.evaluate(([n, every, crop]) => new Promise(done => {
      const frames = [], g = My3D2dge.current; let tick = 0;
      const grab = () => {
        if (tick++ % every === 0) {
          const b = g.screen.buf, [x, y, w, h] = crop ? crop.split(',').map(Number) : [1, 1, g.screen.W, g.screen.H];
          const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(b, x, y, w, h, 0, 0, w, h);
          frames.push({ c, t: g.time.toFixed(2) });
        }
        if (frames.length < n) requestAnimationFrame(grab); else done(frames.map(f => ({ url: f.c.toDataURL(), w: f.c.width, h: f.c.height, t: f.t })));
      };
      requestAnimationFrame(grab);
    }), [n, every || 1, crop]);
  } else console.warn('unknown step', step);
}
if (!recording) { console.error('no rec:N:every step, nothing recorded'); await browser.close(); process.exit(2); }
const frames = await recording;

// lay the frames out on a sheet, whole-pixel scaled, with the frame number and game time under each
const sheet = await page.evaluate(async ([frames, cols, scale]) => {
  const w = frames[0].w * scale, h = frames[0].h * scale, pad = 4, lab = 12, rows = Math.ceil(frames.length / cols);
  const c = document.createElement('canvas'); c.width = cols * (w + pad) + pad; c.height = rows * (h + pad + lab) + pad;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.fillStyle = '#1b1b24'; g.fillRect(0, 0, c.width, c.height);
  g.font = '10px monospace'; g.fillStyle = '#c8c8e0';
  for (let i = 0; i < frames.length; i++) {
    const img = new Image(); img.src = frames[i].url; await img.decode();
    const x = pad + (i % cols) * (w + pad), y = pad + Math.floor(i / cols) * (h + pad + lab);
    g.drawImage(img, x, y, w, h); g.fillText('#' + i + '  t ' + frames[i].t, x, y + h + 10);
  }
  return c.toDataURL('image/png');
}, [frames, cols, scale]);
writeFileSync(out, Buffer.from(sheet.split(',')[1], 'base64'));
console.log('wrote', out, frames.length, 'frames', errors.length ? '\nerrors:\n' + errors.join('\n') : '');
await browser.close();
process.exit(errors.length ? 1 : 0);
