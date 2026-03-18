import type { FastifyRequest, FastifyReply } from 'fastify';
import * as authService from '../services/auth.service.js';
import { ok, fail } from '../utils/response.js';

export async function register(request: FastifyRequest, reply: FastifyReply) {
  const { email, password, name } = request.body as { email: string; password: string; name?: string };
  const result = await authService.register(email, password, name);
  return reply.code(201).send(ok(result));
}

export async function login(request: FastifyRequest, reply: FastifyReply) {
  const { email, password } = request.body as { email: string; password: string };
  const result = await authService.login(email, password);
  return reply.send(ok(result));
}

export async function refresh(request: FastifyRequest, reply: FastifyReply) {
  const { refreshToken } = request.body as { refreshToken: string };
  const result = await authService.refreshToken(refreshToken);
  return reply.send(ok(result));
}

export async function me(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: string };
  const result = await authService.getMe(user.id);
  return reply.send(ok(result));
}
