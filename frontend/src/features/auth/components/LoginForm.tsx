import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLogin } from '../hooks/useLogin';
import { useAuth } from '../context/AuthContext';
import { Button } from 'shared/ui/Button';
import { Input } from 'shared/ui/Input';
import { ROUTES } from 'app/router/routes';

interface LocationState {
  from?: { pathname?: string };
  email?: string;
}

export function LoginForm() {
  const { login } = useAuth();
  const loginMutation = useLogin();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const [email, setEmail] = useState(state?.email ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setError('');
    try {
      const data = await loginMutation.mutateAsync({ email: email.trim(), password });
      if (data.requiresVerification) {
        navigate(ROUTES.verifyCode, { state: { email: email.trim() } });
        return;
      }
      if (data.token && data.email) {
        login({ token: data.token, email: data.email, userId: data.userId, avatarData: data.avatarData });
        const redirectTo = state?.from?.pathname ?? ROUTES.tasks;
        navigate(redirectTo, { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Giris basarisiz');
    }
  };

  return (
    <form
      onSubmit={submit}
      className="max-w-sm mx-auto mt-10 bg-navy-800 border border-border rounded-xl p-10 animate-popIn"
    >
      <h2 className="text-2xl font-extrabold text-brand-bright text-center mb-2">
        Giris Yap
      </h2>
      <p className="text-center text-muted text-sm mb-6">Hesabinla giris yap</p>

      {error && (
        <div className="mb-4 px-3 py-2 rounded-md bg-status-red/10 border border-status-red/40 text-status-red text-sm text-center">
          {error}
        </div>
      )}

      <Input
        type="email"
        placeholder="E-posta..."
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoFocus
        className="mb-4"
      />
      <Input
        type="password"
        placeholder="Sifre..."
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mb-6"
      />

      <Button type="submit" block disabled={loginMutation.isPending}>
        {loginMutation.isPending ? 'Yukleniyor...' : 'Giris Yap'}
      </Button>

      <p className="text-center text-xs text-muted mt-5">
        Hesabin yok mu?{' '}
        <Link to={ROUTES.register} className="text-brand-bright hover:underline">
          Kayit Ol
        </Link>
      </p>
    </form>
  );
}
