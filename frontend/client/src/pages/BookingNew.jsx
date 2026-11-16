import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, PlaneTakeoff } from 'lucide-react';
import { CABIN_LABEL } from '@shared/constants.js';
import { day, money } from '@shared/ui/format.js';
import { Button, EmptyState, Notice, PageLoading } from '@shared/ui/index.jsx';
import { RoleTag, RouteDisplay } from '../components/FlightPass.jsx';
import { TravellerFields, checkTravellers, emptyTraveller, errorsByField } from '../components/TravellerFields.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { createBooking } from '../services/booking.service.js';
import { getOffer } from '../services/flight.service.js';

export default function BookingNew() {
  const { offerId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [passengers, setPassengers] = useState([]);
  const [contact, setContact] = useState({ email: user.email, phone: user.phone || '' });
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    getOffer(offerId)
      .then((result) => {
        if (!live) return;
        setData(result);
        const [first = '', ...rest] = user.name.split(/\s+/);
        setPassengers(Array.from({ length: result.offer.passengerCount }, (_, i) => (
          i === 0 ? { ...emptyTraveller(), firstName: first, lastName: rest.join(' ') } : emptyTraveller()
        )));
      })
      .catch((error) => { if (live) setLoadError(error.message); });
    return () => { live = false; };
  }, [offerId, user.name]);

  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <EmptyState icon={PlaneTakeoff} title="This fare is no longer available" action={<Button onClick={() => navigate('/')}>Search again</Button>}>{loadError}</EmptyState>
      </div>
    );
  }
  if (!data) return <PageLoading label="Loading your flight" />;

  const { offer, recommendation } = data;

  async function submit(event) {
    event.preventDefault();
    setFailure(null);
    const found = checkTravellers(passengers, contact);
    if (!agreed) found.acknowledgeSimulated = 'Tick the box to confirm you understand this is a request, not an airline ticket';
    setErrors(found);
    if (Object.keys(found).length) {
      setFailure('Some details are missing. Check the fields marked below.');
      return;
    }
    setBusy(true);
    try {
      const result = await createBooking({
        offerId: offer.id,
        passengers: passengers.map((p) => ({ ...p, firstName: p.firstName.trim(), lastName: p.lastName.trim() })),
        contact: { email: contact.email.trim(), phone: contact.phone.trim() },
      });
      navigate(`/trips/${result.booking.id}`, { state: { justSent: true } });
    } catch (error) {
      setErrors(errorsByField(error));
      setFailure(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <Link to={`/results/${offer.searchId}`} className="inline-flex items-center gap-1 text-[15px] font-medium text-ink-soft hover:text-ink">
        <ChevronLeft className="size-4" aria-hidden="true" /> Back to flights
      </Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Who is travelling?</h1>

      <form onSubmit={submit} noValidate className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="rounded-3xl bg-white p-6 shadow-pass sm:p-8">
          {offer.availableSeats !== undefined && (
            <div className="mb-6 flex items-center justify-between rounded-2xl border border-mint-200 bg-mint-50/80 px-4 py-3 text-sm text-mint-900">
              <span className="flex items-center gap-2 font-semibold">
                <span className="size-2 rounded-full bg-mint-600 animate-pulse" />
                Live Availability: {offer.availableSeats} seats remaining
              </span>
              <span className="rounded bg-white px-2 py-0.5 font-mono text-xs font-bold text-mint-800 border border-mint-200">
                ACID Verified
              </span>
            </div>
          )}

          {offer.expired && (
            <Notice tone="error" title="This fare has expired" className="mb-6" action={<Button size="sm" variant="navy" onClick={() => navigate('/')}>Search again</Button>}>
              Fares are held for 30 minutes.
            </Notice>
          )}
          {failure && <Notice tone="error" className="mb-6">{failure}</Notice>}
          <TravellerFields passengers={passengers} contact={contact} onPassengers={setPassengers} onContact={setContact} errors={errors} />

          <div className="mt-8 rounded-2xl bg-signal-50/60 border border-signal-100 p-4">
            <label className="flex items-start gap-3 text-[15px] leading-relaxed text-ink cursor-pointer">
              <input type="checkbox" className="mt-1 size-4 shrink-0 accent-signal-600" checked={agreed} onChange={(event) => setAgreed(event.target.checked)}
                aria-invalid={Boolean(errors.acknowledgeSimulated)} />
              <span>
                I confirm the traveller details are correct. <strong>Live seats will be allocated and guaranteed immediately</strong> upon submission without waiting for manual admin review.
              </span>
            </label>
            {errors.acknowledgeSimulated && <p className="mt-2 pl-7 text-sm text-stop-700">{errors.acknowledgeSimulated}</p>}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24" aria-label="Booking summary">
          <div className="pass" style={{ '--stub-width': '100%', gridTemplateColumns: 'minmax(0, 1fr)' }}>
            <div className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{offer.airline}</p>
                  <p className="board text-base text-ink-soft">{offer.flightNumber}</p>
                </div>
                {recommendation && <RoleTag category={recommendation.category} />}
              </div>
              <p className="mt-4 mb-3 text-[15px] font-medium text-ink-soft">{day(offer.departureTime)}, {CABIN_LABEL[offer.cabinClass]}</p>
              <RouteDisplay flight={offer} size="sm" />
            </div>
            <div className="pass-stub p-6" style={{ borderLeft: 0, borderTop: '2px dashed var(--color-line)' }}>
              <dl className="space-y-2 text-[15px]">
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-soft">{money(offer.pricePerPassenger, offer.currency)} x {offer.passengerCount} traveller{offer.passengerCount > 1 ? 's' : ''}</dt>
                  <dd className="board text-lg">{money(offer.price, offer.currency)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-soft">Bags</dt>
                  <dd>{offer.baggage.cabin} cabin, {offer.baggage.checked} checked</dd>
                </div>
                {offer.availableSeats !== undefined && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-soft">Seats remaining</dt>
                    <dd className="font-semibold text-mint-700">{offer.availableSeats} seats</dd>
                  </div>
                )}
                <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
                  <dt className="font-semibold">Total fare</dt>
                  <dd className="board text-[2rem] leading-none font-semibold">{money(offer.price, offer.currency)}</dd>
                </div>
              </dl>
              <Button type="submit" size="lg" loading={busy} disabled={offer.expired || (offer.availableSeats !== undefined && offer.availableSeats < offer.passengerCount)} className="mt-5 w-full btn-gradient">
                {busy ? 'Reserving Seats & Booking...' : 'Instant Book & Confirm'}
              </Button>
              <p className="mt-2.5 text-center text-xs text-ink-faint">
                Instant Confirmation • ACID Atomic Seat Guarantee
              </p>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}
