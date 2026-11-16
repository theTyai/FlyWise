import { useId, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button, Field, Notice } from '@shared/ui/index.jsx';
import { useAuth } from '../context/AuthContext.jsx';

function AuthShell({ title, lead, children, footer }) {
  return (
    <div className="mx-auto max-w-md px-5 py-12 sm:py-16">
      <div className="rounded-3xl bg-white p-7 shadow-pass sm:p-9">
        <h1 className="text-[1.75rem] leading-tight font-bold tracking-tight">{title}</h1>
        <p className="mt-1.5 text-ink-soft">{lead}</p>
        <div className="mt-6">{children}</div>
      </div>
      <p className="mt-5 text-center text-[15px] text-ink-soft">{footer}</p>
    </div>
  );
}

function useAuthForm(action) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const destination = location.state?.from || '/';

  async function run(values) {
    setBusy(true); setError(null); setFieldErrors({});
    try {
      await action(values);
      navigate(destination, { replace: true });
    } catch (failure) {
      setFieldErrors(Object.fromEntries((failure.details || []).map((d) => [d.field, d.message])));
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return { user, busy, error, fieldErrors, run, destination, state: location.state };
}

export function Login() {
  const { login } = useAuth();
  const [values, setValues] = useState({ email: '', password: '' });
  const form = useAuthForm(({ email, password }) => login(email, password));
  const ids = { email: useId(), password: useId() };
  if (form.user) return <Navigate to={form.destination} replace />;

  return (
    <AuthShell
      title="Sign in" lead="See your trips and send booking requests."
      footer={<>New to FlyWise? <Link to="/register" state={form.state} className="font-semibold text-signal-600 hover:text-signal-700">Create an account</Link></>}
    >
      <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); form.run(values); }} noValidate>
        {form.error && <Notice tone="error">{form.error}</Notice>}
        <Field label="Email" htmlFor={ids.email} error={form.fieldErrors.email}>
          <input id={ids.email} type="email" autoComplete="email" required className="field" value={values.email}
            aria-invalid={Boolean(form.fieldErrors.email)} onChange={(event) => setValues({ ...values, email: event.target.value })} />
        </Field>
        <Field label="Password" htmlFor={ids.password} error={form.fieldErrors.password}>
          <input id={ids.password} type="password" autoComplete="current-password" required className="field" value={values.password}
            aria-invalid={Boolean(form.fieldErrors.password)} onChange={(event) => setValues({ ...values, password: event.target.value })} />
        </Field>
        <Button type="submit" size="lg" loading={form.busy} className="w-full">Sign in</Button>
      </form>
    </AuthShell>
  );
}

export function Register() {
  const { register } = useAuth();
  const [values, setValues] = useState({ name: '', email: '', phone: '', password: '' });
  const form = useAuthForm(register);
  const ids = { name: useId(), email: useId(), phone: useId(), password: useId() };
  if (form.user) return <Navigate to={form.destination} replace />;
  const bind = (key) => ({
    value: values[key], 'aria-invalid': Boolean(form.fieldErrors[key]),
    onChange: (event) => setValues({ ...values, [key]: event.target.value }),
  });

  return (
    <AuthShell
      title="Create your account" lead="It takes a minute. You need one to request a booking."
      footer={<>Already have an account? <Link to="/login" state={form.state} className="font-semibold text-signal-600 hover:text-signal-700">Sign in</Link></>}
    >
      <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); form.run(values); }} noValidate>
        {form.error && <Notice tone="error">{form.error}</Notice>}
        <Field label="Full name" htmlFor={ids.name} error={form.fieldErrors.name}>
          <input id={ids.name} autoComplete="name" required className="field" {...bind('name')} />
        </Field>
        <Field label="Email" htmlFor={ids.email} error={form.fieldErrors.email}>
          <input id={ids.email} type="email" autoComplete="email" required className="field" {...bind('email')} />
        </Field>
        <Field label="Phone number" htmlFor={ids.phone} error={form.fieldErrors.phone} hint="Optional. Digits only, with country code if you like.">
          <input id={ids.phone} type="tel" autoComplete="tel" className="field" {...bind('phone')} />
        </Field>
        <Field label="Password" htmlFor={ids.password} error={form.fieldErrors.password} hint="At least 8 characters.">
          <input id={ids.password} type="password" autoComplete="new-password" required className="field" {...bind('password')} />
        </Field>
        <Button type="submit" size="lg" loading={form.busy} className="w-full">Create account</Button>
      </form>
    </AuthShell>
  );
}
