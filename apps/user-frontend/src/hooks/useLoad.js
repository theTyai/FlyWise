import { useEffect, useState } from 'react';

// Load data when the component appears and again whenever a value in "deps" changes
// (for example liveTick, which increments when the server pushes a booking update).
//  - A reply that arrives after the component moved on is ignored.
//  - While a reload is in flight the previous data stays on screen, so lists do not flicker.
// Returns { data, error, setData, setError }; data is null until the first reply.
export function useLoad(loader, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let live = true;
    loader()
      .then((result) => { if (live) { setData(result); setError(null); } })
      .catch((failure) => { if (live) setError(failure.message); });
    return () => { live = false; };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, error, setData, setError };
}
