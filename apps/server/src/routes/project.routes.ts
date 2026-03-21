import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as projectService from '../services/project.service.js';
import { ok, fail } from '../utils/response.js';

const createSchema = z.object({
  userProfile: z.object({
    identity: z.string(),
    paperType: z.string(),
    field: z.string(),
    goal: z.string(),
    outlineLevel: z.string().optional()
  })
});

export async function projectRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/', async (request, reply) => {
    const user = (request as any).authUser as { id: string };
    const query = request.query as { cursor?: string; limit?: string };
    const result = await projectService.listProjects(
      user.id,
      query.cursor,
      query.limit ? parseInt(query.limit) : 20
    );
    return reply.send(ok(result));
  });

  fastify.post('/', async (request, reply) => {
    const user = (request as any).authUser as { id: string };
    const body = createSchema.parse(request.body);
    const project = await projectService.createProject(user.id, body.userProfile);
    return reply.status(201).send(ok(project));
  });

  fastify.get('/:id', async (request, reply) => {
    const user = (request as any).authUser as { id: string };
    const { id } = request.params as { id: string };
    try {
      const project = await projectService.getProject(user.id, id);
      return reply.send(ok(project));
    } catch (err: any) {
      const status = err.code === 'NOT_FOUND' ? 404 : err.code === 'FORBIDDEN' ? 403 : 500;
      return reply.status(status).send(fail(err.code, err.message));
    }
  });

  fastify.delete('/:id', async (request, reply) => {
    const user = (request as any).authUser as { id: string };
    const { id } = request.params as { id: string };
    try {
      await projectService.deleteProject(user.id, id);
      return reply.send(ok(null));
    } catch (err: any) {
      const status = err.code === 'NOT_FOUND' ? 404 : err.code === 'FORBIDDEN' ? 403 : 500;
      return reply.status(status).send(fail(err.code, err.message));
    }
  });
}
