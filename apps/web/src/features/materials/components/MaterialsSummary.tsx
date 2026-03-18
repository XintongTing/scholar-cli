import { useMaterials } from '../hooks/useMaterials';
import { CheckCircle, SkipForward } from 'lucide-react';
import { Spinner } from '../../../shared/components/Spinner';
import type { Material } from '../types';

interface MaterialsSummaryProps {
  projectId: string;
}

export function MaterialsSummary({ projectId }: MaterialsSummaryProps) {
  const { data: materials, isLoading } = useMaterials(projectId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Spinner size="sm" />
      </div>
    );
  }

  const items = materials ?? [];

  return (
    <div className="flex flex-col gap-2 p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-2">素材摘要</h3>
      {items.length === 0 ? (
        <p className="text-xs text-text-tertiary">尚未提交任何素材</p>
      ) : (
        items.map((m: Material) => (
          <div key={m.id} className="flex items-start gap-2">
            {m.skipped ? (
              <SkipForward size={14} strokeWidth={1.5} className="text-text-tertiary flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle size={14} strokeWidth={1.5} className="text-success flex-shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium text-text-primary">{m.label}</p>
              {m.textContent && (
                <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{m.textContent}</p>
              )}
              {m.fileKey && !m.textContent && (
                <p className="text-xs text-text-tertiary mt-0.5">文件已上传</p>
              )}
              {m.skipped && (
                <p className="text-xs text-text-tertiary mt-0.5 italic">已跳过</p>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
