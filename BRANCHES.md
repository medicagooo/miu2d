# Branch Registry

## 0901-fix-docker-wsl-deploy

- 分支名称：`0901-fix-docker-wsl-deploy`
- worktree 路径：`D:\proj\miu2d`
- 目的：修复 Docker Compose 的 PostgreSQL、MinIO/S3 与服务启动编排，并在 Debian WSL2 中完成本地部署验证。
- 当前需求：只读使用现有远程公开游戏 API/S3 资源；修复本地 Docker 配置；在 Debian WSL2 部署本地服务，并确保 `demo`、`sword1`、`sword2` 可从 Windows 浏览器进入；根据 `demo` 的 NPC 武功效果制作同画风图标资产与键名清单；不得写入远程 S3。
- 需求变更记录：
  - 2026-09-01：初始需求登记；远程 S3 仅允许只读验证，本地部署使用本地 PostgreSQL 与 MinIO。
  - 2026-09-01：浏览器验收发现本地 `games` 表为空导致 `GAME_NOT_AVAILABLE`；改为仅在 WSL 部署中同源代理三款公开演示的远程 API/资源，本地账号、存档、数据库与 MinIO 保持本地。
  - 2026-09-01：新增 NPC 武功图标制作需求；按远程公开 `demo` 数据中的 35 条 NPC 武功记录及其具体效果生成独立图标，保留同名不同配置的独立资产，完成后列出全部成果；`Relation.Ini` 作为异常配置单独标记。
- 是否已合并到 main：否
- 操作记录：
  - 2026-09-01：拟从本地 `main`（`9a87940c3649e8b2989a2e139af9eaa3db58cc76`）创建分支 `0901-fix-docker-wsl-deploy`，在当前工作区 `D:\proj\miu2d` 实施 Docker/WSL 本地部署修复；不创建远程分支、不推送。
  - 2026-09-01：拟将 34 枚 NPC 武功 PNG、效果映射、生成规格与可复现处理脚本提交到当前本地分支 `0901-fix-docker-wsl-deploy`；来源为只读公开 `demo` 数据与内置图像生成结果，不接入运行时、不上传 S3、不推送远程。
  - 2026-09-01：拟将本分支新增的 server runner workspace 产物修复，从 Windows 工作区 `D:\proj\miu2d` 快进同步至 Debian WSL 部署副本 `/home/medic/projects/miu2d`，用于重建并验证本地镜像；不推送远程。
  - 2026-09-01：拟将主机端口收敛到 `127.0.0.1` 并再次快进同步至 Debian WSL 部署副本 `/home/medic/projects/miu2d`；随后仅为本项目端口创建 WSL Hyper-V 入站规则，避免 mirrored networking 下的局域网暴露；不推送远程。
  - 2026-09-01：拟新增原生 WSL systemd Web socket 转发，将 Windows `127.0.0.1:8080` 转发至容器回环端口 18080，并快进同步至 `/home/medic/projects/miu2d` 后安装验证；保留数据库、后端与 MinIO 的回环隔离，不推送远程。
  - 2026-09-01：拟新增 WSL 专用远程演示 Nginx 路由，提交后快进同步至 `/home/medic/projects/miu2d`，重建 Web 镜像并验证 `/game/sword1`；只读代理公开 API/资源，不传递浏览器凭据、不写入远程服务、不推送远程。
