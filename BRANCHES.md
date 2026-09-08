{
  "pending": [
    "0908-sword2-placeholder-icons/push-main-1",
    "0908-workers-game-tabs/create-branch-1"
  ],
  "timezone": "Asia/Singapore",
  "format": 1,
  "read": [
    ".branch-records/FORMAT.md"
  ],
  "active": [
    "0908-remove-local-recovery",
    "0908-integrate-local-commits",
    "0908-workers-game-tabs"
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
    ".branch-records\\0908-workers-game-tabs/state.json"
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
      "businessChange": "计划将官网首屏改为新剑侠/月影/剑侠2悬停全屏首页截图Tab，前后端适配Workers，沿用线上PostgreSQL/S3和原Node入口",
      "status": "planned",
      "request": "0908-workers-game-tabs/request-1",
      "evidence": ".branch-records\\0908-workers-game-tabs/state.json"
    }
  ]
}
