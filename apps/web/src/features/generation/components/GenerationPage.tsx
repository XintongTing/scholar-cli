import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pause, Play, CheckCircle, AlertTriangle, RotateCcw, Square } from 'lucide-react';
import { useGenerationStore } from '../store';
import { useSSEStream } from '../../../shared/hooks/useSSEStream';
import { http } from '../../../services/http';
import { Button } from '../../../shared/components/Button';
import { Spinner } from '../../../shared/components/Spinner';
import { cn } from '../../../shared/utils/cn';
import { outlineApi } from '../../outline/api';

interface Chapter {
  id: string;
  order: number;
  title: string;
  level?: number;
  parentId?: string | null;
}

interface GeneratedDocument {
  id: string;
  content: Record<string, string> | null;
  status: 'GENERATING' | 'PAUSED' | 'COMPLETED';
  checkpointChapterId?: string | null;
}

type ChapterStatus = 'idle' | 'generating' | 'done';

function sortChapters(chapters: Chapter[]) {
  const byParent = new Map<string | null, Chapter[]>();

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

  const ordered: Chapter[] = [];
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

function getLeafChapterIds(chapters: Chapter[]) {
  const parentIds = new Set(
    chapters
      .map((chapter) => chapter.parentId)
      .filter((parentId): parentId is string => Boolean(parentId))
  );

  return new Set(chapters.filter((chapter) => !parentIds.has(chapter.id)).map((chapter) => chapter.id));
}

function normalizeDocContent(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(([, v]) => typeof v === 'string')
  ) as Record<string, string>;
}

function buildChildrenMap(chapters: Chapter[]) {
  const childrenMap = new Map<string | null, Chapter[]>();
  for (const chapter of chapters) {
    const key = chapter.parentId ?? null;
    const children = childrenMap.get(key) ?? [];
    children.push(chapter);
    childrenMap.set(key, children);
  }
  return childrenMap;
}

function collectLeafDescendants(chapterId: string, childrenMap: Map<string | null, Chapter[]>, leafIds: Set<string>) {
  if (leafIds.has(chapterId)) return [chapterId];

  const result: string[] = [];
  const walk = (parentId: string) => {
    const children = childrenMap.get(parentId) ?? [];
    for (const child of children) {
      if (leafIds.has(child.id)) {
        result.push(child.id);
      } else {
        walk(child.id);
      }
    }
  };

  walk(chapterId);
  return result;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripLeadingHeading(content: string, chapterTitle: string) {
  let result = content.trimStart();

  result = result.replace(/^(?:#{1,6}\s*.*(?:\r?\n|$))+/u, '').trimStart();

  const compactTitle = chapterTitle.replace(/\s+/g, '');
  const titleWithoutNumber = chapterTitle.replace(/^\d+(?:\.\d+)*\s*/u, '').trim();
  const compactTitleWithoutNumber = titleWithoutNumber.replace(/\s+/g, '');
  const headingLikeTitle = new RegExp(
    `^(?:#{1,6}\\s*)?(?:${escapeRegExp(chapterTitle)}|${escapeRegExp(compactTitle)}|${escapeRegExp(titleWithoutNumber)}|${escapeRegExp(compactTitleWithoutNumber)})[:：\\s]*`,
    'u'
  );
  result = result.replace(headingLikeTitle, '').trimStart();

  const numberedTitle = chapterTitle.match(/^\d+(?:\.\d+)*\s*(.+)$/u)?.[1]?.trim();
  if (numberedTitle) {
    const compactNumberedTitle = numberedTitle.replace(/\s+/g, '');
    const numberedTitlePattern = new RegExp(
      `^(?:#{1,6}\\s*)?(?:${escapeRegExp(numberedTitle)}|${escapeRegExp(compactNumberedTitle)})[:：\\s]*`,
      'u'
    );
    result = result.replace(numberedTitlePattern, '').trimStart();
  }

  return result;
}

function sanitizeChapterContent(content: string, chapterTitle: string) {
  let result = content;
  let previous = '';

  while (result !== previous) {
    previous = result;
    result = stripLeadingHeading(result, chapterTitle);
  }

  return result;
}

function renderPreviewTree(
  parentId: string | null,
  childrenMap: Map<string | null, Chapter[]>,
  streamedContent: Record<string, string>
): string {
  const chapters = childrenMap.get(parentId) ?? [];

  return chapters.map((chapter) => {
    const childText = renderPreviewTree(chapter.id, childrenMap, streamedContent);
    const bodyText = (streamedContent[chapter.id] || '').trim();
    const hasVisibleContent = Boolean(bodyText || childText);
    if (!hasVisibleContent) return '';

    const headingPrefix = chapter.level === 1 ? '# ' : chapter.level === 2 ? '## ' : '### ';
    return [
      `${headingPrefix}${chapter.title}`,
      bodyText,
      childText,
    ].filter(Boolean).join('\n\n');
  }).filter(Boolean).join('\n\n');
}

export function GenerationPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    completedChapters,
    currentChapterId,
    streamedContent,
    isPaused,
    isGenerating,
    setCurrentChapter,
    setCompletedChapters,
    setStreamedContent,
    addCompletedChapter,
    setIsPaused,
    setIsGenerating,
    reset
  } = useGenerationStore();
  const { start, stop } = useSSEStream();
  const [displayChapters, setDisplayChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSection, setCurrentSection] = useState('');
  const [ending, setEnding] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const currentChapterIdRef = useRef<string | null>(null);
  const streamedContentRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isGenerating) {
        e.preventDefault();
        e.returnValue = '生成正在进行中，离开将中断生成。确定要离开吗？';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isGenerating]);

  useEffect(() => {
    currentChapterIdRef.current = currentChapterId;
  }, [currentChapterId]);

  useEffect(() => {
    streamedContentRef.current = streamedContent;
  }, [streamedContent]);

  useEffect(() => {
    if (!projectId) return;

    Promise.all([
      outlineApi.get(projectId),
      http.get(`/projects/${projectId}/document`).catch(() => null),
    ]).then(([outlineRes, docRes]) => {
      const orderedChapters = sortChapters(outlineRes.data.data?.chapters || []);
      const leafIds = getLeafChapterIds(orderedChapters);
      setDisplayChapters(orderedChapters);

      const doc = docRes?.data?.data as GeneratedDocument | undefined;
      if (!doc) return;

      const savedContent = normalizeDocContent(doc.content);
      const completed = orderedChapters
        .filter((chapter) => leafIds.has(chapter.id) && Boolean(savedContent[chapter.id]?.trim()))
        .map((chapter) => chapter.id);

      setStreamedContent(savedContent);
      setCompletedChapters(completed);
      setCurrentChapter(doc.status === 'PAUSED' ? (doc.checkpointChapterId ?? null) : null);
      setIsPaused(doc.status === 'PAUSED');
      setIsGenerating(doc.status === 'GENERATING');
    }).finally(() => setLoading(false));
  }, [projectId, setCompletedChapters, setCurrentChapter, setIsGenerating, setIsPaused, setStreamedContent]);

  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.scrollTop = previewRef.current.scrollHeight;
    }
  }, [streamedContent]);

  const leafIds = useMemo(() => getLeafChapterIds(displayChapters), [displayChapters]);
  const childrenMap = useMemo(() => buildChildrenMap(displayChapters), [displayChapters]);
  const chapterMap = useMemo(() => (
    displayChapters.reduce<Record<string, string>>((acc, chapter) => {
      acc[chapter.id] = chapter.title;
      return acc;
    }, {})
  ), [displayChapters]);

  const orderedContent = useMemo(() => (
    renderPreviewTree(null, childrenMap, streamedContent)
  ), [childrenMap, streamedContent]);

  const chapterStatusMap = useMemo(() => {
    const statusMap = new Map<string, ChapterStatus>();

    for (const chapter of displayChapters) {
      const descendantLeafIds = collectLeafDescendants(chapter.id, childrenMap, leafIds);
      const isCurrent = currentChapterId
        ? descendantLeafIds.includes(currentChapterId)
        : false;
      const isDone = descendantLeafIds.length > 0 && descendantLeafIds.every((id) => completedChapters.includes(id));

      if (isDone) statusMap.set(chapter.id, 'done');
      else if (isCurrent) statusMap.set(chapter.id, 'generating');
      else statusMap.set(chapter.id, 'idle');
    }

    return statusMap;
  }, [childrenMap, completedChapters, currentChapterId, displayChapters, leafIds]);

  const completedLeafCount = completedChapters.length;
  const totalLeafCount = leafIds.size;

  const handleStart = (restart = false) => {
    if (!projectId) return;

    if (restart) {
      reset();
      setRestarting(true);
    }

    setIsGenerating(true);
    setIsPaused(false);
    setCurrentSection('');

    start({
      url: `/api/v1/projects/${projectId}/generation/start`,
      body: restart ? { restart: true } : {},
      onChunk: (chunk) => {
        const id = currentChapterIdRef.current;
        if (!id) return;
        const chapterTitle = chapterMap[id] || '';
        const current = streamedContentRef.current[id] || '';
        const next = sanitizeChapterContent(`${current}${chunk}`, chapterTitle);
        setStreamedContent({
          ...streamedContentRef.current,
          [id]: next,
        });
      },
      onProgress: (data) => {
        const d = data as { chapterId: string; status: string; sectionTitle?: string };
        if (d.status === 'started') {
          setCurrentChapter(d.chapterId);
          currentChapterIdRef.current = d.chapterId;
          setCurrentSection(d.sectionTitle || chapterMap[d.chapterId] || '');
        }
        if (d.status === 'section') {
          setCurrentSection(d.sectionTitle || '');
        }
        if (d.status === 'done') {
          addCompletedChapter(d.chapterId);
          setCurrentSection('');
        }
      },
      onDone: () => {
        setIsGenerating(false);
        setIsPaused(false);
        setCurrentChapter(null);
        setCurrentSection('');
        setRestarting(false);
      },
      onError: () => {
        setIsGenerating(false);
        setRestarting(false);
      },
    });
  };

  const handlePause = async () => {
    if (!projectId) return;
    stop();
    await http.post(`/projects/${projectId}/generation/pause`, {
      checkpointChapterId: currentChapterIdRef.current,
    });
    setIsPaused(true);
    setIsGenerating(false);
  };

  const handleStop = async () => {
    if (!projectId) return;
    setEnding(true);
    stop();
    try {
      await http.post(`/projects/${projectId}/generation/stop`);
      setIsGenerating(false);
      setIsPaused(false);
      setCurrentChapter(null);
      setCurrentSection('');
      navigate(`/projects/${projectId}/editor`);
    } finally {
      setEnding(false);
    }
  };

  const hasContent = Object.keys(streamedContent).length > 0;

  if (loading) return <div className="flex items-center justify-center h-full"><Spinner size="lg" /></div>;

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-border px-6 py-3 flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-text-primary">论文预览</span>
            {isGenerating && currentSection && (
              <span className="ml-3 text-xs text-text-secondary">
                正在撰写：{currentSection}
              </span>
            )}
            {isPaused && currentChapterId && (
              <span className="ml-3 text-xs text-warning">
                已暂停：{chapterMap[currentChapterId] || '当前章节'}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {isGenerating ? (
              <>
                <Button variant="secondary" size="sm" onClick={handlePause}>
                  <Pause size={14} strokeWidth={1.5} className="mr-1" />
                  暂停生成
                </Button>
                <Button variant="secondary" size="sm" onClick={handleStop} disabled={ending}>
                  <Square size={14} strokeWidth={1.5} className="mr-1" />
                  结束生成
                </Button>
              </>
            ) : (
              <>
                <Button variant="primary" size="sm" onClick={() => handleStart(false)} disabled={restarting}>
                  <Play size={14} strokeWidth={1.5} className="mr-1" />
                  {isPaused ? '继续生成' : '开始生成'}
                </Button>
                {hasContent && (
                  <Button variant="secondary" size="sm" onClick={() => handleStart(true)} disabled={restarting}>
                    <RotateCcw size={14} strokeWidth={1.5} className="mr-1" />
                    重新生成
                  </Button>
                )}
                {hasContent && (
                  <Button variant="secondary" size="sm" onClick={handleStop} disabled={ending}>
                    <Square size={14} strokeWidth={1.5} className="mr-1" />
                    结束生成
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {isGenerating && (
          <div className="flex items-center gap-2 px-4 py-2 bg-warning-subtle border-b border-border text-xs text-warning">
            <AlertTriangle size={13} strokeWidth={1.5} className="shrink-0" />
            <span>生成进行中，离开此页面将中断生成。如需中止，请点击“暂停生成”或“结束生成”。</span>
          </div>
        )}

        <div ref={previewRef} className="flex-1 overflow-y-auto px-8 py-6">
          {!isGenerating && !orderedContent && (
            <div className="text-center py-20 text-text-secondary">
              <p className="mb-4">准备好了，点击“开始生成”让 AI 撰写你的论文</p>
              <Button variant="primary" size="lg" onClick={() => handleStart(false)}>
                <Play size={16} strokeWidth={1.5} className="mr-1.5" />
                开始生成
              </Button>
            </div>
          )}
          {orderedContent && (
            <div className="prose max-w-none text-text-primary text-sm leading-relaxed whitespace-pre-wrap font-sans">
              {orderedContent}
              {isGenerating && (
                <span className="inline-block w-0.5 h-4 bg-text-primary animate-pulse ml-0.5 align-middle" />
              )}
            </div>
          )}
        </div>
      </div>

      <div className="w-72 border-l border-border bg-bg-subtle flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-medium text-text-primary">生成进度</p>
          <p className="text-xs text-text-secondary mt-0.5">
            {completedLeafCount} / {totalLeafCount} 个最低层级章节已完成
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {displayChapters.map((chapter) => {
            const status = chapterStatusMap.get(chapter.id) ?? 'idle';
            const level = chapter.level ?? 1;
            const indent = (level - 1) * 14;
            const chapterWords = streamedContent[chapter.id]
              ? streamedContent[chapter.id].replace(/\s/g, '').length
              : 0;
            const isLeaf = leafIds.has(chapter.id);

            return (
              <div
                key={chapter.id}
                className={cn(
                  'px-2 py-2 rounded text-sm',
                  status === 'done' && 'text-success',
                  status === 'generating' && 'text-primary bg-primary-subtle',
                  status === 'idle' && 'text-text-tertiary'
                )}
                style={{ paddingLeft: `${8 + indent}px` }}
              >
                <div className="flex items-center gap-2">
                  <span className="w-4 shrink-0 text-center">
                    {status === 'done' ? (
                      <CheckCircle size={14} strokeWidth={2} />
                    ) : status === 'generating' ? (
                      <Spinner size="sm" />
                    ) : (
                      <span className="text-text-tertiary">·</span>
                    )}
                  </span>
                  <span
                    className={cn(
                      'flex-1 truncate',
                      level === 1 ? 'font-medium' : level === 2 ? 'text-[13px]' : 'text-xs',
                      status === 'generating' && 'font-medium'
                    )}
                  >
                    {chapter.title}
                  </span>
                  {(status === 'done' || status === 'generating') && chapterWords > 0 && isLeaf && (
                    <span className="text-xs opacity-60 shrink-0">{chapterWords} 字</span>
                  )}
                </div>
                {status === 'generating' && (
                  <div className="pl-6 mt-1 space-y-0.5 text-xs text-primary/70">
                    {isLeaf ? <p>· 当前最低层级章节生成中</p> : <p>· 子章节生成中</p>}
                    {chapterWords > 0 && isLeaf && <p>· 正在撰写内容 ({chapterWords} 字)</p>}
                    {currentSection && <p className="truncate">· {currentSection}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {completedLeafCount === totalLeafCount && totalLeafCount > 0 && (
          <div className="px-3 py-3 border-t border-border">
            <Button
              variant="primary"
              size="md"
              className="w-full"
              onClick={() => navigate(`/projects/${projectId}/editor`)}
            >
              进入编辑器
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
