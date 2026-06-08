import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import sharp from 'sharp';
import { getNextNumericCoverName, isAllowedImageName, naturalImageSort } from '../shared/image-utils.ts';
import { assertInsideDir, COVER_DIR, filePathToPublicImgPath, PUBLIC_IMG_DIR } from '../shared/path-utils.ts';
import { HttpError, json } from './http.ts';

const SITE_HEADER_1920 = path.join(PUBLIC_IMG_DIR, 'site_header_1920.webp');
const SITE_HEADER_800 = path.join(PUBLIC_IMG_DIR, 'site_header_800.webp');
const WEEKLY_HEADER = path.join(PUBLIC_IMG_DIR, 'weekly_header.webp');
const MAX_IMAGE_BODY_BYTES = 20 * 1024 * 1024;

export async function listImages(_request: IncomingMessage, response: ServerResponse): Promise<void> {
  const coverNames = (await fs.readdir(COVER_DIR)).filter(isAllowedImageName).sort(naturalImageSort);

  json(response, 200, {
    covers: coverNames.map((name) => ({
      name,
      url: `/img/cover/${name}`,
      filePath: `public/img/cover/${name}`,
      kind: 'cover',
    })),
    headers: [
      { name: 'site_header_1920.webp', url: '/img/site_header_1920.webp', kind: 'site-header' },
      { name: 'site_header_800.webp', url: '/img/site_header_800.webp', kind: 'site-header' },
      { name: 'weekly_header.webp', url: '/img/weekly_header.webp', kind: 'weekly-header' },
    ],
  });
}

export async function uploadCover(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const buffer = await readImagePayload(request);
  await fs.mkdir(COVER_DIR, { recursive: true });

  const { fileName, filePath } = await writeNextCover(buffer);

  json(response, 201, {
    image: {
      name: fileName,
      url: filePathToPublicImgPath(filePath),
      filePath: `public/img/cover/${fileName}`,
    },
  });
}

export async function uploadSiteHeader(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const buffer = await readImagePayload(request);
  await fs.mkdir(PUBLIC_IMG_DIR, { recursive: true });

  const largeBuffer = await sharp(buffer).resize({ width: 1920 }).webp({ quality: 88 }).toBuffer();
  const smallBuffer = await sharp(buffer).resize({ width: 800 }).webp({ quality: 86 }).toBuffer();
  await writeFixedImages([
    { filePath: SITE_HEADER_1920, buffer: largeBuffer },
    { filePath: SITE_HEADER_800, buffer: smallBuffer },
  ]);

  json(response, 200, { images: ['/img/site_header_1920.webp', '/img/site_header_800.webp'] });
}

export async function uploadWeeklyHeader(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const buffer = await readImagePayload(request);
  await fs.mkdir(PUBLIC_IMG_DIR, { recursive: true });

  const output = await sharp(buffer).resize({ width: 1920 }).webp({ quality: 88 }).toBuffer();
  await writeFixedImages([{ filePath: WEEKLY_HEADER, buffer: output }]);

  json(response, 200, { image: '/img/weekly_header.webp' });
}

async function readImagePayload(request: IncomingMessage): Promise<Buffer> {
  const base64 = (await readLimitedBody(request, MAX_IMAGE_BODY_BYTES)).replace(/\s/g, '');

  if (!base64) {
    throw new HttpError(400, '图片内容不能为空');
  }
  if (!isBase64(base64)) {
    throw new HttpError(400, '图片内容必须是 base64');
  }

  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length === 0) {
    throw new HttpError(400, '图片内容不能为空');
  }

  try {
    await sharp(buffer).metadata();
  } catch {
    throw new HttpError(400, '图片格式无效');
  }

  return buffer;
}

async function readLimitedBody(request: IncomingMessage, maxBytes: number): Promise<string> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;

    if (totalBytes > maxBytes) {
      throw new HttpError(413, '图片过大');
    }

    chunks.push(buffer);
  }

  return Buffer.concat(chunks).toString('utf8');
}

function isBase64(value: string): boolean {
  return value.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(value);
}

async function writeFixedImages(images: Array<{ filePath: string; buffer: Buffer }>): Promise<void> {
  const tempFiles: Array<{ filePath: string; tempPath: string }> = [];

  try {
    for (const image of images) {
      const tempPath = getTempImagePath(image.filePath);
      await fs.writeFile(tempPath, image.buffer, { flag: 'wx' });
      tempFiles.push({ filePath: image.filePath, tempPath });
    }

    for (const image of tempFiles) {
      await fs.rename(image.tempPath, image.filePath);
    }
  } catch (error) {
    await Promise.allSettled(tempFiles.map((image) => fs.rm(image.tempPath, { force: true })));
    throw error;
  }
}

function getTempImagePath(filePath: string): string {
  return path.join(path.dirname(filePath), `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${randomUUID()}.tmp`);
}

async function writeNextCover(buffer: Buffer): Promise<{ fileName: string; filePath: string }> {
  const output = await sharp(buffer).webp({ quality: 88 }).toBuffer();
  let names = (await fs.readdir(COVER_DIR)).filter(isAllowedImageName);

  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const fileName = getNextNumericCoverName(names);
    const filePath = assertInsideDir(path.join(COVER_DIR, fileName), COVER_DIR);

    try {
      await fs.writeFile(filePath, output, { flag: 'wx' });
      return { fileName, filePath };
    } catch (error) {
      if (isFileExistsError(error)) {
        names = [...names, fileName];
        continue;
      }
      throw error;
    }
  }

  throw new HttpError(409, '无法分配新的封面文件名');
}

function isFileExistsError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'EEXIST';
}
