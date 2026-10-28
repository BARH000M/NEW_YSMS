import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { contactInfo, newsMeta } from '@/mocks/college';
import { formatDate } from '@/utils/date';
import LanguageSwitcher from './LanguageSwitcher';

interface NavItem {
  key: string;
  to: string;
  icon: string;
  xlOnly?: boolean;
}

const navItems: NavItem[] = [
  { key: 'nav.home', to: '/', icon: 'ri-home-5-line' },
  { key: 'nav.about', to: '/#about', icon: 'ri-information-line' },
  { key: 'nav.programs', to: '/#programs', icon: 'ri-book-open-line' },
  { key: 'nav.system', to: '/system', icon: 'ri-layout-grid-line' },
  { key: 'nav.news', to: '/#news', icon: 'ri-newspaper-line', xlOnly: true },
  { key: 'nav.admission', to: '/admission', icon: 'ri-file-list-3-line' },
  { key: 'nav.complain', to: '/complain', icon: 'ri-feedback-line' },
  { key: 'nav.contact', to: '/contact', icon: 'ri-phone-line' },
];

/* Mobile drawer destinations — the five that matter most on a phone. */
const mobileQuickLinks: NavItem[] = [
  { key: 'action.applyNow', to: '/admission', icon: 'ri-file-add-line' },
  { key: 'nav.console', to: '/login', icon: 'ri-lock-line' },
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

  // Lock the page behind the drawer so the phone doesn't scroll underneath it.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

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
        <div className="flex items-center justify-end lg:justify-between gap-2 px-4 md:px-6 h-16 md:h-20">
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

          <div className="hidden lg:flex items-center gap-3">
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
              <span>{t('nav.console')}</span>
            </Link>
          </div>

          {/* Mobile / tablet: one clear menu button, never squeezed out. */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={`lg:hidden w-10 h-10 shrink-0 flex items-center justify-center rounded-md text-2xl cursor-pointer ${
              scrolled ? 'text-foreground-900' : 'text-background-50'
            }`}
            aria-label={t('nav.menu')}
            aria-expanded={open}
          >
            <i className="ri-menu-line" />
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          <button
            type="button"
            aria-label={t('nav.closeMenu')}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-foreground-950/60 cursor-pointer"
          />
          <aside className="absolute inset-y-0 end-0 w-[86vw] max-w-[340px] bg-background-50 flex flex-col">
            <div className="flex items-center justify-between gap-2 px-4 h-16 border-b border-background-200 shrink-0">
              <Link to="/" onClick={() => setOpen(false)} className="flex items-center">
                <img src={contactInfo.logo} alt={t('brand.name')} className="h-10 w-auto object-contain" />
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-9 h-9 shrink-0 flex items-center justify-center rounded-md border border-background-300 text-foreground-800 cursor-pointer"
                aria-label={t('nav.closeMenu')}
              >
                <i className="ri-close-line text-lg" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-0.5">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium cursor-pointer ${
                    isActive(item.to)
                      ? 'bg-background-100 text-primary-700'
                      : 'text-foreground-800 hover:bg-background-100'
                  }`}
                >
                  <span className="w-5 h-5 flex items-center justify-center shrink-0 text-foreground-500">
                    <i className={`${item.icon} text-base`} />
                  </span>
                  <span className="truncate">{t(item.key)}</span>
                  <i className="ri-arrow-right-s-line ms-auto text-foreground-400 rtl:rotate-180" />
                </Link>
              ))}

              <div className="mt-3 pt-3 border-t border-background-200">
                <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-foreground-500">
                  {t('nav.language')}
                </p>
                <div className="px-3">
                  <LanguageSwitcher tone="dark" />
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-background-200 flex flex-col gap-2 px-1">
                {mobileQuickLinks.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold cursor-pointer ${
                      item.key === 'action.applyNow'
                        ? 'bg-primary-500 hover:bg-primary-600 text-background-50'
                        : 'border border-background-300 text-foreground-800'
                    }`}
                  >
                    <span className="w-5 h-5 flex items-center justify-center shrink-0">
                      <i className={`${item.icon} text-base`} />
                    </span>
                    <span className="truncate">{t(item.key)}</span>
                  </Link>
                ))}
              </div>
            </nav>

            <div className="shrink-0 px-4 py-3 border-t border-background-200 bg-background-100">
              <a href={`tel:${contactInfo.phone}`} className="flex items-center gap-2 text-sm font-semibold text-primary-700" dir="ltr">
                <span className="w-4 h-4 flex items-center justify-center"><i className="ri-phone-line" /></span>
                {contactInfo.phoneDisplay}
              </a>
              <p className="text-[11px] text-foreground-500 mt-1 truncate">{contactInfo.email}</p>
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}