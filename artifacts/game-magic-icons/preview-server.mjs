// Local-only review of this directory and the selected public image files.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
const root = resolve(import.meta.dirname, '../..');
createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const allowed = path.startsWith('/artifacts/game-magic-icons/') || path.startsWith('/packages/web/public/magic-icons/') || path.startsWith('/packages/web/public/npc-magic-icons/');
    const file = resolve(root, '.' + path);
    if (!allowed || !file.startsWith(root + sep)) {res.writeHead(404).end(); return;}
    const body = await readFile(file);
    res.setHeader('Content-Type', file.endsWith('.png') ? 'image/png' : file.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8');
    res.end(body);
  } catch {res.writeHead(404).end();}
}).listen(8765, '127.0.0.1', () => console.log('http://127.0.0.1:8765/artifacts/game-magic-icons/index.html'));
