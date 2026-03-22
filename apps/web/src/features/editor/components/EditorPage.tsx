import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useEditor as useTiptapEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import { Extension } from '@tiptap/core';
import { Download } from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { http } from '../../../services/http';
import { Button } from '../../../shared/components/Button';
import { Spinner } from '../../../shared/components/Spinner';
import { EditorToolbar } from './EditorToolbar';
import { outlineApi } from '../../outline/api';

function markdownToHtml(text: string): string {
  const lines = text.split('\n');
  const htmlLines: string[] = [];

  for (const line of lines) {
    const h3 = line.match(/^###\s+(.*)/);
    const h2 = line.match(/^##\s+(.*)/);
    const h1 = line.match(/^#\s+(.*)/);

    if (h1) htmlLines.push(`<h1>${h1[1]}</h1>`);
    else if (h2) htmlLines.push(`<h2>${h2[1]}</h2>`);
    else if (h3) htmlLines.push(`<h3>${h3[1]}</h3>`);
    else if (line.trim() !== '') {
      const content = line
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code>$1</code>');
      htmlLines.push(`<p>${content}</p>`);
    }
  }

  return htmlLines.join('');
}

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

const FontSize = Extension.create({
  name: 'fontSize',
  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (el) => el.style.fontSize || null,
            renderHTML: (attrs) => {
              if (!attrs.fontSize) return {};
              return { style: `font-size: ${attrs.fontSize}` };
            },
          },
        },
      },
    ];
  },
});

interface Chapter {
  id: string;
  order: number;
  title: string;
  level?: number;
  parentId?: string | null;
}

interface ProjectDetail {
  title?: string;
  userProfile?: Record<string, unknown>;
  outline?: {
    title?: string;
  } | null;
}

function sortChapters(chapters: Chapter[]) {
  const byParent = new Map<string | null, Chapter[]>();

  for (const chapter of chapters) {
    const key = chapter.parentId ?? null;
    const siblings = byParent.get(key) ?? [];
    siblings.push(chapter);
    byParent.set(key, siblings);
  }

  for (const siblings of byParent.values()) {
    siblings.sort((a, b) => {
      const orderDiff = (a.order ?? 0) - (b.order ?? 0);
      if (orderDiff !== 0) return orderDiff;
      return a.title.localeCompare(b.title, 'zh-CN');
    });
  }

  const ordered: Chapter[] = [];
  const visited = new Set<string>();

  const walk = (parentId: string | null) => {
    const siblings = byParent.get(parentId) ?? [];
    for (const chapter of siblings) {
      if (visited.has(chapter.id)) continue;
      visited.add(chapter.id);
      ordered.push(chapter);
      walk(chapter.id);
    }
  };

  walk(null);

  for (const chapter of chapters) {
    if (!visited.has(chapter.id)) {
      visited.add(chapter.id);
      ordered.push(chapter);
      walk(chapter.id);
    }
  }

  return ordered;
}

function buildChildrenMap(chapters: Chapter[]) {
  const childrenMap = new Map<string | null, Chapter[]>();
  for (const chapter of chapters) {
    const key = chapter.parentId ?? null;
    const children = childrenMap.get(key) ?? [];
    children.push(chapter);
    childrenMap.set(key, children);
  }
  return childrenMap;
}

function normalizeStringContent(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(([, v]) => typeof v === 'string')
  ) as Record<string, string>;
}

function renderMarkdownTree(
  parentId: string | null,
  childrenMap: Map<string | null, Chapter[]>,
  contentMap: Record<string, string>
): string {
  const chapters = childrenMap.get(parentId) ?? [];

  return chapters
    .map((chapter) => {
      const childMarkdown = renderMarkdownTree(chapter.id, childrenMap, contentMap);
      const body = (contentMap[chapter.id] || '').trim();
      const hasVisibleContent = Boolean(body || childMarkdown);
      if (!hasVisibleContent) return '';

      const prefix = chapter.level === 1 ? '# ' : chapter.level === 2 ? '## ' : '### ';
      return [`${prefix}${chapter.title}`, body, childMarkdown].filter(Boolean).join('\n\n');
    })
    .filter(Boolean)
    .join('\n\n');
}

function isTiptapJson(value: unknown): value is { type: string; content?: unknown[] } {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && 'type' in value);
}

function sanitizeFilenamePart(value: string) {
  return value.replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function EditorPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [downloadFileName, setDownloadFileName] = useState('论文.docx');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useTiptapEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      FontFamily,
      FontSize,
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

    Promise.all([
      http.get(`/projects/${projectId}/document`),
      outlineApi.get(projectId),
    ])
      .then(([docRes, outlineRes]) => {
        const doc = docRes.data.data;
        if (!doc?.content) return;

        if (isTiptapJson(doc.content)) {
          editor.commands.setContent(doc.content);
          return;
        }

        if (typeof doc.content === 'string') {
          const html = markdownToHtml(doc.content);
          editor.commands.setContent(html || '<p></p>');
          return;
        }

        const chapters = sortChapters(outlineRes.data.data?.chapters || []);
        const childrenMap = buildChildrenMap(chapters);
        const contentMap = normalizeStringContent(doc.content);
        const markdown = renderMarkdownTree(null, childrenMap, contentMap);
        const html = markdownToHtml(markdown);
        editor.commands.setContent(html || '<p></p>');
      })
      .finally(() => setLoading(false));
  }, [projectId, editor]);

  useEffect(() => {
    if (!projectId) return;

    http.get(`/projects/${projectId}`)
      .then((res) => {
        const project = res.data.data as ProjectDetail;
        const paperType = sanitizeFilenamePart(String(project.userProfile?.paperType || '论文'));
        const title = sanitizeFilenamePart(String(project.outline?.title || project.title || '未命名'));
        setDownloadFileName(`${paperType}-${title}.docx`);
      })
      .catch(() => {
        setDownloadFileName('论文.docx');
      });
  }, [projectId]);

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
        const level = (node.attrs?.level as number) || 1;
        paragraphs.push(new Paragraph({
          text,
          heading: level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
        }));
      } else if (node.type === 'paragraph') {
        const runs: TextRun[] = (node.content || []).map((c) => {
          const current = c as { text?: string; marks?: { type: string }[] };
          return new TextRun({
            text: current.text || '',
            bold: current.marks?.some((mark) => mark.type === 'bold'),
            italics: current.marks?.some((mark) => mark.type === 'italic'),
            underline: current.marks?.some((mark) => mark.type === 'underline') ? {} : undefined,
          });
        });

        paragraphs.push(new Paragraph({ children: runs, indent: { firstLine: 720 } }));
      }

      node.content?.forEach((child) => traverse(child));
    };

    traverse(json);

    const doc = new Document({ sections: [{ children: paragraphs }] });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, downloadFileName);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
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

      <div className="flex-1 overflow-y-auto bg-bg-subtle">
        <style>{`
          .paper-editor p.indent-paragraph { text-indent: 2em; }
          .paper-editor table { border-collapse: collapse; width: 100%; margin: 1em 0; }
          .paper-editor td, .paper-editor th { border: 1px solid #d1d5db; padding: 6px 10px; }
          .paper-editor th { background: #f9fafb; font-weight: 600; }
          .paper-editor h1 { font-size: 1.75em; font-weight: 700; text-align: center; margin: 1.2em 0 0.6em; }
          .paper-editor h2 { font-size: 1.35em; font-weight: 600; margin: 1em 0 0.5em; }
          .paper-editor h3 { font-size: 1.1em; font-weight: 600; margin: 0.8em 0 0.4em; }
        `}</style>
        <div className="max-w-4xl mx-auto my-8 bg-white shadow-sm min-h-[calc(100vh-200px)]">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
