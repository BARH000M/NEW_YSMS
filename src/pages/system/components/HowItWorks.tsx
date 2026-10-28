import { useTranslation } from 'react-i18next';
import { systemHowSteps } from '@/mocks/systemShowcase';

export default function HowItWorks() {
  const { t } = useTranslation();

  return (
    <section className="bg-primary-950 py-16 md:py-24 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="max-w-xl">
            <span className="text-xs font-semibold tracking-widest uppercase text-accent-400">{t('system.how.eyebrow')}</span>
            <h2 className="font-heading text-background-50 text-2xl md:text-4xl mt-3 leading-tight">{t('system.how.title')}</h2>
          </div>
          <p className="text-sm text-background-200 max-w-md leading-relaxed">{t('system.how.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mt-10 md:mt-14">
          {systemHowSteps.map((step, index) => (
            <div key={step} className="relative">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-accent-500 text-foreground-950 font-heading text-lg">
                  {step}
                </span>
                {index < systemHowSteps.length - 1 && (
                  <span className="hidden md:block flex-1 h-px bg-background-50/25" aria-hidden="true" />
                )}
              </div>
              <h3 className="font-heading text-background-50 text-lg mt-4">{t(`system.how.steps.${step}.title`)}</h3>
              <p className="text-sm text-background-300 mt-2 leading-relaxed max-w-xs">{t(`system.how.steps.${step}.desc`)}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 md:mt-12 bg-background-50/10 border border-background-50/15 rounded-lg p-5 md:p-7 flex flex-col sm:flex-row sm:items-center gap-4">
          <span className="w-12 h-12 shrink-0 flex items-center justify-center rounded-md bg-accent-500 text-foreground-950 text-2xl">
            <i className="ri-dashboard-3-line" />
          </span>
          <div>
            <h3 className="font-heading text-background-50 text-lg leading-snug">{t('system.how.center.title')}</h3>
            <p className="text-sm text-background-200 mt-1 leading-relaxed">{t('system.how.center.desc')}</p>
          </div>
        </div>
      </div>
    </section>
  );
}