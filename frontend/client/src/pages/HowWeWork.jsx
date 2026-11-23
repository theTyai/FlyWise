import { useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Clock,
  Code2,
  Cpu,
  Database,
  ExternalLink,
  Layers,
  Lock,
  Plane,
  Server,
  ShieldCheck,
  Sparkles,
  Ticket,
  Workflow,
  Zap
} from 'lucide-react';
import { cx } from '@shared/ui/index.jsx';

const ARCHITECTURE_NODES = [
  {
    id: 'frontend',
    title: '1. Traveller Client',
    subtitle: 'Vite + React (Port 5173)',
    icon: Plane,
    color: 'signal',
    desc: 'Interactive search form with natural language input, live seat count indicators, 5-minute checkout countdown, and official boarding pass renderer.',
  },
  {
    id: 'user-backend',
    title: '2. Client Gateway API',
    subtitle: 'Node.js Express (Port 5000)',
    icon: Server,
    color: 'night',
    desc: 'Handles token rotation, request sanitization, flight provider routing, seat lock acquisition, and multi-document ACID booking transactions.',
  },
  {
    id: 'flight-provider',
    title: '3. Flight Engine',
    subtitle: 'Authentic DGCA Schedules',
    icon: Layers,
    color: 'flare',
    desc: 'Normalizes timetable schedules for IndiGo, Air India, Vistara, Akasa Air, and SpiceJet across 25 major Indian domestic airport corridors.',
  },
  {
    id: 'ai-service',
    title: '4. AI Recommendation Core',
    subtitle: 'FastAPI + Gemini (Port 8000)',
    icon: BrainCircuit,
    color: 'mint',
    desc: 'Normalizes prices and travel times, calculates multi-criteria utility weights (Fare 50%, Duration 35%, Stops 15%), and invokes Gemini to formulate human-readable rationale.',
  },
  {
    id: 'db',
    title: '5. Database & ACID Engine',
    subtitle: 'MongoDB 7+ (flywise_db)',
    icon: Database,
    color: 'signal',
    desc: 'Maintains strict consistency for SeatInventory, SeatLocks, BookingRequests, and E-Tickets using multi-document isolated transactions.',
  },
  {
    id: 'admin-hub',
    title: '6. Admin Operations Hub',
    subtitle: 'Express (5001) + React (5174)',
    icon: Cpu,
    color: 'void',
    desc: 'Live fleet oversight, seat occupancy telemetry, passenger manifest search, and real-time Socket.IO synchronization.',
  },
];

const DATA_STEPS = [
  {
    step: '01',
    title: 'Natural Language Search & Parsing',
    api: 'POST /api/v1/flights/search',
    service: 'Client Backend (:5000) → AI Service (:8000)',
    summary:
      'The traveller enters their destination and optional natural-language criteria (e.g. "morning flight under ₹6,000, non-stop"). The backend normalizes the query and forwards conversational notes to the AI microservice.',
    payload: '{ origin: "BLR", destination: "BOM", date: "2026-11-25", priority: "BALANCED", naturalLanguage: "morning departure" }',
  },
  {
    step: '02',
    title: 'Authentic Schedule Aggregation',
    api: 'Internal provider.search()',
    service: 'Client Backend (:5000) → Real Timetable Engine',
    summary:
      'The flight provider resolves real-world flight numbers, scheduled block hours, aircraft models, baggage allowances, and live seat pools from Indian carriers.',
    payload: '[ { flightNumber: "6E-2031", airline: "IndiGo", dep: "06:10", fare: 4849, seats: 14 }, ... ]',
  },
  {
    step: '03',
    title: 'Multi-Objective Mathematical Ranking',
    api: 'POST /recommend',
    service: 'Client Backend (:5000) → Python AI (:8000)',
    summary:
      'A vectorized utility function normalizes fares and durations across all candidates. Flights are scored using mathematical weights (Price 50%, Duration 35%, Stops 15%) plus departure window bonuses.',
    payload: 'Score = (0.50 * NormPrice) + (0.35 * NormTime) + (0.15 * StopsScore) + Bonus',
  },
  {
    step: '04',
    title: 'Google Gemini Semantic Explanation',
    api: 'Generative Language API',
    service: 'AI Service (:8000) → Google Gemini 1.5 Flash',
    summary:
      'Gemini evaluates the shortlist to formulate plain-English explanations highlighting trade-offs. Grounding guardrails verify that numbers in the generated text strictly match authentic flight facts.',
    payload: '{ recommendations: [ { category: "BEST_OVERALL", reason: "Strongest balance of ₹4,849 fare and 1h 35m non-stop travel." } ] }',
  },
  {
    step: '05',
    title: '5-Minute Atomic Seat Lock',
    api: 'POST /api/v1/bookings/lock',
    service: 'Client Backend (:5000) → MongoDB Transaction',
    summary:
      'When the traveller starts checkout, an atomic conditional decrement locks the seat for exactly 300 seconds. If checkout is cancelled or times out, the lock expires and seats automatically return to inventory.',
    payload: '{ lockKey: "LOCK-4B9F2A", seats: 1, expiresAt: "2026-11-23T12:05:00Z" }',
  },
  {
    step: '06',
    title: 'Payment Confirmation & E-Ticket Generation',
    api: 'POST /api/v1/bookings/confirm-payment',
    service: 'Client Backend (:5000) → Ticket & Socket Engine',
    summary:
      'Upon simulated payment ("Pass & Done"), the lock is permanently committed. An official PNR and seat numbers (e.g., 14A) are generated, stored in Ticket collection, and broadcast in real time to the traveller and admin desk.',
    payload: '{ status: "CONFIRMED", bookingReference: "FWB-2026-00481", pnr: "7KQ9XM", ticketNumber: "FWT-2026-18921" }',
  },
];

const API_ENDPOINTS = [
  { method: 'POST', path: '/api/v1/flights/search', desc: 'Aggregates flight schedules and invokes AI recommendation', service: 'User Backend :5000' },
  { method: 'GET', path: '/api/v1/flights/offers/:id', desc: 'Retrieves live offer snapshot with remaining seat counts', service: 'User Backend :5000' },
  { method: 'POST', path: '/api/v1/bookings/lock', desc: 'Acquires 5-minute atomic seat lock during checkout', service: 'User Backend :5000' },
  { method: 'POST', path: '/api/v1/bookings/confirm-payment', desc: 'Commits seat lock, confirms booking, and issues E-Ticket', service: 'User Backend :5000' },
  { method: 'GET', path: '/api/v1/bookings/:id/ticket', desc: 'Fetches official electronic boarding pass and QR data', service: 'User Backend :5000' },
  { method: 'POST', path: '/recommend', desc: 'Mathematical ranking & Gemini explanation synthesis', service: 'AI Service :8000' },
  { method: 'GET', path: '/api/v1/admin/dashboard', desc: 'Live fleet telemetry, confirmed revenue, and seat occupancy', service: 'Admin Backend :5001' },
];

export default function HowWeWork() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <div className="pb-24">
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-night-900 py-16 text-white sm:py-24">
        <div className="relative mx-auto max-w-6xl px-5 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold backdrop-blur-md">
            <Workflow className="size-3.5 text-signal-200" />
            <span>Architecture & Data Traveling Blueprint</span>
          </div>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-6xl">
            How FlyWise AI <span className="bg-gradient-to-r from-signal-200 via-mint-600 to-signal-500 bg-clip-text text-transparent">Works</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-white/75 sm:text-lg leading-relaxed">
            A comprehensive look at our multi-service distributed architecture, real-time data flow,
            mathematical ranking models, Gemini AI integration, and ACID seat guarantees.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 border border-white/10">
              <Zap className="size-3.5 text-signal-200" /> Zero Paid API Gateways
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 border border-white/10">
              <ShieldCheck className="size-3.5 text-mint-700" /> ACID Guaranteed Seats
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 border border-white/10">
              <Sparkles className="size-3.5 text-signal-200" /> Google Gemini Powered
            </span>
          </div>
        </div>
      </section>

      {/* Architecture Flowchart Section */}
      <section className="mx-auto -mt-10 max-w-6xl px-5">
        <div className="rounded-3xl border border-line bg-white p-6 sm:p-10 shadow-pass">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              System Architecture & Service Mesh
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              Six autonomous components collaborating over HTTP REST, WebSocket broadcasts, and internal microservice channels.
            </p>
          </div>

          {/* Grid of Microservice Nodes */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ARCHITECTURE_NODES.map((node) => {
              const Icon = node.icon;
              return (
                <div
                  key={node.id}
                  className="rounded-2xl border border-line bg-mist/40 p-6 transition-all hover:bg-white hover:shadow-lift hover:-translate-y-1"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-night-900 text-white shadow-sm">
                      <Icon className="size-5 text-signal-200" />
                    </span>
                    <div>
                      <h3 className="font-bold text-ink text-base">{node.title}</h3>
                      <p className="text-xs font-mono font-semibold text-signal-600">{node.subtitle}</p>
                    </div>
                  </div>
                  <p className="text-xs text-ink-soft leading-relaxed">{node.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Visual Data Flow Routing Map */}
          <div className="mt-12 rounded-2xl bg-night-950 p-6 sm:p-8 text-white border border-white/10">
            <h3 className="text-sm font-bold uppercase tracking-wider text-signal-200 mb-6 flex items-center gap-2">
              <Workflow className="size-4" /> Live Data Traveling Flowchart
            </h3>

            <div className="flex flex-col lg:flex-row items-center justify-between gap-4 text-xs font-semibold">
              <div className="flex-1 rounded-xl bg-white/10 p-4 border border-white/10 text-center w-full">
                <p className="text-signal-200 font-bold mb-1">1. Traveller Browser</p>
                <p className="text-white/70 text-[11px]">User Query & NLP note</p>
              </div>

              <ArrowRight className="size-5 text-signal-200 hidden lg:block shrink-0" />
              <ArrowDown className="size-5 text-signal-200 lg:hidden shrink-0" />

              <div className="flex-1 rounded-xl bg-signal-600/30 p-4 border border-signal-500/40 text-center w-full">
                <p className="text-white font-bold mb-1">2. Express Gateway</p>
                <p className="text-white/70 text-[11px]">Port 5000 (Auth & Routing)</p>
              </div>

              <ArrowRight className="size-5 text-signal-200 hidden lg:block shrink-0" />
              <ArrowDown className="size-5 text-signal-200 lg:hidden shrink-0" />

              <div className="flex-1 rounded-xl bg-mint-500/20 p-4 border border-mint-500/40 text-center w-full">
                <p className="text-mint-700 font-bold mb-1">3. AI + Gemini</p>
                <p className="text-white/70 text-[11px]">FastAPI (Math + LLM)</p>
              </div>

              <ArrowRight className="size-5 text-signal-200 hidden lg:block shrink-0" />
              <ArrowDown className="size-5 text-signal-200 lg:hidden shrink-0" />

              <div className="flex-1 rounded-xl bg-flare-500/20 p-4 border border-flare-500/40 text-center w-full">
                <p className="text-flare-700 font-bold mb-1">4. MongoDB ACID</p>
                <p className="text-white/70 text-[11px]">Seat Lock & Decrement</p>
              </div>

              <ArrowRight className="size-5 text-signal-200 hidden lg:block shrink-0" />
              <ArrowDown className="size-5 text-signal-200 lg:hidden shrink-0" />

              <div className="flex-1 rounded-xl bg-white/10 p-4 border border-white/10 text-center w-full">
                <p className="text-signal-200 font-bold mb-1">5. Confirmed E-Ticket</p>
                <p className="text-white/70 text-[11px]">PNR & Boarding Pass</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Step-by-Step Data Journey */}
      <section className="mx-auto mt-20 max-w-6xl px-5">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-signal-600 block">
              Step-by-Step Breakdown
            </span>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              The Journey of a Flight Booking
            </h2>
          </div>
          <p className="text-xs text-ink-soft max-w-sm">
            Click any step to inspect the exact request payload and microservice interaction.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Step Selector List */}
          <div className="space-y-3 lg:col-span-1">
            {DATA_STEPS.map((s, idx) => (
              <button
                key={s.step}
                type="button"
                onClick={() => setActiveStep(idx)}
                className={cx(
                  'w-full text-left p-4 rounded-2xl border transition-all',
                  activeStep === idx
                    ? 'border-signal-600 bg-white shadow-lift ring-2 ring-signal-100'
                    : 'border-line bg-white/60 hover:bg-white'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="board text-xl font-bold text-signal-600">{s.step}</span>
                  <span className="text-[11px] font-mono text-ink-faint truncate max-w-[150px]">{s.api}</span>
                </div>
                <h3 className="font-bold text-ink text-sm mt-1">{s.title}</h3>
              </button>
            ))}
          </div>

          {/* Active Step Deep Dive Card */}
          <div className="rounded-3xl border border-line bg-white p-6 sm:p-8 shadow-pass lg:col-span-2">
            <div className="flex items-center justify-between border-b border-line pb-4 mb-6">
              <div>
                <span className="board text-3xl font-black text-signal-600 block">
                  Step {DATA_STEPS[activeStep].step}
                </span>
                <h3 className="text-xl font-bold text-ink mt-0.5">{DATA_STEPS[activeStep].title}</h3>
              </div>
              <span className="rounded-xl bg-signal-50 px-3 py-1 font-mono text-xs font-bold text-signal-700 border border-signal-100">
                {DATA_STEPS[activeStep].api}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink-faint">Responsible Services</h4>
                <p className="text-sm font-semibold text-ink mt-0.5">{DATA_STEPS[activeStep].service}</p>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink-faint">What Happens</h4>
                <p className="text-sm text-ink-soft leading-relaxed mt-0.5">{DATA_STEPS[activeStep].summary}</p>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink-faint">Data Contract / Schema</h4>
                <pre className="mt-1 overflow-x-auto rounded-xl bg-night-950 p-4 font-mono text-xs text-signal-200 border border-white/10 leading-relaxed">
                  {DATA_STEPS[activeStep].payload}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* API Reference Table */}
      <section className="mx-auto mt-20 max-w-6xl px-5">
        <div className="rounded-3xl border border-line bg-white p-6 sm:p-8 shadow-pass">
          <h2 className="text-xl font-bold tracking-tight text-ink sm:text-2xl mb-2">
            Key Application REST APIs
          </h2>
          <p className="text-xs text-ink-soft mb-6">
            The core endpoints powering live flight searches, 5-minute checkout holds, and instant ticket confirmations.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line bg-mist/50">
                  <th className="px-4 py-3 font-bold text-ink-faint uppercase">Method</th>
                  <th className="px-4 py-3 font-bold text-ink-faint uppercase">Endpoint</th>
                  <th className="px-4 py-3 font-bold text-ink-faint uppercase">Description</th>
                  <th className="px-4 py-3 font-bold text-ink-faint uppercase">Service</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {API_ENDPOINTS.map((e, idx) => (
                  <tr key={idx} className="hover:bg-mist/30">
                    <td className="px-4 py-3">
                      <span
                        className={cx(
                          'rounded px-2 py-0.5 font-mono font-bold text-[10px]',
                          e.method === 'POST' ? 'bg-signal-50 text-signal-700 border border-signal-200' : 'bg-mint-50 text-mint-700 border border-mint-200'
                        )}
                      >
                        {e.method}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-ink">{e.path}</td>
                    <td className="px-4 py-3 text-ink-soft">{e.desc}</td>
                    <td className="px-4 py-3 font-medium text-ink-faint">{e.service}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
