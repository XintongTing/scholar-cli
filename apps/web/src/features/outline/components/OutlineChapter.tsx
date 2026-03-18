import { useState } from 'react';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import type { Chapter } from '../types';
// cn imported for potential future use

interface OutlineChapterProps {
  chapter: Chapter;
  onUpdate: (data: { title?: string; description?: string; wordCountTarget?: number }) => void;
  onDelete: () => void;
}

export function OutlineChapter({ chapter, onUpdate, onDelete }: OutlineChapterProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(chapter.title);
  const [description, setDescription] = useState(chapter.description ?? '');
  const [wordCount, setWordCount] = useState(String(chapter.wordCountTarget));

  function handleSave() {
    onUpdate({
      title: title.trim() || chapter.title,
      description: description.trim() || undefined,
      wordCountTarget: parseInt(wordCount, 10) || chapter.wordCountTarget,
    });
    setEditing(false);
  }

  function handleCancel() {
    setTitle(chapter.title);
    setDescription(chapter.description ?? '');
    setWordCount(String(chapter.wordCountTarget));
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2 p-3 rounded-md border border-primary bg-primary-subtle">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full text-sm font-medium bg-bg-base border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="章节标题"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full text-xs bg-bg-base border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary text-text-secondary"
          placeholder="章节描述（可选）"
        />
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={wordCount}
            onChange={(e) => setWordCount(e.target.value)}
            className="w-24 text-xs bg-bg-base border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="字数目标"
            min={100}
          />
          <span className="text-xs text-text-tertiary">字</span>
          <div className="ml-auto flex gap-1">
            <button onClick={handleSave} className="p-1 rounded hover:bg-success-subtle text-success" aria-label="保存">
              <Check size={14} strokeWidth={1.5} />
            </button>
            <button onClick={handleCancel} className="p-1 rounded hover:bg-bg-muted text-text-tertiary" aria-label="取消">
              <X size={14} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-2 p-3 rounded-md hover:bg-bg-subtle transition-colors">
      <span className="text-xs text-text-tertiary mt-0.5 w-5 flex-shrink-0">{chapter.order}.</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary">{chapter.title}</p>
        {chapter.description && (
          <p className="text-xs text-text-secondary mt-0.5">{chapter.description}</p>
        )}
        <p className="text-xs text-text-tertiary mt-0.5">{chapter.wordCountTarget} 字</p>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setEditing(true)}
          className="p-1 rounded hover:bg-bg-muted text-text-tertiary hover:text-text-primary"
          aria-label="编辑"
        >
          <Pencil size={12} strokeWidth={1.5} />
        </button>
        <button
          onClick={onDelete}
          className="p-1 rounded hover:bg-danger-subtle text-text-tertiary hover:text-danger"
          aria-label="删除"
        >
          <Trash2 size={12} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
