import { useCallback, useEffect, useRef, useState } from 'react';
import { useConsoleRefresh } from '@/components/app/ConsoleRefresh';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Small fetch wrapper every screen uses.
 * Guarantees the page can show a real error + retry instead of an endless spinner.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const hasData = useRef(false);

  const reload = useCallback(() => setTick((n) => n + 1), []);

  // Pull-to-refresh on the console: every screen joins automatically.
  const refresh = useConsoleRefresh();
  const register = refresh?.register;
  const reportError = refresh?.reportError;
  useEffect(() => {
    if (!register) return undefined;
    return register(reload);
  }, [register, reload]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    loader()
      .then((result) => {
        if (!alive) return;
        hasData.current = true;
        setData(result);
        if (reportError) reportError(null);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        const message = err instanceof Error ? err.message : 'Unexpected error';
        // A failed refresh keeps the last good data on screen and only shows the
        // inline banner; a first-load failure gets the full error card.
        if (hasData.current) {
          if (reportError) reportError(message);
          return;
        }
        setData(null);
        setError(message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  return { data, loading, error, reload };
}