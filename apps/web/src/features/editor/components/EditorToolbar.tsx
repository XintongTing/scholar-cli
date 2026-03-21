import {
  Bold, Italic, Underline, Heading1, Heading2, Heading3,
  List, ListOrdered, Undo, Redo, Table, Minus,
  RowsIcon, Columns2Icon, Trash2
} from 'lucide-react';
import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import { cn } from '../../../shared/utils/cn';

interface EditorToolbarProps {
  editor: Editor | null;
}

const FONT_SIZES = ['12', '14', '15', '16', '18', '20', '22', '24'];
const FONT_FAMILIES = [
  { label: '默认', value: '' },
  { label: '宋体', value: 'SimSun, serif' },
  { label: '黑体', value: 'SimHei, sans-serif' },
  { label: '楷体', value: 'KaiTi, cursive' },
  { label: '仿宋', value: 'FangSong, serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
];

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const [fontSize, setFontSizeState] = useState('15');
  const [fontFamily, setFontFamilyState] = useState('');

  if (!editor) return null;

  const setFontSize = (size: string) => {
    setFontSizeState(size);
    editor.chain().focus().setMark('textStyle', { fontSize: `${size}px` }).run();
  };

  const setFontFamily = (family: string) => {
    setFontFamilyState(family);
    if (!family) {
      editor.chain().focus().unsetFontFamily().run();
    } else {
      editor.chain().focus().setFontFamily(family).run();
    }
  };

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const insertHR = () => {
    editor.chain().focus().setHorizontalRule().run();
  };

  const isInTable = editor.isActive('table');

  const buttons = [
    { icon: Bold, label: '粗体', action: () => editor.chain().focus().toggleBold().run(), isActive: editor.isActive('bold') },
    { icon: Italic, label: '斜体', action: () => editor.chain().focus().toggleItalic().run(), isActive: editor.isActive('italic') },
    { icon: Underline, label: '下划线', action: () => editor.chain().focus().toggleUnderline().run(), isActive: editor.isActive('underline') },
    null,
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
    <div className="flex flex-col w-full">
      <div className="flex items-center gap-0.5 px-2 py-1.5 flex-wrap">
        {/* Font family selector */}
        <select
          className="h-7 px-1.5 text-xs border border-border rounded bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-primary mr-1"
          value={fontFamily}
          onChange={(e) => setFontFamily(e.target.value)}
          title="字体"
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>

        {/* Font size selector */}
        <select
          className="h-7 px-1.5 text-xs border border-border rounded bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-primary mr-1"
          value={fontSize}
          onChange={(e) => setFontSize(e.target.value)}
          title="字体大小"
        >
          {FONT_SIZES.map((s) => (
            <option key={s} value={s}>{s}</option>
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

      {/* Table context toolbar — only shown when cursor is inside a table */}
      {isInTable && (
        <div className="flex items-center gap-1 px-2 py-1 bg-primary-subtle border-t border-border text-xs text-primary">
          <span className="mr-1 font-medium">表格：</span>
          <button
            onClick={() => editor.chain().focus().addRowBefore().run()}
            className="px-2 py-0.5 rounded hover:bg-primary/10 transition-colors flex items-center gap-1"
            title="在上方插入行"
          >
            <RowsIcon size={13} strokeWidth={1.5} />上方插入行
          </button>
          <button
            onClick={() => editor.chain().focus().addRowAfter().run()}
            className="px-2 py-0.5 rounded hover:bg-primary/10 transition-colors flex items-center gap-1"
            title="在下方插入行"
          >
            <RowsIcon size={13} strokeWidth={1.5} />下方插入行
          </button>
          <button
            onClick={() => editor.chain().focus().deleteRow().run()}
            className="px-2 py-0.5 rounded hover:bg-danger/10 text-danger transition-colors flex items-center gap-1"
            title="删除当前行"
          >
            <Trash2 size={13} strokeWidth={1.5} />删除行
          </button>
          <span className="w-px h-4 bg-primary/30 mx-1" />
          <button
            onClick={() => editor.chain().focus().addColumnBefore().run()}
            className="px-2 py-0.5 rounded hover:bg-primary/10 transition-colors flex items-center gap-1"
            title="在左侧插入列"
          >
            <Columns2Icon size={13} strokeWidth={1.5} />左侧插入列
          </button>
          <button
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            className="px-2 py-0.5 rounded hover:bg-primary/10 transition-colors flex items-center gap-1"
            title="在右侧插入列"
          >
            <Columns2Icon size={13} strokeWidth={1.5} />右侧插入列
          </button>
          <button
            onClick={() => editor.chain().focus().deleteColumn().run()}
            className="px-2 py-0.5 rounded hover:bg-danger/10 text-danger transition-colors flex items-center gap-1"
            title="删除当前列"
          >
            <Trash2 size={13} strokeWidth={1.5} />删除列
          </button>
          <span className="w-px h-4 bg-primary/30 mx-1" />
          <button
            onClick={() => editor.chain().focus().deleteTable().run()}
            className="px-2 py-0.5 rounded hover:bg-danger/10 text-danger transition-colors flex items-center gap-1"
            title="删除整个表格"
          >
            <Trash2 size={13} strokeWidth={1.5} />删除表格
          </button>
        </div>
      )}
    </div>
  );
}
