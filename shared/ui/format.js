// Display formatting shared by both frontends. FlyWise covers Indian domestic
// routes, so every time is shown in India Standard Time.
const TZ = 'Asia/Kolkata';

const timeFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ });
const dayFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ });
const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ });
const stampFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ });

export const time = (value) => (value ? timeFmt.format(new Date(value)) : '');
export const day = (value) => (value ? dayFmt.format(new Date(value)) : '');
export const date = (value) => (value ? dateFmt.format(new Date(value)) : '');
export const stamp = (value) => (value ? stampFmt.format(new Date(value)) : '');

// "2026-11-25" (a calendar date with no time) -> "Wed 25 Nov"
export const dayFromIso = (iso) => (iso ? dayFmt.format(new Date(`${iso}T12:00:00+05:30`)) : '');

export function money(amount, currency = 'INR') {
  if (amount === null || amount === undefined) return '';
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount)}`;
  }
}

export function duration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m}m`;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

export const stopsText = (stops) => (stops === 0 ? 'Non-stop' : stops === 1 ? '1 stop' : `${stops} stops`);

export function ago(value) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days < 30 ? `${days} d ago` : date(value);
}

// Today's date in IST as YYYY-MM-DD, optionally shifted by a number of days.
export function isoDate(offsetDays = 0) {
  const shifted = new Date(Date.now() + 5.5 * 3600 * 1000 + offsetDays * 86400000);
  return shifted.toISOString().slice(0, 10);
}
