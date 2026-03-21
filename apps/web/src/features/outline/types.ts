export interface Outline {
  id: string;
  projectId: string;
  title: string;
  abstract: string | null;
  confirmed: boolean;
  chapters: Chapter[];
  createdAt: string;
  updatedAt: string;
}

export interface Chapter {
  id: string;
  outlineId: string;
  order: number;
  level: number;
  parentId?: string | null;
  title: string;
  description: string | null;
  wordCountTarget: number;
  collapsed?: boolean;
}

export interface ChatMessage {
  id: string;
  projectId?: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}
