import { prisma } from '../db.js';

export async function findByProjectId(projectId: string) {
  return prisma.outline.findUnique({
    where: { projectId },
    include: { chapters: { orderBy: { order: 'asc' } } }
  });
}

export async function upsertOutline(projectId: string, data: { title?: string; abstract?: string }) {
  return prisma.outline.upsert({
    where: { projectId },
    create: { projectId, ...data },
    update: data,
    include: { chapters: { orderBy: { order: 'asc' } } }
  });
}

export async function addChapter(outlineId: string, data: {
  title: string;
  description?: string;
  wordCountTarget?: number;
  order: number;
  level?: number;
  parentId?: string | null;
}) {
  return prisma.chapter.create({ data: { outlineId, level: 1, ...data } });
}

export async function updateChapter(chapterId: string, data: {
  title?: string;
  description?: string;
  wordCountTarget?: number;
  order?: number;
  level?: number;
  parentId?: string | null;
  collapsed?: boolean;
}) {
  return prisma.chapter.update({ where: { id: chapterId }, data });
}

export async function deleteChapter(chapterId: string) {
  return prisma.chapter.delete({ where: { id: chapterId } });
}

export async function getMaxOrder(outlineId: string, parentId?: string | null): Promise<number> {
  const result = await prisma.chapter.aggregate({
    where: { outlineId, parentId: parentId ?? null },
    _max: { order: true }
  });
  return result._max.order ?? 0;
}

export async function confirmOutline(projectId: string) {
  return prisma.outline.update({
    where: { projectId },
    data: { confirmed: true }
  });
}

export async function replaceChapters(outlineId: string, chapters: Array<{
  tempId?: string;
  title: string;
  description?: string;
  wordCountTarget?: number;
  order: number;
  level?: number;
  parentId?: string | null;
}>) {
  await prisma.chapter.deleteMany({ where: { outlineId } });

  // Sort by level first (so parents exist before children), then by order within same level
  const tempIdToRealId = new Map<string, string>();
  const sorted = [...chapters].sort((a, b) => {
    const levelDiff = (a.level ?? 1) - (b.level ?? 1);
    if (levelDiff !== 0) return levelDiff;
    return (a.order ?? 0) - (b.order ?? 0);
  });

  for (const c of sorted) {
    const realParentId = c.parentId ? (tempIdToRealId.get(c.parentId) ?? null) : null;
    const created = await prisma.chapter.create({
      data: {
        outlineId,
        title: c.title,
        description: c.description,
        wordCountTarget: c.wordCountTarget ?? 1000,
        order: c.order,
        level: c.level ?? 1,
        parentId: realParentId,
      }
    });
    if (c.tempId) tempIdToRealId.set(c.tempId, created.id);
  }
}
