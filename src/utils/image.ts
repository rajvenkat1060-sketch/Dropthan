/**
 * Image optimization & caching helper
 */
export function getOptimizedImageUrl(url: string | undefined, width = 600): string {
  if (!url) {
    return `https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=${width}&auto=format&fit=crop&q=75`;
  }

  // Handle data URLs or blob URLs
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  // Unsplash image optimization
  if (url.includes('images.unsplash.com')) {
    const baseUrl = url.split('?')[0];
    return `${baseUrl}?w=${width}&auto=format&fit=crop&q=75`;
  }

  return url;
}
