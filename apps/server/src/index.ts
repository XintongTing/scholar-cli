import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwtPlugin from '@fastify/jwt';
import multipart from '@fastify/multipart';
import { config } from './config.js';
import { logger } from './utils/logger.js';
import authPlugin from './plugins/auth.plugin.js';
import { authRoutes } from './routes/auth.routes.js';
import { projectRoutes } from './routes/project.routes.js';
import { outlineRoutes } from './routes/outline.routes.js';
import { literatureRoutes } from './routes/literature.routes.js';
import { materialsRoutes } from './routes/materials.routes.js';
import { generationRoutes } from './routes/generation.routes.js';
import { adminRoutes } from './routes/admin.routes.js';
import { editorRoutes } from './routes/editor.routes.js';
import { initDefaultPrompts } from './ai/prompt-registry.js';

const fastify = Fastify({ logger: false });

await fastify.register(cors, {
  origin: config.server.corsOrigin,
  credentials: true
});

await fastify.register(jwtPlugin, { secret: config.jwt.secret });
await fastify.register(multipart, { limits: { fileSize: 20 * 1024 * 1024 } });
await fastify.register(authPlugin);

// Routes
await fastify.register(authRoutes, { prefix: '/api/v1/auth' });
await fastify.register(projectRoutes, { prefix: '/api/v1/projects' });
await fastify.register(outlineRoutes, { prefix: '/api/v1/projects' });
await fastify.register(literatureRoutes, { prefix: '/api/v1/projects' });
await fastify.register(materialsRoutes, { prefix: '/api/v1/projects' });
await fastify.register(generationRoutes, { prefix: '/api/v1/projects' });
await fastify.register(editorRoutes, { prefix: '/api/v1/projects' });
await fastify.register(adminRoutes, { prefix: '/api/v1/admin' });

fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

// Global error handler
fastify.setErrorHandler((error: Error & { statusCode?: number }, _request, reply) => {
  logger.error(error);
  const status = (error as { statusCode?: number }).statusCode || 500;
  reply.status(status).send({
    data: null,
    error: { code: 'INTERNAL_ERROR', message: error.message },
    meta: { requestId: '', timestamp: new Date().toISOString() }
  });
});

try {
  await initDefaultPrompts();
  await fastify.listen({ port: config.server.port, host: '0.0.0.0' });
  logger.info(`Server listening on port ${config.server.port}`);
} catch (err: unknown) {
  logger.error(err);
  process.exit(1);
}
