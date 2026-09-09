# 三游戏玩家武功目录与NPC成长

首次需求及实施日：2026-09-09（Asia/Singapore）。任务请求见events.jsonl#plan-1、#execute-1。
本任务替代0909-player-level-repair中仅允许原API userType=player参与玩家成长的限制；保留其两项新设计及精确经验修复。

## 目录与边界决定

三个游戏统一用精确key排除通用武器/普通攻击，不按名称包含“攻击”作模糊删除。player/NPC分类保留，玩家学习目录只是一个派生视图。

- 新剑侠：原12条排除保留，新增magic-暗器2.ini、magic057_梅花镖.ini、magic058_袖箭.ini，共15条实际记录。袖箭/梅花镖的物品用途证据见../0909-player-level-repair/implementation.md及sources.json，物品使用与原配置保留。
- 月影：原9条排除保留，新增magic-暗器2.ini，共10条实际记录。
- 剑侠2：新增9条实际记录：player-magic-长剑.ini、magic-棍棒.ini、magic-长剑.ini、magic-火箭.ini、magic-拳脚.ini、magic-刀.ini、magic-冰弓箭.ini、magic-两格长枪.ini、magic-弓箭.ini。其8条NPC记录均属本批基础攻击，因此目前没有该游戏NPC成长候选；已有正常玩家等级表保持不变。
- 暗器2：两个游戏均为通用SingleMove、effect=0、manaCost=0、specialKind=None、无等级表、无goodsName；作为通用投掷攻击排除是本次明确的设计分类，不冒充原版官方分类。
- 保留柳叶飞刀（此前明确决定）。毒液/毒液2为扇形，毒烟为独立单发资源；月影NPC通天塔守卫2.ini的flyIni=magic-毒烟攻击.ini。没有物品关联证据，不按“毒”或“攻击”误删。角色署名、元素、花瓣、金针/金钱镖等独立形态保留。
- Relation.Ini继续排除，天魔解体剧情与player-levelup特效继续保持原状。

入口：packages/engine/src/data/player-magic-catalog.ts::canPlayerAddMagic / buildPlayerMagicCatalog → PlayerBase.addMagic、DebugManager.addAllMagics、GameDebugSection。排除只限制新学习，不自动删除旧存档条目，不破坏NPC施法或物品使用。

## 新设计的玩家成长

公开来源为https://miu2d.com/game/{sword1|demo|sword2}/api/data，2026-09-09读取；仅保存选取的公开武功字段，无数据库ID或账户数据。skill-audit.json逐条记录游戏、完整key、名称、原始数值、运动/特殊类型与选用曲线；测试夹具为同次读取的独立原始字段快照。

原NPC记录均没有levels。本次给新剑侠60条、月影25条新增明确的1—10级玩家表，共85条；不是恢复原版表。完整键清单在skill-audit.json，运行时对应packages/engine/src/player/magic/npc-player-growth-data.ts。相同名字不同键不合并。

每个key明确选择下面一种固定曲线，运行时不根据名称或运动类型自动推测新技能。所有1级保留原Effect、effectExt、耗蓝、速度和形态。此批原始manaCost均0，除两个游戏的NPC镇狱破天劲Effect=1000外，其他Effect均0；原Effect始终保留，通过effectExt加上固定成长值，保留新剑侠叠加/月影替代/Effect=0使用realAttack的伤害语义。

| 曲线 | 逐级附加效果（1—10） | 逐级新增耗蓝（1—10） | 累计经验（1—9；10级封顶0） |
|---|---|---|---|
| single 单发 | 0,20,40,65,90,120,155,195,240,300 | 0,4,7,10,14,19,25,32,40,50 | 300,1000,2200,4200,7200,12000,20000,32000,50000 |
| tracking 追踪 | 0,16,32,52,72,96,124,156,192,240 | 0,5,8,12,17,23,30,38,48,60 | 同single |
| area 范围/多段 | 0,12,24,39,54,72,93,117,144,180 | 0,6,10,15,21,28,36,46,58,72 | 300,2000,5000,12000,25000,40000,50000,70000,100000 |
| control 冰/毒/石化 | 0,8,16,26,36,48,62,78,96,120 | 0,8,14,21,30,41,54,69,86,105 | 600,2000,4400,8400,14400,24000,40000,64000,100000 |
| strongControl 原Effect=1000的镇狱破天劲 | 0,12,26,44,66,90,116,144,172,200 | 0,10,16,24,34,46,60,76,94,115 | 同control |

参照及权衡：两个游戏已有魂牵梦绕使用single经验曲线、10级耗蓝60；已有漫天花雨使用area经验曲线、10级耗蓝70。追踪收益折为单发80%，范围单弹60%，控制40%；有原1000效果的控制技能只加至1200，并提高后续耗蓝。control经验取魂牵梦绕2倍。这个预算保守提高伤害，不复制成熟技能的高额多重成长；新的耗蓝/效果是设计决策，尚无长期全剧情平衡反馈。

固定fixedEffectLevel=1，getMagicAtLevel保留currentLevel作为修炼等级，同时让effectLevel保持原1级。弹幕数量、控制持续时间及区域模式均不自动放大；未覆盖的原技能无此字段，原效果等级行为不变。后续想解锁新形态应逐项另作业务调整。

## 调用、兼容及后续作者优先

PlayerBase创建PlayerMagicInventory(true) → getConfiguredMagic从player及npc两桶查找原userType → repairPlayerMagicProgression按原分类分流 → applyNpcPlayerProgression对85个精确键应用覆盖。NPC/伙伴默认库存不启用，公共getMagic缓存不改写。

新增、批量读档、隐藏、快捷栏、修炼、活动/非活动变身及重载统一经过同一读取入口。已有等级、累计经验、冷却与隐藏状态保留，读档时重建配置。高等级旧存档不会被降级；不因排除项消失而自动删除。

有作者等级表则不覆盖；逐key的已审计伤害、消耗、速度、区域、持续时间和控制等源指纹改变，或增加物品/关联武功，则保留作者配置，等待重新核实。键不在表中不自动生成成长。后续作者只改文字/图片无需废弃成长设计。

UIBridge和ModernGameUIWrapper提供growthState，兼容旧UI接口的可选字段；getMagicGrowthState区分可修炼、已满级、无成长配置，避免空10级占位表被误认为满级。修炼面板的旧props入口也读取此状态，满级保留等级显示，不再写不可升级。

## 验证和交付边界

测试使用真实API转换器及缓存，每条候选独立覆盖：玩家学习1→10、累计经验封顶、攻击基线50/500/2000下伤害递增、1级基线不变、每级耗蓝递增、运动和控制字段固定、NPC/伙伴与共享源不变。另测所有存档位置、变身重载、作者修改优先、三游戏目录排除和满级文案状态。

没有写数据库或直接部署。按execute-1授权普通push main，Git关联Workers Builds自动执行后，需核对具体提交的Cloudflare检查及线上资源；构建成功本身不作为线上玩法实测通过的替代。审查/测试/构建最终结果见state.json与交付回复。
