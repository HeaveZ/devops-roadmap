import { useFiles } from 'features/files/hooks/useFiles';
import { FileDropzone } from 'features/files/components/FileDropzone';
import { FileList } from 'features/files/components/FileList';
import { Spinner } from 'shared/ui/Spinner';
import { EmptyState } from 'shared/ui/EmptyState';

export function FilesPage() {
  const { data: files = [], isLoading } = useFiles();

  return (
    <div className="flex flex-col gap-6">
      <FileDropzone />
      {isLoading ? (
        <Spinner label="Dosyalar yukleniyor..." />
      ) : files.length === 0 ? (
        <EmptyState>{'// Henuz dosya yuklenmemis'}</EmptyState>
      ) : (
        <FileList files={files} />
      )}
    </div>
  );
}
