import { formatFileSize, formatFullDate } from 'shared/lib/date';
import { Button } from 'shared/ui/Button';
import { useDeleteFile } from '../hooks/useDeleteFile';
import type { UploadedFile } from '../types';

const isImage = (mimetype: string) => mimetype?.startsWith('image/') ?? false;
const extOf = (filename: string) =>
  (filename.split('.').pop() ?? '').toUpperCase();

export function FileItem({ file }: { file: UploadedFile }) {
  const del = useDeleteFile();

  return (
    <div className="flex items-center gap-4 px-4 py-3 rounded-lg bg-navy-800 border border-border hover:border-white/20 transition-colors">
      <div className="w-12 h-12 rounded-md bg-navy-700 border border-border overflow-hidden flex items-center justify-center shrink-0">
        {isImage(file.mimetype) ? (
          <img src={file.url} alt={file.filename} className="w-full h-full object-cover" />
        ) : (
          <span className="text-[10px] font-bold text-muted">{extOf(file.filename)}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-ink truncate" title={file.filename}>
          {file.filename}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted mt-0.5">
          <span>{formatFileSize(file.size)}</span>
          <span>·</span>
          <span>{file.uploaded_by}</span>
          <span>·</span>
          <span>{formatFullDate(file.created_at)}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 text-xs rounded-md bg-brand/10 border border-brand/30 text-brand-bright hover:bg-brand/20"
        >
          Indir
        </a>
        <Button size="sm" variant="danger" onClick={() => del.mutate(file.id)}>
          Sil
        </Button>
      </div>
    </div>
  );
}
