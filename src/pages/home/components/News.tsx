import { useTranslation } from 'react-i18next';
import { newsMeta } from '@/mocks/college';
import { formatDate } from '@/utils/date';

export default function News() {
  const { t, i18n } = useTranslation();

  return (
    <section id="news" className="scroll-mt-28 bg-background-50 py-16 md:py-24 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <span className="text-xs font-semibold tracking-widest uppercase text-primary-600">{t('news.eyebrow')}</span>
        <h2 className="font-heading text-2xl md:text-4xl mt-3 mb-10">{t('news.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {newsMeta.map((item) => (
            <article key={item.id} className="bg-background-100 rounded-lg overflow-hidden border border-background-200">
              <div className="w-full h-52 overflow-hidden">
                <img
                  src={item.image}
                  alt={t(`news.items.${item.id}.title`)}
                  title={t(`news.items.${item.id}.title`)}
                  className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-5">
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="bg-accent-100 text-accent-900 px-3 py-1 rounded-full font-medium">
                    {t(`news.items.${item.id}.tag`)}
                  </span>
                  <span className="text-foreground-500">{formatDate(item.date, i18n.language)}</span>
                </div>
                <h3 className="font-semibold text-base mt-3 leading-snug">{t(`news.items.${item.id}.title`)}</h3>
                <p className="text-sm text-foreground-600 mt-2 leading-relaxed">{t(`news.items.${item.id}.excerpt`)}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}