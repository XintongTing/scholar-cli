import { Trash2, FileText } from 'lucide-react';
import type { Literature } from '../types';

interface LiteratureItemProps {
  literature: Literature;
  onDelete: () => void;
}

export function LiteratureItem({ literature, onDelete }: LiteratureItemProps) {
  return (
    <div className="group flex items-start gap-3 p-4 rounded-lg border border-border bg-bg-base hover:border-border-strong transition-colors">
      <FileText size={20} strokeWidth={1.5} className="text-text-tertiary flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{literature.title}</p>
        {literature.authors.length > 0 && (
          <p className="text-xs text-text-secondary mt-0.5">{literature.authors.join(', ')}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          {literature.year && (
            <span className="text-xs text-text-tertiary">{literature.year}</span>
          )}
          {literature.source && (
            <span className="text-xs text-text-tertiary truncate">{literature.source}</span>
          )}
        </div>
        {literature.abstract && (
          <p className="text-xs text-text-secondary mt-1.5 line-clamp-2">{literature.abstract}</p>
        )}
      </div>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-danger-subtle hover:text-danger text-text-tertiary transition-all flex-shrink-0"
        aria-label="删除文献"
      >
        <Trash2 size={14} strokeWidth={1.5} />
      </button>
    </div>
  );
}
