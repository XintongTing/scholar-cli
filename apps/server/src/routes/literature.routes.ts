import type { FastifyInstance } from 'fastify';
import * as litService from '../services/literature.service.js';
import { ok, fail } from '../utils/response.js';

export async function literatureRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/:projectId/literature', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const items = await litService.getLiterature(projectId);
    return reply.send(ok(items));
  });

  fastify.post('/:projectId/literature/upload', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const data = await request.file();
    if (!data) return reply.status(400).send(fail('NO_FILE', '未上传文件'));

    const buffer = await data.toBuffer();
    try {
      const lit = await litService.uploadLiterature(projectId, buffer, data.filename);
      return reply.status(201).send(ok(lit));
    } catch (err: any) {
      return reply.status(500).send(fail('UPLOAD_FAILED', err.message));
    }
  });

  fastify.post('/:projectId/literature/text', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const { title, text } = request.body as { title: string; text: string };
    if (!text?.trim()) return reply.status(400).send(fail('NO_TEXT', '文本内容不能为空'));
    try {
      const lit = await litService.uploadLiteratureText(projectId, title || '粘贴文献', text);
      return reply.status(201).send(ok(lit));
    } catch (err: any) {
      return reply.status(500).send(fail('UPLOAD_FAILED', err.message));
    }
  });

  fastify.delete('/:projectId/literature/:litId', async (request, reply) => {
    const { projectId, litId } = request.params as { projectId: string; litId: string };
    try {
      await litService.deleteLiterature(projectId, litId);
      return reply.send(ok(null));
    } catch (err: any) {
      return reply.status(404).send(fail(err.code || 'DELETE_FAILED', err.message));
    }
  });

  fastify.post('/:projectId/literature/confirm', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const project = await litService.confirmLiterature(projectId);
    return reply.send(ok(project));
  });
}
