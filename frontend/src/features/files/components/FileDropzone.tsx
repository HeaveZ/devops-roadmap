import { DragEvent, useRef, useState } from 'react';
import { cn } from 'shared/lib/cn';
import { useToast } from 'shared/ui/Toast';
import { useUploadFile } from '../hooks/useUploadFile';

const MAX_SIZE = 10 * 1024 * 1024;

export function FileDropzone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadFile();
  const toast = useToast();
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = async (list: FileList | null) => {
    if (!list) return;
    for (const file of Array.from(list)) {
      if (file.size > MAX_SIZE) {
        toast.error(`${file.name}: Dosya boyutu 10MB'dan kucuk olmali`);
        continue;
      }
      try {
        await upload.mutateAsync(file);
        toast.success(`${file.name} yuklendi`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Yukleme basarisiz');
      }
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    void handleFiles(e.dataTransfer.files);
  };

  return (
    <button
      type="button"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop as unknown as React.DragEventHandler<HTMLButtonElement>}
      onClick={() => inputRef.current?.click()}
      className={cn(
        'cursor-pointer rounded-xl border-2 border-dashed px-6 py-12 flex flex-col items-center justify-center text-center transition-all',
        dragOver
          ? 'border-brand-bright bg-brand/10'
          : 'border-border bg-navy-800 hover:border-white/25',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <div className="text-4xl text-brand-bright mb-2">
        {upload.isPending ? '...' : '+'}
      </div>
      <div className="text-sm text-ink">
        {upload.isPending
          ? 'Yukleniyor...'
          : 'Dosya yuklemek icin tikla veya surukle'}
      </div>
      <div className="text-xs text-muted mt-1">Maks. 10MB</div>
    </button>
  );
}
