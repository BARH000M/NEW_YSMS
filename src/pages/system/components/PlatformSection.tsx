import { useTranslation } from 'react-i18next';
import { systemImages, systemPoints, systemSecurityPoints } from '@/mocks/systemShowcase';

export default function PlatformSection() {
  const { t } = useTranslation();

  return (
    <section className="bg-background-50 py-16 md:py-24 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-center">
          <div className="w-full h-[260px] md:h-[400px] rounded-lg overflow-hidden border border-background-200 bg-background-100">
            <img
              src={systemImages.dashboard}
              alt={t('system.platform.imageAlt')}
              title={t('system.platform.imageAlt')}
              className="w-full h-full object-cover object-top"
            />
          </div>

          <div>
            <span className="text-xs font-semibold tracking-widest uppercase text-primary-600">{t('system.platform.eyebrow')}</span>
            <h2 className="font-heading text-2xl md:text-4xl mt-3 leading-tight">{t('system.platform.title')}</h2>
            <p className="text-sm text-foreground-600 mt-4 leading-relaxed">{t('system.platform.subtitle')}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-7">
              {systemPoints.map((point) => (
                <div key={point}>
                  <span className="w-8 h-8 flex items-center justify-center rounded-md bg-accent-100 text-accent-800 text-sm mb-2">
                    <i className="ri-check-line" />
                  </span>
                  <h3 className="text-sm font-semibold text-foreground-900 leading-snug">{t(`system.platform.points.${point}.title`)}</h3>
                  <p className="text-xs text-foreground-600 mt-1 leading-relaxed">{t(`system.platform.points.${point}.desc`)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-background-100 border border-background-200 rounded-lg p-5 md:p-8 mt-12 md:mt-16">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
            <div className="max-w-xl">
              <span className="text-xs font-semibold tracking-widest uppercase text-secondary-700">{t('system.security.eyebrow')}</span>
              <h2 className="font-heading text-xl md:text-3xl mt-3 leading-tight">{t('system.security.title')}</h2>
              <p className="text-sm text-foreground-600 mt-3 leading-relaxed">{t('system.security.body')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-5 mt-7">
            {systemSecurityPoints.map((point) => (
              <div key={point} className="bg-background-50 border border-background-200 rounded-md p-4">
                <span className="w-9 h-9 flex items-center justify-center rounded-md bg-secondary-100 text-secondary-800">
                  <i className="ri-shield-check-line" />
                </span>
                <h3 className="text-sm font-semibold mt-3 leading-snug">{t(`system.security.points.${point}.title`)}</h3>
                <p className="text-xs text-foreground-600 mt-1 leading-relaxed">{t(`system.security.points.${point}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}