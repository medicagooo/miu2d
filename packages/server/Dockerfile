# 构建阶段
FROM node:22-alpine AS builder

# AI-TRACE: builder 与 runner 必须使用根 package.json 声明的同一 pnpm 版本，
# 否则 workspace 安装策略和 native dependency 构建结果可能不一致。
RUN corepack enable && corepack prepare pnpm@10.16.1 --activate

WORKDIR /app

# 复制 workspace 配置文件
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY tsconfig.base.json ./

# 复制 types 包配置和源代码（server 依赖 types）
COPY packages/types/package.json ./packages/types/
COPY packages/types/tsconfig.json ./packages/types/
COPY packages/types/src ./packages/types/src

# 复制 shared 包配置和源代码（server 依赖 shared/locales）
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared/tsconfig.json ./packages/shared/
COPY packages/shared/tsconfig.locales.json ./packages/shared/
COPY packages/shared/src ./packages/shared/src

# 复制 server 包配置
COPY packages/server/package.json ./packages/server/
COPY packages/server/tsconfig.json ./packages/server/
COPY packages/server/tsconfig.build.json ./packages/server/
COPY packages/server/rolldown.config.mjs ./packages/server/
COPY packages/server/prisma.config.ts ./packages/server/

# 安装所有依赖（包括 devDependencies，构建时需要）
RUN pnpm install --frozen-lockfile

# 复制源代码和脚本
COPY packages/server/src ./packages/server/src
COPY packages/server/scripts ./packages/server/scripts
COPY packages/server/prisma ./packages/server/prisma

# 先构建 types（server 运行时依赖其编译产物）
WORKDIR /app/packages/types
RUN pnpm build

# 编译 shared/locales 为 JS（rolldown 打包时从 default 条件加载）
WORKDIR /app/packages/shared
RUN pnpm build:locales

# 构建应用（rolldown 打包，@miu2d/* 工作区包全部内联）
WORKDIR /app/packages/server
RUN pnpm build
RUN pnpm tsc

# 生产阶段
FROM node:22-alpine AS runner

# 启用 corepack
RUN corepack enable && corepack prepare pnpm@10.16.1 --activate

WORKDIR /app

# 复制必要的配置文件
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/types/package.json ./packages/types/
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/

# 从构建阶段复制构建产物
COPY --from=builder /app/packages/server/dist ./packages/server/dist

# AI-TRACE: rolldown 的 server 产物仍以运行时 ESM import 加载 @miu2d/types；
# pnpm --prod 只创建 workspace 链接，不会生成 types/dist，因此必须把 builder 中
# 已由 packages/types 的 prebuild/build 入口生成的完整 dist 一并带入 runner。
COPY --from=builder /app/packages/types/dist ./packages/types/dist

# 复制 prisma schema 和迁移文件
COPY --from=builder /app/packages/server/prisma ./packages/server/prisma

# 只安装生产依赖
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

# 生成 Prisma Client（使用 WASM，无需 schema-engine 二进制）
WORKDIR /app
RUN packages/server/node_modules/.bin/prisma generate --schema=packages/server/prisma/schema.prisma

# 设置工作目录
WORKDIR /app/packages/server

# 暴露端口
EXPOSE 4000

# 启动应用
CMD ["node", "dist/main.js"]
