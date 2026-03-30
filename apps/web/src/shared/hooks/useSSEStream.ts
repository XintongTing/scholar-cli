import { useRef, useState, useCallback } from 'react';
import { resolveApiPath } from '../config/api';

interface SSEOptions {
  url: string;
  method?: 'GET' | 'POST';
  body?: object;
  onChunk?: (text: string) => void;
  onProgress?: (data: Record<string, unknown>) => void;
  onDone?: (data?: Record<string, unknown>) => void;
  onError?: (code: string, message: string) => void;
}

type EventHandlers = Record<string, (data: unknown) => void>;

export function useSSEStream(handlers?: EventHandlers) {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(async (urlOrOptions: string | SSEOptions, options?: { method?: 'POST' | 'GET'; body?: object }) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsStreaming(true);

    let url: string;
    let method: 'GET' | 'POST' = 'POST';
    let body: object | undefined;
    let sseCallbacks: SSEOptions | undefined;

    if (typeof urlOrOptions === 'string') {
      url = urlOrOptions;
      method = options?.method || 'POST';
      body = options?.body;
    } else {
      url = urlOrOptions.url;
      method = urlOrOptions.method || 'POST';
      body = urlOrOptions.body;
      sseCallbacks = urlOrOptions;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(resolveApiPath(url), {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });

      if (!res.ok || !res.body) {
        const errMsg = `HTTP ${res.status}`;
        handlers?.error?.({ code: 'FETCH_FAILED', message: errMsg });
        sseCallbacks?.onError?.('FETCH_FAILED', errMsg);
        setIsStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const lines = part.trim().split('\n');
          let event = 'message';
          let data = '';
          for (const line of lines) {
            if (line.startsWith('event: ')) event = line.slice(7).trim();
            else if (line.startsWith('data: ')) data = line.slice(6).trim();
          }
          if (!data) continue;
          try {
            const parsed = JSON.parse(data);
            // handlers-style dispatch
            if (handlers?.[event]) {
              handlers[event](parsed);
            }
            // SSEOptions-style dispatch
            if (sseCallbacks) {
              if (event === 'chunk') {
                const text = parsed.content ?? parsed.text ?? '';
                sseCallbacks.onChunk?.(text);
              } else if (event === 'progress') {
                sseCallbacks.onProgress?.(parsed as Record<string, unknown>);
              } else if (event === 'done') {
                await (sseCallbacks.onDone?.(parsed as Record<string, unknown>));
              } else if (event === 'error') {
                sseCallbacks.onError?.(parsed.code ?? 'ERROR', parsed.message ?? '');
              }
            }
            if (event === 'done') {
              setIsStreaming(false);
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') {
        const msg = (err as Error).message;
        handlers?.error?.({ code: 'STREAM_ERROR', message: msg });
        sseCallbacks?.onError?.('STREAM_ERROR', msg);
      }
    } finally {
      setIsStreaming(false);
    }
  }, [handlers]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return { start, stop, isStreaming };
}
