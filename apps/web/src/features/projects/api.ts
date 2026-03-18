import { http } from '../../services/http';

export const projectApi = {
  list: (cursor?: string, limit = 20) =>
    http.get('/projects', { params: { cursor, limit } }),
  create: (userProfile: Record<string, string>, title?: string) =>
    http.post('/projects', { userProfile, title }),
  get: (id: string) => http.get(`/projects/${id}`),
  delete: (id: string) => http.delete(`/projects/${id}`),
};

export const listProjects = () => projectApi.list().then(res => res.data.data);
export const createProject = (userProfile: Record<string, unknown>, title?: string) =>
  projectApi.create(userProfile as Record<string, string>, title).then(res => res.data.data);
export const getProject = (id: string) => projectApi.get(id).then(res => res.data.data);
export const deleteProject = (id: string) => projectApi.delete(id).then(res => res.data.data);
