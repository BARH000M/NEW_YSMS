import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/feature/LanguageSwitcher';
import SidebarNav from '@/components/app/SidebarNav';
import ConsoleRefreshProvider from '@/components/app/ConsoleRefresh';
import { mobileItems } from '@/components/app/navConfig';
import { useAuth } from '@/hooks/useAuth';

export default function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { profile, user, role, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const [studentTerm, setStudentTerm] = useState('');

  useEffect(() => {
    setDrawer(false);
    setStudentTerm('');
  }, [location.pathname]);

  const bottomItems = useMemo(() => mobileItems(role), [role]);

  const displayName = profile?.full_name || profile?.full_name_ar || user?.email || '—';
  const roleLabel = role ? t(`app.role.${role}`) : t('app.login.needAccount');

  const navContent = (
    <SidebarNav
      role={role}
      displayName={displayName}
      roleLabel={roleLabel}
      onSignOut={() => void signOut()}
      onNavigate={() => setDrawer(false)}
    />
  );

  return (
    <div className="min-h-screen bg-background-100 flex">
      <aside className="hidden lg:flex flex-col w-[262px] shrink-0 bg-foreground-950 p-3 sticky top-0 h-screen overflow-hidden">
        {navContent}
      </aside>

      {drawer && (
        <div className="lg:hidden fixed inset-0 z-50">
          <button
            type="button"
            aria-label={t('app.common.close')}
            onClick={() => setDrawer(false)}
            className="absolute inset-0 bg-foreground-950/60 cursor-pointer"
          />
          <aside className="absolute inset-y-0 start-0 w-[280px] bg-foreground-950 p-3 flex flex-col overflow-hidden">
            {navContent}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-40 bg-background-50 border-b border-background-200">
          <div className="flex items-center justify-between gap-3 px-4 md:px-6 h-14">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setDrawer(true)}
                className="lg:hidden w-9 h-9 flex items-center justify-center rounded-md border border-background-300 text-foreground-800 cursor-pointer"
                aria-label={t('app.nav.menu')}
              >
                <i className="ri-menu-line text-lg" />
              </button>
              <span className="text-sm font-semibold text-foreground-900 truncate">{t('app.nav.management')}</span>
            </div>

            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <LanguageSwitcher tone="dark" />
              <div className="hidden sm:flex flex-col items-end min-w-0">
                <span className="text-xs font-semibold text-foreground-900 truncate max-w-[160px]">{displayName}</span>
                <span className="text-[11px] text-foreground-500 truncate max-w-[160px]">{roleLabel}</span>
              </div>
              <span className="w-8 h-8 rounded-full bg-primary-500 text-background-50 text-xs font-bold flex items-center justify-center shrink-0">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>

          {/* Quick student lookup — phones only, one thumb reach away. */}
          <form
            className="lg:hidden px-3 pb-2"
            onSubmit={(event) => {
              event.preventDefault();
              const term = studentTerm.trim();
              navigate(term ? `/app/students?q=${encodeURIComponent(term)}` : '/app/students');
            }}
          >
            <div className="relative">
              <span className="absolute inset-y-0 start-3 flex items-center text-foreground-400">
                <i className="ri-user-search-line text-sm" />
              </span>
              <input
                type="search"
                value={studentTerm}
                onChange={(event) => setStudentTerm(event.target.value)}
                placeholder={t('app.common.studentSearch')}
                aria-label={t('app.common.studentSearch')}
                className="w-full box-border bg-background-100 border border-background-200 rounded-full ps-9 pe-3 py-2 text-sm text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
              />
            </div>
          </form>
        </header>

        <main className="flex-1 min-w-0 p-3 sm:p-4 md:p-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-8">
          <div className="max-w-[1320px] mx-auto min-w-0">
            <ConsoleRefreshProvider>{children}</ConsoleRefreshProvider>
          </div>
        </main>

        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-background-50 border-t border-background-200 pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-stretch">
            {bottomItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  `flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-1.5 cursor-pointer ${
                    isActive ? 'text-primary-600' : 'text-foreground-500'
                  }`
                }
              >
                <span className="w-5 h-5 flex items-center justify-center">
                  <i className={`${item.icon} text-lg`} />
                </span>
                <span className="text-[10px] font-medium truncate max-w-full px-1 leading-tight">{t(item.key)}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}