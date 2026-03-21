import { http } from './http';
import type { ApiResponse } from '../shared/types/api';
import type { PromptNode } from '../features/admin/types';

export async function listNodes() {
  const res = await http.get<ApiResponse<PromptNode[]>>('/admin/prompts');
  return res.data.data!;
}

export async function getNode(nodeId: string) {
  const res = await http.get<ApiResponse<PromptNode>>(`/admin/prompts/${nodeId}`);
  return res.data.data!;
}

export async function updateContent(nodeId: string, content: string) {
  const res = await http.patch<ApiResponse<unknown>>(`/admin/prompts/${nodeId}`, { content });
  return res.data.data!;
}

export async function rollback(nodeId: string, targetVersion: number) {
  const res = await http.post<ApiResponse<PromptNode>>(`/admin/prompts/${nodeId}/rollback`, { targetVersion });
  return res.data.data!;
}

export async function setTestVersion(nodeId: string, version: number | null, testUserIds: string[]) {
  const res = await http.patch<ApiResponse<PromptNode>>(`/admin/prompts/${nodeId}/test`, { testVersion: version, testUserIds });
  return res.data.data!;
}

export async function getMetrics(nodeId: string) {
  const res = await http.get<ApiResponse<{ callCount: number; avgTokens: number }>>(`/admin/prompts/${nodeId}/metrics`);
  return res.data.data!;
}

export interface AiCallLogSummary {
  id: string;
  nodeName: string;
  projectId: string | null;
  userId: string | null;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  createdAt: string;
}

export interface AiCallLogDetail extends AiCallLogSummary {
  systemPrompt: string;
  messages: Array<{ role: string; content: string }>;
  output: string;
}

export async function listAiCallLogs(params?: { nodeName?: string; projectId?: string; cursor?: string; limit?: number }) {
  const query = new URLSearchParams();
  if (params?.nodeName) query.set('nodeName', params.nodeName);
  if (params?.projectId) query.set('projectId', params.projectId);
  if (params?.cursor) query.set('cursor', params.cursor);
  if (params?.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  const res = await http.get<ApiResponse<AiCallLogSummary[]>>(`/admin/ai-logs${qs ? `?${qs}` : ''}`);
  return res.data.data!;
}

export async function getAiCallLog(logId: string) {
  const res = await http.get<ApiResponse<AiCallLogDetail>>(`/admin/ai-logs/${logId}`);
  return res.data.data!;
}
