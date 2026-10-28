import { useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { claimFirstAdmin } from '@/api/college';
import AppShell from './AppShell';
import { Card } from './ui';

function Centered({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-background-100 flex items-center justify-center p-4">{children}</div>;
}

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { user, role, loading, roleError, signOut, refreshRole } = useAuth();
  const location = useLocation();
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  const handleClaim = async () => {
    setClaiming(true);
    setClaimError(null);
    try {
      await claimFirstAdmin();
      await refreshRole();
    } catch (error) {
      setClaimError(error instanceof Error ? error.message : t('app.login.genericError'));
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <Centered>
        <div className="flex items-center gap-2 text-sm text-foreground-600">
          <span className="w-4 h-4 border-2 border-background-300 border-t-primary-500 rounded-full animate-spin" />
          {t('app.common.loading')}
        </div>
      </Centered>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!role) {
    return (
      <Centered>
        <Card className="p-6 max-w-md w-full text-center">
          <span className="w-11 h-11 mx-auto rounded-full bg-accent-100 text-accent-950 flex items-center justify-center">
            <i className="ri-lock-line text-lg" />
          </span>
          <h1 className="text-base font-semibold text-foreground-950 mt-3">{t('app.login.needAccount')}</h1>
          <p className="text-xs text-foreground-600 mt-2 leading-relaxed">
            {roleError ?? t('app.login.signUpHint')}
          </p>
          {claimError && (
            <p className="mt-3 text-[11px] text-primary-900 bg-primary-100 border border-primary-200 rounded-md px-3 py-2 break-words">
              {claimError}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-2 mt-5">
            <button
              type="button"
              onClick={() => void handleClaim()}
              disabled={claiming}
              className="flex-1 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-background-50 text-xs font-semibold px-4 py-2.5 rounded-md cursor-pointer whitespace-nowrap"
            >
              {claiming ? t('app.common.loading') : t('app.login.claimAdmin')}
            </button>
            <button
              type="button"
              onClick={() => void refreshRole()}
              className="flex-1 border border-background-300 text-foreground-800 text-xs font-semibold px-4 py-2.5 rounded-md cursor-pointer whitespace-nowrap"
            >
              {t('app.common.retry')}
            </button>
          </div>
          <p className="mt-3 text-[10px] text-foreground-500 leading-relaxed">{t('app.login.claimHint')}</p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-2 text-[11px] font-semibold text-foreground-600 hover:text-foreground-900 cursor-pointer"
          >
            {t('app.common.signOut')}
          </button>
        </Card>
      </Centered>
    );
  }

  return <AppShell>{children}</AppShell>;
}