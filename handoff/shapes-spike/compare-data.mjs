// SPIKE (throwaway; see HANDOFF.md). Writes the data of the temporary Shapes comparison lab (src/shapes-compare.data.js):
// twelve models from two CC0 kits, ranked from the best case to the worst, each converted to boxes (the prototype
// encoding, half-unit cells) with its numbers: source triangles, boxes, text size, and the planned hybrid encoder's lines.
// Usage: node handoff/shapes-spike/compare-data.mjs <Kenney "Models/GLTF format" folder> <KayKit "Models/gltf" folder> <out.js>
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readGlb } from './glb.mjs';
import { boxes } from './boxes.mjs';
import { hybridCount } from './hybrid.mjs';

const [kenney, kaykit, out] = process.argv.slice(2);
if (!out) { console.error('Usage: node compare-data.mjs <kenney glb folder> <kaykit glb folder> <out.js>'); process.exit(2); }
const K = n => join(kenney, n + '.glb'), D = n => join(kaykit, n + '.gltf.glb');
// rank, file, title, kit, our prop to compare (or null), verdict, what works, what is off, what would fix it
const LIST = [
  [D('crate'), 'Crate', 'KayKit Dungeon', 'crate', 'great',
    'Every view shows a real crate: its lid from above, its framed sides from the side, and it turns with the camera.',
    'Cost, not looks: the framed edges are many small pieces (183 boxes; even the planned encoder needs about 170 lines).',
    'A line budget per shape: below a pixel the frame bars can merge into the panels.'],
  [K('bedSingle'), 'Bed', 'Kenney Furniture', null, 'great',
    'Something our flat props cannot do at all: a long object that faces any direction, seen from above as a bed.',
    'Real-world size: it is low next to the hero, and Kenney\'s colors are pastel.',
    'A per-game draw scale (our props are drawn bigger than life on purpose) and a palette remap.'],
  [K('bookcaseOpen'), 'Bookcase', 'Kenney Furniture', null, 'good',
    'Boxes stacked on boxes: the shelves read in every view, and it turns with the camera.',
    'Small at real size, so from straight above it is a pale lump; Kenney\'s wood is pastel next to our dungeon colors.',
    'The draw scale, the readability tilt in steep views, and the kit\'s colors remapped to the game\'s palette.'],
  [K('loungeSofa'), 'Sofa', 'Kenney Furniture', null, 'good',
    'Reads as a sofa from every side and turns cleanly.',
    'The cushions\' soft rounding becomes slight steps.',
    'The planned encoder fits rounded parts as smooth turned or extruded shapes.'],
  [D('chest_common'), 'Open chest', 'KayKit Dungeon', 'chest', 'good',
    'An open chest heaped with coins and gems that reads in every view and can face any way (the kit\'s lid is a separate model).',
    'The coins become a speckle of boxes, and the chest costs 357 boxes.',
    'The planned encoder (about 58 lines) and a line budget for the loot on top.'],
  [D('barrel'), 'Barrel', 'KayKit Dungeon', 'barrel', 'good',
    'Looks right in every view: seen from above it is a round lid, not a picture of a barrel\'s side.',
    'Cost: round things are the boxes\' weak spot (761 boxes), and the outline steps slightly.',
    'The planned encoder draws it as one turned shape (a profile spun round its axis): about 4 lines.'],
  [D('potA'), 'Pot', 'KayKit Dungeon', 'pot', 'okay',
    'Recognizable in every view.',
    'Small and round: at game size the steps are a big share of the outline, and its speckled glaze turns to noise.',
    'A turned shape, as for the barrel, with the glaze dropped below a pixel.'],
  [K('chair'), 'Chair', 'Kenney Furniture', null, 'weak',
    'Correct shape, and it faces any way, which matters for chairs around a table.',
    'Chairs are small in real life, so at game size it is a few pixels, and from straight above only its seat shows.',
    'The per-game draw scale, and the readability tilt for steep views that characters already get.'],
  [K('pottedPlant'), 'Potted plant', 'Kenney Furniture', null, 'weak',
    'The pot is fine.',
    'Leaves are thin and organic: at game size they merge into a blob.',
    'Our hand-drawn plants (the tree, bush and flower props) stay better for foliage.'],
  [D('torch'), 'Torch', 'KayKit Dungeon', 'torch', 'poor',
    'The bracket and stick are right.',
    'Its flame is a still, grey lump that reads as a mace: ours animates its fire and lights the room.',
    'Keep our props for anything that glows or moves; shapes are for still objects.'],
  [D('chest_rare_mimic'), 'Mimic chest', 'KayKit Dungeon', 'chest', 'poor',
    'It is still clearly a chest with a row of teeth.',
    'Ornate detail (teeth, studs, trim) costs 651 boxes and turns to white noise at game size.',
    'A line budget per shape, with coarser cells or a simplified version when it is exceeded.'],
  [D('wall_window'), 'Wall with a window', 'KayKit Dungeon', null, 'worst',
    'It does look like the wall.',
    'Big structures with surface detail (bricks) explode into thousands of boxes, and our engine already draws walls natively.',
    'Out of scope for v1: walls and floors map onto the engine\'s own wall and floor materials instead.']
];
const data = [];
for (const [file, title, kit, ours, verdict, works, off, fix] of LIST) {
  const { tris } = readGlb(file), b = boxes(file, .5), h = hybridCount(file);
  const text = JSON.stringify(b.boxes);
  data.push({ title, kit, ours, verdict, works, off, fix, tris: tris.length, boxes: b.boxes.length, kb: +(text.length / 1024).toFixed(1), lines: h.lines, mats: b.mats, b: b.boxes });
  console.log(title.padEnd(20), String(tris.length).padStart(5), 'triangles ->', String(b.boxes.length).padStart(5), 'boxes;', String(h.lines).padStart(4), 'lines planned');
}
const head = `/* The temporary Shapes comparison lab's data (examples/shapes-compare.html): twelve models from two CC0 kits, Kenney's
 * Furniture Kit (kenney.nl) and KayKit's Dungeon Pack 1.0 (Kay Lousberg, kaylousberg.com), both CC0 1.0 (public domain).
 * Converted with the prototype box encoding (half-unit cells) by handoff/shapes-spike/compare-data.mjs. A box is
 * [material, x0, y0, z0, x1, y1, z1] in game units (16 = one tile = 1 m; x east, y south, z up). Delete with the lab. */
`;
writeFileSync(out, head + 'window.SHAPES_COMPARE = [\n' + data.map(d => JSON.stringify(d)).join(',\n') + '\n];\n');
console.log('wrote', out, (head.length + JSON.stringify(data).length) / 1024 | 0, 'KB');
