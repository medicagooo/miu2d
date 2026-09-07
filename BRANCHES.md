{
  "pending": [
    "0908-remove-local-recovery/revert-recovery-1"
  ],
  "timezone": "Asia/Singapore",
  "format": 1,
  "read": [
    ".branch-records/FORMAT.md"
  ],
  "active": [
    "0908-remove-local-recovery"
  ],
  "records": [
    ".branch-records/0908-magic-learning-dedup/state.json",
    ".branch-records/legacy-20260908.md",
    ".branch-records/0908-modern-auto-sort/state.json",
    ".branch-records/0908-merge-upstream/state.json",
    ".branch-records/0908-remove-local-recovery/state.json"
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
      "businessChange": "拟撤销 b5b90f7/7c4fb51 的四个恢复文件，不再建立本地数据库；现有数据库、容器和备份清理另待准确目标确认",
      "status": "planned",
      "request": "0908-remove-local-recovery/request-remove-recovery",
      "evidence": ".branch-records/0908-remove-local-recovery/state.json",
      "supersedes": "legacy-local-recovery"
    }
  ]
}
