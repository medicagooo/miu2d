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
  - 2026-09-01：拟将本分支新增的 server runner workspace 产物修复，从 Windows 工作区 `D:\proj\miu2d` 快进同步至 Debian WSL 部署副本 `/home/medic/projects/miu2d`，用于重建并验证本地镜像；不推送远程。
  - 2026-09-01：拟将主机端口收敛到 `127.0.0.1` 并再次快进同步至 Debian WSL 部署副本 `/home/medic/projects/miu2d`；随后仅为本项目端口创建 WSL Hyper-V 入站规则，避免 mirrored networking 下的局域网暴露；不推送远程。
