import { useTranslation } from 'react-i18next';
import SiteLayout from '@/components/feature/SiteLayout';
import PageBanner from '@/components/feature/PageBanner';
import { contactInfo } from '@/mocks/college';
import ComplainForm from './components/ComplainForm';

export default function Complain() {
  const { t } = useTranslation();
  const timeline = ['1', '2', '3'];

  return (
    <SiteLayout>
      <PageBanner
        title={t('complain.title')}
        subtitle={t('complain.subtitle')}
        crumb={t('nav.complain')}
        image="https://readdy.ai/api/search-image?query=Calm%20modern%20college%20office%20corridor%20with%20warm%20cream%20walls%20and%20a%20student%20speaking%20with%20an%20advisor%20at%20a%20desk%2C%20soft%20daylight%2C%20editorial%20photography%2C%20minimal%20composition&width=1920&height=900&seq=sai-banner-complain&orientation=landscape"
      />

      <section className="bg-background-50 py-14 md:py-20 px-4 md:px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-background-100 border border-background-200 rounded-lg p-6 md:p-8">
            <span className="w-11 h-11 flex items-center justify-center rounded-md bg-primary-100 text-primary-600 text-xl">
              <i className="ri-shield-check-line" />
            </span>
            <h2 className="font-heading text-xl mt-4">{t('complain.intro.title')}</h2>
            <p className="text-sm text-foreground-600 mt-3 leading-relaxed">{t('complain.intro.desc')}</p>
          </div>
          <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-6 md:p-8">
            <span className="w-11 h-11 flex items-center justify-center rounded-md bg-secondary-500 text-background-50 text-xl">
              <i className="ri-lock-2-line" />
            </span>
            <h2 className="font-heading text-xl mt-4">{t('complain.privacy.title')}</h2>
            <p className="text-sm text-foreground-600 mt-3 leading-relaxed">{t('complain.privacy.desc')}</p>
          </div>
        </div>
      </section>

      <section className="bg-background-100 py-14 md:py-20 px-4 md:px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2">
            <ComplainForm />
          </div>

          <aside className="space-y-6">
            <div className="bg-background-50 border border-background-200 rounded-lg p-6">
              <h3 className="font-heading text-lg">{t('complain.timeline.title')}</h3>
              <ol className="mt-5 space-y-5">
                {timeline.map((step) => (
                  <li key={step} className="flex gap-3">
                    <span className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full bg-accent-500 text-foreground-950 text-sm font-semibold">
                      {step}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-foreground-900">{t(`complain.timeline.${step}.title`)}</span>
                      <span className="block text-xs text-foreground-600 mt-1 leading-relaxed">{t(`complain.timeline.${step}.desc`)}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="bg-background-50 border border-background-200 rounded-lg p-6">
              <h3 className="font-heading text-lg">{t('complain.alt.title')}</h3>
              <p className="text-xs text-foreground-600 mt-2 leading-relaxed">{t('complain.alt.desc')}</p>
              <div className="mt-5 space-y-2">
                <a href={`tel:${contactInfo.phone}`} className="flex items-center gap-3 text-sm font-semibold text-primary-600 cursor-pointer">
                  <span className="w-8 h-8 flex items-center justify-center rounded-full bg-primary-100"><i className="ri-phone-line" /></span>
                  <span dir="ltr">{contactInfo.phoneDisplay}</span>
                </a>
                <a href={`mailto:${contactInfo.email}`} className="flex items-center gap-3 text-sm font-semibold text-primary-600 cursor-pointer">
                  <span className="w-8 h-8 flex items-center justify-center rounded-full bg-primary-100"><i className="ri-mail-line" /></span>
                  <span dir="ltr">{contactInfo.email}</span>
                </a>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </SiteLayout>
  );
}