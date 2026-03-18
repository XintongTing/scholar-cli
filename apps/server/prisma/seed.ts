import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  log: ['error'],
});

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@scholarcli.com' },
    update: {},
    create: {
      email: 'admin@scholarcli.com',
      name: 'Admin',
      passwordHash: adminPassword,
      role: 'ADMIN',
      plan: 'PRO',
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Create test user
  const userPassword = await bcrypt.hash('test123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'test@scholarcli.com' },
    update: {},
    create: {
      email: 'test@scholarcli.com',
      name: 'Test User',
      passwordHash: userPassword,
      role: 'USER',
      plan: 'FREE',
    },
  });
  console.log('✅ Test user created:', user.email);

  // Create default prompt nodes
  const prompts = [
    {
      name: 'outline_generation',
      description: '大纲生成提示词',
      content: `你是一位专业的学术论文写作顾问。你的任务是帮助用户生成高质量的论文大纲。

用户信息：
- 身份：{{user_identity}}
- 论文类型：{{paper_type}}
- 研究领域：{{field}}
- 写作目标：{{goal}}

请通过对话引导用户，逐步明确研究方向，最终生成一份结构完整的论文大纲。

大纲生成后，请以如下 JSON 格式输出（用 \`\`\`json 包裹）：
\`\`\`json
{
  "title": "论文标题",
  "abstract": "摘要（200字以内）",
  "chapters": [
    {
      "order": 1,
      "title": "第一章 绪论",
      "description": "章节内容描述",
      "wordCountTarget": 2000
    }
  ]
}
\`\`\`

注意：
1. 大纲应符合学术规范，章节结构合理
2. 字数分配要合理，总字数根据论文类型确定
3. 每章描述要具体，说明该章节的主要内容和论点`,
    },
    {
      name: 'chapter_generation',
      description: '章节生成提示词',
      content: `你是一位专业的学术论文写作专家。请根据以下信息撰写论文章节内容。

论文信息：
{{outline}}

当前章节：{{current_chapter}}
目标字数：{{word_count_target}}字

参考文献：
{{literature_list}}

补充材料：
{{materials_summary}}

上一章结尾：
{{previous_chapter_tail}}

写作要求：
1. 语言学术规范，逻辑严密
2. 适当引用参考文献（使用[1][2]等格式标注）
3. 字数接近目标字数
4. 与上一章内容自然衔接
5. 论文类型：{{paper_type}}，写作风格相应调整`,
    },
  ];

  for (const p of prompts) {
    const node = await prisma.promptNode.upsert({
      where: { name: p.name },
      update: {},
      create: {
        name: p.name,
        description: p.description,
        currentVersion: 1,
      },
    });

    await prisma.promptVersion.upsert({
      where: { nodeId_version: { nodeId: node.id, version: 1 } },
      update: {},
      create: {
        nodeId: node.id,
        version: 1,
        content: p.content,
        createdById: admin.id,
      },
    });

    console.log('✅ Prompt node created:', p.name);
  }

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
