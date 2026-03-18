import { Bold, Italic, Underline, Heading1, Heading2, Heading3, List, ListOrdered, Undo, Redo, Table, Minus } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { cn } from '../../../shared/utils/cn';

interface EditorToolbarProps {
  editor: Editor | null;
}

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px'];

export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) return null;

  const setFontSize = (size: string) => {
    editor.chain().focus().setMark('textStyle', { fontSize: size }).run();
  };

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const insertHR = () => {
    editor.chain().focus().setHorizontalRule().run();
  };

  const buttons = [
    { icon: Bold, label: '粗体', action: () => editor.chain().focus().toggleBold().run(), isActive: editor.isActive('bold') },
    { icon: Italic, label: '斜体', action: () => editor.chain().focus().toggleItalic().run(), isActive: editor.isActive('italic') },
    { icon: Underline, label: '下划线', action: () => editor.chain().focus().toggleUnderline().run(), isActive: editor.isActive('underline') },
    null, // separator
    { icon: Heading1, label: '一级标题', action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), isActive: editor.isActive('heading', { level: 1 }) },
    { icon: Heading2, label: '二级标题', action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), isActive: editor.isActive('heading', { level: 2 }) },
    { icon: Heading3, label: '三级标题', action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), isActive: editor.isActive('heading', { level: 3 }) },
    null,
    { icon: List, label: '无序列表', action: () => editor.chain().focus().toggleBulletList().run(), isActive: editor.isActive('bulletList') },
    { icon: ListOrdered, label: '有序列表', action: () => editor.chain().focus().toggleOrderedList().run(), isActive: editor.isActive('orderedList') },
    null,
    { icon: Table, label: '插入表格', action: insertTable, isActive: false },
    { icon: Minus, label: '分隔线', action: insertHR, isActive: false },
    null,
    { icon: Undo, label: '撤销', action: () => editor.chain().focus().undo().run(), disabled: !editor.can().undo() },
    { icon: Redo, label: '重做', action: () => editor.chain().focus().redo().run(), disabled: !editor.can().redo() },
  ];

  return (
    <div className="flex items-center gap-0.5 px-4 py-2 border-b border-border bg-bg-subtle flex-wrap">
      {/* Font size selector */}
      <select
        className="h-7 px-1.5 text-xs border border-border rounded bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-primary mr-1"
        defaultValue="16px"
        onChange={(e) => setFontSize(e.target.value)}
        title="字体大小"
      >
        {FONT_SIZES.map((s) => (
          <option key={s} value={s}>{s.replace('px', '')}</option>
        ))}
      </select>

      {buttons.map((btn, idx) => {
        if (btn === null) {
          return <span key={idx} className="w-px h-5 bg-border mx-1 shrink-0" />;
        }
        return (
          <button
            key={idx}
            onClick={btn.action}
            disabled={btn.disabled}
            title={btn.label}
            aria-label={btn.label}
            className={cn(
              'p-1.5 rounded transition-colors',
              btn.isActive
                ? 'bg-primary-subtle text-primary'
                : 'text-text-secondary hover:bg-bg-muted hover:text-text-primary',
              btn.disabled && 'opacity-40 cursor-not-allowed',
            )}
          >
            <btn.icon size={16} strokeWidth={1.5} />
          </button>
        );
      })}
    </div>
  );
}
