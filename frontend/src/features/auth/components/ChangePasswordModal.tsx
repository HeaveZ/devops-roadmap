import { FormEvent, useState } from 'react';
import { useChangePassword } from '../hooks/useChangePassword';
import { useAuth } from '../context/AuthContext';
import { Modal } from 'shared/ui/Modal';
import { Button } from 'shared/ui/Button';
import { Input } from 'shared/ui/Input';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ open, onClose }: Props) {
  const { logout } = useAuth();
  const changeMutation = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(
    null,
  );

  const reset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setMessage(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentPassword.trim() || !newPassword.trim()) return;
    setMessage(null);
    try {
      await changeMutation.mutateAsync({ currentPassword, newPassword });
      setMessage({ kind: 'success', text: 'Şifre değiştirildi! Yeni şifrenizle giriş yapın...' });
      window.setTimeout(() => {
        reset();
        onClose();
        logout();
      }, 1500);
    } catch (err) {
      setMessage({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Mevcut şifre yanlış',
      });
      setCurrentPassword('');
    }
  };

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }}>
      <form onSubmit={submit}>
        <h3 className="text-xl font-bold text-brand-bright mb-2">Şifre Değiştir</h3>
        <p className="text-xs text-muted mb-5">
          Mevcut şifrenizi doğrulayın ve yeni şifrenizi girin
        </p>

        {message && (
          <div
            className={`mb-4 px-3 py-2 rounded-md text-sm text-center ${
              message.kind === 'success'
                ? 'bg-status-green/15 border border-status-green/40 text-status-green'
                : 'bg-status-red/15 border border-status-red/40 text-status-red'
            }`}
          >
            {message.text}
          </div>
        )}

        <Input
          type="password"
          placeholder="Mevcut şifre..."
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoFocus
          className="mb-4"
        />
        <Input
          type="password"
          placeholder="Yeni şifre..."
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="mb-6"
        />

        <Button type="submit" block disabled={changeMutation.isPending}>
          {changeMutation.isPending ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
        </Button>
      </form>
    </Modal>
  );
}
