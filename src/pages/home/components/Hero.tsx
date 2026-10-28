import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { statsMeta } from '@/mocks/college';

export default function Hero() {
  const { t } = useTranslation();

  return (
    <section id="home" className="relative min-h-[680px] md:min-h-[780px] w-full overflow-hidden flex flex-col justify-center">
      <img
        src="https://readdy.ai/api/search-image?query=Joyful%20graduates%20in%20black%20gowns%20tossing%20caps%20in%20the%20air%2C%20artistic%20painterly%20style%20with%20deep%20crimson%20and%20warm%20gold%20tones%2C%20dark%20moody%20background%20for%20strong%20white%20text%20contrast%2C%20cinematic%20editorial%20illustration&width=1920&height=1080&seq=sai-hero-1&orientation=landscape"
        alt={t('hero.title')}
        title={t('brand.name')}
        className="absolute inset-0 w-full h-full object-cover object-top"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-foreground-950/70 via-foreground-950/50 to-foreground-950/80" />

      <div className="relative z-10 w-full flex-1 flex flex-col items-center justify-center text-center px-4 md:px-6 pt-36 pb-16">
        <span className="fade-up inline-flex items-center gap-2 bg-accent-500 text-foreground-950 text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
          <span className="w-4 h-4 flex items-center justify-center"><i className="ri-megaphone-line" /></span>
          {t('hero.badge')}
        </span>
        <h1 className="fade-up font-heading text-background-50 text-3xl md:text-6xl leading-tight max-w-4xl">
          {t('hero.title')}
        </h1>
        <p className="fade-up text-background-100 text-sm md:text-base max-w-2xl mt-5 leading-relaxed">
          {t('hero.subtitle')}
        </p>
        <div className="fade-up flex flex-col sm:flex-row gap-3 mt-8">
          <Link to="/admission" className="bg-primary-500 hover:bg-primary-600 text-background-50 font-semibold text-sm px-7 py-3 rounded-md whitespace-nowrap cursor-pointer">
            {t('hero.ctaPrimary')}
          </Link>
          <Link to="/#programs" className="border border-background-50/70 text-background-50 hover:bg-background-50/10 font-semibold text-sm px-7 py-3 rounded-md whitespace-nowrap cursor-pointer">
            {t('hero.ctaSecondary')}
          </Link>
        </div>
      </div>

      <div className="relative z-10 w-full">
        <div className="mx-4 md:mx-6 grid grid-cols-2 lg:grid-cols-4 bg-background-50 rounded-t-lg overflow-hidden">
          {statsMeta.map((id) => (
            <div key={id} className="py-5 md:py-6 px-2 text-center border-b lg:border-b-0 border-e border-background-200 last:border-e-0">
              <div className="font-heading text-2xl md:text-3xl text-primary-600">{t(`stats.${id}.value`)}</div>
              <div className="text-xs text-foreground-600 mt-1">{t(`stats.${id}.label`)}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}