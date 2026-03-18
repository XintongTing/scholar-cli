import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as authService from '../services/auth.service.js';
import { ok, fail } from '../utils/response.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1)
});

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);
    try {
      const result = await authService.register(body.email, body.password, body.name);
      return reply.status(201).send(ok(result));
    } catch (err: any) {
      return reply.status(400).send(fail(err.code || 'REGISTER_FAILED', err.message));
    }
  });

  fastify.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    try {
      const result = await authService.login(body.email, body.password);
      return reply.send(ok(result));
    } catch (err: any) {
      return reply.status(401).send(fail(err.code || 'LOGIN_FAILED', err.message));
    }
  });

  fastify.post('/refresh', async (request, reply) => {
    const body = refreshSchema.parse(request.body);
    try {
      const result = await authService.refreshToken(body.refreshToken);
      return reply.send(ok(result));
    } catch {
      return reply.status(401).send(fail('TOKEN_INVALID', 'Refresh token 无效'));
    }
  });

  fastify.get('/me', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = (request as any).authUser as { id: string };
    const result = await authService.getMe(user.id);
    return reply.send(ok(result));
  });
}
