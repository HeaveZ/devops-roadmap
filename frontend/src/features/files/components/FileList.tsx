import { formatFileSize } from 'shared/lib/date';
import type { UploadedFile } from '../types';
import { FileItem } from './FileItem';

export function FileList({ files }: { files: UploadedFile[] }) {
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs text-muted">
        {files.length} dosya · Toplam {formatFileSize(totalSize)}
      </div>
      <div className="flex flex-col gap-2">
        {files.map((f) => (
          <FileItem key={f.id} file={f} />
        ))}
      </div>
    </div>
  );
}
