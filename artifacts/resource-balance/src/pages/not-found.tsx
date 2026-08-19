import { LanguageSwitcher } from '@/components/language-switcher';
import { useLocale } from '@/hooks/use-locale';

export default function NotFound() {
  const { t } = useLocale();

  return (
    <div className="app-frame login-frame">
      <div className="login-card card pad">
        <div className="login-lang">
          <LanguageSwitcher />
        </div>
        <div className="eyebrow">{t('notFound.code')}</div>
        <h1 className="login-title">{t('notFound.title')}</h1>
        <p className="login-copy">{t('notFound.copy')}</p>
      </div>
    </div>
  );
}
