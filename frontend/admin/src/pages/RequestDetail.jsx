import { useEffect, useId, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, CircleCheck, ClipboardList, Mail, Phone, ShieldAlert } from 'lucide-react';
import { AIRPORT_BY_CODE, BOOKING_STATUS as S, CABIN_LABEL, CATEGORY_META, STATUS_META } from '@shared/constants.js';
import { ago, date, day, duration, money, stamp, stopsText, time } from '@shared/ui/format.js';
import { Button, Dialog, EmptyState, Field, Notice, PageLoading, StatusPill, cx } from '@shared/ui/index.jsx';
import { AUDIT_LABEL, Panel, SeatBar } from '../components/ui.jsx';
import { useDesk } from '../context/DeskContext.jsx';
import { confirmBooking, getBooking, rejectBooking, revokeBooking } from '../services/booking.service.js';

const GENDER = { MALE: 'Male', FEMALE: 'Female', OTHER: 'Other' };
const ACTOR = { USER: 'Traveller', ADMIN: 'Desk', SYSTEM: 'System' };
const ACTION_WORD = { CONFIRM: 'Confirmed', REJECT: 'Rejected', REVOKE: 'Revoked' };

const age = (dob, at) => {
  const born = new Date(`${dob}T00:00:00Z`);
  const then = new Date(at);
  let years = then.getUTCFullYear() - born.getUTCFullYear();
  const m = then.getUTCMonth() - born.getUTCMonth();
  if (m < 0 || (m === 0 && then.getUTCDate() < born.getUTCDate())) years -= 1;
  return years;
};

// Reasons the desk gives most often; one click fills the reason box, which can still be edited.
const QUICK = {
  reject: ['No simulated seats left on this flight.', 'The fare has expired. Please search again for a current fare.', 'Traveller details could not be verified. Please check the names and send a new request.'],
  revoke: ['The airline cancelled this flight.', 'The schedule changed and this flight no longer operates on this date.', 'Seats were withdrawn from simulated inventory.'],
};

function DecisionDialog({ mode, booking, need, open, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const id = useId();
  useEffect(() => { if (open) { setReason(''); setError(null); } }, [open, mode]);
  if (!mode) return null;

  const confirm = mode === 'confirm';
  const title = { confirm: 'Confirm this booking?', reject: 'Reject this request?', revoke: 'Revoke this confirmed booking?' }[mode];
  const action = { confirm: `Confirm and allocate ${need} ${need === 1 ? 'seat' : 'seats'}`, reject: 'Reject request', revoke: 'Revoke booking' }[mode];

  async function submit() {
    if (!confirm && reason.trim().length < 5) { setError('Give a reason of at least 5 characters. The traveller sees it.'); return; }
    setBusy(true); setError(null);
    try {
      const decide = { confirm: confirmBooking, reject: rejectBooking, revoke: revokeBooking }[mode];
      const result = await decide(booking.id, reason.trim());
      onDone(result, mode);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open} onClose={onClose} title={title}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>Go back</Button>
          <Button variant={confirm ? 'primary' : 'danger'} loading={busy} onClick={submit}>{action}</Button>
        </>
      )}
    >
      <div className="rounded-xl bg-mist px-4 py-3 text-ink">
        <p className="board text-xl font-semibold">{booking.bookingReference}</p>
        <p className="text-[15px]">
          {booking.traveller?.name || 'Traveller'}, {booking.passengerCount} {booking.passengerCount === 1 ? 'seat' : 'seats'} on{' '}
          <span className="board text-base font-semibold">{booking.flight.flightNumber}</span>, {booking.flight.origin} to {booking.flight.destination}, {day(booking.flight.departureTime)}
        </p>
      </div>
      <p className="mt-4">
        {confirm && 'Seats are taken from simulated inventory in one step. The traveller is notified straight away. This is an internal approval, not an airline ticket.'}
        {mode === 'reject' && 'No seats are taken. The traveller sees your reason and can search again.'}
        {mode === 'revoke' && 'The allocated seats go back into inventory and the traveller is told why. Use this only for an exceptional problem.'}
      </p>
      {!confirm && (
        <>
          <Field label="Reason for the traveller" htmlFor={id} className="mt-4" hint="Shown to the traveller and stored in the audit log.">
            <textarea id={id} rows={3} maxLength={300} className="field resize-y" value={reason} onChange={(event) => setReason(event.target.value)} aria-invalid={Boolean(error)} />
          </Field>
          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK[mode].map((text) => (
              <button key={text} type="button" onClick={() => setReason(text)}
                className="rounded-full border border-line px-3 py-1 text-left text-[13px] text-ink-soft transition-colors hover:border-night-600 hover:text-ink">
                {text}
              </button>
            ))}
          </div>
        </>
      )}
      {error && <Notice tone="error" className="mt-4">{error}</Notice>}
    </Dialog>
  );
}

function DecisionPanel({ data, onOpen }) {
  const { can } = useDesk();
  const { booking, inventory, allocation } = data;
  const need = booking.passengerCount;
  const short = inventory ? inventory.availableSeats < need : true;
  const decision = booking.adminDecision;

  if (booking.status === S.PENDING_ADMIN_APPROVAL) {
    return (
      <Panel title="Decision" lead="Check the seats, then confirm or reject.">
        <h3 className="text-sm font-medium text-ink-faint">Simulated seats on <span className="board text-[15px] text-ink-soft">{booking.flight.flightNumber}</span>, {day(booking.flight.departureTime)}</h3>
        <div className="mt-2">
          {inventory
            ? <SeatBar total={inventory.totalSeats} available={inventory.availableSeats} need={need} />
            : <p className="text-[15px] text-ink-soft">No inventory record for this flight yet.</p>}
        </div>
        <p className={cx('mt-3 flex items-center gap-2 text-[15px]', short ? 'text-stop-700' : 'text-mint-700')}>
          {short ? <ShieldAlert className="size-4 shrink-0" aria-hidden="true" /> : <CircleCheck className="size-4 shrink-0" aria-hidden="true" />}
          {short ? `Needs ${need}, only ${inventory?.availableSeats ?? 0} free` : `Needs ${need} ${need === 1 ? 'seat' : 'seats'}. Enough are free.`}
        </p>
        {short && (
          <p className="mt-2 text-sm text-ink-soft">
            Reject the request, or add seats in <Link to={`/inventory?q=${encodeURIComponent(booking.flight.flightNumber)}`} className="font-semibold text-signal-600 hover:text-signal-700">Seat inventory</Link> first.
          </p>
        )}
        <div className="mt-5 flex flex-col gap-2.5 border-t border-line pt-5">
          {can('APPROVE_BOOKINGS') && <Button size="lg" disabled={short} onClick={() => onOpen('confirm')}>Confirm booking</Button>}
          {can('REJECT_BOOKINGS') && <Button variant="dangerOutline" onClick={() => onOpen('reject')}>Reject request</Button>}
          {!can('APPROVE_BOOKINGS') && !can('REJECT_BOOKINGS') && <p className="text-sm text-ink-soft">Your desk account can view requests but not decide them.</p>}
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Decision">
      {decision ? (
        <div>
          <p className="text-[15px]"><span className="font-semibold">{ACTION_WORD[decision.action] || decision.action}</span> by {decision.adminName || 'the desk'}</p>
          <p className="board text-[15px] text-ink-faint">{stamp(decision.decidedAt)}</p>
          {decision.reason && <p className="mt-3 rounded-xl bg-mist px-3.5 py-2.5 text-[15px] text-ink">{decision.reason}</p>}
        </div>
      ) : booking.cancellation ? (
        <div>
          <p className="text-[15px]"><span className="font-semibold">Cancelled</span> by the traveller</p>
          <p className="board text-[15px] text-ink-faint">{stamp(booking.cancellation.at)}</p>
          {booking.cancellation.reason && <p className="mt-3 rounded-xl bg-mist px-3.5 py-2.5 text-[15px]">{booking.cancellation.reason}</p>}
        </div>
      ) : (
        <p className="text-[15px] text-ink-soft">{STATUS_META[booking.status]?.label || booking.status}</p>
      )}

      {allocation && (
        <div className="mt-5 border-t border-line pt-4 text-[15px]">
          <p>
            <span className="board text-lg font-semibold">{allocation.seats}</span> {allocation.seats === 1 ? 'seat' : 'seats'}{' '}
            {allocation.status === 'ACTIVE' ? 'held in simulated inventory' : `released ${allocation.releasedAt ? stamp(allocation.releasedAt) : ''}`}
          </p>
          {inventory && <div className="mt-3"><SeatBar compact total={inventory.totalSeats} available={inventory.availableSeats} /></div>}
        </div>
      )}

      {booking.status === S.CONFIRMED && can('REVOKE_BOOKINGS') && (
        <div className="mt-5 border-t border-line pt-5">
          <Button variant="dangerOutline" className="w-full" onClick={() => onOpen('revoke')}>Revoke booking</Button>
          <p className="mt-2 text-sm text-ink-faint">For an exceptional problem only, such as an airline cancellation.</p>
        </div>
      )}
    </Panel>
  );
}

export default function RequestDetail() {
  const { id } = useParams();
  const { liveTick, bump } = useDesk();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState(null);
  const [done, setDone] = useState(null);

  useEffect(() => {
    let live = true;
    getBooking(id)
      .then((result) => { if (live) setData(result); })
      .catch((failure) => { if (live) setError(failure.message); });
    return () => { live = false; };
  }, [id, liveTick]);

  if (error && !data) {
    return <EmptyState icon={ClipboardList} title="We could not open this request" action={<Button onClick={() => navigate('/requests')}>Back to requests</Button>}>{error}</EmptyState>;
  }
  if (!data) return <PageLoading label="Loading the request" />;

  const { booking, audit } = data;
  const { flight, pricing } = booking;
  const traveller = booking.traveller;

  return (
    <>
      <Link to="/requests" className="inline-flex items-center gap-1 text-[15px] font-medium text-ink-soft hover:text-ink">
        <ChevronLeft className="size-4" aria-hidden="true" /> Booking requests
      </Link>
      <div className="mt-3 mb-7 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="board text-[2rem] leading-none font-semibold whitespace-nowrap sm:text-[2.5rem]">{booking.bookingReference}</h1>
        <StatusPill status={booking.status} />
        <p className="w-full text-[15px] text-ink-soft">Sent {ago(booking.createdAt)} ({stamp(booking.createdAt)}) by {traveller?.name || 'a deleted account'}</p>
      </div>

      {done && <Notice tone={done.tone} className="mb-6">{done.text}</Notice>}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="Traveller">
              <p className="text-lg font-semibold">{traveller?.name || 'Deleted account'}</p>
              {traveller && (
                <ul className="mt-1.5 space-y-1 text-[15px] text-ink-soft">
                  <li className="flex items-center gap-2"><Mail className="size-4 text-ink-faint" aria-hidden="true" />{traveller.email}</li>
                  {traveller.phone && <li className="flex items-center gap-2"><Phone className="size-4 text-ink-faint" aria-hidden="true" />{traveller.phone}</li>}
                </ul>
              )}
              <h3 className="mt-5 text-sm font-medium text-ink-faint">{booking.passengers.length === 1 ? 'Passenger' : `${booking.passengers.length} passengers`}</h3>
              <ul className="mt-1.5 divide-y divide-line border-y border-line">
                {booking.passengers.map((p, index) => (
                  <li key={index} className="flex flex-wrap items-baseline justify-between gap-x-3 py-2.5">
                    <span className="font-semibold">{p.firstName} {p.lastName}</span>
                    <span className="text-sm text-ink-soft">{GENDER[p.gender]}, {age(p.dateOfBirth, flight.departureTime)} at travel ({date(`${p.dateOfBirth}T12:00:00+05:30`)})</span>
                  </li>
                ))}
              </ul>
              <h3 className="mt-5 text-sm font-medium text-ink-faint">Contact for this booking</h3>
              <p className="mt-1 text-[15px]">{booking.contact.email}<br />{booking.contact.phone}</p>
            </Panel>

            <Panel title="Flight">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[15px]"><span className="font-semibold">{flight.airline}</span> <span className="board text-base text-ink-soft">{flight.flightNumber}</span></p>
                {booking.recommendationCategory && <span className="text-sm text-ink-faint">Picked as {CATEGORY_META[booking.recommendationCategory]?.label.toLowerCase()}</span>}
              </div>
              <p className="text-sm text-ink-faint">{day(flight.departureTime)}, {CABIN_LABEL[flight.cabinClass] || flight.cabinClass}</p>
              <div className="mt-4 flex items-start gap-3">
                <div>
                  <p className="board text-[2rem] leading-none font-semibold">{time(flight.departureTime)}</p>
                  <p className="board mt-1 text-lg font-semibold text-night-700">{flight.origin}</p>
                  <p className="text-sm text-ink-soft">{AIRPORT_BY_CODE[flight.origin]?.city}</p>
                </div>
                <div className="min-w-12 flex-1 pt-1 text-center">
                  <p className="board text-[15px] text-ink-soft">{duration(flight.durationMinutes)}</p>
                  <div className="route-line mx-1 my-1.5" aria-hidden="true" />
                  <p className={cx('text-[13px]', flight.stops ? 'text-flare-700' : 'text-ink-soft')}>{stopsText(flight.stops)}</p>
                </div>
                <div className="text-right">
                  <p className="board text-[2rem] leading-none font-semibold">{time(flight.arrivalTime)}</p>
                  <p className="board mt-1 text-lg font-semibold text-night-700">{flight.destination}</p>
                  <p className="text-sm text-ink-soft">{AIRPORT_BY_CODE[flight.destination]?.city}</p>
                </div>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4 text-[15px]">
                <div><dt className="text-sm text-ink-faint">Total fare</dt><dd className="board text-2xl font-semibold">{money(pricing.amount, pricing.currency)}</dd></div>
                <div><dt className="text-sm text-ink-faint">Per passenger</dt><dd className="board text-2xl">{money(pricing.perPassenger, pricing.currency)}</dd></div>
                <div><dt className="text-sm text-ink-faint">Bags</dt><dd>{flight.baggage?.cabin || '—'} cabin, {flight.baggage?.checked || '—'} checked</dd></div>
                <div><dt className="text-sm text-ink-faint">Seats</dt><dd>{booking.inventoryMode === 'SIMULATED' ? 'Simulated inventory' : booking.inventoryMode}</dd></div>
                <div className="col-span-2"><dt className="text-sm text-ink-faint">Offer reference ({flight.provider})</dt><dd className="board truncate text-[15px] text-ink-soft">{flight.providerOfferId || flight.flightKey}</dd></div>
              </dl>
            </Panel>
          </div>

          <aside className="self-start lg:sticky lg:top-8 lg:col-start-2 lg:row-span-2 lg:row-start-1"><DecisionPanel data={data} onOpen={setMode} /></aside>

          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="History" lead="What the traveller sees on their trip.">
              <ol>
                {[...booking.history].reverse().map((entry, index, list) => (
                  <li key={`${entry.at}-${index}`} className="relative flex gap-3.5 pb-4 last:pb-0">
                    {index < list.length - 1 && <span className="absolute top-3 left-[5px] h-full w-px bg-line" aria-hidden="true" />}
                    <span className={cx('relative mt-1.5 size-[11px] shrink-0 rounded-full border-2 bg-white', index === 0 ? 'border-signal-600' : 'border-ink-faint')} aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-[15px]"><span className="font-semibold">{STATUS_META[entry.status]?.label || entry.status}</span> <span className="text-ink-soft">by {ACTOR[entry.actor] || entry.actor}</span></p>
                      {entry.note && <p className="text-sm text-ink-soft">{entry.note}</p>}
                      <p className="board text-[15px] text-ink-faint">{stamp(entry.at)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Panel>
            <Panel title="Audit entries" lead="Desk actions on this request.">
              {audit.length === 0 ? <p className="text-[15px] text-ink-soft">No desk actions yet.</p> : (
                <ul className="divide-y divide-line">
                  {audit.map((a) => (
                    <li key={a.id} className="py-2.5 first:pt-0">
                      <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-[15px]">
                        <span className="font-semibold">{AUDIT_LABEL[a.action] || a.action}</span>
                        <span className="board text-[15px] text-ink-faint">{stamp(a.timestamp)}</span>
                      </p>
                      <p className="text-sm text-ink-soft">{a.actorName}{a.reason ? `: ${a.reason}` : ''}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
      </div>

      <DecisionDialog
        mode={mode} booking={booking} need={booking.passengerCount} open={Boolean(mode)} onClose={() => setMode(null)}
        onDone={(result, action) => {
          setData(result);
          setMode(null);
          bump();
          const words = { confirm: 'Booking confirmed. The traveller has been notified.', reject: 'Request rejected. The traveller has been notified.', revoke: 'Booking revoked and seats released. The traveller has been notified.' };
          const text = result.alreadyConfirmed ? 'This booking was already confirmed. No extra seats were taken.' : words[action];
          setDone({ tone: action === 'confirm' ? 'success' : 'info', text });
        }}
      />
    </>
  );
}
