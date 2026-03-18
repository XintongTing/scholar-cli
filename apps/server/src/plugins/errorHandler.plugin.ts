import type { FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';
import { fail } from '../utils/response.js';
import { logger } from '../utils/logger.js';

const errorHandlerPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler((error: any, _request, reply) => {
    if (error instanceof ZodError) {
      const message = error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join('; ');
      return reply.code(400).send(fail('VALIDATION_ERROR', message));
    }
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return reply.code(401).send(fail('UNAUTHORIZED', 'Invalid or expired token'));
    }
    if (error.code === 'P2025') {
      return reply.code(404).send(fail('NOT_FOUND', 'Resource not found'));
    }
    if (error.code === 'P2002') {
      return reply.code(409).send(fail('CONFLICT', 'Resource already exists'));
    }
    if (error.statusCode) {
      return reply.code(error.statusCode).send(fail('HTTP_ERROR', error.message));
    }
    logger.error({ err: error }, 'Unhandled error');
    return reply.code(500).send(fail('INTERNAL_ERROR', 'An unexpected error occurred'));
  });
};

export default errorHandlerPlugin;
