import * as promptRepo from '../repositories/prompt.repository.js';
import * as appConfigRepo from '../repositories/app-config.repository.js';
import type { AppConfigRow } from '../repositories/app-config.repository.js';
import { prisma } from '../db.js';

const ANTHROPIC_API_KEY = 'anthropic.apiKey';
const ANTHROPIC_BASE_URL = 'anthropic.baseUrl';

export async function listPromptNodes() {
  return promptRepo.findAll();
}

export async function getPromptNode(nodeId: string) {
  const node = await promptRepo.findById(nodeId);
  if (!node) throw Object.assign(new Error('Prompt node not found'), { code: 'NOT_FOUND' });
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
  if (!node) throw Object.assign(new Error('Prompt node not found'), { code: 'NOT_FOUND' });
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

  return prisma.aiCallLog.findMany({
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
    }
  });
}

export async function getAiCallLog(logId: string) {
  const log = await prisma.aiCallLog.findUnique({ where: { id: logId } });
  if (!log) throw Object.assign(new Error('AI call log not found'), { code: 'NOT_FOUND' });
  return log;
}

function maskSecret(value: string) {
  if (!value) return '';
  if (value.length <= 8) return `${value.slice(0, 2)}***`;
  return `${value.slice(0, 4)}***${value.slice(-4)}`;
}

export async function getAiConfig() {
  const rows = await appConfigRepo.findMany([ANTHROPIC_API_KEY, ANTHROPIC_BASE_URL]);
  const map = new Map(rows.map((row: AppConfigRow) => [row.key, row.value]));

  const dbApiKey = map.get(ANTHROPIC_API_KEY) || '';
  const dbBaseUrl = map.get(ANTHROPIC_BASE_URL) || '';
  const envApiKey = process.env.ANTHROPIC_API_KEY || '';
  const envBaseUrl = process.env.ANTHROPIC_BASE_URL || '';

  const effectiveApiKey = dbApiKey || envApiKey;
  const effectiveBaseUrl = dbBaseUrl || envBaseUrl;

  return {
    apiKeyMasked: effectiveApiKey ? maskSecret(effectiveApiKey) : '',
    hasApiKey: Boolean(effectiveApiKey),
    apiKeySource: dbApiKey ? 'database' : envApiKey ? 'env' : 'unset',
    baseUrl: effectiveBaseUrl,
    baseUrlSource: dbBaseUrl ? 'database' : envBaseUrl ? 'env' : 'unset',
  };
}

export async function updateAiConfig(input: { apiKey?: string | null; baseUrl?: string | null }) {
  if (input.apiKey !== undefined) {
    const normalized = (input.apiKey ?? '').trim();
    if (normalized) await appConfigRepo.upsert(ANTHROPIC_API_KEY, normalized);
    else await appConfigRepo.remove(ANTHROPIC_API_KEY);
  }

  if (input.baseUrl !== undefined) {
    const normalized = (input.baseUrl ?? '').trim();
    if (normalized) await appConfigRepo.upsert(ANTHROPIC_BASE_URL, normalized);
    else await appConfigRepo.remove(ANTHROPIC_BASE_URL);
  }

  return getAiConfig();
}
