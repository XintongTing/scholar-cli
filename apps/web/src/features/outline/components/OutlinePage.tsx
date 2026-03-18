import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Plus, Trash2, CheckCircle, GripVertical } from 'lucide-react';
import { useOutlineStore } from '../store';
import { outlineApi } from '../api';
import { useSSEStream } from '../../../shared/hooks/useSSEStream';
import { Button } from '../../../shared/components/Button';
import { Spinner } from '../../../shared/components/Spinner';
import { cn } from '../../../shared/utils/cn';

// Strip JSON blocks from AI messages — show only natural language
function sanitizeAIMessage(text: string): string {
  let cleaned = text.replace(/```json[\s\S]*?```/gi, '').trim();
  // Remove bare JSON objects (lines starting with { ... })
  cleaned = cleaned.replace(/\{[\s\S]*?\}/g, '').trim();
  if (!cleaned) return '大纲已更新，请在右侧查看最新内容。';
  return cleaned;
}

interface Chapter {
  id: string;
  order: number;
  title: string;
  description?: string | null;
  wordCountTarget: number;
}

export function OutlinePage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    outline, chatMessages: messages, streamingText, isStreaming,
    setOutline, setMessages, appendStreamChunk, finalizeStream,
    setIsStreaming, addChatMessage: addMessage
  } = useOutlineStore();
  const { start } = useSSEStream();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editWordCount, setEditWordCount] = useState<number>(1000);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef('');

  // Drag state
  const dragIndexRef = useRef<number | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);

  useEffect(() => {
    setChapters(outline?.chapters ?? []);
  }, [outline]);

  const totalWordCount = chapters.reduce((sum, c) => sum + (c.wordCountTarget || 0), 0);

  useEffect(() => {
    if (!projectId) return;
    Promise.all([
      outlineApi.get(projectId),
      outlineApi.getChatHistory(projectId),
    ]).then(([outlineRes, chatRes]) => {
      setOutline(outlineRes.data.data);
      const history = chatRes.data.data || [];
      setMessages(history);
      if (history.length === 0) {
        const userMsg = '请根据我的研究信息，帮我生成一份详细的论文大纲。';
        addMessage({ id: Date.now().toString(), role: 'user', content: userMsg, createdAt: new Date().toISOString() });
        setIsStreaming(true);
        streamRef.current = '';
        start({
          url: `/api/v1/projects/${projectId}/outline/chat`,
          body: { message: userMsg },
          onChunk: (chunk) => { streamRef.current += chunk; appendStreamChunk(chunk); },
          onDone: async () => {
            finalizeStream(sanitizeAIMessage(streamRef.current));
            const res = await outlineApi.get(projectId);
            setOutline(res.data.data);
          },
          onError: () => { setIsStreaming(false); },
        });
      }
    }).finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const handleSend = () => {
    if (!input.trim() || isStreaming || !projectId) return;
    const userMsg = input.trim();
    setInput('');
    addMessage({ id: Date.now().toString(), role: 'user', content: userMsg, createdAt: new Date().toISOString() });
    setIsStreaming(true);
    streamRef.current = '';
    start({
      url: `/api/v1/projects/${projectId}/outline/chat`,
      body: { message: userMsg },
      onChunk: (chunk) => { streamRef.current += chunk; appendStreamChunk(chunk); },
      onDone: async () => {
        finalizeStream(sanitizeAIMessage(streamRef.current));
        const res = await outlineApi.get(projectId);
        setOutline(res.data.data);
      },
      onError: (_code, _msg) => { setIsStreaming(false); },
    });
  };

  const handleConfirm = async () => {
    if (!projectId) return;
    await outlineApi.confirm(projectId);
    navigate(`/projects/${projectId}/literature`);
  };

  const handleAddChapter = async () => {
    if (!projectId) return;
    await outlineApi.addChapter(projectId, { title: '新章节', wordCountTarget: 1000 });
    const res = await outlineApi.get(projectId);
    setOutline(res.data.data);
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!projectId) return;
    await outlineApi.deleteChapter(projectId, chapterId);
    const res = await outlineApi.get(projectId);
    setOutline(res.data.data);
  };

  const startEdit = (chapter: Chapter) => {
    setEditingChapterId(chapter.id);
    setEditTitle(chapter.title);
    setEditDesc(chapter.description || '');
    setEditWordCount(chapter.wordCountTarget || 1000);
  };

  const saveEdit = async () => {
    if (!projectId || !editingChapterId) return;
    await outlineApi.updateChapter(projectId, editingChapterId, { title: editTitle, description: editDesc, wordCountTarget: editWordCount });
    const res = await outlineApi.get(projectId);
    setOutline(res.data.data);
    setEditingChapterId(null);
  };

  // Drag-to-reorder handlers
  const handleDragStart = useCallback((index: number) => {
    dragIndexRef.current = index;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    const from = dragIndexRef.current;
    if (from === null || from === index) return;
    setChapters((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      dragIndexRef.current = index;
      return next;
    });
  }, []);

  const handleDragEnd = useCallback(async () => {
    dragIndexRef.current = null;
    if (!projectId) return;
    // Persist new order: update each chapter's order field
    for (let i = 0; i < chapters.length; i++) {
      const ch = chapters[i];
      if (ch.order !== i + 1) {
        await outlineApi.updateChapter(projectId, ch.id, { title: ch.title, description: ch.description ?? '', wordCountTarget: ch.wordCountTarget, order: i + 1 });
      }
    }
    const res = await outlineApi.get(projectId);
    setOutline(res.data.data);
  }, [projectId, chapters]);

  if (loading) return <div className="flex items-center justify-center h-full"><Spinner size="lg" /></div>;

  return (
    <div className="flex h-full">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {messages.length === 0 && !isStreaming && (
            <div className="text-center py-12 text-text-secondary text-sm">
              <p className="mb-2">你好！我是你的论文写作助手</p>
              <p>请描述你的论文方向，我来帮你生成大纲</p>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                'max-w-[80%] px-4 py-3 rounded-lg text-sm leading-relaxed whitespace-pre-wrap',
                msg.role === 'user'
                  ? 'bg-primary-subtle border border-border text-text-primary'
                  : 'bg-bg-subtle text-text-primary'
              )}>
                {msg.role === 'assistant' ? sanitizeAIMessage(msg.content) : msg.content}
              </div>
            </div>
          ))}
          {isStreaming && streamingText && (
            <div className="flex justify-start">
              <div className="max-w-[80%] px-4 py-3 rounded-lg text-sm leading-relaxed bg-bg-subtle text-text-primary whitespace-pre-wrap">
                {sanitizeAIMessage(streamingText)}
                <span className="inline-block w-0.5 h-4 bg-text-primary animate-pulse ml-0.5 align-middle" />
              </div>
            </div>
          )}
          {isStreaming && !streamingText && (
            <div className="flex justify-start">
              <div className="px-4 py-3 rounded-lg bg-bg-subtle">
                <Spinner size="sm" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border px-4 py-3 flex gap-2">
          <textarea
            className="flex-1 px-3 py-2 bg-bg-muted border border-border rounded text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none"
            rows={2}
            placeholder="描述你的论文方向，或对大纲提出修改意见..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            disabled={isStreaming}
          />
          <Button variant="primary" size="md" onClick={handleSend} disabled={isStreaming || !input.trim()}>
            {isStreaming ? <Spinner size="sm" /> : <Send size={16} strokeWidth={1.5} />}
          </Button>
        </div>
      </div>

      {/* Right Panel: Outline */}
      <div className="w-80 border-l border-border bg-bg-subtle flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-primary">论文大纲</span>
            <button onClick={handleAddChapter} className="text-text-tertiary hover:text-primary transition-colors">
              <Plus size={16} strokeWidth={1.5} />
            </button>
          </div>
          {chapters.length > 0 && (
            <p className="text-xs text-text-tertiary mt-1">全文总字数目标：{totalWordCount.toLocaleString()} 字</p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {outline?.title && (
            <div className="px-2 py-1.5 mb-2">
              <p className="text-xs text-text-tertiary mb-0.5">标题</p>
              <p className="text-sm font-medium text-text-primary">{outline.title}</p>
            </div>
          )}
          {chapters.map((chapter, index) => (
            <div
              key={chapter.id}
              className="group"
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
            >
              {editingChapterId === chapter.id ? (
                <div className="p-2 bg-white border border-primary rounded space-y-1">
                  <input
                    className="w-full text-sm px-2 py-1 border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="章节标题"
                    autoFocus
                  />
                  <textarea
                    className="w-full text-xs px-2 py-1 border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                    rows={2}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="章节描述..."
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-text-tertiary shrink-0">目标字数</span>
                    <input
                      type="number"
                      className="flex-1 text-xs px-2 py-1 border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                      value={editWordCount}
                      onChange={(e) => setEditWordCount(Number(e.target.value))}
                      min={100}
                      step={100}
                    />
                    <span className="text-xs text-text-tertiary shrink-0">字</span>
                  </div>
                  <div className="flex gap-1 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => setEditingChapterId(null)}>取消</Button>
                    <Button size="sm" variant="primary" onClick={saveEdit}>保存</Button>
                  </div>
                </div>
              ) : (
                <div
                  className="flex items-start gap-2 px-2 py-2 rounded hover:bg-bg-muted cursor-pointer"
                  onClick={() => startEdit(chapter)}
                >
                  <span className="text-text-tertiary mt-1 shrink-0 cursor-grab active:cursor-grabbing">
                    <GripVertical size={14} strokeWidth={1.5} />
                  </span>
                  <span className="text-xs text-text-tertiary mt-0.5 shrink-0 w-4">{index + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary">{chapter.title}</p>
                    {chapter.description && (
                      <p className="text-xs text-text-tertiary mt-0.5 line-clamp-2">{chapter.description}</p>
                    )}
                    <p className="text-xs text-text-tertiary mt-0.5">{chapter.wordCountTarget} 字</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteChapter(chapter.id); }}
                    className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-danger transition-all"
                  >
                    <Trash2 size={14} strokeWidth={1.5} />
                  </button>
                </div>
              )}
            </div>
          ))}
          {chapters.length === 0 && (
            <p className="text-xs text-text-tertiary text-center py-8">大纲将在对话后生成</p>
          )}
        </div>

        <div className="px-3 py-3 border-t border-border">
          <Button
            variant="primary"
            size="md"
            className="w-full"
            onClick={handleConfirm}
            disabled={!chapters.length}
          >
            <CheckCircle size={16} strokeWidth={1.5} className="mr-1.5" />
            确认大纲
          </Button>
        </div>
      </div>
    </div>
  );
}
