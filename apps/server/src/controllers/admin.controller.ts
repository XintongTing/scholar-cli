import type { FastifyRequest, FastifyReply } from 'fastify';
import * as adminService from '../services/admin.service.js';
import { ok } from '../utils/response.js';

export async function listNodes(_request: FastifyRequest, reply: FastifyReply) {
  const result = await adminService.listPromptNodes();
  return reply.send(ok(result));
}

export async function getNode(request: FastifyRequest, reply: FastifyReply) {
  const { nodeId } = request.params as { nodeId: string };
  const result = await adminService.getPromptNode(nodeId);
  return reply.send(ok(result));
}

export async function updateContent(request: FastifyRequest, reply: FastifyReply) {
  const { nodeId } = request.params as { nodeId: string };
  const user = request.user as { id: string };
  const { content } = request.body as { content: string };
  const result = await adminService.updatePromptContent(nodeId, content, user.id);
  return reply.send(ok(result));
}

export async function rollback(request: FastifyRequest, reply: FastifyReply) {
  const { nodeId } = request.params as { nodeId: string };
  const { targetVersion } = request.body as { targetVersion: number };
  const result = await adminService.rollbackVersion(nodeId, targetVersion);
  return reply.send(ok(result));
}

export async function setTestVersion(request: FastifyRequest, reply: FastifyReply) {
  const { nodeId } = request.params as { nodeId: string };
  const { version, testUserIds } = request.body as { version: number | null; testUserIds: string[] };
  const result = await adminService.setTestVersion(nodeId, version, testUserIds);
  return reply.send(ok(result));
}

export async function getMetrics(request: FastifyRequest, reply: FastifyReply) {
  const { nodeId } = request.params as { nodeId: string };
  const result = await adminService.getMetrics(nodeId);
  return reply.send(ok(result));
}
