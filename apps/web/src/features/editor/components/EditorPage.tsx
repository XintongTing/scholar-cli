import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useEditor as useTiptapEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table';
import { TableHeader } from '@tiptap/extension-table';
import { Extension } from '@tiptap/core';
import { Download } from 'lucide-react';
import { http } from '../../../services/http';
import { Button } from '../../../shared/components/Button';
import { Spinner } from '../../../shared/components/Spinner';
import { EditorToolbar } from './EditorToolbar';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

// Strip markdown symbols from raw text before loading into editor
function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')      // headings
    .replace(/\*\*(.+?)\*\*/g, '$1')  // bold
    .replace(/\*(.+?)\*/g, '$1')      // italic
    .replace(/`(.+?)`/g, '$1')        // inline code
    .replace(/^[-*+]\s+/gm, '')       // unordered list markers
    .replace(/^\d+\.\s+/gm, '')       // ordered list markers
    .replace(/^>\s+/gm, '')           // blockquotes
    .replace(/_{1,2}(.+?)_{1,2}/g, '$1'); // underscores
}

// Tiptap extension: first-line indent for paragraphs (2em, Chinese academic style)
const FirstLineIndent = Extension.create({
  name: 'firstLineIndent',
  addGlobalAttributes() {
    return [
      {
        types: ['paragraph'],
        attributes: {
          class: {
            default: 'indent-paragraph',
            renderHTML: () => ({ class: 'indent-paragraph' }),
          },
        },
      },
    ];
  },
});

export function EditorPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useTiptapEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder: '论文内容将在此处显示...' }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      FirstLineIndent,
    ],
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-full px-8 py-6 text-text-primary paper-editor',
      },
    },
    onUpdate: ({ editor }) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        handleSave(editor.getJSON());
      }, 3000);
    },
  });

  useEffect(() => {
    if (!projectId || !editor) return;
    http.get(`/projects/${projectId}/document`).then((res) => {
      const doc = res.data.data;
      if (doc?.content) {
        const raw = typeof doc.content === 'string'
          ? doc.content
          : Object.values(doc.content as Record<string, string>).join('\n\n');
        const clean = stripMarkdown(raw);
        editor.commands.setContent(
          `<p>${clean.replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`
        );
      }
    }).finally(() => setLoading(false));
  }, [projectId, editor]);

  const handleSave = async (content: object) => {
    if (!projectId) return;
    setSaving(true);
    try {
      await http.patch(`/projects/${projectId}/document`, { content });
      setLastSaved(new Date());
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!editor) return;
    const json = editor.getJSON();
    const paragraphs: Paragraph[] = [];

    const traverse = (node: { type?: string; content?: typeof node[]; attrs?: Record<string, unknown>; marks?: { type: string }[]; text?: string }) => {
      if (node.type === 'heading') {
        const text = node.content?.map((c) => (c as { text?: string }).text || '').join('') || '';
        const lvl = (node.attrs?.level as number) || 1;
        paragraphs.push(new Paragraph({
          text,
          heading: lvl === 1 ? HeadingLevel.HEADING_1 : lvl === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
        }));
      } else if (node.type === 'paragraph') {
        const runs: TextRun[] = (node.content || []).map((c) => {
          const cn = c as { type?: string; text?: string; marks?: { type: string }[] };
          return new TextRun({
            text: cn.text || '',
            bold: cn.marks?.some((m) => m.type === 'bold'),
            italics: cn.marks?.some((m) => m.type === 'italic'),
            underline: cn.marks?.some((m) => m.type === 'underline') ? {} : undefined,
          });
        });
        paragraphs.push(new Paragraph({ children: runs, indent: { firstLine: 720 } }));
      }
      node.content?.forEach((child) => traverse(child));
    };

    traverse(json);

    const doc = new Document({ sections: [{ children: paragraphs }] });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, '论文.docx');
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Spinner size="lg" /></div>;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="border-b border-border bg-white shrink-0">
        <div className="flex items-center justify-between px-4 py-1">
          <EditorToolbar editor={editor} />
          <div className="flex items-center gap-3 shrink-0 pl-2">
            {saving && <span className="text-xs text-text-tertiary">保存中...</span>}
            {!saving && lastSaved && (
              <span className="text-xs text-text-tertiary">
                已保存 {lastSaved.toLocaleTimeString('zh-CN')}
              </span>
            )}
            <Button variant="primary" size="sm" onClick={handleDownload}>
              <Download size={14} strokeWidth={1.5} className="mr-1" />
              下载 Word
            </Button>
          </div>
        </div>
      </div>

      {/* Editor canvas */}
      <div className="flex-1 overflow-y-auto bg-bg-subtle">
        <style>{`
          .paper-editor p.indent-paragraph { text-indent: 2em; }
          .paper-editor table { border-collapse: collapse; width: 100%; margin: 1em 0; }
          .paper-editor td, .paper-editor th { border: 1px solid #d1d5db; padding: 6px 10px; }
          .paper-editor th { background: #f9fafb; font-weight: 600; }
        `}</style>
        <div className="max-w-4xl mx-auto my-8 bg-white shadow-sm min-h-[calc(100vh-200px)]">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
