import { Check, X } from 'lucide-react';
import { BOOKING_STATUS as S } from '@shared/constants.js';
import { cx } from '@shared/ui/index.jsx';

// The stations a booking passes through, for each status it can currently be in.
// state: done | current | bad | upcoming
function stations(status) {
  const done = (label) => ({ label, state: 'done' });
  switch (status) {
    case S.PENDING_ADMIN_APPROVAL:
      return [done('Request sent'), { label: 'Desk review', state: 'current' }, { label: 'Decision', state: 'upcoming' }];
    case S.PRICE_REVALIDATION:
    case S.ALLOCATION_IN_PROGRESS:
      return [done('Request sent'), { label: 'Allocating seat', state: 'current' }, { label: 'Decision', state: 'upcoming' }];
    case S.CONFIRMED:
      return [done('Request sent'), done('Desk review'), done('Confirmed')];
    case S.REJECTED:
      return [done('Request sent'), done('Desk review'), { label: 'Rejected', state: 'bad' }];
    case S.REVOKED:
      return [done('Request sent'), done('Confirmed'), { label: 'Revoked', state: 'bad' }];
    case S.CANCELLED:
      return [done('Request sent'), { label: 'Cancelled by you', state: 'bad' }];
    case S.BOOKING_FAILED:
      return [done('Request sent'), done('Desk review'), { label: 'Could not complete', state: 'bad' }];
    default:
      return [done('Request sent')];
  }
}

const DOT = {
  done: 'bg-mint-600 text-white border-mint-600',
  current: 'bg-white border-signal-600 ring-4 ring-signal-100',
  bad: 'bg-stop-600 text-white border-stop-600',
  upcoming: 'bg-white border-line',
};
const LINE = { done: 'bg-mint-600', current: 'bg-mint-600', bad: 'bg-stop-600/40', upcoming: 'bg-line' };

// A booking's progress as a flight path: stations joined by a line.
export default function StatusPath({ status }) {
  const steps = stations(status);
  return (
    <ol className="flex" aria-label="Booking progress">
      {steps.map((step, index) => {
        const next = steps[index + 1];
        return (
          <li key={step.label} className={cx('flex min-w-0 flex-col', next && 'flex-1')}>
            <div className="flex items-center">
              <span className={cx('grid size-7 shrink-0 place-items-center rounded-full border-2', DOT[step.state])}>
                {step.state === 'done' && <Check className="size-4" strokeWidth={3} aria-hidden="true" />}
                {step.state === 'bad' && <X className="size-4" strokeWidth={3} aria-hidden="true" />}
                {step.state === 'current' && <span className="size-2 rounded-full bg-signal-600" aria-hidden="true" />}
              </span>
              {next && <span className={cx('mx-2 h-0.5 flex-1 rounded-full', LINE[next.state])} aria-hidden="true" />}
            </div>
            <span className={cx('mt-2 pr-3 text-sm', step.state === 'upcoming' ? 'text-ink-faint' : 'font-semibold text-ink')}>
              {step.label}
              {step.state === 'current' && <span className="sr-only"> (current step)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
