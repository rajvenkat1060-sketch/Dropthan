import React, { useState, useEffect, useRef } from 'react';
import { UserRole, UserProfile } from '../types';
import {
  uploadAvatarToSupabase,
  authenticateOrRegisterUser,
  fetchFullUserProfileByPhone,
} from '../lib/supabase';
import { InternationalPhoneInput, isPhoneValid as checkInternationalPhoneValid } from './InternationalPhoneInput';
import { GoogleLocationInput } from './GoogleLocationInput';
import { Instagram, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { ImageCropModal } from './ImageCropModal';

interface OnboardingModalProps {
  onComplete: (user: UserProfile, isNewUser?: boolean) => void;
  onCancel?: () => void;
  currentUser?: UserProfile | null;
}

const TICKER_HIGHLIGHTS = [
  { icon: '🛡️', title: 'Verified B2B Suppliers' },
  { icon: '📦', title: 'Direct Dropshipping' },
  { icon: '⚡', title: 'Zero Commission Orders' },
  { icon: '🔒', title: 'Strict Secure Password Auth' },
  { icon: '🌱', title: 'GST Exempt Organic Goods' },
  { icon: '🌐', title: 'Global Exporters & Trade' },
  { icon: '🖨️', title: 'Custom Printing & Packaging' },
  { icon: '🚀', title: 'Low MOQ Wholesale' },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete, onCancel, currentUser }) => {
  const isEditingExisting = Boolean(currentUser);

  // Multi-step state: Step 1 = Category Selection, Step 2 = Business & Account Details
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Form Fields
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentUser?.role || 'wholesaler');
  const [companyName, setCompanyName] = useState(currentUser?.companyName || '');
  const [gstin, setGstin] = useState(currentUser?.gstin || '');
  const [iecCode, setIecCode] = useState(currentUser?.iecCode || '');
  const [businessRegNumber, setBusinessRegNumber] = useState(currentUser?.businessRegNumber || '');
  const [country, setCountry] = useState(currentUser?.country || 'India');
  const [location, setLocation] = useState(currentUser?.location || '');
  const [storeAddress, setStoreAddress] = useState(currentUser?.storeAddress || '');
  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({
    lat: currentUser?.lat,
    lng: currentUser?.lng,
  });
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [email, setEmail] = useState((currentUser as any)?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [password, setPassword] = useState(currentUser?.password || '');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccessMsg, setAuthSuccessMsg] = useState('');
  const [bio, setBio] = useState(currentUser?.bio || currentUser?.description || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '');
  const [instagram, setInstagram] = useState(currentUser?.instagram || currentUser?.instagramHandle || '');
  const [website, setWebsite] = useState(currentUser?.website || currentUser?.websiteUrl || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState('');
  const [detectedProfile, setDetectedProfile] = useState<UserProfile | null>(null);
  const lookupTimerRef = useRef<any>(null);

  // Background lookup to auto-detect pre-registered profiles when user enters their phone number
  useEffect(() => {
    if (isEditingExisting) return;
    const cleanDigits = phone.replace(/\D/g, '');
    if (cleanDigits.length < 8) {
      setDetectedProfile(null);
      return;
    }

    if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
    lookupTimerRef.current = setTimeout(async () => {
      try {
        const found = await fetchFullUserProfileByPhone(phone);
        if (found) {
          setDetectedProfile(found);
          if (found.role) setSelectedRole(found.role);
          if (found.companyName) setCompanyName(found.companyName);
          if (found.fullName) setFullName(found.fullName);
          if (found.bio || found.description) setBio(found.bio || found.description || '');
          if (found.location) setLocation(found.location);
          if (found.storeAddress) setStoreAddress(found.storeAddress);
          if (found.country) setCountry(found.country);
          if (found.gstin) setGstin(found.gstin);
          if (found.iecCode) setIecCode(found.iecCode);
          if (found.businessRegNumber) setBusinessRegNumber(found.businessRegNumber);
          if (found.instagram || found.instagramHandle) setInstagram(found.instagram || found.instagramHandle || '');
          if (found.website || found.websiteUrl) setWebsite(found.website || found.websiteUrl || '');
          if (found.avatarUrl) setAvatarUrl(found.avatarUrl);
          if (found.lat !== undefined && found.lng !== undefined) {
            setCoords({ lat: found.lat, lng: found.lng });
          }
        } else {
          setDetectedProfile(null);
        }
      } catch (e) {
        console.warn('Notice in phone lookup:', e);
      }
    }, 350);

    return () => {
      if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
    };
  }, [phone, isEditingExisting]);

  const isWholesalerRole = selectedRole === 'wholesaler';

  // GSTIN Exemption Rule: Hide / Not Required for Dropshipper/Reseller, Organic Wholesaler
  const isGstinHidden =
    selectedRole === 'organic_wholesaler' ||
    selectedRole === 'reseller' ||
    selectedRole === 'dropshipper';

  const isWebsiteHidden = selectedRole === 'reseller' || selectedRole === 'dropshipper';
  const isCompanyRole =
    selectedRole === 'wholesaler' ||
    selectedRole === 'organic_wholesaler' ||
    selectedRole === 'exporter' ||
    selectedRole === 'printing';
  const isExporterRole = selectedRole === 'exporter';

  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  const isGstinValid = gstinRegex.test(gstin.trim().toUpperCase());
  const isPhoneValid = checkInternationalPhoneValid(phone) || phone.trim().replace(/[^0-9]/g, '').length >= 7;
  const isPasswordValid = password.trim().length >= 4;
  const isSubmitEnabled = Boolean(isPhoneValid && isPasswordValid);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
  };

  // --- UNIFIED AUTHENTICATION / REGISTRATION SUBMIT HANDLER ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPhoneValid) {
      setAuthError('Please enter a valid mobile phone number with country code.');
      return;
    }
    if (!password.trim()) {
      setAuthError('Please enter your account password.');
      return;
    }
    if (password.trim().length < 4) {
      setAuthError('Password must be at least 4 characters long.');
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);
    setAuthError('');
    setAuthSuccessMsg('');

    const formattedPhone = phone.trim();
    const formattedGstin = gstin.trim().toUpperCase();
    const enteredPassword = password.trim();

    const cleanInstagram = instagram.trim()
      ? instagram.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/\/$/, '')
      : undefined;

    const phoneDigits = formattedPhone.replace(/\D/g, '');
    const validId = currentUser?.id || detectedProfile?.id || (phoneDigits ? `usr_${phoneDigits}` : `usr_${Date.now()}`);

    const resolvedDisplayName =
      (isCompanyRole ? (companyName.trim() || detectedProfile?.companyName) : (fullName.trim() || detectedProfile?.fullName)) ||
      companyName.trim() ||
      fullName.trim() ||
      detectedProfile?.displayName ||
      currentUser?.displayName ||
      'Dropthan Member';

    const profileData: Partial<UserProfile> & { phone: string; password: string } = {
      id: validId,
      role: selectedRole || detectedProfile?.role || currentUser?.role || 'wholesaler',
      phone: formattedPhone,
      password: enteredPassword,
      country: country.trim() || detectedProfile?.country || currentUser?.country || 'India',
      location: location.trim() || detectedProfile?.location || currentUser?.location || '',
      storeAddress: isWholesalerRole
        ? (storeAddress.trim() || location.trim() || detectedProfile?.storeAddress || currentUser?.storeAddress)
        : (location.trim() || detectedProfile?.location || undefined),
      lat: coords.lat ?? detectedProfile?.lat ?? currentUser?.lat,
      lng: coords.lng ?? detectedProfile?.lng ?? currentUser?.lng,
      createdAt: detectedProfile?.createdAt || currentUser?.createdAt || new Date().toISOString(),
      displayName: resolvedDisplayName,
      fullName: fullName.trim() || detectedProfile?.fullName || currentUser?.fullName || (isCompanyRole && (companyName.trim() || detectedProfile?.companyName) ? (companyName.trim() || detectedProfile?.companyName) : undefined),
      companyName: isCompanyRole ? (companyName.trim() || detectedProfile?.companyName || currentUser?.companyName) : undefined,
      bio: bio.trim() || detectedProfile?.bio || detectedProfile?.description || currentUser?.bio || undefined,
      description: bio.trim() || detectedProfile?.description || detectedProfile?.bio || currentUser?.description || undefined,
      avatarUrl: avatarUrl || detectedProfile?.avatarUrl || currentUser?.avatarUrl || undefined,
      instagram: cleanInstagram || detectedProfile?.instagram || detectedProfile?.instagramHandle || currentUser?.instagram || undefined,
      instagramHandle: cleanInstagram || detectedProfile?.instagramHandle || detectedProfile?.instagram || currentUser?.instagramHandle || undefined,
      website: !isWebsiteHidden && website.trim()
        ? (website.trim().startsWith('http') ? website.trim() : `https://${website.trim()}`)
        : (detectedProfile?.website || detectedProfile?.websiteUrl || currentUser?.website),
      websiteUrl: !isWebsiteHidden && website.trim()
        ? (website.trim().startsWith('http') ? website.trim() : `https://${website.trim()}`)
        : (detectedProfile?.websiteUrl || detectedProfile?.website || currentUser?.websiteUrl),
      status: detectedProfile?.status || currentUser?.status || 'Active',
    };

    if (!isGstinHidden && (formattedGstin || detectedProfile?.gstin)) {
      profileData.gstin = formattedGstin || detectedProfile?.gstin;
    }
    if (isExporterRole && (iecCode.trim() || detectedProfile?.iecCode)) {
      profileData.iecCode = (iecCode.trim() || detectedProfile?.iecCode || '').toUpperCase();
    }
    if (businessRegNumber.trim() || detectedProfile?.businessRegNumber) {
      profileData.businessRegNumber = businessRegNumber.trim() || detectedProfile?.businessRegNumber;
    }

    try {
      const result = await authenticateOrRegisterUser(profileData);

      if (!result.success || !result.profile) {
        // STRICT PASSWORD CHECK ERROR DISPLAY
        setAuthError(result.error || 'Password not correct');
        setIsSubmitting(false);
        return;
      }

      const authenticatedUser = result.profile;
      localStorage.setItem('dropthan_user', JSON.stringify(authenticatedUser));

      if (result.isNewUser) {
        setAuthSuccessMsg('✓ Account registered successfully! Welcome to Dropthan.');
      } else {
        setAuthSuccessMsg('✓ Logged in successfully! Loading your account...');
      }

      try {
        window.dispatchEvent(new CustomEvent('dropthan_profiles_updated'));
      } catch (e) {}

      setTimeout(() => {
        setIsSubmitting(false);
        onComplete(authenticatedUser, Boolean(result.isNewUser));
      }, 400);
    } catch (err: any) {
      console.error('Authentication error:', err);
      setAuthError(err?.message || 'Authentication failed. Please check your credentials.');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="dropthan-onboarding-modal-overlay"
      className="w-full min-h-screen bg-slate-50 overflow-y-auto overflow-x-hidden flex flex-col"
    >
      <div
        id="dropthan-onboarding-card"
        className="w-full min-h-screen bg-white flex flex-col p-4 sm:p-8 md:p-10 lg:p-12 space-y-6 pb-20 sm:pb-24"
      >
        {/* CONDITIONAL BACK BUTTON - SHOWN ONLY IF EDITING */}
        {currentUser && onCancel && (
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <button
              type="button"
              id="btn-onboarding-back"
              onClick={onCancel}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 px-3 py-1.5 rounded-xl border border-slate-200 transition cursor-pointer"
            >
              <span className="text-sm font-extrabold">←</span>
              <span>Back</span>
            </button>
            <span className="text-xs font-semibold text-slate-500">Edit Business Details</span>
          </div>
        )}

        {/* SCROLLING ANNOUNCEMENT TICKER */}
        <div className="w-full bg-slate-900 text-white rounded-2xl overflow-hidden py-3 px-4 shadow-sm border border-slate-800">
          <div className="flex items-center gap-2">
            <span className="bg-blue-600/30 text-blue-300 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border border-blue-400/30 shrink-0 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              HIGHLIGHTS
            </span>
            <div className="overflow-hidden relative w-full">
              <div className="flex gap-6 whitespace-nowrap animate-marquee">
                {TICKER_HIGHLIGHTS.concat(TICKER_HIGHLIGHTS).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-slate-200 text-xs">
                    <span>{item.icon}</span>
                    <span className="font-bold text-white text-xs">{item.title}</span>
                    <span className="text-slate-500 text-[10px] ml-1">•</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* HERO BANNER - FULL-WIDTH RESPONSIVE */}
        <div className="w-full bg-[#0d47a1] text-white p-6 sm:p-8 rounded-3xl shadow-md flex flex-col sm:flex-row items-center gap-5 sm:gap-6 text-center sm:text-left">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/10 p-2.5 shadow-md flex items-center justify-center select-none shrink-0 border border-white/20">
            <img
              src="/dropthan-logo.png"
              alt="dptn B2B BUSINESS"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {isEditingExisting ? 'Edit Profile' : 'Sign In / Register'}
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 mt-1 max-w-3xl leading-relaxed">
              {isEditingExisting
                ? 'Update your business information & settings'
                : 'Direct wholesale & dropshipping platform. Sign in or create a new account.'}
            </p>
          </div>
        </div>

        {/* INLINE AUTH ERROR MESSAGE */}
        {authError && (
          <div id="auth-error-banner" className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs space-y-1 animate-shake">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>Authentication Notice</span>
            </div>
            <p className="text-xs font-semibold leading-relaxed">{authError}</p>
          </div>
        )}

        {/* INLINE AUTH SUCCESS MESSAGE */}
        {authSuccessMsg && (
          <div id="auth-success-banner" className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold text-xs">{authSuccessMsg}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 1: BUSINESS CATEGORY SELECTION ONLY */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200 flex flex-col pb-12 sm:pb-16">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 pb-1 border-b border-slate-100">
                <div>
                  <label className="block text-sm font-black uppercase tracking-wider text-[#0d47a1]">
                    Select Business Category
                  </label>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Choose your primary trade category to configure your Dropthan experience.
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full self-start sm:self-auto">
                  Step 1 of 2
                </span>
              </div>

              {/* Category Radio Cards - Responsive Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 pt-2">
                {/* Wholesaler */}
                <div
                  id="role-option-wholesaler"
                  onClick={() => handleRoleSelect('wholesaler')}
                  className={`border-2 p-4 sm:p-5 rounded-2xl cursor-pointer transition flex items-center justify-between shadow-xs hover:shadow-md ${
                    selectedRole === 'wholesaler'
                      ? 'border-[#0d47a1] bg-blue-50/70 text-[#0d47a1] ring-2 ring-blue-100'
                      : 'border-slate-200 bg-white hover:border-blue-300 text-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    <span className="text-3xl">📦</span>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">Standard Wholesaler</h4>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">Upload bulk inventory, set MOQ & pricing.</p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ml-3 ${
                    selectedRole === 'wholesaler' ? 'border-[#0d47a1]' : 'border-slate-300'
                  }`}>
                    {selectedRole === 'wholesaler' && <div className="w-3 h-3 rounded-full bg-[#0d47a1]" />}
                  </div>
                </div>

                {/* Organic Wholesaler */}
                <div
                  id="role-option-organic-wholesaler"
                  onClick={() => handleRoleSelect('organic_wholesaler')}
                  className={`border-2 p-4 sm:p-5 rounded-2xl cursor-pointer transition flex items-center justify-between shadow-xs hover:shadow-md ${
                    selectedRole === 'organic_wholesaler'
                      ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 ring-2 ring-emerald-100'
                      : 'border-slate-200 bg-white hover:border-emerald-300 text-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    <span className="text-3xl">🌱</span>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5 flex-wrap">
                        Organic Wholesaler <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-black">GST Exempted</span>
                      </h4>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">Agro, coco fiber, cotton, neem & natural goods.</p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ml-3 ${
                    selectedRole === 'organic_wholesaler' ? 'border-emerald-600' : 'border-slate-300'
                  }`}>
                    {selectedRole === 'organic_wholesaler' && <div className="w-3 h-3 rounded-full bg-emerald-700" />}
                  </div>
                </div>

                {/* Exporter */}
                <div
                  id="role-option-exporter"
                  onClick={() => handleRoleSelect('exporter')}
                  className={`border-2 p-4 sm:p-5 rounded-2xl cursor-pointer transition flex items-center justify-between shadow-xs hover:shadow-md ${
                    selectedRole === 'exporter'
                      ? 'border-[#0d47a1] bg-blue-50/70 text-[#0d47a1] ring-2 ring-blue-100'
                      : 'border-slate-200 bg-white hover:border-blue-300 text-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    <span className="text-3xl">🌐</span>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">Exporter</h4>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">Global cross-border trade, bulk shipping & IEC.</p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ml-3 ${
                    selectedRole === 'exporter' ? 'border-[#0d47a1]' : 'border-slate-300'
                  }`}>
                    {selectedRole === 'exporter' && <div className="w-3 h-3 rounded-full bg-[#0d47a1]" />}
                  </div>
                </div>

                {/* Print & Packaging */}
                <div
                  id="role-option-printing"
                  onClick={() => handleRoleSelect('printing')}
                  className={`border-2 p-4 sm:p-5 rounded-2xl cursor-pointer transition flex items-center justify-between shadow-xs hover:shadow-md ${
                    selectedRole === 'printing'
                      ? 'border-[#0d47a1] bg-blue-50/70 text-[#0d47a1] ring-2 ring-blue-100'
                      : 'border-slate-200 bg-white hover:border-blue-300 text-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    <span className="text-3xl">🖨️</span>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">Print & Packaging Company</h4>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">Box printing, sticker labels, cartons & packaging.</p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ml-3 ${
                    selectedRole === 'printing' ? 'border-[#0d47a1]' : 'border-slate-300'
                  }`}>
                    {selectedRole === 'printing' && <div className="w-3 h-3 rounded-full bg-[#0d47a1]" />}
                  </div>
                </div>

                {/* Reseller / Dropshipper */}
                <div
                  id="role-option-reseller"
                  onClick={() => handleRoleSelect('reseller')}
                  className={`border-2 p-4 sm:p-5 rounded-2xl cursor-pointer transition flex items-center justify-between shadow-xs hover:shadow-md ${
                    selectedRole === 'reseller'
                      ? 'border-[#0d47a1] bg-blue-50/70 text-[#0d47a1] ring-2 ring-blue-100'
                      : 'border-slate-200 bg-white hover:border-blue-300 text-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    <span className="text-3xl">🏷️</span>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5 flex-wrap">
                        Dropshipper / Buyer <span className="text-[10px] bg-blue-200 text-blue-900 px-2 py-0.5 rounded font-black">GST Exempted</span>
                      </h4>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">Source products with low MOQ & order directly.</p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ml-3 ${
                    selectedRole === 'reseller' ? 'border-[#0d47a1]' : 'border-slate-300'
                  }`}>
                    {selectedRole === 'reseller' && <div className="w-3 h-3 rounded-full bg-[#0d47a1]" />}
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 1 ACTION BUTTON */}
            <div className="pt-6 border-t border-slate-100 flex justify-end pb-8">
              <button
                type="button"
                id="btn-step1-continue"
                onClick={() => setCurrentStep(2)}
                className="w-full sm:w-auto sm:min-w-[280px] font-black py-4 px-8 rounded-xl text-sm transition shadow-md flex items-center justify-center gap-2 bg-[#0d47a1] hover:bg-blue-700 active:scale-98 text-white cursor-pointer"
              >
                <span>Continue to Account Details</span>
                <span className="text-base font-extrabold">→</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: BUSINESS & ACCOUNT DETAILS FORM */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-200 flex flex-col pb-20 sm:pb-24">
            <div className="space-y-6">
              {/* STEP 2 HEADER WITH BACK NAVIGATION & SELECTED ROLE BADGE */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#0d47a1] hover:underline cursor-pointer py-1"
                >
                  <span className="text-sm">←</span>
                  <span>Change Category</span>
                </button>
                <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full capitalize">
                  {selectedRole === 'organic_wholesaler'
                    ? '🌱 Organic Wholesaler'
                    : selectedRole === 'exporter'
                    ? '🌐 Exporter'
                    : selectedRole === 'printing'
                    ? '🖨️ Printing & Packaging'
                    : selectedRole === 'reseller' || selectedRole === 'dropshipper'
                    ? '🏷️ Dropshipper'
                    : '📦 Standard Wholesaler'}
                </span>
              </div>

              {/* RESPONSIVE GRID FOR FORM FIELDS: 1 col on mobile, 2 cols on md+ screens */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* INTERNATIONAL PHONE NUMBER */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-800">
                      Mobile Phone Number <span className="text-blue-600 font-extrabold">*</span>
                    </label>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      Required
                    </span>
                  </div>
                  <InternationalPhoneInput
                    value={phone}
                    onChange={(p) => {
                      setPhone(p);
                      if (authError) setAuthError('');
                    }}
                    defaultCountry="in"
                    placeholder="Enter mobile phone number"
                  />
                  {detectedProfile && (
                    <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-xs text-emerald-800 flex items-start gap-2 shadow-2xs">
                      <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-bold text-[11px] text-emerald-900">
                          Existing Account Found: {detectedProfile.companyName || detectedProfile.displayName || detectedProfile.fullName || 'Registered Supplier'}
                        </p>
                        <p className="text-[10px] text-emerald-700 leading-tight mt-0.5">
                          Your profile data has been automatically loaded. Enter your password to sign in.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* ACCOUNT PASSWORD */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-800 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-[#0d47a1]" />
                      <span>Account Password <span className="text-blue-600 font-extrabold">*</span></span>
                    </label>
                    <span className="text-[10px] text-slate-500 font-semibold">Strict Verification</span>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      id="input-account-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (authError) setAuthError('');
                      }}
                      placeholder="Enter or create account password"
                      className={`w-full bg-white border rounded-xl p-3 pr-10 text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition ${
                        authError.includes('Password not correct') || authError.toLowerCase().includes('password')
                          ? 'border-red-500 ring-2 ring-red-200 bg-red-50/40 text-red-950'
                          : 'border-blue-200 focus:border-[#0d47a1] focus:ring-1 focus:ring-[#0d47a1]'
                      }`}
                    />
                    <button
                      type="button"
                      id="btn-toggle-password-visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-slate-400 hover:text-slate-600 transition p-1 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {authError && authError.includes('Password not correct') && (
                    <div className="mt-1.5 p-2 bg-red-50 border border-red-200 rounded-xl flex items-center gap-1.5 text-[11px] text-red-700 font-bold">
                      <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      <span>Password not correct. Please enter the registered password for this phone number.</span>
                    </div>
                  )}
                </div>

                {/* EMAIL ID INPUT */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-800">
                      Email Address (Optional)
                    </label>
                    <span className="text-[10px] font-semibold text-slate-500">
                      Inquiries &amp; Updates
                    </span>
                  </div>
                  <input
                    id="input-account-email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. contact@business.com"
                    className="w-full bg-white border border-blue-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1] focus:ring-1 focus:ring-[#0d47a1]"
                  />
                </div>

                {/* COMPANY NAME / FULL NAME */}
                {isCompanyRole ? (
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Company / Business Name (Optional)
                    </label>
                    <input
                      id="input-company-name"
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Apex Global Exports / Apex Wholesalers"
                      className="w-full bg-white border border-blue-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1] focus:ring-1 focus:ring-[#0d47a1]"
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-800 mb-1">Full Name / Display Name (Optional)</label>
                    <input
                      id="input-full-name"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full bg-white border border-blue-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1] focus:ring-1 focus:ring-[#0d47a1]"
                    />
                  </div>
                )}

                {/* DYNAMIC GSTIN FIELD */}
                {!isGstinHidden ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-800">
                        GSTIN Registration (Optional)
                      </label>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        🔒 Strictly Confidential
                      </span>
                    </div>
                    <input
                      id={isCompanyRole ? 'input-gstin' : 'input-gstin-non-company'}
                      type="text"
                      maxLength={15}
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase())}
                      placeholder="e.g. 33AAAAA0000A1Z5"
                      className="w-full bg-white border border-blue-200 rounded-xl p-3 text-xs font-mono uppercase text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1] focus:ring-1 focus:ring-[#0d47a1]"
                    />
                    {gstin.length > 0 && isGstinValid ? (
                      <p className="text-[10px] text-emerald-700 mt-1 font-bold">✓ Valid GSTIN format (Kept private for Admin review)</p>
                    ) : (
                      <p className="text-[10px] text-slate-500 mt-1">
                        🔒 Confidential: Stored securely for Admin approval. Never shown publicly.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl flex items-center gap-2 self-start">
                    <span className="text-xl">🌱</span>
                    <p className="text-xs text-emerald-800 font-medium">
                      GSTIN is not required for {selectedRole === 'organic_wholesaler' ? 'Organic Wholesalers' : 'Dropshippers & Resellers'}.
                    </p>
                  </div>
                )}

                {/* EXPORTER SPECIFIC FIELDS */}
                {isExporterRole && (
                  <>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-800 mb-1">IEC - Import Export Code (Optional)</label>
                      <input
                        id="input-iec-code"
                        type="text"
                        maxLength={12}
                        value={iecCode}
                        onChange={(e) => setIecCode(e.target.value.toUpperCase())}
                        placeholder="e.g. 0123456789"
                        className="w-full bg-white border border-blue-200 rounded-xl p-3 text-xs font-mono uppercase text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1] focus:ring-1 focus:ring-[#0d47a1]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-800 mb-1">Business Registration Number (Optional)</label>
                      <input
                        id="input-business-reg-number"
                        type="text"
                        value={businessRegNumber}
                        onChange={(e) => setBusinessRegNumber(e.target.value)}
                        placeholder="e.g. CIN / MSME / Udyam Reg No."
                        className="w-full bg-white border border-blue-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1] focus:ring-1 focus:ring-[#0d47a1]"
                      />
                    </div>
                  </>
                )}

                {/* COUNTRY */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800 mb-1">Country (Optional)</label>
                  <GoogleLocationInput
                    value={country}
                    onChange={(val) => setCountry(val)}
                    placeholder="Search country (e.g. India, UAE, USA...)"
                  />
                </div>

                {/* LOCATION */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-800">
                      Location (City / State / Address) (Optional)
                    </label>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      🗺️ Google Autocomplete
                    </span>
                  </div>
                  <GoogleLocationInput
                    value={location}
                    onChange={(val, details) => {
                      setLocation(val);
                      if (details) {
                        if (details.formattedAddress && !storeAddress) setStoreAddress(details.formattedAddress);
                        if (details.lat !== undefined && details.lng !== undefined) {
                          setCoords({ lat: details.lat, lng: details.lng });
                        }
                      }
                    }}
                    placeholder="Type & search city, state, or address..."
                  />
                </div>

                {/* STORE / WAREHOUSE ADDRESS */}
                {isWholesalerRole && (
                  <div className="md:col-span-2 space-y-1">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-800">
                        Store / Warehouse Exact Address (Optional)
                      </label>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 font-bold px-2 py-0.5 rounded border border-emerald-200">
                        📍 GPS & Exact Address
                      </span>
                    </div>
                    <GoogleLocationInput
                      value={storeAddress}
                      onChange={(val, details) => {
                        setStoreAddress(val);
                        if (details) {
                          if (details.lat !== undefined && details.lng !== undefined) {
                            setCoords({ lat: details.lat, lng: details.lng });
                          }
                        }
                      }}
                      placeholder="e.g. Shop 102, Ring Road Textile Market, Surat"
                    />
                    {coords.lat && coords.lng && (
                      <p className="text-[10px] text-slate-500 font-mono mt-1">
                        ✓ Google GPS Coordinates: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                      </p>
                    )}
                  </div>
                )}

                {/* INSTAGRAM PROFILE */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-800">
                      Instagram Profile (Optional)
                    </label>
                    <span className="text-[10px] text-pink-700 bg-pink-50 font-bold px-2 py-0.5 rounded border border-pink-200">
                      📸 Instagram
                    </span>
                  </div>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-pink-500 text-xs flex items-center pointer-events-none">
                      <Instagram className="w-3.5 h-3.5 text-pink-600" />
                    </span>
                    <input
                      id="input-instagram"
                      type="text"
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      placeholder="e.g. your_instagram_handle or @yourcompany"
                      className="w-full bg-white border border-blue-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1] focus:ring-1 focus:ring-[#0d47a1]"
                    />
                  </div>
                </div>

                {/* BUSINESS WEBSITE */}
                {!isWebsiteHidden && (
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Website Link (Optional)
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-slate-400 text-xs">🌐</span>
                      <input
                        id="input-website"
                        type="text"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="https://yourwebsite.com"
                        className="w-full bg-white border border-blue-200 rounded-xl pl-8 pr-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1] focus:ring-1 focus:ring-[#0d47a1]"
                      />
                    </div>
                  </div>
                )}

                {/* BUSINESS BIO */}
                <div className="md:col-span-2 space-y-1">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Business Bio / Description (Optional)
                  </label>
                  <textarea
                    id="input-bio"
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="e.g. Manufacturer of 100% combed cotton garments & export packaging. Low MOQ."
                    className="w-full bg-white border border-blue-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1] focus:ring-1 focus:ring-[#0d47a1] resize-none"
                  />
                </div>

                {/* PROFILE PHOTO */}
                <div className="md:col-span-2 space-y-1">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Profile Photo / Logo (Optional)
                  </label>
                  <div className="flex items-center space-x-4 bg-white border border-blue-200 rounded-xl p-3">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-12 h-12 rounded-full object-cover border-2 border-[#0d47a1] shadow-xs" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-100 text-[#0d47a1] font-bold text-base flex items-center justify-center">
                        {isUploadingAvatar ? '⏳' : '📷'}
                      </div>
                    )}
                    <label className={`flex-1 text-center font-bold text-xs py-2.5 rounded-lg border transition ${
                      isUploadingAvatar
                        ? 'bg-blue-100 text-blue-800 border-blue-300 cursor-wait'
                        : 'bg-blue-50 hover:bg-blue-100 text-[#0d47a1] border-blue-200 cursor-pointer'
                    }`}>
                      {isUploadingAvatar ? 'Uploading...' : avatarUrl ? 'Change Photo' : 'Upload Profile Photo'}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingAvatar}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => {
                              if (typeof reader.result === 'string') {
                                setCropImageSrc(reader.result);
                                setIsCropModalOpen(true);
                              }
                            };
                            reader.readAsDataURL(file);
                            e.target.value = '';
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-3 pb-12 sm:pb-16 mb-6">
              <button
                type="submit"
                id="btn-auth-submit"
                disabled={!isSubmitEnabled || isSubmitting}
                className={`w-full sm:w-auto sm:min-w-[320px] font-bold py-4 px-8 rounded-xl text-sm transition shadow-md flex items-center justify-center gap-2 ${
                  isSubmitEnabled && !isSubmitting
                    ? 'bg-[#0d47a1] hover:bg-blue-700 active:scale-98 text-white cursor-pointer'
                    : 'bg-blue-300 text-white cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {isEditingExisting
                        ? 'Save Profile Changes'
                        : detectedProfile
                        ? 'Sign In to Your Account'
                        : 'Continue to Dropthan'}
                    </span>
                    <span className="text-base font-extrabold">→</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* PROFILE PICTURE CROP MODAL */}
      <ImageCropModal
        isOpen={isCropModalOpen}
        imageSrc={cropImageSrc}
        initialAspectRatio="1:1"
        allowedAspectRatios={['1:1']}
        cropShape="circle"
        allowShapeToggle={true}
        title="Customize Profile Photo"
        subtitle="Zoom and frame your profile photo or company logo."
        onCropComplete={async (croppedBlob, croppedDataUrl, croppedFile) => {
          setIsUploadingAvatar(true);
          try {
            const publicUrl = await uploadAvatarToSupabase(
              croppedFile,
              fullName || companyName || 'user',
              selectedRole || 'wholesaler'
            );
            setAvatarUrl(publicUrl);
          } catch (err) {
            setAvatarUrl(croppedDataUrl);
          } finally {
            setIsUploadingAvatar(false);
          }
        }}
        onClose={() => {
          setIsCropModalOpen(false);
          setCropImageSrc('');
        }}
      />
    </div>
  );
};
