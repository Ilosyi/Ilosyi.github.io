import path from 'node:path';

const ALLOWED_IMAGE_EXTENSIONS = new Set(['.webp', '.png', '.jpg', '.jpeg', '.avif', '.gif']);

export function naturalImageSort(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

export function isAllowedImageName(fileName: string): boolean {
  if (fileName !== path.basename(fileName) || fileName.includes('\\')) return false;
  return ALLOWED_IMAGE_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

export function getNextNumericCoverName(fileNames: string[]): string {
  const max = fileNames.reduce((currentMax, fileName) => {
    if (!isAllowedImageName(fileName)) return currentMax;
    const match = /^(\d+)\.[a-z0-9]+$/i.exec(fileName);
    if (!match) return currentMax;
    return Math.max(currentMax, Number(match[1]));
  }, 0);

  return `${max + 1}.webp`;
}
