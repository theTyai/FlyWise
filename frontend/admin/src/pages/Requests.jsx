import { useNavigate, useSearchParams } from 'react-router-dom';
import { Inbox } from 'lucide-react';
import { STATUS_META } from '@shared/constants.js';
import { ago, day, money, stamp, time } from '@shared/ui/format.js';
import { EmptyState, Notice, StatusPill, Spinner, cx } from '@shared/ui/index.jsx';
import { PageHeader, Pagination, STATUS_TABS, SearchField, Tabs } from '../components/ui.jsx';
import { useDesk } from '../context/DeskContext.jsx';
import { usePagedList } from '../hooks/usePagedList.js';
import { listBookings } from '../services/booking.service.js';

const LEADS = {
  '': 'Live view of every ticket booked across the airline network in real time.',
  CONFIRMED: 'Live confirmed passenger tickets with guaranteed seat reservations.',
  CANCELLED: 'Bookings cancelled by travellers with seats released back to inventory.',
  REVOKED: 'Bookings withdrawn after confirmation. Their seats were returned to inventory.',
  PENDING_ADMIN_APPROVAL: 'Legacy requests awaiting manual exception review.',
};

export default function Requests() {
  const { liveTick, waiting } = useDesk();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const status = params.get('status') ?? '';
  const { q, data, loading, error, go: update } = usePagedList(
    (filters) => listBookings({ ...filters, limit: 15 }),
    { filters: { status }, deps: [liveTick] },
  );

  const tabs = STATUS_TABS.map((t) => ({ ...t, count: t.value === 'PENDING_ADMIN_APPROVAL' ? (waiting > 0 ? waiting : undefined) : undefined }));
  const title = status ? (status === 'CONFIRMED' ? 'Confirmed Bookings' : `${STATUS_META[status]?.label || status} Bookings`) : 'All Ticket Bookings';

  return (
    <>
      <PageHeader title={title} lead={LEADS[status] ?? LEADS['']} />

      <div className="rounded-2xl bg-white shadow-pass">
        <div className="flex flex-col gap-3 border-b border-line p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
          <Tabs label="Filter by status" tabs={tabs} value={status} onChange={(value) => update({ status: value, page: 1 })} />
          <div className="flex items-center gap-3">
            {loading && data && <Spinner className="size-4 text-ink-faint" />}
            <SearchField value={q} onChange={(value) => update({ q: value, page: 1 })} placeholder="Ref, passenger, email, flight, airport" label="Search bookings" />
          </div>
        </div>

        {error && <div className="p-4"><Notice tone="error">{error}</Notice></div>}
        {!data && !error && <div className="flex justify-center py-16 text-ink-faint"><Spinner className="size-5" /></div>}

        {data && data.bookings.length === 0 && (
          <div className="p-5">
            <EmptyState icon={Inbox} title={q ? `Nothing matches "${q}"` : 'No bookings found'}>
              {q ? 'Try a booking reference like FWB-2026-00013, a passenger name, or an airport code.' : 'Ticket bookings will appear here the moment travellers book.'}
            </EmptyState>
          </div>
        )}

        {data && data.bookings.length > 0 && (
          <>
            <ul className={cx('divide-y divide-line md:hidden', loading && 'opacity-60')}>
              {data.bookings.map((b) => (
                <li key={b.id}>
                  <a href={`/requests/${b.id}`} onClick={(event) => { event.preventDefault(); navigate(`/requests/${b.id}`); }} className="block px-4 py-3.5 transition-colors hover:bg-mist">
                    <div className="flex items-center justify-between gap-3">
                      <span className="board text-lg font-semibold whitespace-nowrap">{b.bookingReference}</span>
                      <StatusPill status={b.status} />
                    </div>
                    <p className="mt-1 truncate text-[15px]"><span className="font-semibold">{b.traveller?.name || 'Guest'}</span><span className="text-ink-soft">, {b.passengerCount} {b.passengerCount === 1 ? 'traveller' : 'travellers'}</span></p>
                    <div className="mt-1 flex items-baseline justify-between gap-3">
                      <span className="board text-lg">{b.origin} - {b.destination} <span className="text-[15px] text-ink-faint">{day(b.departureTime)} {time(b.departureTime)}</span></span>
                      <span className="board text-lg">{money(b.amount, b.currency)}</span>
                    </div>
                    <p className="text-sm text-ink-faint">Booked {ago(b.createdAt)}</p>
                  </a>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className={cx('w-full min-w-[56rem] text-left text-[15px] transition-opacity', loading && 'opacity-60')}>
                <thead>
                  <tr className="border-b border-line text-sm text-ink-faint">
                    <th scope="col" className="py-3 pr-3 pl-5 font-medium">Reference</th>
                    <th scope="col" className="px-3 py-3 font-medium">Traveller / Passengers</th>
                    <th scope="col" className="px-3 py-3 font-medium">Flight & Route</th>
                    <th scope="col" className="px-3 py-3 font-medium">Departs</th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">Fare</th>
                    <th scope="col" className="px-3 py-3 font-medium">Status</th>
                    <th scope="col" className="py-3 pr-5 pl-3 text-right font-medium">Booked</th>
                  </tr>
                </thead>
                <tbody>
                  {data.bookings.map((b) => (
                    <tr key={b.id} onClick={() => navigate(`/requests/${b.id}`)}
                      className="cursor-pointer border-b border-line transition-colors last:border-0 hover:bg-mist">
                      <td className="py-3 pr-3 pl-5">
                        <a href={`/requests/${b.id}`} onClick={(event) => { event.preventDefault(); navigate(`/requests/${b.id}`); }}
                          className="board text-lg font-semibold whitespace-nowrap text-ink hover:text-signal-700">{b.bookingReference}</a>
                      </td>
                      <td className="max-w-64 px-3 py-3">
                        <p className="truncate font-semibold text-ink">{b.traveller?.name || 'Guest'}</p>
                        <p className="truncate text-xs text-ink-faint">
                          {b.traveller?.email || b.contact?.email || ''}
                          {b.passengerCount > 1 ? ` • ${b.passengerCount} travellers` : ''}
                        </p>
                        {b.passengers && b.passengers.length > 0 && (
                          <p className="truncate text-[11px] text-ink-soft">
                            {b.passengers.map((p) => `${p.firstName} ${p.lastName}`).join(', ')}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <p className="board text-lg font-semibold">{b.origin} - {b.destination}</p>
                        <p className="text-sm text-ink-faint">{b.airline} <span className="board text-[15px]">{b.flightNumber}</span></p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="board text-lg">{time(b.departureTime)}</p>
                        <p className="text-sm text-ink-faint">{day(b.departureTime)}</p>
                      </td>
                      <td className="board px-3 py-3 text-right text-lg">{money(b.amount, b.currency)}</td>
                      <td className="px-3 py-3"><StatusPill status={b.status} /></td>
                      <td className="py-3 pr-5 pl-3 text-right text-sm text-ink-soft" title={stamp(b.createdAt)}>{ago(b.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-line"><Pagination meta={data.meta} onPage={(next) => update({ page: next })} /></div>
          </>
        )}
      </div>
    </>
  );
}
