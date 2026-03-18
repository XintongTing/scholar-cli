import { EditorContent } from '@tiptap/react';
import { EditorToolbar } from './EditorToolbar';
import { useEditor } from '../hooks/useEditor';
import { Spinner } from '../../../shared/components/Spinner';

interface PaperEditorProps {
  projectId: string;
}

export function PaperEditor({ projectId }: PaperEditorProps) {
  const { editor, isLoading } = useEditor(projectId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full border border-border rounded-lg overflow-hidden bg-bg-base">
      <EditorToolbar editor={editor} />
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
}
