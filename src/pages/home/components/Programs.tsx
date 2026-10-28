import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { programMeta } from '@/mocks/college';

export default function Programs() {
  const { t } = useTranslation();

  return (
    <section id="programs" className="scroll-mt-28 bg-background-100 py-16 md:py-24 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            <span className="text-xs font-semibold tracking-widest uppercase text-primary-600">{t('programs.eyebrow')}</span>
            <h2 className="font-heading text-2xl md:text-4xl mt-3">{t('programs.title')}</h2>
          </div>
          <p className="text-sm text-foreground-600 max-w-md leading-relaxed">{t('programs.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {programMeta.map((program) => (
            <article key={program.id} className="group bg-background-50 border border-background-200 rounded-lg overflow-hidden hover:border-primary-300 transition-colors">
              <div className="w-full h-44 overflow-hidden">
                <img
                  src={program.image}
                  alt={t(`programs.items.${program.id}.title`)}
                  title={t(`programs.items.${program.id}.title`)}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <span className="w-10 h-10 shrink-0 flex items-center justify-center rounded-md bg-primary-100 text-primary-600 text-lg">
                    <i className={program.icon} />
                  </span>
                  <h3 className="font-heading text-lg leading-snug">{t(`programs.items.${program.id}.title`)}</h3>
                </div>
                <p className="text-sm text-foreground-600 mt-3 leading-relaxed">{t(`programs.items.${program.id}.desc`)}</p>
                <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-background-200">
                  <span className="text-xs bg-secondary-100 text-secondary-900 px-3 py-1 rounded-full whitespace-nowrap">
                    <span className="w-3.5 h-3.5 inline-flex items-center justify-center me-1"><i className="ri-time-line" /></span>
                    {t(`programs.items.${program.id}.duration`)}
                  </span>
                  <Link to="/admission" className="text-sm font-semibold text-primary-600 whitespace-nowrap cursor-pointer hover:text-primary-700">
                    {t('programs.apply')}
                    <span className="w-4 h-4 inline-flex items-center justify-center ms-1"><i className="ri-arrow-right-line" /></span>
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}