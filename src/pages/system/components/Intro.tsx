import { useTranslation } from 'react-i18next';
import { systemStats } from '@/mocks/systemShowcase';

export default function Intro() {
  const { t } = useTranslation();

  return (
    <section className="bg-background-50 py-14 md:py-20 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 lg:gap-16 items-start">
          <div>
            <span className="text-xs font-semibold tracking-widest uppercase text-primary-600">{t('system.intro.eyebrow')}</span>
            <h2 className="font-heading text-2xl md:text-4xl mt-3 leading-tight">{t('system.intro.title')}</h2>
          </div>
          <p className="text-sm md:text-base text-foreground-600 leading-relaxed lg:pt-8">{t('system.intro.body')}</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mt-10 md:mt-14">
          {systemStats.map((key, index) => (
            <div
              key={key}
              className="bg-background-100 border border-background-200 rounded-lg p-4 md:p-6 flex flex-col justify-between min-h-[110px] md:min-h-[130px]"
            >
              <span className="text-[10px] font-semibold text-foreground-400 tabular-nums">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <span className="font-heading text-2xl md:text-3xl text-primary-600 block leading-none">
                  {t(`system.stats.${key}.value`)}
                </span>
                <span className="text-xs md:text-sm text-foreground-600 mt-2 block">{t(`system.stats.${key}.label`)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}