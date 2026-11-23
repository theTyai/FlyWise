import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, PlaneTakeoff } from 'lucide-react';
import { AIRPORT_BY_CODE, BOOKING_STATUS as S } from '@shared/constants.js';
import { day, money, time } from '@shared/ui/format.js';
import { Button, EmptyState, Notice, PageLoading, StatusPill, cx } from '@shared/ui/index.jsx';
import { RoleTag } from '../components/FlightPass.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useLoad } from '../hooks/useLoad.js';
import { listBookings } from '../services/booking.service.js';

const OPEN = [S.PENDING_ADMIN_APPROVAL, S.PRICE_REVALIDATION, S.ALLOCATION_IN_PROGRESS];

// Split trips the way a traveller thinks about them: waiting, going, done.
function group(bookings) {
  const now = Date.now();
  const waiting = [];
  const upcoming = [];
  const past = [];
  for (const b of bookings) {
    if (OPEN.includes(b.status)) waiting.push(b);
    else if (b.status === S.CONFIRMED && new Date(b.flight.departureTime).getTime() > now) upcoming.push(b);
    else past.push(b);
  }
  upcoming.sort((a, b) => new Date(a.flight.departureTime) - new Date(b.flight.departureTime));
  return { waiting, upcoming, past };
}

// One trip as a compact pass: route on the body, status and fare on the stub.
function TripRow({ booking, muted }) {
  const { flight } = booking;
  return (
    <li>
      <Link
        to={`/trips/${booking.id}`}
        className={cx('pass group transition-shadow hover:shadow-lift', muted && 'opacity-80 hover:opacity-100')}
        style={{ '--stub-width': '14rem' }}
      >
        <div className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <p className="board flex items-center gap-2.5 text-[2rem] leading-none font-semibold text-ink">
              {flight.origin}
              <ArrowRight className="size-5 text-ink-faint" aria-label="to" />
              {flight.destination}
            </p>
            <p className="mt-1.5 truncate text-[15px] text-ink-soft">
              {AIRPORT_BY_CODE[flight.origin]?.city || flight.origin} to {AIRPORT_BY_CODE[flight.destination]?.city || flight.destination}
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-x-4 text-sm sm:gap-x-6 sm:text-right">
            <div>
              <dt className="text-ink-faint">Date</dt>
              <dd className="board text-base font-semibold whitespace-nowrap text-ink sm:text-lg">{day(flight.departureTime)}</dd>
            </div>
            <div>
              <dt className="text-ink-faint">Departs</dt>
              <dd className="board text-base font-semibold whitespace-nowrap text-ink sm:text-lg">{time(flight.departureTime)}</dd>
            </div>
            <div>
              <dt className="text-ink-faint">Flight</dt>
              <dd className="board text-base font-semibold whitespace-nowrap text-ink sm:text-lg">{flight.flightNumber}</dd>
            </div>
          </dl>
        </div>
        <div className="pass-stub flex items-center justify-between gap-3 p-5 md:flex-col md:items-start md:justify-center">
          <StatusPill status={booking.status} />
          <div className="text-right md:text-left">
            <p className="board text-2xl leading-none font-semibold">{money(booking.pricing.amount, booking.pricing.currency)}</p>
            <p className="board mt-1 text-[15px] text-ink-faint">{booking.bookingReference}</p>
          </div>
        </div>
      </Link>
    </li>
  );
}

function Section({ id, title, lead, bookings, muted }) {
  if (!bookings.length) return null;
  return (
    <section aria-labelledby={id} className="mt-10 first:mt-0">
      <div className="flex items-baseline gap-3">
        <h2 id={id} className="text-xl font-bold tracking-tight">{title}</h2>
        <span className="board text-lg font-semibold text-ink-faint">{bookings.length}</span>
      </div>
      {lead && <p className="mt-0.5 text-[15px] text-ink-soft">{lead}</p>}
      <ul className="mt-4 space-y-4">
        {bookings.map((b) => <TripRow key={b.id} booking={b} muted={muted} />)}
      </ul>
    </section>
  );
}

export default function MyBookings() {
  const { liveTick } = useAuth();
  const navigate = useNavigate();
  // liveTick changes when the desk decides a request, so the list refreshes by itself.
  const { data, error } = useLoad(listBookings, [liveTick]);
  const bookings = data?.bookings ?? null;

  const groups = useMemo(() => group(bookings || []), [bookings]);
  const next = groups.upcoming[0];

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My trips</h1>
          <p className="mt-1 text-ink-soft">Requests update here the moment the desk decides.</p>
        </div>
        <Button variant="navy" onClick={() => navigate('/')}>Search flights</Button>
      </div>

      {error && <Notice tone="error" className="mt-6">{error}</Notice>}
      {!bookings && !error && <PageLoading label="Loading your trips" />}

      {bookings && bookings.length === 0 && (
        <div className="mt-8">
          <EmptyState icon={PlaneTakeoff} title="No trips yet" action={<Button onClick={() => navigate('/')}>Search flights</Button>}>
            Search a route, pick one of the three recommendations and send a booking request. It will appear here.
          </EmptyState>
        </div>
      )}

      {next && (
        <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-night-900 px-5 py-4 text-white">
          <PlaneTakeoff className="size-5 text-signal-200" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-[15px]">
            Next trip: <span className="board text-lg font-semibold">{next.flight.origin} to {next.flight.destination}</span>,{' '}
            {day(next.flight.departureTime)} at <span className="board text-lg font-semibold">{time(next.flight.departureTime)}</span>
          </p>
          {next.recommendationCategory && <RoleTag category={next.recommendationCategory} />}
        </div>
      )}

      {bookings && bookings.length > 0 && (
        <div className="mt-8">
          <Section id="upcoming" title="Confirmed Upcoming Trips" lead="Confirmed electronic tickets ready for boarding." bookings={groups.upcoming} />
          {groups.waiting.length > 0 && (
            <Section id="waiting" title="Processing Bookings" lead="Bookings undergoing seat allocation or payment verification." bookings={groups.waiting} />
          )}
          <Section id="past" title="Past and closed" bookings={groups.past} muted />
        </div>
      )}
    </div>
  );
}
