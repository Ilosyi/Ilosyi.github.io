import assert from 'node:assert/strict';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import test from 'node:test';
import { HttpError, handleError, json, matchRoute, type Route, readBody, readJson, servePublicImage, text } from './http.ts';

type CapturedResponse = {
  statusCode?: number;
  headers?: Record<string, string>;
  body?: string;
  writeHead: (statusCode: number, headers: Record<string, string>) => CapturedResponse;
  end: (body?: string | Buffer) => void;
};

function createRequest(body: string | Buffer | Array<string | Buffer> = ''): IncomingMessage {
  const chunks = Array.isArray(body) ? body : body ? [body] : [];
  return Readable.from(chunks) as IncomingMessage;
}

function createResponse(): CapturedResponse {
  const response: CapturedResponse = {
    writeHead(statusCode, headers) {
      response.statusCode = statusCode;
      response.headers = headers;
      return response;
    },
    end(body = '') {
      response.body = Buffer.isBuffer(body) ? body.toString('binary') : body;
    },
  };

  return response;
}

test('readJson returns an empty object for an empty body', async () => {
  const parsed = await readJson<Record<string, never>>(createRequest());

  assert.deepEqual(parsed, {});
});

test('readJson parses a non-empty JSON body', async () => {
  const parsed = await readJson<{ title: string; draft: boolean }>(createRequest('{"title":"Go 后端","draft":true}'));

  assert.deepEqual(parsed, { title: 'Go 后端', draft: true });
});

test('readJson rejects malformed JSON with HttpError 400', async () => {
  await assert.rejects(
    () => readJson(createRequest('{"title":')),
    (error: unknown) => error instanceof HttpError && error.statusCode === 400 && error.message === 'JSON 格式无效',
  );
});

test('readBody assembles string and buffer chunks as UTF-8 text', async () => {
  const body = await readBody(createRequest(['第一段', Buffer.from('第二段')]));

  assert.equal(body, '第一段第二段');
});

test('matchRoute matches the exact method and named params', () => {
  const route: Route = {
    method: 'GET',
    pattern: /^\/api\/posts\/(?<slug>[^/]+)$/,
    handler: () => {},
  };

  const matched = matchRoute([route], 'GET', '/api/posts/go-backend');

  assert.equal(matched?.route, route);
  assert.equal(matched?.params.slug, 'go-backend');
});

test('matchRoute rejects wrong methods and non-matching paths', () => {
  const route: Route = {
    method: 'GET',
    pattern: /^\/api\/posts\/(?<slug>[^/]+)$/,
    handler: () => {},
  };

  assert.equal(matchRoute([route], 'POST', '/api/posts/go-backend'), null);
  assert.equal(matchRoute([route], 'GET', '/api/config'), null);
});

test('handleError writes status 500 JSON with an Error message', () => {
  const response = createResponse();

  handleError(response as unknown as ServerResponse, new Error('保存失败'));

  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.headers, { 'content-type': 'application/json; charset=utf-8' });
  assert.equal(response.body, '{"error":"保存失败"}');
});

test('handleError writes HttpError status and JSON message', () => {
  const response = createResponse();

  handleError(response as unknown as ServerResponse, new HttpError(409, '文章已存在'));

  assert.equal(response.statusCode, 409);
  assert.deepEqual(response.headers, { 'content-type': 'application/json; charset=utf-8' });
  assert.equal(response.body, '{"error":"文章已存在"}');
});

test('handleError writes unknown error text for non-Error values', () => {
  const response = createResponse();

  handleError(response as unknown as ServerResponse, 'broken');

  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.headers, { 'content-type': 'application/json; charset=utf-8' });
  assert.equal(response.body, '{"error":"未知错误"}');
});

test('json writes JSON response content type', () => {
  const response = createResponse();

  json(response as unknown as ServerResponse, 201, { ok: true });

  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.headers, { 'content-type': 'application/json; charset=utf-8' });
  assert.equal(response.body, '{"ok":true}');
});

test('text writes plain text response content type', () => {
  const response = createResponse();

  text(response as unknown as ServerResponse, 404, '未找到');

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.headers, { 'content-type': 'text/plain; charset=utf-8' });
  assert.equal(response.body, '未找到');
});

test('servePublicImage serves project public image files with an image content type', async () => {
  const response = createResponse();

  const handled = await servePublicImage('/img/cover/1.webp', 'GET', response as unknown as ServerResponse);

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers?.['content-type'], 'image/webp');
  assert.ok((response.body?.length ?? 0) > 0);
});

test('servePublicImage supports HEAD requests without returning an image body', async () => {
  const response = createResponse();

  const handled = await servePublicImage('/img/cover/1.webp', 'HEAD', response as unknown as ServerResponse);

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers?.['content-type'], 'image/webp');
  assert.equal(response.body, '');
});

test('servePublicImage rejects unsupported image methods with Allow header', async () => {
  const response = createResponse();

  const handled = await servePublicImage('/img/cover/1.webp', 'POST', response as unknown as ServerResponse);

  assert.equal(handled, true);
  assert.equal(response.statusCode, 405);
  assert.equal(response.headers?.allow, 'GET, HEAD');
  assert.equal(response.body, '方法不允许');
});

test('servePublicImage ignores non-image paths and rejects traversal safely', async () => {
  const ignoredResponse = createResponse();
  const rejectedResponse = createResponse();
  const unsupportedResponse = createResponse();

  assert.equal(await servePublicImage('/assets/app.js', 'GET', ignoredResponse as unknown as ServerResponse), false);
  await servePublicImage('/img/%2e%2e/site.yaml', 'GET', rejectedResponse as unknown as ServerResponse);
  await servePublicImage('/img/readme.txt', 'GET', unsupportedResponse as unknown as ServerResponse);

  assert.equal(rejectedResponse.statusCode, 404);
  assert.equal(rejectedResponse.body, '图片不存在');
  assert.equal(unsupportedResponse.statusCode, 404);
  assert.equal(unsupportedResponse.body, '图片不存在');
});
