import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import sharp from '../../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp/lib/index.js';
const targetFile='artifacts/transparent-magic-icons/targets.json';
const entries=existsSync(targetFile)?JSON.parse(readFileSync(targetFile,'utf8')):['artifacts/game-magic-icons/manifest.json','artifacts/sword2-placeholder-icons/manifest.json'].flatMap(p=>JSON.parse(readFileSync(p,'utf8')).entries.filter(e=>e.status==='generated'));
const tiles=[];
for (const [i,e] of entries.entries()) {
  const backup='.git/codex-artifact-backups/0909-transparent-magic-icons/'+e.path;
  const bytes=readFileSync(existsSync(backup)?backup:e.path);
  if(createHash('sha256').update(bytes).digest('hex')!==e.sha256)throw new Error('Original source changed: '+e.path);
  tiles.push({input:await sharp(bytes).resize(112,112,{fit:'contain',background:'#000'}).png().toBuffer(),left:(i%10)*120,top:Math.floor(i/10)*144});
  tiles.push({input:Buffer.from(`<svg width="120" height="26"><text x="3" y="18" fill="white" font-size="16">${i}</text></svg>`),left:(i%10)*120,top:Math.floor(i/10)*144+112});
}
await sharp({create:{width:1200,height:Math.ceil(entries.length/10)*144,channels:4,background:'#202020'}}).composite(tiles).png().toFile('artifacts/transparent-magic-icons/original-contact.png');
if(!existsSync(targetFile))writeFileSync(targetFile,JSON.stringify(entries.map((e,i)=>({index:i,path:e.path,name:e.name,sha256:e.sha256})),null,2)+'\n');
