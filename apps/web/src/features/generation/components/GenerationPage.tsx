import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

type ChapterStatus = 'idle' | 'generating' | 'paused' | 'done';
type DocumentViewStatus = 'IDLE' | 'GENERATING' | 'PAUSED' | 'COMPLETED';

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
      if (leafIds.has(child.id)) result.push(child.id);
      else walk(child.id);
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

function splitParagraphs(content: string) {
  return content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function renderPreviewNodes(
  parentId: string | null,
  childrenMap: Map<string | null, Chapter[]>,
  streamedContent: Record<string, string>
): React.ReactNode[] {
  const chapters = childrenMap.get(parentId) ?? [];

  return chapters.flatMap((chapter) => {
    const bodyText = (streamedContent[chapter.id] || '').trim();
    const childNodes = renderPreviewNodes(chapter.id, childrenMap, streamedContent);
    const paragraphs = splitParagraphs(bodyText);
    const hasVisibleContent = Boolean(paragraphs.length || childNodes.length);
    if (!hasVisibleContent) return [];

    const level = chapter.level ?? 1;
    const HeadingTag = level === 1 ? 'h2' : level === 2 ? 'h3' : 'h4';

    return [
      <Fragment key={chapter.id}>
        <HeadingTag
          className={cn(
            'font-serif text-text-primary',
            level === 1 && 'mt-10 text-center text-[28px] font-semibold tracking-[0.08em]',
            level === 2 && 'mt-8 text-[22px] font-semibold',
            level === 3 && 'mt-6 text-[18px] font-medium'
          )}
        >
          {chapter.title}
        </HeadingTag>
        {paragraphs.map((paragraph, index) => (
          <p
            key={`${chapter.id}-p-${index}`}
            className="mt-4 text-[16px] leading-[1.95] text-text-primary indent-[2em] whitespace-pre-wrap"
          >
            {paragraph}
          </p>
        ))}
        {childNodes}
      </Fragment>,
    ];
  });
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
    reset,
  } = useGenerationStore();
  const { start, stop } = useSSEStream();
  const [displayChapters, setDisplayChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSection, setCurrentSection] = useState('');
  const [ending, setEnding] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [documentStatus, setDocumentStatus] = useState<DocumentViewStatus>('IDLE');
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

    setLoading(true);
    setCurrentSection('');
    setDocumentStatus('IDLE');
    reset();

    Promise.all([
      outlineApi.get(projectId),
      http.get(`/projects/${projectId}/document`).catch(() => null),
    ])
      .then(([outlineRes, docRes]) => {
        const orderedChapters = sortChapters(outlineRes.data.data?.chapters || []);
        const leafIds = getLeafChapterIds(orderedChapters);
        setDisplayChapters(orderedChapters);

        const doc = docRes?.data?.data as GeneratedDocument | undefined;
        if (!doc) return;

        const savedContent = normalizeDocContent(doc.content);
        const completed = orderedChapters
          .filter((chapter) => leafIds.has(chapter.id) && Boolean(savedContent[chapter.id]?.trim()))
          .map((chapter) => chapter.id);
        const hasRemainingLeafChapters = completed.length < leafIds.size;
        const normalizedStatus: DocumentViewStatus =
          doc.status === 'COMPLETED' && hasRemainingLeafChapters ? 'PAUSED' : doc.status;

        setStreamedContent(savedContent);
        setCompletedChapters(completed);
        setCurrentChapter(normalizedStatus === 'PAUSED' ? (doc.checkpointChapterId ?? null) : null);
        setIsPaused(normalizedStatus === 'PAUSED');
        setIsGenerating(normalizedStatus === 'GENERATING');
        setDocumentStatus(normalizedStatus);
      })
      .finally(() => setLoading(false));
  }, [projectId, reset, setCompletedChapters, setCurrentChapter, setIsGenerating, setIsPaused, setStreamedContent]);

  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.scrollTop = previewRef.current.scrollHeight;
    }
  }, [streamedContent]);

  const leafIds = useMemo(() => getLeafChapterIds(displayChapters), [displayChapters]);
  const childrenMap = useMemo(() => buildChildrenMap(displayChapters), [displayChapters]);
  const chapterMap = useMemo(
    () =>
      displayChapters.reduce<Record<string, string>>((acc, chapter) => {
        acc[chapter.id] = chapter.title;
        return acc;
      }, {}),
    [displayChapters]
  );

  const previewNodes = useMemo(
    () => renderPreviewNodes(null, childrenMap, streamedContent),
    [childrenMap, streamedContent]
  );

  const chapterStatusMap = useMemo(() => {
    const statusMap = new Map<string, ChapterStatus>();

    for (const chapter of displayChapters) {
      const descendantLeafIds = collectLeafDescendants(chapter.id, childrenMap, leafIds);
      const isCurrent = currentChapterId ? descendantLeafIds.includes(currentChapterId) : false;
      const isDone = descendantLeafIds.length > 0 && descendantLeafIds.every((id) => completedChapters.includes(id));

      if (isDone) statusMap.set(chapter.id, 'done');
      else if (isCurrent && documentStatus === 'PAUSED') statusMap.set(chapter.id, 'paused');
      else if (isCurrent) statusMap.set(chapter.id, 'generating');
      else statusMap.set(chapter.id, 'idle');
    }

    return statusMap;
  }, [childrenMap, completedChapters, currentChapterId, displayChapters, documentStatus, leafIds]);

  const completedLeafCount = completedChapters.length;
  const totalLeafCount = leafIds.size;
  const hasRemainingChapters = totalLeafCount > 0 && completedLeafCount < totalLeafCount;
  const hasContent = Object.keys(streamedContent).length > 0;
  const canEnterEditor = documentStatus === 'COMPLETED' && hasContent && !hasRemainingChapters;
  const canResume = documentStatus === 'PAUSED' || (hasRemainingChapters && hasContent);
  const canStop = documentStatus === 'GENERATING' || documentStatus === 'PAUSED' || hasRemainingChapters;
  const canRestart = hasContent || documentStatus === 'PAUSED' || documentStatus === 'COMPLETED';
  const primaryActionLabel = canResume ? '继续生成' : '开始生成';

  const handleStart = (restartGeneration = false) => {
    if (!projectId) return;

    if (restartGeneration) {
      reset();
      setRestarting(true);
    }

    setIsGenerating(true);
    setIsPaused(false);
    setCurrentSection('');
    setDocumentStatus('GENERATING');

    start({
      url: `/api/v1/projects/${projectId}/generation/start`,
      body: restartGeneration ? { restart: true } : {},
      onChunk: (chunk) => {
        const chapterId = currentChapterIdRef.current;
        if (!chapterId) return;

        const chapterTitle = chapterMap[chapterId] || '';
        const current = streamedContentRef.current[chapterId] || '';
        const next = sanitizeChapterContent(`${current}${chunk}`, chapterTitle);

        setStreamedContent({
          ...streamedContentRef.current,
          [chapterId]: next,
        });
      },
      onProgress: (data) => {
        const event = data as { chapterId: string; status: string; sectionTitle?: string };

        if (event.status === 'started') {
          setCurrentChapter(event.chapterId);
          currentChapterIdRef.current = event.chapterId;
          setCurrentSection(event.sectionTitle || chapterMap[event.chapterId] || '');
        }

        if (event.status === 'section') {
          setCurrentSection(event.sectionTitle || '');
        }

        if (event.status === 'done') {
          addCompletedChapter(event.chapterId);
          setCurrentSection('');
        }
      },
      onDone: () => {
        setIsGenerating(false);
        setIsPaused(false);
        setCurrentChapter(null);
        setCurrentSection('');
        setRestarting(false);
        setDocumentStatus('COMPLETED');
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
    setCurrentSection('');
    setDocumentStatus('PAUSED');
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
      setDocumentStatus('COMPLETED');
      navigate(`/projects/${projectId}/editor`);
    } finally {
      setEnding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border px-6 py-3">
          <div>
            <span className="text-sm font-medium text-text-primary">论文预览</span>
            {isGenerating && currentSection && (
              <span className="ml-3 text-xs text-text-secondary">正在撰写：{currentSection}</span>
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
                {!canEnterEditor && (
                  <Button variant="primary" size="sm" onClick={() => handleStart(false)} disabled={restarting}>
                    <Play size={14} strokeWidth={1.5} className="mr-1" />
                    {primaryActionLabel}
                  </Button>
                )}
                {canEnterEditor && (
                  <Button variant="primary" size="sm" onClick={() => navigate(`/projects/${projectId}/editor`)}>
                    <CheckCircle size={14} strokeWidth={1.5} className="mr-1" />
                    进入编辑器
                  </Button>
                )}
                {canRestart && (
                  <Button variant="secondary" size="sm" onClick={() => handleStart(true)} disabled={restarting}>
                    <RotateCcw size={14} strokeWidth={1.5} className="mr-1" />
                    重新生成
                  </Button>
                )}
                {canStop && (
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
          <div className="flex items-center gap-2 border-b border-border bg-warning-subtle px-4 py-2 text-xs text-warning">
            <AlertTriangle size={13} strokeWidth={1.5} className="shrink-0" />
            <span>生成进行中，离开此页面将中断生成。如需中止，请点击“暂停生成”或“结束生成”。</span>
          </div>
        )}

        <div ref={previewRef} className="flex-1 overflow-y-auto px-8 py-6">
          {documentStatus === 'IDLE' && previewNodes.length === 0 && (
            <div className="py-20 text-center text-text-secondary">
              <p className="mb-4">准备好了，点击“开始生成”让 AI 撰写你的论文</p>
              <Button variant="primary" size="lg" onClick={() => handleStart(false)}>
                <Play size={16} strokeWidth={1.5} className="mr-1.5" />
                开始生成
              </Button>
            </div>
          )}

          {previewNodes.length > 0 && (
            <div className="mx-auto min-h-full w-full max-w-[900px] bg-white px-[88px] py-[72px] shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
              <div className="mx-auto max-w-[640px] font-serif">
                {previewNodes}
                {isGenerating && (
                  <span className="ml-1 inline-block h-5 w-0.5 animate-pulse align-middle bg-text-primary" />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex w-72 flex-col overflow-hidden border-l border-border bg-bg-subtle">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-medium text-text-primary">生成进度</p>
          <p className="mt-0.5 text-xs text-text-secondary">
            {completedLeafCount} / {totalLeafCount} 个最低层级章节已完成
          </p>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
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
                  'rounded px-2 py-2 text-sm',
                  status === 'done' && 'text-success',
                  status === 'generating' && 'bg-primary-subtle text-primary',
                  status === 'paused' && 'bg-warning-subtle text-warning',
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
                    ) : status === 'paused' ? (
                      <Pause size={14} strokeWidth={2} />
                    ) : (
                      <span className="text-text-tertiary">·</span>
                    )}
                  </span>

                  <span
                    className={cn(
                      'flex-1 truncate',
                      level === 1 ? 'font-medium' : level === 2 ? 'text-[13px]' : 'text-xs',
                      (status === 'generating' || status === 'paused') && 'font-medium'
                    )}
                  >
                    {chapter.title}
                  </span>

                  {(status === 'done' || status === 'generating' || status === 'paused') && chapterWords > 0 && isLeaf && (
                    <span className="shrink-0 text-xs opacity-60">{chapterWords} 字</span>
                  )}
                </div>

                {status === 'generating' && (
                  <div className="mt-1 space-y-0.5 pl-6 text-xs text-primary/70">
                    {isLeaf ? <p>· 当前最低层级章节生成中</p> : <p>· 子章节生成中</p>}
                    {chapterWords > 0 && isLeaf && <p>· 正在撰写内容 ({chapterWords} 字)</p>}
                    {currentSection && <p className="truncate">· {currentSection}</p>}
                  </div>
                )}

                {status === 'paused' && (
                  <div className="mt-1 space-y-0.5 pl-6 text-xs text-warning/80">
                    <p>· 当前章节已暂停</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {completedLeafCount === totalLeafCount && totalLeafCount > 0 && (
          <div className="border-t border-border px-3 py-3">
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
