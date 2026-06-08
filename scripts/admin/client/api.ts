import type { SiteYamlConfig } from '../../../src/lib/config/types.ts';
import type { BlogPostDetail, BlogPostSummary, PostSavePayload } from '../shared/types.ts';

type ImageAssetSummary = {
  name: string;
  url: string;
};

export type CoverImageSummary = ImageAssetSummary & {
  filePath: string;
  kind: 'cover';
};

export type HeaderImageSummary = ImageAssetSummary & {
  kind: 'site-header' | 'weekly-header';
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.body instanceof FormData ? undefined : { 'content-type': 'application/json' });
  new Headers(init?.headers).forEach((value, key) => {
    headers.set(key, value);
  });

  const response = await fetch(path, {
    ...init,
    headers,
  });
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  const isJson = contentType.includes('application/json') || contentType.includes('+json');
  const data = isJson ? ((await response.json()) as T & { error?: string }) : await response.text();

  if (!response.ok) {
    const message =
      typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string'
        ? data.error
        : typeof data === 'string' && data.length > 0
          ? data
          : `请求失败: ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

export const adminApi = {
  listPosts: () => request<{ posts: BlogPostSummary[] }>('/api/posts'),
  getPost: (id: string) => request<{ post: BlogPostDetail }>(`/api/posts/${encodeURIComponent(id)}`),
  createPost: (payload: PostSavePayload) =>
    request<{ post: BlogPostDetail }>('/api/posts', { method: 'POST', body: JSON.stringify(payload) }),
  updatePost: (id: string, payload: PostSavePayload) =>
    request<{ post: BlogPostDetail }>(`/api/posts/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  setPostDraft: (id: string, draft: boolean) =>
    request<{ ok: true }>(`/api/posts/${encodeURIComponent(id)}/draft`, {
      method: 'PATCH',
      body: JSON.stringify({ draft }),
    }),
  getConfig: () => request<{ config: SiteYamlConfig; warning: string }>('/api/config'),
  updateConfig: (config: SiteYamlConfig) =>
    request<{ config: SiteYamlConfig }>('/api/config', { method: 'PUT', body: JSON.stringify({ config }) }),
  listImages: () => request<{ covers: CoverImageSummary[]; headers: HeaderImageSummary[] }>('/api/images'),
  uploadCover: async (file: File) =>
    request<{ image: ImageAssetSummary & { filePath: string } }>('/api/images/covers', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: await fileToBase64(file),
    }),
  uploadSiteHeader: async (file: File) =>
    request<{ images: string[] }>('/api/images/site-header', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: await fileToBase64(file),
    }),
  uploadWeeklyHeader: async (file: File) =>
    request<{ image: string }>('/api/images/weekly-header', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: await fileToBase64(file),
    }),
};

export async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}
