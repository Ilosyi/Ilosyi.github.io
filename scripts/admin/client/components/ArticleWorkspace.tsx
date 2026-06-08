import { marked } from 'marked';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BlogCategory, BlogFrontmatter, BlogPostDetail, BlogPostSummary } from '../../shared/types.ts';
import type { CoverImageSummary } from '../api.ts';
import { adminApi } from '../api.ts';

const POST_TIMESTAMP_PATTERN = /^(\d{4})-(\d{1,2})-(\d{1,2}) (\d{1,2}):(\d{1,2}):(\d{1,2})$/;

const emptyFrontmatter: BlogFrontmatter = {
  title: '',
  link: '',
  date: '',
  description: '',
  cover: '',
  tags: [],
  categories: [],
  catalog: true,
  draft: true,
  tocNumbering: true,
};

const ALLOWED_PREVIEW_TAGS = new Set([
  'a',
  'blockquote',
  'br',
  'code',
  'del',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'img',
  'li',
  'ol',
  'p',
  'pre',
  'strong',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'ul',
]);
const BLOCKED_PREVIEW_TAGS = new Set(['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math']);

function formatLocalTimestamp(date: Date): string {
  const parts = [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
  ];
  const [year, month, day, hour, minute, second] = parts.map((part) => String(part).padStart(2, '0'));
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function createDefaultFrontmatter(): BlogFrontmatter {
  return {
    ...emptyFrontmatter,
    date: formatLocalTimestamp(new Date()),
  };
}

export function normalizePostTimestamp(value: string): string | null {
  const match = POST_TIMESTAMP_PATTERN.exec(value.trim());
  if (!match) return null;

  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const isValidDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCHours() === hour &&
    date.getUTCMinutes() === minute &&
    date.getUTCSeconds() === second;

  if (!isValidDate) return null;
  return `${yearText.padStart(4, '0')}-${monthText.padStart(2, '0')}-${dayText.padStart(2, '0')} ${hourText.padStart(
    2,
    '0',
  )}:${minuteText.padStart(2, '0')}:${secondText.padStart(2, '0')}`;
}

export function normalizePostFrontmatter(frontmatter: BlogFrontmatter): BlogFrontmatter {
  return {
    title: frontmatter.title,
    link: frontmatter.link,
    date: normalizePostTimestamp(frontmatter.date) ?? frontmatter.date,
    updated:
      frontmatter.updated === undefined ? undefined : (normalizePostTimestamp(frontmatter.updated) ?? frontmatter.updated),
    description: frontmatter.description,
    cover: frontmatter.cover,
    tags: frontmatter.tags,
    categories: frontmatter.categories,
    subtitle: frontmatter.subtitle,
    catalog: frontmatter.catalog,
    sticky: frontmatter.sticky,
    draft: frontmatter.draft,
    tocNumbering: frontmatter.tocNumbering,
  };
}

function splitCommaList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseCategoriesInput(value: string): BlogCategory[] {
  const parsedCategories = splitCommaList(value).map((item) => {
    return item
      .split('/')
      .map((part) => part.trim())
      .filter(Boolean);
  });
  const hasNestedCategory = parsedCategories.some((category) => category.length > 1);

  if (hasNestedCategory) return parsedCategories;
  return parsedCategories.map(([category]) => category).filter((category): category is string => category !== undefined);
}

export function updateCategoriesDraftInput(value: string): { input: string; categories: BlogCategory[] } {
  return {
    input: value,
    categories: parseCategoriesInput(value),
  };
}

function formatCategory(category: BlogCategory): string {
  return Array.isArray(category) ? category.join(' / ') : category;
}

function categoriesToInput(categories?: BlogCategory[]): string {
  return categories?.map(formatCategory).join(', ') ?? '';
}

function textValue(value?: string): string {
  return value ?? '';
}

function optionalNonEmptyArray<T>(value?: T[]): T[] | undefined {
  return value !== undefined && value.length > 0 ? value : undefined;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '请求失败，请稍后重试';
}

type CoverOption = {
  label: string;
  value: string;
};

export function createCoverOptions(covers: Array<Pick<CoverImageSummary, 'name' | 'url'>>, currentCover = ''): CoverOption[] {
  const options: CoverOption[] = [{ label: '自动随机', value: '' }];
  const normalizedCurrentCover = currentCover.trim();
  const hasCurrentCover = normalizedCurrentCover === '' || covers.some((cover) => cover.url === normalizedCurrentCover);

  if (!hasCurrentCover) {
    options.push({ label: `当前：${normalizedCurrentCover}`, value: normalizedCurrentCover });
  }

  return [
    ...options,
    ...covers.map((cover) => ({
      label: cover.name,
      value: cover.url,
    })),
  ];
}

function validatePost(frontmatter: BlogFrontmatter, body: string): string | null {
  if (frontmatter.title.trim() === '') return '标题不能为空';
  if (normalizePostTimestamp(frontmatter.date) === null) return '日期必须是 YYYY-MM-DD HH:mm:ss 格式';
  if (
    frontmatter.updated !== undefined &&
    frontmatter.updated.trim() !== '' &&
    normalizePostTimestamp(frontmatter.updated) === null
  ) {
    return '更新日期必须是 YYYY-MM-DD HH:mm:ss 格式';
  }
  if (body.trim() === '') return '正文不能为空';
  return null;
}

export function renderPreviewHtml(markdown: string): string {
  const html = marked.parse(markdown, { async: false });
  return sanitizePreviewHtml(html);
}

function sanitizePreviewHtml(html: string): string {
  if (typeof document === 'undefined') return sanitizePreviewHtmlFallback(html);

  const template = document.createElement('template');
  template.innerHTML = html;
  sanitizeNodeChildren(template.content);
  return template.innerHTML;
}

function sanitizeNodeChildren(parent: ParentNode): void {
  for (const child of Array.from(parent.childNodes)) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      sanitizeElement(child as HTMLElement);
    } else if (child.nodeType !== Node.TEXT_NODE) {
      child.remove();
    }
  }
}

function sanitizeElement(element: HTMLElement): void {
  const tagName = element.tagName.toLowerCase();
  if (BLOCKED_PREVIEW_TAGS.has(tagName)) {
    element.remove();
    return;
  }

  if (!ALLOWED_PREVIEW_TAGS.has(tagName)) {
    const parent = element.parentNode;
    element.replaceWith(...Array.from(element.childNodes));
    if (parent) sanitizeNodeChildren(parent);
    return;
  }

  for (const attribute of Array.from(element.attributes)) {
    if (!isAllowedPreviewAttribute(tagName, attribute.name, attribute.value)) {
      element.removeAttribute(attribute.name);
    }
  }

  if (tagName === 'a') {
    element.setAttribute('rel', 'noopener noreferrer');
  }
  sanitizeNodeChildren(element);
}

function isAllowedPreviewAttribute(tagName: string, name: string, value: string): boolean {
  const attributeName = name.toLowerCase();
  if (attributeName.startsWith('on')) return false;

  if (tagName === 'a') {
    if (attributeName === 'href') return isSafePreviewUrl(value);
    return attributeName === 'title' || attributeName === 'target' || attributeName === 'rel';
  }
  if (tagName === 'img') {
    if (attributeName === 'src') return isSafePreviewUrl(value);
    return ['alt', 'height', 'title', 'width'].includes(attributeName);
  }
  if (tagName === 'code') return attributeName === 'class';

  return false;
}

function isSafePreviewUrl(value: string): boolean {
  const normalizedValue = value.trim().toLowerCase();
  return (
    normalizedValue.startsWith('/') ||
    normalizedValue.startsWith('#') ||
    normalizedValue.startsWith('http://') ||
    normalizedValue.startsWith('https://') ||
    normalizedValue.startsWith('mailto:')
  );
}

function sanitizePreviewHtmlFallback(html: string): string {
  return html
    .replace(/<\s*(script|style|iframe|object|embed|svg|math)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+(href|src)\s*=\s*("[^"]*javascript:[^"]*"|'[^']*javascript:[^']*'|[^\s>]*javascript:[^\s>]*)/gi, '');
}

export function isToggleChecked(key: keyof BlogFrontmatter, frontmatter: BlogFrontmatter): boolean {
  if (key === 'catalog' || key === 'tocNumbering') return frontmatter[key] ?? true;
  return Boolean(frontmatter[key]);
}

export function buildPostFrontmatterPayload(frontmatter: BlogFrontmatter): BlogFrontmatter {
  const normalizedFrontmatter = normalizePostFrontmatter(frontmatter);
  return {
    title: normalizedFrontmatter.title.trim(),
    link: textValue(normalizedFrontmatter.link).trim(),
    date: normalizedFrontmatter.date.trim(),
    updated: textValue(normalizedFrontmatter.updated).trim() || undefined,
    description: textValue(normalizedFrontmatter.description).trim() || undefined,
    cover: textValue(normalizedFrontmatter.cover).trim() || undefined,
    tags: optionalNonEmptyArray(normalizedFrontmatter.tags),
    categories: optionalNonEmptyArray(normalizedFrontmatter.categories),
    subtitle: textValue(normalizedFrontmatter.subtitle).trim() || undefined,
    catalog: normalizedFrontmatter.catalog,
    sticky: normalizedFrontmatter.sticky,
    draft: normalizedFrontmatter.draft,
    tocNumbering: normalizedFrontmatter.tocNumbering,
  };
}

export function createEditorSnapshot(frontmatter: BlogFrontmatter, body: string): string {
  return JSON.stringify({ frontmatter: buildPostFrontmatterPayload(frontmatter), body });
}

export function ArticleWorkspace() {
  const [posts, setPosts] = useState<BlogPostSummary[]>([]);
  const [selectedPost, setSelectedPost] = useState<BlogPostDetail | null>(null);
  const [frontmatter, setFrontmatter] = useState<BlogFrontmatter>(emptyFrontmatter);
  const [body, setBody] = useState('');
  const [covers, setCovers] = useState<CoverImageSummary[]>([]);
  const [categoriesInput, setCategoriesInput] = useState(categoriesToInput(emptyFrontmatter.categories));
  const [savedSnapshot, setSavedSnapshot] = useState(createEditorSnapshot(emptyFrontmatter, ''));
  const [query, setQuery] = useState('');
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isLoadingPost, setIsLoadingPost] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery === '') return posts;

    return posts.filter((post) => {
      const searchableText = [post.title, post.link, post.filePath, ...(post.tags ?? [])].join(' ').toLowerCase();
      return searchableText.includes(normalizedQuery);
    });
  }, [posts, query]);

  const previewHtml = useMemo(() => renderPreviewHtml(body), [body]);
  const editorSnapshot = useMemo(() => createEditorSnapshot(frontmatter, body), [frontmatter, body]);
  const coverOptions = useMemo(() => createCoverOptions(covers, textValue(frontmatter.cover)), [covers, frontmatter.cover]);
  const isDraftMode = selectedPost === null && body !== '';
  const hasUnsavedChanges = editorSnapshot !== savedSnapshot;

  const refreshPosts = useCallback(async () => {
    setIsLoadingPosts(true);
    setErrorMessage('');
    try {
      const response = await adminApi.listPosts();
      setPosts(response.posts);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoadingPosts(false);
    }
  }, []);

  useEffect(() => {
    void refreshPosts();
  }, [refreshPosts]);

  useEffect(() => {
    void adminApi
      .listImages()
      .then((data) => setCovers(data.covers))
      .catch((error) => {
        setErrorMessage(`封面列表加载失败：${getErrorMessage(error)}`);
      });
  }, []);

  async function openPost(post: BlogPostSummary) {
    if (selectedPost?.filePath === post.filePath) return;
    if (!confirmDiscardChanges()) return;

    setIsLoadingPost(true);
    setStatusMessage('');
    setErrorMessage('');
    try {
      const response = await adminApi.getPost(post.filePath);
      const normalizedFrontmatter = normalizePostFrontmatter(response.post);
      setSelectedPost(response.post);
      setFrontmatter(normalizedFrontmatter);
      setCategoriesInput(categoriesToInput(normalizedFrontmatter.categories));
      setBody(response.post.body);
      setSavedSnapshot(createEditorSnapshot(normalizedFrontmatter, response.post.body));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoadingPost(false);
    }
  }

  function createDraft() {
    if (!confirmDiscardChanges()) return;

    setSelectedPost(null);
    const draftFrontmatter = createDefaultFrontmatter();
    setFrontmatter(draftFrontmatter);
    setCategoriesInput(categoriesToInput(draftFrontmatter.categories));
    setBody('# 新文章\n');
    setStatusMessage('已创建本地草稿，保存后会写入文章文件');
    setErrorMessage('');
  }

  async function savePost() {
    const validationError = validatePost(frontmatter, body);
    if (validationError !== null) {
      setErrorMessage(validationError);
      setStatusMessage('');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setStatusMessage(selectedPost === null ? '正在创建文章...' : '正在保存文章...');
    try {
      const payload = {
        frontmatter: buildPostFrontmatterPayload(frontmatter),
        body,
      };
      const response =
        selectedPost === null ? await adminApi.createPost(payload) : await adminApi.updatePost(selectedPost.filePath, payload);

      setSelectedPost(response.post);
      const normalizedResponseFrontmatter = normalizePostFrontmatter(response.post);
      setFrontmatter(normalizedResponseFrontmatter);
      setCategoriesInput(categoriesToInput(normalizedResponseFrontmatter.categories));
      setBody(response.post.body);
      setSavedSnapshot(createEditorSnapshot(normalizedResponseFrontmatter, response.post.body));
      await refreshPosts();
      setStatusMessage(selectedPost === null ? '文章已创建' : '文章已保存');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setStatusMessage('');
    } finally {
      setIsSaving(false);
    }
  }

  function updateFrontmatter<K extends keyof BlogFrontmatter>(key: K, value: BlogFrontmatter[K]) {
    setFrontmatter((current) => ({ ...current, [key]: value }));
  }

  function confirmDiscardChanges(): boolean {
    if (!hasUnsavedChanges) return true;
    return window.confirm('当前文章有未保存改动，确定要放弃并切换吗？');
  }

  return (
    <section className="workspace-panel article-workspace" aria-labelledby="article-workspace-title">
      <div className="workspace-panel__header article-workspace__header">
        <div>
          <p className="workspace-panel__eyebrow">文章工作区</p>
          <h1 id="article-workspace-title">文章管理</h1>
        </div>
        <button className="admin-button admin-button--primary" onClick={createDraft} type="button">
          新建草稿
        </button>
      </div>

      <div className="article-workspace__status" aria-live="polite">
        {errorMessage !== '' && <p className="article-workspace__message article-workspace__message--error">{errorMessage}</p>}
        {statusMessage !== '' && errorMessage === '' && (
          <p className="article-workspace__message article-workspace__message--success">{statusMessage}</p>
        )}
        {hasUnsavedChanges && errorMessage === '' && (
          <p className="article-workspace__message article-workspace__message--muted">当前有未保存改动</p>
        )}
      </div>

      <div className="article-workspace__grid">
        <aside className="article-panel article-panel--posts" aria-label="文章列表">
          <div className="article-panel__header">
            <div>
              <h2>文章</h2>
              <p>{isLoadingPosts ? '正在加载...' : `${filteredPosts.length} / ${posts.length} 篇`}</p>
            </div>
            <button className="admin-button admin-button--ghost" disabled={isLoadingPosts} onClick={refreshPosts} type="button">
              刷新
            </button>
          </div>
          <label className="article-field">
            <span>搜索</span>
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="标题、链接、路径或标签"
              type="search"
              value={query}
            />
          </label>
          <div className="article-list">
            {filteredPosts.map((post) => (
              <button
                className="article-list__item"
                data-active={selectedPost?.filePath === post.filePath ? 'true' : undefined}
                disabled={isLoadingPost}
                key={post.filePath}
                onClick={() => void openPost(post)}
                type="button"
              >
                <span className="article-list__title">{post.title || '未命名文章'}</span>
                <span className="article-list__meta">{post.date}</span>
                <span className="article-list__path">{post.filePath}</span>
                {post.tags?.length ? <span className="article-list__tags">{post.tags.join(', ')}</span> : null}
              </button>
            ))}
            {!isLoadingPosts && filteredPosts.length === 0 && <p className="article-list__empty">没有匹配的文章</p>}
          </div>
        </aside>

        <form
          className="article-panel article-panel--editor"
          onSubmit={(event) => {
            event.preventDefault();
            void savePost();
          }}
        >
          <div className="article-panel__header">
            <div>
              <h2>{selectedPost?.title ?? (isDraftMode ? '新草稿' : '编辑器')}</h2>
              <p>{selectedPost?.filePath ?? '选择文章或创建新草稿'}</p>
            </div>
            <button className="admin-button admin-button--primary" disabled={isSaving || isLoadingPost} type="submit">
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>

          <div className="article-form">
            <label className="article-field">
              <span>标题</span>
              <input
                onChange={(event) => updateFrontmatter('title', event.target.value)}
                placeholder="文章标题"
                value={frontmatter.title}
              />
            </label>
            <label className="article-field">
              <span>链接</span>
              <input
                onChange={(event) => updateFrontmatter('link', event.target.value)}
                placeholder="留空则按标题生成"
                value={textValue(frontmatter.link)}
              />
            </label>
            <div className="article-form__split">
              <label className="article-field">
                <span>日期</span>
                <input
                  onChange={(event) => updateFrontmatter('date', event.target.value)}
                  placeholder="YYYY-MM-DD HH:mm:ss"
                  value={frontmatter.date}
                />
              </label>
              <label className="article-field">
                <span>更新日期</span>
                <input
                  onChange={(event) => updateFrontmatter('updated', event.target.value)}
                  placeholder="可选"
                  value={textValue(frontmatter.updated)}
                />
              </label>
            </div>
            <label className="article-field">
              <span>描述</span>
              <textarea
                onChange={(event) => updateFrontmatter('description', event.target.value)}
                placeholder="文章摘要或 SEO 描述"
                rows={3}
                value={textValue(frontmatter.description)}
              />
            </label>
            <label className="article-field">
              <span>封面</span>
              <select
                onChange={(event) => updateFrontmatter('cover', event.target.value || undefined)}
                value={textValue(frontmatter.cover)}
              >
                {coverOptions.map((option) => (
                  <option key={option.value || 'automatic-random-cover'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="article-form__split">
              <label className="article-field">
                <span>标签</span>
                <input
                  onChange={(event) => updateFrontmatter('tags', splitCommaList(event.target.value))}
                  placeholder="Go, 后端, 笔记"
                  value={frontmatter.tags?.join(', ') ?? ''}
                />
              </label>
              <label className="article-field">
                <span>分类</span>
                <input
                  onChange={(event) => {
                    const draft = updateCategoriesDraftInput(event.target.value);
                    setCategoriesInput(draft.input);
                    updateFrontmatter('categories', draft.categories);
                  }}
                  placeholder="后端, Go"
                  value={categoriesInput}
                />
              </label>
            </div>
            <fieldset className="article-toggles">
              <legend>文章开关</legend>
              {[
                ['draft', '草稿'],
                ['sticky', '置顶'],
                ['catalog', '目录'],
                ['tocNumbering', '目录编号'],
              ].map(([key, label]) => (
                <label className="article-toggle" key={key}>
                  <input
                    checked={isToggleChecked(key as keyof BlogFrontmatter, frontmatter)}
                    onChange={(event) => updateFrontmatter(key as keyof BlogFrontmatter, event.target.checked)}
                    type="checkbox"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </fieldset>
            <label className="article-field article-field--body">
              <span>正文 Markdown</span>
              <textarea
                onChange={(event) => setBody(event.target.value)}
                placeholder="选择一篇文章，或点击新建草稿开始写作"
                value={body}
              />
            </label>
          </div>
        </form>

        <section className="article-panel article-panel--preview" aria-label="Markdown 预览">
          <div className="article-panel__header">
            <div>
              <h2>预览</h2>
              <p>{body.trim() === '' ? '暂无正文' : 'Markdown 渲染结果'}</p>
            </div>
          </div>
          <article
            className="article-preview"
            // 预览内容来自本地 Markdown 编辑器，渲染后先经过 DOM sanitizer 清洗。
            // biome-ignore lint/security/noDangerouslySetInnerHtml: Markdown preview uses sanitized HTML.
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </section>
      </div>
    </section>
  );
}
