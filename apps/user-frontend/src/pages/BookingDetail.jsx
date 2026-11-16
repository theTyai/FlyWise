import { useId, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, PlaneTakeoff, ShieldCheck } from 'lucide-react';
import { BOOKING_STATUS as S, CABIN_LABEL, STATUS_META } from '@shared/constants.js';
import { date, day, money, stamp } from '@shared/ui/format.js';
import { Button, Dialog, EmptyState, Field, Notice, PageLoading, StatusPill, cx } from '@shared/ui/index.jsx';
import { RoleTag, RouteDisplay } from '../components/FlightPass.jsx';
import StatusPath from '../components/StatusPath.jsx';
import { TravellerFields, checkTravellers, errorsByField } from '../components/TravellerFields.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useLoad } from '../hooks/useLoad.js';
import { cancelBooking, getBooking, updateBooking } from '../services/booking.service.js';

const GENDER = { MALE: 'Male', FEMALE: 'Female', OTHER: 'Other' };
const ACTOR = { USER: 'You', ADMIN: 'FlyWise desk', SYSTEM: 'FlyWise' };

// What the traveller most needs to know for each status, in one sentence.
function headline(booking) {
  switch (booking.status) {
    case S.PENDING_ADMIN_APPROVAL: return 'Your request is with the desk. You will be notified here when they decide.';
    case S.PRICE_REVALIDATION:
    case S.ALLOCATION_IN_PROGRESS: return 'The desk is allocating your seat right now.';
    case S.CONFIRMED: return 'Confirmed. A seat is held for you in simulated inventory.';
    case S.REJECTED: return 'The desk could not approve this request.';
    case S.REVOKED: return 'This confirmed booking was withdrawn by the desk.';
    case S.CANCELLED: return 'You cancelled this booking.';
    case S.BOOKING_FAILED: return 'Something went wrong while allocating the seat. Nothing was charged.';
    default: return STATUS_META[booking.status]?.label || booking.status;
  }
}

function EditTravellers({ booking, onSaved, onClose }) {
  const [passengers, setPassengers] = useState(() => booking.passengers.map((p) => ({ ...p })));
  const [contact, setContact] = useState(() => ({ ...booking.contact }));
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState(null);
  const [busy, setBusy] = useState(false);

  async function save(event) {
    event.preventDefault();
    const found = checkTravellers(passengers, contact);
    setErrors(found);
    if (Object.keys(found).length) { setFailure('Some details are missing. Check the fields marked below.'); return; }
    setBusy(true); setFailure(null);
    try {
      const data = await updateBooking(booking.id, {
        passengers: passengers.map((p) => ({ firstName: p.firstName.trim(), lastName: p.lastName.trim(), dateOfBirth: p.dateOfBirth, gender: p.gender })),
        contact: { email: contact.email.trim(), phone: contact.phone.trim() },
      });
      onSaved(data.booking);
    } catch (error) {
      setErrors(errorsByField(error));
      setFailure(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} noValidate className="rounded-3xl bg-white p-6 shadow-pass sm:p-8">
      <h2 className="text-xl font-bold tracking-tight">Edit traveller details</h2>
      <p className="mt-1 text-[15px] text-ink-soft">You can change names, dates of birth and contact details until the desk reviews the request.</p>
      {failure && <Notice tone="error" className="mt-5">{failure}</Notice>}
      <div className="mt-6">
        <TravellerFields passengers={passengers} contact={contact} onPassengers={setPassengers} onContact={setContact} errors={errors} idPrefix="edit" />
      </div>
      <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-line pt-5">
        <Button variant="ghost" onClick={onClose}>Discard changes</Button>
        <Button type="submit" loading={busy}>Save changes</Button>
      </div>
    </form>
  );
}

function CancelDialog({ booking, open, onClose, onCancelled }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const id = useId();
  const confirmed = booking.status === S.CONFIRMED;

  async function cancel() {
    setBusy(true); setError(null);
    try {
      const data = await cancelBooking(booking.id, reason.trim());
      onCancelled(data.booking);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open} onClose={onClose} title={confirmed ? 'Cancel this booking?' : 'Cancel this request?'}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>Keep it</Button>
          <Button variant="danger" loading={busy} onClick={cancel}>{confirmed ? 'Cancel booking' : 'Cancel request'}</Button>
        </>
      )}
    >
      <p>
        <span className="board text-base font-semibold text-ink">{booking.bookingReference}</span>, {booking.flight.origin} to {booking.flight.destination} on {day(booking.flight.departureTime)}.
        {confirmed ? ' Your simulated seat goes back into inventory.' : ' The desk will no longer see it.'} This cannot be undone.
      </p>
      <Field label="Reason (optional)" htmlFor={id} className="mt-4">
        <input id={id} className="field" maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Plans changed" />
      </Field>
      {error && <Notice tone="error" className="mt-4">{error}</Notice>}
    </Dialog>
  );
}

export default function BookingDetail() {
  const { id } = useParams();
  const { liveTick } = useAuth();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { data, error, setData } = useLoad(() => getBooking(id), [id, liveTick]);
  const booking = data?.booking;
  const setBooking = (next) => setData({ booking: next });
  const [editing, setEditing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [saved, setSaved] = useState(null);

  if (error && !booking) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <EmptyState icon={PlaneTakeoff} title="We could not open this trip" action={<Button onClick={() => navigate('/trips')}>Go to My trips</Button>}>{error}</EmptyState>
      </div>
    );
  }
  if (!booking) return <PageLoading label="Loading your trip" />;

  const { flight, pricing } = booking;
  const pending = booking.status === S.PENDING_ADMIN_APPROVAL;
  const cancellable = pending || booking.status === S.CONFIRMED;
  const decision = booking.adminDecision;
  const showReason = decision && decision.action !== 'CONFIRM' && decision.reason;

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <Link to="/trips" className="inline-flex items-center gap-1 text-[15px] font-medium text-ink-soft hover:text-ink">
        <ChevronLeft className="size-4" aria-hidden="true" /> My trips
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="board text-[2rem] leading-none font-semibold whitespace-nowrap sm:text-[2.5rem]">{booking.bookingReference}</h1>
        <StatusPill status={booking.status} />
      </div>
      <p className="mt-2 max-w-2xl text-lg text-ink-soft">{headline(booking)}</p>

      <div className="mt-6 space-y-3">
        {state?.justSent && pending && (
          <Notice tone="success" title="Request sent">
            Nothing has been charged. The desk reviews requests in the order they arrive.
          </Notice>
        )}
        {saved && <Notice tone="success">{saved}</Notice>}
        {showReason && (
          <Notice tone={booking.status === S.REVOKED ? 'warn' : 'error'} title={booking.status === S.REVOKED ? 'Why it was revoked' : 'Why it was rejected'}>
            {decision.reason}
          </Notice>
        )}
      </div>

      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-8">
          {editing ? (
            <EditTravellers
              booking={booking}
              onClose={() => setEditing(false)}
              onSaved={(next) => { setBooking(next); setEditing(false); setSaved('Traveller details saved.'); }}
            />
          ) : (
            <article className="pass" style={{ '--stub-width': '15rem' }}>
              <div className="p-6 sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="flex flex-wrap items-baseline gap-x-2.5 text-[15px]">
                    <span className="font-semibold">{flight.airline}</span>
                    <span className="board text-base text-ink-soft">{flight.flightNumber}</span>
                  </p>
                  {booking.recommendationCategory && <RoleTag category={booking.recommendationCategory} />}
                </div>
                <p className="mt-1 mb-4 text-[15px] text-ink-soft">{day(flight.departureTime)}, {CABIN_LABEL[flight.cabinClass] || flight.cabinClass}</p>
                <RouteDisplay flight={flight} />

                <h2 className="mt-8 text-[13px] font-medium text-ink-faint">
                  {booking.passengers.length > 1 ? `${booking.passengers.length} travellers` : 'Traveller'}
                </h2>
                <ul className="mt-2 divide-y divide-line border-y border-line">
                  {booking.passengers.map((p, index) => (
                    <li key={index} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
                      <span className="font-semibold">{p.firstName} {p.lastName}</span>
                      <span className="text-sm text-ink-soft">{GENDER[p.gender] || p.gender}{p.dateOfBirth ? `, born ${date(p.dateOfBirth.includes('T') ? p.dateOfBirth : `${p.dateOfBirth}T12:00:00+05:30`)}` : ''}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm text-ink-soft">Contact: {booking.contact?.email || '—'}, {booking.contact?.phone || '—'}</p>
              </div>

              <div className="pass-stub flex flex-col justify-between gap-6 p-6 sm:p-7">
                <dl className="space-y-4">
                  <div>
                    <dt className="text-[13px] text-ink-faint">Total fare</dt>
                    <dd className="board text-[2.25rem] leading-none font-semibold">{money(pricing.amount, pricing.currency)}</dd>
                    {pricing.passengerCount > 1 && (
                      <dd className="mt-1 text-sm text-ink-soft">{money(pricing.perPassenger, pricing.currency)} x {pricing.passengerCount}</dd>
                    )}
                  </div>
                  <div>
                    <dt className="text-[13px] text-ink-faint">Bags per traveller</dt>
                    <dd className="text-[15px]">{flight.baggage?.cabin || '—'} cabin, {flight.baggage?.checked || '—'} checked</dd>
                  </div>
                  <div>
                    <dt className="text-[13px] text-ink-faint">Requested</dt>
                    <dd className="text-[15px]">{stamp(booking.createdAt)}</dd>
                  </div>
                </dl>
                <p className="flex gap-2 rounded-xl bg-mist px-3 py-2.5 text-[13px] leading-snug text-ink-soft">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-ink-faint" aria-hidden="true" />
                  Seats here are simulated. This is not an airline ticket and nothing is charged.
                </p>
              </div>
            </article>
          )}

          <section aria-labelledby="progress-heading" className="rounded-3xl bg-white p-6 shadow-pass sm:p-7">
            <h2 id="progress-heading" className="text-lg font-bold tracking-tight">Progress</h2>
            <div className="mt-5"><StatusPath status={booking.status} /></div>

            <h3 className="mt-8 text-[13px] font-medium text-ink-faint">History</h3>
            <ol className="mt-3 space-y-0">
              {[...booking.history].reverse().map((entry, index, list) => (
                <li key={`${entry.at}-${index}`} className="relative flex gap-4 pb-5 last:pb-0">
                  {index < list.length - 1 && <span className="absolute top-3 left-[5px] h-full w-px bg-line" aria-hidden="true" />}
                  <span className={cx('relative mt-1.5 size-[11px] shrink-0 rounded-full border-2 bg-white', index === 0 ? 'border-signal-600' : 'border-ink-faint')} aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-[15px]">
                      <span className="font-semibold">{STATUS_META[entry.status]?.label || entry.status}</span>
                      <span className="text-ink-soft">, {ACTOR[entry.actor] || entry.actor}</span>
                    </p>
                    {entry.note && <p className="text-sm text-ink-soft">{entry.note}</p>}
                    <p className="board text-[15px] text-ink-faint">{stamp(entry.at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24" aria-label="Actions">
          {(pending || cancellable) && !editing && (
            <div className="rounded-3xl bg-white p-6 shadow-pass">
              <h2 className="text-lg font-bold tracking-tight">Change of plans?</h2>
              <p className="mt-1 text-[15px] text-ink-soft">
                {pending ? 'Fix a typo in a name or update contact details while the request is waiting.' : 'Cancelling releases your simulated seat.'}
              </p>
              <div className="mt-5 flex flex-col gap-2.5">
                {pending && <Button variant="outline" onClick={() => { setSaved(null); setEditing(true); }}>Edit traveller details</Button>}
                <Button variant="dangerOutline" onClick={() => setCancelling(true)}>{pending ? 'Cancel request' : 'Cancel booking'}</Button>
              </div>
            </div>
          )}
          <div className="rounded-3xl border border-line p-6">
            <h2 className="font-semibold">Want a different flight?</h2>
            <p className="mt-1 text-[15px] text-ink-soft">Flights on a request cannot be swapped. Cancel this one and search again.</p>
            <Link to="/" className="mt-3 inline-block text-[15px] font-semibold text-signal-600 hover:text-signal-700">Search flights</Link>
          </div>
        </aside>
      </div>

      <CancelDialog
        booking={booking} open={cancelling} onClose={() => setCancelling(false)}
        onCancelled={(next) => { setBooking(next); setCancelling(false); setSaved(null); }}
      />
    </div>
  );
}
