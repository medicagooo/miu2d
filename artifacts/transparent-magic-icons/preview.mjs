// Review-only composites; never used as game assets.
import { readFileSync, existsSync } from 'node:fs';
import sharp from '../../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp/lib/index.js';
const entries=JSON.parse(readFileSync('artifacts/transparent-magic-icons/sample-report.json','utf8')).entries;
const overlays=[];
for(const [row,e] of entries.entries()){
  const backup='.git/codex-artifact-backups/0909-transparent-magic-icons/'+e.path;
  const paths=[existsSync(backup)?backup:e.path,...Array(3).fill(`artifacts/transparent-magic-icons/sample-${e.index}.png`)];
  for(const [col,path] of paths.entries()){
    const base=await sharp({create:{width:144,height:150,channels:4,background:['#000','#eee','#202c3a','#a8a8a8'][col]}}).png().toBuffer();
    const icon=await sharp(path).resize(130,130,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
    overlays.push({input:await sharp(base).composite([{input:icon,left:7,top:3}]).png().toBuffer(),left:col*150,top:row*156});
  }
  overlays.push({input:Buffer.from(`<svg width="40" height="22"><text x="4" y="17" fill="white" font-size="15">${e.index}</text></svg>`),left:0,top:row*156+130});
}
await sharp({create:{width:600,height:entries.length*156,channels:4,background:'#555'}}).composite(overlays).png().toFile('artifacts/transparent-magic-icons/sample-comparison.png');
