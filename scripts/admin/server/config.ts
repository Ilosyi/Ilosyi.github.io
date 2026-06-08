import fs from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { SiteYamlConfig } from '../../../src/lib/config/types.ts';
import { parseSiteConfig, serializeSiteConfig } from '../shared/config-utils.ts';
import { assertExactPath, CONFIG_FILE } from '../shared/path-utils.ts';
import { HttpError, json, readJson } from './http.ts';

const CONFIG_WARNING = '保存配置可能会规范化 YAML 注释和格式；保存后可能需要重启 Astro dev server。';
const REQUIRED_CONFIG_MESSAGE = '站点配置必须包含 site.title、site.name 和 site.url';
type ConfigPayloadCandidate = Partial<Omit<SiteYamlConfig, 'site'>> & {
  site?: Partial<SiteYamlConfig['site']> & Record<string, unknown>;
};

export async function getConfig(_request: IncomingMessage, response: ServerResponse): Promise<void> {
  const yamlText = await fs.readFile(assertExactPath(CONFIG_FILE, CONFIG_FILE), 'utf8');

  json(response, 200, {
    config: parseSiteConfig(yamlText),
    warning: CONFIG_WARNING,
  });
}

export async function updateConfig(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const config = validateConfigPayload(await readJson<unknown>(request));
  const yamlText = serializeSiteConfig(config);

  parseSiteConfigForWrite(yamlText);

  await fs.writeFile(assertExactPath(CONFIG_FILE, CONFIG_FILE), yamlText, 'utf8');
  json(response, 200, { config });
}

function validateConfigPayload(value: unknown): SiteYamlConfig {
  if (!isRecord(value) || !isRecord(value.config)) {
    throw new HttpError(400, REQUIRED_CONFIG_MESSAGE);
  }

  const config = value.config as ConfigPayloadCandidate;
  if (!isRecord(config.site)) {
    throw new HttpError(400, REQUIRED_CONFIG_MESSAGE);
  }

  const site = config.site;
  if (!isNonEmptyString(site.title) || !isNonEmptyString(site.name) || !isNonEmptyString(site.url)) {
    throw new HttpError(400, REQUIRED_CONFIG_MESSAGE);
  }

  return config as SiteYamlConfig;
}

function parseSiteConfigForWrite(yamlText: string): void {
  try {
    parseSiteConfig(yamlText);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('配置文件缺少 site.')) {
      const fieldName = error.message.replace('配置文件缺少 ', '');
      throw new HttpError(400, `站点配置缺少必填字段 ${fieldName}`);
    }

    throw new HttpError(400, '站点配置格式无效，无法保存');
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}
