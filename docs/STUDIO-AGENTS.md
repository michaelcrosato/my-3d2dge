# Studio agent contract

Use this guide to operate Animation and Asset Studio without reading the implementation. The tool supplies readable
animation, material, model, object, and level data. The human watches one live editor while an agent reads, changes,
and inspects that data through MCP or local HTTP. No LLM service or API key is bundled with the tool.

## Start and connect

Use Node.js 20 or later. In the repository:

```sh
npm install
npm run build
npx playwright install chromium
npm run asset:studio
```

Open `http://127.0.0.1:4173/asset-studio` for scenes or `http://127.0.0.1:4173/animation-studio` for poses. Keep the
server running. Chromium is needed for image capture; an installed executable can be supplied through `CHROMIUM_PATH`.
The editor and data operations work without capture. The static hosted page supports browser editing; the local server
provides the shared MCP, HTTP, and file interfaces.

Configure an MCP stdio client with:

```json
{
  "mcpServers": {
    "animation-studio": {
      "command": "node",
      "args": ["/absolute/path/to/my-3d2dge/tools/animation-mcp.mjs"]
    }
  }
}
```

Run the Node script directly so stdout contains only MCP JSON-RPC. For a different port, start the server with
`npm run asset:studio -- --port 4174` and add `"--url", "http://127.0.0.1:4174"` to the MCP arguments. Use a client
that accepts MCP image content if the agent should inspect rendered images.

## First calls and normal work

1. Call `studio_status`. It reports the editor URLs, shared revision, connected editor streams, invalid-file errors,
   and capture setup. `capture.ready` means Playwright and an executable were found; an actual capture verifies launch.
   `connectedEditors` counts live connections, not acknowledgements that a frame has been painted.
2. For motion, call `animation_get` with `includeSchema: true`. For scenes, call `scene_get`, then `asset_catalog`
   with `includeSchema: true`. The schemas contain the accepted fields, limits, and examples. Read them once, then
   omit `includeSchema` unless you need them again.
3. Inspect only the target clip or asset. Default replies include summaries and targeted data. `full: true` explicitly
   includes the complete shared project, including other animation keys.
4. Send one edit with the current `expectedRevision` and a new `requestId`. Group related changes into a batch. Add
   `capture` when a still or frame strip will help judge the change. The live editor receives the save before capture
   finishes. One batch creates one revision and one Undo step.
5. Read the receipt and inspect the PNG. Ask the human for direction at the prompt level, or continue with the next
   requested change. Use the returned revision for the next edit unless another edit has arrived. Use `animation_history`
   to undo or redo either animation or scene work.

For MCP 2025-06-18 and newer, JSON results are returned as structured content and readable JSON text. Older negotiated
versions receive the same JSON as text and download URLs without newer resource-link blocks. PNG data is separate image content, not a
base64 string embedded in the text. Image metadata includes the revision and exact sample times. Preview and capture
operations do not change saved keys, asset data, or Undo history.

## Tool inventory

| Tools | Purpose |
|---|---|
| `studio_status` | Check connection, project revision, file errors, and capture setup. |
| `studio_import` | Load a complete project or scene JSON export with revision protection and Undo. |
| `animation_catalog` | Search and page through existing source clips. |
| `animation_get` | Read one project clip, summaries, and optionally its schema or the full project. |
| `animation_create` | Create neutral or wave motion, or copy an existing library clip. |
| `animation_edit` | Apply one action or 1–100 ordered actions, with optional image capture. |
| `animation_preview`, `animation_capture` | Direct the human animation view, or inspect an isolated frame strip. |
| `animation_history` | Undo or redo one shared edit. |
| `animation_export` | Export a native animation set as JSON or JavaScript. |
| `asset_catalog` | Discover materials, model shapes, presets, examples, limits, and schemas. |
| `scene_get` | Read a scene summary or inspect one material, model, level, or object by ID. |
| `scene_edit` | Apply 1–100 asset actions as one transaction, with optional image capture. |
| `scene_preview`, `scene_capture` | Direct the human scene view or play mode, or inspect exact scene times. |
| `scene_export` | Export readable level JSON or a self-contained playable HTML page. |

## One call to create, pose, and inspect motion

Read `animation_get` first. Replace `123` below with its revision. Pass this object to `animation_edit`:

```json
{
  "expectedRevision": 123,
  "requestId": "greeting-001",
  "summary": "Create a two-second greeting and lift the right hand",
  "actions": [
    { "type": "create", "name": "Greeting", "duration": 2, "preset": "neutral" },
    { "type": "edit_key", "id": "Greeting", "time": 0.7, "values": { "armR": [10, 20, 100, 50, 0] } },
    { "type": "edit_key", "id": "Greeting", "time": 1.2, "values": { "armR": [20, 60, 90, 70, 0] } }
  ],
  "capture": { "id": "Greeting", "times": [0, 0.7, 1.2, 2], "view": "side", "cast": "both" }
}
```

Use exactly one of `action` or `actions`. Ordered actions can refer to a clip created earlier in the batch. Each action
uses the existing animation schema: create, import, add, select, replace, edit/delete key, transform, rename, delete,
or `assets`. An `assets` action can place an actor using a clip created earlier in the same batch. Undo or redo must be
the only action in its request. Invalid actions leave the saved project, file, and history unchanged.

Animation captures accept 1–8 times within the inspected clip's duration. Scene captures accept 1–8 times from 0 to
600 seconds and default to `[0]`. Use `iso`, `threequarter`, `topdown`, `brawler`, or `side`. For a scene image, specify
`selected: null` and `grid: false` to remove editing overlays. Captures use a separate page and keep the human's view,
camera, time, and playback in place. The browser process is reused between captures.

## Retry rules

`expectedRevision` protects against overwriting a newer edit. `requestId` identifies one intended operation. Use 1–128
letters, digits, dots, underscores, colons, or hyphens, starting with a letter or digit.

- **Lost response or timeout:** resend the same `requestId` and exactly the same arguments, including the original
  `expectedRevision`. A repeated in-progress request waits for the original result. A completed request returns its
  original receipt and image with `replayed: true`; it does not apply the edit again.
- **A replay after later edits:** `revision` is the original operation's revision. `currentRevision` reports the current
  project revision. Inspect current state before preparing the next edit; the old receipt is not a fresh snapshot.
- **Different arguments with the same ID:** the server returns `REQUEST_ID_CONFLICT`. Use the original payload to
  recover a result, or a new ID for a different intended edit.
- **`REVISION_CONFLICT`:** inspect the current target before deciding what is still needed. A previous request may
  already have succeeded. Do not blindly repeat a mirror, reverse, duplicate, or Undo using a newer revision.
- **`captureError`:** the edit was saved. Its `revision` is authoritative. Correct capture setup or use a separate
  capture call; do not issue a second edit to get an image.
- **`INVALID_PROJECT_FILE`:** repair the watched JSON file. The last valid project stays active and other saves are
  blocked until the file is valid, so an agent cannot discard an unfinished file edit.

Retry receipts last for the server session, within 64 completed results or 32 MiB; up to 32 identified requests can
be pending. Undo history holds 50 project states. After restart or receipt eviction,
an old revision is rejected; inspect the project before issuing a new request. Cancellation or a client timeout stops
waiting and does not roll back a save. Error replies include a code, message, and recovery guidance; relevant failures
also report a revision or zero-based action index.

## Export, transfer, and import

`scene_export` with `format: "html"` returns a small descriptor and a resource link by default. The descriptor contains
`downloadUrl`, `filename`, `mimeType`, `bytes`, `sha256`, `level`, and `revision`. Download that URL to obtain the whole
file without putting several megabytes into the agent's context. Its bytes stay fixed after later edits. Links are
available on the local server during the current session, until the cache evicts an old export (16 files or 64 MiB).
If a link returns `EXPORT_EXPIRED`, export again. A downloaded file remains usable after the server stops.

Scene JSON defaults to inline readable data; `inline: false` requests a link. `inline: true` explicitly requests the
complete HTML text. `animation_export` supports the same delivery choice for its JSON and JavaScript sets.

To continue a level in another session, export JSON and pass the result as `project` to `studio_import`, with a current
`expectedRevision` and a new `requestId`. It accepts the scene export wrapper or its inner project. Import replaces the
shared project and can be undone. For all levels and clips, read `scene_get` or `animation_get` with `full: true`, then
transfer the returned `project`. A single-level export intentionally contains only that level and its actor clips.

## HTTP and scope

The same local service supports `GET /api/status`, `GET /api/animation`, `POST /api/animation/edit`, `GET /api/scene`,
`POST /api/scene/edit`, and `PUT /api/project?compact=true`. Edit bodies use the same fields as their MCP equivalents.
Preview, capture, catalog, and export endpoints are listed in the [animation guide](ANIMATION-STUDIO.md) and
[asset guide](ASSET-STUDIO.md). Legacy `GET /api/state`, `POST /api/action`, and `PUT /api/project` keep full snapshot
replies for existing browser integrations. A direct file edit still replaces the complete project; it does not use
the HTTP revision or request-ID checks.

This tool is complete for native readable humanoid animation, procedural texture patterns, models made from boxes,
wedges and cylinders, placed models and animated actors, and tile levels. It includes inspection, creation, editing,
live preview, exact-time images, history, import, and export for that workflow. Arbitrary GLB/FBX/Blender meshes and
bitmap texture import are outside this format. Existing animation conversion tools are documented in
[MOCAP.md](MOCAP.md#pipeline). The tool does not select an LLM or run a prompt service; an MCP-capable agent operates it.

The bridge uses MCP stdio and the published [base protocol](https://modelcontextprotocol.io/specification/2025-11-25/basic)
and [tool result/error conventions](https://modelcontextprotocol.io/specification/2025-11-25/server/tools).
