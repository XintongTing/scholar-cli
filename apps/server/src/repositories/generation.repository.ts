import { prisma } from '../db.js';
import type { DocStatus } from '@prisma/client';

export async function findLatestByProjectId(projectId: string) {
  return prisma.generatedDocument.findFirst({
    where: { projectId },
    orderBy: { version: 'desc' }
  });
}

export async function create(projectId: string) {
  const latest = await findLatestByProjectId(projectId);
  const version = latest ? latest.version + 1 : 1;
  return prisma.generatedDocument.create({
    data: { projectId, version, content: {}, status: 'GENERATING' }
  });
}

export async function updateContent(id: string, content: Record<string, unknown>) {
  return prisma.generatedDocument.update({
    where: { id },
    data: { content: content as any }
  });
}

export async function updateStatus(id: string, status: DocStatus, checkpointChapterId?: string) {
  return prisma.generatedDocument.update({
    where: { id },
    data: { status, ...(checkpointChapterId !== undefined ? { checkpointChapterId } : {}) }
  });
}
