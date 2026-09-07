{
  "pending": [
    "0908-magic-learning-dedup/commit-local"
  ],
  "timezone": "Asia/Singapore",
  "format": 1,
  "read": [
    ".branch-records/FORMAT.md"
  ],
  "active": [],
  "records": [
    ".branch-records/0908-magic-learning-dedup/state.json",
    ".branch-records/legacy-20260908.md"
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
    }
  ]
}
