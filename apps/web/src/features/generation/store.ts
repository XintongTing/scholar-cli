import { create } from 'zustand';

interface GenerationState {
  status: 'idle' | 'generating' | 'paused' | 'completed' | 'error';
  completedChapters: string[];
  currentChapterId: string | null;
  streamedContent: Record<string, string>;
  isPaused: boolean;
  isGenerating: boolean;
  setStatus: (status: 'idle' | 'generating' | 'paused' | 'completed' | 'error') => void;
  setCurrentChapter: (id: string | null) => void;
  addCompletedChapter: (id: string) => void;
  appendStreamedContent: (chapterId: string, chunk: string) => void;
  setIsPaused: (v: boolean) => void;
  setIsGenerating: (v: boolean) => void;
  reset: () => void;
}

export const useGenerationStore = create<GenerationState>((set) => ({
  status: 'idle',
  completedChapters: [],
  currentChapterId: null,
  streamedContent: {},
  isPaused: false,
  isGenerating: false,
  setStatus: (status) => set({ status }),
  setCurrentChapter: (id) => set({ currentChapterId: id }),
  addCompletedChapter: (id) =>
    set((s) => ({
      completedChapters: [...s.completedChapters, id],
      currentChapterId: null,
    })),
  appendStreamedContent: (chapterId, chunk) =>
    set((s) => ({
      streamedContent: {
        ...s.streamedContent,
        [chapterId]: (s.streamedContent[chapterId] || '') + chunk,
      },
    })),
  setIsPaused: (v) => set({ isPaused: v }),
  setIsGenerating: (v) => set({ isGenerating: v }),
  reset: () =>
    set({
      status: 'idle',
      completedChapters: [],
      currentChapterId: null,
      streamedContent: {},
      isPaused: false,
      isGenerating: false,
    }),
}));
