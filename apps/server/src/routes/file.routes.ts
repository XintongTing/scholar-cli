import type { FastifyInstance } from 'fastify';
import { readFile } from '../services/integrations/s3.service.js';

const MIME_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.csv': 'text/csv; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

function getContentType(key: string) {
  const ext = key.slice(key.lastIndexOf('.')).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

export async function fileRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/files/:key', async (request, reply) => {
    const { key } = request.params as { key: string };
    const decodedKey = decodeURIComponent(key);
    const file = await readFile(decodedKey);

    reply.header('Content-Type', getContentType(decodedKey));
    reply.header('Content-Disposition', `inline; filename="${pathBasename(decodedKey)}"`);
    return reply.send(file);
  });
}

function pathBasename(key: string) {
  const normalized = key.replace(/\\/g, '/');
  const parts = normalized.split('/');
  return parts[parts.length - 1] || 'file';
}
