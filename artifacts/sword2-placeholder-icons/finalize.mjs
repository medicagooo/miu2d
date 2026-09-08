// Build a static review page and hash manifest; artwork pixels are unchanged.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const dir = 'artifacts/sword2-placeholder-icons/';
const manifest = JSON.parse(readFileSync(dir+'manifest.json','utf8'));
const prompts = JSON.parse(readFileSync(dir+'prompts.json','utf8')).prompts;
const ids = JSON.parse(readFileSync(dir+'generation-ids.json','utf8'));
manifest.style = '以原始30×38白虹贯日、大力金刚掌、寒霜掌为参考，黑底简洁发光像素符号。首批写实插画弃用。';
manifest.publication = '本地实现；未推送、未部署';
manifest.references = ['白虹贯日s','大力金刚掌s','寒霜掌s'].map(name=>({name,url:`https://miu2d.com/game/sword2/resources/asf/magic/${name}.msf`,png:`reference-${name}.png`,width:30,height:38}));
for (const [i,e] of manifest.entries.entries()) {
  e.path = `packages/web/public/magic-icons/sword2/${e.key.replace(/\.ini$/,'.png')}`;
  e.concept = prompts[i].concept;
  e.generationId = ids.find(r=>r.idx===i).generationId;
  e.status = 'generated';
  const png=readFileSync(e.path);
  e.sha256 = createHash('sha256').update(png).digest('hex');
  e.width=png.readUInt32BE(16); e.height=png.readUInt32BE(20);
}
writeFileSync(dir+'manifest.json',JSON.stringify(manifest,null,2)+'\n');
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const cards=manifest.entries.map(e=>`<article data-search="${esc(e.name+' '+e.key)}"><a href="../../${e.path}" target="_blank"><img class="large" src="../../${e.path}" alt="${e.name}"></a><div><h3>${e.name}</h3><p>${e.concept}</p><small>${e.key} · ${e.userType}</small><div class="mini"><img src="reference-白虹贯日s.png" alt="旧占位图"><span>→</span><img src="../../${e.path}" alt="${e.name}小尺寸"></div></div></article>`).join('\n');
writeFileSync(dir+'index.html',`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>剑侠情缘2 · 原作风格武功图标</title><style>*{box-sizing:border-box}body{margin:0;background:#101114;color:#e9e4d8;font:14px/1.6 "Microsoft YaHei",sans-serif;padding:28px}main{max-width:1300px;margin:auto}h1{font-size:28px}p{color:#b6b6b6}.refs{display:flex;gap:24px}.refs img{width:60px;height:76px;image-rendering:pixelated;background:#000}.controls{position:sticky;top:0;background:#101114;padding:16px 0;z-index:1}input{background:#222;color:#fff;padding:8px;border:1px solid #777}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:12px}article{background:#1b1b20;padding:12px;display:flex;gap:14px;border:1px solid #38373a}article[hidden]{display:none}.large{width:84px;height:106px;object-fit:contain;background:#000}h3{margin:0;font-size:17px}article p{font-size:12px;margin:6px 0}small{font-size:10px;overflow-wrap:anywhere}.mini{display:flex;align-items:center;gap:10px;margin-top:8px}.mini img{width:30px;height:38px;object-fit:contain;background:#000}a{color:#e9d29b}</style><main><h1>剑侠情缘2 · 原作风格武功图标</h1><p>24 项独立重绘：16 个玩家配置、8 个 NPC 配置。以原始 30×38 技能图标直接参考，保留黑底、发光轮廓和像素质感；首批写实稿弃用。下方每项同时展示放大图与 30×38 旧图→新图。真正的白虹贯日及已有专属图保留。未推送、未部署。</p><div class="refs">${manifest.references.map(r=>`<figure><img src="${r.png}" alt="原始${r.name}"><figcaption>原始${r.name.slice(0,-1)}</figcaption></figure>`).join('')}</div><div class="controls"><input aria-label="搜索武功" id="search" placeholder="搜索名称或配置键"> <span id="count">24 项</span></div><section>${cards}</section><p><a href="../game-magic-icons/index.html">此前三个游戏缺图清单</a> · <a href="manifest.json">资产依据</a> · <a href="prompts.json">生成提示词</a></p></main><script>const q=document.querySelector('#search'),cards=[...document.querySelectorAll('article')];q.addEventListener('input',()=>{let n=0;for(const c of cards){c.hidden=!c.dataset.search.toLowerCase().includes(q.value.trim().toLowerCase());if(!c.hidden)n++}document.querySelector('#count').textContent=n+' 项'});</script></html>`);
writeFileSync(dir+'README.md','# 剑侠情缘2占位图重绘\n\n24项独立PNG（16玩家、8 NPC），内置imagegen生成。直接参考原始30×38发光像素图；首批写实稿未采用。仅替换sword2指定技能键的白虹贯日s.msf/asf/mpc占位图，保留真正白虹贯日、其他专属图及其他游戏。未修改战斗数据或数据库。未推送、未部署。\n\n[index.html](index.html) 提供原图对照、小尺寸预览及搜索；[manifest.json](manifest.json) 保留源API字段、SHA256及资产路径；[prompts.json](prompts.json) 保留全部提示词和直接风格参考。\n\n| 武功 | 配置键 | 资产 |\n|---|---|---|\n'+manifest.entries.map(e=>`| ${e.name} | ${e.key} | [PNG](../../${e.path}) |`).join('\n')+'\n');
console.log({entries:manifest.entries.length,unique:new Set(manifest.entries.map(e=>e.sha256)).size});
