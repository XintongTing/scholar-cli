import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api';
import { useOutlineStore } from '../store';

export function useOutlineEditor(projectId: string) {
  const qc = useQueryClient();
  const { setOutline } = useOutlineStore();

  const { data: outline, isLoading } = useQuery({
    queryKey: ['outline', projectId],
    queryFn: async () => {
      const result = await api.getOutline(projectId);
      setOutline(result);
      return result;
    },
    enabled: !!projectId,
  });

  const addChapter = useMutation({
    mutationFn: (data: { title: string; description?: string; wordCountTarget?: number }) =>
      api.addChapter(projectId, data),
    onSuccess: async () => {
      const updated = await api.getOutline(projectId);
      setOutline(updated);
      qc.setQueryData(['outline', projectId], updated);
    },
  });

  const updateChapter = useMutation({
    mutationFn: ({ chapterId, data }: { chapterId: string; data: { title?: string; description?: string; wordCountTarget?: number } }) =>
      api.updateChapter(projectId, chapterId, data),
    onSuccess: async () => {
      const updated = await api.getOutline(projectId);
      setOutline(updated);
      qc.setQueryData(['outline', projectId], updated);
    },
  });

  const deleteChapter = useMutation({
    mutationFn: (chapterId: string) => api.deleteChapter(projectId, chapterId),
    onSuccess: async () => {
      const updated = await api.getOutline(projectId);
      setOutline(updated);
      qc.setQueryData(['outline', projectId], updated);
    },
  });

  const confirmOutline = useMutation({
    mutationFn: () => api.confirmOutline(projectId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });

  return { outline, isLoading, addChapter, updateChapter, deleteChapter, confirmOutline };
}
