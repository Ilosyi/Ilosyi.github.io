import path from 'node:path';
import matter from 'gray-matter';
import yaml from 'js-yaml';
import { assertInsideDir, CONTENT_DIR, toProjectRelativePath } from './path-utils.ts';
import { createSlug, isValidSlug } from './slug.ts';
import type { BlogCategory, BlogFrontmatter, BlogPostDetail, BlogPostSummary } from './types.ts';

const YAML_DUMP_OPTIONS = {
  flowLevel: 2,
  lineWidth: 120,
  noRefs: true,
  sortKeys: false,
  quotingType: "'",
} as const;

export function parsePostMarkdown(markdown: string): { frontmatter: BlogFrontmatter; body: string } {
  const parsed = matter(markdown);
  const data = parsed.data as Record<string, unknown>;

  return {
    frontmatter: {
      title: String(data.title ?? ''),
      link: typeof data.link === 'string' ? data.link : undefined,
      description: typeof data.description === 'string' ? data.description : undefined,
      date: normalizeRequiredDate(data.date),
      updated: normalizeOptionalDate(data.updated),
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
    subtitle: frontmatter.subtitle,
    cover: frontmatter.cover,
    tags: frontmatter.tags?.filter(Boolean),
    categories: frontmatter.categories,
    sticky: frontmatter.sticky,
    draft: frontmatter.draft,
    tocNumbering: frontmatter.tocNumbering,
  });

  const yamlText = dumpFrontmatterYaml(cleanFrontmatter);

  return `---\n${yamlText}---\n\n${body.trimEnd()}\n`;
}

export function serializeExistingPostWithDraft(markdown: string, draft: boolean): string {
  const draftLine = `draft: ${draft}`;
  const match = /^---(\r?\n)([\s\S]*?)(\r?\n)---((?:\r?\n[\s\S]*)?)$/.exec(markdown);

  if (!match) {
    return `---\n${draftLine}\n---\n${markdown}`;
  }

  const [, firstNewline, frontmatterText, closingNewline, body = ''] = match;
  const lines = frontmatterText === '' ? [] : frontmatterText.split(/\r?\n/);
  const draftIndex = lines.findIndex((line) => /^draft\s*:/.test(line));

  if (draftIndex >= 0) {
    lines[draftIndex] = draftLine;
  } else {
    lines.push(draftLine);
  }

  return `---${firstNewline}${lines.join(firstNewline)}${closingNewline}---${body}`;
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
    .map((name) => resolveCategoryPathPart(name, input.categoryMap))
    .filter(Boolean);

  return assertInsideDir(path.join(CONTENT_DIR, ...categoryParts, `${slug}.md`), CONTENT_DIR);
}

export function toPostSummary(filePath: string, markdown: string): BlogPostSummary {
  return createPostSummary(filePath, parsePostMarkdown(markdown));
}

export function toPostDetail(filePath: string, markdown: string): BlogPostDetail {
  const parsed = parsePostMarkdown(markdown);

  return {
    ...createPostSummary(filePath, parsed),
    body: parsed.body,
  };
}

function dumpFrontmatterYaml(frontmatter: Record<string, unknown>): string {
  return unquoteAstroDateFields(yaml.dump(frontmatter, YAML_DUMP_OPTIONS));
}

function unquoteAstroDateFields(yamlText: string): string {
  return yamlText.replace(/^(date|updated): '(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})'$/gm, '$1: $2');
}

function resolveCategoryPathPart(name: string, categoryMap: Record<string, string>): string {
  const mapped = categoryMap[name];
  if (mapped !== undefined) return mapped;
  if (isValidSlug(name)) return name;
  throw new Error(`分类缺少 categoryMap 映射: ${name}`);
}

function createPostSummary(
  filePath: string,
  parsed: { frontmatter: BlogFrontmatter; body: string },
): BlogPostSummary & { link: string } {
  const link = parsed.frontmatter.link || path.basename(filePath, path.extname(filePath));

  return {
    ...parsed.frontmatter,
    id: toProjectRelativePath(filePath),
    filePath: toProjectRelativePath(filePath),
    slug: link,
    link,
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

function normalizeRequiredDate(value: unknown): string {
  if (value instanceof Date) return formatUtcDateTime(value);
  return String(value ?? '');
}

function normalizeOptionalDate(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (value instanceof Date) return formatUtcDateTime(value);
  return String(value);
}

function formatUtcDateTime(date: Date): string {
  const parts = [
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
  ];
  const [year, month, day, hour, minute, second] = parts.map((part) => String(part).padStart(2, '0'));
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function removeUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== '')) as Partial<T>;
}
