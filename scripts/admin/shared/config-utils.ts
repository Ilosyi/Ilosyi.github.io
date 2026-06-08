import yaml from 'js-yaml';
import type { SiteYamlConfig } from '../../../src/lib/config/types.ts';

export function parseSiteConfig(yamlText: string): SiteYamlConfig {
  const parsed = yaml.load(yamlText) as Partial<SiteYamlConfig> | null;

  if (!parsed || typeof parsed !== 'object' || !parsed.site) {
    throw new Error('配置文件缺少 site 节点');
  }

  if (!isRecord(parsed.site) || Array.isArray(parsed.site)) {
    throw new Error('配置文件缺少有效的 site 节点');
  }

  for (const field of ['title', 'name', 'url'] as const) {
    if (typeof parsed.site[field] !== 'string') {
      throw new Error(`配置文件缺少 site.${field}`);
    }
  }

  return parsed as SiteYamlConfig;
}

export function serializeSiteConfig(config: SiteYamlConfig): string {
  return `${yaml.dump(config, {
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
    quotingType: "'",
  })}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
