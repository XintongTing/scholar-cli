import { prisma } from '../db.js';
import type { ProjectStatus } from '@prisma/client';

export async function findByUserId(userId: string, cursor?: string, limit = 20) {
  return prisma.project.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { outline: { select: { title: true } } }
  });
}

export async function findById(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: {
      outline: { include: { chapters: { orderBy: { order: 'asc' } } } },
      literatures: { orderBy: { createdAt: 'asc' } },
      materials: { orderBy: { createdAt: 'asc' } },
      documents: { orderBy: { version: 'desc' }, take: 1 }
    }
  });
}

export async function create(userId: string, userProfile: Record<string, string>) {
  return prisma.project.create({
    data: {
      userId,
      userProfile,
      outline: { create: { title: '' } }
    },
    include: { outline: true }
  });
}

export async function updateStatus(id: string, status: ProjectStatus) {
  return prisma.project.update({ where: { id }, data: { status } });
}

export async function updateTitle(id: string, title: string) {
  return prisma.project.update({ where: { id }, data: { title } });
}

export async function deleteById(id: string) {
  return prisma.project.delete({ where: { id } });
}
