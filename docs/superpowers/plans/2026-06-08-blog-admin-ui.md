# Blog Admin UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个通过 `pnpm admin` 启动的本地博客管理工作台，用于管理文章、`config/site.yaml` 和博客图片资源。

**Architecture:** 新增 `scripts/admin`，用 Node HTTP + Vite middleware 提供本地管理服务，API 只监听 `127.0.0.1` 并负责文件读写。React 客户端作为本地工作台，通过 fetch 调用本地 API，所有路径校验、Markdown/YAML/图片处理逻辑放在可测试的纯函数或薄服务层中。

**Tech Stack:** Node 24, tsx, Vite, React 19, TypeScript, gray-matter, js-yaml, sharp, marked, Node built-in test runner.

---

## File Structure

- Modify: `package.json`
  - Add `admin` and `test:admin` scripts.
- Create: `scripts/admin/shared/types.ts`
  - Shared article, config, image, and API result types.
- Create: `scripts/admin/shared/path-utils.ts`
  - Project paths, safe path checks, public URL helpers.
- Create: `scripts/admin/shared/slug.ts`
  - URL-safe slug normalization.
- Create: `scripts/admin/shared/post-utils.ts`
  - Markdown frontmatter parsing, serialization, category path mapping, post summary normalization.
- Create: `scripts/admin/shared/config-utils.ts`
  - YAML parse/stringify helpers and config defaults.
- Create: `scripts/admin/shared/image-utils.ts`
  - Image extension checks, natural sort, next numeric cover filename.
- Create: `scripts/admin/shared/*.test.ts`
  - Unit tests for shared pure functions.
- Create: `scripts/admin/server/http.ts`
  - Small routing helpers, JSON/form parsing, response helpers.
- Create: `scripts/admin/server/posts.ts`
  - Article API handlers.
- Create: `scripts/admin/server/config.ts`
  - Site config API handlers.
- Create: `scripts/admin/server/images.ts`
  - Image API handlers.
- Create: `scripts/admin/server/index.ts`
  - Local admin server entry; binds to `127.0.0.1`.
- Create: `scripts/admin/client/index.html`
  - Vite client HTML entry.
- Create: `scripts/admin/client/main.tsx`
  - React entry.
- Create: `scripts/admin/client/api.ts`
  - Fetch wrapper and typed API client.
- Create: `scripts/admin/client/App.tsx`
  - Workbench layout, navigation, shared state.
- Create: `scripts/admin/client/styles.css`
  - Admin-specific utilitarian styling.
- Create: `scripts/admin/client/components/ArticleWorkspace.tsx`
  - Article list, metadata form, Markdown editor, preview/status panel.
- Create: `scripts/admin/client/components/ConfigWorkspace.tsx`
  - Structured `site.yaml` editor.
- Create: `scripts/admin/client/components/ImageWorkspace.tsx`
  - Header, weekly header, cover pool preview/upload flows.

---

## Task 1: Package Scripts And Test Harness

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add admin scripts**

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "admin": "tsx scripts/admin/server/index.ts",
    "test:admin": "node --import tsx --test \"scripts/admin/**/*.test.ts\""
  }
}
```

Keep all existing scripts unchanged.

- [ ] **Step 2: Verify the test command has no tests yet**

Run:

```bash
pnpm test:admin
```

Expected: command exits non-zero or reports no matching test files because tests have not been created. This is acceptable before Task 2.

- [ ] **Step 3: Commit script wiring**

Run:

```bash
git add package.json
git commit -m "chore: add admin scripts"
```

---

## Task 2: Shared Types, Paths, And Slugs

**Files:**
- Create: `scripts/admin/shared/types.ts`
- Create: `scripts/admin/shared/path-utils.ts`
- Create: `scripts/admin/shared/slug.ts`
- Create: `scripts/admin/shared/path-utils.test.ts`
- Create: `scripts/admin/shared/slug.test.ts`

- [ ] **Step 1: Write failing path safety tests**

Create `scripts/admin/shared/path-utils.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { CONTENT_DIR, PROJECT_ROOT, PUBLIC_IMG_DIR, assertInsideDir, publicPathToFilePath, toProjectRelativePath } from './path-utils.ts';

test('assertInsideDir accepts a path inside the allowed directory', () => {
  const filePath = path.join(CONTENT_DIR, 'note/example.md');
  assert.equal(assertInsideDir(filePath, CONTENT_DIR), path.resolve(filePath));
});

test('assertInsideDir rejects path traversal outside the allowed directory', () => {
  const outside = path.join(CONTENT_DIR, '../../package.json');
  assert.throws(() => assertInsideDir(outside, CONTENT_DIR), /路径不在允许目录内/);
});

test('toProjectRelativePath returns a slash separated relative path', () => {
  const filePath = path.join(PROJECT_ROOT, 'src/content/blog/life/hello-world.md');
  assert.equal(toProjectRelativePath(filePath), 'src/content/blog/life/hello-world.md');
});

test('publicPathToFilePath maps a public image URL into public/img', () => {
  const filePath = publicPathToFilePath('/img/cover/1.webp');
  assert.equal(filePath, path.join(PUBLIC_IMG_DIR, 'cover/1.webp'));
});
```

- [ ] **Step 2: Write failing slug tests**

Create `scripts/admin/shared/slug.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { createSlug, isValidSlug } from './slug.ts';

test('createSlug normalizes latin titles', () => {
  assert.equal(createSlug('Go Redis Study!'), 'go-redis-study');
});

test('createSlug keeps existing safe slugs stable', () => {
  assert.equal(createSlug('go-redis-study'), 'go-redis-study');
});

test('createSlug falls back to post prefix for non-latin titles', () => {
  assert.match(createSlug('我的第一篇文章'), /^post-\d{8}-\d{6}$/);
});

test('isValidSlug accepts lowercase dash slugs and rejects traversal tokens', () => {
  assert.equal(isValidSlug('go-redis-study'), true);
  assert.equal(isValidSlug('../secret'), false);
  assert.equal(isValidSlug('Go Redis'), false);
});
```

- [ ] **Step 3: Run tests and verify they fail**

Run:

```bash
pnpm test:admin
```

Expected: FAIL because `path-utils.ts` and `slug.ts` do not exist.

- [ ] **Step 4: Add shared types**

Create `scripts/admin/shared/types.ts`:

```ts
export type BlogCategory = string[] | string;

export type BlogFrontmatter = {
  title: string;
  link?: string;
  description?: string;
  date: string;
  updated?: string;
  cover?: string;
  tags?: string[];
  categories?: BlogCategory[];
  subtitle?: string;
  catalog?: boolean;
  sticky?: boolean;
  draft?: boolean;
  tocNumbering?: boolean;
};

export type BlogPostSummary = BlogFrontmatter & {
  id: string;
  filePath: string;
  slug: string;
};

export type BlogPostDetail = BlogPostSummary & {
  body: string;
};

export type PostSavePayload = {
  frontmatter: BlogFrontmatter;
  body: string;
};

export type ApiError = {
  error: string;
  details?: Record<string, string>;
};

export type ApiResult<T> = T | ApiError;

export type ImageAsset = {
  name: string;
  url: string;
  filePath: string;
  kind: 'cover' | 'site-header' | 'weekly-header' | 'post-image';
};
```

- [ ] **Step 5: Implement path utilities**

Create `scripts/admin/shared/path-utils.ts`:

```ts
import path from 'node:path';

export const PROJECT_ROOT = path.resolve(import.meta.dirname, '../../..');
export const CONTENT_DIR = path.join(PROJECT_ROOT, 'src/content/blog');
export const CONFIG_FILE = path.join(PROJECT_ROOT, 'config/site.yaml');
export const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
export const PUBLIC_IMG_DIR = path.join(PUBLIC_DIR, 'img');
export const COVER_DIR = path.join(PUBLIC_IMG_DIR, 'cover');

export function assertInsideDir(targetPath: string, allowedDir: string): string {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedDir = path.resolve(allowedDir);
  const isInside = resolvedTarget === resolvedDir || resolvedTarget.startsWith(`${resolvedDir}${path.sep}`);

  if (!isInside) {
    throw new Error(`路径不在允许目录内: ${targetPath}`);
  }

  return resolvedTarget;
}

export function assertExactPath(targetPath: string, expectedPath: string): string {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedExpected = path.resolve(expectedPath);

  if (resolvedTarget !== resolvedExpected) {
    throw new Error(`路径不是允许的固定文件: ${targetPath}`);
  }

  return resolvedTarget;
}

export function toProjectRelativePath(filePath: string): string {
  return path.relative(PROJECT_ROOT, path.resolve(filePath)).split(path.sep).join('/');
}

export function publicPathToFilePath(publicPath: string): string {
  if (!publicPath.startsWith('/img/')) {
    throw new Error(`只允许 /img 下的公开图片路径: ${publicPath}`);
  }

  const relative = publicPath.replace(/^\/img\//, '');
  return assertInsideDir(path.join(PUBLIC_IMG_DIR, relative), PUBLIC_IMG_DIR);
}

export function filePathToPublicImgPath(filePath: string): string {
  const resolved = assertInsideDir(filePath, PUBLIC_IMG_DIR);
  const relative = path.relative(PUBLIC_IMG_DIR, resolved).split(path.sep).join('/');
  return `/img/${relative}`;
}
```

- [ ] **Step 6: Implement slug utilities**

Create `scripts/admin/shared/slug.ts`:

```ts
function timestampSlug(): string {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  const time = [
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('');

  return `post-${date}-${time}`;
}

export function createSlug(input: string): string {
  const slug = input
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return slug || timestampSlug();
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}
```

- [ ] **Step 7: Run tests and verify they pass**

Run:

```bash
pnpm test:admin
```

Expected: PASS for `path-utils.test.ts` and `slug.test.ts`.

- [ ] **Step 8: Commit shared path and slug utilities**

Run:

```bash
git add scripts/admin/shared package.json
git commit -m "feat: add admin shared path and slug utilities"
```

---

## Task 3: Markdown Post Utilities

**Files:**
- Create: `scripts/admin/shared/post-utils.ts`
- Create: `scripts/admin/shared/post-utils.test.ts`

- [ ] **Step 1: Write failing post utility tests**

Create `scripts/admin/shared/post-utils.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { CONTENT_DIR } from './path-utils.ts';
import { buildPostFilePath, parsePostMarkdown, serializePostMarkdown } from './post-utils.ts';

test('parsePostMarkdown extracts frontmatter and body', () => {
  const parsed = parsePostMarkdown(`---
title: Redis 学习
link: go-redis-study
date: 2026-06-08 10:00:00
tags:
  - Go
categories:
  - [笔记, 后端]
draft: true
---

## 正文
`);

  assert.equal(parsed.frontmatter.title, 'Redis 学习');
  assert.equal(parsed.frontmatter.link, 'go-redis-study');
  assert.deepEqual(parsed.frontmatter.categories, [['笔记', '后端']]);
  assert.equal(parsed.frontmatter.draft, true);
  assert.equal(parsed.body.trim(), '## 正文');
});

test('serializePostMarkdown writes stable yaml frontmatter and body', () => {
  const markdown = serializePostMarkdown(
    {
      title: 'Redis 学习',
      link: 'go-redis-study',
      date: '2026-06-08 10:00:00',
      tags: ['Go'],
      categories: [['笔记', '后端']],
      draft: true,
    },
    '## 正文',
  );

  assert.match(markdown, /^---\n/);
  assert.match(markdown, /title: Redis 学习/);
  assert.match(markdown, /- \[笔记, 后端\]/);
  assert.match(markdown, /\n---\n\n## 正文\n$/);
});

test('buildPostFilePath maps nested category to configured directory', () => {
  const filePath = buildPostFilePath({
    link: 'go-redis-study',
    categories: [['笔记', '后端']],
    categoryMap: { 笔记: 'note', 后端: 'back-end' },
  });

  assert.equal(filePath, path.join(CONTENT_DIR, 'note/back-end/go-redis-study.md'));
});

test('buildPostFilePath maps single category to configured directory', () => {
  const filePath = buildPostFilePath({
    link: 'getting-started',
    categories: ['工具'],
    categoryMap: { 工具: 'tools' },
  });

  assert.equal(filePath, path.join(CONTENT_DIR, 'tools/getting-started.md'));
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
pnpm test:admin
```

Expected: FAIL because `post-utils.ts` does not exist.

- [ ] **Step 3: Implement post utilities**

Create `scripts/admin/shared/post-utils.ts`:

```ts
import path from 'node:path';
import matter from 'gray-matter';
import yaml from 'js-yaml';
import type { BlogCategory, BlogFrontmatter, BlogPostDetail, BlogPostSummary } from './types.ts';
import { CONTENT_DIR, assertInsideDir, toProjectRelativePath } from './path-utils.ts';
import { createSlug, isValidSlug } from './slug.ts';

export function parsePostMarkdown(markdown: string): { frontmatter: BlogFrontmatter; body: string } {
  const parsed = matter(markdown);
  const data = parsed.data as Record<string, unknown>;

  return {
    frontmatter: {
      title: String(data.title ?? ''),
      link: typeof data.link === 'string' ? data.link : undefined,
      description: typeof data.description === 'string' ? data.description : undefined,
      date: String(data.date ?? ''),
      updated: data.updated ? String(data.updated) : undefined,
      cover: typeof data.cover === 'string' ? data.cover : undefined,
      tags: Array.isArray(data.tags) ? data.tags.map(String) : undefined,
      categories: normalizeCategories(data.categories),
      subtitle: typeof data.subtitle === 'string' ? data.subtitle : undefined,
      catalog: typeof data.catalog === 'boolean' ? data.catalog : undefined,
      sticky: typeof data.sticky === 'boolean' ? data.sticky : undefined,
      draft: typeof data.draft === 'boolean' ? data.draft : undefined,
      tocNumbering: typeof data.tocNumbering === 'boolean' ? data.tocNumbering : undefined,
    },
    body: parsed.content.replace(/^\n+/, ''),
  };
}

export function serializePostMarkdown(frontmatter: BlogFrontmatter, body: string): string {
  const cleanFrontmatter = removeUndefined({
    title: frontmatter.title,
    link: frontmatter.link,
    catalog: frontmatter.catalog,
    date: frontmatter.date,
    updated: frontmatter.updated,
    description: frontmatter.description,
    cover: frontmatter.cover,
    tags: frontmatter.tags?.filter(Boolean),
    categories: frontmatter.categories,
    sticky: frontmatter.sticky,
    draft: frontmatter.draft,
    tocNumbering: frontmatter.tocNumbering,
  });

  const yamlText = yaml.dump(cleanFrontmatter, {
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
    quotingType: "'",
  });

  return `---\n${yamlText}---\n\n${body.trimEnd()}\n`;
}

export function buildPostFilePath(input: {
  link: string;
  categories?: BlogCategory[];
  categoryMap: Record<string, string>;
}): string {
  const slug = createSlug(input.link);
  if (!isValidSlug(slug)) {
    throw new Error(`无效文章 link: ${input.link}`);
  }

  const categoryParts = getPrimaryCategoryParts(input.categories)
    .map((name) => input.categoryMap[name] ?? createSlug(name))
    .filter(Boolean);

  return assertInsideDir(path.join(CONTENT_DIR, ...categoryParts, `${slug}.md`), CONTENT_DIR);
}

export function toPostSummary(filePath: string, markdown: string): BlogPostSummary {
  const parsed = parsePostMarkdown(markdown);
  const link = parsed.frontmatter.link || path.basename(filePath, path.extname(filePath));

  return {
    ...parsed.frontmatter,
    id: toProjectRelativePath(filePath),
    filePath: toProjectRelativePath(filePath),
    slug: link,
    link,
  };
}

export function toPostDetail(filePath: string, markdown: string): BlogPostDetail {
  const summary = toPostSummary(filePath, markdown);
  return {
    ...summary,
    body: parsePostMarkdown(markdown).body,
  };
}

function normalizeCategories(value: unknown): BlogCategory[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map((item) => (Array.isArray(item) ? item.map(String) : String(item)));
}

function getPrimaryCategoryParts(categories?: BlogCategory[]): string[] {
  if (!categories?.length) return [];
  const first = categories[0];
  return Array.isArray(first) ? first : [first];
}

function removeUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== '')) as Partial<T>;
}
```

- [ ] **Step 4: Run tests and verify they pass**

Run:

```bash
pnpm test:admin
```

Expected: PASS for path, slug, and post utility tests.

- [ ] **Step 5: Commit post utilities**

Run:

```bash
git add scripts/admin/shared
git commit -m "feat: add admin post utilities"
```

---

## Task 4: Config And Image Utilities

**Files:**
- Create: `scripts/admin/shared/config-utils.ts`
- Create: `scripts/admin/shared/config-utils.test.ts`
- Create: `scripts/admin/shared/image-utils.ts`
- Create: `scripts/admin/shared/image-utils.test.ts`

- [ ] **Step 1: Write failing config tests**

Create `scripts/admin/shared/config-utils.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { parseSiteConfig, serializeSiteConfig } from './config-utils.ts';

test('parseSiteConfig reads categoryMap and site values', () => {
  const config = parseSiteConfig(`
site:
  title: losyiの博客
  name: losyi
  url: https://ilosyi.github.io
categoryMap:
  笔记: note
`);

  assert.equal(config.site.title, 'losyiの博客');
  assert.equal(config.categoryMap?.笔记, 'note');
});

test('serializeSiteConfig writes yaml with stable key order', () => {
  const yamlText = serializeSiteConfig({
    site: {
      title: 'losyiの博客',
      name: 'losyi',
      url: 'https://ilosyi.github.io',
    },
    categoryMap: { 笔记: 'note' },
  });

  assert.match(yamlText, /^site:\n/);
  assert.match(yamlText, /categoryMap:\n  笔记: note/);
});
```

- [ ] **Step 2: Write failing image tests**

Create `scripts/admin/shared/image-utils.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { getNextNumericCoverName, isAllowedImageName, naturalImageSort } from './image-utils.ts';

test('naturalImageSort sorts numeric image names naturally', () => {
  assert.deepEqual(['10.webp', '2.webp', '1.webp'].sort(naturalImageSort), ['1.webp', '2.webp', '10.webp']);
});

test('getNextNumericCoverName returns the next numeric webp name', () => {
  assert.equal(getNextNumericCoverName(['1.webp', '2.webp', '26.webp']), '27.webp');
});

test('getNextNumericCoverName ignores non-numeric files', () => {
  assert.equal(getNextNumericCoverName(['avatar.webp', '3.webp']), '4.webp');
});

test('isAllowedImageName accepts image extensions and rejects scripts', () => {
  assert.equal(isAllowedImageName('cover.webp'), true);
  assert.equal(isAllowedImageName('cover.png'), true);
  assert.equal(isAllowedImageName('x.js'), false);
});
```

- [ ] **Step 3: Run tests and verify they fail**

Run:

```bash
pnpm test:admin
```

Expected: FAIL because `config-utils.ts` and `image-utils.ts` do not exist.

- [ ] **Step 4: Implement config utilities**

Create `scripts/admin/shared/config-utils.ts`:

```ts
import yaml from 'js-yaml';
import type { SiteYamlConfig } from '../../../src/lib/config/types.ts';

export function parseSiteConfig(yamlText: string): SiteYamlConfig {
  const parsed = yaml.load(yamlText) as SiteYamlConfig | null;

  if (!parsed || typeof parsed !== 'object' || !parsed.site) {
    throw new Error('配置文件缺少 site 节点');
  }

  return parsed;
}

export function serializeSiteConfig(config: SiteYamlConfig): string {
  return `${yaml.dump(config, {
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
    quotingType: "'",
  })}`;
}
```

- [ ] **Step 5: Implement image utilities**

Create `scripts/admin/shared/image-utils.ts`:

```ts
import path from 'node:path';

const ALLOWED_IMAGE_EXTENSIONS = new Set(['.webp', '.png', '.jpg', '.jpeg', '.avif', '.gif']);

export function naturalImageSort(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

export function isAllowedImageName(fileName: string): boolean {
  return ALLOWED_IMAGE_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

export function getNextNumericCoverName(fileNames: string[]): string {
  const max = fileNames.reduce((currentMax, fileName) => {
    const match = /^(\d+)\.[a-z0-9]+$/i.exec(fileName);
    if (!match) return currentMax;
    return Math.max(currentMax, Number(match[1]));
  }, 0);

  return `${max + 1}.webp`;
}
```

- [ ] **Step 6: Run tests and verify they pass**

Run:

```bash
pnpm test:admin
```

Expected: PASS for shared utility tests.

- [ ] **Step 7: Commit config and image utilities**

Run:

```bash
git add scripts/admin/shared
git commit -m "feat: add admin config and image utilities"
```

---

## Task 5: HTTP Server Foundation

**Files:**
- Create: `scripts/admin/server/http.ts`
- Create: `scripts/admin/server/index.ts`

- [ ] **Step 1: Create HTTP helpers**

Create `scripts/admin/server/http.ts`:

```ts
import type { IncomingMessage, ServerResponse } from 'node:http';

export type RouteParams = Record<string, string>;
export type Handler = (request: IncomingMessage, response: ServerResponse, params: RouteParams) => Promise<void> | void;

export type Route = {
  method: string;
  pattern: RegExp;
  handler: Handler;
};

export function json(response: ServerResponse, statusCode: number, body: unknown): void {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

export function text(response: ServerResponse, statusCode: number, body: string): void {
  response.writeHead(statusCode, { 'content-type': 'text/plain; charset=utf-8' });
  response.end(body);
}

export async function readJson<T>(request: IncomingMessage): Promise<T> {
  const raw = await readBody(request);
  return JSON.parse(raw || '{}') as T;
}

export async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

export function matchRoute(routes: Route[], method: string, pathname: string): { route: Route; params: RouteParams } | null {
  for (const route of routes) {
    if (route.method !== method) continue;
    const match = route.pattern.exec(pathname);
    if (!match) continue;
    return { route, params: match.groups ?? {} };
  }
  return null;
}

export function handleError(response: ServerResponse, error: unknown): void {
  const message = error instanceof Error ? error.message : '未知错误';
  json(response, 500, { error: message });
}
```

- [ ] **Step 2: Create server entry with health route**

Create `scripts/admin/server/index.ts`:

```ts
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { handleError, json, matchRoute, type Route } from './http.ts';

const HOST = '127.0.0.1';
const PORT = Number(process.env.KOHARU_ADMIN_PORT ?? 4322);

const clientRoot = path.resolve(fileURLToPath(new URL('../client', import.meta.url)));

const routes: Route[] = [
  {
    method: 'GET',
    pattern: /^\/api\/health$/,
    handler: (_request, response) => {
      json(response, 200, { ok: true, name: 'koharu-admin' });
    },
  },
];

const vite = await createViteServer({
  root: clientRoot,
  server: { middlewareMode: true },
  appType: 'spa',
});

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', `http://${HOST}:${PORT}`);
    const matched = matchRoute(routes, request.method ?? 'GET', url.pathname);

    if (matched) {
      await matched.route.handler(request, response, matched.params);
      return;
    }

    vite.middlewares(request, response, (error) => {
      if (error) {
        handleError(response, error);
      }
    });
  } catch (error) {
    handleError(response, error);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Koharu admin running at http://${HOST}:${PORT}`);
});
```

- [ ] **Step 3: Create minimal client files so Vite can serve**

Create `scripts/admin/client/index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Koharu Admin</title>
  </head>
  <body>
    <div id="root">Koharu Admin</div>
    <script type="module" src="/main.tsx"></script>
  </body>
</html>
```

Create `scripts/admin/client/main.tsx`:

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';

createRoot(document.getElementById('root') as HTMLElement).render(<React.StrictMode>Koharu Admin</React.StrictMode>);
```

- [ ] **Step 4: Start admin server and verify health**

Run:

```bash
pnpm admin
```

In another terminal, run:

```bash
curl -sS http://127.0.0.1:4322/api/health
```

Expected:

```json
{"ok":true,"name":"koharu-admin"}
```

- [ ] **Step 5: Commit server foundation**

Run:

```bash
git add scripts/admin package.json
git commit -m "feat: add local admin server foundation"
```

---

## Task 6: Posts API

**Files:**
- Create: `scripts/admin/server/posts.ts`
- Modify: `scripts/admin/server/index.ts`

- [ ] **Step 1: Implement posts handlers**

Create `scripts/admin/server/posts.ts`:

```ts
import fs from 'node:fs/promises';
import path from 'node:path';
import { glob } from 'glob';
import type { IncomingMessage, ServerResponse } from 'node:http';
import yamlConfig from '../../../config/site.yaml';
import { buildPostFilePath, serializePostMarkdown, toPostDetail, toPostSummary } from '../shared/post-utils.ts';
import type { PostSavePayload } from '../shared/types.ts';
import { CONTENT_DIR, assertInsideDir } from '../shared/path-utils.ts';
import { json, readJson } from './http.ts';

export async function listPosts(_request: IncomingMessage, response: ServerResponse): Promise<void> {
  const files = await glob('**/*.{md,mdx}', { cwd: CONTENT_DIR, absolute: true });
  const posts = await Promise.all(
    files.map(async (file) => {
      const markdown = await fs.readFile(file, 'utf8');
      return toPostSummary(file, markdown);
    }),
  );

  posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  json(response, 200, { posts });
}

export async function getPost(_request: IncomingMessage, response: ServerResponse, params: Record<string, string>): Promise<void> {
  const filePath = assertInsideDir(path.join(process.cwd(), decodeURIComponent(params.id)), CONTENT_DIR);
  const markdown = await fs.readFile(filePath, 'utf8');
  json(response, 200, { post: toPostDetail(filePath, markdown) });
}

export async function createPost(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const payload = await readJson<PostSavePayload>(request);
  const filePath = buildPostFilePath({
    link: payload.frontmatter.link || payload.frontmatter.title,
    categories: payload.frontmatter.categories,
    categoryMap: yamlConfig.categoryMap ?? {},
  });

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, serializePostMarkdown(payload.frontmatter, payload.body), 'utf8');
  const markdown = await fs.readFile(filePath, 'utf8');
  json(response, 201, { post: toPostDetail(filePath, markdown) });
}

export async function updatePost(request: IncomingMessage, response: ServerResponse, params: Record<string, string>): Promise<void> {
  const payload = await readJson<PostSavePayload>(request);
  const filePath = assertInsideDir(path.join(process.cwd(), decodeURIComponent(params.id)), CONTENT_DIR);
  await fs.writeFile(filePath, serializePostMarkdown(payload.frontmatter, payload.body), 'utf8');
  const markdown = await fs.readFile(filePath, 'utf8');
  json(response, 200, { post: toPostDetail(filePath, markdown) });
}

export async function markPostDraft(
  request: IncomingMessage,
  response: ServerResponse,
  params: Record<string, string>,
): Promise<void> {
  const payload = await readJson<{ draft: boolean }>(request);
  const filePath = assertInsideDir(path.join(process.cwd(), decodeURIComponent(params.id)), CONTENT_DIR);
  const detail = toPostDetail(filePath, await fs.readFile(filePath, 'utf8'));
  await fs.writeFile(filePath, serializePostMarkdown({ ...detail, draft: payload.draft }, detail.body), 'utf8');
  json(response, 200, { ok: true });
}
```

- [ ] **Step 2: Wire posts routes**

Modify `scripts/admin/server/index.ts` imports:

```ts
import { createPost, getPost, listPosts, markPostDraft, updatePost } from './posts.ts';
```

Add these routes after health:

```ts
{ method: 'GET', pattern: /^\/api\/posts$/, handler: listPosts },
{ method: 'GET', pattern: /^\/api\/posts\/(?<id>.+)$/, handler: getPost },
{ method: 'POST', pattern: /^\/api\/posts$/, handler: createPost },
{ method: 'PUT', pattern: /^\/api\/posts\/(?<id>.+)$/, handler: updatePost },
{ method: 'PATCH', pattern: /^\/api\/posts\/(?<id>.+)\/draft$/, handler: markPostDraft },
```

- [ ] **Step 3: Verify posts list**

Run:

```bash
pnpm admin
```

Then run:

```bash
curl -sS http://127.0.0.1:4322/api/posts
```

Expected: JSON object with `posts` array and at least one article summary from `src/content/blog`.

- [ ] **Step 4: Commit posts API**

Run:

```bash
git add scripts/admin
git commit -m "feat: add admin posts api"
```

---

## Task 7: Config API

**Files:**
- Create: `scripts/admin/server/config.ts`
- Modify: `scripts/admin/server/index.ts`

- [ ] **Step 1: Implement config handlers**

Create `scripts/admin/server/config.ts`:

```ts
import fs from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { SiteYamlConfig } from '../../../src/lib/config/types.ts';
import { parseSiteConfig, serializeSiteConfig } from '../shared/config-utils.ts';
import { CONFIG_FILE, assertExactPath } from '../shared/path-utils.ts';
import { json, readJson } from './http.ts';

export async function getConfig(_request: IncomingMessage, response: ServerResponse): Promise<void> {
  const yamlText = await fs.readFile(assertExactPath(CONFIG_FILE, CONFIG_FILE), 'utf8');
  json(response, 200, {
    config: parseSiteConfig(yamlText),
    warning: '保存配置可能会规范化 YAML 注释和格式；保存后可能需要重启 Astro dev server。',
  });
}

export async function updateConfig(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const payload = await readJson<{ config: SiteYamlConfig }>(request);
  if (!payload.config?.site?.title || !payload.config.site.url) {
    json(response, 400, { error: '站点配置必须包含 site.title 和 site.url' });
    return;
  }

  await fs.writeFile(assertExactPath(CONFIG_FILE, CONFIG_FILE), serializeSiteConfig(payload.config), 'utf8');
  json(response, 200, { config: payload.config });
}
```

- [ ] **Step 2: Wire config routes**

Modify `scripts/admin/server/index.ts` imports:

```ts
import { getConfig, updateConfig } from './config.ts';
```

Add routes:

```ts
{ method: 'GET', pattern: /^\/api\/config$/, handler: getConfig },
{ method: 'PUT', pattern: /^\/api\/config$/, handler: updateConfig },
```

- [ ] **Step 3: Verify config read**

Run:

```bash
curl -sS http://127.0.0.1:4322/api/config
```

Expected: JSON object with `config.site.title` and the YAML normalization warning.

- [ ] **Step 4: Commit config API**

Run:

```bash
git add scripts/admin
git commit -m "feat: add admin config api"
```

---

## Task 8: Images API

**Files:**
- Create: `scripts/admin/server/images.ts`
- Modify: `scripts/admin/server/index.ts`

- [ ] **Step 1: Implement image handlers**

Create `scripts/admin/server/images.ts`:

```ts
import fs from 'node:fs/promises';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import sharp from 'sharp';
import { COVER_DIR, PUBLIC_IMG_DIR, assertInsideDir, filePathToPublicImgPath } from '../shared/path-utils.ts';
import { getNextNumericCoverName, isAllowedImageName, naturalImageSort } from '../shared/image-utils.ts';
import { json, readBody } from './http.ts';

const SITE_HEADER_1920 = path.join(PUBLIC_IMG_DIR, 'site_header_1920.webp');
const SITE_HEADER_800 = path.join(PUBLIC_IMG_DIR, 'site_header_800.webp');
const WEEKLY_HEADER = path.join(PUBLIC_IMG_DIR, 'weekly_header.webp');

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
  const buffer = Buffer.from(await readBody(request), 'base64');
  const names = (await fs.readdir(COVER_DIR)).filter(isAllowedImageName);
  const fileName = getNextNumericCoverName(names);
  const filePath = assertInsideDir(path.join(COVER_DIR, fileName), COVER_DIR);
  await sharp(buffer).webp({ quality: 88 }).toFile(filePath);
  json(response, 201, { image: { name: fileName, url: filePathToPublicImgPath(filePath), filePath: `public/img/cover/${fileName}` } });
}

export async function uploadSiteHeader(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const buffer = Buffer.from(await readBody(request), 'base64');
  await sharp(buffer).resize({ width: 1920 }).webp({ quality: 88 }).toFile(SITE_HEADER_1920);
  await sharp(buffer).resize({ width: 800 }).webp({ quality: 86 }).toFile(SITE_HEADER_800);
  json(response, 200, { images: ['/img/site_header_1920.webp', '/img/site_header_800.webp'] });
}

export async function uploadWeeklyHeader(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const buffer = Buffer.from(await readBody(request), 'base64');
  await sharp(buffer).resize({ width: 1920 }).webp({ quality: 88 }).toFile(WEEKLY_HEADER);
  json(response, 200, { image: '/img/weekly_header.webp' });
}
```

- [ ] **Step 2: Wire image routes**

Modify `scripts/admin/server/index.ts` imports:

```ts
import { listImages, uploadCover, uploadSiteHeader, uploadWeeklyHeader } from './images.ts';
```

Add routes:

```ts
{ method: 'GET', pattern: /^\/api\/images$/, handler: listImages },
{ method: 'POST', pattern: /^\/api\/images\/covers$/, handler: uploadCover },
{ method: 'POST', pattern: /^\/api\/images\/site-header$/, handler: uploadSiteHeader },
{ method: 'POST', pattern: /^\/api\/images\/weekly-header$/, handler: uploadWeeklyHeader },
```

- [ ] **Step 3: Verify image list**

Run:

```bash
curl -sS http://127.0.0.1:4322/api/images
```

Expected: JSON object with `covers` including `/img/cover/1.webp`.

- [ ] **Step 4: Commit image API**

Run:

```bash
git add scripts/admin
git commit -m "feat: add admin images api"
```

---

## Task 9: React Client Shell And API Client

**Files:**
- Create: `scripts/admin/client/api.ts`
- Create: `scripts/admin/client/App.tsx`
- Create: `scripts/admin/client/styles.css`
- Modify: `scripts/admin/client/main.tsx`

- [ ] **Step 1: Add typed API client**

Create `scripts/admin/client/api.ts`:

```ts
import type { BlogPostDetail, BlogPostSummary, PostSavePayload } from '../shared/types.ts';
import type { SiteYamlConfig } from '../../../src/lib/config/types.ts';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: init?.body instanceof FormData ? undefined : { 'content-type': 'application/json' },
    ...init,
  });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || `请求失败: ${response.status}`);
  }
  return data;
}

export const adminApi = {
  listPosts: () => request<{ posts: BlogPostSummary[] }>('/api/posts'),
  getPost: (id: string) => request<{ post: BlogPostDetail }>(`/api/posts/${encodeURIComponent(id)}`),
  createPost: (payload: PostSavePayload) =>
    request<{ post: BlogPostDetail }>('/api/posts', { method: 'POST', body: JSON.stringify(payload) }),
  updatePost: (id: string, payload: PostSavePayload) =>
    request<{ post: BlogPostDetail }>(`/api/posts/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) }),
  getConfig: () => request<{ config: SiteYamlConfig; warning: string }>('/api/config'),
  updateConfig: (config: SiteYamlConfig) => request<{ config: SiteYamlConfig }>('/api/config', { method: 'PUT', body: JSON.stringify({ config }) }),
  listImages: () => request<{ covers: { name: string; url: string }[]; headers: { name: string; url: string }[] }>('/api/images'),
};
```

- [ ] **Step 2: Add shell layout**

Create `scripts/admin/client/App.tsx`:

```tsx
import { useState } from 'react';
import { ArticleWorkspace } from './components/ArticleWorkspace.tsx';
import { ConfigWorkspace } from './components/ConfigWorkspace.tsx';
import { ImageWorkspace } from './components/ImageWorkspace.tsx';
import './styles.css';

type View = 'articles' | 'config' | 'images';

export function App() {
  const [view, setView] = useState<View>('articles');

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-mark">小</span>
          <div>
            <strong>Koharu Admin</strong>
            <small>本地博客管理</small>
          </div>
        </div>
        <nav className="admin-nav" aria-label="管理导航">
          <button className={view === 'articles' ? 'active' : ''} onClick={() => setView('articles')}>文章</button>
          <button className={view === 'config' ? 'active' : ''} onClick={() => setView('config')}>配置</button>
          <button className={view === 'images' ? 'active' : ''} onClick={() => setView('images')}>图片</button>
        </nav>
      </aside>
      <main className="admin-main">
        {view === 'articles' && <ArticleWorkspace />}
        {view === 'config' && <ConfigWorkspace />}
        {view === 'images' && <ImageWorkspace />}
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Add styles**

Create `scripts/admin/client/styles.css` with these base styles:

```css
:root {
  color: #27303f;
  background: #f6f8fb;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

body {
  margin: 0;
}

button,
input,
textarea,
select {
  font: inherit;
}

.admin-shell {
  display: grid;
  min-height: 100vh;
  grid-template-columns: 232px minmax(0, 1fr);
}

.admin-sidebar {
  border-right: 1px solid #dbe3ef;
  background: #ffffff;
  padding: 20px 14px;
}

.admin-brand {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 24px;
}

.admin-mark {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 8px;
  background: #e9536a;
  color: white;
  font-weight: 700;
}

.admin-brand small {
  display: block;
  color: #667085;
  margin-top: 2px;
}

.admin-nav {
  display: grid;
  gap: 6px;
}

.admin-nav button {
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #465468;
  cursor: pointer;
  padding: 10px 12px;
  text-align: left;
}

.admin-nav button.active,
.admin-nav button:hover {
  background: #edf3ff;
  color: #1f4f8f;
}

.admin-main {
  min-width: 0;
  padding: 22px;
}
```

- [ ] **Step 4: Render App**

Modify `scripts/admin/client/main.tsx`:

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 5: Commit client shell**

Run:

```bash
git add scripts/admin
git commit -m "feat: add admin client shell"
```

---

## Task 10: Article Workspace

**Files:**
- Create: `scripts/admin/client/components/ArticleWorkspace.tsx`
- Modify: `scripts/admin/client/styles.css`

- [ ] **Step 1: Create article workspace component**

Create `scripts/admin/client/components/ArticleWorkspace.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { marked } from 'marked';
import { adminApi } from '../api.ts';
import type { BlogFrontmatter, BlogPostDetail, BlogPostSummary } from '../../shared/types.ts';

const emptyFrontmatter: BlogFrontmatter = {
  title: '',
  link: '',
  date: new Date().toISOString().slice(0, 19).replace('T', ' '),
  tags: [],
  categories: [],
  catalog: true,
  draft: true,
  tocNumbering: true,
};

export function ArticleWorkspace() {
  const [posts, setPosts] = useState<BlogPostSummary[]>([]);
  const [selected, setSelected] = useState<BlogPostDetail | null>(null);
  const [frontmatter, setFrontmatter] = useState<BlogFrontmatter>(emptyFrontmatter);
  const [body, setBody] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('未保存');

  useEffect(() => {
    void adminApi.listPosts().then((data) => setPosts(data.posts));
  }, []);

  const filteredPosts = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return posts;
    return posts.filter((post) => {
      return [post.title, post.link, post.filePath, ...(post.tags ?? [])].some((value) => String(value ?? '').toLowerCase().includes(keyword));
    });
  }, [posts, query]);

  async function openPost(post: BlogPostSummary) {
    const data = await adminApi.getPost(post.filePath);
    setSelected(data.post);
    setFrontmatter(data.post);
    setBody(data.post.body);
    setStatus('已加载');
  }

  function createDraft() {
    setSelected(null);
    setFrontmatter(emptyFrontmatter);
    setBody('# 新文章\n');
    setStatus('新文章未保存');
  }

  async function savePost() {
    const payload = { frontmatter, body };
    const result = selected
      ? await adminApi.updatePost(selected.filePath, payload)
      : await adminApi.createPost(payload);
    setSelected(result.post);
    setFrontmatter(result.post);
    setBody(result.post.body);
    setStatus(`已保存: ${result.post.filePath}`);
    const list = await adminApi.listPosts();
    setPosts(list.posts);
  }

  return (
    <section className="workspace article-workspace">
      <header className="workspace-header">
        <div>
          <h1>文章管理</h1>
          <p>创建、编辑 Markdown 文章，保存到 src/content/blog。</p>
        </div>
        <button className="primary-button" onClick={createDraft}>新建文章</button>
      </header>
      <div className="article-grid">
        <aside className="panel post-list">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题、标签、路径" />
          <div className="post-list-items">
            {filteredPosts.map((post) => (
              <button key={post.filePath} onClick={() => void openPost(post)}>
                <strong>{post.title}</strong>
                <small>{post.filePath}</small>
              </button>
            ))}
          </div>
        </aside>
        <form className="panel editor-form" onSubmit={(event) => { event.preventDefault(); void savePost(); }}>
          <label>标题<input value={frontmatter.title} onChange={(event) => setFrontmatter({ ...frontmatter, title: event.target.value })} /></label>
          <label>Link<input value={frontmatter.link ?? ''} onChange={(event) => setFrontmatter({ ...frontmatter, link: event.target.value })} /></label>
          <label>描述<textarea value={frontmatter.description ?? ''} onChange={(event) => setFrontmatter({ ...frontmatter, description: event.target.value })} /></label>
          <label>封面<input value={frontmatter.cover ?? ''} placeholder="留空则自动随机" onChange={(event) => setFrontmatter({ ...frontmatter, cover: event.target.value || undefined })} /></label>
          <label>正文<textarea className="markdown-editor" value={body} onChange={(event) => setBody(event.target.value)} /></label>
          <div className="toggle-row">
            <label><input type="checkbox" checked={frontmatter.draft ?? false} onChange={(event) => setFrontmatter({ ...frontmatter, draft: event.target.checked })} /> 草稿</label>
            <label><input type="checkbox" checked={frontmatter.sticky ?? false} onChange={(event) => setFrontmatter({ ...frontmatter, sticky: event.target.checked })} /> 置顶</label>
            <label><input type="checkbox" checked={frontmatter.catalog ?? true} onChange={(event) => setFrontmatter({ ...frontmatter, catalog: event.target.checked })} /> 目录</label>
          </div>
          <button className="primary-button" type="submit">保存文章</button>
          <p className="status-line">{status}</p>
        </form>
        <aside className="panel preview-panel">
          <h2>预览</h2>
          <div className="preview" dangerouslySetInnerHTML={{ __html: marked.parse(body) }} />
        </aside>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add article workspace styles**

Append to `scripts/admin/client/styles.css`:

```css
.workspace-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.workspace-header h1 {
  margin: 0;
  font-size: 24px;
}

.workspace-header p {
  margin: 4px 0 0;
  color: #667085;
}

.article-grid {
  display: grid;
  grid-template-columns: 280px minmax(360px, 1fr) minmax(260px, 0.7fr);
  gap: 14px;
}

.panel {
  min-width: 0;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: #ffffff;
  padding: 14px;
}

.post-list input,
.editor-form input,
.editor-form textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #ccd6e3;
  border-radius: 6px;
  padding: 9px 10px;
}

.post-list-items {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.post-list-items button {
  border: 1px solid #e0e7f1;
  border-radius: 8px;
  background: #fbfdff;
  cursor: pointer;
  padding: 10px;
  text-align: left;
}

.post-list-items small {
  display: block;
  color: #667085;
  margin-top: 4px;
  word-break: break-all;
}

.editor-form {
  display: grid;
  gap: 12px;
}

.editor-form label {
  display: grid;
  gap: 6px;
  color: #344054;
  font-weight: 600;
}

.markdown-editor {
  min-height: 360px;
  resize: vertical;
}

.toggle-row {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}

.primary-button {
  border: 0;
  border-radius: 8px;
  background: #e9536a;
  color: white;
  cursor: pointer;
  font-weight: 700;
  padding: 10px 14px;
}

.status-line {
  color: #667085;
  margin: 0;
}

.preview {
  color: #27303f;
  line-height: 1.75;
}
```

- [ ] **Step 3: Verify in browser**

Run:

```bash
pnpm admin
```

Open `http://127.0.0.1:4322`. Expected: article workspace loads, existing posts appear, selecting a post fills the form and preview.

- [ ] **Step 4: Commit article workspace**

Run:

```bash
git add scripts/admin
git commit -m "feat: add admin article workspace"
```

---

## Task 11: Config Workspace

**Files:**
- Create: `scripts/admin/client/components/ConfigWorkspace.tsx`
- Modify: `scripts/admin/client/styles.css`

- [ ] **Step 1: Create config workspace**

Create `scripts/admin/client/components/ConfigWorkspace.tsx`:

```tsx
import { useEffect, useState } from 'react';
import type { SiteYamlConfig } from '../../../../src/lib/config/types.ts';
import { adminApi } from '../api.ts';

export function ConfigWorkspace() {
  const [config, setConfig] = useState<SiteYamlConfig | null>(null);
  const [status, setStatus] = useState('加载中');
  const [warning, setWarning] = useState('');

  useEffect(() => {
    void adminApi.getConfig().then((data) => {
      setConfig(data.config);
      setWarning(data.warning);
      setStatus('已加载');
    });
  }, []);

  async function saveConfig() {
    if (!config) return;
    const result = await adminApi.updateConfig(config);
    setConfig(result.config);
    setStatus('配置已保存。重启 Astro dev server 或重新 build 后生效。');
  }

  if (!config) {
    return <section className="workspace"><p>{status}</p></section>;
  }

  return (
    <section className="workspace config-workspace">
      <header className="workspace-header">
        <div>
          <h1>配置管理</h1>
          <p>结构化编辑 config/site.yaml。</p>
        </div>
        <button className="primary-button" onClick={() => void saveConfig()}>保存配置</button>
      </header>
      {warning && <p className="warning-line">{warning}</p>}
      <div className="config-grid">
        <section className="panel config-section">
          <h2>站点信息</h2>
          <label>标题<input value={config.site.title} onChange={(event) => setConfig({ ...config, site: { ...config.site, title: event.target.value } })} /></label>
          <label>英文名<input value={config.site.alternate ?? ''} onChange={(event) => setConfig({ ...config, site: { ...config.site, alternate: event.target.value } })} /></label>
          <label>副标题<input value={config.site.subtitle ?? ''} onChange={(event) => setConfig({ ...config, site: { ...config.site, subtitle: event.target.value } })} /></label>
          <label>作者<input value={config.site.author ?? ''} onChange={(event) => setConfig({ ...config, site: { ...config.site, author: event.target.value } })} /></label>
          <label>URL<input value={config.site.url} onChange={(event) => setConfig({ ...config, site: { ...config.site, url: event.target.value } })} /></label>
          <label>描述<textarea value={config.site.description ?? ''} onChange={(event) => setConfig({ ...config, site: { ...config.site, description: event.target.value } })} /></label>
        </section>
        <section className="panel config-section">
          <h2>分类映射</h2>
          <textarea
            value={Object.entries(config.categoryMap ?? {}).map(([name, slug]) => `${name}: ${slug}`).join('\n')}
            onChange={(event) => {
              const categoryMap = Object.fromEntries(
                event.target.value
                  .split('\n')
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .map((line) => {
                    const [name, ...slugParts] = line.split(':');
                    return [name.trim(), slugParts.join(':').trim()];
                  }),
              );
              setConfig({ ...config, categoryMap });
            }}
          />
          <small>每行格式：分类名: slug</small>
        </section>
        <section className="panel config-section wide">
          <h2>原始配置 JSON</h2>
          <textarea
            value={JSON.stringify(config, null, 2)}
            onChange={(event) => setConfig(JSON.parse(event.target.value) as SiteYamlConfig)}
          />
        </section>
      </div>
      <p className="status-line">{status}</p>
    </section>
  );
}
```

- [ ] **Step 2: Add config workspace styles**

Append to `scripts/admin/client/styles.css`:

```css
.warning-line {
  border: 1px solid #f7cf83;
  border-radius: 8px;
  background: #fff7e6;
  color: #8a5a00;
  padding: 10px 12px;
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.config-section {
  display: grid;
  gap: 10px;
}

.config-section.wide {
  grid-column: 1 / -1;
}

.config-section h2 {
  margin: 0 0 4px;
  font-size: 18px;
}

.config-section label {
  display: grid;
  gap: 6px;
  color: #344054;
  font-weight: 600;
}

.config-section input,
.config-section textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #ccd6e3;
  border-radius: 6px;
  padding: 9px 10px;
}

.config-section textarea {
  min-height: 180px;
  resize: vertical;
}
```

- [ ] **Step 3: Verify config workspace**

Run:

```bash
pnpm admin
```

Open config tab. Expected: site title and category map load; saving returns success and displays restart/build message.

- [ ] **Step 4: Commit config workspace**

Run:

```bash
git add scripts/admin
git commit -m "feat: add admin config workspace"
```

---

## Task 12: Image Workspace

**Files:**
- Create: `scripts/admin/client/components/ImageWorkspace.tsx`
- Modify: `scripts/admin/client/styles.css`

- [ ] **Step 1: Create image workspace**

Create `scripts/admin/client/components/ImageWorkspace.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { adminApi } from '../api.ts';

type ImageList = {
  covers: { name: string; url: string }[];
  headers: { name: string; url: string }[];
};

export function ImageWorkspace() {
  const [images, setImages] = useState<ImageList>({ covers: [], headers: [] });
  const [status, setStatus] = useState('加载中');

  async function refresh() {
    const data = await adminApi.listImages();
    setImages(data);
    setStatus('已加载');
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <section className="workspace image-workspace">
      <header className="workspace-header">
        <div>
          <h1>图片管理</h1>
          <p>管理站点头图、周刊头图和文章编号封面池。</p>
        </div>
        <button className="primary-button" onClick={() => void refresh()}>刷新</button>
      </header>
      <section className="panel">
        <h2>固定头图</h2>
        <div className="image-grid">
          {images.headers.map((image) => (
            <figure key={image.url} className="image-card">
              <img src={`${image.url}?v=${Date.now()}`} alt={image.name} />
              <figcaption>{image.name}</figcaption>
            </figure>
          ))}
        </div>
      </section>
      <section className="panel">
        <h2>文章封面池</h2>
        <p className="status-line">新增封面会由服务端保存为下一个数字 .webp 文件名。</p>
        <div className="image-grid">
          {images.covers.map((image) => (
            <figure key={image.url} className="image-card">
              <img src={image.url} alt={image.name} />
              <figcaption>{image.name}</figcaption>
            </figure>
          ))}
        </div>
      </section>
      <p className="status-line">{status}</p>
    </section>
  );
}
```

- [ ] **Step 2: Add image workspace styles**

Append to `scripts/admin/client/styles.css`:

```css
.image-workspace {
  display: grid;
  gap: 14px;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

.image-card {
  margin: 0;
  overflow: hidden;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: #fbfdff;
}

.image-card img {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
}

.image-card figcaption {
  padding: 8px 10px;
  color: #465468;
  font-size: 13px;
}
```

- [ ] **Step 3: Verify image workspace**

Run:

```bash
pnpm admin
```

Open image tab. Expected: fixed headers and numbered cover pool load in natural order.

- [ ] **Step 4: Commit image workspace**

Run:

```bash
git add scripts/admin
git commit -m "feat: add admin image workspace"
```

---

## Task 13: Upload Controls

**Files:**
- Modify: `scripts/admin/client/api.ts`
- Modify: `scripts/admin/client/components/ImageWorkspace.tsx`
- Modify: `scripts/admin/client/components/ArticleWorkspace.tsx`

- [ ] **Step 1: Add upload methods to API client**

Append these helpers inside `adminApi` in `scripts/admin/client/api.ts`:

```ts
uploadCover: async (file: File) => {
  const base64 = await fileToBase64(file);
  return request<{ image: { name: string; url: string } }>('/api/images/covers', { method: 'POST', body: base64 });
},
uploadSiteHeader: async (file: File) => {
  const base64 = await fileToBase64(file);
  return request<{ images: string[] }>('/api/images/site-header', { method: 'POST', body: base64 });
},
uploadWeeklyHeader: async (file: File) => {
  const base64 = await fileToBase64(file);
  return request<{ image: string }>('/api/images/weekly-header', { method: 'POST', body: base64 });
},
```

Add this function below `adminApi`:

```ts
async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}
```

- [ ] **Step 2: Add image upload controls**

In `ImageWorkspace.tsx`, add three file inputs near the top of the returned section:

```tsx
<div className="upload-row">
  <label>上传站点头图<input type="file" accept="image/*" onChange={(event) => void handleUpload('site', event.target.files?.[0])} /></label>
  <label>上传周刊头图<input type="file" accept="image/*" onChange={(event) => void handleUpload('weekly', event.target.files?.[0])} /></label>
  <label>新增文章封面<input type="file" accept="image/*" onChange={(event) => void handleUpload('cover', event.target.files?.[0])} /></label>
</div>
```

Add this function inside `ImageWorkspace`:

```tsx
async function handleUpload(kind: 'site' | 'weekly' | 'cover', file?: File) {
  if (!file) return;
  setStatus('上传中');
  if (kind === 'site') await adminApi.uploadSiteHeader(file);
  if (kind === 'weekly') await adminApi.uploadWeeklyHeader(file);
  if (kind === 'cover') await adminApi.uploadCover(file);
  await refresh();
  setStatus('上传完成');
}
```

- [ ] **Step 3: Add article cover selector**

In `ArticleWorkspace.tsx`, load image list once:

```tsx
const [covers, setCovers] = useState<{ name: string; url: string }[]>([]);

useEffect(() => {
  void adminApi.listImages().then((data) => setCovers(data.covers));
}, []);
```

Replace the cover input with:

```tsx
<label>
  封面
  <select value={frontmatter.cover ?? ''} onChange={(event) => setFrontmatter({ ...frontmatter, cover: event.target.value || undefined })}>
    <option value="">自动随机</option>
    {covers.map((cover) => (
      <option key={cover.url} value={cover.url}>{cover.name}</option>
    ))}
  </select>
</label>
```

- [ ] **Step 4: Add upload row styles**

Append to `styles.css`:

```css
.upload-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 14px;
}

.upload-row label {
  display: grid;
  gap: 6px;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: #fff;
  color: #344054;
  padding: 10px 12px;
}
```

- [ ] **Step 5: Verify uploads with a disposable image**

Use a small local image file and upload it as a new cover. Expected: `public/img/cover/<next>.webp` is created and appears in the cover grid. Do not commit the uploaded test image; remove it manually if it was only for verification.

- [ ] **Step 6: Commit upload controls**

Run:

```bash
git add scripts/admin
git commit -m "feat: add admin image upload controls"
```

---

## Task 14: Typecheck, Lint, Build, And Runtime Verification

**Files:**
- Modify as required by compiler/linter output only.

- [ ] **Step 1: Run admin tests**

Run:

```bash
pnpm test:admin
```

Expected: all admin tests pass.

- [ ] **Step 2: Run Astro type checking**

Run:

```bash
pnpm check
```

Expected: no TypeScript or Astro diagnostics.

- [ ] **Step 3: Run lint fix**

Run:

```bash
pnpm lint:fix
```

Expected: Biome completes successfully. Review formatting changes before committing.

- [ ] **Step 4: Run production build**

Run:

```bash
pnpm build
```

Expected: Astro production build exits 0. Admin code must not appear as a public route in `dist`.

- [ ] **Step 5: Verify admin UI runtime**

Run:

```bash
pnpm admin
```

Open `http://127.0.0.1:4322`.

Expected:

- Article tab loads existing posts.
- Selecting a post loads metadata and Markdown body.
- Config tab loads `config/site.yaml`.
- Image tab loads site header, weekly header, and cover pool.

- [ ] **Step 6: Commit verification fixes**

If verification required fixes, run:

```bash
git add package.json scripts/admin
git commit -m "fix: polish admin verification issues"
```

If no fixes were needed, do not create an empty commit.

---

## Self-Review

- Spec coverage:
  - Local admin service: Task 5.
  - Article listing, filtering, creation, editing, draft toggling, Markdown save: Tasks 3, 6, 10, 13.
  - `config/site.yaml` structured editing: Tasks 4, 7, 11.
  - Site header, weekly header, article cover pool, numbered WebP uploads: Tasks 4, 8, 12, 13.
  - Static Astro public site preserved: Tasks 5 and 14.
  - Path safety and validation: Tasks 2, 3, 4, 6, 7, 8.
- Placeholder scan: no deferred implementation markers or unnamed implementation steps are intentionally left in this plan.
- Type consistency:
  - Shared types are introduced in Task 2.
  - Post utilities use `BlogFrontmatter`, `BlogPostSummary`, `BlogPostDetail`, and `PostSavePayload`.
  - Client API uses the same shared types and `SiteYamlConfig`.
  - Route handlers return `{ posts }`, `{ post }`, `{ config }`, and `{ covers, headers }` shapes consumed by client tasks.
