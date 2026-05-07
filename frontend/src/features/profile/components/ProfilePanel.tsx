import { useState, useMemo } from 'react';
import { useAuth } from 'features/auth/context/AuthContext';
import { useTasks } from 'features/tasks/hooks/useTasks';
import { ChangePasswordModal } from 'features/auth/components/ChangePasswordModal';
import { Button } from 'shared/ui/Button';
import { AvatarUploader } from './AvatarUploader';

export function ProfilePanel() {
  const { user, logout } = useAuth();
  const { data: tasks = [] } = useTasks();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const stats = useMemo(() => {
    const myTasks = tasks.filter((t) => t.assignee_email === user?.email);
    const completed = myTasks.filter((t) => t.completed).length;
    const overdue = myTasks.filter(
      (t) => !t.completed && t.due_date && new Date(t.due_date).getTime() < Date.now(),
    ).length;
    const totalComments = tasks.reduce((acc, t) => {
      return acc + (t.comments ?? []).filter((c) => c.author === user?.email).length;
    }, 0);
    return { assigned: myTasks.length, completed, overdue, totalComments };
  }, [tasks, user?.email]);

  if (!user) return null;

  const joinDate = new Date().toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
  });

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <h2 className="text-2xl font-extrabold text-ink">
        Profil <span className="text-brand-bright">Ayarlari</span>
      </h2>

      {/* Profil karti */}
      <section className="bg-navy-800 border border-border rounded-xl p-6">
        <div className="flex items-center gap-5">
          <AvatarUploader />
        </div>
      </section>

      {/* Istatistikler */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat label="Atanan Gorev" value={stats.assigned} color="text-brand-bright" />
        <MiniStat label="Tamamlanan" value={stats.completed} color="text-status-green" />
        <MiniStat label="Geciken" value={stats.overdue} color="text-status-red" />
        <MiniStat label="Yorum" value={stats.totalComments} color="text-accent-orange" />
      </section>

      {/* Hesap bilgileri */}
      <section className="bg-navy-800 border border-border rounded-xl p-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted mb-4">
          Hesap Bilgileri
        </h3>
        <div className="flex flex-col gap-3">
          <InfoRow label="E-posta" value={user.email} />
          <InfoRow label="Uyelik" value={joinDate} />
          <InfoRow
            label="Rol"
            value={
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-brand/15 text-brand-bright border border-brand/30">
                Gelistirici
              </span>
            }
          />
        </div>
        <div className="flex gap-3 mt-5 pt-5 border-t border-border/40">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowPasswordModal(true)}
          >
            Sifre Degistir
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-status-red hover:bg-status-red/10"
          >
            Cikis Yap
          </Button>
        </div>
      </section>

      {/* Klavye kisayollari */}
      <section className="bg-navy-800 border border-border rounded-xl p-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted mb-4">
          Klavye Kisayollari
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <ShortcutRow keys="Ctrl + K" label="Hizli arama" />
          <ShortcutRow keys="Enter" label="Gorev olustur" />
          <ShortcutRow keys="Esc" label="Modali kapat" />
          <ShortcutRow keys="Click" label="Oncelik degistir" />
        </div>
      </section>

      <ChangePasswordModal
        open={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-navy-800 border border-border rounded-xl px-4 py-3 text-center">
      <div className={`text-xl font-extrabold ${color}`}>{value}</div>
      <div className="text-[10px] tracking-widest text-muted mt-1 uppercase">{label}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted w-20 shrink-0">{label}</span>
      <span className="text-sm text-ink">{value}</span>
    </div>
  );
}

function ShortcutRow({ keys, label }: { keys: string; label: string }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <kbd className="px-2 py-1 bg-navy-900 border border-border/60 rounded text-[10px] font-mono text-muted shrink-0">
        {keys}
      </kbd>
      <span className="text-xs text-ink-secondary">{label}</span>
    </div>
  );
}
