import { useParams } from 'react-router-dom';
import { MaterialsForm } from '../features/materials/components/MaterialsForm';
import { MaterialsSummary } from '../features/materials/components/MaterialsSummary';
import { StepIndicator } from '../shared/components/StepIndicator';

export function MaterialsPage() {
  const { projectId } = useParams<{ projectId: string }>();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-bg-subtle">
        <h2 className="text-sm font-semibold text-text-primary">素材收集</h2>
        <StepIndicator currentStep="MATERIALS" />
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 max-w-2xl">
          <MaterialsForm projectId={projectId!} />
        </div>
        <div className="w-[280px] flex-shrink-0 border-l border-border overflow-y-auto">
          <MaterialsSummary projectId={projectId!} />
        </div>
      </div>
    </div>
  );
}
