import { useState } from 'react';
import { Plus, CheckCircle } from 'lucide-react';
import { OutlineChapter } from './OutlineChapter';
import { useOutlineEditor } from '../hooks/useOutlineEditor';
import { Button } from '../../../shared/components/Button';
import { Spinner } from '../../../shared/components/Spinner';
import { useNavigate } from 'react-router-dom';
import type { Chapter } from '../types';

interface OutlineSidebarProps {
  projectId: string;
}

export function OutlineSidebar({ projectId }: OutlineSidebarProps) {
  const navigate = useNavigate();
  const { outline, isLoading, addChapter, updateChapter, deleteChapter, confirmOutline } =
    useOutlineEditor(projectId);
  const [addingChapter, setAddingChapter] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  async function handleAddChapter() {
    if (!newTitle.trim()) return;
    await addChapter.mutateAsync({ title: newTitle.trim() });
    setNewTitle('');
    setAddingChapter(false);
  }

  async function handleConfirm() {
    await confirmOutline.mutateAsync();
    navigate(`/projects/${projectId}/literature`);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-text-primary">论文大纲</h3>
        {outline?.title && (
          <p className="text-xs text-text-secondary mt-0.5 truncate">{outline.title}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {outline?.chapters.map((chapter: Chapter) => (
          <OutlineChapter
            key={chapter.id}
            chapter={chapter}
            onUpdate={(data) => updateChapter.mutate({ chapterId: chapter.id, data })}
            onDelete={() => deleteChapter.mutate(chapter.id)}
          />
        ))}

        {addingChapter ? (
          <div className="flex gap-2 p-2">
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddChapter();
                if (e.key === 'Escape') setAddingChapter(false);
              }}
              placeholder="章节标题"
              className="flex-1 text-sm border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={handleAddChapter}
              className="text-xs text-primary hover:underline"
            >
              添加
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingChapter(true)}
            className="flex items-center gap-1 w-full px-3 py-2 text-xs text-text-tertiary hover:text-text-secondary hover:bg-bg-subtle rounded-md transition-colors"
          >
            <Plus size={12} strokeWidth={1.5} />
            添加章节
          </button>
        )}
      </div>

      <div className="px-4 py-3 border-t border-border">
        <Button
          variant="primary"
          size="md"
          className="w-full"
          onClick={handleConfirm}
          disabled={!outline?.chapters.length || confirmOutline.isPending}
        >
          <CheckCircle size={16} strokeWidth={1.5} />
          {confirmOutline.isPending ? '确认中...' : '确认大纲'}
        </Button>
      </div>
    </div>
  );
}
