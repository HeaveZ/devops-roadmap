import { useState } from 'react';
import { useAuth } from 'features/auth/context/AuthContext';
import { ChangePasswordModal } from 'features/auth/components/ChangePasswordModal';
import { Button } from 'shared/ui/Button';
import { AvatarUploader } from './AvatarUploader';

export function ProfilePanel() {
  const { user } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  if (!user) return null;

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-6">
      <h2 className="text-2xl font-extrabold text-ink">
        Profil <span className="text-brand-bright">Ayarlari</span>
      </h2>

      <section className="bg-navy-800 border border-border rounded-xl p-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted mb-4">
          Fotograf
        </h3>
        <AvatarUploader />
      </section>

      <section className="bg-navy-800 border border-border rounded-xl p-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted mb-4">
          Hesap
        </h3>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs text-muted w-24">E-posta</span>
          <span className="text-sm text-ink">{user.email}</span>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setShowPasswordModal(true)}
        >
          Sifre Degistir
        </Button>
      </section>

      <ChangePasswordModal
        open={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </div>
  );
}
