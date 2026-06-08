import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import {
  assertExactPath,
  assertInsideDir,
  CONFIG_FILE,
  CONTENT_DIR,
  filePathToPublicImgPath,
  PROJECT_ROOT,
  PUBLIC_IMG_DIR,
  publicPathToFilePath,
  toProjectRelativePath,
} from './path-utils.ts';

test('assertInsideDir accepts a path inside the allowed directory', () => {
  const filePath = path.join(CONTENT_DIR, 'note/example.md');
  assert.equal(assertInsideDir(filePath, CONTENT_DIR), path.resolve(filePath));
});

test('assertInsideDir rejects path traversal outside the allowed directory', () => {
  const outside = path.join(CONTENT_DIR, '../../package.json');
  assert.throws(() => assertInsideDir(outside, CONTENT_DIR), /路径不在允许目录内/);
});

test('assertInsideDir rejects sibling-prefix paths outside the allowed directory', () => {
  const siblingPrefixPath = path.join(`${PUBLIC_IMG_DIR}2`, 'file.webp');
  assert.throws(() => assertInsideDir(siblingPrefixPath, PUBLIC_IMG_DIR), /路径不在允许目录内/);
});

test('toProjectRelativePath returns a slash separated relative path', () => {
  const filePath = path.join(PROJECT_ROOT, 'src/content/blog/life/hello-world.md');
  assert.equal(toProjectRelativePath(filePath), 'src/content/blog/life/hello-world.md');
});

test('publicPathToFilePath maps a public image URL into public/img', () => {
  const filePath = publicPathToFilePath('/img/cover/1.webp');
  assert.equal(filePath, path.join(PUBLIC_IMG_DIR, 'cover/1.webp'));
});

test('publicPathToFilePath rejects path traversal outside public/img', () => {
  assert.throws(() => publicPathToFilePath('/img/../site.yaml'), /路径不在允许目录内/);
});

test('filePathToPublicImgPath maps a public image file path into an image URL', () => {
  const filePath = path.join(PUBLIC_IMG_DIR, 'cover/1.webp');
  assert.equal(filePathToPublicImgPath(filePath), '/img/cover/1.webp');
});

test('assertExactPath accepts the expected fixed config file path', () => {
  assert.equal(assertExactPath(CONFIG_FILE, CONFIG_FILE), path.resolve(CONFIG_FILE));
});

test('assertExactPath rejects paths other than the expected fixed file', () => {
  const otherPath = path.join(PROJECT_ROOT, 'package.json');
  assert.throws(() => assertExactPath(otherPath, CONFIG_FILE), /路径不是允许的固定文件/);
});
