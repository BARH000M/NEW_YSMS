import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { contactInfo, newsMeta } from '@/mocks/college';
import { formatDate } from '@/utils/date';
import LanguageSwitcher from './LanguageSwitcher';

interface NavItem {
  key: string;
  to: string;
  xlOnly?: boolean;
}

const navItems: NavItem[] = [
  { key: 'nav.home', to: '/' },
  { key: 'nav.about', to: '/#about' },
  { key: 'nav.programs', to: '/#programs' },
  { key: 'nav.system', to: '/system' },
  { key: 'nav.news', to: '/#news', xlOnly: true },
  { key: 'nav.admission', to: '/admission' },
  { key: 'nav.complain', to: '/complain' },
  { key: 'nav.contact', to: '/contact' },
];

export default function Header() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const ticker = [...newsMeta, ...newsMeta];

  const isActive = (to: string) => {
    if (to === '/') return location.pathname === '/';
    if (to.startsWith('/#')) return location.pathname === '/';
    return location.pathname === to;
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className={`bg-primary-700 text-background-50 text-xs transition-all ${scrolled ? 'h-0 overflow-hidden' : 'h-9'}`}>
        <div className="flex items-center h-9 px-4 md:px-6 gap-4">
          <span className="bg-accent-500 text-foreground-950 font-semibold px-3 py-1 rounded-full whitespace-nowrap">
            {t('top.latestNews')}
          </span>
          <div className="flex-1 overflow-hidden">
            <div className="flex gap-12 w-max animate-ticker">
              {ticker.map((item, index) => (
                <Link key={`${item.id}-${index}`} to="/#news" className="whitespace-nowrap cursor-pointer hover:text-accent-200">
                  <span className="text-accent-300 me-2">{formatDate(item.date, i18n.language)}</span>
                  {t(`news.items.${item.id}.title`)}
                </Link>
              ))}
            </div>
          </div>
          <a href={`mailto:${contactInfo.email}`} className="hidden md:flex items-center gap-1 whitespace-nowrap">
            <span className="w-4 h-4 flex items-center justify-center"><i className="ri-mail-line" /></span>
            {contactInfo.email}
          </a>
        </div>
      </div>

      <div className={`transition-colors ${scrolled ? 'bg-background-50 border-b border-background-200' : 'bg-transparent'}`}>
        <div className="flex items-center justify-between gap-4 px-4 md:px-6 h-20">
          <Link to="/" className={`flex items-center rounded-md px-2 py-1 shrink-0 ${scrolled ? '' : 'bg-background-50/90'}`}>
            <img src={contactInfo.logo} alt={t('brand.name')} title={t('brand.name')} className="h-12 w-auto object-contain" />
          </Link>

          <nav className="hidden lg:flex items-center gap-3 xl:gap-5">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`text-[13px] xl:text-sm font-medium whitespace-nowrap cursor-pointer transition-colors ${item.xlOnly ? 'hidden xl:inline-flex' : ''} ${
                  scrolled
                    ? isActive(item.to)
                      ? 'text-primary-600'
                      : 'text-foreground-800 hover:text-primary-500'
                    : 'text-background-50 hover:text-accent-300'
                }`}
              >
                {t(item.key)}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher tone={scrolled ? 'dark' : 'light'} />
            <a
              href={`tel:${contactInfo.phone}`}
              className={`hidden xl:inline-flex items-center text-sm font-semibold whitespace-nowrap ${scrolled ? 'text-primary-600' : 'text-background-50'}`}
            >
              <span className="w-4 h-4 inline-flex items-center justify-center me-1"><i className="ri-phone-line" /></span>
              <span dir="ltr">{contactInfo.phoneDisplay}</span>
            </a>
            <Link to="/admission" className="bg-primary-500 hover:bg-primary-600 text-background-50 text-sm font-semibold px-5 py-2.5 rounded-md whitespace-nowrap cursor-pointer">
              {t('action.applyNow')}
            </Link>
            <Link
              to="/login"
              className={`inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer ${scrolled ? 'text-foreground-700 hover:text-primary-600' : 'text-background-50 hover:text-accent-300'}`}
            >
              <span className="w-4 h-4 flex items-center justify-center"><i className="ri-lock-line" /></span>
              <span className="hidden xl:inline">{t('nav.console')}</span>
            </Link>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <div className="md:hidden">
              <LanguageSwitcher tone={scrolled ? 'dark' : 'light'} />
            </div>
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className={`w-10 h-10 flex items-center justify-center text-2xl cursor-pointer ${scrolled ? 'text-foreground-900' : 'text-background-50'}`}
              aria-label="Menu"
              aria-expanded={open}
            >
              <i className={open ? 'ri-close-line' : 'ri-menu-line'} />
            </button>
          </div>
        </div>

        {open && (
          <div className="lg:hidden bg-background-50 border-t border-background-200 px-4 py-4 flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="py-2.5 text-sm font-medium text-foreground-800 border-b border-background-100 last:border-b-0"
              >
                {t(item.key)}
              </Link>
            ))}
            <a href={`tel:${contactInfo.phone}`} className="mt-2 text-sm font-semibold text-primary-600" dir="ltr">
              {contactInfo.phoneDisplay}
            </a>
            <Link to="/login" onClick={() => setOpen(false)} className="mt-1 py-2.5 text-sm font-medium text-foreground-800">
              {t('nav.console')}
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}