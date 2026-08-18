import { useState, type FormEvent } from 'react';
import { Gauge } from 'lucide-react';
import { login, register, type AuthUser } from '@/lib/api';
import { cleanInput } from '@/lib/sanitize';

export function LoginScreen({ onLoggedIn }: { onLoggedIn: (user: AuthUser) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = mode === 'login'
        ? await login(email, password)
        : await register(email, password);
      onLoggedIn(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível continuar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-frame login-frame">
      <div className="login-card card pad">
        <div className="brand-lockup">
          <div className="brand-mark"><Gauge size={20} /></div>
          <div>
            <div className="brand-name">Resource Balance</div>
            <div className="brand-subtitle">entre para ver seus cenários</div>
          </div>
        </div>
        <h1 className="login-title">{mode === 'login' ? 'Entrar' : 'Criar conta'}</h1>
        <p className="login-copy">
          {mode === 'login'
            ? 'Use o e-mail da sua conta para abrir seus cálculos.'
            : 'Cada pessoa fica com os próprios ganhos, perdas e saldo.'}
        </p>
        <form className="source-form" onSubmit={submit}>
          <div>
            <label htmlFor="auth-email">E-mail</label>
            <input id="auth-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(cleanInput(event.target.value, 254).toLowerCase())} data-testid="input-auth-email" />
          </div>
          <div>
            <label htmlFor="auth-password">Senha</label>
            <input id="auth-password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={6} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value.slice(0, 128))} data-testid="input-auth-password" />
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="source-form-actions">
            <button className="button primary" type="submit" disabled={busy} data-testid="button-auth-submit">
              {busy ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </div>
        </form>
        <button
          className="login-switch"
          type="button"
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
          data-testid="button-auth-switch"
        >
          {mode === 'login' ? 'Não tem conta? Criar agora' : 'Já tem conta? Entrar'}
        </button>
      </div>
    </div>
  );
}
