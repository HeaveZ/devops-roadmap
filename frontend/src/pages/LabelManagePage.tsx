import { useState } from 'react';
import { usePageTitle } from 'shared/hooks/usePageTitle';
import { useLabels } from 'features/tasks/hooks/useLabels';
import { useCreateLabel, useDeleteLabel } from 'features/tasks/hooks/useLabelMutations';
import { Button } from 'shared/ui/Button';
import { useToast } from 'shared/ui/Toast';
import { Spinner } from 'shared/ui/Spinner';

export function LabelManagePage() {
  usePageTitle('Etiket Yönetimi');
  const { data: labels = [], isLoading } = useLabels();
  const createLabel = useCreateLabel();
  const deleteLabel = useDeleteLabel();
  const toast = useToast();

  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');

  const handleCreate = () => {
    if (!name.trim()) return;
    createLabel.mutate(
      { name: name.trim(), color },
      {
        onSuccess: () => { toast.success('Etiket oluşturuldu'); setName(''); },
        onError: () => toast.error('Etiket oluşturulamadı'),
      },
    );
  };

  if (isLoading) return <Spinner label="Etiketler yükleniyor..." />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-extrabold text-ink">Etiket Yönetimi</h2>
        <p className="text-sm text-muted mt-1">Etiketleri oluştur ve yönet</p>
      </div>

      {/* Oluşturma formu */}
      <div className="bg-navy-800 border border-border rounded-xl p-5">
        <h3 className="text-xs tracking-widest text-muted uppercase mb-3">Yeni Etiket</h3>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Etiket adı..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            className="flex-1 px-3 py-2 bg-navy-900 border border-border rounded-lg text-sm text-ink placeholder:text-muted/70 focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/30"
          />
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-navy-900"
          />
          <Button size="sm" onClick={handleCreate} disabled={!name.trim() || createLabel.isPending}>
            Oluştur
          </Button>
        </div>
      </div>

      {/* Etiket listesi */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {labels.map((label) => (
          <div
            key={label.id}
            className="bg-navy-800 border border-border rounded-xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: label.color }}
              />
              <span className="text-sm font-medium text-ink">{label.name}</span>
            </div>
            <button
              onClick={() => {
                deleteLabel.mutate(label.id, {
                  onSuccess: () => toast.success('Etiket silindi'),
                });
              }}
              className="text-xs text-muted hover:text-status-red transition-colors"
            >
              Sil
            </button>
          </div>
        ))}
        {labels.length === 0 && (
          <div className="col-span-full text-center text-muted py-10">Henüz etiket oluşturulmamış</div>
        )}
      </div>
    </div>
  );
}
