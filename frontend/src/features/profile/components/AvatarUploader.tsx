import { ChangeEvent, useRef } from 'react';
import { useAuth } from 'features/auth/context/AuthContext';
import { Avatar } from 'shared/ui/Avatar';
import { Button } from 'shared/ui/Button';
import { useToast } from 'shared/ui/Toast';
import { useUploadAvatar } from '../hooks/useUploadAvatar';

const MAX_BYTES = 2 * 1024 * 1024;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Dosya okunamadi'));
    reader.readAsDataURL(file);
  });
}

export function AvatarUploader() {
  const { user, setAvatar } = useAuth();
  const upload = useUploadAvatar();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const onChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast.error("Dosya boyutu 2MB'dan kucuk olmali");
      return;
    }
    try {
      const dataUrl = await readAsDataUrl(file);
      const result = await upload.mutateAsync(dataUrl);
      if (result.success) {
        setAvatar(result.avatarData);
        toast.success('Avatar guncellendi');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Avatar yuklenemedi');
    }
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar src={user?.avatarData ?? null} name={user?.email} size="lg" />
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onChange}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
        >
          {upload.isPending ? 'Yukleniyor...' : 'Fotograf Degistir'}
        </Button>
        <span className="text-[11px] text-muted">Maks. 2MB, kare fotograf onerilir</span>
      </div>
    </div>
  );
}
