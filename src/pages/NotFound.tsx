import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import SiteLayout from '@/components/feature/SiteLayout';

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <SiteLayout>
      <section className="bg-background-50 pt-40 pb-24 px-4 md:px-6">
        <div className="max-w-2xl mx-auto text-center">
          <span className="font-heading text-primary-200 text-7xl md:text-9xl leading-none">404</span>
          <h1 className="font-heading text-2xl md:text-3xl mt-4">{t('notFound.title')}</h1>
          <p className="text-sm text-foreground-600 mt-3 leading-relaxed">{t('notFound.desc')}</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 mt-8">
            <Link to="/" className="bg-primary-500 hover:bg-primary-600 text-background-50 text-sm font-semibold px-6 py-3 rounded-md whitespace-nowrap cursor-pointer">
              {t('action.backHome')}
            </Link>
            <Link to="/admission" className="border border-background-300 text-foreground-800 hover:border-primary-400 text-sm font-semibold px-6 py-3 rounded-md whitespace-nowrap cursor-pointer">
              {t('nav.admission')}
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}