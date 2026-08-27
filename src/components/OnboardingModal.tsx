import React, { useState } from 'react';
import { UserRole, UserProfile } from '../types';
import {
  uploadAvatarToSupabase,
  authenticateOrRegisterUser,
} from '../lib/supabase';
import { InternationalPhoneInput, isPhoneValid as checkInternationalPhoneValid } from './InternationalPhoneInput';
import { GoogleLocationInput } from './GoogleLocationInput';
import { Instagram, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

interface OnboardingModalProps {
  onComplete: (user: UserProfile) => void;
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

  const isWholesalerRole = selectedRole === 'wholesaler';

  // GSTIN Exemption Rule: Hide / Not Required for Influencer, Dropshipper/Reseller, Organic Wholesaler
  const isGstinHidden =
    selectedRole === 'organic_wholesaler' ||
    selectedRole === 'reseller' ||
    selectedRole === 'dropshipper' ||
    selectedRole === 'influencer';

  const isWebsiteHidden = selectedRole === 'influencer' || selectedRole === 'reseller' || selectedRole === 'dropshipper';
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
    const validId = currentUser?.id || (phoneDigits ? `usr_${phoneDigits}` : `usr_${Date.now()}`);

    const resolvedDisplayName =
      (isCompanyRole ? companyName.trim() : fullName.trim()) ||
      companyName.trim() ||
      fullName.trim() ||
      currentUser?.displayName ||
      'Dropthan Member';

    const profileData: Partial<UserProfile> & { phone: string; password: string } = {
      id: validId,
      role: selectedRole || currentUser?.role || 'wholesaler',
      phone: formattedPhone,
      password: enteredPassword,
      country: country.trim() || currentUser?.country || 'India',
      location: location.trim() || currentUser?.location || '',
      storeAddress: isWholesalerRole
        ? (storeAddress.trim() || location.trim() || currentUser?.storeAddress)
        : (location.trim() || undefined),
      lat: coords.lat ?? currentUser?.lat,
      lng: coords.lng ?? currentUser?.lng,
      createdAt: currentUser?.createdAt || new Date().toISOString(),
      displayName: resolvedDisplayName,
      fullName: fullName.trim() || currentUser?.fullName || (isCompanyRole && companyName.trim() ? companyName.trim() : undefined),
      companyName: isCompanyRole ? (companyName.trim() || currentUser?.companyName) : undefined,
      bio: bio.trim() || currentUser?.bio || undefined,
      description: bio.trim() || currentUser?.description || undefined,
      avatarUrl: avatarUrl || currentUser?.avatarUrl || undefined,
      instagram: cleanInstagram || currentUser?.instagram || undefined,
      instagramHandle: cleanInstagram || currentUser?.instagramHandle || undefined,
      website: !isWebsiteHidden && website.trim()
        ? (website.trim().startsWith('http') ? website.trim() : `https://${website.trim()}`)
        : currentUser?.website,
      websiteUrl: !isWebsiteHidden && website.trim()
        ? (website.trim().startsWith('http') ? website.trim() : `https://${website.trim()}`)
        : currentUser?.websiteUrl,
      status: currentUser?.status || 'Active',
    };

    if (!isGstinHidden && formattedGstin) {
      profileData.gstin = formattedGstin;
    }
    if (isExporterRole && iecCode.trim()) {
      profileData.iecCode = iecCode.trim().toUpperCase();
    }
    if (businessRegNumber.trim()) {
      profileData.businessRegNumber = businessRegNumber.trim();
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
        onComplete(authenticatedUser);
      }, 400);
    } catch (err: any) {
      console.error('Authentication error:', err);
      setAuthError(err?.message || 'Authentication failed. Please check your credentials.');
      setIsSubmitting(false);
    }
  };

  return (
    <div id="dropthan-onboarding-modal-overlay" className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div id="dropthan-onboarding-card" className="bg-white w-full max-w-md rounded-3xl p-5 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl border border-blue-100 max-h-[88vh] overflow-y-auto custom-scrollbar my-auto">
        {/* CONDITIONAL BACK BUTTON - SHOWN ONLY IF EDITING */}
        {currentUser && onCancel && (
          <div className="flex items-center justify-between pb-1">
            <button
              type="button"
              id="btn-onboarding-back"
              onClick={onCancel}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 px-3 py-1.5 rounded-xl border border-slate-200 transition cursor-pointer"
            >
              <span className="text-sm font-extrabold">←</span>
              <span>Back</span>
            </button>
            <span className="text-[11px] font-semibold text-slate-500">Edit Business Details</span>
          </div>
        )}

        {/* SCROLLING ANNOUNCEMENT TICKER */}
        <div className="w-full bg-slate-900 text-white rounded-2xl overflow-hidden py-2.5 px-3 shadow-md border border-slate-800">
          <div className="flex items-center gap-2">
            <span className="bg-blue-600/30 text-blue-300 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border border-blue-400/30 shrink-0 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              HIGHLIGHTS
            </span>
            <div className="overflow-hidden relative w-full">
              <div className="flex gap-6 whitespace-nowrap animate-marquee">
                {TICKER_HIGHLIGHTS.concat(TICKER_HIGHLIGHTS).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-slate-200 text-xs">
                    <span>{item.icon}</span>
                    <span className="font-bold text-white text-[11px]">{item.title}</span>
                    <span className="text-slate-500 text-[10px] ml-1">•</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* HERO BANNER */}
        <div className="text-center space-y-2 bg-[#0d47a1] text-white p-5 sm:p-6 rounded-3xl shadow-md">
          <div className="inline-block bg-white text-[#0d47a1] font-black text-3xl px-5 py-2 rounded-2xl tracking-tighter italic shadow-sm">
            dptn
          </div>
          <h2 className="text-2xl font-extrabold text-white">
            {isEditingExisting ? 'Edit Profile' : 'Sign In / Register'}
          </h2>
          <p className="text-xs text-blue-100">
            {isEditingExisting
              ? 'Update your business information & settings'
              : 'Direct wholesale & dropshipping platform. Sign in or create a new account.'}
          </p>
        </div>

        {/* INLINE AUTH ERROR MESSAGE */}
        {authError && (
          <div id="auth-error-banner" className="p-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs space-y-1 animate-shake">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>Authentication Notice</span>
            </div>
            <p className="text-[11px] font-semibold leading-relaxed">{authError}</p>
          </div>
        )}

        {/* INLINE AUTH SUCCESS MESSAGE */}
        {authSuccessMsg && (
          <div id="auth-success-banner" className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold">{authSuccessMsg}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* UNIFIED SIGN IN / REGISTER FORM */}
        {/* ========================================================================= */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ROLE SELECTION */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#0d47a1]">
              Select Business Category
            </label>

            {/* Wholesaler */}
            <div
              id="role-option-wholesaler"
              onClick={() => handleRoleSelect('wholesaler')}
              className={`border-2 p-3 rounded-2xl cursor-pointer transition flex items-center justify-between shadow-sm ${
                selectedRole === 'wholesaler'
                  ? 'border-[#0d47a1] bg-blue-50 text-[#0d47a1]'
                  : 'border-blue-100 bg-white hover:border-blue-300 text-slate-800'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">📦</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Standard Wholesaler</h4>
                  <p className="text-[10px] text-slate-500">Upload bulk inventory, set MOQ & pricing.</p>
                </div>
              </div>
              <div className="w-4 h-4 rounded-full border-2 border-blue-300 flex items-center justify-center">
                {selectedRole === 'wholesaler' && <div className="w-2.5 h-2.5 rounded-full bg-[#0d47a1]" />}
              </div>
            </div>

            {/* Organic Wholesaler */}
            <div
              id="role-option-organic-wholesaler"
              onClick={() => handleRoleSelect('organic_wholesaler')}
              className={`border-2 p-3 rounded-2xl cursor-pointer transition flex items-center justify-between shadow-sm ${
                selectedRole === 'organic_wholesaler'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                  : 'border-emerald-100 bg-white hover:border-emerald-300 text-slate-800'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🌱</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1">
                    Organic Wholesaler <span className="text-[9px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-extrabold">GST Exempted</span>
                  </h4>
                  <p className="text-[10px] text-slate-500">Agro, coco fiber, cotton, neem & natural goods.</p>
                </div>
              </div>
              <div className="w-4 h-4 rounded-full border-2 border-emerald-400 flex items-center justify-center">
                {selectedRole === 'organic_wholesaler' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-700" />}
              </div>
            </div>

            {/* Exporter */}
            <div
              id="role-option-exporter"
              onClick={() => handleRoleSelect('exporter')}
              className={`border-2 p-3 rounded-2xl cursor-pointer transition flex items-center justify-between shadow-sm ${
                selectedRole === 'exporter'
                  ? 'border-[#0d47a1] bg-blue-50 text-[#0d47a1]'
                  : 'border-blue-100 bg-white hover:border-blue-300 text-slate-800'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🌐</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Exporter</h4>
                  <p className="text-[10px] text-slate-500">Global cross-border trade, bulk shipping.</p>
                </div>
              </div>
              <div className="w-4 h-4 rounded-full border-2 border-blue-300 flex items-center justify-center">
                {selectedRole === 'exporter' && <div className="w-2.5 h-2.5 rounded-full bg-[#0d47a1]" />}
              </div>
            </div>

            {/* Print & Packaging */}
            <div
              id="role-option-printing"
              onClick={() => handleRoleSelect('printing')}
              className={`border-2 p-3 rounded-2xl cursor-pointer transition flex items-center justify-between shadow-sm ${
                selectedRole === 'printing'
                  ? 'border-[#0d47a1] bg-blue-50 text-[#0d47a1]'
                  : 'border-blue-100 bg-white hover:border-blue-300 text-slate-800'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🖨️</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Print & Packaging Company</h4>
                  <p className="text-[10px] text-slate-500">Box printing, sticker labels, cartons.</p>
                </div>
              </div>
              <div className="w-4 h-4 rounded-full border-2 border-blue-300 flex items-center justify-center">
                {selectedRole === 'printing' && <div className="w-2.5 h-2.5 rounded-full bg-[#0d47a1]" />}
              </div>
            </div>

            {/* Reseller / Dropshipper */}
            <div
              id="role-option-reseller"
              onClick={() => handleRoleSelect('reseller')}
              className={`border-2 p-3 rounded-2xl cursor-pointer transition flex items-center justify-between shadow-sm ${
                selectedRole === 'reseller'
                  ? 'border-[#0d47a1] bg-blue-50 text-[#0d47a1]'
                  : 'border-blue-100 bg-white hover:border-blue-300 text-slate-800'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🏷️</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1">
                    Dropshipper / Buyer <span className="text-[9px] bg-blue-200 text-blue-900 px-1.5 py-0.5 rounded font-extrabold">GST Exempted</span>
                  </h4>
                  <p className="text-[10px] text-slate-500">Source products with low MOQ & order directly.</p>
                </div>
              </div>
              <div className="w-4 h-4 rounded-full border-2 border-blue-300 flex items-center justify-center">
                {selectedRole === 'reseller' && <div className="w-2.5 h-2.5 rounded-full bg-[#0d47a1]" />}
              </div>
            </div>

            {/* Influencer */}
            <div
              id="role-option-influencer"
              onClick={() => handleRoleSelect('influencer')}
              className={`border-2 p-3 rounded-2xl cursor-pointer transition flex items-center justify-between shadow-sm ${
                selectedRole === 'influencer'
                  ? 'border-[#0d47a1] bg-blue-50 text-[#0d47a1]'
                  : 'border-blue-100 bg-white hover:border-blue-300 text-slate-800'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">📸</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1">
                    Influencer / Creator <span className="text-[9px] bg-pink-200 text-pink-900 px-1.5 py-0.5 rounded font-extrabold">GST Exempted</span>
                  </h4>
                  <p className="text-[10px] text-slate-500">Showcase unboxings & promotional post packages.</p>
                </div>
              </div>
              <div className="w-4 h-4 rounded-full border-2 border-blue-300 flex items-center justify-center">
                {selectedRole === 'influencer' && <div className="w-2.5 h-2.5 rounded-full bg-[#0d47a1]" />}
              </div>
            </div>
          </div>

          {/* INTERNATIONAL PHONE NUMBER */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-800">
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
          </div>

          {/* ACCOUNT PASSWORD */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-800 flex items-center gap-1">
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

          {/* COMPANY NAME / FULL NAME */}
          {isCompanyRole ? (
            <>
              <div>
                <label className="block text-[11px] font-bold text-slate-800 mb-1">
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

              {/* DYNAMIC GSTIN FIELD: Hidden for Organic Wholesaler, Dropshipper, Influencer; Visible for others */}
              {!isGstinHidden ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-800">
                      GSTIN Registration (Optional)
                    </label>
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                      🔒 Strictly Confidential
                    </span>
                  </div>
                  <input
                    id="input-gstin"
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
                <div className="p-2.5 bg-emerald-50/60 border border-emerald-100 rounded-xl flex items-center gap-2">
                  <span className="text-base">🌱</span>
                  <p className="text-[11px] text-emerald-800 font-medium">
                    GSTIN is not required for {selectedRole === 'organic_wholesaler' ? 'Organic Wholesalers' : selectedRole === 'influencer' ? 'Content Creators' : 'Dropshippers'}.
                  </p>
                </div>
              )}

              {isExporterRole && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">IEC - Import Export Code (Optional)</label>
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

                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">Business Registration Number (Optional)</label>
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
            </>
          ) : (
            <>
              <div>
                <label className="block text-[11px] font-bold text-slate-800 mb-1">Full Name / Display Name (Optional)</label>
                <input
                  id="input-full-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-white border border-blue-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1] focus:ring-1 focus:ring-[#0d47a1]"
                />
              </div>

              {!isGstinHidden ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-800">
                      GSTIN Registration (Optional)
                    </label>
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                      🔒 Strictly Confidential
                    </span>
                  </div>
                  <input
                    id="input-gstin-non-company"
                    type="text"
                    maxLength={15}
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="e.g. 33AAAAA0000A1Z5"
                    className="w-full bg-white border border-blue-200 rounded-xl p-3 text-xs font-mono uppercase text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1] focus:ring-1 focus:ring-[#0d47a1]"
                  />
                </div>
              ) : (
                <div className="p-2.5 bg-blue-50/60 border border-blue-100 rounded-xl flex items-center gap-2">
                  <span className="text-base">{selectedRole === 'influencer' ? '📸' : '🏷️'}</span>
                  <p className="text-[11px] text-blue-800 font-medium">
                    GSTIN is not required for {selectedRole === 'influencer' ? 'Content Creators' : 'Dropshippers & Resellers'}.
                  </p>
                </div>
              )}
            </>
          )}

          {/* COUNTRY */}
          <div>
            <label className="block text-[11px] font-bold text-slate-800 mb-1">Country (Optional)</label>
            <GoogleLocationInput
              value={country}
              onChange={(val) => setCountry(val)}
              placeholder="Search country (e.g. India, UAE, USA...)"
            />
          </div>

          {/* LOCATION */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-800">
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
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-800">
                  Store / Warehouse Exact Address (Optional)
                </label>
                <span className="text-[9px] text-emerald-700 bg-emerald-50 font-bold px-1.5 py-0.5 rounded border border-emerald-200">
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
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-800">
                Instagram Profile (Optional)
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
                id="input-instagram"
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="e.g. your_instagram_handle or @yourcompany"
                className="w-full bg-white border border-blue-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1] focus:ring-1 focus:ring-[#0d47a1]"
              />
            </div>
          </div>

          {/* BUSINESS WEBSITE */}
          {!isWebsiteHidden && (
            <div>
              <label className="block text-[11px] font-bold text-slate-800 mb-1">
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
                  className="w-full bg-white border border-blue-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1] focus:ring-1 focus:ring-[#0d47a1]"
                />
              </div>
            </div>
          )}

          {/* BUSINESS BIO */}
          <div>
            <label className="block text-[11px] font-bold text-slate-800 mb-1">
              Business Bio / Description (Optional)
            </label>
            <textarea
              id="input-bio"
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="e.g. Manufacturer of 100% combed cotton garments & export packaging. Low MOQ."
              className="w-full bg-white border border-blue-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1] focus:ring-1 focus:ring-[#0d47a1] resize-none"
            />
          </div>

          {/* PROFILE PHOTO */}
          <div>
            <label className="block text-[11px] font-bold text-slate-800 mb-1">
              Profile Photo / Logo (Optional)
            </label>
            <div className="flex items-center space-x-3 bg-white border border-blue-200 rounded-xl p-2.5">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-[#0d47a1]" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-100 text-[#0d47a1] font-bold text-xs flex items-center justify-center">
                  {isUploadingAvatar ? '⏳' : '📷'}
                </div>
              )}
              <label className={`flex-1 text-center font-bold text-xs py-2 rounded-lg border transition ${
                isUploadingAvatar
                  ? 'bg-blue-100 text-blue-800 border-blue-300 cursor-wait'
                  : 'bg-blue-50 hover:bg-blue-100 text-[#0d47a1] border-blue-200 cursor-pointer'
              }`}>
                {isUploadingAvatar ? 'Uploading...' : avatarUrl ? 'Change Photo' : 'Upload Profile Photo'}
                <input
                  type="file"
                  accept="image/*"
                  disabled={isUploadingAvatar}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setIsUploadingAvatar(true);
                      try {
                        const publicUrl = await uploadAvatarToSupabase(
                          file,
                          fullName || companyName || 'user',
                          selectedRole || 'wholesaler'
                        );
                        setAvatarUrl(publicUrl);
                      } catch (err) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          if (typeof reader.result === 'string') {
                            setAvatarUrl(reader.result);
                          }
                        };
                        reader.readAsDataURL(file);
                      } finally {
                        setIsUploadingAvatar(false);
                      }
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="pt-3">
            <button
              type="submit"
              id="btn-auth-submit"
              disabled={!isSubmitEnabled || isSubmitting}
              className={`w-full font-bold py-3.5 rounded-xl text-sm transition shadow-md flex items-center justify-center gap-2 ${
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
                  <span>{isEditingExisting ? 'Save Profile Changes' : 'Continue to Dropthan'}</span> →
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
