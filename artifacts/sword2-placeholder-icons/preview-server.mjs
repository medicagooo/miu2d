// Local review server restricted to this task's artifacts and public skill PNGs.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
const root=resolve(import.meta.dirname,'../..');
createServer(async(req,res)=>{
  try {
    const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=resolve(root,'.'+path);
    if(!file.startsWith(root+sep)||!['/artifacts/sword2-placeholder-icons/','/artifacts/game-magic-icons/','/packages/web/public/magic-icons/','/packages/web/public/npc-magic-icons/'].some(p=>path.startsWith(p))) {res.writeHead(404).end();return;}
    const body=await readFile(file);
    res.setHeader('Content-Type',file.endsWith('.png')?'image/png':file.endsWith('.html')?'text/html; charset=utf-8':'text/plain; charset=utf-8');
    res.end(body);
  }catch{res.writeHead(404).end();}
}).listen(8766,'127.0.0.1',()=>console.log('http://127.0.0.1:8766/artifacts/sword2-placeholder-icons/index.html'));
