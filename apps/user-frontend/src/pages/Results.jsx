import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, PlaneTakeoff } from 'lucide-react';
import { CABIN_LABEL, CATEGORY_META } from '@shared/constants.js';
import { dayFromIso, duration, money, stopsText, time } from '@shared/ui/format.js';
import { Button, EmptyState, Notice, PageLoading, cx } from '@shared/ui/index.jsx';
import FlightPass, { ROLE, RoleTag, RouteDisplay } from '../components/FlightPass.jsx';
import SearchTicket from '../components/SearchTicket.jsx';
import { getSearch, searchFlights } from '../services/flight.service.js';

const ENGINE_TEXT = {
  LLM: 'The cheapest and fastest flights were found by arithmetic. FlyWise AI chose the best all-round flight and wrote the explanations.',
  DETERMINISTIC: 'These picks come from the scoring formula: fare 50%, journey time 35%, stops 15%. Explanations are generated from the numbers.',
  LOCAL_FALLBACK: 'The AI service is offline, so the built-in scoring formula ranked these flights.',
};

function CompareTable({ picks }) {
  const rows = [
    { label: 'Fare per traveller', value: (o) => money(o.pricePerPassenger, o.currency), metric: (o) => o.pricePerPassenger, tag: 'Lowest' },
    { label: 'Journey time', value: (o) => duration(o.durationMinutes), metric: (o) => o.durationMinutes, tag: 'Shortest' },
    { label: 'Stops', value: (o) => stopsText(o.stops), metric: (o) => o.stops, tag: 'Fewest' },
    { label: 'Departs', value: (o) => time(o.departureTime) },
    { label: 'Arrives', value: (o) => time(o.arrivalTime) },
    { label: 'Checked bag', value: (o) => o.baggage.checked },
  ];
  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-pass">
      <table className="w-full min-w-[34rem] text-left text-[15px]">
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className="px-5 py-4 font-medium text-ink-faint">Compare</th>
            {picks.map(({ offer, category }) => (
              <th key={offer.id} scope="col" className="px-5 py-4">
                <RoleTag category={category} />
                <span className="mt-1 block font-semibold">{offer.airline}</span>
                <span className="board block font-medium text-ink-soft">{offer.flightNumber}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const best = row.metric ? Math.min(...picks.map(({ offer }) => row.metric(offer))) : null;
            const allSame = row.metric ? picks.every(({ offer }) => row.metric(offer) === best) : true;
            return (
              <tr key={row.label} className="border-b border-line last:border-0">
                <th scope="row" className="px-5 py-3 font-medium text-ink-soft">{row.label}</th>
                {picks.map(({ offer }) => {
                  const wins = row.metric && !allSame && row.metric(offer) === best;
                  return (
                    <td key={offer.id} className={cx('px-5 py-3', wins ? 'font-semibold text-ink' : 'text-ink-soft')}>
                      <span className="board text-lg">{row.value(offer)}</span>
                      {wins && <span className="ml-2 rounded-full bg-mint-50 px-2 py-0.5 text-xs font-semibold text-mint-700">{row.tag}</span>}
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
  const [sort, setSort] = useState('departure');
  const [nonStop, setNonStop] = useState(false);
  const [again, setAgain] = useState(false);

  useEffect(() => {
    let live = true;
    setData(null); setError(null); setEditing(false);
    getSearch(searchId)
      .then((result) => { if (live) setData(result); })
      .catch((failure) => { if (live) setError(failure.message); });
    return () => { live = false; };
  }, [searchId]);

  const offersById = useMemo(() => Object.fromEntries((data?.offers || []).map((o) => [o.id, o])), [data]);
  const picks = useMemo(() => (data?.recommendations || [])
    .map((r) => ({ ...r, offer: offersById[r.offerId] })).filter((r) => r.offer), [data, offersById]);
  const roleByOffer = useMemo(() => Object.fromEntries(picks.map((p) => [p.offerId, p.category])), [picks]);
  const listed = useMemo(() => {
    const list = (data?.offers || []).filter((o) => !nonStop || o.stops === 0);
    const by = { departure: (o) => new Date(o.departureTime).getTime(), fare: (o) => o.pricePerPassenger, time: (o) => o.durationMinutes }[sort];
    return [...list].sort((a, b) => by(a) - by(b));
  }, [data, sort, nonStop]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <EmptyState icon={PlaneTakeoff} title="We could not open this search" action={<Button onClick={() => navigate('/')}>Start a new search</Button>}>{error}</EmptyState>
      </div>
    );
  }
  if (!data) return <PageLoading label="Loading flights" />;

  const { search, offers } = data;
  const expired = offers.length > 0 && offers.every((o) => new Date(o.expiresAt).getTime() <= Date.now());
  const heldUntil = offers.length ? time(offers[0].expiresAt) : '';
  const initial = {
    origin: search.origin, destination: search.destination, departureDate: search.departureDate, passengers: search.passengers,
    cabinClass: search.cabinClass, priority: search.preferences.priority || 'BALANCED', nonStopOnly: Boolean(search.preferences.nonStopOnly),
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

  return (
    <>
      <div className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-5">
          <div>
            <h1 className="board flex items-center gap-3 text-[2.5rem] leading-none font-semibold">
              {search.origin} <ArrowRight className="size-6 text-ink-faint" aria-label="to" /> {search.destination}
            </h1>
            <p className="mt-1.5 text-ink-soft">
              {dayFromIso(search.departureDate)}, {search.passengers} traveller{search.passengers > 1 ? 's' : ''}, {CABIN_LABEL[search.cabinClass]}
            </p>
          </div>
          <Button variant="outline" onClick={() => setEditing((value) => !value)} aria-expanded={editing}>
            {editing ? 'Close' : 'Change search'}
          </Button>
        </div>
        {editing && (
          <div className="mx-auto max-w-6xl px-5 pb-6"><SearchTicket initial={initial} notch="#ffffff" /></div>
        )}
      </div>

      <div className="mx-auto max-w-6xl space-y-4 px-5 pt-6">
        {search.providerMode === 'MOCK' ? (
          <Notice tone="warn" title="Sample fares">
            These flights and prices are generated for demonstration. They are not live airline data.
          </Notice>
        ) : (
          <Notice tone="info" title="Live offers">
            Fares come from {search.provider} and can change until your request is reviewed.
          </Notice>
        )}
        {expired && (
          <Notice tone="error" title="These fares have expired" action={<Button size="sm" variant="navy" loading={again} onClick={searchAgain}>Search again</Button>}>
            Fares are held for 30 minutes. Search again to see current ones.
          </Notice>
        )}
      </div>

      {offers.length === 0 ? (
        <div className="mx-auto max-w-3xl px-5 py-12">
          <EmptyState icon={PlaneTakeoff} title="No flights found for this route and date" action={<Button onClick={() => setEditing(true)}>Change search</Button>}>
            Try a different date or a nearby airport.
          </EmptyState>
        </div>
      ) : (
        <div className="mx-auto max-w-6xl px-5">
          <section aria-labelledby="picks-heading" className="mt-10">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="picks-heading" className="text-2xl font-bold tracking-tight">
                  {picks.length === 3 ? 'Three picks' : picks.length === 1 ? 'One pick' : `${picks.length} picks`} from {offers.length} flights
                </h2>
                <p className="mt-1 max-w-2xl text-[15px] text-ink-soft">{ENGINE_TEXT[search.engine] || ''}</p>
              </div>
              {!expired && heldUntil && <p className="text-sm text-ink-faint">Fares held until <span className="board text-base font-semibold text-ink-soft">{heldUntil}</span></p>}
            </div>
            {search.engineNotes.length > 0 && (
              <ul className="mt-3 space-y-1 text-[15px] text-ink-soft">
                {search.engineNotes.map((note) => <li key={note} className="flex gap-2"><span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full bg-signal-500" />{note}</li>)}
              </ul>
            )}
            <div className="mt-8 space-y-8">
              {picks.map(({ offer, category, reason }) => (
                <FlightPass
                  key={offer.id} offer={offer} category={category} reason={reason}
                  action={(
                    <Button variant={category === 'BEST_OVERALL' ? 'primary' : 'navy'} disabled={expired} onClick={() => select(offer)}>
                      Request this flight
                    </Button>
                  )}
                />
              ))}
            </div>
          </section>

          {picks.length > 1 && (
            <section aria-labelledby="compare-heading" className="mt-14">
              <h2 id="compare-heading" className="mb-4 text-2xl font-bold tracking-tight">Side by side</h2>
              <CompareTable picks={picks} />
            </section>
          )}

          <section aria-labelledby="all-heading" className="mt-14">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 id="all-heading" className="text-2xl font-bold tracking-tight">All {offers.length} flights</h2>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <label className="flex items-center gap-2 font-medium text-ink-soft">
                  <input type="checkbox" className="size-4 accent-signal-600" checked={nonStop} onChange={(event) => setNonStop(event.target.checked)} />
                  Non-stop only
                </label>
                <label className="flex items-center gap-2 font-medium text-ink-soft">
                  Sort by
                  <select className="field w-auto py-1.5" value={sort} onChange={(event) => setSort(event.target.value)}>
                    <option value="departure">Departure time</option>
                    <option value="fare">Fare</option>
                    <option value="time">Journey time</option>
                  </select>
                </label>
              </div>
            </div>
            <ul className="mt-4 space-y-3">
              {listed.map((offer) => {
                const category = roleByOffer[offer.id];
                return (
                  <li key={offer.id} className={cx('grid items-center gap-x-6 gap-y-4 rounded-2xl bg-white px-5 py-4 shadow-pass md:grid-cols-[11rem_minmax(0,1fr)_auto]',
                    category && 'ring-1', category && ROLE[category].ring)}
                  >
                    <div>
                      <p className="font-semibold">{offer.airline}</p>
                      <p className="board text-base text-ink-soft">{offer.flightNumber}</p>
                      {category && <RoleTag category={category} className="mt-1.5" />}
                    </div>
                    <RouteDisplay flight={offer} size="sm" />
                    <div className="flex items-center justify-between gap-5 md:justify-end">
                      <p className="board text-[1.75rem] leading-none font-semibold">{money(offer.pricePerPassenger, offer.currency)}</p>
                      <Button size="sm" variant="outline" disabled={expired} onClick={() => select(offer)}
                        aria-label={`Request ${offer.airline} ${offer.flightNumber}${category ? `, ${CATEGORY_META[category].label}` : ''}`}>
                        Request
                      </Button>
                    </div>
                  </li>
                );
              })}
              {!listed.length && <li className="rounded-2xl border border-dashed border-line bg-white px-5 py-8 text-center text-ink-soft">No non-stop flights on this route. Clear the filter to see flights with a stop.</li>}
            </ul>
          </section>
        </div>
      )}
    </>
  );
}
