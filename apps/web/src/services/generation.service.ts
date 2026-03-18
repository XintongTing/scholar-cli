import { http } from './http';
import type { ApiResponse } from '../shared/types/api';

export async function pauseGeneration(projectId: string) {
  const res = await http.post<ApiResponse<{ paused: boolean }>>(`/projects/${projectId}/generation/pause`);
  return res.data.data!;
}

export async function resumeGeneration(projectId: string) {
  return `/api/v1/projects/${projectId}/generation/start`;
}

export function getGenerationUrl(projectId: string) {
  return `/api/v1/projects/${projectId}/generation/start`;
}
