import { http } from './http';
import type { ApiResponse, PaginatedResponse } from '../shared/types/api';
import type { Project } from '../features/projects/types';

export async function listProjects(cursor?: string, limit = 20) {
  const res = await http.get<ApiResponse<PaginatedResponse<Project>>>('/api/projects', {
    params: { cursor, limit },
  });
  return res.data.data!;
}

export async function createProject(userProfile: Record<string, unknown>, title?: string) {
  const res = await http.post<ApiResponse<Project>>('/api/projects', { userProfile, title });
  return res.data.data!;
}

export async function getProject(projectId: string) {
  const res = await http.get<ApiResponse<Project>>(`/api/projects/${projectId}`);
  return res.data.data!;
}

export async function deleteProject(projectId: string) {
  await http.delete(`/api/projects/${projectId}`);
}
