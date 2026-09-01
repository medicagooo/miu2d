# Branch Registry

## 0901-fix-docker-wsl-deploy

- 分支名称：`0901-fix-docker-wsl-deploy`
- worktree 路径：`D:\proj\miu2d`
- 目的：修复 Docker Compose 的 PostgreSQL、MinIO/S3 与服务启动编排，并在 Debian WSL2 中完成本地部署验证。
- 当前需求：只读验证现有远程 S3 可用性；修复本地 Docker 配置；安装 Debian WSL2；在不写入远程 S3 的前提下部署并验证本地服务。
- 需求变更记录：
  - 2026-09-01：初始需求登记；远程 S3 仅允许只读验证，本地部署使用本地 PostgreSQL 与 MinIO。
- 是否已合并到 main：否
- 操作记录：
  - 2026-09-01：拟从本地 `main`（`9a87940c3649e8b2989a2e139af9eaa3db58cc76`）创建分支 `0901-fix-docker-wsl-deploy`，在当前工作区 `D:\proj\miu2d` 实施 Docker/WSL 本地部署修复；不创建远程分支、不推送。

## 0901-new-scene-painter

- 分支名称：`0901-new-scene-painter`
- worktree 路径：`C:\Users\medic\.codex\worktrees\6e96\miu2d`
- 目的：扩展 Dashboard 场景编辑器，使其能够创建空白 MMF 场景、绘制三层 MSF 瓦片，并可靠保存地图数据。
- 当前需求：实现地图修改持久化、新建空白场景、L1/L2/L3 瓦片画笔/橡皮/吸管、撤销重做；完成一次用户选定类型的 review，修复有效发现，验证后正常推送到远程 `main`。
- 需求变更记录：
  - 2026-09-01：初始需求登记；基于现有 Dashboard、MapViewer、MMF DTO 与服务端序列化链路增量实现，不另建编辑器或地图格式。
- 是否已合并到 main：否
- 操作记录：
  - 2026-09-01：拟从本地 `main`（`a96345f38179f5e83873eb83c91b7fa145286e86`）创建分支 `0901-new-scene-painter`，使用现有 worktree `C:\Users\medic\.codex\worktrees\6e96\miu2d` 实现场景绘制方案；暂不创建远程分支，最终经 review、修复与完整验证后再预登记并正常推送到远程 `main`。
