export interface Project {
  id: string;
  userId: string;
  title: string;
  status: ProjectStatus;
  userProfile: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type ProjectStatus =
  | 'OUTLINE'
  | 'LITERATURE'
  | 'MATERIALS'
  | 'GENERATING'
  | 'EDITING'
  | 'COMPLETED';
