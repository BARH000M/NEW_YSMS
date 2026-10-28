import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import messages from './local/index';

export const SUPPORTED_LANGUAGES = ['ar', 'en', 'zh'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

const STORAGE_KEY = 'sai-language';

const getInitialLanguage = (): Language => {
  if (typeof window === 'undefined') return 'ar';
  const saved = window.localStorage.getItem(STORAGE_KEY) as Language | null;
  if (saved && SUPPORTED_LANGUAGES.includes(saved)) return saved;
  return 'ar';
};

i18n.use(initReactI18next).init({
  lng: getInitialLanguage(),
  fallbackLng: 'en',
  supportedLngs: [...SUPPORTED_LANGUAGES],
  resources: messages,
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export const setLanguage = (lang: Language) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, lang);
  }
  i18n.changeLanguage(lang);
};

export const isRtl = (lang: string) => lang === 'ar';

export default i18n;