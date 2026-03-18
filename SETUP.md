# ScholarCLI 开发环境搭建指南

## 前置要求

- Node.js >= 18
- pnpm >= 9.0
- Docker & Docker Compose
- PostgreSQL 16 (通过 Docker)
- Redis 7 (通过 Docker)
- MinIO (通过 Docker)

## 步骤 1: 安装依赖

```bash
# 在项目根目录
pnpm install
```

## 步骤 2: 启动基础设施

```bash
# 启动 PostgreSQL, Redis, MinIO
docker-compose up -d

# 查看服务状态
docker-compose ps
```

服务端口：
- PostgreSQL: 5432
- Redis: 6379
- MinIO API: 9000
- MinIO Console: 9001 (访问 http://localhost:9001, 用户名/密码: minioadmin/minioadmin)

## 步骤 3: 配置环境变量

编辑 `apps/server/.env`：

```env
# 必须配置：Claude API Key
ANTHROPIC_API_KEY="sk-ant-your-api-key-here"

# 其他配置已有默认值，可根据需要修改
DATABASE_URL="postgresql://scholar:scholar_dev@localhost:5432/scholarcli"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="scholar-cli-jwt-secret-change-in-production"
```

## 步骤 4: 初始化数据库

```bash
cd apps/server

# 生成 Prisma Client
pnpm prisma generate

# 运行数据库迁移
pnpm prisma migrate dev

# (可选) 查看数据库
pnpm prisma studio
```

## 步骤 5: 创建 MinIO Bucket

访问 http://localhost:9001，登录后：
1. 点击 "Buckets" → "Create Bucket"
2. 输入名称: `scholarcli`
3. 点击 "Create Bucket"

或使用命令行：
```bash
docker exec -it scholar-cli-minio-1 mc alias set local http://localhost:9000 minioadmin minioadmin
docker exec -it scholar-cli-minio-1 mc mb local/scholarcli
```

## 步骤 6: 初始化提示词模板（可选）

```bash
cd apps/server
pnpm prisma db seed
```

这会创建默认的提示词节点：
- `outline_generation`: 大纲生成
- `chapter_generation`: 章节生成
- `literature_keyword_extraction`: 文献关键词提取
- `material_requirement_inference`: 材料需求推断

## 步骤 7: 启动开发服务器

### 终端 1: 启动后端

```bash
cd apps/server
pnpm dev
```

后端将在 http://localhost:3000 启动

### 终端 2: 启动前端

```bash
cd apps/web
pnpm dev
```

前端将在 http://localhost:5173 启动

## 步骤 8: 验证安装

1. 访问 http://localhost:5173
2. 应该看到 ScholarCLI 欢迎页面
3. 访问 http://localhost:3000/health 应该返回 `{"status":"ok"}`

## 常见问题

### Q: 数据库连接失败

**A:** 确保 Docker 容器正在运行：
```bash
docker-compose ps
docker-compose logs postgres
```

### Q: Prisma 迁移失败

**A:** 重置数据库：
```bash
cd apps/server
pnpm prisma migrate reset
```

### Q: 前端无法连接后端

**A:** 检查 CORS 配置，确保 `apps/server/.env` 中的 `CORS_ORIGIN` 与前端地址匹配。

### Q: Claude API 调用失败

**A:** 
1. 确认 `ANTHROPIC_API_KEY` 已正确配置
2. 检查 API Key 是否有效
3. 查看后端日志获取详细错误信息

### Q: 文件上传失败

**A:** 
1. 确认 MinIO 容器正在运行
2. 确认 bucket `scholarcli` 已创建
3. 检查 S3 配置是否正确

## 开发工具

### Prisma Studio (数据库可视化)

```bash
cd apps/server
pnpm prisma studio
```

访问 http://localhost:5555

### 查看日志

```bash
# 后端日志
cd apps/server
pnpm dev

# Docker 服务日志
docker-compose logs -f postgres
docker-compose logs -f redis
docker-compose logs -f minio
```

### 重置开发环境

```bash
# 停止所有服务
docker-compose down -v

# 删除数据库数据
rm -rf postgres_data redis_data minio_data

# 重新启动
docker-compose up -d
cd apps/server
pnpm prisma migrate dev
```

## 生产部署

参考 `DEPLOYMENT.md` (待创建)

## 下一步

- 阅读 `README.md` 了解项目功能
- 查看 `scholarCLI_需求文档_v2.2.md` 了解完整需求
- 开始开发！
