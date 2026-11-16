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
  const { totals, approvalRate, confirmedValue, seats } = data;
  const oldest = data.oldestPending[0];
  const navigate = useNavigate();
  const figures = [
    ['Confirmed', totals.confirmed],
    ['Rejected', totals.rejected],
    ['Revoked', totals.revoked],
    ['Cancelled by travellers', totals.cancelled],
    ['Approval rate', approvalRate === null ? '-' : `${approvalRate}%`],
    ['Confirmed fares', money(confirmedValue)],
  ];
  return (
    <section aria-label="Desk totals" className="overflow-hidden rounded-3xl bg-night-950 text-white shadow-lift">
      <div className="grid lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
        <div className="flex flex-col justify-between gap-6 bg-night-900 p-6 sm:p-7">
          <div>
            <p className="text-[15px] text-white/70">Waiting for review</p>
            <p className="board mt-1 text-[5.5rem] leading-[0.85] font-semibold">{totals.pending}</p>
            <p className="mt-3 text-[15px] text-white/70">
              {oldest ? <>Oldest sent <span className="font-semibold text-white">{ago(oldest.createdAt)}</span></> : 'The queue is clear.'}
            </p>
          </div>
          {oldest && (
            <Button className="self-start" onClick={() => navigate(`/requests/${oldest.id}`)}>
              Review the oldest <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          )}
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
              <p className="text-white/60">Simulated seats across {seats.flights} {seats.flights === 1 ? 'flight' : 'flights'}</p>
              <p><span className="board text-xl font-semibold">{seats.available}</span> <span className="text-white/60">free of {seats.total}</span></p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-signal-500" style={{ width: `${seats.total ? ((seats.total - seats.available) / seats.total) * 100 : 0}%` }} />
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

  const header = <PageHeader title={`${greeting()}, ${admin.name.split(' ')[0]}`} lead="Booking requests, decisions and seat inventory at a glance. Figures update live." />;
  if (error && !data) return <>{header}<Notice tone="error">{error}</Notice></>;
  if (!data) return <>{header}<PageLoading label="Loading the overview" /></>;

  const weekTotal = data.requestsPerDay.slice(-7).reduce((sum, d) => sum + d.count, 0);

  return (
    <>
      {header}
      <Board data={data} />

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Requests per day" lead={`Last 14 days. ${weekTotal} in the past week.`}>
          <DailyColumns data={data.requestsPerDay} />
        </Panel>
        <Panel title="Every request by status" lead={`${data.totals.total} in total. Choose a status to see the list.`}>
          <StatusSplit counts={data.statusCounts} onPick={(status) => navigate(`/requests?status=${status}`)} />
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Waiting longest" lead="Oldest first. These travellers have waited the most." bodyClassName="p-0 pt-3"
          actions={<Link to="/requests" className="text-sm font-semibold text-signal-600 hover:text-signal-700">All requests</Link>}>
          {data.oldestPending.length === 0 ? (
            <div className="p-5 pt-2"><EmptyState icon={Inbox} title="Nothing waiting">New requests appear here the moment a traveller sends one.</EmptyState></div>
          ) : (
            <ul className="divide-y divide-line">
              {data.oldestPending.map((b) => (
                <li key={b.id}>
                  <Link to={`/requests/${b.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 gap-y-1 px-5 py-3.5 transition-colors hover:bg-mist sm:grid-cols-[10.5rem_minmax(0,1fr)_8rem_auto]">
                    <span className="board text-lg font-semibold whitespace-nowrap">{b.bookingReference}</span>
                    <span className="min-w-0 truncate text-[15px] text-ink-soft sm:order-none">
                      <span className="font-semibold text-ink">{b.traveller}</span>, {b.passengers} {b.passengers === 1 ? 'traveller' : 'travellers'}
                    </span>
                    <span className="board text-lg">{b.origin} - {b.destination}<span className="block text-sm leading-tight font-normal text-ink-faint">{day(b.departureTime)} {time(b.departureTime)}</span></span>
                    <span className="text-right text-sm text-wait-700">{ago(b.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <div className="grid gap-6">
          <Panel title="Most requested routes">
            <RankBars empty="No routes yet." rows={data.topRoutes.map((r) => ({ key: `${r.origin}-${r.destination}`, label: <span className="board text-lg">{r.origin} - {r.destination}</span>, count: r.count }))} />
          </Panel>
          <Panel title="Most requested airlines">
            <RankBars empty="No airlines yet." rows={data.topAirlines.map((a) => ({ key: a.airline, label: a.airline, count: a.count }))} />
          </Panel>
        </div>
      </div>
    </>
  );
}
