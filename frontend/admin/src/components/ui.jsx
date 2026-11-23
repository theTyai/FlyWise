// Building blocks used across desk pages.
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { BOOKING_STATUS as S } from '@shared/constants.js';
import { cx } from '@shared/ui/index.jsx';

export function PageHeader({ title, lead, actions, children }) {
  return (
    <div className="mb-7">
      {children}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[1.75rem] leading-tight font-bold tracking-tight">{title}</h1>
          {lead && <p className="mt-1 max-w-2xl text-[15px] text-ink-soft">{lead}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
      </div>
    </div>
  );
}

export function Panel({ title, lead, actions, className, bodyClassName, children }) {
  return (
    <section className={cx('rounded-2xl bg-white shadow-pass', className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
          <div className="min-w-0">
            {title && <h2 className="text-[17px] font-bold tracking-tight">{title}</h2>}
            {lead && <p className="mt-0.5 text-sm text-ink-soft">{lead}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={cx('p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

// Search box that reports its value after the admin stops typing.
export function SearchField({ value, onChange, placeholder, label = 'Search' }) {
  const [text, setText] = useState(value || '');
  useEffect(() => { setText(value || ''); }, [value]);
  useEffect(() => {
    if (text === (value || '')) return undefined;
    const timer = setTimeout(() => onChange(text.trim()), 350);
    return () => clearTimeout(timer);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <label className="relative block w-full sm:w-72">
      <span className="sr-only">{label}</span>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
      <input type="search" className="field pl-9" placeholder={placeholder} value={text} onChange={(event) => setText(event.target.value)} />
    </label>
  );
}

export function Pagination({ meta, onPage }) {
  if (!meta || meta.pages <= 1) {
    return meta ? <p className="px-5 py-3.5 text-sm text-ink-faint">{meta.total} {meta.total === 1 ? 'result' : 'results'}</p> : null;
  }
  const from = (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.total, meta.page * meta.limit);
  const btn = 'grid size-9 place-items-center rounded-lg border border-line bg-white text-ink-soft transition-colors hover:border-night-600 hover:text-ink disabled:opacity-40 disabled:hover:border-line';
  return (
    <nav className="flex items-center justify-between gap-4 px-5 py-3" aria-label="Pages">
      <p className="text-sm text-ink-faint"><span className="board text-[15px] text-ink-soft">{from}-{to}</span> of <span className="board text-[15px] text-ink-soft">{meta.total}</span></p>
      <div className="flex items-center gap-2">
        <button type="button" className={btn} disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)} aria-label="Previous page"><ChevronLeft className="size-4" /></button>
        <span className="board min-w-14 text-center text-[15px] text-ink-soft">{meta.page} / {meta.pages}</span>
        <button type="button" className={btn} disabled={meta.page >= meta.pages} onClick={() => onPage(meta.page + 1)} aria-label="Next page"><ChevronRight className="size-4" /></button>
      </div>
    </nav>
  );
}

// Tabs that filter a list. Each tab may carry a count.
export function Tabs({ tabs, value, onChange, label }) {
  return (
    <div role="tablist" aria-label={label} className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-px">
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value || 'all'} type="button" role="tab" aria-selected={active} onClick={() => onChange(tab.value)}
            className={cx('flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-[15px] font-medium transition-colors',
              active ? 'bg-night-900 text-white' : 'text-ink-soft hover:bg-night-900/5 hover:text-ink')}
          >
            {tab.label}
            {tab.count !== undefined && tab.count !== null && (
              <span className={cx('board rounded-md px-1.5 text-sm', active ? 'bg-white/15' : 'bg-night-900/6 text-ink-soft')}>{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Seat use for one flight: a bar split into allocated and free, with the numbers in words.
export function SeatBar({ total, available, need = 0, compact = false }) {
  const allocated = Math.max(0, total - available);
  const pct = total ? (allocated / total) * 100 : 0;
  const needPct = total ? (Math.min(need, available) / total) * 100 : 0;
  const short = need > available;
  return (
    <div>
      <div className={cx('flex items-baseline justify-between gap-3', compact ? 'text-sm' : 'text-[15px]')}>
        <span><span className="board text-lg font-semibold text-ink">{available}</span> <span className="text-ink-soft">free of {total}</span></span>
        {!compact && <span className="text-sm text-ink-faint">{allocated} allocated</span>}
      </div>
      <div className={cx('mt-1.5 flex w-full overflow-hidden rounded-full bg-mist', compact ? 'h-1.5' : 'h-2.5')} role="img"
        aria-label={`${allocated} of ${total} seats allocated, ${available} free`}>
        <span className="h-full bg-night-700" style={{ width: `${pct}%` }} />
        {need > 0 && <span className={cx('ml-0.5 h-full', short ? 'bg-stop-600' : 'bg-signal-500')} style={{ width: `${short ? 100 - pct : needPct}%` }} />}
      </div>
    </div>
  );
}

export const STATUS_TABS = [
  { value: '', label: 'All Bookings' },
  { value: S.CONFIRMED, label: 'Confirmed' },
  { value: S.CANCELLED, label: 'Cancelled' },
  { value: S.REVOKED, label: 'Revoked' },
  { value: S.PENDING_ADMIN_APPROVAL, label: 'Awaiting' },
];

// Plain-language names for audit log actions.
export const AUDIT_LABEL = {
  BOOKING_CONFIRMED: 'Confirmed booking',
  BOOKING_REJECTED: 'Rejected request',
  BOOKING_REVOKED: 'Revoked booking',
  BOOKING_FAILED: 'Allocation failed',
  ALLOCATION_FAILED_NO_SEATS: 'No seats to allocate',
  INVENTORY_CREATED: 'Added inventory',
  INVENTORY_UPDATED: 'Changed seat total',
  USER_SUSPENDED: 'Suspended traveller',
  USER_REACTIVATED: 'Reactivated traveller',
  SETTINGS_UPDATED: 'Changed settings',
};
