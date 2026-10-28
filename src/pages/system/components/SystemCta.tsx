import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export default function SystemCta() {
  const { t } = useTranslation();

  return (
    <section className="bg-primary-700 py-14 md:py-20 px-4 md:px-6">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
        <div className="max-w-2xl">
          <h2 className="font-heading text-background-50 text-2xl md:text-4xl leading-tight">{t('system.cta.title')}</h2>
          <p className="text-background-100 text-sm md:text-base mt-3 leading-relaxed">{t('system.cta.subtitle')}</p>
          <p className="text-xs text-accent-300 mt-4">{t('system.cta.note')}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 shrink-0">
          <Link
            to="/admission"
            className="inline-flex items-center justify-center bg-accent-500 hover:bg-accent-400 text-foreground-950 text-sm font-semibold px-6 py-3.5 rounded-md whitespace-nowrap cursor-pointer transition-colors"
          >
            {t('system.cta.primary')}
            <span className="w-4 h-4 inline-flex items-center justify-center ms-2"><i className="ri-arrow-right-line" /></span>
          </Link>
          <Link
            to="/contact"
            className="inline-flex items-center justify-center border border-background-50/50 hover:bg-background-50/10 text-background-50 text-sm font-semibold px-6 py-3.5 rounded-md whitespace-nowrap cursor-pointer transition-colors"
          >
            {t('system.cta.secondary')}
          </Link>
        </div>
      </div>
    </section>
  );
}