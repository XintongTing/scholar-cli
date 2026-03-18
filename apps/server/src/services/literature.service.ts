import { randomUUID } from 'crypto';
import * as litRepo from '../repositories/literature.repository.js';
import * as projectRepo from '../repositories/project.repository.js';
import { uploadFile, deleteFile } from './integrations/s3.service.js';
import { parsePdf } from './integrations/pdf.service.js';

export async function getLiterature(projectId: string) {
  return litRepo.findByProjectId(projectId);
}

export async function uploadLiterature(
  projectId: string,
  buffer: Buffer,
  filename: string
) {
  const key = `projects/${projectId}/literature/${randomUUID()}-${filename}`;
  await uploadFile(key, buffer, 'application/pdf');

  const meta = await parsePdf(buffer);
  return litRepo.create({
    projectId,
    title: meta.title || filename.replace('.pdf', ''),
    authors: meta.authors,
    year: meta.year,
    abstract: meta.abstract,
    source: filename,
    fileKey: key
  });
}

export async function deleteLiterature(projectId: string, litId: string) {
  const items = await litRepo.findByProjectId(projectId);
  const item = items.find(l => l.id === litId);
  if (!item) throw Object.assign(new Error('文献不存在'), { code: 'NOT_FOUND' });
  if (item.fileKey) await deleteFile(item.fileKey).catch(() => {});
  await litRepo.deleteById(litId);
}

export async function uploadLiteratureText(
  projectId: string,
  title: string,
  text: string
) {
  // Extract a rough abstract from the first 500 chars
  const abstract = text.slice(0, 500).trim() || undefined;
  return litRepo.create({
    projectId,
    title,
    authors: [],
    year: undefined,
    abstract,
    source: 'pasted-text',
  });
}

export async function confirmLiterature(projectId: string) {
  await litRepo.confirmAll(projectId);
  await projectRepo.updateStatus(projectId, 'MATERIALS');
  return projectRepo.findById(projectId);
}
