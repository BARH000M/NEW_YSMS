import { Suspense, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { AppRoutes } from './router';
import i18n from './i18n';
import { AuthProvider } from './hooks/useAuth';

function HtmlDirSync() {
  const { i18n: instance } = useTranslation();

  useEffect(() => {
    const lang = instance.language || 'ar';
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [instance.language]);

  return null;
}

/** Shown for the split second a page chunk arrives, so navigation never flashes white. */
function RouteFallback() {
  return (
    <div className="min-h-screen bg-background-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <span className="w-8 h-8 rounded-full border-2 border-background-300 border-t-primary-500 animate-spin" />
        <span className="text-xs text-foreground-500">…</span>
      </div>
    </div>
  );
}

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <BrowserRouter basename={__BASE_PATH__}>
        <AuthProvider>
          <HtmlDirSync />
          <Suspense fallback={<RouteFallback />}>
            <AppRoutes />
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </I18nextProvider>
  );
}

export default App;