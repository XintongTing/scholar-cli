import { useCallback, useMemo } from 'react';
import { useOutlineStore } from '../store';
import { useSSEStream } from '../../../shared/hooks/useSSEStream';

export function useOutlineChat(projectId: string) {
  const { chatMessages, addChatMessage, appendToLastAssistantMessage } = useOutlineStore();

  const handlers = useMemo(
    () => ({
      chunk: (data: unknown) => {
        const d = data as { text?: string; content?: string };
        appendToLastAssistantMessage(d.content ?? d.text ?? '');
      },
      done: () => {
        // streaming complete
      },
    }),
    [appendToLastAssistantMessage],
  );

  const { start, stop, isStreaming } = useSSEStream(handlers);

  const sendMessage = useCallback(
    (message: string) => {
      addChatMessage({
        id: `user-${Date.now()}`,
        projectId,
        role: 'user',
        content: message,
        createdAt: new Date().toISOString(),
      });

      start(`/api/v1/projects/${projectId}/outline/chat`, {
        method: 'POST',
        body: { message },
      });
    },
    [projectId, addChatMessage, start],
  );

  return { chatMessages, sendMessage, stop, isStreaming };
}
