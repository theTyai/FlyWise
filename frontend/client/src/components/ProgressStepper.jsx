import { Check } from 'lucide-react';
import { cx } from '@shared/ui/index.jsx';

const STEPS = [
  { id: 1, label: 'Search' },
  { id: 2, label: 'Passenger Info' },
  { id: 3, label: 'Lock & Pay' },
  { id: 4, label: 'E-Ticket' },
];

export default function ProgressStepper({ currentStep = 1 }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      <nav aria-label="Booking Progress">
        <ol className="flex items-center justify-between">
          {STEPS.map((step, idx) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            return (
              <li key={step.id} className="relative flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center">
                  <span
                    className={cx(
                      'flex size-8 items-center justify-center rounded-full text-xs font-bold transition-all shadow-xs',
                      isCompleted ? 'bg-mint-600 text-white' :
                      isCurrent ? 'bg-signal-600 text-white ring-4 ring-signal-100' :
                      'bg-white text-ink-faint border border-line'
                    )}
                  >
                    {isCompleted ? <Check className="size-4 stroke-[3]" /> : step.id}
                  </span>
                  <span
                    className={cx(
                      'mt-1.5 text-[11px] font-semibold tracking-tight whitespace-nowrap',
                      isCurrent ? 'text-signal-700' : isCompleted ? 'text-mint-700' : 'text-ink-faint'
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={cx(
                      'h-0.5 w-full mx-2 -mt-4 transition-colors',
                      currentStep > step.id ? 'bg-mint-600' : 'bg-line'
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
