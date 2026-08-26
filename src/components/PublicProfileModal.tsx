import React, { useState, useEffect, useMemo } from 'react';
import { PostItem, UserProfile, RatingSummary, ReviewItem, UserRole } from '../types';
import { getAvatarUrl } from '../utils/avatar';
import { getOptimizedImageUrl, getPostImageUrl, getPostImagesList } from '../utils/image';
import { fetchUserRatingsFromSupabase, fetchFullUserProfile, fetchPostsByVendor } from '../lib/supabase';
import { ReviewModal } from './ReviewModal';
import { LocationMapModal } from './LocationMapModal';
import { ImageCarousel } from './ImageCarousel';
import { Instagram } from 'lucide-react';

interface PublicProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorName: string;
  vendorRole?: string;
  vendorPost?: PostItem | null;
  allPosts: PostItem[];
  currentUser?: UserProfile | null;
  onToggleLike: (postId: string) => void;
  onToggleSave: (postId: string) => void;
}

const GENERIC_AUTHOR_NAMES = new Set([
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

export const PublicProfileModal: React.FC<PublicProfileModalProps> = ({
  isOpen,
  onClose,
  vendorName,
  vendorRole,
  vendorPost,
  allPosts,
  currentUser,
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
  const [fetchedVendorPosts, setFetchedVendorPosts] = useState<PostItem[]>([]);

  // Normalize vendor identifier
  const cleanVendorName = (vendorName || vendorPost?.author || '').trim();

  // Target User Identifiers
  const targetUserId =
    vendorProfile?.id ||
    (vendorPost as any)?.user_id ||
    (vendorPost as any)?.userId ||
    (vendorPost as any)?.vendor_id ||
    undefined;

  const targetPhoneStr =
    vendorProfile?.phone ||
    (vendorPost?.phone && !vendorPost.phone.includes('9876543210') ? vendorPost.phone : undefined) ||
    (cleanVendorName.match(/^\+?\d[\d\s-]{6,}$/) && !cleanVendorName.includes('9876543210') ? cleanVendorName : undefined) ||
    '';

  // Strictly filter posts created by this specific profile/vendor (No global or other user leakage)
  const vendorPosts = useMemo(() => {
    // 1. Build set of exact target author names (case-insensitive, non-generic)
    const validTargetNames = new Set<string>();
    const addValidName = (name?: string) => {
      if (!name) return;
      const lower = name.toLowerCase().trim();
      if (lower && !GENERIC_AUTHOR_NAMES.has(lower)) {
        validTargetNames.add(lower);
      }
    };

    if (!cleanVendorName.match(/^\+?\d+$/)) addValidName(cleanVendorName);
    addValidName(vendorProfile?.companyName);
    addValidName(vendorProfile?.displayName);
    addValidName(vendorProfile?.fullName);
    if (vendorPost?.author && !vendorPost.id.startsWith('vendor-') && !vendorPost.id.startsWith('temp-')) {
      addValidName(vendorPost.author);
    }

    // 2. Build set of exact target phone digits (excluding dummy placeholders)
    const targetPhones: string[] = [];
    if (targetPhoneStr && !targetPhoneStr.includes('9876543210')) {
      targetPhones.push(targetPhoneStr.trim());
    }

    const targetPhoneDigits = targetPhones
      .map((p) => p.replace(/\D/g, ''))
      .filter((d) => d.length >= 7);

    const merged = new Map<string, PostItem>();

    const isStrictMatch = (p: PostItem): boolean => {
      // Exclude pseudo-posts that were generated just to open supplier profiles
      if (p.id && (p.id.startsWith('vendor-') || p.id.startsWith('temp-'))) {
        return false;
      }

      // Check user ID match
      const postUserId = (p as any).user_id || (p as any).userId || (p as any).vendor_id;
      if (targetUserId && postUserId && (postUserId === targetUserId || String(postUserId) === String(targetUserId))) {
        return true;
      }

      // Check phone match (exact last 10 digits match)
      if (targetPhoneDigits.length > 0 && p.phone && !p.phone.includes('9876543210')) {
        const postDigits = p.phone.replace(/\D/g, '');
        if (postDigits.length >= 7) {
          const matchPhone = targetPhoneDigits.some(
            (td) => td === postDigits || td.slice(-10) === postDigits.slice(-10)
          );
          if (matchPhone) return true;
        }
      }

      // Check exact author name match (EXACT match only, never loose substring, never generic)
      if (p.author && validTargetNames.size > 0) {
        const pAuthorLower = p.author.toLowerCase().trim();
        if (!GENERIC_AUTHOR_NAMES.has(pAuthorLower) && validTargetNames.has(pAuthorLower)) {
          return true;
        }
      }

      return false;
    };

    // Filter allPosts strictly
    allPosts.forEach((p) => {
      if (isStrictMatch(p)) {
        merged.set(String(p.id), p);
      }
    });

    // Also include strictly matched posts returned from live Supabase query
    fetchedVendorPosts.forEach((p) => {
      if (isStrictMatch(p)) {
        merged.set(String(p.id), p);
      }
    });

    return Array.from(merged.values()).sort((a, b) => {
      const tA = new Date(a.createdAt || a.created_at || 0).getTime();
      const tB = new Date(b.createdAt || b.created_at || 0).getTime();
      return tB - tA;
    });
  }, [allPosts, cleanVendorName, fetchedVendorPosts, vendorProfile, vendorPost, targetUserId, targetPhoneStr]);

  // Derive consolidated metadata from available post / profile
  const referencePost = (vendorPost && !vendorPost.id.startsWith('vendor-')) ? vendorPost : (vendorPosts.length > 0 ? vendorPosts[0] : null);
  const role: UserRole = (vendorProfile?.role || referencePost?.role || vendorPost?.role || vendorRole || 'wholesaler') as UserRole;
  const avatarUrl = getAvatarUrl(
    vendorProfile?.avatarUrl || referencePost?.authorAvatar || vendorPost?.authorAvatar || vendorPost?.img,
    role
  );
  const location =
    vendorProfile?.storeAddress ||
    vendorProfile?.location ||
    referencePost?.storeAddress ||
    referencePost?.location ||
    (vendorPost?.location && !vendorPost.id.startsWith('vendor-') ? vendorPost.location : undefined) ||
    'India';
  const country = vendorProfile?.country || referencePost?.country || vendorPost?.country || 'India';
  const phone =
    vendorProfile?.phone ||
    (referencePost?.phone && !referencePost.phone.includes('9876543210') ? referencePost.phone : undefined) ||
    (vendorPost?.phone && !vendorPost.phone.includes('9876543210') ? vendorPost.phone : undefined) ||
    '';
  const gstin = vendorProfile?.gstin || referencePost?.gstin || vendorPost?.gstin;
  const iecCode = vendorProfile?.iecCode || referencePost?.iecCode || vendorPost?.iecCode;
  const instagram = vendorProfile?.instagram || vendorProfile?.instagramHandle || referencePost?.instagram || vendorPost?.instagram;
  const website = vendorProfile?.website || vendorProfile?.websiteUrl || referencePost?.website || vendorPost?.website;
  const companyName =
    vendorProfile?.displayName ||
    vendorProfile?.fullName ||
    vendorProfile?.companyName ||
    (vendorPost?.author && !GENERIC_AUTHOR_NAMES.has(vendorPost.author.toLowerCase().trim()) ? vendorPost.author : undefined) ||
    (cleanVendorName && !GENERIC_AUTHOR_NAMES.has(cleanVendorName.toLowerCase().trim()) ? cleanVendorName : undefined) ||
    (phone ? `Member (${phone.slice(-4)})` : 'Verified Supplier');
  const productName = vendorProfile?.productName || vendorProfile?.materialDetails || referencePost?.productName || referencePost?.materialDetails || vendorPost?.productName;
  const promotionDetails = vendorProfile?.promotionDetails || referencePost?.promotionDetails || vendorPost?.promotionDetails;
  const exportProducts = vendorProfile?.exportProducts || referencePost?.exportProducts || vendorPost?.exportProducts;
  const packagingMaterials = vendorProfile?.packagingMaterials || referencePost?.packagingMaterials || vendorPost?.packagingMaterials;
  const serviceDetails = vendorProfile?.serviceDetails || referencePost?.serviceDetails || vendorPost?.serviceDetails;

  const userBio =
    vendorProfile?.bio ||
    vendorProfile?.description ||
    referencePost?.bio ||
    referencePost?.description ||
    (vendorPost?.caption && !vendorPost.id.startsWith('vendor-') ? vendorPost.caption : '') ||
    '';

  const isApproved = vendorProfile ? (vendorProfile.status === 'Active' || vendorProfile.is_gst_approved === true) : Boolean(referencePost?.gstin || referencePost?.iecCode || gstin || iecCode);
  const isExporter = role === 'exporter' || Boolean(iecCode);
  const isOrganic = role === 'organic_wholesaler';

  // Fetch full verified profile & real rating data from database with strict state reset
  useEffect(() => {
    if (!isOpen) {
      setFetchedVendorPosts([]);
      setVendorProfile(null);
      setSelectedPostDetail(null);
      setRatingSummary({ average: 0, count: 0, reviews: [] });
      return;
    }

    let isCancelled = false;

    // IMMEDIATE SYNCHRONOUS STATE RESET TO PREVENT OLD PROFILE DATA BLEEDING
    setFetchedVendorPosts([]);
    setVendorProfile(null);
    setSelectedPostDetail(null);
    setActiveTab('grid');
    setRatingSummary({ average: 0, count: 0, reviews: [] });
    setCopiedPhone(false);
    setCopiedShare(false);

    const targetLookup = {
      id: (vendorPost as any)?.user_id || (vendorPost as any)?.userId || (vendorPost as any)?.vendor_id || undefined,
      userId: (vendorPost as any)?.user_id || (vendorPost as any)?.userId || undefined,
      phone: (vendorPost?.phone && !vendorPost.phone.includes('9876543210') ? vendorPost.phone : undefined) || (cleanVendorName.match(/^\+?\d[\d\s-]{6,}$/) ? cleanVendorName : undefined),
      author: cleanVendorName,
      displayName: vendorPost?.author || cleanVendorName,
      companyName: vendorPost?.author || cleanVendorName,
    };

    const ratingKey = targetLookup.id || targetLookup.phone || cleanVendorName;
    if (ratingKey) {
      fetchUserRatingsFromSupabase(ratingKey, currentUser?.phone || currentUser?.id).then(
        (summary) => {
          if (!isCancelled && summary) {
            setRatingSummary(summary);
          }
        }
      );
    }

    const loadPostsForVendor = (targetProf?: UserProfile | null) => {
      const postsTargetIdentifier = {
        id: targetProf?.id || targetLookup.id,
        phone: targetProf?.phone || targetLookup.phone,
        displayName: targetProf?.displayName || targetLookup.displayName,
        companyName: targetProf?.companyName || targetLookup.companyName,
        fullName: targetProf?.fullName || undefined,
        author: cleanVendorName,
      };

      fetchPostsByVendor(postsTargetIdentifier).then((posts) => {
        if (!isCancelled) {
          setFetchedVendorPosts(posts || []);
        }
      });
    };

    // Fetch complete user profile from Supabase using user_id, phone, or name
    fetchFullUserProfile(targetLookup).then((prof) => {
      if (!isCancelled) {
        if (prof) {
          setVendorProfile(prof);
          loadPostsForVendor(prof);
        } else {
          loadPostsForVendor(null);
        }
      }
    });

    // Also trigger initial posts query
    loadPostsForVendor(null);

    const handlePostsUpdated = () => {
      if (!isCancelled) {
        loadPostsForVendor(vendorProfile);
      }
    };
    window.addEventListener('dropthan_posts_updated', handlePostsUpdated);

    return () => {
      isCancelled = true;
      window.removeEventListener('dropthan_posts_updated', handlePostsUpdated);
    };
  }, [isOpen, cleanVendorName, vendorPost?.id, (vendorPost as any)?.user_id, (vendorPost as any)?.userId, vendorPost?.phone, currentUser]);

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
                {isOrganic ? (
                  <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 text-[9px] font-black px-1.5 py-0.2 rounded-md">
                    🌱 Organic
                  </span>
                ) : isExporter ? (
                  <span className="text-blue-700 bg-blue-50 border border-blue-200 text-[9px] font-black px-1.5 py-0.2 rounded-md">
                    🌐 {isApproved ? 'Verified Exporter' : 'Exporter'}
                  </span>
                ) : isApproved ? (
                  <span className="text-[#0d47a1] bg-blue-50 border border-blue-200 text-[9px] font-black px-1.5 py-0.2 rounded-md">
                    ✓ Verified B2B
                  </span>
                ) : null}
              </h2>
              <p className="text-[10px] text-slate-500 font-medium">
                @{cleanVendorName.toLowerCase().replace(/[^a-z0-9]/g, '_')} • {isApproved ? 'Verified B2B Member' : 'B2B Member'}
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
                {isApproved && (gstin || isOrganic || isExporter) && (
                  <span
                    className="absolute -bottom-1 -right-1 bg-[#0d47a1] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full border-2 border-white shadow-xs"
                    title="GST Approved & Verified B2B Member"
                  >
                    ✓
                  </span>
                )}
              </div>

              {/* 3-COLUMN METRICS BAR */}
              <div className="flex-1 grid grid-cols-3 gap-2 text-center">
                <div className="bg-white border border-slate-200 rounded-2xl p-2 sm:p-2.5 shadow-2xs">
                  <span className="block text-base sm:text-lg font-black text-slate-900">
                    {vendorPosts.length}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-500">
                    {vendorPosts.length === 1 ? 'Post' : 'Posts'}
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

                {/* GST APPROVED / B2B VERIFIED BADGE (Raw GST number is strictly kept private for Admin review) */}
                {isApproved && (gstin || role === 'wholesaler' || role === 'printing' || role === 'marketing') && (
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-xl font-bold text-[11px] shadow-2xs">
                    <span>🛡️</span>
                    <span>GST Approved</span>
                  </span>
                )}
                {isApproved && isExporter && (
                  <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-xl font-bold text-[11px] shadow-2xs">
                    <span>🌐</span>
                    <span>Verified Exporter</span>
                  </span>
                )}
                {isOrganic && (
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-xl font-bold text-[11px] shadow-2xs">
                    <span>🌱</span>
                    <span>Organic Certified</span>
                  </span>
                )}
              </div>

              {/* CATEGORY-SPECIFIC DETAILS PILLS */}
              {(productName || promotionDetails || exportProducts || packagingMaterials || serviceDetails) && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {productName && (
                    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-900 border border-blue-200 px-2.5 py-1 rounded-xl font-bold text-[11px]">
                      <span>🏷️ Products/Materials:</span>
                      <span className="text-blue-700">{productName}</span>
                    </span>
                  )}
                  {promotionDetails && (
                    <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-900 border border-purple-200 px-2.5 py-1 rounded-xl font-bold text-[11px]">
                      <span>⭐ Influencing Niches:</span>
                      <span className="text-purple-700">{promotionDetails}</span>
                    </span>
                  )}
                  {exportProducts && (
                    <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-900 border border-sky-200 px-2.5 py-1 rounded-xl font-bold text-[11px]">
                      <span>🌐 Export Commodities:</span>
                      <span className="text-sky-700">{exportProducts}</span>
                    </span>
                  )}
                  {packagingMaterials && (
                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-xl font-bold text-[11px]">
                      <span>🖨️ Packaging Services:</span>
                      <span className="text-amber-700">{packagingMaterials}</span>
                    </span>
                  )}
                  {serviceDetails && (
                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-900 border border-emerald-200 px-2.5 py-1 rounded-xl font-bold text-[11px]">
                      <span>📢 Agency Services:</span>
                      <span className="text-emerald-700">{serviceDetails}</span>
                    </span>
                  )}
                </div>
              )}

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
                  (() => {
                    const cleanHandle = instagram
                      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
                      .replace(/^@/, '')
                      .replace(/\/$/, '');
                    const instaUrl = `https://www.instagram.com/${cleanHandle}`;

                    return (
                      <a
                        href={instaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-pink-700 bg-pink-50 hover:bg-pink-100 border border-pink-200 px-3 py-1.5 rounded-xl transition shadow-2xs active:scale-95 cursor-pointer"
                        title={`Visit Instagram: @${cleanHandle}`}
                      >
                        <Instagram className="w-3.5 h-3.5 text-pink-600 flex-shrink-0" />
                        <span>@{cleanHandle}</span>
                        <span className="text-[9px] font-extrabold">↗</span>
                      </a>
                    );
                  })()
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
                onClick={handleShareProfile}
                className="bg-blue-50 hover:bg-blue-100 text-[#0d47a1] border border-blue-200 text-xs font-bold py-2.5 px-3 rounded-xl transition cursor-pointer shadow-2xs flex items-center justify-center gap-1.5 active:scale-95"
              >
                <span>{copiedShare ? '✓' : '🔗'}</span>
                <span>{copiedShare ? 'Copied' : 'Share Profile'}</span>
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
                <div className="py-12 px-4 text-center text-slate-500 space-y-2">
                  <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-2xl text-slate-400">
                    📷
                  </div>
                  <p className="font-bold text-sm text-slate-800">No media uploaded yet</p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    When {companyName} uploads offers or photos, they will appear here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  {vendorPosts.map((post, gIdx) => {
                    const postImages = getPostImagesList(post);
                    const previewImg = getPostImageUrl(post);

                    return (
                      <div
                        key={`pub-grid-${post.id || gIdx}`}
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
                          decoding="async"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (!target.src.includes('unsplash.com')) {
                              target.src = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&auto=format&fit=crop&q=80';
                            }
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300 bg-slate-100"
                        />
                        {postImages.length > 1 && (
                          <span className="absolute top-1.5 right-1.5 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-xs">
                            📷 {postImages.length}
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
                <div className="py-12 px-4 text-center text-slate-500 space-y-2">
                  <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-2xl text-slate-400">
                    📜
                  </div>
                  <p className="font-bold text-sm text-slate-800">No posts available</p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    No detailed wholesale listings uploaded yet by this member.
                  </p>
                </div>
              ) : (
                vendorPosts.map((post, fIdx) => {
                  const postImages = getPostImagesList(post);
                  const primaryImg = getPostImageUrl(post);
                  const displayImages = postImages.length > 0 ? postImages : [primaryImg];

                  return (
                    <div
                      key={`pub-feed-${post.id || fIdx}`}
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

                      <div className="rounded-xl overflow-hidden border border-slate-200">
                        <ImageCarousel
                          images={displayImages}
                          fallbackImg={primaryImg}
                          alt={post.caption || 'Product offer'}
                          onDoubleTap={() => onToggleLike(post.id)}
                        />
                      </div>

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

                        {post.phone && (
                          <a
                            href={`https://wa.me/${post.phone.replace(/\D/g, '').length === 10 ? `91${post.phone.replace(/\D/g, '')}` : post.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${companyName}, I'm inquiring about ${post.title || post.product_name || post.caption || 'your post'} on Dropthan.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-2xs transition active:scale-95 flex items-center gap-1"
                          >
                            <span>💬</span>
                            <span>WhatsApp</span>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
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
                  ratingSummary.reviews.map((rev, rIdx) => (
                    <div
                      key={`public-review-${rev.id || rIdx}`}
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
