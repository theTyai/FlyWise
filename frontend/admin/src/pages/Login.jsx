import { useId, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button, Field, Notice } from '@shared/ui/index.jsx';
import { DeskLogo } from '../components/Shell.jsx';
import { useDesk } from '../context/DeskContext.jsx';

export default function Login() {
  const { admin, login } = useDesk();
  const location = useLocation();
  const navigate = useNavigate();
  const [values, setValues] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const ids = { email: useId(), password: useId() };
  const destination = location.state?.from || '/';
  if (admin) return <Navigate to={destination} replace />;

  async function submit(event) {
    event.preventDefault();
    setBusy(true); setError(null); setFieldErrors({});
    try {
      await login(values.email, values.password);
      navigate(destination, { replace: true });
    } catch (failure) {
      setFieldErrors(Object.fromEntries((failure.details || []).map((d) => [d.field, d.message])));
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-night-950 lg:grid-cols-[minmax(0,1fr)_32rem]">
      <div className="relative hidden overflow-hidden px-12 py-10 lg:flex lg:flex-col">
        <DeskLogo />
        <div className="mt-auto max-w-lg pb-6">
          <h1 className="text-5xl leading-[1.05] font-bold tracking-tight text-white">Every request, reviewed by a person.</h1>
          <p className="mt-5 text-lg leading-relaxed text-white/65">
            Travellers send requests from the FlyWise app. Here you check simulated seat inventory and confirm, reject or revoke.
            Each decision reaches the traveller straight away and is written to the audit log.
          </p>
        </div>
        {/* A departure-board strip: the desk's three outcomes, in the colours used throughout the app. */}
        <dl className="grid max-w-lg grid-cols-3 gap-px overflow-hidden rounded-2xl bg-white/10" aria-hidden="true">
          {[['Confirm', 'Seat allocated', 'bg-mint-600'], ['Reject', 'With a reason', 'bg-stop-600'], ['Revoke', 'Seat released', 'bg-void-700']].map(([word, note, dot]) => (
            <div key={word} className="bg-night-950 px-4 py-4">
              <dt className="flex items-center gap-2 board text-2xl font-semibold text-white"><span className={`size-2 rounded-full ${dot}`} />{word}</dt>
              <dd className="mt-0.5 text-sm text-white/50">{note}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="flex items-center justify-center bg-mist px-5 py-12 lg:rounded-l-[2rem]">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><div className="inline-flex rounded-2xl bg-night-950 px-4 py-3"><DeskLogo /></div></div>
          <h2 className="text-[1.75rem] leading-tight font-bold tracking-tight">Sign in to the desk</h2>
          <p className="mt-1.5 text-ink-soft">Desk accounts are created by the seed script. There is no sign-up.</p>
          <form className="mt-7 space-y-4" onSubmit={submit} noValidate>
            {error && <Notice tone="error">{error}</Notice>}
            <Field label="Email" htmlFor={ids.email} error={fieldErrors.email}>
              <input id={ids.email} type="email" autoComplete="username" className="field" value={values.email} aria-invalid={Boolean(fieldErrors.email)}
                onChange={(event) => setValues({ ...values, email: event.target.value })} />
            </Field>
            <Field label="Password" htmlFor={ids.password} error={fieldErrors.password}>
              <input id={ids.password} type="password" autoComplete="current-password" className="field" value={values.password} aria-invalid={Boolean(fieldErrors.password)}
                onChange={(event) => setValues({ ...values, password: event.target.value })} />
            </Field>
            <Button type="submit" size="lg" variant="navy" loading={busy} className="w-full">Sign in</Button>
          </form>
          <p className="mt-6 text-sm text-ink-faint">Signing out, or closing this tab, ends the desk session.</p>
        </div>
      </div>
    </div>
  );
}
