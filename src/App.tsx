import { useEffect } from 'react';
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

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <BrowserRouter basename={__BASE_PATH__}>
        <AuthProvider>
          <HtmlDirSync />
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </I18nextProvider>
  );
}

export default App;