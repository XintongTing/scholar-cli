import { CheckCircle, Circle, Loader2 } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

interface Chapter {
  id: string;
  order: number;
  title: string;
}

interface ProgressPanelProps {
  chapters: Chapter[];
  completedChapters: string[];
  currentChapterId: string | null;
}

export function ProgressPanel({ chapters, completedChapters, currentChapterId }: ProgressPanelProps) {
  return (
    <div className="flex flex-col gap-1 p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-3">生成进度</h3>
      {chapters.map((chapter) => {
        const isDone = completedChapters.includes(chapter.id);
        const isActive = currentChapterId === chapter.id;
        return (
          <div key={chapter.id} className="flex items-center gap-2 py-1.5">
            {isDone ? (
              <CheckCircle size={14} strokeWidth={1.5} className="text-success flex-shrink-0" />
            ) : isActive ? (
              <Loader2 size={14} strokeWidth={1.5} className="text-primary animate-spin flex-shrink-0" />
            ) : (
              <Circle size={14} strokeWidth={1.5} className="text-text-tertiary flex-shrink-0" />
            )}
            <span
              className={cn(
                'text-sm truncate',
                isDone && 'text-text-secondary line-through',
                isActive && 'text-primary font-medium',
                !isDone && !isActive && 'text-text-tertiary',
              )}
            >
              {chapter.order}. {chapter.title}
            </span>
          </div>
        );
      })}
    </div>
  );
}
