import React, { useState } from 'react';
import { UserRole, UserProfile, UserStatus } from '../types';
import { uploadAvatarToSupabase, saveUserProfileToSupabase, fetchFullUserProfileByPhone } from '../lib/supabase';
import { InternationalPhoneInput, isPhoneValid as checkInternationalPhoneValid } from './InternationalPhoneInput';
import { GoogleLocationInput } from './GoogleLocationInput';
import { Instagram } from 'lucide-react';

interface OnboardingModalProps {
  onComplete: (user: UserProfile) => void;
  onCancel?: () => void;
  currentUser?: UserProfile | null;
}

const TICKER_HIGHLIGHTS = [
  { icon: '🛡️', title: 'Verified B2B Suppliers' },
  { icon: '📦', title: 'Direct Dropshipping' },
  { icon: '⚡', title: 'Zero Commission Orders' },
  { icon: '🔒', title: 'Secure Transactions' },
  { icon: '🌱', title: 'GST Exempt Organic Goods' },
  { icon: '🌐', title: 'Global Exporters & Trade' },
  { icon: '🖨️', title: 'Custom Printing & Packaging' },
  { icon: '🚀', title: 'Low MOQ Wholesale' },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete, onCancel, currentUser }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [gstin, setGstin] = useState('');
  const [iecCode, setIecCode] = useState('');
  const [businessRegNumber, setBusinessRegNumber] = useState('');
  const [country, setCountry] = useState('India');
  const [location, setLocation] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [instagram, setInstagram] = useState('');
  const [website, setWebsite] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const isWholesalerRole = selectedRole === 'wholesaler';
  const isGstinHidden = selectedRole === 'organic_wholesaler' || selectedRole === 'reseller' || selectedRole === 'dropshipper' || selectedRole === 'influencer';
  const isWebsiteHidden = selectedRole === 'influencer' || selectedRole === 'reseller' || selectedRole === 'dropshipper';
  const isOrganicRole = selectedRole === 'organic_wholesaler';
  const isCompanyRole = selectedRole === 'wholesaler' || selectedRole === 'organic_wholesaler' || selectedRole === 'exporter' || selectedRole === 'marketing' || selectedRole === 'printing';
  const isExporterRole = selectedRole === 'exporter';
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  const isGstinValid = gstinRegex.test(gstin.trim().toUpperCase());
  const isIecValid = iecCode.trim().length >= 8;
  const isPhoneValid = checkInternationalPhoneValid(phone) || phone.trim().replace(/[^0-9]/g, '').length >= 8;

  const isValid = (() => {
    if (!selectedRole) return false;
    if (!isPhoneValid) return false;
    if (!country.trim()) return false;
    if (location.trim().length === 0) return false;
    if (isGstinHidden) {
      return companyName.trim().length > 0 || fullName.trim().length > 0;
    }
    if (isExporterRole) {
      return companyName.trim().length > 0 && isGstinValid && isIecValid;
    }
    if (isCompanyRole) {
      return companyName.trim().length > 0 && isGstinValid;
    }
    return fullName.trim().length > 0;
  })();

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
  };

  const handleDetectLocation = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          setLocation('Surat, Gujarat (Pinned)');
          setIsLocating(false);
        },
        () => {
          setLocation('Mumbai, Maharashtra');
          setIsLocating(false);
        }
      );
    } else {
      setLocation('Delhi NCR');
      setIsLocating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !selectedRole || isSubmitting) return;

    setIsSubmitting(true);

    const formattedPhone = phone.trim();
    const formattedGstin = gstin.trim().toUpperCase();

    let existingProfile: UserProfile | null = null;
    try {
      existingProfile = await fetchFullUserProfileByPhone(formattedPhone);
      if (existingProfile) {
        console.log('🔒 Account found! Merging and updating user profile for:', formattedPhone);
      }
    } catch (err) {
      console.warn('Notice checking existing profile:', err);
    }

    // Force Pending status on Signup for B2B users (Wholesaler, Marketing Agency, Exporter, Organic, Printing) and GST registrations
    const isB2BOrGstRole =
      selectedRole === 'wholesaler' ||
      selectedRole === 'organic_wholesaler' ||
      selectedRole === 'exporter' ||
      selectedRole === 'marketing' ||
      selectedRole === 'printing' ||
      Boolean(formattedGstin && formattedGstin.trim().length > 0);

    const initialStatus: UserStatus = existingProfile?.status || (isB2BOrGstRole ? 'Pending' : 'Active');

    const cleanInstagram = instagram.trim()
      ? instagram.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/\/$/, '')
      : undefined;

    const profileToSave: UserProfile = {
      role: existingProfile?.role || selectedRole,
      phone: formattedPhone,
      country: country.trim() || existingProfile?.country || 'India',
      location: location.trim() || existingProfile?.location || '',
      storeAddress: isWholesalerRole ? (storeAddress.trim() || location.trim() || existingProfile?.storeAddress) : undefined,
      lat: coords.lat ?? existingProfile?.lat,
      lng: coords.lng ?? existingProfile?.lng,
      createdAt: existingProfile?.createdAt || new Date().toISOString(),
      displayName: isCompanyRole ? (companyName.trim() || existingProfile?.displayName || 'Member') : (fullName.trim() || existingProfile?.displayName || 'Member'),
      fullName: fullName.trim() || existingProfile?.fullName || (isCompanyRole ? companyName.trim() : undefined),
      companyName: isCompanyRole ? (companyName.trim() || existingProfile?.companyName) : undefined,
      bio: bio.trim() || existingProfile?.bio || undefined,
      description: bio.trim() || existingProfile?.description || undefined,
      avatarUrl: avatarUrl || existingProfile?.avatarUrl || undefined,
      instagram: cleanInstagram || existingProfile?.instagram || undefined,
      instagramHandle: cleanInstagram || existingProfile?.instagramHandle || undefined,
      website: !isWebsiteHidden && website.trim() ? (website.trim().startsWith('http') ? website.trim() : `https://${website.trim()}`) : existingProfile?.website,
      websiteUrl: !isWebsiteHidden && website.trim() ? (website.trim().startsWith('http') ? website.trim() : `https://${website.trim()}`) : existingProfile?.websiteUrl,
      status: initialStatus,
    };

    if (isCompanyRole && !isGstinHidden) {
      profileToSave.gstin = formattedGstin || existingProfile?.gstin;
    }
    if (isExporterRole) {
      profileToSave.iecCode = iecCode.trim().toUpperCase() || existingProfile?.iecCode;
      profileToSave.businessRegNumber = businessRegNumber.trim() || existingProfile?.businessRegNumber || undefined;
    }

    try {
      // Explicitly call and await Supabase insert/upsert to save user details into 'profiles' table permanently
      const saved = await saveUserProfileToSupabase(profileToSave);
      localStorage.setItem('dropthan_user', JSON.stringify(saved));
      try {
        window.dispatchEvent(new CustomEvent('dropthan_profiles_updated'));
      } catch (e) {}
    } catch (err) {
      console.warn('Notice saving user profile during signup:', err);
      localStorage.setItem('dropthan_user', JSON.stringify(profileToSave));
    } finally {
      setIsSubmitting(false);
      onComplete(profileToSave);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-3xl p-5 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl border border-blue-100 max-h-[85vh] overflow-y-auto custom-scrollbar my-auto">
        {/* CONDITIONAL BACK BUTTON - HIDDEN ON FRESH LOGIN (currentUser === null) */}
        {currentUser && onCancel && (
          <div className="flex items-center justify-between pb-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 px-3 py-1.5 rounded-xl border border-slate-200 transition cursor-pointer"
            >
              <span className="text-sm font-extrabold">←</span>
              <span>Back</span>
            </button>
            <span className="text-[11px] font-semibold text-slate-500">Edit Details</span>
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

        <div className="text-center space-y-2 bg-[#0d47a1] text-white p-6 rounded-3xl shadow-md">
          <div className="inline-block bg-white text-[#0d47a1] font-black text-3xl px-5 py-2 rounded-2xl tracking-tighter italic shadow-sm">
            dptn
          </div>
          <h2 className="text-2xl font-extrabold text-white">Welcome to Dropthan</h2>
          <p className="text-xs text-blue-100">Step 2 of 2: Select your role & complete B2B details</p>
        </div>

        {/* ROLE SELECTION */}
        <div className="space-y-2.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#0d47a1]">Select Business Category</label>

          {/* Wholesaler */}
          <div
            onClick={() => handleRoleSelect('wholesaler')}
            className={`border-2 p-3.5 rounded-2xl cursor-pointer transition flex items-center justify-between shadow-sm ${
              selectedRole === 'wholesaler'
                ? 'border-[#0d47a1] bg-blue-50 text-[#0d47a1]'
                : 'border-blue-100 bg-white hover:border-blue-300 text-slate-800'
            }`}
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">📦</span>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Standard Wholesaler</h4>
                <p className="text-[10px] text-slate-500">Upload bulk inventory, set MOQ & pricing. (GSTIN Required)</p>
              </div>
            </div>
            <div className="w-4 h-4 rounded-full border-2 border-blue-300 flex items-center justify-center">
              {selectedRole === 'wholesaler' && <div className="w-2.5 h-2.5 rounded-full bg-[#0d47a1]" />}
            </div>
          </div>

          {/* Organic Wholesaler */}
          <div
            onClick={() => handleRoleSelect('organic_wholesaler')}
            className={`border-2 p-3.5 rounded-2xl cursor-pointer transition flex items-center justify-between shadow-sm ${
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
                <p className="text-[10px] text-slate-500">Agro, coco fiber, cotton, neem & natural goods. (GST Optional for Farmers)</p>
              </div>
            </div>
            <div className="w-4 h-4 rounded-full border-2 border-emerald-400 flex items-center justify-center">
              {selectedRole === 'organic_wholesaler' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-700" />}
            </div>
          </div>

          {/* Exporter */}
          <div
            onClick={() => handleRoleSelect('exporter')}
            className={`border-2 p-3.5 rounded-2xl cursor-pointer transition flex items-center justify-between shadow-sm ${
              selectedRole === 'exporter'
                ? 'border-[#0d47a1] bg-blue-50 text-[#0d47a1]'
                : 'border-blue-100 bg-white hover:border-blue-300 text-slate-800'
            }`}
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🌐</span>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Exporter</h4>
                <p className="text-[10px] text-slate-500">Global cross-border trade, bulk shipping. (GSTIN & IEC Code Required)</p>
              </div>
            </div>
            <div className="w-4 h-4 rounded-full border-2 border-blue-300 flex items-center justify-center">
              {selectedRole === 'exporter' && <div className="w-2.5 h-2.5 rounded-full bg-[#0d47a1]" />}
            </div>
          </div>

          {/* Digital Marketing Agency */}
          <div
            onClick={() => handleRoleSelect('marketing')}
            className={`border-2 p-3.5 rounded-2xl cursor-pointer transition flex items-center justify-between shadow-sm ${
              selectedRole === 'marketing'
                ? 'border-[#0d47a1] bg-blue-50 text-[#0d47a1]'
                : 'border-blue-100 bg-white hover:border-blue-300 text-slate-800'
            }`}
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">📢</span>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Digital Marketing Agency</h4>
                <p className="text-[10px] text-slate-500">Offer ad campaigns, lead generation & web design. (GSTIN Required)</p>
              </div>
            </div>
            <div className="w-4 h-4 rounded-full border-2 border-blue-300 flex items-center justify-center">
              {selectedRole === 'marketing' && <div className="w-2.5 h-2.5 rounded-full bg-[#0d47a1]" />}
            </div>
          </div>

          {/* Print & Packaging */}
          <div
            onClick={() => handleRoleSelect('printing')}
            className={`border-2 p-3.5 rounded-2xl cursor-pointer transition flex items-center justify-between shadow-sm ${
              selectedRole === 'printing'
                ? 'border-[#0d47a1] bg-blue-50 text-[#0d47a1]'
                : 'border-blue-100 bg-white hover:border-blue-300 text-slate-800'
            }`}
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🖨️</span>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Print & Packaging Company</h4>
                <p className="text-[10px] text-slate-500">Box printing, sticker labels, corrugated boxes. (GSTIN Required)</p>
              </div>
            </div>
            <div className="w-4 h-4 rounded-full border-2 border-blue-300 flex items-center justify-center">
              {selectedRole === 'printing' && <div className="w-2.5 h-2.5 rounded-full bg-[#0d47a1]" />}
            </div>
          </div>

          {/* Reseller / Dropshipper */}
          <div
            onClick={() => handleRoleSelect('reseller')}
            className={`border-2 p-3.5 rounded-2xl cursor-pointer transition flex items-center justify-between shadow-sm ${
              selectedRole === 'reseller'
                ? 'border-[#0d47a1] bg-blue-50 text-[#0d47a1]'
                : 'border-blue-100 bg-white hover:border-blue-300 text-slate-800'
            }`}
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🏷️</span>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Dropshipper / Buyer / Reseller</h4>
                <p className="text-[10px] text-slate-500">Source products with low MOQ & order directly.</p>
              </div>
            </div>
            <div className="w-4 h-4 rounded-full border-2 border-blue-300 flex items-center justify-center">
              {selectedRole === 'reseller' && <div className="w-2.5 h-2.5 rounded-full bg-[#0d47a1]" />}
            </div>
          </div>

          {/* Influencer */}
          <div
            onClick={() => handleRoleSelect('influencer')}
            className={`border-2 p-3.5 rounded-2xl cursor-pointer transition flex items-center justify-between shadow-sm ${
              selectedRole === 'influencer'
                ? 'border-[#0d47a1] bg-blue-50 text-[#0d47a1]'
                : 'border-blue-100 bg-white hover:border-blue-300 text-slate-800'
            }`}
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">📸</span>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Influencer / Content Creator</h4>
                <p className="text-[10px] text-slate-500">Showcase unboxings & promotional post packages.</p>
              </div>
            </div>
            <div className="w-4 h-4 rounded-full border-2 border-blue-300 flex items-center justify-center">
              {selectedRole === 'influencer' && <div className="w-2.5 h-2.5 rounded-full bg-[#0d47a1]" />}
            </div>
          </div>
        </div>

        {/* DYNAMIC CONDITIONAL FORM FIELDS */}
        {selectedRole && (
          <form onSubmit={handleSubmit} className="space-y-3 pt-2 transition-all">
            {isCompanyRole ? (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 mb-1">Company / Business Name *</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Apex Global Exports / Apex Wholesalers"
                    className="w-full bg-white border border-blue-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1] focus:ring-1 focus:ring-[#0d47a1]"
                  />
                </div>

                {!isGstinHidden && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      GSTIN Registration (Mandatory 15 Chars) *
                    </label>
                    <input
                      type="text"
                      maxLength={15}
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase())}
                      placeholder="e.g. 33AAAAA0000A1Z5"
                      className="w-full bg-white border border-blue-200 rounded-xl p-3 text-xs font-mono uppercase text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1] focus:ring-1 focus:ring-[#0d47a1]"
                    />
                    {gstin.length > 0 && isGstinValid ? (
                      <p className="text-[10px] text-blue-700 mt-1 font-bold">✓ Valid GSTIN Number format</p>
                    ) : (
                      <p className="text-[10px] text-blue-900 mt-1 font-semibold">⚠️ Mandatory: 15 alphanumeric characters GST number</p>
                    )}
                  </div>
                )}

                {isExporterRole && (
                  <>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-800 mb-1">IEC - Import Export Code (Mandatory for Exporters) *</label>
                      <input
                        type="text"
                        maxLength={12}
                        value={iecCode}
                        onChange={(e) => setIecCode(e.target.value.toUpperCase())}
                        placeholder="e.g. 0123456789"
                        className="w-full bg-white border border-blue-200 rounded-xl p-3 text-xs font-mono uppercase text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1] focus:ring-1 focus:ring-[#0d47a1]"
                      />
                      {iecCode.length >= 8 ? (
                        <p className="text-[10px] text-blue-700 mt-1 font-bold">✓ Valid IEC Code format</p>
                      ) : (
                        <p className="text-[10px] text-blue-900 mt-1 font-semibold">⚠️ Mandatory Export License Proof (min 8 chars)</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-800 mb-1">Business Registration Number (Optional)</label>
                      <input
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
              <div>
                <label className="block text-[11px] font-bold text-slate-800 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-white border border-blue-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1] focus:ring-1 focus:ring-[#0d47a1]"
                />
              </div>
            )}

            {/* MANDATORY COUNTRY FIELD FOR ALL ROLES */}
            <div>
              <label className="block text-[11px] font-bold text-slate-800 mb-1">Country *</label>
              <GoogleLocationInput
                value={country}
                onChange={(val) => setCountry(val)}
                placeholder="Search country (e.g. India, UAE, USA...)"
              />
            </div>

            {/* MANDATORY LOCATION FIELD WITH GOOGLE PLACES AUTOCOMPLETE */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-800">
                  Location (City / State / Address) *
                </label>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  🗺️ Google Maps Autocomplete
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

            {/* STORE / WAREHOUSE EXACT ADDRESS FIELD - SHOWN ONLY FOR WHOLESALER ROLE */}
            {isWholesalerRole && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-800">
                    Store / Warehouse Exact Address
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

            {/* MANDATORY INTERNATIONAL PHONE NUMBER FIELD FOR ALL ROLES */}
            <div>
              <label className="block text-[11px] font-bold text-slate-800 mb-1">
                International Phone Number (Mandatory) *
              </label>
              <InternationalPhoneInput
                value={phone}
                onChange={(p) => setPhone(p)}
                defaultCountry="in"
                placeholder="Enter mobile phone number"
              />
            </div>

            {/* OPTIONAL INSTAGRAM PROFILE FIELD */}
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
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="e.g. your_instagram_handle or @yourcompany"
                  className="w-full bg-white border border-blue-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1] focus:ring-1 focus:ring-[#0d47a1]"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Opens https://www.instagram.com/[username] when clicked on your public profile.
              </p>
            </div>

            {/* OPTIONAL BUSINESS WEBSITE LINK FIELD (RIGHT BELOW SOCIAL HANDLE) - HIDDEN FOR INFLUENCER & DROPSHIPPER/RESELLER */}
            {!isWebsiteHidden && (
              <div>
                <label className="block text-[11px] font-bold text-slate-800 mb-1">
                  Website Link (Optional)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400 text-xs">🌐</span>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://yourwebsite.com"
                    className="w-full bg-white border border-blue-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1] focus:ring-1 focus:ring-[#0d47a1]"
                  />
                </div>
              </div>
            )}

            {/* BUSINESS BIO / DESCRIPTION FIELD */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-800">
                  Business Bio / Description
                </label>
                <span className="text-[10px] font-semibold text-slate-500">Public Profile Bio</span>
              </div>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="e.g. Manufacturer of 100% combed cotton t-shirts & custom export packaging. Direct factory prices, Low MOQ."
                className="w-full bg-white border border-blue-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1] focus:ring-1 focus:ring-[#0d47a1] resize-none"
              />
            </div>

            {/* OPTIONAL PROFILE PHOTO UPLOAD */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-800">Profile Photo / DP (Optional)</label>
                {avatarUrl && (
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                    ✓ Cloudinary Ready
                  </span>
                )}
              </div>
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
                  {isUploadingAvatar
                    ? 'Uploading to Cloudinary...'
                    : avatarUrl
                    ? 'Change Photo'
                    : 'Upload Profile Photo'}
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

            {/* STICKY CONTINUE BUTTON */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={!isValid || isSubmitting}
                className={`w-full font-bold py-3.5 rounded-xl text-sm transition shadow-md flex items-center justify-center gap-2 ${
                  isValid && !isSubmitting
                    ? 'bg-[#0d47a1] hover:bg-blue-700 text-white cursor-pointer'
                    : 'bg-blue-300 text-white cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving Profile...</span>
                  </>
                ) : (
                  <>
                    <span>Continue to Home</span> →
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
