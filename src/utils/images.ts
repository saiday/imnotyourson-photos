/**
 * Image transformation utilities for Cloudflare Image Transformations
 *
 * CRITICAL: Uses fixed responsive widths (960, 1440, 1920) to control
 * Cloudflare Transformations quota (5,000 unique transformations/month on Free tier)
 */

// Fixed responsive widths to control transformation quota
export const RESPONSIVE_WIDTHS = [960, 1440, 1920] as const;

// Get R2 public URL from environment
const R2_PUBLIC_URL = import.meta.env.PUBLIC_R2_URL || 'https://photos.imnotyourson.com';

interface TransformOptions {
  width?: number;
  format?: 'auto' | 'webp' | 'avif' | 'jpeg' | 'png';
  quality?: number;
  fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad';
}

/**
 * Generate Cloudflare Image Transformation URL
 * @param filename - Image filename in R2
 * @param options - Transformation options
 * @returns Transformed image URL
 */
export function getImageUrl(filename: string, options: TransformOptions = {}): string {
  const {
    width,
    format = 'auto',
    quality = 85, // Default for thumbnails, grid, carousel
    fit = 'scale-down',
  } = options;

  // Build transformation parameters
  const params = new URLSearchParams();
  if (width) params.set('width', width.toString());
  params.set('format', format);
  params.set('quality', quality.toString());
  params.set('fit', fit);

  const transformParams = params.toString().replace(/&/g, ',');

  return `/cdn-cgi/image/${transformParams}/${R2_PUBLIC_URL}/${filename}`;
}

/**
 * Generate srcset string with fixed responsive widths
 * @param filename - Image filename in R2
 * @param options - Base transformation options
 * @returns srcset string for responsive images
 */
export function getImageSrcset(filename: string, options: Omit<TransformOptions, 'width'> = {}): string {
  return RESPONSIVE_WIDTHS
    .map(width => `${getImageUrl(filename, { ...options, width })} ${width}w`)
    .join(', ');
}

/**
 * Get sizes attribute for responsive images
 * Default responsive breakpoints for photo grid
 */
export function getImageSizes(): string {
  return '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw';
}
