import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, setLanguage, type Language } from '@/i18n';

const LABELS: Record<Language, string> = {
  ar: 'العربية',
  en: 'English',
  zh: '中文',
};

interface Props {
  tone?: 'light' | 'dark';
}

export default function LanguageSwitcher({ tone = 'dark' }: Props) {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const current: Language = (SUPPORTED_LANGUAGES as readonly string[]).includes(i18n.language)
    ? (i18n.language as Language)
    : 'ar';

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const lightStyles = tone === 'light';

  const change = (lang: Language) => {
    setLanguage(lang);
    setOpen(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={t('lang.switch')}
        aria-expanded={open}
        className={`flex items-center gap-2 h-9 px-3 rounded-full border text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
          lightStyles
            ? 'border-background-50/50 text-background-50 hover:bg-background-50/15'
            : 'border-background-300 bg-background-50 text-foreground-800 hover:border-primary-400'
        }`}
      >
        <span className="w-4 h-4 flex items-center justify-center"><i className="ri-global-line" /></span>
        <span>{LABELS[current]}</span>
        <span className="w-4 h-4 flex items-center justify-center"><i className={open ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} /></span>
      </button>
      {open && (
        <div className="absolute end-0 mt-2 w-40 bg-background-50 border border-background-200 rounded-lg py-1 z-[60]">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => change(lang)}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-background-100 ${
                current === lang ? 'text-primary-600 font-semibold' : 'text-foreground-800'
              }`}
            >
              <span>{LABELS[lang]}</span>
              {current === lang && <span className="w-4 h-4 flex items-center justify-center"><i className="ri-check-line" /></span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}