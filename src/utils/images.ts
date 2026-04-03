/**
 * Image URL utilities for pre-generated WebP variants in R2
 *
 * Images are pre-generated at upload time (via create-post script) and stored as:
 *   {prefix}/w{width}/{basename}.webp
 * Originals remain at their original path: {prefix}/{basename}.jpg
 */

export const RESPONSIVE_WIDTHS = [960, 1440, 1920] as const;

const R2_PUBLIC_URL = import.meta.env.PUBLIC_R2_URL || 'https://images.imnotyourson.com';

/**
 * Generate URL for a pre-generated WebP variant in R2.
 * @param filename - Original image filename in R2 (e.g., "slug/photo.jpg")
 * @param options - { width } defaults to 1920
 */
export function getImageUrl(filename: string, options: { width?: number } = {}): string {
  const { width = 1920 } = options;
  const lastSlash = filename.lastIndexOf('/');
  const dir = filename.substring(0, lastSlash);
  const file = filename.substring(lastSlash + 1);
  const baseName = file.substring(0, file.lastIndexOf('.'));
  return `${R2_PUBLIC_URL}/${dir}/w${width}/${baseName}.webp`;
}

/**
 * Generate URL for the original image in R2.
 */
export function getOriginalUrl(filename: string): string {
  return `${R2_PUBLIC_URL}/${filename}`;
}

/**
 * Generate srcset string with pre-generated responsive widths.
 */
export function getImageSrcset(filename: string): string {
  return RESPONSIVE_WIDTHS
    .map(width => `${getImageUrl(filename, { width })} ${width}w`)
    .join(', ');
}

/**
 * Get sizes attribute for responsive images.
 */
export function getImageSizes(): string {
  return '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw';
}
