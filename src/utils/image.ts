/**
 * Image optimization & caching helper with Cloudinary f_auto,q_auto transformation
 */
export function getOptimizedImageUrl(url: string | undefined, width = 600): string {
  if (!url) {
    return `https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=${width}&auto=format&fit=crop&q=75`;
  }

  // Handle data URLs or blob URLs
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  // Cloudinary delivery optimization (f_auto,q_auto,w_${width},c_limit)
  // Transforms /image/upload/ to /image/upload/f_auto,q_auto,w_${width},c_limit/
  if (url.includes('res.cloudinary.com') && url.includes('/image/upload/')) {
    if (!url.includes('/f_auto,') && !url.includes('/q_auto')) {
      return url.replace('/image/upload/', `/image/upload/f_auto,q_auto,w_${width},c_limit/`);
    }
  }

  // Unsplash image optimization
  if (url.includes('images.unsplash.com')) {
    const baseUrl = url.split('?')[0];
    return `${baseUrl}?w=${width}&auto=format&fit=crop&q=75`;
  }

  return url;
}
