import { Link } from 'react-router-dom';
import { ScrollText } from 'lucide-react';
import { dayFromIso, stamp } from '@shared/ui/format.js';
import { EmptyState, Notice, Spinner, StatusPill, cx } from '@shared/ui/index.jsx';
import { AUDIT_LABEL, PageHeader, Pagination, SearchField } from '../components/ui.jsx';
import { useDesk } from '../context/DeskContext.jsx';
import { usePagedList } from '../hooks/usePagedList.js';
import { listAuditLogs } from '../services/audit.service.js';

// "6E-201_2026-11-25" -> "6E-201 on Wed 25 Nov"
const flightOn = (key = '') => {
  const [flight, iso] = key.split('_');
  return iso ? `${flight} on ${dayFromIso(iso)}` : flight;
};
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Turn the stored meta object into one readable line.
function details(log) {
  const m = log.meta || {};
  switch (log.action) {
    case 'INVENTORY_CREATED': return `${flightOn(m.flightKey)}: ${plural(m.totalSeats, 'seat')}`;
    case 'INVENTORY_UPDATED': return `${flightOn(m.flightKey)}: ${m.from} to ${plural(m.to, 'seat')}`;
    case 'USER_SUSPENDED':
    case 'USER_REACTIVATED': return m.email || '';
    case 'SETTINGS_UPDATED': return m.defaultSimulatedSeats ? `Default seats ${m.defaultSimulatedSeats.from} to ${m.defaultSimulatedSeats.to}` : '';
    case 'BOOKING_REVOKED': return [log.reason?.replace(/\.$/, ''), m.seatsReleased ? `${plural(m.seatsReleased, 'seat')} released` : ''].filter(Boolean).join('. ');
    default: return log.reason || '';
  }
}

const TONE = {
  BOOKING_CONFIRMED: 'bg-mint-600', BOOKING_REJECTED: 'bg-stop-600', BOOKING_REVOKED: 'bg-void-700', BOOKING_FAILED: 'bg-stop-700',
  ALLOCATION_FAILED_NO_SEATS: 'bg-wait-700', USER_SUSPENDED: 'bg-stop-600',
};

export default function AuditLog() {
  const { liveTick } = useDesk();
  const { q, data, loading, error, go } = usePagedList(
    ({ q: text, page }) => listAuditLogs({ q: text, page, limit: 25 }),
    { deps: [liveTick] },
  );

  return (
    <>
      <PageHeader title="Audit log" lead="Every desk action, newest first. Entries are written by the server and cannot be edited or deleted." />
      <div className="rounded-2xl bg-white shadow-pass">
        <div className="flex items-center justify-between gap-3 border-b border-line p-3 sm:p-4">
          <p className="hidden text-sm text-ink-faint sm:block">Times in India Standard Time</p>
          <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
          {loading && data && <Spinner className="size-4 text-ink-faint" />}
          <SearchField value={q} onChange={(value) => go({ q: value, page: 1 })} placeholder="Action, reference or admin" label="Search the audit log" />
          </div>
        </div>
        {error && <div className="p-4"><Notice tone="error">{error}</Notice></div>}
        {!data && !error && <div className="flex justify-center py-16 text-ink-faint"><Spinner className="size-5" /></div>}
        {data && data.logs.length === 0 && (
          <div className="p-5"><EmptyState icon={ScrollText} title={q ? `No entries match "${q}"` : 'No desk actions yet'}>Confirmations, rejections, inventory and account changes are recorded here.</EmptyState></div>
        )}
        {data && data.logs.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className={cx('w-full min-w-[54rem] text-left text-[15px] transition-opacity', loading && 'opacity-60')}>
                <thead>
                  <tr className="border-b border-line text-sm text-ink-faint">
                    <th scope="col" className="py-3 pr-3 pl-5 font-medium">When</th>
                    <th scope="col" className="px-3 py-3 font-medium">Action</th>
                    <th scope="col" className="px-3 py-3 font-medium">Request</th>
                    <th scope="col" className="px-3 py-3 font-medium">Status change</th>
                    <th scope="col" className="py-3 pr-5 pl-3 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {data.logs.map((log) => (
                    <tr key={log.id} className="border-b border-line align-top last:border-0">
                      <td className="board py-3 pr-3 pl-5 text-[15px] whitespace-nowrap text-ink-soft">{stamp(log.timestamp)}</td>
                      <td className="px-3 py-3">
                        <p className="flex items-center gap-2 font-semibold">
                          <span className={cx('size-2 shrink-0 rounded-full', TONE[log.action] || 'bg-night-600')} aria-hidden="true" />
                          {AUDIT_LABEL[log.action] || log.action}
                        </p>
                        <p className="pl-4 text-sm text-ink-faint">{log.actorName}</p>
                      </td>
                      <td className="px-3 py-3">
                        {log.bookingId
                          ? <Link to={`/requests/${log.bookingId}`} className="board text-lg font-semibold text-ink hover:text-signal-700">{log.bookingReference}</Link>
                          : <span className="text-ink-faint">-</span>}
                      </td>
                      <td className="px-3 py-3">
                        {log.newStatus ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {log.previousStatus && <StatusPill status={log.previousStatus} className="opacity-70" />}
                            {log.previousStatus && <span className="text-ink-faint" aria-label="to">to</span>}
                            <StatusPill status={log.newStatus} />
                          </div>
                        ) : <span className="text-ink-faint">-</span>}
                      </td>
                      <td className="max-w-80 py-3 pr-5 pl-3 text-ink-soft">{details(log) || <span className="text-ink-faint">-</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-line"><Pagination meta={data.meta} onPage={(next) => go({ page: next })} /></div>
          </>
        )}
      </div>
    </>
  );
}
