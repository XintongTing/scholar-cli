import { useCallback, useMemo } from 'react';
import { useGenerationStore } from '../store';
import { useSSEStream } from '../../../shared/hooks/useSSEStream';
import type { ChunkEvent, ProgressEvent } from '../types';

export function useGeneration(projectId: string) {
  const {
    status,
    completedChapters,
    currentChapterId,
    streamedContent,
    isPaused,
    setStatus,
    addCompletedChapter,
    setCurrentChapter,
    appendStreamedContent,
    setIsPaused,
    reset,
  } = useGenerationStore();

  const handlers = useMemo(
    () => ({
      chunk: (data: unknown) => {
        const { chapterId, text } = data as ChunkEvent;
        setCurrentChapter(chapterId);
        appendStreamedContent(chapterId, text);
      },
      chapter_done: (data: unknown) => {
        const { chapterId } = data as ProgressEvent;
        addCompletedChapter(chapterId);
        setCurrentChapter(null);
      },
      done: () => {
        setStatus('completed');
      },
    }),
    [setCurrentChapter, appendStreamedContent, addCompletedChapter, setStatus],
  );

  const { start, stop, isStreaming } = useSSEStream(handlers);

  const startGeneration = useCallback(() => {
    reset();
    setStatus('generating');
    start(`/api/projects/${projectId}/generate`);
  }, [projectId, reset, setStatus, start]);

  const pauseGeneration = useCallback(async () => {
    stop();
    setIsPaused(true);
    setStatus('paused');
    await fetch(
      `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/api/projects/${projectId}/generate/pause`,
      { method: 'POST' },
    );
  }, [projectId, stop, setIsPaused, setStatus]);

  const resumeGeneration = useCallback(() => {
    setIsPaused(false);
    setStatus('generating');
    start(`/api/projects/${projectId}/generate/resume`);
  }, [projectId, setIsPaused, setStatus, start]);

  return {
    status,
    completedChapters,
    currentChapterId,
    streamedContent,
    isPaused,
    isStreaming,
    startGeneration,
    pauseGeneration,
    resumeGeneration,
  };
}
