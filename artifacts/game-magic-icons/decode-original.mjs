// Lossless first-frame export using the project's own MSF decoder; no repainting.
import { readFileSync } from 'node:fs';
import * as wasm from '../../packages/engine-wasm/pkg/miu2d_engine_wasm.js';
import sharp from '../../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp/lib/index.js';
wasm.initSync({module: readFileSync('packages/engine-wasm/pkg/miu2d_engine_wasm_bg.wasm')});
const data = readFileSync('artifacts/game-magic-icons/mag007-推山填海s.msf');
const h = wasm.parse_msf_header(data);
if (!h) throw new Error('Invalid MSF');
const pixels = new Uint8Array(h.canvas_width * h.canvas_height * 4 * h.frame_count);
if (!wasm.decode_msf_frames(data, pixels)) throw new Error('Decode failed');
await sharp(pixels.subarray(0, h.canvas_width * h.canvas_height * 4), {raw:{width:h.canvas_width,height:h.canvas_height,channels:4}}).png().toFile('packages/web/public/magic-icons/demo/original-player-magic-推山填海.png');
console.log({width:h.canvas_width,height:h.canvas_height,frames:h.frame_count});
