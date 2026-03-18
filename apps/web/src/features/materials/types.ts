export interface Material {
  id: string;
  projectId: string;
  questionKey: string;
  label: string;
  fileKey: string | null;
  textContent: string | null;
  skipped: boolean;
  createdAt: string;
}

export interface MaterialQuestion {
  key: string;
  label: string;
  description: string;
  required: boolean;
}
