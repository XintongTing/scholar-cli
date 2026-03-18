import { ChevronRight } from 'lucide-react';
import { usePromptNodes } from '../hooks/usePromptAdmin';
import { Spinner } from '../../../shared/components/Spinner';
import type { PromptNode } from '../types';

interface PromptNodeListProps {
  selectedId: string | null;
  onSelect: (node: PromptNode) => void;
}

export function PromptNodeList({ selectedId, onSelect }: PromptNodeListProps) {
  const { data: nodes, isLoading } = usePromptNodes();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Spinner size="sm" />
      </div>
    );
  }

  const items = nodes ?? [];

  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide px-3 py-2">
        提示词节点
      </h3>
      {items.map((node) => (
        <button
          key={node.id}
          onClick={() => onSelect(node)}
          className={`flex items-center justify-between w-full px-3 py-2.5 rounded-md text-sm transition-colors text-left ${
            selectedId === node.id
              ? 'bg-primary-subtle text-primary font-medium'
              : 'text-text-secondary hover:bg-bg-muted hover:text-text-primary'
          }`}
        >
          <div className="min-w-0">
            <p className="truncate">{node.name}</p>
            {node.description && (
              <p className="text-xs text-text-tertiary truncate mt-0.5">{node.description}</p>
            )}
          </div>
          <ChevronRight size={14} strokeWidth={1.5} className="flex-shrink-0 ml-2" />
        </button>
      ))}
    </div>
  );
}
