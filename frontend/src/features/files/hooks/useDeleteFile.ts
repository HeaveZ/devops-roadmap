import { useMutation, useQueryClient } from '@tanstack/react-query';
import { filesApi } from '../api/filesApi';
import { filesQueryKey } from './useFiles';
import type { UploadedFile } from '../types';

export function useDeleteFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UploadedFile['id']) => filesApi.delete(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: filesQueryKey });
      const prev = qc.getQueryData<UploadedFile[]>(filesQueryKey);
      qc.setQueryData<UploadedFile[]>(filesQueryKey, (current) =>
        (current ?? []).filter((f) => f.id !== id),
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(filesQueryKey, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: filesQueryKey }),
  });
}
