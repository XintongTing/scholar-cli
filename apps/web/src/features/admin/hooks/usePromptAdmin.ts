import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api';

export function usePromptNodes() {
  return useQuery({
    queryKey: ['prompt-nodes'],
    queryFn: () => api.listNodes(),
  });
}

export function usePromptNode(nodeId: string) {
  return useQuery({
    queryKey: ['prompt-nodes', nodeId],
    queryFn: () => api.getNode(nodeId),
    enabled: !!nodeId,
  });
}

export function useUpdateContent(nodeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => api.updateContent(nodeId, content),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prompt-nodes', nodeId] }),
  });
}

export function useRollback(nodeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (targetVersion: number) => api.rollback(nodeId, targetVersion),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prompt-nodes', nodeId] }),
  });
}

export function useSetTestVersion(nodeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ version, testUserIds }: { version: number | null; testUserIds: string[] }) =>
      api.setTestVersion(nodeId, version, testUserIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prompt-nodes', nodeId] }),
  });
}

export function useMetrics(nodeId: string) {
  return useQuery({
    queryKey: ['prompt-metrics', nodeId],
    queryFn: () => api.getMetrics(nodeId),
    enabled: !!nodeId,
    refetchInterval: 30000,
  });
}
