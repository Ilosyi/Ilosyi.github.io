export type BlogCategory = string[] | string;

export type BlogFrontmatter = {
  title: string;
  link?: string;
  description?: string;
  date: string;
  updated?: string;
  cover?: string;
  tags?: string[];
  categories?: BlogCategory[];
  subtitle?: string;
  catalog?: boolean;
  sticky?: boolean;
  draft?: boolean;
  tocNumbering?: boolean;
};

export type BlogPostSummary = BlogFrontmatter & {
  id: string;
  filePath: string;
  slug: string;
};

export type BlogPostDetail = BlogPostSummary & {
  body: string;
};

export type PostSavePayload = {
  frontmatter: BlogFrontmatter;
  body: string;
};

export type ApiError = {
  error: string;
  details?: Record<string, string>;
};

export type ApiResult<T> = T | ApiError;

export type ImageAsset = {
  name: string;
  url: string;
  filePath: string;
  kind: 'cover' | 'site-header' | 'weekly-header' | 'post-image';
};
