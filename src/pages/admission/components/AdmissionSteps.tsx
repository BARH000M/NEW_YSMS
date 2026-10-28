import { useTranslation } from 'react-i18next';

const steps = ['1', '2', '3'];

export default function AdmissionSteps() {
  const { t } = useTranslation();

  return (
    <section className="bg-background-50 py-14 md:py-20 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <h2 className="font-heading text-2xl md:text-3xl">{t('admission.steps.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8">
          {steps.map((step) => (
            <div key={step} className="relative bg-background-100 border border-background-200 rounded-lg p-6">
              <span className="w-11 h-11 flex items-center justify-center rounded-full bg-accent-500 text-foreground-950 font-heading text-lg">
                {step}
              </span>
              <h3 className="font-semibold text-base mt-4 text-foreground-950">{t(`admission.steps.${step}.title`)}</h3>
              <p className="text-sm text-foreground-600 mt-2 leading-relaxed">{t(`admission.steps.${step}.desc`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}