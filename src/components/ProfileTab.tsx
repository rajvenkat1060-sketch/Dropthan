import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, PostItem, RatingSummary, ReviewItem } from '../types';
import { getAvatarUrl } from '../utils/avatar';
import { getOptimizedImageUrl, getPostImageUrl, getPostImagesList } from '../utils/image';
import { uploadAvatarToSupabase, fetchUserRatingsFromSupabase, saveUserRatingToSupabase, updateUserWebsiteInSupabase, saveUserProfileToSupabase } from '../lib/supabase';
import { GoogleLocationInput } from './GoogleLocationInput';
import { Instagram } from 'lucide-react';

interface ProfileTabProps {
  user: UserProfile | null;
  userPosts: PostItem[];
  savedPosts: PostItem[];
  onLogout: () => void;
  onOpenCreatePost: () => void;
  onOpenVendorChat: (post: PostItem) => void;
  onToggleSave: (postId: string) => void;
  onToggleLike: (postId: string) => void;
  onUpdateAvatar?: (avatarUrl: string) => void;
  onSelectTab?: (tab: string) => void;
  onOpenAdmin?: () => void;
  onEditDetails?: () => void;
  onUpdateProfile?: (updatedUser: UserProfile) => void;
}

const ITEMS_PER_PAGE = 6;

export const ProfileTab: React.FC<ProfileTabProps> = ({
  user,
  userPosts,
  savedPosts,
  onLogout,
  onOpenCreatePost,
  onOpenVendorChat,
  onToggleSave,
  onToggleLike,
  onUpdateAvatar,
  onSelectTab,
  onOpenAdmin,
  onEditDetails,
  onUpdateProfile,
}) => {
  const [activeProfileTab, setActiveProfileTab] = useState<'myPosts' | 'saved'>('myPosts');
  const [visiblePostsCount, setVisiblePostsCount] = useState<number>(ITEMS_PER_PAGE);
  const [visibleSavedCount, setVisibleSavedCount] = useState<number>(ITEMS_PER_PAGE);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditingWebsiteModal, setIsEditingWebsiteModal] = useState(false);
  const [websiteInput, setWebsiteInput] = useState<string>(user?.website || user?.websiteUrl || '');
  const [isSavingWebsite, setIsSavingWebsite] = useState(false);
  const [websiteSuccessMsg, setWebsiteSuccessMsg] = useState('');

  // Full Edit Business Profile Modal States
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [editCompanyName, setEditCompanyName] = useState(user?.companyName || user?.displayName || '');
  const [editFullName, setEditFullName] = useState(user?.fullName || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editBio, setEditBio] = useState(user?.bio || user?.description || '');
  const [editLocation, setEditLocation] = useState(user?.location || '');
  const [editStoreAddress, setEditStoreAddress] = useState(user?.storeAddress || '');
  const [editLat, setEditLat] = useState<number | undefined>(user?.lat);
  const [editLng, setEditLng] = useState<number | undefined>(user?.lng);
  const [editGstin, setEditGstin] = useState(user?.gstin || '');
  const [editIecCode, setEditIecCode] = useState(user?.iecCode || '');
  const [editInstagram, setEditInstagram] = useState(user?.instagram || user?.instagramHandle || '');
  const [editWebsite, setEditWebsite] = useState(user?.website || user?.websiteUrl || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editProfileSuccessMsg, setEditProfileSuccessMsg] = useState('');

  useEffect(() => {
    if (user) {
      setWebsiteInput(user.website || user.websiteUrl || '');
      setEditCompanyName(user.companyName || user.displayName || '');
      setEditFullName(user.fullName || '');
      setEditPhone(user.phone || '');
      setEditBio(user.bio || user.description || '');
      setEditLocation(user.location || '');
      setEditStoreAddress(user.storeAddress || '');
      setEditLat(user.lat);
      setEditLng(user.lng);
      setEditGstin(user.gstin || '');
      setEditIecCode(user.iecCode || '');
      setEditInstagram(user.instagram || user.instagramHandle || '');
      setEditWebsite(user.website || user.websiteUrl || '');
    }
  }, [
    user?.id,
    user?.phone,
    user?.displayName,
    user?.companyName,
    user?.fullName,
    user?.bio,
    user?.location,
    user?.storeAddress,
    user?.gstin,
    user?.iecCode,
    user?.instagram,
    user?.website,
  ]);

  const handleSaveFullProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;

    setIsSavingProfile(true);
    setEditProfileSuccessMsg('');

    let formattedWebsite = editWebsite.trim();
    if (formattedWebsite && !/^https?:\/\//i.test(formattedWebsite)) {
      formattedWebsite = `https://${formattedWebsite}`;
    }

    let formattedInstagram = editInstagram.trim();
    if (formattedInstagram) {
      // Strip leading @, full URL prefix, and trailing slashes to extract pure username
      formattedInstagram = formattedInstagram
        .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
        .replace(/^@/, '')
        .replace(/\/$/, '');
    }

    const updatedUser: UserProfile = {
      ...user,
      companyName: editCompanyName.trim() || undefined,
      displayName: editCompanyName.trim() || editFullName.trim() || user.displayName,
      fullName: editFullName.trim() || undefined,
      phone: editPhone.trim() || user.phone,
      bio: editBio.trim() || undefined,
      description: editBio.trim() || undefined,
      location: editLocation.trim() || user.location,
      storeAddress: editStoreAddress.trim() || (isWholesalerRole ? editLocation.trim() : undefined),
      lat: editLat ?? user.lat,
      lng: editLng ?? user.lng,
      gstin: !isGstinHidden ? (editGstin.trim().toUpperCase() || undefined) : undefined,
      iecCode: editIecCode.trim().toUpperCase() || undefined,
      instagram: formattedInstagram || undefined,
      instagramHandle: formattedInstagram || undefined,
      website: !isWebsiteHidden ? (formattedWebsite || undefined) : undefined,
      websiteUrl: !isWebsiteHidden ? (formattedWebsite || undefined) : undefined,
    };

    try {
      console.log('⏳ [ProfileTab] Saving profile changes for user:', updatedUser.phone, updatedUser.displayName);
      const savedResult = await saveUserProfileToSupabase(updatedUser);

      if (onUpdateProfile) {
        onUpdateProfile(savedResult || updatedUser);
      } else {
        localStorage.setItem('dropthan_user', JSON.stringify(savedResult || updatedUser));
      }

      console.log('✅ [ProfileTab] Profile successfully saved:', savedResult);
      setEditProfileSuccessMsg('✓ Business profile saved to Supabase & updated in real-time!');
      setTimeout(() => {
        setIsEditProfileModalOpen(false);
        setEditProfileSuccessMsg('');
      }, 1500);
    } catch (err: any) {
      console.error('❌ [ProfileTab] Error saving business profile:', err);
      setEditProfileSuccessMsg(`❌ Error saving profile: ${err?.message || 'Database error'}`);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveWebsite = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;

    setIsSavingWebsite(true);
    setWebsiteSuccessMsg('');

    let cleanUrl = websiteInput.trim();
    if (cleanUrl && !/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = `https://${cleanUrl}`;
    }

    try {
      await updateUserWebsiteInSupabase(user.phone, cleanUrl);

      const updatedUser: UserProfile = {
        ...user,
        website: cleanUrl || undefined,
        websiteUrl: cleanUrl || undefined,
      };

      await saveUserProfileToSupabase(updatedUser);

      if (onUpdateProfile) {
        onUpdateProfile(updatedUser);
      } else {
        localStorage.setItem('dropthan_user', JSON.stringify(updatedUser));
      }

      setWebsiteSuccessMsg('✓ Website link saved & updated in real-time!');
      setTimeout(() => {
        setIsEditingWebsiteModal(false);
        setWebsiteSuccessMsg('');
      }, 1500);
    } catch (err) {
      console.error('Error saving website:', err);
      setWebsiteSuccessMsg('❌ Failed to save website link');
    } finally {
      setIsSavingWebsite(false);
    }
  };
  const [ratingStats, setRatingStats] = useState<RatingSummary>({
    average: 0,
    count: 0,
    reviews: [],
  });
  const [selectedStars, setSelectedStars] = useState<number>(5);
  const [reviewInputText, setReviewInputText] = useState<string>('');
  const [ratingFeedback, setRatingFeedback] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);

  const isNonDropshipper = user ? (user.role !== 'reseller' && (user.role as string) !== 'dropshipper') : false;
  const isWholesalerRole = user?.role === 'wholesaler';
  const isGstinHidden = user
    ? user.role === 'influencer' ||
      user.role === 'reseller' ||
      (user.role as string) === 'dropshipper' ||
      user.role === 'organic_wholesaler'
    : false;
  const isWebsiteHidden = user ? (user.role === 'influencer' || user.role === 'reseller' || (user.role as string) === 'dropshipper') : false;

  const cleanPhone = user ? user.phone.replace(/\D/g, '') : '';
  const isAdminUser = cleanPhone.endsWith('8838533014') || cleanPhone === '8838533014';

  const visibleUserPosts = useMemo(() => {
    return userPosts.slice(0, visiblePostsCount);
  }, [userPosts, visiblePostsCount]);

  const visibleSavedPosts = useMemo(() => {
    return savedPosts.slice(0, visibleSavedCount);
  }, [savedPosts, visibleSavedCount]);


  useEffect(() => {
    if (user) {
      const targetId = user.companyName || user.displayName || user.phone;
      fetchUserRatingsFromSupabase(targetId, user.phone).then((stats) => {
        setRatingStats(stats);
        if (stats.userRating) setSelectedStars(stats.userRating);
        if (stats.userReview) setReviewInputText(stats.userReview);
      });
    }
  }, [user?.id, user?.phone, user?.companyName, user?.displayName]);

  const handleRateSupplier = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;
    setIsSubmittingReview(true);
    const targetId = user.companyName || user.displayName || user.phone;
    const reviewerId = user.phone || user.id || 'reviewer';
    const reviewerName = user.displayName || user.companyName || 'Member';

    const updated = await saveUserRatingToSupabase(
      targetId,
      reviewerId,
      selectedStars,
      reviewerName,
      reviewInputText.trim()
    );

    setRatingStats(updated);
    setRatingFeedback(`✓ Rating & Review saved (${selectedStars} ⭐)!`);
    setIsSubmittingReview(false);

    setTimeout(() => {
      setRatingFeedback('');
    }, 4000);
  };

  if (!user) return null;

  const currentAvatar = getAvatarUrl(user.avatarUrl, user.role);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const sectionContext = user.role || 'wholesaler';
      const newAvatarUrl = await uploadAvatarToSupabase(file, user.displayName || 'user', sectionContext);
      if (onUpdateAvatar) {
        onUpdateAvatar(newAvatarUrl);
      }
    } catch (err) {
      console.error('Failed to upload avatar photo:', err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-md mx-auto">
      {/* CLEAR TOP BACK BUTTON NAVIGATION */}
      <div className="flex items-center justify-between bg-white border border-blue-100 rounded-2xl p-3 shadow-sm">
        <button
          onClick={() => onSelectTab ? onSelectTab('feed') : null}
          className="flex items-center space-x-1.5 text-xs font-bold text-[#0d47a1] bg-blue-50 hover:bg-blue-100 active:scale-95 px-3 py-1.5 rounded-xl border border-blue-200 transition cursor-pointer shadow-2xs"
          title="Return to Main Feed"
        >
          <span className="text-sm font-extrabold">←</span>
          <span>Back to Feed</span>
        </button>
        <span className="text-xs font-extrabold text-slate-700 tracking-wider">Account & Profile</span>
      </div>

      {/* USER PROFILE HEADER CARD */}
      <div className="bg-white border border-blue-100 rounded-2xl p-4 space-y-4 shadow-md">
        <div className="flex items-start space-x-3.5">
          {/* DYNAMIC CIRCULAR PROFILE PICTURE WITH UPLOAD BUTTON */}
          <div className="relative group flex-shrink-0">
            <img
              src={currentAvatar}
              alt={user.displayName}
              className="w-16 h-16 rounded-full object-cover border-2 border-[#0d47a1] shadow-md bg-slate-100"
            />
            <label
              htmlFor="profile-avatar-upload"
              className="absolute -bottom-1 -right-1 bg-[#0d47a1] hover:bg-blue-800 text-white p-1.5 rounded-full border border-white shadow-md cursor-pointer transition flex items-center justify-center text-xs"
              title="Change Profile Picture"
            >
              {isUploading ? '⌛' : '📷'}
            </label>
            <input
              id="profile-avatar-upload"
              type="file"
              accept="image/*"
              onChange={handleAvatarFileChange}
              className="hidden"
            />
          </div>

          <div className="flex-1 space-y-1.5 min-w-0">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
              <span className="truncate">{user.companyName || user.fullName || user.displayName}</span>
              <span className="text-[#0d47a1] text-xs font-bold" title="Verified Account">✓</span>
            </h3>
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 uppercase">
                {user.role === 'organic_wholesaler' ? 'ORGANIC WHOLESALER' : user.role}
              </span>
              {user.role === 'organic_wholesaler' && (
                <span className="text-[10px] text-emerald-800 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  🌱 ORGANIC PRODUCER
                </span>
              )}
              {user.role === 'exporter' && (
                <span className="text-[10px] text-emerald-800 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  🌐 EXPORTER VERIFIED
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-700 font-semibold flex items-center gap-1">
              <span>📞</span>
              <span>{user.phone.startsWith('+') ? user.phone : `+ ${user.phone}`}</span>
            </p>

            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-[11px] text-slate-600 font-medium flex items-center gap-1">
                <span>📍</span>
                <span>{user.storeAddress || user.location || 'Location Not Specified'}{user.country && !((user.storeAddress || user.location || '').toLowerCase().includes(user.country.toLowerCase())) ? `, ${user.country}` : ''}</span>
              </p>
            </div>

            {/* INSTAGRAM-STYLE BIO / DESCRIPTION (Placed right below name, role, phone, and location) */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-2.5 text-xs text-slate-700 leading-relaxed mt-1">
              <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wider mb-0.5">
                <span>📝</span>
                <span>Business Bio & Description</span>
              </div>
              <p className="font-medium text-slate-800 whitespace-pre-line text-[11px]">
                {user.bio || user.description || 'No business description provided yet. Tap "Edit" to add your bio, specialty, or wholesale keywords.'}
              </p>
            </div>

            {/* WEBSITE & SOCIAL LINK DISPLAY */}
            <div className="pt-1 flex flex-wrap items-center gap-1.5">
              {(user.instagram || user.instagramHandle) && (
                (() => {
                  const raw = (user.instagram || user.instagramHandle || '').trim();
                  const cleanHandle = raw
                    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
                    .replace(/^@/, '')
                    .replace(/\/$/, '');
                  const instaUrl = `https://www.instagram.com/${cleanHandle}`;

                  return (
                    <a
                      href={instaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-pink-700 bg-pink-50 hover:bg-pink-100 active:scale-95 px-2.5 py-1 rounded-xl border border-pink-200 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                      title={`Visit Instagram: @${cleanHandle}`}
                    >
                      <Instagram className="w-3.5 h-3.5 text-pink-600 flex-shrink-0" />
                      <span className="truncate max-w-[150px]">@{cleanHandle}</span>
                      <span className="text-[10px] font-extrabold">↗</span>
                    </a>
                  );
                })()
              )}

              {!isWebsiteHidden && (
                (user.website || user.websiteUrl) ? (
                  <div className="flex items-center gap-1.5">
                    <a
                      href={
                        (user.website || user.websiteUrl || '').startsWith('http')
                          ? (user.website || user.websiteUrl || '')
                          : `https://${user.website || user.websiteUrl || ''}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-[#0d47a1] bg-blue-50/90 hover:bg-blue-100 hover:underline px-2.5 py-1 rounded-xl border border-blue-200 flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-2xs"
                      title="Visit official business website"
                    >
                      <span className="text-sm">🌐</span>
                      <span className="truncate max-w-[190px]">
                        {(user.website || user.websiteUrl || '').replace(/^https?:\/\//i, '')}
                      </span>
                      <span className="text-[10px] font-extrabold">↗</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => setIsEditProfileModalOpen(true)}
                      className="text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg border border-slate-200 transition cursor-pointer"
                      title="Edit business profile"
                    >
                      ✏️ Edit
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditProfileModalOpen(true)}
                    className="text-xs font-bold text-[#0d47a1] bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-xl border border-blue-200 border-dashed flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                  >
                    <span>🌐</span>
                    <span>+ Add Website / Links</span>
                  </button>
                )
              )}
            </div>

            {/* GST VERIFICATION BADGE & PRIVACY SAFE STATUS */}
            {user.gstin ? (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {user.status === 'Active' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg shadow-2xs">
                    <span>🛡️</span>
                    <span>GST Approved • Verified B2B</span>
                  </span>
                ) : user.status === 'Rejected' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-800 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-lg">
                    <span>❌</span>
                    <span>GST Verification Rejected</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-lg">
                    <span>⏳</span>
                    <span>GST Pending Admin Verification</span>
                  </span>
                )}
                <span className="text-[9px] text-slate-400 font-medium">
                  (🔒 GSTIN secured in Admin Panel)
                </span>
              </div>
            ) : user.role === 'organic_wholesaler' ? (
              <p className="text-[10px] text-emerald-800 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                🌱 GST Exempted (Small Agro/Producer)
              </p>
            ) : null}

            {user.iecCode && (
              <span className="inline-flex items-center gap-1 text-[10px] text-blue-800 font-bold bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200 inline-block">
                <span>🌐</span>
                <span>{user.status === 'Active' ? 'Verified IEC Exporter' : 'IEC Exporter Registered'}</span>
              </span>
            )}
          </div>
        </div>

        {/* ADMIN CONTROL PANEL CARD - STRICTLY RESTRICTED TO PHONE 8838533014 */}
        {((user?.phone ? user.phone.replace(/\D/g, '') : '').endsWith('8838533014') || (user?.phone ? user.phone.replace(/\D/g, '') : '') === '8838533014') && (
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 rounded-2xl p-3.5 shadow-md border border-amber-400 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-black text-xs text-slate-950">
                <span>🛡️</span>
                <span>SYSTEM ADMINISTRATOR CONTROL PANEL</span>
              </div>
              <span className="bg-slate-900 text-amber-400 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                ADMIN
              </span>
            </div>
            <p className="text-[11px] font-bold text-slate-950/90 leading-tight">
              Access GST approvals, daily user count, chat logs, liked items, and user profile inspection.
            </p>
            {onOpenAdmin && (
              <button
                onClick={onOpenAdmin}
                className="w-full bg-slate-900 hover:bg-slate-800 text-amber-400 font-black text-xs py-2 px-3 rounded-xl transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5 active:scale-95"
              >
                <span>🔒 Open Admin Panel</span> →
              </button>
            )}
          </div>
        )}

        {/* STAR RATING & REVIEWS COMPONENT (NON-DROPSHIPPERS ONLY) */}
        {isNonDropshipper && (
          <div className="pt-3 border-t border-slate-100">
            <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3.5 space-y-3">
              {/* Header Badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-amber-500 font-bold text-base">⭐</span>
                  <div>
                    <span className="text-sm font-black text-amber-950">
                      {ratingStats.average.toFixed(1)} / 5.0
                    </span>
                    <span className="text-[10px] text-amber-800 font-bold ml-1.5">
                      ({ratingStats.count} {ratingStats.count === 1 ? 'rating' : 'ratings'} & reviews)
                    </span>
                  </div>
                </div>
                <span className="text-[9px] bg-amber-100 text-amber-900 font-extrabold px-2.5 py-0.5 rounded-full border border-amber-300 uppercase tracking-wide">
                  Verified Ratings
                </span>
              </div>

              {/* Submit Rating & Review Form */}
              <form onSubmit={handleRateSupplier} className="pt-2 border-t border-amber-200/60 flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-amber-950 font-bold">Submit Your Rating & Review:</p>
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setSelectedStars(star)}
                        className={`text-xl transition cursor-pointer hover:scale-125 ${
                          selectedStars >= star
                            ? 'text-amber-500 font-bold scale-110'
                            : 'text-amber-200 hover:text-amber-400'
                        }`}
                        title={`${star} Star${star > 1 ? 's' : ''}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={reviewInputText}
                    onChange={(e) => setReviewInputText(e.target.value)}
                    placeholder="Write a feedback review (e.g. Excellent service, genuine products)..."
                    className="flex-1 bg-white border border-amber-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder-amber-700/60"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow transition cursor-pointer whitespace-nowrap"
                  >
                    {isSubmittingReview ? 'Saving...' : 'Post Review'}
                  </button>
                </div>

                {ratingFeedback && (
                  <p className="text-[10px] text-emerald-800 font-extrabold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg animate-in fade-in">
                    {ratingFeedback}
                  </p>
                )}
              </form>

              {/* Recent User Reviews List */}
              {ratingStats.reviews && ratingStats.reviews.length > 0 && (
                <div className="pt-2 border-t border-amber-200/60 space-y-2">
                  <h5 className="text-[10px] font-black text-amber-900 uppercase tracking-wider">
                    Customer Reviews ({ratingStats.reviews.length})
                  </h5>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 scrollbar-none">
                    {ratingStats.reviews.map((rev, idx) => (
                      <div
                        key={`profile-rating-rev-${rev.id || idx}`}
                        className="bg-white/90 border border-amber-200/80 rounded-xl p-2 space-y-0.5 text-xs shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 text-[11px]">
                            {rev.reviewerName || 'Verified Trader'}
                          </span>
                          <span className="text-amber-500 font-extrabold text-[10px]">
                            {'★'.repeat(rev.ratingScore)} ({rev.ratingScore}/5)
                          </span>
                        </div>
                        {rev.reviewText && (
                          <p className="text-[11px] text-slate-600 leading-snug">{rev.reviewText}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* COMPACT STATS ROW */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-center">

          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/80">
            <span className="block text-sm font-black text-[#0d47a1]">{userPosts.length}</span>
            <span className="text-[10px] text-slate-500 font-medium">Posts</span>
          </div>
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/80">
            <span className="block text-sm font-black text-[#0d47a1]">{savedPosts.length}</span>
            <span className="text-[10px] text-slate-500 font-medium">Saved Items</span>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <button
            onClick={() => setIsEditProfileModalOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-3 rounded-xl text-xs transition shadow flex items-center justify-center gap-1 cursor-pointer active:scale-95"
          >
            ✏️ Edit Business Profile
          </button>
          <button
            onClick={onOpenCreatePost}
            className="bg-[#0d47a1] hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-xl text-xs transition shadow flex items-center justify-center gap-1 cursor-pointer active:scale-95"
          >
            📷 New Post
          </button>
          {onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              className="bg-amber-400 hover:bg-amber-300 text-slate-900 border border-amber-500 text-xs font-black px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 active:scale-95 shadow-2xs col-span-2 sm:col-span-1"
            >
              🛡️ Admin Panel
            </button>
          )}
          <button
            onClick={onLogout}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 col-span-2 sm:col-span-1"
          >
            🚪 Logout
          </button>
        </div>
      </div>

      {/* PROFILE SUB-TABS */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-md">
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button
            onClick={() => setActiveProfileTab('myPosts')}
            className={`flex-1 py-2.5 text-center text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeProfileTab === 'myPosts'
                ? 'border-b-2 border-[#0d47a1] text-[#0d47a1] bg-white'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>📦</span>
            <span>Posts ({userPosts.length})</span>
          </button>

          <button
            onClick={() => setActiveProfileTab('saved')}
            className={`flex-1 py-2.5 text-center text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeProfileTab === 'saved'
                ? 'border-b-2 border-[#0d47a1] text-[#0d47a1] bg-white'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>🔖</span>
            <span>Saved Items ({savedPosts.length})</span>
          </button>
        </div>

        {/* SUB-TAB CONTENT */}
        <div className="p-3">
          {/* TAB 1: MY POSTS */}
          {activeProfileTab === 'myPosts' && (
            <div>
              {userPosts.length === 0 ? (
                <div className="py-8 text-center space-y-3">
                  <span className="text-3xl block">📸</span>
                  <p className="text-xs font-bold text-slate-700">No posts published yet</p>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    Publish your product photos, wholesale inventory, or B2B offers to connect with buyers across India.
                  </p>
                  <button
                    onClick={onOpenCreatePost}
                    className="inline-flex items-center gap-1.5 bg-[#0d47a1] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow hover:bg-blue-800 transition cursor-pointer"
                  >
                    📷 Create New Post
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleUserPosts.map((post, pIdx) => (
                    <div
                      key={`user-profile-post-${post.id || pIdx}`}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <img
                            src={getAvatarUrl(post.authorAvatar, post.role)}
                            alt={post.author}
                            loading="lazy"
                            decoding="async"
                            className="w-7 h-7 rounded-full border border-blue-200 object-cover flex-shrink-0"
                          />
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">{post.author}</h4>
                            <p className="text-[10px] text-slate-500">{post.category}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex space-x-3 items-center">
                        <img
                          src={getOptimizedImageUrl(getPostImageUrl(post), 300)}
                          className="w-16 h-16 object-cover rounded-lg border border-slate-200 flex-shrink-0 bg-slate-100"
                          alt={post.caption || 'Product offer'}
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (!target.src.includes('unsplash.com')) {
                              target.src = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=300&auto=format&fit=crop&q=80';
                            }
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-slate-800 line-clamp-2 leading-snug">{post.caption}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs font-black text-[#0d47a1]">{post.price}</span>
                            <span className="text-[10px] text-slate-500 font-semibold">{post.moq}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-1 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-600">
                        <span className="font-semibold">❤️ {post.likesCount || 0} Authentic Likes</span>
                        <span className="text-[10px] text-emerald-600 font-bold">Active in Feed</span>
                      </div>
                    </div>
                  ))}

                  {visiblePostsCount < userPosts.length && (
                    <div className="text-center pt-2">
                      <button
                        onClick={() => setVisiblePostsCount((prev) => prev + ITEMS_PER_PAGE)}
                        className="bg-blue-50 hover:bg-blue-100 text-[#0d47a1] border border-blue-200 text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer"
                      >
                        Show More Posts ({userPosts.length - visiblePostsCount} remaining)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SAVED ITEMS */}
          {activeProfileTab === 'saved' && (
            <div>
              {savedPosts.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <span className="text-3xl block">🔖</span>
                  <p className="text-xs font-bold text-slate-700">No saved items yet</p>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    Tap the 🔖 icon on any offer in the feed to save it here for quick reference!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleSavedPosts.map((post, sIdx) => (
                    <div
                      key={`saved-post-item-${post.id || sIdx}`}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <img
                            src={getAvatarUrl(post.authorAvatar, post.role)}
                            alt={post.author}
                            loading="lazy"
                            decoding="async"
                            className="w-7 h-7 rounded-full border border-blue-200 object-cover flex-shrink-0"
                          />
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 truncate max-w-[150px]">{post.author}</h4>
                            <p className="text-[10px] text-slate-500">{post.location || post.category}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => onToggleSave(post.id)}
                          className="text-[10px] text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-bold hover:bg-slate-200 transition cursor-pointer"
                        >
                          Unsave 🔖
                        </button>
                      </div>

                      <div className="flex space-x-3 items-center">
                        <img
                          src={getOptimizedImageUrl(getPostImageUrl(post), 300)}
                          className="w-16 h-16 object-cover rounded-lg border border-slate-200 flex-shrink-0 bg-slate-100"
                          alt={post.caption || 'Product offer'}
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (!target.src.includes('unsplash.com')) {
                              target.src = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=300&auto=format&fit=crop&q=80';
                            }
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-slate-800 line-clamp-2 leading-snug">{post.caption}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs font-black text-[#0d47a1]">{post.price}</span>
                            <span className="text-[10px] text-slate-500 font-semibold">{post.moq}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/80 text-xs">
                        <button
                          onClick={() => onToggleLike(post.id)}
                          className="text-[10px] font-bold text-slate-600 flex items-center gap-1 cursor-pointer"
                        >
                          <span>{post.isLiked ? '❤️' : '🤍'}</span>
                          <span>{post.likesCount || 0} Likes</span>
                        </button>

                        <button
                          onClick={() => onOpenVendorChat(post)}
                          className="bg-[#0d47a1] hover:bg-blue-700 text-white text-[10px] font-bold px-3 py-1 rounded-lg transition shadow-xs cursor-pointer"
                        >
                          💬 Contact Supplier
                        </button>
                      </div>
                    </div>
                  ))}

                  {visibleSavedCount < savedPosts.length && (
                    <div className="text-center pt-2">
                      <button
                        onClick={() => setVisibleSavedCount((prev) => prev + ITEMS_PER_PAGE)}
                        className="bg-blue-50 hover:bg-blue-100 text-[#0d47a1] border border-blue-200 text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer"
                      >
                        Show More Saved Items ({savedPosts.length - visibleSavedCount} remaining)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* EDIT WEBSITE LINK MODAL */}
      {isEditingWebsiteModal && (
        <div className="fixed inset-0 z-[120] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 space-y-4 shadow-2xl border border-blue-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="text-xl">🌐</span>
                <h3 className="text-sm font-bold text-slate-900">Business Website Link</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingWebsiteModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Enter your official company website, store link, or online catalog URL. It will be saved directly to your Supabase profile and visible to potential clients.
            </p>

            <form onSubmit={handleSaveWebsite} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-800 mb-1">
                  Website URL *
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400 text-sm">🌐</span>
                  <input
                    type="text"
                    value={websiteInput}
                    onChange={(e) => setWebsiteInput(e.target.value)}
                    placeholder="e.g. https://www.yourcompany.com or myshop.com"
                    className="w-full bg-white border border-blue-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1] focus:ring-1 focus:ring-[#0d47a1]"
                    autoFocus
                  />
                </div>
              </div>

              {websiteSuccessMsg && (
                <p className={`text-xs font-bold px-3 py-2 rounded-xl border ${
                  websiteSuccessMsg.startsWith('✓')
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  {websiteSuccessMsg}
                </p>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditingWebsiteModal(false)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingWebsite}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#0d47a1] hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow transition cursor-pointer flex items-center gap-1.5"
                >
                  {isSavingWebsite ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving to Supabase...</span>
                    </>
                  ) : (
                    <>
                      <span>💾 Save Website Link</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BUSINESS PROFILE MODAL */}
      {isEditProfileModalOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl border border-blue-100 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="text-xl">✏️</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Edit Business Profile</h3>
                  <p className="text-[10px] text-slate-500">Update company details, links & contact info</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditProfileModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFullProfile} className="space-y-3">
              {/* COMPANY NAME */}
              <div>
                <label className="block text-[11px] font-bold text-slate-800 mb-1">Company / Business Name</label>
                <input
                  type="text"
                  value={editCompanyName}
                  onChange={(e) => setEditCompanyName(e.target.value)}
                  placeholder="e.g. Apex Textiles Pvt Ltd"
                  className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1] focus:ring-1 focus:ring-[#0d47a1]"
                />
              </div>

              {/* FULL NAME */}
              <div>
                <label className="block text-[11px] font-bold text-slate-800 mb-1">Contact Person / Full Name</label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  placeholder="e.g. Rajesh Kumar"
                  className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1] focus:ring-1 focus:ring-[#0d47a1]"
                />
              </div>

              {/* PHONE NUMBER */}
              <div>
                <label className="block text-[11px] font-bold text-slate-800 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1] focus:ring-1 focus:ring-[#0d47a1]"
                />
              </div>

              {/* BUSINESS BIO / DESCRIPTION FIELD */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-800">
                    Business Bio / Description
                  </label>
                  <span className="text-[10px] font-semibold text-slate-500">Public Description</span>
                </div>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="e.g. Manufacturer and direct exporter of organic goods, apparel, and customized packaging. Low MOQ and wholesale catalogs on chat."
                  className="w-full bg-white border border-blue-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1] focus:ring-1 focus:ring-[#0d47a1] resize-none"
                />
              </div>

              {/* LOCATION & CITY WITH GOOGLE PLACES AUTOCOMPLETE */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-800">City / Location</label>
                  <span className="text-[9px] text-[#0d47a1] bg-blue-50 font-bold px-1.5 py-0.5 rounded border border-blue-200">
                    🗺️ Google Places
                  </span>
                </div>
                <GoogleLocationInput
                  value={editLocation}
                  onChange={(val, details) => {
                    setEditLocation(val);
                    if (details) {
                      if (details.lat !== undefined && details.lng !== undefined) {
                        setEditLat(details.lat);
                        setEditLng(details.lng);
                      }
                      if (details.formattedAddress && !editStoreAddress) {
                        setEditStoreAddress(details.formattedAddress);
                      }
                    }
                  }}
                  placeholder="Search city, district, or state..."
                  className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1] focus:ring-1 focus:ring-[#0d47a1]"
                />
              </div>

              {/* STORE / WAREHOUSE EXACT ADDRESS WITH GOOGLE MAPS PIN - SHOWN ONLY FOR WHOLESALER ROLE */}
              {isWholesalerRole && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-800">Store / Warehouse Exact Address</label>
                    <span className="text-[9px] text-emerald-700 bg-emerald-50 font-bold px-1.5 py-0.5 rounded border border-emerald-200">
                      📍 GPS & Address
                    </span>
                  </div>
                  <GoogleLocationInput
                    value={editStoreAddress}
                    onChange={(val, details) => {
                      setEditStoreAddress(val);
                      if (details) {
                        if (details.lat !== undefined && details.lng !== undefined) {
                          setEditLat(details.lat);
                          setEditLng(details.lng);
                        }
                      }
                    }}
                    placeholder="e.g. Shop 102, Ring Road Textile Market, Surat"
                    className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1] focus:ring-1 focus:ring-[#0d47a1]"
                  />
                  {editLat && editLng && (
                    <p className="text-[10px] text-slate-500 font-mono mt-1">
                      ✓ Google GPS Coordinates: {editLat.toFixed(4)}, {editLng.toFixed(4)}
                    </p>
                  )}
                </div>
              )}

              {/* GSTIN NUMBER - HIDDEN FOR INFLUENCER, DROPSHIPPER/RESELLER, AND ORGANIC WHOLESALER */}
              {!isGstinHidden && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 mb-1">GSTIN Number (Optional)</label>
                  <input
                    type="text"
                    value={editGstin}
                    onChange={(e) => setEditGstin(e.target.value)}
                    placeholder="e.g. 24AAAAA0000A1Z5"
                    className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-xs text-slate-900 uppercase font-mono placeholder-slate-400 focus:outline-none focus:border-[#0d47a1] focus:ring-1 focus:ring-[#0d47a1]"
                  />
                </div>
              )}

              {/* INSTAGRAM PROFILE LINK FIELD */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-800">
                    Instagram Profile Link / Username (Optional)
                  </label>
                  <span className="text-[9px] text-pink-700 bg-pink-50 font-bold px-1.5 py-0.5 rounded border border-pink-200">
                    📸 Instagram
                  </span>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-pink-500 text-xs flex items-center pointer-events-none">
                    <Instagram className="w-3.5 h-3.5 text-pink-600" />
                  </span>
                  <input
                    type="text"
                    value={editInstagram}
                    onChange={(e) => setEditInstagram(e.target.value)}
                    placeholder="e.g. your_instagram_handle or @yourcompany"
                    className="w-full bg-white border border-blue-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1] focus:ring-1 focus:ring-[#0d47a1]"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Opens https://www.instagram.com/[username] when tapped by buyers.
                </p>
              </div>

              {/* WEBSITE LINK FIELD - HIDDEN FOR INFLUENCER & DROPSHIPPER/RESELLER */}
              {!isWebsiteHidden && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 mb-1">
                    Website Link
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-slate-400 text-xs">🌐</span>
                    <input
                      type="text"
                      value={editWebsite}
                      onChange={(e) => setEditWebsite(e.target.value)}
                      placeholder="https://yourwebsite.com"
                      className="w-full bg-white border border-blue-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1] focus:ring-1 focus:ring-[#0d47a1]"
                    />
                  </div>
                </div>
              )}

              {editProfileSuccessMsg && (
                <p className={`text-xs font-bold px-3 py-2 rounded-xl border ${
                  editProfileSuccessMsg.startsWith('✓')
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  {editProfileSuccessMsg}
                </p>
              )}

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditProfileModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#0d47a1] hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow transition cursor-pointer flex items-center gap-1.5"
                >
                  {isSavingProfile ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <span>💾 Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
