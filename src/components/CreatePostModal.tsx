import React, { useState } from 'react';
import { PostItem, UserProfile } from '../types';
import { uploadToCloudinary } from '../lib/cloudinary';
import { generateValidUUID, isUuid } from '../lib/supabase';

interface CreatePostModalProps {
  currentUser: UserProfile | null;
  onClose: () => void;
  onAddPost: (newPost: PostItem) => Promise<void> | void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  currentUser,
  onClose,
  onAddPost,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imgUrl, setImgUrl] = useState('');
  const [imageMode, setImageMode] = useState<'file' | 'url' | 'presets'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const presetImages = [
    'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80',
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setSelectedPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    setSelectedPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setErrorMessage('Please enter a Product/Offer Name.');
      return;
    }
    if (!description.trim()) {
      setErrorMessage('Please enter a Description (Service / Offer Details).');
      return;
    }
    if (!selectedFile && !imgUrl.trim() && !selectedPreview) {
      setErrorMessage('Please upload or select a product photo.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    let finalImageUrl = '';

    try {
      if (selectedFile) {
        console.log('☁️ [Cloudinary Upload] Uploading photo to Cloudinary...');
        finalImageUrl = await uploadToCloudinary(selectedFile, 'post_creation');
        console.log('✅ [Cloudinary Response] Secure URL:', finalImageUrl);
      }
    } catch (err: any) {
      console.warn('Direct Cloudinary upload notice:', err);
    }

    if (!finalImageUrl) {
      if (imgUrl.trim()) {
        finalImageUrl = imgUrl.trim();
      } else if (selectedPreview && selectedPreview.startsWith('http')) {
        finalImageUrl = selectedPreview;
      } else {
        finalImageUrl = presetImages[Math.floor(Math.random() * presetImages.length)];
      }
    }

    const validPostId = generateValidUUID();
    const validUserId = currentUser?.id && isUuid(currentUser.id) ? currentUser.id : undefined;

    // Streamlined post object matching schema columns
    const cleanTitle = title.trim();
    const cleanDesc = description.trim();

    const authorDisplayName =
      currentUser?.displayName ||
      currentUser?.fullName ||
      currentUser?.companyName ||
      (currentUser?.phone ? `Member (${currentUser.phone.slice(-4)})` : 'Verified Member');

    const newPost: PostItem = {
      id: validPostId,
      user_id: validUserId,
      userId: validUserId,
      title: cleanTitle,
      product_name: cleanTitle,
      description: cleanDesc,
      caption: cleanDesc,
      author: authorDisplayName,
      authorAvatar: currentUser?.avatarUrl || '',
      role: currentUser?.role || 'wholesaler',
      price: 'Wholesale Rate',
      moq: 'Direct MOQ',
      img: finalImageUrl,
      images: [finalImageUrl],
      is_active: true,
      category: 'Textiles & Apparel',
      location: currentUser?.storeAddress || currentUser?.location || 'India',
      storeAddress: currentUser?.storeAddress || currentUser?.location || 'India',
      phone: currentUser?.phone || '',
      gstin: currentUser?.gstin || undefined,
      iecCode: currentUser?.iecCode || undefined,
      likesCount: 0,
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    try {
      console.log('Submitting post payload:', {
        id: newPost.id,
        user_id: newPost.user_id,
        title: newPost.title,
        product_name: newPost.product_name,
        description: newPost.description,
        img: newPost.img,
        is_active: newPost.is_active,
        created_at: newPost.created_at,
      });

      await onAddPost(newPost);
      setIsUploading(false);
      onClose();
    } catch (postErr: any) {
      console.error('Supabase Insert Error:', postErr);
      setIsUploading(false);
      setErrorMessage(postErr?.message || 'Failed to publish post. Please check the browser console.');
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-blue-100 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4 space-y-4 shadow-2xl animate-in fade-in zoom-in scrollbar-thin">
        <div className="flex items-center justify-between border-b border-blue-100 pb-2.5">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <span>📦</span> Post New B2B Offer
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* FIELD 1: PRODUCT / OFFER NAME -> mapped to title */}
          <div>
            <label className="block text-slate-800 font-bold mb-1 flex items-center justify-between">
              <span>🏷️ Product / Offer Name *</span>
              <span className="text-[10px] text-[#0d47a1] font-semibold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                Mapped to title
              </span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 100% Bio-Wash Cotton T-Shirts, Surat Silk Sarees, Corrugated Packaging Boxes"
              className="w-full bg-white border border-blue-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1] font-medium"
            />
          </div>

          {/* FIELD 2: DESCRIPTION (SERVICE / OFFER DETAILS) -> mapped to description */}
          <div>
            <label className="block text-slate-800 font-bold mb-1 flex items-center justify-between">
              <span>📝 Description (Service / Offer Details) *</span>
              <span className="text-[10px] text-[#0d47a1] font-semibold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                Mapped to description
              </span>
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter pricing, minimum order quantity (MOQ), fabric GSM, customization options, dispatch lead times, and terms..."
              className="w-full bg-white border border-blue-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1] font-medium"
            />
          </div>

          {/* FIELD 3: SINGLE CLOUDINARY IMAGE UPLOAD & PREVIEW -> mapped to img */}
          <div className="space-y-2.5 bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <label className="block text-slate-800 font-bold text-xs">
                📸 Product Photo *
              </label>
              <div className="flex items-center gap-1 bg-white border border-slate-200 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setImageMode('file')}
                  className={`px-2 py-1 text-[10px] font-bold rounded-md transition ${
                    imageMode === 'file'
                      ? 'bg-[#0d47a1] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📁 Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode('url')}
                  className={`px-2 py-1 text-[10px] font-bold rounded-md transition ${
                    imageMode === 'url'
                      ? 'bg-[#0d47a1] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🔗 Image URL
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode('presets')}
                  className={`px-2 py-1 text-[10px] font-bold rounded-md transition ${
                    imageMode === 'presets'
                      ? 'bg-[#0d47a1] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ✨ Samples
                </button>
              </div>
            </div>

            {imageMode === 'file' && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <label className="flex-1 bg-white hover:bg-blue-50 text-[#0d47a1] border border-dashed border-blue-300 p-3 rounded-xl cursor-pointer text-center font-bold text-xs transition flex flex-col items-center justify-center gap-1 shadow-xs">
                    <span>📸 Click to Select Photo from Device</span>
                    <span className="text-[10px] text-slate-500 font-normal">Directly uploads to Cloudinary</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {selectedPreview && (
                  <div className="relative rounded-xl overflow-hidden border border-blue-200 aspect-video max-h-40 bg-slate-100 flex items-center justify-center">
                    <img
                      src={selectedPreview}
                      alt="Selected preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="absolute top-2 right-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow cursor-pointer"
                      title="Remove photo"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            )}

            {imageMode === 'url' && (
              <div className="space-y-2">
                <input
                  type="url"
                  value={imgUrl}
                  onChange={(e) => setImgUrl(e.target.value)}
                  placeholder="Paste image URL (e.g. https://images.unsplash.com/... or Cloudinary link)"
                  className="w-full bg-white border border-blue-300 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1] font-medium"
                />
                {imgUrl.trim() && (
                  <div className="relative rounded-xl overflow-hidden border border-blue-200 aspect-video max-h-36 bg-slate-100 flex items-center justify-center">
                    <img
                      src={imgUrl.trim()}
                      alt="Direct URL Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {imageMode === 'presets' && (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-600">Select a high-resolution sample product image:</p>
                <div className="grid grid-cols-4 gap-2">
                  {presetImages.map((url, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => {
                        setImgUrl(url);
                        setImageMode('url');
                      }}
                      className={`relative rounded-xl overflow-hidden border aspect-square cursor-pointer transition ${
                        imgUrl === url ? 'ring-2 ring-[#0d47a1] border-[#0d47a1]' : 'border-slate-200 hover:opacity-90'
                      }`}
                    >
                      <img src={url} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 animate-in fade-in">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="pt-2 flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl cursor-pointer transition border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="flex-1 bg-[#0d47a1] hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-2.5 rounded-xl cursor-pointer transition shadow flex items-center justify-center space-x-2"
            >
              {isUploading ? (
                <>
                  <span className="animate-spin text-xs">⌛</span>
                  <span>Publishing offer...</span>
                </>
              ) : (
                <span>Publish Offer</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
