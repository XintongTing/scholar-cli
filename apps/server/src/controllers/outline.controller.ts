import type { FastifyRequest, FastifyReply } from 'fastify';
import * as outlineService from '../services/outline.service.js';
import { ok } from '../utils/response.js';

export async function getOutline(request: FastifyRequest, reply: FastifyReply) {
  const { projectId } = request.params as { projectId: string };
  const result = await outlineService.getOutline(projectId);
  return reply.send(ok(result));
}

export async function updateOutline(request: FastifyRequest, reply: FastifyReply) {
  const { projectId } = request.params as { projectId: string };
  const data = request.body as { title?: string; abstract?: string };
  const result = await outlineService.updateOutline(projectId, data);
  return reply.send(ok(result));
}

export async function addChapter(request: FastifyRequest, reply: FastifyReply) {
  const { projectId } = request.params as { projectId: string };
  const data = request.body as { title: string; description?: string; wordCountTarget?: number };
  const result = await outlineService.addChapter(projectId, data);
  return reply.code(201).send(ok(result));
}

export async function updateChapter(request: FastifyRequest, reply: FastifyReply) {
  const { projectId, chapterId } = request.params as { projectId: string; chapterId: string };
  const data = request.body as { title?: string; description?: string; wordCountTarget?: number; order?: number };
  const result = await outlineService.updateChapter(projectId, chapterId, data);
  return reply.send(ok(result));
}

export async function deleteChapter(request: FastifyRequest, reply: FastifyReply) {
  const { projectId, chapterId } = request.params as { projectId: string; chapterId: string };
  await outlineService.deleteChapter(projectId, chapterId);
  return reply.code(204).send();
}

export async function confirmOutline(request: FastifyRequest, reply: FastifyReply) {
  const { projectId } = request.params as { projectId: string };
  await outlineService.confirmOutline(projectId);
  return reply.send(ok({ confirmed: true }));
}

export async function chat(request: FastifyRequest, reply: FastifyReply) {
  const { projectId } = request.params as { projectId: string };
  const user = request.user as { id: string };
  const { message } = request.body as { message: string };

  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  await outlineService.processChatMessage(
    projectId,
    user.id,
    message,
    (chunk) => {
      reply.raw.write(`event: chunk\ndata: ${JSON.stringify({ text: chunk })}\n\n`);
    },
    () => {
      reply.raw.write(`event: done\ndata: {}\n\n`);
      reply.raw.end();
    },
  );
}
