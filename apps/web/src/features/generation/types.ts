export interface GenerationState {
  status: 'idle' | 'generating' | 'paused' | 'completed' | 'error';
  completedChapters: string[];
  currentChapterId: string | null;
  streamedContent: Record<string, string>;
  isPaused: boolean;
}

export interface ProgressEvent {
  chapterId: string;
  index: number;
  total: number;
}

export interface ChunkEvent {
  chapterId: string;
  text: string;
}
