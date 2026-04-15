import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useVerifyCode } from '../hooks/useVerifyCode';
import { useAuth } from '../context/AuthContext';
import { Button } from 'shared/ui/Button';
import { Input } from 'shared/ui/Input';
import { ROUTES } from 'app/router/routes';

export function VerifyCodeForm() {
  const { login } = useAuth();
  const verifyMutation = useVerifyCode();
  const location = useLocation();
  const navigate = useNavigate();
  const email = (location.state as { email?: string } | null)?.email ?? '';

  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (code.length !== 6 || !email) return;
    setError('');
    try {
      const data = await verifyMutation.mutateAsync({ email, code });
      login({ token: data.token, email: data.email, userId: data.userId, avatarData: data.avatarData });
      navigate(ROUTES.tasks, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kod dogrulanamadi');
    }
  };

  if (!email) {
    return (
      <div className="max-w-sm mx-auto mt-10 text-center text-muted">
        Once{' '}
        <Link to={ROUTES.login} className="text-brand-bright hover:underline">
          giris
        </Link>{' '}
        yapin.
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="max-w-sm mx-auto mt-10 bg-navy-800 border border-border rounded-xl p-10 animate-popIn"
    >
      <h2 className="text-2xl font-extrabold text-brand-bright text-center mb-2">
        Dogrulama Kodu
      </h2>
      <p className="text-center text-muted text-sm mb-6">
        <strong>{email}</strong> adresine 6 haneli dogrulama kodu gonderildi
      </p>

      {error && (
        <div className="mb-4 px-3 py-2 rounded-md bg-status-red/10 border border-status-red/40 text-status-red text-sm text-center">
          {error}
        </div>
      )}

      <Input
        type="text"
        placeholder="6 haneli kod..."
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        maxLength={6}
        autoFocus
        className="mb-6 text-center tracking-[0.4em] text-xl"
      />

      <Button type="submit" block disabled={verifyMutation.isPending || code.length !== 6}>
        {verifyMutation.isPending ? 'Dogrulaniyor...' : 'Dogrula'}
      </Button>

      <Link
        to={ROUTES.login}
        className="block mt-4 text-center text-xs text-muted hover:text-ink"
      >
        Geri Don
      </Link>
    </form>
  );
}
