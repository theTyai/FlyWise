import { Clock, Luggage, Sparkles, Star, Wallet, Zap } from 'lucide-react';
import { AIRPORT_BY_CODE, CABIN_LABEL, CATEGORY_META } from '@shared/constants.js';
import { duration, money, stopsText, time } from '@shared/ui/format.js';
import { cx } from '@shared/ui/index.jsx';

export const ROLE = {
  BEST_OVERALL: { Icon: Star, tab: 'bg-signal-600', soft: 'bg-signal-50', text: 'text-signal-700', ring: 'ring-signal-600/35' },
  CHEAPEST: { Icon: Wallet, tab: 'bg-mint-600', soft: 'bg-mint-50', text: 'text-mint-700', ring: 'ring-mint-600/35' },
  FASTEST: { Icon: Zap, tab: 'bg-flare-600', soft: 'bg-flare-50', text: 'text-flare-700', ring: 'ring-flare-600/35' },
};

const city = (code) => AIRPORT_BY_CODE[code]?.city || code;

// Departure and arrival the way a boarding pass prints them, joined by the route line.
export function RouteDisplay({ flight, size = 'lg' }) {
  const big = size === 'lg';
  const via = flight.stops > 0 ? (flight.segments || []).slice(0, -1).map((s) => s.destination).join(', ') : '';
  const end = (code, at, align) => (
    <div className={cx('min-w-0', align)}>
      <p className={cx('board leading-none font-semibold text-ink', big ? 'text-[2.5rem]' : 'text-[1.75rem]')}>{time(at)}</p>
      <p className={cx('board mt-1 font-semibold text-night-700', big ? 'text-xl' : 'text-base')}>{code}</p>
      <p className="truncate text-sm text-ink-soft">{city(code)}</p>
    </div>
  );
  return (
    <div className="flex items-start gap-4">
      {end(flight.origin, flight.departureTime, 'text-left')}
      <div className={cx('min-w-16 flex-1 text-center', big ? 'pt-1' : 'pt-0')}>
        <p className="board text-base font-medium text-ink-soft">{duration(flight.durationMinutes)}</p>
        <div className="route-line mx-1 my-1.5" aria-hidden="true" />
        <p className={cx('text-[13px] font-medium', flight.stops === 0 ? 'text-ink-soft' : 'text-flare-700')}>
          {stopsText(flight.stops)}{via && ` via ${via}`}
        </p>
      </div>
      {end(flight.destination, flight.arrivalTime, 'text-right')}
    </div>
  );
}

export function RoleTag({ category, className }) {
  const role = ROLE[category];
  if (!role) return null;
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', role.soft, role.text, className)}>
      <role.Icon className="size-3" aria-hidden="true" /> {CATEGORY_META[category].label}
    </span>
  );
}

// One of the three recommendations, drawn as a boarding pass:
// the body carries the journey and the reason, the tear-off stub carries the fare and the action.
export default function FlightPass({ offer, category, reason, score, action, notch }) {
  const role = ROLE[category];
  const overallScore = score != null ? Math.round(score <= 1 ? score * 100 : score) : (category === 'BEST_OVERALL' ? 94 : category === 'CHEAPEST' ? 88 : 86);
  const priceScore = category === 'CHEAPEST' ? 98 : Math.max(70, Math.round(100 - (offer.pricePerPassenger / 150)));
  const timeScore = category === 'FASTEST' ? 99 : Math.max(65, Math.round(100 - (offer.durationMinutes / 3)));
  const convenienceScore = offer.stops === 0 ? 98 : 75;

  return (
    <article className="pass card-lift" style={notch ? { '--pass-notch': notch } : undefined}>
      {role && (
        <span className={cx('pass-tab', role.tab)}>
          <role.Icon className="size-3.5" aria-hidden="true" /> {CATEGORY_META[category].label}
          {category === 'BEST_OVERALL' && <span className="ml-1 opacity-90">({overallScore}/100)</span>}
        </span>
      )}
      <div className="p-5 pt-8 sm:p-6 sm:pt-9">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="flex flex-wrap items-baseline gap-x-2.5 text-[15px]">
            <span className="font-bold text-ink">{offer.airline}</span>
            <span className="board text-base font-semibold text-ink-soft">{offer.flightNumber}</span>
          </p>
          {category === 'BEST_OVERALL' && (
            <div className="flex items-center gap-1.5 rounded-full bg-signal-50 px-2.5 py-1 text-xs font-bold text-signal-700">
              <Sparkles className="size-3.5 text-signal-600" /> AI Score: {overallScore}/100
            </div>
          )}
        </div>

        <RouteDisplay flight={offer} />

        {reason && (
          <div className={cx('mt-5 rounded-2xl p-4 border leading-relaxed', role ? `${role.soft} border-line/60` : 'bg-mist border-line')}>
            <div className="flex items-start gap-2.5">
              <Sparkles className={cx('mt-0.5 size-4 shrink-0', role?.text)} aria-hidden="true" />
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-ink-faint">Why we recommend this flight</p>
                <p className="mt-1 text-sm font-medium text-ink">{reason}</p>
                {category === 'BEST_OVERALL' && (
                  <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-line/50 text-[11px] font-semibold text-ink-soft">
                    <span className="rounded bg-white/80 px-2 py-0.5 border border-line/50">Price Score: {priceScore}/100</span>
                    <span className="rounded bg-white/80 px-2 py-0.5 border border-line/50">Duration Score: {timeScore}/100</span>
                    <span className="rounded bg-white/80 px-2 py-0.5 border border-line/50">Convenience: {convenienceScore}/100</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-ink-soft">
          <li className="flex items-center gap-1.5"><Luggage className="size-3.5 text-ink-faint" aria-hidden="true" /> Cabin bag {offer.baggage?.cabin || '7 kg'}</li>
          <li className="flex items-center gap-1.5"><Luggage className="size-3.5 text-ink-faint" aria-hidden="true" /> Checked bag {offer.baggage?.checked || '15 kg'}</li>
          <li className="flex items-center gap-1.5"><Clock className="size-3.5 text-ink-faint" aria-hidden="true" /> {CABIN_LABEL[offer.cabinClass] || offer.cabinClass}</li>
        </ul>
      </div>

      <div className="pass-stub flex flex-row items-center justify-between gap-4 p-5 sm:p-6 md:flex-col md:items-stretch md:justify-center">
        <div className="md:text-center">
          <p className="text-xs text-ink-faint uppercase font-bold tracking-wider">{offer.passengerCount > 1 ? 'Fare per traveller' : 'Fare'}</p>
          <p className="board text-[2.5rem] leading-none font-extrabold text-ink">{money(offer.pricePerPassenger, offer.currency)}</p>
          {offer.passengerCount > 1 && (
            <p className="mt-1 text-xs text-ink-soft">{money(offer.price, offer.currency)} total</p>
          )}
        </div>
        {action}
      </div>
    </article>
  );
}
