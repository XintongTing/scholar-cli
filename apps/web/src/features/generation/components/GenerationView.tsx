import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGeneration } from '../hooks/useGeneration';
import { GenerationControls } from './GenerationControls';
import { ProgressPanel } from './ProgressPanel';
import type { Outline } from '../../outline/types';

interface GenerationViewProps {
  projectId: string;
  outline: Outline;
}

export function GenerationView({ projectId, outline }: GenerationViewProps) {
  const navigate = useNavigate();
  const {
    status,
    completedChapters,
    currentChapterId,
    streamedContent,
    startGeneration,
    pauseGeneration,
    resumeGeneration,
  } = useGeneration(projectId);

  useEffect(() => {
    if (status === 'completed') {
      const timer = setTimeout(() => {
        navigate(`/projects/${projectId}/editor`);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, projectId, navigate]);

  const currentContent = currentChapterId ? streamedContent[currentChapterId] ?? '' : '';
  const lastCompletedId = completedChapters[completedChapters.length - 1];
  const previewContent = currentContent || (lastCompletedId ? streamedContent[lastCompletedId] ?? '' : '');

  return (
    <div className="flex h-full">
      {/* Left: content preview */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-text-primary">内容预览</h2>
          <GenerationControls
            status={status}
            onStart={startGeneration}
            onPause={pauseGeneration}
            onResume={resumeGeneration}
          />
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {previewContent ? (
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-text-primary font-sans leading-relaxed">
                {previewContent}
              </pre>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-text-tertiary">
              {status === 'idle' ? '点击"开始生成"开始写作' : '等待内容生成...'}
            </div>
          )}
        </div>
      </div>

      {/* Right: progress panel */}
      <div className="w-[280px] flex-shrink-0 border-l border-border overflow-y-auto">
        <ProgressPanel
          chapters={outline.chapters}
          completedChapters={completedChapters}
          currentChapterId={currentChapterId}
        />
      </div>
    </div>
  );
}
