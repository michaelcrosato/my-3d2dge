# Emberdeep Visual Workshop

Inspect the real character rigs and game gallery. Compare changes. Export images and notes for review.

## Start

From the repository root, run:

```sh
node tools/visual-workshop.mjs --open
```

Open `http://127.0.0.1:4173` if the browser does not open. Press Ctrl+C in the terminal to stop the server.

The tool uses the existing `examples/emberdeep.html`. No new package is required. To use changed game source, first run `npm install` and `npm run build`.

To build a single offline file:

```sh
node tools/visual-workshop.mjs --build
```

Open `examples/visual-workshop.html` in a current browser. It includes the game and the tool. Keep this file with each important review. It is not added to Git automatically.

Use `--port 4174` to change the local port. Use `--game /path/to/emberdeep.html` to inspect another compatible build.

## Review a change

1. Select Codex or Wanderer. Select a pose. Press Play. Use the game gallery for actual skills, monsters and bosses.
2. Pause at the required frame. Use the arrow buttons or timeline to move. The backward control resets and replays the scene.
3. Press **Keep as A**. Change a colour, body size or supported motion setting. A and B use the same action, camera, random seed and frame.
4. Click the paused image to add a point marker. Enter a note. Press **Add note to frame**.
5. Press **Export review**. Attach the ZIP to the chat. Start with `overview.png` and `notes.md` when reviewing it.

**Open review** accepts the exported ZIP or its `review.json`. It requires the exact game fingerprint. It does not silently apply an old review to different game code.

The ZIP contains a labelled overview, annotated PNG frames, readable notes, settings and a replay recipe. Each frame keeps its own settings. The source SHA-256 identifies the exact game bytes. A Git commit is also recorded when available.

## What version 1 includes

- Both actual character rigs, the existing pose catalogue and all four game camera views.
- The actual game gallery: skills, monsters, bosses and poses.
- Pause, fixed-step playback, backward replay and 2/4/8/12-second loops.
- A synchronized A/B comparison, five colour controls per hero, body size, Codex charge and pose motion settings.
- Point notes, individual frame capture, an eight-frame strip, PNG export and portable review ZIPs.
- An optional local draft under `ed:visual-workshop:v1`.

These are preview changes. They do not edit game code, combat timing or progression. An approved review is the specification for a separate source change.

## Isolation and limits

The tool uses an opaque-origin iframe with `sandbox="allow-scripts"`. Do not add `allow-same-origin`. The sandbox has memory-only storage, no network access, no gamepad input and a fixed clock. Normal save slots remain separate. Load only game files you trust.

The adapter makes checked changes to an in-memory copy of the built HTML. It exposes the existing gallery functions and selected Codex constants. The source file is not changed. A changed source layout causes an explicit adapter error instead of a partial preview.

Character mode uses the real rig on a neutral stage. It does not reproduce all combat animation transitions. Use the game gallery to inspect skills and effects together. Gallery charge is held at the selected inspection value. The gallery also uses its existing rank/rune demonstration sequence.

GPU lighting, audio, damage numbers and screen shake are off. The 1x inset is a rig-size reference, not a complete game viewport. The tool does not yet edit environment textures, animation curves, individual joints, or source files. It has no automatic connection to a chat service.

A and B store settings from the same game build; they are not different Git revisions. Fixed-step replay targets the same build and browser. Pixel identity across browsers or platforms is not guaranteed. Gallery frame zero is the first rendered tick after setup.

A review can contain 32 frames and 100 notes. Export before starting another review. A browser can refuse or exhaust local draft storage; export the ZIP to keep the work.

## Tests

```sh
npm install
npx playwright install chromium
npm run build
node tools/ed-workshop-test.mjs
```

The integration test uses the actual standalone game. It checks both heroes, backward replay, four views, A/B changes, note safety, capture, ZIP import/export, gallery groups, save isolation and the phone layout. Outputs go to `check-output/visual-workshop/`.

The Visual Workshop GitHub Actions workflow runs these checks and uploads the report, screenshots, sample review and offline Workshop page. Check the workflow result before treating the integration as verified.

## Files

`tools/visual-workshop.mjs` builds and serves the offline page. `tools/visual-workshop/bridge.js` owns the game adapter and sandbox. `app.js` owns the interface and review format. `index.html` and `style.css` define the layout.
