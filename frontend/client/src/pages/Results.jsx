import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Check, Filter, PlaneTakeoff, RotateCcw, SlidersHorizontal, Sparkles } from 'lucide-react';
import { CABIN_LABEL, CATEGORY_META } from '@shared/constants.js';
import { dayFromIso, duration, money, stopsText, time } from '@shared/ui/format.js';
import { Button, EmptyState, Notice, PageLoading, cx } from '@shared/ui/index.jsx';
import FlightPass, { ROLE, RoleTag, RouteDisplay } from '../components/FlightPass.jsx';
import SearchTicket from '../components/SearchTicket.jsx';
import { getSearch, searchFlights } from '../services/flight.service.js';

const ENGINE_TEXT = {
  LLM: 'Mathematical multi-criteria optimization selected the top candidates. FlyWise AI evaluated your preferences to determine the best overall flight and formulated the decision rationale.',
  DETERMINISTIC: 'Flights ranked using the weighted multi-criteria formula: Fare 50%, Travel Time 35%, Stops 15%.',
  LOCAL_FALLBACK: 'AI microservice running in local fallback mode. Rankings computed using the authoritative scoring engine.',
};

function SkeletonResults() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-10 space-y-6 animate-pulse">
      <div className="h-20 bg-white rounded-2xl border border-line" />
      <div className="grid gap-6 md:grid-cols-3">
        <div className="h-56 bg-white rounded-2xl border border-line" />
        <div className="h-56 bg-white rounded-2xl border border-line" />
        <div className="h-56 bg-white rounded-2xl border border-line" />
      </div>
      <div className="h-72 bg-white rounded-2xl border border-line" />
    </div>
  );
}

function CompareTable({ picks }) {
  const rows = [
    { label: 'Fare per traveller', value: (o) => money(o.pricePerPassenger, o.currency), metric: (o) => o.pricePerPassenger, tag: 'Lowest' },
    { label: 'Journey time', value: (o) => duration(o.durationMinutes), metric: (o) => o.durationMinutes, tag: 'Shortest' },
    { label: 'Stops', value: (o) => stopsText(o.stops), metric: (o) => o.stops, tag: 'Fewest' },
    { label: 'Departs', value: (o) => time(o.departureTime) },
    { label: 'Arrives', value: (o) => time(o.arrivalTime) },
    { label: 'Checked bag', value: (o) => o.baggage?.checked || '15 kg' },
  ];
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-pass">
      <table className="w-full min-w-[34rem] text-left text-[14px]">
        <thead>
          <tr className="border-b border-line bg-mist/60">
            <th scope="col" className="px-5 py-4 font-semibold text-ink-faint uppercase text-xs tracking-wider">Metric</th>
            {picks.map(({ offer, category }) => (
              <th key={offer.id} scope="col" className="px-5 py-4">
                <RoleTag category={category} />
                <span className="mt-1.5 block font-bold text-ink">{offer.airline}</span>
                <span className="board block font-semibold text-ink-soft">{offer.flightNumber}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const best = row.metric ? Math.min(...picks.map(({ offer }) => row.metric(offer))) : null;
            const allSame = row.metric ? picks.every(({ offer }) => row.metric(offer) === best) : true;
            return (
              <tr key={row.label} className="border-b border-line last:border-0 hover:bg-mist/30 transition-colors">
                <th scope="row" className="px-5 py-3.5 font-medium text-ink-soft">{row.label}</th>
                {picks.map(({ offer }) => {
                  const wins = row.metric && !allSame && row.metric(offer) === best;
                  return (
                    <td key={offer.id} className={cx('px-5 py-3.5', wins ? 'font-bold text-ink' : 'text-ink-soft')}>
                      <span className="board text-base">{row.value(offer)}</span>
                      {wins && <span className="ml-2 rounded-full bg-mint-50 px-2 py-0.5 text-xs font-bold text-mint-700">{row.tag}</span>}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function Results() {
  const { searchId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [sort, setSort] = useState('recommended');
  const [stopsFilter, setStopsFilter] = useState('all');
  const [timeWindow, setTimeWindow] = useState('all');
  const [selectedAirline, setSelectedAirline] = useState('all');
  const [maxPrice, setMaxPrice] = useState(15000);
  const [again, setAgain] = useState(false);

  useEffect(() => {
    let live = true;
    setData(null); setError(null); setEditing(false);
    getSearch(searchId)
      .then((result) => {
        if (!live) return;
        setData(result);
        const maxFare = Math.max(...(result.offers || []).map((o) => o.pricePerPassenger), 12000);
        setMaxPrice(Math.ceil(maxFare / 1000) * 1000);
      })
      .catch((failure) => { if (live) setError(failure.message); });
    return () => { live = false; };
  }, [searchId]);

  const offersById = useMemo(() => Object.fromEntries((data?.offers || []).map((o) => [o.id, o])), [data]);
  const picks = useMemo(() => (data?.recommendations || [])
    .map((r) => ({ ...r, offer: offersById[r.offerId] })).filter((r) => r.offer), [data, offersById]);
  const roleByOffer = useMemo(() => Object.fromEntries(picks.map((p) => [p.offerId, p.category])), [picks]);

  // Unique airlines from current search
  const availableAirlines = useMemo(() => {
    const names = new Set((data?.offers || []).map((o) => o.airline));
    return Array.from(names);
  }, [data]);

  const filteredOffers = useMemo(() => {
    if (!data?.offers) return [];
    return data.offers.filter((offer) => {
      // Stops filter
      if (stopsFilter === '0' && offer.stops !== 0) return false;
      if (stopsFilter === '1' && offer.stops < 1) return false;

      // Price filter
      if (offer.pricePerPassenger > maxPrice) return false;

      // Airline filter
      if (selectedAirline !== 'all' && offer.airline !== selectedAirline) return false;

      // Time window filter
      const depHour = new Date(offer.departureTime).getUTCHours() + 5.5; // Approx IST
      const adjustedHour = depHour >= 24 ? depHour - 24 : depHour;
      if (timeWindow === 'morning' && (adjustedHour < 5 || adjustedHour >= 12)) return false;
      if (timeWindow === 'afternoon' && (adjustedHour < 12 || adjustedHour >= 18)) return false;
      if (timeWindow === 'evening' && (adjustedHour < 18 && adjustedHour >= 5)) return false;

      return true;
    });
  }, [data, stopsFilter, maxPrice, selectedAirline, timeWindow]);

  const sortedOffers = useMemo(() => {
    const list = [...filteredOffers];
    if (sort === 'fare') return list.sort((a, b) => a.pricePerPassenger - b.pricePerPassenger);
    if (sort === 'time') return list.sort((a, b) => a.durationMinutes - b.durationMinutes);
    if (sort === 'departure') return list.sort((a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime());
    // 'recommended': picks first, then by fare
    return list.sort((a, b) => {
      const aRank = roleByOffer[a.id] ? 0 : 1;
      const bRank = roleByOffer[b.id] ? 0 : 1;
      if (aRank !== bRank) return aRank - bRank;
      return a.pricePerPassenger - b.pricePerPassenger;
    });
  }, [filteredOffers, sort, roleByOffer]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <EmptyState icon={PlaneTakeoff} title="We could not open this search" action={<Button onClick={() => navigate('/')}>Start a new search</Button>}>{error}</EmptyState>
      </div>
    );
  }

  if (!data) return <SkeletonResults />;

  const { search, offers } = data;
  const expired = offers.length > 0 && offers.every((o) => new Date(o.expiresAt).getTime() <= Date.now());
  const heldUntil = offers.length ? time(offers[0].expiresAt) : '';
  const initial = {
    origin: search.origin, destination: search.destination, departureDate: search.departureDate, passengers: search.passengers,
    cabinClass: search.cabinClass, priority: search.preferences?.priority || 'BALANCED', nonStopOnly: Boolean(search.preferences?.nonStopOnly),
    naturalLanguage: search.naturalLanguage,
  };

  async function searchAgain() {
    setAgain(true);
    try {
      const result = await searchFlights(initial);
      navigate(`/results/${result.search.id}`);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setAgain(false);
    }
  }

  const select = (offer) => navigate(`/book/${offer.id}`);

  const resetFilters = () => {
    setStopsFilter('all');
    setTimeWindow('all');
    setSelectedAirline('all');
    const maxFare = Math.max(...offers.map((o) => o.pricePerPassenger), 12000);
    setMaxPrice(Math.ceil(maxFare / 1000) * 1000);
  };

  return (
    <div className="pb-24">
      {/* Route & Search Header Bar */}
      <div className="border-b border-line bg-white shadow-xs">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-5">
          <div>
            <h1 className="board flex items-center gap-3 text-[2.4rem] leading-none font-bold text-ink">
              {search.origin} <ArrowRight className="size-6 text-signal-600" aria-label="to" /> {search.destination}
            </h1>
            <p className="mt-1.5 text-sm text-ink-soft">
              {dayFromIso(search.departureDate)} • {search.passengers} Passenger{search.passengers > 1 ? 's' : ''} • {CABIN_LABEL[search.cabinClass]}
            </p>
          </div>
          <Button variant="outline" onClick={() => setEditing((v) => !v)} aria-expanded={editing}>
            {editing ? 'Close' : 'Modify Search'}
          </Button>
        </div>
        {editing && (
          <div className="mx-auto max-w-6xl px-5 pb-6">
            <SearchTicket initial={initial} notch="#ffffff" />
          </div>
        )}
      </div>

      {/* Notices */}
      <div className="mx-auto max-w-6xl space-y-3 px-5 pt-6">
        <Notice tone="info" title="Real-World Airline Schedules">
          Schedules and fares are derived from authentic DGCA timetables (IndiGo, Air India, Vistara, Akasa, SpiceJet). Seats are verified by desk administrators.
        </Notice>
        {expired && (
          <Notice tone="error" title="Fares have expired" action={<Button size="sm" variant="navy" loading={again} onClick={searchAgain}>Search again</Button>}>
            Fares are held for 30 minutes. Search again to refresh current inventory.
          </Notice>
        )}
      </div>

      {offers.length === 0 ? (
        <div className="mx-auto max-w-3xl px-5 py-16">
          <EmptyState icon={PlaneTakeoff} title="No flights found for this route and date" action={<Button onClick={() => setEditing(true)}>Change search</Button>}>
            Try selecting a major hub such as Delhi (DEL), Mumbai (BOM), or Bengaluru (BLR).
          </EmptyState>
        </div>
      ) : (
        <div className="mx-auto max-w-6xl px-5">
          {/* Top 3 AI Recommendations Section */}
          <section aria-labelledby="picks-heading" className="mt-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-signal-50 px-3 py-1 text-xs font-bold text-signal-700">
                  <Sparkles className="size-3.5 text-signal-600" /> AI Recommendation Engine
                </div>
                <h2 id="picks-heading" className="mt-2 text-2xl font-bold tracking-tight text-ink">
                  Top 3 Shortlisted Flights
                </h2>
                <p className="mt-1 max-w-2xl text-xs text-ink-soft leading-relaxed">
                  {ENGINE_TEXT[search.engine] || ''}
                </p>
              </div>
              {!expired && heldUntil && (
                <p className="text-xs text-ink-faint">
                  Fares valid until <span className="board text-sm font-bold text-ink">{heldUntil}</span>
                </p>
              )}
            </div>

            <div className="mt-6 space-y-6">
              {picks.map(({ offer, category, reason, score }) => (
                <FlightPass
                  key={offer.id}
                  offer={offer}
                  category={category}
                  reason={reason}
                  score={score}
                  action={(
                    <Button
                      variant={category === 'BEST_OVERALL' ? 'primary' : 'navy'}
                      disabled={expired}
                      onClick={() => select(offer)}
                    >
                      Request this flight
                    </Button>
                  )}
                />
              ))}
            </div>
          </section>

          {/* Side by side comparison */}
          {picks.length > 1 && (
            <section aria-labelledby="compare-heading" className="mt-14">
              <h3 id="compare-heading" className="mb-4 text-xl font-bold tracking-tight text-ink">
                Compare Top Recommendations
              </h3>
              <CompareTable picks={picks} />
            </section>
          )}

          {/* Main Flight Results with Left Filter Sidebar */}
          <section aria-labelledby="all-heading" className="mt-16">
            <h2 id="all-heading" className="text-2xl font-bold tracking-tight text-ink mb-6">
              All Available Flights ({sortedOffers.length} of {offers.length})
            </h2>

            <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)] items-start">
              {/* Left Sidebar Filters */}
              <aside className="rounded-2xl border border-line bg-white p-5 shadow-pass space-y-6 lg:sticky lg:top-24">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <span className="flex items-center gap-2 font-bold text-sm text-ink">
                    <Filter className="size-4 text-signal-600" /> Filters
                  </span>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="flex items-center gap-1 text-xs font-semibold text-signal-600 hover:text-signal-700"
                  >
                    <RotateCcw className="size-3" /> Reset
                  </button>
                </div>

                {/* Stops Filter */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-ink-faint block mb-2">
                    Stops
                  </label>
                  <div className="space-y-1.5 text-sm">
                    {[
                      { id: 'all', label: 'All Flights' },
                      { id: '0', label: 'Non-stop Only' },
                      { id: '1', label: '1+ Stops' },
                    ].map((opt) => (
                      <label key={opt.id} className="flex items-center gap-2.5 text-ink-soft cursor-pointer hover:text-ink">
                        <input
                          type="radio"
                          name="stops"
                          value={opt.id}
                          checked={stopsFilter === opt.id}
                          onChange={(e) => setStopsFilter(e.target.value)}
                          className="size-4 accent-signal-600"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Price Range Slider */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-ink-faint">
                      Max Price
                    </label>
                    <span className="board text-sm font-bold text-ink">
                      {money(maxPrice)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={2000}
                    max={15000}
                    step={250}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full accent-signal-600 cursor-pointer"
                  />
                </div>

                {/* Departure Time Windows */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-ink-faint block mb-2">
                    Departure Time
                  </label>
                  <select
                    className="field text-sm"
                    value={timeWindow}
                    onChange={(e) => setTimeWindow(e.target.value)}
                  >
                    <option value="all">Any Departure Time</option>
                    <option value="morning">Morning (05:00 - 12:00)</option>
                    <option value="afternoon">Afternoon (12:00 - 18:00)</option>
                    <option value="evening">Evening (18:00 - 24:00)</option>
                  </select>
                </div>

                {/* Airline Filter */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-ink-faint block mb-2">
                    Airline
                  </label>
                  <select
                    className="field text-sm"
                    value={selectedAirline}
                    onChange={(e) => setSelectedAirline(e.target.value)}
                  >
                    <option value="all">All Airlines</option>
                    {availableAirlines.map((airline) => (
                      <option key={airline} value={airline}>{airline}</option>
                    ))}
                  </select>
                </div>
              </aside>

              {/* Main Flight Cards Area */}
              <div className="space-y-4">
                {/* Sort Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-line shadow-xs">
                  <span className="text-xs font-semibold text-ink-soft">
                    Showing <strong className="text-ink">{sortedOffers.length}</strong> matching flights
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-ink-faint">Sort by:</span>
                    <select
                      className="field w-auto py-1 text-xs font-medium"
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                    >
                      <option value="recommended">AI Recommended First</option>
                      <option value="fare">Lowest Price</option>
                      <option value="time">Shortest Duration</option>
                      <option value="departure">Earliest Departure</option>
                    </select>
                  </div>
                </div>

                {/* Flight Items */}
                <ul className="space-y-3">
                  {sortedOffers.map((offer) => {
                    const category = roleByOffer[offer.id];
                    return (
                      <li
                        key={offer.id}
                        className={cx(
                          'card-lift grid items-center gap-x-6 gap-y-4 rounded-2xl bg-white px-5 py-4 border border-line shadow-pass md:grid-cols-[12rem_minmax(0,1fr)_auto]',
                          category && 'ring-2 ring-signal-600/40 bg-signal-50/20'
                        )}
                      >
                        <div>
                          <p className="font-bold text-ink">{offer.airline}</p>
                          <p className="board text-sm font-semibold text-ink-soft">{offer.flightNumber}</p>
                          {category && <RoleTag category={category} className="mt-1.5" />}
                        </div>

                        <RouteDisplay flight={offer} size="sm" />

                        <div className="flex items-center justify-between gap-5 md:justify-end">
                          <div className="text-right">
                            <p className="board text-[1.85rem] leading-none font-extrabold text-ink">
                              {money(offer.pricePerPassenger, offer.currency)}
                            </p>
                            <span className="text-[11px] text-ink-faint block mt-0.5">per traveller</span>
                          </div>
                          <Button
                            size="sm"
                            variant="primary"
                            disabled={expired}
                            onClick={() => select(offer)}
                            aria-label={`Request ${offer.airline} ${offer.flightNumber}`}
                          >
                            Request
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                  {!sortedOffers.length && (
                    <li className="rounded-2xl border border-dashed border-line bg-white px-5 py-12 text-center text-ink-soft">
                      <p className="font-semibold text-ink">No flights match the current filter criteria.</p>
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="mt-3 text-sm font-bold text-signal-600 hover:underline"
                      >
                        Clear filters to see all flights
                      </button>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
