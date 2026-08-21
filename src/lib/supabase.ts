/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';
import { PostItem, RatingSummary, ReviewItem, UserProfile, UserStatus } from '../types';
import { uploadToCloudinary } from './cloudinary';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://zxbifidxkpbsissjwgnm.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_s8wtq-Mx3OMobIMCSZ69cA_gzo9VbvJ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const generateValidUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch (e) {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

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
      console.log('📡 [Supabase Realtime Channel Status - Posts]:', status);
    });

  return () => {
    supabase.removeChannel(channel);
  };
};

export const subscribeToSupabaseProfiles = (onProfilesChange: () => void) => {
  const channel = supabase
    .channel('public:profiles')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'profiles' },
      (payload) => {
        console.log('⚡ [Realtime Supabase] Profiles table update detected:', payload.eventType);
        onProfilesChange();
      }
    )
    .subscribe((status) => {
      console.log('📡 [Supabase Realtime Channel Status - Profiles]:', status);
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

  let remoteData: any[] = [];

  // 1. Direct Supabase Query
  try {
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

    if (!error && data && data.length > 0) {
      remoteData = data;
    }
  } catch (e: any) {
    console.warn('Direct Supabase fetch posts notice:', e?.message || e);
  }

  // 2. Server API fallback if direct query returned nothing
  if (remoteData.length === 0) {
    try {
      const resp = await fetch('/api/posts');
      if (resp.ok) {
        const json = await resp.json();
        if (json.success && Array.isArray(json.posts) && json.posts.length > 0) {
          remoteData = json.posts;
        }
      }
    } catch (apiErr) {
      console.warn('Server posts API fallback notice:', apiErr);
    }
  }

  if (remoteData.length === 0) {
    return localCache;
  }

  const mapped: PostItem[] = remoteData.map((item: any) => {
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
      user_id: item.user_id || item.userId || undefined,
      userId: item.userId || item.user_id || undefined,
      vendor_id: item.vendor_id || item.vendorId || item.user_id || undefined,
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

    let saved = false;

    // Multi-attempt adaptive client-side upsert with column pruning
    const payloadToSave = { ...basePayload, id: post.id };
    for (let attempt = 0; attempt < 8; attempt++) {
      const { error } = await supabase.from('posts').upsert(payloadToSave);
      if (!error) {
        saved = true;
        console.log('✅ [Supabase Post Save]: Saved post to Supabase posts table successfully!');
        break;
      }

      console.warn(`[Supabase Post Save Attempt ${attempt + 1}] notice:`, error.message);

      // Check for missing column and prune
      const missingColMatch =
        error.message.match(/Could not find the '(\w+)' column/i) ||
        error.message.match(/column "?(\w+)"? of relation "posts" does not exist/i) ||
        error.message.match(/column "(\w+)" does not exist/i);

      if (missingColMatch && missingColMatch[1] && payloadToSave[missingColMatch[1]] !== undefined) {
        console.log(`Pruning unmapped column '${missingColMatch[1]}' from post payload and retrying...`);
        delete payloadToSave[missingColMatch[1]];
        continue;
      }

      // If id column is invalid or constraint fails, try insert without id
      if (payloadToSave.id) {
        delete payloadToSave.id;
        const { error: insertErr } = await supabase.from('posts').insert([payloadToSave]);
        if (!insertErr) {
          saved = true;
          console.log('✅ [Supabase Post Save]: Fallback insert without ID succeeded!');
          break;
        }
      }

      break;
    }

    // Direct server-side proxy backup to ensure persistence across all devices
    try {
      const resp = await fetch('/api/posts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...basePayload, id: post.id }),
      });
      if (resp.ok) {
        console.log('✅ [Server Post Proxy]: Post successfully synced to Supabase through server proxy!');
        saved = true;
      }
    } catch (serverErr) {
      console.warn('Server post proxy backup notice:', serverErr);
    }

    try {
      window.dispatchEvent(new CustomEvent('dropthan_posts_updated'));
    } catch (e) {}
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

export const subscribeToSupabaseMessages = (onMessagesChange: (payload?: any) => void) => {
  const channelName = `public:messages_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const channel = supabase
    .channel(channelName)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
      console.log('⚡ [Realtime Supabase] Messages table update detected:', payload);
      onMessagesChange(payload);
    })
    .subscribe((status) => {
      console.log('📡 [Supabase Messages Realtime Status]:', status);
    });

  const handleLocalEvent = (e: any) => {
    onMessagesChange({ eventType: 'INSERT', new: e.detail });
  };
  window.addEventListener('dropthan_message_sent', handleLocalEvent);
  window.addEventListener('dropthan_message_received', handleLocalEvent);

  return () => {
    supabase.removeChannel(channel);
    window.removeEventListener('dropthan_message_sent', handleLocalEvent);
    window.removeEventListener('dropthan_message_received', handleLocalEvent);
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
  media_url?: string;
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

  const cleanPhone = (currentUserPhone || '').replace(/\D/g, '');
  const cleanUserId = (currentUserId || '').trim();

  try {
    // 1. Direct Supabase query by chat_id
    let res = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    // Fallback if chat_id column has alternate naming or schema variance
    if (res.error && (res.error.code === '42703' || res.error.message.includes('chat_id'))) {
      res = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(200);
    }

    if (!res.error && res.data && res.data.length > 0) {
      const msgs: PersistentMessage[] = res.data.map((item: any) => {
        const sender = String(item.sender_id || item.senderId || '');
        const senderDigits = sender.replace(/\D/g, '');
        
        // Dynamically compute is_me accurately for current viewing user
        const isMe =
          Boolean(item.is_me) ||
          (cleanUserId && sender === cleanUserId) ||
          (cleanPhone && senderDigits && (senderDigits === cleanPhone || cleanPhone.endsWith(senderDigits) || senderDigits.endsWith(cleanPhone)));

        return {
          id: String(item.id || `msg-${Date.now()}`),
          chat_id: String(item.chat_id || item.chatId || chatId),
          sender_id: sender,
          receiver_id: item.receiver_id || item.receiverId || '',
          sender_name: item.sender_name || item.senderName || '',
          text: item.text || item.content || '',
          media_url: item.media_url || item.mediaUrl || item.image_url || undefined,
          is_me: isMe,
          timestamp: item.timestamp || new Date(item.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          created_at: item.created_at || new Date().toISOString(),
        };
      });

      // Filter to relevant messages for this chat
      const relevantMsgs = msgs.filter((m) => !m.chat_id || m.chat_id === chatId);

      // Merge with localStorage
      const mergedMap = new Map<string, PersistentMessage>();
      fallback.forEach((m) => mergedMap.set(m.id, m));
      relevantMsgs.forEach((m) => mergedMap.set(m.id, m));

      const mergedList = Array.from(mergedMap.values()).sort((a, b) => {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      try {
        localStorage.setItem(localKey, JSON.stringify(mergedList));
      } catch (e) {}

      return mergedList;
    }
  } catch (err) {
    console.warn('Notice querying Supabase messages:', err);
  }

  // 2. Server API fallback
  try {
    const resp = await fetch(`/api/messages?chat_id=${encodeURIComponent(chatId)}`);
    if (resp.ok) {
      const json = await resp.json();
      if (json.success && Array.isArray(json.messages) && json.messages.length > 0) {
        const msgs: PersistentMessage[] = json.messages.map((item: any) => {
          const sender = String(item.sender_id || item.senderId || '');
          const senderDigits = sender.replace(/\D/g, '');
          const isMe =
            Boolean(item.is_me) ||
            (cleanUserId && sender === cleanUserId) ||
            (cleanPhone && senderDigits && (senderDigits === cleanPhone || cleanPhone.endsWith(senderDigits) || senderDigits.endsWith(cleanPhone)));

          return {
            id: String(item.id || `msg-${Date.now()}`),
            chat_id: String(item.chat_id || chatId),
            sender_id: sender,
            receiver_id: item.receiver_id || '',
            sender_name: item.sender_name || '',
            text: item.text || item.content || '',
            media_url: item.media_url || item.mediaUrl || item.image_url || undefined,
            is_me: isMe,
            timestamp: item.timestamp || new Date(item.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            created_at: item.created_at || new Date().toISOString(),
          };
        });

        const mergedMap = new Map<string, PersistentMessage>();
        fallback.forEach((m) => mergedMap.set(m.id, m));
        msgs.forEach((m) => mergedMap.set(m.id, m));

        const mergedList = Array.from(mergedMap.values()).sort((a, b) => {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });

        localStorage.setItem(localKey, JSON.stringify(mergedList));
        return mergedList;
      }
    }
  } catch (e) {}

  return fallback;
};

export const saveSupabaseMessage = async (msg: PersistentMessage): Promise<{ success: boolean; data?: any }> => {
  // 1. Immediately cache in localStorage for zero latency
  const localKey = `dropthan_msg_${msg.chat_id}`;
  let existing: PersistentMessage[] = [];
  try {
    const stored = localStorage.getItem(localKey);
    if (stored) existing = JSON.parse(stored);
  } catch (e) {}

  const existsIdx = existing.findIndex((m) => m.id === msg.id);
  if (existsIdx >= 0) {
    existing[existsIdx] = msg;
  } else {
    existing.push(msg);
  }
  localStorage.setItem(localKey, JSON.stringify(existing));

  // 2. Prepare payload for Supabase public.messages table
  const messageUuid = isUuid(msg.id) ? msg.id : generateValidUUID();

  const basePayload: Record<string, any> = {
    chat_id: msg.chat_id,
    sender_id: msg.sender_id,
    receiver_id: msg.receiver_id || null,
    sender_name: msg.sender_name || null,
    text: msg.text || '',
    media_url: msg.media_url || null,
    is_me: msg.is_me,
    timestamp: msg.timestamp,
    created_at: msg.created_at || new Date().toISOString(),
  };

  let saved = false;
  let savedData: any = null;

  // Multi-attempt insert with UUID and column fallback
  const payloadToSave: Record<string, any> = { id: messageUuid, ...basePayload };

  for (let attempt = 0; attempt < 6; attempt++) {
    const { data, error } = await supabase.from('messages').insert([payloadToSave]).select();
    if (!error) {
      saved = true;
      savedData = data;
      console.log('✅ [Supabase Messages] Message inserted successfully into public.messages table:', data);
      break;
    }

    console.warn(`[Supabase Message Insert Attempt ${attempt + 1}] notice:`, error.message);

    // If UUID syntax error or PK conflict on id, try without id (let table generate or handle)
    if (error.message.includes('uuid') || error.code === '22P02' || error.code === '23505') {
      delete payloadToSave.id;
      continue;
    }

    // Extract unknown column from error message and remove from payload
    const colMatch =
      error.message.match(/Could not find the '(\w+)' column/i) ||
      error.message.match(/column "?(\w+)"? of relation "messages" does not exist/i) ||
      error.message.match(/column "(\w+)" does not exist/i);

    if (colMatch && colMatch[1] && payloadToSave[colMatch[1]] !== undefined) {
      console.log(`Pruning unmapped column '${colMatch[1]}' from messages payload...`);
      delete payloadToSave[colMatch[1]];
      continue;
    }

    // If content column expected instead of text
    if (error.message.includes('content') && !payloadToSave.content) {
      payloadToSave.content = payloadToSave.text;
    }

    break;
  }

  // 3. Backup server proxy post
  try {
    const resp = await fetch('/api/messages/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: messageUuid, ...basePayload }),
    });
    if (resp.ok) {
      saved = true;
    }
  } catch (e) {}

  // 4. Dispatch local event for real-time instant cross-component awareness
  try {
    window.dispatchEvent(new CustomEvent('dropthan_message_sent', { detail: msg }));
  } catch (e) {}

  return { success: saved, data: savedData };
};

// ==========================================
// USER PROFILES & GST VERIFICATION MANAGEMENT
// ==========================================

// Helper to validate and generate UUIDs for Supabase PostgreSQL tables
export const isUuid = (v?: string): boolean =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);


export const ensureSupabaseAuthUser = async (phone: string): Promise<string | null> => {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return null;

  try {
    // 1. Check existing auth session
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user?.id) {
      return sessionData.session.user.id;
    }

    const email = `usr_${digits}@dropthan.app`;
    const password = `DropthanPass_${digits}!2026`;

    // 2. Try sign in
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInData?.user?.id) {
      return signInData.user.id;
    }

    // 3. Try sign up if not existing (creates user record in auth.users)
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { phone },
      },
    });

    if (signUpData?.user?.id) {
      return signUpData.user.id;
    }
  } catch (err) {
    console.warn('Notice ensuring Supabase auth user:', err);
  }
  return null;
};

export const saveUserProfileToSupabase = async (profile: UserProfile): Promise<UserProfile> => {
  const cleanPhone = (profile.phone || '').trim();
  const compName = profile.companyName?.trim() || null;
  const flName = profile.fullName?.trim() || null;
  const dispName = profile.displayName?.trim() || compName || flName || (cleanPhone ? `Member ${cleanPhone.slice(-4)}` : 'Member');
  const websiteVal = profile.website || profile.websiteUrl || null;
  const bioVal = profile.bio || profile.description || null;

  // 1. Ensure or retrieve valid auth user ID to satisfy foreign key constraint on auth.users(id)
  let authUserId = profile.id && isUuid(profile.id) ? profile.id.trim() : null;
  if (!authUserId && cleanPhone) {
    authUserId = await ensureSupabaseAuthUser(cleanPhone);
  }
  const validId = authUserId || (profile.id && isUuid(profile.id) ? profile.id.trim() : generateValidUUID());

  // Build clean payload with standard Supabase column mappings (NO 'description', NO 'website_url', NO 'instagram_handle')
  const currentPayload: Record<string, any> = {
    id: validId,
    phone: cleanPhone || null,
    role: profile.role || 'wholesaler',
    display_name: dispName,
    company_name: compName || dispName,
    location: profile.location || '',
    country: profile.country || 'India',
    status: profile.status || 'Active',
    created_at: profile.createdAt || new Date().toISOString(),
  };

  if (flName) currentPayload.full_name = flName;
  if (profile.storeAddress || profile.location) currentPayload.store_address = profile.storeAddress || profile.location;
  if (profile.avatarUrl) currentPayload.avatar_url = profile.avatarUrl;
  if (bioVal) currentPayload.bio = bioVal;
  if (profile.gstin) currentPayload.gstin = profile.gstin;
  if (profile.iecCode) currentPayload.iec_code = profile.iecCode;
  if (websiteVal) currentPayload.website = websiteVal;
  if (profile.instagram || profile.instagramHandle) currentPayload.instagram = profile.instagram || profile.instagramHandle;
  if (profile.lat !== undefined && profile.lat !== null) currentPayload.lat = Number(profile.lat);
  if (profile.lng !== undefined && profile.lng !== null) currentPayload.lng = Number(profile.lng);
  if (profile.rejectionReason) currentPayload.rejection_reason = profile.rejectionReason;

  // Immediately update local cache for zero-latency UI reflection across all tabs
  try {
    const localKey = 'dropthan_all_profiles';
    const stored = localStorage.getItem(localKey);
    let profilesList: UserProfile[] = stored ? JSON.parse(stored) : [];
    const normalizedPhone = cleanPhone.replace(/\D/g, '');
    const existingIndex = profilesList.findIndex(
      (p) =>
        (p.phone && normalizedPhone && p.phone.replace(/\D/g, '') === normalizedPhone) ||
        (p.id && (p.id === profile.id || p.id === validId))
    );
    const updatedProfileObj: UserProfile = {
      ...profile,
      id: validId,
      displayName: dispName,
      fullName: flName || undefined,
      companyName: compName || undefined,
      phone: cleanPhone,
    };
    if (existingIndex >= 0) {
      profilesList[existingIndex] = { ...profilesList[existingIndex], ...updatedProfileObj };
    } else {
      profilesList.unshift(updatedProfileObj);
    }
    localStorage.setItem(localKey, JSON.stringify(profilesList));
  } catch (e) {}

  console.log('⚡ [SUPABASE PROFILE UPSERT REQUEST]: Sending payload to public.profiles:', currentPayload);

  let saved = false;
  let lastError: any = null;
  let savedData: any = null;

  try {
    let payloadToSave = { ...currentPayload };

    // Direct Supabase execution loop with adaptive schema matching
    for (let attempt = 0; attempt < 8; attempt++) {
      // 1. Direct UPSERT on id
      const { data: upsertData, error: upsertErr } = await supabase
        .from('profiles')
        .upsert(payloadToSave, { onConflict: payloadToSave.id ? 'id' : 'phone' })
        .select();

      if (!upsertErr) {
        saved = true;
        savedData = upsertData;
        console.log('✅ [SUPABASE PROFILE UPSERT SUCCESS]:', upsertData);
        break;
      }

      lastError = upsertErr;
      console.warn(`⚠️ [SUPABASE PROFILE UPSERT ATTEMPT ${attempt + 1} NOTICE]:`, upsertErr.message, upsertErr);

      // Check for missing column error and prune it (PGRST204)
      const missingCol =
        upsertErr.message.match(/Could not find the '(\w+)' column/i) ||
        upsertErr.message.match(/column "?(\w+)"? of relation "profiles" does not exist/i) ||
        upsertErr.message.match(/column "(\w+)" does not exist/i);

      if (missingCol && missingCol[1] && payloadToSave[missingCol[1]] !== undefined) {
        console.log(`ℹ️ [saveUserProfileToSupabase] Pruning unmapped column '${missingCol[1]}' and retrying...`);
        delete payloadToSave[missingCol[1]];
        continue;
      }

      // Handle foreign key error: id not present in auth.users
      if (upsertErr.code === '23503' || upsertErr.message.includes('profiles_id_fkey') || upsertErr.message.includes('foreign key')) {
        console.log('🔑 Resolving foreign key constraint by ensuring auth.users account for:', cleanPhone);
        const newAuthId = await ensureSupabaseAuthUser(cleanPhone);
        if (newAuthId && newAuthId !== payloadToSave.id) {
          payloadToSave.id = newAuthId;
          continue;
        }

        // If foreign key persists and record can be updated by phone, update without id
        if (cleanPhone) {
          const payloadWithoutId = { ...payloadToSave };
          delete payloadWithoutId.id;
          const { error: updateByPhoneErr } = await supabase
            .from('profiles')
            .update(payloadWithoutId)
            .eq('phone', cleanPhone);

          if (!updateByPhoneErr) {
            const { data: checkData } = await supabase.from('profiles').select('*').eq('phone', cleanPhone);
            if (checkData && checkData.length > 0) {
              saved = true;
              savedData = checkData;
              console.log('✅ [SUPABASE PROFILE UPDATE SUCCESS by phone (bypassed FK)]: ', checkData);
              break;
            }
          }
        }
      }

      // Handle UUID data type if database schema specifies UUID for id
      if (upsertErr.message.includes('invalid input syntax for type uuid') || upsertErr.message.includes('type uuid')) {
        payloadToSave.id = generateValidUUID();
        continue;
      }

      // If id upsert failed, try updating by phone
      if (cleanPhone) {
        const { data: phoneData, error: phoneUpsertErr } = await supabase
          .from('profiles')
          .upsert(payloadToSave, { onConflict: 'phone' })
          .select();

        if (!phoneUpsertErr) {
          saved = true;
          savedData = phoneData;
          console.log('✅ [SUPABASE PROFILE UPSERT SUCCESS by phone]:', phoneData);
          break;
        }
      }

      break;
    }

    // 5. Server-side API fallback if client-side encountered an issue
    if (!saved) {
      try {
        console.log('🔄 [SUPABASE PROFILE SERVER FALLBACK]: Calling /api/profiles/upsert...');
        const srvRes = await fetch('/api/profiles/upsert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentPayload),
        });
        const srvJson = await srvRes.json().catch(() => null);
        if (srvRes.ok) {
          saved = true;
          savedData = srvJson;
          console.log('✅ [SUPABASE PROFILE SERVER UPSERT SUCCESS]:', srvJson);
        } else {
          console.error('❌ [SUPABASE PROFILE SERVER UPSERT ERROR]:', srvJson);
        }
      } catch (srvErr) {
        console.error('❌ [SUPABASE PROFILE SERVER FALLBACK EXCEPTION]:', srvErr);
      }
    }

    if (saved) {
      console.log('🎉 [SUPABASE PROFILE PERSISTED TO LIVE DATABASE]:', {
        id: validId,
        phone: cleanPhone,
        displayName: dispName,
        data: savedData
      });
      try {
        window.dispatchEvent(new CustomEvent('dropthan_profiles_updated'));
      } catch (e) {}
    } else {
      console.error('❌ [SUPABASE PROFILE FINAL ERROR - NOT SAVED TO DATABASE]:', lastError);
    }
  } catch (err) {
    console.error('❌ [SUPABASE PROFILE UNEXPECTED EXCEPTION]:', err);
  }

  return {
    ...profile,
    id: validId,
    displayName: dispName,
    fullName: flName || undefined,
    companyName: compName || undefined,
    phone: cleanPhone,
  };
};

export const updateUserWebsiteInSupabase = async (
  phone: string,
  websiteUrl: string
): Promise<{ success: boolean; error?: string }> => {
  if (!phone) return { success: false, error: 'Phone number is required to update website link.' };
  const cleanUrl = websiteUrl.trim();

  try {
    console.log(`🌐 [Supabase Realtime Update] Updating website for user phone ${phone} -> "${cleanUrl}"...`);
    let { error } = await supabase
      .from('profiles')
      .update({ website: cleanUrl, website_url: cleanUrl })
      .eq('phone', phone);

    if (error) {
      const { error: err1 } = await supabase.from('profiles').update({ website: cleanUrl }).eq('phone', phone);
      if (err1) {
        await supabase.from('profiles').update({ website_url: cleanUrl }).eq('phone', phone);
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
    const cur = localStorage.getItem('dropthan_user');
    if (cur) {
      const u = JSON.parse(cur);
      if (u && u.phone && !localProfiles.some((p) => p.phone === u.phone)) {
        localProfiles.unshift(u);
      }
    }
  } catch (e) {}

  let remoteData: any[] = [];

  // 1. Direct Supabase Query
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
      remoteData = data;
    }
  } catch (err) {
    console.warn('Notice fetching profiles from Supabase:', err);
  }

  // 2. Server API Fallback
  if (remoteData.length === 0) {
    try {
      const resp = await fetch('/api/profiles');
      if (resp.ok) {
        const json = await resp.json();
        if (json.success && Array.isArray(json.profiles) && json.profiles.length > 0) {
          remoteData = json.profiles;
        }
      }
    } catch (apiErr) {
      console.warn('Server profiles API fallback notice:', apiErr);
    }
  }

  if (remoteData.length > 0) {
    const remoteProfiles: UserProfile[] = remoteData.map((item: any) => {
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

    // Merge and update local cache
    const mergedMap = new Map<string, UserProfile>();
    localProfiles.forEach((p) => {
      const key = (p.phone || p.id || p.displayName).toLowerCase();
      if (key) mergedMap.set(key, p);
    });
    remoteProfiles.forEach((p) => {
      const key = (p.phone || p.id || p.displayName).toLowerCase();
      if (key) mergedMap.set(key, p);
    });

    const finalProfiles = Array.from(mergedMap.values());
    try {
      localStorage.setItem(localKey, JSON.stringify(finalProfiles));
    } catch (e) {}

    return finalProfiles;
  }

  return localProfiles;
};

export const fetchAllProfilesFromSupabase = fetchAllUserProfilesFromSupabase;

export const searchProfilesFromSupabase = async (query: string): Promise<UserProfile[]> => {
  const cleanQ = query.trim();
  console.log('🔍 [searchProfilesFromSupabase] Querying live Supabase profiles table for:', `"${cleanQ}"`);

  if (!cleanQ) {
    const all = await fetchAllUserProfilesFromSupabase();
    console.log('🔍 [searchProfilesFromSupabase] Empty query - returning all profiles count:', all.length);
    return all;
  }

  const directResults: UserProfile[] = [];

  // 1. Direct Supabase query with case-insensitive .ilike() across core columns
  try {
    const safeFilter = `display_name.ilike.%${cleanQ}%,company_name.ilike.%${cleanQ}%,full_name.ilike.%${cleanQ}%,name.ilike.%${cleanQ}%,phone.ilike.%${cleanQ}%,location.ilike.%${cleanQ}%`;

    let { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(safeFilter)
      .limit(100);

    if (error) {
      console.warn('Primary .ilike() filter notice, running resilient fallback query:', error.message);
      const fallbackFilter = `display_name.ilike.%${cleanQ}%,phone.ilike.%${cleanQ}%,location.ilike.%${cleanQ}%`;
      const res = await supabase.from('profiles').select('*').or(fallbackFilter).limit(100);
      data = res.data;
      error = res.error;
    }

    if (!error && data && data.length > 0) {
      data.forEach((item: any) => {
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

        directResults.push({
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
        });
      });
    }
  } catch (err) {
    console.warn('Direct search notice:', err);
  }

  // 2. Server API search query fallback
  try {
    const resp = await fetch(`/api/profiles?q=${encodeURIComponent(cleanQ)}`);
    if (resp.ok) {
      const json = await resp.json();
      if (json.success && Array.isArray(json.profiles)) {
        json.profiles.forEach((item: any) => {
          const cleanPhone = (item.phone || item.mobile || item.contact_number || '').trim();
          const compName = item.company_name || item.companyName || undefined;
          const flName = item.full_name || item.fullName || undefined;
          const dispName = item.display_name || item.displayName || compName || flName || 'Member';

          directResults.push({
            id: item.id || `usr_${Date.now()}`,
            role: item.role || 'wholesaler',
            phone: cleanPhone,
            country: item.country || 'India',
            location: item.location || '',
            companyName: compName,
            fullName: flName,
            displayName: dispName,
            bio: item.bio || item.description || undefined,
            description: item.description || item.bio || undefined,
            gstin: item.gstin || undefined,
            iecCode: item.iec_code || undefined,
            website: item.website || item.website_url || undefined,
            instagram: item.instagram || item.instagram_handle || undefined,
            avatarUrl: item.avatar_url || item.avatarUrl || undefined,
            createdAt: item.created_at || new Date().toISOString(),
            status: (item.status as UserStatus) || 'Active',
          });
        });
      }
    }
  } catch (e) {}

  // 3. Comprehensive multi-attribute matching across all live profiles
  const allLiveProfiles = await fetchAllUserProfilesFromSupabase();
  const queryLower = cleanQ.toLowerCase();
  const queryDigits = cleanQ.replace(/\D/g, '');
  const tokens = queryLower.split(/\s+/).filter(Boolean);

  const matchedMemory = allLiveProfiles.filter((p) => {
    const name = (p.displayName || '').toLowerCase();
    const comp = (p.companyName || '').toLowerCase();
    const full = (p.fullName || '').toLowerCase();
    const phone = (p.phone || '').toLowerCase();
    const phoneDigits = (p.phone || '').replace(/\D/g, '');
    const bio = (p.bio || p.description || '').toLowerCase();
    const role = (p.role || '').toLowerCase().replace(/_/g, ' ');
    const loc = (p.location || p.storeAddress || '').toLowerCase();
    const prod = (p.productName || p.materialDetails || '').toLowerCase();
    const promo = (p.promotionDetails || '').toLowerCase();
    const exp = (p.exportProducts || '').toLowerCase();
    const pack = (p.packagingMaterials || '').toLowerCase();
    const serv = (p.serviceDetails || '').toLowerCase();
    const gstin = (p.gstin || '').toLowerCase();

    const corpus = `${name} ${comp} ${full} ${phone} ${bio} ${role} ${loc} ${prod} ${promo} ${exp} ${pack} ${serv} ${gstin}`;

    // Direct name or phone prefix/substring match
    if (
      name.includes(queryLower) ||
      comp.includes(queryLower) ||
      full.includes(queryLower) ||
      phone.includes(queryLower) ||
      (queryDigits.length >= 3 && phoneDigits.includes(queryDigits))
    ) {
      return true;
    }

    return tokens.some((t) => corpus.includes(t));
  });

  // Combine and deduplicate
  const resultMap = new Map<string, UserProfile>();
  directResults.forEach((p) => {
    const key = (p.phone || p.id || p.displayName).toLowerCase();
    if (key) resultMap.set(key, p);
  });
  matchedMemory.forEach((p) => {
    const key = (p.phone || p.id || p.displayName).toLowerCase();
    if (key) resultMap.set(key, p);
  });

  const finalMatched = Array.from(resultMap.values());
  console.log(`🎯 [searchProfilesFromSupabase] Matched ${finalMatched.length} live profiles for "${cleanQ}":`, finalMatched.map((p) => p.displayName || p.companyName));
  return finalMatched;
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

export const fetchFullUserProfile = async (identifier: string): Promise<UserProfile | null> => {
  if (!identifier) return null;
  const cleanId = identifier.trim();

  // If identifier looks like a phone number, fetch by phone first
  if (/^\+?\d{8,15}$/.test(cleanId.replace(/\s+/g, ''))) {
    const byPhone = await fetchFullUserProfileByPhone(cleanId);
    if (byPhone) return byPhone;
  }

  // 1. Direct Supabase Query by ID or Name/Company
  try {
    let { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`id.eq.${cleanId},display_name.ilike.%${cleanId}%,company_name.ilike.%${cleanId}%,full_name.ilike.%${cleanId}%`)
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      const cleanPhone = (data.phone || data.mobile || '').trim();
      return {
        id: data.id || (cleanPhone ? `usr_${cleanPhone.replace(/\D/g, '')}` : `usr_${Date.now()}`),
        role: data.role || 'wholesaler',
        phone: cleanPhone,
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
        status: (data.status as UserStatus) || 'Active',
        rejectionReason: data.rejection_reason || undefined,
      };
    }
  } catch (err) {
    console.warn('Notice querying profile by identifier from Supabase:', err);
  }

  // 2. Server API fallback /api/profiles/by-identifier
  try {
    const resp = await fetch(`/api/profiles/by-identifier?identifier=${encodeURIComponent(cleanId)}`);
    if (resp.ok) {
      const json = await resp.json();
      if (json.success && json.profile) {
        const data = json.profile;
        const cleanPhone = (data.phone || data.mobile || '').trim();
        return {
          id: data.id || `usr_${Date.now()}`,
          role: data.role || 'wholesaler',
          phone: cleanPhone,
          country: data.country || 'India',
          location: data.location || '',
          companyName: data.company_name || undefined,
          fullName: data.full_name || undefined,
          displayName: data.display_name || data.company_name || data.full_name || 'Member',
          bio: data.bio || data.description || undefined,
          description: data.description || data.bio || undefined,
          gstin: data.gstin || undefined,
          iecCode: data.iec_code || undefined,
          website: data.website || data.website_url || undefined,
          instagram: data.instagram || data.instagram_handle || undefined,
          avatarUrl: data.avatar_url || data.avatarUrl || undefined,
          createdAt: data.created_at || new Date().toISOString(),
          status: (data.status as UserStatus) || 'Active',
        };
      }
    }
  } catch (e) {}

  // 3. Fallback from all live/cached profiles
  try {
    const profiles = await fetchAllUserProfilesFromSupabase();
    const lower = cleanId.toLowerCase();
    const found = profiles.find((p) => {
      const name = (p.displayName || '').toLowerCase();
      const comp = (p.companyName || '').toLowerCase();
      const full = (p.fullName || '').toLowerCase();
      const ph = (p.phone || '').toLowerCase();
      const pid = (p.id || '').toLowerCase();
      return name === lower || comp === lower || full === lower || ph === lower || pid === lower || name.includes(lower) || lower.includes(name);
    });
    if (found) return found;
  } catch (e) {}

  return null;
};

export const fetchPostsByVendor = async (
  vendorIdentifier: string | { id?: string; phone?: string; displayName?: string; companyName?: string; fullName?: string; author?: string }
): Promise<PostItem[]> => {
  if (!vendorIdentifier) return [];

  let cleanId = '';
  let cleanPhone = '';
  let cleanDigits = '';
  let targetAuthor = '';
  let targetCompany = '';
  let targetDisplayName = '';
  let targetFullName = '';
  let userId = '';

  if (typeof vendorIdentifier === 'string') {
    cleanId = vendorIdentifier.trim();
    if (/^\+?\d[\d\s-]{6,}$/.test(cleanId) && !cleanId.includes('9876543210')) {
      cleanPhone = cleanId;
      cleanDigits = cleanId.replace(/\D/g, '');
    } else {
      targetAuthor = cleanId;
    }
  } else {
    cleanPhone = (vendorIdentifier.phone || '').trim();
    if (cleanPhone.includes('9876543210')) cleanPhone = '';
    cleanDigits = cleanPhone.replace(/\D/g, '');
    userId = (vendorIdentifier.id || '').trim();
    targetAuthor = (vendorIdentifier.author || '').trim();
    targetCompany = (vendorIdentifier.companyName || '').trim();
    targetDisplayName = (vendorIdentifier.displayName || '').trim();
    targetFullName = (vendorIdentifier.fullName || '').trim();
    cleanId = cleanPhone || targetCompany || targetDisplayName || targetAuthor || userId;
  }

  const GENERIC_NAMES = new Set([
    'dropthan member',
    'dropthan b2b member',
    'verified supplier',
    'supplier',
    'member',
    'admin',
    'user',
    'wholesaler',
    'dropshipper',
    'reseller',
    '',
  ]);

  let remotePosts: PostItem[] = [];

  const mapPostItem = (item: any): PostItem => ({
    id: String(item.id || `post_${Date.now()}`),
    user_id: item.user_id || item.userId || undefined,
    userId: item.userId || item.user_id || undefined,
    vendor_id: item.vendor_id || item.vendorId || item.user_id || undefined,
    author: item.author || targetCompany || targetDisplayName || 'Dropthan Member',
    role: item.role || 'wholesaler',
    price: item.price || 'Rate on Request',
    moq: item.moq || 'Custom MOQ',
    caption: item.caption || item.description || '',
    img: item.img || item.image || item.photo || (Array.isArray(item.images) && item.images[0]) || '',
    images: Array.isArray(item.images) && item.images.length > 0 ? item.images : [item.img || item.image || item.photo || ''],
    phone: item.phone || cleanPhone || '',
    location: item.location || '',
    category: item.category || 'Textiles & Apparel',
    likesCount: item.likes_count ?? item.likesCount ?? 15,
    authorAvatar: item.author_avatar || item.authorAvatar || '',
    gstin: item.gstin || undefined,
    iecCode: item.iec_code || item.iecCode || undefined,
    website: item.website || undefined,
    instagram: item.instagram || undefined,
    createdAt: item.created_at || item.createdAt || new Date().toISOString(),
    created_at: item.created_at || item.createdAt || new Date().toISOString(),
  });

  // 1. Direct Supabase Query against posts table
  try {
    const queryPromises: PromiseLike<any>[] = [];

    // Query by exact phone
    if (cleanPhone) {
      queryPromises.push(supabase.from('posts').select('*').eq('phone', cleanPhone));
    }
    if (cleanDigits && cleanDigits.length >= 7) {
      queryPromises.push(supabase.from('posts').select('*').eq('phone', `+${cleanDigits}`));
    }

    // Query by exact author name / company / display name (NEVER generic or loose ilike substring)
    const authorCandidates = Array.from(
      new Set(
        [targetAuthor, targetCompany, targetDisplayName, targetFullName]
          .filter(Boolean)
          .filter((cand) => !GENERIC_NAMES.has(cand.toLowerCase().trim()))
      )
    );
    authorCandidates.forEach((cand) => {
      queryPromises.push(supabase.from('posts').select('*').eq('author', cand));
    });

    // Query by user ID if provided
    if (userId) {
      queryPromises.push(supabase.from('posts').select('*').eq('user_id', userId));
    }

    const results = await Promise.all(queryPromises as Promise<any>[]);
    results.forEach((res) => {
      if (!res.error && Array.isArray(res.data) && res.data.length > 0) {
        res.data.forEach((item: any) => {
          remotePosts.push(mapPostItem(item));
        });
      }
    });
  } catch (e) {
    console.warn('Notice during direct Supabase posts query:', e);
  }

  // 2. Server API fallback
  try {
    const searchParam = cleanPhone || cleanDigits || targetCompany || targetDisplayName || targetAuthor || userId;
    if (searchParam) {
      const resp = await fetch(`/api/profiles/by-identifier?identifier=${encodeURIComponent(searchParam)}`);
      if (resp.ok) {
        const json = await resp.json();
        if (json.success && Array.isArray(json.posts) && json.posts.length > 0) {
          json.posts.forEach((item: any) => {
            remotePosts.push(mapPostItem(item));
          });
        }
      }
    }
  } catch (e) {}

  // 3. Match against all Supabase posts in memory using strict criteria
  try {
    const allPosts = await fetchSupabasePosts();
    const exactNames = new Set(
      [targetAuthor, targetCompany, targetDisplayName, targetFullName]
        .filter(Boolean)
        .map((n) => n.toLowerCase().trim())
        .filter((n) => !GENERIC_NAMES.has(n))
    );

    const matchedFromAll = allPosts.filter((p) => {
      if (p.id && (p.id.startsWith('vendor-') || p.id.startsWith('temp-'))) {
        return false;
      }

      const postAuthor = (p.author || '').toLowerCase().trim();
      const postPhone = (p.phone || '').trim();
      const postDigits = postPhone.replace(/\D/g, '');
      const postUserId = (p as any).user_id || (p as any).userId;

      // Check user ID match
      if (userId && postUserId && (postUserId === userId || String(postUserId) === String(userId))) {
        return true;
      }

      // Check phone digits match (exact last 10 digits)
      if (cleanDigits && postDigits && cleanDigits.length >= 7 && postDigits.length >= 7) {
        if (cleanDigits === postDigits || cleanDigits.slice(-10) === postDigits.slice(-10)) {
          return true;
        }
      }

      // Check exact author / company name match (NO loose substring matching)
      if (postAuthor && exactNames.size > 0 && exactNames.has(postAuthor)) {
        return true;
      }

      return false;
    });

    matchedFromAll.forEach((p) => remotePosts.push(p));
  } catch (e) {}

  // Deduplicate and filter out any pseudo-posts
  const merged = new Map<string, PostItem>();
  remotePosts.forEach((p) => {
    if (p.id && !p.id.startsWith('vendor-') && !p.id.startsWith('temp-')) {
      merged.set(String(p.id), p);
    }
  });

  return Array.from(merged.values()).sort((a, b) => {
    const tA = new Date(a.createdAt || a.created_at || 0).getTime();
    const tB = new Date(b.createdAt || b.created_at || 0).getTime();
    return tB - tA;
  });
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





