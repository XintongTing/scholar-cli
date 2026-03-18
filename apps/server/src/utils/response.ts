import { randomUUID } from 'crypto';

export function ok<T>(data: T) {
  return {
    data,
    error: null,
    meta: {
      requestId: randomUUID(),
      timestamp: new Date().toISOString()
    }
  };
}

export function fail(code: string, message: string) {
  return {
    data: null,
    error: { code, message },
    meta: {
      requestId: randomUUID(),
      timestamp: new Date().toISOString()
    }
  };
}
