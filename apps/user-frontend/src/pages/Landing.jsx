import { useCallback, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { AIRPORT_BY_CODE } from '@shared/constants.js';
import SearchTicket, { defaultSearch } from '../components/SearchTicket.jsx';

const POPULAR = [
  ['BHO', 'DEL'], ['DEL', 'BOM'], ['BLR', 'HYD'], ['BOM', 'GOI'], ['DEL', 'BLR'], ['CCU', 'MAA'],
];

// A real sequence, so it is numbered.
const STEPS = [
  { title: 'Search a route', body: 'Pick two airports and a date. Add a sentence about what matters if you like: "morning, under ₹6,000, non-stop".' },
  { title: 'See three picks', body: 'A scoring formula finds the cheapest and the fastest flight. The AI weighs your preferences for the best all-round one and writes down why.' },
  { title: 'Request a seat', body: 'Choose a flight, enter traveller details and send a booking request. Nothing is charged.' },
  { title: 'The desk decides', body: 'An administrator checks seat inventory and confirms or rejects. You see the decision here the moment it is made.' },
];

function FlightArc({ origin, destination }) {
  return (
    <svg viewBox="0 0 660 290" className="pointer-events-none absolute top-6 right-0 hidden w-[44rem] max-w-[58%] lg:block" aria-hidden="true">
      <path d="M 20 250 Q 330 -70 640 170" fill="none" stroke="rgb(255 255 255 / 0.32)" strokeWidth="2" strokeLinecap="round" className="flight-arc" />
      <circle cx="20" cy="250" r="6" fill="#0a1f44" stroke="#fff" strokeWidth="2.5" />
      <circle cx="640" cy="170" r="6" fill="#0a1f44" stroke="#fff" strokeWidth="2.5" />
      <text x="36" y="272" className="board" fontSize="26" fontWeight="600" fill="rgb(255 255 255 / 0.9)">{origin}</text>
      <text x="624" y="150" textAnchor="end" className="board" fontSize="26" fontWeight="600" fill="rgb(255 255 255 / 0.9)">{destination}</text>
      <g className="flight-plane" fill="#fff">
        <path d="M14 0 L-10 -2.6 L-10 2.6 Z" />
        <path d="M3 0 L-6 -11 L-9.5 -11 L-4.5 0 L-9.5 11 L-6 11 Z" />
        <path d="M-8 0 L-12 -4.5 L-14 -4.5 L-11.5 0 L-14 4.5 L-12 4.5 Z" />
      </g>
    </svg>
  );
}

export default function Landing() {
  const [route, setRoute] = useState({ origin: 'BHO', destination: 'DEL' });
  const [preset, setPreset] = useState(null);
  const onRouteChange = useCallback((origin, destination) => setRoute({ origin, destination }), []);

  return (
    <>
      <section className="relative overflow-hidden bg-night-900 text-white">
        <FlightArc origin={route.origin} destination={route.destination} />
        <div className="relative mx-auto max-w-6xl px-5 pt-10 pb-44 sm:pt-16">
          <h1 className="max-w-xl text-[2.6rem] leading-[1.04] font-bold tracking-tight sm:text-6xl">
            Every fare on your route, narrowed to three.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/75">
            FlyWise compares each flight it finds and shows you the cheapest, the fastest and the best all-round,
            with the reason for every pick.
          </p>
        </div>
      </section>

      <div className="relative mx-auto -mt-32 max-w-6xl px-5">
        <SearchTicket key={preset ? preset.join('-') : 'default'} onRouteChange={onRouteChange}
          initial={preset ? { ...defaultSearch(), origin: preset[0], destination: preset[1] } : undefined} />
      </div>

      <div className="mx-auto mt-16 grid max-w-6xl gap-x-16 gap-y-14 px-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <section aria-labelledby="popular-heading">
          <h2 id="popular-heading" className="text-2xl font-bold tracking-tight">Popular routes</h2>
          <p className="mt-1 text-ink-soft">Choose one to fill in the search above.</p>
          <ul className="mt-5 divide-y divide-line border-y border-line">
            {POPULAR.map(([from, to]) => (
              <li key={`${from}-${to}`}>
                <button
                  type="button"
                  onClick={() => { setPreset([from, to]); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="group flex w-full items-center gap-4 py-3.5 text-left"
                >
                  <span className="board flex w-36 items-center gap-2 text-2xl font-semibold text-night-800">
                    {from} <ArrowRight className="size-4 text-ink-faint" aria-hidden="true" /> {to}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[15px] text-ink-soft">
                    {AIRPORT_BY_CODE[from].city} to {AIRPORT_BY_CODE[to].city}
                  </span>
                  <span className="text-sm font-semibold text-signal-600 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">Use route</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="how-heading">
          <h2 id="how-heading" className="text-2xl font-bold tracking-tight">How a booking works</h2>
          <p className="mt-1 text-ink-soft">The AI recommends. People and rules decide.</p>
          <ol className="mt-5 space-y-5">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span className="board grid size-9 shrink-0 place-items-center rounded-full bg-night-900 text-lg font-semibold text-white">{index + 1}</span>
                <div>
                  <h3 className="text-[17px] font-semibold">{step.title}</h3>
                  <p className="mt-0.5 max-w-prose text-[15px] leading-relaxed text-ink-soft">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className="mx-auto mt-16 max-w-6xl px-5" aria-labelledby="honest-heading">
        <div className="grid gap-8 rounded-3xl bg-white p-7 shadow-pass sm:p-10 md:grid-cols-3">
          <div>
            <h2 id="honest-heading" className="text-2xl font-bold tracking-tight">What the AI does, and what it never does</h2>
          </div>
          <div>
            <h3 className="font-semibold text-mint-700">It does</h3>
            <ul className="mt-2 space-y-2 text-[15px] leading-relaxed text-ink-soft">
              <li>Read your preferences, including ones you type as a sentence.</li>
              <li>Choose the best all-round flight from a scored shortlist.</li>
              <li>Explain each pick in plain language.</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-stop-700">It never does</h3>
            <ul className="mt-2 space-y-2 text-[15px] leading-relaxed text-ink-soft">
              <li>Set or change a fare. Prices come from the flight data source.</li>
              <li>Decide which flight is cheapest or fastest. Arithmetic does.</li>
              <li>Approve a booking or allocate a seat. The desk does.</li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
