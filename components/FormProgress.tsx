"use client";

interface Step {
  label: string;
  complete: boolean;
}

interface FormProgressProps {
  steps: Step[];
  className?: string;
}

export default function FormProgress({ steps, className = "" }: FormProgressProps) {
  const completedCount = steps.filter((s) => s.complete).length;
  const totalCount = steps.length;
  const percent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  // Find the current active step (first incomplete)
  const activeIndex = steps.findIndex((s) => !s.complete);
  const currentStep = activeIndex === -1 ? totalCount - 1 : activeIndex;

  return (
    <div className={`space-y-2 ${className}`} aria-label="Form progress">
      {/* Step labels */}
      <ol className="flex items-center gap-0">
        {steps.map((step, idx) => {
          const isComplete = step.complete;
          const isActive = idx === currentStep;
          const isPast = idx < currentStep;
          return (
            <li key={step.label} className="flex items-center flex-1 min-w-0">
              {/* Connector line before (skip first) */}
              {idx > 0 && (
                <div
                  className={`h-0.5 flex-1 transition-colors duration-500 ${
                    isPast || isComplete ? "bg-[var(--brand)]" : "bg-[var(--border)]"
                  }`}
                />
              )}
              {/* Circle */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 border-2 ${
                    isComplete
                      ? "bg-[var(--brand)] border-[var(--brand)] text-white"
                      : isActive
                      ? "border-[var(--brand)] text-[var(--brand)] bg-[var(--surface)]"
                      : "border-[var(--border)] text-[var(--ink-soft)] bg-[var(--surface)]"
                  }`}
                >
                  {isComplete ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>
                <span
                  className={`mt-1 text-[10px] font-medium whitespace-nowrap transition-colors duration-300 hidden sm:block ${
                    isComplete
                      ? "text-[var(--brand)]"
                      : isActive
                      ? "text-[var(--ink)]"
                      : "text-[var(--ink-soft)]"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {/* Connector line after (skip last) */}
              {idx < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 transition-colors duration-500 ${
                    isComplete ? "bg-[var(--brand)]" : "bg-[var(--border)]"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* Continuous bar */}
      <div className="h-1 w-full rounded-full bg-[var(--border)] overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--brand)] transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${percent}% complete`}
        />
      </div>
      <p className="text-xs text-[var(--ink-soft)] text-right">
        {completedCount} of {totalCount} sections complete
      </p>
    </div>
  );
}
