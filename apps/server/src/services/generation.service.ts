import * as genRepo from '../repositories/generation.repository.js';
import * as projectRepo from '../repositories/project.repository.js';
import { getPromptContent } from '../ai/prompt-registry.js';
import { buildProjectContext } from '../ai/context-builder.js';
import { assemblePrompt } from '../ai/prompt-assembler.js';
import { streamChatCompletion } from './integrations/claude.service.js';

export type SSEReply = (event: string, data: object) => void;

export async function startGeneration(
  projectId: string,
  userId: string,
  reply: SSEReply,
  onDone: () => void
) {
  const project = await projectRepo.findById(projectId);
  if (!project?.outline) throw new Error('大纲不存在');

  const chapters = project.outline.chapters;
  const doc = await genRepo.create(projectId);
  const content: Record<string, string> = {};

  const profile = project.userProfile as Record<string, string>;
  const ctx = await buildProjectContext(projectId);

  for (const chapter of chapters) {
    // Check if paused
    const current = await genRepo.findLatestByProjectId(projectId);
    if (current?.status === 'PAUSED') {
      reply('paused', { chapterId: chapter.id });
      return;
    }

    reply('progress', { chapterId: chapter.id, status: 'started' });

    const template = await getPromptContent('chapter_generation', userId);
    const systemPrompt = assemblePrompt(template, {
      outline: ctx.outline,
      current_chapter: `${chapter.title}\n${chapter.description || ''}`,
      word_count_target: String(chapter.wordCountTarget),
      literature_list: ctx.literatureList,
      materials_summary: ctx.materialsSummary,
      previous_chapter_tail: content[chapters[chapters.indexOf(chapter) - 1]?.id]?.slice(-300) || '',
      paper_type: profile.paperType || '',
      user_identity: profile.identity || ''
    });

    let chapterText = '';
    await streamChatCompletion(
      systemPrompt,
      [{ role: 'user', content: `请撰写"${chapter.title}"章节，目标字数约${chapter.wordCountTarget}字。` }],
      (chunk) => {
        chapterText += chunk;
        reply('chunk', { chapterId: chapter.id, content: chunk });
      },
      async () => {
        content[chapter.id] = chapterText;
        await genRepo.updateContent(doc.id, content);
        reply('progress', { chapterId: chapter.id, status: 'done' });
      }
    );
  }

  await genRepo.updateStatus(doc.id, 'COMPLETED');
  await projectRepo.updateStatus(projectId, 'EDITING');
  reply('done', { documentId: doc.id });
  onDone();
}

export async function pauseGeneration(projectId: string) {
  const doc = await genRepo.findLatestByProjectId(projectId);
  if (!doc) throw new Error('文档不存在');
  await genRepo.updateStatus(doc.id, 'PAUSED');
}

export async function getDocument(projectId: string) {
  return genRepo.findLatestByProjectId(projectId);
}

export async function saveDocument(projectId: string, content: Record<string, unknown>) {
  const doc = await genRepo.findLatestByProjectId(projectId);
  if (!doc) throw new Error('文档不存在');
  await genRepo.updateContent(doc.id, content);
  return doc;
}
