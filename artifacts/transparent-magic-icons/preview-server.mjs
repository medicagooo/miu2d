import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
const root=resolve(import.meta.dirname,'../..');
createServer(async(req,res)=>{
  try {
    const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=resolve(root,'.'+path);
    if(!file.startsWith(root+sep)||!['/artifacts/transparent-magic-icons/','/packages/web/public/magic-icons/'].some(p=>path.startsWith(p))){res.writeHead(404).end();return;}
    const body=await readFile(file);
    res.setHeader('Content-Type',file.endsWith('.png')?'image/png':file.endsWith('.html')?'text/html; charset=utf-8':'text/plain; charset=utf-8');res.end(body);
  }catch{res.writeHead(404).end();}
}).listen(8767,'127.0.0.1',()=>console.log('http://127.0.0.1:8767/artifacts/transparent-magic-icons/index.html'));
