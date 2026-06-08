import assert from 'node:assert/strict';
import test from 'node:test';
import { createImageDisplayGroups, getUploadSuccessMessage, withCacheToken } from './ImageWorkspace.tsx';

test('createImageDisplayGroups keeps fixed headers in the expected order with a stable refresh token', () => {
  const groups = createImageDisplayGroups(
    {
      headers: [
        { name: 'weekly_header.webp', url: '/img/weekly_header.webp', kind: 'weekly-header' },
        { name: 'site_header_800.webp', url: '/img/site_header_800.webp', kind: 'site-header' },
        { name: 'site_header_1920.webp', url: '/img/site_header_1920.webp', kind: 'site-header' },
      ],
      covers: [],
    },
    'refresh-1',
  );

  assert.deepEqual(
    groups.headers.map((image) => image.name),
    ['site_header_1920.webp', 'site_header_800.webp', 'weekly_header.webp'],
  );
  assert.equal(groups.headers[0]?.src, '/img/site_header_1920.webp?v=refresh-1');
  assert.deepEqual(groups.headers[1]?.details, ['/img/site_header_800.webp']);
});

test('createImageDisplayGroups falls back to fixed header paths when API omits headers', () => {
  const groups = createImageDisplayGroups({ headers: [], covers: [] }, 'refresh-1');

  assert.equal(groups.headers[0]?.src, '/img/site_header_1920.webp?v=refresh-1');
  assert.deepEqual(groups.headers[0]?.details, ['/img/site_header_1920.webp', '接口未返回此文件，按固定路径预览']);
});

test('createImageDisplayGroups preserves cover order and exposes file path details', () => {
  const groups = createImageDisplayGroups(
    {
      headers: [],
      covers: [
        { name: '1.webp', url: '/img/cover/1.webp', filePath: 'public/img/cover/1.webp', kind: 'cover' },
        { name: '10.webp', url: '/img/cover/10.webp', filePath: 'public/img/cover/10.webp', kind: 'cover' },
      ],
    },
    'refresh-1',
  );

  assert.deepEqual(
    groups.covers.map((image) => image.name),
    ['1.webp', '10.webp'],
  );
  assert.equal(groups.covers[0]?.src, '/img/cover/1.webp');
  assert.deepEqual(groups.covers[0]?.details, ['/img/cover/1.webp', 'public/img/cover/1.webp']);
});

test('getUploadSuccessMessage describes fixed image and numeric cover uploads', () => {
  assert.equal(getUploadSuccessMessage('site'), '站点头图已更新');
  assert.equal(getUploadSuccessMessage('weekly'), '周刊头图已更新');
  assert.equal(getUploadSuccessMessage('cover', '27.webp'), '文章封面已新增：27.webp');
});

test('withCacheToken appends and encodes refresh tokens for image preview URLs', () => {
  assert.equal(withCacheToken('/img/site_header_1920.webp', 'refresh 1'), '/img/site_header_1920.webp?v=refresh%201');
  assert.equal(
    withCacheToken('/img/site_header_1920.webp?size=large', 'refresh/1'),
    '/img/site_header_1920.webp?size=large&v=refresh%2F1',
  );
});
