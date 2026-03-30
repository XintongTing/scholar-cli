# Render 部署说明

## 推荐架构

- `apps/server` 部署为 Render `Web Service`
- `apps/web` 部署为 Render `Static Site`

仓库根目录已提供 [render.yaml](/e:/myproject/scholar-cli/render.yaml)，可直接走 Blueprint 部署。

## 后端必填环境变量

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `CORS_ORIGIN`
- `PUBLIC_BASE_URL`
- `ANTHROPIC_API_KEY`

## 文件存储

Render 本地磁盘不是持久化存储，生产环境必须启用对象存储：

- `S3_ENABLED=true`
- `S3_ENDPOINT`
- `S3_REGION`
- `S3_BUCKET`
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`
- `S3_FORCE_PATH_STYLE=false`

兼容 AWS S3、Cloudflare R2、MinIO。

本地开发如果继续用 docker 里的 MinIO，也可以设置：

```env
S3_ENABLED=true
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=scholarcli
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_FORCE_PATH_STYLE=true
```

如果不设置 `S3_ENABLED=true`，服务会回退到本地 `uploads/` 目录，仅适合本地开发。

## 前端环境变量

- `VITE_API_URL=https://your-server.onrender.com`

## 构建与启动

后端 Blueprint 默认命令：

```bash
pnpm install --frozen-lockfile
pnpm --filter server exec prisma generate
pnpm --filter server build
pnpm --filter server exec prisma migrate deploy
pnpm --filter server start
```

前端 Blueprint 默认命令：

```bash
pnpm install --frozen-lockfile
pnpm --filter web build
```

## 部署后检查

1. 打开后端 `/health`
2. 注册和登录是否正常
3. 大纲聊天和正文生成的流式输出是否正常
4. 上传文献和素材后，重启服务再检查文件是否仍可访问
