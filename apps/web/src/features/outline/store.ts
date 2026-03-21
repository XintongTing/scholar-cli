import { create } from 'zustand';

interface Chapter {
  id: string;
  order: number;
  level: number;
  parentId?: string | null;
  title: string;
  description?: string;
  wordCountTarget: number;
  collapsed?: boolean;
}

interface Outline {
  id: string;
  title: string;
  abstract?: string;
  confirmed: boolean;
  chapters: Chapter[];
}

interface ChatMessage {
  id: string;
  projectId?: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface OutlineState {
  outline: Outline | null;
  chatMessages: ChatMessage[];
  streamingText: string;
  isStreaming: boolean;
  setOutline: (outline: Outline | null) => void;
  addChatMessage: (msg: ChatMessage) => void;
  setMessages: (msgs: ChatMessage[]) => void;
  appendToLastAssistantMessage: (chunk: string) => void;
  appendStreamChunk: (chunk: string) => void;
  finalizeStream: (fullText: string) => void;
  setIsStreaming: (v: boolean) => void;
}

export const useOutlineStore = create<OutlineState>((set) => ({
  outline: null,
  chatMessages: [],
  streamingText: '',
  isStreaming: false,
  setOutline: (outline) => set({ outline }),
  addChatMessage: (msg) => set((s) => ({
    chatMessages: [...s.chatMessages, msg],
    isStreaming: msg.role === 'user'
  })),
  setMessages: (msgs) => set({ chatMessages: msgs }),
  appendToLastAssistantMessage: (chunk) => set((s) => {
    const messages = [...s.chatMessages];
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'assistant') {
      lastMsg.content += chunk;
    } else {
      messages.push({
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: chunk,
        createdAt: new Date().toISOString(),
      });
    }
    return { chatMessages: messages };
  }),
  appendStreamChunk: (chunk) => set((s) => ({ streamingText: s.streamingText + chunk })),
  finalizeStream: (fullText) =>
    set((s) => ({
      streamingText: '',
      isStreaming: false,
      chatMessages: [
        ...s.chatMessages,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: fullText,
          createdAt: new Date().toISOString(),
        },
      ],
    })),
  setIsStreaming: (v) => set({ isStreaming: v }),
}));
