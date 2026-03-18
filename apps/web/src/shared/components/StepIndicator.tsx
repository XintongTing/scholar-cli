import { cn } from '../utils/cn';
import { STEP_LABELS, STEP_ORDER, type Step } from '../constants/steps';

interface StepIndicatorProps {
  currentStep: Step;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const currentIdx = STEP_ORDER.indexOf(currentStep);

  return (
    <div className="flex items-center gap-0">
      {STEP_ORDER.map((step, idx) => {
        const isDone = idx < currentIdx;
        const isActive = idx === currentIdx;
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'w-2 h-2 rounded-full transition-colors',
                  isDone && 'bg-success',
                  isActive && 'bg-primary',
                  !isDone && !isActive && 'bg-border-strong',
                )}
              />
              <span
                className={cn(
                  'text-xs whitespace-nowrap',
                  isActive ? 'text-primary font-medium' : 'text-text-tertiary',
                )}
              >
                {STEP_LABELS[step]}
              </span>
            </div>
            {idx < STEP_ORDER.length - 1 && (
              <div
                className={cn(
                  'h-px w-8 mb-4 mx-1 transition-colors',
                  idx < currentIdx ? 'bg-success' : 'bg-border',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
