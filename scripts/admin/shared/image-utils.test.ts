import assert from 'node:assert/strict';
import test from 'node:test';
import { getNextNumericCoverName, isAllowedImageName, naturalImageSort } from './image-utils.ts';

test('naturalImageSort sorts numeric image names naturally', () => {
  assert.deepEqual(['10.webp', '2.webp', '1.webp'].sort(naturalImageSort), ['1.webp', '2.webp', '10.webp']);
});

test('getNextNumericCoverName returns the next numeric webp name', () => {
  assert.equal(getNextNumericCoverName(['1.webp', '2.webp', '26.webp']), '27.webp');
});

test('getNextNumericCoverName starts at 1 when no files exist', () => {
  assert.equal(getNextNumericCoverName([]), '1.webp');
});

test('getNextNumericCoverName ignores non-numeric files', () => {
  assert.equal(getNextNumericCoverName(['avatar.webp', '3.webp']), '4.webp');
});

test('getNextNumericCoverName only counts allowed image files', () => {
  assert.equal(getNextNumericCoverName(['999.txt', '3.webp']), '4.webp');
});

test('getNextNumericCoverName handles numeric names with leading zeros', () => {
  assert.equal(getNextNumericCoverName(['001.webp']), '2.webp');
});

test('isAllowedImageName accepts image extensions and rejects scripts', () => {
  assert.equal(isAllowedImageName('cover.webp'), true);
  assert.equal(isAllowedImageName('COVER.WEBP'), true);
  assert.equal(isAllowedImageName('cover.png'), true);
  assert.equal(isAllowedImageName('x.js'), false);
});

test('isAllowedImageName rejects path-like names', () => {
  assert.equal(isAllowedImageName('../secret.png'), false);
  assert.equal(isAllowedImageName('cover/1.webp'), false);
  assert.equal(isAllowedImageName('..\\secret.png'), false);
});
