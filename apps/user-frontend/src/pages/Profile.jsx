import { useEffect, useId, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { date } from '@shared/ui/format.js';
import { Button, Field, Notice } from '@shared/ui/index.jsx';
import { errorsByField } from '../components/TravellerFields.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { updateProfile } from '../services/auth.service.js';
import { listBookings } from '../services/booking.service.js';

export default function Profile() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ name: user.name, phone: user.phone || '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [counts, setCounts] = useState(null);
  const ids = { name: useId(), phone: useId(), email: useId() };
  const changed = values.name.trim() !== user.name || values.phone.trim() !== (user.phone || '');

  useEffect(() => {
    listBookings().then((data) => {
      const by = (fn) => data.bookings.filter(fn).length;
      setCounts({
        total: data.bookings.length,
        confirmed: by((b) => b.status === 'CONFIRMED'),
        waiting: by((b) => b.status === 'PENDING_ADMIN_APPROVAL'),
      });
    }).catch(() => {});
  }, []);

  async function save(event) {
    event.preventDefault();
    setBusy(true); setErrors({}); setMessage(null);
    try {
      const data = await updateProfile({ name: values.name.trim(), phone: values.phone.trim() });
      setUser(data.user);
      setMessage({ tone: 'success', text: 'Profile saved.' });
    } catch (failure) {
      setErrors(errorsByField(failure));
      setMessage({ tone: 'error', text: failure.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
      <p className="mt-1 text-ink-soft">Member since {date(user.createdAt)}</p>

      <div className="mt-8 grid items-start gap-8 md:grid-cols-[minmax(0,1fr)_16rem]">
        <form onSubmit={save} noValidate className="rounded-3xl bg-white p-6 shadow-pass sm:p-8">
          <h2 className="text-lg font-bold tracking-tight">Your details</h2>
          <p className="mt-1 text-[15px] text-ink-soft">These fill in the first traveller on new booking requests.</p>
          {message && <Notice tone={message.tone} className="mt-5">{message.text}</Notice>}
          <div className="mt-6 space-y-4">
            <Field label="Full name" htmlFor={ids.name} error={errors.name}>
              <input id={ids.name} className="field" autoComplete="name" value={values.name} aria-invalid={Boolean(errors.name)}
                onChange={(event) => setValues({ ...values, name: event.target.value })} />
            </Field>
            <Field label="Phone number" htmlFor={ids.phone} error={errors.phone} hint="Digits only, with country code if you like.">
              <input id={ids.phone} type="tel" className="field" autoComplete="tel" value={values.phone} aria-invalid={Boolean(errors.phone)}
                onChange={(event) => setValues({ ...values, phone: event.target.value })} />
            </Field>
            <Field label="Email" htmlFor={ids.email} hint="Your sign-in email cannot be changed.">
              <input id={ids.email} className="field bg-mist text-ink-soft" value={user.email} readOnly />
            </Field>
          </div>
          <div className="mt-7 flex justify-end border-t border-line pt-5">
            <Button type="submit" loading={busy} disabled={!changed}>Save changes</Button>
          </div>
        </form>

        <aside className="space-y-4">
          <div className="rounded-3xl bg-night-900 p-6 text-white">
            <h2 className="text-sm font-medium text-white/65">Your trips</h2>
            <dl className="mt-3 space-y-3">
              {[['Requests sent', counts?.total], ['Confirmed', counts?.confirmed], ['Waiting for review', counts?.waiting]].map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-3">
                  <dt className="text-[15px] text-white/80">{label}</dt>
                  <dd className="board text-2xl font-semibold">{value ?? '-'}</dd>
                </div>
              ))}
            </dl>
            <Link to="/trips" className="mt-4 inline-block text-[15px] font-semibold text-signal-200 hover:text-white">Open My trips</Link>
          </div>
          <Button variant="outline" className="w-full" onClick={async () => { await logout(); navigate('/'); }}>Sign out</Button>
        </aside>
      </div>
    </div>
  );
}
