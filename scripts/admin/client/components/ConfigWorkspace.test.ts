import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatCategoryMapInput,
  formatKeywordsInput,
  normalizeConfigForSave,
  parseCategoryMapInput,
  parseKeywordsInput,
  parseRawConfigJson,
  validateSiteConfig,
} from './ConfigWorkspace.tsx';

test('parseCategoryMapInput keeps the full slug after the first colon', () => {
  assert.deepEqual(parseCategoryMapInput('随笔: life\n工具: tools:daily\n\n 后端 : back-end '), {
    error: null,
    categoryMap: {
      随笔: 'life',
      工具: 'tools:daily',
      后端: 'back-end',
    },
  });
});

test('parseCategoryMapInput returns undefined for empty input', () => {
  assert.deepEqual(parseCategoryMapInput('\n  \n'), {
    error: null,
    categoryMap: undefined,
  });
});

test('parseCategoryMapInput rejects rows without a valid category name and slug', () => {
  assert.deepEqual(parseCategoryMapInput('\n: missing-name\n笔记: note\n没有分隔符\n  \n'), {
    categoryMap: undefined,
    error: '分类映射第 2 行必须包含分类名和 slug',
  });
  assert.deepEqual(parseCategoryMapInput('笔记'), {
    categoryMap: undefined,
    error: '分类映射第 1 行缺少冒号',
  });
  assert.deepEqual(parseCategoryMapInput('笔记: '), {
    categoryMap: undefined,
    error: '分类映射第 1 行必须包含分类名和 slug',
  });
});

test('formatCategoryMapInput renders stable editable rows', () => {
  assert.equal(formatCategoryMapInput({ 随笔: 'life', 工具: 'tools:daily' }), '随笔: life\n工具: tools:daily');
  assert.equal(formatCategoryMapInput(undefined), '');
});

test('parseKeywordsInput trims lines and returns undefined for an empty list', () => {
  assert.deepEqual(parseKeywordsInput('博客\n\n Astro \n 后端 '), ['博客', 'Astro', '后端']);
  assert.equal(parseKeywordsInput(' \n\n '), undefined);
});

test('formatKeywordsInput handles missing keywords as an empty textarea value', () => {
  assert.equal(formatKeywordsInput(['博客', 'Astro']), '博客\nAstro');
  assert.equal(formatKeywordsInput(undefined), '');
});

test('validateSiteConfig requires title, name, and url', () => {
  assert.equal(
    validateSiteConfig({
      site: { title: '站点', name: 'losyi', url: 'https://example.com' },
    }),
    null,
  );
  assert.equal(
    validateSiteConfig({
      site: { title: '站点', name: ' ', url: 'https://example.com' },
    }),
    '站点配置必须填写标题、站点名称和站点 URL',
  );
});

test('validateSiteConfig handles raw JSON configs with missing required strings', () => {
  assert.equal(
    validateSiteConfig({
      site: { name: 'losyi', url: 'https://example.com' },
    } as never),
    '站点配置必须填写标题、站点名称和站点 URL',
  );
});

test('normalizeConfigForSave trims strings and removes empty optional collections', () => {
  const config = normalizeConfigForSave({
    site: {
      title: ' 站点 ',
      alternate: '',
      subtitle: ' 副标题 ',
      name: ' losyi ',
      description: '',
      avatar: '',
      author: ' 作者 ',
      url: ' https://example.com ',
      keywords: [],
    },
    categoryMap: {},
  });

  assert.deepEqual(config, {
    site: {
      title: '站点',
      alternate: undefined,
      subtitle: '副标题',
      name: 'losyi',
      description: undefined,
      avatar: undefined,
      author: '作者',
      url: 'https://example.com',
      keywords: undefined,
    },
    categoryMap: undefined,
  });
});

test('normalizeConfigForSave handles raw JSON configs with missing optional strings', () => {
  assert.deepEqual(
    normalizeConfigForSave({
      site: {
        name: ' losyi ',
        url: ' https://example.com ',
      },
    } as never),
    {
      site: {
        title: '',
        alternate: undefined,
        subtitle: undefined,
        name: 'losyi',
        description: undefined,
        avatar: undefined,
        author: undefined,
        url: 'https://example.com',
        keywords: undefined,
      },
    },
  );
});

test('parseRawConfigJson returns parsed config for valid JSON', () => {
  const result = parseRawConfigJson('{"site":{"title":"站点","name":"losyi","url":"https://example.com"}}');

  assert.equal(result.error, null);
  assert.equal(result.config?.site.title, '站点');
});

test('parseRawConfigJson reports invalid JSON without throwing', () => {
  const result = parseRawConfigJson('{"site":');

  assert.equal(result.config, null);
  assert.match(result.error ?? '', /JSON 格式无效/);
});

test('parseRawConfigJson rejects JSON that is not an object config', () => {
  const result = parseRawConfigJson('[]');

  assert.equal(result.config, null);
  assert.equal(result.error, '原始配置必须是 JSON 对象');
});

test('parseRawConfigJson rejects an object without a site section', () => {
  const result = parseRawConfigJson('{}');

  assert.equal(result.config, null);
  assert.equal(result.error, '原始配置必须包含 site 对象');
});
