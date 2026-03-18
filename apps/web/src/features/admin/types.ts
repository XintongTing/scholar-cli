export interface PromptVersion {
  id: string;
  nodeId: string;
  version: number;
  content: string;
  createdById: string;
  createdAt: string;
}

export interface PromptNode {
  id: string;
  name: string;
  description: string | null;
  currentVersion: number;
  testVersion: number | null;
  testUserIds: string[];
  callCount: number;
  avgTokens: number;
  versions: PromptVersion[];
  createdAt: string;
  updatedAt: string;
}
