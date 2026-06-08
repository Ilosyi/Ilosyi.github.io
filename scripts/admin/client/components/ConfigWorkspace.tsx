import { useCallback, useEffect, useState } from 'react';
import type { SiteYamlConfig } from '../../../../src/lib/config/types.ts';
import { adminApi } from '../api.ts';

type RawConfigParseResult = {
  config: SiteYamlConfig | null;
  error: string | null;
};

type CategoryMapParseResult = {
  categoryMap?: Record<string, string>;
  error: string | null;
};

const REQUIRED_SITE_FIELDS_MESSAGE = '站点配置必须填写标题、站点名称和站点 URL';

export function parseCategoryMapInput(value: string): CategoryMapParseResult {
  const categoryMap: Record<string, string> = {};

  for (const [index, rawLine] of value.split('\n').entries()) {
    const line = rawLine.trim();
    if (line === '') continue;

    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) {
      return { categoryMap: undefined, error: `分类映射第 ${index + 1} 行缺少冒号` };
    }

    const categoryName = line.slice(0, separatorIndex).trim();
    const slug = line.slice(separatorIndex + 1).trim();
    if (categoryName === '' || slug === '') {
      return { categoryMap: undefined, error: `分类映射第 ${index + 1} 行必须包含分类名和 slug` };
    }

    categoryMap[categoryName] = slug;
  }

  return { categoryMap: Object.keys(categoryMap).length > 0 ? categoryMap : undefined, error: null };
}

export function formatCategoryMapInput(categoryMap?: Record<string, string>): string {
  return Object.entries(categoryMap ?? {})
    .map(([categoryName, slug]) => `${categoryName}: ${slug}`)
    .join('\n');
}

export function parseKeywordsInput(value: string): string[] | undefined {
  const keywords = value
    .split('\n')
    .map((keyword) => keyword.trim())
    .filter(Boolean);

  return keywords.length > 0 ? keywords : undefined;
}

export function formatKeywordsInput(keywords?: string[]): string {
  return keywords?.join('\n') ?? '';
}

export function parseRawConfigJson(value: string): RawConfigParseResult {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!isRecord(parsed)) {
      return { config: null, error: '原始配置必须是 JSON 对象' };
    }
    if (!isRecord(parsed.site)) {
      return { config: null, error: '原始配置必须包含 site 对象' };
    }

    return { config: parsed as unknown as SiteYamlConfig, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知解析错误';
    return { config: null, error: `JSON 格式无效：${message}` };
  }
}

function stringifyConfig(config: SiteYamlConfig): string {
  return JSON.stringify(config, null, 2);
}

function textValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function numberInputValue(value?: number): string {
  return value === undefined ? '' : String(value);
}

function parseOptionalYear(value: string): number | undefined {
  if (value.trim() === '') return undefined;

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : undefined;
}

export function validateSiteConfig(config: SiteYamlConfig): string | null {
  if (
    textValue(config.site.title).trim() === '' ||
    textValue(config.site.name).trim() === '' ||
    textValue(config.site.url).trim() === ''
  ) {
    return REQUIRED_SITE_FIELDS_MESSAGE;
  }
  return null;
}

export function normalizeConfigForSave(config: SiteYamlConfig): SiteYamlConfig {
  const normalizedConfig: SiteYamlConfig = {
    ...config,
    site: {
      ...config.site,
      title: textValue(config.site.title).trim(),
      alternate: textValue(config.site.alternate).trim() || undefined,
      subtitle: textValue(config.site.subtitle).trim() || undefined,
      name: textValue(config.site.name).trim(),
      description: textValue(config.site.description).trim() || undefined,
      avatar: textValue(config.site.avatar).trim() || undefined,
      author: textValue(config.site.author).trim() || undefined,
      url: textValue(config.site.url).trim(),
      keywords: config.site.keywords && config.site.keywords.length > 0 ? config.site.keywords : undefined,
    },
  };

  if (normalizedConfig.categoryMap && Object.keys(normalizedConfig.categoryMap).length === 0) {
    normalizedConfig.categoryMap = undefined;
  }

  return normalizedConfig;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '请求失败，请稍后重试';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function ConfigWorkspace() {
  const [config, setConfig] = useState<SiteYamlConfig | null>(null);
  const [warningMessage, setWarningMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('正在加载配置...');
  const [errorMessage, setErrorMessage] = useState('');
  const [rawConfigText, setRawConfigText] = useState('');
  const [rawJsonError, setRawJsonError] = useState('');
  const [categoryMapText, setCategoryMapText] = useState('');
  const [categoryMapError, setCategoryMapError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const replaceConfig = useCallback((nextConfig: SiteYamlConfig) => {
    setConfig(nextConfig);
    setRawConfigText(stringifyConfig(nextConfig));
    setRawJsonError('');
    setCategoryMapText(formatCategoryMapInput(nextConfig.categoryMap));
    setCategoryMapError('');
  }, []);

  const syncStructuredConfig = useCallback(
    (nextConfig: SiteYamlConfig) => {
      setConfig(nextConfig);
      if (categoryMapError === '') {
        setCategoryMapText(formatCategoryMapInput(nextConfig.categoryMap));
      }
      if (rawJsonError === '') {
        setRawConfigText(stringifyConfig(nextConfig));
      }
    },
    [categoryMapError, rawJsonError],
  );

  useEffect(() => {
    let isActive = true;

    async function loadConfig() {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const response = await adminApi.getConfig();
        if (!isActive) return;

        replaceConfig(response.config);
        setWarningMessage(response.warning);
        setStatusMessage('配置已加载');
      } catch (error) {
        if (!isActive) return;

        setErrorMessage(getErrorMessage(error));
        setStatusMessage('');
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void loadConfig();

    return () => {
      isActive = false;
    };
  }, [replaceConfig]);

  function updateSiteField<K extends keyof SiteYamlConfig['site']>(key: K, value: SiteYamlConfig['site'][K]) {
    if (config === null) return;

    syncStructuredConfig({
      ...config,
      site: {
        ...config.site,
        [key]: value,
      },
    });
    setErrorMessage(rawJsonError !== '' ? '原始 JSON 有错误，结构化编辑不会覆盖该草稿；保存前请修复 JSON。' : '');
    setStatusMessage('');
  }

  function updateCategoryMap(value: string) {
    if (config === null) return;

    setCategoryMapText(value);
    setStatusMessage('');
    const result = parseCategoryMapInput(value);
    if (result.error !== null) {
      setCategoryMapError(result.error);
      return;
    }

    syncStructuredConfig({
      ...config,
      categoryMap: result.categoryMap,
    });
    setCategoryMapError('');
    setErrorMessage(rawJsonError !== '' ? '原始 JSON 有错误，结构化编辑不会覆盖该草稿；保存前请修复 JSON。' : '');
  }

  function updateRawConfig(value: string) {
    setRawConfigText(value);
    setStatusMessage('');

    const result = parseRawConfigJson(value);
    if (result.error !== null) {
      setRawJsonError(result.error);
      return;
    }

    if (result.config !== null) {
      setConfig(result.config);
      setCategoryMapText(formatCategoryMapInput(result.config.categoryMap));
      setCategoryMapError('');
      setRawJsonError('');
      setErrorMessage('');
    }
  }

  async function saveConfig() {
    if (config === null || rawJsonError !== '' || categoryMapError !== '') return;

    const normalizedConfig = normalizeConfigForSave(config);
    const validationError = validateSiteConfig(normalizedConfig);
    if (validationError !== null) {
      setErrorMessage(validationError);
      setStatusMessage('');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setStatusMessage('正在保存配置...');
    try {
      const response = await adminApi.updateConfig(normalizedConfig);
      replaceConfig(response.config);
      setStatusMessage('配置已保存，重启 Astro dev server 或重新 build 后生效');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setStatusMessage('');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading && config === null) {
    return (
      <section className="workspace-panel config-workspace" aria-labelledby="config-workspace-title">
        <div className="workspace-panel__header">
          <div>
            <p className="workspace-panel__eyebrow">配置工作区</p>
            <h1 id="config-workspace-title">站点配置</h1>
          </div>
        </div>
        <div className="workspace-panel__body">
          <p>{statusMessage}</p>
        </div>
      </section>
    );
  }

  if (config === null) {
    return (
      <section className="workspace-panel config-workspace" aria-labelledby="config-workspace-title">
        <div className="workspace-panel__header">
          <div>
            <p className="workspace-panel__eyebrow">配置工作区</p>
            <h1 id="config-workspace-title">站点配置</h1>
          </div>
          <button className="admin-button admin-button--ghost" onClick={() => window.location.reload()} type="button">
            重新加载
          </button>
        </div>
        <div className="workspace-panel__body">
          <p>{errorMessage || '配置加载失败'}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="workspace-panel config-workspace" aria-labelledby="config-workspace-title">
      <div className="workspace-panel__header config-workspace__header">
        <div>
          <p className="workspace-panel__eyebrow">配置工作区</p>
          <h1 id="config-workspace-title">站点配置</h1>
        </div>
        <button
          className="admin-button admin-button--primary"
          disabled={isSaving || rawJsonError !== '' || categoryMapError !== ''}
          onClick={() => void saveConfig()}
          type="button"
        >
          {isSaving ? '保存中...' : '保存配置'}
        </button>
      </div>

      <div className="config-workspace__status" aria-live="polite">
        {warningMessage !== '' && (
          <p className="config-workspace__message config-workspace__message--warning">{warningMessage}</p>
        )}
        {errorMessage !== '' && <p className="config-workspace__message config-workspace__message--error">{errorMessage}</p>}
        {rawJsonError !== '' && <p className="config-workspace__message config-workspace__message--error">{rawJsonError}</p>}
        {categoryMapError !== '' && (
          <p className="config-workspace__message config-workspace__message--error">{categoryMapError}</p>
        )}
        {statusMessage !== '' && errorMessage === '' && rawJsonError === '' && categoryMapError === '' && (
          <p className="config-workspace__message config-workspace__message--success">{statusMessage}</p>
        )}
      </div>

      <div className="config-workspace__body">
        <div className="config-workspace__grid">
          <section className="config-panel" aria-labelledby="config-site-title">
            <div className="config-panel__header">
              <h2 id="config-site-title">站点信息</h2>
              <p>编辑 config/site.yaml 的 site 节点。</p>
            </div>
            <div className="config-form">
              <label className="article-field">
                <span>标题</span>
                <input
                  onChange={(event) => updateSiteField('title', event.target.value)}
                  value={textValue(config.site.title)}
                />
              </label>
              <label className="article-field">
                <span>英文名</span>
                <input
                  onChange={(event) => updateSiteField('alternate', event.target.value || undefined)}
                  value={textValue(config.site.alternate)}
                />
              </label>
              <label className="article-field">
                <span>副标题</span>
                <input
                  onChange={(event) => updateSiteField('subtitle', event.target.value || undefined)}
                  value={textValue(config.site.subtitle)}
                />
              </label>
              <label className="article-field">
                <span>站点名称</span>
                <input onChange={(event) => updateSiteField('name', event.target.value)} value={textValue(config.site.name)} />
              </label>
              <label className="article-field">
                <span>作者</span>
                <input
                  onChange={(event) => updateSiteField('author', event.target.value || undefined)}
                  value={textValue(config.site.author)}
                />
              </label>
              <label className="article-field">
                <span>站点 URL</span>
                <input
                  onChange={(event) => updateSiteField('url', event.target.value)}
                  type="url"
                  value={textValue(config.site.url)}
                />
              </label>
              <label className="article-field">
                <span>描述</span>
                <textarea
                  onChange={(event) => updateSiteField('description', event.target.value || undefined)}
                  rows={4}
                  value={textValue(config.site.description)}
                />
              </label>
            </div>
          </section>

          <section className="config-panel" aria-labelledby="config-brand-title">
            <div className="config-panel__header">
              <h2 id="config-brand-title">标识与分类</h2>
              <p>维护头像、SEO 关键词和分类 slug 映射。</p>
            </div>
            <div className="config-form">
              <label className="article-field">
                <span>头像路径</span>
                <input
                  onChange={(event) => updateSiteField('avatar', event.target.value || undefined)}
                  value={textValue(config.site.avatar)}
                />
              </label>
              <label className="article-field">
                <span>建站年份</span>
                <input
                  inputMode="numeric"
                  onChange={(event) => updateSiteField('startYear', parseOptionalYear(event.target.value))}
                  type="number"
                  value={numberInputValue(config.site.startYear)}
                />
              </label>
              <label className="config-toggle">
                <input
                  checked={config.site.showLogo ?? false}
                  onChange={(event) => updateSiteField('showLogo', event.target.checked)}
                  type="checkbox"
                />
                <span>显示 Logo</span>
              </label>
              <label className="article-field">
                <span>关键词</span>
                <textarea
                  onChange={(event) => updateSiteField('keywords', parseKeywordsInput(event.target.value))}
                  rows={5}
                  value={formatKeywordsInput(config.site.keywords)}
                />
              </label>
              <label className="article-field article-field--code">
                <span>分类映射</span>
                <textarea onChange={(event) => updateCategoryMap(event.target.value)} rows={8} value={categoryMapText} />
              </label>
            </div>
          </section>

          <section className="config-panel config-panel--raw" aria-labelledby="config-raw-title">
            <div className="config-panel__header">
              <h2 id="config-raw-title">原始配置 JSON</h2>
              <p>用于编辑结构化表单暂未覆盖的配置项；JSON 无效时不会保存。</p>
            </div>
            <label className="article-field article-field--code">
              <span>JSON</span>
              <textarea
                aria-invalid={rawJsonError !== '' ? 'true' : undefined}
                onChange={(event) => updateRawConfig(event.target.value)}
                value={rawConfigText}
              />
            </label>
          </section>
        </div>
      </div>
    </section>
  );
}
