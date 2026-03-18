import * as outlineRepo from '../repositories/outline.repository.js';
import * as projectRepo from '../repositories/project.repository.js';
import { prisma } from '../db.js';
import { getPromptContent } from '../ai/prompt-registry.js';
import { buildProjectContext } from '../ai/context-builder.js';
import { assemblePrompt } from '../ai/prompt-assembler.js';
import { streamChatCompletion } from './integrations/claude.service.js';

export async function getOutline(projectId: string) {
  return outlineRepo.findByProjectId(projectId);
}

export async function updateOutline(projectId: string, data: { title?: string; abstract?: string }) {
  return outlineRepo.upsertOutline(projectId, data);
}

export async function addChapter(projectId: string, data: {
  title: string;
  description?: string;
  wordCountTarget?: number;
}) {
  const outline = await outlineRepo.findByProjectId(projectId);
  if (!outline) throw Object.assign(new Error('大纲不存在'), { code: 'NOT_FOUND' });
  const maxOrder = await outlineRepo.getMaxOrder(outline.id);
  return outlineRepo.addChapter(outline.id, { ...data, order: maxOrder + 1 });
}

export async function updateChapter(projectId: string, chapterId: string, data: {
  title?: string;
  description?: string;
  wordCountTarget?: number;
  order?: number;
}) {
  return outlineRepo.updateChapter(chapterId, data);
}

export async function deleteChapter(projectId: string, chapterId: string) {
  await outlineRepo.deleteChapter(chapterId);
  // Re-order remaining chapters
  const outline = await outlineRepo.findByProjectId(projectId);
  if (outline) {
    for (let i = 0; i < outline.chapters.length; i++) {
      await outlineRepo.updateChapter(outline.chapters[i].id, { order: i + 1 });
    }
  }
}

export async function confirmOutline(projectId: string) {
  await outlineRepo.confirmOutline(projectId);
  await projectRepo.updateStatus(projectId, 'LITERATURE');
  return projectRepo.findById(projectId);
}

export async function processChatMessage(
  projectId: string,
  userId: string,
  userMessage: string,
  onChunk: (text: string) => void,
  onDone: (fullText: string) => void
) {
  // Save user message
  await prisma.chatMessage.create({
    data: { projectId, role: 'user', content: userMessage }
  });

  // Load chat history
  const history = await prisma.chatMessage.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' },
    take: 20
  });

  // Get project context
  const project = await projectRepo.findById(projectId);
  if (!project) throw new Error('Project not found');
  const profile = project.userProfile as Record<string, string>;

  // Get prompt template
  const template = await getPromptContent('outline_generation', userId);
  const systemPrompt = assemblePrompt(template, {
    user_identity: profile.identity || '',
    paper_type: profile.paperType || '',
    field: profile.field || '',
    goal: profile.goal || ''
  });

  // Build messages (exclude last user message since we pass it separately)
  const messages = history.slice(0, -1).map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content
  }));
  messages.push({ role: 'user', content: userMessage });

  let fullText = '';
  await streamChatCompletion(
    systemPrompt,
    messages,
    (chunk) => {
      fullText += chunk;
      onChunk(chunk);
    },
    async () => {
      // Save AI response
      await prisma.chatMessage.create({
        data: { projectId, role: 'assistant', content: fullText }
      });

      // Try to parse outline JSON from response
      const jsonMatch = fullText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          if (parsed.title && parsed.chapters) {
            await outlineRepo.upsertOutline(projectId, {
              title: parsed.title,
              abstract: parsed.abstract || ''
            });
            const outline = await outlineRepo.findByProjectId(projectId);
            if (outline) {
              await outlineRepo.replaceChapters(outline.id, parsed.chapters);
            }
            // Update project title
            await projectRepo.updateTitle(projectId, parsed.title);
          }
        } catch {
          // JSON parse failed, ignore
        }
      }

      onDone(fullText);
    }
  );
}

export async function getChatHistory(projectId: string) {
  return prisma.chatMessage.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' }
  });
}
