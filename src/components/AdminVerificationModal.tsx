import React, { useState, useEffect } from 'react';
import { UserProfile, PostItem, LikeRecord } from '../types';
import {
  fetchAllUserProfilesFromSupabase,
  updateUserStatusInSupabase,
  deleteUserAccount,
  preRegisterUserAccount,
  fetchAllLikesFromSupabase,
  subscribeToAdminRealtime,
} from '../lib/supabase';

interface AdminVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserProfile | null;
  posts?: PostItem[];
  onStatusChanged?: () => void;
}

const ADMIN_PHONE = '8838533014';
const DEFAULT_PIN = '1234';

export const AdminVerificationModal: React.FC<AdminVerificationModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  posts = [],
  onStatusChanged,
}) => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [likesList, setLikesList] = useState<LikeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'approvals' | 'users' | 'daily' | 'products' | 'interactions' | 'sql'>('approvals');
  const [approvalFilter, setApprovalFilter] = useState<'pending' | 'all' | 'active' | 'rejected'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCopiedSql, setIsCopiedSql] = useState(false);
  
  // Security PIN states
  const [pinInput, setPinInput] = useState('');
  const [isPinAuthenticated, setIsPinAuthenticated] = useState(false);
  const [pinError, setPinError] = useState('');

  // Selected User Profile View Modal
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<UserProfile | null>(null);

  // Rejection Reason Modal
  const [rejectReasonModal, setRejectReasonModal] = useState<{
    isOpen: boolean;
    phone: string;
    name: string;
    reason: string;
  }>({
    isOpen: false,
    phone: '',
    name: '',
    reason: '',
  });

  // Delete User Confirmation Modal
  const [deleteUserModal, setDeleteUserModal] = useState<{
    isOpen: boolean;
    user: UserProfile | null;
    isDeleting: boolean;
  }>({
    isOpen: false,
    user: null,
    isDeleting: false,
  });

  // Pre-Register User Modal State
  const [preRegisterModal, setPreRegisterModal] = useState<{
    isOpen: boolean;
    phone: string;
    password: string;
    role: string;
    companyName: string;
    fullName: string;
    location: string;
    gstin: string;
    isSaving: boolean;
    error: string;
  }>({
    isOpen: false,
    phone: '+91 ',
    password: '',
    role: 'wholesaler',
    companyName: '',
    fullName: '',
    location: 'Surat, Gujarat',
    gstin: '',
    isSaving: false,
    error: '',
  });

  // Admin Notification / Toast State
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [copiedGstinPhone, setCopiedGstinPhone] = useState<string | null>(null);

  // Verify phone number match (STRICTLY REQUIRED: 8838533014)
  const userPhoneClean = currentUser?.phone ? currentUser.phone.replace(/\D/g, '') : '';
  const isAuthorizedPhone = userPhoneClean.endsWith(ADMIN_PHONE) || userPhoneClean === ADMIN_PHONE;

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [profilesData, likesData] = await Promise.all([
        fetchAllUserProfilesFromSupabase(),
        fetchAllLikesFromSupabase(),
      ]);
      setProfiles(profilesData);
      setLikesList(likesData);
    } catch (e) {
      console.error('Error fetching admin live data from Supabase:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (isAuthorizedPhone) {
        loadData();
      }
    } else {
      // Clear inputs and auth state on modal close
      setPinInput('');
      setPinError('');
      setIsPinAuthenticated(false);
      setSelectedUserForProfile(null);
    }
  }, [isOpen, isAuthorizedPhone]);

  // SUPABASE REALTIME SUBSCRIPTION FOR LIVE ADMIN MONITORING
  useEffect(() => {
    if (!isOpen || !isPinAuthenticated || !isAuthorizedPhone) return;

    const unsubscribe = subscribeToAdminRealtime({
      onProfilesChange: () => {
        fetchAllUserProfilesFromSupabase().then((data) => {
          setProfiles(data);
          if (onStatusChanged) onStatusChanged();
        });
      },
      onLikesChange: () => {
        fetchAllLikesFromSupabase().then((likes) => {
          setLikesList(likes);
        });
        if (onStatusChanged) onStatusChanged();
      },
      onPostsChange: () => {
        if (onStatusChanged) onStatusChanged();
      },
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, isPinAuthenticated, isAuthorizedPhone, onStatusChanged]);

  if (!isOpen) return null;

  // IF PHONE IS NOT 8838533014: STRICT ACCESS DENIED SCREEN
  if (!isAuthorizedPhone) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-red-100 text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-3xl mx-auto font-black shadow-inner">
            🚫
          </div>
          <h3 className="text-lg font-black text-slate-900">Admin Access Restricted</h3>
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            The System Administrator Panel is strictly restricted to user account phone number <span className="font-bold text-slate-900">8838533014</span>.
          </p>
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-left space-y-1">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Current Logged-in Phone</p>
            <p className="text-xs font-mono font-bold text-slate-800">{currentUser?.phone || 'No phone number linked'}</p>
          </div>
          <button
            onClick={onClose}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-3 rounded-xl transition cursor-pointer shadow-md active:scale-95"
          >
            Close & Exit
          </button>
        </div>
      </div>
    );
  }

  // 4-DIGIT PIN SECURITY PROMPT (DEFAULT '1234')
  const handlePinSubmit = (pinToTest = pinInput) => {
    if (pinToTest === DEFAULT_PIN) {
      setIsPinAuthenticated(true);
      setPinError('');
      loadData();
    } else {
      setPinError('❌ Incorrect Security PIN. Please try default PIN 1234.');
      setPinInput('');
    }
  };

  const handleKeypadPress = (val: string) => {
    if (pinInput.length < 4) {
      const nextPin = pinInput + val;
      setPinInput(nextPin);
      setPinError('');
      if (nextPin.length === 4) {
        setTimeout(() => {
          handlePinSubmit(nextPin);
        }, 150);
      }
    }
  };

  const handleKeypadBackspace = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setPinError('');
  };

  // Helper to switch user profile to 8838533014 in localStorage
  const handleSetAdminPhone = () => {
    const adminUser: UserProfile = {
      id: 'usr_8838533014',
      displayName: 'System Admin (8838533014)',
      fullName: 'Primary System Administrator',
      phone: '8838533014',
      companyName: 'Dropthan Admin HQ',
      role: 'wholesaler',
      gstin: '24AAAAA0000A1Z5',
      status: 'Active',
      location: 'Surat, Gujarat',
      country: 'India',
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('dropthan_user', JSON.stringify(adminUser));
    setIsPinAuthenticated(true);
    loadData();
  };

  if (!isPinAuthenticated && !isAuthorizedPhone) {
    return (
      <div className="fixed inset-0 z-[120] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-sm rounded-3xl p-6 space-y-5 shadow-2xl border border-blue-100 text-center">
          {/* HEADER BADGE */}
          <div className="space-y-1.5">
            <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center text-2xl mx-auto shadow-sm border border-amber-200">
              🔒
            </div>
            <h2 className="text-base font-black text-slate-900 tracking-tight">Admin Security Gatekeeper</h2>
            <p className="text-[11px] text-slate-500 font-medium">
              Enter 4-Digit Security PIN to unlock the Admin Dashboard
            </p>
            <div className="inline-block bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-bold px-3 py-1 rounded-full">
              🔑 Default PIN: <span className="font-mono font-black text-amber-700">1234</span>
            </div>
          </div>

          {/* 4-DIGIT DISPLAY */}
          <div className="flex justify-center gap-3 py-1">
            {[0, 1, 2, 3].map((idx) => {
              const char = pinInput[idx];
              return (
                <div
                  key={idx}
                  className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center font-mono text-xl font-bold transition-all ${
                    char
                      ? 'border-[#0d47a1] bg-blue-50 text-[#0d47a1] shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-300'
                  }`}
                >
                  {char ? '•' : ''}
                </div>
              );
            })}
          </div>

          {/* ERROR MESSAGE */}
          {pinError && (
            <p className="text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200 animate-bounce">
              {pinError}
            </p>
          )}

          {/* NUMERIC KEYPAD */}
          <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                onClick={() => handleKeypadPress(num)}
                className="h-11 bg-slate-100 hover:bg-slate-200 active:bg-blue-600 active:text-white font-bold text-base text-slate-800 rounded-xl transition cursor-pointer flex items-center justify-center shadow-2xs"
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => {
                setPinInput('');
                setPinError('');
              }}
              className="h-11 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center"
            >
              Clear
            </button>
            <button
              onClick={() => handleKeypadPress('0')}
              className="h-11 bg-slate-100 hover:bg-slate-200 active:bg-blue-600 active:text-white font-bold text-base text-slate-800 rounded-xl transition cursor-pointer flex items-center justify-center shadow-2xs"
            >
              0
            </button>
            <button
              onClick={handleKeypadBackspace}
              className="h-11 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center"
            >
              ⌫
            </button>
          </div>

          {/* QUICK ACTIONS */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <button
              onClick={handleSetAdminPhone}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black py-2.5 rounded-xl text-xs transition shadow cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
            >
              <span>⚡ Authenticate Admin Phone (+91 8838533014)</span>
            </button>
            <button
              onClick={onClose}
              className="w-full text-slate-500 hover:text-slate-800 text-xs font-bold py-1 transition cursor-pointer"
            >
              Cancel & Exit
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. FULL MONITORING DASHBOARD (WHEN AUTHENTICATED)
  const handleApprove = async (phone: string) => {
    await updateUserStatusInSupabase(phone, 'Active');
    setProfiles((prev) =>
      prev.map((p) => (p.phone === phone ? { ...p, status: 'Active', rejectionReason: undefined } : p))
    );
    if (onStatusChanged) onStatusChanged();
  };

  const handleOpenReject = (phone: string, name: string) => {
    setRejectReasonModal({
      isOpen: true,
      phone,
      name,
      reason: 'GSTIN format or company registration details could not be verified against Govt portal records.',
    });
  };

  const handleConfirmReject = async () => {
    if (!rejectReasonModal.phone) return;
    await updateUserStatusInSupabase(rejectReasonModal.phone, 'Rejected', rejectReasonModal.reason);
    setProfiles((prev) =>
      prev.map((p) =>
        p.phone === rejectReasonModal.phone
          ? { ...p, status: 'Rejected', rejectionReason: rejectReasonModal.reason }
          : p
      )
    );
    setRejectReasonModal({ isOpen: false, phone: '', name: '', reason: '' });
    if (onStatusChanged) onStatusChanged();
  };

  const handleOpenDelete = (user: UserProfile) => {
    setDeleteUserModal({
      isOpen: true,
      user,
      isDeleting: false,
    });
  };

  const handleConfirmDeleteUser = async () => {
    if (!deleteUserModal.user) return;
    const targetUser = deleteUserModal.user;
    const targetId = targetUser.id;
    const targetPhone = targetUser.phone;
    const displayName = targetUser.companyName || targetUser.displayName || targetUser.fullName || targetPhone;

    setDeleteUserModal((prev) => ({ ...prev, isDeleting: true }));

    try {
      // 1. Delete user from Supabase profiles table and associated items
      await deleteUserAccount(targetId, targetPhone);

      // 2. Instant UI state update: remove user from active profiles list without reloading
      setProfiles((prev) =>
        prev.filter((p) => {
          const matchId = targetId && p.id && p.id === targetId;
          const matchPhone = targetPhone && p.phone && p.phone === targetPhone;
          return !matchId && !matchPhone;
        })
      );

      // 3. Close profile preview modal if open for this user
      if (
        selectedUserForProfile &&
        ((targetId && selectedUserForProfile.id === targetId) ||
          (targetPhone && selectedUserForProfile.phone === targetPhone))
      ) {
        setSelectedUserForProfile(null);
      }

      // 4. Show success toast notification
      setToastMessage({
        type: 'success',
        text: `✓ User account "${displayName}" was permanently deleted from Supabase.`,
      });
      setTimeout(() => setToastMessage(null), 4000);

      // 5. Notify parent component to update global counts / lists
      if (onStatusChanged) onStatusChanged();
    } catch (err: any) {
      console.error('Failed to delete user profile:', err);
      setToastMessage({
        type: 'error',
        text: `Failed to delete user account: ${err?.message || 'Unknown error'}. Please try again.`,
      });
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setDeleteUserModal({ isOpen: false, user: null, isDeleting: false });
    }
  };

  // ADMIN MANUAL PRE-REGISTRATION SUBMIT HANDLER
  const handlePreRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preRegisterModal.phone.trim() || preRegisterModal.phone.replace(/\D/g, '').length < 7) {
      setPreRegisterModal((prev) => ({ ...prev, error: 'Please enter a valid phone number with country code.' }));
      return;
    }
    if (!preRegisterModal.password.trim() || preRegisterModal.password.trim().length < 4) {
      setPreRegisterModal((prev) => ({ ...prev, error: 'Password must be at least 4 characters.' }));
      return;
    }

    setPreRegisterModal((prev) => ({ ...prev, isSaving: true, error: '' }));

    try {
      const cleanPhone = preRegisterModal.phone.trim();
      const cleanPassword = preRegisterModal.password.trim();
      const phoneDigits = cleanPhone.replace(/\D/g, '');
      const assignedId = `usr_${phoneDigits || Date.now()}`;
      const resolvedCompany = preRegisterModal.companyName.trim() || 'Wholesale Supplier';
      const resolvedFullName = preRegisterModal.fullName.trim() || resolvedCompany;

      const profilePayload: Partial<UserProfile> & { phone: string; password: string } = {
        id: assignedId,
        phone: cleanPhone,
        password: cleanPassword,
        role: (preRegisterModal.role as any) || 'wholesaler',
        companyName: resolvedCompany,
        displayName: resolvedCompany,
        fullName: resolvedFullName,
        location: preRegisterModal.location.trim() || 'India',
        gstin: preRegisterModal.gstin.trim() ? preRegisterModal.gstin.trim().toUpperCase() : undefined,
        status: 'Active',
        country: 'India',
        createdAt: new Date().toISOString(),
      };

      const result = await preRegisterUserAccount(profilePayload);

      if (!result.success || !result.profile) {
        throw new Error(result.error || 'Failed to pre-register user account.');
      }

      // Update local profiles list seamlessly
      setProfiles((prev) => {
        const withoutOld = prev.filter((p) => p.phone?.replace(/\D/g, '') !== phoneDigits);
        return [result.profile!, ...withoutOld];
      });

      setToastMessage({
        type: 'success',
        text: `✓ User "${resolvedCompany}" (+${cleanPhone}) pre-registered with password "${cleanPassword}". Ready for login!`,
      });
      setTimeout(() => setToastMessage(null), 5000);

      // Close modal and reset form
      setPreRegisterModal({
        isOpen: false,
        phone: '+91 ',
        password: '',
        role: 'wholesaler',
        companyName: '',
        fullName: '',
        location: 'Surat, Gujarat',
        gstin: '',
        isSaving: false,
        error: '',
      });

      if (onStatusChanged) onStatusChanged();
    } catch (err: any) {
      console.error('Pre-registration failed:', err);
      setPreRegisterModal((prev) => ({
        ...prev,
        isSaving: false,
        error: err?.message || 'Failed to pre-register account. Please check inputs.',
      }));
    }
  };

  // COUNTERS & FILTERS
  const pendingCount = profiles.filter((p) => !p.status || p.status.toLowerCase() === 'pending').length;
  const activeCount = profiles.filter((p) => p.status?.toLowerCase() === 'active').length;
  const rejectedCount = profiles.filter((p) => p.status?.toLowerCase() === 'rejected').length;

  const filteredProfiles = profiles.filter((p) => {
    const status = (p.status || 'Pending').toLowerCase();
    if (approvalFilter === 'pending' && status !== 'pending') return false;
    if (approvalFilter === 'active' && status !== 'active') return false;
    if (approvalFilter === 'rejected' && status !== 'rejected') return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = (p.companyName || p.displayName || p.fullName || '').toLowerCase().includes(q);
      const matchGstin = (p.gstin || '').toLowerCase().includes(q);
      const matchPhone = (p.phone || '').toLowerCase().includes(q);
      const matchRole = (p.role || '').toLowerCase().includes(q);
      return matchName || matchGstin || matchPhone || matchRole;
    }
    return true;
  });

  // Calculate Product analytics metrics
  const totalPosts = posts.length;
  const totalLikes = posts.reduce((acc, p) => acc + (p.likeCount || 0), 0);

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-5 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-blue-100 flex flex-col max-h-[92vh] overflow-hidden my-auto">
        {/* TOP HEADER */}
        <div className="bg-[#0d47a1] text-white p-4 sm:p-5 rounded-t-3xl flex items-center justify-between flex-wrap gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xl">🛡️</span>
              <h2 className="text-base sm:text-lg font-black tracking-tight">Admin Command & Monitoring Panel</h2>
              <span className="bg-emerald-400 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded-full">
                🔒 +91 8838533014
              </span>
            </div>
            <p className="text-xs text-blue-100">
              Real-time user approvals, product views & interaction logs monitoring.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold transition cursor-pointer"
            title="Close Admin Panel"
          >
            ✕
          </button>
        </div>

        {/* MAIN NAVIGATION TABS */}
        <div className="bg-slate-100 border-b border-slate-200 p-2 flex items-center gap-1 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('approvals')}
            className={`px-3 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'approvals'
                ? 'bg-[#0d47a1] text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>🛡️ GST Approvals</span>
            {pendingCount > 0 && (
              <span className="bg-amber-400 text-slate-900 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-[#0d47a1] text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>👥 Registered Users ({profiles.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('daily')}
            className={`px-3 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'daily'
                ? 'bg-[#0d47a1] text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>📈 Daily User Count</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`px-3 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'products'
                ? 'bg-[#0d47a1] text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>👁️ Item Views ({totalPosts})</span>
          </button>

          <button
            onClick={() => setActiveTab('interactions')}
            className={`px-3 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'interactions'
                ? 'bg-[#0d47a1] text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>❤️ Likes & Engagement</span>
          </button>

          <button
            onClick={() => setActiveTab('sql')}
            className={`px-3 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'sql'
                ? 'bg-[#0d47a1] text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>⚡ Supabase SQL & RLS</span>
          </button>
        </div>

        {/* TAB CONTENT AREA */}
        <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          {/* TOAST / ACTION NOTIFICATION */}
          {toastMessage && (
            <div
              className={`p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold shadow-md transition animate-fade-in ${
                toastMessage.type === 'success'
                  ? 'bg-emerald-600 text-white shadow-emerald-900/10'
                  : 'bg-red-600 text-white shadow-red-900/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{toastMessage.type === 'success' ? '✅' : '⚠️'}</span>
                <span>{toastMessage.text}</span>
              </div>
              <button
                onClick={() => setToastMessage(null)}
                className="text-white/80 hover:text-white text-xs font-black px-2 py-0.5 rounded-lg bg-black/10 hover:bg-black/20 transition cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* TAB 1: GST APPROVALS & VERIFICATION */}
          {activeTab === 'approvals' && (
            <div className="space-y-4">
              {/* STATUS METRICS */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <button
                  onClick={() => setApprovalFilter('pending')}
                  className={`p-3 rounded-2xl border transition cursor-pointer ${
                    approvalFilter === 'pending'
                      ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/40'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-lg font-black text-amber-600">{pendingCount}</div>
                  <div className="text-[11px] font-bold text-slate-600">Pending Approvals</div>
                </button>
                <button
                  onClick={() => setApprovalFilter('active')}
                  className={`p-3 rounded-2xl border transition cursor-pointer ${
                    approvalFilter === 'active'
                      ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400/40'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-lg font-black text-emerald-600">{activeCount}</div>
                  <div className="text-[11px] font-bold text-slate-600">Active / Verified</div>
                </button>
                <button
                  onClick={() => setApprovalFilter('rejected')}
                  className={`p-3 rounded-2xl border transition cursor-pointer ${
                    approvalFilter === 'rejected'
                      ? 'bg-red-50 border-red-300 ring-2 ring-red-400/40'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-lg font-black text-red-600">{rejectedCount}</div>
                  <div className="text-[11px] font-bold text-slate-600">Rejected</div>
                </button>
              </div>

              {/* SEARCH FILTER */}
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search profile by Company Name, GSTIN, Phone, or Role..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0d47a1]"
                />
                <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
              </div>

              {/* LIST OF PROFILES */}
              {isLoading ? (
                <div className="text-center py-10 space-y-2">
                  <div className="inline-block w-6 h-6 border-2 border-[#0d47a1] border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs text-slate-500 font-medium">Fetching registered profiles from Supabase...</p>
                </div>
              ) : filteredProfiles.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-6 space-y-2">
                  <span className="text-3xl">✨</span>
                  <h3 className="text-sm font-bold text-slate-700">No {approvalFilter} registrations found</h3>
                  <p className="text-xs text-slate-500">All submitted GST registrations are processed.</p>
                </div>
              ) : (
                filteredProfiles.map((user, uIdx) => {
                  const statusStr = (user.status || 'Pending').toLowerCase();
                  const isPending = statusStr === 'pending';
                  const isApproved = statusStr === 'active';
                  const isRejected = statusStr === 'rejected';

                  return (
                    <div
                      key={`admin-user-card-${user.id || user.phone || uIdx}`}
                      className={`bg-white border rounded-2xl p-4 space-y-3 transition shadow-xs hover:shadow-md ${
                        isPending
                          ? 'border-amber-200 bg-amber-50/20'
                          : isApproved
                          ? 'border-emerald-200'
                          : 'border-red-200 bg-red-50/20'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-slate-900">
                              {user.companyName || user.displayName || user.fullName}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase bg-blue-100 text-[#0d47a1]">
                              {user.role.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 font-medium">
                            👤 Contact: {user.fullName || user.displayName} • 📞 <span className="font-bold text-slate-800">{user.phone}</span>
                          </p>
                          <p className="text-[11px] text-slate-500">
                            📍 {user.location || 'India'}, {user.country || 'India'} • Submitted: {new Date(user.createdAt || Date.now()).toLocaleDateString()}
                          </p>
                        </div>

                        <div>
                          {isPending && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-full">
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                              ⏳ Pending Approval
                            </span>
                          )}
                          {isApproved && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-full">
                              ✓ Active / Verified
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-100 border border-red-300 px-2.5 py-1 rounded-full">
                              ❌ Rejected
                            </span>
                          )}
                        </div>
                      </div>

                      {/* GST REVIEW BOX (ADMIN EXCLUSIVE) */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase block">GSTIN Number (Confidential)</span>
                            <span className="font-mono font-black text-slate-900 text-xs">
                              {user.gstin ? user.gstin : 'Not Applicable / Exempt'}
                            </span>
                          </div>
                          {user.gstin && (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  if (user.gstin) {
                                    navigator.clipboard.writeText(user.gstin);
                                    setCopiedGstinPhone(user.phone || user.id);
                                    setTimeout(() => setCopiedGstinPhone(null), 2000);
                                  }
                                }}
                                className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg font-bold text-[10px] text-slate-700 transition cursor-pointer"
                              >
                                {copiedGstinPhone === (user.phone || user.id) ? '✓ Copied' : '📋 Copy GSTIN'}
                              </button>
                              <a
                                href="https://services.gst.gov.in/services/searchtp"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg font-bold text-[10px] text-[#0d47a1] transition"
                              >
                                Check on GST Portal ↗
                              </a>
                            </div>
                          )}
                        </div>

                        {user.iecCode && (
                          <div className="border-t border-slate-200 pt-1.5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase block">IEC Code (Exporter)</span>
                            <span className="font-mono font-bold text-slate-800 text-xs">{user.iecCode}</span>
                          </div>
                        )}

                        <div className="bg-white border border-slate-200 rounded-lg p-2 flex items-center justify-between text-[11px]">
                          <span className="text-slate-600 font-medium">Public Badge Status:</span>
                          {isApproved ? (
                            <span className="font-bold text-emerald-700 flex items-center gap-1">
                              <span>✓</span>
                              <span>"GST Approved" Badge Active</span>
                            </span>
                          ) : (
                            <span className="font-bold text-amber-700 flex items-center gap-1">
                              <span>⏳</span>
                              <span>Badge Hidden (Pending Approval)</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {user.rejectionReason && isRejected && (
                        <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl p-2.5 font-medium">
                          ⚠️ Rejection Reason: {user.rejectionReason}
                        </div>
                      )}

                      {/* ACTION BUTTONS */}
                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 flex-wrap">
                        <button
                          onClick={() => setSelectedUserForProfile(user)}
                          className="bg-blue-50 hover:bg-blue-100 text-[#0d47a1] font-bold text-xs px-3 py-1.5 rounded-xl border border-blue-200 transition cursor-pointer flex items-center gap-1 active:scale-95"
                        >
                          👁️ Full Profile Details
                        </button>

                        <button
                          onClick={() => handleOpenDelete(user)}
                          className="bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs px-3 py-1.5 rounded-xl border border-red-200 transition cursor-pointer flex items-center gap-1 active:scale-95"
                          title="Permanently remove user from database"
                        >
                          🗑️ Delete User
                        </button>
                        {isPending && (
                          <>
                            <button
                              onClick={() => handleOpenReject(user.phone, user.companyName || user.displayName)}
                              className="bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs px-3 py-1.5 rounded-xl border border-red-200 transition cursor-pointer"
                            >
                              ❌ Reject Registration
                            </button>
                            <button
                              onClick={() => handleApprove(user.phone)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-4 py-1.5 rounded-xl transition shadow cursor-pointer flex items-center gap-1"
                            >
                              <span>✓ Approve GST & Badge</span>
                            </button>
                          </>
                        )}

                        {isRejected && (
                          <button
                            onClick={() => handleApprove(user.phone)}
                            className="bg-[#0d47a1] hover:bg-blue-800 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition cursor-pointer"
                          >
                            🔄 Re-evaluate & Approve
                          </button>
                        )}

                        {isApproved && (
                          <button
                            onClick={() => handleOpenReject(user.phone, user.companyName || user.displayName)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-xl transition cursor-pointer"
                          >
                            Revoke / Reject Access
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2.5: DAILY USER COUNT & ACTIVE METRICS */}
          {activeTab === 'daily' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-900 to-[#0d47a1] text-white rounded-2xl p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-black tracking-tight">Database & User Activity Monitor</h3>
                    <p className="text-xs text-blue-100">Live data directly queried from Supabase profiles, posts, and likes.</p>
                  </div>
                  <span className="bg-emerald-400 text-slate-900 text-xs font-black px-3 py-1 rounded-full animate-pulse">
                    🟢 Live Database Stream
                  </span>
                </div>
              </div>

              {/* STAT METRICS GRID */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-center space-y-1">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Active Verified</span>
                  <span className="text-xl font-black text-emerald-700">{activeCount}</span>
                  <span className="text-[10px] text-emerald-600 block">Approved Accounts</span>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-center space-y-1">
                  <span className="text-[10px] font-bold text-amber-800 uppercase block">Pending Review</span>
                  <span className="text-xl font-black text-amber-700">{pendingCount}</span>
                  <span className="text-[10px] text-amber-600 block">GST Verifications</span>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-center space-y-1">
                  <span className="text-[10px] font-bold text-blue-800 uppercase block">Total Registered</span>
                  <span className="text-xl font-black text-[#0d47a1]">{profiles.length}</span>
                  <span className="text-[10px] text-blue-600 block">Supabase Profiles</span>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-center space-y-1">
                  <span className="text-[10px] font-bold text-rose-800 uppercase block">Total Likes</span>
                  <span className="text-xl font-black text-rose-700">{likesList.length}</span>
                  <span className="text-[10px] text-rose-600 block">Item Interactions</span>
                </div>
              </div>

              {/* USER ACTIVITY SUMMARY TABLE */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                  👤 Real-Time User Accounts in Database ({profiles.length})
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-800">
                    <thead className="bg-slate-100 text-[#0d47a1] font-black uppercase text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">User / Company</th>
                        <th className="p-2.5">Role</th>
                        <th className="p-2.5">Phone</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">Registered</th>
                        <th className="p-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {profiles.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-6 text-slate-500 font-medium text-xs">
                            No profiles found in Supabase database yet.
                          </td>
                        </tr>
                      ) : (
                        profiles.map((user, i) => (
                          <tr key={`admin-profile-row-${user.id || user.phone || 'usr'}-${i}`} className="hover:bg-slate-50 transition">
                            <td className="p-2.5 font-bold text-slate-900">
                              {user.companyName || user.displayName || user.fullName || 'Member'}
                            </td>
                            <td className="p-2.5">
                              <span className="bg-blue-50 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200 uppercase">
                                {user.role}
                              </span>
                            </td>
                            <td className="p-2.5 font-mono text-slate-600">{user.phone}</td>
                            <td className="p-2.5">
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                                  user.status === 'Active'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : user.status === 'Rejected'
                                    ? 'bg-red-50 text-red-800 border-red-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}
                              >
                                {user.status || 'Pending'}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-500 text-[11px]">
                              {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="p-2.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setSelectedUserForProfile(user)}
                                  className="bg-[#0d47a1] hover:bg-blue-800 text-white font-bold text-[10px] px-2 py-1 rounded-lg transition cursor-pointer shadow-2xs"
                                >
                                  👁️ Inspect
                                </button>
                                <button
                                  onClick={() => handleOpenDelete(user)}
                                  className="bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[10px] px-2 py-1 rounded-lg border border-red-200 transition cursor-pointer"
                                  title="Delete user"
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REGISTERED USERS MONITOR */}
          {activeTab === 'users' && (
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-xs font-black text-[#0d47a1]">Registered User Database Monitor</h3>
                  <p className="text-[11px] text-blue-900">Total {profiles.length} user accounts saved in Supabase `profiles` table.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setPreRegisterModal({
                        isOpen: true,
                        phone: '+91 ',
                        password: '',
                        role: 'wholesaler',
                        companyName: '',
                        fullName: '',
                        location: 'Surat, Gujarat',
                        gstin: '',
                        isSaving: false,
                        error: '',
                      })
                    }
                    className="bg-[#0d47a1] hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <span>➕ Pre-Register Wholesaler</span>
                  </button>
                  <button
                    onClick={loadData}
                    className="bg-white hover:bg-blue-100 text-[#0d47a1] border border-blue-300 font-bold text-xs px-3 py-1.5 rounded-xl transition cursor-pointer"
                  >
                    🔄 Refresh Data
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
                <table className="w-full text-left text-xs text-slate-800">
                  <thead className="bg-slate-100 text-[#0d47a1] font-black uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="p-3">User / Company</th>
                      <th className="p-3">Phone</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">GSTIN</th>
                      <th className="p-3">Location</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {profiles.map((p, i) => (
                      <tr key={`admin-users-tab-row-${p.id || p.phone || 'usr'}-${i}`} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-bold text-slate-900">
                          {p.companyName || p.fullName || p.displayName}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-700">{p.phone}</td>
                        <td className="p-3">
                          <span className="bg-blue-50 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200">
                            {p.role}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-600">{p.gstin || 'N/A'}</td>
                        <td className="p-3 text-slate-600">{p.location || 'India'}</td>
                        <td className="p-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              p.status?.toLowerCase() === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : p.status?.toLowerCase() === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {p.status || 'Pending'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedUserForProfile(p)}
                              className="bg-[#0d47a1] hover:bg-blue-800 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg transition cursor-pointer shadow-2xs active:scale-95 whitespace-nowrap"
                            >
                              👁️ View Profile
                            </button>
                            <button
                              onClick={() => handleOpenDelete(p)}
                              className="bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[10px] px-2.5 py-1 rounded-lg border border-red-200 transition cursor-pointer active:scale-95 whitespace-nowrap"
                              title="Delete user from database"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: PRODUCT ITEM VIEWS */}
          {activeTab === 'products' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-center bg-blue-50 border border-blue-200 rounded-2xl p-3">
                <div>
                  <div className="text-base font-black text-[#0d47a1]">{totalPosts}</div>
                  <div className="text-[10px] font-bold text-blue-900">Total Catalog Listings</div>
                </div>
                <div>
                  <div className="text-base font-black text-amber-700">{totalLikes}</div>
                  <div className="text-[10px] font-bold text-amber-900">Total User Likes</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {posts.map((post, pIdx) => {
                  return (
                    <div key={`admin-post-grid-${post.id || pIdx}`} className="bg-white border border-slate-200 rounded-2xl p-3 flex gap-3 shadow-2xs">
                      <img
                        src={post.images?.[0] || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=200'}
                        alt={post.title}
                        className="w-16 h-16 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                      />
                      <div className="flex-1 space-y-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{post.title}</h4>
                        <p className="text-[11px] text-[#0d47a1] font-bold">₹{post.moqPrice || 'N/A'}</p>
                        <p className="text-[10px] text-slate-500">🏢 Supplier: {post.author}</p>
                        <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-100 text-slate-600 font-medium">
                          <span>📦 MOQ: {post.moq || 1} units</span>
                          <span className="font-bold text-red-600">❤️ {post.likeCount || 0} Likes</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: LIKES & ENGAGEMENT */}
          {activeTab === 'interactions' && (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                    <span>❤️</span> Live Supabase Likes & Engagement Stream
                  </h3>
                  <p className="text-[11px] text-amber-900">
                    Real-time buyer interest, saved products, and live interactions from Supabase `likes` table ({likesList.length} total like records).
                  </p>
                </div>
                <span className="bg-amber-200 text-amber-950 text-[10px] font-black px-2.5 py-1 rounded-full border border-amber-300">
                  {likesList.length} Live Likes Tracked
                </span>
              </div>

              {/* LIVE LIKE RECORDS STREAM */}
              {likesList.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2 shadow-2xs">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                    <span>⚡</span> Recent Live Like Activity Log
                  </h4>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar">
                    {likesList.slice(0, 20).map((like, idx) => (
                      <div
                        key={like.id || `${like.post_id}-${like.user_phone}-${idx}`}
                        className="bg-slate-50 border border-slate-200/80 rounded-xl p-2 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-red-500">❤️</span>
                          <div>
                            <span className="font-bold text-slate-900">{like.user_name || 'Buyer'}</span>
                            <span className="font-mono text-[10px] text-slate-500 ml-1.5">({like.user_phone})</span>
                            <p className="text-[10px] text-slate-600">
                              Liked listing: <span className="font-bold text-[#0d47a1]">{like.post_title || `Post #${like.post_id}`}</span>
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {like.created_at ? new Date(like.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PRODUCT LIKES AGGREGATE BREAKDOWN */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                  Catalog Listings by Like Volume
                </h4>
                {posts.map((post, pIdx) => (
                  <div key={`admin-post-catalog-list-${post.id || pIdx}`} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{post.title}</h4>
                      <p className="text-[10px] text-slate-500 truncate">Author: {post.author} • Location: {post.location || 'India'}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-black text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-full">
                        ❤️ {post.likeCount || 0} Likes
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: SUPABASE SQL & RLS HEALTH */}
          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">⚡</span>
                    <div>
                      <h4 className="text-sm font-black text-blue-950">Supabase Table Schema & Public RLS Policies</h4>
                      <p className="text-xs text-blue-800">
                        Run this script in your Supabase SQL Editor to make sure all tables (profiles, posts, messages, likes) exist with completely public read/write policies.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const sqlScript = `-- ============================================================
-- DROPTHAN GLOBAL MARKETPLACE: FAIL-SAFE SUPABASE SETUP SCRIPT
-- Run this in your Supabase SQL Editor to automatically add any missing
-- columns and enable open RLS policies without errors!
-- ============================================================

-- 1. PROFILES TABLE (Create table & add all required columns)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'wholesaler';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS store_address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'India';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS lat NUMERIC;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS lng NUMERIC;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gstin TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS iec_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS material_details TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS promotion_details TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS export_products TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS packaging_materials TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS service_details TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_handle TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Create search indexes safely
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_company_name ON public.profiles(company_name);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON public.profiles(display_name);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles(full_name);

-- Open RLS policies for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view all profiles" ON public.profiles;
CREATE POLICY "Public can view all profiles" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can insert profiles" ON public.profiles;
CREATE POLICY "Anyone can insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anyone can update profiles" ON public.profiles;
CREATE POLICY "Anyone can update profiles" ON public.profiles FOR UPDATE USING (true);

-- 2. POSTS TABLE (Streamlined Schema: user_id, title, product_name, description, img, is_active, created_at)
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  title TEXT,
  product_name TEXT,
  description TEXT,
  img TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS img TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Open RLS policies for posts (100% public read for all visitors and authenticated users)
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view all posts" ON public.posts;
DROP POLICY IF EXISTS "Public read access for all posts" ON public.posts;
CREATE POLICY "Public read access for all posts" ON public.posts FOR SELECT TO public, anon, authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can insert posts" ON public.posts;
DROP POLICY IF EXISTS "Public insert access for posts" ON public.posts;
CREATE POLICY "Public insert access for posts" ON public.posts FOR INSERT TO public, anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update posts" ON public.posts;
DROP POLICY IF EXISTS "Public update access for posts" ON public.posts;
CREATE POLICY "Public update access for posts" ON public.posts FOR UPDATE TO public, anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete posts" ON public.posts;
DROP POLICY IF EXISTS "Public delete access for posts" ON public.posts;
CREATE POLICY "Public delete access for posts" ON public.posts FOR DELETE TO public, anon, authenticated USING (true);

-- 3. LIKES TABLE
CREATE TABLE IF NOT EXISTS public.likes (
  id TEXT PRIMARY KEY
);

ALTER TABLE public.likes ADD COLUMN IF NOT EXISTS post_id TEXT;
ALTER TABLE public.likes ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.likes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view likes" ON public.likes;
CREATE POLICY "Public can view likes" ON public.likes FOR SELECT TO public, anon, authenticated USING (true);
DROP POLICY IF EXISTS "Anyone can insert likes" ON public.likes;
CREATE POLICY "Anyone can insert likes" ON public.likes FOR INSERT TO public, anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Anyone can delete likes" ON public.likes;
CREATE POLICY "Anyone can delete likes" ON public.likes FOR DELETE TO public, anon, authenticated USING (true);

-- 4. REALTIME REPLICATION (Instant live updates across all clients)
ALTER TABLE public.posts REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.likes REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'likes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.likes;
  END IF;
END $$;
`;
                      navigator.clipboard.writeText(sqlScript);
                      setIsCopiedSql(true);
                      setTimeout(() => setIsCopiedSql(false), 3000);
                    }}
                    className="bg-[#0d47a1] hover:bg-blue-800 text-white text-xs font-black px-4 py-2 rounded-xl transition shadow cursor-pointer flex items-center gap-1.5 active:scale-95"
                  >
                    <span>{isCopiedSql ? '✅ Copied to Clipboard!' : '📋 Copy Full SQL Script'}</span>
                  </button>
                </div>
              </div>

              {/* LIVE DATABASE STATUS CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center space-y-1">
                  <span className="text-xs font-bold text-slate-500 uppercase">Live Profiles In Memory</span>
                  <div className="text-2xl font-black text-slate-900">{profiles.length} Users</div>
                  <p className="text-[10px] text-emerald-600 font-bold">● Globally Searchable</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center space-y-1">
                  <span className="text-xs font-bold text-slate-500 uppercase">Live Catalog Posts</span>
                  <div className="text-2xl font-black text-slate-900">{posts.length} Items</div>
                  <p className="text-[10px] text-blue-600 font-bold">● Real-time Synced</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center space-y-1">
                  <span className="text-xs font-bold text-slate-500 uppercase">Total User Likes</span>
                  <div className="text-2xl font-black text-slate-900">{likesList.length} Likes</div>
                  <p className="text-[10px] text-rose-600 font-bold">● Live Interactions</p>
                </div>
              </div>

              {/* CODE BLOCK PREVIEW */}
              <div className="bg-slate-900 text-emerald-400 p-4 rounded-2xl font-mono text-[11px] overflow-x-auto max-h-[350px] leading-relaxed border border-slate-800 shadow-inner">
                <pre>{`-- 1. PROFILES TABLE (AUTOMATICALLY ADDS ANY MISSING COLUMNS)
CREATE TABLE IF NOT EXISTS public.profiles (id TEXT PRIMARY KEY);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'wholesaler';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS store_address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gstin TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS iec_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';

-- Open RLS policies so all registered users are searchable by everyone
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Anyone can insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update profiles" ON public.profiles FOR UPDATE USING (true);`}</pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FULL PROFILE DETAIL MODAL OVERLAY */}
      {selectedUserForProfile && (
        <div className="fixed inset-0 z-[160] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl border border-blue-100 max-h-[90vh] overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">👤</span>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    {selectedUserForProfile.companyName || selectedUserForProfile.fullName || selectedUserForProfile.displayName}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">Full Member Profile Details</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserForProfile(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Profile Content */}
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <img
                  src={selectedUserForProfile.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                  alt={selectedUserForProfile.displayName}
                  className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-xs"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-extrabold text-slate-900 text-sm">
                      {selectedUserForProfile.displayName}
                    </span>
                    <span className="bg-blue-100 text-[#0d47a1] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                      {selectedUserForProfile.role}
                    </span>
                  </div>
                  <p className="text-slate-600 font-bold flex items-center gap-1">
                    <span>📞 {selectedUserForProfile.phone}</span>
                    <a
                      href={`https://wa.me/91${selectedUserForProfile.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md text-[10px] hover:bg-emerald-100 transition"
                    >
                      💬 WhatsApp
                    </a>
                  </p>
                </div>
              </div>

              {/* BUSINESS BIO / DESCRIPTION */}
              {(selectedUserForProfile.bio || selectedUserForProfile.description) && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    📝 Business Bio / Custom Words
                  </span>
                  <p className="text-xs text-slate-800 font-medium whitespace-pre-line leading-relaxed">
                    {selectedUserForProfile.bio || selectedUserForProfile.description}
                  </p>
                </div>
              )}

              {/* Social & Website Links */}
              {(selectedUserForProfile.instagram || selectedUserForProfile.instagramHandle || selectedUserForProfile.website || selectedUserForProfile.websiteUrl) && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {(selectedUserForProfile.instagram || selectedUserForProfile.instagramHandle) && (
                    (() => {
                      const raw = selectedUserForProfile.instagram || selectedUserForProfile.instagramHandle || '';
                      const handle = raw.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/\/$/, '');
                      return (
                        <a
                          href={`https://www.instagram.com/${handle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-bold text-pink-700 bg-pink-50 hover:bg-pink-100 px-2.5 py-1 rounded-xl border border-pink-200 flex items-center gap-1.5 transition"
                        >
                          <span>📸</span>
                          <span>@{handle}</span>
                          <span className="text-[9px]">↗</span>
                        </a>
                      );
                    })()
                  )}
                  {(selectedUserForProfile.website || selectedUserForProfile.websiteUrl) && (
                    <a
                      href={(selectedUserForProfile.website || selectedUserForProfile.websiteUrl || '').startsWith('http') ? (selectedUserForProfile.website || selectedUserForProfile.websiteUrl || '') : `https://${selectedUserForProfile.website || selectedUserForProfile.websiteUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-[#0d47a1] bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-xl border border-blue-200 flex items-center gap-1.5 transition"
                    >
                      <span>🌐</span>
                      <span className="truncate max-w-[150px]">{(selectedUserForProfile.website || selectedUserForProfile.websiteUrl || '').replace(/^https?:\/\//i, '')}</span>
                      <span className="text-[9px]">↗</span>
                    </a>
                  )}
                </div>
              )}

              {/* GST & Registration Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">GSTIN Number</span>
                  <span className="font-mono font-black text-slate-900 text-xs">
                    {selectedUserForProfile.gstin || 'Not Provided / Exempt'}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">IEC Code (Exporter)</span>
                  <span className="font-mono font-black text-slate-900 text-xs">
                    {selectedUserForProfile.iecCode || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Status Badge & Rejection Reason */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">GST Verification Status</span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      selectedUserForProfile.status?.toLowerCase() === 'active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedUserForProfile.status?.toLowerCase() === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {selectedUserForProfile.status || 'Pending'}
                  </span>
                </div>
                {selectedUserForProfile.rejectionReason && (
                  <p className="text-[11px] text-red-700 font-medium pt-1">
                    ⚠️ Rejection Note: {selectedUserForProfile.rejectionReason}
                  </p>
                )}
              </div>

              {/* Address & GPS */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Store / Business Address</span>
                <p className="text-slate-800 font-medium">
                  📍 {selectedUserForProfile.storeAddress || selectedUserForProfile.location || 'India'}, {selectedUserForProfile.country || 'India'}
                </p>
                {selectedUserForProfile.lat && selectedUserForProfile.lng && (
                  <p className="text-[10px] font-mono text-slate-500">
                    GPS Coordinates: {selectedUserForProfile.lat.toFixed(5)}, {selectedUserForProfile.lng.toFixed(5)}
                  </p>
                )}
              </div>

              {/* Account Metadata */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex justify-between">
                <span>Created Date: {new Date(selectedUserForProfile.createdAt || Date.now()).toLocaleDateString()}</span>
                <span>Role: <strong className="text-slate-800">{selectedUserForProfile.role}</strong></span>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedUserForProfile(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
                >
                  Close Profile
                </button>
                <button
                  onClick={() => handleOpenDelete(selectedUserForProfile)}
                  className="bg-red-50 hover:bg-red-100 text-red-700 font-bold px-3.5 py-2 rounded-xl text-xs transition cursor-pointer border border-red-200 flex items-center gap-1 active:scale-95"
                  title="Permanently remove user from Supabase database"
                >
                  🗑️ Delete Account
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                {selectedUserForProfile.status?.toLowerCase() !== 'active' && (
                  <button
                    onClick={() => {
                      handleApprove(selectedUserForProfile.phone);
                      setSelectedUserForProfile(null);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition shadow cursor-pointer"
                  >
                    Approve GST
                  </button>
                )}
                {selectedUserForProfile.status?.toLowerCase() !== 'rejected' && (
                  <button
                    onClick={() => {
                      const phoneToReject = selectedUserForProfile.phone;
                      const nameToReject = selectedUserForProfile.companyName || selectedUserForProfile.displayName;
                      setSelectedUserForProfile(null);
                      handleOpenReject(phoneToReject, nameToReject);
                    }}
                    className="bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold px-3.5 py-2 rounded-xl text-xs transition cursor-pointer border border-amber-200"
                  >
                    Reject GST
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE USER CONFIRMATION MODAL */}
      {deleteUserModal.isOpen && deleteUserModal.user && (
        <div className="fixed inset-0 z-[160] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl border border-red-200 animate-scale-up">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-2xl flex-shrink-0">
                🗑️
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 leading-snug">
                  Permanently Delete User Account?
                </h3>
                <p className="text-xs text-red-600 font-semibold">
                  This action directly removes the user from Supabase and cannot be undone.
                </p>
              </div>
            </div>

            {/* USER SUMMARY CARD */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Business / Name:</span>
                <span className="font-bold text-slate-900 truncate max-w-[200px]">
                  {deleteUserModal.user.companyName || deleteUserModal.user.displayName || deleteUserModal.user.fullName || 'Member'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Phone Number:</span>
                <span className="font-mono font-bold text-slate-800">{deleteUserModal.user.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Account Role:</span>
                <span className="font-bold text-blue-700 uppercase text-[11px]">{deleteUserModal.user.role || 'Member'}</span>
              </div>
              {deleteUserModal.user.gstin && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">GSTIN:</span>
                  <span className="font-mono text-slate-700">{deleteUserModal.user.gstin}</span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Deleting this user will wipe their profile record from the Supabase <code className="bg-slate-100 text-red-700 px-1.5 py-0.5 rounded font-mono text-[11px]">profiles</code> table and delete all catalog products/posts and interactions associated with their account.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={deleteUserModal.isDeleting}
                onClick={() => setDeleteUserModal({ isOpen: false, user: null, isDeleting: false })}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteUserModal.isDeleting}
                onClick={handleConfirmDeleteUser}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-md shadow-red-600/20 cursor-pointer flex items-center gap-2 disabled:opacity-50 active:scale-95"
              >
                {deleteUserModal.isDeleting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Deleting from Supabase...</span>
                  </>
                ) : (
                  <>
                    <span>🗑️ Confirm & Delete User</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRE-REGISTER USER MODAL */}
      {preRegisterModal.isOpen && (
        <div className="fixed inset-0 z-[150] bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl border border-blue-100 max-h-[90vh] overflow-y-auto my-auto">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#0d47a1] flex items-center justify-center text-lg font-black">
                  ➕
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Pre-Register Wholesaler / Account</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Create permanent active user credentials directly in the database.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreRegisterModal((prev) => ({ ...prev, isOpen: false, error: '' }))}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* ERROR BANNER */}
            {preRegisterModal.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-semibold">
                ⚠️ {preRegisterModal.error}
              </div>
            )}

            {/* FORM */}
            <form onSubmit={handlePreRegisterSubmit} className="space-y-3.5 text-left">
              {/* CATEGORY / ROLE */}
              <div>
                <label className="block text-[11px] font-bold text-slate-800 mb-1">
                  Business Category <span className="text-blue-600">*</span>
                </label>
                <select
                  value={preRegisterModal.role}
                  onChange={(e) => setPreRegisterModal((prev) => ({ ...prev, role: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-[#0d47a1]"
                >
                  <option value="wholesaler">📦 Standard Wholesaler</option>
                  <option value="organic_wholesaler">🌱 Organic Wholesaler (GST Exempt)</option>
                  <option value="exporter">🌐 Exporter</option>
                  <option value="printing">🖨️ Printing & Packaging</option>
                  <option value="reseller">🏷️ Dropshipper / Buyer</option>
                  <option value="influencer">📸 Influencer / Creator</option>
                </select>
              </div>

              {/* PHONE NUMBER & PASSWORD GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 mb-1">
                    Phone Number <span className="text-blue-600 font-extrabold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={preRegisterModal.phone}
                    onChange={(e) => setPreRegisterModal((prev) => ({ ...prev, phone: e.target.value, error: '' }))}
                    placeholder="e.g. +91 9876543210"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#0d47a1]"
                  />
                  <span className="text-[10px] text-slate-400">Used for login</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-800 mb-1">
                    Assigned Password <span className="text-blue-600 font-extrabold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={preRegisterModal.password}
                    onChange={(e) => setPreRegisterModal((prev) => ({ ...prev, password: e.target.value, error: '' }))}
                    placeholder="e.g. Surat@2026"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#0d47a1]"
                  />
                  <span className="text-[10px] text-slate-400">Min 4 characters</span>
                </div>
              </div>

              {/* COMPANY & CONTACT NAME */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 mb-1">
                    Company / Business Name
                  </label>
                  <input
                    type="text"
                    value={preRegisterModal.companyName}
                    onChange={(e) => setPreRegisterModal((prev) => ({ ...prev, companyName: e.target.value }))}
                    placeholder="e.g. Apex Textiles Pvt Ltd"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0d47a1]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-800 mb-1">
                    Contact Person Name
                  </label>
                  <input
                    type="text"
                    value={preRegisterModal.fullName}
                    onChange={(e) => setPreRegisterModal((prev) => ({ ...prev, fullName: e.target.value }))}
                    placeholder="e.g. Ramesh Shah"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0d47a1]"
                  />
                </div>
              </div>

              {/* LOCATION & GSTIN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 mb-1">
                    City / Location
                  </label>
                  <input
                    type="text"
                    value={preRegisterModal.location}
                    onChange={(e) => setPreRegisterModal((prev) => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g. Surat, Gujarat"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0d47a1]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-800 mb-1">
                    GSTIN Number (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    value={preRegisterModal.gstin}
                    onChange={(e) => setPreRegisterModal((prev) => ({ ...prev, gstin: e.target.value.toUpperCase() }))}
                    placeholder="e.g. 24AAAAA0000A1Z5"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono uppercase text-slate-900 focus:outline-none focus:border-[#0d47a1]"
                  />
                </div>
              </div>

              {/* NOTICE */}
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 flex items-center gap-2 font-medium">
                <span>🛡️</span>
                <span>Pre-registered accounts are set to <strong>Active</strong> (pre-approved) and persist across all logins and logouts.</span>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPreRegisterModal((prev) => ({ ...prev, isOpen: false, error: '' }))}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={preRegisterModal.isSaving}
                  className="bg-[#0d47a1] hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 shadow-md shadow-blue-900/10 active:scale-95 disabled:opacity-50"
                >
                  {preRegisterModal.isSaving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Saving Account to Supabase...</span>
                    </>
                  ) : (
                    <>
                      <span>💾 Save & Pre-Register Wholesaler</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECTION REASON PROMPT MODAL */}
      {rejectReasonModal.isOpen && (
        <div className="fixed inset-0 z-[150] bg-slate-900/80 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 space-y-4 shadow-2xl border border-red-100">
            <h3 className="text-sm font-extrabold text-slate-900">
              Reject Registration: {rejectReasonModal.name}
            </h3>
            <p className="text-xs text-slate-600">
              Specify the reason for rejecting this GST registration. The user will be notified upon logging in.
            </p>
            <textarea
              rows={3}
              value={rejectReasonModal.reason}
              onChange={(e) => setRejectReasonModal((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="e.g. GSTIN details do not match business registration address."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-red-500"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setRejectReasonModal({ isOpen: false, phone: '', name: '', reason: '' })}
                className="bg-slate-100 text-slate-700 font-bold text-xs px-3 py-2 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="bg-red-600 text-white font-bold text-xs px-4 py-2 rounded-xl hover:bg-red-700"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
