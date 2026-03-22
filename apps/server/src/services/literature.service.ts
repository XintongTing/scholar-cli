import { randomUUID } from 'crypto';
import * as litRepo from '../repositories/literature.repository.js';
import * as projectRepo from '../repositories/project.repository.js';
import { uploadFile, deleteFile } from './integrations/s3.service.js';
import { parsePdf } from './integrations/pdf.service.js';
import { chatCompletion } from './integrations/claude.service.js';
import { getPromptContent } from '../ai/prompt-registry.js';

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
  const item = items.find((l) => l.id === litId);
  if (!item) throw Object.assign(new Error('Literature not found'), { code: 'NOT_FOUND' });
  if (item.fileKey) await deleteFile(item.fileKey).catch(() => {});
  await litRepo.deleteById(litId);
}

export async function uploadLiteratureText(
  projectId: string,
  title: string,
  text: string
) {
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
  await projectRepo.updateStatus(projectId, 'MATERIALS');
  return projectRepo.findById(projectId);
}

export async function updateLiteratureSelection(
  projectId: string,
  literatureIds: string[],
  confirmed: boolean
) {
  if (literatureIds.length === 0) return [];

  const items = await litRepo.findByProjectId(projectId);
  const itemIds = new Set(items.map((item) => item.id));
  const validIds = literatureIds.filter((id) => itemIds.has(id));

  if (validIds.length === 0) {
    throw Object.assign(new Error('Literature not found'), { code: 'NOT_FOUND' });
  }

  await litRepo.updateConfirmedByIds(projectId, validIds, confirmed);
  return litRepo.findByProjectId(projectId);
}

export interface AiSearchParams {
  totalCount?: number;
  cnCount?: number;
  enCount?: number;
  years?: number;
  keywords?: string;
}

interface LiteratureCandidate {
  title: string;
  authors: string[];
  year: number;
  abstract: string;
  source: string;
  language?: string;
  doi?: string | null;
}

function uniqueStrings(items: Array<string | undefined | null>) {
  return [...new Set(items.map((item) => item?.trim()).filter(Boolean) as string[])];
}

function splitTerms(text: string) {
  return text
    .split(/[\s,，、;；:：/\\|()（）[\]【】{}"“”'‘’\n\r\t]+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);
}

function buildOutlineContext(project: Awaited<ReturnType<typeof projectRepo.findById>>) {
  const chapters = (project?.outline?.chapters ?? []).slice(0, 12);
  if (chapters.length === 0) return '- 暂无大纲信息';

  return chapters
    .map((chapter) => `- ${chapter.title}${chapter.description ? `：${chapter.description}` : ''}`)
    .join('\n');
}

function buildKeywordContext(
  title: string,
  field: string,
  goal: string,
  outlineContext: string,
  userKeywords?: string
) {
  const outlineTerms = splitTerms(outlineContext).slice(0, 24);
  const goalTerms = splitTerms(goal).slice(0, 16);

  return uniqueStrings([
    userKeywords,
    title,
    field,
    goal,
    ...goalTerms,
    ...outlineTerms,
  ]).join('、');
}

function extractLiteratureItems(raw: string): LiteratureCandidate[] {
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    const parsed = JSON.parse(jsonMatch[0]);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeItems(items: LiteratureCandidate[], totalCount: number) {
  return items
    .filter((item) => item && typeof item.title === 'string' && item.title.trim())
    .filter((item, index, array) => (
      array.findIndex((other) => other.title?.trim().toLowerCase() === item.title?.trim().toLowerCase()) === index
    ))
    .slice(0, totalCount);
}

export async function aiSearchLiterature(projectId: string, params: AiSearchParams = {}) {
  const project = await projectRepo.findById(projectId);
  if (!project) throw new Error('Project not found');

  const profile = project.userProfile as Record<string, string>;
  const totalCount = params.totalCount ?? 20;
  const cnCount = params.cnCount ?? 15;
  const enCount = params.enCount ?? 5;
  const years = params.years ?? 5;
  const title = project.title || project.outline?.title || profile.goal || '未命名论文';
  const outlineContext = buildOutlineContext(project);
  const keywords = buildKeywordContext(
    title,
    profile.field || '',
    profile.goal || '',
    outlineContext,
    params.keywords
  );

  const promptTemplate = await getPromptContent('literature_ai_search', 'system');
  const prompt = promptTemplate
    .replace('{{title}}', title)
    .replace('{{paper_type}}', profile.paperType || '学术论文')
    .replace('{{field}}', profile.field || '')
    .replace('{{goal}}', profile.goal || '')
    .replace('{{keywords}}', keywords)
    .replace('{{outline_context}}', outlineContext)
    .replace('{{total_count}}', String(totalCount))
    .replace('{{cn_count}}', String(cnCount))
    .replace('{{en_count}}', String(enCount))
    .replace('{{years}}', String(years));

  const systemPrompt = '你是一位学术文献推荐助手。请基于已有学术常识返回候选参考文献，只返回 JSON 数组。';

  console.log('[ai-search] PROMPT:', JSON.stringify({ system: systemPrompt, user: prompt }));
  let raw = await chatCompletion(
    systemPrompt,
    [{ role: 'user', content: prompt }],
    undefined,
    { nodeName: 'literature_ai_search', projectId }
  );

  console.log('[ai-search] RAW:', raw);
  let items = normalizeItems(extractLiteratureItems(raw), totalCount);

  if (items.length === 0) {
    const fallbackPrompt = [
      '请重新生成候选参考文献，不要返回空数组。',
      '如果无法满足原始数量要求，请返回 6-10 篇你最有把握的候选结果。',
      '如果缺少完全匹配的文献，可以退一步返回同研究对象、同方法、同学科、同应用场景或同问题域的高相关文献。',
      '不要硬凑数量，不要编造，保持 JSON 数组格式。',
      '',
      prompt,
    ].join('\n');

    raw = await chatCompletion(
      '你是一位学术文献推荐助手。请返回高置信度候选参考文献，不要返回空数组，只返回 JSON 数组。',
      [{ role: 'user', content: fallbackPrompt }],
      undefined,
      { nodeName: 'literature_ai_search', projectId }
    );

    console.log('[ai-search] FALLBACK_RAW:', raw);
    items = normalizeItems(extractLiteratureItems(raw), totalCount);
  }

  const created = [];
  for (const item of items) {
    const lit = await litRepo.create({
      projectId,
      title: item.title || '未知标题',
      authors: Array.isArray(item.authors) ? item.authors : [],
      year: typeof item.year === 'number' ? item.year : null,
      abstract: item.abstract || undefined,
      source: item.source || 'AI 推荐',
    });
    created.push(lit);
  }

  return created;
}
