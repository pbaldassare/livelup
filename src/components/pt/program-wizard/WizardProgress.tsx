import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WizardProgressProps {
  currentStep: number;
  totalSteps: number;
  steps: { label: string; short: string }[];
  onStepClick?: (step: number) => void;
}

export function WizardProgress({
  currentStep,
  totalSteps,
  steps,
  onStepClick,
}: WizardProgressProps) {
  return (
    <div className="px-6 py-3 border-b bg-muted/20">
      <div className="flex items-center justify-between gap-1">
        {steps.map((step, idx) => {
          const stepNum = idx + 1;
          const isCompleted = stepNum < currentStep;
          const isActive = stepNum === currentStep;
          const isClickable = !!onStepClick && stepNum < currentStep;

          return (
            <div key={idx} className="flex items-center flex-1 min-w-0">
              <button
                type="button"
                onClick={() => isClickable && onStepClick?.(stepNum)}
                disabled={!isClickable}
                className={cn(
                  'flex items-center gap-2 min-w-0',
                  isClickable && 'cursor-pointer hover:opacity-80',
                )}
              >
                <div
                  className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all',
                    isCompleted && 'bg-primary text-primary-foreground',
                    isActive &&
                      'bg-primary text-primary-foreground ring-4 ring-primary/20',
                    !isCompleted && !isActive && 'bg-muted text-muted-foreground',
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : stepNum}
                </div>
                <span
                  className={cn(
                    'text-xs font-medium truncate hidden sm:inline',
                    (isActive || isCompleted) ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {step.short}
                </span>
              </button>
              {stepNum < totalSteps && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2 transition-colors',
                    isCompleted ? 'bg-primary' : 'bg-muted',
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-2 sm:hidden text-center">
        Step {currentStep} di {totalSteps} · {steps[currentStep - 1]?.label}
      </p>
    </div>
  );
}
