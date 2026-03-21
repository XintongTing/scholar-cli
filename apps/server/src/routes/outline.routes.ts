import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as outlineService from '../services/outline.service.js';
import { ok } from '../utils/response.js';

const updateOutlineSchema = z.object({
  title: z.string().optional(),
  abstract: z.string().optional()
});

const addChapterSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  wordCountTarget: z.number().int().positive().optional(),
  level: z.number().int().min(1).max(3).optional(),
  parentId: z.string().optional()
});

const updateChapterSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  wordCountTarget: z.number().int().positive().optional(),
  order: z.number().int().positive().optional(),
  level: z.number().int().min(1).max(3).optional(),
  parentId: z.string().nullable().optional(),
  collapsed: z.boolean().optional()
});

const chatSchema = z.object({
  message: z.string().min(1),
  fileContents: z.array(z.object({
    name: z.string(),
    content: z.string()
  })).optional()
});

export async function outlineRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/:projectId/outline', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const outline = await outlineService.getOutline(projectId);
    return reply.send(ok(outline));
  });

  fastify.patch('/:projectId/outline', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const body = updateOutlineSchema.parse(request.body);
    const outline = await outlineService.updateOutline(projectId, body);
    return reply.send(ok(outline));
  });

  fastify.post('/:projectId/outline/chapters', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const body = addChapterSchema.parse(request.body);
    const chapter = await outlineService.addChapter(projectId, body);
    return reply.status(201).send(ok(chapter));
  });

  fastify.patch('/:projectId/outline/chapters/:chapterId', async (request, reply) => {
    const { projectId, chapterId } = request.params as { projectId: string; chapterId: string };
    const body = updateChapterSchema.parse(request.body);
    const chapter = await outlineService.updateChapter(projectId, chapterId, body);
    return reply.send(ok(chapter));
  });

  fastify.delete('/:projectId/outline/chapters/:chapterId', async (request, reply) => {
    const { projectId, chapterId } = request.params as { projectId: string; chapterId: string };
    await outlineService.deleteChapter(projectId, chapterId);
    return reply.send(ok(null));
  });

  fastify.post('/:projectId/outline/confirm', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const project = await outlineService.confirmOutline(projectId);
    return reply.send(ok(project));
  });

  fastify.get('/:projectId/outline/chat', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const history = await outlineService.getChatHistory(projectId);
    return reply.send(ok(history));
  });

  fastify.post('/:projectId/outline/chat', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const user = (request as any).authUser as { id: string };
    const body = chatSchema.parse(request.body);

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');
    reply.raw.flushHeaders();

    const sendEvent = (event: string, data: object) => {
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      await outlineService.processChatMessage(
        projectId,
        user.id,
        body.message,
        body.fileContents,
        (chunk) => sendEvent('chunk', { type: 'text', content: chunk }),
        () => {
          sendEvent('done', { type: 'done' });
          reply.raw.end();
        }
      );
    } catch (err: any) {
      sendEvent('error', { type: 'error', code: 'GENERATION_FAILED', message: err.message });
      reply.raw.end();
    }
  });
}
