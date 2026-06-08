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

test('parseSiteConfig rejects missing or invalid site sections', () => {
  assert.throws(() => parseSiteConfig('categoryMap:\n  笔记: note\n'), /配置文件缺少 site 节点/);
  assert.throws(() => parseSiteConfig('site: losyi\n'), /配置文件缺少有效的 site 节点/);
  assert.throws(() => parseSiteConfig('site:\n  - losyi\n'), /配置文件缺少有效的 site 节点/);
});

test('parseSiteConfig requires site title, name, and url strings', () => {
  assert.throws(() => parseSiteConfig('site:\n  name: losyi\n  url: https://ilosyi.github.io\n'), /配置文件缺少 site.title/);
  assert.throws(
    () => parseSiteConfig('site:\n  title: losyiの博客\n  url: https://ilosyi.github.io\n'),
    /配置文件缺少 site.name/,
  );
  assert.throws(() => parseSiteConfig('site:\n  title: losyiの博客\n  name: losyi\n'), /配置文件缺少 site.url/);
  assert.throws(
    () => parseSiteConfig('site:\n  title: 123\n  name: losyi\n  url: https://ilosyi.github.io\n'),
    /配置文件缺少 site.title/,
  );
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
  assert.match(yamlText, /categoryMap:\n {2}笔记: note/);
});
