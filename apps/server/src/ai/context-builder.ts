import { prisma } from '../db.js';

export interface ProjectContext {
  userProfile: string;
  outline: string;
  literatureList: string;
  materialsSummary: string;
  previousChapterTail: string;
}

export async function buildProjectContext(
  projectId: string,
  currentChapterId?: string
): Promise<ProjectContext> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      outline: { include: { chapters: { orderBy: { order: 'asc' } } } },
      literatures: { where: { confirmed: true } },
      materials: true
    }
  });

  if (!project) throw new Error('Project not found');

  const profile = project.userProfile as Record<string, string>;
  const userProfile = `身份：${profile.identity || '未知'}，论文类型：${profile.paperType || '未知'}，研究领域：${profile.field || '未知'}，写作目标：${profile.goal || '未知'}`;

  let outline = '';
  if (project.outline) {
    const o = project.outline;
    outline = `标题：${o.title}\n摘要：${o.abstract || ''}\n\n章节：\n`;
    outline += o.chapters.map(c =>
      `${c.order}. ${c.title}（目标字数：${c.wordCountTarget}字）\n   ${c.description || ''}`
    ).join('\n');
  }

  const literatureList = project.literatures.length > 0
    ? project.literatures.map((l, i) =>
        `[${i + 1}] ${l.authors.join(', ')} (${l.year || 'n.d.'}). ${l.title}. ${l.source || ''}. ${l.abstract ? l.abstract.slice(0, 150) + '...' : ''}`
      ).join('\n')
    : '暂无参考文献';

  const materialsSummary = project.materials.length > 0
    ? project.materials
        .filter(m => !m.skipped)
        .map(m => `${m.label}：${m.textContent ? m.textContent.slice(0, 200) : '（已上传文件）'}`)
        .join('\n')
    : '暂无补充材料';

  // Get previous chapter tail for continuity
  let previousChapterTail = '';
  if (currentChapterId && project.outline) {
    const chapters = project.outline.chapters;
    const currentIdx = chapters.findIndex(c => c.id === currentChapterId);
    if (currentIdx > 0) {
      const prevChapter = chapters[currentIdx - 1];
      const doc = await prisma.generatedDocument.findFirst({
        where: { projectId },
        orderBy: { version: 'desc' }
      });
      if (doc) {
        const content = doc.content as Record<string, string>;
        const prevText = content[prevChapter.id] || '';
        const words = prevText.split('');
        previousChapterTail = words.slice(-300).join('');
      }
    }
  }

  return { userProfile, outline, literatureList, materialsSummary, previousChapterTail };
}
