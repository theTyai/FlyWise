import { useEffect, useId, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, MapPin, Plane, ShieldCheck, Sparkles, User as UserIcon } from 'lucide-react';
import { date } from '@shared/ui/format.js';
import { Button, Field, Notice } from '@shared/ui/index.jsx';
import { errorsByField } from '../components/TravellerFields.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { updateProfile } from '../services/auth.service.js';
import { listBookings } from '../services/booking.service.js';

export default function Profile() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();

  const [values, setValues] = useState({
    name: user.name || '',
    phone: user.phone || '',
    gender: user.gender || 'MALE',
    dateOfBirth: user.dateOfBirth || '',
    nationality: user.nationality || 'Indian',
    idType: user.idType || 'AADHAAR',
    line1: user.address?.line1 || '',
    city: user.address?.city || '',
    state: user.address?.state || '',
    pincode: user.address?.pincode || '',
  });

  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [counts, setCounts] = useState(null);

  const ids = {
    name: useId(),
    phone: useId(),
    email: useId(),
    gender: useId(),
    dob: useId(),
    nationality: useId(),
    idType: useId(),
    line1: useId(),
    city: useId(),
    state: useId(),
    pincode: useId(),
  };

  useEffect(() => {
    listBookings()
      .then((data) => {
        const by = (fn) => data.bookings.filter(fn).length;
        setCounts({
          total: data.bookings.length,
          confirmed: by((b) => b.status === 'CONFIRMED'),
          cancelled: by((b) => b.status === 'CANCELLED'),
        });
      })
      .catch(() => {});
  }, []);

  // Compute profile completion percentage
  const completionPercentage = useMemo(() => {
    const required = [
      values.name,
      values.phone,
      values.gender,
      values.dateOfBirth,
      values.city,
      values.pincode,
    ];
    const filled = required.filter((v) => Boolean(v && String(v).trim())).length;
    return Math.round((filled / required.length) * 100);
  }, [values]);

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage(null);

    const payload = {
      name: values.name.trim(),
      phone: values.phone.trim(),
      gender: values.gender,
      dateOfBirth: values.dateOfBirth || undefined,
      nationality: values.nationality,
      idType: values.idType,
      address: {
        line1: values.line1.trim(),
        city: values.city.trim(),
        state: values.state.trim(),
        pincode: values.pincode.trim(),
      },
    };

    try {
      const data = await updateProfile(payload);
      setUser(data.user);
      setMessage({ tone: 'success', text: 'Profile information updated successfully.' });
    } catch (failure) {
      setErrors(errorsByField(failure));
      setMessage({ tone: 'error', text: failure.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">Traveller Profile</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Manage your personal details, travel identity, and residential address.
          </p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-signal-50 px-3 py-1 text-xs font-semibold text-signal-700 border border-signal-100">
          <Sparkles className="size-3.5" /> Auto-fills New Bookings
        </span>
      </div>

      {/* Completion Meter Bar */}
      <div className="mt-6 rounded-2xl bg-white p-5 border border-line shadow-pass">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-ink-faint">
            Profile Completion Status
          </span>
          <span className="board text-sm font-bold text-signal-600">
            {completionPercentage}% Complete
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-mist overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-signal-600 to-mint-600 transition-all duration-500"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        {completionPercentage < 100 && (
          <p className="mt-2 text-xs text-ink-soft">
            Complete your phone number, gender, date of birth, and city for 1-click checkout.
          </p>
        )}
      </div>

      <div className="mt-8 grid items-start gap-8 md:grid-cols-[minmax(0,1fr)_18rem]">
        <form onSubmit={save} noValidate className="rounded-3xl bg-white p-6 shadow-pass sm:p-8 border border-line space-y-8">
          {message && <Notice tone={message.tone}>{message.text}</Notice>}

          {/* Section 1: Personal Details */}
          <div>
            <h2 className="text-lg font-bold tracking-tight text-ink flex items-center gap-2">
              <UserIcon className="size-4 text-signal-600" /> Personal Details
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Full Name" htmlFor={ids.name} error={errors.name}>
                <input
                  id={ids.name}
                  className="field"
                  autoComplete="name"
                  value={values.name}
                  aria-invalid={Boolean(errors.name)}
                  onChange={(e) => setValues({ ...values, name: e.target.value })}
                />
              </Field>

              <Field label="Phone Number" htmlFor={ids.phone} error={errors.phone} hint="Required for flight alerts & boarding SMS">
                <input
                  id={ids.phone}
                  type="tel"
                  className="field"
                  autoComplete="tel"
                  value={values.phone}
                  aria-invalid={Boolean(errors.phone)}
                  onChange={(e) => setValues({ ...values, phone: e.target.value })}
                />
              </Field>

              <Field label="Email" htmlFor={ids.email} hint="Account identifier cannot be altered">
                <input id={ids.email} className="field bg-mist text-ink-soft cursor-not-allowed" value={user.email} readOnly />
              </Field>

              <Field label="Gender" htmlFor={ids.gender}>
                <select
                  id={ids.gender}
                  className="field"
                  value={values.gender}
                  onChange={(e) => setValues({ ...values, gender: e.target.value })}
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </Field>

              <Field label="Date of Birth" htmlFor={ids.dob} error={errors.dateOfBirth}>
                <input
                  id={ids.dob}
                  type="date"
                  className="field"
                  value={values.dateOfBirth}
                  onChange={(e) => setValues({ ...values, dateOfBirth: e.target.value })}
                />
              </Field>

              <Field label="Nationality" htmlFor={ids.nationality}>
                <input
                  id={ids.nationality}
                  className="field"
                  value={values.nationality}
                  onChange={(e) => setValues({ ...values, nationality: e.target.value })}
                />
              </Field>
            </div>
          </div>

          {/* Section 2: Travel Identity & Documents */}
          <div className="border-t border-line pt-6">
            <h2 className="text-lg font-bold tracking-tight text-ink flex items-center gap-2">
              <ShieldCheck className="size-4 text-mint-700" /> Travel Identification
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Primary Travel ID Type" htmlFor={ids.idType}>
                <select
                  id={ids.idType}
                  className="field"
                  value={values.idType}
                  onChange={(e) => setValues({ ...values, idType: e.target.value })}
                >
                  <option value="AADHAAR">Aadhaar Card (India)</option>
                  <option value="PAN">PAN Card</option>
                  <option value="PASSPORT">Passport</option>
                  <option value="VOTER_ID">Voter ID</option>
                </select>
              </Field>
            </div>
          </div>

          {/* Section 3: Residential Address */}
          <div className="border-t border-line pt-6">
            <h2 className="text-lg font-bold tracking-tight text-ink flex items-center gap-2">
              <MapPin className="size-4 text-flare-700" /> Residential Address
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Street Address" htmlFor={ids.line1}>
                  <input
                    id={ids.line1}
                    className="field"
                    placeholder="House / Flat no, Street, Area"
                    value={values.line1}
                    onChange={(e) => setValues({ ...values, line1: e.target.value })}
                  />
                </Field>
              </div>

              <Field label="City" htmlFor={ids.city}>
                <input
                  id={ids.city}
                  className="field"
                  value={values.city}
                  onChange={(e) => setValues({ ...values, city: e.target.value })}
                />
              </Field>

              <Field label="State" htmlFor={ids.state}>
                <input
                  id={ids.state}
                  className="field"
                  value={values.state}
                  onChange={(e) => setValues({ ...values, state: e.target.value })}
                />
              </Field>

              <Field label="Pincode" htmlFor={ids.pincode}>
                <input
                  id={ids.pincode}
                  className="field"
                  maxLength={10}
                  value={values.pincode}
                  onChange={(e) => setValues({ ...values, pincode: e.target.value })}
                />
              </Field>
            </div>
          </div>

          <div className="flex justify-end border-t border-line pt-5">
            <Button type="submit" loading={busy} className="btn-gradient px-6 shadow-sm">
              Save Profile Changes
            </Button>
          </div>
        </form>

        <aside className="space-y-4">
          <div className="rounded-3xl bg-night-900 p-6 text-white shadow-pass">
            <h2 className="text-xs font-bold uppercase tracking-wider text-white/60">Your Account Overview</h2>
            <p className="mt-1 text-sm font-semibold">{user.name}</p>
            <p className="text-xs text-white/70">Member since {date(user.createdAt)}</p>

            <dl className="mt-6 space-y-3 border-t border-white/10 pt-4 text-xs">
              <div className="flex items-baseline justify-between">
                <dt className="text-white/70">Total Reservations</dt>
                <dd className="board text-xl font-bold">{counts?.total ?? '-'}</dd>
              </div>
              <div className="flex items-baseline justify-between">
                <dt className="text-mint-700 font-semibold">Confirmed Flights</dt>
                <dd className="board text-xl font-bold text-mint-700">{counts?.confirmed ?? '-'}</dd>
              </div>
              <div className="flex items-baseline justify-between">
                <dt className="text-white/70">Cancelled</dt>
                <dd className="board text-xl font-bold text-white/80">{counts?.cancelled ?? '-'}</dd>
              </div>
            </dl>

            <Link
              to="/trips"
              className="mt-6 block rounded-xl bg-white/10 py-2.5 text-center text-xs font-bold text-signal-200 hover:bg-white/15 transition-colors"
            >
              Open My Trips
            </Link>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={async () => {
              await logout();
              navigate('/');
            }}
          >
            Sign Out
          </Button>
        </aside>
      </div>
    </div>
  );
}
