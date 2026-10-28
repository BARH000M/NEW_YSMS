import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

export default function PrintSheet({
  title,
  hint,
  onClose,
  children,
}: {
  title: string;
  hint?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return createPortal(
    <div className="print-root fixed inset-0 z-[60] overflow-y-auto bg-foreground-950/50">
      <div className="mx-auto w-full max-w-[860px] px-3 py-6 sm:px-6">
        <div className="print-hide flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 rounded-lg bg-background-50 border border-background-300 px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground-950 truncate">{title}</p>
            {hint ? <p className="text-[11px] text-foreground-500 mt-0.5">{hint}</p> : null}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-background-50 text-xs font-semibold px-3.5 py-2 rounded-md whitespace-nowrap cursor-pointer"
            >
              <i className="ri-printer-line" />
              {t('app.print.print')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 border border-background-300 text-foreground-800 text-xs font-semibold px-3.5 py-2 rounded-md whitespace-nowrap cursor-pointer"
            >
              <i className="ri-close-line" />
              {t('app.common.close')}
            </button>
          </div>
        </div>

        <div className="print-sheet bg-white rounded-lg border border-background-300 overflow-hidden">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}