{
  "pending": [
    "0908-workers-game-tabs/merge-main-header-1",
    "0908-workers-game-tabs/push-main-header-1",
    "0909-transparent-magic-icons/push-main-1",
    "0909-npc-shape-growth/push-main-1",
    "0909-player-growth-functions/push-main-1",
    "0912-game-debug-tools/push-main-1"
  ],
  "timezone": "Asia/Singapore",
  "format": 1,
  "read": [
    ".branch-records/FORMAT.md"
  ],
  "active": [
    "0908-remove-local-recovery",
    "0908-integrate-local-commits",
    "0908-workers-game-tabs",
    "0909-player-level-repair",
    "0909-npc-player-growth",
    "0909-npc-shape-growth",
    "0909-player-growth-functions"
  ],
  "records": [
    ".branch-records/0908-magic-learning-dedup/state.json",
    ".branch-records/legacy-20260908.md",
    ".branch-records/0908-modern-auto-sort/state.json",
    ".branch-records/0908-merge-upstream/state.json",
    ".branch-records/0908-remove-local-recovery/state.json",
    ".branch-records/0908-integrate-local-commits/state.json",
    ".branch-records/0908-missing-magic-icons/state.json",
    ".branch-records/0908-sword2-placeholder-icons/state.json",
    ".branch-records/0908-workers-game-tabs/state.json",
    ".branch-records/0909-transparent-magic-icons/state.json",
    ".branch-records/0909-landing-hero-only/state.json",
    ".branch-records/0909-player-magic-policy/state.json",
    ".branch-records/0909-player-level-repair/state.json",
    ".branch-records/0909-npc-player-growth/state.json",
    ".branch-records/0909-npc-shape-growth/state.json",
    ".branch-records/0909-player-growth-functions/state.json",
    ".branch-records/0912-game-debug-tools/state.json"
  ],
  "changes": [
    {
      "id": "legacy-docker",
      "businessChange": "拟修复 PostgreSQL、MinIO/S3 与 Docker 服务编排；原记录标记未合并，实施状态待证实",
      "status": "unknown",
      "evidence": ".branch-records/legacy-20260908.md#0901-fix-docker-wsl-deploy",
      "date": "2026-09-01"
    },
    {
      "id": "legacy-scene-painter",
      "businessChange": "场景编辑器拟支持空白 MMF、三层 MSF 绘制、撤销重做与持久化；原记录有合并声明及计划操作，实际里程碑未核实",
      "status": "unknown",
      "evidence": ".branch-records/legacy-20260908.md#0901-new-scene-painter",
      "date": "2026-09-01"
    },
    {
      "date": "2026-09-08",
      "businessChange": "三个游戏共用学习入口原仅面板查重；修复为所有持有位置重复学习均保留原武功，不重置、不新增，已有存档不去重",
      "status": "complete",
      "request": "0908-magic-learning-dedup/request-implement",
      "evidence": ".branch-records/0908-magic-learning-dedup/state.json",
      "id": "0908-magic-learning-dedup",
      "implementedAt": "2026-09-08"
    },
    {
      "businessChange": "三个游戏现代背包与武功面板新增自动整理：物品按药品/装备/任务/其他及单价升序，武功按升10级经验升序；稳定重排实际面板槽位并保留条目状态，独立容器不变",
      "status": "complete",
      "date": "2026-09-08",
      "evidence": ".branch-records/0908-modern-auto-sort/state.json",
      "request": "0908-modern-auto-sort/request-implement",
      "id": "0908-modern-auto-sort",
      "implementedAt": "2026-09-08"
    },
    {
      "id": "0908-merge-upstream",
      "date": "2026-09-08",
      "businessChange": "同步上游9月6日缓存/截图版本/S3同源签名/武侠品牌与地区提示，保留当时本地改动及Docker兼容入口；2026-09-08 经 PR #1 合入 main 7a7c479。恢复工具后续撤销见 0908-remove-local-recovery",
      "status": "complete",
      "request": "0908-merge-upstream/request-handle",
      "evidence": ".branch-records/0908-merge-upstream/state.json",
      "implementedAt": "2026-09-08",
      "mainIntegratedAt": "2026-09-08"
    },
    {
      "id": "legacy-local-recovery",
      "date": "2026-09-02",
      "businessChange": "增加公开运行快照采集、资源路径映射及本地数据库恢复脚本，覆盖 sword1/sword2/demo 的初始场景；不等同于完整游戏数据恢复",
      "status": "superseded",
      "implementedAt": "2026-09-02",
      "evidence": ".branch-records/0908-remove-local-recovery/state.json",
      "supersededBy": "0908-remove-local-recovery"
    },
    {
      "id": "0908-remove-local-recovery",
      "date": "2026-09-08",
      "businessChange": "撤销 b5b90f7/7c4fb51 的四个不完整恢复脚本/文档，AGENTS.md 明确不再创建或重建本地数据库；保留其他玩法与编辑器。现有数据清理未执行：项目 .data 不存在，Docker 不可用",
      "status": "complete",
      "request": "0908-remove-local-recovery/request-remove-recovery",
      "evidence": ".branch-records/0908-remove-local-recovery/state.json",
      "supersedes": "legacy-local-recovery",
      "implementedAt": "2026-09-08"
    },
    {
      "id": "0908-integrate-local-commits",
      "date": "2026-09-08",
      "businessChange": "合入旧分支：34项NPC武功缺省图标与描述；玩家/调试目录纳入有效NPC武功、去重并排除Relation.Ini，原API归属不变；秘籍按使用效果分类。Docker配置修复端口/依赖/S3参数，保留main缓存/地区规则；不启动或重建本地数据库",
      "status": "integrated",
      "request": "0908-integrate-local-commits/request-push",
      "evidence": ".branch-records/0908-integrate-local-commits/state.json",
      "implementedAt": "2026-09-08",
      "mainIntegratedAt": "2026-09-08"
    },
    {
      "id": "0908-missing-magic-icons",
      "date": "2026-09-08",
      "businessChange": "三个游戏94个缺图配置已补齐：新绘65张；新剑侠的29项同名武功复用月影27张新绘、推山填海原图、已有弓箭备用图（原始资源404）；原图优先，数值说明归属不变",
      "status": "implemented_local",
      "request": [
        "0908-missing-magic-icons/request-generate",
        "0908-missing-magic-icons/request-reuse-demo"
      ],
      "evidence": ".branch-records/0908-missing-magic-icons/state.json",
      "domain": "武功图标/游戏与后台",
      "implementedAt": "2026-09-08T13:53:08.7505198+08:00"
    },
    {
      "status": "implemented_local",
      "evidence": [
        ".branch-records/0908-sword2-placeholder-icons/state.json"
      ],
      "request": [
        "0908-sword2-placeholder-icons/request-1",
        "0908-sword2-placeholder-icons/request-style"
      ],
      "date": "2026-09-08",
      "businessChange": "剑侠2的24项错误复用白虹贯日图标改为独立发光像素图（16玩家、8 NPC），直接参考原始30×38图标。游戏及后台按游戏+技能键+占位资源精确替换，真正白虹贯日、专属图、旧调用与其他游戏保留；战斗数据不变。",
      "id": "0908-sword2-placeholder-icons",
      "domain": "武功图标/剑侠情缘2",
      "implementedAt": "2026-09-08T15:03:55.4127752+08:00"
    },
    {
      "id": "0908-workers-game-tabs",
      "date": "2026-09-08",
      "domain": "首页/Workers运行时",
      "businessChange": "官网首屏改为新剑侠/月影/剑侠2三个Tab，悬停/键盘/触摸动态切换真实首页背景，独立按钮进入对应游戏；Workers同源提供页面/API/S3代理，通过Hyperdrive复用线上PostgreSQL，保留Node入口、旧密码与会话契约。代码已验证，云配置和部署待授权。",
      "status": "implemented_unmerged",
      "request": "0908-workers-game-tabs/request-1",
      "evidence": ".branch-records\\0908-workers-game-tabs/state.json",
      "implementedAt": "2026-09-08T16:04:08.3502793+08:00"
    },
    {
      "evidence": ".branch-records/0908-workers-game-tabs/state.json",
      "businessChange": "当前Workers发布从直连原站数据库改为托管前端及代理demo/sword1/sword2公开API与资源；不部署账户管理后台，不创建数据库，保留可选完整后端；公开模式提供同游戏JSON文件存档导出/导入，图标与PWA manifest改走公开logo接口",
      "date": "2026-09-08",
      "status": "implemented_unmerged",
      "id": "0908-public-game-proxy",
      "request": ".branch-records/0908-workers-game-tabs/events.jsonl#request-public-proxy"
    },
    {
      "request": ".branch-records/0908-workers-game-tabs/events.jsonl#request-hide-header",
      "date": "2026-09-08",
      "id": "0908-hide-landing-header",
      "status": "implemented_unmerged",
      "evidence": "packages/web/src/pages/landing/LandingPage.tsx",
      "businessChange": "首页移除Logo、Features/Demo、游戏快捷链接与主题语言等整条顶部导航；保留主视觉三游戏切换和进入按钮"
    },
    {
      "evidence": ".branch-records/0909-transparent-magic-icons/state.json",
      "date": "2026-09-09",
      "request": "0909-transparent-magic-icons/request-1",
      "domain": "武功图标/三个游戏",
      "businessChange": "89张已采用生成武功图由黑底转透明（此前65+剑侠2后续24），27个同文件复用项同步。保留光晕、像素轮廓和必要暗部；原始/旧备用图、尺寸、路径、技能数据及映射不变。",
      "status": "implemented_local",
      "id": "0909-transparent-magic-icons",
      "implementedAt": "2026-09-09T01:53:05.3486764+08:00",
      "relatedChanges": [
        "0908-missing-magic-icons",
        "0908-sword2-placeholder-icons"
      ]
    },
    {
      "id": "0909-landing-hero-only",
      "date": "2026-09-09",
      "businessChange": "官网首页由游戏展示及多个宣传板块、页脚精简为仅Hero游戏展示与选择区域；保留三个游戏切换和进入游戏入口。",
      "status": "implemented",
      "request": ".branch-records/0909-landing-hero-only/events.jsonl#request-1",
      "evidence": ".branch-records/0909-landing-hero-only/state.json",
      "implementationDate": "2026-09-09"
    },
    {
      "id": "0909-player-magic-policy",
      "date": "2026-09-09",
      "businessChange": "按游戏限定玩家新增武功：新剑侠/月影移除指定基础攻击入口并拒绝新增，保留NPC和已有存档。其余单级武功10级补全仅方案，未实施。",
      "status": "implemented",
      "request": ".branch-records/0909-player-magic-policy/events.jsonl#request-1",
      "evidence": ".branch-records/0909-player-magic-policy/state.json",
      "implementationDate": "2026-09-09"
    },
    {
      "id": "0909-player-level-repair",
      "date": "2026-09-09",
      "businessChange": "仅新剑侠/月影玩家运行时修复：掌上生雷和天外飞仙由空表改为新设计10级成长；5种武功共6条游戏记录纠正累计经验倒退/重复。天魔解体及两种物品暗器保留原样，NPC/伙伴/剑侠2不变；保留已有等级、经验与冷却，作者后改配置优先。",
      "status": "implemented",
      "request": ".branch-records/0909-player-level-repair/events.jsonl#execute-1",
      "evidence": ".branch-records/0909-player-level-repair/state.json",
      "implementationDate": "2026-09-09"
    },
    {
      "id": "0909-npc-player-growth",
      "date": "2026-09-09",
      "businessChange": "三游戏玩家学习排除基础攻击/物品暗器共15/10/9条（新剑侠/月影/剑侠2）；新剑侠60条、月影25条原NPC武功新增玩家专用1—10级成长，保留NPC原行为、存档及1级弹幕/控制强度；界面区分可修炼、满级、无成长配置。",
      "status": "implemented",
      "request": ".branch-records/0909-npc-player-growth/events.jsonl#execute-1",
      "evidence": ".branch-records/0909-npc-player-growth/state.json",
      "implementationDate": "2026-09-09"
    },
    {
      "id": "0909-npc-shape-growth",
      "date": "2026-09-09",
      "businessChange": "85条NPC玩家武功改为1/4/7/10四档形态成长：区域扩大、扇墙增至9、单发追踪增至4连发、圆环螺旋等时扩散1.6倍。15条控制维持单次原时长，新增伤害按最终倍率折算、耗蓝按当前倍率平方根增长。替代原固定1级形态；NPC/伙伴/存档及基础攻击排除保留。",
      "status": "implemented",
      "request": ".branch-records/0909-npc-shape-growth/events.jsonl#execute-1",
      "evidence": ".branch-records/0909-npc-shape-growth/state.json",
      "implementationDate": "2026-09-09"
    },
    {
      "businessChange": "三个游戏玩家从逐级表改为六套连续成长公式，上限1000；保留1级，原80/60级基础属性105%。后台共享公式只读预览；存档保留等级、本级经验与永久加成；玩家/伙伴进度隔离，伙伴和旧接口保留原规则。1000级停止角色经验，武功经验继续。",
      "id": "0909-player-growth-functions",
      "evidence": ".branch-records/0909-player-growth-functions/state.json",
      "status": "implemented",
      "date": "2026-09-09",
      "request": ".branch-records/0909-player-growth-functions/events.jsonl#execute-1",
      "implementationDate": "2026-09-09"
    },
    {
      "id": "0912-game-debug-tools",
      "date": "2026-09-12",
      "businessChange": "默认及分享标题改Swords of Legends，具体游戏名/水印保留；物体页按全场景快照串行交互，停止仅取消后续项，切图/失效跳过或停止；NPC添加扩展到当前游戏配置库，按名称/标识搜索并支持批量生成，资源/旧接口兼容。已实现并本地验证，远端发布待核验。",
      "status": "complete",
      "request": "0912-game-debug-tools/request-execute",
      "evidence": ".branch-records/0912-game-debug-tools/state.json",
      "implementedAt": "2026-09-12"
    }
  ]
}
