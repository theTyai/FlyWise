import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight, Search } from 'lucide-react';
import { AIRPORTS, AIRPORT_BY_CODE, CABIN_CLASSES, CABIN_LABEL, MAX_PASSENGERS } from '@shared/constants.js';
import { isoDate } from '@shared/ui/format.js';
import { Button, Notice, cx } from '@shared/ui/index.jsx';
import { searchFlights } from '../services/flight.service.js';

// A ticket-style airport field: shows the code large, opens a searchable list.
function AirportPicker({ label, value, onChange, exclude }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const listId = useId();
  const airport = AIRPORT_BY_CODE[value];

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return AIRPORTS.filter((a) => a.code !== exclude)
      .filter((a) => !q || a.code.toLowerCase().includes(q) || a.city.toLowerCase().includes(q) || a.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, exclude]);

  useEffect(() => {
    if (!open) return undefined;
    inputRef.current?.focus();
    const close = (event) => { if (!wrapRef.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const choose = (code) => { onChange(code); setOpen(false); setQuery(''); };
  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive((i) => Math.min(i + 1, matches.length - 1)); }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    if (event.key === 'Enter') { event.preventDefault(); if (matches[active]) choose(matches[active].code); }
    if (event.key === 'Escape') setOpen(false);
  };

  return (
    <div className="relative min-w-0 flex-1" ref={wrapRef}>
      <button
        type="button" onClick={() => { setOpen(true); setActive(0); }} aria-haspopup="listbox" aria-expanded={open}
        className="w-full rounded-xl px-3 py-2 text-left transition-colors hover:bg-mist"
      >
        <span className="block text-[13px] font-medium text-ink-faint">{label}</span>
        <span className="board block text-[2.6rem] leading-none font-semibold text-ink">{airport ? airport.code : '---'}</span>
        <span className="mt-0.5 block truncate text-sm text-ink-soft">{airport ? airport.city : 'Choose airport'}</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 z-30 mt-1 w-72 max-w-[calc(100vw-2.5rem)] rounded-xl border border-line bg-white p-2 shadow-pop">
          <input
            ref={inputRef} value={query} onChange={(event) => { setQuery(event.target.value); setActive(0); }} onKeyDown={onKeyDown}
            placeholder="City or airport code" className="field" role="combobox" aria-expanded="true" aria-controls={listId}
            aria-label={`${label} airport`} autoComplete="off"
          />
          <ul id={listId} role="listbox" className="mt-1.5 max-h-64 overflow-auto">
            {matches.map((a, index) => (
              <li key={a.code} role="option" aria-selected={a.code === value}>
                <button
                  type="button" onClick={() => choose(a.code)} onMouseEnter={() => setActive(index)}
                  className={cx('flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left', index === active && 'bg-signal-50')}
                >
                  <span className="board w-11 text-xl font-semibold text-night-800">{a.code}</span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-medium">{a.city}</span>
                    <span className="block truncate text-[13px] text-ink-faint">{a.name}</span>
                  </span>
                </button>
              </li>
            ))}
            {!matches.length && <li className="px-2.5 py-3 text-sm text-ink-soft">No airport matches "{query}". Try a city name.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

const PRIORITY_OPTIONS = [
  { value: 'BALANCED', label: 'Balanced' },
  { value: 'CHEAPEST', label: 'Lowest fare' },
  { value: 'FASTEST', label: 'Shortest trip' },
];

export const defaultSearch = () => ({
  origin: 'BHO', destination: 'DEL', departureDate: isoDate(10), passengers: 1, cabinClass: 'ECONOMY',
  priority: 'BALANCED', nonStopOnly: false, naturalLanguage: '',
});

// The search form, shaped like a ticket being filled in. Used on the landing page and on results.
export default function SearchTicket({ initial, onRouteChange, notch = 'var(--color-mist)' }) {
  const [form, setForm] = useState(() => ({ ...defaultSearch(), ...initial }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const ids = { date: useId(), pax: useId(), cabin: useId(), note: useId() };

  const set = (patch) => setForm((current) => ({ ...current, ...patch }));
  useEffect(() => { onRouteChange?.(form.origin, form.destination); }, [form.origin, form.destination, onRouteChange]);

  async function submit(event) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const data = await searchFlights(form);
      navigate(`/results/${data.search.id}`);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="pass shadow-lift" style={{ '--pass-notch': notch, '--stub-width': '13.5rem' }}>
        <div className="p-4 sm:p-5">
          <div className="grid gap-x-4 gap-y-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <div className="flex items-center gap-1">
              <AirportPicker label="From" value={form.origin} exclude={form.destination} onChange={(origin) => set({ origin })} />
              <button
                type="button" aria-label="Swap departure and arrival airports"
                onClick={() => set({ origin: form.destination, destination: form.origin })}
                className="grid size-10 shrink-0 place-items-center rounded-full border border-line text-ink-soft transition-colors hover:border-signal-600 hover:text-signal-600"
              >
                <ArrowLeftRight className="size-4" aria-hidden="true" />
              </button>
              <AirportPicker label="To" value={form.destination} exclude={form.origin} onChange={(destination) => set({ destination })} />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:border-l lg:border-line lg:pl-4">
              <div className="col-span-2 sm:col-span-1">
                <label htmlFor={ids.date} className="mb-1 block text-[13px] font-medium text-ink-faint">Travel date</label>
                <input id={ids.date} type="date" required className="field" min={isoDate(0)} max={isoDate(330)}
                  value={form.departureDate} onChange={(event) => set({ departureDate: event.target.value })} />
              </div>
              <div>
                <label htmlFor={ids.pax} className="mb-1 block text-[13px] font-medium text-ink-faint">Travellers</label>
                <select id={ids.pax} className="field" value={form.passengers} onChange={(event) => set({ passengers: event.target.value })}>
                  {Array.from({ length: MAX_PASSENGERS }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor={ids.cabin} className="mb-1 block text-[13px] font-medium text-ink-faint">Cabin</label>
                <select id={ids.cabin} className="field" value={form.cabinClass} onChange={(event) => set({ cabinClass: event.target.value })}>
                  {CABIN_CLASSES.map((cabin) => <option key={cabin} value={cabin}>{CABIN_LABEL[cabin]}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 border-t border-line pt-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <label htmlFor={ids.note} className="mb-1 block text-[13px] font-medium text-ink-faint">Anything we should weigh? Write it your way</label>
              <input id={ids.note} className="field" maxLength={300} value={form.naturalLanguage}
                onChange={(event) => set({ naturalLanguage: event.target.value })}
                placeholder="Morning departure, under ₹6,000, no more than three hours" />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div role="radiogroup" aria-label="What matters most" className="flex rounded-xl border border-line p-1">
                {PRIORITY_OPTIONS.map((option) => (
                  <button
                    key={option.value} type="button" role="radio" aria-checked={form.priority === option.value}
                    onClick={() => set({ priority: option.value })}
                    className={cx('rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                      form.priority === option.value ? 'bg-night-900 text-white' : 'text-ink-soft hover:text-ink')}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-ink-soft">
                <input type="checkbox" className="size-4 accent-signal-600" checked={form.nonStopOnly}
                  onChange={(event) => set({ nonStopOnly: event.target.checked })} />
                Non-stop only
              </label>
            </div>
          </div>
        </div>

        <div className="pass-stub flex flex-col justify-center gap-2 p-4 sm:p-5">
          <Button type="submit" size="lg" loading={busy} className="w-full">
            {!busy && <Search className="size-[18px]" aria-hidden="true" />}
            {busy ? 'Searching' : 'Find flights'}
          </Button>
          <p className="text-center text-[13px] text-ink-faint">One-way trips within India</p>
        </div>
      </div>
      {error && <Notice tone="error" className="mt-3">{error}</Notice>}
    </form>
  );
}
