import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

interface TiptapNode {
  type: string;
  content?: TiptapNode[];
  text?: string;
  marks?: Array<{ type: string }>;
  attrs?: Record<string, unknown>;
}

function nodeToDocxParagraphs(node: TiptapNode): Paragraph[] {
  if (node.type === 'doc') {
    return (node.content ?? []).flatMap(nodeToDocxParagraphs);
  }

  if (node.type === 'heading') {
    const level = (node.attrs?.level as number) ?? 1;
    const text = (node.content ?? []).map((n) => n.text ?? '').join('');
    const headingMap: Record<number, typeof HeadingLevel[keyof typeof HeadingLevel]> = {
      1: HeadingLevel.HEADING_1,
      2: HeadingLevel.HEADING_2,
      3: HeadingLevel.HEADING_3,
    };
    return [
      new Paragraph({
        text,
        heading: headingMap[level] ?? HeadingLevel.HEADING_1,
      }),
    ];
  }

  if (node.type === 'paragraph') {
    const runs = (node.content ?? []).map((n) => {
      const marks = (n.marks ?? []).map((m) => m.type);
      return new TextRun({
        text: n.text ?? '',
        bold: marks.includes('bold'),
        italics: marks.includes('italic'),
        underline: marks.includes('underline') ? {} : undefined,
      });
    });
    return [new Paragraph({ children: runs.length > 0 ? runs : [new TextRun('')] })];
  }

  if (node.type === 'bulletList' || node.type === 'orderedList') {
    return (node.content ?? []).flatMap(nodeToDocxParagraphs);
  }

  if (node.type === 'listItem') {
    const text = (node.content ?? [])
      .flatMap((n) => n.content ?? [])
      .map((n) => n.text ?? '')
      .join('');
    return [new Paragraph({ text, bullet: { level: 0 } })];
  }

  return [];
}

export async function exportToDocx(content: Record<string, unknown>, filename = 'document.docx') {
  const paragraphs = nodeToDocxParagraphs(content as unknown as TiptapNode);

  const doc = new Document({
    sections: [{ properties: {}, children: paragraphs }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
}
