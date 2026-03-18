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
}) {
  return prisma.chapter.create({ data: { outlineId, ...data } });
}

export async function updateChapter(chapterId: string, data: {
  title?: string;
  description?: string;
  wordCountTarget?: number;
  order?: number;
}) {
  return prisma.chapter.update({ where: { id: chapterId }, data });
}

export async function deleteChapter(chapterId: string) {
  return prisma.chapter.delete({ where: { id: chapterId } });
}

export async function getMaxOrder(outlineId: string): Promise<number> {
  const result = await prisma.chapter.aggregate({
    where: { outlineId },
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
  title: string;
  description?: string;
  wordCountTarget?: number;
  order: number;
}>) {
  await prisma.chapter.deleteMany({ where: { outlineId } });
  return prisma.chapter.createMany({
    data: chapters.map(c => ({ outlineId, ...c }))
  });
}
