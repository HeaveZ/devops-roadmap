import { KeyboardEvent, useState } from 'react';
import { Button } from 'shared/ui/Button';

interface Props {
  onCreate: (title: string) => void;
  onCancel: () => void;
}

export function SubtaskForm({ onCreate, onCancel }: Props) {
  const [value, setValue] = useState('');

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setValue('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submit();
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div className="flex gap-2 pl-6 mt-2">
      <input
        autoFocus
        type="text"
        value={value}
        placeholder="Alt gorev basligi..."
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        className="flex-1 bg-navy-800 border border-border rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:border-brand-bright"
      />
      <Button type="button" size="sm" onClick={submit}>
        Ekle
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
        Iptal
      </Button>
    </div>
  );
}
