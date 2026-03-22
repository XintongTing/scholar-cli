import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as adminService from '../services/admin.service.js';
import { ok, fail } from '../utils/response.js';

const updatePromptSchema = z.object({
  content: z.string().min(1)
});

const testVersionSchema = z.object({
  testVersion: z.number().int().nullable(),
  testUserIds: z.array(z.string())
});

const rollbackSchema = z.object({
  targetVersion: z.number().int().positive()
});

const updateAiConfigSchema = z.object({
  apiKey: z.string().optional().nullable(),
  baseUrl: z.string().optional().nullable(),
});

export async function adminRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticateAdmin);

  fastify.get('/prompts', async (_request, reply) => {
    const nodes = await adminService.listPromptNodes();
    return reply.send(ok(nodes));
  });

  fastify.get('/prompts/:nodeId', async (request, reply) => {
    const { nodeId } = request.params as { nodeId: string };
    try {
      const node = await adminService.getPromptNode(nodeId);
      return reply.send(ok(node));
    } catch (err: any) {
      return reply.status(404).send(fail(err.code, err.message));
    }
  });

  fastify.patch('/prompts/:nodeId', async (request, reply) => {
    const { nodeId } = request.params as { nodeId: string };
    const user = (request as any).authUser as { id: string };
    const body = updatePromptSchema.parse(request.body);
    const node = await adminService.updatePromptContent(nodeId, body.content, user.id);
    return reply.send(ok(node));
  });

  fastify.post('/prompts/:nodeId/rollback', async (request, reply) => {
    const { nodeId } = request.params as { nodeId: string };
    const body = rollbackSchema.parse(request.body);
    const node = await adminService.rollbackVersion(nodeId, body.targetVersion);
    return reply.send(ok(node));
  });

  fastify.patch('/prompts/:nodeId/test', async (request, reply) => {
    const { nodeId } = request.params as { nodeId: string };
    const body = testVersionSchema.parse(request.body);
    const node = await adminService.setTestVersion(nodeId, body.testVersion, body.testUserIds);
    return reply.send(ok(node));
  });

  fastify.get('/prompts/:nodeId/metrics', async (request, reply) => {
    const { nodeId } = request.params as { nodeId: string };
    try {
      const metrics = await adminService.getMetrics(nodeId);
      return reply.send(ok(metrics));
    } catch (err: any) {
      return reply.status(404).send(fail(err.code, err.message));
    }
  });

  fastify.get('/ai-config', async (_request, reply) => {
    const data = await adminService.getAiConfig();
    return reply.send(ok(data));
  });

  fastify.patch('/ai-config', async (request, reply) => {
    const body = updateAiConfigSchema.parse(request.body);
    const data = await adminService.updateAiConfig(body);
    return reply.send(ok(data));
  });

  fastify.get('/ai-logs', async (request, reply) => {
    const query = request.query as { nodeName?: string; projectId?: string; cursor?: string; limit?: string };
    const logs = await adminService.listAiCallLogs({
      nodeName: query.nodeName,
      projectId: query.projectId,
      cursor: query.cursor,
      limit: query.limit ? parseInt(query.limit) : 50,
    });
    return reply.send(ok(logs));
  });

  fastify.get('/ai-logs/:logId', async (request, reply) => {
    const { logId } = request.params as { logId: string };
    try {
      const log = await adminService.getAiCallLog(logId);
      return reply.send(ok(log));
    } catch (err: any) {
      return reply.status(404).send(fail(err.code, err.message));
    }
  });
}
