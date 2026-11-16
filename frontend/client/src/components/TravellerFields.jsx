import { isoDate } from '@shared/ui/format.js';
import { Field } from '@shared/ui/index.jsx';

export const emptyTraveller = () => ({ firstName: '', lastName: '', dateOfBirth: '', gender: '' });

// Turn the API's validation details ("passengers.0.firstName") into a lookup.
export const errorsByField = (failure) => Object.fromEntries((failure?.details || []).map((d) => [d.field, d.message]));

// Check the form in the browser first, so the traveller sees every problem at once.
export function checkTravellers(passengers, contact) {
  const errors = {};
  passengers.forEach((p, i) => {
    if (!p.firstName.trim()) errors[`passengers.${i}.firstName`] = 'Enter the first name';
    if (!p.lastName.trim()) errors[`passengers.${i}.lastName`] = 'Enter the last name';
    if (!p.dateOfBirth) errors[`passengers.${i}.dateOfBirth`] = 'Enter the date of birth';
    if (!p.gender) errors[`passengers.${i}.gender`] = 'Choose a gender';
  });
  if (!/^\S+@\S+\.\S+$/.test(contact.email.trim())) errors['contact.email'] = 'Enter a valid contact email';
  if (!/^\+?[0-9]{7,15}$/.test(contact.phone.trim())) errors['contact.phone'] = 'Enter a phone number with 7 to 15 digits';
  return errors;
}

export function TravellerFields({ passengers, contact, onPassengers, onContact, errors = {}, idPrefix = 'tr' }) {
  const setPassenger = (index, patch) => onPassengers(passengers.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  return (
    <div className="space-y-7">
      {passengers.map((p, index) => {
        const id = (name) => `${idPrefix}-${index}-${name}`;
        const err = (name) => errors[`passengers.${index}.${name}`];
        return (
          <fieldset key={index}>
            <legend className="text-[17px] font-semibold">Traveller {passengers.length > 1 ? index + 1 : ''}</legend>
            <p className="text-sm text-ink-faint">Enter names as they appear on government photo ID.</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field label="First name" htmlFor={id('first')} error={err('firstName')}>
                <input id={id('first')} className="field" autoComplete="off" value={p.firstName} aria-invalid={Boolean(err('firstName'))}
                  onChange={(event) => setPassenger(index, { firstName: event.target.value })} />
              </Field>
              <Field label="Last name" htmlFor={id('last')} error={err('lastName')}>
                <input id={id('last')} className="field" autoComplete="off" value={p.lastName} aria-invalid={Boolean(err('lastName'))}
                  onChange={(event) => setPassenger(index, { lastName: event.target.value })} />
              </Field>
              <Field label="Date of birth" htmlFor={id('dob')} error={err('dateOfBirth')}>
                <input id={id('dob')} type="date" className="field" max={isoDate(0)} value={p.dateOfBirth} aria-invalid={Boolean(err('dateOfBirth'))}
                  onChange={(event) => setPassenger(index, { dateOfBirth: event.target.value })} />
              </Field>
              <Field label="Gender" htmlFor={id('gender')} error={err('gender')}>
                <select id={id('gender')} className="field" value={p.gender} aria-invalid={Boolean(err('gender'))}
                  onChange={(event) => setPassenger(index, { gender: event.target.value })}>
                  <option value="">Choose</option>
                  <option value="FEMALE">Female</option>
                  <option value="MALE">Male</option>
                  <option value="OTHER">Other</option>
                </select>
              </Field>
            </div>
          </fieldset>
        );
      })}
      <fieldset>
        <legend className="text-[17px] font-semibold">Contact for this booking</legend>
        <p className="text-sm text-ink-faint">The desk uses these if there is a question about your request.</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field label="Email" htmlFor={`${idPrefix}-email`} error={errors['contact.email']}>
            <input id={`${idPrefix}-email`} type="email" className="field" autoComplete="email" value={contact.email}
              aria-invalid={Boolean(errors['contact.email'])} onChange={(event) => onContact({ ...contact, email: event.target.value })} />
          </Field>
          <Field label="Phone number" htmlFor={`${idPrefix}-phone`} error={errors['contact.phone']}>
            <input id={`${idPrefix}-phone`} type="tel" className="field" autoComplete="tel" value={contact.phone}
              aria-invalid={Boolean(errors['contact.phone'])} onChange={(event) => onContact({ ...contact, phone: event.target.value })} />
          </Field>
        </div>
      </fieldset>
    </div>
  );
}
