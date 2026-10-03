import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Generic data-fetching hook for admin pages.
 *
 * @param {() => Promise<any>} fetcher  Function that returns the payload to store.
 * @param {object} options
 * @param {boolean} [options.enabled=true]  Set false to skip the initial request.
 * @param {boolean} [options.autoReload=true]  Re-run when fetcher identity changes.
 */
export default function useAsync(fetcher, { enabled = true, autoReload = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      setData(result);
    } catch (err) {
      setError(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    load();
  }, [load, enabled, autoReload]);

  return { data, loading, error, setData, reload: load };
}
