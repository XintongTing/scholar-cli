import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.resolve(__dirname, '../../../../../uploads');

async function ensureDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

export async function uploadFile(
  key: string,
  buffer: Buffer,
  _contentType: string
): Promise<string> {
  await ensureDir();
  const filePath = path.join(UPLOAD_DIR, key.replace(/\//g, '_'));
  await fs.writeFile(filePath, buffer);
  return key;
}

export async function getSignedUrl(key: string): Promise<string> {
  // Return a local API URL for file access
  return `/api/v1/files/${encodeURIComponent(key)}`;
}

export async function deleteFile(key: string): Promise<void> {
  try {
    const filePath = path.join(UPLOAD_DIR, key.replace(/\//g, '_'));
    await fs.unlink(filePath);
  } catch {
    // ignore if file doesn't exist
  }
}

export async function readFile(key: string): Promise<Buffer> {
  const filePath = path.join(UPLOAD_DIR, key.replace(/\//g, '_'));
  return fs.readFile(filePath);
}
