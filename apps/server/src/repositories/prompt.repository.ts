import { prisma } from '../db.js';

export async function findAll() {
  return prisma.promptNode.findMany({
    orderBy: { name: 'asc' },
    include: {
      versions: { orderBy: { version: 'desc' }, take: 1 }
    }
  });
}

export async function findByName(name: string) {
  return prisma.promptNode.findUnique({
    where: { name },
    include: { versions: { orderBy: { version: 'desc' } } }
  });
}

export async function findById(id: string) {
  return prisma.promptNode.findUnique({
    where: { id },
    include: { versions: { orderBy: { version: 'desc' } } }
  });
}

export async function createVersion(nodeId: string, content: string, createdById: string) {
  const node = await prisma.promptNode.findUnique({ where: { id: nodeId } });
  if (!node) throw new Error('PromptNode not found');

  const newVersion = node.currentVersion + 1;
  await prisma.promptVersion.create({
    data: { nodeId, version: newVersion, content, createdById }
  });
  return prisma.promptNode.update({
    where: { id: nodeId },
    data: { currentVersion: newVersion },
    include: { versions: { orderBy: { version: 'desc' } } }
  });
}

export async function rollbackToVersion(nodeId: string, targetVersion: number) {
  return prisma.promptNode.update({
    where: { id: nodeId },
    data: { currentVersion: targetVersion }
  });
}

export async function setTestVersion(nodeId: string, testVersion: number | null, testUserIds: string[]) {
  return prisma.promptNode.update({
    where: { id: nodeId },
    data: { testVersion, testUserIds }
  });
}
