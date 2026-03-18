import { http } from '../../services/http';

export const outlineApi = {
  get: (projectId: string) => http.get(`/projects/${projectId}/outline`),
  update: (projectId: string, data: { title?: string; abstract?: string }) =>
    http.patch(`/projects/${projectId}/outline`, data),
  addChapter: (projectId: string, data: { title: string; description?: string; wordCountTarget?: number }) =>
    http.post(`/projects/${projectId}/outline/chapters`, data),
  updateChapter: (projectId: string, chapterId: string, data: object) =>
    http.patch(`/projects/${projectId}/outline/chapters/${chapterId}`, data),
  deleteChapter: (projectId: string, chapterId: string) =>
    http.delete(`/projects/${projectId}/outline/chapters/${chapterId}`),
  confirm: (projectId: string) =>
    http.post(`/projects/${projectId}/outline/confirm`),
  getChatHistory: (projectId: string) =>
    http.get(`/projects/${projectId}/outline/chat`),
};

export const getOutline = (projectId: string) => outlineApi.get(projectId).then(res => res.data.data);
export const addChapter = (projectId: string, data: { title: string; description?: string; wordCountTarget?: number }) =>
  outlineApi.addChapter(projectId, data).then(res => res.data.data);
export const updateChapter = (projectId: string, chapterId: string, data: object) =>
  outlineApi.updateChapter(projectId, chapterId, data).then(res => res.data.data);
export const deleteChapter = (projectId: string, chapterId: string) =>
  outlineApi.deleteChapter(projectId, chapterId).then(res => res.data.data);
export const confirmOutline = (projectId: string) =>
  outlineApi.confirm(projectId).then(res => res.data.data);
