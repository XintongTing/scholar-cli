import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Plus, Trash2, CheckCircle, GripVertical, Upload, X, FileText, ChevronRight, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useDropzone } from 'react-dropzone';
import { useOutlineStore } from '../store';
import { outlineApi } from '../api';
import { useSSEStream } from '../../../shared/hooks/useSSEStream';
import { Button } from '../../../shared/components/Button';
import { Spinner } from '../../../shared/components/Spinner';
import { cn } from '../../../shared/utils/cn';

// Strip JSON blocks from AI messages — show only natural language
function sanitizeAIMessage(text: string): string {
  // Remove complete fenced ```json ... ``` blocks
  let cleaned = text.replace(/```json[\s\S]*?```/gi, '').trim();
  // Remove incomplete/open ```json block that hasn't closed yet (streaming)
  cleaned = cleaned.replace(/```json[\s\S]*/gi, '').trim();
  if (!cleaned) return '大纲已更新，请在右侧查看最新内容。';
  return cleaned;
}

interface Chapter {
  id: string;
  order: number;
  level: number;
  parentId?: string | null;
  title: string;
  description?: string | null;
  wordCountTarget: number;
  collapsed?: boolean;
}

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
};

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
  // Thinking progress step index (0-3), advances every 2s while waiting
  const [thinkingStep, setThinkingStep] = useState(0);
  const thinkingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Attached files for chat
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  // Drag state — track by chapter ID, not index
  const dragIdRef = useRef<string | null>(null);
  const dragParentRef = useRef<string | null | undefined>(undefined);
  const isDraggingRef = useRef(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  // Track collapsed state locally for instant UI response
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Don't overwrite local drag state with server data
    if (isDraggingRef.current) return;
    const all: Chapter[] = outline?.chapters ?? [];
    setChapters(all);
    // Initialize collapsed state from server data
    setCollapsedIds(new Set(all.filter(c => c.collapsed).map(c => c.id)));
  }, [outline]);

  // Advance thinking step every 2s while waiting for first chunk
  useEffect(() => {
    if (isStreaming && !streamingText) {
      setThinkingStep(0);
      thinkingTimerRef.current = setInterval(() => {
        setThinkingStep(prev => Math.min(prev + 1, 3));
      }, 2000);
    } else {
      if (thinkingTimerRef.current) {
        clearInterval(thinkingTimerRef.current);
        thinkingTimerRef.current = null;
      }
    }
    return () => {
      if (thinkingTimerRef.current) clearInterval(thinkingTimerRef.current);
    };
  }, [isStreaming, streamingText]);

  // Only level-1 chapters contribute to total word count
  const totalWordCount = chapters
    .filter(c => (c.level ?? 1) === 1)
    .reduce((sum, c) => sum + (c.wordCountTarget || 0), 0);

  // Build tree structure for rendering — use array position, not order field
  // (order field lags behind during drag; array position is always current)
  const level1 = chapters.filter(c => (c.level ?? 1) === 1);
  const childrenOf = (parentId: string) =>
    chapters.filter(c => c.parentId === parentId);

  const toggleCollapse = async (chapterId: string) => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(chapterId)) next.delete(chapterId); else next.add(chapterId);
      return next;
    });
    if (!projectId) return;
    const ch = chapters.find(c => c.id === chapterId);
    if (ch) {
      await outlineApi.updateChapter(projectId, chapterId, { collapsed: !collapsedIds.has(chapterId) });
    }
  };

  const handleAddSubChapter = async (parentId: string, parentLevel: number) => {
    if (!projectId || parentLevel >= 3) return;
    await outlineApi.addChapter(projectId, {
      title: parentLevel === 1 ? '新小节' : '新子节',
      wordCountTarget: 500,
      level: parentLevel + 1,
      parentId,
    });
    const res = await outlineApi.get(projectId);
    setOutline(res.data.data);
  };

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
            const all = res.data.data?.chapters ?? [];
            setChapters(all);
            setCollapsedIds(new Set(all.filter((c: Chapter) => c.collapsed).map((c: Chapter) => c.id)));
            setOutline(res.data.data);
            setIsStreaming(false);
          },
          onError: () => { setIsStreaming(false); },
        });
      }
    }).finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const onDrop = useCallback((accepted: File[]) => {
    setAttachedFiles((prev) => [...prev, ...accepted]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    multiple: true,
    noClick: true,
  });

  const removeAttached = (idx: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSend = async () => {
    if (!input.trim() || isStreaming || !projectId) return;
    const userMsg = input.trim();
    const filesToSend = [...attachedFiles];
    setInput('');
    setAttachedFiles([]);
    addMessage({ id: Date.now().toString(), role: 'user', content: userMsg, createdAt: new Date().toISOString() });
    setIsStreaming(true);
    streamRef.current = '';

    // Read file contents as text
    let fileContents: Array<{ name: string; content: string }> | undefined;
    if (filesToSend.length > 0) {
      fileContents = await Promise.all(filesToSend.map(async (f) => ({
        name: f.name,
        content: await f.text()
      })));
    }

    start({
      url: `/api/v1/projects/${projectId}/outline/chat`,
      body: { message: userMsg, fileContents },
      onChunk: (chunk) => { streamRef.current += chunk; appendStreamChunk(chunk); },
      onDone: async () => {
        finalizeStream(sanitizeAIMessage(streamRef.current));
        const res = await outlineApi.get(projectId);
        const all = res.data.data?.chapters ?? [];
        setChapters(all);
        setCollapsedIds(new Set(all.filter((c: Chapter) => c.collapsed).map((c: Chapter) => c.id)));
        setOutline(res.data.data);
        setIsStreaming(false);
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

  // Drag-to-reorder handlers — track by chapter ID, not index
  const handleDragStart = useCallback((chapterId: string, parentId: string | null | undefined) => {
    isDraggingRef.current = true;
    dragIdRef.current = chapterId;
    dragParentRef.current = parentId;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetId: string, parentId: string | null | undefined) => {
    e.preventDefault();
    const fromId = dragIdRef.current;
    if (!fromId || fromId === targetId || dragParentRef.current !== parentId) return;
    setChapters((prev) => {
      const fromIdx = prev.findIndex(c => c.id === fromId);
      const toIdx = prev.findIndex(c => c.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }, []);

  const handleDragEnd = useCallback((parentId: string | null | undefined) => {
    dragIdRef.current = null;
    dragParentRef.current = undefined;
    if (!projectId) { isDraggingRef.current = false; return; }
    // Capture current chapters synchronously before any state updates
    setChapters(prev => {
      const siblings = prev.filter(c => c.parentId === (parentId ?? null));
      // Persist new order, then re-sync from server
      Promise.all(
        siblings.map((ch, i) =>
          outlineApi.updateChapter(projectId, ch.id, { order: i + 1 })
        )
      ).then(async () => {
        const res = await outlineApi.get(projectId);
        isDraggingRef.current = false;
        setOutline(res.data.data);
      });
      return prev;
    });
  }, [projectId]);

  if (loading) return <div className="flex items-center justify-center h-full"><Spinner size="lg" /></div>;

  return (
    <div className="flex h-full">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0" {...getRootProps()}>
        <input {...getInputProps()} />
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
                'max-w-[80%] px-4 py-3 rounded-lg text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-primary-subtle border border-border text-text-primary whitespace-pre-wrap'
                  : 'bg-bg-subtle text-text-primary prose prose-sm max-w-none'
              )}>
                {msg.role === 'assistant' ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {sanitizeAIMessage(msg.content)}
                  </ReactMarkdown>
                ) : msg.content}
              </div>
            </div>
          ))}
          {isStreaming && streamingText && (
            <div className="flex justify-start">
              <div className="max-w-[80%] px-4 py-3 rounded-lg text-sm leading-relaxed bg-bg-subtle text-text-primary prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {sanitizeAIMessage(streamingText)}
                </ReactMarkdown>
                <span className="inline-block w-0.5 h-4 bg-text-primary animate-pulse ml-0.5 align-middle" />
              </div>
            </div>
          )}
          {isStreaming && !streamingText && (
            <div className="flex justify-start">
              <div className="px-4 py-3 rounded-lg bg-bg-subtle text-sm text-text-secondary space-y-1.5">
                <div className="flex items-center gap-2">
                  <Spinner size="sm" />
                  <span>AI 正在思考...</span>
                </div>
                <div className="text-xs text-text-tertiary space-y-0.5 pl-6">
                  {thinkingStep >= 0 && <p className="animate-fade-in">· 分析你的研究信息</p>}
                  {thinkingStep >= 1 && <p className="animate-fade-in">· 规划章节结构</p>}
                  {thinkingStep >= 2 && <p className="animate-fade-in">· 生成大纲内容...</p>}
                  {thinkingStep >= 3 && <p className="animate-fade-in">· 即将输出结果...</p>}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Attached files preview */}
        {attachedFiles.length > 0 && (
          <div className="px-4 pt-2 flex flex-wrap gap-2">
            {attachedFiles.map((f, i) => (
              <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-bg-subtle border border-border rounded text-xs text-text-secondary">
                <FileText size={12} strokeWidth={1.5} />
                <span className="max-w-[120px] truncate">{f.name}</span>
                <button onClick={() => removeAttached(i)} className="text-text-tertiary hover:text-danger ml-0.5">
                  <X size={12} strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-border px-4 py-3 flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              className="w-full px-3 py-2 bg-bg-muted border border-border rounded text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none"
              rows={2}
              placeholder={isDragActive ? '拖拽文件到此处上传...' : '描述你的论文方向，或对大纲提出修改意见...'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              disabled={isStreaming}
            />
          </div>
          {/* File attach button */}
          <label className="cursor-pointer p-2 text-text-tertiary hover:text-primary transition-colors" title="上传参考文档">
            <input
              type="file"
              className="hidden"
              multiple
              accept=".pdf,.docx,.txt,.md"
              onChange={(e) => {
                if (e.target.files) setAttachedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
              }}
            />
            <Upload size={18} strokeWidth={1.5} />
          </label>
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
            <button onClick={handleAddChapter} className="text-text-tertiary hover:text-primary transition-colors" title="添加一级章节">
              <Plus size={16} strokeWidth={1.5} />
            </button>
          </div>
          {chapters.length > 0 && (
            <p className="text-xs text-text-tertiary mt-1">全文总字数目标：{totalWordCount.toLocaleString()} 字</p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {outline?.title && (
            <div className="px-2 py-1.5 mb-1">
              <p className="text-xs text-text-tertiary mb-0.5">标题</p>
              <p className="text-sm font-medium text-text-primary">{outline.title}</p>
            </div>
          )}

          {/* Recursive chapter tree */}
          {level1.map((chapter, idx) => (
            <ChapterNode
              key={chapter.id}
              chapter={chapter}
              index={idx}
              siblings={level1}
              allChapters={chapters}
              childrenOf={childrenOf}
              collapsedIds={collapsedIds}
              editingChapterId={editingChapterId}
              editTitle={editTitle}
              editDesc={editDesc}
              editWordCount={editWordCount}
              setEditTitle={setEditTitle}
              setEditDesc={setEditDesc}
              setEditWordCount={setEditWordCount}
              onStartEdit={startEdit}
              onSaveEdit={saveEdit}
              onCancelEdit={() => setEditingChapterId(null)}
              onDelete={handleDeleteChapter}
              onToggleCollapse={toggleCollapse}
              onAddSub={handleAddSubChapter}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            />
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

// ─── ChapterNode: recursive component for 3-level outline ───────────────────

interface ChapterNodeProps {
  chapter: Chapter;
  index: number;
  siblings: Chapter[];
  allChapters: Chapter[];
  childrenOf: (parentId: string) => Chapter[];
  collapsedIds: Set<string>;
  editingChapterId: string | null;
  editTitle: string;
  editDesc: string;
  editWordCount: number;
  setEditTitle: (v: string) => void;
  setEditDesc: (v: string) => void;
  setEditWordCount: (v: number) => void;
  onStartEdit: (ch: Chapter) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onAddSub: (parentId: string, parentLevel: number) => void;
  onDragStart: (chapterId: string, parentId: string | null | undefined) => void;
  onDragOver: (e: React.DragEvent, targetId: string, parentId: string | null | undefined) => void;
  onDragEnd: (parentId: string | null | undefined) => void;
}

function ChapterNode({
  chapter, index: _index, allChapters: _allChapters, childrenOf, collapsedIds,
  editingChapterId, editTitle, editDesc, editWordCount,
  setEditTitle, setEditDesc, setEditWordCount,
  onStartEdit, onSaveEdit, onCancelEdit, onDelete, onToggleCollapse, onAddSub,
  onDragStart, onDragOver, onDragEnd,
}: ChapterNodeProps) {
  const level = chapter.level ?? 1;
  const children = childrenOf(chapter.id);
  const isCollapsed = collapsedIds.has(chapter.id);
  const hasChildren = children.length > 0;
  const isEditing = editingChapterId === chapter.id;

  const indent = (level - 1) * 12;

  return (
    <div>
      <div
        className="group"
        draggable
        onDragStart={() => onDragStart(chapter.id, chapter.parentId)}
        onDragOver={(e) => onDragOver(e, chapter.id, chapter.parentId)}
        onDragEnd={() => onDragEnd(chapter.parentId)}
        style={{ paddingLeft: indent }}
      >
        {isEditing ? (
          <div className="p-2 bg-white border border-primary rounded space-y-1 mr-1">
            <input
              className="w-full text-sm px-2 py-1 border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="标题"
              autoFocus
            />
            <textarea
              className="w-full text-xs px-2 py-1 border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              rows={2}
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="描述..."
            />
            {/* Only level-1 shows word count */}
            {level === 1 && (
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
            )}
            <div className="flex gap-1 justify-end">
              <Button size="sm" variant="ghost" onClick={onCancelEdit}>取消</Button>
              <Button size="sm" variant="primary" onClick={onSaveEdit}>保存</Button>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              'flex items-center gap-1 px-1 py-1.5 rounded hover:bg-bg-muted cursor-pointer',
              level === 1 ? 'text-text-primary' : level === 2 ? 'text-text-secondary' : 'text-text-tertiary'
            )}
            onClick={() => onStartEdit(chapter)}
          >
            {/* Collapse toggle */}
            <button
              onClick={(e) => { e.stopPropagation(); if (hasChildren) onToggleCollapse(chapter.id); }}
              className={cn('shrink-0 text-text-tertiary', hasChildren ? 'hover:text-primary' : 'opacity-0 pointer-events-none')}
            >
              {isCollapsed
                ? <ChevronRight size={12} strokeWidth={1.5} />
                : <ChevronDown size={12} strokeWidth={1.5} />}
            </button>

            {/* Drag handle */}
            <span className="text-text-tertiary shrink-0 cursor-grab active:cursor-grabbing">
              <GripVertical size={12} strokeWidth={1.5} />
            </span>

            {/* Number */}
            <span className={cn('shrink-0 text-text-tertiary', level === 1 ? 'text-xs w-5' : 'text-xs w-4')}>
              {_index + 1}.
            </span>

            <div className="flex-1 min-w-0">
              <p className={cn('truncate', level === 1 ? 'text-sm font-medium' : level === 2 ? 'text-xs' : 'text-xs')}>{chapter.title}</p>
              {level === 1 && (
                <p className="text-xs text-text-tertiary">{chapter.wordCountTarget} 字</p>
              )}
            </div>

            {/* Add sub-chapter button (only for level 1 and 2) */}
            {level < 3 && (
              <button
                onClick={(e) => { e.stopPropagation(); onAddSub(chapter.id, level); }}
                className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-primary transition-all shrink-0"
                title={level === 1 ? '添加小节' : '添加子节'}
              >
                <Plus size={12} strokeWidth={1.5} />
              </button>
            )}

            <button
              onClick={(e) => { e.stopPropagation(); onDelete(chapter.id); }}
              className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-danger transition-all shrink-0"
            >
              <Trash2 size={12} strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>

      {/* Children */}
      {!isCollapsed && children.map((child, ci) => (
        <ChapterNode
          key={child.id}
          chapter={child}
          index={ci}
          siblings={children}
          allChapters={_allChapters}
          childrenOf={childrenOf}
          collapsedIds={collapsedIds}
          editingChapterId={editingChapterId}
          editTitle={editTitle}
          editDesc={editDesc}
          editWordCount={editWordCount}
          setEditTitle={setEditTitle}
          setEditDesc={setEditDesc}
          setEditWordCount={setEditWordCount}
          onStartEdit={onStartEdit}
          onSaveEdit={onSaveEdit}
          onCancelEdit={onCancelEdit}
          onDelete={onDelete}
          onToggleCollapse={onToggleCollapse}
          onAddSub={onAddSub}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
        />
      ))}
    </div>
  );
}
