import { useQuery } from '@tanstack/react-query';
import { labelsApi } from '../api/labelsApi';

export const labelsQueryKey = ['labels'] as const;

export function useLabels() {
  return useQuery({ queryKey: labelsQueryKey, queryFn: labelsApi.list });
}
