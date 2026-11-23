import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  CheckCircle2,
  Clock,
  Compass,
  FileCheck,
  Layers,
  MapPin,
  Plane,
  QrCode,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingDown,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';
import { AIRPORTS, AIRPORT_BY_CODE } from '@shared/constants.js';
import SearchTicket, { defaultSearch } from '../components/SearchTicket.jsx';

// Sample live departures for the terminal marquee ticker
const LIVE_DEPARTURES = [
  { flight: '6E 204', airline: 'IndiGo', from: 'DEL', to: 'BOM', time: '06:15', status: 'ON TIME', fare: '₹4,890', gate: '21A' },
  { flight: 'UK 945', airline: 'Vistara', from: 'BLR', to: 'DEL', time: '07:30', status: 'BOARDING', fare: '₹6,150', gate: '04' },
  { flight: 'QP 1302', airline: 'Akasa Air', from: 'BOM', to: 'GOI', time: '08:45', status: 'ON TIME', fare: '₹3,450', gate: '12B' },
  { flight: 'AI 805', airline: 'Air India', from: 'DEL', to: 'HYD', time: '09:20', status: 'GATE OPEN', fare: '₹5,200', gate: '16' },
  { flight: '6E 5318', airline: 'IndiGo', from: 'BHO', to: 'DEL', time: '10:05', status: 'ON TIME', fare: '₹4,250', gate: '02' },
  { flight: 'UK 812', airline: 'Vistara', from: 'BOM', to: 'BLR', time: '11:15', status: 'CHECK-IN', fare: '₹5,800', gate: '08' },
  { flight: 'QP 1144', airline: 'Akasa Air', from: 'DEL', to: 'AMD', time: '12:40', status: 'ON TIME', fare: '₹3,890', gate: '18A' },
  { flight: 'AI 665', airline: 'Air India', from: 'MAA', to: 'BOM', time: '13:10', status: 'ON TIME', fare: '₹4,990', gate: '07' },
];

const POPULAR_DESTINATIONS = [
  { city: 'Mumbai', code: 'BOM', state: 'Maharashtra', desc: 'Financial capital & coastal gateway', category: 'metro', tag: 'High Frequency', from: 'DEL', fare: '₹4,890', duration: '2h 10m', flightsCount: '34 daily' },
  { city: 'Delhi', code: 'DEL', state: 'NCR', desc: 'National capital & heritage nexus', category: 'metro', tag: 'Most Popular', from: 'BHO', fare: '₹4,250', duration: '1h 35m', flightsCount: '48 daily' },
  { city: 'Bengaluru', code: 'BLR', state: 'Karnataka', desc: 'Silicon Valley of India', category: 'metro', tag: 'Tech Hub', from: 'DEL', fare: '₹5,999', duration: '2h 45m', flightsCount: '29 daily' },
  { city: 'Goa', code: 'GOI', state: 'Goa', desc: 'Sun, coastline, & coastal leisure', category: 'leisure', tag: 'Holiday Pick', from: 'BOM', fare: '₹3,450', duration: '1h 15m', flightsCount: '18 daily' },
  { city: 'Jaipur', code: 'JAI', state: 'Rajasthan', desc: 'Historic pink palaces & royal culture', category: 'heritage', tag: 'Heritage', from: 'DEL', fare: '₹3,199', duration: '1h 05m', flightsCount: '12 daily' },
  { city: 'Hyderabad', code: 'HYD', state: 'Telangana', desc: 'City of Pearls & tech corridors', category: 'metro', tag: 'Fast Connect', from: 'BLR', fare: '₹3,890', duration: '1h 20m', flightsCount: '22 daily' },
  { city: 'Kochi', code: 'COK', state: 'Kerala', desc: 'Serene backwaters & spice coast', category: 'leisure', tag: 'Scenic', from: 'BLR', fare: '₹3,650', duration: '1h 10m', flightsCount: '14 daily' },
  { city: 'Varanasi', code: 'VNS', state: 'Uttar Pradesh', desc: 'Spiritual ghats & sacred traditions', category: 'heritage', tag: 'Spiritual', from: 'DEL', fare: '₹3,490', duration: '1h 25m', flightsCount: '9 daily' },
];

const STATS = [
  { value: '270+', label: 'Domestic Flights', sub: 'Live authentic schedules' },
  { value: '< 350ms', label: 'AI Ranking Speed', sub: 'Multi-criteria optimization' },
  { value: '100%', label: 'ACID Seat Guarantees', sub: 'Zero duplicate bookings' },
  { value: '1,250+', label: 'Issued Boarding Passes', sub: 'Verified PNRs with QR' },
];

const STEPS = [
  {
    num: '01',
    icon: Compass,
    title: 'Live Flight Search & NLP',
    body: 'Type natural language preferences like "Morning flight under ₹6,000, non-stop" or select your dates. FlyWise fetches real airline timetables instantly.',
    pill: 'Natural Language Parsing',
  },
  {
    num: '02',
    icon: Sparkles,
    title: 'AI Multi-Score Ranking',
    body: 'The engine calculates balanced scores (Price 50%, Duration 35%, Stops 15%) and prompts Gemini 1.5 to articulate human rationale for every recommendation.',
    pill: 'Gemini 1.5 + Math Engine',
  },
  {
    num: '03',
    icon: ShieldCheck,
    title: '5-Minute Atomic Seat Lock',
    body: 'Choose your flight and initiate checkout. An atomic lock secures your seats in MongoDB with transaction isolation, preventing concurrent overbooking.',
    pill: 'ACID Guaranteed',
  },
  {
    num: '04',
    icon: QrCode,
    title: 'Instant PNR & E-Ticket',
    body: 'Complete with mock 1-click Pass & Done payment. Receive your confirmed airline PNR, assigned seat numbers, and printable QR boarding pass immediately.',
    pill: 'Official Electronic Pass',
  },
];

const AI_COMPARISON_TABS = [
  {
    id: 'cheapest',
    title: 'Lowest Fare Winner',
    subtitle: 'Price optimization (50% weight)',
    airline: 'Akasa Air QP-1302',
    fare: '₹3,450',
    duration: '2h 10m',
    score: '88/100',
    color: 'flare',
    reason: 'Saves ₹1,440 over the average route fare while maintaining a non-stop schedule with standard 15kg checked baggage.',
  },
  {
    id: 'fastest',
    title: 'Shortest Trip Winner',
    subtitle: 'Duration optimization (35% weight)',
    airline: 'IndiGo 6E-204',
    fare: '₹4,890',
    duration: '1h 35m',
    score: '91/100',
    color: 'signal',
    reason: 'Pure non-stop flight arriving 35 minutes earlier than competing options, ideal for business travelers prioritizing morning schedules.',
  },
  {
    id: 'balanced',
    title: 'FlyWise Best Overall',
    subtitle: 'Optimal compromise (Gemini Pick)',
    airline: 'Vistara UK-945',
    fare: '₹4,250',
    duration: '1h 45m',
    score: '96/100',
    color: 'mint',
    reason: 'Premium full-service carrier including complimentary hot meal and 15kg baggage, priced just ₹800 over budget options.',
  },
];

function FlightArc({ origin, destination }) {
  const originAirport = AIRPORT_BY_CODE[origin] || { city: origin };
  const destAirport = AIRPORT_BY_CODE[destination] || { city: destination };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
      <div className="flex items-center justify-between text-xs text-white/60 mb-2">
        <span className="flex items-center gap-1.5 font-medium">
          <Plane className="size-3.5 text-signal-200" /> Active Route Corridor
        </span>
        <span className="rounded bg-mint-600/30 px-2 py-0.5 text-[10px] font-bold text-mint-400">
          DAILY NON-STOP AVAILABLE
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-left">
          <span className="board text-3xl font-extrabold text-white">{origin}</span>
          <span className="block text-xs text-white/70 truncate max-w-[100px]">{originAirport.city}</span>
        </div>

        <div className="flex-1 px-4 flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-wider text-signal-200 font-bold mb-1">
            Flight Path
          </span>
          <div className="relative w-full h-[2px] bg-gradient-to-r from-signal-600 via-mint-400 to-signal-600 flex items-center justify-center">
            <span className="absolute size-2 rounded-full bg-signal-400 animate-ping"></span>
            <Plane className="size-4 text-white rotate-90 drop-shadow" />
          </div>
          <span className="text-[11px] text-white/60 font-semibold mt-1">Direct Connection</span>
        </div>

        <div className="text-right">
          <span className="board text-3xl font-extrabold text-white">{destination}</span>
          <span className="block text-xs text-white/70 truncate max-w-[100px]">{destAirport.city}</span>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const [route, setRoute] = useState({ origin: 'BHO', destination: 'DEL' });
  const [preset, setPreset] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('balanced');

  const onRouteChange = useCallback((origin, destination) => {
    setRoute({ origin, destination });
  }, []);

  const filteredDestinations = POPULAR_DESTINATIONS.filter(
    (dest) => selectedCategory === 'all' || dest.category === selectedCategory
  );

  return (
    <div className="min-h-screen">
      {/* Hero Section with Ambient Glow and Depth */}
      <section className="relative overflow-hidden bg-night-950 text-white pt-6 pb-48 sm:pt-14 sm:pb-52">
        {/* Background Glowing Ambient Orbs */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-signal-600/30 via-signal-700/10 to-transparent blur-3xl opacity-70 animate-pulse-glow" />
        <div className="pointer-events-none absolute top-48 -left-32 w-96 h-96 bg-mint-600/20 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute top-20 -right-32 w-96 h-96 bg-signal-500/20 rounded-full blur-3xl" />

        {/* Subtle geometric dot grid pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-15"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.25) 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative mx-auto max-w-6xl px-5">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
            {/* Left Hero Content */}
            <div className="lg:col-span-7">
              {/* Top AI Badge */}
              <motion.div
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold backdrop-blur-md shadow-sm"
              >
                <span className="flex size-2 rounded-full bg-mint-400 animate-pulse"></span>
                <span className="text-white/95">FlyWise AI 2.0 • Gemini Intelligence Engine</span>
                <span className="rounded bg-signal-600 px-1.5 py-0.5 text-[10px] font-bold text-white uppercase">
                  Live
                </span>
              </motion.div>

              {/* Main Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="mt-6 text-4xl leading-[1.12] font-black tracking-tight sm:text-6xl"
              >
                Find Smarter Flights.{' '}
                <span className="bg-gradient-to-r from-white via-signal-200 to-mint-400 bg-clip-text text-transparent">
                  Book with Certainty.
                </span>
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mt-5 max-w-xl text-base sm:text-lg leading-relaxed text-white/80 font-normal"
              >
                FlyWise AI queries authentic airline schedules, evaluates complex trade-offs using mathematical scoring and Gemini reasoning, then secures your seat with 100% ACID consistency.
              </motion.p>

              {/* Key Features Chips */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="mt-7 flex flex-wrap gap-2.5 text-xs font-semibold"
              >
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-white/90">
                  <Sparkles className="size-3.5 text-mint-400" /> Multi-Criteria AI Picks
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-white/90">
                  <ShieldCheck className="size-3.5 text-signal-200" /> 5-Min Atomic Seat Lock
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-white/90">
                  <QrCode className="size-3.5 text-mint-400" /> Instant E-Boarding Pass
                </div>
              </motion.div>
            </div>

            {/* Right Hero Visual Card */}
            <div className="lg:col-span-5">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="flex flex-col gap-4"
              >
                <FlightArc origin={route.origin} destination={route.destination} />

                {/* Live Quick Highlights Card */}
                <div className="rounded-2xl border border-white/15 bg-night-900/80 p-4.5 backdrop-blur-md shadow-pop">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <span className="text-xs font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="size-3.5 text-signal-400" /> Decision Engine Spec
                    </span>
                    <span className="text-[11px] font-bold text-mint-400">Priced in INR (₹)</span>
                  </div>
                  <div className="mt-3 space-y-2.5 text-xs">
                    <div className="flex justify-between items-center text-white/85">
                      <span className="text-white/60">Fare Optimization Weight</span>
                      <span className="board font-bold text-white">50% (High Priority)</span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-signal-500 h-full w-1/2 rounded-full"></div>
                    </div>

                    <div className="flex justify-between items-center text-white/85">
                      <span className="text-white/60">Travel Duration Weight</span>
                      <span className="board font-bold text-white">35%</span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-mint-400 h-full w-[35%] rounded-full"></div>
                    </div>

                    <div className="flex justify-between items-center text-white/85">
                      <span className="text-white/60">Transit Stops Penalty</span>
                      <span className="board font-bold text-white">15%</span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-flare-600 h-full w-[15%] rounded-full"></div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Search Panel (Overlapping Hero) */}
      <div className="relative mx-auto -mt-36 max-w-6xl px-5 z-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <SearchTicket
            key={preset ? preset.join('-') : 'default'}
            onRouteChange={onRouteChange}
            initial={preset ? { ...defaultSearch(), origin: preset[0], destination: preset[1] } : undefined}
          />
        </motion.div>
      </div>

      {/* Terminal Departure Board - Live Flight Ticker */}
      <section className="mt-14 border-y border-line bg-night-950 py-3.5 overflow-hidden text-white" aria-label="Live airline departures ticker">
        <div className="flex items-center gap-4">
          <div className="shrink-0 flex items-center gap-2 bg-signal-600 px-3.5 py-1 text-xs font-black tracking-wider uppercase rounded-r-md">
            <span className="size-2 rounded-full bg-white animate-ping"></span>
            Live Timetable Feed
          </div>

          <div className="animate-marquee flex items-center gap-8 text-xs font-mono">
            {LIVE_DEPARTURES.concat(LIVE_DEPARTURES).map((f, i) => (
              <div key={i} className="flex items-center gap-3 shrink-0 px-2 py-0.5 rounded bg-white/5 border border-white/10">
                <span className="font-bold text-signal-200">{f.airline}</span>
                <span className="text-white font-bold">{f.flight}</span>
                <span className="text-white/60">{f.from} → {f.to}</span>
                <span className="board text-white font-bold">{f.time}</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  f.status === 'BOARDING' ? 'bg-flare-600 text-white animate-pulse' :
                  f.status === 'GATE OPEN' ? 'bg-signal-500 text-white' : 'bg-mint-600 text-white'
                }`}>
                  {f.status}
                </span>
                <span className="board font-bold text-mint-400">{f.fare}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Counter Row */}
      <section className="mx-auto max-w-6xl px-5 mt-16" aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">Platform Statistics</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((s, idx) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              className="card-lift rounded-2xl border border-line bg-white p-5 shadow-pass"
            >
              <span className="board text-3xl sm:text-4xl font-extrabold text-signal-600 block">
                {s.value}
              </span>
              <span className="mt-1 block text-sm font-bold text-ink">{s.label}</span>
              <span className="mt-0.5 block text-xs text-ink-faint">{s.sub}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Interactive AI Recommendation Playground */}
      <section className="mx-auto mt-20 max-w-6xl px-5" aria-labelledby="ai-showcase-heading">
        <div className="rounded-3xl border border-line bg-gradient-to-br from-white via-mist/50 to-signal-50/30 p-6 sm:p-10 shadow-pass">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-signal-50 border border-signal-200/50 px-3 py-1 text-xs font-bold text-signal-700">
                <Sparkles className="size-3.5 text-signal-600" /> Explainable AI Architecture
              </span>
              <h2 id="ai-showcase-heading" className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-ink">
                How FlyWise AI Evaluates Candidates
              </h2>
              <p className="mt-1 text-sm text-ink-soft max-w-xl">
                Unlike simple aggregators that dump 50 flights on your screen, FlyWise categorizes your best options into three distinct archetypes.
              </p>
            </div>

            {/* Tab Selector Buttons */}
            <div className="flex rounded-xl border border-line bg-white p-1 shadow-xs">
              {AI_COMPARISON_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    activeTab === tab.id
                      ? 'bg-night-900 text-white shadow-xs'
                      : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  {tab.title}
                </button>
              ))}
            </div>
          </div>

          {/* Active Tab Preview Card */}
          <div className="mt-8">
            <AnimatePresence mode="wait">
              {AI_COMPARISON_TABS.filter((t) => t.id === activeTab).map((tab) => (
                <motion.div
                  key={tab.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-2xl border border-line bg-white p-6 sm:p-8 shadow-sm"
                >
                  <div className="grid gap-6 md:grid-cols-12 md:items-center">
                    <div className="md:col-span-4">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        tab.color === 'mint' ? 'bg-mint-50 text-mint-700' :
                        tab.color === 'flare' ? 'bg-flare-50 text-flare-700' : 'bg-signal-50 text-signal-700'
                      }`}>
                        {tab.subtitle}
                      </span>
                      <h3 className="mt-2 text-xl font-bold text-ink">{tab.airline}</h3>
                      <div className="mt-3 flex items-baseline gap-3">
                        <span className="board text-3xl font-extrabold text-signal-600">{tab.fare}</span>
                        <span className="text-xs text-ink-faint">per passenger</span>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-xs font-semibold text-ink-soft">
                        <span className="flex items-center gap-1"><Clock className="size-3.5" /> {tab.duration}</span>
                        <span className="flex items-center gap-1"><Award className="size-3.5" /> Score {tab.score}</span>
                      </div>
                    </div>

                    <div className="md:col-span-8 border-t md:border-t-0 md:border-l border-line pt-4 md:pt-0 md:pl-8">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-signal-600">
                        <Sparkles className="size-4" /> Gemini AI Generated Rationale
                      </div>
                      <blockquote className="mt-2 text-sm leading-relaxed text-ink italic font-medium">
                        "{tab.reason}"
                      </blockquote>
                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-ink-soft">
                        <span className="rounded-md bg-mist px-2.5 py-1 border border-line">Non-Stop Route</span>
                        <span className="rounded-md bg-mist px-2.5 py-1 border border-line">Cabin Baggage 7kg</span>
                        <span className="rounded-md bg-mist px-2.5 py-1 border border-line">Checked Baggage 15kg</span>
                        <span className="rounded-md bg-mint-50 text-mint-700 px-2.5 py-1 font-semibold">Live Seats Available</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Popular Domestic Corridors Grid */}
      <section className="mx-auto mt-24 max-w-6xl px-5" aria-labelledby="destinations-heading">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-signal-600">
              <Compass className="size-4" /> Direct High-Frequency Corridors
            </div>
            <h2 id="destinations-heading" className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-ink">
              Popular Flight Routes
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              Click any route to instantly pre-fill the search console above.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'all', label: 'All Destinations' },
              { id: 'metro', label: 'Metros' },
              { id: 'leisure', label: 'Holiday & Beaches' },
              { id: 'heritage', label: 'Culture & Heritage' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-all border ${
                  selectedCategory === cat.id
                    ? 'bg-night-900 text-white border-night-900 shadow-xs'
                    : 'bg-white text-ink-soft border-line hover:border-signal-300 hover:text-ink'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {filteredDestinations.map((dest, idx) => (
            <motion.button
              key={dest.code}
              type="button"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: idx * 0.05 }}
              onClick={() => {
                setPreset([dest.from, dest.code]);
                window.scrollTo({ top: 120, behavior: 'smooth' });
              }}
              className="card-lift group relative overflow-hidden rounded-2xl border border-line bg-white p-5 text-left shadow-pass flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="rounded-md bg-signal-50 px-2 py-0.5 text-[11px] font-bold text-signal-700">
                      {dest.tag}
                    </span>
                    <h3 className="mt-2 text-xl font-bold text-ink group-hover:text-signal-600 transition-colors">
                      {dest.city}
                    </h3>
                    <p className="text-xs text-ink-faint">{dest.state}</p>
                  </div>
                  <span className="board text-3xl font-extrabold text-night-900/70 group-hover:text-signal-600 transition-colors">
                    {dest.code}
                  </span>
                </div>

                <p className="mt-3 text-xs text-ink-soft line-clamp-2 leading-relaxed">
                  {dest.desc}
                </p>
              </div>

              <div className="mt-5 border-t border-line/70 pt-3">
                <div className="flex items-center justify-between text-xs text-ink-faint mb-1">
                  <span>{dest.duration}</span>
                  <span>{dest.flightsCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-soft">
                    From {dest.from}: <strong className="board text-base font-bold text-ink">{dest.fare}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-signal-600 group-hover:translate-x-1 transition-transform">
                    Search <ArrowRight className="size-3.5" />
                  </span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      {/* The 4-Step Booking Journey */}
      <section id="how-it-works" className="mx-auto mt-24 max-w-6xl px-5" aria-labelledby="how-heading">
        <div className="rounded-3xl bg-white border border-line p-8 sm:p-12 shadow-pass">
          <div className="text-center max-w-xl mx-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-signal-50 px-3 py-1 text-xs font-bold text-signal-700">
              <Zap className="size-3.5" /> End-to-End Flight Lifecycle
            </span>
            <h2 id="how-heading" className="mt-2 text-3xl font-bold tracking-tight text-ink">
              How FlyWise Works
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              Every search is powered by transparent mathematical models, real airline timetables, and transactional guarantees.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.1 }}
                  className="card-lift relative rounded-2xl bg-mist/60 p-6 border border-line/80 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="board text-3xl font-black text-signal-600/30">
                        {step.num}
                      </span>
                      <div className="grid size-9 place-items-center rounded-xl bg-signal-100 text-signal-700">
                        <Icon className="size-4.5" />
                      </div>
                    </div>
                    <span className="mt-3 inline-block rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-signal-700 border border-line">
                      {step.pill}
                    </span>
                    <h3 className="mt-2 text-base font-bold text-ink">{step.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-ink-soft">{step.body}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Engineering Transparency: What AI Does vs What It Never Does */}
      <section className="mx-auto mt-20 max-w-6xl px-5" aria-labelledby="honest-heading">
        <div className="grid gap-8 rounded-3xl bg-white border border-line p-7 shadow-pass sm:p-10 md:grid-cols-3">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-signal-50 px-3 py-1 text-xs font-bold text-signal-700">
              <ShieldCheck className="size-3.5" /> Software Engineering Blueprint
            </div>
            <h2 id="honest-heading" className="mt-3 text-2xl font-bold tracking-tight text-ink">
              What the AI does, and what it never does
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              FlyWise AI treats the LLM strictly as an explanatory advisory layer. Booking states, pricing, seat locks, and payments are strictly enforced by the backend database.
            </p>
          </div>

          <div className="rounded-2xl bg-mint-50/70 p-6 border border-mint-600/25">
            <h3 className="flex items-center gap-2 font-bold text-mint-700">
              <CheckCircle2 className="size-4.5" /> What FlyWise AI Does
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs leading-relaxed text-ink font-medium">
              <li className="flex items-start gap-2">
                <span className="text-mint-600 font-bold mt-0.5">✓</span>
                Extracts travel intent and filters from natural language queries.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-mint-600 font-bold mt-0.5">✓</span>
                Computes objective weighted ranks (Price 50%, Duration 35%, Stops 15%).
              </li>
              <li className="flex items-start gap-2">
                <span className="text-mint-600 font-bold mt-0.5">✓</span>
                Gemini generates plain-English decision justifications.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-mint-600 font-bold mt-0.5">✓</span>
                Deduplicates candidates when cheapest and fastest coincide.
              </li>
            </ul>
          </div>

          <div className="rounded-2xl bg-stop-50/70 p-6 border border-stop-600/25">
            <h3 className="flex items-center gap-2 font-bold text-stop-700">
              <XCircle className="size-4.5" /> What It Never Does
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs leading-relaxed text-ink font-medium">
              <li className="flex items-start gap-2">
                <span className="text-stop-600 font-bold mt-0.5">✕</span>
                Never hallucinates non-existent flights, airports, or airlines.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-stop-600 font-bold mt-0.5">✕</span>
                Never alters fares—prices are verified strictly against backend inventory.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-stop-600 font-bold mt-0.5">✕</span>
                Never bypasses ACID transaction guarantees or seat isolation.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-stop-600 font-bold mt-0.5">✕</span>
                Never allocates duplicate seats under concurrent checkout requests.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Call To Action Banner */}
      <section className="mx-auto mt-20 max-w-6xl px-5 pb-16">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-night-950 via-night-900 to-signal-700 p-8 sm:p-12 text-white shadow-pop">
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="size-3.5 text-signal-200" /> Experience FlyWise Today
            </span>
            <h2 className="mt-3 text-2xl sm:text-4xl font-extrabold tracking-tight">
              Ready to plan your next journey?
            </h2>
            <p className="mt-3 text-sm sm:text-base text-white/80 leading-relaxed">
              Explore 270+ live flight routes across 25 major Indian airports. Experience real-time multi-criteria ranking and instant boarding pass generation.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 120, behavior: 'smooth' })}
                className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-night-900 hover:bg-signal-50 transition-colors shadow-sm inline-flex items-center gap-2"
              >
                Start Searching <ArrowUpRight className="size-4" />
              </button>
              <a
                href="/how-we-work"
                className="rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors inline-flex items-center gap-2"
              >
                View System Architecture
              </a>
            </div>
          </div>

          <Plane className="pointer-events-none absolute -bottom-10 -right-10 size-64 text-white/5 -rotate-12" />
        </div>
      </section>
    </div>
  );
}
