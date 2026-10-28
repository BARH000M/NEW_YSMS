import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import SiteLayout from '@/components/feature/SiteLayout';
import PageBanner from '@/components/feature/PageBanner';
import FaqAccordion from '@/components/feature/FaqAccordion';
import AdmissionSteps from './components/AdmissionSteps';
import ApplicationForm from './components/ApplicationForm';

const documents = ['1', '2', '3', '4'];
const faqs = ['1', '2', '3', '4'];

export default function Admission() {
  const { t } = useTranslation();

  return (
    <SiteLayout>
      <PageBanner
        title={t('admission.title')}
        subtitle={t('admission.subtitle')}
        crumb={t('nav.admission')}
        image="https://readdy.ai/api/search-image?query=Students%20queueing%20at%20a%20college%20admissions%20desk%20in%20a%20bright%20warm%20building%2C%20friendly%20staff%20handing%20over%20forms%2C%20cream%20and%20crimson%20tones%2C%20editorial%20photography%2C%20soft%20daylight&width=1920&height=900&seq=sai-banner-admission&orientation=landscape"
      />

      <AdmissionSteps />

      <section className="bg-background-100 py-14 md:py-20 px-4 md:px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2">
            <ApplicationForm />
          </div>

          <aside className="space-y-6">
            <div className="bg-background-50 border border-background-200 rounded-lg p-6">
              <h3 className="font-heading text-lg">{t('admission.docs.title')}</h3>
              <ul className="mt-4 space-y-3">
                {documents.map((doc) => (
                  <li key={doc} className="flex items-start gap-3 text-sm text-foreground-700">
                    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-primary-100 text-primary-600 text-xs shrink-0 mt-0.5">
                      <i className="ri-check-line" />
                    </span>
                    <span className="leading-relaxed">{t(`admission.docs.${doc}`)}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-foreground-500 mt-4 leading-relaxed border-t border-background-200 pt-4">
                {t('admission.docs.note')}
              </p>
            </div>

            <div className="bg-primary-600 rounded-lg p-6 text-background-50">
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-background-50/15 text-lg">
                <i className="ri-question-answer-line" />
              </div>
              <h3 className="font-heading text-lg mt-4">{t('nav.contact')}</h3>
              <p className="text-sm text-background-100 mt-2 leading-relaxed">{t('cta.contact.desc')}</p>
              <Link to="/contact" className="inline-flex items-center gap-1 text-sm font-semibold mt-4 text-accent-300 cursor-pointer">
                {t('cta.contact.action')}
                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-arrow-right-line rtl:rotate-180" /></span>
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <section className="bg-background-50 py-14 md:py-20 px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-heading text-2xl md:text-3xl mb-6">{t('admission.faq.title')}</h2>
          <FaqAccordion
            items={faqs.map((index) => ({
              question: t(`admission.faq.q${index}`),
              answer: t(`admission.faq.a${index}`),
            }))}
          />
        </div>
      </section>
    </SiteLayout>
  );
}