import * as genRepo from '../repositories/generation.repository.js';

export async function getDocument(projectId: string) {
  const doc = await genRepo.findLatestByProjectId(projectId);
  if (!doc) throw Object.assign(new Error('Document not found'), { statusCode: 404 });
  return doc;
}

export async function saveDocument(projectId: string, content: Record<string, unknown>) {
  const doc = await genRepo.findLatestByProjectId(projectId);
  if (!doc) throw Object.assign(new Error('Document not found'), { statusCode: 404 });
  return genRepo.updateContent(doc.id, content);
}

export async function exportDocx(projectId: string) {
  const doc = await genRepo.findLatestByProjectId(projectId);
  if (!doc) throw Object.assign(new Error('Document not found'), { statusCode: 404 });
  // Return the Tiptap JSON content; frontend handles actual .docx conversion
  return doc.content;
}
