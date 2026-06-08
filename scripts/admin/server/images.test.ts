import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { Readable } from 'node:stream';
import test from 'node:test';
import sharp from 'sharp';
import { COVER_DIR, PUBLIC_IMG_DIR } from '../shared/path-utils.ts';
import { HttpError } from './http.ts';
import { listImages, uploadCover, uploadSiteHeader, uploadWeeklyHeader } from './images.ts';

type CapturedResponse = {
  statusCode?: number;
  headers?: Record<string, string>;
  body?: string;
  writeHead: (statusCode: number, headers: Record<string, string>) => CapturedResponse;
  end: (body?: string) => void;
};

function createRequest(body = ''): IncomingMessage {
  const chunks = body ? [body] : [];
  return Readable.from(chunks) as IncomingMessage;
}

function createResponse(): CapturedResponse {
  const response: CapturedResponse = {
    writeHead(statusCode, headers) {
      response.statusCode = statusCode;
      response.headers = headers;
      return response;
    },
    end(body = '') {
      response.body = body;
    },
  };

  return response;
}

async function createValidImagePayload(): Promise<string> {
  const inputBuffer = await sharp({
    create: {
      width: 4,
      height: 4,
      channels: 3,
      background: '#446688',
    },
  })
    .png()
    .toBuffer();

  return inputBuffer.toString('base64');
}

async function restoreFile(filePath: string, originalBytes: Buffer): Promise<void> {
  await fs.writeFile(filePath, originalBytes);
  assert.ok((await fs.readFile(filePath)).equals(originalBytes));
}

test('listImages exposes cover pool in natural order and fixed headers', async () => {
  const response = createResponse();

  await listImages(createRequest(), response as unknown as ServerResponse);

  assert.equal(response.statusCode, 200);
  const body = JSON.parse(response.body ?? '{}') as {
    covers?: Array<{ name: string; url: string; filePath: string; kind: string }>;
    headers?: Array<{ name: string; url: string; kind: string }>;
  };

  assert.equal(body.covers?.[0]?.name, '1.webp');
  assert.equal(body.covers?.[0]?.url, '/img/cover/1.webp');
  assert.equal(body.covers?.[0]?.filePath, 'public/img/cover/1.webp');
  assert.equal(body.covers?.[0]?.kind, 'cover');
  assert.equal(
    body.covers?.findIndex((image) => image.name === '2.webp'),
    1,
  );
  assert.equal(body.headers?.find((image) => image.name === 'site_header_1920.webp')?.url, '/img/site_header_1920.webp');
  assert.equal(body.headers?.find((image) => image.name === 'site_header_800.webp')?.kind, 'site-header');
  assert.equal(body.headers?.find((image) => image.name === 'weekly_header.webp')?.kind, 'weekly-header');
});

test('uploadCover writes the next numeric webp cover and reports public paths', async () => {
  const existingNames = await fs.readdir(COVER_DIR);
  const maxCoverNumber = Math.max(
    0,
    ...existingNames.map((name) => {
      const match = /^(\d+)\.[a-z0-9]+$/i.exec(name);
      return match ? Number(match[1]) : 0;
    }),
  );
  const expectedName = `${maxCoverNumber + 1}.webp`;
  const expectedPath = `${COVER_DIR}/${expectedName}`;
  const inputBuffer = await sharp({
    create: {
      width: 4,
      height: 4,
      channels: 3,
      background: '#446688',
    },
  })
    .png()
    .toBuffer();

  try {
    const response = createResponse();

    await uploadCover(createRequest(inputBuffer.toString('base64')), response as unknown as ServerResponse);

    assert.equal(response.statusCode, 201);
    assert.deepEqual(JSON.parse(response.body ?? '{}'), {
      image: {
        name: expectedName,
        url: `/img/cover/${expectedName}`,
        filePath: `public/img/cover/${expectedName}`,
      },
    });
    assert.equal((await sharp(expectedPath).metadata()).format, 'webp');
  } finally {
    await fs.rm(expectedPath, { force: true });
  }
});

test('uploadCover rejects image payloads larger than the raw base64 limit without creating a new cover', async () => {
  const before = await fs.readdir(COVER_DIR);
  const maxCoverNumber = Math.max(
    0,
    ...before.map((name) => {
      const match = /^(\d+)\.[a-z0-9]+$/i.exec(name);
      return match ? Number(match[1]) : 0;
    }),
  );
  const expectedPath = `${COVER_DIR}/${maxCoverNumber + 1}.webp`;

  try {
    await assert.rejects(
      () => uploadCover(createRequest('A'.repeat(20 * 1024 * 1024 + 4)), createResponse() as unknown as ServerResponse),
      (error: unknown) => error instanceof HttpError && error.statusCode === 413 && error.message === '图片过大',
    );

    assert.deepEqual((await fs.readdir(COVER_DIR)).sort(), before.sort());
  } finally {
    await fs.rm(expectedPath, { force: true });
  }
});

test('uploadSiteHeader writes webp headers at fixed widths and restores original files', async () => {
  const largePath = path.join(PUBLIC_IMG_DIR, 'site_header_1920.webp');
  const smallPath = path.join(PUBLIC_IMG_DIR, 'site_header_800.webp');
  const originalLarge = await fs.readFile(largePath);
  const originalSmall = await fs.readFile(smallPath);

  try {
    const response = createResponse();

    await uploadSiteHeader(createRequest(await createValidImagePayload()), response as unknown as ServerResponse);

    assert.equal(response.statusCode, 200);
    const largeMetadata = await sharp(largePath).metadata();
    const smallMetadata = await sharp(smallPath).metadata();
    assert.equal(largeMetadata.format, 'webp');
    assert.equal(largeMetadata.width, 1920);
    assert.equal(smallMetadata.format, 'webp');
    assert.equal(smallMetadata.width, 800);
  } finally {
    await restoreFile(largePath, originalLarge);
    await restoreFile(smallPath, originalSmall);
  }
});

test('uploadWeeklyHeader writes a fixed-width webp header and restores the original file', async () => {
  const weeklyPath = path.join(PUBLIC_IMG_DIR, 'weekly_header.webp');
  const originalWeekly = await fs.readFile(weeklyPath);

  try {
    const response = createResponse();

    await uploadWeeklyHeader(createRequest(await createValidImagePayload()), response as unknown as ServerResponse);

    assert.equal(response.statusCode, 200);
    const metadata = await sharp(weeklyPath).metadata();
    assert.equal(metadata.format, 'webp');
    assert.equal(metadata.width, 1920);
  } finally {
    await restoreFile(weeklyPath, originalWeekly);
  }
});

test('uploadCover rejects empty and invalid image payloads without creating a new cover', async () => {
  const before = await fs.readdir(COVER_DIR);

  await assert.rejects(
    () => uploadCover(createRequest(''), createResponse() as unknown as ServerResponse),
    (error: unknown) => error instanceof HttpError && error.statusCode === 400,
  );
  await assert.rejects(
    () => uploadCover(createRequest('not-valid-image'), createResponse() as unknown as ServerResponse),
    (error: unknown) => error instanceof HttpError && error.statusCode === 400,
  );

  assert.deepEqual((await fs.readdir(COVER_DIR)).sort(), before.sort());
});
