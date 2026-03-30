const rawApiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';

export function getApiOrigin() {
  if (rawApiUrl) return rawApiUrl;
  if (import.meta.env.DEV) return 'http://localhost:3000';
  return window.location.origin;
}

export function getApiBaseUrl() {
  return `${getApiOrigin()}/api/v1`;
}

export function resolveApiPath(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getApiOrigin()}${normalizedPath}`;
}
