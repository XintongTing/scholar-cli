import { RotateCcw } from 'lucide-react';
import { useRollback } from '../hooks/usePromptAdmin';
import { Button } from '../../../shared/components/Button';
import type { PromptNode } from '../types';

interface VersionHistoryProps {
  node: PromptNode;
}

export function VersionHistory({ node }: VersionHistoryProps) {
  const { mutate: rollback, isPending } = useRollback(node.id);

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">版本历史</h4>
      {node.versions.slice().reverse().map((version) => {
        const isCurrent = version.version === node.currentVersion;
        return (
          <div
            key={version.id}
            className={`flex items-center justify-between p-3 rounded-md border ${
              isCurrent ? 'border-primary bg-primary-subtle' : 'border-border bg-bg-base'
            }`}
          >
            <div>
              <p className="text-sm font-medium text-text-primary">
                v{version.version}
                {isCurrent && (
                  <span className="ml-2 text-xs text-primary font-normal">当前</span>
                )}
              </p>
              <p className="text-xs text-text-tertiary">
                {new Date(version.createdAt).toLocaleString('zh-CN')}
              </p>
            </div>
            {!isCurrent && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => rollback(version.version)}
                disabled={isPending}
              >
                <RotateCcw size={12} strokeWidth={1.5} />
                回滚
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
