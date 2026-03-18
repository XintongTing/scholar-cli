import mammoth from 'mammoth';

export interface PdfMetadata {
  title: string;
  authors: string[];
  year: number | null;
  abstract: string;
  text: string;
}

export async function parsePdf(buffer: Buffer): Promise<PdfMetadata> {
  // Use require for CJS compatibility with pdf-parse
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse');
  const data = await pdfParse(buffer);
  const text: string = data.text || '';

  const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean);
  const title = lines[0] || 'Unknown Title';

  const yearMatch = text.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? parseInt(yearMatch[0], 10) : null;

  const abstractMatch = text.match(/abstract[:\s]+([^]+?)(?=\n\n|\nintroduction|\n1\.|keywords)/i);
  const abstract = abstractMatch ? abstractMatch[1].trim().slice(0, 500) : '';

  const authors: string[] = [];
  if (lines.length > 1) {
    const authorLine = lines[1];
    if (authorLine && authorLine.length < 200) {
      authors.push(...authorLine.split(/[,;]/).map((a: string) => a.trim()).filter(Boolean));
    }
  }

  return { title, authors, year, abstract, text: text.slice(0, 10000) };
}

export async function parseDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}
