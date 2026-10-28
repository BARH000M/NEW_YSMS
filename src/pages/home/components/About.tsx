import { useTranslation } from 'react-i18next';
import { featureMeta } from '@/mocks/college';

export default function About() {
  const { t } = useTranslation();

  return (
    <section id="about" className="scroll-mt-28 bg-background-50 py-16 md:py-24 px-4 md:px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="relative">
          <div className="w-full h-[380px] md:h-[480px] rounded-lg overflow-hidden">
            <img
              src="https://readdy.ai/api/search-image?query=Chinese%20teacher%20guiding%20Yemeni%20students%20in%20a%20bright%20modern%20classroom%20with%20Chinese%20calligraphy%20on%20the%20board%2C%20warm%20cream%20walls%2C%20red%20lanterns%2C%20soft%20natural%20light%2C%20editorial%20photography&width=900&height=1000&seq=sai-about-1&orientation=portrait"
              alt={t('about.title')}
              title={t('brand.name')}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover object-top"
            />
          </div>
          <div className="absolute -bottom-6 end-4 md:-end-6 bg-accent-500 text-foreground-950 rounded-lg p-5 w-48">
            <div className="font-heading text-3xl">{t('about.badgeTitle')}</div>
            <div className="text-xs mt-1 font-medium leading-snug">{t('about.badgeText')}</div>
          </div>
        </div>

        <div>
          <span className="text-xs font-semibold tracking-widest uppercase text-primary-600">{t('about.eyebrow')}</span>
          <h2 className="font-heading text-2xl md:text-4xl mt-3 text-foreground-950">{t('about.title')}</h2>
          <p className="text-sm md:text-base text-foreground-700 mt-5 leading-relaxed">{t('about.body')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-8">
            {featureMeta.map((feature) => (
              <div key={feature.id} className="bg-background-100 border border-background-200 rounded-lg p-5">
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-secondary-100 text-secondary-700 text-lg">
                  <i className={feature.icon} />
                </div>
                <h3 className="font-semibold text-sm mt-3 text-foreground-950">{t(`features.${feature.id}.title`)}</h3>
                <p className="text-xs text-foreground-600 mt-1 leading-relaxed">{t(`features.${feature.id}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}