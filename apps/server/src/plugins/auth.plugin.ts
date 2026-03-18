import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: any) => Promise<void>;
    authenticateAdmin: (request: FastifyRequest, reply: any) => Promise<void>;
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('authenticate', async (request: FastifyRequest & { authUser?: AuthUser }, reply: any) => {
    const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return reply.status(401).send({ data: null, error: { code: 'UNAUTHORIZED', message: '未登录' }, meta: {} });
    }
    try {
      const token = auth.slice(7);
      const payload = jwt.verify(token, config.jwt.secret) as AuthUser;
      (request as any).authUser = payload;
    } catch {
      return reply.status(401).send({ data: null, error: { code: 'TOKEN_EXPIRED', message: 'Token 已过期' }, meta: {} });
    }
  });

  fastify.decorate('authenticateAdmin', async (request: FastifyRequest, reply: any) => {
    await (fastify as any).authenticate(request, reply);
    const user = (request as any).authUser as AuthUser | undefined;
    if (!user || user.role !== 'ADMIN') {
      return reply.status(403).send({ data: null, error: { code: 'FORBIDDEN', message: '需要管理员权限' }, meta: {} });
    }
  });
};

export default fp(authPlugin);
