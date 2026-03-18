import { cn } from '../../../shared/utils/cn';
import type { ChatMessage as ChatMessageType } from '../types';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-primary text-white rounded-br-sm'
            : 'bg-bg-subtle text-text-primary border border-border rounded-bl-sm',
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}
