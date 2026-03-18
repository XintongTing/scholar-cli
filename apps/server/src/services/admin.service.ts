import * as promptRepo from '../repositories/prompt.repository.js';

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
