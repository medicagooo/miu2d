import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import sharp from '../../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp/lib/index.js';
const dir='artifacts/transparent-magic-icons/';
const report=JSON.parse(readFileSync(dir+'report.json','utf8'));
assert.equal(report.entries.length,89);
assert.equal(new Set(report.entries.map(e=>e.path)).size,89);
const hash=b=>createHash('sha256').update(b).digest('hex');
let brightUnchanged=0,protectedArcher=0,aliasCount=0;
const tiles=[];
for(const [i,e] of report.entries.entries()){
  const old=readFileSync('.git/codex-artifact-backups/0909-transparent-magic-icons/'+e.path);
  const png=readFileSync(e.path);
  assert.equal(hash(old),e.originalSha256);assert.equal(hash(png),e.sha256);
  const {data,info}=await sharp(png).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const original=await sharp(old).ensureAlpha().raw().toBuffer();
  assert.equal(info.width,e.width);assert.equal(info.height,e.height);
  let zero=0,soft=0,solid=0,maxError=0;
  for(let p=0;p<data.length;p+=4){
    const a=data[p+3]; if(a===0)zero++;else if(a===255)solid++;else soft++;
    const max=Math.max(original[p],original[p+1],original[p+2]);
    if(max>=160){assert.deepEqual(data.subarray(p,p+4),original.subarray(p,p+4));brightUnchanged++;}
    const x=((p/4)%e.width)/e.width,y=Math.floor(p/4/e.width)/e.height;
    if(e.index===34&&x<.50&&y>.30&&y<.79&&max>=32){assert.deepEqual(data.subarray(p,p+4),original.subarray(p,p+4));protectedArcher++;}
    for(let c=0;c<3;c++)maxError=Math.max(maxError,Math.abs(Math.round(data[p+c]*a/255)-Math.round(original[p+c]*original[p+3]/255)));
  }
  assert.ok(zero>0&&soft>0&&solid>0);assert.ok(maxError<=5,'Black composite changed: '+e.path);
  const icon=await sharp(png).resize(112,112,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
  const tile=await sharp({create:{width:112,height:112,channels:4,background:'#eeeeee'}}).composite([{input:icon}]).png().toBuffer();
  tiles.push({input:tile,left:(i%10)*120,top:Math.floor(i/10)*144});
  tiles.push({input:Buffer.from(`<svg width="120" height="26"><text x="3" y="18" fill="white" font-size="16">${e.index}</text></svg>`),left:(i%10)*120,top:Math.floor(i/10)*144+112});
}
for(const path of ['artifacts/game-magic-icons/manifest.json','artifacts/sword2-placeholder-icons/manifest.json']){
  const m=JSON.parse(readFileSync(path,'utf8'));
  for(const e of m.entries){
    assert.equal(hash(readFileSync(e.path)),e.sha256);
    if(e.status==='reused-generated'){assert.equal(e.transparency.status,'black-matte-removed');aliasCount++;}
    if(e.status==='reused-original'||e.status==='reused-legacy-fallback')assert.equal(e.transparency,undefined);
  }
}
assert.equal(aliasCount,27);
await sharp({create:{width:1200,height:Math.ceil(report.entries.length/10)*144,channels:4,background:'#202020'}}).composite(tiles).png().toFile(dir+'transparent-contact.png');
const result={files:89,updatedAliases:aliasCount,brightPixelsUnchanged:brightUnchanged,protectedArcherPixelsUnchanged:protectedArcher,maxAllowedBlackCompositeChannelError:5,originalAndFallbackManifests:'unchanged hashes',result:'pass'};
writeFileSync(dir+'verification.json',JSON.stringify(result,null,2)+'\n');console.log(result);
