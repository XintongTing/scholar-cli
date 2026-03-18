import type { FastifyRequest, FastifyReply } from 'fastify';
import * as projectService from '../services/project.service.js';
import { ok } from '../utils/response.js';

export async function list(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as any).authUser as { id: string };
  const { cursor, limit } = request.query as { cursor?: string; limit?: string };
  const result = await projectService.listProjects(user.id, cursor, limit ? parseInt(limit, 10) : 20);
  return reply.send(ok(result));
}

export async function create(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as any).authUser as { id: string };
  const { userProfile } = request.body as { userProfile: Record<string, string> };
  const result = await projectService.createProject(user.id, userProfile);
  return reply.code(201).send(ok(result));
}

export async function get(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as any).authUser as { id: string };
  const { projectId } = request.params as { projectId: string };
  const result = await projectService.getProject(user.id, projectId);
  return reply.send(ok(result));
}

export async function remove(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as any).authUser as { id: string };
  const { projectId } = request.params as { projectId: string };
  await projectService.deleteProject(user.id, projectId);
  return reply.code(204).send();
}
