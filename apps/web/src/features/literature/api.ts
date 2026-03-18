import { http } from '../../services/http';

export const literatureApi = {
  list: (projectId: string) => http.get(`/projects/${projectId}/literature`),
  upload: (projectId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return http.post(`/projects/${projectId}/literature/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadText: (projectId: string, data: { title: string; text: string }) =>
    http.post(`/projects/${projectId}/literature/text`, data),
  delete: (projectId: string, litId: string) =>
    http.delete(`/projects/${projectId}/literature/${litId}`),
  confirm: (projectId: string) =>
    http.post(`/projects/${projectId}/literature/confirm`),
};

export const getLiterature = (projectId: string) =>
  literatureApi.list(projectId).then(res => res.data.data);
export const uploadLiterature = (projectId: string, file: File) =>
  literatureApi.upload(projectId, file).then(res => res.data.data);
export const deleteLiterature = (projectId: string, litId: string) =>
  literatureApi.delete(projectId, litId).then(res => res.data.data);
export const confirmLiterature = (projectId: string) =>
  literatureApi.confirm(projectId).then(res => res.data.data);
