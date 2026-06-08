import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPostFrontmatterPayload,
  createCoverOptions,
  createEditorSnapshot,
  isToggleChecked,
  normalizePostFrontmatter,
  normalizePostTimestamp,
  parseCategoriesInput,
  renderPreviewHtml,
  updateCategoriesDraftInput,
} from './ArticleWorkspace.tsx';

test('normalizePostTimestamp pads existing non-zero-padded post dates', () => {
  assert.equal(normalizePostTimestamp('2026-04-9 12:00:00'), '2026-04-09 12:00:00');
  assert.equal(normalizePostTimestamp('2026-4-9 2:03:04'), '2026-04-09 02:03:04');
});

test('normalizePostTimestamp rejects invalid calendar dates', () => {
  assert.equal(normalizePostTimestamp('2026-02-30 12:00:00'), null);
  assert.equal(normalizePostTimestamp('not a date'), null);
});

test('parseCategoriesInput keeps nested category paths', () => {
  assert.deepEqual(parseCategoriesInput('笔记 / 后端, 工具, 前端 / Vue'), [['笔记', '后端'], ['工具'], ['前端', 'Vue']]);
});

test('parseCategoriesInput ignores empty comma and slash parts', () => {
  assert.deepEqual(parseCategoriesInput(' 笔记 / / 后端 ,, 工具 '), [['笔记', '后端'], ['工具']]);
});

test('parseCategoriesInput keeps flat categories flat when there is no nested category', () => {
  assert.deepEqual(parseCategoriesInput('工具, Go'), ['工具', 'Go']);
});

test('updateCategoriesDraftInput preserves slash while parsing the editable category value', () => {
  const draft = updateCategoriesDraftInput('笔记/');

  assert.equal(draft.input, '笔记/');
  assert.deepEqual(draft.categories, ['笔记']);
});

test('updateCategoriesDraftInput parses completed nested category values', () => {
  const draft = updateCategoriesDraftInput('笔记/后端');

  assert.equal(draft.input, '笔记/后端');
  assert.deepEqual(draft.categories, [['笔记', '后端']]);
});

test('renderPreviewHtml sanitizes dangerous markdown HTML', () => {
  const html = renderPreviewHtml(
    '# 标题\n\n<img src="/img/cover/1.webp" onerror="alert(1)">\n\n[bad](javascript:alert(1))\n\n<script>alert(1)</script>',
  );

  assert.match(html, /<h1>标题<\/h1>/);
  assert.match(html, /<img src="\/img\/cover\/1\.webp"\s*\/?>/);
  assert.doesNotMatch(html, /onerror/);
  assert.doesNotMatch(html, /javascript:/);
  assert.doesNotMatch(html, /script/);
});

test('isToggleChecked follows blog defaults for catalog options', () => {
  assert.equal(isToggleChecked('catalog', { title: 'A', date: '2026-01-01 00:00:00' }), true);
  assert.equal(isToggleChecked('tocNumbering', { title: 'A', date: '2026-01-01 00:00:00' }), true);
  assert.equal(isToggleChecked('draft', { title: 'A', date: '2026-01-01 00:00:00' }), false);
  assert.equal(isToggleChecked('sticky', { title: 'A', date: '2026-01-01 00:00:00' }), false);
});

test('normalizePostFrontmatter strips runtime post detail fields', () => {
  const frontmatter = normalizePostFrontmatter({
    title: 'A',
    date: '2026-4-9 2:03:04',
    body: '# body',
    filePath: 'src/content/blog/a.md',
    id: 'src/content/blog/a.md',
    slug: 'a',
  } as never);

  assert.deepEqual(frontmatter, {
    title: 'A',
    link: undefined,
    date: '2026-04-09 02:03:04',
    updated: undefined,
    description: undefined,
    cover: undefined,
    tags: undefined,
    categories: undefined,
    subtitle: undefined,
    catalog: undefined,
    sticky: undefined,
    draft: undefined,
    tocNumbering: undefined,
  });
});

test('buildPostFrontmatterPayload trims editable strings and keeps only frontmatter fields', () => {
  const payload = buildPostFrontmatterPayload({
    title: '  标题  ',
    link: '  custom-link  ',
    date: '2026-4-9 2:03:04',
    updated: '',
    description: '  摘要  ',
    cover: '',
    tags: ['Go'],
    categories: [['笔记', '后端']],
    catalog: true,
    draft: false,
    tocNumbering: true,
    body: '# body',
    filePath: 'src/content/blog/a.md',
    slug: 'a',
  } as never);

  assert.deepEqual(payload, {
    title: '标题',
    link: 'custom-link',
    date: '2026-04-09 02:03:04',
    updated: undefined,
    description: '摘要',
    cover: undefined,
    tags: ['Go'],
    categories: [['笔记', '后端']],
    subtitle: undefined,
    catalog: true,
    sticky: undefined,
    draft: false,
    tocNumbering: true,
  });
});

test('buildPostFrontmatterPayload normalizes empty lists to undefined', () => {
  const payload = buildPostFrontmatterPayload({
    title: 'A',
    date: '2026-01-01 00:00:00',
    tags: [],
    categories: [],
  });

  assert.equal(payload.tags, undefined);
  assert.equal(payload.categories, undefined);
});

test('createEditorSnapshot uses the same normalization as save payload', () => {
  const original = createEditorSnapshot(
    {
      title: 'A',
      date: '2026-01-01 00:00:00',
      description: undefined,
      cover: undefined,
    },
    '# body',
  );
  const cleared = createEditorSnapshot(
    {
      title: 'A',
      date: '2026-01-01 00:00:00',
      description: '',
      cover: '',
    },
    '# body',
  );

  assert.equal(cleared, original);
});

test('createEditorSnapshot treats cleared empty lists like missing lists', () => {
  const original = createEditorSnapshot(
    {
      title: 'A',
      date: '2026-01-01 00:00:00',
    },
    '# body',
  );
  const cleared = createEditorSnapshot(
    {
      title: 'A',
      date: '2026-01-01 00:00:00',
      tags: [],
      categories: [],
    },
    '# body',
  );

  assert.equal(cleared, original);
});

test('createCoverOptions prepends automatic random cover and preserves cover order', () => {
  const options = createCoverOptions([
    { name: '1.webp', url: '/img/cover/1.webp' },
    { name: '27.webp', url: '/img/cover/27.webp' },
  ]);

  assert.deepEqual(options, [
    { label: '自动随机', value: '' },
    { label: '1.webp', value: '/img/cover/1.webp' },
    { label: '27.webp', value: '/img/cover/27.webp' },
  ]);
});

test('createCoverOptions preserves a current cover that is not in the cover pool', () => {
  const options = createCoverOptions([{ name: '1.webp', url: '/img/cover/1.webp' }], '/img/custom-cover.webp');

  assert.deepEqual(options, [
    { label: '自动随机', value: '' },
    { label: '当前：/img/custom-cover.webp', value: '/img/custom-cover.webp' },
    { label: '1.webp', value: '/img/cover/1.webp' },
  ]);
});

test('createCoverOptions preserves legacy filename cover values', () => {
  const options = createCoverOptions([{ name: '1.webp', url: '/img/cover/1.webp' }], '1.webp');

  assert.deepEqual(options, [
    { label: '自动随机', value: '' },
    { label: '当前：1.webp', value: '1.webp' },
    { label: '1.webp', value: '/img/cover/1.webp' },
  ]);
});
