import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { ChatInterface } from '../features/outline/components/ChatInterface';
import { OutlineSidebar } from '../features/outline/components/OutlineSidebar';
import { OnboardingCard } from '../features/outline/components/OnboardingCard';
import { StepIndicator } from '../shared/components/StepIndicator';
import { useProject } from '../features/projects/hooks/useProjects';

export function OutlinePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project } = useProject(projectId!);
  const [onboardingDone, setOnboardingDone] = useState(false);

  const hasProfile = project && Object.keys(project.userProfile ?? {}).length > 0;
  const showChat = onboardingDone || hasProfile;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-bg-subtle">
        <h2 className="text-sm font-semibold text-text-primary">大纲规划</h2>
        <StepIndicator currentStep="OUTLINE" />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main chat area */}
        <div className="flex-1 overflow-hidden">
          {showChat ? (
            <ChatInterface projectId={projectId!} />
          ) : (
            <div className="overflow-y-auto h-full">
              <OnboardingCard
                onSubmit={(_data) => {
                  setOnboardingDone(true);
                }}
              />
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="w-[280px] flex-shrink-0 border-l border-border overflow-hidden flex flex-col">
          <OutlineSidebar projectId={projectId!} />
        </div>
      </div>
    </div>
  );
}
