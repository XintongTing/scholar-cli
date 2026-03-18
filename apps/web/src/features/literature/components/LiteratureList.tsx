import { CheckCircle, BookOpen } from 'lucide-react';
import { LiteratureItem } from './LiteratureItem';
import { useLiterature, useDeleteLiterature, useConfirmLiterature } from '../hooks/useLiterature';
import { Button } from '../../../shared/components/Button';
import { Spinner } from '../../../shared/components/Spinner';
import { EmptyState } from '../../../shared/components/EmptyState';
import { useNavigate } from 'react-router-dom';
import type { Literature } from '../types';

interface LiteratureListProps {
  projectId: string;
}

export function LiteratureList({ projectId }: LiteratureListProps) {
  const navigate = useNavigate();
  const { data: literature, isLoading } = useLiterature(projectId);
  const { mutate: deleteLit } = useDeleteLiterature(projectId);
  const { mutateAsync: confirm, isPending: confirming } = useConfirmLiterature(projectId);

  async function handleConfirm() {
    await confirm();
    navigate(`/projects/${projectId}/materials`);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Spinner size="md" />
      </div>
    );
  }

  const items = literature ?? [];

  return (
    <div className="flex flex-col gap-4">
      {items.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={32} strokeWidth={1.5} />}
          title="还没有文献"
          description="上传 PDF 文献，AI 将自动提取元数据"
        />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((lit: Literature) => (
            <LiteratureItem
              key={lit.id}
              literature={lit}
              onDelete={() => deleteLit(lit.id)}
            />
          ))}
        </div>
      )}

      {items.length > 0 && (
        <Button
          variant="primary"
          size="md"
          onClick={handleConfirm}
          disabled={confirming}
          className="self-end"
        >
          <CheckCircle size={16} strokeWidth={1.5} />
          {confirming ? '确认中...' : '确认文献，进入下一步'}
        </Button>
      )}
    </div>
  );
}
