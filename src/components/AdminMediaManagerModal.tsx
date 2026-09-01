import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, PostItem } from '../types';
import { uploadToCloudinary } from '../lib/cloudinary';
import { saveSupabasePost, deleteSupabasePost, fetchPostsByVendor, saveUserProfileToSupabase } from '../lib/supabase';
import {
  X,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Plus,
  RefreshCw,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Package,
} from 'lucide-react';

interface AdminMediaManagerModalProps {
  user: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated?: (updatedUser: UserProfile) => void;
}

export const AdminMediaManagerModal: React.FC<AdminMediaManagerModalProps> = ({
  user,
  isOpen,
  onClose,
  onUserUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'avatar' | 'create_post' | 'vendor_posts'>('avatar');

  // Avatar Uploader State
  const [avatarUrl, setAvatarUrl] = useState<string>(user?.avatarUrl || '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false);
  const [avatarError, setAvatarError] = useState<string>('');
  const [avatarSuccess, setAvatarSuccess] = useState<string>('');
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // New Post Form State
  const [postTitle, setPostTitle] = useState<string>('');
  const [postDescription, setPostDescription] = useState<string>('');
  const [postPrice, setPostPrice] = useState<string>('');
  const [postMoq, setPostMoq] = useState<string>('10');
  const [postCategory, setPostCategory] = useState<string>('Textiles & Fabrics');
  const [postImages, setPostImages] = useState<string[]>([]);
  const [isUploadingPostImage, setIsUploadingPostImage] = useState<boolean>(false);
  const [isPublishingPost, setIsPublishingPost] = useState<boolean>(false);
  const [postError, setPostError] = useState<string>('');
  const [postSuccess, setPostSuccess] = useState<string>('');
  const postImagesInputRef = useRef<HTMLInputElement>(null);

  // Vendor's Existing Posts State
  const [vendorPosts, setVendorPosts] = useState<PostItem[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState<boolean>(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setAvatarUrl(user.avatarUrl || '');
      loadVendorPosts();
    }
  }, [user]);

  const loadVendorPosts = async () => {
    if (!user) return;
    setIsLoadingPosts(true);
    try {
      const posts = await fetchPostsByVendor(user);
      setVendorPosts(posts || []);
    } catch (e) {
      console.warn('Error loading vendor posts:', e);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  if (!isOpen || !user) return null;

  const displayName = user.companyName || user.fullName || user.displayName || 'Vendor Account';
  const cleanPhone = user.phone || 'N/A';

  // Handle Avatar File Upload via Cloudinary
  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    setAvatarError('');
    setAvatarSuccess('');

    try {
      console.log(`📸 [Admin Media Pipeline] Uploading avatar for "${displayName}" to Cloudinary...`);
      const secureUrl = await uploadToCloudinary(file, 'profile-avatar');

      if (!secureUrl) {
        throw new Error('Cloudinary upload returned no secure URL.');
      }

      setAvatarUrl(secureUrl);

      // Save to Supabase
      const updatedProfile: UserProfile = {
        ...user,
        avatarUrl: secureUrl,
      };

      await saveUserProfileToSupabase(updatedProfile);

      setAvatarSuccess('✓ Profile picture uploaded to Cloudinary & saved to Supabase!');
      if (onUserUpdated) {
        onUserUpdated(updatedProfile);
      }
    } catch (err: any) {
      console.error('Avatar upload failed:', err);
      setAvatarError(err?.message || 'Failed to upload profile picture.');
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  // Handle Multiple Post Images Upload via Cloudinary
  const handlePostImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingPostImage(true);
    setPostError('');

    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`🖼️ [Admin Media Pipeline] Uploading post image ${i + 1}/${files.length} to Cloudinary...`);
        const url = await uploadToCloudinary(file, 'product-post');
        if (url) {
          uploadedUrls.push(url);
        }
      }

      if (uploadedUrls.length === 0) {
        throw new Error('Could not upload any image to Cloudinary.');
      }

      setPostImages((prev) => [...prev, ...uploadedUrls].slice(0, 6));
    } catch (err: any) {
      console.error('Post image upload failed:', err);
      setPostError(err?.message || 'Failed to upload post image.');
    } finally {
      setIsUploadingPostImage(false);
      if (postImagesInputRef.current) postImagesInputRef.current.value = '';
    }
  };

  // Submit Post on Behalf of Vendor
  const handleCreatePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim()) {
      setPostError('Please enter a product title.');
      return;
    }

    if (postImages.length === 0) {
      setPostError('Please upload at least 1 product image via Cloudinary.');
      return;
    }

    setIsPublishingPost(true);
    setPostError('');
    setPostSuccess('');

    try {
      const newPostPayload: PostItem = {
        id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        user_id: user.id,
        userId: user.id,
        author: displayName,
        phone: user.phone || '',
        role: (user.role as any) || 'wholesaler',
        location: user.location || 'India',
        title: postTitle.trim(),
        product_name: postTitle.trim(),
        description: postDescription.trim(),
        caption: postDescription.trim(),
        img: postImages[0],
        images: postImages,
        price: postPrice ? `₹${postPrice.replace(/[^\d.]/g, '')}` : '₹0',
        moqPrice: postPrice ? postPrice.replace(/[^\d.]/g, '') : undefined,
        moq: postMoq ? String(postMoq) : '10',
        category: postCategory,
        createdAt: new Date().toISOString(),
        likeCount: 0,
        is_active: true,
      };

      console.log('🚀 [Admin Media Pipeline] Inserting new post to Supabase:', newPostPayload);
      const saved = await saveSupabasePost(newPostPayload);

      setPostSuccess(`✓ Product "${saved.title || postTitle}" published and mapped to ${displayName}!`);
      
      // Reset form
      setPostTitle('');
      setPostDescription('');
      setPostPrice('');
      setPostMoq('10');
      setPostImages([]);

      // Reload posts
      await loadVendorPosts();

      setTimeout(() => setPostSuccess(''), 5000);
    } catch (err: any) {
      console.error('Post creation failed:', err);
      setPostError(err?.message || 'Failed to publish post to database.');
    } finally {
      setIsPublishingPost(false);
    }
  };

  // Delete Post
  const handleDeletePost = async (postId: string) => {
    if (!postId) return;
    setDeletingPostId(postId);
    try {
      await deleteSupabasePost(postId, user.id);
      setVendorPosts((prev) => prev.filter((p) => String(p.id) !== String(postId)));
    } catch (e: any) {
      console.error('Delete post failed:', e);
    } finally {
      setDeletingPostId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[170] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl border border-blue-100 max-h-[92vh] overflow-y-auto custom-scrollbar">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-[#0d47a1] flex items-center justify-center text-xl font-black">
              🎨
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">{displayName}</h3>
                <span className="bg-blue-50 text-[#0d47a1] text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
                  {user.role}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Cloudinary Media Pipeline & Catalog Manager (📞 {cleanPhone})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl">
          <button
            onClick={() => setActiveTab('avatar')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'avatar'
                ? 'bg-white text-[#0d47a1] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>👤 Profile Picture</span>
          </button>
          <button
            onClick={() => setActiveTab('create_post')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'create_post'
                ? 'bg-white text-[#0d47a1] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>➕ Upload Product / Post</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('vendor_posts');
              loadVendorPosts();
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'vendor_posts'
                ? 'bg-white text-[#0d47a1] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📦 Catalog ({vendorPosts.length})</span>
          </button>
        </div>

        {/* TAB 1: PROFILE PICTURE / AVATAR UPLOADER */}
        {activeTab === 'avatar' && (
          <div className="space-y-4 text-xs">
            <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3.5">
                <div className="relative group">
                  <img
                    src={avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                    alt={displayName}
                    className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md"
                  />
                  {avatarUrl && avatarUrl.includes('cloudinary') && (
                    <span className="absolute bottom-0 right-0 bg-emerald-500 text-white rounded-full p-1 border-2 border-white text-[9px]" title="Hosted on Cloudinary">
                      ☁️
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">Wholesaler Avatar Image</h4>
                  <p className="text-slate-600 text-[11px]">
                    {avatarUrl ? 'Uploaded image will reflect instantly in the verified feed & profile.' : 'Default placeholder assigned.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={avatarInputRef}
                  accept="image/*"
                  onChange={handleAvatarFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isUploadingAvatar}
                  onClick={() => avatarInputRef.current?.click()}
                  className="bg-[#0d47a1] hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                >
                  {isUploadingAvatar ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Uploading to Cloudinary...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Avatar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {avatarSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{avatarSuccess}</span>
              </div>
            )}

            {avatarError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span>{avatarError}</span>
              </div>
            )}

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-700 block">Direct Image URL Assignment (Alternative):</span>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://res.cloudinary.com/..."
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0d47a1]"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!avatarUrl.trim()) return;
                    try {
                      setIsUploadingAvatar(true);
                      const updated = { ...user, avatarUrl: avatarUrl.trim() };
                      await saveUserProfileToSupabase(updated);
                      setAvatarSuccess('✓ Profile URL updated successfully in Supabase!');
                      if (onUserUpdated) onUserUpdated(updated);
                    } catch (e: any) {
                      setAvatarError(e?.message || 'Failed to update avatar URL.');
                    } finally {
                      setIsUploadingAvatar(false);
                    }
                  }}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-3.5 py-2 rounded-xl transition cursor-pointer"
                >
                  Save URL
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CREATE & PUBLISH PRODUCT POST VIA CLOUDINARY */}
        {activeTab === 'create_post' && (
          <form onSubmit={handleCreatePostSubmit} className="space-y-3.5 text-xs text-left">
            {postSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{postSuccess}</span>
              </div>
            )}

            {postError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span>{postError}</span>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-[11px] text-amber-950 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                Publishing as verified wholesaler: <strong>{displayName}</strong>. Images are optimized and hosted directly on <strong>Cloudinary</strong>.
              </span>
            </div>

            {/* PRODUCT TITLE */}
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Product Title / Offer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                placeholder="e.g. Pure Banarasi Silk Sarees (Wholesale Lot 10 Pcs)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-[#0d47a1]"
              />
            </div>

            {/* PRICE, MOQ & CATEGORY GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Wholesale / MOQ Price (₹)
                </label>
                <input
                  type="text"
                  value={postPrice}
                  onChange={(e) => setPostPrice(e.target.value)}
                  placeholder="e.g. 850"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#0d47a1]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Minimum Order Quantity (MOQ)
                </label>
                <input
                  type="number"
                  min="1"
                  value={postMoq}
                  onChange={(e) => setPostMoq(e.target.value)}
                  placeholder="10"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0d47a1]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Category
                </label>
                <select
                  value={postCategory}
                  onChange={(e) => setPostCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0d47a1]"
                >
                  <option value="Textiles & Fabrics">Textiles & Fabrics</option>
                  <option value="Sarees & Ethnic Wear">Sarees & Ethnic Wear</option>
                  <option value="Kurtis & Ready-mades">Kurtis & Ready-mades</option>
                  <option value="Denim & Garments">Denim & Garments</option>
                  <option value="Jewelry & Accessories">Jewelry & Accessories</option>
                  <option value="Leather Goods">Leather Goods</option>
                  <option value="Packaging & Printing">Packaging & Printing</option>
                  <option value="Handicrafts & Decor">Handicrafts & Decor</option>
                </select>
              </div>
            </div>

            {/* DESCRIPTION */}
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Description / Specifications
              </label>
              <textarea
                rows={3}
                value={postDescription}
                onChange={(e) => setPostDescription(e.target.value)}
                placeholder="e.g. 100% pure silk, vibrant colors, zari weaving border, ready stock available for dispatch across India."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0d47a1]"
              />
            </div>

            {/* CLOUDINARY MULTI-IMAGE UPLOADER */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-slate-800">
                  Product Images (Cloudinary Pipeline) <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-slate-500 font-medium">Up to 6 images</span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {postImages.map((imgUrl, idx) => (
                  <div key={`post-img-${idx}`} className="relative group aspect-square rounded-xl border border-slate-200 overflow-hidden bg-slate-100">
                    <img src={imgUrl} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPostImages((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-md transition cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {postImages.length < 6 && (
                  <button
                    type="button"
                    disabled={isUploadingPostImage}
                    onClick={() => postImagesInputRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/50 hover:bg-blue-50 text-[#0d47a1] flex flex-col items-center justify-center p-2 text-center transition cursor-pointer disabled:opacity-50"
                  >
                    {isUploadingPostImage ? (
                      <div className="w-5 h-5 border-2 border-[#0d47a1] border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mb-1 text-[#0d47a1]" />
                        <span className="text-[9px] font-black uppercase">Add Photo</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <input
                type="file"
                multiple
                ref={postImagesInputRef}
                accept="image/*"
                onChange={handlePostImageSelect}
                className="hidden"
              />
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPublishingPost || postImages.length === 0}
                className="bg-[#0d47a1] hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 shadow-md shadow-blue-900/10 active:scale-95 disabled:opacity-50"
              >
                {isPublishingPost ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Saving to Supabase...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Publish Product to Feed</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: VENDOR'S LIVE POSTS & DELETE CONTROLS */}
        {activeTab === 'vendor_posts' && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-slate-800">
                Live Products Listed by {displayName} ({vendorPosts.length})
              </h4>
              <button
                onClick={loadVendorPosts}
                className="text-slate-500 hover:text-slate-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingPosts ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {isLoadingPosts ? (
              <div className="p-8 text-center text-slate-500 font-bold flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                <span>Loading catalog items...</span>
              </div>
            ) : vendorPosts.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <p className="text-slate-500 font-bold">No product posts published yet for this account.</p>
                <button
                  onClick={() => setActiveTab('create_post')}
                  className="bg-[#0d47a1] hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  ➕ Create First Product Post
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto p-1 custom-scrollbar">
                {vendorPosts.map((post) => (
                  <div
                    key={`vendor-post-card-${post.id}`}
                    className="bg-white border border-slate-200 rounded-2xl p-3 flex gap-3 shadow-2xs hover:shadow-sm transition"
                  >
                    <img
                      src={post.images?.[0] || post.img || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=200'}
                      alt={post.title}
                      className="w-16 h-16 rounded-xl object-cover border border-slate-100 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <h5 className="font-bold text-slate-900 truncate">{post.title}</h5>
                      <p className="text-[#0d47a1] font-bold text-[11px]">
                        ₹{post.moqPrice || post.price?.replace(/[^\d.]/g, '') || 'N/A'}
                        {post.moq ? ` (MOQ: ${post.moq})` : ''}
                      </p>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                        <span className="text-slate-500">❤️ {post.likeCount || 0} likes</span>
                        <button
                          disabled={deletingPostId === post.id}
                          onClick={() => handleDeletePost(post.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-700 font-bold px-2 py-1 rounded-lg border border-red-200 transition cursor-pointer flex items-center gap-1 active:scale-95 disabled:opacity-50"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
