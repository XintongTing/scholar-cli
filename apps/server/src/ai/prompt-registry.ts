import { prisma } from '../db.js';

const DEFAULT_PROMPTS: Record<string, string> = {
  outline_generation: `你是一位专业的学术论文写作顾问。你的任务是帮助用户生成高质量的论文大纲。

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

  chapter_generation: `你是一位专业的学术论文写作专家。请根据以下信息撰写论文章节内容。

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

  literature_keyword_extraction: `根据以下论文大纲，提取3-5个最适合用于学术数据库搜索的关键词。

大纲：{{outline}}

请直接返回关键词列表，每行一个，不需要其他说明。`,

  material_requirement_inference: `根据以下论文信息，判断需要哪些补充材料。

用户身份：{{user_identity}}
论文类型：{{paper_type}}
研究领域：{{field}}
大纲：{{outline}}

请列出需要的材料类型，每行一个，格式：材料类型|说明`,

  draft_revision: `你是一位专业的学术论文修改专家。请根据修改意见对论文进行修改。

原文：
{{draft_content}}

修改意见：
{{revision_notes}}

请输出修改后的完整内容，保持学术规范。`
};

export async function getPromptContent(nodeName: string, userId: string): Promise<string> {
  try {
    const node = await prisma.promptNode.findUnique({
      where: { name: nodeName },
      include: { versions: { orderBy: { version: 'desc' } } }
    });

    if (!node || node.versions.length === 0) {
      return DEFAULT_PROMPTS[nodeName] || '';
    }

    // Check if user is in test group
    const isTestUser = node.testUserIds.includes(userId);
    const targetVersion = isTestUser && node.testVersion ? node.testVersion : node.currentVersion;

    const version = node.versions.find(v => v.version === targetVersion);
    return version?.content || DEFAULT_PROMPTS[nodeName] || '';
  } catch {
    return DEFAULT_PROMPTS[nodeName] || '';
  }
}

export async function recordUsage(nodeName: string, tokens: number): Promise<void> {
  try {
    const node = await prisma.promptNode.findUnique({ where: { name: nodeName } });
    if (!node) return;

    const newCount = node.callCount + 1;
    const newAvg = (node.avgTokens * node.callCount + tokens) / newCount;

    await prisma.promptNode.update({
      where: { name: nodeName },
      data: { callCount: newCount, avgTokens: newAvg }
    });
  } catch {
    // Non-critical, ignore errors
  }
}

export async function initDefaultPrompts(): Promise<void> {
  for (const [name, content] of Object.entries(DEFAULT_PROMPTS)) {
    const existing = await prisma.promptNode.findUnique({ where: { name } });
    if (!existing) {
      const node = await prisma.promptNode.create({
        data: { name, description: `Default prompt for ${name}`, currentVersion: 1 }
      });
      await prisma.promptVersion.create({
        data: { nodeId: node.id, version: 1, content, createdById: 'system' }
      });
    }
  }
}
