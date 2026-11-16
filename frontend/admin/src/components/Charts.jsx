// Hand-built SVG charts for the desk overview. Thin marks, one baseline, hover tooltips,
// and every value also available as text (legend rows or the figures beside the chart).
import { useEffect, useRef, useState } from 'react';
import { STATUS_META } from '@shared/constants.js';
import { cx } from '@shared/ui/index.jsx';

function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

const niceMax = (value) => {
  if (value <= 4) return 4;
  const step = 10 ** Math.floor(Math.log10(value));
  const scaled = Math.ceil(value / step);
  return (scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10) * step;
};

const dayLabel = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
const asDate = (iso) => new Date(`${iso}T12:00:00+05:30`);

// Column per day, rounded at the data end, square on the baseline.
export function DailyColumns({ data }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const height = 210;
  const pad = { top: 22, right: 4, bottom: 26, left: 30 };
  const innerW = Math.max(0, width - pad.left - pad.right);
  const innerH = height - pad.top - pad.bottom;
  const max = niceMax(Math.max(1, ...data.map((d) => d.count)));
  const ticks = [0, max / 2, max];
  const band = data.length ? innerW / data.length : 0;
  const barW = Math.min(24, band * 0.6);
  const y = (v) => pad.top + innerH - (v / max) * innerH;
  const peak = data.reduce((best, d, i) => (d.count > (data[best]?.count ?? -1) ? i : best), 0);
  const last = data.length - 1;

  const column = (x, top, w) => {
    const h = pad.top + innerH - top;
    if (h <= 0) return '';
    const r = Math.min(4, w / 2, h);
    return `M${x},${pad.top + innerH} V${top + r} Q${x},${top} ${x + r},${top} H${x + w - r} Q${x + w},${top} ${x + w},${top + r} V${pad.top + innerH} Z`;
  };

  return (
    <div ref={ref} className="relative">
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={`Booking requests per day for the last ${data.length} days. Busiest day: ${data[peak]?.count ?? 0}.`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeWidth="1" />
              <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="board" fontSize="13" fill="var(--color-ink-faint)">{t}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const x = pad.left + i * band + (band - barW) / 2;
            const showLabel = d.count > 0 && (i === peak || i === last);
            return (
              <g key={d.date}>
                <path d={column(x, y(d.count), barW)} fill={hover === i ? 'var(--color-signal-700)' : 'var(--color-signal-600)'} />
                {showLabel && (
                  <text x={x + barW / 2} y={y(d.count) - 7} textAnchor="middle" className="board" fontSize="14" fontWeight="600" fill="var(--color-ink)">{d.count}</text>
                )}
                {(i % 2 === last % 2) && (
                  <text x={x + barW / 2} y={height - 6} textAnchor="middle" fontSize="12" fill="var(--color-ink-faint)">
                    {i === last ? 'Today' : dayLabel.format(asDate(d.date))}
                  </text>
                )}
                <rect x={pad.left + i * band} y={pad.top} width={band} height={innerH} fill="transparent"
                  onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
              </g>
            );
          })}
        </svg>
      )}
      {hover !== null && data[hover] && (
        <div className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg bg-night-900 px-3 py-2 text-sm whitespace-nowrap text-white shadow-pop"
          style={{ left: pad.left + hover * band + band / 2, top: Math.max(0, y(data[hover].count) - 58) }}>
          <span className="block text-white/70">{weekday.format(asDate(data[hover].date))}</span>
          <span className="board text-lg font-semibold">{data[hover].count}</span> {data[hover].count === 1 ? 'request' : 'requests'}
        </div>
      )}
    </div>
  );
}

// Status colours are reserved for booking states; each segment is also named in the legend with its count.
const STATUS_FILL = {
  PENDING_ADMIN_APPROVAL: 'bg-wait-700', ALLOCATION_IN_PROGRESS: 'bg-signal-600', PRICE_REVALIDATION: 'bg-signal-600',
  CONFIRMED: 'bg-mint-600', REJECTED: 'bg-stop-600', REVOKED: 'bg-void-700', CANCELLED: 'bg-ink-faint', BOOKING_FAILED: 'bg-stop-700',
};
const ORDER = ['CONFIRMED', 'PENDING_ADMIN_APPROVAL', 'ALLOCATION_IN_PROGRESS', 'REJECTED', 'REVOKED', 'CANCELLED', 'BOOKING_FAILED'];

export function StatusSplit({ counts, onPick }) {
  const [hover, setHover] = useState(null);
  const rows = ORDER.map((status) => ({ status, count: counts[status] || 0 })).filter((r) => r.count > 0);
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  if (!total) return <p className="text-[15px] text-ink-soft">No requests yet. They appear here as travellers send them.</p>;
  return (
    <div>
      <div className="flex h-3 w-full gap-0.5" role="img" aria-label={rows.map((r) => `${STATUS_META[r.status].label} ${r.count}`).join(', ')}>
        {rows.map((r, i) => (
          <span key={r.status}
            className={cx('h-full transition-opacity', STATUS_FILL[r.status], i === 0 && 'rounded-l-full', i === rows.length - 1 && 'rounded-r-full',
              hover && hover !== r.status && 'opacity-35')}
            style={{ flexGrow: r.count, flexBasis: 0, minWidth: 4 }}
            onMouseEnter={() => setHover(r.status)} onMouseLeave={() => setHover(null)} />
        ))}
      </div>
      <ul className="mt-5 space-y-0.5">
        {rows.map((r) => (
          <li key={r.status}>
            <button type="button" onClick={() => onPick?.(r.status)} onMouseEnter={() => setHover(r.status)} onMouseLeave={() => setHover(null)}
              className={cx('flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-mist', hover === r.status && 'bg-mist')}>
              <span className={cx('size-2.5 shrink-0 rounded-full', STATUS_FILL[r.status])} aria-hidden="true" />
              <span className="flex-1 text-[15px] text-ink-soft">{STATUS_META[r.status].label}</span>
              <span className="board text-lg font-semibold text-ink">{r.count}</span>
              <span className="board w-11 text-right text-[15px] text-ink-faint">{Math.round((r.count / total) * 100)}%</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Ranked list with a thin magnitude bar under each label.
export function RankBars({ rows, empty }) {
  if (!rows.length) return <p className="text-[15px] text-ink-soft">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.count));
  return (
    <ol className="space-y-3.5">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-[15px]">{r.label}</span>
            <span className="board text-lg font-semibold">{r.count}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-mist">
            <div className="h-full rounded-full bg-night-700" style={{ width: `${(r.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}
