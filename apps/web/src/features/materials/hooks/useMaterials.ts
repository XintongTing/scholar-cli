import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api';

export function useQuestions() {
  return useQuery({
    queryKey: ['material-questions'],
    queryFn: () => api.getQuestions(),
  });
}

export function useMaterials(projectId: string) {
  return useQuery({
    queryKey: ['materials', projectId],
    queryFn: () => api.getMaterials(projectId),
    enabled: !!projectId,
  });
}

export function useSubmitMaterialText(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ questionKey, text }: { questionKey: string; text: string }) =>
      api.submitMaterialText(projectId, questionKey, text),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['materials', projectId] }),
  });
}

export function useSubmitMaterialFile(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ questionKey, file }: { questionKey: string; file: File }) =>
      api.submitMaterialFile(projectId, questionKey, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['materials', projectId] }),
  });
}

export function useSkipMaterial(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (questionKey: string) => api.skipMaterial(projectId, questionKey),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['materials', projectId] }),
  });
}

export function useConfirmMaterials(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.confirmMaterials(projectId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}
