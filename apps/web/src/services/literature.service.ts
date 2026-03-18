import { http } from './http';
import type { ApiResponse } from '../shared/types/api';
import type { Literature } from '../features/literature/types';

export async function getLiterature(projectId: string) {
  const res = await http.get<ApiResponse<Literature[]>>(`/api/projects/${projectId}/literature`);
  return res.data.data!;
}

export async function uploadLiterature(projectId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await http.post<ApiResponse<Literature>>(`/api/projects/${projectId}/literature`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data!;
}

export async function deleteLiterature(projectId: string, litId: string) {
  await http.delete(`/api/projects/${projectId}/literature/${litId}`);
}

export async function confirmLiterature(projectId: string) {
  const res = await http.post<ApiResponse<{ confirmed: boolean }>>(`/api/projects/${projectId}/literature/confirm`);
  return res.data.data!;
}
