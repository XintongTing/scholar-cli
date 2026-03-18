import { http } from './http';
import type { ApiResponse } from '../shared/types/api';
import type { Outline, Chapter } from '../features/outline/types';

export async function getOutline(projectId: string) {
  const res = await http.get<ApiResponse<Outline>>(`/api/projects/${projectId}/outline`);
  return res.data.data!;
}

export async function updateOutline(projectId: string, data: { title?: string; abstract?: string }) {
  const res = await http.patch<ApiResponse<Outline>>(`/api/projects/${projectId}/outline`, data);
  return res.data.data!;
}

export async function addChapter(projectId: string, data: { title: string; description?: string; wordCountTarget?: number }) {
  const res = await http.post<ApiResponse<Chapter>>(`/api/projects/${projectId}/outline/chapters`, data);
  return res.data.data!;
}

export async function updateChapter(projectId: string, chapterId: string, data: { title?: string; description?: string; wordCountTarget?: number; order?: number }) {
  const res = await http.patch<ApiResponse<Chapter>>(`/api/projects/${projectId}/outline/chapters/${chapterId}`, data);
  return res.data.data!;
}

export async function deleteChapter(projectId: string, chapterId: string) {
  await http.delete(`/api/projects/${projectId}/outline/chapters/${chapterId}`);
}

export async function confirmOutline(projectId: string) {
  const res = await http.post<ApiResponse<{ confirmed: boolean }>>(`/api/projects/${projectId}/outline/confirm`);
  return res.data.data!;
}
