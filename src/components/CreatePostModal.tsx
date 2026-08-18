import React, { useState, useEffect } from 'react';
import { PostItem, UserProfile } from '../types';
import { uploadOfferPhotosToSupabase } from '../lib/supabase';
import { GoogleLocationInput } from './GoogleLocationInput';

interface CreatePostModalProps {
  currentUser: UserProfile | null;
  onClose: () => void;
  onAddPost: (newPost: PostItem) => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  currentUser,
  onClose,
  onAddPost,
}) => {
  const [caption, setCaption] = useState('');
  const [price, setPrice] = useState('');
  const [moq, setMoq] = useState('');
  const [imgUrl, setImgUrl] = useState('');
  const [category, setCategory] = useState('Textiles & Apparel');
  const [postLocation, setPostLocation] = useState(currentUser?.location || 'Surat, Gujarat');
  const [postStoreAddress, setPostStoreAddress] = useState(currentUser?.storeAddress || '');
  const [postLat, setPostLat] = useState<number | undefined>(currentUser?.lat);
  const [postLng, setPostLng] = useState<number | undefined>(currentUser?.lng);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedPreviews, setSelectedPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Category-specific input fields
  const [productName, setProductName] = useState('');
  const [promotionDetails, setPromotionDetails] = useState('');
  const [exportProducts, setExportProducts] = useState('');
  const [packagingMaterials, setPackagingMaterials] = useState('');
  const [serviceDetails, setServiceDetails] = useState('');

  // Determine role based flags
  const role = currentUser?.role || 'wholesaler';
  const isPostingRestricted = role === 'reseller';

  // Category & Role matching
  const isWholesalerType =
    role === 'wholesaler' ||
    role === 'organic_wholesaler' ||
    category.includes('Textiles') ||
    category.includes('Organic') ||
    category.includes('Electronics');

  const isExporterType = role === 'exporter' || category.includes('Export');
  const isInfluencerType = role === 'influencer' || category.includes('Influencer');
  const isPrintingType = role === 'printing' || category.includes('Packaging') || category.includes('Printing');
  const isMarketingType = role === 'marketing' || category.includes('Marketing');

  // Set default category based on user role
  useEffect(() => {
    if (role === 'organic_wholesaler') setCategory('Organic & Natural Products');
    else if (role === 'exporter') setCategory('Global Export Goods');
    else if (role === 'influencer') setCategory('Influencer Marketing');
    else if (role === 'printing') setCategory('Packaging & Printing');
    else if (role === 'marketing') setCategory('Digital Marketing');
    else setCategory('Textiles & Apparel');
  }, [role]);

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
    if (isPostingRestricted) return;
    if (!caption) return;
    if (isWholesalerType && (!price || !moq)) return;

    setIsUploading(true);
    let uploadedImageUrls: string[] = [];

    try {
      if (selectedFiles.length > 0) {
        const sectionContext = currentUser?.role || category;
        uploadedImageUrls = await uploadOfferPhotosToSupabase(
          selectedFiles,
          currentUser?.displayName || 'user',
          sectionContext
        );
      }
    } catch (err) {
      console.warn('File upload fallback:', err);
      uploadedImageUrls = selectedPreviews;
    } finally {
      setIsUploading(false);
    }

    if (uploadedImageUrls.length === 0) {
      if (imgUrl.trim()) {
        uploadedImageUrls = [imgUrl.trim()];
      } else {
        uploadedImageUrls = [presetImages[Math.floor(Math.random() * presetImages.length)]];
      }
    }

    const primaryImg = uploadedImageUrls[0];

    const finalPrice = isWholesalerType
      ? price.startsWith('₹')
        ? price
        : `₹${price}`
      : 'Rate on Request';

    const finalMoq = isWholesalerType
      ? moq.toLowerCase().includes('moq')
        ? moq
        : `MOQ ${moq}`
      : 'Custom Order';

    // Format rich caption embedding category-specific tags for complete search compatibility
    let enrichedCaption = caption;
    if (productName.trim() && isWholesalerType) {
      enrichedCaption = `${caption}\n\n[Product/Material: ${productName.trim()}]`;
    } else if (promotionDetails.trim() && isInfluencerType) {
      enrichedCaption = `${caption}\n\n[Promotion Niches: ${promotionDetails.trim()}]`;
    } else if (exportProducts.trim() && isExporterType) {
      enrichedCaption = `${caption}\n\n[Export Commodities: ${exportProducts.trim()}]`;
    } else if (packagingMaterials.trim() && isPrintingType) {
      enrichedCaption = `${caption}\n\n[Packaging Materials: ${packagingMaterials.trim()}]`;
    } else if (serviceDetails.trim() && isMarketingType) {
      enrichedCaption = `${caption}\n\n[Marketing Services: ${serviceDetails.trim()}]`;
    }

    const newPost: PostItem = {
      id: `post-${Date.now()}`,
      author: currentUser?.displayName || currentUser?.companyName || 'Dropthan B2B Member',
      authorAvatar: currentUser?.avatarUrl,
      role: currentUser?.role || 'wholesaler',
      price: finalPrice,
      moq: finalMoq,
      caption: enrichedCaption,
      productName: productName.trim() || undefined,
      materialDetails: productName.trim() || undefined,
      promotionDetails: promotionDetails.trim() || undefined,
      exportProducts: exportProducts.trim() || undefined,
      packagingMaterials: packagingMaterials.trim() || undefined,
      serviceDetails: serviceDetails.trim() || undefined,
      img: primaryImg,
      images: uploadedImageUrls,
      phone: currentUser?.phone ? (currentUser.phone.startsWith('+') ? currentUser.phone : `+${currentUser.phone}`) : '+919876543210',
      gstin: currentUser?.gstin,
      iecCode: currentUser?.iecCode,
      country: currentUser?.country || 'India',
      location: postLocation.trim() || currentUser?.location || 'India',
      storeAddress: postStoreAddress.trim() || currentUser?.storeAddress || postLocation.trim() || 'India',
      lat: postLat,
      lng: postLng,
      category,
      website: currentUser?.website || currentUser?.websiteUrl,
      instagram: currentUser?.instagram || currentUser?.instagramHandle,
    };

    onAddPost(newPost);
    onClose();
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

        {isPostingRestricted ? (
          <div className="space-y-4 text-xs py-2">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2 text-slate-800">
              <div className="flex items-center space-x-2 text-amber-700 font-bold">
                <span className="text-lg">🚫</span>
                <span>Role-Based Posting Restricted</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-600">
                Your account is currently registered as a{' '}
                <strong className="text-amber-900 capitalize">{currentUser?.role}</strong>.
                Photo uploads and listing offers are reserved for verified{' '}
                <strong>Wholesalers</strong>, <strong>Print &amp; Packaging Companies</strong>,{' '}
                <strong>Digital Marketing Agencies</strong>, and <strong>Influencers</strong>.
              </p>
              <p className="text-[10px] text-slate-500 pt-1 border-t border-amber-200/60">
                💡 Dropshippers, Resellers, and Content Creators can browse, save, and directly inquire on wholesale inventory.
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full bg-[#0d47a1] hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl cursor-pointer transition shadow"
            >
              Understand &amp; Return to Feed
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {/* CATEGORY SELECTOR */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Business Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white border border-blue-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0d47a1] font-medium"
              >
                <option value="Textiles & Apparel">Textiles &amp; Apparel (Wholesale)</option>
                <option value="Organic & Natural Products">Organic &amp; Agro Wholesaler (Coconut, Spices, Coir)</option>
                <option value="Global Export Goods">Global Export Goods / Exporter</option>
                <option value="Packaging & Printing">Packaging &amp; Printing (Boxes, Labels, Cartons)</option>
                <option value="Influencer Marketing">Influencer Marketing / Creator</option>
                <option value="Digital Marketing">Digital Marketing &amp; Agency</option>
                <option value="Electronics & Gadgets">Electronics &amp; Gadgets</option>
              </select>
            </div>

            {/* ADAPTIVE CATEGORY-SPECIFIC REQUIRED INPUT FIELDS */}
            {/* 1. WHOLESALERS & ORGANIC WHOLESALERS */}
            {(role === 'wholesaler' || role === 'organic_wholesaler' || category.includes('Textiles') || category.includes('Organic') || category.includes('Electronics')) && (
              <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3 space-y-1.5">
                <label className="block text-slate-900 font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span>🏷️</span> Product Name / Material *
                  </span>
                  <span className="text-[10px] text-[#0d47a1] font-extrabold bg-blue-100 px-1.5 py-0.2 rounded">
                    Direct Searchable
                  </span>
                </label>
                <input
                  type="text"
                  required
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. Sarees, 100% Bio-Wash Cotton, Coir (தேங்காய் நார்), Copra, Turmeric, Denim"
                  className="w-full bg-white border border-blue-300 rounded-lg p-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1] font-medium"
                />
                <p className="text-[10px] text-slate-500 leading-tight">
                  💡 Searching this exact product name or material (e.g. Sarees, Cotton, Coir) will instantly filter and display your profile and listings in the search bar.
                </p>
              </div>
            )}

            {/* 2. INFLUENCERS */}
            {(role === 'influencer' || category.includes('Influencer')) && (
              <div className="bg-purple-50/80 border border-purple-200 rounded-xl p-3 space-y-1.5">
                <label className="block text-slate-900 font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span>⭐</span> Influencing / Promotion Details *
                  </span>
                  <span className="text-[10px] text-purple-700 font-extrabold bg-purple-100 px-1.5 py-0.2 rounded">
                    Direct Searchable
                  </span>
                </label>
                <input
                  type="text"
                  required
                  value={promotionDetails}
                  onChange={(e) => setPromotionDetails(e.target.value)}
                  placeholder="e.g. Cosmetics, Apparel, Lifestyle promotions, Beauty UGC, Tech Gadgets"
                  className="w-full bg-white border border-purple-300 rounded-lg p-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-700 font-medium"
                />
                <p className="text-[10px] text-slate-500 leading-tight">
                  💡 Brands searching for promotion niches (e.g. Cosmetics, Fashion, Tech) will find your creator profile immediately.
                </p>
              </div>
            )}

            {/* 3. EXPORTERS */}
            {(role === 'exporter' || category.includes('Export')) && (
              <div className="bg-sky-50/80 border border-sky-200 rounded-xl p-3 space-y-1.5">
                <label className="block text-slate-900 font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span>🌐</span> Export Products &amp; Commodities *
                  </span>
                  <span className="text-[10px] text-sky-800 font-extrabold bg-sky-100 px-1.5 py-0.2 rounded">
                    Direct Searchable
                  </span>
                </label>
                <input
                  type="text"
                  required
                  value={exportProducts}
                  onChange={(e) => setExportProducts(e.target.value)}
                  placeholder="e.g. Basmati Rice, Spices, Coir Pith, Organic Tea, Garments, Sea Freight Cargo"
                  className="w-full bg-white border border-sky-300 rounded-lg p-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1] font-medium"
                />
                <p className="text-[10px] text-slate-500 leading-tight">
                  💡 Global buyers searching for export items and commodities will match your export listings directly.
                </p>
              </div>
            )}

            {/* 4. PACKAGING & PRINT */}
            {(role === 'printing' || category.includes('Packaging') || category.includes('Printing')) && (
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 space-y-1.5">
                <label className="block text-slate-900 font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span>🖨️</span> Packaging Materials / Services *
                  </span>
                  <span className="text-[10px] text-amber-800 font-extrabold bg-amber-100 px-1.5 py-0.2 rounded">
                    Direct Searchable
                  </span>
                </label>
                <input
                  type="text"
                  required
                  value={packagingMaterials}
                  onChange={(e) => setPackagingMaterials(e.target.value)}
                  placeholder="e.g. 3-Ply Corrugated Boxes, Mono Cartons, Poly Mailers, Stand-up Pouches, Custom Print"
                  className="w-full bg-white border border-amber-300 rounded-lg p-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-700 font-medium"
                />
                <p className="text-[10px] text-slate-500 leading-tight">
                  💡 Wholesale &amp; D2C brands searching for packaging formats and printing services will match your profile.
                </p>
              </div>
            )}

            {/* 5. MARKETING & AGENCIES */}
            {(role === 'marketing' || category.includes('Marketing')) && (
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 space-y-1.5">
                <label className="block text-slate-900 font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span>📢</span> Marketing Services &amp; Niches *
                  </span>
                  <span className="text-[10px] text-emerald-800 font-extrabold bg-emerald-100 px-1.5 py-0.2 rounded">
                    Direct Searchable
                  </span>
                </label>
                <input
                  type="text"
                  required
                  value={serviceDetails}
                  onChange={(e) => setServiceDetails(e.target.value)}
                  placeholder="e.g. Meta Ads, Google Ads, ROAS Scaling, Shopify Funnel Setup, Performance Growth"
                  className="w-full bg-white border border-emerald-300 rounded-lg p-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-700 font-medium"
                />
                <p className="text-[10px] text-slate-500 leading-tight">
                  💡 Businesses searching for marketing services will match your agency profile directly.
                </p>
              </div>
            )}

            {/* GENERAL DESCRIPTION / CAPTION */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Offer Description / Specifications *
              </label>
              <textarea
                required
                rows={3}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Describe stock availability, sizes, GSM, fabric quality, GST terms, delivery lead times..."
                className="w-full bg-white border border-blue-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1]"
              />
            </div>

            {/* WHOLESALE PRICE & MOQ */}
            {isWholesalerType && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Wholesale Price *
                  </label>
                  <input
                    type="text"
                    required={isWholesalerType}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. ₹180/pc or ₹4,999/mo"
                    className="w-full bg-white border border-blue-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Minimum Order (MOQ) *
                  </label>
                  <input
                    type="text"
                    required={isWholesalerType}
                    value={moq}
                    onChange={(e) => setMoq(e.target.value)}
                    placeholder="e.g. 50 pcs or 1 Campaign"
                    className="w-full bg-white border border-blue-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1]"
                  />
                </div>
              </div>
            )}

            {/* LOCATION WITH GOOGLE MAPS AUTOCOMPLETE */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1 flex items-center justify-between">
                <span>Dispatch / Item Location *</span>
                <span className="text-[10px] text-blue-700 font-normal bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                  🗺️ Places Autocomplete
                </span>
              </label>
              <GoogleLocationInput
                value={postLocation}
                onChange={(val, details) => {
                  setPostLocation(val);
                  if (details) {
                    if (details.lat !== undefined && details.lng !== undefined) {
                      setPostLat(details.lat);
                      setPostLng(details.lng);
                    }
                    if (details.formattedAddress) {
                      setPostStoreAddress(details.formattedAddress);
                    }
                  }
                }}
                placeholder="Search dispatch city or address..."
              />
            </div>

            {/* MULTI-PHOTO UPLOAD / FILE PICKER SECTION */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-slate-700 font-semibold">
                  Product / Offer Photos (Select 1 to 5 Photos)
                </label>
                {selectedPreviews.length > 0 && (
                  <span className="text-[10px] text-[#0d47a1] font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    {selectedPreviews.length} Photo{selectedPreviews.length > 1 ? 's' : ''} Selected
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <label className="flex-1 bg-blue-50 hover:bg-blue-100 text-[#0d47a1] border border-blue-200 p-2.5 rounded-xl cursor-pointer text-center font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs">
                  <span>📸 Select Multiple Photos</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFilesChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* THUMBNAIL PREVIEWS GRID */}
              {selectedPreviews.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {selectedPreviews.map((preview, idx) => (
                    <div key={idx} className="relative group rounded-xl overflow-hidden border border-blue-200 aspect-square">
                      <img
                        src={preview}
                        alt={`Selected preview ${idx + 1}`}
                        loading="lazy"
                        decoding="async"
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
              ) : (
                <input
                  type="url"
                  value={imgUrl}
                  onChange={(e) => setImgUrl(e.target.value)}
                  placeholder="Or paste image URL (https://...)"
                  className="w-full bg-white border border-blue-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1]"
                />
              )}
            </div>

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
        )}
      </div>
    </div>
  );
};
