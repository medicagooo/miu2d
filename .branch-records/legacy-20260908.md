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
- 当前需求：实现地图修改持久化、新建空白场景、L1/L2/L3 瓦片画笔/橡皮/吸管、撤销重做；修复 Docker 后完成本地迁移、seed 与浏览器可用性测试；完成一次 Bugbot review、修复有效发现，验证后正常推送到远程 `main`。
- 需求变更记录：
  - 2026-09-01：初始需求登记；基于现有 Dashboard、MapViewer、MMF DTO 与服务端序列化链路增量实现，不另建编辑器或地图格式。
  - 2026-09-01：追加本地部署验收；Docker 不可用时先修复 Docker，并在用户确认后执行本地数据库迁移和 seed，review 类型锁定为 Bugbot。
- 是否已合并到 main：是（拟通过 `--ff-only` 将下述登记提交随功能分支一并快进至本地 `main`）
- 操作记录：
  - 2026-09-01：拟从本地 `main`（`a96345f38179f5e83873eb83c91b7fa145286e86`）创建分支 `0901-new-scene-painter`，使用现有 worktree `C:\Users\medic\.codex\worktrees\6e96\miu2d` 实现场景绘制方案；暂不创建远程分支，最终经 review、修复与完整验证后再预登记并正常推送到远程 `main`。
  - 2026-09-01：拟在 `C:\Users\medic\.codex\worktrees\6e96\miu2d` 将本地 `main` 从 `a96345f38179f5e83873eb83c91b7fa145286e86` 以 `git merge --ff-only 0901-new-scene-painter` 快进到包含本登记提交的功能分支 tip；原因是功能、唯一一次 Bugbot 修复与风险相称验证均已完成，目标为本地 `main`。
  - 2026-09-01：拟将快进后的本地 `main` 通过普通 `git push origin main` 推送到 `git@github.com:medicagooo/miu2d.git` 的 `refs/heads/main`，不跳过仓库自动 CI；推送后将以本地 `HEAD`、`origin/main`、`git ls-remote` 与 GitHub API 四方 SHA 一致作为成功证据。
