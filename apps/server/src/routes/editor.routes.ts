import type { FastifyInstance } from 'fastify';
import * as editorController from '../controllers/editor.controller.js';

export async function editorRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/:projectId/document', editorController.getDocument);
  fastify.patch('/:projectId/document', editorController.saveDocument);
  fastify.get('/:projectId/document/export', editorController.exportDocx);
}
