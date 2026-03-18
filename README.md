# ScholarCLI - AI 学术论文写作助手

基于 Claude AI 的学术论文写作助手，支持从选题到成稿的完整流程。

## 技术栈

- **前端**: React 18 + TypeScript + Vite + Tailwind CSS + Tiptap
- **后端**: Fastify + Prisma + PostgreSQL + Redis + BullMQ
- **AI**: Claude API (Anthropic)
- **存储**: S3-compatible (MinIO)

## 快速开始

### 1. 启动基础设施

```bash
docker-compose up -d
```

### 2. 配置环境变量

编辑 `apps/server/.env`，填入你的 Claude API Key：

```
ANTHROPIC_API_KEY="your-api-key-here"
```

### 3. 初始化数据库

```bash
cd apps/server
pnpm prisma migrate dev
pnpm prisma db seed  # 可选：初始化提示词模板
```

### 4. 启动开发服务器

```bash
# 终端 1: 启动后端
cd apps/server
pnpm dev

# 终端 2: 启动前端
cd apps/web
pnpm dev
```

访问 http://localhost:5173

## 项目结构

```
scholar-cli/
├── apps/
│   ├── web/          # React 前端
│   └── server/       # Fastify 后端
├── docker-compose.yml
└── pnpm-workspace.yaml
```

## 功能模块

### 第一阶段 MVP (已实现)

- ✅ 用户认证 (注册/登录)
- ✅ AI 对话生成大纲
- ✅ 大纲编辑 (增删改章节)
- ✅ 文献上传与管理 (PDF 解析)
- ✅ 补充材料收集
- ✅ AI 流式生成论文全文
- ✅ 在线编辑器 (Tiptap)
- ✅ 导出 Word 文档
- ✅ 历史项目管理
- ✅ 管理员提示词配置后台

## 开发指南

### 数据库迁移

```bash
cd apps/server
pnpm prisma migrate dev --name migration_name
```

### 代码规范

- TypeScript strict mode
- ESLint + Prettier
- 提交信息遵循 Conventional Commits

## License

MIT
