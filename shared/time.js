// India Standard Time helpers. FlyWise covers Indian domestic routes, so "today" and
// "morning" always mean IST, whatever time zone the server itself runs in.
export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// "2026-11-25" for the IST calendar day that contains the given instant (number, Date, or string).
export const istDay = (val = Date.now()) => {
  const ms = typeof val === 'number' ? val : new Date(val).getTime();
  if (Number.isNaN(ms)) return new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10);
  return new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10);
};

// Hour of day (0-23) in IST for a Date or ISO string.
export const istHour = (date) => new Date(new Date(date).getTime() + IST_OFFSET_MS).getUTCHours();
