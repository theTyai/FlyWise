import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Lock, PlaneTakeoff, ShieldCheck } from 'lucide-react';
import { CABIN_LABEL } from '@shared/constants.js';
import { day, money } from '@shared/ui/format.js';
import { Button, EmptyState, Notice, PageLoading } from '@shared/ui/index.jsx';
import { RoleTag, RouteDisplay } from '../components/FlightPass.jsx';
import ProgressStepper from '../components/ProgressStepper.jsx';
import { TravellerFields, checkTravellers, emptyTraveller, errorsByField } from '../components/TravellerFields.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { acquireSeatLock } from '../services/booking.service.js';
import { getOffer } from '../services/flight.service.js';

export default function BookingNew() {
  const { offerId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [passengers, setPassengers] = useState([]);
  const [contact, setContact] = useState({ email: user.email, phone: user.phone || '' });
  const [agreed, setAgreed] = useState(true);
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
          i === 0
            ? {
                ...emptyTraveller(),
                firstName: first,
                lastName: rest.join(' '),
                gender: user.gender || 'MALE',
                dateOfBirth: user.dateOfBirth || '',
              }
            : emptyTraveller()
        )));
      })
      .catch((error) => { if (live) setLoadError(error.message); });
    return () => { live = false; };
  }, [offerId, user.name, user.gender, user.dateOfBirth]);

  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <EmptyState icon={PlaneTakeoff} title="This fare is no longer available" action={<Button onClick={() => navigate('/')}>Search again</Button>}>{loadError}</EmptyState>
      </div>
    );
  }
  if (!data) return <PageLoading label="Verifying flight schedule" />;

  const { offer, recommendation } = data;

  async function submit(event) {
    event.preventDefault();
    setFailure(null);
    const found = checkTravellers(passengers, contact);
    if (!agreed) found.acknowledgeSimulated = 'Tick the box to confirm details';
    setErrors(found);
    if (Object.keys(found).length) {
      setFailure('Some details are missing. Check the fields marked below.');
      return;
    }
    setBusy(true);
    try {
      // 1. Acquire atomic 5-minute seat lock in MongoDB
      const lockRes = await acquireSeatLock({
        offerId: offer.id,
        seats: passengers.length,
      });

      // 2. Navigate to Payment checkout with active lock
      navigate(`/payment/${offer.id}`, {
        state: {
          lockKey: lockRes.lock.lockKey,
          passengers: passengers.map((p) => ({ ...p, firstName: p.firstName.trim(), lastName: p.lastName.trim() })),
          contact: { email: contact.email.trim(), phone: contact.phone.trim() },
        },
      });
    } catch (error) {
      setErrors(errorsByField(error));
      setFailure(error.message || 'Unable to lock seats. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen pb-20">
      <ProgressStepper currentStep={2} />

      <div className="mx-auto max-w-6xl px-5 py-6">
        <Link to={`/results/${offer.searchId}`} className="inline-flex items-center gap-1 text-[15px] font-medium text-ink-soft hover:text-ink">
          <ChevronLeft className="size-4" aria-hidden="true" /> Back to search results
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink">Enter Passenger Information</h1>

        <form onSubmit={submit} noValidate className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_23rem]">
          <div className="rounded-3xl bg-white p-6 shadow-pass sm:p-8 border border-line">
            {offer.availableSeats !== undefined && (
              <div className="mb-6 flex items-center justify-between rounded-2xl border border-mint-200 bg-mint-50/80 px-4 py-3 text-sm text-mint-900">
                <span className="flex items-center gap-2 font-semibold">
                  <span className="size-2 rounded-full bg-mint-600 animate-pulse" />
                  Live Flight Availability: {offer.availableSeats} seats remaining
                </span>
                <span className="rounded bg-white px-2 py-0.5 font-mono text-xs font-bold text-mint-800 border border-mint-200">
                  Instant Guarantee
                </span>
              </div>
            )}

            {offer.expired && (
              <Notice tone="error" title="This fare has expired" className="mb-6" action={<Button size="sm" variant="navy" onClick={() => navigate('/')}>Search again</Button>}>
                Fares are refreshed periodically. Search again to refresh current inventory.
              </Notice>
            )}
            {failure && <Notice tone="error" className="mb-6">{failure}</Notice>}

            <TravellerFields passengers={passengers} contact={contact} onPassengers={setPassengers} onContact={setContact} errors={errors} />

            <div className="mt-8 rounded-2xl bg-signal-50/60 border border-signal-100 p-4">
              <label className="flex items-start gap-3 text-sm leading-relaxed text-ink cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 size-4 shrink-0 accent-signal-600"
                  checked={agreed}
                  onChange={(event) => setAgreed(event.target.checked)}
                />
                <span>
                  I confirm the passenger details are correct. Clicking continue will <strong>lock your seats for 5 minutes</strong> while you confirm payment.
                </span>
              </label>
            </div>
          </div>

          <aside className="lg:sticky lg:top-24" aria-label="Booking summary">
            <div className="pass shadow-lift" style={{ '--stub-width': '100%', gridTemplateColumns: 'minmax(0, 1fr)' }}>
              <div className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-base text-ink">{offer.airline}</p>
                    <p className="board text-sm font-semibold text-ink-soft">{offer.flightNumber}</p>
                  </div>
                  {recommendation && <RoleTag category={recommendation.category} />}
                </div>
                <p className="mt-4 mb-3 text-xs font-semibold text-ink-soft">
                  {day(offer.departureTime)}, {CABIN_LABEL[offer.cabinClass]}
                </p>
                <RouteDisplay flight={offer} size="sm" />
              </div>

              <div className="pass-stub p-6" style={{ borderLeft: 0, borderTop: '2px dashed var(--color-line)' }}>
                <dl className="space-y-2 text-xs">
                  <div className="flex justify-between gap-4 text-ink-soft">
                    <span>Fare ({offer.passengerCount} traveller{offer.passengerCount > 1 ? 's' : ''})</span>
                    <span className="board text-sm font-bold text-ink">{money(offer.price, offer.currency)}</span>
                  </div>
                  <div className="flex justify-between gap-4 text-ink-soft">
                    <span>Baggage</span>
                    <span className="font-semibold text-ink">{offer.baggage.cabin} cabin, {offer.baggage.checked} checked</span>
                  </div>
                  <div className="flex justify-between gap-4 text-ink-soft">
                    <span>Seats Available</span>
                    <span className="font-bold text-mint-700">{offer.availableSeats} seats</span>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3 text-ink">
                    <dt className="font-bold text-sm">Total Fare</dt>
                    <dd className="board text-[1.85rem] leading-none font-black text-signal-600">
                      {money(offer.price, offer.currency)}
                    </dd>
                  </div>
                </dl>

                <Button
                  type="submit"
                  size="lg"
                  loading={busy}
                  disabled={offer.expired || (offer.availableSeats !== undefined && offer.availableSeats < offer.passengerCount)}
                  className="mt-5 w-full btn-gradient shadow-md"
                >
                  <Lock className="size-4 mr-1.5" />
                  {busy ? 'Securing Seats...' : 'Lock Seats & Proceed'}
                </Button>

                <p className="mt-2.5 text-center text-[11px] text-ink-faint flex items-center justify-center gap-1">
                  <ShieldCheck className="size-3.5 text-mint-700" /> 5-Minute Atomic Seat Lock
                </p>
              </div>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
}
