import { useParams } from 'react-router-dom';
import { PaperEditor } from '../features/editor/components/PaperEditor';
import { DownloadButton } from '../features/editor/components/DownloadButton';
import { StepIndicator } from '../shared/components/StepIndicator';

export function EditorPage() {
  const { projectId } = useParams<{ projectId: string }>();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-bg-subtle">
        <h2 className="text-sm font-semibold text-text-primary">论文编辑</h2>
        <div className="flex items-center gap-4">
          <StepIndicator currentStep="EDITING" />
          <DownloadButton projectId={projectId!} />
        </div>
      </div>
      <div className="flex-1 overflow-hidden p-6">
        <PaperEditor projectId={projectId!} />
      </div>
    </div>
  );
}
