/**
 * Tag-related utility functions
 */

import type { BlogPost } from 'types/blog';

/**
 * Normalize a tag to lowercase for case-insensitive comparison
 */
export const normalizeTag = (tag: string) => tag.toLowerCase();

/**
 * Get all tags with their counts (case-insensitive)
 */
export const getAllTags = (posts: BlogPost[]) => {
  return posts.reduce<Record<string, number>>((acc, post) => {
    const postTags = post.data.tags || [];
    postTags.forEach((tag: string) => {
      const normalized = normalizeTag(tag);
      if (!acc[normalized]) {
        acc[normalized] = 0;
      }
      acc[normalized]++;
    });
    return acc;
  }, {});
};
