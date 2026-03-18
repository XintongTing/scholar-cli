import { prisma } from '../db.js';

export async function findByProjectId(projectId: string) {
  return prisma.literature.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' }
  });
}

export async function create(data: {
  projectId: string;
  title: string;
  authors: string[];
  year?: number | null;
  abstract?: string;
  source?: string;
  fileKey?: string;
}) {
  return prisma.literature.create({ data });
}

export async function deleteById(id: string) {
  return prisma.literature.delete({ where: { id } });
}

export async function confirmAll(projectId: string) {
  return prisma.literature.updateMany({
    where: { projectId },
    data: { confirmed: true }
  });
}
