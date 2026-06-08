import path from 'node:path';

export const PROJECT_ROOT = path.resolve(import.meta.dirname, '../../..');
export const CONTENT_DIR = path.join(PROJECT_ROOT, 'src/content/blog');
export const CONFIG_FILE = path.join(PROJECT_ROOT, 'config/site.yaml');
export const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
export const PUBLIC_IMG_DIR = path.join(PUBLIC_DIR, 'img');
export const COVER_DIR = path.join(PUBLIC_IMG_DIR, 'cover');

export function assertInsideDir(targetPath: string, allowedDir: string): string {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedDir = path.resolve(allowedDir);
  const isInside = resolvedTarget === resolvedDir || resolvedTarget.startsWith(`${resolvedDir}${path.sep}`);

  if (!isInside) {
    throw new Error(`路径不在允许目录内: ${targetPath}`);
  }

  return resolvedTarget;
}

export function assertExactPath(targetPath: string, expectedPath: string): string {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedExpected = path.resolve(expectedPath);

  if (resolvedTarget !== resolvedExpected) {
    throw new Error(`路径不是允许的固定文件: ${targetPath}`);
  }

  return resolvedTarget;
}

export function toProjectRelativePath(filePath: string): string {
  return path.relative(PROJECT_ROOT, path.resolve(filePath)).split(path.sep).join('/');
}

export function publicPathToFilePath(publicPath: string): string {
  if (!publicPath.startsWith('/img/')) {
    throw new Error(`只允许 /img 下的公开图片路径: ${publicPath}`);
  }

  const relative = publicPath.replace(/^\/img\//, '');
  return assertInsideDir(path.join(PUBLIC_IMG_DIR, relative), PUBLIC_IMG_DIR);
}

export function filePathToPublicImgPath(filePath: string): string {
  const resolved = assertInsideDir(filePath, PUBLIC_IMG_DIR);
  const relative = path.relative(PUBLIC_IMG_DIR, resolved).split(path.sep).join('/');
  return `/img/${relative}`;
}
