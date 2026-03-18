import type { FastifyRequest, FastifyReply } from 'fastify';
import * as literatureService from '../services/literature.service.js';
import { ok } from '../utils/response.js';

export async function list(request: FastifyRequest, reply: FastifyReply) {
  const { projectId } = request.params as { projectId: string };
  const result = await literatureService.getLiterature(projectId);
  return reply.send(ok(result));
}

export async function upload(request: FastifyRequest, reply: FastifyReply) {
  const { projectId } = request.params as { projectId: string };
  const data = await request.file();
  if (!data) throw Object.assign(new Error('No file uploaded'), { statusCode: 400 });
  const buffer = await data.toBuffer();
  const result = await literatureService.uploadLiterature(projectId, buffer, data.filename);
  return reply.code(201).send(ok(result));
}

export async function remove(request: FastifyRequest, reply: FastifyReply) {
  const { projectId, litId } = request.params as { projectId: string; litId: string };
  await literatureService.deleteLiterature(projectId, litId);
  return reply.code(204).send();
}

export async function confirm(request: FastifyRequest, reply: FastifyReply) {
  const { projectId } = request.params as { projectId: string };
  await literatureService.confirmLiterature(projectId);
  return reply.send(ok({ confirmed: true }));
}
