import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { CONTENT_DIR } from './path-utils.ts';
import {
  buildPostFilePath,
  parsePostMarkdown,
  serializeExistingPostWithDraft,
  serializePostMarkdown,
  toPostDetail,
} from './post-utils.ts';

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
  assert.equal(parsed.frontmatter.date, '2026-06-08 10:00:00');
  assert.deepEqual(parsed.frontmatter.tags, ['Go']);
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
      updated: '2026-06-09 11:30:00',
      subtitle: '缓存实践',
      tags: ['Go'],
      categories: [['笔记', '后端']],
      draft: true,
    },
    '## 正文',
  );

  assert.match(markdown, /^---\n/);
  assert.match(markdown, /title: Redis 学习/);
  assert.match(markdown, /date: 2026-06-08 10:00:00/);
  assert.doesNotMatch(markdown, /date: '2026-06-08 10:00:00'/);
  assert.match(markdown, /updated: 2026-06-09 11:30:00/);
  assert.doesNotMatch(markdown, /updated: '2026-06-09 11:30:00'/);
  assert.match(markdown, /subtitle: 缓存实践/);
  assert.match(markdown, /- \[笔记, 后端\]/);
  assert.match(markdown, /\n---\n\n## 正文\n$/);
});

test('serializeExistingPostWithDraft inserts draft while preserving raw frontmatter and body', () => {
  const original = `---
# keep this comment
title: Custom Post
date: 2026-06-08 10:00:00
customTimestamp: 2026-06-09 11:30:00
customField: keep-me
customObject:
  draft: nested-value
  count: 2
---

## Body

draft: this is body text
`;

  const markdown = serializeExistingPostWithDraft(original, true);

  assert.equal(
    markdown,
    `---
# keep this comment
title: Custom Post
date: 2026-06-08 10:00:00
customTimestamp: 2026-06-09 11:30:00
customField: keep-me
customObject:
  draft: nested-value
  count: 2
draft: true
---

## Body

draft: this is body text
`,
  );
  assert.doesNotMatch(markdown, /\nlink:/);
});

test('serializeExistingPostWithDraft replaces only the top-level draft line', () => {
  const original = `---
title: Custom Post
draft: false
customObject:
  draft: nested-value
---

## Body
`;

  const markdown = serializeExistingPostWithDraft(original, true);

  assert.equal(
    markdown,
    `---
title: Custom Post
draft: true
customObject:
  draft: nested-value
---

## Body
`,
  );
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

test('buildPostFilePath rejects unmapped non-slug category names', () => {
  assert.throws(
    () =>
      buildPostFilePath({
        link: 'algorithm-note',
        categories: [['笔记', '算法']],
        categoryMap: { 笔记: 'note' },
      }),
    /分类缺少 categoryMap 映射: 算法/,
  );
});

test('buildPostFilePath accepts unmapped category names that are already safe slugs', () => {
  const filePath = buildPostFilePath({
    link: 'demo',
    categories: [['note', 'backend']],
    categoryMap: {},
  });

  assert.equal(filePath, path.join(CONTENT_DIR, 'note/backend/demo.md'));
});

test('toPostDetail returns body and summary fields', () => {
  const filePath = path.join(CONTENT_DIR, 'note/back-end/go-redis-study.md');
  const detail = toPostDetail(
    filePath,
    `---
title: Redis 学习
link: go-redis-study
date: 2026-06-08 10:00:00
tags:
  - Go
categories:
  - [笔记, 后端]
---

## 正文
`,
  );

  assert.equal(detail.id, 'src/content/blog/note/back-end/go-redis-study.md');
  assert.equal(detail.filePath, 'src/content/blog/note/back-end/go-redis-study.md');
  assert.equal(detail.slug, 'go-redis-study');
  assert.equal((detail as { link: string }).link, 'go-redis-study');
  assert.equal(detail.title, 'Redis 学习');
  assert.equal(detail.body.trim(), '## 正文');
});
