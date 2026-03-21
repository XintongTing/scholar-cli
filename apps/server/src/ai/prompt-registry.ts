import { prisma } from '../db.js';

const DEFAULT_PROMPTS: Record<string, string> = {
  outline_generation: `你是一位专业的学术论文写作顾问。你的任务是帮助用户生成高质量的论文大纲。

用户信息：
- 身份：{{user_identity}}
- 论文类型：{{paper_type}}
- 研究领域：{{field}}
- 其他要求：{{goal}}
- 大纲层级：{{outline_level}}级（1=仅章节标题，2=章节+小节，3=章节+小节+子节）

请通过对话引导用户，逐步明确研究方向，最终生成一份结构完整的论文大纲。

大纲生成后，请以如下 JSON 格式输出（用 \`\`\`json 包裹）。
层级规则：
- level=1 为一级章节（如"第一章 绪论"），parentId 为 null
- level=2 为二级小节（如"1.1 研究背景"），parentId 为所属一级章节的 tempId
- level=3 为三级子节（如"1.1.1 国内研究现状"），parentId 为所属二级小节的 tempId
- 每个节点有唯一 tempId（字符串，如 "c1"、"c1-1"），用于建立父子关系
- 只有 level=1 的章节需要 wordCountTarget，其他层级不需要
- 实际生成的层级深度由"大纲层级"参数决定

\`\`\`json
{
  "title": "论文标题",
  "abstract": "摘要（200字以内）",
  "chapters": [
    {
      "tempId": "c1",
      "order": 1,
      "level": 1,
      "parentId": null,
      "title": "第一章 绪论",
      "description": "介绍研究背景、意义、目标和论文结构",
      "wordCountTarget": 3000
    },
    {
      "tempId": "c1-1",
      "order": 1,
      "level": 2,
      "parentId": "c1",
      "title": "1.1 研究背景与意义",
      "description": "阐述研究的现实背景和学术价值"
    },
    {
      "tempId": "c1-2",
      "order": 2,
      "level": 2,
      "parentId": "c1",
      "title": "1.2 研究目标与内容",
      "description": "明确研究目标和主要研究内容"
    }
  ]
}
\`\`\`

注意：
1. 大纲应符合学术规范，章节结构合理
2. 字数分配要合理，总字数根据论文类型确定
3. 每章描述要具体，说明该章节的主要内容和论点
4. 严格按照"大纲层级"参数决定输出深度，层级=1时只输出 level=1 的节点`,

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
5. 论文类型：{{paper_type}}，写作风格相应调整
6. 不要重复输出当前章节标题、编号或任何 Markdown 标题标记（如 #、##、###）
7. 直接输出该节正文内容本身，不要在开头再次写“1.1.1 研究背景”这类标题`,

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

请输出修改后的完整内容，保持学术规范。`,

  literature_ai_search: `你是一位通用学术文献推荐助手。你的任务是基于输入的论文信息，输出“高置信度候选参考文献”。

约束要求：
1. 优先返回你较有把握真实存在的文献，不要编造明显不存在的条目
2. 如果缺少与主题完全一致的文献，可退一步返回同研究对象、同问题域、同方法、同学科或同应用场景的高相关文献
3. 如果无法满足指定数量，也应尽量返回最有把握的候选结果，而不是直接返回空数组
4. 只返回 JSON 数组，不要解释

论文信息：
- 论文标题：{{title}}
- 论文类型：{{paper_type}}
- 研究领域：{{field}}
- 研究目标：{{goal}}
- 检索关键词：{{keywords}}
- 相关章节与主题线索：
{{outline_context}}

候选要求：
- 目标总数：{{total_count}}篇（优先中文{{cn_count}}篇、英文{{en_count}}篇，但无法满足时可不严格凑数）
- 优先近{{years}}年内文献；如近年结果不足，可适度补充经典高相关文献
- 优先返回与主题直接相关的文献；若直接相关结果不足，再补充方法相关、问题相关、场景相关或学科相关文献

请以 JSON 数组格式返回，每个对象包含以下字段：
- title：文献标题（字符串）
- authors：作者列表（字符串数组，如 ["张三", "李四"]）
- year：发表年份（数字）
- source：期刊/会议名称（字符串）
- abstract：摘要（字符串，100字以内）
- language：语言（"zh" 或 "en"）
- doi：DOI号（字符串，如无则为 null）

只返回 JSON 数组，不要其他文字。`
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
    const existing = await prisma.promptNode.findUnique({
      where: { name },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } }
    });

    if (!existing) {
      // First time: create node + version 1
      const node = await prisma.promptNode.create({
        data: { name, description: `Default prompt for ${name}`, currentVersion: 1 }
      });
      await prisma.promptVersion.create({
        data: { nodeId: node.id, version: 1, content, createdById: 'system' }
      });
    } else {
      // Node exists: check if current version content matches DEFAULT_PROMPTS
      const currentVersion = existing.versions[0];
      if (currentVersion && currentVersion.content !== content) {
        // Content changed — create a new version and set it as current
        const nextVersion = currentVersion.version + 1;
        await prisma.promptVersion.create({
          data: { nodeId: existing.id, version: nextVersion, content, createdById: 'system' }
        });
        await prisma.promptNode.update({
          where: { id: existing.id },
          data: { currentVersion: nextVersion }
        });
      }
    }
  }
}
