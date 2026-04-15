import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRegister } from '../hooks/useRegister';
import { useAuth } from '../context/AuthContext';
import { Button } from 'shared/ui/Button';
import { Input } from 'shared/ui/Input';
import { ROUTES } from 'app/router/routes';

export function RegisterForm() {
  const { login } = useAuth();
  const registerMutation = useRegister();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setError('');
    try {
      const data = await registerMutation.mutateAsync({ email: email.trim(), password });
      if (data.requiresVerification) {
        navigate(ROUTES.verifyCode, { state: { email: email.trim() } });
        return;
      }
      if (data.token && data.email) {
        login({ token: data.token, email: data.email, userId: data.userId });
        navigate(ROUTES.tasks, { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayit basarisiz');
    }
  };

  return (
    <form
      onSubmit={submit}
      className="max-w-sm mx-auto mt-10 bg-navy-800 border border-border rounded-xl p-10 animate-popIn"
    >
      <h2 className="text-2xl font-extrabold text-brand-bright text-center mb-2">
        Kayit Ol
      </h2>
      <p className="text-center text-muted text-sm mb-6">Yeni hesap olustur</p>

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

      <Button type="submit" block disabled={registerMutation.isPending}>
        {registerMutation.isPending ? 'Yukleniyor...' : 'Kayit Ol'}
      </Button>

      <p className="text-center text-xs text-muted mt-5">
        Zaten hesabin var mi?{' '}
        <Link to={ROUTES.login} className="text-brand-bright hover:underline">
          Giris Yap
        </Link>
      </p>
    </form>
  );
}
