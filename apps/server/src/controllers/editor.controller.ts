import type { FastifyRequest, FastifyReply } from 'fastify';
import * as editorService from '../services/editor.service.js';
import { ok } from '../utils/response.js';

export async function getDocument(request: FastifyRequest, reply: FastifyReply) {
  const { projectId } = request.params as { projectId: string };
  const result = await editorService.getDocument(projectId);
  return reply.send(ok(result));
}

export async function saveDocument(request: FastifyRequest, reply: FastifyReply) {
  const { projectId } = request.params as { projectId: string };
  const { content } = request.body as { content: Record<string, unknown> };
  const result = await editorService.saveDocument(projectId, content);
  return reply.send(ok(result));
}

export async function exportDocx(request: FastifyRequest, reply: FastifyReply) {
  const { projectId } = request.params as { projectId: string };
  const content = await editorService.exportDocx(projectId);
  return reply.send(ok({ content }));
}
