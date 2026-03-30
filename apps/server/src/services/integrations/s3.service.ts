import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl as getAwsSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.resolve(__dirname, '../../../../../uploads');
const storageMode = config.s3.enabled ? 's3' : 'local';
const s3Client = config.s3.enabled
  ? new S3Client({
      region: config.s3.region,
      endpoint: config.s3.endpoint,
      forcePathStyle: config.s3.forcePathStyle,
      credentials: {
        accessKeyId: config.s3.accessKey,
        secretAccessKey: config.s3.secretKey
      }
    })
  : null;

async function ensureDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

export async function uploadFile(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  if (storageMode === 's3' && s3Client) {
    await s3Client.send(new PutObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType
    }));
    return key;
  }

  await ensureDir();
  const filePath = path.join(UPLOAD_DIR, key.replace(/\//g, '_'));
  await fs.writeFile(filePath, buffer);
  return key;
}

export async function getSignedUrl(key: string): Promise<string> {
  if (storageMode === 's3' && s3Client) {
    return getAwsSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: config.s3.bucket,
        Key: key
      }),
      { expiresIn: 900 }
    );
  }

  return `${config.server.publicBaseUrl.replace(/\/$/, '')}/api/v1/files/${encodeURIComponent(key)}`;
}

export async function deleteFile(key: string): Promise<void> {
  if (storageMode === 's3' && s3Client) {
    await s3Client.send(new DeleteObjectCommand({
      Bucket: config.s3.bucket,
      Key: key
    }));
    return;
  }

  try {
    const filePath = path.join(UPLOAD_DIR, key.replace(/\//g, '_'));
    await fs.unlink(filePath);
  } catch {
    // ignore if file doesn't exist
  }
}

export async function readFile(key: string): Promise<Buffer> {
  if (storageMode === 's3' && s3Client) {
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: config.s3.bucket,
      Key: key
    }));
    return Buffer.from(await response.Body!.transformToByteArray());
  }

  const filePath = path.join(UPLOAD_DIR, key.replace(/\//g, '_'));
  return fs.readFile(filePath);
}
