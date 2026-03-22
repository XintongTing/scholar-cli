import * as genRepo from '../repositories/generation.repository.js';
import * as projectRepo from '../repositories/project.repository.js';
import { getPromptContent } from '../ai/prompt-registry.js';
import { buildProjectContext } from '../ai/context-builder.js';
import { assemblePrompt } from '../ai/prompt-assembler.js';
import { streamChatCompletion } from './integrations/claude.service.js';

export type SSEReply = (event: string, data: object) => void;

interface OutlineChapter {
  id: string;
  order: number;
  level?: number | null;
  parentId?: string | null;
  title: string;
  description?: string | null;
  wordCountTarget?: number | null;
}

interface StartGenerationOptions {
  restart?: boolean;
}

const CITATION_INSTRUCTIONS = `

参考文献编号规则：
1. 正文中的引用编号必须按最终正文里首次出现的顺序从[1]开始递增。
2. 不要直接照搬上方参考文献列表里的原始编号。
3. 同一篇文献再次被引用时，必须复用它第一次出现时的编号。
4. 只有实际在正文中引用到的文献才需要编号。
`;

function sortChaptersForGeneration(chapters: OutlineChapter[]) {
  const byParent = new Map<string | null, OutlineChapter[]>();

  for (const chapter of chapters) {
    const key = chapter.parentId ?? null;
    const siblings = byParent.get(key) ?? [];
    siblings.push(chapter);
    byParent.set(key, siblings);
  }

  for (const siblings of byParent.values()) {
    siblings.sort((a, b) => {
      const orderDiff = (a.order ?? 0) - (b.order ?? 0);
      if (orderDiff !== 0) return orderDiff;
      return a.title.localeCompare(b.title, 'zh-CN');
    });
  }

  const ordered: OutlineChapter[] = [];
  const visited = new Set<string>();

  const walk = (parentId: string | null) => {
    const siblings = byParent.get(parentId) ?? [];
    for (const chapter of siblings) {
      if (visited.has(chapter.id)) continue;
      visited.add(chapter.id);
      ordered.push(chapter);
      walk(chapter.id);
    }
  };

  walk(null);

  for (const chapter of chapters) {
    if (!visited.has(chapter.id)) {
      visited.add(chapter.id);
      ordered.push(chapter);
      walk(chapter.id);
    }
  }

  return ordered;
}

function getLeafChapters(chapters: OutlineChapter[]) {
  const parentIds = new Set(
    chapters
      .map((chapter) => chapter.parentId)
      .filter((parentId): parentId is string => Boolean(parentId))
  );

  return chapters.filter((chapter) => !parentIds.has(chapter.id));
}

function buildChapterPath(chapter: OutlineChapter, chapterMap: Map<string, OutlineChapter>) {
  const path: OutlineChapter[] = [];
  let current: OutlineChapter | undefined = chapter;

  while (current) {
    path.unshift(current);
    current = current.parentId ? chapterMap.get(current.parentId) : undefined;
  }

  return path;
}

function readSavedContent(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {} as Record<string, string>;

  const entries = Object.entries(raw as Record<string, unknown>)
    .filter(([, value]) => typeof value === 'string')
    .map(([key, value]) => [key, value as string]);

  return Object.fromEntries(entries) as Record<string, string>;
}

function findFirstIncompleteChapterIndex(
  chapters: OutlineChapter[],
  content: Record<string, string>
) {
  return chapters.findIndex((chapter) => !content[chapter.id]?.trim());
}

function normalizeCitationOrder(
  chapters: OutlineChapter[],
  content: Record<string, string>
) {
  const orderedLeafChapters = getLeafChapters(chapters);
  const citationMap = new Map<number, number>();
  let nextCitation = 1;
  const normalizedContent: Record<string, string> = { ...content };

  for (const chapter of orderedLeafChapters) {
    const text = normalizedContent[chapter.id];
    if (!text) continue;

    normalizedContent[chapter.id] = text.replace(/\[(\s*\d+(?:\s*[-,，]\s*\d+)*)\]/g, (_full, body: string) => {
      const rewritten = body.replace(/\d+/g, (value) => {
        const sourceNumber = Number(value);
        if (!citationMap.has(sourceNumber)) {
          citationMap.set(sourceNumber, nextCitation++);
        }
        return String(citationMap.get(sourceNumber));
      });

      return `[${rewritten.replace(/，/g, ', ')}]`;
    });
  }

  return normalizedContent;
}

export async function startGeneration(
  projectId: string,
  userId: string,
  reply: SSEReply,
  onDone: () => void,
  options: StartGenerationOptions = {}
) {
  const project = await projectRepo.findById(projectId);
  if (!project?.outline) throw new Error('大纲不存在');

  const allChapters = sortChaptersForGeneration(project.outline.chapters);
  const chapterMap = new Map(allChapters.map((chapter) => [chapter.id, chapter]));
  const chapters = getLeafChapters(allChapters);
  const latestDoc = await genRepo.findLatestByProjectId(projectId);
  const latestContent = latestDoc ? readSavedContent(latestDoc.content) : {};
  const latestFirstIncompleteIndex = latestDoc
    ? findFirstIncompleteChapterIndex(chapters, latestContent)
    : -1;
  const canResume = Boolean(latestDoc && !options.restart && latestFirstIncompleteIndex >= 0);
  const doc = canResume
    ? latestDoc
    : await genRepo.create(projectId, options.restart ? {} : undefined);

  if (!doc) throw new Error('生成文档初始化失败');

  if (doc.status !== 'GENERATING') {
    await genRepo.updateStatus(doc.id, 'GENERATING', null);
  }

  const content: Record<string, string> = canResume ? latestContent : {};

  const checkpointChapterId = canResume ? doc.checkpointChapterId : null;
  const checkpointIndex = checkpointChapterId
    ? chapters.findIndex((chapter) => chapter.id === checkpointChapterId)
    : -1;
  const firstIncompleteIndex = findFirstIncompleteChapterIndex(chapters, content);

  const startIndex = checkpointIndex >= 0 ? checkpointIndex : firstIncompleteIndex;
  if (startIndex < 0) {
    await genRepo.updateStatus(doc.id, 'COMPLETED');
    await projectRepo.updateStatus(projectId, 'EDITING');
    reply('done', { documentId: doc.id });
    onDone();
    return;
  }

  const profile = project.userProfile as Record<string, string>;
  const ctx = await buildProjectContext(projectId);

  for (let i = startIndex; i < chapters.length; i++) {
    const chapter = chapters[i];
    const current = await genRepo.findLatestByProjectId(projectId);
    if (current?.status === 'PAUSED') {
      reply('paused', { chapterId: chapter.id });
      return;
    }

    reply('progress', { chapterId: chapter.id, status: 'started' });

    const template = await getPromptContent('chapter_generation', userId);
    const prevChapter = chapters[i - 1];
    const chapterPath = buildChapterPath(chapter, chapterMap);
    const chapterPathText = chapterPath.map((item) => item.title).join(' > ');
    const systemPrompt = assemblePrompt(template, {
      outline: ctx.outline,
      current_chapter: `章节路径：${chapterPathText}\n当前生成单元：${chapter.title}\n${chapter.description || ''}`,
      word_count_target: String(chapter.wordCountTarget ?? ''),
      literature_list: ctx.literatureList,
      materials_summary: ctx.materialsSummary,
      previous_chapter_tail: prevChapter ? content[prevChapter.id]?.slice(-300) || '' : '',
      paper_type: profile.paperType || '',
      user_identity: profile.identity || ''
    }) + CITATION_INSTRUCTIONS;

    let chapterText = '';
    reply('progress', { chapterId: chapter.id, status: 'section', sectionTitle: chapterPathText });
    await streamChatCompletion(
      systemPrompt,
      [{
        role: 'user',
        content: `请围绕“${chapterPathText}”这个最低层级章节撰写正文内容，目标字数约 ${chapter.wordCountTarget ?? 0} 字。不要重复生成其父章节的独立正文。`
      }],
      (chunk) => {
        chapterText += chunk;
        reply('chunk', { chapterId: chapter.id, content: chunk });
      },
      async () => {
        content[chapter.id] = chapterText;
        const normalizedContent = normalizeCitationOrder(allChapters, content);
        Object.assign(content, normalizedContent);
        await genRepo.updateContent(doc.id, normalizedContent);

        const latest = await genRepo.findLatestByProjectId(projectId);
        if (latest?.id === doc.id && latest.status === 'GENERATING') {
          await genRepo.updateStatus(doc.id, 'GENERATING', null);
        }
        reply('progress', { chapterId: chapter.id, status: 'done' });
      },
      undefined,
      { nodeName: 'chapter_generation', projectId, userId }
    );

    const latest = await genRepo.findLatestByProjectId(projectId);
    if (latest?.id !== doc.id) {
      onDone();
      return;
    }

    if (latest.status === 'PAUSED') {
      reply('paused', { chapterId: latest.checkpointChapterId ?? chapter.id });
      onDone();
      return;
    }

    if (latest.status === 'COMPLETED') {
      reply('done', { documentId: doc.id });
      onDone();
      return;
    }
  }

  await genRepo.updateStatus(doc.id, 'COMPLETED');
  await projectRepo.updateStatus(projectId, 'EDITING');
  reply('done', { documentId: doc.id });
  onDone();
}

export async function pauseGeneration(projectId: string, checkpointChapterId?: string | null) {
  const doc = await genRepo.findLatestByProjectId(projectId);
  if (!doc) throw new Error('文档不存在');
  await genRepo.updateStatus(doc.id, 'PAUSED', checkpointChapterId ?? null);
}

export async function stopGeneration(projectId: string) {
  const doc = await genRepo.findLatestByProjectId(projectId);
  if (!doc) throw new Error('文档不存在');
  await genRepo.updateStatus(doc.id, 'COMPLETED', null);
  await projectRepo.updateStatus(projectId, 'EDITING');
  return doc;
}

export async function getDocument(projectId: string) {
  return genRepo.findLatestByProjectId(projectId);
}

export async function saveDocument(projectId: string, content: Record<string, unknown>) {
  const doc = await genRepo.findLatestByProjectId(projectId);
  if (!doc) throw new Error('文档不存在');

  const project = await projectRepo.findById(projectId);
  const chapters = project?.outline ? sortChaptersForGeneration(project.outline.chapters) : [];
  const savedContent = readSavedContent(content);
  const normalizedContent = normalizeCitationOrder(chapters, savedContent);

  await genRepo.updateContent(doc.id, normalizedContent);
  return doc;
}
