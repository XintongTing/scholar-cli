export interface Literature {
  id: string;
  projectId: string;
  title: string;
  authors: string[];
  year: number | null;
  abstract: string | null;
  source: string | null;
  fileKey: string | null;
  confirmed: boolean;
  createdAt: string;
}
