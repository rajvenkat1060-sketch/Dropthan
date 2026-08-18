import React, { useState, useEffect, useMemo } from 'react';
import { PostItem, UserProfile, RatingSummary, ReviewItem, UserRole } from '../types';
import { getAvatarUrl } from '../utils/avatar';
import { getOptimizedImageUrl } from '../utils/image';
import { fetchUserRatingsFromSupabase, fetchFullUserProfileByPhone } from '../lib/supabase';
import { ReviewModal } from './ReviewModal';
import { LocationMapModal } from './LocationMapModal';

interface PublicProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorName: string;
  vendorRole?: string;
  vendorPost?: PostItem | null;
  allPosts: PostItem[];
  currentUser?: UserProfile | null;
  onOpenVendorChat: (post: PostItem) => void;
  onToggleLike: (postId: string) => void;
  onToggleSave: (postId: string) => void;
}

export const PublicProfileModal: React.FC<PublicProfileModalProps> = ({
  isOpen,
  onClose,
  vendorName,
  vendorRole,
  vendorPost,
  allPosts,
  currentUser,
  onOpenVendorChat,
  onToggleLike,
  onToggleSave,
}) => {
  const [activeTab, setActiveTab] = useState<'grid' | 'feed' | 'reviews'>('grid');
  const [selectedPostDetail, setSelectedPostDetail] = useState<PostItem | null>(null);
  const [ratingSummary, setRatingSummary] = useState<RatingSummary>({
    average: 0,
    count: 0,
    reviews: [],
  });
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [vendorProfile, setVendorProfile] = useState<UserProfile | null>(null);

  // Normalize vendor identifier
  const cleanVendorName = (vendorName || vendorPost?.author || '').trim();

  // Filter all posts by this vendor
  const vendorPosts = useMemo(() => {
    if (!cleanVendorName) return [];
    const lower = cleanVendorName.toLowerCase();
    return allPosts.filter((p) => {
      const author = (p.author || '').trim().toLowerCase();
      return author === lower || author.includes(lower) || lower.includes(author);
    });
  }, [allPosts, cleanVendorName]);

  // Derive consolidated metadata from available post / profile
  const referencePost = vendorPost || (vendorPosts.length > 0 ? vendorPosts[0] : null);
  const role: UserRole = (vendorProfile?.role || referencePost?.role || vendorRole || 'wholesaler') as UserRole;
  const avatarUrl = getAvatarUrl(
    vendorProfile?.avatarUrl || referencePost?.authorAvatar,
    role
  );
  const location = vendorProfile?.storeAddress || vendorProfile?.location || referencePost?.location || 'Surat, Gujarat';
  const country = vendorProfile?.country || referencePost?.country || 'India';
  const phone = vendorProfile?.phone || referencePost?.phone || '+919876543210';
  const gstin = vendorProfile?.gstin || referencePost?.gstin;
  const iecCode = vendorProfile?.iecCode || referencePost?.iecCode;
  const instagram = vendorProfile?.instagram || vendorProfile?.instagramHandle || referencePost?.instagram;
  const website = vendorProfile?.website || vendorProfile?.websiteUrl || referencePost?.website;
  const companyName = vendorProfile?.companyName || cleanVendorName;
  const userBio =
    vendorProfile?.bio ||
    vendorProfile?.description ||
    referencePost?.bio ||
    referencePost?.description ||
    '';

  // Fetch full verified profile & real rating data from database
  useEffect(() => {
    if (!isOpen || !cleanVendorName) return;

    // Fetch real calculated ratings from Supabase
    fetchUserRatingsFromSupabase(cleanVendorName, currentUser?.phone || currentUser?.id).then(
      (summary) => {
        if (summary) {
          setRatingSummary(summary);
        }
      }
    );

    // If reference post has phone, fetch full user profile
    if (referencePost?.phone) {
      fetchFullUserProfileByPhone(referencePost.phone).then((prof) => {
        if (prof) setVendorProfile(prof);
      });
    }
  }, [isOpen, cleanVendorName, referencePost?.phone, currentUser]);

  if (!isOpen) return null;

  const handleCopyPhone = () => {
    if (phone) {
      navigator.clipboard.writeText(phone);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  const handleShareProfile = async () => {
    const shareText = `Check out ${companyName} (${role.toUpperCase()}) on Dropthan B2B: ${window.location.href}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${companyName} - Dropthan B2B Profile`,
          text: shareText,
          url: window.location.href,
        });
      } catch (e) {}
    } else {
      navigator.clipboard.writeText(shareText);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  const handleCall = () => {
    window.location.href = `tel:${phone.replace(/\s+/g, '')}`;
  };

  const handleWhatsApp = () => {
    const cleanNum = phone.replace(/\D/g, '');
    const msg = encodeURIComponent(
      `Hello ${companyName}, I saw your verified B2B wholesale profile on Dropthan and would like to inquire about your product catalog & price tiers.`
    );
    window.open(`https://wa.me/${cleanNum}?text=${msg}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] my-auto">
        {/* TOP NAVIGATION HEADER */}
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center space-x-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-700 transition cursor-pointer text-base font-bold flex items-center justify-center"
              title="Back to Feed"
            >
              ←
            </button>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black text-slate-900 truncate flex items-center gap-1.5">
                <span>{companyName}</span>
                {role === 'organic_wholesaler' ? (
                  <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 text-[9px] font-black px-1.5 py-0.2 rounded-md">
                    🌱 Organic
                  </span>
                ) : role === 'exporter' ? (
                  <span className="text-blue-700 bg-blue-50 border border-blue-200 text-[9px] font-black px-1.5 py-0.2 rounded-md">
                    🌐 IEC Exporter
                  </span>
                ) : (
                  <span className="text-[#0d47a1] bg-blue-50 border border-blue-200 text-[9px] font-black px-1.5 py-0.2 rounded-md">
                    ✓ Verified B2B
                  </span>
                )}
              </h2>
              <p className="text-[10px] text-slate-500 font-medium">
                @{cleanVendorName.toLowerCase().replace(/[^a-z0-9]/g, '_')} • Verified Supplier
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={handleShareProfile}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer text-xs font-bold flex items-center gap-1"
              title="Share Public Profile"
            >
              <span>📤</span>
              <span className="hidden sm:inline text-[11px]">{copiedShare ? 'Copied!' : 'Share'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center font-bold text-xs transition cursor-pointer"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* SCROLLABLE PROFILE CONTENT */}
        <div className="flex-1 overflow-y-auto">
          {/* PROFILE BIO HEADER */}
          <div className="p-4 sm:p-6 bg-gradient-to-b from-slate-50 to-white border-b border-slate-200 space-y-4">
            <div className="flex items-center space-x-4 sm:space-x-6">
              {/* DP WITH GRADIENT RING */}
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full p-[2.5px] bg-gradient-to-tr from-amber-400 via-rose-500 to-[#0d47a1] shadow-md">
                  <img
                    src={avatarUrl}
                    alt={companyName}
                    className="w-full h-full rounded-full object-cover bg-white border-2 border-white"
                  />
                </div>
                {gstin && (
                  <span
                    className="absolute -bottom-1 -right-1 bg-[#0d47a1] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full border-2 border-white shadow-xs"
                    title="Verified GST Business"
                  >
                    ✓ GST
                  </span>
                )}
              </div>

              {/* 3-COLUMN METRICS BAR */}
              <div className="flex-1 grid grid-cols-3 gap-2 text-center">
                <div className="bg-white border border-slate-200 rounded-2xl p-2 sm:p-2.5 shadow-2xs">
                  <span className="block text-base sm:text-lg font-black text-slate-900">
                    {vendorPosts.length > 0 ? vendorPosts.length : 1}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-500">
                    Offers / Posts
                  </span>
                </div>

                <div
                  onClick={() => setActiveTab('reviews')}
                  className="bg-white border border-amber-200 rounded-2xl p-2 sm:p-2.5 shadow-2xs cursor-pointer hover:bg-amber-50/60 transition"
                  title="View Reviews"
                >
                  <span className="block text-base sm:text-lg font-black text-amber-900 flex items-center justify-center gap-0.5">
                    <span>{ratingSummary.count > 0 ? ratingSummary.average.toFixed(1) : '0.0'}</span>
                    <span className="text-amber-500 text-xs sm:text-sm">★</span>
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-bold text-amber-800">
                    {ratingSummary.count > 0 ? `Rating (${ratingSummary.count})` : 'No ratings'}
                  </span>
                </div>

                <div className="bg-white border border-blue-200 rounded-2xl p-2 sm:p-2.5 shadow-2xs">
                  <span className="block text-xs sm:text-sm font-black text-[#0d47a1] truncate uppercase">
                    {role.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-bold text-blue-800">
                    Business Tier
                  </span>
                </div>
              </div>
            </div>

            {/* NAME, ROLE & DETAILS */}
            <div className="space-y-2 pt-1 text-xs sm:text-sm">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <span>{companyName}</span>
                  <span className="text-[11px] font-semibold text-slate-500 capitalize">
                    • {role.replace('_', ' ')}
                  </span>
                </h3>
              </div>

              {/* METADATA PILLS: LOCATION & PHONE & GST */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {/* LOCATION */}
                <button
                  type="button"
                  onClick={() => setIsMapModalOpen(true)}
                  className="inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-[#0d47a1] border border-blue-200 px-2.5 py-1 rounded-xl font-bold text-[11px] transition cursor-pointer shadow-2xs active:scale-95"
                >
                  <span>📍</span>
                  <span>{location}, {country}</span>
                  <span className="text-[9px] bg-blue-200/70 text-[#0d47a1] px-1 rounded">Map 🗺️</span>
                </button>

                {/* PHONE */}
                <button
                  type="button"
                  onClick={handleCopyPhone}
                  className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 px-2.5 py-1 rounded-xl font-bold text-[11px] transition cursor-pointer"
                  title="Click to copy phone number"
                >
                  <span>📞</span>
                  <span>{phone}</span>
                  <span className="text-[9px] text-slate-500">{copiedPhone ? '✓ Copied' : 'Copy'}</span>
                </button>

                {/* GSTIN / IEC */}
                {gstin && (
                  <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-1 rounded-xl font-bold text-[11px]">
                    <span>🛡️</span>
                    <span>GST: {gstin}</span>
                  </span>
                )}
                {iecCode && (
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-xl font-bold text-[11px]">
                    <span>🌐</span>
                    <span>IEC: {iecCode}</span>
                  </span>
                )}
              </div>

              {/* INSTAGRAM-STYLE BIO / DESCRIPTION (Placed right below name, role, phone, and location) */}
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-2.5 text-xs text-slate-700 leading-relaxed">
                <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wider mb-0.5">
                  <span>📝</span>
                  <span>Business Bio & Description</span>
                </div>
                <p className="font-medium text-slate-800 whitespace-pre-line">
                  {userBio ||
                    referencePost?.caption?.slice(0, 180) ||
                    `Verified supplier and manufacturer in ${location}. Contact directly for wholesale catalogs, sample packs, and GST invoices.`}
                </p>
              </div>

              {/* EXTERNAL LINKS: SOCIAL & WEBSITE */}
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {instagram && (
                  <a
                    href={instagram.startsWith('http') ? instagram : `https://${instagram.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-xl transition shadow-2xs"
                    title="Visit Social Profile"
                  >
                    <span>🔗</span>
                    <span>{instagram.startsWith('@') ? instagram : `@${instagram}`}</span>
                    <span className="text-[9px]">↗</span>
                  </a>
                )}

                {website && (
                  <a
                    href={website.startsWith('http') ? website : `https://${website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#0d47a1] bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-xl transition shadow-2xs"
                  >
                    <span>🌐</span>
                    <span className="underline">{website.replace(/^https?:\/\//i, '')}</span>
                    <span className="text-[9px]">↗</span>
                  </a>
                )}
              </div>
            </div>

            {/* INSTAGRAM ACTION BUTTONS BAR */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (referencePost) onOpenVendorChat(referencePost);
                }}
                className="bg-[#0d47a1] hover:bg-blue-800 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5 active:scale-95"
              >
                <span>💬</span>
                <span>Inquire & Chat</span>
              </button>

              <button
                type="button"
                onClick={handleWhatsApp}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5 active:scale-95"
              >
                <span>💬</span>
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleCall}
                className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold py-2.5 px-3 rounded-xl transition cursor-pointer shadow-2xs flex items-center justify-center gap-1.5 active:scale-95"
              >
                <span>📞</span>
                <span>Call Vendor</span>
              </button>

              <button
                type="button"
                onClick={() => setIsReviewModalOpen(true)}
                className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold py-2.5 px-3 rounded-xl transition cursor-pointer shadow-2xs flex items-center justify-center gap-1.5 active:scale-95"
              >
                <span>⭐</span>
                <span>Rate & Review</span>
              </button>
            </div>
          </div>

          {/* PROFILE TABS (GRID / FEED / REVIEWS) */}
          <div className="border-b border-slate-200 bg-white sticky top-0 z-10 flex items-center justify-around text-xs font-bold text-slate-600">
            <button
              type="button"
              onClick={() => {
                setActiveTab('grid');
                setSelectedPostDetail(null);
              }}
              className={`flex-1 py-3 flex items-center justify-center gap-1.5 border-b-2 transition cursor-pointer ${
                activeTab === 'grid'
                  ? 'border-[#0d47a1] text-[#0d47a1] bg-blue-50/40'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              <span>🔲</span>
              <span>Grid Showcase ({vendorPosts.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('feed');
                setSelectedPostDetail(null);
              }}
              className={`flex-1 py-3 flex items-center justify-center gap-1.5 border-b-2 transition cursor-pointer ${
                activeTab === 'feed'
                  ? 'border-[#0d47a1] text-[#0d47a1] bg-blue-50/40'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              <span>📜</span>
              <span>Detailed Feed</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('reviews')}
              className={`flex-1 py-3 flex items-center justify-center gap-1.5 border-b-2 transition cursor-pointer ${
                activeTab === 'reviews'
                  ? 'border-[#0d47a1] text-[#0d47a1] bg-blue-50/40'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              <span>⭐</span>
              <span>Reviews ({ratingSummary.count})</span>
            </button>
          </div>

          {/* TAB 1: 3-COLUMN SHOWCASE GRID */}
          {activeTab === 'grid' && (
            <div className="p-3">
              {vendorPosts.length === 0 ? (
                <div className="p-8 text-center text-slate-500 space-y-1">
                  <p className="font-bold text-xs">No media uploaded yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  {vendorPosts.map((post) => {
                    const previewImg =
                      (post.images && post.images.length > 0 ? post.images[0] : post.img) ||
                      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80';

                    return (
                      <div
                        key={post.id}
                        onClick={() => {
                          setSelectedPostDetail(post);
                          setActiveTab('feed');
                        }}
                        className="relative aspect-square bg-slate-100 rounded-xl overflow-hidden cursor-pointer group shadow-2xs border border-slate-200"
                      >
                        <img
                          src={getOptimizedImageUrl(previewImg, 400)}
                          alt={post.caption || 'Product'}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        {post.images && post.images.length > 1 && (
                          <span className="absolute top-1.5 right-1.5 bg-slate-900/80 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md">
                            📷 {post.images.length}
                          </span>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition p-2 flex flex-col justify-end text-white">
                          <span className="text-[11px] font-black">{post.price}</span>
                          <span className="text-[9px] text-slate-300 font-medium truncate">{post.moq}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DETAILED FEED LIST */}
          {activeTab === 'feed' && (
            <div className="p-3 sm:p-4 space-y-4">
              {vendorPosts.length === 0 ? (
                <div className="p-8 text-center text-slate-500 space-y-1">
                  <p className="font-bold text-xs">No posts available</p>
                </div>
              ) : (
                vendorPosts.map((post) => (
                  <div
                    key={post.id}
                    className={`bg-white border rounded-2xl p-3.5 space-y-3 shadow-sm transition ${
                      selectedPostDetail?.id === post.id ? 'border-[#0d47a1] ring-2 ring-blue-200' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <img
                          src={avatarUrl}
                          alt={companyName}
                          className="w-7 h-7 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{companyName}</h4>
                          <span className="text-[10px] text-slate-500">{location}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-[#0d47a1] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        {post.price}
                      </span>
                    </div>

                    {((post.images && post.images.length > 0) || post.img) && (
                      <div className="rounded-xl overflow-hidden border border-slate-200">
                        <img
                          src={
                            (post.images && post.images.length > 0 ? post.images[0] : post.img) ||
                            'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80'
                          }
                          alt={post.caption}
                          className="w-full h-56 sm:h-72 object-cover"
                        />
                      </div>
                    )}

                    <p className="text-xs text-slate-700 leading-relaxed">{post.caption}</p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => onToggleLike(post.id)}
                          className={`flex items-center space-x-1 text-xs px-2.5 py-1 rounded-lg font-bold border transition ${
                            post.isLiked
                              ? 'bg-rose-50 text-rose-600 border-rose-200'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          <span>{post.isLiked ? '❤️' : '🤍'}</span>
                          <span>{post.likesCount || 0}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleSave(post.id)}
                          className={`flex items-center space-x-1 text-xs px-2.5 py-1 rounded-lg font-bold border transition ${
                            post.isSaved
                              ? 'bg-blue-50 text-[#0d47a1] border-blue-200'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          <span>{post.isSaved ? '🔖' : '📑'}</span>
                          <span>{post.isSaved ? 'Saved' : 'Save'}</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenVendorChat(post);
                        }}
                        className="bg-[#0d47a1] hover:bg-blue-800 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-2xs transition active:scale-95"
                      >
                        💬 Chat & MOQ
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: COMMUNITY RATINGS & REVIEWS */}
          {activeTab === 'reviews' && (
            <div className="p-4 space-y-4">
              {/* SUMMARY HEADER */}
              <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-black text-amber-900">
                      {ratingSummary.count > 0 ? ratingSummary.average.toFixed(1) : '0.0'}
                    </span>
                    <div className="flex text-amber-500 text-sm">
                      {'★'.repeat(Math.round(ratingSummary.average || 0))}
                      {'☆'.repeat(5 - Math.round(ratingSummary.average || 0))}
                    </div>
                  </div>
                  <p className="text-xs text-amber-800 font-semibold">
                    {ratingSummary.count > 0
                      ? `Based on ${ratingSummary.count} verified B2B buyer review${ratingSummary.count === 1 ? '' : 's'}`
                      : 'No buyer reviews yet'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-2xs transition active:scale-95"
                >
                  ⭐ Write Review
                </button>
              </div>

              {/* REVIEWS LIST */}
              <div className="space-y-3">
                {ratingSummary.reviews && ratingSummary.reviews.length > 0 ? (
                  ratingSummary.reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{rev.reviewer_name || rev.reviewerName || 'Verified Trader'}</span>
                        <div className="flex text-amber-500 text-xs">
                          {'★'.repeat(Math.min(5, Math.max(1, rev.rating_score || rev.ratingScore || 5)))}
                        </div>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">{rev.review_text || rev.reviewText || 'No comment provided.'}</p>
                      <span className="text-[10px] text-slate-400 block pt-0.5">
                        {rev.created_at || rev.createdAt
                          ? new Date(rev.created_at || rev.createdAt!).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'Recent'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-slate-500 text-xs">
                    No reviews yet. Be the first to rate this vendor!
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RATING & REVIEW MODAL */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        targetId={cleanVendorName}
        targetName={companyName}
        targetRole={role}
        currentUser={currentUser || null}
      />

      {/* GOOGLE MAPS LOCATION MODAL */}
      <LocationMapModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        locationName={`${location}, ${country}`}
        authorName={companyName}
      />
    </div>
  );
};
