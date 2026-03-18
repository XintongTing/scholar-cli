import { http } from './http';
import type { ApiResponse } from '../shared/types/api';
import type { Material, MaterialQuestion } from '../features/materials/types';

export async function getQuestions() {
  const res = await http.get<ApiResponse<MaterialQuestion[]>>('/api/projects/questions');
  return res.data.data!;
}

export async function getMaterials(projectId: string) {
  const res = await http.get<ApiResponse<Material[]>>(`/api/projects/${projectId}/materials`);
  return res.data.data!;
}

export async function submitMaterialText(projectId: string, questionKey: string, text: string) {
  const res = await http.post<ApiResponse<Material>>(`/api/projects/${projectId}/materials/${questionKey}`, { text });
  return res.data.data!;
}

export async function submitMaterialFile(projectId: string, questionKey: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await http.post<ApiResponse<Material>>(`/api/projects/${projectId}/materials/${questionKey}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data!;
}

export async function skipMaterial(projectId: string, questionKey: string) {
  const res = await http.post<ApiResponse<Material>>(`/api/projects/${projectId}/materials/${questionKey}`, { skip: true });
  return res.data.data!;
}

export async function confirmMaterials(projectId: string) {
  const res = await http.post<ApiResponse<{ confirmed: boolean }>>(`/api/projects/${projectId}/materials/confirm`);
  return res.data.data!;
}
