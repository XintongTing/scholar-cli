import type { FastifyInstance } from 'fastify';
import * as genService from '../services/generation.service.js';
import { ok, fail } from '../utils/response.js';

export async function generationRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.post('/:projectId/generation/start', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const user = (request as any).authUser as { id: string };

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');
    reply.raw.flushHeaders();

    const sendEvent = (event: string, data: object) => {
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      await genService.startGeneration(
        projectId,
        user.id,
        sendEvent,
        () => reply.raw.end()
      );
    } catch (err: any) {
      sendEvent('error', { type: 'error', code: 'GENERATION_FAILED', message: err.message });
      reply.raw.end();
    }
  });

  fastify.post('/:projectId/generation/pause', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    try {
      await genService.pauseGeneration(projectId);
      return reply.send(ok(null));
    } catch (err: any) {
      return reply.status(500).send(fail('PAUSE_FAILED', err.message));
    }
  });
}
