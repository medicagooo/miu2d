// Decode original game resources without repainting or changing pixels.
import { readFileSync } from 'node:fs';
import * as wasm from '../../packages/engine-wasm/pkg/miu2d_engine_wasm.js';
import sharp from '../../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp/lib/index.js';
wasm.initSync({module: readFileSync('packages/engine-wasm/pkg/miu2d_engine_wasm_bg.wasm')});
for (const name of ['白虹贯日s', '大力金刚掌s', '寒霜掌s']) {
  const data = readFileSync(`artifacts/sword2-placeholder-icons/${name}.msf`);
  const h = wasm.parse_msf_header(data);
  if (!h) throw new Error('Invalid MSF: '+name);
  const pixels = new Uint8Array(h.canvas_width*h.canvas_height*4*h.frame_count);
  if (!wasm.decode_msf_frames(data,pixels)) throw new Error('Decode failed');
  await sharp(pixels.subarray(0,h.canvas_width*h.canvas_height*4),{raw:{width:h.canvas_width,height:h.canvas_height,channels:4}}).png().toFile(`artifacts/sword2-placeholder-icons/reference-${name}.png`);
  console.log(name,h.canvas_width,h.canvas_height);
}
