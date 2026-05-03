import { usePageTitle } from 'shared/hooks/usePageTitle';
import { useFiles } from 'features/files/hooks/useFiles';
import { FileDropzone } from 'features/files/components/FileDropzone';
import { FileList } from 'features/files/components/FileList';
import { Spinner } from 'shared/ui/Spinner';
import { EmptyState } from 'shared/ui/EmptyState';

export function FilesPage() {
  usePageTitle('Dosyalar');
  const { data: files = [], isLoading } = useFiles();

  const renderContent = () => {
    if (isLoading) return <Spinner label="Dosyalar yükleniyor..." />;
    if (files.length === 0) return <EmptyState>{'// Henüz dosya yüklenmemiş'}</EmptyState>;
    return <FileList files={files} />;
  };

  return (
    <div className="flex flex-col gap-6">
      <FileDropzone />
      {renderContent()}
    </div>
  );
}
