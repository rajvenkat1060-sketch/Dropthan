/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';
import { PostItem, RatingSummary, ReviewItem, UserProfile, UserStatus } from '../types';
import { uploadToCloudinary } from './cloudinary';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://zxbifidxkpbsissjwgnm.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_s8wtq-Mx3OMobIMCSZ69cA_gzo9VbvJ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('posts').select('id').limit(1);
    return !error;
  } catch (err) {
    console.warn('Supabase connection check notice:', err);
    return false;
  }
};

export const subscribeToSupabasePosts = (onPostsChange: () => void) => {
  const channel = supabase
    .channel('public:posts')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'posts' },
      (payload) => {
        console.log('⚡ [Realtime Supabase] Post table update detected:', payload.eventType);
        onPostsChange();
      }
    )
    .subscribe((status) => {
      console.log('📡 [Supabase Realtime Channel Status]:', status);
    });

  return () => {
    supabase.removeChannel(channel);
  };
};

export const fetchSupabasePosts = async (): Promise<PostItem[]> => {
  const cacheKey = 'dropthan_cached_supabase_posts';
  const customPostsKey = 'dropthan_custom_posts';

  let localCache: PostItem[] = [];
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) localCache = JSON.parse(cached);
    const custom = localStorage.getItem(customPostsKey);
    if (custom) {
      const parsedCustom = JSON.parse(custom);
      if (Array.isArray(parsedCustom)) {
        const idSet = new Set(localCache.map((p) => String(p.id)));
        parsedCustom.forEach((p) => {
          if (!idSet.has(String(p.id))) localCache.push(p);
        });
      }
    }
  } catch (e) {}

  try {
    // Query all records from Supabase posts table without restrictive filters
    let { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    // Fallback if created_at column is missing on older table instances
    if (error && error.message?.includes('created_at')) {
      const fallbackQuery = await supabase.from('posts').select('*');
      data = fallbackQuery.data;
      error = fallbackQuery.error;
    }

    if (error) {
      console.warn('Notice querying Supabase posts (using offline cache):', error.message);
      return localCache;
    }

    if (!data || data.length === 0) {
      return localCache;
    }

    const mapped: PostItem[] = data.map((item: any) => {
      let imageList: string[] = [];
      if (Array.isArray(item.images) && item.images.length > 0) {
        imageList = item.images.filter(Boolean);
      } else if (typeof item.images === 'string' && item.images.startsWith('[')) {
        try {
          imageList = JSON.parse(item.images).filter(Boolean);
        } catch (e) {
          imageList = [item.img || item.image || item.photo || ''];
        }
      } else if (item.img || item.image || item.photo || item.image_url) {
        imageList = [item.img || item.image || item.photo || item.image_url];
      }

      const primaryImg =
        item.img ||
        item.image ||
        item.photo ||
        item.image_url ||
        (imageList.length > 0 ? imageList[0] : '') ||
        'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80';

      return {
        id: String(item.id || `post_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`),
        author:
          item.author ||
          item.company_name ||
          item.companyName ||
          item.display_name ||
          item.displayName ||
          item.full_name ||
          item.fullName ||
          item.name ||
          item.user_name ||
          'Dropthan Member',
        role: item.role || item.user_role || item.category_role || 'wholesaler',
        price: item.price || item.rate || item.unit_price || 'Rate on Request',
        moq: item.moq || item.minimum_order_quantity || item.min_order || 'Custom MOQ',
        caption: item.caption || item.description || item.content || item.details || item.text || '',
        img: primaryImg,
        images: imageList.length > 0 ? imageList : [primaryImg],
        phone: item.phone || item.mobile || item.contact_number || item.contact || '',
        gstin: item.gstin || item.gst || item.gst_number || '',
        location: item.location || item.city || item.state || item.address || '',
        storeAddress: item.store_address || item.storeAddress || item.location || item.city || '',
        lat: item.lat ? Number(item.lat) : undefined,
        lng: item.lng ? Number(item.lng) : undefined,
        country: item.country || 'India',
        category: item.category || item.product_category || 'Textiles & Apparel',
        likesCount: item.likes_count ?? item.likesCount ?? item.likes ?? 15,
        authorAvatar: item.author_avatar || item.authorAvatar || item.avatar_url || item.avatarUrl || item.avatar || '',
        productName: item.product_name || item.productName || item.item_name || item.material_name || undefined,
        materialDetails: item.material_details || item.materialDetails || item.materials || undefined,
        promotionDetails: item.promotion_details || item.promotionDetails || item.niche || undefined,
        exportProducts: item.export_products || item.exportProducts || item.commodities || undefined,
        packagingMaterials: item.packaging_materials || item.packagingMaterials || item.packaging_types || undefined,
        serviceDetails: item.service_details || item.serviceDetails || item.services || undefined,
        website: item.website || item.website_url || item.websiteUrl || undefined,
        instagram: item.instagram || item.instagram_handle || item.instagramHandle || undefined,
        createdAt: item.created_at || item.createdAt || item.timestamp || new Date().toISOString(),
        created_at: item.created_at || item.createdAt || item.timestamp || new Date().toISOString(),
      };
    });

    // Merge remote and cached posts deduplicating by ID
    const mergedMap = new Map<string, PostItem>();
    localCache.forEach((p) => mergedMap.set(String(p.id), p));
    mapped.forEach((p) => mergedMap.set(String(p.id), p));
    const allCombined = Array.from(mergedMap.values()).sort((a, b) => {
      const timeA = new Date(a.createdAt || a.created_at || 0).getTime();
      const timeB = new Date(b.createdAt || b.created_at || 0).getTime();
      return timeB - timeA;
    });

    if (allCombined.length > 0) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(allCombined));
      } catch (e) {}
    }
    return allCombined;
  } catch (e: any) {
    console.warn('Supabase fetch posts network notice:', e?.message || e);
    return localCache;
  }
};

export const saveSupabasePost = async (post: PostItem) => {
  try {
    const imagesList = post.images && post.images.length > 0 ? post.images : (post.img ? [post.img] : []);
    const primaryImg = post.img || (imagesList.length > 0 ? imagesList[0] : '');

    const basePayload: any = {
      author: post.author,
      role: post.role,
      price: post.price,
      moq: post.moq,
      caption: post.caption,
      product_name: post.productName || null,
      material_details: post.materialDetails || null,
      promotion_details: post.promotionDetails || null,
      export_products: post.exportProducts || null,
      packaging_materials: post.packagingMaterials || null,
      service_details: post.serviceDetails || null,
      img: primaryImg,
      images: imagesList,
      phone: post.phone,
      gstin: post.gstin || null,
      location: post.location || null,
      store_address: post.storeAddress || post.location || null,
      lat: post.lat || null,
      lng: post.lng || null,
      category: post.category,
      likes_count: post.likesCount || 15,
      author_avatar: post.authorAvatar || null,
      website: post.website || null,
      instagram: post.instagram || null,
      created_at: new Date().toISOString(),
    };

    // Try primary upsert with provided ID
    const payloadWithId = { ...basePayload, id: post.id };
    const { error } = await supabase.from('posts').upsert(payloadWithId);

    if (error) {
      console.warn('Primary upsert notice:', error.message);
      // Fallback 1: If ID is non-numeric or incompatible, try insert without explicit ID column
      const { error: insertErr } = await supabase.from('posts').insert([basePayload]);
      if (insertErr) {
        console.warn('Fallback insert notice:', insertErr.message);
      } else {
        console.log('✅ Fallback insert succeeded!');
      }
    } else {
      console.log('Successfully saved post to Supabase posts table:', post.id);
    }
  } catch (e) {
    console.warn('Exception saving post to Supabase (locally preserved):', e);
  }
};

export const clearAllSupabaseData = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('🧹 [Database Reset] Executing full wipe of Supabase database tables...');
    await supabase.from('likes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('chats').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('posts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('gst_verifications').delete().neq('phone', '0000000000');

    localStorage.removeItem('dropthan_custom_posts');
    localStorage.removeItem('dropthan_saved_ids');
    localStorage.removeItem('dropthan_liked_ids');
    localStorage.removeItem('dropthan_user');

    console.log('✅ [Database Reset] Database tables wiped clean successfully.');
    return { success: true };
  } catch (err: any) {
    console.error('❌ [Database Reset Error]:', err);
    return { success: false, error: err?.message || 'Database reset failed' };
  }
};

export const compressImage = async (
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.78
): Promise<File> => {
  if (!file || !file.type || !file.type.startsWith('image/')) return file;
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
        }

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const compressedName = (file.name || 'image').replace(/\.[^/.]+$/, '') + '.jpg';
            const compressedFile = new File([blob], compressedName, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            console.log(
              `⚡ [Image Compressed] Original: ${(file.size / 1024).toFixed(1)} KB -> Compressed: ${(compressedFile.size / 1024).toFixed(1)} KB (${width}x${height}px)`
            );
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};

export const getSmartStorageBucket = (file: File, hintCategory = ''): string => {
  if (!file) return 'offers';
  const type = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  const hint = (hintCategory || '').toLowerCase();

  if (type.startsWith('video/') || /\.(mp4|mov|avi|webm|mkv|3gp)$/i.test(name)) {
    return 'user_videos';
  }
  if (hint === 'avatar' || hint === 'profile' || name.includes('avatar') || name.includes('profile')) {
    return 'avatars';
  }
  if (hint === 'offer' || hint === 'offers' || hint === 'product' || hint === 'catalog') {
    return 'offers';
  }
  if (type.startsWith('image/')) {
    if (hint === 'user_photos' || hint === 'gallery') return 'user_photos';
    return hint ? hint.replace(/[^a-z0-9_]/g, '') : 'offers';
  }
  return 'documents';
};

export const uploadMediaToSmartBucket = async (
  file: File,
  userIdentifier: string,
  sectionOrRoleOrCategory = 'wholesaler'
): Promise<string> => {
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit
  if (file.size > MAX_FILE_SIZE) {
    console.error(`❌ File "${file.name}" exceeds 50MB size limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
    throw new Error(`File size exceeds maximum allowed 50MB limit.`);
  }

  const isImage = file.type?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp|heic|svg)$/i.test(file.name || '');
  const fileToUpload = isImage ? await compressImage(file, 1200, 1200, 0.78) : file;

  // 1. PRIMARY & EXCLUSIVE ROUTE FOR PHOTOS: Direct to Cloudinary (Cloud: jc7xqqko, Preset: dropthan)
  if (isImage) {
    try {
      console.log(`☁️ [Cloudinary Upload] Sending photo "${file.name}" to Cloudinary (Cloud: jc7xqqko, Preset: dropthan, Context: "${sectionOrRoleOrCategory}")...`);
      const cloudinaryUrl = await uploadToCloudinary(fileToUpload, sectionOrRoleOrCategory);
      if (cloudinaryUrl) {
        console.log(`✅ [Cloudinary] Photo uploaded successfully! Secure URL returned for Supabase storage: ${cloudinaryUrl}`);
        return cloudinaryUrl;
      }
    } catch (cloudinaryErr) {
      console.error('❌ [Cloudinary Upload Error]:', cloudinaryErr);
      // Fall back to data URL for offline preview, skipping Supabase storage buckets
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(fileToUpload);
      });
    }
  }

  // Non-image files (documents/videos) fallback path
  const primaryBucket = getSmartStorageBucket(fileToUpload, sectionOrRoleOrCategory);
  const ext = fileToUpload.name ? fileToUpload.name.split('.').pop() || 'dat' : 'dat';
  const filePath = `${primaryBucket.replace(/s$/, '')}-${userIdentifier.replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now()}-${Math.floor(Math.random() * 1000)}.${ext}`;

  const candidateBuckets = Array.from(
    new Set([primaryBucket, 'offers', 'user_photos', 'avatars', 'user_videos', 'products', 'documents'])
  );

  // 2. Secondary Fallback: Supabase Storage bucket candidates
  for (const bucket of candidateBuckets) {
    try {
      const { data, error } = await supabase.storage.from(bucket).upload(filePath, fileToUpload, {
        upsert: true,
        contentType: fileToUpload.type || 'image/jpeg',
      });
      if (!error && data) {
        const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
        if (publicUrlData?.publicUrl) {
          return publicUrlData.publicUrl;
        }
      }
    } catch (e) {
      console.warn(`Notice for bucket "${bucket}":`, e);
    }
  }

  // 3. Server proxy upload fallback (/api/upload)
  try {
    const base64Data = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(fileToUpload);
    });

    const resp = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileData: base64Data,
        fileName: filePath,
        bucket: primaryBucket,
        hintCategory: sectionOrRoleOrCategory,
      }),
    });

    if (resp.ok) {
      const resData = await resp.json();
      if (resData.url) return resData.url;
    }
  } catch (err) {
    console.warn('Server proxy upload notice:', err);
  }

  // 4. Fallback Data URL
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(fileToUpload);
  });
};

export const uploadOfferPhotoToSupabase = async (
  file: File,
  authorIdentifier: string,
  sectionOrRole = 'wholesaler'
): Promise<string> => {
  return uploadMediaToSmartBucket(file, authorIdentifier, sectionOrRole);
};

export const uploadOfferPhotosToSupabase = async (
  files: File[],
  authorIdentifier: string,
  sectionOrRole = 'wholesaler'
): Promise<string[]> => {
  const uploadPromises = files.map((file) => uploadOfferPhotoToSupabase(file, authorIdentifier, sectionOrRole));
  return Promise.all(uploadPromises);
};

export const uploadAvatarToSupabase = async (
  file: File,
  userIdentifier: string,
  sectionOrRole = 'wholesaler'
): Promise<string> => {
  return uploadMediaToSmartBucket(file, userIdentifier, sectionOrRole);
};

export const fetchUserLikesFromSupabase = async (userId: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', userId);
    if (!error && data) {
      return data.map((item: any) => String(item.post_id));
    }
  } catch (err) {
    console.warn('Error fetching user likes from Supabase:', err);
  }
  return [];
};

export const fetchAllLikesCountsFromSupabase = async (): Promise<Record<string, number>> => {
  try {
    const { data, error } = await supabase
      .from('likes')
      .select('post_id');
    if (!error && data) {
      const counts: Record<string, number> = {};
      data.forEach((item: any) => {
        const pid = String(item.post_id);
        counts[pid] = (counts[pid] || 0) + 1;
      });
      return counts;
    }
  } catch (err) {
    console.warn('Error fetching likes count map from Supabase:', err);
  }
  return {};
};

export interface SupabaseLikeItem {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export const fetchAllLikesFromSupabase = async (): Promise<SupabaseLikeItem[]> => {
  try {
    const { data, error } = await supabase
      .from('likes')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      return data.map((item: any) => ({
        id: String(item.id || `like-${item.post_id}-${item.user_id}-${Date.now()}`),
        post_id: String(item.post_id),
        user_id: String(item.user_id),
        created_at: item.created_at || new Date().toISOString(),
      }));
    }
  } catch (err) {
    console.warn('Error fetching all likes from Supabase:', err);
  }
  return [];
};

export const subscribeToSupabaseLikes = (onLikesChange: () => void) => {
  const channel = supabase
    .channel('public:likes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, () => {
      console.log('⚡ [Realtime Supabase] Likes table update detected');
      onLikesChange();
    })
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
};

export const subscribeToSupabaseMessages = (onMessagesChange: () => void) => {
  const channel = supabase
    .channel('public:messages')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
      console.log('⚡ [Realtime Supabase] Messages table update detected');
      onMessagesChange();
    })
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
};

export const subscribeToSupabaseProfiles = (onProfilesChange: () => void) => {
  const channel = supabase
    .channel('public:profiles')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
      console.log('⚡ [Realtime Supabase] Profiles table update detected');
      onProfilesChange();
    })
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
};

export const subscribeToAdminRealtime = (callbacks: {
  onProfilesChange?: () => void;
  onPostsChange?: () => void;
  onLikesChange?: () => void;
  onMessagesChange?: () => void;
}) => {
  const channel = supabase
    .channel('admin:realtime_stream')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
      console.log('⚡ [Admin Realtime] Profiles table update');
      callbacks.onProfilesChange?.();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
      console.log('⚡ [Admin Realtime] Posts table update');
      callbacks.onPostsChange?.();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, () => {
      console.log('⚡ [Admin Realtime] Likes table update');
      callbacks.onLikesChange?.();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
      console.log('⚡ [Admin Realtime] Messages table update');
      callbacks.onMessagesChange?.();
    })
    .subscribe((status) => {
      console.log('📡 [Admin Realtime Channel Status]:', status);
    });

  return () => {
    supabase.removeChannel(channel);
  };
};

export const toggleSupabaseLike = async (postId: string, userId: string, isLiking: boolean) => {
  try {
    if (isLiking) {
      await supabase.from('likes').upsert(
        { post_id: postId, user_id: userId, created_at: new Date().toISOString() },
        { onConflict: 'post_id,user_id' }
      );
    } else {
      await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);
    }

    const { count, error } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (!error && count !== null) {
      await supabase.from('posts').update({ likes_count: count }).eq('id', postId);
    }
  } catch (err) {
    console.warn('Error toggling like in Supabase:', err);
  }
};

export const fetchUserRatingsFromSupabase = async (
  targetUserId: string,
  reviewerId?: string
): Promise<RatingSummary> => {
  let defaultSummary: RatingSummary = { average: 0, count: 0, reviews: [] };

  const sanitizeKey = targetUserId.replace(/[^a-zA-Z0-9]/g, '_');
  const localKey = `dropthan_ratings_${sanitizeKey}`;
  const localData = localStorage.getItem(localKey);
  if (localData) {
    try {
      const parsed = JSON.parse(localData);
      if (parsed && typeof parsed.average === 'number') {
        defaultSummary = {
          average: parsed.average || 0,
          count: parsed.count || 0,
          userRating: parsed.userRating,
          userReview: parsed.userReview,
          reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
        };
      }
    } catch (e) {
      /* ignore */
    }
  }

  try {
    const { data, error } = await supabase
      .from('ratings')
      .select('*')
      .eq('target_user_id', targetUserId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      if (data.length === 0) {
        const summary: RatingSummary = { average: 0, count: 0, userRating: undefined, userReview: undefined, reviews: [] };
        localStorage.setItem(localKey, JSON.stringify(summary));
        return summary;
      }

      const count = data.length;
      const totalScore = data.reduce((acc: number, curr: any) => acc + (Number(curr.rating_score) || 0), 0);
      const average = count > 0 ? Math.round((totalScore / count) * 10) / 10 : 0;

      let userRating: number | undefined = undefined;
      let userReview: string | undefined = undefined;

      const reviews: ReviewItem[] = data.map((item: any) => {
        const score = Number(item.rating_score) || 5;
        const revId = item.reviewer_id || 'anonymous';
        const revName = item.reviewer_name || (revId.length > 8 ? `${revId.substring(0, 6)}...` : revId);
        const text = item.review_text || '';

        if (reviewerId && (revId === reviewerId || revId === reviewerId.replace(/\D/g, ''))) {
          userRating = score;
          userReview = text;
        }

        return {
          id: String(item.id || `${revId}-${Date.now()}`),
          reviewerId: revId,
          reviewerName: revName,
          ratingScore: score,
          reviewText: text,
          createdAt: item.created_at || new Date().toISOString(),
        };
      });

      const summary: RatingSummary = { average, count, userRating, userReview, reviews };
      localStorage.setItem(localKey, JSON.stringify(summary));
      return summary;
    }
  } catch (err) {
    console.warn('Supabase fetch ratings notice:', err);
  }

  return defaultSummary;
};

export const saveUserRatingToSupabase = async (
  targetUserId: string,
  reviewerId: string,
  ratingScore: number,
  reviewerName?: string,
  reviewText?: string
): Promise<RatingSummary> => {
  const sanitizeKey = targetUserId.replace(/[^a-zA-Z0-9]/g, '_');
  const localKey = `dropthan_ratings_${sanitizeKey}`;

  // 1. Persist to Supabase
  try {
    const payload: any = {
      target_user_id: targetUserId,
      reviewer_id: reviewerId,
      rating_score: ratingScore,
      created_at: new Date().toISOString(),
    };
    if (reviewerName) payload.reviewer_name = reviewerName;
    if (reviewText) payload.review_text = reviewText;

    const { error } = await supabase.from('ratings').upsert(payload, { onConflict: 'target_user_id,reviewer_id' });
    if (error) {
      console.warn('Supabase extended rating upsert notice, retrying core fields:', error.message);
      // Fallback if custom columns review_text/reviewer_name are missing in table schema
      await supabase.from('ratings').upsert(
        {
          target_user_id: targetUserId,
          reviewer_id: reviewerId,
          rating_score: ratingScore,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'target_user_id,reviewer_id' }
      );
    }
  } catch (err) {
    console.warn('Supabase save rating notice:', err);
  }

  // 2. Refresh live summary from Supabase or update local state
  const updatedSummary = await fetchUserRatingsFromSupabase(targetUserId, reviewerId);

  // If local array doesn't have the new review text yet (e.g., offline or schema fallback), update local cache directly
  let localReviews = updatedSummary.reviews || [];
  const existingIdx = localReviews.findIndex((r) => r.reviewerId === reviewerId);
  const newReviewObj: ReviewItem = {
    id: `rev-${reviewerId}-${Date.now()}`,
    reviewerId,
    reviewerName: reviewerName || reviewerId,
    ratingScore,
    reviewText: reviewText || '',
    createdAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    localReviews[existingIdx] = newReviewObj;
  } else {
    localReviews = [newReviewObj, ...localReviews];
  }

  const finalCount = localReviews.length;
  const totalScore = localReviews.reduce((acc, r) => acc + r.ratingScore, 0);
  const finalAvg = finalCount > 0 ? Math.round((totalScore / finalCount) * 10) / 10 : ratingScore;

  const finalSummary: RatingSummary = {
    average: finalAvg,
    count: finalCount,
    userRating: ratingScore,
    userReview: reviewText,
    reviews: localReviews,
  };

  localStorage.setItem(localKey, JSON.stringify(finalSummary));
  return finalSummary;
};


export interface ChatConversation {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerAvatar?: string;
  partnerPhone?: string;
  partnerGstin?: string;
  lastMessage: string;
  lastTimestamp: string;
  unreadCount?: number;
  isFavourite?: boolean;
  isArchived?: boolean;
  isBlocked?: boolean;
  category?: string;
}

export interface PersistentMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  receiver_id?: string;
  sender_name?: string;
  text: string;
  is_me: boolean;
  timestamp: string;
  created_at: string;
}

export const fetchSupabaseMessages = async (
  chatId: string,
  currentUserId?: string,
  currentUserPhone?: string
): Promise<PersistentMessage[]> => {
  const localKey = `dropthan_msg_${chatId}`;
  let fallback: PersistentMessage[] = [];
  const stored = localStorage.getItem(localKey);
  if (stored) {
    try {
      fallback = JSON.parse(stored);
    } catch (e) {
      /* ignore */
    }
  }

  // Check admin authorization
  const cleanPhone = (currentUserPhone || '').replace(/\D/g, '');
  const isAdmin = cleanPhone.endsWith('8838533014') || cleanPhone === '8838533014';

  try {
    // Attempt 1: Query by chat_id
    let res = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    // Attempt 2: If chat_id column not found, fallback query
    if (res.error && (res.error.code === '42703' || res.error.message.includes('chat_id'))) {
      res = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);
    }

    if (!res.error && res.data && res.data.length > 0) {
      const filtered = res.data.filter((item: any) => {
        // Strict chat_id check
        if (item.chat_id && item.chat_id !== chatId) return false;

        // If admin, allow all messages for safety & support
        if (isAdmin) return true;

        // Privacy filter: Ensure message belongs to this thread / participants
        if (currentUserId) {
          const senderMatch = item.sender_id === currentUserId || item.sender_id === cleanPhone;
          const receiverMatch = item.receiver_id === currentUserId || item.receiver_id === cleanPhone;
          // In peer-to-peer or vendor chat, if sender/receiver defined, ensure user is a participant
          if (item.sender_id && item.receiver_id) {
            return senderMatch || receiverMatch || item.chat_id === chatId;
          }
        }
        return true;
      });

      if (filtered.length > 0) {
        const msgs: PersistentMessage[] = filtered.map((item: any) => ({
          id: String(item.id || `msg-${Date.now()}`),
          chat_id: String(item.chat_id || chatId),
          sender_id: item.sender_id || '',
          receiver_id: item.receiver_id || '',
          sender_name: item.sender_name || '',
          text: item.text || item.content || '',
          is_me: item.is_me !== undefined ? Boolean(item.is_me) : item.sender_id === (currentUserId || cleanPhone),
          timestamp: item.timestamp || new Date(item.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          created_at: item.created_at || new Date().toISOString(),
        }));
        localStorage.setItem(localKey, JSON.stringify(msgs));
        return msgs;
      }
    }
  } catch (err) {
    // Non-blocking fallback
  }

  return fallback;
};

export const saveSupabaseMessage = async (msg: PersistentMessage): Promise<void> => {
  const localKey = `dropthan_msg_${msg.chat_id}`;
  let existing: PersistentMessage[] = [];
  const stored = localStorage.getItem(localKey);
  if (stored) {
    try {
      existing = JSON.parse(stored);
    } catch (e) {
      /* ignore */
    }
  }
  existing.push(msg);
  localStorage.setItem(localKey, JSON.stringify(existing));

  try {
    let payload: any = {
      id: msg.id,
      chat_id: msg.chat_id,
      sender_id: msg.sender_id,
      receiver_id: msg.receiver_id || null,
      sender_name: msg.sender_name || null,
      text: msg.text,
      content: msg.text,
      is_me: msg.is_me,
      timestamp: msg.timestamp,
      created_at: msg.created_at,
    };

    let attempts = 0;
    while (attempts < 6) {
      attempts++;
      const { error } = await supabase.from('messages').upsert(payload);
      if (!error) break;

      // Extract unknown column from error message and remove from payload
      const colMatch = error.message.match(/Could not find the '(\w+)' column/) ||
                       error.message.match(/column "?(\w+)"? of relation "messages" does not exist/);
      if (colMatch && colMatch[1] && payload[colMatch[1]] !== undefined) {
        delete payload[colMatch[1]];
        continue;
      }

      // Fallback try simple insert
      if (payload.chat_id) {
        delete payload.chat_id;
        continue;
      }
      break;
    }
  } catch (err) {
    // Persisted in localStorage
  }
};

// ==========================================
// USER PROFILES & GST VERIFICATION MANAGEMENT
// ==========================================

export const saveUserProfileToSupabase = async (profile: UserProfile): Promise<UserProfile> => {
  const websiteVal = profile.website || profile.websiteUrl || null;
  const bioVal = profile.bio || profile.description || null;
  const cleanPhone = (profile.phone || '').trim();
  const userId = profile.id || (cleanPhone ? `usr_${cleanPhone.replace(/\D/g, '')}` : `usr_${Date.now()}`);

  const currentPayload: Record<string, any> = {
    id: userId,
    phone: cleanPhone,
    role: profile.role || 'wholesaler',
    display_name: profile.displayName || profile.companyName || profile.fullName || 'Member',
    full_name: profile.fullName || profile.displayName || null,
    name: profile.fullName || profile.displayName || profile.companyName || 'Member',
    company_name: profile.companyName || profile.displayName || null,
    location: profile.location || '',
    store_address: profile.storeAddress || profile.location || '',
    country: profile.country || 'India',
    gstin: profile.gstin || null,
    iec_code: profile.iecCode || null,
    product_name: profile.productName || profile.materialDetails || null,
    material_details: profile.materialDetails || profile.productName || null,
    promotion_details: profile.promotionDetails || null,
    export_products: profile.exportProducts || null,
    packaging_materials: profile.packagingMaterials || null,
    service_details: profile.serviceDetails || null,
    website: websiteVal,
    website_url: websiteVal,
    instagram: profile.instagram || profile.instagramHandle || null,
    instagram_handle: profile.instagram || profile.instagramHandle || null,
    avatar_url: profile.avatarUrl || null,
    status: profile.status || 'Active',
    created_at: profile.createdAt || new Date().toISOString(),
  };

  if (bioVal) {
    currentPayload.bio = bioVal;
    currentPayload.description = bioVal;
  }
  if (profile.lat) currentPayload.lat = profile.lat;
  if (profile.lng) currentPayload.lng = profile.lng;
  if (profile.rejectionReason) currentPayload.rejection_reason = profile.rejectionReason;

  // Immediately update local all-profiles cache so instant UI lookups find this profile
  try {
    const localKey = 'dropthan_all_profiles';
    const stored = localStorage.getItem(localKey);
    let profilesList: UserProfile[] = stored ? JSON.parse(stored) : [];
    const existingIndex = profilesList.findIndex(
      (p) => (p.phone && p.phone === cleanPhone) || (p.id && p.id === userId)
    );
    if (existingIndex >= 0) {
      profilesList[existingIndex] = { ...profilesList[existingIndex], ...profile, id: userId };
    } else {
      profilesList.unshift({ ...profile, id: userId });
    }
    localStorage.setItem(localKey, JSON.stringify(profilesList));
  } catch (e) {}

  try {
    let success = false;
    let attempts = 0;
    const payloadCopy = { ...currentPayload };

    while (!success && attempts < 8) {
      attempts++;
      
      // Strategy A: Upsert with phone conflict resolution
      const { error } = await supabase
        .from('profiles')
        .upsert(payloadCopy, { onConflict: cleanPhone ? 'phone' : 'id' });

      if (!error) {
        success = true;
        console.log('✅ Successfully persisted user profile to Supabase profiles table:', cleanPhone || userId);
        break;
      }

      // Check if error is due to an unknown column in user's schema
      const missingColMatch =
        error.message.match(/Could not find the '(\w+)' column/) ||
        error.message.match(/column "?(\w+)"? of relation "profiles" does not exist/);

      if (missingColMatch && missingColMatch[1] && payloadCopy[missingColMatch[1]] !== undefined) {
        const colToRemove = missingColMatch[1];
        console.log(`ℹ️ [Supabase Schema Adapt] Removing optional column '${colToRemove}' and retrying profile save...`);
        delete payloadCopy[colToRemove];
        continue;
      }

      // Strategy B: If onConflict failed, try update by phone
      if (cleanPhone) {
        const { error: updateErr } = await supabase
          .from('profiles')
          .update(payloadCopy)
          .eq('phone', cleanPhone);
        if (!updateErr) {
          success = true;
          console.log('✅ Successfully updated user profile in Supabase by phone:', cleanPhone);
          break;
        }
      }

      // Strip non-core optional columns step-by-step
      if (payloadCopy.service_details || payloadCopy.packaging_materials || payloadCopy.export_products) {
        delete payloadCopy.service_details;
        delete payloadCopy.packaging_materials;
        delete payloadCopy.export_products;
        delete payloadCopy.promotion_details;
        delete payloadCopy.product_name;
        delete payloadCopy.material_details;
        continue;
      }

      if (payloadCopy.bio || payloadCopy.description) {
        delete payloadCopy.bio;
        delete payloadCopy.description;
        continue;
      }
      if (payloadCopy.company_name) {
        delete payloadCopy.company_name;
        continue;
      }
      if (payloadCopy.iec_code) {
        delete payloadCopy.iec_code;
        continue;
      }
      if (payloadCopy.store_address) {
        delete payloadCopy.store_address;
        continue;
      }
      if (payloadCopy.lat || payloadCopy.lng) {
        delete payloadCopy.lat;
        delete payloadCopy.lng;
        continue;
      }

      console.warn('Supabase profile save notice:', error.message);
      break;
    }
  } catch (err) {
    console.warn('Unexpected exception during Supabase profile save:', err);
  }

  return { ...profile, id: userId };
};

export const updateUserWebsiteInSupabase = async (
  phone: string,
  websiteUrl: string
): Promise<{ success: boolean; error?: string }> => {
  if (!phone) return { success: false, error: 'Phone number is required to update website link.' };
  const cleanUrl = websiteUrl.trim();

  try {
    console.log(`🌐 [Supabase Realtime Update] Updating website for user phone ${phone} -> "${cleanUrl}"...`);
    // Attempt real-time update on Supabase 'profiles' table
    let { error } = await supabase
      .from('profiles')
      .update({ website: cleanUrl, website_url: cleanUrl })
      .eq('phone', phone);

    if (error) {
      console.warn('Realtime website update dual-key warning, trying single website column:', error.message);
      const { error: err1 } = await supabase.from('profiles').update({ website: cleanUrl }).eq('phone', phone);
      if (err1) {
        const { error: err2 } = await supabase.from('profiles').update({ website_url: cleanUrl }).eq('phone', phone);
        if (err2) {
          console.warn('Supabase website column update fallback notice:', err2.message);
        }
      }
    }

    return { success: true };
  } catch (err: any) {
    console.warn('Notice updating website in Supabase profiles table:', err?.message || err);
    return { success: false, error: err?.message };
  }
};

export const fetchAllUserProfilesFromSupabase = async (): Promise<UserProfile[]> => {
  const localKey = 'dropthan_all_profiles';
  let localProfiles: UserProfile[] = [];
  try {
    const stored = localStorage.getItem(localKey);
    if (stored) {
      localProfiles = JSON.parse(stored);
    }
    // Also include logged in user if available
    const cur = localStorage.getItem('dropthan_user');
    if (cur) {
      const u = JSON.parse(cur);
      if (u && u.phone && !localProfiles.some((p) => p.phone === u.phone)) {
        localProfiles.unshift(u);
      }
    }
  } catch (e) {}

  try {
    let { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error && error.message?.includes('created_at')) {
      const fallbackQuery = await supabase.from('profiles').select('*');
      data = fallbackQuery.data;
      error = fallbackQuery.error;
    }

    if (!error && data && data.length > 0) {
      const remoteProfiles: UserProfile[] = data.map((item: any) => {
        const cleanPhone = (item.phone || item.mobile || item.contact_number || item.contact || '').trim();
        const compName = item.company_name || item.companyName || item.business_name || undefined;
        const flName = item.full_name || item.fullName || item.name || undefined;
        const dispName =
          item.display_name ||
          item.displayName ||
          compName ||
          flName ||
          item.user_name ||
          (cleanPhone ? `Member ${cleanPhone.slice(-4)}` : 'Member');

        return {
          id: item.id || (cleanPhone ? `usr_${cleanPhone.replace(/\D/g, '')}` : `usr_${Date.now()}`),
          role: item.role || item.user_role || item.category_role || 'wholesaler',
          phone: cleanPhone,
          country: item.country || 'India',
          location: item.location || item.city || item.state || '',
          storeAddress: item.store_address || item.storeAddress || item.location || item.city || undefined,
          lat: item.lat ? Number(item.lat) : undefined,
          lng: item.lng ? Number(item.lng) : undefined,
          companyName: compName,
          fullName: flName,
          displayName: dispName,
          bio: item.bio || item.description || item.about || undefined,
          description: item.description || item.bio || item.about || undefined,
          gstin: item.gstin || item.gst || item.gst_number || undefined,
          iecCode: item.iec_code || item.iecCode || item.iec || undefined,
          productName: item.product_name || item.productName || item.item_name || item.material_name || undefined,
          materialDetails: item.material_details || item.materialDetails || item.materials || undefined,
          promotionDetails: item.promotion_details || item.promotionDetails || item.niche || undefined,
          exportProducts: item.export_products || item.exportProducts || item.commodities || undefined,
          packagingMaterials: item.packaging_materials || item.packagingMaterials || item.packaging_types || undefined,
          serviceDetails: item.service_details || item.serviceDetails || item.services || undefined,
          website: item.website || item.website_url || item.websiteUrl || undefined,
          websiteUrl: item.website || item.website_url || item.websiteUrl || undefined,
          instagram: item.instagram || item.instagram_handle || item.instagramHandle || undefined,
          instagramHandle: item.instagram || item.instagram_handle || item.instagramHandle || undefined,
          avatarUrl: item.avatar_url || item.avatarUrl || item.author_avatar || item.authorAvatar || item.avatar || undefined,
          createdAt: item.created_at || item.createdAt || new Date().toISOString(),
          status: (item.status as UserStatus) || 'Active',
          rejectionReason: item.rejection_reason || undefined,
        };
      });

      const mergedMap = new Map<string, UserProfile>();
      localProfiles.forEach((p) => {
        const key = p.phone || p.id || p.displayName;
        if (key) mergedMap.set(key, p);
      });
      remoteProfiles.forEach((p) => {
        const key = p.phone || p.id || p.displayName;
        if (key) mergedMap.set(key, p);
      });
      const combined = Array.from(mergedMap.values());
      try {
        localStorage.setItem(localKey, JSON.stringify(combined));
      } catch (e) {}
      return combined;
    }
  } catch (err) {
    console.warn('Notice fetching profiles from Supabase:', err);
  }

  return localProfiles;
};

export const fetchAllSupabaseMessages = async (): Promise<PersistentMessage[]> => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data && data.length > 0) {
      return data.map((item: any) => ({
        id: String(item.id || `msg-${Date.now()}`),
        chat_id: String(item.chat_id || item.chatId || ''),
        sender_id: item.sender_id || item.senderId || '',
        receiver_id: item.receiver_id || item.receiverId || '',
        sender_name: item.sender_name || item.senderName || 'Member',
        text: item.text || item.content || '',
        is_me: Boolean(item.is_me),
        timestamp: item.timestamp || new Date(item.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        created_at: item.created_at || new Date().toISOString(),
      }));
    }
  } catch (err) {
    console.warn('Notice querying all messages from Supabase:', err);
  }
  return [];
};

export const updateUserStatusInSupabase = async (
  phone: string,
  status: UserStatus,
  rejectionReason?: string
): Promise<void> => {
  const localKey = 'dropthan_all_profiles';
  try {
    const stored = localStorage.getItem(localKey);
    if (stored) {
      const profiles: UserProfile[] = JSON.parse(stored);
      const target = profiles.find((p) => p.phone === phone);
      if (target) {
        target.status = status;
        if (rejectionReason) target.rejectionReason = rejectionReason;
        else if (status === 'Active') delete target.rejectionReason;
        localStorage.setItem(localKey, JSON.stringify(profiles));
      }
    }

    const currentLocal = localStorage.getItem('dropthan_user');
    if (currentLocal) {
      const u: UserProfile = JSON.parse(currentLocal);
      if (u.phone === phone) {
        u.status = status;
        if (rejectionReason) u.rejectionReason = rejectionReason;
        else if (status === 'Active') delete u.rejectionReason;
        localStorage.setItem('dropthan_user', JSON.stringify(u));
      }
    }
  } catch (e) {}

  try {
    await supabase.from('profiles').update({
      status,
      rejection_reason: rejectionReason || null,
    }).eq('phone', phone);
  } catch (err) {
    console.warn('Notice updating profile status in Supabase:', err);
  }
};

export const fetchUserProfileStatus = async (
  phone: string
): Promise<{ status: UserStatus; rejectionReason?: string } | null> => {
  if (!phone) return null;
  try {
    // Direct real-time fetch from Supabase table
    const { data, error } = await supabase
      .from('profiles')
      .select('status, rejection_reason')
      .eq('phone', phone)
      .maybeSingle();

    if (!error && data && data.status) {
      const normStatus: UserStatus =
        data.status === 'Active' || data.status === 'active'
          ? 'Active'
          : data.status === 'Rejected' || data.status === 'rejected'
          ? 'Rejected'
          : 'Pending';
      return {
        status: normStatus,
        rejectionReason: data.rejection_reason || undefined,
      };
    }
  } catch (e) {
    console.warn('Notice querying profile status directly:', e);
  }

  try {
    const profiles = await fetchAllUserProfilesFromSupabase();
    const found = profiles.find((p) => p.phone === phone);
    if (found) {
      return {
        status: found.status || 'Pending',
        rejectionReason: found.rejectionReason,
      };
    }
  } catch (e) {}

  return null;
};

export const fetchFullUserProfileByPhone = async (phone: string): Promise<UserProfile | null> => {
  if (!phone) return null;
  const cleanPhone = phone.trim();
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (!error && data && data.phone) {
      return {
        id: data.id || `usr_${data.phone.replace(/\D/g, '')}`,
        role: data.role || 'wholesaler',
        phone: data.phone,
        country: data.country || 'India',
        location: data.location || '',
        storeAddress: data.store_address || data.location || undefined,
        lat: data.lat ? Number(data.lat) : undefined,
        lng: data.lng ? Number(data.lng) : undefined,
        companyName: data.company_name || undefined,
        fullName: data.full_name || undefined,
        displayName: data.display_name || data.company_name || data.full_name || 'Member',
        bio: data.bio || data.description || undefined,
        description: data.description || data.bio || undefined,
        gstin: data.gstin || undefined,
        iecCode: data.iec_code || undefined,
        website: data.website || data.website_url || undefined,
        websiteUrl: data.website || data.website_url || undefined,
        instagram: data.instagram || data.instagram_handle || undefined,
        instagramHandle: data.instagram || data.instagram_handle || undefined,
        avatarUrl: data.avatar_url || data.avatarUrl || undefined,
        createdAt: data.created_at || new Date().toISOString(),
        status: (data.status as UserStatus) || 'Pending',
        rejectionReason: data.rejection_reason || undefined,
      };
    }
  } catch (err) {
    console.warn('Notice querying full profile from Supabase:', err);
  }

  // Fallback to local cached profiles
  try {
    const profiles = await fetchAllUserProfilesFromSupabase();
    const found = profiles.find((p) => p.phone === cleanPhone);
    if (found) {
      return found;
    }
  } catch (e) {}

  return null;
};

// ==========================================
// SUPABASE AUTHENTICATION HELPERS
// ==========================================

export const supabaseSignUpWithEmail = async (email: string, password: string, metadata?: any) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    if (error) {
      console.warn('Supabase Auth SignUp Notice:', error.message);
      return { user: null, session: null, error: error.message };
    }
    return { user: data.user, session: data.session, error: null };
  } catch (err: any) {
    console.warn('Supabase Auth SignUp Exception:', err?.message || err);
    return { user: null, session: null, error: err?.message || 'Authentication error' };
  }
};

export const supabaseSignInWithEmail = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      console.warn('Supabase Auth SignIn Notice:', error.message);
      return { user: null, session: null, error: error.message };
    }
    return { user: data.user, session: data.session, error: null };
  } catch (err: any) {
    console.warn('Supabase Auth SignIn Exception:', err?.message || err);
    return { user: null, session: null, error: err?.message || 'Authentication error' };
  }
};

export const supabaseSignOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) console.warn('Supabase Auth SignOut Notice:', error.message);
  } catch (err) {
    console.warn('Supabase Auth SignOut Exception:', err);
  }
};

export const getSupabaseUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) console.warn('Supabase Auth getUser Notice:', error.message);
    return user;
  } catch (err) {
    console.warn('Exception fetching Supabase Auth user:', err);
    return null;
  }
};





