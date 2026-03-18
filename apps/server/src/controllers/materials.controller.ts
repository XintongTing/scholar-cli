import type { FastifyRequest, FastifyReply } from 'fastify';
import * as materialsService from '../services/materials.service.js';
import { ok } from '../utils/response.js';

export async function getQuestions(_request: FastifyRequest, reply: FastifyReply) {
  const result = materialsService.getQuestions();
  return reply.send(ok(result));
}

export async function list(request: FastifyRequest, reply: FastifyReply) {
  const { projectId } = request.params as { projectId: string };
  const result = await materialsService.getMaterials(projectId);
  return reply.send(ok(result));
}

export async function submit(request: FastifyRequest, reply: FastifyReply) {
  const { projectId, questionKey } = request.params as { projectId: string; questionKey: string };

  const contentType = request.headers['content-type'] ?? '';

  if (contentType.includes('multipart/form-data')) {
    const data = await request.file();
    if (!data) throw Object.assign(new Error('No file uploaded'), { statusCode: 400 });
    const buffer = await data.toBuffer();
    const result = await materialsService.submitMaterial(projectId, questionKey, {
      file: buffer,
      filename: data.filename,
      contentType: data.mimetype,
    });
    return reply.send(ok(result));
  } else {
    const body = request.body as { text?: string; skip?: boolean };
    const result = await materialsService.submitMaterial(projectId, questionKey, {
      text: body.text,
      skip: body.skip,
    });
    return reply.send(ok(result));
  }
}

export async function confirm(request: FastifyRequest, reply: FastifyReply) {
  const { projectId } = request.params as { projectId: string };
  await materialsService.confirmMaterials(projectId);
  return reply.send(ok({ confirmed: true }));
}
