import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { GenerationView } from '../features/generation/components/GenerationView';
import { StepIndicator } from '../shared/components/StepIndicator';
import { Spinner } from '../shared/components/Spinner';
import * as outlineApi from '../features/outline/api';

export function GenerationPage() {
  const { projectId } = useParams<{ projectId: string }>();

  const { data: outline, isLoading } = useQuery({
    queryKey: ['outline', projectId],
    queryFn: () => outlineApi.getOutline(projectId!),
    enabled: !!projectId,
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-bg-subtle">
        <h2 className="text-sm font-semibold text-text-primary">AI 生成</h2>
        <StepIndicator currentStep="GENERATING" />
      </div>
      <div className="flex-1 overflow-hidden">
        {isLoading || !outline ? (
          <div className="flex items-center justify-center h-full">
            <Spinner size="lg" />
          </div>
        ) : (
          <GenerationView projectId={projectId!} outline={outline} />
        )}
      </div>
    </div>
  );
}
