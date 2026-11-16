import { useEffect, useId, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { stamp } from '@shared/ui/format.js';
import { Button, Field, Notice, PageLoading, cx } from '@shared/ui/index.jsx';
import { PageHeader, Panel } from '../components/ui.jsx';
import { getServiceStatus, getSettings, updateSettings } from '../services/settings.service.js';

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [seats, setSeats] = useState('');
  const [services, setServices] = useState(null);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const id = useId();

  const check = () => {
    setChecking(true);
    getServiceStatus().then((data) => setServices(data.services)).catch(() => setServices([])).finally(() => setChecking(false));
  };

  useEffect(() => {
    getSettings().then((data) => { setSettings(data.settings); setSeats(String(data.settings.defaultSimulatedSeats)); }).catch((failure) => setError(failure.message));
    check();
  }, []);

  async function save(event) {
    event.preventDefault();
    setBusy(true); setMessage(null);
    try {
      const data = await updateSettings({ defaultSimulatedSeats: Number(seats) });
      setSettings(data.settings);
      setMessage({ tone: 'success', text: `New flights now start with ${data.settings.defaultSimulatedSeats} simulated seats.` });
    } catch (failure) {
      setMessage({ tone: 'error', text: failure.message });
    } finally {
      setBusy(false);
    }
  }

  if (error) return <><PageHeader title="Settings" /><Notice tone="error">{error}</Notice></>;
  if (!settings) return <><PageHeader title="Settings" /><PageLoading /></>;
  const value = Number(seats);
  const invalid = seats === '' || Number.isNaN(value) || value < 0 || value > 500 || !Number.isInteger(value);

  return (
    <>
      <PageHeader title="Settings" lead="Defaults for simulated inventory, and the health of the services FlyWise depends on." />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Panel title="Simulated seats for new flights" lead="Used when a traveller requests a flight that has no inventory record yet. Existing flights keep their own totals.">
          <form onSubmit={save} noValidate>
            {message && <Notice tone={message.tone} className="mb-4">{message.text}</Notice>}
            <Field label="Seats per flight" htmlFor={id} error={invalid ? 'Enter a whole number from 0 to 500.' : null} hint={`Last changed ${stamp(settings.updatedAt)}`}>
              <input id={id} type="number" min={0} max={500} className="field board w-40 text-xl" value={seats} onChange={(event) => setSeats(event.target.value)} aria-invalid={invalid} />
            </Field>
            <div className="mt-5 flex justify-end border-t border-line pt-4">
              <Button type="submit" loading={busy} disabled={invalid || value === settings.defaultSimulatedSeats}>Save default</Button>
            </div>
          </form>
        </Panel>

        <Panel title="Services" lead="Checked when you open this page."
          actions={<Button size="sm" variant="outline" loading={checking} onClick={check}>{!checking && <RefreshCw className="size-3.5" aria-hidden="true" />}Check again</Button>}>
          {!services ? <PageLoading label="Checking services" /> : services.length === 0 ? <Notice tone="error">Could not check the services.</Notice> : (
            <ul className="divide-y divide-line">
              {services.map((s) => (
                <li key={s.name} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <span className={cx('mt-1.5 size-2.5 shrink-0 rounded-full', s.status === 'up' ? 'bg-mint-600' : 'bg-stop-600')} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className="font-semibold">{s.name}</span>
                      <span className={cx('text-sm font-semibold', s.status === 'up' ? 'text-mint-700' : 'text-stop-700')}>{s.status === 'up' ? 'Running' : 'Not reachable'}</span>
                    </p>
                    <p className="text-sm text-ink-soft">{s.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
