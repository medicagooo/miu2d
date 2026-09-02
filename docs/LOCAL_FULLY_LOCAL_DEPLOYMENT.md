# Miu2D 完全本地运行与 sword1 恢复

本文记录 2026-09-02 已验证可用的 Windows PowerShell 恢复流程。目标运行链路为：

```text
浏览器 127.0.0.1:5274
  -> Vite 本地代理
  -> Miu2D server 127.0.0.1:14100
  -> PostgreSQL 127.0.0.1:15533（游戏与文件元数据）
  -> MinIO 127.0.0.1:19100 / bucket miu2d（UUID 对象内容）
```

## 为什么只恢复 bucket 不够

MinIO/S3 中的对象名是 UUID `storage_key`，例如：

```text
games/004913e4-54e5-4932-8844-56b4e3eccf11/f414fa9c-99b9-4005-bf46-fa735aee0573
```

游戏请求使用的是 `asf/character/npc001_st.msf` 之类的原始路径。两者之间的目录、文件名和 `storage_key` 对应关系保存在 PostgreSQL `files` 表；场景 MMF、脚本、陷阱、NPC/OBJ 列表保存在 `scenes` 表。因此：

- UUID 是应用生成的存储键，不是 S3 自动把原文件名改成 UUID。
- 重命名 bucket 对象为 `.MMF/.MSF` 原名会使现有 `storage_key` 失效。
- 恢复 S3 对象但没有恢复 PostgreSQL 元数据，会出现“游戏不存在”或“对象存在但资源 404”。
- 最可靠的备份必须同时包含 PostgreSQL 元数据和保持原 key 不变的 S3 对象。

## 当前本机状态

- Docker 容器：`miu2d-postgres`、`miu2d-minio`，均已通过 health check。
- bucket：`miu2d`。
- `sword1` game id：`004913e4-54e5-4932-8844-56b4e3eccf11`。
- 本地对象：6,102 个，与 raw S3 备份数量一致。
- 本地 PostgreSQL：`sword1` 已开放；125 条武功、231 件物品、45 个商店、361 个 NPC、375 个 NPC 资源、161 个物件、160 个物件资源、4 个玩家、120 个头像、5,838 条对话、3 套等级配置。
- 初始场景：`map001_衡山`，27 个地图 MSF 图块；已映射 90 个初始流程资源，数据库中为 90 个文件节点和 20 个目录节点。
- 已验证流程：首页 -> `sword1` 标题 -> 44 秒本地片头（可跳过）-> 衡山场景 -> 独孤剑、UI、物件和环境音加载。

当前没有找到原生产 PostgreSQL dump。现有恢复是“公开运行时数据 + 初始场景 + 初始流程实际资源”的可重复重建，不等同于生产数据库的完整副本。虽然 6,102 个 `sword1` 对象都在本地 MinIO，但尚未还原其全部原始路径，也只恢复了一个场景。要让后续全部地图和文件都可寻址，仍需取得对应 PostgreSQL 元数据备份；不要把当前 90 条映射误报成完整文件树。

## 1. 启动本地 PostgreSQL 和 MinIO

仓库根目录创建忽略提交的 `.data/local-compose.override.yml`：

```yaml
services:
  db:
    ports: !override
      - "15533:5432"
  minio:
    ports: !override
      - "19100:9000"
      - "19101:9001"
```

执行：

```powershell
docker compose -f docker-compose.yml -f .data/local-compose.override.yml up -d db minio
if ($LASTEXITCODE -ne 0) { throw "Docker services failed to start" }
docker ps --filter "name=miu2d-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
if ($LASTEXITCODE -ne 0) { throw "Docker status check failed" }
```

若 Docker 不健康，先查看 `docker ps -a` 和 `docker logs miu2d-postgres` / `docker logs miu2d-minio`，修复端口占用或数据目录问题，再进行任何导入。不要删除 `.data/postgres` 或 `.data/minio` 来“重试”。

## 2. 将 raw S3 备份写入本地 bucket

以下命令只同步 `games/`，不恢复已经决定删除的 `saves/`：

```powershell
$env:AWS_ACCESS_KEY_ID = "minio"
$env:AWS_SECRET_ACCESS_KEY = "minio123"
$env:AWS_DEFAULT_REGION = "us-east-1"

aws --endpoint-url http://127.0.0.1:19100 s3api head-bucket --bucket miu2d 2>$null
if ($LASTEXITCODE -ne 0) {
  aws --endpoint-url http://127.0.0.1:19100 s3api create-bucket --bucket miu2d
  if ($LASTEXITCODE -ne 0) { throw "Cannot create local bucket miu2d" }
}

aws --endpoint-url http://127.0.0.1:19100 s3 sync `
  .data\s3-backups\miu2d-20260902-001912\games `
  s3://miu2d/games --only-show-errors
if ($LASTEXITCODE -ne 0) { throw "S3 backup restore failed" }
```

匿名访问只开放对象读取。创建 `.data/minio-read-policy.json`：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "AWS": ["*"] },
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::miu2d/*"]
    }
  ]
}
```

应用策略：

```powershell
aws --endpoint-url http://127.0.0.1:19100 s3api put-bucket-policy `
  --bucket miu2d --policy file://.data/minio-read-policy.json
if ($LASTEXITCODE -ne 0) { throw "Bucket read policy failed" }
```

本机 MinIO 已验证会为 `http://127.0.0.1:5274` 返回正确 CORS 头。MinIO 对本次 `PutBucketCors` S3 API 返回 `NotImplemented`，不要把这个不受支持的调用作为恢复步骤反复执行。

## 3. 配置本地环境变量

`packages/server/.env` 至少包含：

```dotenv
DATABASE_URL=postgresql://postgres:postgres@localhost:15533/miu2d_db
PORT=14100
S3_ENDPOINT=http://localhost:19100
S3_PUBLIC_ENDPOINT=http://127.0.0.1:19100
APP_URL=http://localhost:5274
```

MinIO 用户、密码和 bucket 未显式配置时使用 `docker-compose.yml` 与 `packages/server/src/env.ts` 中一致的本地默认值。

`packages/web/.env.local`：

```dotenv
BACKEND_URL=http://127.0.0.1:14100
S3_URL=http://127.0.0.1:19100
VITE_S3_BASE_URL=http://127.0.0.1:19100/miu2d
VITE_DEMO_RESOURCES_DOMAIN=
```

`VITE_DEMO_RESOURCES_DOMAIN` 必须为空；否则游戏资源会重新指向远端演示服务器。修改环境文件后必须重启 server 和 Vite。

## 4. 迁移、seed 与恢复 sword1 元数据

本仓库若因 pnpm 的 dependency build policy 在启动前退出，可直接使用仓库已经安装的 Node 入口。不要修改依赖版本来绕过该问题。

```powershell
Push-Location packages/server
$databaseLine = Get-Content -LiteralPath ".env" |
  Where-Object { $_ -like "DATABASE_URL=*" } |
  Select-Object -First 1
if (-not $databaseLine) { throw "DATABASE_URL is missing" }
$env:DATABASE_URL = $databaseLine.Substring("DATABASE_URL=".Length)

node node_modules/prisma/build/index.js generate --schema prisma/schema.prisma
if ($LASTEXITCODE -ne 0) { throw "Prisma generate failed" }
node node_modules/prisma/build/index.js migrate deploy --schema prisma/schema.prisma
if ($LASTEXITCODE -ne 0) { throw "Prisma migrate failed" }
node node_modules/tsx/dist/cli.mjs --tsconfig tsconfig.dev.json src/seed.ts
if ($LASTEXITCODE -ne 0) { throw "Seed failed" }
Pop-Location
```

当原 PostgreSQL dump 不可用时，可用已保存的公开快照重建最小运行时元数据。`capture-local-resource-map.ts` 只做生产 HEAD 读取和本地 MD5 比对；不写生产数据库或生产 S3：

```powershell
node packages/server/node_modules/tsx/dist/cli.mjs `
  packages/server/scripts/capture-local-resource-map.ts `
  --source-base "https://miu2d.williamchan.me:10443" `
  --slug sword1 `
  --game-id 004913e4-54e5-4932-8844-56b4e3eccf11 `
  --backup-dir ".data/s3-backups/miu2d-20260902-001912/games/004913e4-54e5-4932-8844-56b4e3eccf11" `
  --manifest ".data/local-snapshots/sword1-20260902/map001_衡山.manifest.json" `
  --extras ".data/local-snapshots/sword1-20260902/extra-resource-paths.json" `
  --output ".data/local-snapshots/sword1-20260902/resource-map.json"
if ($LASTEXITCODE -ne 0) { throw "Resource mapping capture failed" }
```

写入本地 PostgreSQL。脚本按单行幂等 upsert 执行，不删除其他游戏；中断后可安全重跑：

```powershell
$databaseLine = Get-Content -LiteralPath "packages/server/.env" |
  Where-Object { $_ -like "DATABASE_URL=*" } |
  Select-Object -First 1
$env:DATABASE_URL = $databaseLine.Substring("DATABASE_URL=".Length)

node packages/server/node_modules/tsx/dist/cli.mjs `
  packages/server/scripts/restore-local-runtime-snapshot.ts `
  --snapshot ".data/local-snapshots/sword1-20260902" `
  --slug sword1 `
  --game-id 004913e4-54e5-4932-8844-56b4e3eccf11
if ($LASTEXITCODE -ne 0) { throw "Local PostgreSQL restore failed" }
```

若以后取得生产 PostgreSQL dump，应优先恢复对应 game id 的权威元数据，尤其是 `games`、`game_configs`、`files`、`scenes` 及各运行时配置表；先导入隔离数据库并核对，再替换当前快照重建方案，避免把生产用户、存档或无关游戏覆盖到本地。

## 5. 启动项目

后端 PowerShell：

```powershell
Set-Location packages/server
node node_modules/tsx/dist/cli.mjs watch --tsconfig tsconfig.dev.json src/main.ts
```

前端 PowerShell：

```powershell
Set-Location packages/web
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5274
```

访问 `http://127.0.0.1:5274/game/sword1`。

## 6. 验证与防复发检查

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:14100/game/sword1/api/config"
Invoke-RestMethod -Uri "http://127.0.0.1:14100/game/sword1/api/data"
Invoke-RestMethod -Uri "http://127.0.0.1:14100/game/sword1/api/level"
Invoke-RestMethod -Uri "http://127.0.0.1:14100/game/sword1/api/scenes/map001_%E8%A1%A1%E5%B1%B1/manifest"
```

验收时必须同时确认：

1. Docker 两个容器健康，端口为 15533、19100、19101。
2. `sword1` config 返回 `gameEnabled: true`。
3. PostgreSQL 中 `sword1` 的 file 节点为 110（90 文件 + 20 目录），scene 为 1。
4. raw 备份与 MinIO 中 `sword1` 对象数均为 6,102。
5. 直接 HEAD 本地 MinIO 对象返回 200，并有 `Access-Control-Allow-Origin: http://127.0.0.1:5274`。
6. 浏览器能显示标题、播放/跳过片头并进入衡山；最新一轮控制台没有 error 或真实资源加载失败。
7. server 日志中的 S3 client endpoint 必须为 `http://localhost:19100`，浏览器与服务端运行期不得访问生产资源域名。

每次备份应成对保存：

- PostgreSQL 元数据 dump（至少 game/file/scene 和运行时配置）；
- S3 bucket 对象，保持原 `storage_key`；
- dump SHA256、对象数量/总字节数和备份时间；
- 对应的 game id、slug、数据库 schema migration 版本。

`.data/` 被 Git 忽略。请把 `.data/local-snapshots`、`.data/s3-backups`、`.data/postgres` 和 `.data/minio` 纳入单独的本机/离线备份策略；仅提交本 runbook 和恢复脚本不能替代实际数据备份。
