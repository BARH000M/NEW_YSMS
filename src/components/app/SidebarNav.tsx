import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { AppRole } from '@/api/types';
import { visibleGroups } from './navConfig';
import type { NavItem } from './navConfig';

function itemIsActive(item: NavItem, pathname: string) {
  if (item.exact) return pathname === item.to;
  if (item.to === '/app') return pathname === '/app';
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

interface SidebarNavProps {
  role: AppRole | null;
  displayName: string;
  roleLabel: string;
  onSignOut: () => void;
  onNavigate?: () => void;
}

export default function SidebarNav({ role, displayName, roleLabel, onSignOut, onNavigate }: SidebarNavProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => visibleGroups(role), [role]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return groups;
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => t(item.key).toLowerCase().includes(needle)),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, query, t]);

  // Searching expands everything so matches are never hidden in a folded group.
  const searching = query.trim().length > 0;

  useEffect(() => {
    setQuery('');
  }, [location.pathname]);

  return (
    <>
      <div className="flex items-center gap-2.5 px-2 pb-3 border-b border-background-50/15">
        <span className="w-9 h-9 rounded-md bg-accent-500 text-foreground-950 flex items-center justify-center font-bold text-sm shrink-0">
          SAI
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-accent-300 truncate">{t('app.nav.brand')}</p>
          <p className="text-[11px] text-background-50/60 truncate">{t('app.nav.management')}</p>
        </div>
        <Link
          to="/"
          onClick={onNavigate}
          className="ms-auto w-7 h-7 flex items-center justify-center rounded-md text-background-50/60 hover:text-background-50 hover:bg-background-50/10 cursor-pointer shrink-0"
          aria-label={t('app.nav.site')}
        >
          <i className="ri-external-link-line text-sm" />
        </Link>
      </div>

      <div className="flex items-center gap-2.5 px-2 py-2.5 my-2 rounded-md bg-background-50/10 border border-background-50/10">
        <span className="w-8 h-8 rounded-full bg-accent-500 text-foreground-950 text-xs font-bold flex items-center justify-center shrink-0">
          {displayName.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-background-50 truncate">{displayName}</p>
          <p className="text-[11px] text-accent-300 truncate">{roleLabel}</p>
        </div>
      </div>

      <div className="relative mb-2">
        <span className="absolute inset-y-0 start-2.5 flex items-center text-background-50/40">
          <i className="ri-search-line text-sm" />
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('app.nav.searchMenu')}
          className="w-full box-border bg-background-50/10 border border-background-50/15 rounded-md ps-8 pe-2.5 py-1.5 text-xs text-background-50 placeholder:text-background-50/40 focus:outline-none focus:ring-2 focus:ring-accent-400/60"
        />
      </div>

      <nav className="flex-1 flex flex-col gap-1 overflow-y-auto pe-0.5">
        {filtered.length === 0 && (
          <p className="px-2 py-4 text-[11px] text-background-50/50 text-center">{t('app.nav.noMatch')}</p>
        )}
        {filtered.map((group) => {
          const open = searching || !collapsed[group.key];
          return (
            <div key={group.key} className="flex flex-col">
              <button
                type="button"
                onClick={() => setCollapsed((prev) => ({ ...prev, [group.key]: !prev[group.key] }))}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wide text-background-50/45 hover:text-background-50/80 cursor-pointer"
                aria-expanded={open}
              >
                <span className="w-4 h-4 flex items-center justify-center shrink-0">
                  <i className={`${group.icon} text-xs`} />
                </span>
                <span className="truncate">{t(group.key)}</span>
                <i className={`ri-arrow-down-s-line ms-auto text-sm transition-transform ${open ? '' : '-rotate-90'}`} />
              </button>

              {open && (
                <div className="flex flex-col gap-0.5 ps-1.5 mt-0.5">
                  {group.items.map((item) => {
                    const active = itemIsActive(item, location.pathname);
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={onNavigate}
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[12.5px] font-medium transition-colors cursor-pointer ${
                          active
                            ? 'bg-accent-500 text-foreground-950'
                            : 'text-background-50/75 hover:bg-background-50/10 hover:text-background-50'
                        }`}
                      >
                        <span className="w-4 h-4 flex items-center justify-center shrink-0">
                          <i className={`${item.icon} text-base`} />
                        </span>
                        <span className="truncate">{t(item.key)}</span>
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="mt-3 pt-2.5 border-t border-background-50/15">
        <button
          type="button"
          onClick={onSignOut}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[12.5px] text-background-50/75 hover:bg-background-50/10 hover:text-background-50 cursor-pointer text-start"
        >
          <span className="w-4 h-4 flex items-center justify-center shrink-0">
            <i className="ri-logout-box-r-line text-base" />
          </span>
          <span className="truncate">{t('app.common.signOut')}</span>
        </button>
      </div>
    </>
  );
}