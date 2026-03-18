import type { FastifyRequest, FastifyReply } from 'fastify';
import * as generationService from '../services/generation.service.js';
import { ok } from '../utils/response.js';

export async function start(request: FastifyRequest, reply: FastifyReply) {
  const { projectId } = request.params as { projectId: string };
  const user = (request as any).authUser as { id: string };

  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  await generationService.startGeneration(
    projectId,
    user.id,
    (event: string, data: object) => {
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    },
    () => {
      reply.raw.write(`event: done\ndata: {}\n\n`);
      reply.raw.end();
    },
  );
}

export async function pause(request: FastifyRequest, reply: FastifyReply) {
  const { projectId } = request.params as { projectId: string };
  await generationService.pauseGeneration(projectId);
  return reply.send(ok({ paused: true }));
}
