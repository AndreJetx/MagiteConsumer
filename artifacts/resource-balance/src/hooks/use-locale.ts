import { useEffect, useState } from 'react';
import { getLocale, setLocale, subscribeLocale, t, type Locale } from '@/lib/i18n';

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>(getLocale);

  useEffect(() => subscribeLocale(() => setLocaleState(getLocale())), []);

  return {
    locale,
    setLocale,
    t: (key: string, vars?: Record<string, string | number>) => t(key, vars, locale),
  };
}
