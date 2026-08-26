/**
 * Image optimization & caching helper with Cloudinary f_auto,q_auto transformation
 */
export function getOptimizedImageUrl(url: string | undefined, width = 600): string {
  if (!url || typeof url !== 'string') {
    return `https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=${width}&auto=format&fit=crop&q=75`;
  }

  const cleanUrl = url.trim();
  if (!cleanUrl) {
    return `https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=${width}&auto=format&fit=crop&q=75`;
  }

  // Handle data URLs or blob URLs
  if (cleanUrl.startsWith('data:') || cleanUrl.startsWith('blob:')) {
    return cleanUrl;
  }

  // Cloudinary delivery optimization (f_auto,q_auto,w_${width},c_limit)
  // Transforms /image/upload/ to /image/upload/f_auto,q_auto,w_${width},c_limit/
  if (cleanUrl.includes('res.cloudinary.com') && cleanUrl.includes('/image/upload/')) {
    if (!cleanUrl.includes('/f_auto,') && !cleanUrl.includes('/q_auto')) {
      return cleanUrl.replace('/image/upload/', `/image/upload/f_auto,q_auto,w_${width},c_limit/`);
    }
  }

  // Unsplash image optimization
  if (cleanUrl.includes('images.unsplash.com')) {
    const baseUrl = cleanUrl.split('?')[0];
    return `${baseUrl}?w=${width}&auto=format&fit=crop&q=75`;
  }

  return cleanUrl;
}

/**
 * Safely extracts an array of all valid image URLs from any post object,
 * parsing across post.img, post.images (arrays or serialized strings),
 * post.media_url, etc.
 */
export function getPostImagesList(post: any): string[] {
  if (!post) return [];

  const found: string[] = [];

  const addIfValid = (candidate: any) => {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (
        trimmed &&
        trimmed.length > 5 &&
        !trimmed.startsWith('[') &&
        !trimmed.startsWith('{') &&
        (trimmed.startsWith('http://') ||
          trimmed.startsWith('https://') ||
          trimmed.startsWith('data:') ||
          trimmed.startsWith('blob:') ||
          trimmed.startsWith('/'))
      ) {
        if (!found.includes(trimmed)) {
          found.push(trimmed);
        }
      }
    }
  };

  // 1. Check standard img property
  if (post.img) {
    addIfValid(post.img);
  }

  // 2. Check media_url / mediaUrl property
  if (post.media_url || post.mediaUrl) {
    addIfValid(post.media_url || post.mediaUrl);
  }

  // 3. Parse images array or serialized strings
  if (post.images) {
    if (Array.isArray(post.images)) {
      post.images.forEach((item: any) => addIfValid(item));
    } else if (typeof post.images === 'string') {
      const raw = post.images.trim();
      if (raw.startsWith('[') && raw.endsWith(']')) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((item: any) => addIfValid(item));
          }
        } catch {
          raw.replace(/[\[\]"]/g, '').split(',').forEach((s) => addIfValid(s));
        }
      } else if (raw.startsWith('{') && raw.endsWith('}')) {
        raw.slice(1, -1).split(',').forEach((s) => addIfValid(s.replace(/^"|"$/g, '')));
      } else {
        addIfValid(raw);
      }
    }
  }

  return found;
}

/**
 * Safely extracts the single primary image URL from a post object using
 * an exhaustive fallback chain:
 * 1. post.img
 * 2. post.images[0] (or parsed JSON/Postgres array)
 * 3. post.media_url
 * 4. default placeholder
 */
export function getPostImageUrl(post: any, fallbackPlaceholder?: string): string {
  const defaultFallback =
    fallbackPlaceholder ||
    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80';

  if (!post) return defaultFallback;

  const list = getPostImagesList(post);
  if (list.length > 0 && list[0]) {
    return list[0];
  }

  const direct =
    post.img ||
    (Array.isArray(post.images) && post.images.length > 0 ? post.images[0] : undefined) ||
    post.media_url ||
    post.mediaUrl;

  if (typeof direct === 'string' && direct.trim()) {
    return direct.trim();
  }

  return defaultFallback;
}

