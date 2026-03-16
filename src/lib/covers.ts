import { readdirSync } from 'node:fs';
import { extname } from 'node:path';

const COVER_DIR = new URL('../../public/img/cover/', import.meta.url);
const ALLOWED_IMAGE_EXTENSIONS = new Set(['.webp', '.png', '.jpg', '.jpeg', '.avif', '.gif']);

let cachedCoverList: string[] | null = null;

function sortByNaturalOrder(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * 从 public/img/cover 目录动态读取封面列表。
 * 返回值为可直接在页面中使用的 URL（例如 /img/cover/1.webp）。
 */
export function getDefaultCoverList(): string[] {
  if (cachedCoverList) {
    return cachedCoverList;
  }

  try {
    const files = readdirSync(COVER_DIR, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => ALLOWED_IMAGE_EXTENSIONS.has(extname(name).toLowerCase()))
      .sort(sortByNaturalOrder)
      .map((name) => `/img/cover/${name}`);

    cachedCoverList = files;
    return files;
  } catch {
    cachedCoverList = [];
    return [];
  }
}

/**
 * 获取兜底封面。
 */
export function getFallbackCover(): string {
  return getDefaultCoverList()[0] ?? '/img/cover/1.webp';
}
