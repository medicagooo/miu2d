/**
 * AI-TRACE: User-approved deterministic black-matte removal, not artwork generation.
 * Consumes only the 89 audited generated files in targets.json; aliases are updated
 * by their shared physical path. Original/legacy assets are never processing targets.
 * Border-connected dark pixels become a soft matte; enclosed small dark details
 * stay opaque. RGB is unpremultiplied to avoid black fringes on light backgrounds.
 * --apply backs up immutable inputs under .git before replacing assets. Reruns always
 * read that backup and reject unexpected input changes, avoiding double unmatting.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import sharp from '../../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp/lib/index.js';

const root=resolve(import.meta.dirname,'../..');
const dir=resolve(root,'artifacts/transparent-magic-icons');
const targets=JSON.parse(readFileSync(resolve(dir,'targets.json'),'utf8'));
const apply=process.argv.includes('--apply');
const samples=[0,9,19,34,41,42,53,54,55,56,64,65,75,88];
const backup=resolve(root,'.git/codex-artifact-backups/0909-transparent-magic-icons');
const sha=b=>createHash('sha256').update(b).digest('hex');
const previous=existsSync(resolve(dir,'report.json'))?JSON.parse(readFileSync(resolve(dir,'report.json'),'utf8')).entries:[];

// Manually reviewed opaque shadow cores of the dark swordsman in 残阳如血.
// Coordinates refer to its original 1280px artwork, normalized at lookup time.
// These masks preserve existing RGB, including black clothing; they draw no pixels.
const swordsmanCores=[
  [[772,535],[805,554],[810,588],[797,620],[764,610],[758,577]],
  [[770,640],[815,616],[842,640],[838,683],[848,724],[866,753],[826,771],[805,757],[774,770],[762,743],[781,709]],
  [[685,646],[730,638],[783,640],[788,665],[745,674],[723,665],[695,668]],
  [[767,750],[795,778],[770,803],[740,833],[730,870],[733,903],[714,904],[710,864],[693,834],[700,797]],
  [[810,754],[850,759],[874,782],[895,823],[931,850],[945,875],[963,885],[965,901],[935,894],[914,860],[877,834],[854,817],[819,798]],
];
function inside(x,y,poly){let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const [xi,yi]=poly[i],[xj,yj]=poly[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)hit=!hit;
}return hit;}

export function removeBlack(data,width,height,index) {
  const count=width*height, max=new Uint8Array(count), outside=new Uint8Array(count), queue=new Int32Array(count);
  for(let p=0;p<count;p++)max[p]=Math.max(data[p*4],data[p*4+1],data[p*4+2]);
  const threshold=160;
  let tail=0,head=0;
  const add=p=>{if(!outside[p]&&max[p]<threshold){outside[p]=1;queue[tail++]=p;}};
  for(let x=0;x<width;x++){add(x);add((height-1)*width+x);}
  for(let y=0;y<height;y++){add(y*width);add(y*width+width-1);}
  const spread=p=>{const x=p%width;if(x>0)add(p-1);if(x<width-1)add(p+1);if(p>=width)add(p-width);if(p<count-width)add(p+width);};
  while(head<tail)spread(queue[head++]);
  // Large dark cavities inside luminous rings/bows are also background; keep small
  // enclosed shadows/details opaque. Components are examined without RGB mutation.
  const seen=new Uint8Array(outside);
  for(let p=0;p<count;p++){
    if(seen[p]||max[p]>=threshold)continue;
    let n=1,k=0;queue[0]=p;seen[p]=1;let deep=0;
    while(k<n){const q=queue[k++];if(max[q]<=32)deep++;const x=q%width;
      for(const v of [x>0?q-1:-1,x<width-1?q+1:-1,q>=width?q-width:-1,q<count-width?q+width:-1]){
        if(v>=0&&!seen[v]&&max[v]<threshold){seen[v]=1;queue[n++]=v;}
      }
    }
    if(n>count*0.001&&deep>n*0.1)for(let i=0;i<n;i++)outside[queue[i]]=1;
  }
  const output=Buffer.from(data);let transparent=0,partial=0,opaque=0,changed=0,error=0;
  for(let p=0;p<count;p++){
    const i=p*4;
    if(outside[p]){
      // The archer's hair/clothes are opaque material, not an emission effect.
      // Its audited material region ends before the luminous projectiles. A lower
      // matte ceiling retains these dark RGB values instead of whitening the body.
      const x=(p%width)/width,y=Math.floor(p/width)/height;
      const material=index===34&&x<0.50&&y>0.30&&y<0.79;
      const neutralMaterial=(index===0||index===56)&&max[p]-Math.min(data[i],data[i+1],data[i+2])<max[p]*0.35;
      const shadow=index===42&&swordsmanCores.some(poly=>inside(x*1280,y*1280,poly));
      const ceiling=material||neutralMaterial?32:threshold;
      const a=shadow?1:max[p]<=5?0:Math.min(1,max[p]/ceiling);
      output[i+3]=Math.round(data[i+3]*a);
      for(let c=0;c<3;c++)output[i+c]=a?Math.min(255,Math.round(data[i+c]/a)):0;
    }
    const a=output[i+3];if(a===0)transparent++;else if(a===255)opaque++;else partial++;
    for(let c=0;c<3;c++){error+=Math.abs(Math.round(output[i+c]*a/255)-Math.round(data[i+c]*data[i+3]/255));}
    if(a!==data[i+3])changed++;
  }
  return {output,stats:{transparent,partial,opaque,changed,blackCompositeMeanError:error/(count*3)}};
}

const report=[];
for(const t of targets){
  if(!apply&&!samples.includes(t.index))continue;
  const original=resolve(backup,t.path);
  if(apply&&!existsSync(original)){
    const input=readFileSync(resolve(root,t.path));
    if(sha(input)!==t.sha256)throw new Error('Source hash mismatch: '+t.path);
    mkdirSync(dirname(original),{recursive:true});writeFileSync(original,input);
  }
  const input=readFileSync(existsSync(original)?original:resolve(root,t.path));
  if(sha(input)!==t.sha256)throw new Error('Backup/source hash mismatch: '+t.path);
  const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const {output,stats}=removeBlack(data,info.width,info.height,t.index);
  if(stats.transparent===0||stats.partial===0||stats.opaque===0)throw new Error('Invalid alpha coverage '+t.path);
  const encoded=await sharp(output,{raw:{width:info.width,height:info.height,channels:4}}).png().toBuffer();
  const path=apply?resolve(root,t.path):resolve(dir,`sample-${t.index}.png`);
  let unchanged=false;
  if(apply){
    const live=sha(readFileSync(path));
    const prior=previous.find(e=>e.path===t.path)?.sha256;
    if(![t.sha256,sha(encoded),prior].includes(live))throw new Error('Refusing to overwrite unrelated asset change: '+t.path);
    unchanged=live===sha(encoded);
  }
  if(!unchanged)writeFileSync(path,encoded);
  report.push({...t,originalSha256:t.sha256,sha256:sha(encoded),width:info.width,height:info.height,...stats});
}
writeFileSync(resolve(dir,apply?'report.json':'sample-report.json'),JSON.stringify({algorithm:'connected-black-matte-v1',threshold:160,noiseCutoff:5,entries:report},null,2)+'\n');
console.log({processed:report.length,apply,meanError:Math.max(...report.map(e=>e.blackCompositeMeanError))});
