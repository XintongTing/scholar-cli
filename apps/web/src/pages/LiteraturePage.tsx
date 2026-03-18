import { useParams } from 'react-router-dom';
import { LiteratureUpload } from '../features/literature/components/LiteratureUpload';
import { LiteratureList } from '../features/literature/components/LiteratureList';
import { StepIndicator } from '../shared/components/StepIndicator';

export function LiteraturePage() {
  const { projectId } = useParams<{ projectId: string }>();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-bg-subtle">
        <h2 className="text-sm font-semibold text-text-primary">文献管理</h2>
        <StepIndicator currentStep="LITERATURE" />
      </div>
      <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full">
        <div className="flex flex-col gap-6">
          <LiteratureUpload projectId={projectId!} />
          <LiteratureList projectId={projectId!} />
        </div>
      </div>
    </div>
  );
}
