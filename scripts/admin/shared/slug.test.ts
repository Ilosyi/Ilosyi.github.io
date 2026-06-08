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
