import { useState, useRef, useEffect } from 'react';
import { Send, Square } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { useOutlineChat } from '../hooks/useOutlineChat';
import { Spinner } from '../../../shared/components/Spinner';
import type { ChatMessage as ChatMessageType } from '../types';

interface ChatInterfaceProps {
  projectId: string;
  initialMessages?: ChatMessageType[];
}

export function ChatInterface({ projectId, initialMessages = [] }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const { chatMessages, sendMessage, stop, isStreaming } = useOutlineChat(projectId);

  const allMessages = initialMessages.length > 0 && chatMessages.length === 0
    ? initialMessages
    : chatMessages;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages]);

  function handleSend() {
    const msg = input.trim();
    if (!msg || isStreaming) return;
    setInput('');
    sendMessage(msg);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {allMessages.length === 0 && (
          <div className="flex items-center justify-center h-full text-sm text-text-tertiary">
            向 AI 描述您的研究，开始规划大纲
          </div>
        )}
        {allMessages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isStreaming && allMessages[allMessages.length - 1]?.role === 'user' && (
          <div className="flex justify-start">
            <div className="bg-bg-subtle border border-border rounded-lg px-4 py-2.5">
              <Spinner size="sm" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border p-3 flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="描述您的研究需求..."
          rows={2}
          className="flex-1 resize-none rounded-md border border-border bg-bg-base px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          disabled={isStreaming}
        />
        {isStreaming ? (
          <button
            onClick={stop}
            className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-md bg-danger text-white hover:opacity-90 transition-opacity"
            aria-label="停止"
          >
            <Square size={14} strokeWidth={1.5} />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-md bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="发送"
          >
            <Send size={14} strokeWidth={1.5} />
          </button>
        )}
      </div>
    </div>
  );
}
