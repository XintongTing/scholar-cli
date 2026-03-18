import { http } from '../../services/http';

export const materialsApi = {
  getQuestions: (projectId: string) =>
    http.get(`/projects/${projectId}/materials/questions`),
  list: (projectId: string) =>
    http.get(`/projects/${projectId}/materials`),
  submitText: (projectId: string, key: string, text: string) =>
    http.post(`/projects/${projectId}/materials/${key}`, { text }),
  skip: (projectId: string, key: string) =>
    http.post(`/projects/${projectId}/materials/${key}`, { skip: true }),
  uploadFile: (projectId: string, key: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return http.post(`/projects/${projectId}/materials/${key}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  confirm: (projectId: string) =>
    http.post(`/projects/${projectId}/materials/confirm`),
};

export const getQuestions = (projectId?: string) =>
  materialsApi.getQuestions(projectId ?? '').then(res => res.data.data);
export const getMaterials = (projectId: string) =>
  materialsApi.list(projectId).then(res => res.data.data);
export const submitMaterialText = (projectId: string, key: string, text: string) =>
  materialsApi.submitText(projectId, key, text).then(res => res.data.data);
export const submitMaterialFile = (projectId: string, key: string, file: File) =>
  materialsApi.uploadFile(projectId, key, file).then(res => res.data.data);
export const skipMaterial = (projectId: string, key: string) =>
  materialsApi.skip(projectId, key).then(res => res.data.data);
export const confirmMaterials = (projectId: string) =>
  materialsApi.confirm(projectId).then(res => res.data.data);
