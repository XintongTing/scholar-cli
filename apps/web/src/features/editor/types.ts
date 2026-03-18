export interface Document {
  id: string;
  projectId: string;
  version: number;
  content: Record<string, unknown>;
  status: 'GENERATING' | 'PAUSED' | 'COMPLETED';
  checkpointChapterId: string | null;
  createdAt: string;
  updatedAt: string;
}
