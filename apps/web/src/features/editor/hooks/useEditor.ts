import { useCallback } from 'react';
import { useEditor as useTiptapEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import Heading from '@tiptap/extension-heading';
import { useQuery, useMutation } from '@tanstack/react-query';
import * as api from '../api';
import { useAutoSave } from '../../../shared/hooks/useAutoSave';

export function useEditor(projectId: string) {
  const { data: document, isLoading } = useQuery({
    queryKey: ['document', projectId],
    queryFn: () => api.getDocument(projectId),
    enabled: !!projectId,
  });

  const { mutate: save } = useMutation({
    mutationFn: (content: Record<string, unknown>) => api.saveDocument(projectId, content),
  });

  const editor = useTiptapEditor({
    extensions: [
      StarterKit,
      Underline,
      Heading.configure({ levels: [1, 2, 3] }),
      Placeholder.configure({ placeholder: '开始编辑您的论文...' }),
    ],
    content: document?.content ?? '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[500px] px-8 py-6',
      },
    },
  });

  const handleSave = useCallback(
    (_value: unknown) => {
      if (editor) {
        save(editor.getJSON() as Record<string, unknown>);
      }
    },
    [editor, save],
  );

  useAutoSave(editor?.getJSON(), handleSave, 2000);

  return { editor, document, isLoading };
}
