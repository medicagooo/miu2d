$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
Set-Location -LiteralPath $root
$manifest = Get-Content -LiteralPath "$PSScriptRoot/manifest.json" -Raw | ConvertFrom-Json -AsHashtable
$sources = if (Test-Path -LiteralPath "$PSScriptRoot/generated-sources.json") { Get-Content -LiteralPath "$PSScriptRoot/generated-sources.json" -Raw | ConvertFrom-Json } else { @() }
$reuse = Get-Content -LiteralPath "$PSScriptRoot/reuse.json" -Raw | ConvertFrom-Json
$prompts = (Get-Content -LiteralPath "$PSScriptRoot/prompts.json" -Raw | ConvertFrom-Json).prompts
for ($i=0; $i -lt $manifest.entries.Count; $i++) {
  $entry = $manifest.entries[$i]
  $alias = $reuse | Where-Object idx -EQ $i
  if ($alias) {
    $entry.path = $alias.path
    $entry.status = if ($alias.name -eq '弓箭') {'reused-legacy-fallback'} elseif ($alias.sourceIcon) {'reused-original'} else {'reused-generated'}
    $entry.reusedFrom = "demo/$($alias.sourceKey)"
    $entry.concept = if ($alias.name -eq '弓箭') {'原始MPC资源404，复用已有月影弓箭备用图。'} elseif ($alias.sourceIcon) {'直接提取月影传说原图第一帧，无重绘。'} else {($prompts | Where-Object { $_.slug -eq 'demo' -and $_.key -eq $alias.sourceKey }).concept}
  } else {
    $source = $sources | Where-Object idx -EQ $i
    if ($source) {
      [System.IO.Directory]::CreateDirectory((Split-Path -Parent (Join-Path $root $entry.path))) | Out-Null
      Copy-Item -LiteralPath $source.path -Destination $entry.path
      $entry.status = 'generated'
      $entry.generationId = [System.IO.Path]::GetFileName($source.path)
    }
    $entry.concept = ($prompts | Where-Object idx -EQ $i).concept
  }
  if (Test-Path -LiteralPath $entry.path) { $entry.sha256 = (Get-FileHash -LiteralPath $entry.path -Algorithm SHA256).Hash.ToLowerInvariant() }
}
$manifest | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath "$PSScriptRoot/manifest.json" -Encoding utf8
$labels = @{demo='月影传说';sword1='新剑侠情缘';sword2='剑侠情缘2'}
$statusLabels = @{generated='本次补绘';'reused-generated'='复用月影补绘';'reused-original'='复用月影原图';'reused-legacy-fallback'='复用月影备用图';pending='待生成'}
$cards = foreach ($e in $manifest.entries) {
  $name = [System.Net.WebUtility]::HtmlEncode($e.name)
  $key = [System.Net.WebUtility]::HtmlEncode($e.key)
  $concept = [System.Net.WebUtility]::HtmlEncode($e.concept)
  $src = '../../' + $e.path
  "<article data-game='$($e.slug)' data-search='$name $key'><a href='$src' target='_blank'><img src='$src' alt='$name'></a><div><h3>$name</h3><span>$($labels[$e.slug]) · $($statusLabels[$e.status])</span><p>$concept</p><small>$key</small></div></article>"
}
$html = @'
<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>三个游戏 · 武功补图清单</title>
<style>*{box-sizing:border-box}body{margin:0;padding:32px;background:#121518;color:#e6e1d6;font:15px/1.6 "Microsoft YaHei",sans-serif}main{max-width:1400px;margin:auto}h1{font-size:30px;margin:0}header p{color:#b9b8b0;max-width:1050px}.controls{display:flex;gap:12px;flex-wrap:wrap;position:sticky;top:0;background:#121518;padding:16px 0;z-index:1}input,select{padding:9px;color:#eee;background:#242a2d;border:1px solid #55605c;border-radius:6px}#grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:12px}article{display:flex;align-items:center;gap:15px;border:1px solid #353c3c;border-radius:8px;padding:14px;background:#191e20}article[hidden]{display:none}img{width:88px;height:88px;object-fit:contain;background:repeating-conic-gradient(#bbb 0% 25%,#eee 0% 50%) 0/12px 12px}h3{margin:0;font-size:17px}span{font-size:12px;color:#b1ba96}p{margin:6px 0;font-size:13px}small{font-size:10px;color:#9daba8;overflow-wrap:anywhere}#count{padding:8px;color:#c9c19d}</style>
<main><header><h1>三个游戏 · 武功补图清单</h1><p>覆盖 94 个原始 icon 为空的武功配置：月影传说 28、新剑侠情缘 65、剑侠情缘2 1。共新绘 65 张；新剑侠情缘有 29 项复用月影图标（27 张本次补绘、1 张推山填海原图、1 张已有弓箭备用图）。点击图片查看原尺寸。</p><p>保留各游戏风格：月影以发光能量与细粒子为主；新剑侠以高对比像素轮廓、剑气与五行意象为主；剑侠2采用发光像素兵器。构图是依名称与效果作的美术解释，不改变战斗机制。原有非空图标优先。生成图黑底已转透明；本次透明化修改未推送、未部署。</p></header><div class="controls"><label>游戏 <select id="game"><option value="">全部</option><option value="demo">月影传说</option><option value="sword1">新剑侠情缘</option><option value="sword2">剑侠情缘2</option></select></label><input id="search" placeholder="搜索武功名称或配置键" aria-label="搜索武功"><span id="count"></span></div><section id="grid">
__CARDS__
</section></main><script>const cards=[...document.querySelectorAll('article')],game=document.querySelector('#game'),search=document.querySelector('#search');function filter(){let n=0;for(const c of cards){c.hidden=!!((game.value&&c.dataset.game!==game.value)||!c.dataset.search.toLowerCase().includes(search.value.trim().toLowerCase()));if(!c.hidden)n++}document.querySelector('#count').textContent=n+' 项'}game.addEventListener('change',filter);search.addEventListener('input',filter);filter();</script></html>
'@
$html.Replace('__CARDS__', ($cards -join "`n")) | Set-Content -LiteralPath "$PSScriptRoot/index.html" -Encoding utf8
$md = @('# 武功补图清单', '', '来源：2026-09-08 公开游戏接口，范围为原始 icon 为空的 94 个配置。65 张新绘、29 项复用（27 新绘 + 1 原图 + 1 既有备用图）。', '', '新剑侠情缘同名复用月影传说，同名多配置优先相同 key。弓箭原始资源 404，因此复用已有备用图；推山填海保留原始 30×40 第一帧。数值、说明、归属和原有非空 icon 不变。未推送、未部署。', '', '本目录 index.html 可浏览、搜索和放大图片。透明化记录见 ../transparent-magic-icons/README.md。manifest.json 含数据依据、资产路径、复用来源和 SHA256；prompts.json 保留生成设计及未采用提示词。', '')
foreach ($slug in @('demo','sword1','sword2')) {
  $md += "## $($labels[$slug])"
  $md += @('', '| 武功 | 配置键 | 图标来源 | 预览 |', '|---|---|---|---|')
  foreach ($e in $manifest.entries | Where-Object slug -EQ $slug) { $md += "| $($e.name) | $($e.key) | $($statusLabels[$e.status]) | [PNG](../../$($e.path)) |" }
  $md += ''
}
($md -join "`n").TrimEnd() | Set-Content -LiteralPath "$PSScriptRoot/README.md" -Encoding utf8
Write-Output ($manifest.entries | Group-Object status | Select-Object Name,Count | ConvertTo-Json -Compress)
