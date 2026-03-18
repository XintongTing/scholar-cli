export interface ApiResponse<T> {
  data: T | null;
  error: { code: string; message: string } | null;
  meta: {
    requestId: string;
    timestamp: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  cursor: string | null;
  hasMore: boolean;
}
