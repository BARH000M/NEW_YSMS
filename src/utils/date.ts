export const formatDate = (iso: string, lang: string) => {
  const locale = lang === 'ar' ? 'ar-YE' : lang === 'zh' ? 'zh-CN' : 'en-GB';
  try {
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

export const formatDateTime = (iso: string, lang: string) => {
  const locale = lang === 'ar' ? 'ar-YE' : lang === 'zh' ? 'zh-CN' : 'en-GB';
  try {
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

export const todayKey = () => new Date().toISOString().slice(0, 10);
