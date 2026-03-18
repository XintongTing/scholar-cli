import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api';

export function useLiterature(projectId: string) {
  return useQuery({
    queryKey: ['literature', projectId],
    queryFn: () => api.getLiterature(projectId),
    enabled: !!projectId,
  });
}

export function useUploadLiterature(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => api.uploadLiterature(projectId, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['literature', projectId] }),
  });
}

export function useDeleteLiterature(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (litId: string) => api.deleteLiterature(projectId, litId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['literature', projectId] }),
  });
}

export function useConfirmLiterature(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.confirmLiterature(projectId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}
