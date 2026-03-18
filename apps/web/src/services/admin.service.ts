import { http } from './http';
import type { ApiResponse } from '../shared/types/api';
import type { PromptNode } from '../features/admin/types';

export async function listNodes() {
  const res = await http.get<ApiResponse<PromptNode[]>>('/api/admin/nodes');
  return res.data.data!;
}

export async function getNode(nodeId: string) {
  const res = await http.get<ApiResponse<PromptNode>>(`/api/admin/nodes/${nodeId}`);
  return res.data.data!;
}

export async function updateContent(nodeId: string, content: string) {
  const res = await http.patch<ApiResponse<unknown>>(`/api/admin/nodes/${nodeId}/content`, { content });
  return res.data.data!;
}

export async function rollback(nodeId: string, targetVersion: number) {
  const res = await http.post<ApiResponse<PromptNode>>(`/api/admin/nodes/${nodeId}/rollback`, { targetVersion });
  return res.data.data!;
}

export async function setTestVersion(nodeId: string, version: number | null, testUserIds: string[]) {
  const res = await http.post<ApiResponse<PromptNode>>(`/api/admin/nodes/${nodeId}/test-version`, { version, testUserIds });
  return res.data.data!;
}

export async function getMetrics(nodeId: string) {
  const res = await http.get<ApiResponse<{ callCount: number; avgTokens: number }>>(`/api/admin/nodes/${nodeId}/metrics`);
  return res.data.data!;
}
