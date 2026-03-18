import * as projectRepo from '../repositories/project.repository.js';

export async function listProjects(userId: string, cursor?: string, limit = 20) {
  const items = await projectRepo.findByUserId(userId, cursor, limit);
  const hasMore = items.length > limit;
  if (hasMore) items.pop();
  return {
    items,
    cursor: hasMore ? items[items.length - 1]?.id ?? null : null,
    hasMore
  };
}

export async function createProject(userId: string, userProfile: Record<string, string>) {
  const project = await projectRepo.create(userId, userProfile);
  // Set project title from goal
  const title = userProfile.goal
    ? userProfile.goal.slice(0, 50)
    : '未命名项目';
  await projectRepo.updateTitle(project.id, title);
  return projectRepo.findById(project.id);
}

export async function getProject(userId: string, projectId: string) {
  const project = await projectRepo.findById(projectId);
  if (!project) throw Object.assign(new Error('项目不存在'), { code: 'NOT_FOUND' });
  if (project.userId !== userId) throw Object.assign(new Error('无权访问'), { code: 'FORBIDDEN' });
  return project;
}

export async function deleteProject(userId: string, projectId: string) {
  const project = await projectRepo.findById(projectId);
  if (!project) throw Object.assign(new Error('项目不存在'), { code: 'NOT_FOUND' });
  if (project.userId !== userId) throw Object.assign(new Error('无权访问'), { code: 'FORBIDDEN' });
  await projectRepo.deleteById(projectId);
}
