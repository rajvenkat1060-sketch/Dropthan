import React, { useState } from 'react';
import { PostItem, UserProfile } from '../types';
import { uploadMultipleToCloudinary } from '../lib/cloudinary';
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedPreviews, setSelectedPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const presetImages = [
    'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80',
  ];

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newFiles = [...selectedFiles, ...files].slice(0, 6);
    setSelectedFiles(newFiles);

    const previewsArray = new Array(newFiles.length);
    let loadedCount = 0;

    newFiles.forEach((file, index) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          previewsArray[index] = reader.result;
        }
        loadedCount++;
        if (loadedCount === newFiles.length) {
          setSelectedPreviews(previewsArray);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setSelectedPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setErrorMessage('Please enter a Product/Offer Name.');
      return;
    }
    if (!description.trim()) {
      setErrorMessage('Please enter a Description (Service / MOQ details).');
      return;
    }
    if (selectedFiles.length === 0 && !imgUrl.trim() && selectedPreviews.length === 0) {
      setErrorMessage('Please upload or select at least one product photo.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    let uploadedImageUrls: string[] = [];

    try {
      if (selectedFiles.length > 0) {
        console.log(`☁️ [Cloudinary Upload] Uploading ${selectedFiles.length} photo(s) to Cloudinary...`);
        uploadedImageUrls = await uploadMultipleToCloudinary(selectedFiles);
        console.log('✅ [Cloudinary Response] Secure URLs:', uploadedImageUrls);
      }
    } catch (err: any) {
      console.warn('Direct Cloudinary upload notice:', err);
      uploadedImageUrls = selectedPreviews.filter((p) => typeof p === 'string' && p.startsWith('http'));
    }

    if (!uploadedImageUrls || uploadedImageUrls.length === 0) {
      if (imgUrl.trim()) {
        uploadedImageUrls = [imgUrl.trim()];
      } else if (selectedPreviews.length > 0 && selectedPreviews[0].startsWith('http')) {
        uploadedImageUrls = selectedPreviews;
      } else {
        uploadedImageUrls = [presetImages[Math.floor(Math.random() * presetImages.length)]];
      }
    }

    const primaryImg = uploadedImageUrls[0];
    const validPostId = generateValidUUID();
    const validUserId = currentUser?.id && isUuid(currentUser.id) ? currentUser.id : undefined;

    // Clean post object with ONLY required fields and UI-friendly fallbacks
    const newPost: PostItem = {
      id: validPostId,
      user_id: validUserId,
      userId: validUserId,
      title: title.trim(),
      description: description.trim(),
      caption: description.trim(),
      author: currentUser?.displayName || currentUser?.companyName || 'Dropthan Member',
      role: currentUser?.role || 'wholesaler',
      price: 'Wholesale Rate',
      moq: 'Direct MOQ',
      img: primaryImg,
      images: uploadedImageUrls,
      category: 'Textiles & Apparel',
      location: currentUser?.location || 'India',
      phone: currentUser?.phone || '',
      likesCount: 0,
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    try {
      console.log('Submitting post payload:', {
        id: newPost.id,
        user_id: newPost.user_id,
        title: newPost.title,
        description: newPost.description,
        img: newPost.img,
        images: newPost.images,
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

          {/* FIELD 2: DESCRIPTION (SERVICE / MOQ DETAILS) -> mapped to description */}
          <div>
            <label className="block text-slate-800 font-bold mb-1 flex items-center justify-between">
              <span>📝 Description (Service / MOQ Details) *</span>
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

          {/* CLOUDINARY IMAGE UPLOAD & PREVIEW */}
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
                    <span>📸 Click to Select Photos from Device</span>
                    <span className="text-[10px] text-slate-500 font-normal">Directly uploads to Cloudinary</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFilesChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {selectedPreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {selectedPreviews.map((preview, idx) => (
                      <div key={idx} className="relative group rounded-xl overflow-hidden border border-blue-200 aspect-square">
                        <img
                          src={preview}
                          alt={`Selected preview ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow cursor-pointer"
                          title="Remove photo"
                        >
                          ✕
                        </button>
                        <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                          #{idx + 1}
                        </span>
                      </div>
                    ))}
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
