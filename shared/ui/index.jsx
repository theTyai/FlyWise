// Small UI kit shared by the traveller app and the desk app.
import { useEffect, useRef } from 'react';
import { Info, TriangleAlert, CircleCheck, X } from 'lucide-react';
import { STATUS_META } from '../constants.js';

export const cx = (...parts) => parts.filter(Boolean).join(' ');

export function Spinner({ className = 'size-4' }) {
  return (
    <svg className={cx('spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

const BUTTON_VARIANTS = {
  primary: 'bg-signal-600 text-white hover:bg-signal-700',
  navy: 'bg-night-900 text-white hover:bg-night-800',
  outline: 'border border-line bg-white text-ink hover:border-night-600',
  ghost: 'text-ink-soft hover:bg-night-900/5 hover:text-ink',
  danger: 'bg-stop-600 text-white hover:bg-stop-700',
  dangerOutline: 'border border-stop-600/40 bg-white text-stop-700 hover:bg-stop-50',
};
const BUTTON_SIZES = {
  sm: 'h-9 px-3.5 text-sm rounded-lg',
  md: 'h-11 px-5 text-[15px] rounded-xl',
  lg: 'h-13 px-6 text-base rounded-xl',
};

export function Button({ variant = 'primary', size = 'md', loading = false, className, children, disabled, type = 'button', ...props }) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cx(
        'inline-flex shrink-0 items-center justify-center gap-2 font-semibold whitespace-nowrap transition-colors disabled:opacity-55',
        BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className,
      )}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

const PILL_TONES = {
  pending: 'bg-wait-50 text-wait-700',
  progress: 'bg-signal-100 text-signal-700',
  confirmed: 'bg-mint-50 text-mint-700',
  rejected: 'bg-stop-50 text-stop-700',
  cancelled: 'bg-night-900/8 text-ink-soft',
  revoked: 'bg-void-50 text-void-700',
};
const PILL_DOTS = {
  pending: 'bg-wait-700', progress: 'bg-signal-600', confirmed: 'bg-mint-600',
  rejected: 'bg-stop-600', cancelled: 'bg-ink-faint', revoked: 'bg-void-700',
};

// Status is always shown as a dot AND a word, never colour alone.
export function StatusPill({ status, className }) {
  const meta = STATUS_META[status] || { label: status, tone: 'cancelled' };
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold whitespace-nowrap', PILL_TONES[meta.tone], className)}>
      <span className={cx('size-1.5 rounded-full', PILL_DOTS[meta.tone])} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

const NOTICE = {
  info: { box: 'bg-signal-50 text-night-800 border-signal-200', Icon: Info },
  warn: { box: 'bg-wait-50 text-wait-700 border-wait-700/20', Icon: TriangleAlert },
  error: { box: 'bg-stop-50 text-stop-700 border-stop-600/25', Icon: TriangleAlert },
  success: { box: 'bg-mint-50 text-mint-700 border-mint-600/25', Icon: CircleCheck },
};

export function Notice({ tone = 'info', title, children, action, className }) {
  const { box, Icon } = NOTICE[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cx('flex items-start gap-3 rounded-xl border px-4 py-3 text-sm', box, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5' : ''}>{children}</div>}
      </div>
      {action}
    </div>
  );
}

export function Field({ label, hint, error, htmlFor, children, className }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink">{label}</label>
      {children}
      {error ? <p className="mt-1.5 text-sm text-stop-700">{error}</p>
        : hint ? <p className="mt-1.5 text-sm text-ink-faint">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-white px-6 py-12 text-center">
      {Icon && <Icon className="mx-auto size-8 text-ink-faint" aria-hidden="true" />}
      <h3 className="mt-3 text-lg font-semibold">{title}</h3>
      {children && <p className="mx-auto mt-1 max-w-md text-[15px] text-ink-soft">{children}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

// Modal dialog built on the native <dialog>, so focus trapping and Escape come for free.
export function Dialog({ open, onClose, title, children, footer }) {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => { if (event.target === ref.current) onClose(); }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl bg-white p-0 text-ink shadow-pop backdrop:bg-night-950/55"
    >
      <div className="flex items-start justify-between gap-4 px-6 pt-5">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 rounded-lg p-1.5 text-ink-faint hover:bg-night-900/5 hover:text-ink">
          <X className="size-5" />
        </button>
      </div>
      <div className="px-6 pt-2 pb-5 text-[15px] text-ink-soft">{children}</div>
      {footer && <div className="flex flex-wrap justify-end gap-3 border-t border-line px-6 py-4">{footer}</div>}
    </dialog>
  );
}

export function PageLoading({ label = 'Loading' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-24 text-ink-soft" role="status">
      <Spinner className="size-5" />
      <span>{label}</span>
    </div>
  );
}
