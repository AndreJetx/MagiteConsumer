import { useState, type FormEvent } from 'react';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useLocale } from '@/hooks/use-locale';
import { login, register, type AuthUser } from '@/lib/api';
import { translateApiError } from '@/lib/i18n';
import { cleanInput } from '@/lib/sanitize';

export function LoginBackdrop() {
  return (
    <video className="login-video" autoPlay muted loop playsInline poster="/login-bg.png">
      <source src="/login-bg.mp4" type="video/mp4" />
    </video>
  );
}

export function LoginScreen({ onLoggedIn }: { onLoggedIn: (user: AuthUser) => void }) {
  const { t } = useLocale();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = mode === 'login'
        ? await login(username, password)
        : await register(username, password);
      onLoggedIn(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : '__generic__');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-frame login-frame">
      <LoginBackdrop />
      <div className="login-stack">
        <div className="login-card card pad">
          <div className="login-lang">
            <LanguageSwitcher />
          </div>
          <div className="brand-lockup">
            <div className="brand-mark">
              <img src="/favicon.png" alt="" width={38} height={38} />
            </div>
            <div>
              <div className="brand-name">{t('brand.name')}</div>
              <div className="brand-subtitle">{t('brand.loginSubtitle')}</div>
            </div>
          </div>
          <h1 className="login-title">{mode === 'login' ? t('login.enter') : t('login.create')}</h1>
          <p className="login-copy">
            {mode === 'login' ? t('login.enterCopy') : t('login.createCopy')}
          </p>
          <form className="source-form" onSubmit={submit}>
            <div>
              <label htmlFor="auth-username">{t('login.username')}</label>
              <input
                id="auth-username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                minLength={3}
                maxLength={mode === 'register' ? 32 : 254}
                value={username}
                onChange={(event) => setUsername(cleanInput(event.target.value, mode === 'register' ? 32 : 254).toLowerCase())}
                data-testid="input-auth-username"
              />
              {mode === 'register' && <div className="field-help">{t('login.usernameHelp')}</div>}
            </div>
            <div>
              <label htmlFor="auth-password">{t('login.password')}</label>
              <input id="auth-password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={6} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value.slice(0, 128))} data-testid="input-auth-password" />
            </div>
            {error && <p className="form-error">{error === '__generic__' ? t('login.generic') : translateApiError(error)}</p>}
            <div className="source-form-actions">
              <button className="button primary" type="submit" disabled={busy} data-testid="button-auth-submit">
                {busy ? t('login.wait') : mode === 'login' ? t('login.enter') : t('login.create')}
              </button>
            </div>
          </form>
          <button
            className="login-switch"
            type="button"
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            data-testid="button-auth-switch"
          >
            {mode === 'login' ? t('login.noAccount') : t('login.hasAccount')}
          </button>
        </div>
        <p className="gold-disclaimer">{t('disclaimer')}</p>
      </div>
    </div>
  );
}
