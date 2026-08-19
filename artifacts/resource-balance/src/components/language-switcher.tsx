import { useLocale } from '@/hooks/use-locale';

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();

  return (
    <div className={`lang-switch ${className}`.trim()} role="group" aria-label={locale === 'en' ? 'Language' : 'Idioma'}>
      <button
        type="button"
        className={locale === 'pt' ? 'active' : ''}
        onClick={() => setLocale('pt')}
        aria-pressed={locale === 'pt'}
        aria-label={t('lang.switchToPt')}
        data-testid="button-locale-pt"
      >
        {t('lang.pt')}
      </button>
      <button
        type="button"
        className={locale === 'en' ? 'active' : ''}
        onClick={() => setLocale('en')}
        aria-pressed={locale === 'en'}
        aria-label={t('lang.switchToEn')}
        data-testid="button-locale-en"
      >
        {t('lang.en')}
      </button>
    </div>
  );
}
