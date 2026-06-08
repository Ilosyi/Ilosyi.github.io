import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import test from 'node:test';
import { parseSiteConfig, serializeSiteConfig } from '../shared/config-utils.ts';
import { CONFIG_FILE } from '../shared/path-utils.ts';
import { getConfig, updateConfig } from './config.ts';
import { HttpError } from './http.ts';

type CapturedResponse = {
  statusCode?: number;
  headers?: Record<string, string>;
  body?: string;
  writeHead: (statusCode: number, headers: Record<string, string>) => CapturedResponse;
  end: (body?: string) => void;
};

function createRequest(body = ''): IncomingMessage {
  const chunks = body ? [body] : [];
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
      response.body = body;
    },
  };

  return response;
}

test('getConfig returns parsed site config with YAML normalization warning', async () => {
  const expectedConfig = parseSiteConfig(await fs.readFile(CONFIG_FILE, 'utf8'));
  const response = createResponse();

  await getConfig(createRequest(), response as unknown as ServerResponse);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.headers, { 'content-type': 'application/json; charset=utf-8' });

  const body = JSON.parse(response.body ?? '{}') as {
    config?: { site?: { title?: string; name?: string; url?: string } };
    warning?: string;
  };
  assert.equal(body.config?.site?.title, expectedConfig.site.title);
  assert.equal(body.config?.site?.name, expectedConfig.site.name);
  assert.equal(body.config?.site?.url, expectedConfig.site.url);
  assert.equal(body.warning, '保存配置可能会规范化 YAML 注释和格式；保存后可能需要重启 Astro dev server。');
});

test('updateConfig rejects missing required site fields without mutating config file', async () => {
  const original = await fs.readFile(CONFIG_FILE, 'utf8');

  await assert.rejects(
    () =>
      updateConfig(
        createRequest(
          JSON.stringify({
            config: {
              site: {
                title: 'Missing URL',
              },
            },
          }),
        ),
        createResponse() as unknown as ServerResponse,
      ),
    (error: unknown) =>
      error instanceof HttpError &&
      error.statusCode === 400 &&
      error.message === '站点配置必须包含 site.title、site.name 和 site.url',
  );

  assert.equal(await fs.readFile(CONFIG_FILE, 'utf8'), original);
});

test('updateConfig rejects missing site.name without mutating config file', async () => {
  const original = await fs.readFile(CONFIG_FILE, 'utf8');

  try {
    await assert.rejects(
      () =>
        updateConfig(
          createRequest(
            JSON.stringify({
              config: {
                site: {
                  title: 'Missing Name',
                  url: 'https://missing-name.test',
                },
              },
            }),
          ),
          createResponse() as unknown as ServerResponse,
        ),
      (error: unknown) =>
        error instanceof HttpError &&
        error.statusCode === 400 &&
        error.message === '站点配置必须包含 site.title、site.name 和 site.url',
    );

    assert.equal(await fs.readFile(CONFIG_FILE, 'utf8'), original);
  } finally {
    await fs.writeFile(CONFIG_FILE, original, 'utf8');
  }

  assert.equal(await fs.readFile(CONFIG_FILE, 'utf8'), original);
});

test('updateConfig rejects blank required site strings without mutating config file', async () => {
  const original = await fs.readFile(CONFIG_FILE, 'utf8');

  await assert.rejects(
    () =>
      updateConfig(
        createRequest(
          JSON.stringify({
            config: {
              site: {
                title: 'Valid title',
                name: '   ',
                url: 'https://example.com',
              },
            },
          }),
        ),
        createResponse() as unknown as ServerResponse,
      ),
    (error: unknown) =>
      error instanceof HttpError &&
      error.statusCode === 400 &&
      error.message === '站点配置必须包含 site.title、site.name 和 site.url',
  );

  assert.equal(await fs.readFile(CONFIG_FILE, 'utf8'), original);
});

test('updateConfig writes a valid serialized config and restores original file bytes', async () => {
  const original = await fs.readFile(CONFIG_FILE, 'utf8');
  const originalConfig = parseSiteConfig(original);
  const changedConfig = {
    ...originalConfig,
    site: {
      ...originalConfig.site,
      subtitle: 'Admin config write test',
    },
  };

  try {
    const response = createResponse();

    await updateConfig(createRequest(JSON.stringify({ config: changedConfig })), response as unknown as ServerResponse);

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body ?? '{}'), { config: changedConfig });
    assert.equal(await fs.readFile(CONFIG_FILE, 'utf8'), serializeSiteConfig(changedConfig));
  } finally {
    await fs.writeFile(CONFIG_FILE, original, 'utf8');
  }

  assert.equal(await fs.readFile(CONFIG_FILE, 'utf8'), original);
});
