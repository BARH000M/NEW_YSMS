interface MobileFabProps {
  label: string;
  icon?: string;
  onClick: () => void;
}

/**
 * Floating action button for phones only. Sits above the console tab bar so the
 * primary "add" action is always inside one-thumb reach.
 */
export default function MobileFab({ label, icon = 'ri-add-line', onClick }: MobileFabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="md:hidden fixed end-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 w-14 h-14 rounded-full bg-primary-500 text-background-50 border border-primary-600 flex items-center justify-center cursor-pointer active:bg-primary-600"
    >
      <i className={`${icon} text-2xl`} />
    </button>
  );
}