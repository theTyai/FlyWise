import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Inbox } from 'lucide-react';
import { ago, day, money, time } from '@shared/ui/format.js';
import { Button, EmptyState, Notice, PageLoading } from '@shared/ui/index.jsx';
import { DailyColumns, RankBars, StatusSplit } from '../components/Charts.jsx';
import { PageHeader, Panel } from '../components/ui.jsx';
import { useDesk } from '../context/DeskContext.jsx';
import { getDashboard } from '../services/dashboard.service.js';

const greeting = () => {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' }).format(new Date()));
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
};

// The headline numbers, set like a departures board.
function Board({ data }) {
  const { totals, confirmedValue, seats, approvalRate } = data;
  const navigate = useNavigate();
  const occupancy = seats.total ? Math.round(((seats.total - seats.available) / seats.total) * 100) : 0;
  const figures = [
    ['Total Bookings', totals.total],
    ['Confirmed Bookings', totals.confirmed],
    ['Confirmed Revenue', money(confirmedValue)],
    ['Registered Travellers', totals.travellers],
    ['Cancelled Bookings', totals.cancelled],
    ['Seat Occupancy', `${occupancy}%`],
  ];
  return (
    <section aria-label="Desk totals" className="overflow-hidden rounded-3xl bg-night-950 text-white shadow-lift">
      <div className="grid lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)]">
        <div className="flex flex-col justify-between gap-6 bg-night-900 p-6 sm:p-7">
          <div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-mint-400 animate-pulse" />
              <p className="text-[13px] font-semibold text-mint-400 uppercase tracking-wider">Live System Status</p>
            </div>
            <p className="board mt-2 text-[5rem] leading-[0.85] font-extrabold text-white">{totals.confirmed}</p>
            <p className="mt-2 text-base font-semibold text-white/90">
              Confirmed Bookings
            </p>
            <p className="mt-1 text-xs text-white/55 leading-relaxed">
              Real-time seat allocation • Instant booking confirmation without queue delay
            </p>
          </div>
          <Button className="self-start btn-gradient" onClick={() => navigate('/requests')}>
            View All Ticket Bookings <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="p-6 sm:p-7">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3">
            {figures.map(([label, value]) => (
              <div key={label} className="border-l border-white/12 pl-4">
                <dt className="text-sm text-white/60">{label}</dt>
                <dd className="board mt-0.5 text-[1.75rem] leading-none font-semibold sm:text-[2.25rem]">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-7 border-t border-white/10 pt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
              <p className="text-white/60">Fleet Seat Inventory across {seats.flights} {seats.flights === 1 ? 'flight' : 'flights'}</p>
              <p><span className="board text-xl font-semibold text-mint-400">{seats.available}</span> <span className="text-white/60">free of {seats.total} seats ({occupancy}% booked)</span></p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-mint-500 transition-all duration-500" style={{ width: `${occupancy}%` }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Dashboard() {
  const { admin, liveTick } = useDesk();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let live = true;
    getDashboard()
      .then((result) => { if (live) { setData(result); setError(null); } })
      .catch((failure) => { if (live) setError(failure.message); });
    return () => { live = false; };
  }, [liveTick]);

  const header = <PageHeader title={`${greeting()}, ${admin.name.split(' ')[0]}`} lead="Live flight bookings, passenger allocations, revenue and seat occupancy at a glance." />;
  if (error && !data) return <>{header}<Notice tone="error">{error}</Notice></>;
  if (!data) return <>{header}<PageLoading label="Loading the overview" /></>;

  const weekTotal = data.requestsPerDay.slice(-7).reduce((sum, d) => sum + d.count, 0);
  const displayBookings = data.recentBookings || data.oldestPending || [];

  return (
    <>
      {header}
      <Board data={data} />

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Bookings per day" lead={`Last 14 days. ${weekTotal} tickets booked in the past week.`}>
          <DailyColumns data={data.requestsPerDay} />
        </Panel>
        <Panel title="Bookings by status" lead={`${data.totals.total} total bookings. Click a status to view records.`}>
          <StatusSplit counts={data.statusCounts} onPick={(status) => navigate(`/requests?status=${status}`)} />
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Recent Passenger Bookings" lead="Newest bookings first. Click any row to inspect traveller details." bodyClassName="p-0 pt-3"
          actions={<Link to="/requests" className="text-sm font-semibold text-signal-600 hover:text-signal-700">All bookings</Link>}>
          {displayBookings.length === 0 ? (
            <div className="p-5 pt-2"><EmptyState icon={Inbox} title="No bookings yet">New ticket bookings appear here the moment travellers book.</EmptyState></div>
          ) : (
            <ul className="divide-y divide-line">
              {displayBookings.map((b) => (
                <li key={b.id}>
                  <Link to={`/requests/${b.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 gap-y-1 px-5 py-3.5 transition-colors hover:bg-mist sm:grid-cols-[10.5rem_minmax(0,1fr)_8rem_auto]">
                    <div>
                      <span className="board text-lg font-semibold whitespace-nowrap text-ink">{b.bookingReference}</span>
                      <span className="block text-xs font-semibold text-mint-700">{b.status}</span>
                    </div>
                    <span className="min-w-0 truncate text-[15px] text-ink-soft sm:order-none">
                      <span className="font-semibold text-ink">{b.traveller?.name || 'Guest'}</span>, {b.passengerCount || b.passengers?.length || 1} {((b.passengerCount || b.passengers?.length || 1) === 1) ? 'traveller' : 'travellers'}
                      {b.traveller?.email && <span className="block text-xs text-ink-faint truncate">{b.traveller.email}</span>}
                    </span>
                    <span className="board text-lg">{b.origin} - {b.destination}<span className="block text-sm leading-tight font-normal text-ink-faint">{day(b.departureTime)} {time(b.departureTime)}</span></span>
                    <span className="text-right text-sm text-ink-soft">{ago(b.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <div className="grid gap-6">
          <Panel title="Most booked routes">
            <RankBars empty="No routes yet." rows={data.topRoutes.map((r) => ({ key: `${r.origin}-${r.destination}`, label: <span className="board text-lg">{r.origin} - {r.destination}</span>, count: r.count }))} />
          </Panel>
          <Panel title="Most booked airlines">
            <RankBars empty="No airlines yet." rows={data.topAirlines.map((a) => ({ key: a.airline, label: a.airline, count: a.count }))} />
          </Panel>
        </div>
      </div>
    </>
  );
}
