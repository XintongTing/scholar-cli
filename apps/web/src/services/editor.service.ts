import { http } from './http';
import type { ApiResponse } from '../shared/types/api';
import type { Document } from '../features/editor/types';

export async function getDocument(projectId: string) {
  const res = await http.get<ApiResponse<Document>>(`/api/projects/${projectId}/document`);
  return res.data.data!;
}

export async function saveDocument(projectId: string, content: Record<string, unknown>) {
  const res = await http.patch<ApiResponse<Document>>(`/api/projects/${projectId}/document`, { content });
  return res.data.data!;
}

export async function exportDocx(projectId: string) {
  const res = await http.get<ApiResponse<{ content: unknown }>>(`/api/projects/${projectId}/document/export`);
  return res.data.data!;
}
