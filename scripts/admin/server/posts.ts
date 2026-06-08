import fs from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { glob } from 'glob';
import { parseSiteConfig } from '../shared/config-utils.ts';
import { assertInsideDir, CONFIG_FILE, CONTENT_DIR, PROJECT_ROOT } from '../shared/path-utils.ts';
import {
  buildPostFilePath,
  serializeExistingPostWithDraft,
  serializePostMarkdown,
  toPostDetail,
  toPostSummary,
} from '../shared/post-utils.ts';
import type { PostSavePayload } from '../shared/types.ts';
import { HttpError, json, readJson } from './http.ts';

const POST_TIMESTAMP_PATTERN = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;

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

export async function getPost(
  _request: IncomingMessage,
  response: ServerResponse,
  params: Record<string, string>,
): Promise<void> {
  const filePath = assertInsideDir(path.join(PROJECT_ROOT, decodeURIComponent(params.id)), CONTENT_DIR);
  const markdown = await fs.readFile(filePath, 'utf8');
  json(response, 200, { post: toPostDetail(filePath, markdown) });
}

export async function createPost(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const payload = validatePostSavePayload(await readJson<unknown>(request));
  const filePath = buildPostFilePath({
    link: payload.frontmatter.link || payload.frontmatter.title,
    categories: payload.frontmatter.categories,
    categoryMap: parseSiteConfig(await fs.readFile(CONFIG_FILE, 'utf8')).categoryMap ?? {},
  });

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const newMarkdown = serializePostMarkdown(payload.frontmatter, payload.body);
  try {
    await fs.writeFile(filePath, newMarkdown, { encoding: 'utf8', flag: 'wx' });
  } catch (error) {
    if (isFileExistsError(error)) {
      throw new HttpError(409, '文章已存在');
    }
    throw error;
  }

  const markdown = await fs.readFile(filePath, 'utf8');
  json(response, 201, { post: toPostDetail(filePath, markdown) });
}

export async function updatePost(
  request: IncomingMessage,
  response: ServerResponse,
  params: Record<string, string>,
): Promise<void> {
  const payload = validatePostSavePayload(await readJson<unknown>(request));
  const filePath = assertInsideDir(path.join(PROJECT_ROOT, decodeURIComponent(params.id)), CONTENT_DIR);
  const targetFilePath = buildPostFilePath({
    link: payload.frontmatter.link || path.basename(filePath, path.extname(filePath)),
    categories: payload.frontmatter.categories,
    categoryMap: parseSiteConfig(await fs.readFile(CONFIG_FILE, 'utf8')).categoryMap ?? {},
  });
  const newMarkdown = serializePostMarkdown(payload.frontmatter, payload.body);

  if (targetFilePath === filePath) {
    await fs.writeFile(filePath, newMarkdown, 'utf8');
  } else {
    await fs.mkdir(path.dirname(targetFilePath), { recursive: true });
    try {
      await fs.writeFile(targetFilePath, newMarkdown, { encoding: 'utf8', flag: 'wx' });
    } catch (error) {
      if (isFileExistsError(error)) {
        throw new HttpError(409, '文章已存在');
      }
      throw error;
    }
    await fs.rm(filePath);
  }

  const markdown = await fs.readFile(targetFilePath, 'utf8');
  json(response, 200, { post: toPostDetail(targetFilePath, markdown) });
}

export async function markPostDraft(
  request: IncomingMessage,
  response: ServerResponse,
  params: Record<string, string>,
): Promise<void> {
  const payload = validateDraftPayload(await readJson<unknown>(request));
  const filePath = assertInsideDir(path.join(PROJECT_ROOT, decodeURIComponent(params.id)), CONTENT_DIR);
  const markdown = await fs.readFile(filePath, 'utf8');
  await fs.writeFile(filePath, serializeExistingPostWithDraft(markdown, payload.draft), 'utf8');
  json(response, 200, { ok: true });
}

function validatePostSavePayload(value: unknown): PostSavePayload {
  if (!isRecord(value) || !isRecord(value.frontmatter) || typeof value.body !== 'string') {
    throw new HttpError(400, '文章内容格式无效');
  }

  const frontmatter = value.frontmatter;
  const title = requireNonEmptyString(frontmatter.title, 'frontmatter.title');
  const date = requireTimestamp(frontmatter.date, 'frontmatter.date');

  return {
    frontmatter: {
      title,
      link: optionalString(frontmatter.link, 'frontmatter.link'),
      description: optionalString(frontmatter.description, 'frontmatter.description'),
      date,
      updated: optionalTimestamp(frontmatter.updated, 'frontmatter.updated'),
      cover: optionalString(frontmatter.cover, 'frontmatter.cover'),
      tags: optionalStringArray(frontmatter.tags, 'frontmatter.tags'),
      categories: optionalCategories(frontmatter.categories, 'frontmatter.categories'),
      subtitle: optionalString(frontmatter.subtitle, 'frontmatter.subtitle'),
      catalog: optionalBoolean(frontmatter.catalog, 'frontmatter.catalog'),
      sticky: optionalBoolean(frontmatter.sticky, 'frontmatter.sticky'),
      draft: optionalBoolean(frontmatter.draft, 'frontmatter.draft'),
      tocNumbering: optionalBoolean(frontmatter.tocNumbering, 'frontmatter.tocNumbering'),
    },
    body: value.body,
  };
}

function validateDraftPayload(value: unknown): { draft: boolean } {
  if (!isRecord(value) || typeof value.draft !== 'boolean') {
    throw new HttpError(400, 'draft 必须是布尔值');
  }

  return { draft: value.draft };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new HttpError(400, `${fieldName} 必须是字符串`);
  }
  if (value.trim() === '') {
    throw new HttpError(400, `${fieldName} 不能为空`);
  }
  return value;
}

function optionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new HttpError(400, `${fieldName} 必须是字符串`);
  }
  return value;
}

function requireTimestamp(value: unknown, fieldName: string): string {
  const text = requireNonEmptyString(value, fieldName);
  if (!isValidPostTimestamp(text)) {
    throw new HttpError(400, `${fieldName} 必须是 YYYY-MM-DD HH:mm:ss 格式`);
  }
  return text;
}

function optionalTimestamp(value: unknown, fieldName: string): string | undefined {
  if (value === undefined) return undefined;
  const text = optionalString(value, fieldName);
  if (text === undefined) return undefined;
  if (!isValidPostTimestamp(text)) {
    throw new HttpError(400, `${fieldName} 必须是 YYYY-MM-DD HH:mm:ss 格式`);
  }
  return text;
}

function optionalBoolean(value: unknown, fieldName: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') {
    throw new HttpError(400, `${fieldName} 必须是布尔值`);
  }
  return value;
}

function optionalStringArray(value: unknown, fieldName: string): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new HttpError(400, `${fieldName} 必须是字符串数组`);
  }
  return value;
}

function optionalCategories(value: unknown, fieldName: string): PostSavePayload['frontmatter']['categories'] {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new HttpError(400, `${fieldName} 必须是字符串数组或字符串二维数组`);
  }
  if (value.every((item) => typeof item === 'string')) {
    return value;
  }
  if (value.every((item) => Array.isArray(item) && item.every((nestedItem) => typeof nestedItem === 'string'))) {
    return value;
  }
  throw new HttpError(400, `${fieldName} 必须是字符串数组或字符串二维数组，不能混用`);
}

function isValidPostTimestamp(value: string): boolean {
  const match = POST_TIMESTAMP_PATTERN.exec(value);
  if (!match) return false;

  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCHours() === hour &&
    date.getUTCMinutes() === minute &&
    date.getUTCSeconds() === second
  );
}

function isFileExistsError(error: unknown): error is Error & { code: 'EEXIST' } {
  return error instanceof Error && 'code' in error && error.code === 'EEXIST';
}
