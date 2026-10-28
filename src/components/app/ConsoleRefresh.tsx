import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, TouchEvent as ReactTouchEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

interface ConsoleRefreshValue {
  /** Pages register their reload function so a pull gesture can re-run it. */
  register: (reload: () => void) => () => void;
  /** A background refresh failed while data was already on screen. */
  reportError: (message: string | null) => void;
  trigger: () => void;
}

const ConsoleRefreshContext = createContext<ConsoleRefreshValue | null>(null);

/** Optional so shared hooks keep working outside the console shell. */
export function useConsoleRefresh() {
  return useContext(ConsoleRefreshContext);
}

const THRESHOLD = 64;
const MAX_PULL = 96;

/**
 * Wraps the console content area and adds:
 * - a pull-to-refresh gesture (touch devices, only at the top of the page)
 * - a compact banner when a refresh fails but stale data is still visible
 * Every page that loads through `useAsync` participates automatically.
 */
export default function ConsoleRefreshProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const location = useLocation();
  const reloads = useRef(new Map<string, () => void>());
  const keys = useRef(0);
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = useCallback((reload: () => void) => {
    keys.current += 1;
    const key = `r${keys.current}`;
    reloads.current.set(key, reload);
    return () => {
      reloads.current.delete(key);
    };
  }, []);

  const reportError = useCallback((message: string | null) => {
    setError((current) => {
      if (message === null) return current === null ? current : null;
      return current === message ? current : message;
    });
  }, []);

  // A banner from the previous screen should not follow the user around.
  useEffect(() => {
    setError(null);
    setPull(0);
  }, [location.pathname]);

  const trigger = useCallback(() => {
    if (reloads.current.size > 0) reloads.current.forEach((reload) => reload());
    setError(null);
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 900);
  }, []);

  const onTouchStart = (event: ReactTouchEvent) => {
    if (window.scrollY > 2 || refreshing) return;
    startY.current = event.touches[0]?.clientY ?? null;
  };

  const onTouchMove = (event: ReactTouchEvent) => {
    if (startY.current === null) return;
    const delta = (event.touches[0]?.clientY ?? 0) - startY.current;
    if (delta <= 0) {
      setPull(0);
      return;
    }
    // Rubber-band feel: the further you drag, the harder it gets.
    setPull(Math.min(MAX_PULL, delta * 0.55));
  };

  const onTouchEnd = () => {
    if (startY.current === null) return;
    startY.current = null;
    const travelled = pull;
    setPull(0);
    if (travelled >= THRESHOLD) trigger();
  };

  const value = useMemo<ConsoleRefreshValue>(
    () => ({ register, reportError, trigger }),
    [register, reportError, trigger],
  );

  const label = refreshing
    ? t('app.common.refreshing')
    : pull >= THRESHOLD
      ? t('app.common.pullRelease')
      : t('app.common.pullRefresh');

  const visible = pull > 0 || refreshing;
  const offset = refreshing ? THRESHOLD : pull;

  return (
    <ConsoleRefreshContext.Provider value={value}>
      {error ? (
        <div className="flex items-start gap-2 bg-accent-100 border border-accent-300 text-accent-950 rounded-lg px-3 py-2.5 mb-3">
          <span className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
            <i className="ri-wifi-off-line text-sm" />
          </span>
          <p className="text-[11px] leading-relaxed flex-1 min-w-0 break-words">
            {t('app.common.refreshFailed')} · {error}
          </p>
          <button
            type="button"
            onClick={trigger}
            className="shrink-0 inline-flex items-center gap-1 rounded-md bg-accent-500 text-foreground-950 text-[11px] font-semibold px-2.5 py-1 whitespace-nowrap cursor-pointer"
          >
            <i className="ri-refresh-line" />
            {t('app.common.retry')}
          </button>
          <button
            type="button"
            onClick={() => reportError(null)}
            aria-label={t('app.common.close')}
            className="w-5 h-5 shrink-0 flex items-center justify-center text-accent-900 cursor-pointer"
          >
            <i className="ri-close-line text-sm" />
          </button>
        </div>
      ) : null}

      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        className="relative"
      >
        <div
          className="lg:hidden flex items-center justify-center overflow-hidden transition-[height] duration-150 text-foreground-500"
          style={{ height: visible ? `${Math.max(offset, 32)}px` : 0 }}
          aria-hidden={!visible}
        >
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold">
            <i
              className={`${refreshing ? 'ri-loader-4-line animate-spin' : pull >= THRESHOLD ? 'ri-arrow-up-line' : 'ri-arrow-down-line'} text-sm`}
            />
            {label}
          </span>
        </div>
        {children}
      </div>
    </ConsoleRefreshContext.Provider>
  );
}

/** Registration helper kept here so `useAsync` stays dependency-free. */
export function useConsoleReloadRegistration(reload: () => void) {
  const ctx = useConsoleRefresh();
  const register = ctx?.register;

  useEffect(() => {
    if (!register) return undefined;
    return register(reload);
  }, [register, reload]);
}