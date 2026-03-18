# ScholarCLI 项目状态报告

## 项目概述

ScholarCLI 是一款基于 Claude AI 的学术论文写作助手，支持从选题到成稿的完整流程。

**当前版本**: v0.1.0 (第一阶段 MVP 已完成)
**最后更新**: 2026-03-14
**状态**: ✅ 第一阶段核心功能已全部实现并通过测试

## 已完成的工作

### 1. 项目脚手架 ✅

- [x] pnpm workspace 配置
- [x] 前端项目初始化 (Vite + React 18 + TypeScript)
- [x] 后端项目初始化 (Fastify + Prisma + TypeScript)
- [x] Docker Compose 配置 (PostgreSQL + Redis + MinIO)
- [x] 所有依赖包安装完成

### 2. 数据库设计 ✅

- [x] Prisma Schema 定义完成
- [x] 核心数据模型：
  - User (用户)
  - Project (项目)
  - Outline + Chapter (大纲和章节)
  - Literature (文献)
  - Material (补充材料)
  - GeneratedDocument (生成的文档)
  - ChatMessage (对话历史)
  - PromptNode + PromptVersion (提示词管理)

### 3. 设计系统 ✅

- [x] CSS Variables 定义 (白色主题)
- [x] Tailwind CSS 配置
- [x] 基础组件：
  - Button (4种变体: primary/secondary/ghost/danger)
  - Input (带 label 和 error 状态)
  - Spinner (加载动画)
- [x] 工具函数：
  - cn (classnames 合并)
  - API 类型定义

### 4. 后端核心服务 ✅

- [x] Logger (pino)
- [x] Response 工具函数 (ok/fail)
- [x] Config 配置管理
- [x] Prisma Client 初始化
- [x] Fastify 服务器入口

### 5. 前端基础 ✅

- [x] 入口文件 (main.tsx)
- [x] 欢迎页面
- [x] CSS 设计系统

### 6. 项目文档 ✅

- [x] README.md (项目介绍)
- [x] SETUP.md (开发环境搭建指南)
- [x] PROJECT_STATUS.md (本文档)

## 第一阶段 MVP 完成情况

### 后端 API ✅

- [x] 认证模块
  - [x] 用户注册/登录
  - [x] JWT 认证中间件
  - [x] Token 刷新

- [x] 项目管理
  - [x] 项目 CRUD
  - [x] 项目列表（历史记录）

- [x] 大纲生成
  - [x] AI 对话接口 (SSE 流式)
  - [x] 大纲编辑 API
  - [x] 章节增删改

- [x] 文献管理
  - [x] PDF 上传解析
  - [x] 文献列表管理

- [x] 补充材料
  - [x] 固定问题列表
  - [x] 材料上传/文本提交

- [x] 论文生成
  - [x] 流式生成 API (SSE)
  - [x] 进度跟踪
  - [x] 暂停/恢复

- [x] 在线编辑器
  - [x] 文档保存
  - [x] 导出 Word

- [x] 管理员后台
  - [x] 提示词管理
  - [x] 版本控制
  - [x] 灰度测试

### 前端功能 ✅

- [x] 路由配置
  - [x] React Router 设置
  - [x] 路由守卫

- [x] 布局组件
  - [x] 三栏布局 (LeftNav + Main + RightPanel)
  - [x] 顶部导航栏

- [x] 认证页面
  - [x] 登录表单
  - [x] 注册表单

- [x] 项目管理
  - [x] 项目列表页
  - [x] 新建项目引导卡片

- [x] 大纲生成
  - [x] AI 对话界面
  - [x] 右侧大纲面板
  - [x] 章节编辑

- [x] 文献管理
  - [x] PDF 拖拽上传
  - [x] 文献列表展示

- [x] 补充材料
  - [x] 材料表单
  - [x] 文件上传

- [x] 论文生成
  - [x] 流式预览
  - [x] 进度面板

- [x] 在线编辑器
  - [x] Tiptap 编辑器
  - [x] 工具栏
  - [x] Word 导出

- [x] 管理员后台
  - [x] 提示词列表
  - [x] 提示词编辑器
  - [x] 版本历史

### 集成服务 ✅

- [x] Claude API 集成
  - [x] 流式对话
  - [x] 提示词组装
  - [x] Token 计量

- [x] S3 存储集成
  - [x] 文件上传
  - [x] 预签名 URL
  - [x] 文件删除

- [x] PDF 解析
  - [x] 元数据提取
  - [x] 文本提取

## 技术栈总结

### 前端
- React 18.3.1
- TypeScript 5.9.3
- Vite 7.3.1
- React Router 6.30.3
- Zustand 5.0.11
- React Query 5.90.21
- Tailwind CSS 3.4.19
- Tiptap 3.20.1
- Lucide React 0.577.0
- Axios 1.13.6

### 后端
- Fastify 5.8.2
- Prisma 7.5.0
- PostgreSQL 16
- Redis 7
- TypeScript 5.9.3
- Anthropic SDK 0.78.0
- BullMQ 5.71.0
- Pino 10.3.1
- Zod 4.3.6

### 基础设施
- Docker & Docker Compose
- MinIO (S3-compatible)
- pnpm 9.0.0

## 项目结构

```
scholar-cli/
├── apps/
│   ├── web/                    # React 前端 ✅
│   │   ├── src/
│   │   │   ├── shared/         # 共享组件和工具
│   │   │   ├── features/       # 8个功能模块（全部实现）
│   │   │   ├── app/            # 路由、布局、Provider
│   │   │   ├── pages/          # 页面组件
│   │   │   └── services/       # HTTP 客户端
│   │   └── package.json
│   │
│   └── server/                 # Fastify 后端 ✅
│       ├── src/
│       │   ├── ai/             # 提示词注册、组装、上下文构建
│       │   ├── plugins/        # JWT 认证、错误处理
│       │   ├── routes/         # 8个路由模块
│       │   ├── services/       # 业务逻辑 + Claude/S3/PDF 集成
│       │   ├── repositories/   # 数据访问层
│       │   └── utils/          # logger, response
│       └── prisma/             # Schema + 迁移 + Seed
│
├── docker-compose.yml          # PostgreSQL + Redis + MinIO
├── pnpm-workspace.yaml
└── package.json
```

## 启动方式

```bash
# 1. 启动基础设施
docker-compose up -d

# 2. 初始化数据库
cd apps/server
pnpm db:migrate
pnpm db:seed

# 3. 配置 API Key（apps/server/.env）
ANTHROPIC_API_KEY=your-key-here

# 4. 启动后端（终端1）
pnpm dev

# 5. 启动前端（终端2）
cd apps/web
pnpm dev
```

## 参考文档

- 需求文档: `scholarCLI_需求文档_v2.2.md`
- 搭建指南: `SETUP.md`
