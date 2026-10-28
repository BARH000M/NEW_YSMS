const SHIMMER = 'bg-background-200/90 animate-pulse';

/** Single shimmering bar used to compose every placeholder. */
export function SkeletonBar({ className = '' }: { className?: string }) {
  return <span className={`block rounded-md ${SHIMMER} ${className}`} />;
}

/** Placeholder for the page title + action row. */
export function SkeletonHeader() {
  return (
    <div className="flex flex-col gap-3 mb-4 md:mb-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <SkeletonBar className="h-5 w-44 md:w-56" />
        <SkeletonBar className="h-2.5 w-60 md:w-80 mt-2.5" />
      </div>
      <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
        <SkeletonBar className="h-9 w-9 md:w-28" />
        <SkeletonBar className="h-9 w-9 md:w-28" />
        <SkeletonBar className="h-9 w-24" />
      </div>
    </div>
  );
}

/** Placeholder for the stat tile row. */
export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-3 md:mb-4">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="bg-background-50 border border-background-200 rounded-lg p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <SkeletonBar className="h-2.5 w-16 md:w-20" />
              <SkeletonBar className="h-5 w-20 md:w-24 mt-2.5" />
            </div>
            <SkeletonBar className="h-9 w-9 rounded-lg shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Placeholder for a filter / toolbar card. */
export function SkeletonFilters() {
  return (
    <div className="bg-background-50 border border-background-200 rounded-lg p-3 md:p-4 mb-3 md:mb-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <SkeletonBar className="h-9 w-full sm:w-64" />
        <div className="flex flex-wrap items-center gap-1.5">
          <SkeletonBar className="h-7 w-16" />
          <SkeletonBar className="h-7 w-20" />
          <SkeletonBar className="h-7 w-14" />
          <SkeletonBar className="h-7 w-24" />
        </div>
      </div>
    </div>
  );
}

/** Placeholder rows that read like a list on phones and a table on desktop. */
export function SkeletonRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="bg-background-50 border border-background-200 rounded-lg divide-y divide-background-100">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="p-3 md:px-4 md:py-3.5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <SkeletonBar className="h-3 w-1/3 md:w-40" />
              <SkeletonBar className="h-2.5 w-1/4 md:w-28 mt-2" />
            </div>
            <SkeletonBar className="h-3 w-16 shrink-0" />
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            <SkeletonBar className="h-5 w-16" />
            <SkeletonBar className="h-5 w-20" />
            <SkeletonBar className="h-2.5 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Full page placeholder: header, stats, filters and list rows.
 * Used instead of a bare spinner so slow connections never flash an empty screen.
 */
export default function PageSkeleton({
  stats = 4,
  rows = 6,
  filters = true,
}: {
  stats?: number;
  rows?: number;
  filters?: boolean;
}) {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <SkeletonHeader />
      {stats > 0 ? <SkeletonStats count={stats} /> : null}
      {filters ? <SkeletonFilters /> : null}
      <SkeletonRows rows={rows} />
    </div>
  );
}