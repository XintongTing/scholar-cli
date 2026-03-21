import * as promptRepo from '../repositories/prompt.repository.js';
import { prisma } from '../db.js';

export async function listPromptNodes() {
  return promptRepo.findAll();
}

export async function getPromptNode(nodeId: string) {
  const node = await promptRepo.findById(nodeId);
  if (!node) throw Object.assign(new Error('提示词节点不存在'), { code: 'NOT_FOUND' });
  return node;
}

export async function updatePromptContent(nodeId: string, content: string, adminId: string) {
  return promptRepo.createVersion(nodeId, content, adminId);
}

export async function rollbackVersion(nodeId: string, targetVersion: number) {
  return promptRepo.rollbackToVersion(nodeId, targetVersion);
}

export async function setTestVersion(nodeId: string, testVersion: number | null, testUserIds: string[]) {
  return promptRepo.setTestVersion(nodeId, testVersion, testUserIds);
}

export async function getMetrics(nodeId: string) {
  const node = await promptRepo.findById(nodeId);
  if (!node) throw Object.assign(new Error('提示词节点不存在'), { code: 'NOT_FOUND' });
  return { callCount: node.callCount, avgTokens: node.avgTokens };
}

export async function listAiCallLogs(opts: {
  nodeName?: string;
  projectId?: string;
  cursor?: string;
  limit?: number;
}) {
  const { nodeName, projectId, cursor, limit = 50 } = opts;
  const where: Record<string, unknown> = {};
  if (nodeName) where.nodeName = nodeName;
  if (projectId) where.projectId = projectId;
  if (cursor) where.id = { lt: cursor };

  const logs = await prisma.aiCallLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      nodeName: true,
      projectId: true,
      userId: true,
      durationMs: true,
      inputTokens: true,
      outputTokens: true,
      createdAt: true,
      // Exclude large fields from list view
    }
  });
  return logs;
}

export async function getAiCallLog(logId: string) {
  const log = await prisma.aiCallLog.findUnique({ where: { id: logId } });
  if (!log) throw Object.assign(new Error('日志不存在'), { code: 'NOT_FOUND' });
  return log;
}
