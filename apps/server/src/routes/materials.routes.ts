import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as materialsService from '../services/materials.service.js';
import { ok, fail } from '../utils/response.js';

const textSchema = z.object({
  text: z.string().optional(),
  skip: z.boolean().optional()
});

export async function materialsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/:projectId/materials/questions', async (_request, reply) => {
    return reply.send(ok(materialsService.getQuestions()));
  });

  fastify.get('/:projectId/materials', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const items = await materialsService.getMaterials(projectId);
    return reply.send(ok(items));
  });

  fastify.post('/:projectId/materials/:key', async (request, reply) => {
    const { projectId, key } = request.params as { projectId: string; key: string };
    const contentType = request.headers['content-type'] || '';

    if (contentType.includes('multipart/form-data')) {
      const data = await request.file();
      if (!data) return reply.status(400).send(fail('NO_FILE', '未上传文件'));
      const buffer = await data.toBuffer();
      const item = await materialsService.submitMaterial(projectId, key, {
        file: buffer,
        filename: data.filename,
        contentType: data.mimetype
      });
      return reply.send(ok(item));
    } else {
      const body = textSchema.parse(request.body);
      const item = await materialsService.submitMaterial(projectId, key, {
        text: body.text,
        skip: body.skip
      });
      return reply.send(ok(item));
    }
  });

  fastify.post('/:projectId/materials/confirm', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const project = await materialsService.confirmMaterials(projectId);
    return reply.send(ok(project));
  });
}
