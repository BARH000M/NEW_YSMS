import type { ReactNode } from 'react';

export default function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        aria-label="close"
        onClick={onClose}
        className="absolute inset-0 bg-foreground-950/50 cursor-pointer"
      />
      <div className="relative w-full sm:max-w-xl bg-background-50 border border-background-300 rounded-t-lg sm:rounded-lg max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 px-4 md:px-5 py-3.5 border-b border-background-200 sticky top-0 bg-background-50 z-10">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground-950 truncate">{title}</h2>
            {subtitle ? <p className="text-[11px] text-foreground-500 mt-0.5">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-md border border-background-300 text-foreground-700 cursor-pointer"
            aria-label="close"
          >
            <i className="ri-close-line" />
          </button>
        </div>
        <div className="p-4 md:p-5">{children}</div>
      </div>
    </div>
  );
}