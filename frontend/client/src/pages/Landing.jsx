import { useCallback, useState } from 'react';
import { ArrowRight, CheckCircle2, Compass, MapPin, Plane, ShieldCheck, Sparkles, XCircle, Zap } from 'lucide-react';
import { AIRPORT_BY_CODE } from '@shared/constants.js';
import SearchTicket, { defaultSearch } from '../components/SearchTicket.jsx';

const POPULAR_DESTINATIONS = [
  { city: 'Mumbai', code: 'BOM', state: 'Maharashtra', desc: 'Financial capital & coastal gateway', tag: 'High Frequency', from: 'DEL', fare: '₹5,499' },
  { city: 'Delhi', code: 'DEL', state: 'NCR', desc: 'National capital & heritage hub', tag: 'Most Popular', from: 'BHO', fare: '₹4,250' },
  { city: 'Bengaluru', code: 'BLR', state: 'Karnataka', desc: 'Silicon Valley of India', tag: 'Tech Corridor', from: 'DEL', fare: '₹6,499' },
  { city: 'Goa', code: 'GOI', state: 'Goa', desc: 'Sun, sand & coastal leisure', tag: 'Holiday Pick', from: 'BOM', fare: '₹3,750' },
  { city: 'Jaipur', code: 'JAI', state: 'Rajasthan', desc: 'Historic palaces & culture', tag: 'Heritage', from: 'DEL', fare: '₹3,199' },
  { city: 'Hyderabad', code: 'HYD', state: 'Telangana', desc: 'City of Pearls & modern IT', tag: 'Fast Connect', from: 'BLR', fare: '₹3,890' },
];

const STEPS = [
  {
    num: '01',
    title: 'Live Flight Search',
    body: 'Enter your origin, destination, and travel dates. You can also specify natural language preferences like "morning flight, non-stop, under ₹6,000".',
  },
  {
    num: '02',
    title: 'AI Multi-Score Ranking',
    body: 'The engine queries real airline timetables and computes mathematical scores (Fare 50%, Duration 35%, Stops 15%) to pick the top 3 options with written rationale.',
  },
  {
    num: '03',
    title: 'Request a Seat',
    body: 'Compare Best Overall, Cheapest, and Fastest options side-by-side. Select your flight and submit a booking request. No payment is charged.',
  },
  {
    num: '04',
    title: 'Desk Decision & Live Sync',
    body: 'An administrator reviews real-time seat inventory and approves, rejects, or revokes requests. Status changes reflect in your browser in real time via WebSockets.',
  },
];

function FlightArc({ origin, destination }) {
  return (
    <svg viewBox="0 0 660 290" className="pointer-events-none absolute top-6 right-0 hidden w-[44rem] max-w-[58%] lg:block" aria-hidden="true">
      <path d="M 20 250 Q 330 -70 640 170" fill="none" stroke="rgb(255 255 255 / 0.25)" strokeWidth="2" strokeLinecap="round" className="flight-arc" />
      <circle cx="20" cy="250" r="6" fill="#0B1730" stroke="#1769E0" strokeWidth="3" />
      <circle cx="640" cy="170" r="6" fill="#0B1730" stroke="#19B88A" strokeWidth="3" />
      <text x="36" y="272" className="board" fontSize="26" fontWeight="700" fill="rgb(255 255 255 / 0.95)">{origin}</text>
      <text x="624" y="150" textAnchor="end" className="board" fontSize="26" fontWeight="700" fill="rgb(255 255 255 / 0.95)">{destination}</text>
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
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-night-900 text-white">
        <FlightArc origin={route.origin} destination={route.destination} />
        <div className="relative mx-auto max-w-6xl px-5 pt-12 pb-44 sm:pt-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="size-3.5 text-signal-200" />
            <span className="text-white/90">Intelligent Flight Discovery & Booking Platform</span>
          </div>

          <h1 className="mt-6 max-w-2xl text-[2.75rem] leading-[1.08] font-bold tracking-tight sm:text-6xl">
            Your next journey, <span className="bg-gradient-to-r from-white via-signal-100 to-signal-200 bg-clip-text text-transparent">intelligently planned.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/75 font-normal">
            FlyWise AI retrieves authentic Indian airline schedules, applies multi-criteria mathematical ranking,
            and delivers the top three choices—with plain-English reasons for every recommendation.
          </p>
        </div>
      </section>

      {/* Main Search Panel Card */}
      <div className="relative mx-auto -mt-32 max-w-6xl px-5">
        <SearchTicket
          key={preset ? preset.join('-') : 'default'}
          onRouteChange={onRouteChange}
          initial={preset ? { ...defaultSearch(), origin: preset[0], destination: preset[1] } : undefined}
        />
      </div>

      {/* Popular Destinations Grid */}
      <section className="mx-auto mt-20 max-w-6xl px-5" aria-labelledby="destinations-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-signal-600">
              <Compass className="size-4" /> Top Domestic Corridors
            </div>
            <h2 id="destinations-heading" className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-ink">
              Popular Destinations
            </h2>
          </div>
          <p className="text-sm text-ink-soft">Click any destination card to instantly prefill your search route.</p>
        </div>

        <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {POPULAR_DESTINATIONS.map((dest) => (
            <button
              key={dest.code}
              type="button"
              onClick={() => {
                setPreset([dest.from, dest.code]);
                window.scrollTo({ top: 180, behavior: 'smooth' });
              }}
              className="card-lift group relative overflow-hidden rounded-2xl border border-line bg-white p-5 text-left shadow-pass"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="rounded-md bg-signal-50 px-2 py-0.5 text-xs font-semibold text-signal-700">
                    {dest.tag}
                  </span>
                  <h3 className="mt-2 text-xl font-bold text-ink group-hover:text-signal-600 transition-colors">
                    {dest.city}
                  </h3>
                  <p className="text-xs text-ink-faint">{dest.state}</p>
                </div>
                <span className="board text-3xl font-bold text-night-900/80 group-hover:text-signal-600 transition-colors">
                  {dest.code}
                </span>
              </div>

              <p className="mt-3 text-sm text-ink-soft line-clamp-1">{dest.desc}</p>

              <div className="mt-4 flex items-center justify-between border-t border-line/70 pt-3">
                <span className="text-xs text-ink-faint">
                  From {dest.from}: <strong className="board text-sm font-semibold text-ink">{dest.fare}</strong>
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-signal-600 group-hover:translate-x-1 transition-transform">
                  Search <ArrowRight className="size-3.5" />
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* How a Booking Works */}
      <section id="how-it-works" className="mx-auto mt-24 max-w-6xl px-5" aria-labelledby="how-heading">
        <div className="rounded-3xl bg-white border border-line p-8 sm:p-12 shadow-pass">
          <div className="text-center max-w-xl mx-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-signal-50 px-3 py-1 text-xs font-bold text-signal-700">
              <Zap className="size-3.5" /> The FlyWise AI Workflow
            </span>
            <h2 id="how-heading" className="mt-2 text-3xl font-bold tracking-tight text-ink">
              How It Works
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              The AI ranks and explains. Operational rules and administrators decide.
            </p>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step) => (
              <div key={step.num} className="relative rounded-2xl bg-mist p-6 border border-line/60">
                <span className="board text-3xl font-extrabold text-signal-600/40">
                  {step.num}
                </span>
                <h3 className="mt-2 text-lg font-bold text-ink">{step.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-ink-soft">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Honest AI Boundary Section */}
      <section className="mx-auto mt-20 max-w-6xl px-5" aria-labelledby="honest-heading">
        <div className="grid gap-8 rounded-3xl bg-white border border-line p-7 shadow-pass sm:p-10 md:grid-cols-3">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-signal-50 px-3 py-1 text-xs font-bold text-signal-700">
              <ShieldCheck className="size-3.5" /> Engineering Transparency
            </div>
            <h2 id="honest-heading" className="mt-3 text-2xl font-bold tracking-tight text-ink">
              What the AI does, and what it never does
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              FlyWise AI treats the LLM as an explanatory intelligence layer—never an authoritative financial actor.
            </p>
          </div>

          <div className="rounded-2xl bg-mint-50/60 p-5 border border-mint-600/20">
            <h3 className="flex items-center gap-2 font-bold text-mint-700">
              <CheckCircle2 className="size-4" /> What It Does
            </h3>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-ink">
              <li>• Extracts conversational preferences from natural English sentences.</li>
              <li>• Ranks flights across multi-criteria weights (Price 50%, Duration 35%, Stops 15%).</li>
              <li>• Formulates plain-English justifications highlighting trade-offs.</li>
              <li>• Automatically deduplicates candidates if cheapest and fastest coincide.</li>
            </ul>
          </div>

          <div className="rounded-2xl bg-stop-50/60 p-5 border border-stop-600/20">
            <h3 className="flex items-center gap-2 font-bold text-stop-700">
              <XCircle className="size-4" /> What It Never Does
            </h3>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-ink">
              <li>• Never invents flight itineraries, schedules, or airline names.</li>
              <li>• Never modifies prices—fares come strictly from the flight engine.</li>
              <li>• Never claims live airline availability without desk verification.</li>
              <li>• Never allocates seats or approves bookings—administrators do.</li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
