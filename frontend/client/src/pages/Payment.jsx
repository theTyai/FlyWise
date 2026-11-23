import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { AlertTriangle, CheckCircle2, Clock, CreditCard, Lock, Plane, ShieldCheck, Zap } from 'lucide-react';
import { CABIN_LABEL } from '@shared/constants.js';
import { day, money, time } from '@shared/ui/format.js';
import { Button, Notice, PageLoading, cx } from '@shared/ui/index.jsx';
import ProgressStepper from '../components/ProgressStepper.jsx';
import { confirmPayment, getSeatLock, releaseSeatLock } from '../services/booking.service.js';
import { getOffer } from '../services/flight.service.js';

export default function Payment() {
  const { offerId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const queryParams = new URLSearchParams(location.search);
  const lockKey = queryParams.get('lockKey') || location.state?.lockKey;
  const passengers = location.state?.passengers || [];
  const contact = location.state?.contact || {};

  const [offerData, setOfferData] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(300);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState(null);
  const [method, setMethod] = useState('PASS_AND_DONE');

  // Load offer & lock status
  useEffect(() => {
    let active = true;
    Promise.all([
      getOffer(offerId),
      lockKey ? getSeatLock(lockKey).catch(() => null) : Promise.resolve(null),
    ])
      .then(([offerRes, lockRes]) => {
        if (!active) return;
        setOfferData(offerRes.offer);
        if (lockRes?.lock?.remainingSeconds) {
          setSecondsLeft(lockRes.lock.remainingSeconds);
        }
      })
      .catch((err) => {
        if (active) setError(err.message || 'Unable to load checkout session');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [offerId, lockKey]);

  // Countdown timer
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');
  const isExpired = secondsLeft <= 0;

  async function handlePay() {
    if (isExpired) return;
    setPaying(true);
    setError(null);
    try {
      const result = await confirmPayment({
        lockKey,
        offerId,
        passengers,
        contact,
        paymentMethod: method === 'PASS_AND_DONE' ? 'DEMO_PASS' : method,
      });

      // Celebratory confetti animation
      confetti({
        particleCount: 110,
        spread: 70,
        origin: { y: 0.6 },
      });

      navigate(`/trips/${result.booking.id}`, { state: { justBooked: true } });
    } catch (err) {
      setError(err.message || 'Payment failed. Please try again.');
      setPaying(false);
    }
  }

  async function handleCancel() {
    if (lockKey) {
      await releaseSeatLock(lockKey).catch(() => {});
    }
    navigate(`/results/${offerData?.searchId || ''}`);
  }

  if (loading) return <PageLoading label="Securing seats & preparing checkout" />;

  const offer = offerData;
  if (!offer) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center">
        <AlertTriangle className="size-12 text-stop-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold">Checkout Session Unavailable</h2>
        <p className="mt-2 text-ink-soft">The flight fare has expired or is no longer accessible.</p>
        <Button className="mt-6" onClick={() => navigate('/')}>Search Flights</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <ProgressStepper currentStep={3} />

      <div className="mx-auto max-w-4xl px-5 py-6">
        {/* Real-time Seat Hold Timer Banner */}
        <div
          className={cx(
            'flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4 shadow-sm border transition-all',
            isExpired ? 'bg-stop-50 border-stop-200 text-stop-900' :
            secondsLeft < 60 ? 'bg-flare-50 border-flare-200 text-flare-900 animate-pulse' :
            'bg-signal-50 border-signal-200 text-signal-900'
          )}
        >
          <div className="flex items-center gap-3">
            <span
              className={cx(
                'grid size-10 place-items-center rounded-xl text-white font-bold',
                isExpired ? 'bg-stop-600' : secondsLeft < 60 ? 'bg-flare-600' : 'bg-signal-600'
              )}
            >
              <Clock className="size-5" />
            </span>
            <div>
              <p className="font-bold text-sm">
                {isExpired ? 'Seat Lock Expired' : 'Seats Temporarily Locked for You'}
              </p>
              <p className="text-xs opacity-85">
                {isExpired
                  ? 'Your 5-minute hold timed out. Fares have been unlocked for other travellers.'
                  : 'Complete your booking before the timer runs out to guarantee your seat.'}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] uppercase tracking-wider opacity-75 block">Time Remaining</span>
            <span className="board text-3xl font-black tracking-wider">
              {mins}:{secs}
            </span>
          </div>
        </div>

        {error && <Notice tone="error" className="mt-4">{error}</Notice>}

        {isExpired ? (
          <div className="mt-8 rounded-3xl bg-white p-8 text-center border border-line shadow-pass">
            <h3 className="text-xl font-bold text-ink">Your Seat Reservation Expired</h3>
            <p className="mt-2 text-sm text-ink-soft max-w-md mx-auto">
              To prevent inventory lockouts, seats are released back to the general pool after 5 minutes.
            </p>
            <div className="mt-6 flex justify-center gap-4">
              <Button variant="outline" onClick={() => navigate('/')}>Home</Button>
              <Button variant="primary" onClick={() => navigate(`/book/${offer.id}`)}>Re-lock & Book</Button>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-start">
            {/* Payment Method Selector */}
            <div className="rounded-3xl bg-white p-6 sm:p-8 border border-line shadow-pass">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold tracking-tight text-ink">Payment & Instant Confirmation</h2>
                <span className="flex items-center gap-1 text-xs font-semibold text-mint-700 bg-mint-50 px-2.5 py-1 rounded-full">
                  <ShieldCheck className="size-3.5" /> 100% Sandbox Free
                </span>
              </div>
              <p className="text-xs text-ink-soft mb-6">
                This is a realistic travel booking demonstration. Select "Pass & Done" to confirm your reservation and receive an official E-Ticket instantly.
              </p>

              {/* Payment Tabs */}
              <div className="space-y-3">
                <label
                  className={cx(
                    'flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all',
                    method === 'PASS_AND_DONE'
                      ? 'border-signal-600 bg-signal-50/50 ring-2 ring-signal-100'
                      : 'border-line hover:border-signal-200'
                  )}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="PASS_AND_DONE"
                    checked={method === 'PASS_AND_DONE'}
                    onChange={() => setMethod('PASS_AND_DONE')}
                    className="size-4 mt-1 accent-signal-600"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-ink text-sm flex items-center gap-1.5">
                        <Zap className="size-4 text-signal-600 fill-signal-600" />
                        Pass & Done (Instant 1-Click Approval)
                      </span>
                      <span className="text-[11px] font-bold text-mint-700 bg-mint-50 px-2 py-0.5 rounded-full">
                        Recommended
                      </span>
                    </div>
                    <p className="text-xs text-ink-soft mt-1 leading-relaxed">
                      Bypasses external payment gateways. Instantly confirms seats, verifies ACID inventory, and issues your boarding pass.
                    </p>
                  </div>
                </label>

                <label
                  className={cx(
                    'flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all',
                    method === 'MOCK_UPI'
                      ? 'border-signal-600 bg-signal-50/50 ring-2 ring-signal-100'
                      : 'border-line hover:border-signal-200'
                  )}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="MOCK_UPI"
                    checked={method === 'MOCK_UPI'}
                    onChange={() => setMethod('MOCK_UPI')}
                    className="size-4 mt-1 accent-signal-600"
                  />
                  <div className="flex-1">
                    <span className="font-bold text-ink text-sm block">UPI (GPay / PhonePe / Paytm Mock)</span>
                    <p className="text-xs text-ink-soft mt-1">Simulates UPI fast checkout with instant bank clearance.</p>
                  </div>
                </label>

                <label
                  className={cx(
                    'flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all',
                    method === 'MOCK_CARD'
                      ? 'border-signal-600 bg-signal-50/50 ring-2 ring-signal-100'
                      : 'border-line hover:border-signal-200'
                  )}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="MOCK_CARD"
                    checked={method === 'MOCK_CARD'}
                    onChange={() => setMethod('MOCK_CARD')}
                    className="size-4 mt-1 accent-signal-600"
                  />
                  <div className="flex-1">
                    <span className="font-bold text-ink text-sm flex items-center gap-1.5">
                      <CreditCard className="size-4 text-ink-soft" /> Credit / Debit Card (Sandbox)
                    </span>
                    <p className="text-xs text-ink-soft mt-1">Pre-filled demo card: 4111 •••• •••• 1111</p>
                  </div>
                </label>
              </div>

              {/* Security Note */}
              <div className="mt-8 rounded-2xl bg-mist p-4 flex items-center gap-3 text-xs text-ink-soft border border-line/60">
                <Lock className="size-4 text-mint-700 shrink-0" />
                <span>
                  ACID guaranteed transaction. No real money will be charged. Fares are locked for the remainder of this session.
                </span>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-line pt-5">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="text-xs font-semibold text-ink-faint hover:text-ink"
                >
                  Cancel Hold
                </button>
                <Button
                  size="lg"
                  loading={paying}
                  onClick={handlePay}
                  className="btn-gradient px-8 text-base font-bold shadow-md"
                >
                  {paying ? 'Verifying & Confirming...' : 'Confirm Booking & Get Ticket'}
                </Button>
              </div>
            </div>

            {/* Order Summary Stub */}
            <aside aria-label="Order summary">
              <div className="rounded-3xl bg-white border border-line shadow-pass overflow-hidden">
                <div className="bg-night-900 p-5 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-base">{offer.airline}</p>
                      <p className="text-xs text-white/70">{offer.flightNumber} • {CABIN_LABEL[offer.cabinClass]}</p>
                    </div>
                    <span className="board text-xl font-black text-signal-200">
                      {offer.origin} → {offer.destination}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-white/60">
                    {day(offer.departureTime)} at {time(offer.departureTime)}
                  </p>
                </div>

                <div className="p-5 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink-faint">
                    Traveller Details ({passengers.length})
                  </h4>
                  <ul className="divide-y divide-line text-xs text-ink">
                    {passengers.map((p, i) => (
                      <li key={i} className="py-2 flex justify-between">
                        <span className="font-semibold">{p.firstName} {p.lastName}</span>
                        <span className="text-ink-soft">{p.gender}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="border-t border-line pt-4 space-y-2 text-xs">
                    <div className="flex justify-between text-ink-soft">
                      <span>Base Fare ({passengers.length} pax)</span>
                      <span className="board font-semibold">{money(offer.price, offer.currency)}</span>
                    </div>
                    <div className="flex justify-between text-ink-soft">
                      <span>Taxes & Carrier Fees</span>
                      <span className="board font-semibold text-mint-700">Included</span>
                    </div>
                    <div className="flex justify-between text-ink-soft">
                      <span>Live Seat Reservation</span>
                      <span className="board font-semibold text-mint-700">Guaranteed</span>
                    </div>
                    <div className="flex justify-between items-baseline border-t border-line pt-3 text-ink">
                      <span className="font-bold text-sm">Total Payable</span>
                      <span className="board text-2xl font-black text-signal-600">
                        {money(offer.price, offer.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
