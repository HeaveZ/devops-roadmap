import { KeyboardEvent, useState } from 'react';
import { useAuth } from 'features/auth/context/AuthContext';
import { Avatar } from 'shared/ui/Avatar';
import { Button } from 'shared/ui/Button';

interface Props {
  onSubmit: (text: string) => void;
}

export function CommentForm({ onSubmit }: Props) {
  const { user } = useAuth();
  const [value, setValue] = useState('');

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submit();
  };

  return (
    <div className="flex items-center gap-2 pt-3 border-t border-white/5 mt-2">
      <Avatar src={user?.avatarData ?? null} name={user?.email} size="sm" />
      <input
        type="text"
        value={value}
        placeholder={`${user?.email?.split('@')[0] ?? 'Anonim'} olarak yorum yaz...`}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        className="flex-1 bg-navy-700 border border-border rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:border-brand-bright"
      />
      <Button type="button" size="sm" onClick={submit}>
        Gonder
      </Button>
    </div>
  );
}
