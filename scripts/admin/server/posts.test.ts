import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import test from 'node:test';
import { CONTENT_DIR, toProjectRelativePath } from '../shared/path-utils.ts';
import { HttpError } from './http.ts';
import { createPost, markPostDraft, updatePost } from './posts.ts';

type CapturedResponse = {
  statusCode?: number;
  headers?: Record<string, string>;
  body?: string;
  writeHead: (statusCode: number, headers: Record<string, string>) => CapturedResponse;
  end: (body?: string) => void;
};

function createRequest(body: string): IncomingMessage {
  return Readable.from([body]) as IncomingMessage;
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

test('markPostDraft toggles draft without adding a derived link field', async () => {
  const filePath = path.join(CONTENT_DIR, `admin-posts-test-${process.pid}-${Date.now()}.md`);
  const originalCwd = process.cwd();
  await fs.writeFile(
    filePath,
    `---
title: Linkless Post
date: 2026-06-08 10:00:00
customField: keep-me
customObject:
  nested: true
---

## Body
`,
    'utf8',
  );

  try {
    const response = createResponse();

    process.chdir(os.tmpdir());
    await markPostDraft(createRequest('{"draft":true}'), response as unknown as ServerResponse, {
      id: toProjectRelativePath(filePath),
    });

    const updated = await fs.readFile(filePath, 'utf8');

    assert.equal(response.statusCode, 200);
    assert.equal(response.body, '{"ok":true}');
    assert.match(updated, /\ncustomField: keep-me\n/);
    assert.match(updated, /\ncustomObject:\n {2}nested: true\n/);
    assert.match(updated, /\ndraft: true\n/);
    assert.doesNotMatch(updated, /\nlink:/);
  } finally {
    process.chdir(originalCwd);
    await fs.rm(filePath, { force: true });
  }
});

test('markPostDraft rejects invalid payload without mutating the file', async () => {
  const filePath = path.join(CONTENT_DIR, `admin-posts-test-invalid-${process.pid}-${Date.now()}.md`);
  const original = `---
title: Linkless Post
date: 2026-06-08 10:00:00
---

## Body
`;
  await fs.writeFile(filePath, original, 'utf8');

  try {
    await assert.rejects(
      () =>
        markPostDraft(createRequest('{}'), createResponse() as unknown as ServerResponse, {
          id: toProjectRelativePath(filePath),
        }),
      (error: unknown) => error instanceof HttpError && error.statusCode === 400 && error.message === 'draft 必须是布尔值',
    );

    assert.equal(await fs.readFile(filePath, 'utf8'), original);
  } finally {
    await fs.rm(filePath, { force: true });
  }
});

test('createPost rejects existing target file without overwriting content', async () => {
  const filePath = path.join(CONTENT_DIR, `admin-posts-test-collision-${process.pid}-${Date.now()}.md`);
  const existing = `---
title: Existing
date: 2026-06-08 10:00:00
---

Original content
`;
  await fs.writeFile(filePath, existing, 'utf8');

  try {
    await assert.rejects(
      () =>
        createPost(
          createRequest(
            JSON.stringify({
              frontmatter: {
                title: 'New Post',
                link: path.basename(filePath, '.md'),
                date: '2026-06-08 11:00:00',
              },
              body: 'New content',
            }),
          ),
          createResponse() as unknown as ServerResponse,
        ),
      (error: unknown) => error instanceof HttpError && error.statusCode === 409 && error.message === '文章已存在',
    );

    assert.equal(await fs.readFile(filePath, 'utf8'), existing);
  } finally {
    await fs.rm(filePath, { force: true });
  }
});

test('createPost rejects invalid optional frontmatter fields without creating a file', async () => {
  const link = `admin-posts-invalid-${process.pid}-${Date.now()}`;
  const filePath = path.join(CONTENT_DIR, `${link}.md`);

  try {
    await assert.rejects(
      () =>
        createPost(
          createRequest(
            JSON.stringify({
              frontmatter: {
                title: 'Invalid Optional Fields',
                link,
                date: '2026-06-08 12:00:00',
                draft: 'yes',
              },
              body: 'Body',
            }),
          ),
          createResponse() as unknown as ServerResponse,
        ),
      (error: unknown) =>
        error instanceof HttpError && error.statusCode === 400 && error.message === 'frontmatter.draft 必须是布尔值',
    );

    await assert.rejects(() => fs.access(filePath));
  } finally {
    await fs.rm(filePath, { force: true });
  }
});

test('updatePost rejects invalid optional frontmatter fields without mutating the file', async () => {
  const filePath = path.join(CONTENT_DIR, `admin-posts-update-invalid-${process.pid}-${Date.now()}.md`);
  const original = `---
title: Existing
date: 2026-06-08 10:00:00
---

Original content
`;
  await fs.writeFile(filePath, original, 'utf8');

  try {
    await assert.rejects(
      () =>
        updatePost(
          createRequest(
            JSON.stringify({
              frontmatter: {
                title: 'Invalid Update',
                date: '2026-06-08 13:00:00',
                tags: {},
              },
              body: 'Changed content',
            }),
          ),
          createResponse() as unknown as ServerResponse,
          { id: toProjectRelativePath(filePath) },
        ),
      (error: unknown) =>
        error instanceof HttpError && error.statusCode === 400 && error.message === 'frontmatter.tags 必须是字符串数组',
    );

    assert.equal(await fs.readFile(filePath, 'utf8'), original);
  } finally {
    await fs.rm(filePath, { force: true });
  }
});

test('updatePost rejects mixed categories without mutating the file', async () => {
  const filePath = path.join(CONTENT_DIR, `admin-posts-update-mixed-categories-${process.pid}-${Date.now()}.md`);
  const original = `---
title: Existing
date: 2026-06-08 10:00:00
---

Original content
`;
  await fs.writeFile(filePath, original, 'utf8');

  try {
    await assert.rejects(
      () =>
        updatePost(
          createRequest(
            JSON.stringify({
              frontmatter: {
                title: 'Invalid Categories',
                date: '2026-06-08 13:00:00',
                categories: ['笔记', ['后端']],
              },
              body: 'Changed content',
            }),
          ),
          createResponse() as unknown as ServerResponse,
          { id: toProjectRelativePath(filePath) },
        ),
      (error: unknown) =>
        error instanceof HttpError &&
        error.statusCode === 400 &&
        error.message === 'frontmatter.categories 必须是字符串数组或字符串二维数组，不能混用',
    );

    assert.equal(await fs.readFile(filePath, 'utf8'), original);
  } finally {
    await fs.rm(filePath, { force: true });
  }
});

test('updatePost moves the markdown file when the primary category path changes', async () => {
  const slug = `admin-posts-move-category-${process.pid}-${Date.now()}`;
  const originalPath = path.join(CONTENT_DIR, 'life', `${slug}.md`);
  const expectedPath = path.join(CONTENT_DIR, 'note', 'back-end', `${slug}.md`);
  await fs.mkdir(path.dirname(originalPath), { recursive: true });
  await fs.rm(expectedPath, { force: true });
  await fs.writeFile(
    originalPath,
    `---
title: Move Category
link: ${slug}
date: 2026-06-08 10:00:00
categories:
  - 随笔
---

Original content
`,
    'utf8',
  );

  try {
    const response = createResponse();

    await updatePost(
      createRequest(
        JSON.stringify({
          frontmatter: {
            title: 'Move Category',
            link: slug,
            date: '2026-06-08 10:00:00',
            categories: [['笔记', '后端']],
          },
          body: 'Moved content',
        }),
      ),
      response as unknown as ServerResponse,
      { id: toProjectRelativePath(originalPath) },
    );

    assert.equal(response.statusCode, 200);
    assert.match(response.body ?? '', new RegExp(`src/content/blog/note/back-end/${slug}\\.md`));
    await assert.rejects(() => fs.access(originalPath));
    assert.match(await fs.readFile(expectedPath, 'utf8'), /Moved content/);
    assert.match(await fs.readFile(expectedPath, 'utf8'), /- \[笔记, 后端\]/);
  } finally {
    await fs.rm(originalPath, { force: true });
    await fs.rm(expectedPath, { force: true });
  }
});

test('updatePost rejects category moves that would overwrite another post', async () => {
  const slug = `admin-posts-move-collision-${process.pid}-${Date.now()}`;
  const originalPath = path.join(CONTENT_DIR, 'life', `${slug}.md`);
  const targetPath = path.join(CONTENT_DIR, 'note', 'back-end', `${slug}.md`);
  const original = `---
title: Move Collision
link: ${slug}
date: 2026-06-08 10:00:00
categories:
  - 随笔
---

Original content
`;
  const existingTarget = `---
title: Existing Target
link: ${slug}
date: 2026-06-08 09:00:00
---

Existing target content
`;
  await fs.mkdir(path.dirname(originalPath), { recursive: true });
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(originalPath, original, 'utf8');
  await fs.writeFile(targetPath, existingTarget, 'utf8');

  try {
    await assert.rejects(
      () =>
        updatePost(
          createRequest(
            JSON.stringify({
              frontmatter: {
                title: 'Move Collision',
                link: slug,
                date: '2026-06-08 10:00:00',
                categories: [['笔记', '后端']],
              },
              body: 'Moved content',
            }),
          ),
          createResponse() as unknown as ServerResponse,
          { id: toProjectRelativePath(originalPath) },
        ),
      (error: unknown) => error instanceof HttpError && error.statusCode === 409 && error.message === '文章已存在',
    );

    assert.equal(await fs.readFile(originalPath, 'utf8'), original);
    assert.equal(await fs.readFile(targetPath, 'utf8'), existingTarget);
  } finally {
    await fs.rm(originalPath, { force: true });
    await fs.rm(targetPath, { force: true });
  }
});
