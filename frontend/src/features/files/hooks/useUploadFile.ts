import { useMutation, useQueryClient } from '@tanstack/react-query';
import { filesApi } from '../api/filesApi';
import { filesQueryKey } from './useFiles';
import type { UploadedFile } from '../types';

export function useUploadFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => filesApi.upload(file),
    onSuccess: (created) => {
      qc.setQueryData<UploadedFile[]>(filesQueryKey, (current) => [
        created,
        ...(current ?? []),
      ]);
    },
  });
}
