import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { createFirstOwner } from '@/api/college';
import LanguageSwitcher from '@/components/feature/LanguageSwitcher';
import { inputClass, labelClass } from '@/components/feature/formStyles';

type Mode = 'signin' | 'signup';

export default function LoginPage() {
  const { t } = useTranslation();
  const { signIn, signUp, user, role, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/app';

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [setupOpen, setSetupOpen] = useState(false);
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');

  useEffect(() => {
    if (!loading && user && role) navigate(from, { replace: true });
  }, [loading, user, role, from, navigate]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password);
      } else {
        const result = await signUp(email.trim(), password, fullName.trim());
        if (result.needsConfirm) setNotice(t('app.login.welcome'));
        else setNotice(t('app.login.welcome'));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('app.login.genericError');
      setError(/invalid/i.test(message) ? t('app.login.invalid') : message);
    } finally {
      setBusy(false);
    }
  };

  const handleSetupOwner = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const email = ownerEmail.trim();
      await createFirstOwner({ email, password: ownerPassword, fullName: ownerName.trim() });
      await signIn(email, ownerPassword);
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('app.login.genericError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-50 grid grid-cols-1 lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-foreground-950 p-10">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-md bg-accent-500 text-foreground-950 flex items-center justify-center font-bold">
            SAI
          </span>
          <div>
            <p className="text-accent-300 font-semibold text-sm">SAI Educational College</p>
            <p className="text-background-50/60 text-xs">كلية ساي التعليمية اليمنية الصينية</p>
          </div>
        </div>

        <div>
          <h2 className="font-heading text-3xl text-background-50 leading-snug max-w-md">
            {t('app.login.title')}
          </h2>
          <p className="text-sm text-background-50/70 mt-3 max-w-sm leading-relaxed">{t('app.login.subtitle')}</p>

          <div className="grid grid-cols-2 gap-3 mt-8 max-w-sm">
            {[
              { icon: 'ri-user-3-line', label: t('app.nav.students') },
              { icon: 'ri-file-list-3-line', label: t('app.nav.admissions') },
              { icon: 'ri-door-open-line', label: t('app.nav.frontOffice') },
              { icon: 'ri-book-open-line', label: t('app.nav.academics') },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 rounded-md border border-background-50/15 px-3 py-2 text-xs text-background-50/80"
              >
                <span className="w-4 h-4 flex items-center justify-center text-accent-300">
                  <i className={`${item.icon} text-sm`} />
                </span>
                {item.label}
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-background-50/40">© 2026 SAI Educational College</p>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center justify-between px-5 md:px-8 h-16">
          <Link to="/" className="text-xs font-semibold text-foreground-700 hover:text-primary-600 cursor-pointer">
            <span className="inline-flex items-center gap-1.5">
              <i className="ri-arrow-left-line rtl:rotate-180" />
              {t('app.common.backToSite')}
            </span>
          </Link>
          <LanguageSwitcher tone="dark" />
        </div>

        <div className="flex-1 flex items-center justify-center px-5 md:px-8 pb-10">
          <div className="w-full max-w-sm">
            <h1 className="font-heading text-2xl text-foreground-950">{t('app.login.title')}</h1>
            <p className="text-sm text-foreground-600 mt-2">{t('app.login.subtitle')}</p>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              {mode === 'signup' && (
                <div className="flex flex-col gap-1.5">
                  <label className={labelClass} htmlFor="fullName">
                    {t('app.login.fullName')}
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    autoComplete="name"
                    className={inputClass}
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className={labelClass} htmlFor="email">
                  {t('app.login.email')}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  dir="ltr"
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelClass} htmlFor="password">
                  {t('app.login.password')}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  dir="ltr"
                  className={inputClass}
                />
              </div>

              {error && (
                <div className="rounded-md border border-primary-300 bg-primary-100 px-3 py-2 text-xs text-primary-900">
                  {error}
                </div>
              )}
              {notice && (
                <div className="rounded-md border border-secondary-200 bg-secondary-100 px-3 py-2 text-xs text-secondary-900">
                  {notice}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-background-50 text-sm font-semibold py-3 rounded-md whitespace-nowrap cursor-pointer"
              >
                {busy ? t('app.login.signingIn') : mode === 'signin' ? t('app.login.signIn') : t('app.login.signUp')}
              </button>
            </form>

            <div className="mt-4 text-xs text-foreground-600 text-center">
              {mode === 'signin' ? t('app.login.noAccount') : t('app.login.haveAccount')}{' '}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'signin' ? 'signup' : 'signin');
                  setError(null);
                  setNotice(null);
                }}
                className="font-semibold text-primary-600 hover:text-primary-700 cursor-pointer"
              >
                {mode === 'signin' ? t('app.login.signUp') : t('app.login.signIn')}
              </button>
            </div>

            {mode === 'signup' && (
              <p className="mt-3 text-[11px] text-foreground-500 text-center leading-relaxed">
                {t('app.login.signUpHint')}
              </p>
            )}

            <div className="mt-5 pt-4 border-t border-background-200">
              {!setupOpen ? (
                <button
                  type="button"
                  onClick={() => {
                    setSetupOpen(true);
                    setError(null);
                    setNotice(null);
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold text-foreground-600 hover:text-primary-700 cursor-pointer"
                >
                  <i className="ri-shield-keyhole-line" />
                  {t('app.login.firstSetup')}
                </button>
              ) : (
                <form onSubmit={handleSetupOwner} className="flex flex-col gap-3">
                  <div className="flex items-start gap-2 rounded-md border border-accent-300 bg-accent-100 px-3 py-2 text-[11px] text-accent-950 leading-relaxed">
                    <span className="w-4 h-4 flex items-center justify-center shrink-0 mt-0.5">
                      <i className="ri-information-line" />
                    </span>
                    <span>{t('app.login.firstSetupHint')}</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className={labelClass} htmlFor="ownerName">
                      {t('app.login.ownerName')}
                    </label>
                    <input
                      id="ownerName"
                      name="ownerName"
                      type="text"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder={t('app.common.optional')}
                      className={inputClass}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className={labelClass} htmlFor="ownerEmail">
                      {t('app.login.email')}
                    </label>
                    <input
                      id="ownerEmail"
                      name="ownerEmail"
                      type="email"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      required
                      autoComplete="email"
                      dir="ltr"
                      className={inputClass}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className={labelClass} htmlFor="ownerPassword">
                      {t('app.login.password')}
                    </label>
                    <input
                      id="ownerPassword"
                      name="ownerPassword"
                      type="password"
                      value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      dir="ltr"
                      className={inputClass}
                    />
                  </div>

                  {error && (
                    <div className="rounded-md border border-primary-300 bg-primary-100 px-3 py-2 text-[11px] text-primary-900 break-words">
                      {error}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={busy}
                      className="flex-1 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-background-50 text-xs font-semibold py-2.5 rounded-md whitespace-nowrap cursor-pointer"
                    >
                      {busy ? t('app.login.signingIn') : t('app.login.createOwner')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSetupOpen(false)}
                      className="border border-background-300 text-foreground-700 text-xs font-semibold px-3 py-2.5 rounded-md whitespace-nowrap cursor-pointer"
                    >
                      {t('app.common.cancel')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}