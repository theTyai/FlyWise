import { useEffect, useId, useState } from 'react';
import { Armchair, Plus } from 'lucide-react';
import { AIRPORTS } from '@shared/constants.js';
import { day, isoDate, stamp } from '@shared/ui/format.js';
import { Button, Dialog, EmptyState, Field, Notice, Spinner, cx } from '@shared/ui/index.jsx';
import { PageHeader, Pagination, SearchField, SeatBar } from '../components/ui.jsx';
import { useDesk } from '../context/DeskContext.jsx';
import { usePagedList } from '../hooks/usePagedList.js';
import { createInventory, listInventory, updateSeatTotal } from '../services/inventory.service.js';

const errorsOf = (failure) => Object.fromEntries((failure?.details || []).map((d) => [d.field, d.message]));

function AddDialog({ open, onClose, onAdded }) {
  const blank = { flightNumber: '', airline: '', origin: 'BHO', destination: 'DEL', date: isoDate(7), totalSeats: 60 };
  const [values, setValues] = useState(blank);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const id = useId();
  const f = (name) => `${id}-${name}`;
  useEffect(() => { if (open) { setValues(blank); setErrors({}); setError(null); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const bind = (name) => ({ id: f(name), value: values[name], 'aria-invalid': Boolean(errors[name]), onChange: (event) => setValues({ ...values, [name]: event.target.value }) });

  async function save() {
    setBusy(true); setError(null); setErrors({});
    try {
      const data = await createInventory({ ...values, airline: values.airline.trim() || undefined, totalSeats: Number(values.totalSeats) });
      onAdded(data.inventory);
    } catch (failure) {
      setErrors(errorsOf(failure));
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Add flight inventory"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={save}>Add inventory</Button></>}>
      <p>Inventory is also created automatically the first time a traveller requests a flight. Add it here to set seats in advance.</p>
      {error && <Notice tone="error" className="mt-4">{error}</Notice>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Flight number" htmlFor={f('flightNumber')} error={errors.flightNumber} hint="Like 6E-201">
          <input className="field board text-lg uppercase" {...bind('flightNumber')} />
        </Field>
        <Field label="Airline (optional)" htmlFor={f('airline')} error={errors.airline}>
          <input className="field" {...bind('airline')} />
        </Field>
        <Field label="From" htmlFor={f('origin')} error={errors.origin}>
          <select className="field" {...bind('origin')}>{AIRPORTS.map((a) => <option key={a.code} value={a.code}>{a.code}, {a.city}</option>)}</select>
        </Field>
        <Field label="To" htmlFor={f('destination')} error={errors.destination}>
          <select className="field" {...bind('destination')}>{AIRPORTS.map((a) => <option key={a.code} value={a.code}>{a.code}, {a.city}</option>)}</select>
        </Field>
        <Field label="Flight date" htmlFor={f('date')} error={errors.date}>
          <input type="date" className="field" min={isoDate(0)} {...bind('date')} />
        </Field>
        <Field label="Total seats" htmlFor={f('totalSeats')} error={errors.totalSeats} hint="0 to 500">
          <input type="number" min={0} max={500} className="field board text-lg" {...bind('totalSeats')} />
        </Field>
      </div>
    </Dialog>
  );
}

function EditDialog({ item, onClose, onSaved }) {
  const [total, setTotal] = useState(item?.totalSeats ?? 0);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const id = useId();
  useEffect(() => { if (item) { setTotal(item.totalSeats); setError(null); } }, [item]);
  if (!item) return null;
  const allocated = item.totalSeats - item.availableSeats;
  const next = Number(total);
  const tooLow = next < allocated;

  async function save() {
    setBusy(true); setError(null);
    try {
      const data = await updateSeatTotal(item.id, next);
      onSaved(data.inventory);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={Boolean(item)} onClose={onClose} title={`Seats on ${item.flightNumber}`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={busy} disabled={tooLow || next === item.totalSeats || Number.isNaN(next)} onClick={save}>Save seat total</Button></>}>
      <p>{item.origin} to {item.destination}, {day(item.departureTime)}. Free seats move by the same amount as the total.</p>
      <Field label="Total seats" htmlFor={id} className="mt-4"
        error={tooLow ? `${allocated} ${allocated === 1 ? 'seat is' : 'seats are'} already allocated, so the total cannot go below ${allocated}.` : null}
        hint={`${allocated} allocated now. Free after saving: ${Math.max(0, next - allocated)}.`}>
        <input id={id} type="number" min={allocated} max={500} className="field board w-40 text-xl" value={total} onChange={(event) => setTotal(event.target.value)} aria-invalid={tooLow} />
      </Field>
      {error && <Notice tone="error" className="mt-4">{error}</Notice>}
    </Dialog>
  );
}

export default function Inventory() {
  const { liveTick } = useDesk();
  // liveTick: seat counts change when a booking is confirmed, revoked or cancelled elsewhere.
  const { q, data, loading, error, go, reload } = usePagedList(
    ({ q: text, page }) => listInventory({ q: text, page, limit: 15 }),
    { deps: [liveTick] },
  );
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState(null);

  return (
    <>
      <PageHeader
        title="Seat inventory"
        lead="Seat counts per flight that the desk allocates from when confirming. They are simulated and do not reflect real airline availability."
        actions={<Button onClick={() => setAdding(true)}><Plus className="size-4" aria-hidden="true" /> Add flight inventory</Button>}
      />
      {message && <Notice tone="success" className="mb-5">{message}</Notice>}

      <div className="rounded-2xl bg-white shadow-pass">
        <div className="flex items-center justify-between gap-3 border-b border-line p-3 sm:p-4">
          <p className="hidden text-sm text-ink-faint sm:block">Ordered by departure</p>
          <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
            {loading && data && <Spinner className="size-4 text-ink-faint" />}
            <SearchField value={q} onChange={(value) => go({ q: value, page: 1 })} placeholder="Flight, airline or airport" label="Search inventory" />
          </div>
        </div>
        {error && <div className="p-4"><Notice tone="error">{error}</Notice></div>}
        {!data && !error && <div className="flex justify-center py-16 text-ink-faint"><Spinner className="size-5" /></div>}
        {data && data.inventory.length === 0 && (
          <div className="p-5">
            <EmptyState icon={Armchair} title={q ? `No flights match "${q}"` : 'No inventory yet'}
              action={!q && <Button onClick={() => setAdding(true)}>Add flight inventory</Button>}>
              {q ? 'Try a flight number such as 6E-201 or an airport code.' : 'A record is created automatically when a traveller first requests a flight.'}
            </EmptyState>
          </div>
        )}
        {data && data.inventory.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className={cx('w-full min-w-[48rem] text-left text-[15px] transition-opacity', loading && 'opacity-60')}>
                <thead>
                  <tr className="border-b border-line text-sm text-ink-faint">
                    <th scope="col" className="py-3 pr-3 pl-5 font-medium">Flight</th>
                    <th scope="col" className="px-3 py-3 font-medium">Route</th>
                    <th scope="col" className="px-3 py-3 font-medium">Date</th>
                    <th scope="col" className="w-72 px-3 py-3 font-medium">Seats</th>
                    <th scope="col" className="px-3 py-3 font-medium">Last change</th>
                    <th scope="col" className="py-3 pr-5 pl-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {data.inventory.map((item) => (
                    <tr key={item.id} className="border-b border-line last:border-0">
                      <td className="py-3 pr-3 pl-5">
                        <p className="board text-lg font-semibold">{item.flightNumber}</p>
                        <p className="text-sm text-ink-faint">{item.airline || 'Airline not set'}</p>
                      </td>
                      <td className="board px-3 py-3 text-lg">{item.origin} - {item.destination}</td>
                      <td className="px-3 py-3">{day(item.departureTime)}</td>
                      <td className="px-3 py-3">
                        <SeatBar compact total={item.totalSeats} available={item.availableSeats} />
                        {item.availableSeats === 0 && <p className="mt-1 text-[13px] font-semibold text-stop-700">Full: new requests cannot be confirmed</p>}
                      </td>
                      <td className="px-3 py-3 text-sm text-ink-soft">{stamp(item.updatedAt)}</td>
                      <td className="py-3 pr-5 pl-3 text-right">
                        <Button size="sm" variant="outline" onClick={() => setEditing(item)} aria-label={`Change seat total for ${item.flightNumber} on ${day(item.departureTime)}`}>Change seats</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-line"><Pagination meta={data.meta} onPage={(next) => go({ page: next })} /></div>
          </>
        )}
      </div>

      <AddDialog open={adding} onClose={() => setAdding(false)}
        onAdded={(item) => { setAdding(false); setMessage(`Added ${item.totalSeats} seats on ${item.flightNumber}, ${day(item.departureTime)}.`); reload(); }} />
      <EditDialog item={editing} onClose={() => setEditing(null)}
        onSaved={(item) => { setEditing(null); setMessage(`${item.flightNumber} now has ${item.totalSeats} seats, ${item.availableSeats} free.`); reload(); }} />
    </>
  );
}
