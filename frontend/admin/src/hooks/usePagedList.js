import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

// State for a searchable, paginated table. The search text and page number are kept in
// the URL (?q=...&page=2), so a list can be bookmarked, shared, and survives a refresh.
//
//   const list = usePagedList(({ q, page }) => listInventory({ q, page, limit: 15 }), { deps: [liveTick] });
//   list.data / list.loading / list.error   - what to render
//   list.go({ q: 'DEL', page: 1 })          - change the search or the page
//   list.reload()                           - fetch again after a change
//
// options.filters: extra values that belong in the URL and in every request (the status tab).
// options.deps:    anything else that should trigger a fresh fetch (liveTick from the socket).
export function usePagedList(fetchPage, { filters = {}, deps = [] } = {}) {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const page = Number(params.get('page')) || 1;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloads, setReloads] = useState(0);
  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    let live = true;
    setLoading(true);
    fetchPage({ ...filters, q, page })
      .then((result) => { if (live) { setData(result); setError(null); } })
      .catch((failure) => { if (live) setError(failure.message); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; }; // ignore a reply that arrives after the inputs changed
  }, [q, page, reloads, filterKey, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (patch) => {
    const next = { ...filters, q, page, ...patch };
    const out = {};
    for (const key of Object.keys(filters)) out[key] = next[key];
    if (next.q) out.q = next.q;
    if (next.page > 1) out.page = String(next.page);
    setParams(out);
  };

  return { q, page, data, loading, error, go, reload: () => setReloads((n) => n + 1), setData, setError };
}
