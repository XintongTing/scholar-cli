import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pause, Play, CheckCircle } from 'lucide-react';
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
}

// Map chapterId -> chapter title for progress labels
function useChapterMap(chapters: Chapter[]) {
  return chapters.reduce<Record<string, string>>((acc, c) => {
    acc[c.id] = c.title;
    return acc;
  }, {});
}

export function GenerationPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    completedChapters, currentChapterId, streamedContent,
    isPaused, isGenerating,
    setCurrentChapter, addCompletedChapter, appendStreamedContent,
    setIsPaused, setIsGenerating, reset
  } = useGenerationStore();
  const { start, stop } = useSSEStream();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSection, setCurrentSection] = useState('');
  const previewRef = useRef<HTMLDivElement>(null);
  // Track current chapterId in a ref so onChunk closure always has latest value
  const currentChapterIdRef = useRef<string | null>(null);

  useEffect(() => {
    currentChapterIdRef.current = currentChapterId;
  }, [currentChapterId]);

  useEffect(() => {
    if (!projectId) return;
    outlineApi.get(projectId).then((res) => {
      setChapters(res.data.data?.chapters || []);
    }).finally(() => setLoading(false));
  }, [projectId]);

  // Auto-scroll preview to bottom as content streams in
  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.scrollTop = previewRef.current.scrollHeight;
    }
  }, [streamedContent]);

  const chapterMap = useChapterMap(chapters);

  const handleStart = () => {
    if (!projectId) return;
    reset();
    setIsGenerating(true);
    setCurrentSection('');

    start({
      url: `/api/v1/projects/${projectId}/generation/start`,
      body: {},
      onChunk: (chunk) => {
        const id = currentChapterIdRef.current;
        if (id) appendStreamedContent(id, chunk);
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
        navigate(`/projects/${projectId}/editor`);
      },
      onError: (_code, _msg) => {
        setIsGenerating(false);
      },
    });
  };

  const handlePause = async () => {
    if (!projectId) return;
    stop();
    await http.post(`/projects/${projectId}/generation/pause`);
    setIsPaused(true);
    setIsGenerating(false);
  };

  // Build ordered preview: completed chapters + currently streaming chapter
  const orderedContent = chapters
    .map((ch) => streamedContent[ch.id] || '')
    .filter(Boolean)
    .join('\n\n');

  if (loading) return <div className="flex items-center justify-center h-full"><Spinner size="lg" /></div>;

  return (
    <div className="flex h-full">
      {/* Preview Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-border px-6 py-3 flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-text-primary">论文预览</span>
            {isGenerating && currentSection && (
              <span className="ml-3 text-xs text-text-secondary">
                正在撰写：{currentSection}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {isGenerating ? (
              <Button variant="secondary" size="sm" onClick={handlePause}>
                <Pause size={14} strokeWidth={1.5} className="mr-1" />
                暂停
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={handleStart} disabled={isGenerating}>
                <Play size={14} strokeWidth={1.5} className="mr-1" />
                {isPaused ? '继续生成' : '开始生成'}
              </Button>
            )}
          </div>
        </div>

        <div ref={previewRef} className="flex-1 overflow-y-auto px-8 py-6">
          {!isGenerating && !orderedContent && (
            <div className="text-center py-20 text-text-secondary">
              <p className="mb-4">准备好了，点击"开始生成"让 AI 撰写你的论文</p>
              <Button variant="primary" size="lg" onClick={handleStart}>
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

      {/* Progress Panel */}
      <div className="w-72 border-l border-border bg-bg-subtle flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-medium text-text-primary">生成进度</p>
          <p className="text-xs text-text-secondary mt-0.5">
            {completedChapters.length} / {chapters.length} 章已完成
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {chapters.map((chapter) => {
            const isDone = completedChapters.includes(chapter.id);
            const isCurrent = currentChapterId === chapter.id;

            return (
              <div
                key={chapter.id}
                className={cn(
                  'flex items-center gap-2 px-2 py-2 rounded text-sm',
                  isDone && 'text-success',
                  isCurrent && 'text-primary bg-primary-subtle',
                  !isDone && !isCurrent && 'text-text-tertiary'
                )}
              >
                <span className="w-4 shrink-0 text-center">
                  {isDone ? (
                    <CheckCircle size={14} strokeWidth={2} />
                  ) : isCurrent ? (
                    <Spinner size="sm" />
                  ) : (
                    <span className="text-text-tertiary">·</span>
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <span className={cn('truncate block', isCurrent && 'font-medium')}>
                    {chapter.title}
                  </span>
                  {isCurrent && currentSection && currentSection !== chapter.title && (
                    <span className="text-xs text-primary/70 truncate block">
                      {currentSection}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {completedChapters.length === chapters.length && chapters.length > 0 && (
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
