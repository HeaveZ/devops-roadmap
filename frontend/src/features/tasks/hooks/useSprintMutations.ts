import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sprintsApi } from '../api/sprintsApi';
import { sprintsQueryKey } from './useSprints';
import type { Sprint } from '../types';

export function useCreateSprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; start_date?: string; end_date?: string }) =>
      sprintsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: sprintsQueryKey }),
  });
}

export function useUpdateSprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: Partial<Sprint> }) =>
      sprintsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: sprintsQueryKey }),
  });
}

export function useDeleteSprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => sprintsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: sprintsQueryKey }),
  });
}
