import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

const services = [
  { id: 'admission', icon: 'ri-file-list-3-line', to: '/admission' },
  { id: 'complain', icon: 'ri-feedback-line', to: '/complain' },
  { id: 'contact', icon: 'ri-customer-service-2-line', to: '/contact' },
];

export default function ServicesCta() {
  const { t } = useTranslation();

  return (
    <section className="bg-primary-50 py-16 md:py-24 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-2xl">
          <span className="text-xs font-semibold tracking-widest uppercase text-primary-600">{t('cta.eyebrow')}</span>
          <h2 className="font-heading text-2xl md:text-4xl mt-3">{t('cta.title')}</h2>
          <p className="text-sm text-foreground-700 mt-4 leading-relaxed">{t('cta.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-10">
          {services.map((service) => (
            <Link
              key={service.id}
              to={service.to}
              className="group bg-background-50 border border-primary-100 rounded-lg p-6 flex flex-col hover:border-primary-300 transition-colors cursor-pointer"
            >
              <span className="w-12 h-12 flex items-center justify-center rounded-md bg-primary-500 text-background-50 text-xl">
                <i className={service.icon} />
              </span>
              <h3 className="font-heading text-lg mt-5">{t(`cta.${service.id}.title`)}</h3>
              <p className="text-sm text-foreground-600 mt-2 leading-relaxed flex-1">{t(`cta.${service.id}.desc`)}</p>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 mt-5">
                {t(`cta.${service.id}.action`)}
                <span className="w-4 h-4 flex items-center justify-center group-hover:translate-x-1 transition-transform rtl:group-hover:-translate-x-1">
                  <i className="ri-arrow-right-line rtl:rotate-180" />
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}