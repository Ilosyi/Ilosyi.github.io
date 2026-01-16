import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Fisher-Yates shuffle algorithm
 * @param array - Array to shuffle
 * @returns New shuffled array (does not mutate original)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Normalize URL by removing trailing slashes from origin
 * Uses URL API for robust parsing
 * @example normalizeUrl('https://example.com/') => 'https://example.com'
 * @example normalizeUrl('https://example.com:8080/') => 'https://example.com:8080'
 */
export function normalizeUrl(url: string | undefined): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    // Return origin (protocol + host + port) without trailing slash
    return parsed.origin;
  } catch {
    // Fallback for invalid URLs
    return url.replace(/\/+$/, '');
  }
}
